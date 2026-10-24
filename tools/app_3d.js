import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const stage = document.getElementById("stage");
const canvas = document.getElementById("three-canvas");
const labelsEl = document.getElementById("labels");
const loading = document.getElementById("loading");
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------------------------------------------------------------- renderer */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  loading.textContent = "WebGL is not available in this browser, so the 3D model can't be shown. The rest of the guide works normally.";
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070b13, 40, 90);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
camera.position.set(16, 9, 18);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.target.set(0, 0.5, -4); controls.minDistance = 3; controls.maxDistance = 60;
controls.autoRotateSpeed = 1.2;

scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a1030, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(10, 16, 12); scene.add(key);
const rim = new THREE.DirectionalLight(0x8b5cf6, 1.0); rim.position.set(-12, 6, -14); scene.add(rim);
const fill = new THREE.PointLight(0x5eead4, 0.8, 50); fill.position.set(0, 6, 10); scene.add(fill);
const grid = new THREE.GridHelper(60, 60, 0x1b2a48, 0x111b30); grid.position.y = -3.2; scene.add(grid);

/* ---------------------------------------------------------------- materials */
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...o });
const M = {
  frame: () => mat(0x1f2937, { roughness: 0.35, metalness: 0.2 }),
  lens: () => new THREE.MeshPhysicalMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
  pcbBlue: () => mat(0x1d4ed8, { roughness: 0.6 }), pcbPurple: () => mat(0x6d28d9), pcbBlack: () => mat(0x111827), pcbRed: () => mat(0xb91c1c),
  shield: () => mat(0xc0c7d1, { metalness: 0.85, roughness: 0.3 }), copper: () => mat(0xd97745, { metalness: 0.9, roughness: 0.25 }),
  pouch: () => mat(0x9aa6b8, { metalness: 0.6, roughness: 0.35 }), dark: () => mat(0x0b0f17, { roughness: 0.2 }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.45, roughness: 0.02, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  housing: () => mat(0x334155, { transparent: true, opacity: 0.2, roughness: 0.4, depthWrite: false }),
  red: () => mat(0xef4444, { emissive: 0x7f1d1d, emissiveIntensity: 0.6 }), white: () => mat(0xe5e7eb)
};

/* ---------------------------------------------------------------- part registry */
const INFO = {
  frame: { name: "Glasses frame", d: "Removable-lens frame, straight temples ≥5 mm. Brow bar hides the battery wires.", pins: "—" },
  lensL: { name: "Left lens (Rx / photochromic)", d: "Cut by an optician to your PD and fitting height.", pins: "—" },
  lensR: { name: "Right lens (Rx / photochromic)", d: "HUD combiner sits 3–8 mm in front of its upper-outer area.", pins: "—" },
  xiao: { name: "Seeed XIAO ESP32-S3", d: "ESP32-S3R8, 8 MB PSRAM / 8 MB flash, Wi-Fi + BLE 5, onboard LiPo charger. Lies flat on the right temple, USB-C facing back.", pins: "All signals — see GPIO table" },
  sense: { name: "Sense expansion board", d: "Snaps onto the B2B connector: camera connector, PDM microphone (GPIO42 CLK / GPIO41 DATA) and microSD (unused here).", pins: "Onboard" },
  camera: { name: "Camera module", d: "OV3660 or OV5640 on current Sense boards (OV2640 on early ones). Folded forward to look through the pod's front window.", pins: "XCLK 10, SIOD 40, SIOC 39, VSYNC 38, HREF 47, PCLK 13, Y2–Y9" },
  usb: { name: "USB-C port (charging + flashing)", d: "Exposed at the rear of the pod. Charges the LiPo through the XIAO's charger; also used to flash firmware (hold BOOT while plugging in for bootloader mode).", pins: "5V / D+ / D−" },
  podR: { name: "Electronics pod (right)", d: "3D-printed or resin shell around the XIAO stack. Insulate from skin: the board can exceed 60 °C during camera use.", pins: "—" },
  podL: { name: "Battery pod (left)", d: "Holds the LiPo on the opposite temple for balance.", pins: "—" },
  battery: { name: "EEMB LP502030 LiPo 3.7 V 250 mAh", d: "Protected pouch cell (built-in PCM), 20.5 × 31 × 5.3 mm. Red → switch → BAT+, black → BAT− (pad nearer USB).", pins: "BAT+ / BAT− (underside)" },
  switch: { name: "SPDT slide switch", d: "In series with the battery + lead. Must be ON to charge the cell.", pins: "COM ← battery +, OUT → BAT+" },
  oled: { name: "SSD1306 OLED (HUD)", d: "0.91″ 128×32 or 0.96″ 128×64, I²C address 0x3C, facing down into the optic.", pins: "VCC 3V3, GND, SDA D4/GPIO5, SCL D5/GPIO6" },
  hudlens: { name: "Plano-convex lens", d: "f ≈ 25–40 mm. Puts the HUD image at a comfortable virtual distance so the eye can focus.", pins: "—" },
  splitter: { name: "Beam-splitter (combiner)", d: "50/50 plate or small cube at 45°: reflects the OLED toward the eye while you see through it.", pins: "—" },
  hudarm: { name: "HUD arm", d: "Thin printed/aluminium arm from the right end-piece; carries the OLED, lens and splitter, and the 4 I²C wires.", pins: "—" },
  hr: { name: "MAX30102 / MAX30101 heart-rate", d: "PPG sensor against the skin in front of the ear. Shares the I²C bus (0x57).", pins: "VIN 3V3, GND, SDA D4, SCL D5" },
  amp: { name: "MAX98357A I²S amp", d: "I²S DAC + 3 W class-D amp. GAIN & SD unconnected.", pins: "LRC D7/GPIO44, BCLK D6/GPIO43, DIN D2/GPIO3, VIN 3V3, GND" },
  speaker: { name: "Speaker / bone-conduction transducer", d: "8 Ω 1 W. Bone conductor = private but quieter; mini speaker = louder.", pins: "Amp OUT+ / OUT−" },
  button: { name: "Push button", d: "Short press = action, long press = next mode.", pins: "D8/GPIO7 ↔ GND (INPUT_PULLUP)" },
  led: { name: "Status / privacy LED", d: "Lights while recording/thinking.", pins: "D10/GPIO9 → 330 Ω → LED → GND" },
  padA: { name: "Touch pad A (front)", d: "Copper foil, 6 × 8 mm.", pins: "D0 / GPIO1 / TOUCH1" },
  padB: { name: "Touch pad B (middle)", d: "Copper foil, 6 × 8 mm. Taps are detected on any pad.", pins: "D1 / GPIO2 / TOUCH2" },
  padC: { name: "Touch pad C (rear)", d: "Copper foil, 6 × 8 mm.", pins: "D3 / GPIO4 / TOUCH4" }
};
const parts = {};
const pickables = [];
function part(id, home, explode, build) {
  const g = new THREE.Group(); g.name = id;
  build(g);
  g.userData = { id, home: home.clone(), explode: explode.clone(), enter: 0, enterVec: explode.clone().normalize().multiplyScalar(3).add(V(0, 1.2, 0)) };
  g.position.copy(home);
  g.traverse(o => { if (o.isMesh) { o.userData.partId = id; o.material.userData.baseOpacity = o.material.opacity; o.material.userData.baseTransparent = o.material.transparent; o.material.userData.baseEmissive = o.material.emissive ? o.material.emissive.getHex() : 0; o.material.userData.baseEI = o.material.emissiveIntensity || 0; pickables.push(o); } });
  scene.add(g); parts[id] = g; return g;
}
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const cyl = (r, h, m, axis = "y", x = 0, y = 0, z = 0, seg = 28) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); if (axis === "x") o.rotation.z = Math.PI / 2; if (axis === "z") o.rotation.x = Math.PI / 2; o.position.set(x, y, z); return o; };

/* ---------------------------------------------------------------- frame */
part("frame", V(0, 0, 0), V(0, 0, 0), g => {
  const fm = M.frame();
  [-3.3, 3.3].forEach(x => { const t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 12, 64), fm); t.scale.set(2.75, 1.75, 1.6); t.position.set(x, 0.1, 0.3); g.add(t); });
  g.add(box(14.1, 0.32, 0.45, fm, 0, 1.86, 0.3));                          // brow bar (wire groove behind)
  const bridge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.6, 0.75, 0.3), V(0, 0.95, 0.35), V(0.6, 0.75, 0.3)]), 16, 0.12, 8), fm); g.add(bridge);
  [-1, 1].forEach(s => { const n = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat(0xcbd5e1, { transparent: true, opacity: 0.7 })); n.scale.set(0.5, 1, 0.8); n.position.set(s * 1.0, -0.55, -0.05); g.add(n); });
  [-1, 1].forEach(s => {
    g.add(box(1.05, 0.6, 0.5, fm, s * 6.55, 0.9, 0.2));                     // end piece
    g.add(cyl(0.12, 0.7, mat(0x9ca3af, { metalness: 0.8 }), "y", s * 7.05, 0.9, 0.05)); // hinge
    g.add(box(0.36, 0.6, 11.4, fm, s * 7.1, 0.9, -5.75));                   // temple
    const tip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(s * 7.1, 0.9, -11.4), V(s * 7.1, 0.6, -12.6), V(s * 7.02, -0.4, -13.5), V(s * 6.95, -1.4, -13.8)]), 24, 0.22, 10), fm);
    g.add(tip);
  });
});
part("lensL", V(3.3, 0.1, 0.3), V(0, 0, 2.5), g => { const l = new THREE.Mesh(new THREE.CircleGeometry(1, 48), M.lens()); l.scale.set(2.7, 1.7, 1); g.add(l); });
part("lensR", V(-3.3, 0.1, 0.3), V(0, 0, 2.5), g => { const l = new THREE.Mesh(new THREE.CircleGeometry(1, 48), M.lens()); l.scale.set(2.7, 1.7, 1); g.add(l); });

/* ---------------------------------------------------------------- right pod: XIAO stack */
const XIAO_HOME = V(-7.55, 0.95, -1.9);
part("xiao", XIAO_HOME, V(-2.2, 0, 0), g => {
  g.add(box(0.12, 1.78, 2.1, M.pcbBlue()));
  g.add(box(0.28, 1.25, 1.25, M.shield(), 0.2, 0, 0.2));                    // RF shield can
  g.add(box(0.05, 0.25, 0.25, mat(0xd4af37, { metalness: 0.9 }), 0.36, 0.55, 0.85)); // U.FL
  for (let i = 0; i < 7; i++) {                                              // castellated pads
    const z = -0.8 + i * 0.254;
    g.add(box(0.14, 0.1, 0.14, mat(0xd4af37, { metalness: 0.9, roughness: 0.3 }), 0, 0.85, z));
    g.add(box(0.14, 0.1, 0.14, mat(0xd4af37, { metalness: 0.9, roughness: 0.3 }), 0, -0.85, z));
  }
  g.add(box(0.03, 0.22, 0.16, mat(0xd4af37, { metalness: 0.9 }), -0.075, -0.15, -0.72));  // BAT− (nearer USB)
  g.add(box(0.03, 0.22, 0.16, mat(0xd4af37, { metalness: 0.9 }), -0.075, -0.15, -0.42));  // BAT+
});
part("usb", V(-7.55, 0.95, -3.1), V(-2.2, 0, -1.2), g => { g.add(box(0.32, 0.9, 0.75, M.shield())); g.add(box(0.12, 0.6, 0.02, M.dark(), 0, 0, -0.38)); });
part("sense", V(-8.0, 0.95, -1.95), V(-3.4, 0, 0), g => { g.add(box(0.12, 1.78, 2.0, M.pcbBlack())); g.add(box(0.2, 0.6, 0.9, M.dark(), 0.15, 0.3, 0)); g.add(box(0.05, 0.15, 0.15, M.white(), -0.08, -0.5, 0.6)); });
part("camera", V(-8.05, 1.15, -0.45), V(-3.4, 0.4, 2.2), g => {
  g.add(box(0.85, 0.85, 0.3, M.pcbBlack()));
  g.add(cyl(0.3, 0.35, M.dark(), "z", 0, 0, 0.3));
  g.add(cyl(0.18, 0.02, mat(0x60a5fa, { emissive: 0x1e3a8a, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.05 }), "z", 0, 0, 0.48));
  const flex = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -0.35, -0.15), V(0.05, -0.5, -0.45), V(0.05, -0.4, -0.9)]), 12, 0.04, 6), mat(0xf59e0b)); g.add(flex);
});
part("podR", V(-7.9, 0.95, -1.8), V(-4.6, 0, 0), g => { const h = box(1.3, 2.35, 3.0, M.housing()); g.add(h); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(h.geometry), new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.35 }))); });
part("led", V(-8.45, 1.85, -0.38), V(-3.6, 1, 1.5), g => { g.add(cyl(0.12, 0.2, M.red(), "z")); });
part("button", V(-7.1, 1.33, -3.9), V(0, 2.2, 0), g => { g.add(box(0.55, 0.16, 0.55, M.pcbBlack())); g.add(cyl(0.16, 0.14, mat(0x94a3b8), "y", 0, 0.14, 0)); });

/* ---------------------------------------------------------------- touch pads */
const PAD_Z = { padA: -4.9, padB: -5.9, padC: -6.9 };
Object.entries(PAD_Z).forEach(([id, z]) => part(id, V(-7.3, 0.9, z), V(-1.8, 0, 0), g => { g.add(box(0.025, 0.46, 0.8, M.copper())); }));

/* ---------------------------------------------------------------- inner right: amp, HR, speaker */
part("amp", V(-6.8, 0.72, -5.0), V(2.2, 0, 0), g => { g.add(box(0.18, 1.6, 1.7, M.pcbBlue())); g.add(box(0.08, 0.4, 0.4, M.dark(), 0.12, 0.1, 0)); g.add(box(0.15, 0.4, 0.5, mat(0x16a34a), 0.15, -0.55, 0.4)); });
part("hr", V(-6.82, 0.72, -8.6), V(2.4, 0, 0), g => { g.add(box(0.15, 1.25, 1.25, M.pcbPurple())); g.add(box(0.1, 0.35, 0.45, mat(0x0f172a, { emissive: 0x16a34a, emissiveIntensity: 0.4 }), 0.1, 0, 0)); });
part("speaker", V(-6.75, 0.6, -10.4), V(2.4, 0, -0.6), g => { g.add(cyl(0.7, 0.3, mat(0x374151, { metalness: 0.4 }), "x")); g.add(cyl(0.45, 0.32, M.dark(), "x", 0.02, 0, 0)); });

/* ---------------------------------------------------------------- left: battery, switch, pod */
part("battery", V(7.6, 0.8, -7.7), V(2.6, 0, 0), g => {
  g.add(box(0.5, 1.9, 3.6, M.pouch()));
  g.add(box(0.3, 0.5, 0.3, mat(0xf8fafc), 0, 0.5, 1.9));
  const lab = box(0.02, 1.2, 2.2, mat(0x0ea5e9), -0.26, 0, 0); g.add(lab);
});
part("switch", V(7.1, 1.32, -5.2), V(0, 2.2, 0), g => { g.add(box(0.42, 0.25, 0.85, M.shield())); g.add(box(0.15, 0.18, 0.2, M.pcbBlack(), 0, 0.18, 0.15)); });
part("podL", V(7.66, 0.8, -7.7), V(4.4, 0, 0), g => { const h = box(0.85, 2.25, 4.0, M.housing()); g.add(h); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(h.geometry), new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.35 }))); });

/* ---------------------------------------------------------------- HUD */
part("hudarm", V(0, 0, 0), V(0, 1.2, 0), g => { const fm = M.frame(); g.add(box(0.22, 0.9, 0.25, fm, -6.75, 1.95, 0.55)); g.add(box(2.7, 0.14, 0.3, fm, -5.4, 2.42, 0.9)); });
part("oled", V(-3.45, 2.6, 0.9), V(0, 2.6, 0), g => { g.add(box(2.6, 0.18, 1.25, M.pcbBlue())); g.add(box(2.2, 0.03, 0.75, mat(0x020617, { emissive: 0x38bdf8, emissiveIntensity: 0.55 }), 0, -0.1, 0)); });
part("hudlens", V(-3.45, 2.2, 0.9), V(0, 1.6, 0), g => { const l = cyl(0.55, 0.14, M.glass(), "y"); l.scale.set(1, 1, 1); g.add(l); });
part("splitter", V(-3.45, 1.5, 0.95), V(0, 0.4, 2.4), g => { const p = box(1.5, 1.5, 0.05, M.glass()); p.rotation.x = Math.PI / 4; g.add(p); });

/* ---------------------------------------------------------------- pads (solder points) in world */
const ROW_TOP = ["D0", "D1", "D2", "D3", "D4", "D5", "D6"];
const ROW_BOT = ["5V", "GND", "3V3", "D10", "D9", "D8", "D7"];
function padWorld(name) {
  let i = ROW_TOP.indexOf(name); if (i >= 0) return XIAO_HOME.clone().add(V(0, 0.92, -0.8 + i * 0.254));
  i = ROW_BOT.indexOf(name); if (i >= 0) return XIAO_HOME.clone().add(V(0, -0.92, -0.8 + i * 0.254));
  const fixed = { "BAT-": XIAO_HOME.clone().add(V(-0.1, -0.15, -0.72)), "BAT+": XIAO_HOME.clone().add(V(-0.1, -0.15, -0.42)), "SW": V(7.1, 1.5, -5.2),
    "USB-C": V(-7.55, 0.95, -3.5), CAM: V(-8.05, 1.15, 0.0), MIC: V(-8.1, 0.45, -1.35), "PAD A": V(-7.32, 1.2, -4.9), "PAD B": V(-7.32, 1.2, -5.9), "PAD C": V(-7.32, 1.2, -6.9) };
  return fixed[name] || null;
}

/* ---------------------------------------------------------------- wires */
const W = [];  // {group, color, curve, mesh, arrows}
const wireRoot = new THREE.Group(); scene.add(wireRoot);
const arrowGeo = new THREE.ConeGeometry(0.075, 0.22, 10); arrowGeo.rotateX(Math.PI / 2);
function wire(group, color, pts, r = 0.035) {
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const geo = new THREE.TubeGeometry(curve, Math.max(40, pts.length * 24), r, 6, false);
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.5 });
  const mesh = new THREE.Mesh(geo, m); mesh.visible = false; wireRoot.add(mesh);
  const arrows = [0, 1].map(() => { const a = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })); a.visible = false; wireRoot.add(a); return a; });
  W.push({ group, color, curve, mesh, arrows, total: geo.index.count, draw: 1 });
}
const C = { red: 0xef4444, black: 0x334155, v33: 0xfb7185, sda: 0x60a5fa, scl: 0xfacc15, din: 0x4ade80, bclk: 0xc084fc, lrc: 0xfb923c, io: 0x22d3ee, touch: 0xf1f5f9, spk: 0xf472b6 };
// power (battery on left → switch → hinge → brow groove → right hinge → BAT pads)
wire("power", C.red, [V(7.55, 1.6, -5.9), V(7.3, 1.45, -5.55), V(7.1, 1.45, -5.2), V(7.12, 1.3, -3.0), V(7.05, 1.3, -0.3), V(6.6, 2.0, 0.02), V(0, 2.1, 0.02), V(-6.6, 2.0, 0.02), V(-7.0, 1.4, -0.3), V(-7.35, 0.9, -1.0), padWorld("BAT+")]);
wire("power", C.black, [V(7.65, 1.6, -5.95), V(7.4, 1.2, -5.0), V(7.22, 1.15, -3.0), V(7.15, 1.2, -0.35), V(6.6, 1.92, -0.05), V(0, 2.02, -0.05), V(-6.6, 1.92, -0.05), V(-7.05, 1.3, -0.35), V(-7.4, 0.8, -1.3), padWorld("BAT-")]);
// I2C to OLED
[["D4", C.sda, 0], ["D5", C.scl, 0.07], ["3V3", C.v33, 0.14], ["GND", C.black, 0.21]].forEach(([p, c, o]) => {
  const s = padWorld(p);
  wire("i2c_oled", c, [s, V(s.x - 0.15, s.y + (s.y > 1 ? 0.3 : -0.3), s.z), V(-7.9, 2.25, -0.75 + o), V(-6.8, 2.45, 0.45 + o), V(-5.2, 2.55, 0.85 + o), V(-4.6, 2.62, 0.75 + o)]);
});
// I2C to heart sensor (along inner bottom edge of temple)
[["D4", C.sda, 0], ["D5", C.scl, 0.06], ["3V3", C.v33, 0.12], ["GND", C.black, 0.18]].forEach(([p, c, o]) => {
  const s = padWorld(p);
  wire("i2c_hr", c, [s, V(s.x + 0.1, s.y + (s.y > 1 ? 0.25 : -0.25), s.z - 0.1), V(-7.2, 0.3 - o, -3.3), V(-6.9, 0.48 - o * 0.5, -4.2), V(-6.92, 0.5 - o * 0.5, -7.0), V(-6.84, 0.72 - o, -7.95)]);
});
// I2S to amp
[["D7", C.lrc, 0], ["D6", C.bclk, 0.25], ["D2", C.din, 0.5], ["3V3", C.v33, 0.75], ["GND", C.black, 1.0]].forEach(([p, c, o]) => {
  const s = padWorld(p);
  wire("i2s", c, [s, V(s.x + 0.1, s.y + (s.y > 1 ? 0.25 : -0.25), s.z - 0.15), V(-7.25, 0.25 + o * 0.05, -3.2), V(-6.95, 0.4 + o * 0.3, -3.9), V(-6.74, 1.35 - o * 0.25, -4.2)]);
});
// amp → speaker
wire("spk", C.spk, [V(-6.72, 0.0, -5.7), V(-6.9, 0.05, -7.4), V(-6.9, 0.1, -9.0), V(-6.62, 0.4, -9.9)]);
wire("spk", C.spk, [V(-6.72, 0.12, -5.8), V(-6.95, 0.15, -7.5), V(-6.95, 0.2, -9.1), V(-6.62, 0.8, -9.9)]);
// button + LED
{ const s = padWorld("D8"); wire("io", C.io, [s, V(s.x, s.y - 0.25, s.z), V(-7.45, 0.2, -3.25), V(-7.3, 1.3, -3.55), V(-7.12, 1.4, -3.75)]); }
{ const s = padWorld("GND"); wire("io", C.black, [s, V(s.x - 0.05, s.y - 0.3, s.z), V(-7.5, 0.1, -3.4), V(-7.22, 1.25, -3.75), V(-7.05, 1.38, -4.05)]); }
{ const s = padWorld("D10"); wire("io", C.io, [s, V(s.x - 0.25, s.y - 0.25, s.z), V(-8.35, 0.2, -0.9), V(-8.5, 1.3, -0.55), V(-8.45, 1.75, -0.45)]); }
// touch pads
[["D0", "padA"], ["D1", "padB"], ["D3", "padC"]].forEach(([p, id], k) => {
  const s = padWorld(p); const z = PAD_Z[id];
  wire("touch", C.touch, [s, V(s.x - 0.05, s.y + 0.25, s.z), V(-7.6, 1.6 - k * 0.08, -3.2), V(-7.4, 1.25 - k * 0.04, -4.0), V(-7.34, 1.05, z + 0.3), V(-7.32, 0.95, z)], 0.028);
});

/* ---------------------------------------------------------------- glowing solder points + labels */
const padGlows = [];
const glowGeo = new THREE.SphereGeometry(0.11, 16, 12);
function setPads(names) {
  padGlows.forEach(p => { scene.remove(p.mesh); p.el.remove(); }); padGlows.length = 0;
  names.forEach(n => {
    const pos = padWorld(n); if (!pos) return;
    const mesh = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.9 }));
    mesh.position.copy(pos); scene.add(mesh);
    const el = document.createElement("div"); el.className = "lbl"; el.textContent = n; labelsEl.appendChild(el);
    padGlows.push({ mesh, el, pos });
  });
}
let partLabels = [];
let showPartLabels = false;
function setPartLabels(on) {
  partLabels.forEach(p => p.el.remove()); partLabels = [];
  if (!on) return;
  Object.keys(parts).forEach(id => { if (id === "frame" || id.startsWith("lens") || id === "hudarm") return;
    const el = document.createElement("div"); el.className = "lbl part"; el.textContent = INFO[id].name.split(" (")[0]; labelsEl.appendChild(el); partLabels.push({ id, el }); });
}

/* ---------------------------------------------------------------- radio rings (backend / Tesla steps) */
const rings = [];
for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0 })); r.rotation.y = Math.PI / 2; r.position.set(-8.3, 1.4, -1.8); scene.add(r); rings.push(r); }
let ringsOn = false;

/* ---------------------------------------------------------------- state */
const VIEWS = {
  overview: [V(15, 9, 17), V(0, 0.4, -4.5)], frame: [V(0, 3.5, 15), V(0, 0.5, 0)], xiao: [V(-13.5, 4, 1.5), V(-7.7, 0.95, -1.9)],
  battery: [V(15, 6, -2.5), V(7.2, 0.9, -5.5)], usb: [V(-11.5, 3.8, -9.5), V(-7.8, 0.95, -2.8)], camera: [V(-11, 3.2, 7), V(-8, 1.1, -0.9)],
  hud: [V(-7, 6.5, 9.5), V(-3.8, 1.9, 0.5)], heart: [V(-1.2, 3.2, -13), V(-6.8, 0.8, -8.4)], audio: [V(-0.8, 3.6, -11), V(-6.8, 0.8, -7.0)],
  io: [V(-12.5, 6.5, -5), V(-7.5, 1.2, -2.6)], touch: [V(-13.5, 3.2, -7.5), V(-7.3, 0.9, -5.4)]
};
let explode = 0, explodeTarget = 0, autoRotate = false, showAll = false, finale = false;
let activeParts = new Set(), activeWires = new Set(), stepStart = 0;
let fly = null;

const ZOOM_OUT = 1.75;  // pull close-up views back a bit
function flyTo(view, ms = 1300) {
  const [p0, t] = VIEWS[view] || VIEWS.overview;
  const p = view === "overview" ? p0 : t.clone().add(p0.clone().sub(t).multiplyScalar(ZOOM_OUT));
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p.clone(), t1: t.clone(), start: performance.now(), ms };
}
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function applyLook() {
  Object.entries(parts).forEach(([id, g]) => {
    const housing = id === "podR" || id === "podL";
    const dim = !finale && activeParts.size > 0 && !activeParts.has(id) && id !== "frame";
    g.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material; const ud = m.userData;
      if (housing) { m.opacity = finale ? 0.96 : (activeParts.has(id) ? 0.32 : 0.14); m.transparent = !finale; m.depthWrite = finale; m.color.setHex(finale ? 0x1f2937 : 0x334155); }
      else if (dim) { m.transparent = true; m.opacity = Math.min(ud.baseOpacity, 0.28); }
      else { m.transparent = ud.baseTransparent; m.opacity = ud.baseOpacity; }
      m.needsUpdate = true;
    });
  });
  W.forEach(w => {
    const on = !finale && explode < 0.02 && (showAll || activeWires.has(w.group) || activeWires.has("all"));
    w.mesh.visible = on; w.arrows.forEach(a => a.visible = on && (activeWires.has(w.group) || showAll));
  });
}

function goStep(s) {
  finale = !!s.finale;
  activeParts = new Set(s.parts || []);
  activeWires = new Set();
  (s.wires || []).forEach(k => { if (k === "i2c") { activeWires.add("i2c_oled"); activeWires.add("i2c_hr"); } else activeWires.add(k); });
  stepStart = performance.now();
  W.forEach(w => { w.draw = activeWires.has(w.group) ? 0 : 1; });
  (s.parts || []).forEach(id => { if (parts[id]) parts[id].userData.enter = 1; });
  setPads(s.pads || []);
  ringsOn = !!s.radio;
  autoRotate = finale; controls.autoRotate = autoRotate; document.getElementById("btnRotate").classList.toggle("on", autoRotate);
  if (finale) { explodeTarget = 0; document.getElementById("btnExplode").classList.remove("on"); }
  flyTo(s.focus || "overview");
  applyLook();
  hideInfo();
}

/* ---------------------------------------------------------------- picking */
const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
let hovered = null;
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(pickables, false).find(h => h.object.visible && (h.object.material.opacity > 0.1 || h.object.userData.partId === "frame"));
  return hit ? hit.object.userData.partId : null;
}
function setHighlight(id, on) {
  const g = parts[id]; if (!g) return;
  g.traverse(o => { if (o.isMesh && o.material.emissive) { o.material.emissive.setHex(on ? 0x5eead4 : o.material.userData.baseEmissive); o.material.emissiveIntensity = on ? 0.45 : o.material.userData.baseEI; } });
}
canvas.addEventListener("pointermove", ev => {
  const id = pick(ev);
  if (id !== hovered) { if (hovered) setHighlight(hovered, false); hovered = id; if (id) setHighlight(id, true); canvas.style.cursor = id ? "pointer" : "grab"; }
});
let downAt = null;
canvas.addEventListener("pointerdown", ev => { downAt = [ev.clientX, ev.clientY]; });
canvas.addEventListener("pointerup", ev => {
  if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5) return;
  const id = pick(ev); if (id) showInfo(id); else hideInfo();
});
const info = document.getElementById("info"), infoBody = document.getElementById("infoBody");
function showInfo(id) {
  const i = INFO[id]; if (!i) return;
  infoBody.innerHTML = `<h4>${i.name}</h4><div>${i.d}</div><dl><dt>Pins</dt><dd>${i.pins}</dd></dl>`;
  info.classList.add("show");
}
function hideInfo() { info.classList.remove("show"); }
document.getElementById("infoClose").onclick = hideInfo;

/* ---------------------------------------------------------------- buttons */
const bE = document.getElementById("btnExplode"), bR = document.getElementById("btnRotate"), bW = document.getElementById("btnWires"), bL = document.getElementById("btnLabels");
function toggleExplode() { explodeTarget = explodeTarget > 0.5 ? 0 : 1; bE.classList.toggle("on", explodeTarget > 0.5); }
function toggleRotate() { autoRotate = !autoRotate; controls.autoRotate = autoRotate; bR.classList.toggle("on", autoRotate); }
function toggleWires() { showAll = !showAll; bW.classList.toggle("on", showAll); W.forEach(w => w.draw = 1); applyLook(); }
function toggleLabels() { showPartLabels = !showPartLabels; bL.classList.toggle("on", showPartLabels); setPartLabels(showPartLabels); }
bE.onclick = toggleExplode; bR.onclick = toggleRotate; bW.onclick = toggleWires; bL.onclick = toggleLabels;
document.getElementById("btnReset").onclick = () => flyTo((window.EDITH && window.EDITH.STEPS[window.EDITH.step].focus) || "overview");

/* ---------------------------------------------------------------- resize + loop */
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(stage); resize();
const tmp = new THREE.Vector3();
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (fly) { const k = Math.min(1, (now - fly.start) / fly.ms); const e = ease(k); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (k >= 1) fly = null; }
  const prevExplode = explode;
  explode += (explodeTarget - explode) * Math.min(1, dt * 5);
  if ((prevExplode < 0.02) !== (explode < 0.02)) applyLook();
  Object.values(parts).forEach(g => {
    const u = g.userData;
    if (u.enter > 0) u.enter = Math.max(0, u.enter - dt * 1.1);
    const e = ease(u.enter);
    g.position.copy(u.home).addScaledVector(u.explode, explode).addScaledVector(u.enterVec, e);
  });
  // wires draw-in and flow arrows
  const t = now / 1000;
  W.forEach((w, i) => {
    if (!w.mesh.visible) return;
    if (w.draw < 1) { const delay = 0.5 + (i % 6) * 0.12; const k = Math.max(0, (now - stepStart) / 1000 - delay); w.draw = Math.min(1, k / 1.2); }
    const cnt = Math.floor(w.total * w.draw / 3) * 3; w.mesh.geometry.setDrawRange(0, cnt);
    w.arrows.forEach((a, j) => {
      if (!a.visible) return;
      const u = ((t * 0.35 + j * 0.5 + i * 0.13) % 1) * w.draw;
      w.curve.getPointAt(u, a.position);
      w.curve.getTangentAt(u, tmp); a.lookAt(tmp.add(a.position));
      a.material.color.setHex(w.color);
    });
  });
  // glowing pads
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  padGlows.forEach(p => { const s = 0.8 + 0.6 * pulse; p.mesh.scale.setScalar(s); p.mesh.material.opacity = 0.45 + 0.5 * pulse; });
  // radio rings
  rings.forEach((r, i) => { const k = ((t * 0.6 + i / 3) % 1); r.scale.setScalar(0.5 + k * 5); r.material.opacity = ringsOn ? (1 - k) * 0.6 : 0; });
  controls.update();
  renderer.render(scene, camera);
  // HTML labels
  const w2 = stage.clientWidth / 2, h2 = stage.clientHeight / 2;
  const place = (el, pos) => { tmp.copy(pos).project(camera); const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1; el.style.display = vis ? "block" : "none"; if (vis) { el.style.left = (tmp.x * w2 + w2) + "px"; el.style.top = (-tmp.y * h2 + h2) + "px"; } };
  padGlows.forEach(p => place(p.el, p.pos));
  partLabels.forEach(p => { const g = parts[p.id]; const b = new THREE.Box3().setFromObject(g); place(p.el, V((b.min.x + b.max.x) / 2, b.max.y + 0.15, (b.min.z + b.max.z) / 2)); });
  requestAnimationFrame(tick);
}

window.EDITH3D = {
  goStep,
  key(k) { if (k === "e") toggleExplode(); if (k === "r") toggleRotate(); if (k === "w") toggleWires(); if (k === "l") toggleLabels(); },
  _debug: { parts, W, scene }
};
loading.remove();
const first = window.EDITH ? window.EDITH.STEPS[window.EDITH.step] : { focus: "overview", parts: [], wires: [], pads: [] };
goStep(first);
requestAnimationFrame(tick);
document.body.dataset.three = "ready";
