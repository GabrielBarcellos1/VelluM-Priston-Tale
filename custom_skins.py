"""Canonical authored cosmetic catalogue; all prices remain administrator-editable."""
import json
from pathlib import Path
from functools import lru_cache

@lru_cache(maxsize=1)
def catalog():return json.loads((Path(__file__).parent/'data/custom-skins.json').read_text(encoding='utf8'))['skins']

def icon(skin_id):
    skin=next((s for s in catalog() if s['id']==skin_id),None)
    if not skin:return None
    kind=skin['customModel'];gold='#e9b65d';blue='#079de1'
    shapes={'scythe':'M49 14 Q97 2 113 81 Q96 42 49 30Z','axe':'M49 18 Q14 6 20 47 L49 34 Q82 55 93 12Z','hammer':'M20 13H94V36H20Z','bow':'M49 9 Q88 40 49 111 Q67 70 49 61 Q26 40 49 9Z','sword':'M50 9 39 68 50 80 61 68Z','dagger':'M50 25 36 69 50 79 64 69Z','javelin':'M50 6 39 37 50 46 61 37Z','claw':'M35 66 30 15 44 56 50 7 55 56 70 15 64 72Z','vambrace':'M28 80 24 35 39 17 47 45 56 12 65 43 78 28 73 80Z','wand':'M50 8 36 32 50 48 64 32Z','staff':'M50 6 33 28 50 46 67 28Z','phantom':'M50 15 19 49 41 45 34 76 63 76 57 45 82 49Z'}
    shape=shapes.get(kind,shapes['sword'])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="160" height="180" viewBox="0 0 120 130"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="#25d9ff"/><stop offset=".5" stop-color="#064578"/><stop offset="1" stop-color="#0d172c"/></linearGradient></defs><rect width="120" height="130" rx="10" fill="#0d1b26"/><g transform="rotate(-15 55 65)"><path d="M50 23V118" stroke="{gold}" stroke-width="6"/><path d="M50 23V118" stroke="#09324a" stroke-width="3"/><path d="{shape}" fill="url(#b)" stroke="{gold}" stroke-width="2"/><path d="M50 13 44 25 50 34 56 25Z" fill="{blue}" stroke="#91edff"/><ellipse cx="50" cy="54" rx="8" ry="10" fill="#cfc5ab"/><path d="M45 52H48V56H44ZM52 52H56V56H52ZM48 60H52" fill="#071117"/><circle cx="50" cy="103" r="4" fill="{blue}" stroke="{gold}"/></g></svg>'''.encode()
