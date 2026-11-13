from pathlib import Path
import struct,shutil
source=Path(r'C:\inetpub\priston\[project]\dist\server\GameServer')
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
(stage/'GameServer'/'NPC').mkdir(parents=True,exist_ok=True)
(stage/'GameServer'/'Field').mkdir(parents=True,exist_ok=True)
# Five registered, working 7-day codes. More items must be defined before go-live.
seven_days=['BI144','BI129','BI168','BI133','BI114']
for city in ['ricarten','pillai']:
 text='''*속성\tNPC
*모양파일\t"char\\npc\\Bcn03\\Bcn03.INI"
*이름\t"Loja Premium"
*Name\t"Premium Shop"
*계급\t1001
*무기판매\t없음
*방어구판매\t없음
*잡화판매\t'''+ ' '.join(seven_days) +'\n'
 path=stage/'GameServer'/'NPC'/f'premium-shop-{city}.npc'
 path.write_bytes(text.encode('cp949'))
for name,template,location,city in [('village-2.ase.spc',8,8,'ricarten'),('pilai.ASE.spc',27,1,'pillai')]:
 data=bytearray((source/'Field'/name).read_bytes())
 assert len(data)==50400
 empty=next(i for i in range(100) if not any(data[i*504:(i+1)*504]))
 record=bytearray(data[template*504:(template+1)*504])
 # Reuse existing established location at first. Fine positioning remains pending.
 location_record=data[location*504:(location+1)*504]
 for start in (476,480,484,492):
  record[start:start+4]=location_record[start:start+4]
 nick=b'Premium Shop'
 record[8:40]=nick+b'\0'*(32-len(nick))
 target=f'GameServer\\npc\\premium-shop-{city}.npc'.encode('ascii')
 assert len(target)<64
 record[104:168]=target+b'\0'*(64-len(target))
 existing=[struct.unpack_from('<i',data,i*504+472)[0] for i in range(100)]
 struct.pack_into('<i',record,472,max(existing)+1)
 data[empty*504:(empty+1)*504]=record
 out=stage/'GameServer'/'Field'/name
 out.write_bytes(data)
 print('STAGED_NPC',city,'SLOT',empty,'POS',tuple(struct.unpack_from('<i',record,x)[0] for x in (476,480,484)),'FILE',out)
print('STAGING_ONLY_NOT_DEPLOYED: missing other 7-day variants and the real 30-day Kit Premium implementation')
