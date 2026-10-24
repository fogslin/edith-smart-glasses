# EDITH — DIY AI smart glasses (XIAO ESP32-S3 Sense)

**Live guide:** https://fogslin.github.io/edith-smart-glasses/

`index.html` is an animated, step-by-step 3D assembly guide (a flat-pack-manual style that comes to life). Parts lie on a
build mat and fly into place one at a time. A soldering iron, screwdriver and tweezers do the work, red guides show the wire
routes, and solder joints pulse with labels. Each step has its own director camera, and the build ends with a turntable shot.
It is a single static file: Three.js r160 loads from unpkg.com through an importmap, and there is no build step at runtime.
It runs from `file://` or any static host (GitHub Pages, Netlify, S3…) and works on phones, where the panels collapse.

- **Left panel:** step / hardware / pieces counters, the current step card, and the manual page in line art.
  **Open the manual** opens the 2D assembly manual: one page per step with line art, a wiring diagram, solder points and
  notes, plus appendix pages for the parts list (verified links and prices), the GPIO map and Docs & code.
- **Right panel:** prev / play / next buttons, **The build** timeline (click a tick or drag to scrub), a Room / Drawing
  view toggle, a free camera and help.
- **Keys:** ← → or [ ] change step · space plays or pauses · 0–9 jump to a step · M opens the manual · ⇧V switches view ·
  ⇧K opens docs · Esc closes.
- **URL parameters:** `?step=7`, `?t=58`, `?play=0`, `?view=drawing`, `?speed=2`, `?manual=1`, `?docs=firmware`.
- **Docs & code drawer:** the full long-form guide. It covers the BOM, GPIO table, wiring diagrams, soldering, power,
  HUD optics, audio, heart rate, touch strip, lenses, firmware, backend, features, personality prompt, Tesla Fleet API
  and BLE, and safety. Every source file is embedded with a copy button.
- `build-guide.html` is the classic long-form page, kept as a static fallback.

The 16 build steps:
1. Lay out the parts
2. Tin the XIAO pads
3. Battery → switch → BAT pads
4. Camera module & antenna
5. I²C bus to the OLED
6. Mount OLED + HUD optic
7. Heart-rate sensor
8. I²S amp + bone transducer
9. Foil touch strip
10. Button + status LED
11. Route wires through the hinges
12. Close the pods
13. Charging port check
14. Flash the firmware
15. Pop in Rx / transitions lenses
16. EDITH, assembled

| Path | What |
|---|---|
| `index.html` | Animated 3D assembly guide, manual viewer and Docs & code drawer (generated) |
| `build-guide.html` | Classic long-form guide (generated) |
| `firmware/edith_glasses/edith_glasses.ino` | Arduino sketch (the folder name must match for the Arduino IDE) |
| `firmware/esphome-touch-strip.yaml` | ESPHome alternative for the touch-strip gestures |
| `backend/server.py`, `backend/tesla.py`, `backend/tesla_auth.py` | FastAPI backend + Tesla Fleet/BLE integration |
| `backend/.env.example`, `backend/requirements.txt` | Config template and Python dependencies |
| `prompts/personality.md` | Edith's system prompt and how to customise it |
| `tools/flat/` | Sources for the animated guide: `geo.js` (shared geometry, pin map, wire routes), `steps.js`, `manual.js` (line-art SVG), `ui.js`, `docs.js`, `head.html`/`body.html`, and `3d/s1…s5` (Three.js scene, models, choreography, render loop) |
| `tools/build_site.py` | Assembles `index.html` from `tools/flat/` plus the docs content |
| `tools/build_guide.py` | Rebuilds `build-guide.html` from `template_*.html` (re-embeds the source files) |

To rebuild after editing: `python3 tools/build_guide.py && python3 tools/build_site.py`.

**Default battery:** EEMB LP502030 (LP502030-PCM), 3.7 V 250 mAh LiPo, 20.5 × 31–32 × 5.3 mm, about 5 g, with a built-in PCM and
a JST 2.0 mm lead. [Product page](https://www.eemb.com/product-130) · [Amazon](https://www.amazon.com/dp/B08FD3V6TF), about
$9. Cut off the JST plug and solder the leads to the XIAO's BAT+/BAT− pads. Check the polarity first.

**Quick start:**
1. Flash the sketch: board `XIAO_ESP32S3`, PSRAM = OPI PSRAM, USB CDC On Boot = Enabled.
2. Start the backend:
   `cd backend && pip install -r requirements.txt && cp .env.example .env && uvicorn server:app --host 0.0.0.0 --port 8000`.

**GitHub Pages:** push this folder and enable Pages for the branch (root). The site URL becomes
`https://fogslin.github.io/edith-smart-glasses/`. The empty `.nojekyll` file is already included. It keeps Pages from
running Jekyll and lets you serve Tesla's `/.well-known/appspecific/com.tesla.3p.public-key.pem` from the same site.
Never commit `backend/.env`, private keys or `tesla_tokens.json`.
