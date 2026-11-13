from pathlib import Path
root=Path(r'C:\inetpub\priston\[project]\src')
src=root/'SrcServer'/'OnSever.cpp'
s=src.read_bytes().decode('latin1')
mark='\t// ADM-only /equipar: advance to the server\'s maximum supported level'
assert s.count(mark)==1
block=r'''
    // /criar <nome completo ou codigo>: exact catalog lookup, authorized ADM only.
    // Resolve a name to a real registered item; never trust a client-supplied item struct.
    len = rsCompString( "/criar" , szChatCommand );
    if ( len && lpPlayInfo->AdminMode>=4 &&
         (lstrcmpi(lpPlayInfo->szID,"ADM")==0 || lstrcmpi(lpPlayInfo->szID,"admin")==0) ) {
        const char *needle = szChatCommand+len;
        while ( *needle==' ' ) needle++;
        char szName[128];
        lstrcpyn( szName, needle, sizeof(szName) );
        int length = lstrlen(szName);
        while ( length>0 && szName[length-1]==' ' ) szName[--length]=0;
        if ( !length || length>=sizeof(szName)-1 ) {
            GmCheats_Whisper(lpPlayInfo,"> ADM: use /criar Nome completo do item.");
            return TRUE;
        }
        DWORD wanted = 0;
        // Portuguese aliases for boss gear, independent of original item language.
        if ( lstrcmpi(szName,"Anel do Valento")==0 ) wanted = sinOR2|sin05;
        else if ( lstrcmpi(szName,"Amuleto do Kelvezu")==0 ||
                  lstrcmpi(szName,"Amuleto Kelvezu")==0 ) wanted = sinOA1|sin30;
        else {
            for ( int i=0; i<DefaultItemCount; ++i ) {
                if ( lstrcmpi(szName,DefaultItems[i].Item.ItemName)==0 ) {
                    wanted=DefaultItems[i].Item.CODE;
                    break;
                }
            }
            if ( !wanted ) for ( int i=0; i<MAX_ITEM; ++i ) {
                if ( lstrcmpi(szName,sItem[i].LastCategory)==0 ) {
                    wanted=sItem[i].CODE;
                    break;
                }
            }
        }
        int made=0;
        if ( wanted ) for ( int i=0; i<DefaultItemCount; ++i ) {
            if ( DefaultItems[i].Item.CODE!=wanted ) continue;
            sITEMINFO item;
            Random_MaxMode=1;
            CreateDefItem(&item,&DefaultItems[i],lpPlayInfo->smCharInfo.JOB_CODE&0xFFFF);
            Random_MaxMode=0;
            if ( item.CODE ) made=rsPutItem2(lpPlayInfo,&item);
            break;
        }
        if ( made )
            GmCheats_Whisper(lpPlayInfo,"> ADM: item enviado ao inventario. Confira o espaco disponivel.");
        else
            GmCheats_Whisper(lpPlayInfo,"> ADM: item nao localizado ou inventario sem espaco. Use nome exato ou codigo.");
        rsRecordAdminCommand(lpPlayInfo,szChatCommand,1);
        return TRUE;
    }

'''
out=Path(r'C:\VelluM\investigation\OnSever.criar.staged.cpp')
out.write_bytes(s.replace(mark,block+mark).encode('latin1'))
print('CREATE_STAGED_OK',out,'bytes',out.stat().st_size)
