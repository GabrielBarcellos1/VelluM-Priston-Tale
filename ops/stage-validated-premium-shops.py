from __future__ import annotations
"""Safe staging of the VelluM Classic Premium Shop NPCs.

No production files are modified. The premium package is NOT offered until
all nine timed benefits and a transactional redemption path are implemented.
"""
from pathlib import Path
import json
import re
import struct
import sys

ROOT = Path(r"C:\inetpub\priston\[project]\dist\server")
STAGE = Path(r"C:\VelluM\investigation\premium-shop-stage")
MAPS = (
    ("village-2.ase.spc", "ricarten", 8, 8, (0, 0)),
    ("pilai.ASE.spc", "pillai", 27, 1, (384, -512)),
)
# Only these six items have authentic, validated seven-day variants.
VERIFIED = [
    {"name": "Pocao de EXP +100%", "code": "BI144", "duration_days": 7},
    {"name": "Mana Down", "code": "BI129", "duration_days": 7},
    {"name": "Redutora de RES", "code": "BI192", "duration_days": 7},
    {"name": "MUT", "code": "BI168", "duration_days": 7},
    {"name": "Fenix", "code": "BI133", "duration_days": 7},
    {"name": "Third Eyes", "code": "BI114", "duration_days": 7},
]
MISSING = ["Super Vampiric Cuspid 7D", "Drena Almas 7D", "Gravity Stone 7D"]
DEST = STAGE / "GameServer"
(DEST / "Field").mkdir(parents=True, exist_ok=True)
(DEST / "NPC").mkdir(parents=True, exist_ok=True)
itemroot = ROOT / "GameServer" / "OpenItem"
for item in VERIFIED:
    filename = itemroot / (item["code"] + ".txt")
    if not filename.is_file():
        raise SystemExit(f"Missing registered item {filename}")
    data = filename.read_bytes().decode("cp949", errors="replace")
    name = re.search(r"^\*Name\s+\"([^\"]+)\"", data, re.MULTILINE)
    if not name:
        raise SystemExit(f"No English item name in {filename}")
    item["registered_name"] = name.group(1)

for mapname, city, template, location, offset in MAPS:
    original = (ROOT / "GameServer" / "Field" / mapname).read_bytes()
    if len(original) != 100 * 504:
        raise SystemExit(f"Unexpected NPC map record size {mapname}")
    data = bytearray(original)
    available = next((i for i in range(100) if not any(data[i*504:(i+1)*504])), None)
    if available is None:
        raise SystemExit(f"No empty NPC slot {mapname}")
    old = data[template*504:(template+1)*504]
    location_record = data[location*504:(location+1)*504]
    if b"GameServer\\npc\\" not in old:
        raise SystemExit("NPC template is not a normal NPC")
    record = bytearray(old)
    for start in (476, 480, 484, 492):
        record[start:start+4] = location_record[start:start+4]
    struct.pack_into("<i", record, 476, struct.unpack_from("<i", record, 476)[0] + offset[0])
    struct.pack_into("<i", record, 484, struct.unpack_from("<i", record, 484)[0] + offset[1])
    display = b"Premium Shop"
    record[8:40] = display + bytes(32-len(display))
    reference = f"GameServer\\npc\\premium-shop-{city}.npc".encode("ascii")
    if len(reference)>63:
        raise SystemExit("NPC definition path too long")
    record[104:168] = reference + bytes(64-len(reference))
    ids = [struct.unpack_from("<i", data, i*504+472)[0] for i in range(100)]
    struct.pack_into("<i", record, 472, max(ids)+1)
    data[available*504:(available+1)*504] = record
    out = DEST / "Field" / mapname
    out.write_bytes(data)
    assert data[:available*504] == original[:available*504]
    assert data[(available+1)*504:] == original[(available+1)*504:]
    npc = (
        '*속성\tNPC\n'
        '*모양파일\t"char\\npc\\Bcn03\\Bcn03.INI"\n'
        '*이름\t"Premium Shop"\n'
        '*Name\t"Premium Shop"\n'
        '*계급\t1001\n'
        '*무기판매\t없음\n'
        '*방어구판매\t없음\n'
        '*잡화판매\t' + ' '.join(x["code"] for x in VERIFIED) + '\n'
    )
    (DEST / "NPC" / f"premium-shop-{city}.npc").write_bytes(npc.encode("cp949"))
    print(f"STAGED {city}: NPC slot {available}, six verified seven-day items")

report = {
    "status": "STAGING_ONLY_DO_NOT_PUBLISH",
    "reason": "Three variants and actual 30-day kit redemption are not implemented; prices require approval",
    "verified_seven_day": VERIFIED,
    "not_yet_supported": MISSING,
    "kit_30_days": "NOT_CREATED",
    "production_modified": False,
}
(STAGE / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")
print("STOP: production unchanged, exact nine-item bundle unavailable")
