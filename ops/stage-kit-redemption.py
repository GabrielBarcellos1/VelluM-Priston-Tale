from pathlib import Path
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
source=stage/'OnSever.premium-shop.staged.cpp'
text=source.read_bytes().decode('latin1')
context=text.index('case smTRANSCODE_SAVETHROWITEM2:')
at=text.index('if ( rsDeleteInvenItem( lpPlayInfo , lpTransCommandEx->WParam',context)
pre='''// VelluM Kit Premium: confirm all nine 30-day definitions and bag capacity
            // before consuming the authenticated kit serial.
            if ( lpTransCommandEx->WParam==(sinBI2|sin56) ) {
                const DWORD rewards[9] = {
                    sinBI2|sin39, sinBI2|sin41, sinBI2|sin43,
                    sinBI2|sin45, sinBI2|sin47, sinBI2|sin49,
                    sinBI2|sin51, sinBI2|sin53, sinBI2|sin55
                };
                int freeEntries=0;
                for ( int j=0; j<INVEN_ITEM_INFO_MAX; ++j )
                    if ( !lpPlayInfo->InvenItemInfo[j].dwCode ) ++freeEntries;
                int registered=0;
                for ( int j=0; j<9; ++j ) {
                    for ( int k=0; k<DefaultItemCount; ++k )
                        if (DefaultItems[k].Item.CODE==rewards[j] &&
                            !DefaultItems[k].Item.UniqueItem) { ++registered; break; }
                }
                if (freeEntries<8 || registered!=9) {
                    GmCheats_Whisper(lpPlayInfo,"> Kit Premium: libere 9 espacos no inventario e tente novamente.");
                    break;
                }
            }
            '''
text=text[:at]+pre+text[at:]
at=text.index('if ( rsDeleteInvenItem( lpPlayInfo , lpTransCommandEx->WParam',context)
brace=text.index('{',at)
depth=0;close=None
for i in range(brace,len(text)):
 if text[i]=='{':depth+=1
 elif text[i]=='}':
  depth-=1
  if depth==0:close=i;break
assert close is not None
post='''
            if ( lpTransCommandEx->WParam==(sinBI2|sin56) ) {
                const DWORD rewards[9] = {
                    sinBI2|sin39, sinBI2|sin41, sinBI2|sin43,
                    sinBI2|sin45, sinBI2|sin47, sinBI2|sin49,
                    sinBI2|sin51, sinBI2|sin53, sinBI2|sin55
                };
                int delivered=0;
                for ( int i=0; i<9; ++i ) for ( int j=0; j<DefaultItemCount; ++j ) {
                    if (DefaultItems[j].Item.CODE!=rewards[i]) continue;
                    sITEMINFO reward={0};
                    Random_MaxMode=1;
                    CreateDefItem(&reward,&DefaultItems[j],lpPlayInfo->smCharInfo.JOB_CODE&0xFFFF);
                    Random_MaxMode=0;
                    if (reward.CODE && rsPutItem2(lpPlayInfo,&reward)) ++delivered;
                    break;
                }
                char message[160];
                wsprintf(message,"> Kit Premium: %d/9 itens enviados ao inventario. Salve o personagem.",delivered);
                GmCheats_Whisper(lpPlayInfo,message);
                break;
            }
'''
text=text[:close+1]+post+text[close+1:]
out=stage/'OnSever.premium-shop.kit.staged.cpp'
out.write_bytes(text.encode('latin1'))
print('KIT_REDEMPTION_SERVER_STAGED',out.stat().st_size,'AUTHENTICATED_DELETION_USED')
