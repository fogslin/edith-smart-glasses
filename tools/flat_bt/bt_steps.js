/* EDITH + Bluetooth audio (HYPOTHETICAL VARIANT) — steps overlay.
   Loaded right after flat/steps.js: inserts the Bluetooth steps, edits a few original cards and
   recomputes timing, page numbers and piece counts. */
(function () {
  "use strict";
  const G = window.FLAT_GEO, FS = window.FLAT_STEPS, S = FS.STEPS;
  const at = id => S.findIndex(s => s.id === id);
  const BT_STEPS = [
    { id: "btmod", title: "Bluetooth module → left pod", dur: 9, view: "L", callout: "bt", parts: ["btm"],
      card: "Hypothetical add-on: the <b>BK3266 classic-Bluetooth module</b> (A2DP + HFP + mic) goes on the outside of the <b>left</b> temple, in front of the switch, antenna end toward the hinge. Pre-tin its <b>11 pads</b>.",
      details: ["Why: the ESP32-S3 only has Bluetooth LE, so it can't do A2DP music or HFP calls. This module pairs with the phone like an earbud; the XIAO keeps AI, HUD and touch over Wi-Fi.",
        "Module: ElectroDragon <b>NBL1111</b> (Beken BK3266, BT 5.2, A2DP 1.2, AVRCP 1.5, HFP 1.7), 25 × 13.5 × 2 mm, 3.3–4.2 V, ≤20 mA (wiki figures, not measured).",
        "Pads used: RX (11), P.P/CALL (6), VDD3IO (39), VMIC (31), MICP (30), GND (25, 16), VBAT (37), MUTE (15), AUDIOLN (32), AUDIOLP (33). Pad positions in the 3D view are schematic: go by the pin numbers.",
        "Keep the PCB-antenna end free of metal, copper tape and the battery. A metal frame will cut the range.", "Mount it like the other boards: a small pad of double-sided foam tape inside the left pod shell; the long lid holds it down."],
      solder: G.BT.TIN.map(k => "BT " + G.BT.BP_NAME[k]) },
    { id: "btpower", title: "Power it from the switched LiPo", dur: 8, view: "L", callout: "iron", parts: [], diagram: "btpower",
      card: "<b>VBAT</b> to the slide switch's <b>OUT</b> pin (the same switched + that feeds the XIAO's BAT+) and <b>GND</b> to the battery's black lead. One switch turns everything on.",
      details: ["Arrows: battery + → switch COM → switch OUT → (XIAO BAT+ <i>and</i> module VBAT). Battery − → XIAO BAT− <i>and</i> module GND.",
        "The module runs straight off the cell (3.3–4.2 V). It stops below about 3.3 V, before the XIAO does.",
        "The XIAO still charges the cell over USB-C (switch ON). The module's VBUS pin stays unused.",
        "Pairing and standby draw is small (wiki: under 0.5 mA), but turn the switch OFF for storage."],
      solder: ["SW OUT", "Battery − lead", "BT VBAT", "BT GND"] },
    { id: "btctrl", title: "Control line: D9 → module", dur: 10, view: "T", callout: "iron", parts: [], diagram: "btctrl",
      card: "One wire from <b>D9 (GPIO8)</b> runs across the brow to the module's <b>RX</b> (UART commands). A <b>BAT54 diode</b> branch to <b>P.P/CALL</b> lets the ESP32 \"press\" the module's own play/answer key.",
      details: ["D9 → 1 kΩ → RX (pin 11): 9600 8N1, commands such as COM+VP / COM+VD (volume), COM+CE (hang up), COM+CJ (reject), COM+PR (pairing).",
        "BAT54: cathode at D9, anode at P.P/CALL (pin 6), plus 10 kΩ from P.P/CALL up to VDD3IO (pin 39). D9 held LOW for ~150 ms = a short key press, so the module itself picks play/pause or answer.",
        "This is the only free XIAO pin, so the ESP32 sends commands but can't read call state. <b>Unverified</b>: that UART bytes never register as key presses. Fallback: drop the diode and use UART only.",
        "Route it in the brow groove next to the battery pair, with a service loop at each hinge."],
      solder: ["D9 · GPIO8", "BT RX", "P.P/CALL (BAT54)", "VDD3IO (10 kΩ)"] },
    { id: "btmic", title: "Call mic at the left hinge", dur: 8, view: "L", callout: "mic", parts: ["mic"], diagram: "btaudio",
      card: "A 4.4 mm <b>electret mic</b> sits under the front of the left temple, port facing down toward your mouth. Wire it to <b>VMIC</b> (2.2 kΩ bias), <b>MICP</b> (1 µF) and <b>GND</b>.",
      details: ["Single-ended mic mode (send RECV+MICSINGLE once). Also tie MICN to GND through 1 µF, per the BK3266 datasheet's single-ended figure. Some modules already fit the coupling caps, so check yours.",
        "The mic only switches on during a call (HFP), which is normal for hands-free modules. Edith keeps using the XIAO's own PDM mic.",
        "Mind the polarity: + is the lead that's not connected to the case.",
        "Seal the gap around the capsule with a dab of hot glue so the transducer's vibration doesn't feed back."],
      solder: ["VMIC (2.2 kΩ)", "MICP (1 µF)", "BT GND", "Mic +", "Mic signal", "Mic −"] },
    { id: "btamp", title: "PAM8302 amp + left transducer", dur: 11, view: "L", callout: "x", parts: ["amp2", "spk2"], diagram: "btaudio",
      card: "Phone audio gets its own path: module <b>AUDIOLP/LN</b> → <b>PAM8302</b> (behind the battery) → a second <b>bone transducer</b> at the left ear. Module <b>MUTE</b> → amp <b>SD</b>, so the amp sleeps when it's silent.",
      details: ["Why a second amp: the MAX98357A is I²S-only (digital in), so the module's analog output can't share it. Result: phone calls and music in the LEFT ear, Edith (TTS, AI answers, Wi-Fi music) in the RIGHT ear.",
        "Set the module to mono (RECV+MONO) so the left channel carries both sides of the music.",
        "PAM8302: 2–5.5 V, fixed 24 dB gain, onboard trim pot. Turn it down first, then raise it until calls are clear. 4 mA quiescent, 0.5 mA in shutdown (Adafruit).",
        "Speaker outputs are bridged (+/−): never connect either one to GND."],
      solder: ["AUDIOLP", "AUDIOLN", "MUTE", "BT VBAT", "BT GND", "AMP A+", "AMP A−", "AMP SD", "AMP VIN", "AMP GND", "AMP +", "AMP −", "SPK L +", "SPK L −"] }
  ];
  const PAIR = { id: "pair", title: "Pair your phone & use it", dur: 13, view: "F", callout: "phone", parts: [],
    card: "Hold the button 3 s (or power on fresh) → pair <b>“EDITH”</b> in the phone's Bluetooth settings. <b>Tap</b> = play/pause or answer · <b>long-press</b> = hang up/reject · <b>double-tap</b> = Edith.",
    details: ["Phone → module: calls (HFP) and music, podcasts, navigation prompts (A2DP), in the left ear. The phone mixes those itself.",
      "Edith stays on Wi-Fi: double-tap, ask, and the answer plays in the right ear. Translation, vision, Tesla, notifications and heart rate don't change.",
      "Swipe forward/back raises/lowers Edith's volume and sends COM+VP/VD to the module (phone volume).",
      "The ESP32 can't see call state, so Edith may still talk during a call. Don't double-tap then."] };
  // insert after "io"; pair goes before "done"
  S.splice(at("io") + 1, 0, ...BT_STEPS);
  S.splice(at("done"), 0, PAIR);
  // edit original cards
  const E = (id, f) => f(S[at(id)]);
  E("layout", s => { s.bom = s.bom.concat([["1x", "BK3266 module"], ["1x", "PAM8302"], ["1x", "mic"]]); s.details = s.details.concat(["Bluetooth variant extras: BK3266 module (NBL1111), PAM8302 amp, second bone transducer, 4.4 mm electret mic, BAT54 diode, 1 kΩ / 2.2 kΩ / 10 kΩ resistors, 2 × 1 µF caps."]); });
  E("audio", s => { s.details = s.details.slice(0, 3).concat(["In this variant the MAX98357A carries Edith only (TTS, AI answers, Wi-Fi music, right ear). Phone audio gets its own amp in the left temple (BT steps)."]); });
  E("touch", s => { s.details = s.details.map(d => d.replace("tap = play/pause, double-tap = wake Edith.", "tap = play/pause or answer a call, long-press = hang up / reject, double-tap = wake Edith (BT variant).")); });
  E("hinge", s => { s.card = "Press the battery pair <b>and the D9 control wire</b> into the brow groove. Leave a <b>service loop</b> at each hinge, then re-tighten the <b>hinge screws</b>."; });
  E("pods", s => { s.dur = 12; s.card = "Kapton, heat-shrink, then the lids. The <b>long left cover</b> sits <b>flush</b> over the BT module, battery and amp. Drive all <b>6 cover screws</b> into the shells' screw bosses: the lids clamp every board and the LiPo onto their foam tape.";
    s.details = s.details.concat(["Flush mounting: sand the left cover's inner face until the module and amp sit under it with no rattle. Leave a thin plastic window (no paint, no foil) over the BT antenna end.", "Exposed on the left: slide switch on top, mic port underneath, transducer inside by the ear."]); });
  E("flash", s => { s.card = "Same board settings as before (<b>XIAO_ESP32S3</b>, <b>PSRAM: OPI</b>, <b>USB CDC On Boot</b>), but open <b>firmware/edith_glasses_bt/edith_glasses_bt.ino</b>. Set <code>BT_FIRST_SETUP 1</code> for one boot, then back to 0.";
    s.details = ["First boot with BT_FIRST_SETUP 1 renames the module to “EDITH”, sets mono output and single-ended mic, then reboots it. (Unverified: the module may want a different line ending; see the sketch.)"].concat(s.details); });
  E("done", s => { s.title = "EDITH + Bluetooth, assembled";
    s.card = "<b>Done (hypothetically).</b> Right temple: XIAO pod, camera, HUD, touch strip, Edith's amp + transducer, heart sensor. Left temple: BK3266 module, LiPo + switch, call mic, phone amp + transducer.";
    s.details = ["Phone: calls and music over classic Bluetooth (left ear). Edith: AI, translation, vision, Tesla, HUD over Wi-Fi (right ear).", "Runtime ESTIMATE with the 250 mAh cell: about 1–1.5 h when BT audio and Wi-Fi run together. A 400–500 mAh cell (bigger pod) roughly doubles that.", "Everything the glasses can do: Docs &amp; code → Everything these glasses can do."]; });
  // recompute
  let acc = 0;
  S.forEach((s, i) => { s.index = i; s.n = i + 1; s.page = i + 2; s.start = acc; acc += s.dur; s.end = acc; s.wires = Object.keys(G.WIRES).filter(k => G.WIRES[k].step === s.id); });
  FS.TOTAL = acc;
  FS.PIECES = S.reduce((n, s) => n + s.parts.length, 0);
  E("layout", s => { s.card = s.card.replace(/<b>\d+<\/b> pieces/, "<b>" + FS.PIECES + "</b> pieces"); });
})();
