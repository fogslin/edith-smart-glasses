#!/usr/bin/env python3
"""Builds ../bluetooth.html: the HYPOTHETICAL "EDITH + Bluetooth audio" variant of the animated 3D guide.
Reuses tools/flat/* (unchanged) and layers tools/flat_bt/* on top with asserted text patches.
index.html and build-guide.html are NOT touched.   Run:  python3 tools/build_bt.py"""
import re
from pathlib import Path
import build_guide as classic
import build_site as site

T = Path(__file__).resolve().parent
FL, BT, ROOT = T / "flat", T / "flat_bt", T.parent
SKETCH = ROOT / "firmware/edith_glasses_bt/edith_glasses_bt.ino"


def sub(text, old, new, label):
    n = text.count(old)
    assert n == 1, f"patch '{label}': expected 1 match, found {n}"
    return text.replace(old, new)


def bt_snippet():
    src = SKETCH.read_text()
    a = src.index("// ---------------- Bluetooth audio module (variant)"); b = src.index("// ---------------- globals")
    c = src.index("// ---------------- Bluetooth module control (variant)"); d = src.index("\n}\n", src.index("void applyGesture")) + 3
    e = src.index("  btBegin();"); f = src.index("#endif", e) + len("#endif")
    g = src.index("      if (held >= 3000)"); h = src.index("\n", g)
    pin = "\n".join(l for l in src.splitlines() if "D9  / GPIO8" in l or ("BAT54" in l and l.lstrip().startswith("*")) or "10 k" in l and l.lstrip().startswith("*"))
    return ("// pin map (header comment)\n" + pin + "\n\n" + src[a:b].rstrip() + "\n\n// touch: new long-press gesture (pollTouch)\n"
            + "\n".join(l for l in src.splitlines() if "G_HOLD" in l) + "\n\n" + src[c:d].rstrip()
            + "\n\n// setup()\n" + src[e:f] + "\n\n// loop(): hold the button 3 s = pairing\n" + src[g:h].strip() + "\n")


def main():
    css, docs_html = site.docs_parts()
    bt_docs = (BT / "docs_bt.html").read_text()
    bt_docs = bt_docs.replace("__BT_SNIPPET__", classic.codeblock("Bluetooth changes (excerpt of edith_glasses_bt.ino)", bt_snippet()))
    bt_docs = bt_docs.replace("__BT_SKETCH__", classic.codeblock("firmware/edith_glasses_bt/edith_glasses_bt.ino", SKETCH.read_text()))
    docs_html = site.beginner_html(True) + "\n" + bt_docs + "\n" + docs_html

    head = (FL / "head.html").read_text().replace("__DOCS_CSS__", css)
    head = sub(head, "<title>EDITH — step-by-step 3D build of DIY AI smart glasses</title>",
               "<title>EDITH + Bluetooth audio (hypothetical variant): 3D build of DIY AI smart glasses</title>", "title")
    head = re.sub(r'<meta name="description" content="[^"]*">',
                  '<meta name="description" content="Hypothetical variant of the EDITH DIY smart glasses: adds a BK3266 classic-Bluetooth module for phone calls (HFP) and music (A2DP), with an animated 3D build, wiring, firmware and a full feature list.">', head, count=1)
    head = sub(head, "</style>\n<style id=\"docs-css\">", (BT / "bt.css").read_text() + "</style>\n<style id=\"docs-css\">", "css")

    body = (FL / "body.html").read_text().replace("__DOCS_HTML__", docs_html)
    body = sub(body, '<div class="kicker">STEP BY STEP</div>', '<div class="kicker">STEP BY STEP · VARIANT</div>', "kicker")
    body = sub(body, '<h1 class="brand">EDITH</h1>', '<h1 class="brand">EDITH <span class="bt-plus">+ Bluetooth audio</span></h1>', "brand")
    body = re.sub(r'<p class="intro">.*?</p>',
                  '<p class="intro">EDITH + a classic-BT module: calls &amp; music in the left ear, Edith on Wi-Fi in the right. '
                  '<a class="bt-link" href="#" data-doc-open="bt-features">All features →</a></p>', body, count=1, flags=re.S)
    body = sub(body, '<i id="ui-cStepT">/16</i>', '<i id="ui-cStepT">/22</i>', "steps")
    body = sub(body, 'aria-label="Animated 3D assembly of the EDITH smart glasses"', 'aria-label="Animated 3D assembly of the EDITH + Bluetooth audio smart glasses (hypothetical variant)"', "aria")
    body = sub(body, '<button class="on" data-piece="glasses">EDITH glasses</button>', '<button class="on" data-piece="glasses">EDITH + BT</button>', "piece")
    body = sub(body, '<small>EDITH · ASSEMBLY MANUAL</small>', '<small>EDITH + BLUETOOTH · HYPOTHETICAL VARIANT</small>', "mvhead")
    body = sub(body, '<div class="grp">Start</div>', '<div class="grp">Bluetooth variant</div><a href="#bt-variant">Module &amp; wiring</a><a href="#bt-features">Everything it can do</a><a href="#bt-pair">Pairing &amp; use</a><a href="#bt-firmware">BT firmware</a>\n      <div class="grp">Start</div>', "nav")
    body = sub(body, '<div class="grp">Files</div>', '<div class="grp">Files</div><a href="index.html" onclick="location.href=\'index.html\';return false">Original 3D guide</a>', "navfiles")
    body = sub(body, '<div id="ui-noGL" hidden></div>', '<div id="ui-noGL" hidden></div>\n<div class="bt-banner">HYPOTHETICAL VARIANT · not built or tested · <a href="index.html">original guide</a></div>', "banner")

    js = {f: (FL / f).read_text() for f in site.CLASSIC_FILES}
    m = js["manual.js"]
    m = sub(m, "Rb: [-1.0, 0.7, -0.55] };", "Rb: [-1.0, 0.7, -0.55], L: [1.0, 0.62, 0.42], Lb: [1.0, 0.7, -0.55] };", "views")
    m = sub(m, '      default: return "";', (BT / "bt_callouts.js").read_text().rstrip() + '\n      default: return "";', "callouts")
    m = sub(m, '    if (id === "spk") return', '    if (id === "spk2") return cylFaces(p.c, p.r, p.h, "x", st);\n    if (id === "mic") return cylFaces(p.c, 0.022, 0.014, "y", st, 10);\n    if (id === "spk") return', "faces")
    u = js["ui.js"]
    u = sub(u, '{ title: "Parts list", key: "bom" },', '{ title: "Everything it can do", key: "features" }, { title: "Pairing & use", key: "pair" }, { title: "Parts list", key: "bom" },', "appx")
    u = sub(u, '    if (a.key === "bom" && D)', '    if (a.key === "features" && window.BT_PAGES) return window.BT_PAGES.features();\n    if (a.key === "pair" && window.BT_PAGES) return window.BT_PAGES.pair();\n    if (a.key === "bom" && D)', "pages")
    u = sub(u, "<h2>DIY AI smart glasses — assembly manual</h2>", "<h2>EDITH + Bluetooth audio: assembly manual (hypothetical variant)</h2>", "cover")
    u = sub(u, "MAX98357A · copper-foil touch strip · Rx / photochromic lenses.</p>", "MAX98357A · copper-foil touch strip · Rx / photochromic lenses · <b>+ BK3266 classic-BT module · PAM8302 · call mic · second bone transducer</b>.</p>", "coverparts")
    u = sub(u, "(checked 2026-10-22/23)", "(checked 2026-10-22/23; ★ BT parts 2026-10-24)", "checked")
    u = sub(u, '["overview", "Overview & features"],', '["bt-variant", "★ Bluetooth module & wiring"], ["bt-features", "★ Everything it can do"], ["bt-pair", "★ Pairing & use"], ["bt-firmware", "★ BT firmware"], ["overview", "Overview & features"],', "links")
    classic_js = "\n".join([js["geo.js"], (BT / "bt_geo.js").read_text(), js["steps.js"], (BT / "bt_steps.js").read_text(),
                            m, js["docs.js"], (BT / "bt_docs.js").read_text(), js["beginner.js"], u])

    mods = {p.name: p.read_text() for p in sorted((FL / "3d").glob("s*.js"))}
    s3 = mods["s3_models.js"]
    s3 = sub(s3, '"edith_glasses.ino — Arduino IDE 2"', '"edith_glasses_bt.ino — Arduino IDE 2"', "laptop title")
    s3 = sub(s3, '"#define PIN_SDA 5      // D4"', '"#define PIN_BT_CTRL 8  // D9"', "laptop line")
    s4 = mods["s4_plan.js"]
    s4 = sub(s4, "})();\nCAMKEYS.sort((a, b) => a.t - b.t);", "})();\nBT_PLAN();\nCAMKEYS.sort((a, b) => a.t - b.t);", "plan hook")
    s4 = sub(s4, "x < -0.55 ? V(1, 0.5, 0.15) : x > 0.6 ? V(1, 0.5, 0.1) :",
             "x < -0.55 ? V(1, 0.5, 0.15) : x > 0.742 ? V(1, 0.5, 0.1) : x > 0.6 ? (j.pos.y < 0.30 ? V(0.8, 0.1, 0.8) : V(-1, 0.5, 0.15)) :", "joint normals")
    s5 = mods["s5_loop.js"]
    s5 = sub(s5, "  if (hudOn) { const bpm", "  if (hudOn && !BT_HUD(t)) { const bpm", "hud hook")
    s5 = sub(s5, "  // labels\n", "  BT_FX(t, dt);\n  // labels\n", "fx hook")
    s5 = sub(s5, 'version: "flat-1"', 'version: "flat-1-bt"', "version")
    module_js = "\n".join([mods["s1_setup.js"], mods["s2_room.js"], s3, (BT / "3d/bt_models.js").read_text(), s4, (BT / "3d/bt_plan.js").read_text(), s5])
    watchdog = """
setTimeout(function () {
  if (!window.EDITH3D) {
    var l = document.getElementById("ui-loading"); if (l) l.remove();
    var n = document.getElementById("ui-noGL");
    if (n && n.hidden) { n.hidden = false; n.innerHTML = "The 3D room couldn't load (no access to unpkg.com for Three.js, or WebGL is blocked). The step cards, manual and Docs &amp; code still work."; }
  }
}, 12000);
"""
    for x in (classic_js, module_js):
        assert "</script" not in x
    out = (head + body + "\n<script>\n" + classic_js + watchdog + "</script>\n"
           + '<script type="module">\n' + module_js + "\n</script>\n</body>\n</html>\n")
    (ROOT / "bluetooth.html").write_text(out, encoding="utf-8")
    print("wrote bluetooth.html", len(out), "bytes")


if __name__ == "__main__":
    main()
