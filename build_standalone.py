#!/usr/bin/env python3
"""Build a single self-contained tabata-standalone.html (no external files)."""
import base64, os, re

here = os.path.dirname(os.path.abspath(__file__))
css = open(os.path.join(here, "styles.css")).read()
js = open(os.path.join(here, "app.js")).read()
# service worker can't run from a single file / non-https; strip its registration
js = re.sub(r'if \("serviceWorker" in navigator\) \{.*?\n\}', "", js, flags=re.S)
icon = base64.b64encode(open(os.path.join(here, "icons/icon-180.png"), "rb").read()).decode()

html = open(os.path.join(here, "index.html")).read()
# strip external <link>/<script> refs and manifest; inline everything
html = html.replace('<link rel="manifest" href="manifest.webmanifest" />\n  ', "")
html = html.replace('<link rel="apple-touch-icon" href="icons/icon-180.png" />',
                    f'<link rel="apple-touch-icon" href="data:image/png;base64,{icon}" />')
html = html.replace('<link rel="icon" href="icons/icon-192.png" />\n  ', "")
html = html.replace('<link rel="stylesheet" href="styles.css" />',
                    f"<style>\n{css}\n</style>")
html = html.replace('<script src="app.js"></script>',
                    f"<script>\n{js}\n</script>")

out = os.path.join(here, "tabata-standalone.html")
open(out, "w").write(html)
print("wrote", out, "(%.1f KB)" % (len(html) / 1024))
