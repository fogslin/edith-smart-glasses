#!/usr/bin/env python3
"""Regenerates ../build-guide.html (the classic long-form guide) from the templates + source files.
Run after editing any firmware/backend/prompt file:  python3 tools/build_guide.py"""
import html
import re
from pathlib import Path

T = Path(__file__).resolve().parent
ROOT = T.parent

SNIPPETS = {
    "touch-snippet": ("touch gesture engine (excerpt of edith_glasses.ino)", None),
    "notify-example": ("push a notification to the HUD", '''curl -X POST http://<backend-ip>:8000/api/v1/notify \\
  -H "X-Device-Token: change-me-device-token" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Mom: dinner at 7"}\''''),
}


def touch_excerpt() -> str:
    src = (ROOT / "firmware/edith_glasses/edith_glasses.ino").read_text()
    a = src.index("// ---------------- capacitive touch strip")
    b = src.index("// ---------------- helpers")
    c = src.index("void applyGesture")
    d = src.index("// Stream a 16 kHz")
    return src[a:b].rstrip() + "\n\n" + src[c:d].rstrip() + "\n"


def codeblock(title: str, text: str) -> str:
    long = text.count("\n") > 40
    return (f'<div class="codeblock{" collapsed" if long else ""}"><div class="cb-head"><span>{html.escape(title)}</span><span>'
            + (f'<button class="btn sm expand">⤢ Expand</button> ' if long else "")
            + f'<button class="btn sm copy">⧉ Copy</button></span></div><pre><code>{html.escape(text)}</code></pre></div>')


def slot(m: re.Match) -> str:
    key = m.group(1)
    if key in SNIPPETS:
        title, text = SNIPPETS[key]
        return codeblock(title, touch_excerpt() if text is None else text)
    return codeblock(key, (ROOT / key).read_text())


def main():
    head = (T / "template_head.html").read_text()
    body = (T / "template_body.html").read_text()
    body = re.sub(r'<div class="code-slot" data-file="([^"]+)"></div>', slot, body)
    ui = (T / "app_ui.js").read_text()
    three = (T / "app_3d.js").read_text()
    watchdog = """
setTimeout(function () {
  if (!window.EDITH3D) {
    var l = document.getElementById("loading");
    if (l) l.innerHTML = "The 3D viewer couldn't load (no internet access to unpkg.com, or WebGL/ES modules are blocked).<br>Everything else in this guide still works.";
  }
}, 9000);
"""
    out = (head + body + "<script>\n" + ui + "\n" + watchdog + "</script>\n"
           + '<script type="module">\n' + three + "\n</script>\n</body>\n</html>\n")
    assert "</script" not in ui.replace("</script>", "") and "</script" not in three
    for name in ("build-guide.html",):
        (ROOT / name).write_text(out, encoding="utf-8")
    print("wrote", len(out), "bytes")


if __name__ == "__main__":
    main()
