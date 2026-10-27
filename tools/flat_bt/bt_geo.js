/* EDITH + Bluetooth audio (HYPOTHETICAL VARIANT) — geometry overlay.
   Loaded right after flat/geo.js; adds the BK3266 module, call mic, PAM8302 amp and left transducer
   to the shared rig (1 unit = 100 mm, wearer's LEFT temple is +X). Pad positions on the module are
   schematic: follow the module's pin NUMBERS from its wiki, not the 3D layout. */
(function () {
  "use strict";
  const G = window.FLAT_GEO, TY = G.TY;
  // BK3266 module (ElectroDragon NBL1111, 25 x 13.5 x 2 mm) on the outer face of the left temple, antenna end forward
  const BC = [0.755, TY + 0.02, -0.27];
  const BX = 0.766, BYT = TY + 0.0795, BYB = TY - 0.0395;
  const BP = {
    RX: [BX, BYT, -0.22], PP: [BX, BYT, -0.27], V3: [BX, BYT, -0.32],
    VMIC: [BX, BYB, -0.165], MICP: [BX, BYB, -0.19], MGND: [BX, BYB, -0.215], GND: [BX, BYB, -0.24],
    VBAT: [BX, BYB, -0.265], MUTE: [BX, BYB, -0.29], LN: [BX, BYB, -0.315], LP: [BX, BYB, -0.34]
  };
  const BP_NAME = { RX: "RX · pin 11", PP: "P.P/CALL · pin 6", V3: "VDD3IO · pin 39", VMIC: "VMIC · pin 31", MICP: "MICP · pin 30", MGND: "GND · pin 25",
    GND: "GND · pin 16", VBAT: "VBAT · pin 37", MUTE: "MUTE · pin 15", LN: "AUDIOLN · pin 32", LP: "AUDIOLP · pin 33" };
  // PAM8302 (15 x 24 x 2 mm) behind the battery, same outer face
  const A2C = [0.758, TY + 0.0, -1.10];
  const A2 = { "A+": [0.769, TY + 0.05, -0.995], "A-": [0.769, TY + 0.025, -0.995], SD: [0.769, TY + 0.0, -0.995], GND: [0.769, TY - 0.025, -0.995], VIN: [0.769, TY - 0.05, -0.995],
    "OUT+": [0.769, TY + 0.03, -1.205], "OUT-": [0.769, TY - 0.03, -1.205] };
  // left bone transducer (inner side, mirror of the right one) and the call mic under the front of the left temple
  const SPK2 = [0.675, TY - 0.07, -0.98];
  const SP2 = { "+": [0.668, TY - 0.012, -0.995], "-": [0.668, TY - 0.012, -0.965] };
  const MIC = [0.722, TY - 0.052, -0.10];
  const MP = { "+": [0.730, TY - 0.06, -0.094], "-": [0.714, TY - 0.06, -0.106] };
  const C = Object.assign(G.C, { btrx: "#18a6c4", btpp: "#9be15d", mic: "#c99a3b", aud: "#3cb35a", audn: "#2e8b57", mute: "#f08a2c" });
  const SWP = G.SWP;
  const toA2 = (from, pin, k, c) => [BP[from], [0.774, TY - 0.06 - k * 0.004, BP[from][2] - 0.03], [0.788, TY - 0.104 - k * 0.005, -0.55], [0.788, TY - 0.104 - k * 0.005, -0.93],
    [0.784, A2[pin][1], -0.975], A2[pin]];
  const brow = (y, side) => [[0.69 * side, TY + y, -0.05], [0.62 * side, 0.444 + y, -0.042]];
  const browAll = y => [[0.705, TY + y - 0.015, -0.16], ...brow(y, 1), [0, 0.448 + y, -0.042], ...brow(y, -1).reverse(), [-0.705, TY + y - 0.03, -0.13]];
  const W = G.WIRES;
  Object.assign(W, {
    bt_vbat: { step: "btpower", c: C.red, pts: [SWP.OUT, [0.752, TY + 0.03, -0.402], [0.774, TY - 0.015, -0.33], [0.774, TY - 0.052, -0.28], BP.VBAT], a: "SW OUT", b: "BT VBAT" },
    bt_gnd: { step: "btpower", c: C.gnd, pts: [[0.782, TY + 0.03, -0.645], [0.79, TY - 0.02, -0.60], [0.786, TY - 0.062, -0.45], [0.776, TY - 0.058, -0.29], BP.GND], a: "Battery − lead", b: "BT GND" },
    bt_rx: { step: "btctrl", c: C.btrx, pts: [G.pad("D9"), [-0.785, TY - 0.085, -0.3146], [-0.80, TY - 0.05, -0.22], [-0.76, TY + 0.02, -0.14], ...browAll(0.074).reverse(), [0.745, TY + 0.088, -0.19], BP.RX], a: "D9 · GPIO8", b: "BT RX" },
    bt_pp: { step: "btctrl", c: C.btpp, pts: [BP.RX, [0.774, TY + 0.096, -0.245], BP.PP], a: null, b: "P.P/CALL (BAT54)" },
    bt_pu: { step: "btctrl", c: C.btpp, pts: [BP.PP, [0.774, TY + 0.096, -0.295], BP.V3], a: null, b: "VDD3IO (10 kΩ)" },
    m_bias: { step: "btmic", c: C.red, pts: [BP.VMIC, [0.772, TY - 0.06, -0.15], [0.745, TY - 0.066, -0.10], MP["+"]], a: "VMIC (2.2 kΩ)", b: "Mic +" },
    m_sig: { step: "btmic", c: C.mic, pts: [BP.MICP, [0.776, TY - 0.066, -0.17], [0.742, TY - 0.072, -0.094], [0.731, TY - 0.064, -0.09]], a: "MICP (1 µF)", b: "Mic signal" },
    m_gnd: { step: "btmic", c: C.gnd, pts: [BP.MGND, [0.774, TY - 0.072, -0.19], [0.73, TY - 0.074, -0.12], MP["-"]], a: "BT GND", b: "Mic −" },
    a2_p: { step: "btamp", c: C.aud, pts: toA2("LP", "A+", 0), a: "AUDIOLP", b: "AMP A+" },
    a2_n: { step: "btamp", c: C.audn, pts: toA2("LN", "A-", 1), a: "AUDIOLN", b: "AMP A−" },
    a2_sd: { step: "btamp", c: C.mute, pts: toA2("MUTE", "SD", 2), a: "MUTE", b: "AMP SD" },
    a2_vin: { step: "btamp", c: C.red, pts: toA2("VBAT", "VIN", 3), a: "BT VBAT", b: "AMP VIN" },
    a2_gnd: { step: "btamp", c: C.gnd, pts: toA2("GND", "GND", 4), a: "BT GND", b: "AMP GND" },
    s2_p: { step: "btamp", c: C.spk, pts: [A2["OUT+"], [0.785, TY + 0.03, -1.228], [0.772, TY - 0.052, -1.245], [0.71, TY - 0.056, -1.20], [0.678, TY - 0.03, -1.06], SP2["+"]], a: "AMP +", b: "SPK L +" },
    s2_n: { step: "btamp", c: C.spk, pts: [A2["OUT-"], [0.781, TY - 0.03, -1.222], [0.768, TY - 0.06, -1.238], [0.705, TY - 0.064, -1.19], [0.672, TY - 0.036, -1.05], SP2["-"]], a: "AMP −", b: "SPK L −" }
  });
  const P = G.PARTS;
  Object.assign(P, {
    btm: { name: "BK3266 BT module", code: "NBL1111 · A2DP+HFP", c: BC, s: [0.02, 0.135, 0.25], mat: [1.78, 0, 0.30], matRot: [0, 0, Math.PI / 2] },
    mic: { name: "Electret mic", code: "4.4 mm · calls", c: MIC, s: [0.044, 0.014, 0.044], mat: [1.80, 0, -0.80] },
    amp2: { name: "PAM8302 amp", code: "mono 2.5 W", c: A2C, s: [0.02, 0.15, 0.24], mat: [1.78, 0, -0.10], matRot: [0, 0, Math.PI / 2] },
    spk2: { name: "Bone transducer L", code: "8 Ω 1 W", c: SPK2, r: 0.065, h: 0.03, s: [0.03, 0.13, 0.13], mat: [1.80, 0, -0.45], matRot: [0, 0, -Math.PI / 2] }
  });
  // one long, flush left pod now covers BT module + battery + amp
  Object.assign(P.coverL, { name: "Left pod cover (long)", code: "PLA · BT", c: [0.79, TY - 0.0025, -0.6825], s: [0.09, 0.25, 1.095], mat: [1.62, 0, -1.25] });
  Object.assign(P.podL, G.podFrom(P.coverL, 1));   // the left pod shell follows the long cover
  Object.assign(G.SCREWS, {
    cL3: { c: [0.79, TY + 0.1225, -0.20], step: "pods", name: "Cover screw" },
    cL4: { c: [0.79, TY + 0.1225, -1.17], step: "pods", name: "Cover screw" }
  });
  // G.pad() learns the module / amp pads ("BT VBAT", "AMP VIN") so solder() can use them by name
  const pad0 = G.pad;
  G.pad = n => {
    if (typeof n === "string" && n.startsWith("BT ")) return BP[n.slice(3)];
    if (typeof n === "string" && n.startsWith("AMP ")) return A2[n.slice(4)];
    return pad0(n);
  };
  G.BT = { BC, BP, BP_NAME, A2C, A2, SPK2, SP2, MIC, MP, TIN: ["RX", "PP", "V3", "VMIC", "MICP", "MGND", "GND", "VBAT", "MUTE", "LN", "LP"] };
})();
