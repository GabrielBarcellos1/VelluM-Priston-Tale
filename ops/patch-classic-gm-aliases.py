"""Add PT-BR aliases to existing classic server GM commands.
Aliases feed the ORIGINAL privileged handlers; their AdminMode checks remain intact.
Source patch only; rebuild server.exe using the project's native toolchain before use.
"""
from pathlib import Path
import shutil,sys,datetime
p=Path(sys.argv[1]) if len(sys.argv)>1 else Path(r'C:\inetpub\priston\[project]\src\SrcServer\OnSever.cpp')
assert p.is_file(),p
raw=p.read_bytes()
changes={
 b'len = rsCompString( "/monster" , szChatCommand );':b'len = rsCompString( "/monster" , szChatCommand );\n\tif ( !len ) len = rsCompString( "/monstro" , szChatCommand );',
 b'len = rsCompString( "/mymonster" , szChatCommand );':b'len = rsCompString( "/mymonster" , szChatCommand );\n\tif ( !len ) len = rsCompString( "/meumonstro" , szChatCommand );',
 b'len = rsCompString( "/MakeMeLevel" , szChatCommand );':b'len = rsCompString( "/MakeMeLevel" , szChatCommand );\n\tif ( !len ) len = rsCompString( "/nivel" , szChatCommand );',
 b'len = rsCompString( "/GiveMeMoney!" , szChatCommand );':b'len = rsCompString( "/GiveMeMoney!" , szChatCommand );\n\tif ( !len ) len = rsCompString( "/ouro" , szChatCommand );',
 b'len = rsCompString( "/GiveMeExp!" , szChatCommand );':b'len = rsCompString( "/GiveMeExp!" , szChatCommand );\n\tif ( !len ) len = rsCompString( "/xp" , szChatCommand );',
 b'len = rsCompString( "/@get" , szChatCommand );':b'len = rsCompString( "/@get" , szChatCommand );\n\tif ( !len ) len = rsCompString( "/item" , szChatCommand );'
}
out=raw
for old,new in changes.items():
 if new in out:continue
 if out.count(old)!=1:raise SystemExit('Alias source missing or ambiguous: '+old.decode('ascii','replace'))
 out=out.replace(old,new,1)
if out!=raw:
 backup=p.with_name(p.name+'.before-ptbr-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak')
 shutil.copy2(p,backup)
 p.write_bytes(out)
 print('PATCHED',p,'BACKUP',backup)
else:print('ALREADY_PATCHED',p)
print('ALIASES',len(changes))