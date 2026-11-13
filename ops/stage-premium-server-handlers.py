from pathlib import Path
root=Path(r'C:\inetpub\priston\[project]\src')
src=root/'SrcServer'/'OnSever.cpp'
text=src.read_bytes().decode('latin1')
needle='if ( lpTransCommandEx->WParam==(sinBI1|sin12) )'
assert text.count(needle)==1
fields=[
 ('ExpUp','rsSendGameServer_PrimeItem( lpPlayInfo );', 'lpPlayInfo->dwPrimeItem_PackageCode = PRIME_ITEM_PACKAGE_NONE_100_EXPUP;'),
 ('ManaReduce','rsSendGameServer_PrimeItem2( lpPlayInfo );',''),
 ('VampCuspid_EX','rsSendGameServer_PrimeItem3( lpPlayInfo );',''),
 ('ManaRecharg','rsSendGameServer_PrimeItem( lpPlayInfo );',''),
 ('StaminaReduce','rsSendGameServer_PrimeItem3( lpPlayInfo );',''),
 (None,None,None),
 ('HelpPet','rsSendGameServer_PrimeItem3( lpPlayInfo );','lpPlayInfo->smCharInfo.GravityScroolCheck[1] = 2;'),
 ('PhenixPet','rsSendGameServer_PrimeItem2( lpPlayInfo );',''),
 ('X2','rsSendGameServer_PrimeItem( lpPlayInfo );',''),
]
branches=['// VelluM: server owns seven- and thirty-day premium expiry timestamps.', 'if ( (lpTransCommandEx->WParam&sinITEM_MASK2)==sinBI2 &&', '     (lpTransCommandEx->WParam&sinITEM_MASK3)>=sin38 &&', '     (lpTransCommandEx->WParam&sinITEM_MASK3)<=sin55 ) {','    const DWORD itemCode=lpTransCommandEx->WParam;', '    const DWORD expires=((DWORD)tServerTime)+ (((itemCode&sinITEM_MASK3)&0x100) ? PRIME_ITEM_TIME_PACKAGE4 : PRIME_ITEM_TIME_PACKAGE3);', '    lpPlayInfo->dwPrimeItem_NextSetTime=0;', '    switch(itemCode) {']
for i,(field,sender,extra) in enumerate(fields):
 if not field:continue
 for offset in (0,1):
  ordinal=38+i*2+offset
  branches.append(f'      case (sinBI2|sin{ordinal:02d}):')
  branches.append(f'        lpPlayInfo->dwTime_PrimeItem_{field} = ((DWORD)tServerTime) + '+('PRIME_ITEM_TIME_PACKAGE3' if offset==0 else 'PRIME_ITEM_TIME_PACKAGE4')+';')
  if extra:branches.append('        '+extra)
  branches.append('        '+sender)
  branches.append('        break;')
branches+=['      default: break;','    }','} else '+needle]
# Change no-op custom gravity to error in client (already blocked).
patch=text.replace(needle,'\n'.join(branches),1)
out=Path(r'C:\VelluM\investigation\premium-shop-stage\OnSever.premium-shop.staged.cpp')
out.write_bytes(patch.encode('latin1'))
print('NATIVE_TIMED_PREMIUM_HANDLERS_STAGED',out.stat().st_size,'CASES',sum('case (sinBI2' in a for a in branches))
