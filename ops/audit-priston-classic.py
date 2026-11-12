#!/usr/bin/env python3
"""Read-only local Priston Classic production audit.

Run on the authorized Windows server:
    python ops/audit-priston-classic.py
Never writes to the game directories, changes accounts, or restarts services.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import urllib.request

ROOT = Path(r"C:\inetpub\priston\[project]")
SITE = Path(r"C:\VelluM\integration-priston")
SOURCE = ROOT / "src"
SERVER = ROOT / "dist" / "server"
RESULTS: list[dict[str, object]] = []


def check(key: str, condition: bool, detail: str = "", critical: bool = True) -> None:
    RESULTS.append({"check": key, "ok": bool(condition), "detail": detail, "critical": critical})


def sha256(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


def verify_port(port: int) -> bool:
    import socket
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=2):
            return True
    except OSError:
        return False


def verify_http(url: str) -> tuple[bool, str]:
    try:
        req = urllib.request.Request(url, method="GET", headers={"User-Agent": "PristonClassicAudit/1.0"})
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.status == 200, f"HTTP {response.status}"
    except Exception as exc:
        return False, str(exc)


def main() -> int:
    active = SERVER / "server.exe"
    build = SOURCE / "bin" / "ReleaseGL" / "server.exe"
    wasm = SITE / "game.wasm"
    wasm_build = SOURCE / "web" / "out" / "game.wasm"
    check("Native executable matches compiled version",
          active.is_file() and build.is_file() and sha256(active) == sha256(build))
    check("WebAssembly matches compiled version",
          wasm.is_file() and wasm_build.is_file() and sha256(wasm) == sha256(wasm_build))
    check("Classic server port 10007", verify_port(10007))
    check("Old VelluM port 19065", verify_port(19065))
    data = SERVER / "DataServer"
    check("Character data preserved", any(data.glob("userdata/**/*.dat")))
    check("User accounts preserved", any(data.glob("userinfo/**/*.dat")))
    backups = Path(r"C:\VelluM\backups")
    check("Recovery backup exists", any(backups.glob("classic-admin-authfix-*")))
    cmd_source = (SOURCE / "SrcServer" / "OnSever.cpp").read_bytes()
    commands = [b"/adm", b"/equipar", b"/habilidades", b"/mapa", b"/field",
                b"/premium", b"/salvar", b"/monstro", b"/meumonstro",
                b"/nivel", b"/ouro", b"/item", b"/ir", b"/trazer",
                b"/invencivel", b"/comandos"]
    missing = [x.decode() for x in commands if x not in cmd_source]
    check("Native GM command coverage", not missing, f"missing: {missing}")
    check("GM authorization tied to account ID",
          b'lstrcmpi(lpPlayInfo->szID,"ADM")' in cmd_source
          and b'lstrcmpi(lpPlayInfo->szID,"admin")' in cmd_source)
    check("Boss loadout exact IDs",
          all(x in cmd_source for x in (b"sinOR2|sin05", b"sinOA1|sin30", b"sinOS1|sin07")))
    check("Client save retry", b"SetSaveSoon(3000)" in (SOURCE / "netplay.cpp").read_bytes())
    check("Tier 2-4 indicators",
          b"vellumTierBadge" in (SOURCE / "character.cpp").read_bytes(), critical=False)
    css = (SITE / "fullscreen.css").read_text("utf-8", errors="replace")
    check("Horizontal full-browser display",
          "100vw!important" in css and "100dvh!important" in css)
    check("HD permanent", "contrast(1.075)" in css and "saturate(1.105)" in css)
    check("Developer toolbar hidden",
          "#bar" in css and "display:none!important" in css)
    settings = (SITE / "settings.js").read_text("utf-8", errors="replace")
    check("Brazilian Portuguese code 7", "lang: 7" in settings)
    index = (SITE / "index.html").read_text("utf-8", errors="replace")
    check("Browser asset cache busting",
          bool(re.search(r"game\.js\?v=[0-9a-f]+", index))
          and bool(re.search(r"fullscreen\.css\?v=[0-9a-f]+", index)))
    for label, url in [
        ("Public game page", "https://acesso.gbtechnology.com.br/priston-classic/"),
        ("Public Guacamole", "https://acesso.gbtechnology.com.br/guacamole/"),
        ("Old VelluM page", "https://acesso.gbtechnology.com.br/priston/"),
    ]:
        okay, description = verify_http(url)
        check(label, okay, description)
    # Public-launch security gates (do not print or inspect password values).
    config_text = (SERVER / "server.ini").read_text("latin-1", errors="replace")
    flags = [line.strip().split()[0].upper() for line in config_text.splitlines()
             if line.strip().startswith("*")]
    check("Public users must enter password", "*OFFLINE_PASSWORDS" in flags)
    check("Global GM cheat test mode disabled", "*GM_CHEATS" not in flags)
    check("Shared secret admin command disabled", "*ADMIN_COMMAND" not in flags)
    check("Staff accounts have existing password records",
          all((data / "password" / (name + ".pw")).is_file()
              for name in ("adm", "admin")))
    check("Account record format recognized",
          all(p.stat().st_size in (16, 100)
              for p in (data / "password").glob("*.pw")), critical=False)
    check("Strong password upgrade built",
          b"BCryptDeriveKeyPBKDF2" in cmd_source
          and b"PasswordRecordCreate" in cmd_source)
    check("Staff names are reserved against new registration",
          b"lstrcmpi(szID,\"adm\")==0" in cmd_source
          and b"lstrcmpi(szID,\"admin\")==0" in cmd_source)
    bridge_config = (SITE / "web.config").read_text("utf-8", errors="replace")
    bridge_code = (SITE / "ws.ashx").read_text("utf-8", errors="replace")
    check("WebSocket bridge port whitelist limited to Classic",
          'key="PristonGamePorts" value="10007"' in bridge_config
          and "PortAllowed( port )" in bridge_code)
    check("Account database not under public site directory",
          not (SITE / "DataServer").exists())
    local_snapshots = sorted((p for p in backups.glob("scheduled-classic-*")
                              if p.is_dir()), reverse=True)
    check("Scheduled character snapshot exists",
          bool(local_snapshots) and (local_snapshots[0] / "manifest.json").is_file())
    if local_snapshots:
        manifest = json.loads((local_snapshots[0] / "manifest.json").read_text("utf-8"))
        passed = not manifest["errors"] and all(
            (local_snapshots[0] / rel).is_file()
            and sha256(local_snapshots[0] / rel) == item["sha256"]
            for rel, item in manifest["files"].items()
        )
        check("Latest backup manifest hashes verify", passed,
              f"{len(manifest['files'])} files; {len(manifest['errors'])} errors")
    check("Initial concurrency cap above historical 10",
          any(line.startswith("*MAX_USERS") and int(line.split()[-1]) >= 20
              for line in config_text.splitlines() if line.strip().startswith("*MAX_USERS")),
          critical=False)
    for row in RESULTS:
        print(("PASS" if row["ok"] else "FAIL"), row["check"], row["detail"])
    fail = [r for r in RESULTS if not r["ok"] and r["critical"]]
    print("SUMMARY", json.dumps({"total": len(RESULTS), "passed": len(RESULTS) - len([r for r in RESULTS if not r["ok"]]), "critical_failed": len(fail)}))
    print("NOTE: This is a read-only infrastructure/source smoke audit, NOT a real-login or item/quest persistence test.")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
