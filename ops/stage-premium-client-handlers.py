from pathlib import Path
r=Path(r'C:\inetpub\priston\[project]\src')
out=Path(r'C:\VelluM\investigation\premium-shop-stage')
buffs=[
('EXP','SetUpKeepItem(nsPremiumItem::EXPUP_POTION,{t},true,UpKeepItemName[1],100);'),
('MANA_DOWN','SetUpKeepItem(nsPremiumItem::MANA_REDUCE_P,{t},true,UpKeepItemName[5],30);'),
('SUPER_VAMP','SetUpKeepItem(nsPremiumItem::VAMPIRIC_CUS_EX,{t},true,UpKeepItemName[11]); SetVampiricCuspidEXTime({t});'),
('SOUL_DRAIN','SetUpKeepItem(nsPremiumItem::MANA_RECHAR_P,{t},true,UpKeepItemName[3]); SetManaRechargingPTime({t});'),
('RES_DOWN','SetUpKeepItem(nsPremiumItem::STAMINA_REDUCE_P,{t},true,UpKeepItemName[12],30);'),
('GRAVITY',''),
('MUT','SetUpKeepItem(nsPremiumItem::HELP_PET_MUTE,{t},true,UpKeepItemName[10],30,3); sinChar->GravityScroolCheck[1] = 2;'),
('FENIX','SetUpKeepItem(nsPremiumItem::PHENIX_PET,{t},true,UpKeepItemName[6],30);'),
('THIRD_EYES','SetUpKeepItem(nsPremiumItem::THIRD_EYES,{t},true,UpKeepItemName[0],50);'),
]
# Map all custom items through normal inventory use handling.
inv=r/'sinbaram'/'sinInvenTory.cpp'
s=inv.read_bytes().decode('latin1')
needle='\t\t\tiEventBuyItemKind =0;'
assert s.count(needle)==1
calls=['\n\t\t\t// VelluM Premium Shop: timed consumables, unique registered item codes.']
for i,(name,_) in enumerate(buffs):
 for j,days in enumerate((7,30)):
  ordinal=38+i*2+j;kind=160+i*2+j
  calls.append(f'\t\t\tif (InvenItem[SelectInvenItemIndex-1].sItemInfo.CODE==(sinBI2|sin{ordinal:02d})) chaPremiumitem.UsePremiumItem({kind}); // {name} {days}D')
calls.append('\t\t\tif (InvenItem[SelectInvenItemIndex-1].sItemInfo.CODE==(sinBI2|sin56)) { haCastleSkillUseFlag=0; return; } // Kit blocked until atomic redemption')
s=s.replace(needle,needle+'\n'+'\n'.join(calls),1)
(out/'sinInvenTory.premium-shop.staged.cpp').write_bytes(s.encode('latin1'))
prem=r/'sinbaram'/'HaPremiumItem.cpp'
s=prem.read_bytes().decode('latin1')
needle='\t\tcase 133:'
assert s.count(needle)==1
cases=['\t\t// VelluM seven- and thirty-day timed premium effects.']
for i,(name,action) in enumerate(buffs):
 for j,days in enumerate((7,30)):
  kind=160+i*2+j
  if not action:
   cases.append(f'\t\tcase {kind}: // {name} {days}D - unavailable until proper expiry storage is implemented\n\t\t\thaCastleSkillUseFlag=0; return FALSE;')
  else:
   t='SINITEM_TIME_SEVENDAY' if days==7 else 'SINITEM_TIME_30DAY'
   cases.append(f'\t\tcase {kind}: // {name} {days}D\n\t\t\thaCastleSkillUseFlag=1;\n\t\t\t{action.format(t=t)}\n\t\t\tbreak;')
s=s.replace(needle,'\n'.join(cases)+'\n'+needle,1)
(out/'HaPremiumItem.premium-shop.staged.cpp').write_bytes(s.encode('latin1'))
print('TIMED_CLIENT_HANDLERS_STAGED',len(buffs)*2,'UNSUPPORTED_GRAVITY_2','NO_KIT_REDEMPTION')
