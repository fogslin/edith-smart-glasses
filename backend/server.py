"""
EDITH smart-glasses backend (FastAPI).

Receives JPEG + WAV from the XIAO ESP32-S3 Sense, transcribes speech (Whisper API or
local faster-whisper), asks a vision-capable OpenAI-compatible LLM (xAI Grok by default)
with the Edith personality + Tesla tool calls, and returns HUD text + a 16 kHz mono
16-bit WAV for the MAX98357A.

Run:  uvicorn server:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import base64
import io
import json
import os
import re
import shutil
import struct
import subprocess
import time
import uuid
from collections import deque
from pathlib import Path

import httpx
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

import tesla

load_dotenv()
HERE = Path(__file__).resolve().parent

# ---------------------------------------------------------------- config
DEVICE_TOKEN = os.getenv("DEVICE_TOKEN", "change-me-device-token")

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.x.ai/v1").rstrip("/")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "grok-4.7")          # any vision-capable model
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "300"))

STT_PROVIDER = os.getenv("STT_PROVIDER", "openai")       # openai | local
STT_BASE_URL = os.getenv("STT_BASE_URL", "https://api.openai.com/v1").rstrip("/")
STT_API_KEY = os.getenv("STT_API_KEY", "")
STT_MODEL = os.getenv("STT_MODEL", "whisper-1")
LOCAL_WHISPER_MODEL = os.getenv("LOCAL_WHISPER_MODEL", "small")

TTS_PROVIDER = os.getenv("TTS_PROVIDER", "openai")       # openai | espeak | none
TTS_BASE_URL = os.getenv("TTS_BASE_URL", "https://api.openai.com/v1").rstrip("/")
TTS_API_KEY = os.getenv("TTS_API_KEY", "")
TTS_MODEL = os.getenv("TTS_MODEL", "gpt-4o-mini-tts")
TTS_VOICE = os.getenv("TTS_VOICE", "nova")

PERSONALITY_FILE = Path(os.getenv("PERSONALITY_FILE", str(HERE.parent / "prompts" / "personality.md")))
MUSIC_DIR = Path(os.getenv("MUSIC_DIR", str(HERE / "music")))
AUDIO_DIR = HERE / "_audio"
AUDIO_DIR.mkdir(exist_ok=True)

OUT_RATE = 16000  # what the glasses play

app = FastAPI(title="EDITH backend")
notifications: deque[str] = deque(maxlen=20)
history: deque[dict] = deque(maxlen=8)   # short rolling memory


def auth(key: str) -> dict:
    """Authorization header, omitted when no key is set (local servers like Ollama)."""
    return {"Authorization": f"Bearer {key}"} if key else {}


def load_personality() -> str:
    try:
        text = PERSONALITY_FILE.read_text(encoding="utf-8")
    except FileNotFoundError:
        return "You are Edith, a concise, witty assistant living in the user's glasses."
    m = re.search(r"<!-- PROMPT START -->(.*?)<!-- PROMPT END -->", text, re.S)
    return (m.group(1) if m else text).strip()


def check_token(token: str | None) -> None:
    if token != DEVICE_TOKEN:
        raise HTTPException(status_code=401, detail="bad device token")


# ---------------------------------------------------------------- speech to text
_local_model = None


async def transcribe(wav: bytes) -> tuple[str, str]:
    """Returns (text, detected_language)."""
    if not wav:
        return "", ""
    if STT_PROVIDER == "local":
        global _local_model
        from faster_whisper import WhisperModel  # pip install faster-whisper
        if _local_model is None:
            _local_model = WhisperModel(LOCAL_WHISPER_MODEL, device="auto", compute_type="int8")
        segments, info = _local_model.transcribe(io.BytesIO(wav), vad_filter=True)
        return " ".join(s.text.strip() for s in segments).strip(), info.language
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            f"{STT_BASE_URL}/audio/transcriptions",
            headers=auth(STT_API_KEY),
            files={"file": ("clip.wav", wav, "audio/wav")},
            data={"model": STT_MODEL, "response_format": "verbose_json"},
        )
        if r.status_code >= 400:   # some servers don't support verbose_json
            r = await c.post(
                f"{STT_BASE_URL}/audio/transcriptions",
                headers=auth(STT_API_KEY),
                files={"file": ("clip.wav", wav, "audio/wav")},
                data={"model": STT_MODEL},
            )
        r.raise_for_status()
        j = r.json()
        return j.get("text", "").strip(), j.get("language", "")


# ---------------------------------------------------------------- LLM
async def chat(messages: list[dict], tools: list[dict] | None = None) -> dict:
    body = {"model": LLM_MODEL, "messages": messages, "max_tokens": LLM_MAX_TOKENS}
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"
    async with httpx.AsyncClient(timeout=90) as c:
        r = await c.post(
            f"{LLM_BASE_URL}/chat/completions",
            headers={**auth(LLM_API_KEY), "Content-Type": "application/json"},
            json=body,
        )
        if r.status_code >= 400:
            raise HTTPException(502, f"LLM error {r.status_code}: {r.text[:300]}")
        return r.json()["choices"][0]["message"]


def user_content(text: str, jpg: bytes | None) -> list[dict] | str:
    if not jpg:
        return text
    b64 = base64.b64encode(jpg).decode()
    return [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
        {"type": "text", "text": text},
    ]


# ---------------------------------------------------------------- text to speech
def _pcm16_from_wav(data: bytes) -> tuple[np.ndarray, int, int]:
    """Minimal RIFF parser that tolerates streaming headers (size 0xFFFFFFFF)."""
    if data[:4] != b"RIFF":
        raise ValueError("not a WAV")
    pos, rate, ch, bits = 12, 24000, 1, 16
    while pos + 8 <= len(data):
        cid, size = data[pos:pos + 4], struct.unpack("<I", data[pos + 4:pos + 8])[0]
        if cid == b"fmt ":
            _, ch, rate, _, _, bits = struct.unpack("<HHIIHH", data[pos + 8:pos + 24])
        elif cid == b"data":
            raw = data[pos + 8:] if size in (0, 0xFFFFFFFF) else data[pos + 8:pos + 8 + size]
            if bits != 16:
                raise ValueError("only 16-bit WAV supported without ffmpeg")
            pcm = np.frombuffer(raw[: len(raw) // 2 * 2], dtype="<i2")
            return pcm, rate, ch
        pos += 8 + size + (size & 1)
    raise ValueError("no data chunk")


def to_device_wav(audio: bytes) -> bytes:
    """Convert any audio to 16 kHz mono s16 WAV for the glasses."""
    if shutil.which("ffmpeg"):
        p = subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", str(OUT_RATE),
             "-f", "s16le", "pipe:1"], input=audio, capture_output=True, check=True)
        pcm = np.frombuffer(p.stdout, dtype="<i2")
    else:
        pcm, rate, ch = _pcm16_from_wav(audio)
        if ch > 1:
            pcm = pcm.reshape(-1, ch).mean(axis=1).astype("<i2")
        if rate != OUT_RATE and len(pcm):
            n = int(len(pcm) * OUT_RATE / rate)
            pcm = np.interp(np.linspace(0, len(pcm) - 1, n), np.arange(len(pcm)), pcm).astype("<i2")
    return wav_header(len(pcm) * 2) + pcm.tobytes()


def wav_header(data_len: int, rate: int = OUT_RATE) -> bytes:
    return (b"RIFF" + struct.pack("<I", (36 + data_len) & 0xFFFFFFFF) + b"WAVEfmt "
            + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
            + b"data" + struct.pack("<I", data_len & 0xFFFFFFFF))


async def speak(text: str) -> str | None:
    """Synthesize text, store it, return a relative URL the glasses can GET."""
    if not text or TTS_PROVIDER == "none":
        return None
    try:
        if TTS_PROVIDER == "espeak":
            audio = subprocess.run(["espeak-ng", "--stdout", text], capture_output=True, check=True).stdout
        else:
            async with httpx.AsyncClient(timeout=60) as c:
                r = await c.post(
                    f"{TTS_BASE_URL}/audio/speech",
                    headers=auth(TTS_API_KEY),
                    json={"model": TTS_MODEL, "voice": TTS_VOICE, "input": text, "response_format": "wav"},
                )
                r.raise_for_status()
                audio = r.content
        wav = to_device_wav(audio)
    except Exception as e:  # TTS failure should never break the text reply
        print("TTS failed:", e)
        return None
    name = f"{uuid.uuid4().hex}.wav"
    (AUDIO_DIR / name).write_bytes(wav)
    for old in sorted(AUDIO_DIR.glob("*.wav"), key=lambda p: p.stat().st_mtime)[:-30]:
        old.unlink(missing_ok=True)
    return f"/api/v1/audio/{name}"


def hud_text(text: str, limit: int = 140) -> str:
    text = re.sub(r"[*_#`>]", "", text).strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


# ---------------------------------------------------------------- endpoints
@app.get("/health")
def health():
    return {"ok": True, "model": LLM_MODEL, "tesla_mode": tesla.MODE}


@app.post("/api/v1/assist")
async def assist(image: UploadFile | None = File(None), audio: UploadFile | None = File(None),
                 mode: str = Form("assist"), x_device_token: str | None = Header(None)):
    check_token(x_device_token)
    jpg = await image.read() if image else None
    wav = await audio.read() if audio else b""
    said, _ = await transcribe(wav)
    if not said:
        said = "(The user pressed the button but said nothing. Briefly describe what is in front of them.)"
    messages = [{"role": "system", "content": load_personality()}, *history,
                {"role": "user", "content": user_content(said, jpg)}]
    tools = tesla.TOOLS if tesla.enabled() else None
    msg = await chat(messages, tools)
    # one round of tool calls (Tesla)
    if msg.get("tool_calls"):
        messages.append(msg)
        for call in msg["tool_calls"]:
            args = json.loads(call["function"].get("arguments") or "{}")
            result = await tesla.run_tool(call["function"]["name"], args)
            messages.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(result)})
        msg = await chat(messages)
    reply = (msg.get("content") or "").strip() or "Done."
    history.extend([{"role": "user", "content": said}, {"role": "assistant", "content": reply}])
    return {"heard": said, "text": reply, "hud": hud_text(reply), "audio_url": await speak(reply)}


@app.post("/api/v1/translate")
async def translate(audio: UploadFile = File(...), target_lang: str = Form("English"),
                    mode: str = Form("translate"), x_device_token: str | None = Header(None)):
    check_token(x_device_token)
    said, lang = await transcribe(await audio.read())
    if not said:
        return {"text": "", "hud": "Didn't catch that.", "audio_url": None}
    msg = await chat([
        {"role": "system", "content": f"You are a live interpreter. Translate the user's text into {target_lang}. "
                                      "Reply with ONLY the translation, natural and short. If it is already in "
                                      f"{target_lang}, translate it into Spanish instead."},
        {"role": "user", "content": said}])
    out = (msg.get("content") or "").strip()
    return {"heard": said, "source_lang": lang, "text": out,
            "hud": hud_text(f"[{lang or '?'}] {out}"), "audio_url": await speak(out)}


@app.post("/api/v1/vision")
async def vision(image: UploadFile = File(...), mode: str = Form("vision"),
                 x_device_token: str | None = Header(None)):
    """'AR' = label overlay on a 2D HUD. No SLAM / world anchoring."""
    check_token(x_device_token)
    jpg = await image.read()
    msg = await chat([
        {"role": "system", "content": load_personality()},
        {"role": "user", "content": user_content(
            'Identify up to 4 notable things in this first-person photo. Respond ONLY as JSON: '
            '{"labels": ["<=18 chars each, left-to-right"], "say": "one short spoken sentence"}', jpg)}])
    raw = msg.get("content") or "{}"
    m = re.search(r"\{.*\}", raw, re.S)
    try:
        data = json.loads(m.group(0) if m else raw)
    except json.JSONDecodeError:
        data = {"labels": [], "say": raw}
    labels = [str(x)[:18] for x in data.get("labels", [])][:4]
    say = str(data.get("say", ""))
    return {"labels": labels, "text": say, "hud": hud_text(say), "audio_url": await speak(say)}


@app.get("/api/v1/audio/{name}")
def get_audio(name: str, x_device_token: str | None = Header(None)):
    check_token(x_device_token)
    path = AUDIO_DIR / Path(name).name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type="audio/wav")


@app.get("/api/v1/music/stream")
def music_stream(track: str | None = None, x_device_token: str | None = Header(None)):
    """Streams a local file (mp3/flac/wav...) as endless 16 kHz mono WAV. Needs ffmpeg."""
    check_token(x_device_token)
    if not shutil.which("ffmpeg"):
        raise HTTPException(500, "install ffmpeg for music streaming")
    files = sorted(p for p in MUSIC_DIR.glob("*") if p.suffix.lower() in {".mp3", ".wav", ".flac", ".ogg", ".m4a"})
    if track:
        files = [p for p in files if track.lower() in p.name.lower()] or files
    if not files:
        raise HTTPException(404, f"put audio files in {MUSIC_DIR}")

    def gen():
        yield wav_header(0xFFFFFFFF - 36)    # unknown length
        for f in files:
            proc = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-re", "-i", str(f), "-ac", "1",
                                     "-ar", str(OUT_RATE), "-f", "s16le", "pipe:1"], stdout=subprocess.PIPE)
            try:
                while chunk := proc.stdout.read(4096):
                    yield chunk
            finally:
                proc.kill()

    return StreamingResponse(gen(), media_type="audio/wav")


class Note(BaseModel):
    text: str


@app.post("/api/v1/notify")
def push_notify(note: Note, x_device_token: str | None = Header(None)):
    """Push a caption/notification to the HUD (from a phone shortcut, IFTTT, Home Assistant...)."""
    check_token(x_device_token)
    notifications.append(note.text[:200])
    return {"queued": len(notifications)}


@app.get("/api/v1/notify")
def pop_notify(x_device_token: str | None = Header(None)):
    check_token(x_device_token)
    return {"text": notifications.popleft() if notifications else ""}


@app.exception_handler(Exception)
async def on_error(_, exc: Exception):
    return JSONResponse(status_code=500, content={"text": "", "hud": f"Backend error: {str(exc)[:80]}"})
