from pathlib import Path
import datetime,shutil,subprocess,sys,hashlib
root=Path(r'C:\inetpub\priston\[project]\src')
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
backup=Path(r'C:\VelluM\backups')/('premium-prod-build-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir(parents=True,exist_ok=False)
pairs=[(root/'SrcServer'/'OnSever.cpp',stage/'OnSever.premium-final-safety.staged.cpp'),(root/'sinbaram'/'sinItem.cpp',stage/'sinItem.premium-shop.staged.cpp')]
native=root/'bin'/'ReleaseGL'/'server.exe'
for i,(f,c) in enumerate(pairs):
 assert f.is_file() and c.is_file()
 shutil.copy2(f,backup/(f'original-{i}.cpp'))
shutil.copy2(native,backup/'original-server.exe')
try:
 for f,c in pairs:f.write_bytes(c.read_bytes())
 command=[r'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe',str(root/'PristonServer.vcxproj'),'/p:Configuration=Release','/p:Platform=Win32','/p:PtGfx=GL','/m:2','/nologo','/v:minimal']
 with (backup/'build.log').open('w',encoding='utf8',errors='replace') as log:
  r=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT,timeout=300)
 if r.returncode:
  print('PROD_NATIVE_BUILD_ERROR',r.returncode,(backup/'build.log').read_text('utf8',errors='replace')[-1800:],flush=True)
  sys.exit(r.returncode)
 dest=stage/'server.production.exe'
 shutil.copy2(native,dest)
 print('PROD_NATIVE_READY',dest.stat().st_size,hashlib.sha256(dest.read_bytes()).hexdigest(),flush=True)
finally:
 for i,(f,c) in enumerate(pairs):shutil.copy2(backup/(f'original-{i}.cpp'),f)
 print('ORIGINAL_SOURCES_RESTORED',backup,flush=True)
