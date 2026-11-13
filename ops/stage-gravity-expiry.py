from pathlib import Path
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
root=Path(r'C:\inetpub\priston\[project]\src')
status=(root/'sinbaram'/'sinCharStatus.cpp').read_text('latin1')
inventory=(stage/'sinInvenTory.premium-shop.kit.staged.cpp').read_text('latin1')
premium=(stage/'HaPremiumItem.premium-shop.kit.staged.cpp').read_text('latin1')
server=(stage/'OnSever.premium-shop.price-guard.staged.cpp').read_text('latin1')
bonus='''\n\t// Temporary VelluM Gravity Stone uses reserved saved dwTemp[10] (epoch seconds).
    // Legacy permanent Gravity Scroll charges remain unchanged.
    if (sinChar->dwTemp[10] && (DWORD)time(NULL)<sinChar->dwTemp[10])
        sinChar->Weight[1] = (short)(sinChar->Weight[1] + 50);
'''
for target,needle,filename in [
 (status,'\n\tsinChar->wVersion[1] = 1;','sinCharStatus.premium-gravity.staged.cpp'),
 (inventory,'\n\tfMaxWeight   = (float)sinChar->Weight[1];','sinInvenTory.premium-gravity.staged.cpp')
]:
 assert target.count(needle)>=1,(filename,target.count(needle))
 target=target.replace(needle,bonus+needle,1)
 target='#include <time.h>\n'+target
 (stage/filename).write_text(target,'latin1')
for kind,days in [(170,7),(171,30)]:
 marker=f'case {kind}: // GRAVITY {days}D - unavailable until proper expiry storage is implemented'
 assert marker in premium
 duration='SINITEM_TIME_SEVENDAY' if days==7 else 'SINITEM_TIME_30DAY'
 old=f'\t\t{marker}\n\t\t\thaCastleSkillUseFlag=0; return FALSE;'
 new=f'''\t\tcase {kind}: // GRAVITY {days}D, time-limited and saved with character
            sinChar->dwTemp[10]=(DWORD)time(NULL)+{duration};
            cCharStatus.UseGravityScrool();
            cInvenTory.SetItemToChar();
            ReformCharForm();
            haCastleSkillUseFlag=1;
            break;'''
 assert premium.count(old)==1
 premium=premium.replace(old,new)
premium='#include <time.h>\n'+premium
(stage/'HaPremiumItem.premium-gravity.staged.cpp').write_text(premium,'latin1')
# Server mirrors epoch expiry only after authenticated removal.
marker='if ( lpTransCommandEx->WParam==(sinBI2|sin56) ) {\n                const DWORD rewards[9] = {'
assert server.count(marker)==2
match=server.find(marker)
# second occurrence after rsDeleteInvenItem success
match=server.find(marker,match+len(marker))
post='''if ( lpTransCommandEx->WParam==(sinBI2|sin48) ||
                 lpTransCommandEx->WParam==(sinBI2|sin49) ) {
                lpPlayInfo->smCharInfo.dwTemp[10]=(DWORD)time(NULL)+
                    (lpTransCommandEx->WParam==(sinBI2|sin48) ? 7u*86400u : 30u*86400u);
            }
            '''
server=server[:match]+post+server[match:]
server='#include <time.h>\n'+server
(stage/'OnSever.premium-gravity.staged.cpp').write_text(server,'latin1')
print('GRAVITY_7D_30D_STAGED_WITH_EPOCH_EXPIRY_AND_EXISTING_CHARACTER_PERSISTENCE',[(f,(stage/f).stat().st_size) for f in ['sinCharStatus.premium-gravity.staged.cpp','sinInvenTory.premium-gravity.staged.cpp','HaPremiumItem.premium-gravity.staged.cpp','OnSever.premium-gravity.staged.cpp']])
