"""Apply the source-side Classic map loading gate before a WebAssembly build.

Runs on the authorized Windows game host. Rebuild game.js/game.wasm afterward,
then publish those files together with ops/map-preload/classic-sw.js and
ops/map-preload/classic-progress.js. Does not touch character/server data.
"""
from pathlib import Path
import shutil,datetime,sys
src=Path(sys.argv[1]) if len(sys.argv)>1 else Path(r'C:\inetpub\priston\[project]\src\playmain.cpp')
original=src.read_bytes()
if b'PtWeb_PrepareFieldAssets' in original:
    print('ALREADY_PATCHED',src)
    sys.exit(0)
s=original.decode('latin1').replace('\xef\xbb\xbf','')
function='smSTAGE3D *LoadStageFromField( sFIELD *lpField , sFIELD *lpSecondField )'
assert s.count(function)==1
before="""#ifdef PT_WEB
#include <emscripten.h>
EM_ASYNC_JS(void, PtWeb_PrepareFieldAssets, (const char* name), {
  if (typeof Module !== 'undefined' && typeof Module.ptWaitMap === 'function')
    await Module.ptWaitMap(UTF8ToString(name));
});
#endif
"""
s=before+s
start=s.index(function)
end=s.index('smSTAGE3D *LoadStageFromField2(',start)
section=s[start:end]
needle='\tlpstg = new smSTAGE3D;'
assert section.count(needle)==1
section=section.replace(needle, '#ifdef PT_WEB\n    PtWeb_PrepareFieldAssets(szStageFile);\n#endif\n'+needle,1)
s=s[:start]+section+s[end:]
bak=src.with_name(src.name+'.before-map-gate-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak')
shutil.copy2(src,bak)
src.write_bytes(s.encode('latin1'))
print('MAP_GATE_SOURCE_PATCHED',src,'BACKUP',bak)
