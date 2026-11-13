from pathlib import Path
import datetime,hashlib,shutil,socket,subprocess,time,sys,re
root=Path(r'C:\inetpub\priston\[project]\dist\server')
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
web=Path(r'C:\VelluM\integration-priston')
backup=Path(r'C:\VelluM\backups')/('premium-live-20261113-'+datetime.datetime.now().strftime('%H%M%S'))
backup.mkdir(parents=True,exist_ok=False)
items=[('server.exe',stage/'server.production.exe')]
for dirname in ('Field','NPC','OpenItem'):
 for f in (stage/'GameServer'/dirname).iterdir():
  if f.is_file():items.append((str(Path('GameServer')/dirname/f.name),f))
for name in ('game.js','game.wasm'):
 items.append(('WEB/'+name,stage/('production-'+name)))
for name in ('index.html','game.html'):
 items.append(('WEB/'+name,None))
assert len(items)==28
def check(port):
 try:
  with socket.create_connection(('127.0.0.1',port),timeout=1):return True
 except OSError:return False
assert check(19065) and check(10008)
assert (stage/'server.production.exe').stat().st_size>10_000_000
assert b'10007' in (stage/'production-game.wasm').read_bytes()
old={}
for rel,source in items:
 target=web/Path(rel).name if rel.startswith('WEB/') else root/rel
 dest=backup/rel;dest.parent.mkdir(parents=True,exist_ok=True)
 old[rel]=(target,target.is_file(),dest)
 if target.is_file():shutil.copy2(target,dest)
print('PREMIUM_BACKUP',backup,'28_FILES',flush=True)
task_name='PristonServer'
def powershell(statement):
 return subprocess.run(['powershell','-NoProfile','-Command',statement],capture_output=True,text=True,timeout=30,check=True)
def stop_prod():
 powershell("Stop-ScheduledTask -TaskName 'PristonServer' -ErrorAction SilentlyContinue; Disable-ScheduledTask -TaskName 'PristonServer' -ErrorAction Stop | Out-Null")
 for trial in range(12):
  q=powershell("Get-CimInstance Win32_Process -Filter \"Name='server.exe'\" | Where-Object {$_.ExecutablePath -eq 'C:\\inetpub\\priston\\[project]\\dist\\server\\server.exe'} | Select-Object -ExpandProperty ProcessId")
  ids=[int(x) for x in q.stdout.split() if x.isdigit()]
  if not ids:return
  for pid in ids:
   subprocess.run(['taskkill','/PID',str(pid),'/F'],capture_output=True,timeout=12)
  time.sleep(2)
 raise RuntimeError('Production binary still in use')
def start_prod():
 powershell("Enable-ScheduledTask -TaskName 'PristonServer' -ErrorAction Stop | Out-Null; Start-ScheduledTask -TaskName 'PristonServer' -ErrorAction Stop")
 for _ in range(90):
  if check(10007):return True
  time.sleep(2)
 return False
stopped=False
try:
 stop_prod();stopped=True
 print('PRODUCTION_TASK_STOPPED_FOR_SWAP',flush=True)
 shutil.copytree(root/'DataServer',backup/'DataServer',dirs_exist_ok=True)
 for rel,source in items:
  if source is not None and not rel.startswith('WEB/'):
   target=old[rel][0]
   target.parent.mkdir(parents=True,exist_ok=True)
   shutil.copy2(source,target)
 print('SERVER_NPC_ITEMS_COPIED',flush=True)
 if not start_prod():raise RuntimeError('Production game port 10007 failed to reopen')
 print('SERVER_PREMIUM_ONLINE',flush=True)
 for rel,source in items:
  if rel.startswith('WEB/') and source is not None:shutil.copy2(source,old[rel][0])
 version=hashlib.sha256((web/'game.wasm').read_bytes()).hexdigest()[:12]
 for name in ('index.html','game.html'):
  file=web/name
  if not file.is_file():continue
  text=file.read_text(encoding='utf8')
  text=re.sub(r'game\.js(?:\?v=[^"\s<>]+)?','game.js?v='+version,text)
  text=re.sub(r'game\.wasm(?:\?v=[^"\s<>]+)?','game.wasm?v='+version,text)
  file.write_text(text,encoding='utf8')
 if not check(19065):raise RuntimeError('VelluM old port down')
 print('PUBLIC_PREMIUM_PUBLISHED',version,'BACKUP',backup,flush=True)
except BaseException as e:
 print('PUBLISH_ERROR',type(e).__name__,str(e),flush=True)
 if stopped:
  try:
   stop_prod()
   for rel,source in items:
    target,existed,bak=old[rel]
    if existed:shutil.copy2(bak,target)
    elif target.exists():target.unlink()
   print('PREVIOUS_VERSION_RESTORED',flush=True)
  except Exception as err:print('ROLLBACK_RESTORE_ERROR',str(err),flush=True)
  try:print('ROLLBACK_SERVER_ONLINE',start_prod(),flush=True)
  except Exception as err:print('ROLLBACK_RESTART_ERROR',str(err),flush=True)
 sys.exit(1)
