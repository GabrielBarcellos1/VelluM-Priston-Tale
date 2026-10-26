"""Brand/revision metadata and an atomic status file for the public tunnel."""
from pathlib import Path
import hashlib
import json
import os
import tempfile
import threading
import time

ROOT=Path(__file__).resolve().parent
BRAND='FREEston Tale'
VERSION=23
_guard=threading.Lock()
_cache=(None,None)


def installation_id():
    return hashlib.sha256(str(ROOT.resolve()).encode()).hexdigest()[:16]


def build_info():
    global _cache
    files=sorted([*ROOT.glob('*.mjs'),*ROOT.glob('*.css'),*ROOT.glob('*.html'),*ROOT.glob('data/*.json')])
    fingerprint=tuple((p.name,p.stat().st_mtime_ns,p.stat().st_size) for p in files)
    with _guard:
        if _cache[0]!=fingerprint:
            digest=hashlib.sha256()
            for path in files:
                digest.update(path.relative_to(ROOT).as_posix().encode())
                digest.update(path.read_bytes())
            _cache=(fingerprint,digest.hexdigest()[:16])
        return {'name':BRAND,'version':VERSION,'revision':_cache[1],'world':'shared-presence','publicLaunchReady':False,'installation':installation_id()}


def link_path():
    return Path(os.environ.get('PWEB_DATA_DIR',str(ROOT/'.local-data')))/'public-link.json'


def write_link(data):
    target=link_path();target.parent.mkdir(parents=True,exist_ok=True)
    payload={**data,'updatedAt':time.time()}
    with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',dir=target.parent,delete=False) as stream:
        json.dump(payload,stream,ensure_ascii=False)
        temp=Path(stream.name)
    temp.replace(target)


def read_link():
    try:
        data=json.loads(link_path().read_text(encoding='utf-8'))
        if not isinstance(data,dict):return {'status':'offline','url':None}
        if time.time()-data.get('updatedAt',0)>90:return {**data,'status':'offline','verified':False}
        return data
    except (OSError,ValueError,TypeError):return {'status':'offline','url':None,'verified':False}
