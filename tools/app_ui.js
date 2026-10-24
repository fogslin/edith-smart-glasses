/* EDITH guide UI (classic script, works without WebGL) */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* file:// in some browsers */ } }
  };
  const CHECK_KEY = "edith-guide-checks-v1";
  let checks = store.get(CHECK_KEY, {});

  /* ------------------------------------------------------------ BOM */
  const CHECKED = "2026-10-22";
  const BOM = [
    { part: "Seeed Studio XIAO ESP32-S3 Sense", purpose: "MCU + Wi-Fi/BLE, 8 MB PSRAM, camera (OV3660/OV5640 on current boards, OV2640 earlier), PDM mic, LiPo charger", qty: 1, price: "≈ $14 (listed $13.99)", lo: 14, hi: 20, url: "https://www.seeedstudio.com/XIAO-ESP32S3-Sense-p-5639.html", vendor: "Seeed Studio", req: true },
    { part: "Adafruit I2S 3W Class D Amp — MAX98357A (#3006)", purpose: "I²S DAC + amplifier for speaker / bone conductor", qty: 1, price: "≈ $6 (listed $5.95)", lo: 6, hi: 6, url: "https://www.adafruit.com/product/3006", vendor: "Adafruit", req: true },
    { part: "Bone Conductor Transducer 8 Ω 1 W (#1674)", purpose: "Private audio through the skull (option A)", qty: 1, price: "≈ $9 (listed $8.95)", lo: 0, hi: 9, url: "https://www.adafruit.com/product/1674", vendor: "Adafruit", req: false },
    { part: "Mini Oval Speaker 8 Ω 1 W (#3923)", purpose: "Louder audio near the ear (option B)", qty: 1, price: "≈ $2 (listed $1.95)", lo: 2, hi: 2, url: "https://www.adafruit.com/product/3923", vendor: "Adafruit", req: false },
    { part: "EEMB LP502030 LiPo 3.7 V 250 mAh (LP502030-PCM, JST 2.0 mm)", purpose: "Default battery: 20.5 × 31–32 × 5.3 mm, 5 g, built-in PCM protection, red/black leads", qty: 1, price: "≈ $9 (Amazon 1-pack, listed $8.99)", lo: 9, hi: 9, url: "https://www.eemb.com/product-130", url2: "https://www.amazon.com/EEMB-Battery-Rechargeable-Lithium-Connector/dp/B08FD3V6TF", vendor: "EEMB (official)", vendor2: "Amazon", req: true },
    { part: "LiPo 3.7 V 350 / 400 / 500 mAh (Adafruit #2750 / #3898 / #1578)", purpose: "Alternative: longer runtime, needs a bigger pod", qty: "alt.", price: "≈ $7–8 (listed $6.95–7.95)", lo: 0, hi: 1, url: "https://www.adafruit.com/product/2750", url2: "https://www.adafruit.com/product/1578", vendor: "Adafruit", req: false },
    { part: "0.91″ 128×32 I²C OLED, SSD1306 (#4440)", purpose: "HUD display (compact)", qty: 1, price: "≈ $12.50", lo: 12.5, hi: 12.5, url: "https://www.adafruit.com/product/4440", vendor: "Adafruit", req: true },
    { part: "0.96″ 128×64 I²C OLED, SSD1306 (#326)", purpose: "HUD display (more lines; sketch default 128×64)", qty: "alt.", price: "≈ $17.50", lo: 0, hi: 5, url: "https://www.adafruit.com/product/326", vendor: "Adafruit", req: false },
    { part: "SparkFun Photodetector Breakout — MAX30101 (Qwiic) SEN-16474", purpose: "Heart-rate (PPG) on shared I²C; works with the MAX3010x library", qty: 1, price: "≈ $31 (listed $30.95)", lo: 31, hi: 31, url: "https://www.sparkfun.com/sparkfun-photodetector-breakout-max30101-qwiic.html", vendor: "SparkFun", req: false },
    { part: "Generic MAX30102 module (alternative)", purpose: "Cheaper, smaller heart-rate sensor (same library)", qty: "alt.", price: "≈ $3–8", lo: 0, hi: 0, url: "", vendor: "no verified link", req: false },
    { part: "Copper Foil Tape w/ Conductive Adhesive 6 mm (#1128)", purpose: "Touch-strip pads (3 pieces)", qty: 1, price: "≈ $6 (listed $5.95)", lo: 6, hi: 6, url: "https://www.adafruit.com/product/1128", vendor: "Adafruit", req: true },
    { part: "Grove — Touch Sensor (TTP223-BA6)", purpose: "Alternative to foil pads: tap-only (1×) or direction by timing (2×)", qty: "0–2", price: "≈ $4.30 each", lo: 0, hi: 8.6, url: "https://www.seeedstudio.com/Grove-Touch-Sensor.html", vendor: "Seeed Studio", req: false },
    { part: "Tactile switches 6 mm slim, 20-pack (#1489)", purpose: "Mode / action push button", qty: 1, price: "≈ $5 (listed $4.95)", lo: 5, hi: 5, url: "https://www.adafruit.com/product/1489", vendor: "Adafruit", req: true },
    { part: "SPDT slide switch (#805)", purpose: "Battery power switch", qty: 1, price: "≈ $1 (listed $0.95)", lo: 1, hi: 1, url: "https://www.adafruit.com/product/805", vendor: "Adafruit", req: true },
    { part: "Diffused red 5 mm LED, 25-pack (#299) + 330 Ω resistor", purpose: "Status / privacy LED (any small/SMD LED works)", qty: 1, price: "≈ $4 (pack)", lo: 4, hi: 4, url: "https://www.adafruit.com/product/299", vendor: "Adafruit", req: false },
    { part: "Silicone stranded wire 30 AWG (#2051)", purpose: "Flexible wiring through hinges", qty: "few m", price: "from ≈ $0.75 (per listed length)", lo: 2, hi: 5, url: "https://www.adafruit.com/product/2051", vendor: "Adafruit", req: true },
    { part: "Heat shrink pack (#344)", purpose: "Insulating joints", qty: 1, price: "≈ $5 (listed $4.95)", lo: 5, hi: 5, url: "https://www.adafruit.com/product/344", vendor: "Adafruit", req: true },
    { part: "50/50 beam-splitter plate or small cube/prism (~10–20 mm)", purpose: "HUD combiner in front of the lens", qty: 1, price: "≈ $8–25", lo: 8, hi: 25, url: "", vendor: "no verified link (any optics supplier)", req: true },
    { part: "Plano-convex lens, f ≈ 25–40 mm, ~10–15 mm Ø", purpose: "Lets the eye focus on the HUD", qty: 1, price: "≈ $5–20", lo: 5, hi: 20, url: "", vendor: "no verified link", req: true },
    { part: "Glasses frame with removable lenses", purpose: "Base frame; straight, thick temples", qty: 1, price: "≈ $10–60", lo: 10, hi: 60, url: "", vendor: "any optician / online", req: true },
    { part: "Rx / photochromic lenses (optician)", purpose: "Prescription or plano lenses cut to the frame", qty: "1 pair", price: "≈ $50–300+ (varies widely)", lo: 0, hi: 300, url: "", vendor: "local optician", req: false },
    { part: "Kapton tape, hot glue / UV resin, 3D-printed pods (optional)", purpose: "Insulation, strain relief, housings", qty: "—", price: "≈ $5–15", lo: 5, hi: 15, url: "", vendor: "generic", req: true }
  ];
  function renderBOM() {
    const tb = $("#bomTable tbody"); if (!tb) return;
    tb.innerHTML = BOM.map(b => {
      const link = b.url ? `<a href="${b.url}" target="_blank" rel="noopener">${b.vendor}</a>${b.url2 ? ` · <a href="${b.url2}" target="_blank" rel="noopener">${b.vendor2 || "alt"}</a>` : ""}` : `<span class="muted">${b.vendor}</span>`;
      return `<tr><td><b>${b.part}</b><br>${b.req ? '<span class="pill req">core</span>' : '<span class="pill opt">optional / alt.</span>'}</td><td>${b.purpose}</td><td>${b.qty}</td><td class="price">${b.price}</td><td>${link}</td></tr>`;
    }).join("");
    $("#bomTotal").textContent = `Rough total for a core build (XIAO, amp, transducer, EEMB 250 mAh cell, 0.91″ OLED, MAX30101, foil, switches, wire, optics, frame; excluding Rx lenses): about $110–190 (approximate, prices checked ${CHECKED}).`;
  }

  /* ------------------------------------------------------------ GPIO table */
  const GPIO = [
    ["D0", "GPIO1", "TOUCH1", "Touch pad A (front)", "Copper foil pad A", "30 AWG, keep < 5 cm"],
    ["D1", "GPIO2", "TOUCH2", "Touch pad B (middle)", "Copper foil pad B", ""],
    ["D2", "GPIO3", "TOUCH3", "I²S DIN (data out)", "MAX98357A DIN", "Strapping pin (JTAG source) — fine as output"],
    ["D3", "GPIO4", "TOUCH4", "Touch pad C (rear)", "Copper foil pad C", ""],
    ["D4", "GPIO5", "TOUCH5", "I²C SDA", "OLED SDA + MAX3010x SDA", "Shared bus, OLED 0x3C, sensor 0x57"],
    ["D5", "GPIO6", "TOUCH6", "I²C SCL", "OLED SCL + MAX3010x SCL", ""],
    ["D6", "GPIO43", "—", "I²S BCLK", "MAX98357A BCLK", "UART0 TX (boot log) — possible click at reset"],
    ["D7", "GPIO44", "—", "I²S LRC / WS", "MAX98357A LRC", "UART0 RX"],
    ["D8", "GPIO7", "TOUCH7", "Push button (INPUT_PULLUP)", "Button → GND", "Shared with microSD SCK — leave SD slot empty"],
    ["D9", "GPIO8", "TOUCH8", "free", "—", "microSD MISO"],
    ["D10", "GPIO9", "TOUCH9", "Status LED", "330 Ω → LED anode, cathode → GND", "microSD MOSI"],
    ["3V3", "—", "—", "3.3 V out (≤700 mA per Seeed)", "OLED VCC, MAX3010x VIN, amp VIN", ""],
    ["GND", "—", "—", "Ground", "All grounds", ""],
    ["BAT+ / BAT−", "underside pads", "—", "LiPo + onboard charger", "Battery via slide switch on +", "BAT− is the pad nearer the USB port"],
    ["(onboard)", "GPIO42 / GPIO41", "—", "PDM mic CLK / DATA", "Sense board mic", "Do not wire"],
    ["(onboard)", "GPIO10–18, 38–40, 47, 48", "—", "Camera (XCLK 10, SIOD 40, SIOC 39, VSYNC 38, HREF 47, PCLK 13, Y2–Y9)", "Sense board camera", "Do not wire"],
    ["(onboard)", "GPIO21", "—", "User LED (active low) / SD CS", "—", "Not used by this sketch"]
  ];
  function renderGPIO() {
    const tb = $("#gpioTable tbody"); if (!tb) return;
    tb.innerHTML = GPIO.map(r => `<tr><td class="pin">${r[0]}</td><td class="pin">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td class="small muted">${r[5]}</td></tr>`).join("");
  }

  /* ------------------------------------------------------------ Wiring SVG generator */
  const COL = { pwr: "#f87171", gnd: "#94a3b8", v33: "#fb7185", sda: "#60a5fa", scl: "#facc15", din: "#4ade80", bclk: "#c084fc", lrc: "#fb923c", io: "#22d3ee", touch: "#f1f5f9", spk: "#f472b6" };
  const LEFT = ["D0", "D1", "D2", "D3", "D4", "D5", "D6"];
  const RIGHT = ["5V", "GND", "3V3", "D10", "D9", "D8", "D7"];
  const BX = 360, BW = 180, BY = 80, PITCH = 40;
  function pinXY(p) {
    let i = LEFT.indexOf(p); if (i >= 0) return { x: BX, y: BY + 40 + i * PITCH, side: "L" };
    i = RIGHT.indexOf(p); if (i >= 0) return { x: BX + BW, y: BY + 40 + i * PITCH, side: "R" };
    if (p === "BAT-") return { x: BX + 60, y: BY + 360, side: "B" };
    if (p === "BAT+") return { x: BX + 120, y: BY + 360, side: "B" };
    return null;
  }
  const PIN_LABEL = { D0: "D0·G1", D1: "D1·G2", D2: "D2·G3", D3: "D3·G4", D4: "D4·G5 SDA", D5: "D5·G6 SCL", D6: "D6·G43", D7: "D7·G44", D8: "D8·G7", D9: "D9·G8", D10: "D10·G9", "3V3": "3V3", GND: "GND", "5V": "5V" };
  const DIAGRAMS = {
    power: {
      title: "Power: LiPo → switch → BAT pads (underside)", used: ["BAT+", "BAT-"],
      comps: [
        { id: "bat", label: "EEMB LP502030 3.7 V 250 mAh", x: 40, y: 300, w: 200, h: 90, terms: [["+", "R", 25], ["−", "R", 65]] },
        { id: "sw", label: "SPDT slide switch", x: 690, y: 300, w: 170, h: 70, terms: [["COM", "L", 20], ["OUT", "L", 50]] }
      ],
      wires: [
        { pts: "bat:+>sw:COM", c: COL.pwr, label: "red (battery +)", via: [[300, 325], [300, 50], [640, 50], [640, 320]], lp: [420, 44] },
        { pts: "sw:OUT>BAT+", c: COL.pwr, label: "red → BAT+", via: [[620, 350], [620, 505], [480, 505]], lp: [630, 470] },
        { pts: "BAT->bat:−", c: COL.gnd, label: "black: BAT− → battery −", via: [[420, 525], [280, 525], [280, 365]], lp: [150, 520] }
      ],
      notes: "Current flows battery + → switch → BAT+; BAT− returns to battery −. BAT− is the underside pad nearer the USB-C port. Charging: plug USB-C into the XIAO (switch ON)."
    },
    i2c: {
      title: "Shared I²C bus: OLED (0x3C) + MAX3010x (0x57)", used: ["D4", "D5", "3V3", "GND"],
      comps: [
        { id: "oled", label: "SSD1306 OLED (HUD)", x: 40, y: 110, w: 190, h: 130, terms: [["VCC", "R", 25], ["GND", "R", 55], ["SDA", "R", 85], ["SCL", "R", 112]] },
        { id: "hr", label: "MAX30102 / MAX30101", x: 690, y: 330, w: 180, h: 130, terms: [["VIN", "L", 25], ["GND", "L", 55], ["SDA", "L", 85], ["SCL", "L", 112]] }
      ],
      wires: [
        { pts: "D4>oled:SDA", c: COL.sda, label: "SDA", lane: 0 },
        { pts: "D5>oled:SCL", c: COL.scl, label: "SCL", lane: 1 },
        { pts: "3V3>oled:VCC", c: COL.v33, label: "3V3", lane: 2 },
        { pts: "GND>oled:GND", c: COL.gnd, label: "GND", lane: 1 },
        { pts: "3V3>hr:VIN", c: COL.v33, lane: 0 },
        { pts: "GND>hr:GND", c: COL.gnd, lane: 1 },
        { pts: "D4>hr:SDA", c: COL.sda, via: [[344, 280], [344, 500], [650, 500], [650, 415]] },
        { pts: "D5>hr:SCL", c: COL.scl, via: [[290, 320], [290, 515], [668, 515], [668, 442]] }
      ],
      notes: "Both devices hang on the same two wires (daisy-chain them physically: XIAO → OLED → sensor). 3.3 V only. Keep the bus short; most breakouts already include pull-ups."
    },
    i2s: {
      title: "I²S audio: MAX98357A + speaker / bone conductor", used: ["D2", "D6", "D7", "3V3", "GND"],
      comps: [
        { id: "amp", label: "MAX98357A", x: 690, y: 90, w: 170, h: 170, terms: [["LRC", "L", 25], ["BCLK", "L", 55], ["DIN", "L", 85], ["VIN", "L", 115], ["GND", "L", 145]] },
        { id: "spk", label: "8 Ω speaker / bone transducer", x: 690, y: 340, w: 180, h: 70, terms: [["+", "L", 22], ["−", "L", 50]] }
      ],
      wires: [
        { pts: "D7>amp:LRC", c: COL.lrc, label: "LRC", lane: 3 },
        { pts: "D6>amp:BCLK", c: COL.bclk, label: "BCLK", via: [[330, 360], [330, 50], [640, 50], [640, 145]] },
        { pts: "D2>amp:DIN", c: COL.din, label: "DIN", via: [[310, 200], [310, 40], [655, 40], [655, 175]] },
        { pts: "3V3>amp:VIN", c: COL.v33, lane: 1 },
        { pts: "GND>amp:GND", c: COL.gnd, lane: 0 },
        { pts: "amp:+>spk:+", c: COL.spk, src: [860, 210], via: [[885, 210], [885, 300], [660, 300], [660, 362]] },
        { pts: "amp:−>spk:−", c: COL.spk, src: [860, 235], via: [[895, 235], [895, 430], [650, 430], [650, 390]] }
      ],
      notes: "LRC = D7 (GPIO44), BCLK = D6 (GPIO43), DIN = D2 (GPIO3). GAIN and SD left unconnected. Output is bridged (+/−): never connect either speaker lead to GND."
    },
    io: {
      title: "Button + status LED", used: ["D8", "D10"],
      comps: [
        { id: "led", label: "330 Ω → LED", x: 700, y: 200, w: 160, h: 80, terms: [["R", "L", 22], ["K", "L", 58]] },
        { id: "btn", label: "Push button", x: 700, y: 330, w: 160, h: 70, terms: [["1", "L", 22], ["2", "L", 50]] }
      ],
      wires: [
        { pts: "D10>led:R", c: COL.io, label: "D10 → resistor → anode", via: [[620, 240], [620, 222]], lp: [560, 190] },
        { pts: "led:K>gnd", c: COL.gnd, src: [700, 258], via: [[660, 258]], dst: [660, 296], gnd: true },
        { pts: "D8>btn:1", c: COL.io, label: "D8 (INPUT_PULLUP)", via: [[600, 320], [600, 352]], lp: [552, 312] },
        { pts: "btn:2>gnd", c: COL.gnd, src: [700, 380], via: [[650, 380]], dst: [650, 430], gnd: true }
      ],
      notes: "⏚ = any XIAO GND pad. Pressed = LOW (internal pull-up). LED: GPIO HIGH = on. Use a small SMD LED in the pod front as a camera-active privacy light."
    },
    touch: {
      title: "Touch strip: 3 copper-foil pads", used: ["D0", "D1", "D3"],
      comps: [
        { id: "pa", label: "Pad A (front)", x: 40, y: 80, w: 160, h: 60, terms: [["tab", "R", 30]] },
        { id: "pb", label: "Pad B (middle)", x: 40, y: 170, w: 160, h: 60, terms: [["tab", "R", 30]] },
        { id: "pc", label: "Pad C (rear)", x: 40, y: 260, w: 160, h: 60, terms: [["tab", "R", 30]] },
        { id: "gd", label: "Optional ground foil (inside of temple)", x: 40, y: 380, w: 220, h: 50, terms: [["tab", "R", 25]] }
      ],
      wires: [
        { pts: "D0>pa:tab", c: COL.touch, label: "TOUCH1", lane: 0 },
        { pts: "D1>pb:tab", c: COL.touch, label: "TOUCH2", lane: 1 },
        { pts: "D3>pc:tab", c: COL.touch, label: "TOUCH4", lane: 2 },
        { pts: "GND>gd:tab", c: COL.gnd, label: "GND (optional)", via: [[600, 160], [600, 520], [300, 520], [300, 405]], dash: true }
      ],
      notes: "Pads 8–10 mm centre-to-centre, ~2 mm gaps, ≥10 mm from the hinge and away from the battery. Swipe C→B→A = forward (vol +), A→B→C = back (vol −). Arrows point toward the sensing pad (the ESP32-S3 drives and measures each pad)."
    }
  };
  function compTerm(d, ref) {
    const [cid, tname] = ref.split(":");
    const c = d.comps.find(k => k.id === cid); if (!c) return null;
    const t = c.terms.find(k => k[0] === tname); if (!t) return null;
    const x = t[1] === "L" ? c.x : c.x + c.w;
    return { x, y: c.y + t[2], side: t[1] };
  }
  function endpoint(d, ref) { return ref.includes(":") ? compTerm(d, ref) : pinXY(ref); }
  function buildSVG(key, opts = {}) {
    const d = DIAGRAMS[key]; const mini = !!opts.mini;
    const ns = 'xmlns="http://www.w3.org/2000/svg"';
    let s = `<svg ${ns} viewBox="0 0 900 540" role="img" aria-label="${d.title}">`;
    const colors = [...new Set(d.wires.map(w => w.c))];
    s += "<defs>" + colors.map((c, i) => `<marker id="ah-${key}-${i}${mini ? "m" : ""}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join("") + "</defs>";
    s += `<text x="20" y="30" fill="#cfe0ff" font-size="17" font-weight="600">${d.title}</text>`;
    // XIAO board
    s += `<rect x="${BX}" y="${BY}" width="${BW}" height="320" rx="14" fill="#13213a" stroke="#3b5384" stroke-width="2"/>`;
    s += `<rect x="${BX + 62}" y="${BY - 14}" width="56" height="26" rx="5" fill="#64748b"/><text x="${BX + 90}" y="${BY + 4}" fill="#0b1220" font-size="11" text-anchor="middle" font-weight="700">USB-C</text>`;
    s += `<text x="${BX + 90}" y="${BY + 175}" fill="#93a4c3" font-size="13" text-anchor="middle">XIAO</text><text x="${BX + 90}" y="${BY + 193}" fill="#93a4c3" font-size="13" text-anchor="middle">ESP32-S3 Sense</text>`;
    s += `<text x="${BX + 90}" y="${BY + 211}" fill="#5d6f92" font-size="10.5" text-anchor="middle">(component side up)</text>`;
    const used = new Set(d.used);
    LEFT.concat(RIGHT).forEach(p => {
      const q = pinXY(p); const on = used.has(p);
      s += `<circle cx="${q.x}" cy="${q.y}" r="${on ? 7 : 5}" fill="${on ? "#5eead4" : "#26375a"}" stroke="#0b1220" stroke-width="2">${on ? '<animate attributeName="r" values="6;9;6" dur="1.4s" repeatCount="indefinite"/>' : ""}</circle>`;
      const lx = q.side === "L" ? q.x + 14 : q.x - 14;
      s += `<text x="${lx}" y="${q.y + 4}" fill="${on ? "#e6edf7" : "#5d6f92"}" font-size="12" text-anchor="${q.side === "L" ? "start" : "end"}" font-family="monospace">${PIN_LABEL[p] || p}</text>`;
    });
    // underside pads
    s += `<rect x="${BX + 20}" y="${BY + 335}" width="${BW - 40}" height="50" rx="8" fill="#0f1a2e" stroke="#3b5384" stroke-dasharray="4 3"/>`;
    s += `<text x="${BX + 90}" y="${BY + 400}" fill="#93a4c3" font-size="11" text-anchor="middle">underside pads (BAT− nearer USB)</text>`;
    ["BAT-", "BAT+"].forEach(p => { const q = pinXY(p); const on = used.has(p);
      s += `<rect x="${q.x - 16}" y="${q.y - 9}" width="32" height="18" rx="4" fill="${on ? "#5eead4" : "#26375a"}"/><text x="${q.x}" y="${q.y + 4}" font-size="10" text-anchor="middle" fill="#06121a" font-weight="700">${p.replace("-", "−")}</text>`; });
    // components
    d.comps.forEach(c => {
      s += `<g><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="12" fill="#121c30" stroke="#a78bfa" stroke-width="1.6"/>`;
      s += `<text x="${c.x + c.w / 2}" y="${c.y - 8}" fill="#c4b5fd" font-size="13" text-anchor="middle" font-weight="600">${c.label}</text>`;
      c.terms.forEach(t => { const x = t[1] === "L" ? c.x : c.x + c.w; const y = c.y + t[2];
        s += `<circle cx="${x}" cy="${y}" r="5" fill="#a78bfa"/><text x="${t[1] === "L" ? x + 10 : x - 10}" y="${y + 4}" fill="#dbe7ff" font-size="11.5" text-anchor="${t[1] === "L" ? "start" : "end"}" font-family="monospace">${t[0]}</text>`; });
      s += "</g>";
    });
    // wires
    d.wires.forEach((w, wi) => {
      const [a, b] = w.pts.split(">");
      const A = w.src ? { x: w.src[0], y: w.src[1], side: "X" } : endpoint(d, a);
      const B = w.dst ? { x: w.dst[0], y: w.dst[1], side: "X" } : endpoint(d, b);
      if (!A || !B) return;
      let pts = [[A.x, A.y]];
      if (w.via) pts = pts.concat(w.via);
      else {
        const lane = w.lane || 0;
        const ox = A.side === "L" ? A.x - 40 - lane * 16 : A.side === "R" ? A.x + 40 + lane * 16 : A.x;
        pts.push([ox, A.y]);
        if ((A.side === "L" && B.x < BX) || (A.side === "R" && B.x > BX + BW)) pts.push([ox, B.y]);
        else { const ty = BY - 30 - lane * 10; pts.push([ox, ty]); const bx = B.side === "L" ? B.x - 30 - lane * 12 : B.x + 30 + lane * 12; pts.push([bx, ty]); pts.push([bx, B.y]); }
      }
      pts.push([B.x, B.y]);
      const dstr = "M" + pts.map(p => p.join(",")).join(" L");
      const mi = colors.indexOf(w.c);
      s += `<path d="${dstr}" fill="none" stroke="${w.c}" stroke-opacity=".25" stroke-width="7" stroke-linejoin="round"/>`;
      s += `<path class="draw" style="animation-delay:${wi * 0.18}s" d="${dstr}" fill="none" stroke="${w.c}" stroke-width="2.6" stroke-linejoin="round" ${w.dash ? 'stroke-dasharray="6 5"' : ""} marker-end="url(#ah-${key}-${mi}${mini ? "m" : ""})"/>`;
      s += `<path class="flow" d="${dstr}" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.2"/>`;
      if (w.gnd) { const g = pts[pts.length - 1]; s += `<g stroke="${COL.gnd}" stroke-width="2.2"><line x1="${g[0] - 12}" y1="${g[1] + 8}" x2="${g[0] + 12}" y2="${g[1] + 8}"/><line x1="${g[0] - 7}" y1="${g[1] + 13}" x2="${g[0] + 7}" y2="${g[1] + 13}"/><line x1="${g[0] - 3}" y1="${g[1] + 18}" x2="${g[0] + 3}" y2="${g[1] + 18}"/></g>`; }
      if (w.label && !mini) { const m = w.lp ? [w.lp[0] - 6, w.lp[1] + 6] : pts[Math.min(1, pts.length - 1)]; s += `<text x="${m[0] + 6}" y="${m[1] - 6}" fill="${w.c}" font-size="11" font-weight="600">${w.label}</text>`; }
    });
    s += "</svg>";
    return s;
  }
  function renderWiring(key) {
    const box = $("#wireSvg"); if (!box) return;
    box.innerHTML = buildSVG(key);
    $("#wireNotes").textContent = DIAGRAMS[key].notes;
    $$("#wireTabs .btn").forEach(b => b.classList.toggle("on", b.dataset.k === key));
    const leg = { power: [["Battery +", COL.pwr], ["GND", COL.gnd]], i2c: [["SDA", COL.sda], ["SCL", COL.scl], ["3V3", COL.v33], ["GND", COL.gnd]], i2s: [["LRC", COL.lrc], ["BCLK", COL.bclk], ["DIN", COL.din], ["3V3", COL.v33], ["Speaker", COL.spk]], io: [["GPIO", COL.io], ["GND (⏚)", COL.gnd]], touch: [["Touch", COL.touch], ["GND", COL.gnd]] }[key];
    $("#wireLegend").innerHTML = leg.map(l => `<span><i style="background:${l[1]}"></i>${l[0]}</span>`).join("");
  }
  function initWiringTabs() {
    const t = $("#wireTabs"); if (!t) return;
    const names = { power: "⚡ Power", i2c: "🖥 I²C (OLED + HR)", i2s: "🔊 I²S audio", io: "🔘 Button + LED", touch: "👆 Touch strip" };
    t.innerHTML = Object.keys(names).map(k => `<button class="btn sm" data-k="${k}">${names[k]}</button>`).join("");
    t.addEventListener("click", e => { const b = e.target.closest("button"); if (b) renderWiring(b.dataset.k); });
    renderWiring("power");
  }

  /* ------------------------------------------------------------ Steps (3D stepper) */
  const STEPS = [
    { id: "intro", title: "Meet EDITH", focus: "overview", parts: [], wires: [], pads: [], svg: null,
      html: `<p>The finished glasses: electronics pod on the <b>right</b> temple, battery on the <b>left</b> for balance, HUD optic above the right lens, touch strip and audio along the right temple.</p><ul><li>Click any part for details.</li><li>Toggle <b>Exploded view</b> anytime.</li><li>Use <span class="kbd">→</span> to begin.</li></ul>` },
    { id: "frame", title: "Frame & lenses", focus: "frame", parts: ["frame", "lensL", "lensR"], wires: [], pads: [], svg: null, link: "#lenses",
      html: `<p>Start with a frame that has <b>removable lenses</b> and straight temples ≥5 mm tall. Have an optician fit Rx / photochromic lenses and measure your PD with the pods dry-fitted.</p><ul><li>Plan the HUD in the upper-outer part of the right lens.</li><li>Cut a groove behind the brow bar for wires.</li></ul>` },
    { id: "tin", title: "Prep & tin the XIAO pads", focus: "xiao", parts: ["xiao"], wires: [], pads: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D10", "3V3", "GND"], svg: null, link: "#soldering",
      html: `<p>Remove the Sense board (slide sideways), then <b>tin</b> each pad you'll use. Direct-wire (no headers) keeps the pod thin.</p><ul><li>Pads: D0 D1 D2 D3 D4 D5 D6 D7 D8 D10 3V3 GND.</li><li>Iron ≈330–350 °C, flux, 1 s per pad.</li></ul>` },
    { id: "battery", title: "Battery → switch → BAT pads", focus: "battery", parts: ["battery", "switch"], wires: ["power"], pads: ["BAT+", "BAT-", "SW"], svg: "power", link: "#power",
      html: `<p>LiPo on the <b>left</b> temple; red lead through the <b>slide switch</b>, both leads across the hinge and brow groove to the XIAO's <b>underside</b> pads.</p><ul><li><b>BAT−</b> = pad nearer the USB port; <b>BAT+</b> = farther pad.</li><li>Heat-shrink the switch joints; leave a hinge service loop.</li></ul>` },
    { id: "charge", title: "USB-C charging port", focus: "usb", parts: ["xiao", "usb", "podR"], wires: [], pads: ["USB-C"], svg: null, link: "#power",
      html: `<p>Mount the XIAO flat on the temple with the <b>USB-C port facing backward</b> through a slot in the pod. The onboard charger fills the LiPo when USB is plugged in (switch ON).</p><ul><li>Red charge LED flashes while charging, off when full.</li><li>Dry-fit the camera ribbon first (see notes).</li></ul>` },
    { id: "camera", title: "Camera & mic (onboard)", focus: "camera", parts: ["sense", "camera"], wires: [], pads: ["CAM", "MIC"], svg: null, link: "#gpio",
      html: `<p>Click the <b>Sense board</b> back onto the B2B connector. The camera (OV3660/OV5640 on current boards) folds forward to look through the pod's front hole; the PDM mic is on GPIO42 (CLK) / GPIO41 (DATA). Nothing to wire.</p><ul><li>Keep the heat sink on the back thermal pad.</li></ul>` },
    { id: "hud", title: "HUD: OLED on I²C + optic", focus: "hud", parts: ["oled", "hudlens", "splitter", "hudarm"], wires: ["i2c_oled"], pads: ["D4", "D5", "3V3", "GND"], svg: "i2c", link: "#hud",
      html: `<p>OLED faces down from an arm above the right lens; a small lens then a 45° <b>beam-splitter</b> reflects it to your eye.</p><ul><li>VCC→3V3, GND→GND, <b>SDA→D4</b>, <b>SCL→D5</b>.</li><li>Address 0x3C. Mirror the text if it reads backwards.</li></ul>` },
    { id: "heart", title: "Heart-rate sensor (shared I²C)", focus: "heart", parts: ["hr"], wires: ["i2c_hr"], pads: ["D4", "D5"], svg: "i2c", link: "#heart",
      html: `<p>MAX30102/30101 on the inside of the right temple, against the skin in front of the ear. It shares SDA/SCL (0x57) — daisy-chain from the OLED.</p>` },
    { id: "audio", title: "I²S amp + speaker / bone conductor", focus: "audio", parts: ["amp", "speaker"], wires: ["i2s", "spk"], pads: ["D2", "D6", "D7"], svg: "i2s", link: "#audio",
      html: `<p>MAX98357A on the inner temple; transducer just in front of the ear.</p><ul><li><b>LRC→D7</b> (GPIO44), <b>BCLK→D6</b> (GPIO43), <b>DIN→D2</b> (GPIO3), VIN→3V3, GND.</li><li>Amp +/− to the speaker; never ground a speaker lead.</li></ul>` },
    { id: "io", title: "Button + status LED", focus: "io", parts: ["button", "led"], wires: ["io"], pads: ["D8", "D10"], svg: "io", link: "#gpio",
      html: `<p>Button on top of the right temple: <b>D8</b> ↔ GND (internal pull-up). Status/privacy LED at the pod front: <b>D10</b> → 330 Ω → LED → GND.</p><ul><li>Short press = action, long press = next mode.</li></ul>` },
    { id: "touch", title: "Capacitive touch strip", focus: "touch", parts: ["padA", "padB", "padC"], wires: ["touch"], pads: ["D0", "D1", "D3", "PAD A", "PAD B", "PAD C"], svg: "touch", link: "#touch",
      html: `<p>Three 6 mm copper-foil pads (~8 mm long, 8–10 mm apart) in a shallow channel on the <b>outer right temple</b>, covered by vinyl/paint.</p><ul><li><b>A→D0</b> (TOUCH1), <b>B→D1</b> (TOUCH2), <b>C→D3</b> (TOUCH4).</li><li>Swipe fwd = vol+, back = vol−, tap = play/pause, double-tap = wake Edith.</li><li>Solder the 30 AWG wire to a folded foil tab in &lt;1 s at low heat.</li></ul>` },
    { id: "finish", title: "Insulate, route & close the pods", focus: "overview", parts: ["podR", "podL"], wires: ["all"], pads: [], svg: null, link: "#soldering",
      html: `<p>Kapton over the board back, heat-shrink on every joint, hot-glue strain relief, service loops at both hinges, then close the pods.</p><ul><li>Continuity check: BAT+↔BAT− and 3V3↔GND must not beep.</li></ul>` },
    { id: "flash", title: "Flash the firmware", focus: "usb", parts: ["usb"], wires: [], pads: ["USB-C"], svg: null, link: "#firmware",
      html: `<p>Arduino IDE 2 → esp32 by Espressif (3.x) → board <b>XIAO_ESP32S3</b>, <b>PSRAM: OPI PSRAM</b>, <b>USB CDC On Boot: Enabled</b>. Fill Wi-Fi/backend placeholders and upload.</p><ul><li>No port? Hold <b>BOOT</b> while plugging in USB.</li></ul>` },
    { id: "backend", title: "Backend + Grok / custom AI", focus: "overview", parts: [], wires: [], pads: [], svg: null, link: "#backend", radio: true,
      html: `<p>Run <code>uvicorn server:app --host 0.0.0.0 --port 8000</code> on your PC/Pi. Whisper → vision LLM (e.g. Grok at <code>https://api.x.ai/v1</code>) → TTS → back to the glasses.</p><ul><li>Edit <code>prompts/personality.md</code> to change Edith.</li></ul>` },
    { id: "tesla", title: "Tesla: Fleet API & BLE", focus: "overview", parts: [], wires: [], pads: [], svg: null, link: "#tesla-fleet", radio: true,
      html: `<p>Say “lock the car” → LLM tool call → <code>door_lock</code> via <code>tesla-http-proxy</code> (cloud) or <code>tesla-control -ble lock</code> (local, after NFC-card pairing).</p>` },
    { id: "finale", title: "Finale — assembled EDITH", focus: "overview", parts: [], wires: [], pads: [], svg: null, finale: true,
      html: `<p>All parts in place, wires hidden, pods closed. Toggle <b>Exploded view</b> to see every component pull apart.</p><ul><li>Right temple: XIAO pod, camera, LED, button, touch strip, amp, transducer, heart sensor.</li><li>Left temple: LiPo + power switch.</li><li>Front: HUD OLED + lens + beam-splitter.</li></ul>` }
  ];
  const STEP_KEY = "edith-guide-step-v1";
  let cur = 0;
  function setStep(i, opts = {}) {
    cur = Math.max(0, Math.min(STEPS.length - 1, i));
    const s = STEPS[cur];
    $("#spCount").textContent = `Step ${cur + 1} / ${STEPS.length}`;
    $("#spTitle").textContent = s.title;
    let body = s.html;
    if (s.svg) body += `<div class="mini-svg">${buildSVG(s.svg, { mini: true })}</div>`;
    if (s.link) body += `<p class="small"><a href="${s.link}">Full instructions →</a></p>`;
    $("#spBody").innerHTML = body;
    $("#spDone").checked = !!checks["step-" + s.id];
    $("#prevBtn").disabled = cur === 0;
    $("#nextBtn").textContent = cur === STEPS.length - 1 ? "Restart ↺" : "Next →";
    $$("#stepList button").forEach((b, k) => { b.classList.toggle("cur", k === cur); b.classList.toggle("seen", !!checks["step-" + STEPS[k].id]); b.setAttribute("aria-selected", k === cur); });
    store.set(STEP_KEY, cur);
    if (!opts.silent && window.EDITH3D && window.EDITH3D.goStep) window.EDITH3D.goStep(s, cur);
  }
  function initStepper() {
    const list = $("#stepList");
    list.innerHTML = STEPS.map((s, k) => `<button role="tab" data-i="${k}">${k + 1}. ${s.title}</button>`).join("");
    list.addEventListener("click", e => { const b = e.target.closest("button"); if (b) setStep(+b.dataset.i); });
    $("#prevBtn").onclick = () => setStep(cur - 1);
    $("#nextBtn").onclick = () => setStep(cur === STEPS.length - 1 ? 0 : cur + 1);
    $("#spDone").onchange = e => { checks["step-" + STEPS[cur].id] = e.target.checked; store.set(CHECK_KEY, checks); setStep(cur, { silent: true }); updateProgress(); };
    document.addEventListener("keydown", e => {
      const tg = e.target; if (tg && tg.closest && tg.closest("textarea,select,[contenteditable],input:not([type=checkbox])")) return;
      if (e.key === "ArrowRight") { setStep(cur + 1); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { setStep(cur - 1); e.preventDefault(); }
      else if (window.EDITH3D && "erwl".includes(e.key.toLowerCase()) && !e.ctrlKey && !e.metaKey) window.EDITH3D.key(e.key.toLowerCase());
    });
    const m = location.hash.match(/step=(\d+)/);
    const start = m ? (+m[1] - 1) : store.get(STEP_KEY, 0);
    setStep(start || 0);
  }

  /* ------------------------------------------------------------ checkboxes */
  function initChecks() {
    $$("ol.steps").forEach(ol => {
      $$(":scope > li", ol).forEach(li => {
        const id = li.dataset.id; if (!id) return;
        const lab = document.createElement("label"); lab.className = "chk";
        lab.innerHTML = `<input type="checkbox" aria-label="Mark step done"> done`;
        const cb = lab.querySelector("input"); cb.checked = !!checks[id];
        li.classList.toggle("done", cb.checked);
        cb.addEventListener("change", () => { checks[id] = cb.checked; li.classList.toggle("done", cb.checked); store.set(CHECK_KEY, checks); updateProgress(); });
        li.appendChild(lab);
      });
    });
    $("#resetChecks").onclick = () => { if (!confirm("Clear all saved checkboxes?")) return; checks = {}; store.set(CHECK_KEY, checks); $$("ol.steps input").forEach(c => { c.checked = false; c.closest("li").classList.remove("done"); }); setStep(cur, { silent: true }); updateProgress(); };
    updateProgress();
  }
  function updateProgress() {
    const all = $$("ol.steps > li[data-id]");
    const done = all.filter(li => checks[li.dataset.id]).length + STEPS.filter(s => checks["step-" + s.id]).length;
    const total = all.length + STEPS.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    $("#progTxt").textContent = pct + "%"; $("#progBar").style.width = pct + "%";
    $$("[data-prog]").forEach(sp => { const g = sp.dataset.prog; const items = $$(`ol.steps[data-group="${g}"] > li[data-id]`); const n = items.filter(li => checks[li.dataset.id]).length; sp.textContent = items.length ? `${n}/${items.length}` : ""; });
  }

  /* ------------------------------------------------------------ code copy */
  function initCode() {
    $$(".codeblock").forEach(cb => {
      const btn = cb.querySelector(".copy"); const pre = cb.querySelector("pre");
      btn && btn.addEventListener("click", async () => {
        const txt = pre.textContent; let ok = false;
        try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) {
          const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
          try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } ta.remove();
        }
        btn.textContent = ok ? "✓ Copied" : "Select & copy"; setTimeout(() => btn.textContent = "⧉ Copy", 1600);
      });
      const exp = cb.querySelector(".expand");
      exp && exp.addEventListener("click", () => { cb.classList.toggle("collapsed"); exp.textContent = cb.classList.contains("collapsed") ? "⤢ Expand" : "⤡ Collapse"; });
    });
  }

  /* ------------------------------------------------------------ nav highlight */
  function initNav() {
    const links = $$("nav.sidebar a[href^='#']");
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver(es => { es.forEach(en => { if (en.isIntersecting) { links.forEach(l => l.classList.remove("active")); const a = map.get(en.target.id); a && a.classList.add("active"); } }); }, { rootMargin: "-30% 0px -65% 0px" });
    $$("main section[id]").forEach(s => io.observe(s));
    $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
    links.forEach(a => a.addEventListener("click", () => $("#sidebar").classList.remove("open")));
  }

  window.EDITH = { STEPS, BOM, GPIO, DIAGRAMS, buildSVG, setStep, get step() { return cur; } };
  document.addEventListener("DOMContentLoaded", () => {
    renderBOM(); renderGPIO(); initWiringTabs(); initStepper(); initChecks(); initCode(); initNav();
    document.body.dataset.ui = "ready";
  });
})();
