from pathlib import Path
from datetime import datetime
import shutil
root=Path(r'C:\inetpub\priston\[project]\src')
f=root/'character.cpp';g=root/'playmain.cpp'
stamp=datetime.now().strftime('%Y%m%d-%H%M%S')
s=f.read_bytes().decode('latin1')
old='const int vellumTierBadge = !vellumAdmCrown && smCharInfo.ChangeJob>=1 && smCharInfo.ChangeJob<=3;'
assert s.count(old)==1
s=s.replace(old,'const int vellumTierBadge = smCharInfo.ChangeJob>=1 && smCharInfo.ChangeJob<=3;')
old='( ( (Clan_CastleMasterFlag && smCharInfo.ClassClan) || vellumAdmCrown || vellumTierBadge ) && PatCrown && RendSucess && RendPoint.z<12*64*fONE && PlayVanish<=0'
assert s.count(old)==1
s=s.replace(old,old.replace('12*64','32*64'))
t=g.read_bytes().decode('latin1')
line=next(x for x in t.splitlines() if 'PatCrown = smReadModel(' in x)
assert t.count(line)==1
bslash=chr(92)*2
fallback='\tif ( !PatCrown ) PatCrown = smReadModel( "weapons'+bslash+'Crown2.smd" , 0 );'
t=t.replace(line,line+'\n'+fallback,1)
for p in [f,g]:shutil.copy2(p,p.with_name(p.name+'.before-tier-'+stamp+'.bak'))
f.write_bytes(s.encode('latin1'));g.write_bytes(t.encode('latin1'))
print('TIER_BADGE_SOURCE_UPDATED',stamp)
