/* EDITH flat-pack guide — steps (shared by UI, manual and 3D) */
(function () {
  "use strict";
  const G = window.FLAT_GEO;
  const S = [
    { id: "layout", title: "Lay out the parts", dur: 8, view: "F", callout: "qty", parts: ["frame"],
      card: "Unbox everything onto the mat. Frame in the middle, electronics in the front row, covers and lenses to the side. Count the <b>21</b> pieces before you start.",
      details: ["Work on a clean, light-coloured mat so tiny parts stay visible; keep the LiPo away from the iron.", "Default battery is the <b>EEMB LP502030</b> (3.7 V, 250 mAh, 20.5 × 31–32 × 5.3 mm, 5 g, built-in PCM).", "Tools: temperature-controlled iron (≈330–350 °C), 0.3–0.5 mm rosin-core solder, flux pen, tweezers, flush cutters, Ø1.5 mm screwdriver, 30 AWG silicone wire, heat-shrink, Kapton tape.", "Full parts list with verified links and prices: <b>Docs &amp; code → Parts list</b>."],
      bom: [["1x", "frame"], ["1x", "XIAO ESP32-S3 Sense"], ["1x", "EEMB LP502030"], ["1x", "0.91″ OLED"], ["1x", "MAX30102"], ["1x", "MAX98357A"], ["3x", "foil pad"], ["2x", "lens"]] },
    { id: "tin", title: "Tin the XIAO pads", dur: 9, view: "R", callout: "iron", parts: ["xiao"], diagram: null,
      card: "Place the <b>XIAO ESP32-S3</b> on the right temple, USB-C facing back. Put a thin coat of solder on the <b>12 pads</b> you will use.",
      details: ["Slide the Sense expansion board off sideways first (never pry it up).", "Pads: D0 D1 D2 D3 D4 D5 D6 D7 D8 D10, 3V3, GND. Flux, touch the iron for ~1 s, feed a little solder.", "Direct wiring (no headers) keeps the pod thin.", "Shown on the frame for clarity — do the soldering on the bench and mount afterwards."],
      solder: G.TIN.map(p => p + " pad") },
    { id: "battery", title: "Battery → switch → BAT pads", dur: 10, view: "T", callout: "iron", parts: ["battery", "switch"], diagram: "power",
      card: "LiPo in the <b>left</b> pod. Red lead through the <b>slide switch</b>, both leads across the hinges and behind the brow to the <b>BAT+</b> / <b>BAT−</b> pads under the XIAO.",
      details: ["Cut the JST plug off the LP502030-PCM leads one wire at a time (never short red and black).", "Red → switch COM, switch OUT → <b>BAT+</b>. Black → <b>BAT−</b> (the underside pad nearer the USB-C port).", "Heat-shrink both switch joints. Leave a service loop at each hinge.", "The XIAO charges the cell over USB-C; the cell's PCM protects against over-charge/discharge."],
      solder: ["SW COM", "SW OUT", "BAT+ pad", "BAT− pad"] },
    { id: "camera", title: "Camera module & antenna", dur: 8, view: "R", callout: "cam", parts: ["sense", "cam", "antenna"],
      card: "Click the <b>Sense board</b> back onto the B2B connector, fold the <b>camera</b> forward to look through the pod front and press the <b>u.FL antenna</b> on.",
      details: ["The camera (OV3660/OV5640 on current boards, OV2640 earlier) and PDM mic (GPIO42 CLK / GPIO41 DATA) need no wiring.", "Keep the ribbon gentle — no sharp creases.", "Dry-fit: check the USB-C port can still face the rear of the pod."] },
    { id: "oled", title: "I²C bus to the OLED", dur: 10, view: "R", callout: "iron", parts: ["oled"], diagram: "i2c",
      card: "Four wires to the HUD display: <b>SDA → D4</b>, <b>SCL → D5</b>, VCC → 3V3, GND → GND. Route them over the right hinge.",
      details: ["SSD1306 128×32 OLED at I²C address 0x3C.", "Colour-code: blue SDA, yellow SCL, red 3V3, black GND.", "Keep the bus short and tidy — the heart-rate sensor joins the same two lines next."],
      solder: ["D4 · SDA", "D5 · SCL", "3V3 pad", "GND pad", "OLED SDA", "OLED SCL", "OLED VCC", "OLED GND"] },
    { id: "hud", title: "Mount OLED + HUD optic", dur: 8, view: "F", callout: "hud", parts: ["hud"], diagram: null,
      card: "Screw the <b>HUD arm</b> to the right end-piece. The OLED faces down through a small lens into a <b>45° beam-splitter</b> in front of the lens.",
      details: ["Order from the top: OLED (screen down) → plano-convex lens (f ≈ 25–40 mm) → 50/50 beam-splitter cube at 45°.", "Slide the lens up/down until the text is sharp at a comfortable distance.", "The splitter mirrors the image — flip it in firmware (<code>setRotation</code>) if text reads backwards."] },
    { id: "heart", title: "Heart-rate sensor on shared I²C", dur: 9, view: "Ri", callout: "iron", parts: ["hr"], diagram: "i2c",
      card: "<b>MAX30102</b> on the inside of the right temple, against the skin. It shares <b>SDA/SCL</b> with the OLED (address 0x57).",
      details: ["VIN → 3V3, GND → GND, SDA → D4, SCL → D5 (same pads as the OLED).", "Light-proof the edges with black tape so ambient light doesn't swamp the PPG signal.", "Firmware averages 4 beats and shows ♥ BPM in the HUD corner."],
      solder: ["D4 · SDA", "D5 · SCL", "3V3 pad", "GND pad", "HR SDA", "HR SCL", "HR VIN", "HR GND"] },
    { id: "audio", title: "I²S amp + bone transducer", dur: 10, view: "Ri", callout: "x", parts: ["amp", "spk"], diagram: "i2s",
      card: "<b>MAX98357A</b> inside the right temple: <b>LRC → D7</b>, <b>BCLK → D6</b>, <b>DIN → D2</b>, VIN → 3V3, GND. Its +/− go to the <b>bone transducer</b> by the ear.",
      details: ["GAIN and SD stay unconnected (9 dB, left+right mix).", "Speaker output is bridged: never connect either speaker lead to GND.", "Music and TTS stream over Wi-Fi from the backend (the ESP32-S3 has no Bluetooth Classic / A2DP)."],
      solder: ["D7 · LRC", "D6 · BCLK", "D2 · DIN", "3V3 pad", "GND pad", "AMP LRC", "AMP BCLK", "AMP DIN", "AMP VIN", "AMP GND", "SPK +", "SPK −"] },
    { id: "touch", title: "Foil touch strip", dur: 10, view: "R", callout: "foil", parts: ["padA", "padB", "padC"], diagram: "touch",
      card: "Lay <b>3 copper-foil pads</b> in the channel behind the pod, 8–10 mm apart. Leads: <b>A → D0</b>, <b>B → D1</b>, <b>C → D3</b>. (TTP223 = tap-only alternative.)",
      details: ["Pads ~8 × 6 mm with ~2 mm gaps, ≥10 mm from the hinge and away from the battery.", "Fold a small tab, tin it with a quick low-heat touch (<1 s) or use conductive-adhesive tape + a solder tab.", "Cover with vinyl, paint or heat-shrink so it sits flush. Swipe forward = volume +, back = volume −, tap = play/pause, double-tap = wake Edith.", "ESP32-S3 touch values <b>rise</b> when touched (opposite of the original ESP32)."],
      solder: ["D0 · TOUCH1", "D1 · TOUCH2", "D3 · TOUCH4", "Foil pad A", "Foil pad B", "Foil pad C"] },
    { id: "io", title: "Button + status LED", dur: 8, view: "R", callout: "iron", parts: ["button", "led"], diagram: "io",
      card: "<b>Button</b> on top of the pod: D8 ↔ GND (internal pull-up). <b>Status LED</b> at the pod front: D10 → 330 Ω → LED → GND.",
      details: ["Short press = action, long press = next mode (assistant → translate → AR → music → heart).", "The front LED doubles as a camera-active privacy light — keep it visible."],
      solder: ["D8 pad", "GND pad", "Button", "Button GND", "D10 pad", "GND pad", "LED + 330 Ω", "LED K"] },
    { id: "hinge", title: "Route wires through the hinges", dur: 8, view: "F", callout: "hinge", parts: [],
      card: "Press the battery pair into the groove behind the brow bar. Leave a <b>service loop</b> at each hinge, then re-tighten the <b>hinge screws</b>.",
      details: ["Fold each temple 20× and watch the wires: they must bend in the loop, not at a joint.", "Silicone-insulated 30 AWG survives flexing far better than PVC.", "Tack the groove closed with UV resin or a thin printed cover."] },
    { id: "pods", title: "Close the pods", dur: 9, view: "R", callout: "screw", parts: ["coverR", "coverL"],
      card: "Kapton over the board backs, heat-shrink on every joint, then fit the <b>pod covers</b> and drive the <b>4 cover screws</b>.",
      details: ["Continuity check before closing: BAT+↔BAT− and 3V3↔GND must NOT beep.", "The right cover has holes for the camera, LED and button and a slot for USB-C at the back.", "Hot-glue strain relief where wires leave each pod."] },
    { id: "charge", title: "Charging port check", dur: 7, view: "Rb", callout: "usb", parts: [],
      card: "The <b>USB-C</b> port must be reachable through the slot at the rear of the right pod. Plug in: the charge LED flashes while the LP502030 fills.",
      details: ["The power switch must be ON for the cell to charge (it sits between battery and BAT+).", "The charge LED turns off when full. The LP502030 allows up to 250 mA charge — the XIAO charges well below that."] },
    { id: "flash", title: "Flash the firmware", dur: 10, view: "Rb", callout: "laptop", parts: [],
      card: "Arduino IDE 2 → esp32 by Espressif → board <b>XIAO_ESP32S3</b>, <b>PSRAM: OPI</b>, <b>USB CDC On Boot: Enabled</b>. Fill in Wi-Fi + backend, then Upload.",
      details: ["No serial port? Hold <b>BOOT</b> while plugging in USB-C, then release.", "Libraries: Adafruit SSD1306 + GFX, SparkFun MAX3010x, ArduinoJson.", "When the HUD shows <b>EDITH online</b>, start the backend (FastAPI) and talk to her. Full sketch: Docs &amp; code → Firmware."] },
    { id: "lenses", title: "Pop in Rx / transitions lenses", dur: 9, view: "F", callout: "lens", parts: ["lensR", "lensL"],
      card: "Have an optician cut <b>prescription or photochromic</b> lenses to the frame (with the pods dry-fitted for PD), then pop them into the rims.",
      details: ["Pick a frame with removable lenses and straight, ≥5 mm temples.", "Keep the HUD splitter clear of the lens surface (≈2–3 mm gap) and in the upper-outer field of view.", "Photochromic lenses darken in UV — outdoors the HUD looks brighter against them."] },
    { id: "done", title: "EDITH, assembled", dur: 14, view: "F", callout: "check", parts: [],
      card: "<b>Done.</b> Right temple: XIAO pod, camera, LED, button, touch strip, amp, transducer, heart sensor. Left: LP502030 + switch. Front: HUD.",
      details: ["Double-tap the strip and say “Hey Edith, what am I looking at?”", "Try translation mode, music, notifications on the HUD, heart rate, and the Tesla voice commands (Docs &amp; code → Tesla).", "Total weight lands around 45–60 g depending on frame and pods."] }
  ];
  let acc = 0;
  S.forEach((s, i) => {
    s.index = i; s.n = i + 1; s.page = i + 2; s.start = acc; acc += s.dur; s.end = acc;
    s.wires = Object.keys(G.WIRES).filter(k => G.WIRES[k].step === s.id);
  });
  const TOTAL = acc;
  // pieces = installable parts (frame counts)
  const PIECES = S.reduce((n, s) => n + s.parts.length, 0);
  window.FLAT_STEPS = { STEPS: S, TOTAL, PIECES };
})();
