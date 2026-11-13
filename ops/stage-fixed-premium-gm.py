from pathlib import Path
p=Path(r'C:\VelluM\investigation\premium-shop-stage\OnSever.premium-gravity.staged.cpp')
s=p.read_text('latin1')
a=s.index('    // /premium [page] delivers')
b=s.index('    // Explicit saving: queue a save',a)
block='''    // /premium: fixed nine-item 30-day package for the authorized ADM.
    len = rsCompString( "/premium" , szChatCommand );
    if ( len && lpPlayInfo->AdminMode>=4 &&
         (lstrcmpi(lpPlayInfo->szID,"ADM")==0 || lstrcmpi(lpPlayInfo->szID,"admin")==0) ) {
        const DWORD itemCodes[9] = {
            sinBI2|sin39, sinBI2|sin41, sinBI2|sin43,
            sinBI2|sin45, sinBI2|sin47, sinBI2|sin49,
            sinBI2|sin51, sinBI2|sin53, sinBI2|sin55
        };
        int freeSlots=0;
        for (int i=0;i<INVEN_ITEM_INFO_MAX;++i)
            if (!lpPlayInfo->InvenItemInfo[i].dwCode) ++freeSlots;
        if (freeSlots<9) {
            GmCheats_Whisper(lpPlayInfo,"> /premium: libere 9 espacos no inventario antes de usar.");
            return TRUE;
        }
        int delivered=0;
        for (int i=0;i<9;++i) {
            for(int j=0;j<DefaultItemCount;++j) {
                if (DefaultItems[j].Item.CODE!=itemCodes[i] || DefaultItems[j].Item.UniqueItem) continue;
                sITEMINFO item={0};
                Random_MaxMode=1;
                CreateDefItem(&item,&DefaultItems[j],lpPlayInfo->smCharInfo.JOB_CODE&0xFFFF);
                Random_MaxMode=0;
                if(item.CODE && rsPutItem2(lpPlayInfo,&item)) ++delivered;
                break;
            }
        }
        char notice[160];
        wsprintf(notice,"> /premium: %d dos 9 itens de 30 dias enviados. Verifique o inventario.",delivered);
        GmCheats_Whisper(lpPlayInfo,notice);
        rsRecordAdminCommand(lpPlayInfo,szChatCommand,1);
        return TRUE;
    }

'''
s=s[:a]+block+s[b:]
out=p.with_name('OnSever.premium-all9.staged.cpp')
out.write_text(s,'latin1')
print('FIXED_GM_PREMIUM_9X30D_STAGED',out.stat().st_size)
