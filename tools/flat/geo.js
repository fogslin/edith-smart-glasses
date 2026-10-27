/* EDITH flat-pack guide — shared geometry (rig coordinates, 1 unit = 100 mm real, shown 10x)
   Front of the glasses faces +Z, temples run toward -Z, wearer's RIGHT temple is at -X. */
(function () {
  "use strict";
  const TY = 0.34, TX = 0.72, TW = 0.045, TH = 0.075;
  const XC = [-0.770, TY + 0.02, -0.34];                 // XIAO board centre (outer side of right temple)
  const TOP = ["D0", "D1", "D2", "D3", "D4", "D5", "D6"];  // castellated edge (upper), D0 nearest USB-C (rear)
  const BOT = ["5V", "GND", "3V3", "D10", "D9", "D8", "D7"];
  function pad(n) {
    let i = TOP.indexOf(n), top = true;
    if (i < 0) { i = BOT.indexOf(n); top = false; }
    if (n === "BAT+") return [-0.763, TY + 0.0, -0.36];
    if (n === "BAT-") return [-0.763, TY + 0.0, -0.40];
    return [-0.777, XC[1] + (top ? 0.0875 : -0.0875), XC[2] - 0.0762 + i * 0.0254];
  }
  const C = { red: "#e0453a", gnd: "#3b3b40", sda: "#3d7be0", scl: "#f2c230", din: "#3cb35a", bclk: "#8a5cd6", lrc: "#f08a2c", touch: "#f4f1ea", spk: "#e85d9a", io: "#2bb5c9" };
  const up = (p, dy, dx = -0.008) => [p[0] + dx, p[1] + dy, p[2]];

  // OLED pins (top face, right end)  GND VCC SCL SDA
  const OP = { GND: [-0.535, 0.517, 0.085], VCC: [-0.535, 0.517, 0.105], SCL: [-0.535, 0.517, 0.125], SDA: [-0.535, 0.517, 0.145] };
  function toOled(from, k, viaBottom) {
    const tail = [[-0.715, TY + 0.085 + k * 0.006, -0.07], [-0.668, 0.456 + k * 0.006, -0.004], [-0.60, 0.512 + k * 0.002, 0.06]];
    const head = viaBottom
      ? [pad(from), up(pad(from), -0.017), [-0.776, TY - 0.08 - k * 0.004, -0.22], [-0.748, TY - 0.02, -0.12]]
      : [pad(from), up(pad(from), 0.018 + k * 0.004), [-0.772, TY + 0.13 + k * 0.006, -0.20]];
    return head.concat(tail);
  }
  // heart-rate header (front edge of sensor, inner side)  SDA SCL VCC GND
  const HC = [-0.689, TY, -0.62];
  const HP = { SDA: [-0.682, TY + 0.045, -0.558], SCL: [-0.682, TY + 0.015, -0.558], VCC: [-0.682, TY - 0.015, -0.558], GND: [-0.682, TY - 0.045, -0.558] };
  function toHR(from, pin, k, viaBottom) {
    const p = HP[pin];
    return viaBottom
      ? [pad(from), up(pad(from), -0.017), [-0.765, TY - 0.07 - k * 0.004, -0.46], [-0.722, TY - 0.052 - k * 0.004, -0.50], [-0.69, p[1], -0.53], p]
      : [pad(from), up(pad(from), 0.018 + k * 0.004), [-0.765, TY + 0.10 + k * 0.004, -0.46], [-0.722, TY + 0.052 + k * 0.004, -0.50], [-0.69, p[1], -0.53], p];
  }
  // amplifier (inner side, opposite the pod)  pins on upper edge
  const AC = [-0.689, TY - 0.02, -0.33];
  const AP = { LRC: [-0.682, TY + 0.055, -0.41], BCLK: [-0.682, TY + 0.055, -0.385], DIN: [-0.682, TY + 0.055, -0.36], GND: [-0.682, TY + 0.055, -0.335], VIN: [-0.682, TY + 0.055, -0.31],
    "SPK+": [-0.682, TY - 0.095, -0.37], "SPK-": [-0.682, TY - 0.095, -0.30] };
  function toAmp(from, pin, k, viaBottom) {
    const p = AP[pin];
    return viaBottom
      ? [pad(from), up(pad(from), -0.017), [-0.752, TY - 0.07 - k * 0.004, p[2] + 0.01], [-0.676, TY - 0.06 - k * 0.003, p[2]], [-0.675, TY + 0.03, p[2]], p]
      : [pad(from), up(pad(from), 0.018 + k * 0.004), [-0.745, TY + 0.075 + k * 0.004, p[2] - 0.01], [-0.70, TY + 0.07 + k * 0.003, p[2]], p];
  }
  const SPK = [-0.675, TY - 0.07, -0.98];
  const SP = { "+": [-0.668, TY - 0.012, -0.995], "-": [-0.668, TY - 0.012, -0.965] };
  // touch pads (outer side, behind the pod)
  const PADZ = { A: -0.62, B: -0.72, C: -0.82 };
  const tab = z => [-0.7468, TY + 0.026, z + 0.032];
  function toPad(from, P, k) {
    const t = tab(PADZ[P]);
    return [pad(from), up(pad(from), 0.018 + k * 0.004), [-0.776, TY + 0.10 - k * 0.006, -0.50], [-0.756, TY + 0.05, t[2] + 0.03], t];
  }
  const BTN = [-0.80, TY + 0.16, -0.41], LED = [-0.778, TY + 0.10, -0.170];
  const SW = [0.72, TY + 0.055, -0.45], SWP = { COM: [0.744, TY + 0.045, -0.488], OUT: [0.744, TY + 0.045, -0.412] };
  const BAT = [0.775, TY + 0.005, -0.80];

  const brow = (y, side) => [[0.69 * side, TY + y, -0.05], [0.62 * side, 0.444 + y, -0.042]];
  const browAll = y => [[0.705, TY + y - 0.015, -0.16], ...brow(y, 1), [0, 0.448 + y, -0.042], ...brow(y, -1).reverse(), [-0.705, TY + y - 0.03, -0.13]];

  const WIRES = {
    p_bat: { step: "battery", c: C.red, pts: [[0.775, TY + 0.06, -0.645], [0.77, TY + 0.078, -0.59], [0.75, TY + 0.06, -0.52], SWP.COM], a: null, b: "SW COM" },
    p_sw: { step: "battery", c: C.red, pts: [SWP.OUT, [0.735, TY + 0.05, -0.33], ...browAll(0.06), [-0.745, TY - 0.04, -0.22], [-0.762, TY - 0.02, -0.33], pad("BAT+")], a: "SW OUT", b: "BAT+ pad" },
    p_gnd: { step: "battery", c: C.gnd, pts: [[0.775, TY + 0.03, -0.645], [0.765, TY + 0.03, -0.59], [0.735, TY + 0.02, -0.45], ...browAll(0.046), [-0.745, TY - 0.055, -0.24], [-0.762, TY - 0.03, -0.37], pad("BAT-")], a: null, b: "BAT− pad" },
    o_sda: { step: "oled", c: C.sda, pts: toOled("D4", 0, false).concat([OP.SDA]), a: "D4 · SDA", b: "OLED SDA" },
    o_scl: { step: "oled", c: C.scl, pts: toOled("D5", 1, false).concat([OP.SCL]), a: "D5 · SCL", b: "OLED SCL" },
    o_vcc: { step: "oled", c: C.red, pts: toOled("3V3", 2, true).concat([OP.VCC]), a: "3V3 pad", b: "OLED VCC" },
    o_gnd: { step: "oled", c: C.gnd, pts: toOled("GND", 3, true).concat([OP.GND]), a: "GND pad", b: "OLED GND" },
    h_sda: { step: "heart", c: C.sda, pts: toHR("D4", "SDA", 0, false), a: "D4 · SDA", b: "HR SDA" },
    h_scl: { step: "heart", c: C.scl, pts: toHR("D5", "SCL", 1, false), a: "D5 · SCL", b: "HR SCL" },
    h_vcc: { step: "heart", c: C.red, pts: toHR("3V3", "VCC", 0, true), a: "3V3 pad", b: "HR VIN" },
    h_gnd: { step: "heart", c: C.gnd, pts: toHR("GND", "GND", 1, true), a: "GND pad", b: "HR GND" },
    a_lrc: { step: "audio", c: C.lrc, pts: toAmp("D7", "LRC", 0, true), a: "D7 · LRC", b: "AMP LRC" },
    a_bclk: { step: "audio", c: C.bclk, pts: toAmp("D6", "BCLK", 0, false), a: "D6 · BCLK", b: "AMP BCLK" },
    a_din: { step: "audio", c: C.din, pts: toAmp("D2", "DIN", 1, false), a: "D2 · DIN", b: "AMP DIN" },
    a_gnd: { step: "audio", c: C.gnd, pts: toAmp("GND", "GND", 1, true), a: "GND pad", b: "AMP GND" },
    a_vin: { step: "audio", c: C.red, pts: toAmp("3V3", "VIN", 2, true), a: "3V3 pad", b: "AMP VIN" },
    s_p: { step: "audio", c: C.spk, pts: [AP["SPK+"], [-0.678, TY - 0.11, -0.45], [-0.684, TY - 0.07, -0.75], [-0.676, TY - 0.03, -0.93], SP["+"]], a: "AMP +", b: "SPK +" },
    s_n: { step: "audio", c: C.spk, pts: [AP["SPK-"], [-0.672, TY - 0.118, -0.45], [-0.678, TY - 0.078, -0.75], [-0.672, TY - 0.034, -0.92], SP["-"]], a: "AMP −", b: "SPK −" },
    t_a: { step: "touch", c: C.touch, pts: toPad("D0", "A", 0), a: "D0 · TOUCH1", b: "Foil pad A" },
    t_b: { step: "touch", c: C.touch, pts: toPad("D1", "B", 1), a: "D1 · TOUCH2", b: "Foil pad B" },
    t_c: { step: "touch", c: C.touch, pts: toPad("D3", "C", 2), a: "D3 · TOUCH4", b: "Foil pad C" },
    b_io: { step: "io", c: C.io, pts: [pad("D8"), up(pad("D8"), -0.017), [-0.836, TY - 0.02, -0.36], [-0.836, TY + 0.11, -0.40], [-0.81, BTN[1] - 0.015, BTN[2] + 0.015]], a: "D8 pad", b: "Button" },
    b_gnd: { step: "io", c: C.gnd, pts: [pad("GND"), up(pad("GND"), -0.022), [-0.842, TY - 0.03, -0.42], [-0.842, TY + 0.11, -0.43], [-0.79, BTN[1] - 0.015, BTN[2] - 0.015]], a: "GND pad", b: "Button GND" },
    l_io: { step: "io", c: C.io, pts: [pad("D10"), up(pad("D10"), -0.017), [-0.83, TY, -0.22], [-0.80, TY + 0.09, -0.195], [-0.784, LED[1], LED[2] - 0.016]], a: "D10 pad", b: "LED + 330 Ω" },
    l_gnd: { step: "io", c: C.gnd, pts: [pad("GND"), up(pad("GND"), -0.026, -0.012), [-0.842, TY - 0.01, -0.25], [-0.79, TY + 0.08, -0.20], [-0.772, LED[1], LED[2] - 0.016]], a: "GND pad", b: "LED K" }
  };

  // Every physical piece: c = installed centre, s = box size (or r/h for cylinders), mat = where it waits on the mat
  const PARTS = {
    frame:   { name: "Frame", code: "front + temples", mat: [0, 0, 0] },
    xiao:    { name: "XIAO ESP32-S3", code: "MCU", c: XC, s: [0.012, 0.175, 0.21], mat: [-0.95, 0, 0.62], matRot: [0, 0, -Math.PI / 2] },
    battery: { name: "EEMB LP502030", code: "3.7 V 250 mAh", c: BAT, s: [0.053, 0.205, 0.31], mat: [1.05, 0, 0.62], matRot: [0, 0, Math.PI / 2] },
    switch:  { name: "Slide switch", code: "SPDT", c: SW, s: [0.035, 0.035, 0.085], mat: [1.45, 0, 0.62] },
    sense:   { name: "Sense board", code: "B2B", c: [-0.792, TY + 0.02, -0.33], s: [0.010, 0.165, 0.19], mat: [-0.62, 0, 0.62], matRot: [0, 0, -Math.PI / 2] },
    cam:     { name: "Camera", code: "OV3660", c: [-0.800, TY + 0.04, -0.19], s: [0.03, 0.08, 0.08], mat: [-0.38, 0, 0.66], matRot: [-Math.PI / 2, 0, 0] },
    antenna: { name: "Wi-Fi antenna", code: "u.FL", c: [-0.80, TY + 0.150, -0.27], s: [0.05, 0.004, 0.12], mat: [-0.18, 0, 0.66] },
    oled:    { name: "OLED 128×32", code: "0x3C", c: [-0.40, 0.505, 0.12], s: [0.30, 0.02, 0.12], mat: [0.10, 0, 0.66] },
    hud:     { name: "HUD optic", code: "lens + splitter", c: [-0.40, 0.44, 0.12], s: [0.10, 0.10, 0.10], mat: [0.45, 0, 0.66] },
    hr:      { name: "MAX30102", code: "0x57", c: HC, s: [0.012, 0.13, 0.13], mat: [-1.45, 0, 0.25], matRot: [0, 0, -Math.PI / 2] },
    amp:     { name: "MAX98357A", code: "I²S amp", c: AC, s: [0.012, 0.17, 0.19], mat: [-1.45, 0, -0.15], matRot: [0, 0, -Math.PI / 2] },
    spk:     { name: "Bone transducer", code: "8 Ω 1 W", c: SPK, r: 0.065, h: 0.03, mat: [-1.45, 0, -0.55], matRot: [0, 0, -Math.PI / 2] },
    padA:    { name: "Foil pad A", code: "TOUCH1", c: [-0.7448, TY, PADZ.A], s: [0.004, 0.055, 0.08], mat: [1.30, 0, 0.25], matRot: [0, 0, Math.PI / 2] },
    padB:    { name: "Foil pad B", code: "TOUCH2", c: [-0.7448, TY, PADZ.B], s: [0.004, 0.055, 0.08], mat: [1.42, 0, 0.25], matRot: [0, 0, Math.PI / 2] },
    padC:    { name: "Foil pad C", code: "TOUCH4", c: [-0.7448, TY, PADZ.C], s: [0.004, 0.055, 0.08], mat: [1.54, 0, 0.25], matRot: [0, 0, Math.PI / 2] },
    button:  { name: "Push button", code: "D8", c: BTN, s: [0.05, 0.025, 0.05], mat: [1.30, 0, -0.10] },
    led:     { name: "Status LED", code: "D10", c: LED, r: 0.016, h: 0.03, mat: [1.48, 0, -0.10] },
    coverR:  { name: "Right pod cover", code: "PLA", c: [-0.805, TY + 0.02, -0.325], s: [0.12, 0.27, 0.30], mat: [1.35, 0, -0.60] },
    coverL:  { name: "Left pod cover", code: "PLA", c: [0.79, TY + 0.005, -0.80], s: [0.09, 0.235, 0.34], mat: [1.35, 0, -1.10] },
    lensR:   { name: "Rx lens (right)", code: "photochromic", c: [-0.36, 0.23, 0.0], mat: [-0.40, 0, 1.02], matRot: [-Math.PI / 2, 0, 0] },
    lensL:   { name: "Rx lens (left)", code: "photochromic", c: [0.36, 0.23, 0.0], mat: [0.40, 0, 1.02], matRot: [-Math.PI / 2, 0, 0] },
    ttp:     { name: "TTP223 module", code: "alt · tap only", mat: [-1.22, 0, -0.78] },
    plug:    { name: "USB-C plug", code: "5 V", c: [-0.77, TY + 0.02, -0.49], mat: [-1.30, 0, -1.05] }
  };
  // printed pod shells: a thin base plate bonded (epoxy / UV resin) to the temple's outer face, same footprint as its cover
  function podFrom(cov, side) {
    const th = side < 0 ? 0.0074 : 0.004;
    return { c: [side * (0.7427 + th / 2), cov.c[1], cov.c[2]], s: [th, cov.s[1] - 0.012, cov.s[2] - 0.012] };
  }
  PARTS.podR = Object.assign({ name: "Right pod shell", code: "3D-printed · bonded", mat: [1.05, 0, -0.02] }, podFrom(PARTS.coverR, -1));
  PARTS.podL = Object.assign({ name: "Left pod shell", code: "3D-printed · bonded", mat: [1.05, 0, -1.0] }, podFrom(PARTS.coverL, 1));
  // double-sided foam tape under boards / battery, Kapton strips over the wire runs (consumables, not pieces)
  const TAPE = {
    foamR:   { c: [-0.7568, TY + 0.02, -0.30], s: [0.0125, 0.11, 0.10], from: [-0.25, 0.08, 0], name: "Double-sided foam tape", code: "holds the XIAO" },
    foamL:   { c: [0.7476, TY + 0.005, -0.80], s: [0.0018, 0.17, 0.26], from: [0.25, 0.08, 0], name: "Double-sided foam tape", code: "LiPo sits on it · no glue" },
    foamAmp: { c: [-0.6962, TY - 0.02, -0.33], s: [0.0025, 0.13, 0.15], from: [0.25, 0.08, 0], name: "Foam tape", code: "holds the amp" },
    kapL:    { c: [0.728, TY + 0.066, -0.25], s: [0.06, 0.003, 0.05], from: [0, 0.2, 0], kapton: true, name: "Kapton tape", code: "holds wires flat" },
    kapB:    { c: [0, 0.512, -0.042], s: [0.08, 0.003, 0.03], from: [0, 0.2, 0], kapton: true },
    kapR:    { c: [-0.712, TY + 0.062, -0.12], s: [0.05, 0.003, 0.04], from: [0, 0.2, 0], kapton: true }
  };
  const SCREWS = {
    hud1:  { c: [-0.645, 0.462, 0.0], step: "hud", name: "Arm screw" },
    hingeL:{ c: [0.70, TY + 0.052, -0.045], step: "hinge", name: "Hinge screw L" },
    hingeR:{ c: [-0.70, TY + 0.052, -0.045], step: "hinge", name: "Hinge screw R" },
    cR1:   { c: [-0.84, TY + 0.155, -0.205], step: "pods", name: "Cover screw" },
    cR2:   { c: [-0.84, TY + 0.155, -0.450], step: "pods", name: "Cover screw" },
    cL1:   { c: [0.79, TY + 0.1225, -0.665], step: "pods", name: "Cover screw" },
    cL2:   { c: [0.79, TY + 0.1225, -0.935], step: "pods", name: "Cover screw" }
  };
  const TIN = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D10", "3V3", "GND"];
  const RIM = { cx: 0.36, cy: 0.23, w: 0.56, h: 0.44, r: 0.13, iw: 0.46, ih: 0.34, ir: 0.09, d: 0.05 };
  window.FLAT_GEO = { TY, TX, TW, TH, XC, TOP, BOT, pad, C, WIRES, PARTS, SCREWS, TAPE, podFrom, TIN, RIM, PADZ, SPK, BTN, LED, SW, SWP, BAT, OP, HP, AP, SP,
    temple: { z0: -0.06, z1: -1.30, tipZ: -1.60, tipY: 0.03 } };
})();
