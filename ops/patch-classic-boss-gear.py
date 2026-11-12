"""Prepare boss accessories for /equipar, keeping original /DeckMeOut unchanged."""
from pathlib import Path
from datetime import datetime
import shutil
p=Path(r'C:\inetpub\priston\[project]\src\SrcServer\OnSever.cpp')
raw=p.read_bytes()
backup=p.with_name(p.name+'.before-boss-gear-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak')
NL=b'\r\n'
def change(old,new,count=1):
 global raw
 old=old.encode('utf8');new=new.encode('utf8')
 if raw.count(old)!=count:raise RuntimeError('Unexpected C++ source: '+repr(old[:150])+' count='+str(raw.count(old)))
 raw=raw.replace(old,new,count)
change('static int DeckPickItem( rsPLAYINFO *lpPlayInfo , DWORD dwFamily , int Aging , sITEMINFO *lpItem )',
       'static int DeckPickItem( rsPLAYINFO *lpPlayInfo , DWORD dwFamily , int Aging , sITEMINFO *lpItem , int BossMode=FALSE )')
change('if ( (lpDef->CODE&sinITEM_MASK2)!=dwFamily || lpDef->UniqueItem ) continue;',
       'if ( (lpDef->CODE&sinITEM_MASK2)!=dwFamily || (lpDef->UniqueItem && !BossMode) ) continue;')
change('if ( ord<=0 || ord>30 ) continue;',
       'if ( ord<=0 || ord>(BossMode ? 60 : 30) ) continue;')
change('static int GmDeckOut( rsPLAYINFO *lpPlayInfo , int Aging )',
       'static int GmDeckOut( rsPLAYINFO *lpPlayInfo , int Aging , int BossMode=FALSE )')
change('{ sinOR1 , INVENTORY_POS_LRING },'+NL.decode()+'\t\t{ sinOR1 , INVENTORY_POS_RRING },',
       '{ BossMode ? sinOR2 : sinOR1 , INVENTORY_POS_LRING },'+NL.decode()+'\t\t{ BossMode ? sinOR2 : sinOR1 , INVENTORY_POS_RRING },')
change('DeckPickItem( lpPlayInfo , dwWeapon , Aging , &Items[Count] )',
       'DeckPickItem( lpPlayInfo , dwWeapon , Aging , &Items[Count] , BossMode )')
change('DeckPickItem( lpPlayInfo , Caster ? sinOM1 : sinDS1 , Aging , &Items[Count] )',
       'DeckPickItem( lpPlayInfo , Caster ? sinOM1 : sinDS1 , Aging , &Items[Count] , BossMode )')
change('DeckPickItem( lpPlayInfo , Slots[cnt].dwFamily , Aging , &Items[Count] )',
       'DeckPickItem( lpPlayInfo , Slots[cnt].dwFamily , Aging , &Items[Count] , BossMode )')
change('GmDeckOut( lpPlayInfo , 25 );','GmDeckOut( lpPlayInfo , 25 , TRUE );')
# Explicitly reject any non-ADM attempt to use GM level inside command handler.
change('int RecvCommand( rsPLAYINFO *lpPlayInfo , char *szChatCommand )'+NL.decode()+'{',
       'int RecvCommand( rsPLAYINFO *lpPlayInfo , char *szChatCommand )'+NL.decode()+'{'+NL.decode()+
       '\tlpPlayInfo->AdminMode = lstrcmpi(lpPlayInfo->szID,"ADM")==0 ? 4 : 0;',count=2)
shutil.copy2(p,backup);p.write_bytes(raw)
print('BOSS_GEAR_SOURCE_PATCHED',p,'BACKUP',backup)