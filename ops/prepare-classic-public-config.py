"""Prepare safely for outside users: require stored account passwords and remove
legacy all-user GM/debug mode. Does not change account files or user passwords.
"""
from pathlib import Path
import datetime,shutil,re,sys
root=Path(r'C:\inetpub\priston\[project]\dist\server')
cfg=root/'server.ini'
db=root/'DataServer'/'password'
required=['adm.pw','admin.pw','bielbt.pw']
missing=[n for n in required if not (db/n).is_file() or (db/n).stat().st_size!=16]
if missing:raise SystemExit('ABORT: missing legacy account password files: '+','.join(missing))
raw=cfg.read_bytes()
lines=raw.splitlines(keepends=True)
normalized=[]
changes=[]
for line in lines:
 stripped=line.strip().upper()
 if stripped==b'*GM_CHEATS':
  normalized.append(b'//*GM_CHEATS // disabled for public beta\r\n')
  changes.append('GM_CHEATS disabled')
 elif stripped.startswith(b'*ADMIN_COMMAND'):
  normalized.append(b'//*ADMIN_COMMAND // disabled shared secret in public beta\r\n')
  changes.append('shared admin secret disabled')
 elif stripped.startswith(b'// LIVE IS A TEST SERVER TOO'):
  normalized.append(b'// Public beta: password required, staff commands only via authenticated ADM accounts.\r\n')
 elif stripped.startswith(b'*MAX_USERS'):
  normalized.append(b'*MAX_USERS\t\t30\r\n')
  changes.append('concurrency cap provisional 30')
 else:
  normalized.append(line)
out=b''.join(normalized)
if b'*OFFLINE_PASSWORDS' not in out:
 out=out.replace(b'*OFFLINE_MODE\r\n',b'*OFFLINE_MODE\r\n*OFFLINE_PASSWORDS\r\n',1)
 changes.append('password verification enabled')
assert b'*OFFLINE_PASSWORDS' in out
assert not any(x.strip()==b'*GM_CHEATS' for x in out.splitlines())
assert not any(x.strip().startswith(b'*ADMIN_COMMAND') for x in out.splitlines())
if out==raw:
 print('ALREADY_HARDENED')
else:
 b=Path(r'C:\VelluM\backups')/('classic-public-safety-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
 b.mkdir(parents=True)
 shutil.copy2(cfg,b/'server.ini')
 shutil.copytree(root/'DataServer',b/'DataServer')
 cfg.write_bytes(out)
 print('HARDENED_CONFIG',cfg,'BACKUP',b,'CHANGES',changes)
print('ACCOUNTS_READY',len(required))