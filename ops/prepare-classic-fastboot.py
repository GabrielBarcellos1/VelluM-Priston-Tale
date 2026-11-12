"""Prepare an optimized compressed start pack and patch the compiled web loader.
Only affects the isolated Classic Lab folder; original Priston and VelluM untouched.
"""
import gzip,os,shutil,sys
from pathlib import Path
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(r'C:\VelluM\integration-priston')
pack=root/'data_startup.pack'
compressed=root/'data_startup.pack.gz'
if not pack.is_file():raise SystemExit('Missing startup pack')
if not compressed.is_file() or compressed.stat().st_mtime_ns < pack.stat().st_mtime_ns:
 tmp=root/'data_startup.pack.gz.partial'
 with pack.open('rb') as src,gzip.open(tmp,'wb',compresslevel=5) as out:
  shutil.copyfileobj(src,out,1024*1024)
 os.replace(tmp,compressed)
js=root/'game.js'
s=js.read_text(encoding='utf8')
if 'compressedPack?' not in s:
 old='var startupPack=fetch(isServer?"data_server.pack":"data_startup.pack")'
 new='var compressedPack=!isServer&&typeof DecompressionStream!=="undefined";var startupPack=fetch(isServer?"data_server.pack":compressedPack?"data_startup.pack.gz":"data_startup.pack")'
 assert old in s,'Unexpected loader layout: abort instead of altering it.'
 s=s.replace(old,new,1)
 old='}).catch(function(e){console.warn("start-up pack not used",e);return null});var saves='
 new='}).then(function(buf){if(!compressedPack||!buf)return buf;return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer().then(function(ab){return new Uint8Array(ab)})}).catch(function(e){console.warn("start-up pack not used",e);return null});var saves='
 assert old in s,'Unexpected startup loader handler: abort.'
 js.write_text(s.replace(old,new,1),encoding='utf8')
print('STARTUP_PACK',pack.stat().st_size,'COMPRESSED',compressed.stat().st_size,'LOADER_PATCHED', 'compressedPack?' in js.read_text(encoding='utf8'))