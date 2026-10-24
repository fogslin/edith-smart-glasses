"""
Tesla integration for EDITH: LLM tool-calls -> Fleet API (via tesla-http-proxy) or BLE (tesla-control).

Fleet API facts used here (developer.tesla.com/docs/fleet-api, checked 2026-10-22):
  * Vehicle commands: POST /api/1/vehicles/{vin}/command/<name>  e.g. door_lock, door_unlock,
    auto_conditioning_start, auto_conditioning_stop, honk_horn, flash_lights
  * Vehicle data:     GET  /api/1/vehicles/{vin}/vehicle_data   (charge_state.battery_level)
  * Wake:             POST /api/1/vehicles/{vin}/wake_up
  * Commands must be signed with your virtual key -> send them through Tesla's Vehicle Command
    Proxy (tesla-http-proxy). The proxy exposes the same REST paths and forwards other calls.
  * Tokens: https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token (refresh tokens are single use).
BLE mode shells out to `tesla-control -ble ...` from github.com/teslamotors/vehicle-command and needs
the backend host (e.g. a Raspberry Pi) within Bluetooth range of the car.
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import time
from pathlib import Path

import httpx

MODE = os.getenv("TESLA_MODE", "off")                 # off | fleet | ble
VIN = os.getenv("TESLA_VIN", "")
PROXY_URL = os.getenv("TESLA_PROXY_URL", "https://localhost:4443").rstrip("/")
PROXY_CA = os.getenv("TESLA_PROXY_CA", "")             # path to the proxy's tls-cert.pem
CLIENT_ID = os.getenv("TESLA_CLIENT_ID", "")
TOKEN_FILE = Path(os.getenv("TESLA_TOKEN_FILE", str(Path(__file__).with_name("tesla_tokens.json"))))
AUTH_URL = "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token"
ALLOW_UNLOCK = os.getenv("TESLA_ALLOW_UNLOCK", "false").lower() == "true"
BLE_KEY_FILE = os.getenv("TESLA_BLE_KEY_FILE", "")     # private key paired via add-key-request

# intent -> (Fleet API command, tesla-control BLE command)
COMMANDS = {
    "lock":         ("door_lock", "lock"),
    "unlock":       ("door_unlock", "unlock"),
    "climate_on":   ("auto_conditioning_start", "climate-on"),
    "climate_off":  ("auto_conditioning_stop", "climate-off"),
    "honk":         ("honk_horn", "honk"),
    "flash_lights": ("flash_lights", "flash-lights"),
}

TOOLS = [
    {"type": "function", "function": {
        "name": "tesla_command",
        "description": "Control the user's Tesla. Use only when the user clearly asks.",
        "parameters": {"type": "object", "properties": {
            "action": {"type": "string", "enum": list(COMMANDS)}}, "required": ["action"]}}},
    {"type": "function", "function": {
        "name": "tesla_battery",
        "description": "Get the Tesla's battery level and range.",
        "parameters": {"type": "object", "properties": {}}}},
]


def enabled() -> bool:
    return MODE in ("fleet", "ble") and bool(VIN)


# ------------------------------------------------------------------ tokens
def _load_tokens() -> dict:
    if TOKEN_FILE.exists():
        return json.loads(TOKEN_FILE.read_text())
    return {"access_token": os.getenv("TESLA_ACCESS_TOKEN", ""),
            "refresh_token": os.getenv("TESLA_REFRESH_TOKEN", ""), "expires_at": 0}


async def access_token() -> str:
    tok = _load_tokens()
    if tok.get("access_token") and tok.get("expires_at", 0) > time.time() + 60:
        return tok["access_token"]
    if not tok.get("refresh_token"):
        return tok.get("access_token", "")
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(AUTH_URL, data={"grant_type": "refresh_token", "client_id": CLIENT_ID,
                                         "refresh_token": tok["refresh_token"]})
        r.raise_for_status()
        j = r.json()
    # refresh tokens are single-use: always persist the new one
    tok = {"access_token": j["access_token"], "refresh_token": j.get("refresh_token", tok["refresh_token"]),
           "expires_at": time.time() + int(j.get("expires_in", 3600))}
    TOKEN_FILE.write_text(json.dumps(tok))
    return tok["access_token"]


# ------------------------------------------------------------------ fleet (via proxy)
async def _fleet(method: str, path: str, body: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {await access_token()}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=40, verify=PROXY_CA or True) as c:
        r = await c.request(method, f"{PROXY_URL}{path}", headers=headers, json=body)
        try:
            return {"status": r.status_code, **r.json()}
        except ValueError:
            return {"status": r.status_code, "body": r.text[:200]}


async def _fleet_wake() -> None:
    await _fleet("POST", f"/api/1/vehicles/{VIN}/wake_up")
    for _ in range(10):  # wait until online
        data = await _fleet("GET", f"/api/1/vehicles/{VIN}/vehicle_data")
        if data.get("status") == 200:
            return
        await asyncio.sleep(3)


# ------------------------------------------------------------------ BLE (tesla-control)
async def _ble(*args: str) -> dict:
    exe = shutil.which("tesla-control")
    if not exe:
        return {"ok": False, "error": "tesla-control not installed on backend host"}
    cmd = [exe, "-ble", "-vin", VIN]
    if BLE_KEY_FILE:
        cmd += ["-key-file", BLE_KEY_FILE]
    proc = await asyncio.create_subprocess_exec(*cmd, *args, stdout=asyncio.subprocess.PIPE,
                                                stderr=asyncio.subprocess.PIPE)
    out, err = await asyncio.wait_for(proc.communicate(), timeout=40)
    return {"ok": proc.returncode == 0, "output": out.decode()[-500:], "error": err.decode()[-300:]}


# ------------------------------------------------------------------ tool dispatcher
async def run_tool(name: str, args: dict) -> dict:
    if not enabled():
        return {"ok": False, "error": "Tesla integration is off"}
    if name == "tesla_command":
        action = args.get("action", "")
        if action not in COMMANDS:
            return {"ok": False, "error": f"unknown action {action}"}
        if action == "unlock" and not ALLOW_UNLOCK:
            return {"ok": False, "error": "unlock disabled (set TESLA_ALLOW_UNLOCK=true)"}
        fleet_cmd, ble_cmd = COMMANDS[action]
        if MODE == "ble":
            return await _ble(ble_cmd)
        await _fleet_wake()
        return await _fleet("POST", f"/api/1/vehicles/{VIN}/command/{fleet_cmd}", {})
    if name == "tesla_battery":
        if MODE == "ble":
            return await _ble("state", "charge")   # see guide: verify with `tesla-control -h`
        await _fleet_wake()
        data = await _fleet("GET", f"/api/1/vehicles/{VIN}/vehicle_data")
        cs = (data.get("response") or {}).get("charge_state") or {}
        return {"ok": data.get("status") == 200, "battery_level": cs.get("battery_level"),
                "battery_range_miles": cs.get("battery_range"), "charging_state": cs.get("charging_state")}
    return {"ok": False, "error": f"unknown tool {name}"}
