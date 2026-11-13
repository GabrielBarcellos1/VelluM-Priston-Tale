#!/usr/bin/env python3
"""Reapply the Classic cache-first loading UI after regenerating the public web site.

Usage on the Windows game host:
    python ops/install-classic-cache-ui.py C:\\VelluM\\integration-priston
Assets stay inside the same public origin; only game resources are cached.
No account data, passwords, saves, WebSocket traffic or player state is cached here.
"""
from __future__ import annotations
import hashlib
from pathlib import Path
import re
import shutil
import sys
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"C:\VelluM\integration-priston")
SOURCE = ROOT / "ops" / "priston-classic-progress.js"
TARGET = SITE / "progress.js"
INDEX = SITE / "index.html"
for path in (SOURCE, TARGET, INDEX, SITE / "sw.js", SITE / "prewarm.js", SITE / "prewarm-worker.js"):
    if not path.is_file():
        raise SystemExit(f"Missing required file: {path}")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
original = INDEX.read_text(encoding="utf-8")
# Verify the existing loader script can be found before touching any files.
pattern = r'<script\s+src=["\']progress\.js(?:\?[^"\']*)?["\']\s*></script>'
if not re.search(pattern, original):
    raise SystemExit("Could not locate progress.js loader; no changes made")
for path in (TARGET, INDEX):
    shutil.copy2(path, path.with_name(path.name + ".before-cache-ui-" + stamp + ".bak"))

data = SOURCE.read_bytes()
TARGET.write_bytes(data)
version = hashlib.sha256(data).hexdigest()[:12]
loader = f'<script src="progress.js?v={version}"></script>'
loader += f'<script src="prewarm.js?v={version}" defer></script>'
updated = re.sub(pattern + r'(?:\s*<script\s+src=["\']prewarm\.js(?:\?[^"\']*)?["\']\s+defer></script>)?', loader, original, count=1)
INDEX.write_text(updated, encoding="utf-8")
print(f"Installed cache-first loading UI and background packs: {SITE}, version={version}")
