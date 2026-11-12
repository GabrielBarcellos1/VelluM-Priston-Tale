"""Prepare ADM-only privilege control and /equipar in source. Rebuild required."""
from pathlib import Path
from datetime import datetime
import shutil
p=Path(r'C:\inetpub\priston\[project]\src\SrcServer\OnSever.cpp')
raw=p.read_bytes()
def replace(old,new):
 global raw
 old=old.encode('utf8');new=new.encode('utf8')
 if new in raw:return
 count=raw.count(old)
 if count!=1:raise RuntimeError(f'Unexpected C++ source layout ({count}): '+repr(old[:120]))
 raw=raw.replace(old,new,1)
NL='\r\n'
a='\t\tif ( !lpTransCommand->LParam ) {'+NL+'\t\t\tlpPlayInfo->AdminMode = 1;'
b='\t\tif ( !lpTransCommand->LParam ) {'+NL+'\t\t\t// This debug request must not create GM access for other accounts.'+NL+'\t\t\tlpPlayInfo->AdminMode = lstrcmpi(lpPlayInfo->szID,"ADM")==0 ? 4 : 0;'
replace(a,b)
a='int\trsCheckAdminPlayer( rsPLAYINFO *lpPlayInfo )'+NL+'{'+NL+'\tint cnt;'+NL+'\tsmWINSOCK *lpsmSock = lpPlayInfo->lpsmSock;'
b=a+NL+NL+'\t// Auto-enable GM for the authenticated ADM account only.'+NL+'\tif ( lpPlayInfo->szID[0] && lstrcmpi(lpPlayInfo->szID,"ADM")==0 )'+NL+'\t\tlpPlayInfo->AdminMode = 4;'+NL+'\telse'+NL+'\t\tlpPlayInfo->AdminMode = 0;'
replace(a,b)
# Add a separate built-in /equipar command next to the existing DeckMeOut handler.
needle='\t// GM: /DeckMeOut! [aging] - the best gear for the player\'s level and class (GmDeckOut)'
insertion='''\t// ADM-only /equipar: advance to the server's maximum supported level and
\t// use the existing authoritative GM gear creation/equip protocol (+25 aging).
\tlen = rsCompString( "/equipar" , szChatCommand );
\tif ( len && lpPlayInfo->AdminMode>=4 && lstrcmpi(lpPlayInfo->szID,"ADM")==0 ) {
\t\tcnt = CHAR_LEVEL_MAX;
\t\tlpPlayInfo->spExp_Start = GetNextExp(cnt-1);
\t\tSetExp64( &lpPlayInfo->smCharInfo , lpPlayInfo->spExp_Start );
\t\tlpPlayInfo->smCharInfo.Level = cnt;
\t\tsmTransCommand.size = sizeof( smTRANS_COMMAND );
\t\tsmTransCommand.code = smTRANSCODE_GM_SETLEVEL;
\t\tsmTransCommand.WParam = cnt;
\t\tsmTransCommand.LParam = 0;
\t\tsmTransCommand.SParam = 0;
\t\tsmTransCommand.EParam = 0;
\t\tlpPlayInfo->lpsmSock->Send( (char *)&smTransCommand , smTransCommand.size , TRUE );
\t\tGmDeckOut( lpPlayInfo , 25 );
\t\trsRecordAdminCommand( lpPlayInfo , szChatCommand , 1 );
\t\treturn TRUE;
\t}

'''
replace(needle,insertion.replace('\n',NL)+needle)
backup=p.with_name(p.name+'.before-adm-equip-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak')
shutil.copy2(p,backup)
p.write_bytes(raw)
print('PATCHED',p,'BACKUP',backup,'ADDED_BYTES',len(raw)-backup.stat().st_size)