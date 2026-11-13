from pathlib import Path
import datetime,shutil,subprocess,sys,os,hashlib
root=Path(r'C:\inetpub\priston\[project]\src')
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
backup=Path(r'C:\VelluM\backups')/('premium-prod-web-build-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir(parents=True,exist_ok=False)
pairs=[
(root/'sinbaram'/'sinItem.cpp',stage/'sinItem.premium-shop.staged.cpp'),
(root/'sinbaram'/'sinInvenTory.cpp',stage/'sinInvenTory.premium-gravity.staged.cpp'),
(root/'sinbaram'/'HaPremiumItem.cpp',stage/'HaPremiumItem.premium-gravity.staged.cpp'),
(root/'sinbaram'/'sinCharStatus.cpp',stage/'sinCharStatus.premium-gravity.staged.cpp'),
(root/'SrcServer'/'OnSever.cpp',stage/'OnSever.premium-final-safety.staged.cpp')]
out=root/'web'/'out'
for i,(p,c) in enumerate(pairs):
 assert p.exists() and c.exists()
 shutil.copy2(p,backup/(f'original-{i}.cpp'))
for name in ['game.js','game.wasm','game.html']:
 if (out/name).exists():shutil.copy2(out/name,backup/('original-'+name))
try:
 for p,c in pairs:p.write_bytes(c.read_bytes())
 env=os.environ.copy()
 env['PT_DEFINES']='PT_SERVER_PORT=10007'
 with (backup/'build.log').open('w',encoding='utf8',errors='replace') as log:
  proc=subprocess.run([sys.executable,str(root/'web'/'build_web.py'),'-j','4','--release'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=900)
 if proc.returncode:
  print('PROD_WEB_BUILD_ERROR',proc.returncode,(backup/'build.log').read_text('utf8',errors='replace')[-2000:],flush=True)
  sys.exit(1)
 for name in ['game.js','game.wasm','game.html']:shutil.copy2(out/name,stage/('production-'+name))
 blob=(stage/'production-game.wasm').read_bytes()
 assert b'10008' not in blob and b'10007' in blob,'WASM server port mismatch'
 print('PROD_WEB_READY',len(blob),hashlib.sha256(blob).hexdigest()[:16], 'PORT10007',flush=True)
finally:
 for i,(p,c) in enumerate(pairs):shutil.copy2(backup/(f'original-{i}.cpp'),p)
 for name in ['game.js','game.wasm','game.html']:
  original=backup/('original-'+name)
  if original.exists():shutil.copy2(original,out/name)
 print('PROD_WEB_BUILD_SOURCES_RESTORED',backup,flush=True)
