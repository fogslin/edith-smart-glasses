#!/usr/bin/env python3
"""Builds ../index.html — the animated IKEA-style 3D build (EDITH flat-pack guide).
Inputs: tools/flat/*.html|*.js, tools/flat/3d/s*.js, and the long-form docs content from
tools/template_body.html + tools/template_head.html (CSS is scoped under #docs).
Run:  python3 tools/build_site.py   (also run tools/build_guide.py for build-guide.html)"""
import re
from pathlib import Path
import build_guide as classic

T = Path(__file__).resolve().parent
FL = T / "flat"
ROOT = T.parent


def scope_css(css: str, pre: str = "#docs") -> str:
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        sel = css[i:j].strip()
        # find matching brace
        depth, k = 1, j + 1
        while depth and k < n:
            if css[k] == "{": depth += 1
            elif css[k] == "}": depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        if sel.startswith("@media"):
            out.append(sel + "{" + scope_css(body, pre) + "}")
        elif sel.startswith("@keyframes") or sel.startswith("@font-face"):
            out.append(sel + "{" + body + "}")
        else:
            parts = []
            for s in sel.split(","):
                s = s.strip()
                if not s or s == "html":
                    continue
                if s in (":root", "body"):
                    parts.append(pre)
                elif s.startswith("body"):
                    parts.append(pre + s[4:])
                elif s == "*":
                    parts.append(pre + " *")
                else:
                    parts.append(pre + " " + s)
            if parts:
                out.append(",".join(parts) + "{" + body + "}")
        i = k
    return "\n".join(out)


def docs_parts():
    head = (T / "template_head.html").read_text()
    css = re.search(r"<style>(.*?)</style>", head, re.S).group(1)
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    scoped = scope_css(css)
    scoped += "\n#docs{background:#080c14;min-height:100%}#docs section{max-width:1000px}"
    body = (T / "template_body.html").read_text()
    a = body.index('<section id="overview">')
    b = body.index("</section>", a) + len("</section>")
    overview = body[a:b]
    c = body.index('<section id="parts">')
    d = body.index("<footer>")
    rest = body[c:d]
    html = overview + "\n" + rest
    html = re.sub(r'<div class="code-slot" data-file="([^"]+)"></div>', classic.slot, html)
    html = html.replace('href="#stepper"', 'href="#overview"')
    return scoped, html


def main():
    css, docs_html = docs_parts()
    head = (FL / "head.html").read_text().replace("__DOCS_CSS__", css)
    body = (FL / "body.html").read_text().replace("__DOCS_HTML__", docs_html)
    classic_js = "\n".join((FL / f).read_text() for f in ("geo.js", "steps.js", "manual.js", "docs.js", "ui.js"))
    module_js = "\n".join(p.read_text() for p in sorted((FL / "3d").glob("s*.js")))
    watchdog = """
setTimeout(function () {
  if (!window.EDITH3D) {
    var l = document.getElementById("ui-loading"); if (l) l.remove();
    var n = document.getElementById("ui-noGL");
    if (n && n.hidden) { n.hidden = false; n.innerHTML = "The 3D room couldn't load (no access to unpkg.com for Three.js, or WebGL is blocked). The step cards, manual and Docs &amp; code still work."; }
  }
}, 12000);
"""
    for js in (classic_js, module_js):
        assert "</script" not in js
    out = (head + body + "\n<script>\n" + classic_js + watchdog + "</script>\n"
           + '<script type="module">\n' + module_js + "\n</script>\n</body>\n</html>\n")
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print("wrote index.html", len(out), "bytes")


if __name__ == "__main__":
    main()
