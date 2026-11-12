"""Enable classic 3D crown/aura for the uniquely named ADM character.
Source-only; client WASM rebuild required.
"""
from pathlib import Path
from datetime import datetime
import shutil
p=Path(r'C:\inetpub\priston\[project]\src\character.cpp')
raw=p.read_bytes()
old=b'\tif ( Clan_CastleMasterFlag && smCharInfo.ClassClan && PatCrown && RendSucess'
new=b'\tconst int vellumAdmCrown = lstrcmpi(smCharInfo.szName, "ADM")==0;\r\n\tif ( vellumAdmCrown && RendSucess && PlayVanish<=0 )\r\n\t\tsinEffect_Ratoo_Aura2(this);\r\n\tif ( ( (Clan_CastleMasterFlag && smCharInfo.ClassClan) || vellumAdmCrown ) && PatCrown && RendSucess'
if new in raw:print('ALREADY_PATCHED')
else:
 assert raw.count(old)==1,raw.count(old)
 b=p.with_name('character.cpp.before-adm-crown-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak')
 shutil.copy2(p,b)
 p.write_bytes(raw.replace(old,new,1))
 print('PATCHED',p,'BACKUP',b)