/* EDITH "Start here: complete beginner" — tools list, desk-prototype wiring, manual page (shared by index.html + bluetooth.html) */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const CHECKED = "2026-10-26";
  // Every URL returned HTTP 200 with curl on CHECKED. Prices are the listed single-unit USD prices seen on that page that day (before shipping/tax).
  // est: true = estimate, no verified link.
  const TOOLS = [
    { item: "Temperature-controlled soldering iron: PINE64 Pinecil V2", why: "Heats in seconds, you set the exact temperature (≈330–350 °C for this solder), auto-sleeps when you put it down.", price: 25.99, url: "https://pine64.com/product/pinecil-smart-mini-portable-soldering-iron/", vendor: "PINE64 store", core: true },
    { item: "USB-C PD charger for the iron: PinePower 65 W", why: "The Pinecil has no power brick. Skip this if you already own a USB-C laptop charger rated 65 W (20 V / 3 A).", price: 29.99, url: "https://pine64.com/product/pinepower-65w-gan-2c1a-charger-with-international-plugs/", vendor: "PINE64 store", core: true, skippable: true },
    { item: "USB-C to USB-C silicone cable, 1 m (for the iron)", why: "Heat-resistant, flexible lead between charger and iron.", price: 3.99, url: "https://pine64.com/product/usb-type-c-to-usb-type-c-silicone-power-charging-cable-1-meter-length/", vendor: "PINE64 store", core: true },
    { item: "Pinecil portable mini stand", why: "Somewhere safe to park a 350 °C tip. Never lay the iron on the desk.", price: 2.99, url: "https://pine64.com/product/pinecil-portable-mini-stand/", vendor: "PINE64 store", core: true },
    { item: "Solder 0.5 mm, 60/40 rosin core, 50 g (#1886)", why: "Thin, leaded, flux inside: the easiest solder to learn with. Wash your hands after.", price: 9.25, url: "https://www.adafruit.com/product/1886", vendor: "Adafruit", core: true },
    { item: "Flux pen, Chip Quik CQ4LF no-clean (#3468)", why: "Paint it on before every joint: solder flows instead of balling up.", price: 7.95, url: "https://www.adafruit.com/product/3468", vendor: "Adafruit", core: true },
    { item: "Solder wick 1.5 mm (#149)", why: "Copper braid that soaks up extra solder and fixes bridges.", price: 3.50, url: "https://www.adafruit.com/product/149", vendor: "Adafruit", core: true },
    { item: "Fine-tip tweezers, ESD safe (#421)", why: "Hold tiny wires and parts; your fingers will be too hot and too big.", price: 3.95, url: "https://www.adafruit.com/product/421", vendor: "Adafruit", core: true },
    { item: "Flush diagonal cutters (#152)", why: "Trim wires and component legs flat.", price: 7.25, url: "https://www.adafruit.com/product/152", vendor: "Adafruit", core: true },
    { item: "Helping third hand with magnifier (#291)", why: "Two clips hold the work so both your hands are free (iron + solder).", price: 6.95, url: "https://www.adafruit.com/product/291", vendor: "Adafruit", core: true },
    { item: "Hakko brass sponge tip cleaner (#1172)", why: "Wipe the tip between joints. Keeps it shiny so heat flows.", price: 10.95, url: "https://www.adafruit.com/product/1172", vendor: "Adafruit", core: true },
    { item: "Digital multimeter 9205B+ (#2034)", why: "Beep test for shorts, check battery polarity and voltage. Non-negotiable before any battery goes in.", price: 17.50, url: "https://www.adafruit.com/product/2034", vendor: "Adafruit", core: true },
    { item: "Full-size breadboard, 830 points (#239)", why: "Push-in prototype board: build the whole circuit on the desk, no soldering.", price: 5.95, url: "https://www.adafruit.com/product/239", vendor: "Adafruit", core: true },
    { item: "Male/male jumper wires, 40 × 6\" (#758)", why: "The wires for the breadboard.", price: 3.95, url: "https://www.adafruit.com/product/758", vendor: "Adafruit", core: true },
    { item: "USB-A to USB-C data cable, 1 m (#4474)", why: "Connects the XIAO to your computer. Has data wires (many phone cables are charge-only). If your computer only has USB-C ports, get a C-to-C data cable instead (e.g. Adafruit #4199, $9.95).", price: 4.95, url: "https://www.adafruit.com/product/4474", vendor: "Adafruit", url2: "https://www.adafruit.com/product/4199", vendor2: "C-to-C #4199", core: true },
    { item: "Break-away 0.1\" male header pins, 10-pack (#392)", why: "Pins to solder onto the XIAO and breakouts so they plug into the breadboard (spares in case yours didn't come with any).", price: 4.95, url: "https://www.adafruit.com/product/392", vendor: "Adafruit", core: true },
    { item: "Beginner soldering practice kit: SparkFun WeevilEye", why: "A 10–20 minute through-hole kit (iron, solder and cutters not included). Solder this before you touch any real EDITH part.", price: 9.95, url: "https://www.sparkfun.com/sparkfun-weevileye-beginner-soldering-kit.html", vendor: "SparkFun", core: true },
    { item: "Safety glasses", why: "Clipped leads and solder spatter fly. Wear them every time.", price: 5.10, url: "https://www.sparkfun.com/sparkfun-safety-glasses.html", vendor: "SparkFun", core: true },
    { item: "Ventilation: small desk fan + open window", why: "Pulls flux smoke away from your face. Any fan you already own works.", priceTxt: "≈ $0–20 (estimate)", est: true, vendor: "anything you have", core: false },
    { item: "Fume extractor: Hakko FA-400 (optional upgrade)", why: "Fan + carbon filter that sucks the smoke away. Nice to have, not required for a small project.", price: 81.67, url: "https://hakkousa.com/products/fa-400-smoke-absorber.html", vendor: "Hakko USA", core: false },
    { item: "Second practice kit: SparkFun Simon Says through-hole (optional)", why: "More joints (a 28-pin chip, LEDs, switches) and you end up with a working game.", price: 29.95, url: "https://www.sparkfun.com/sparkfun-simon-says-through-hole-soldering-kit.html", vendor: "SparkFun", core: false }
  ];
  const sum = f => Math.round(TOOLS.filter(f).reduce((a, t) => a + (t.price || 0), 0) * 100) / 100;
  const TOTAL_CORE = sum(t => t.core), TOTAL_NOCHG = sum(t => t.core && !t.skippable);
  const money = n => "$" + n.toFixed(2);
  const totalLine = () => `Rough tools total: <b>${money(TOTAL_NOCHG)}</b> if you already own a 65 W USB-C charger, <b>${money(TOTAL_CORE)}</b> with the PinePower charger. Add shipping from three stores (PINE64, Adafruit, SparkFun; not included) and a fan if you don't have one. Optional extras: Hakko FA-400 extractor $81.67, Simon Says kit $29.95. Listed prices checked ${CHECKED}; they change.`;

  // Desk prototype wiring: identical pins to the glasses build (see GPIO map), so nothing changes when you shrink it
  const PROTO = [
    ["Power", "XIAO USB-C", "your computer", "USB data cable", "The whole desk prototype runs from USB. <b>No LiPo on the desk</b> (BAT pads stay empty until week 4)."],
    ["Breadboard rails", "3V3 / GND", "red (+) / blue (−) rail", "red / black", "Jumper XIAO 3V3 → red rail and GND → blue rail. Every part below takes power from the rails."],
    ["OLED (SSD1306)", "VCC · GND", "3V3 rail · GND rail", "red · black", "3.3 V only."],
    ["OLED (SSD1306)", "SDA · SCL", "D4 (GPIO5) · D5 (GPIO6)", "blue · yellow", "I²C address 0x3C."],
    ["Heart rate (MAX30101/02)", "VIN · GND", "3V3 rail · GND rail", "red · black", ""],
    ["Heart rate (MAX30101/02)", "SDA · SCL", "D4 (GPIO5) · D5 (GPIO6)", "blue · yellow", "Shares the same two wires as the OLED (address 0x57). Put both SDA wires in one breadboard row, both SCL wires in another."],
    ["I²S amp (MAX98357A)", "VIN · GND", "3V3 rail · GND rail", "red · black", "GAIN and SD: leave unconnected."],
    ["I²S amp (MAX98357A)", "DIN · BCLK · LRC", "D2 (GPIO3) · D6 (GPIO43) · D7 (GPIO44)", "green · purple · orange", ""],
    ["Speaker / bone transducer", "+ · −", "amp + · amp −", "pink", "Never connect either speaker lead to GND."],
    ["Touch pads (copper foil on card)", "pad A · B · C", "D0 (GPIO1) · D1 (GPIO2) · D3 (GPIO4)", "white", "Three foil squares on cardboard, ~2 mm apart, one jumper each (alligator clip or a quick low-heat solder). Don't touch them while the XIAO boots: it measures the 'untouched' value then."],
    ["Push button", "leg 1 · leg 2", "D8 (GPIO7) · GND rail", "cyan · black", "Straddle the breadboard's centre gap."],
    ["Status LED", "long leg (+) · short leg (−)", "D10 (GPIO9) through a 330 Ω resistor · GND rail", "cyan · black", "The resistor stops the LED burning out."]
  ];
  const PROTO_BT = [
    ["★ BT module (BK3266), hypothetical", "VBAT · GND", "LiPo + through the slide switch · common GND", "red · black", "Needs 3.3–4.2 V: the XIAO's 3V3 pin is at the very bottom of that range and its 5V pin is too high, so this is the one place the battery joins the desk. Do it <b>last</b>, after the LiPo safety rules, switch OFF while wiring."],
    ["★ BT module (BK3266), hypothetical", "RX", "D9 (GPIO8) through a 1 kΩ resistor", "cyan", "UART commands, 9600 baud. Same pin as the glasses build."],
    ["★ PAM8302 amp, hypothetical", "A+ · A− · SD", "module AUDIOLP · AUDIOLN · MUTE", "pink · grey", "VIN → switched LiPo +, GND → common GND; + / − → second transducer (never to GND)."]
  ];
  function protoRows(bt) {
    return PROTO.concat(bt ? PROTO_BT : []).map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="pin" style="white-space:normal">${r[2]}</td><td>${r[3]}</td><td class="small">${r[4]}</td></tr>`).join("");
  }
  function toolRows(linkCls) {
    return TOOLS.map(t => {
      const link = t.url ? `<a href="${t.url}" target="_blank" rel="noopener">${t.vendor}</a>${t.url2 ? ` · <a href="${t.url2}" target="_blank" rel="noopener">${t.vendor2}</a>` : ""}` : `<span class="${linkCls}">${t.vendor} (no link)</span>`;
      const tag = t.core ? (t.skippable ? '<span class="pill opt">skip if you have one</span>' : '<span class="pill req">get this</span>') : '<span class="pill opt">optional</span>';
      return `<tr><td><b>${t.item}</b><br>${tag}<br><small>${t.why}</small></td><td class="price">${t.priceTxt || money(t.price)}</td><td>${link}</td></tr>`;
    }).join("");
  }
  const isBT = () => !!(window.FLAT_GEO && window.FLAT_GEO.BT);

  /* manual page (light paper style) */
  function page(letter) {
    const bt = isBT();
    const weeks = [
      ["Week 1", "Practice soldering", "Get the tools, solder the practice kit, then practise on spare header pins and scrap wire until joints come out shiny every time."],
      ["Week 2", "Coding basics", "Install Arduino IDE 2, make the XIAO blink its LED, then flash the EDITH firmware and read its messages in the Serial Monitor."],
      ["Week 3", "Desk prototype", "Everything on a breadboard, no soldering into the glasses: OLED, heart rate, amp + speaker, touch pads, then the AI backend on your computer." + (bt ? " Bluetooth version: add the BT module on the desk <b>last</b>." : "")],
      ["Week 4+", "Shrink into the frame", "Only once the desk version works: pod shells, foam tape, short wires, battery, lids. Follow the 16 steps of this manual."]
    ];
    return `<div class="pg-num">${letter}</div><h2>★ Start here: complete beginner</h2>
      <p class="lead">Never soldered, coded or built electronics? Good, this page is for you. Honest rating: this project is about <b>8/10</b> hard for a first build. It's doable if you go in stages and test each one before moving on.</p>
      <h3>Your plan</h3><ol class="pg-weeks">${weeks.map(w => `<li><b>${w[0]} · ${w[1]}.</b> ${w[2]}</li>`).join("")}</ol>
      <h3>Tools to buy <span class="cnt">${TOOLS.filter(t => t.core).length} items</span></h3>
      <table class="pg-table"><tr><th>Tool</th><th>≈ Price</th><th>Link</th></tr>${toolRows("small")}</table>
      <p class="small">${totalLine()}</p>
      <h3>Five safety rules</h3><ul>
        <li>The iron tip is ~350 °C: it lives in its stand, never on the desk.</li>
        <li>LiPo batteries can catch fire if punctured, squeezed, shorted or overheated. Keep the iron away from them and cut their wires one at a time.</li>
        <li>Wear safety glasses. Open a window and use a fan to move smoke away.</li>
        <li>Leaded solder: wash your hands after, no food or drink at the bench.</li>
        <li>Smell burning, or a part or battery gets hot or puffy? Unplug, step back, ask for help.</li></ul>
      <h3>Read the full beginner guide</h3>
      <div class="pg-links">${[["beginner", "★ Plan & expectations"], ["beg-tools", "Tools & prices"], ["beg-solder", "Soldering 101"], ["beg-code", "Coding 101 + backend"], ["beg-proto", "Desk prototype wiring"], ["beg-mount", "How parts are held in place"], ["beg-glossary", "Glossary"], ["beg-mistakes", "Common mistakes & help"]].map(([id, t]) => `<button data-doc="${id}">${t} →</button>`).join("")}</div>`;
  }

  function render() {
    const bt = isBT();
    const tb = $("#begTools tbody"); if (tb) tb.innerHTML = toolRows("muted");
    const tt = $("#begToolsTotal"); if (tt) tt.innerHTML = totalLine();
    const pb = $("#begProto tbody"); if (pb) pb.innerHTML = protoRows(bt);
  }
  window.EDITH_BEGINNER = { TOOLS, PROTO, PROTO_BT, page, TOTAL_CORE, TOTAL_NOCHG };
  document.addEventListener("DOMContentLoaded", render);
})();
