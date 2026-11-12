"""Priston Classic data snapshots. Copies game data without modifying any original.
Never captures passwords in logs, skips inconsistent live files and verifies each copy.
Backups are ON THE SAME MACHINE: offsite DR is still required before broad launch.
"""
from __future__ import annotations
import datetime,hashlib,json,shutil,sys,time
from pathlib import Path
DATA=Path(r'C:\inetpub\priston\[project]\dist\server\DataServer')
OUTPUT=Path(r'C:\VelluM\backups')
CONFIG=Path(r'C:\inetpub\priston\[project]\dist\server\server.ini')
KEEP=56  # 6-hour backup cadence, 14 days locally
def sha(file):
 h=hashlib.sha256()
 with file.open('rb') as f:
  while True:
   chunk=f.read(256*1024)
   if not chunk:break
   h.update(chunk)
 return h.hexdigest()
def snapshot():
 assert DATA.is_dir() and CONFIG.is_file()
 target=OUTPUT/('scheduled-classic-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
 target.mkdir(parents=True,exist_ok=False)
 manifest={'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':{},'errors':[]}
 srcfiles=sorted(p for p in DATA.rglob('*') if p.is_file() and not p.is_symlink())
 srcfiles.append(CONFIG)
 for src in srcfiles:
  rel=('DataServer/'+src.relative_to(DATA).as_posix()) if src!=CONFIG else 'server.ini'
  dest=target/rel
  dest.parent.mkdir(parents=True,exist_ok=True)
  good=False
  for retry in range(3):
   try:
    before=sha(src)
    shutil.copy2(src,dest)
    after=sha(src)
    copied=sha(dest)
    if before==after==copied:
     manifest['files'][rel]={'sha256':copied,'bytes':dest.stat().st_size}
     good=True;break
   except (PermissionError,OSError) as e:
    error=str(e)
   time.sleep(.1)
  if not good:
   manifest['errors'].append(rel+' changed while copying or unavailable')
   try:dest.unlink()
   except OSError:pass
 (target/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
 if manifest['errors']:
  print('BACKUP_INCOMPLETE',target,'ERRORS',manifest['errors'])
  return 1
 past=sorted((p for p in OUTPUT.glob('scheduled-classic-*') if p.is_dir()),reverse=True)
 for old in past[KEEP:]:
  shutil.rmtree(old)
 print('BACKUP_OK',target,'FILES',len(manifest['files']),'BYTES',sum(v['bytes'] for v in manifest['files'].values()))
 return 0
if __name__=='__main__':
 sys.exit(snapshot())