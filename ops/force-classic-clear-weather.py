#!/usr/bin/env python3
"""Persistently disable rain and all visibility-reducing weather in Classic browser client.
Run after regenerating the web site; no character or server data is changed.
"""
from pathlib import Path
from datetime import datetime
import hashlib
import re
import shutil
import sys

site = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"C:\VelluM\integration-priston")
settings = site / "settings.js"
index = site / "index.html"
if not settings.exists() or not index.exists():
    raise SystemExit("Missing settings.js or index.html")
source = settings.read_text(encoding="utf8")
pattern = r"weather:\s*s\.wxOwn\s*\?\s*1\s*\+\s*\(s\.wxKind\|0\)\s*:\s*0\s*,\s*lang:\s*7"
if re.search(pattern, source):
    updated = re.sub(pattern, "weather: 1, lang: 7", source, count=1)
elif "weather: 1, lang: 7" in source:
    updated = source
else:
    raise SystemExit("Unexpected weather field: no files modified")
page = index.read_text(encoding="utf8")
script_pattern = r"settings\.js\?v=[^\"']+"
if not re.search(script_pattern, page):
    raise SystemExit("Missing cache-busted settings script: no files modified")
version = hashlib.sha256(updated.encode()).hexdigest()[:12]
page_updated = re.sub(script_pattern, "settings.js?v=" + version, page, count=1)
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
for target in (settings, index):
    shutil.copy2(target, target.with_name(target.name + ".before-clear-weather-" + stamp + ".bak"))
settings.write_text(updated, encoding="utf8")
index.write_text(page_updated, encoding="utf8")
print("Clima limpo fixado: clima 1 = PTWX_CLEAR, idioma 7 = PT-BR; version", version)
