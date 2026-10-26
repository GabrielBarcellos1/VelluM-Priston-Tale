"""Classic client artwork and clearly identified FREEston placeholder illustrations."""
from functools import lru_cache
from pathlib import Path
import base64
import hashlib
import json

ART_PATH=Path(__file__).resolve().parent/'data/skill-art.json'


@lru_cache(maxsize=2)
def _classic_catalog(modified, size):
    return json.loads(ART_PATH.read_text(encoding='utf-8'))['images']


def classic(code, disabled=False):
    stat=ART_PATH.stat()
    item=_classic_catalog(stat.st_mtime_ns,stat.st_size).get(code)
    if not item:return None
    variant=item['disabled' if disabled else 'normal']
    data=base64.b64decode(variant['pngBase64'],validate=True)
    if not data.startswith(b'\x89PNG\r\n\x1a\n') or hashlib.sha256(data).hexdigest()!=variant['pngSha256']:
        raise ValueError('Arte clássica corrompida: '+code)
    return data

SHAPES = {
    'shield': '<path d="M19 15 32 10 45 15v16c0 10-13 20-13 20S19 41 19 31Z" fill="url(#metal)"/><path d="M32 16v27m-8-22 16 13" stroke="#182536" stroke-width="3"/>',
    'sword': '<path d="m40 10 7-1-1 8-21 24-5-5Z" fill="url(#metal)"/><path d="m17 32 14 13-4 4-14-13Z" fill="#d5a64f"/><path d="m19 41-9 10 4 4 10-10" fill="#9c6545"/><path d="m40 16-17 20" stroke="white"/>',
    'fire': '<path d="M33 7c9 18 20 20 16 34-3 12-27 17-34 0-4-10 6-16 9-24 1 8 4 10 7 12 3-8 1-15 2-22Z" fill="url(#flame)"/><path d="M33 31c5 8 11 11 4 18-10 5-15-4-11-10 0 6 6 3 7-8Z" fill="#fff3b1"/>',
    'ice': '<g stroke="#adf5ff" stroke-width="3" fill="none"><path d="M32 9v46M12 20l40 24M12 44l40-24M24 13l8 8 8-8M24 51l8-8 8 8M13 29l10-3-2-11M43 49l-2-11 10-3M13 35l10 3-2 11M43 15l-2 11 10 3"/></g><path d="m32 24 8 8-8 8-8-8Z" fill="#fff"/>',
    'bolt': '<path d="m36 6-21 29h15l-4 23 23-33H34Z" fill="url(#flame)" stroke="#fff2ad" stroke-width="2"/>',
    'arrow': '<path d="m43 10 10 1-1 10-5-4-27 29-4-4 28-29Z" fill="url(#metal)"/><path d="m20 38-10 1 1 11 11 2-1-10M16 15c27-1 36 13 33 32M17 15l32 32" fill="none" stroke="#dfb86c" stroke-width="3"/>',
    'eye': '<path d="M7 32c14-21 36-21 50 0-14 21-36 21-50 0Z" fill="#29394b" stroke="#a1eff0" stroke-width="3"/><circle cx="32" cy="32" r="12" fill="url(#magic)"/><path d="M32 21v22" stroke="#031821" stroke-width="5"/><circle cx="28" cy="27" r="3" fill="white"/>',
    'heal': '<path d="M25 12h14v13h13v14H39v13H25V39H12V25h13Z" fill="url(#metal)" stroke="#bdfff0" stroke-width="2"/><path d="M32 18v28M19 32h26" stroke="#76dcb4" stroke-width="2"/>',
    'orb': '<circle cx="32" cy="32" r="17" fill="url(#magic)" stroke="#c8f5ff" stroke-width="2"/><ellipse cx="32" cy="32" rx="27" ry="9" fill="none" stroke="#edc677" transform="rotate(-35 32 32)"/><circle cx="47" cy="17" r="4" fill="#fff5c1"/><path d="m24 25 8-7" stroke="white" stroke-width="3"/>',
    'skull': '<path d="M17 32C5 5 59 5 47 32l-5 8v10H22V40Z" fill="url(#metal)"/><path d="m21 26 8 3-2 7-8-3Zm22 0-8 3 2 7 8-3ZM32 35l-4 7h8Z" fill="#162034"/><path d="M27 44v7m10-7v7" stroke="#15202d" stroke-width="3"/>',
    'paw': '<ellipse cx="32" cy="41" rx="15" ry="11" fill="url(#metal)"/><g fill="#e8cd87"><ellipse cx="16" cy="27" rx="5" ry="8" transform="rotate(-25 16 27)"/><ellipse cx="27" cy="20" rx="5" ry="8"/><ellipse cx="39" cy="20" rx="5" ry="8"/><ellipse cx="49" cy="28" rx="5" ry="8" transform="rotate(25 49 28)"/></g>',
    'fist': '<path d="m19 38-5-13c-1-6 6-8 8-2l-1-10c0-6 8-6 8 0v9-11c0-6 8-6 8 0v11-8c0-6 8-6 8 0v12l5-4c5-3 8 4 4 8L41 49H25Z" fill="url(#metal)" stroke="#6e4a32" stroke-width="2"/><path d="M25 49v7h17v-7M25 34h16" stroke="#edb35e" stroke-width="4"/>',
    'wind': '<g fill="none" stroke="url(#metal)" stroke-width="4" stroke-linecap="round"><path d="M9 24h29c17 0 13-17 3-13M8 33h37c15 0 10 22-1 15M16 43h16c13 0 8 15 1 11"/></g>',
}


def motif(code, kind):
    for words, shape in [
        (('FIRE','FLAME','PHOENIX','ZECRAM'), 'fire'),
        (('ICE','FROST','GLACIAL'), 'ice'),
        (('LIGHTNING','SPARK','IMPULSION'), 'bolt'),
        (('SHIELD','ARMOR','ABSOR','DEFEN','BODY','STRENGTH'), 'shield'),
        (('HEAL','REGEN','LIFE','RESURRECTION','PEACE'), 'heal'),
        (('EYE','SIGHT','VISION','CONCENTRATION'), 'eye'),
        (('HAWK','FALCON','WOLVER','GOLEM','BEAST'), 'paw'),
        (('ARROW','SHOT','JAVELIN','AVALANCHE','AIM'), 'arrow'),
        (('SOUL','DARK','DEATH','CURSE','POISON','VENOM'), 'skull'),
        (('WIND','TORNADO','CYCLONE','VAGUE'), 'wind'),
        (('SWORD','PIERC','LANCE','SPEAR','BLADE','AXE','MASTERY'), 'sword'),
        (('PUNCH','KICK','STRIKE','RAVING','IMPACT','CRASH'), 'fist'),
    ]:
        if any(w in code for w in words): return shape
    return {'melee':'sword','shot':'arrow','heal':'heal','summon':'paw','buff':'shield','passive':'eye'}.get(kind,'orb')


@lru_cache(maxsize=176)
def render(code, kind, job, tier, index):
    hue=(job*31+tier*13+index*7)%360
    accent=f'hsl({hue},80%,65%)'
    rays=''.join(f'<path d="M32 5v5" transform="rotate({i*360/(tier+3)} 32 32)"/>' for i in range(tier+3))
    mark=int(hashlib.sha256(code.encode()).hexdigest()[:4],16)%360
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><radialGradient id="bg"><stop stop-color="hsl({hue},60%,28%)"/><stop offset="1" stop-color="#060c14"/></radialGradient><linearGradient id="metal" x2=".8" y2="1"><stop stop-color="#fff5c4"/><stop offset=".45" stop-color="#d5bc79"/><stop offset="1" stop-color="#729aad"/></linearGradient><linearGradient id="flame" x2="0" y2="1"><stop stop-color="#ffef90"/><stop offset=".5" stop-color="#ff873e"/><stop offset="1" stop-color="#b81d43"/></linearGradient><radialGradient id="magic"><stop stop-color="#f3ffff"/><stop offset=".4" stop-color="{accent}"/><stop offset="1" stop-color="#1a2551"/></radialGradient></defs>
<rect x="1" y="1" width="62" height="62" rx="8" fill="url(#bg)" stroke="#b9995a" stroke-width="2"/><circle cx="32" cy="32" r="26" fill="none" stroke="{accent}" opacity=".3"/><g stroke="{accent}" stroke-width="2" transform="rotate({mark} 32 32)">{rays}</g>{SHAPES[motif(code,kind)]}<g fill="#f0ce77">{''.join(f'<circle cx="{26+i*4}" cy="59" r="1"/>' for i in range(index+1))}</g></svg>'''.encode()
