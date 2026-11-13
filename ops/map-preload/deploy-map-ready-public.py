from pathlib import Path
import shutil,hashlib,re,datetime,subprocess,sys,urllib.request,socket
stage=Path(r'C:\VelluM\investigation\map-ready-stage')
site=Path(r'C:\VelluM\integration-priston')
backup=Path(r'C:\VelluM\backups')/('map-ready-public-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir(parents=True,exist_ok=False)
names=('sw.js','progress.js','game.js','game.wasm','index.html')
for name in names:
 assert (site/name).is_file()
 shutil.copy2(site/name,backup/name)
for name in names[:-1]:assert (stage/name).is_file()
version=hashlib.sha256((stage/'game.wasm').read_bytes()).hexdigest()[:12]
assert 'locateFile("game.wasm?v='+version+'")' in (stage/'game.js').read_text('utf8')
def check_game():
 with socket.create_connection(('127.0.0.1',10007),timeout=2):pass
def http_ok(url):
 with urllib.request.urlopen(url,timeout=15) as response:
  if response.status!=200:raise RuntimeError(url+': '+str(response.status))
try:
 check_game()
 for name in names[:-1]:shutil.copy2(stage/name,site/name)
 html=(site/'index.html').read_text('utf8')
 assert 'game.js?v=' in html and 'progress.js?v=' in html
 html=re.sub(r'game\.js\?v=[^"\s<>]+','game.js?v='+version,html)
 html=re.sub(r'progress\.js\?v=[^"\s<>]+','progress.js?v=map-'+version,html)
 (site/'index.html').write_text(html,'utf8')
 for name in names[:-1]:http_ok('http://127.0.0.1:8095/'+name)
 check_game()
 print('PUBLIC_MAP_READY_DEPLOY_OK',version,'BACKUP',backup,flush=True)
except BaseException as exc:
 for name in names:shutil.copy2(backup/name,site/name)
 print('PUBLIC_MAP_READY_ROLLED_BACK',repr(exc),'BACKUP',backup,flush=True)
 sys.exit(1)
