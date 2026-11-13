from pathlib import Path
import json,re,shutil
root=Path(r'C:\inetpub\priston\[project]')
assets=root/'dist'/'server'/'GameServer'/'OpenItem'
source=root/'src'/'sinbaram'/'sinItem.cpp'
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
outitems=stage/'GameServer'/'OpenItem'
outitems.mkdir(parents=True,exist_ok=True)
catalog=[
 ('EXP 100%', 'BI144','BI150'),
 ('Mana Down','BI129','BI129'),
 ('Super Vampiric Cuspid','BI188','BI188'),
 ('Drena Almas','BI122','BI122'),
 ('Redutora de RES','BI192','BI192'),
 ('Gravity Stone','BI184','BI184'),
 ('MUT','BI168','BI155'),
 ('Fenix','BI133','BI151'),
 ('Third Eyes','BI114','BI114'),
]
entries=[]
assert all(not (assets/f'BI{x}.txt').exists() for x in range(300,319))
for term,(label,base7,base30) in enumerate(catalog):
 for idx,(days,template) in enumerate(((7,base7),(30,base30))):
  num=300+term*2+idx
  code=f'BI{num}'
  source_data=(assets/f'{template}.txt').read_bytes().decode('cp949')
  eng=re.search(r'^\*Name\s+"[^"]+"',source_data,re.M)
  ident=re.search(r'^\*코드\s+"[^"]+"',source_data,re.M)
  assert eng and ident
  source_data=source_data[:eng.start()]+f'*Name\t"{label} ({days} dias)"'+source_data[eng.end():]
  ident=re.search(r'^\*코드\s+"[^"]+"',source_data,re.M)
  source_data=source_data[:ident.start()]+f'*코드\t"{code}"'+source_data[ident.end():]
  price=100000 if days==7 else 350000
  if re.search(r'^//\*가격\s+\d+',source_data,re.M):
   source_data=re.sub(r'^//\*가격\s+\d+',f'*가격\t{price}',source_data,count=1,flags=re.M)
  else:
   source_data+=f'\n*가격\t{price}\n'
  (outitems/(code+'.txt')).write_bytes(source_data.encode('cp949'))
  entries.append(dict(code=code,macro=38+num-300,days=days,name=label,template=template,price=price))
kit_num=318
kit='BI318'
kit_src=(assets/'BI204.txt').read_bytes().decode('cp949')
kit_src=re.sub(r'^\*Name\s+"[^"]+"','*Name\t"Kit Premium (30 dias)"',kit_src,count=1,flags=re.M)
kit_src=re.sub(r'^\*코드\s+"[^"]+"','*코드\t"BI318"',kit_src,count=1,flags=re.M)
kit_src=re.sub(r'^//\*가격\s+\d+','*가격\t2500000',kit_src,count=1,flags=re.M)
(outitems/'BI318.txt').write_bytes(kit_src.encode('cp949'))
entries.append(dict(code='BI318',macro=56,days=30,name='Kit Premium',template='BI204',price=2500000))
src=source.read_bytes().decode('latin1')
anchor='\t\t//\xec\x9c\xa0\xeb\x8b\x88\xed\x81\xac'
# Find reliable insertion before OR205 category
pos=src.index('{sinOR2|sin05')
pos=src.rfind('\n',0,pos)
assert pos>0
lines=['\n\t\t// VelluM premium shop generated item registrations.']
for ent in entries:
 label=f'{ent["name"]} ({ent["days"]}D)' if ent["code"]!='BI318' else 'Kit Premium (30D)'
 lines.append(f'\t\t{{sinBI2|sin{ent["macro"]:02d} ,"{label}","{ent["code"]}",ITEMSIZE*1,ITEMSIZE*1,"Premium",ITEM_CLASS_ECORE,"{ent["template"]}",0,SIN_SOUND_POTION}},')
patched=src[:pos]+'\n'.join(lines)+'\n'+src[pos:]
generated=stage/'sinItem.premium-shop.staged.cpp'
generated.write_bytes(patched.encode('latin1'))
report=dict(status='ITEM_DEFINITIONS_STAGED_NO_ACTIVATION_YET',entries=entries,missing_functions=['7/30-day effect activation in client and server','gravity expiration and persistence','atomic Kit Premium redemption','shop purchase and UI integration','real-session testing'])
(stage/'premium-catalog-staged.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8')
print('NEW_CUSTOM_ITEM_CODES',len(entries),'SAVED_TO',outitems,'SOURCE_COPY',generated,'NOT_DEPLOYED')
