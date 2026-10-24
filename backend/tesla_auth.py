"""
One-time Tesla Fleet API setup helper.

  python tesla_auth.py partner-register     # partner token + POST /api/1/partner_accounts
  python tesla_auth.py login-url            # prints the user authorization URL
  python tesla_auth.py exchange <code>      # trades the callback ?code= for tokens -> tesla_tokens.json

Endpoints from developer.tesla.com/docs/fleet-api (Partner Tokens, Third-Party Tokens,
Partner Endpoints), checked 2026-10-22.
"""
import json
import os
import secrets
import sys
import time
import urllib.parse
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()
CLIENT_ID = os.environ.get("TESLA_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("TESLA_CLIENT_SECRET", "")
REDIRECT_URI = os.environ.get("TESLA_REDIRECT_URI", "https://your-domain.example/auth/callback")
DOMAIN = os.environ.get("TESLA_APP_DOMAIN", "your-domain.example")
AUDIENCE = os.environ.get("TESLA_FLEET_BASE", "https://fleet-api.prd.na.vn.cloud.tesla.com")
SCOPES = "openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds"
TOKEN_URL = "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token"
TOKEN_FILE = Path(os.environ.get("TESLA_TOKEN_FILE", str(Path(__file__).with_name("tesla_tokens.json"))))


def partner_register():
    r = httpx.post(TOKEN_URL, data={"grant_type": "client_credentials", "client_id": CLIENT_ID,
                                    "client_secret": CLIENT_SECRET, "scope": SCOPES.replace("offline_access ", ""),
                                    "audience": AUDIENCE})
    r.raise_for_status()
    partner = r.json()["access_token"]
    r = httpx.post(f"{AUDIENCE}/api/1/partner_accounts", json={"domain": DOMAIN},
                   headers={"Authorization": f"Bearer {partner}"})
    print("register:", r.status_code, r.text[:400])
    r = httpx.get(f"{AUDIENCE}/api/1/partner_accounts/public_key", params={"domain": DOMAIN},
                  headers={"Authorization": f"Bearer {partner}"})
    print("public_key check:", r.status_code, r.text[:400])


def login_url():
    q = {"response_type": "code", "client_id": CLIENT_ID, "redirect_uri": REDIRECT_URI,
         "scope": SCOPES, "state": secrets.token_hex(16), "prompt_missing_scopes": "true"}
    print("https://auth.tesla.com/oauth2/v3/authorize?" + urllib.parse.urlencode(q))
    print(f"\nAfter approving, pair the virtual key in the Tesla app: https://tesla.com/_ak/{DOMAIN}")


def exchange(code: str):
    r = httpx.post(TOKEN_URL, data={"grant_type": "authorization_code", "client_id": CLIENT_ID,
                                    "client_secret": CLIENT_SECRET, "code": code, "audience": AUDIENCE,
                                    "redirect_uri": REDIRECT_URI})
    r.raise_for_status()
    j = r.json()
    TOKEN_FILE.write_text(json.dumps({"access_token": j["access_token"], "refresh_token": j.get("refresh_token"),
                                      "expires_at": time.time() + int(j.get("expires_in", 3600))}))
    print("saved", TOKEN_FILE)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "partner-register":
        partner_register()
    elif cmd == "login-url":
        login_url()
    elif cmd == "exchange" and len(sys.argv) > 2:
        exchange(sys.argv[2])
    else:
        print(__doc__)
