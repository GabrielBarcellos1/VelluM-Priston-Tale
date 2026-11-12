"""Build three compact area/NPC resource packs for VelluM Classic.
Source bytes are unchanged; hash from live manifest is stored for SW cache validation.
Format PTPB + u32 entries; each: u16 pathBytes, UTF8 path, u16 hashBytes, hash,
u32 contentBytes, original file bytes. Pack entire stream is gzip compressed.
"""
from pathlib import Path
import gzip,struct,io,sys,json
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(r'C:\VelluM\integration-priston')
source=Path(r'C:\inetpub\priston\data')
manifest=root/'data_manifest.txt'
out=root/'packs';out.mkdir(exist_ok=True)
entries=[]
for line in manifest.read_text('utf8').splitlines():
 f=line.split('\t')
 if len(f)>2:
  try:entries.append((f[0],int(f[1]),f[2].strip()))
  except ValueError:pass
groups={
 'ricarten':('Field/Ricarten/',29*1048576,None),
 'forest':('Field/forest/',22*1048576,None),
 'npc-core':('char/npc/',20*1048576,('.smd','.inx','.bmp','.tga'))
}
for tag,(prefix,budget,extensions) in groups.items():
 picked=[];used=0
 for rel,size,h in entries:
  if not rel.startswith(prefix) or (extensions and not rel.lower().endswith(extensions)):continue
  if used+size>budget:continue
  file=source.joinpath(*rel.split('/'))
  if not file.is_file() or file.stat().st_size!=size:continue
  picked.append((rel,h,file,size));used+=size
 target=out/(tag+'.ptpb.gz')
 with target.open('wb') as output:
  with gzip.GzipFile(fileobj=output,mode='wb',compresslevel=5,mtime=0) as gz:
   gz.write(b'PTPB'+struct.pack('<I',len(picked)))
   for rel,h,file,size in picked:
    name=rel.encode('utf8');digest=h.encode('ascii')
    gz.write(struct.pack('<H',len(name))+name+struct.pack('<H',len(digest))+digest+struct.pack('<I',size))
    with file.open('rb') as inp:
     while (part:=inp.read(512*1024)):gz.write(part)
 print(tag,'files',len(picked),'raw MB',round(used/1e6,2),'compressed MB',round(target.stat().st_size/1e6,2),'out',target)