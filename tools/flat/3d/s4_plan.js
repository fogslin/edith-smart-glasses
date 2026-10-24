/* ---------------------------------------------------------------- build plan (everything is a pure function of time t) */
const UP = new THREE.Vector3(0, 1, 0);
const PR = {};                      // part runtime
const JOINTS = [], WIRE_RT = {}, SCREW_RT = [], GUIDES = [], LABELS = [], FX = [], CAMKEYS = [];
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xfff6e6, transparent: true, opacity: 0.3, depthWrite: false });
const APPROACH = { frame: [0, 1, 0], xiao: [-1, 0.3, 0], sense: [-1, 0.2, 0], cam: [0, 0.2, 1], antenna: [0, 1, 0], battery: [1, 0.3, 0], switch: [0, 1, 0], oled: [0, 1, 0], hud: [0, 1, 0.3],
  hr: [1, 0.3, 0], amp: [1, 0.3, 0], spk: [1, 0.2, 0], padA: [-1, 0.2, 0], padB: [-1, 0.2, 0], padC: [-1, 0.2, 0], button: [0, 1, 0], led: [0, 0.2, 1], coverR: [-1, 0.25, 0], coverL: [1, 0.25, 0],
  lensR: [0, 0.15, 1], lensL: [0, 0.15, 1], plug: [0, 0.05, -1] };
const PIECE_IDS = [];
let appearIdx = 0;
function makePart(id) {
  const def = G.PARTS[id];
  let obj;
  if (id === "frame") obj = frameG;
  else if (id.startsWith("pad")) obj = BUILD.pad();
  else if (id.startsWith("lens")) obj = BUILD.lens();
  else obj = BUILD[id]();
  const world = id === "ttp" || id === "plug";
  if (id !== "frame") (world ? scene : rig).add(obj);
  const rt = { id, obj, def, flights: [], appear: 0, world };
  // mat pose
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(def.matRot || [0, 0, 0])));
  if (id === "frame") { rt.mat = { p: V(0, 1.6, 0.5), q: new THREE.Quaternion() }; }
  else {
    obj.position.set(0, 0, 0); obj.quaternion.copy(q); obj.scale.set(1, 1, 1); obj.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(obj);
    const off = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2);
    if (rt.world) { /* world parent: rig is identity at build time */ }
    rt.mat = { p: V(def.mat[0] - off.x, MAT_TOP + 0.001 - off.y, def.mat[2] - off.z), q };
  }
  rt.fin = { p: def.c ? V(def.c) : V(0, 0, 0), q: new THREE.Quaternion() };
  // ghost
  if (id !== "ttp") {
    const gsrc = id === "frame" ? frameG : obj;
    const gh = gsrc.clone(true); gh.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } if (o.isSprite) o.visible = false; });
    gh.visible = false; noOL(gh); (world ? scene : rig).add(gh); rt.ghost = gh;
  }
  PR[id] = rt; return rt;
}
Object.keys(G.PARTS).forEach(makePart);

function partPose(rt, t, out) {
  let p = rt.mat.p, q = rt.mat.q, scale = 1, moving = false;
  for (const f of rt.flights) {
    if (t >= f.t1) { p = f.to.p; q = f.to.q; const v = t - f.t1; if (v < 0.28 && f.snap !== false) scale = 1 + 0.07 * Math.sin(Math.PI * v / 0.28); continue; }
    if (t >= f.t0) {
      const u = (t - f.t0) / (f.t1 - f.t0), e = easeIO(u);
      const a = f.from.p, b = f.to.p, ap = f.approach;
      const c1 = a.clone().addScaledVector(UP, f.lift), c2 = b.clone().addScaledVector(ap, f.reach);
      const k = 1 - e; out.p.set(0, 0, 0).addScaledVector(a, k * k * k).addScaledVector(c1, 3 * k * k * e).addScaledVector(c2, 3 * k * e * e).addScaledVector(b, e * e * e);
      out.q.copy(f.from.q).slerp(f.to.q, easeIO2(clamp01(u * 1.35)));
      out.scale = 1; out.moving = true; return out;
    }
    break;
  }
  out.p.copy(p); out.q.copy(q); out.scale = scale; out.moving = moving;
  // appear-drop on the mat during the layout step
  if (t < rt.appear + 0.5 && (!rt.flights.length || t < rt.flights[0].t0)) { const u = clamp01((t - rt.appear) / 0.5); out.p.y += 0.35 * (1 - easeOut(u)) ; }
  return out;
}

function addFlight(rt, t0, t1, from, to, opt = {}) {
  const ap = V(opt.approach || APPROACH[rt.id] || [0, 1, 0]).normalize();
  const dist = from.p.distanceTo(to.p);
  rt.flights.push({ t0, t1, from, to, approach: ap, lift: opt.lift ?? (0.35 + dist * 0.25), reach: opt.reach ?? 0.32, snap: opt.snap });
  rt.flights.sort((a, b) => a.t0 - b.t0);
}

/* step-plan API */
const ironKeys = [], driverKeys = [], tweezKeys = [];
let driverSpin = 0;
function api(stepId) {
  const s0 = S0(stepId);
  const A = {
    s0,
    fly(id, a, b, opt = {}) {
      const rt = PR[id]; addFlight(rt, s0 + a, s0 + b, rt.mat, rt.fin, opt);
      if (!PIECE_IDS.includes(id) && id !== "plug") PIECE_IDS.push(id);
      rt.ghostFrom = s0 + Math.max(0.05, a - 0.9);
      const lbl = opt.label || { name: rt.def.name, code: rt.def.code, n: opt.n || "1/1" };
      LABELS.push({ t0: s0 + a, t1: s0 + b + 1.5, anchor: () => rt.obj.getWorldPosition(_v).add(_lo.set(0, 0.07, 0)), html: `${lbl.name} <code>${lbl.code}</code>${lbl.n ? ` <span class="n">· ${lbl.n}</span>` : ""}` });
      const tip = rt.fin.p.clone(), tail = tip.clone().addScaledVector(V(opt.approach || APPROACH[id] || [0, 1, 0]).normalize(), 0.42);
      GUIDES.push(guideLine([tail, tip], s0 + a, s0 + b + 0.35, rt.world ? scene : rig));
      if (opt.tweezers) carry(rt, s0 + a, s0 + b);
      return A;
    },
    wire(id, a, b) {
      const w = WIRE_RT[id]; w.t0 = s0 + a; w.t1 = s0 + b;
      GUIDES.push(Object.assign(guideLine(w.curve.getPoints(90), s0 + a - 0.7, s0 + b + 0.2, rig), { lead: 0.7 }));
      return A;
    },
    solder(list, a, gap, kind = "joint") {
      const n = list.length;
      list.forEach((j, i) => {
        let pos, label;
        if (typeof j === "string" && WIRE_RT[j.split(":")[0]]) { const [wid, end] = j.split(":"); const w = G.WIRES[wid]; pos = V(end === "a" ? w.pts[0] : w.pts[w.pts.length - 1]); label = end === "a" ? w.a : w.b; }
        else { pos = V(G.pad(j)); label = j + " pad"; }
        const t = s0 + a + i * gap;
        JOINTS.push({ pos, t, label, kind, k: i + 1, n, step: stepId, s0, gap: i ? gap : 1.2 });
      });
      return A;
    },
    screw(id, a, b) { const sc = G.SCREWS[id]; SCREW_RT.push(makeScrew(sc, s0 + a, s0 + b)); return A; },
    cam(a, p, tg) { CAMKEYS.push({ t: s0 + a, p: V(p), tg: V(tg) }); return A; },
    label(a, b, anchor, html, cls) { LABELS.push({ t0: s0 + a, t1: s0 + b, anchor: typeof anchor === "function" ? anchor : () => rig.localToWorld(_v.copy(anchor)), html, cls }); return A; },
    fx(fn) { FX.push(fn); return A; }
  };
  return A;
}
const _v = new THREE.Vector3(), _lo = new THREE.Vector3();

/* wires */
const tubeR = 0.0042;
Object.keys(G.WIRES).forEach(id => {
  const w = G.WIRES[id];
  const curve = new THREE.CatmullRomCurve3(w.pts.map(p => V(p)), false, "catmullrom", 0.25);
  const segs = Math.max(24, w.pts.length * 14);
  const geo = new THREE.TubeGeometry(curve, segs, tubeR, 6, false);
  const m = mesh(geo, M(w.c), true); m.castShadow = false; m.visible = false; rig.add(m);
  WIRE_RT[id] = { id, def: w, curve, mesh: m, segs, t0: 1e9, t1: 1e9 };
});
const headBead = mesh(new THREE.SphereGeometry(0.009, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc46b })); noOL(headBead); rig.add(headBead);

/* guides: red dashed lines (drawn progressively) */
function guideLine(pts, t0, t1, parent) {
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xe0453a, dashSize: 0.022, gapSize: 0.016, transparent: true, opacity: 0.95, depthTest: true }));
  line.computeLineDistances(); line.visible = false; noOL(line); parent.add(line);
  return { line, t0, t1, n: pts.length };
}

/* screws */
function makeScrew(sc, t0, t1) {
  const g = new THREE.Group(); const head = cyl(0.011, 0.011, 0.006, METAL, 12); head.position.y = 0.003; g.add(head);
  const slot = box(0.016, 0.002, 0.003, BLACK); slot.position.y = 0.0065; g.add(slot); const sh = cyl(0.004, 0.003, 0.03, METAL, 8); sh.position.y = -0.015; g.add(sh);
  g.position.copy(V(sc.c)); g.visible = false; rig.add(g);
  const p = V(sc.c);
  driverKeys.push({ t: t0 - 0.55, p: p.clone().add(V(0, 0.22, 0)), spin: driverSpin });
  driverKeys.push({ t: t0, p: p.clone().add(V(0, 0.016, 0)), spin: driverSpin });
  driverSpin += Math.PI * 8;
  driverKeys.push({ t: t1, p: p.clone().add(V(0, 0.004, 0)), spin: driverSpin, lin: true });
  driverKeys.push({ t: t1 + 0.3, p: p.clone().add(V(0, 0.2, 0)), spin: driverSpin });
  LABELS.push({ t0: t0 - 0.4, t1: t1 + 0.5, anchor: () => rig.localToWorld(_v.copy(p)), html: `${sc.name} <code>M1.4</code>`, cls: "joint" });
  return { g, p, t0, t1, step: sc.step };
}

/* tweezers carrying a part */
const _pose = { p: new THREE.Vector3(), q: new THREE.Quaternion(), scale: 1 };
function carry(rt, t0, t1) {
  const off = V(0, 0.018, 0);
  const at0 = partPose(rt, t0 - 0.01, _pose).p.clone();
  tweezKeys.push({ t: t0 - 0.5, p: at0.clone().add(V(0, 0.14, 0)), open: 1 });
  tweezKeys.push({ t: t0 - 0.06, p: at0.clone().add(off), open: 0 });
  for (let i = 1; i <= 8; i++) { const tt = t0 + (t1 - t0) * i / 8; tweezKeys.push({ t: tt, p: partPose(rt, tt, _pose).p.clone().add(off), open: 0, lin: true }); }
  tweezKeys.push({ t: t1 + 0.12, p: rt.fin.p.clone().add(off), open: 1 });
  tweezKeys.push({ t: t1 + 0.45, p: rt.fin.p.clone().add(V(0, 0.14, 0)), open: 1 });
}

/* ------------------------------ the plan, step by step ------------------------------ */
(function plan() {
  // 1 · lay out
  let A = api("layout");
  const order = ["xiao", "sense", "cam", "antenna", "oled", "hud", "lensR", "lensL", "battery", "switch", "padA", "padB", "padC", "button", "led", "ttp", "coverR", "coverL", "hr", "amp", "spk", "plug"];
  order.forEach((id, i) => { PR[id].appear = A.s0 + 0.3 + i * 0.2; LABELS.push({ t0: PR[id].appear + 0.2, t1: PR[id].appear + 1.3, anchor: () => PR[id].obj.getWorldPosition(_v).add(_lo.set(0, 0.06, 0)), html: `${G.PARTS[id].name} <code>${G.PARTS[id].code}</code>` }); });
  PR.frame.appear = A.s0 + 5.0;
  A.fly("frame", 5.2, 6.9, { lift: 0.1, reach: 0.6, label: { name: "Frame", code: "front + temples", n: "1/1" } })
    .cam(0, [4.0, 3.5, 6.2], [0, 0.3, -0.4]).cam(3.6, [3.7, 2.6, 4.0], [0, 0.15, 0.05]).cam(7.9, [2.35, 2.0, 2.65], [0, 0.25, -0.35]);
  // 2 · tin pads
  A = api("tin");
  A.fly("xiao", 0.4, 2.2).solder(G.TIN, 2.8, 0.45, "tin")
    .cam(1.2, [-2.1, 1.15, 0.9], [-0.62, 0.35, -0.35]).cam(8.9, [-1.5, 0.72, 0.28], [-0.77, 0.38, -0.34]);
  // 3 · battery
  A = api("battery");
  A.fly("battery", 0.3, 1.9).fly("switch", 1.4, 2.9, { tweezers: true })
    .wire("p_bat", 3.0, 3.6).solder(["p_bat:b"], 3.8, 1).solder(["p_sw:a"], 4.5, 1)
    .wire("p_sw", 4.8, 6.6).wire("p_gnd", 5.0, 6.8).solder(["p_sw:b", "p_gnd:b"], 7.6, 0.8)
    .cam(1.0, [0.35, 3.4, 1.5], [0, 0.3, -0.55]).cam(6.5, [0.15, 3.0, 1.2], [0, 0.32, -0.5]).cam(7.3, [-1.35, 1.0, 0.35], [-0.76, 0.35, -0.37]).cam(9.9, [-1.25, 0.82, 0.2], [-0.76, 0.35, -0.38]);
  // fix joint counters for the battery step (3 separate solder calls)
  // 4 · camera + antenna
  A = api("camera");
  A.fly("sense", 0.4, 1.8).fly("cam", 1.6, 3.2).fly("antenna", 3.4, 5.0, { tweezers: true })
    .label(1.0, 3.0, V(-0.79, G.TY + 0.12, -0.33), "B2B connector <code>click</code>")
    .cam(1.0, [-1.7, 1.0, 1.0], [-0.78, 0.38, -0.28]).cam(7.9, [-1.3, 0.8, 0.55], [-0.79, 0.40, -0.26]);
  // 5 · I2C to OLED
  A = api("oled");
  A.fly("oled", 0.4, 2.0).wire("o_sda", 2.2, 3.6).wire("o_scl", 2.4, 3.8).wire("o_vcc", 2.6, 4.0).wire("o_gnd", 2.8, 4.2)
    .solder(["o_sda:a", "o_scl:a", "o_vcc:a", "o_gnd:a", "o_sda:b", "o_scl:b", "o_vcc:b", "o_gnd:b"], 4.6, 0.42)
    .cam(1.0, [-1.75, 1.35, 1.55], [-0.55, 0.42, -0.08]).cam(9.9, [-1.25, 1.05, 1.25], [-0.55, 0.45, -0.02]);
  // 6 · HUD optic
  A = api("hud");
  A.fly("hud", 0.4, 2.2).screw("hud1", 2.8, 4.2)
    .label(4.4, 7.8, V(-0.40, 0.40, 0.17), "50/50 beam-splitter <code>45°</code>").label(4.8, 7.8, V(-0.40, 0.49, 0.12), "Plano-convex lens <code>f 25–40 mm</code>")
    .cam(1.0, [-1.0, 0.9, 1.6], [-0.42, 0.45, 0.08]).cam(7.9, [-0.75, 0.75, 1.3], [-0.42, 0.44, 0.06]);
  GUIDES.push(guideLine([V(-0.38, 0.495, 0.12), V(-0.38, 0.425, 0.12), V(-0.38, 0.425, -0.25)], A.s0 + 4.4, A.s0 + 7.9, rig));
  // 7 · heart-rate
  A = api("heart");
  A.fly("hr", 0.4, 1.9).wire("h_sda", 2.0, 3.4).wire("h_scl", 2.15, 3.55).wire("h_vcc", 2.3, 3.7).wire("h_gnd", 2.45, 3.85)
    .solder(["h_sda:a", "h_scl:a", "h_vcc:a", "h_gnd:a", "h_sda:b", "h_scl:b", "h_vcc:b", "h_gnd:b"], 4.1, 0.4)
    .cam(1.0, [0.3, 1.0, -0.2], [-0.68, 0.33, -0.58]).cam(8.9, [-0.05, 0.75, -0.78], [-0.69, 0.33, -0.6]);
  // 8 · audio
  A = api("audio");
  A.fly("amp", 0.3, 1.7).fly("spk", 1.4, 2.8)
    .wire("a_lrc", 2.9, 4.2).wire("a_bclk", 3.05, 4.35).wire("a_din", 3.2, 4.5).wire("a_gnd", 3.35, 4.65).wire("a_vin", 3.5, 4.8).wire("s_p", 3.7, 4.9).wire("s_n", 3.85, 5.05)
    .solder(["a_lrc:a", "a_bclk:a", "a_din:a", "a_gnd:a", "a_vin:a", "a_lrc:b", "a_bclk:b", "a_din:b", "a_gnd:b", "a_vin:b", "s_p:a", "s_n:a", "s_p:b", "s_n:b"], 5.2, 0.32)
    .cam(1.0, [0.25, 1.05, 0.0], [-0.68, 0.3, -0.5]).cam(9.9, [0.0, 0.75, -1.25], [-0.68, 0.3, -0.72]);
  // 9 · touch strip
  A = api("touch");
  A.fly("padA", 0.4, 1.6, { tweezers: true, n: "1/3", label: { name: "Foil pad", code: "A · TOUCH1", n: "1/3" } })
    .fly("padB", 1.8, 3.0, { tweezers: true, label: { name: "Foil pad", code: "B · TOUCH2", n: "2/3" } })
    .fly("padC", 3.2, 4.4, { tweezers: true, label: { name: "Foil pad", code: "C · TOUCH4", n: "3/3" } })
    .wire("t_a", 4.6, 5.6).wire("t_b", 4.75, 5.75).wire("t_c", 4.9, 5.9)
    .solder(["t_a:a", "t_b:a", "t_c:a"], 6.1, 0.35).solder(["t_a:b", "t_b:b", "t_c:b"], 7.3, 0.42, "low heat")
    .label(0.5, 9.8, () => PR.ttp.obj.getWorldPosition(_v).add(_lo.set(0, 0.05, 0)), "TTP223 <code>alt · tap only</code>", "alt")
    .cam(1.0, [-1.75, 1.05, -0.25], [-0.75, 0.36, -0.62]).cam(9.9, [-1.42, 0.74, -0.8], [-0.76, 0.35, -0.68]);
  // 10 · button + LED
  A = api("io");
  A.fly("button", 0.4, 1.7).fly("led", 1.5, 2.9, { tweezers: true }).wire("b_io", 3.0, 4.1).wire("b_gnd", 3.15, 4.25).wire("l_io", 3.3, 4.4).wire("l_gnd", 3.45, 4.55)
    .solder(["b_io:a", "b_gnd:a", "l_io:a", "l_gnd:a", "b_io:b", "b_gnd:b", "l_io:b", "l_gnd:b"], 4.7, 0.38)
    .cam(1.0, [-1.55, 1.15, 0.65], [-0.8, 0.42, -0.3]).cam(7.9, [-1.3, 0.88, 0.3], [-0.8, 0.42, -0.3]);
  // 11 · hinge routing
  A = api("hinge");
  GUIDES.push(guideLine(WIRE_RT.p_sw.curve.getPoints(120), A.s0 + 0.4, A.s0 + 7.8, rig)); GUIDES[GUIDES.length - 1].lead = 2.6;
  A.label(1.0, 7.8, V(0.69, G.TY + 0.075, -0.05), "Service loop <code>L hinge</code>").label(1.0, 7.8, V(-0.69, G.TY + 0.075, -0.05), "Service loop <code>R hinge</code>")
    .label(1.4, 7.8, V(0, 0.48, -0.045), "Brow groove <code>BAT+ / BAT−</code>")
    .screw("hingeL", 3.4, 4.6).screw("hingeR", 5.6, 6.8)
    .cam(1.0, [1.5, 1.5, 1.75], [0, 0.4, -0.15]).cam(2.9, [1.45, 1.4, 1.65], [0, 0.4, -0.15]).cam(3.5, [1.3, 0.85, 0.55], [0.7, 0.38, -0.05]).cam(5.0, [1.25, 0.82, 0.5], [0.7, 0.38, -0.05])
    .cam(5.7, [-1.3, 0.85, 0.55], [-0.7, 0.38, -0.05]).cam(7.9, [-1.22, 0.8, 0.5], [-0.7, 0.38, -0.05]);
  // 12 · pods
  A = api("pods");
  A.fly("coverR", 0.4, 2.1).fly("coverL", 1.6, 3.3).screw("cR1", 3.8, 4.8).screw("cR2", 5.0, 6.0).screw("cL1", 6.6, 7.4).screw("cL2", 7.7, 8.5)
    .cam(1.0, [-2.3, 1.7, 1.2], [0, 0.35, -0.5]).cam(3.3, [-2.25, 1.65, 1.15], [0, 0.35, -0.5]).cam(3.9, [-1.5, 1.05, 0.25], [-0.82, 0.42, -0.33]).cam(6.0, [-1.45, 1.0, 0.2], [-0.82, 0.42, -0.33])
    .cam(6.6, [1.65, 1.05, -0.45], [0.79, 0.38, -0.8]).cam(8.9, [1.55, 0.98, -0.5], [0.79, 0.38, -0.8]);
  // 13 · charging port
  A = api("charge");
  A.fly("plug", 0.6, 2.2, { label: { name: "USB-C", code: "5 V in", n: "" }, lift: 0.25, reach: 0.25 })
    .label(2.6, 6.9, V(-0.77, G.TY + 0.10, -0.48), "Charge LED <code>flashing = charging</code>", "joint")
    .cam(1.0, [-1.55, 0.95, -1.55], [-0.77, 0.36, -0.47]).cam(6.9, [-1.25, 0.78, -1.25], [-0.77, 0.36, -0.5]);
  // 14 · flash firmware
  A = api("flash");
  addFlight(PR.plug, A.s0 + 9.1, A.s0 + 9.9, PR.plug.fin, PR.plug.mat, { approach: [0, 1, 0], lift: 0.25, reach: 0.25, snap: false });
  A.label(1.8, 8.4, () => laptop.localToWorld(_v.set(0, 0.42, -0.2)), "Arduino IDE 2 <code>XIAO_ESP32S3 · OPI PSRAM</code>")
    .label(8.4, 9.9, V(-0.40, 0.40, 0.18), "HUD <code>EDITH online</code>", "alt")
    .cam(1.0, [-1.0, 2.3, 1.45], [-1.2, 0.3, -0.95]).cam(7.8, [-0.85, 2.05, 1.25], [-1.15, 0.3, -0.9]).cam(8.6, [-1.0, 0.75, 1.1], [-0.45, 0.45, 0.1]).cam(9.9, [-0.85, 0.7, 0.95], [-0.42, 0.44, 0.08]);
  // 15 · lenses
  A = api("lenses");
  A.fly("lensR", 0.5, 2.0).fly("lensL", 1.6, 3.1)
    .label(4.0, 8.6, V(0.36, 0.30, 0.02), "Photochromic <code>UV → darker</code>", "alt")
    .cam(1.0, [0.7, 1.0, 2.1], [0, 0.24, 0]).cam(8.9, [-0.5, 0.8, 1.8], [0, 0.24, 0]);
  // 16 · finale
  A = api("done");
  A.cam(1.2, [1.95, 1.25, 2.45], [0, 0.62, -0.62]).cam(9.0, [1.55, 1.05, 2.05], [0, 0.65, -0.62]).cam(13.9, [2.5, 1.65, 3.1], [0, 0.72, -0.8]);
})();
CAMKEYS.sort((a, b) => a.t - b.t);
// per-step joint numbering (k/n) across multiple solder() calls
STEPS.forEach(s => { const js = JOINTS.filter(j => j.step === s.id).sort((a, b) => a.t - b.t); js.forEach((j, i) => { j.k = i + 1; j.n = js.length; j.gap = i ? j.t - js[i - 1].t : 1.2; }); });

/* joint visuals: blob + pulsing ring */
const blobGeo = new THREE.SphereGeometry(0.0085, 10, 8), blobMat = M("#d9dde2");
const ringTex = canvasTex(64, 64, (g) => { g.strokeStyle = "#fff"; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke(); });
JOINTS.forEach(j => {
  j.blob = mesh(blobGeo, blobMat, false); j.blob.position.copy(j.pos); j.blob.visible = false; if (j.kind === "tin") j.blob.scale.set(0.6, 0.6, 0.6); rig.add(j.blob);
  j.ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: 0xffb547, transparent: true, depthWrite: false, depthTest: false })); j.ring.position.copy(j.pos); j.ring.visible = false; noOL(j.ring); rig.add(j.ring);
  const x = j.pos.x; const n = x < -0.74 ? V(-1, 0.45, 0.1) : x < -0.55 ? V(1, 0.5, 0.15) : x > 0.6 ? V(1, 0.5, 0.1) : V(-0.2, 1, 0.35);
  j.q = new THREE.Quaternion().setFromUnitVectors(UP, n.normalize());
});
/* iron keys from joints */
STEPS.forEach(s => {
  const js = JOINTS.filter(j => j.step === s.id).sort((a, b) => a.t - b.t);
  js.forEach((j, i) => {
    const d = i + 1 < js.length ? js[i + 1].t - j.t : 0.6, dp = i ? j.t - js[i - 1].t : 0.6;
    const hover = j.pos.clone().addScaledVector(V(0, 1, 0).applyQuaternion(j.q), 0.07);
    ironKeys.push({ t: j.t - Math.min(0.16, dp * 0.45), p: hover, q: j.q, touch: 0 });
    ironKeys.push({ t: j.t - 0.03, p: j.pos.clone(), q: j.q, touch: 1 });
    ironKeys.push({ t: j.t + Math.min(0.1, d * 0.25), p: j.pos.clone(), q: j.q, touch: 1 });
    ironKeys.push({ t: j.t + Math.min(0.18, d * 0.5), p: hover.clone(), q: j.q, touch: 0 });
  });
});
const IRON_REST = { p: V(1.47, MAT_TOP + 0.075, 0.95), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -1.42)) };
const DRIVER_REST = { p: V(-1.58, MAT_TOP + 0.03, 0.92), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, Math.PI / 2)) };
const TWEEZ_REST = { p: V(-1.15, MAT_TOP + 0.01, 0.98), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3, Math.PI / 2)) };
const DRIVER_Q = new THREE.Quaternion(), TWEEZ_Q = new THREE.Quaternion().setFromUnitVectors(UP, V(0.25, 1, 0.3).normalize());
function finalizeTrack(keys, rest, defQ, gap = 1.3) {
  keys.sort((a, b) => a.t - b.t);
  const out = []; let prev = null;
  const R = t => ({ t, p: rest.p, q: rest.q, rest: true, spin: prev ? prev.spin || 0 : 0, open: 0, touch: 0 });
  keys.forEach(k => { if (!k.q) k.q = defQ; if (!prev || k.t - prev.t > gap) { if (prev) out.push(R(prev.t + 0.6)); out.push(R(k.t - 0.6)); } out.push(k); prev = k; });
  if (prev) out.push(R(prev.t + 0.6));
  return out;
}
const IRON_T = finalizeTrack(ironKeys, IRON_REST, IRON_REST.q, 1.4);
const DRIVER_T = finalizeTrack(driverKeys, DRIVER_REST, DRIVER_Q, 1.4);
const TWEEZ_T = finalizeTrack(tweezKeys, TWEEZ_REST, TWEEZ_Q, 1.0);
const _q = new THREE.Quaternion();
function trackAt(T, t, out) {
  if (!T.length || t <= T[0].t) { const k = T[0]; out.p.copy(k ? k.p : V(0, -5, 0)); out.q.copy(k ? k.q : _q.identity()); out.spin = 0; out.open = 0; out.touch = 0; out.rest = true; return out; }
  let i = 0; while (i < T.length - 1 && T[i + 1].t <= t) i++;
  const a = T[i], b = T[Math.min(i + 1, T.length - 1)];
  if (a === b || t >= b.t) { out.p.copy(a.p); out.q.copy(a.q); out.spin = a.spin || 0; out.open = a.open || 0; out.touch = a.touch || 0; out.rest = !!a.rest; return out; }
  const u = (t - a.t) / (b.t - a.t), e = b.lin ? u : easeIO2(u);
  out.p.copy(a.p).lerp(b.p, e); out.q.copy(a.q).slerp(b.q, e);
  out.spin = (a.spin || 0) + ((b.spin || 0) - (a.spin || 0)) * e; out.open = (a.open || 0) + ((b.open || 0) - (a.open || 0)) * e; out.touch = Math.min(a.touch || 0, b.touch || 0); out.rest = a.rest && b.rest;
  return out;
}

/* counters + hardware inventory */
const HW_EVENTS = [];
JOINTS.forEach(j => { if (j.kind !== "tin") HW_EVENTS.push({ t: j.t, cat: "Solder joints" }); });
["padA", "padB", "padC"].forEach(id => HW_EVENTS.push({ t: PR[id].flights[0].t1, cat: "Foil pads" }));
SCREW_RT.forEach(s => HW_EVENTS.push({ t: s.t1, cat: "Screws" }));
Object.values(WIRE_RT).forEach(w => HW_EVENTS.push({ t: w.t1, cat: "Wires" }));
const HW_CATS = ["Solder joints", "Wires", "Foil pads", "Screws"];
const HW_TOTAL = HW_EVENTS.length;
const PIECE_T = PIECE_IDS.map(id => PR[id].flights[0].t1);
function counts(t) {
  const hw = HW_EVENTS.filter(e => e.t <= t).length;
  const pc = PIECE_T.filter(x => x <= t).length;
  const si = FLAT.stepAt(t), s = STEPS[si];
  const js = JOINTS.filter(j => j.step === s.id); const dj = js.filter(j => j.t <= t).length;
  let prog = "";
  if (js.length) prog = js[0].kind === "tin" ? `<b>${dj}</b> of ${js.length} pads tinned` : `<b>${dj}</b> of ${js.length} joints`;
  const sc = SCREW_RT.filter(x => x.step === s.id); if (sc.length) prog += (prog ? " · " : "") + `<b>${sc.filter(x => x.t1 <= t).length}</b> of ${sc.length} screws`;
  if (s.id === "touch") prog = `<b>${["padA", "padB", "padC"].filter(id => PR[id].flights[0].t1 <= t).length}</b> of 3 foil pads · ` + prog;
  if (s.id === "flash") { const p = clamp01((t - S0("flash") - 2) / 6); prog = p >= 1 ? "<b>Done uploading</b>" : `Uploading <b>${Math.round(p * 100)}%</b>`; }
  return { hw, hwT: HW_TOTAL, pc, pcT: PIECE_IDS.length, prog };
}
function hwRows(t) { return HW_CATS.map(c => { const all = HW_EVENTS.filter(e => e.cat === c); return [c, all.filter(e => e.t <= t).length, all.length]; }).concat([["Pieces", PIECE_T.filter(x => x <= t).length, PIECE_IDS.length]]); }
