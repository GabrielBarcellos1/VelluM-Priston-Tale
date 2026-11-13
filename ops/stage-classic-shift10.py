from pathlib import Path
p=Path(r'C:\inetpub\priston\[project]\src\sinbaram\sinCharStatus.cpp')
src=p.read_bytes().decode('latin1')
start=src.index('void cCHARSTATUS::LButtonDown(')
end=src.index('void cCHARSTATUS::LButtonUp(',start)
segment=src[start:end]
marker='\t\tif(sinChar->StatePoint >0){'
assert segment.count(marker)==1
a=segment.index(marker)
# Balanced-brace extraction, normal block ends after switch.
brace=segment.index('{',a)
depth=0
endblock=None
for j in range(brace,len(segment)):
 if segment[j]=='{':depth+=1
 elif segment[j]=='}':
  depth-=1
  if depth==0:endblock=j;break
assert endblock is not None
normal=segment[a:endblock+1]
assert 'sinChar->Strength ++;' in normal and 'case 6:' in normal
normal=normal.replace(marker,marker+'\n\t\t\t// Shift+click spends up to 10 EARNED points, one validated point per iteration.\n\t\t\tconst int vellumClicks = VRKeyBuff[VK_SHIFT] ? 10 : 1;\n\t\t\tfor(int vellumClick=0; vellumClick<vellumClicks && sinChar->StatePoint>0; ++vellumClick){',1)
normal=normal[:-1]+'\t\t\t}\n\t\t}'
# Preserve enough undo entries for shift clicks and several preceding normal clicks.
segment=segment[:a]+normal+segment[endblock+1:]
assert segment.count('for(cnt = 4; cnt >= 0')==2
segment=segment.replace('for(cnt = 4; cnt >= 0','for(cnt = 127; cnt >= 0')
import re
segment,n=re.subn(r'for\(cnt = 0; cnt < 4\s*;', 'for(cnt = 0; cnt < 127 ;',segment)
assert n>=10,n
assert 'TempStatePoint[4] =' in segment
segment=segment.replace('TempStatePoint[4] =','TempStatePoint[127] =')
assert 'TempStatePoint[5] = {0,0,0,0,0};' in src
src=src.replace('TempStatePoint[5] = {0,0,0,0,0};','TempStatePoint[128] = {0};',1)
src=src[:src.index('void cCHARSTATUS::LButtonDown(')]+segment+src[src.index('void cCHARSTATUS::LButtonUp('):]
# Source patch is staged separately. The production source file is deliberately untouched.
out=Path(r'C:\VelluM\investigation\sinCharStatus.shift10.staged.cpp')
out.parent.mkdir(parents=True,exist_ok=True)
out.write_bytes(src.encode('latin1'))
print('SHIFT_PATCH_STAGED',out,'loops',n,'bytes',out.stat().st_size)
