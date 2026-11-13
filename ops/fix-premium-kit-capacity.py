from pathlib import Path
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
server=stage/'OnSever.premium-all9.staged.cpp'
s=server.read_bytes().decode('latin1')
assert s.count('if (freeEntries<8 || registered!=9)')==1
s=s.replace('if (freeEntries<8 || registered!=9)','if (freeEntries<9 || registered!=9)')
dest=stage/'OnSever.premium-final-safety.staged.cpp'
dest.write_bytes(s.encode('latin1'))
print('FIXED_KIT_NINE_SLOTS',dest.stat().st_size)
