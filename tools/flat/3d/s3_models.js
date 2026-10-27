/* ---------------------------------------------------------------- assembly mat + hardware cards */
const MAT_TOP = 0.012;
const matTex = canvasTex(2048, 1736, (g, W, H) => {
  g.fillStyle = "#f2ede3"; g.fillRect(0, 0, W, H);
  const ins = 46; g.strokeStyle = "#c9473a"; g.lineWidth = 10; g.strokeRect(ins, ins, W - 2 * ins, H - 2 * ins);
  g.strokeStyle = "#6f9a5a"; g.lineWidth = 8; g.strokeRect(ins + 22, ins + 22, W - 2 * ins - 44, H - 2 * ins - 44);
  g.strokeStyle = "rgba(120,100,80,.35)"; g.lineWidth = 2; for (let x = ins + 60; x < W - ins - 40; x += 40) { g.beginPath(); g.moveTo(x, ins + 36); g.lineTo(x, ins + 36 + (x % 200 === 0 ? 24 : 12)); g.stroke(); }
  g.fillStyle = "rgba(60,50,40,.55)"; g.font = "800 92px Outfit, Arial"; g.textAlign = "center"; g.save(); g.translate(W * 0.5, H * 0.60); g.fillText("EDITH · BUILD MAT", 0, 0); g.restore();
  g.font = "600 30px 'JetBrains Mono', monospace"; g.fillStyle = "rgba(60,50,40,.45)"; g.fillText("1 square = 10 mm (shown 10×)", W * 0.5, H * 0.60 + 50);
  g.strokeStyle = "rgba(120,100,80,.18)"; g.lineWidth = 1.5; for (let x = 200; x < W - 150; x += 120) for (let y = 220; y < H - 300; y += 120) { g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.moveTo(x, y - 8); g.lineTo(x, y + 8); g.stroke(); }
});
const MAT_W = 3.9, MAT_D = 3.3, MAT_CZ = -0.3;
const matTopMat = new THREE.MeshLambertMaterial({ map: matTex });
const matMesh = mesh(new THREE.BoxGeometry(MAT_W, 0.012, MAT_D), [M("#e8e1d4"), M("#e8e1d4"), matTopMat, M("#e8e1d4"), M("#e8e1d4"), M("#e8e1d4")], false);
matMesh.position.set(0, 0.006, MAT_CZ); scene.add(matMesh);
const cards = new THREE.Group(); scene.add(cards);
[["12x", "solder"], ["25x", "wire"], ["7x", "screw"], ["3x", "foil"], ["10x", "shrink"], ["1x", "kapton"], ["1x", "flux"], ["2x", "lens"]].forEach((c, i) => {
  const t = canvasTex(256, 180, (g, W, H) => { g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, W, H); g.strokeStyle = "#ccc"; g.lineWidth = 3; g.strokeRect(2, 2, W - 4, H - 4);
    g.fillStyle = "#e0453a"; g.fillRect(14, H - 26, 26, 8); g.fillStyle = "#222"; g.font = "800 44px Outfit, Arial"; g.textAlign = "right"; g.fillText(c[0], W - 16, H - 16);
    g.font = "600 30px Outfit, Arial"; g.textAlign = "left"; g.fillStyle = "#555"; g.fillText(c[1], 16, 46);
    g.strokeStyle = "#333"; g.lineWidth = 4; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(40 + k * 34, 92, 9, 0, 7); g.stroke(); } });
  const card = mesh(new THREE.BoxGeometry(0.34, 0.004, 0.24), [M("#fbfaf6"), M("#fbfaf6"), new THREE.MeshLambertMaterial({ map: t }), M("#fbfaf6"), M("#fbfaf6"), M("#fbfaf6")], false);
  card.position.set(-1.58 + i * 0.45, MAT_TOP + 0.002, 1.17); cards.add(card);
});

/* ---------------------------------------------------------------- glasses rig */
const rig = new THREE.Group(); rig.name = "rig"; scene.add(rig);
const FRAME = M("#71819a"), FRAME2 = M("#8291a6"), METAL = M("#a9afb8"), GOLD = M("#d9b45a"), BLACK = M("#1d1d20");
const frameG = new THREE.Group(); rig.add(frameG);
{ const R = G.RIM;
  [-1, 1].forEach(sx => {
    const shp = roundRectShape(R.w, R.h, R.r); shp.holes.push(roundRectShape(R.iw, R.ih, R.ir));
    const geo = new THREE.ExtrudeGeometry(shp, { depth: R.d - 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 10 });
    geo.translate(0, 0, -(R.d - 0.012) / 2);
    const rim = mesh(geo, FRAME); rim.position.set(sx * R.cx, R.cy, 0); frameG.add(rim);
    const end = box(0.075, 0.105, 0.055, FRAME, 0.015); at(end, sx * 0.665, G.TY, -0.012); frameG.add(end);
    const hinge = cyl(0.017, 0.017, 0.10, METAL, 12); at(hinge, sx * 0.70, G.TY, -0.045); frameG.add(hinge);
    const temple = box(G.TW, G.TH, 1.24, FRAME, 0.012); at(temple, sx * G.TX, G.TY, -0.68); frameG.add(temple);
    const tip = box(G.TW, G.TH, 0.445, FRAME, 0.012); at(tip, sx * G.TX, (G.TY + G.temple.tipY) / 2, (G.temple.z1 + G.temple.tipZ) / 2, -0.77); frameG.add(tip);
    const npArm = cyl(0.006, 0.006, 0.08, METAL, 6); at(npArm, sx * 0.105, 0.20, -0.04, 0.6, 0, 0); frameG.add(npArm);
    const np = mesh(new THREE.SphereGeometry(0.03, 12, 8), M("#d8dde3")); np.scale.set(0.45, 1, 0.7); at(np, sx * 0.11, 0.16, -0.075, 0, sx * 0.4, 0); frameG.add(np);
  });
  const bridge = mesh(new THREE.TorusGeometry(0.085, 0.02, 10, 20, Math.PI), FRAME); at(bridge, 0, 0.34, 0); frameG.add(bridge);
  const channel = box(0.003, 0.058, 0.33, M("#4e5a6c")); at(channel, -0.7438, G.TY, -0.72); frameG.add(channel);
}
/* ---------------------------------------------------------------- parts (built in installed orientation, centred on their anchor) */
function pcbGroup(s, color) { const g = new THREE.Group(); g.add(box(s[0], s[1], s[2], M(color), 0.004)); return g; }
const BUILD = {
  xiao() { const s = G.PARTS.xiao.s; const g = pcbGroup(s, "#24324a");
    const sh = box(0.012, 0.12, 0.13, METAL, 0.003); at(sh, -0.011, 0.0, 0.02); g.add(sh);
    const usb = box(0.03, 0.088, 0.034, METAL, 0.012); at(usb, -0.012, 0.0, -0.098); g.add(usb);
    for (let i = 0; i < 7; i++) [-1, 1].forEach(e => { const p = box(0.008, 0.012, 0.014, GOLD); at(p, -0.004, e * 0.0815, -0.0762 + i * 0.0254); g.add(p); });
    const chg = box(0.005, 0.01, 0.01, M("#ff6a4a", { emissive: new THREE.Color(0.3, 0.05, 0) })); at(chg, -0.008, -0.05, -0.07); g.add(chg);
    return g; },
  sense() { const g = pcbGroup(G.PARTS.sense.s, "#2c3a52"); const c = box(0.012, 0.05, 0.03, BLACK); at(c, 0.008, 0.02, 0.0); g.add(c); const sd = box(0.008, 0.11, 0.1, METAL, 0.003); at(sd, -0.008, -0.02, -0.03); g.add(sd);
    const rib = box(0.004, 0.035, 0.07, M("#c8873a")); at(rib, -0.004, 0.02, 0.10); g.add(rib); return g; },
  cam() { const g = new THREE.Group(); g.add(box(0.03, 0.08, 0.08, M("#2a2a2e"), 0.006)); const barrel = cyl(0.022, 0.024, 0.035, BLACK, 20); at(barrel, 0, 0, 0.05, Math.PI / 2, 0, 0); g.add(barrel);
    const glass = cyl(0.014, 0.014, 0.004, M("#2b4d8a", { emissive: new THREE.Color(0.02, 0.05, 0.12) }), 16); at(glass, 0, 0, 0.068, Math.PI / 2, 0, 0); g.add(glass); return g; },
  antenna() { const g = new THREE.Group(); g.add(box(0.05, 0.004, 0.12, M("#d8b23c"), 0.002)); const c = cyl(0.004, 0.004, 0.08, BLACK, 6); at(c, 0.0, -0.01, 0.07, Math.PI / 2, 0, 0); g.add(c); return g; },
  battery() { const s = G.PARTS.battery.s; const g = new THREE.Group(); g.add(box(s[0], s[1], s[2], M("#cfd3d8"), 0.012));
    const lt = canvasTex(512, 340, (c, W, H) => { c.fillStyle = "#3e6fb5"; c.fillRect(0, 0, W, H); c.fillStyle = "#fff"; c.font = "800 70px Outfit, Arial"; c.fillText("EEMB", 30, 100); c.font = "600 40px 'JetBrains Mono', monospace"; c.fillText("LP502030", 30, 170); c.fillText("3.7V 250mAh", 30, 230); c.font = "500 26px Outfit"; c.fillText("Li-polymer · PCM", 30, 290); });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(s[2] * 0.8, s[1] * 0.78), new THREE.MeshLambertMaterial({ map: lt })); at(lab, s[0] / 2 + 0.0015, 0, -0.01, 0, Math.PI / 2, 0); g.add(lab);
    const pcm = box(0.048, 0.06, 0.012, M("#2f8a4f")); at(pcm, 0, 0.03, s[2] / 2 + 0.004); g.add(pcm);
    const r = cyl(0.005, 0.005, 0.05, M("#d23a2e"), 6); at(r, 0, 0.055, s[2] / 2 + 0.02, Math.PI / 2, 0, 0); g.add(r);
    const k = cyl(0.005, 0.005, 0.05, M("#26262a"), 6); at(k, 0, 0.025, s[2] / 2 + 0.02, Math.PI / 2, 0, 0); g.add(k); return g; },
  switch() { const g = new THREE.Group(); g.add(box(0.035, 0.035, 0.085, METAL, 0.004)); const kn = box(0.014, 0.022, 0.018, BLACK, 0.003); at(kn, 0, 0.026, 0.012); g.add(kn);
    [-0.03, 0, 0.03].forEach(z => { const p = box(0.006, 0.02, 0.004, GOLD); at(p, 0.02, -0.01, z); g.add(p); }); return g; },
  oled() { const s = G.PARTS.oled.s; const g = pcbGroup(s, "#2860b4"); const gl = box(0.22, 0.006, 0.075, BLACK, 0.002); at(gl, 0.02, -0.012, 0); g.add(gl);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, opacity: 0 })); at(scr, 0.02, -0.0155, 0, Math.PI / 2, 0, 0); noOL(scr); g.add(scr); g.userData.screen = scr;
    [0.085, 0.105, 0.125, 0.145].forEach(z => { const p = cyl(0.006, 0.006, 0.012, GOLD, 8); at(p, -0.135, 0.012, z - 0.12); g.add(p); }); return g; },
  hud() { const g = new THREE.Group();
    const arm1 = box(0.10, 0.02, 0.06, FRAME2, 0.006); at(arm1, -0.20, 0.05, -0.06); g.add(arm1);
    const arm2 = box(0.02, 0.07, 0.02, FRAME2, 0.005); at(arm2, -0.155, 0.02, 0.0); g.add(arm2);
    const lens = cyl(0.045, 0.045, 0.008, new THREE.MeshLambertMaterial({ color: "#d7eef5", transparent: true, opacity: 0.6 }), 24); at(lens, 0, 0.04, 0); g.add(lens);
    const cube = box(0.1, 0.1, 0.1, new THREE.MeshLambertMaterial({ color: "#bfe4ee", transparent: true, opacity: 0.45, depthWrite: false })); at(cube, 0, -0.015, 0); g.add(cube);
    const split = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.138), new THREE.MeshLambertMaterial({ color: "#8fd0e2", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); at(split, 0, -0.015, 0, -Math.PI / 4, 0, 0); noOL(split); g.add(split);
    const img = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); at(img, 0, -0.012, 0.052); noOL(img); g.add(img); g.userData.image = img;
    const frameRing = box(0.104, 0.012, 0.104, FRAME2); at(frameRing, 0, 0.03, 0); g.add(frameRing);
    return g; },
  hr() { const g = pcbGroup(G.PARTS.hr.s, "#6a3fb0"); const w = box(0.006, 0.04, 0.05, BLACK, 0.003); at(w, 0.007, 0.0, -0.01); g.add(w);
    const ir = mesh(new THREE.SphereGeometry(0.008, 8, 6), M("#ff5040", { emissive: new THREE.Color(0.5, 0.05, 0.02) })); at(ir, 0.01, 0.0, 0.02); g.add(ir);
    [0.045, 0.015, -0.015, -0.045].forEach(y => { const p = box(0.006, 0.012, 0.01, GOLD); at(p, 0.007, y, 0.06); g.add(p); }); return g; },
  amp() { const g = pcbGroup(G.PARTS.amp.s, "#1f2a44"); const ic = box(0.006, 0.04, 0.04, BLACK); at(ic, 0.008, 0.0, 0.0); g.add(ic);
    const tb = box(0.03, 0.035, 0.07, M("#2f7fd0"), 0.004); at(tb, 0.018, -0.06, 0.0); g.add(tb);
    for (let k = 0; k < 7; k++) { const p = box(0.006, 0.01, 0.012, GOLD); at(p, 0.007, 0.075, -0.08 + k * 0.025); g.add(p); } return g; },
  spk() { const g = new THREE.Group(); const c = cyl(0.065, 0.065, 0.03, M("#3c3c44"), 28); c.rotation.z = Math.PI / 2; g.add(c);
    const plate = cyl(0.045, 0.045, 0.008, METAL, 24); at(plate, 0.018, 0, 0, 0, 0, Math.PI / 2); g.add(plate); return g; },
  pad() { const g = new THREE.Group(); g.add(box(0.004, 0.055, 0.08, M("#d08a4e", { emissive: new THREE.Color(0.06, 0.025, 0.0) }))); const tab = box(0.004, 0.012, 0.012, M("#d08a4e")); at(tab, 0, 0.026, 0.032); g.add(tab); return g; },
  ttp() { const g = new THREE.Group(); g.add(box(0.15, 0.012, 0.11, M("#c0392b"), 0.004)); const r = cyl(0.035, 0.035, 0.004, M("#e2c06a"), 20); at(r, -0.02, 0.008, 0); g.add(r);
    const ic = box(0.03, 0.01, 0.02, BLACK); at(ic, 0.045, 0.01, 0.02); g.add(ic); [0.03, 0, -0.03].forEach(z => { const p = cyl(0.005, 0.005, 0.02, GOLD, 6); at(p, 0.065, 0.012, z); g.add(p); }); return g; },
  button() { const g = new THREE.Group(); g.add(box(0.05, 0.02, 0.05, BLACK, 0.004)); const top = box(0.044, 0.004, 0.044, METAL); at(top, 0, 0.011, 0); g.add(top);
    const cap = cyl(0.014, 0.014, 0.012, M("#e9e5dc"), 16); at(cap, 0, 0.018, 0); g.add(cap); return g; },
  led() { const g = new THREE.Group(); const m = M("#e8392c", { unique: true, emissive: new THREE.Color(0, 0, 0) }); const c = cyl(0.016, 0.016, 0.02, m, 16); c.rotation.x = Math.PI / 2; g.add(c);
    const d = mesh(new THREE.SphereGeometry(0.016, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m); at(d, 0, 0, 0.01, Math.PI / 2, 0, 0); g.add(d); g.userData.mat = m;
    const gl = glow(0xff4030, 0.12, 0); gl.position.set(0, 0, 0.03); g.add(gl); g.userData.glow = gl; return g; },
  coverR() { const s = G.PARTS.coverR.s; const g = new THREE.Group(); g.add(box(s[0], s[1], s[2], FRAME2, 0.03));
    const slot = box(0.004, 0.10, 0.04, BLACK, 0.008); slot.rotation.y = Math.PI / 2; at(slot, 0.023, 0.0, -s[2] / 2 - 0.001, 0, Math.PI / 2, 0); g.add(slot);
    const hole = cyl(0.03, 0.03, 0.004, BLACK, 20); at(hole, 0.005, 0.02, s[2] / 2 + 0.001, Math.PI / 2, 0, 0); g.add(hole); return g; },
  coverL() { const s = G.PARTS.coverL.s; const g = new THREE.Group(); g.add(box(s[0], s[1], s[2], FRAME2, 0.03)); return g; },
  lens() { const R = G.RIM; const geo = new THREE.ExtrudeGeometry(roundRectShape(R.iw + 0.014, R.ih + 0.014, R.ir + 0.006), { depth: 0.012, bevelEnabled: false, curveSegments: 12 }); geo.translate(0, 0, -0.006);
    const m = new THREE.MeshLambertMaterial({ color: "#d9eef4", transparent: true, opacity: 0.26, depthWrite: false }); const l = mesh(geo, m, false); noOL(l); const g = new THREE.Group(); g.add(l); g.userData.mat = m; return g; },
  plug() { const g = new THREE.Group(); const b = box(0.06, 0.08, 0.09, M("#2c2c30"), 0.02); at(b, 0, 0, -0.04); g.add(b); const t = box(0.028, 0.07, 0.04, METAL, 0.012); at(t, 0, 0, 0.02); g.add(t); return g; },
  podR() { return podShell("podR", -1); },
  podL() { return podShell("podL", 1); },
  frame() { return null; }
};
/* printed pod shell: base plate (bonded to the temple) + top/bottom rails + rear wall + screw bosses for the lid */
const PLA_SHELL = M("#c9d0da");
function podShell(id, side) {
  const p = G.PARTS[id], c = p.c, s = p.s, g = new THREE.Group();
  g.add(box(s[0], s[1], s[2], PLA_SHELL, 0.0015));
  const d = 0.028, rx = side * (s[0] / 2 + d / 2);
  [-1, 1].forEach(e => { const r = box(d, 0.006, s[2], PLA_SHELL, 0.002); at(r, rx, e * (s[1] / 2 - 0.003), 0); g.add(r); });
  const back = box(d, s[1], 0.006, PLA_SHELL, 0.002); at(back, rx, 0, -s[2] / 2 + 0.003); g.add(back);
  Object.values(G.SCREWS).filter(sc => sc.step === "pods" && Math.sign(sc.c[0]) === side).forEach(sc => {
    const lx = sc.c[0] - c[0], ly = sc.c[1] - c[1] - 0.009, lz = sc.c[2] - c[2];
    const boss = cyl(0.012, 0.012, 0.012, PLA_SHELL, 12); at(boss, lx, ly, lz); g.add(boss);
    const rib = box(Math.abs(lx), 0.006, 0.01, PLA_SHELL); at(rib, lx / 2, ly, lz); g.add(rib);
  });
  return g;
}
// HUD text texture (OLED + virtual image)
const hudTex = canvasTex(512, 256, (g, W, H) => { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); });
function drawHud(text, sub) { const c = hudTex.userData.ctx; c.fillStyle = "#000"; c.fillRect(0, 0, 512, 256); c.fillStyle = "#7dfcff"; c.font = "700 74px 'JetBrains Mono', monospace"; c.fillText(text, 24, 110); c.font = "500 46px 'JetBrains Mono', monospace"; c.fillStyle = "#c8ffff"; c.fillText(sub, 24, 200); hudTex.needsUpdate = true; }
drawHud("EDITH", "♥ 72  12:41");

/* ---------------------------------------------------------------- tools */
function makeIron() {
  const g = new THREE.Group();
  const tip = mesh(new THREE.ConeGeometry(0.008, 0.06, 12), METAL); at(tip, 0, 0.03, 0, Math.PI, 0, 0); g.add(tip);
  const sh = cyl(0.011, 0.011, 0.22, METAL, 12); at(sh, 0, 0.17, 0); g.add(sh);
  const grip = cyl(0.03, 0.026, 0.32, M("#27384f"), 16); at(grip, 0, 0.44, 0); g.add(grip);
  const ring = cyl(0.033, 0.033, 0.03, M("#f2a03b"), 16); at(ring, 0, 0.3, 0); g.add(ring);
  const cord = cyl(0.008, 0.008, 0.2, BLACK, 6); at(cord, 0, 0.7, 0); g.add(cord);
  const gl = glow(0xff7a2a, 0.12, 0.0); gl.position.set(0, 0.004, 0); g.add(gl); g.userData.glow = gl;
  return g;
}
function makeDriver() {
  const g = new THREE.Group(); const sh = cyl(0.005, 0.005, 0.18, METAL, 8); at(sh, 0, 0.09, 0); g.add(sh);
  const h = cyl(0.026, 0.022, 0.2, M("#d63b2f"), 6); at(h, 0, 0.28, 0); g.add(h); const cap = cyl(0.027, 0.027, 0.03, BLACK, 6); at(cap, 0, 0.39, 0); g.add(cap); return g;
}
function makeTweezers() {
  const g = new THREE.Group(); const a = box(0.008, 0.26, 0.016, METAL, 0.003), b = a.clone();
  const pa = new THREE.Group(), pb = new THREE.Group(); at(a, 0, 0.13, 0); at(b, 0, 0.13, 0); pa.add(a); pb.add(b);
  pa.position.set(0.012, 0, 0); pb.position.set(-0.012, 0, 0); g.add(pa, pb); g.userData.arms = [pa, pb]; return g;
}
const iron = makeIron(), driver = makeDriver(), tweez = makeTweezers();
scene.add(iron, driver, tweez);
const stand = new THREE.Group(); { const b = box(0.22, 0.03, 0.16, BLACK, 0.01); at(b, 0, 0.015, 0); stand.add(b); const sp = box(0.12, 0.025, 0.1, M("#e6c34a"), 0.01); at(sp, -0.04, 0.042, 0); stand.add(sp);
  const coil = mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 18), METAL); at(coil, 0.06, 0.09, 0, 0, Math.PI / 2, 0); stand.add(coil); }
at(stand, 1.55, MAT_TOP, 0.95); scene.add(stand);

/* ---------------------------------------------------------------- laptop + cable */
const laptop = new THREE.Group(); const lid = new THREE.Group();
{ const base = box(0.62, 0.028, 0.42, M("#c9ccd2"), 0.012); at(base, 0, 0.014, 0); laptop.add(base);
  const kb = box(0.54, 0.002, 0.2, M("#2a2c31")); at(kb, 0, 0.029, -0.04); laptop.add(kb);
  const tp = box(0.16, 0.002, 0.09, M("#b8bbc2")); at(tp, 0, 0.029, 0.13); laptop.add(tp);
  const lb = box(0.62, 0.4, 0.016, M("#c9ccd2"), 0.012); at(lb, 0, 0.2, -0.008); lid.add(lb);
  lid.position.set(0, 0.03, -0.21); laptop.add(lid);
}
const lapTex = canvasTex(640, 400, () => {});
const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.35), new THREE.MeshBasicMaterial({ map: lapTex })); at(lapScreen, 0, 0.2, 0.0005); noOL(lapScreen); lid.add(lapScreen);
function drawLaptop(p, done) {
  const g = lapTex.userData.ctx; g.fillStyle = "#1f2428"; g.fillRect(0, 0, 640, 400); g.fillStyle = "#0e7c86"; g.fillRect(0, 0, 640, 42);
  g.fillStyle = "#fff"; g.font = "600 20px Outfit, Arial"; g.fillText("edith_glasses.ino — Arduino IDE 2", 16, 28);
  g.font = "16px 'JetBrains Mono', monospace"; const lines = ["#include <WiFi.h>", "#include \"esp_camera.h\"", "#define PIN_TOUCH_A 1  // D0", "#define PIN_SDA 5      // D4", "void setup() {", "  calibrateTouch();", "  hud.begin(0x3C);"];
  lines.forEach((l, i) => { g.fillStyle = i < 2 ? "#7fd0a0" : i < 4 ? "#f3c86b" : "#d7dde3"; g.fillText(l, 20, 80 + i * 26); });
  g.fillStyle = "#11161a"; g.fillRect(0, 280, 640, 120); g.fillStyle = "#d7dde3"; g.font = "15px 'JetBrains Mono', monospace";
  g.fillText(done ? "Done uploading. Hard resetting via RTS pin..." : p > 0 ? "Writing at 0x000" + Math.floor(p * 9) + "a000... (" + Math.round(p * 100) + " %)" : "Board: XIAO_ESP32S3 · PSRAM: OPI · USB CDC: on", 16, 310);
  g.fillStyle = "#2b3238"; g.fillRect(16, 330, 608, 18); g.fillStyle = done ? "#3cb35a" : "#0e9aa7"; g.fillRect(16, 330, 608 * (done ? 1 : p), 18);
  lapTex.needsUpdate = true;
}
drawLaptop(0, false);
at(laptop, -1.52, MAT_TOP, -1.42, 0, Math.PI / 2 - 0.25, 0); scene.add(laptop);
