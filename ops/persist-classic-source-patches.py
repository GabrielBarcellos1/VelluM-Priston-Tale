from pathlib import Path
from datetime import datetime
import shutil
root=Path(r'C:\inetpub\priston\[project]\src')
files={
 root/'sinbaram'/'sinCharStatus.cpp':Path(r'C:\VelluM\investigation\sinCharStatus.shift10.staged.cpp'),
 root/'SrcServer'/'OnSever.cpp':Path(r'C:\VelluM\investigation\OnSever.criar.staged.cpp')
}
backup=Path(r'C:\VelluM\backups')/('classic-source-persist-'+datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir(parents=True)
server=files[root/'SrcServer'/'OnSever.cpp'].read_bytes().decode('latin1')
a=server.index('static int PasswordDerive(');b=server.index('static BOOL OfflinePasswordOk(',a)
chunk=server[a:b]
assert 'BCryptGenRandom' in chunk and 'MoveFileExA' in chunk and '/criar' in server
server=server[:a]+'#ifndef PT_WEB\n'+chunk+'''#else
// Browser never accesses native password storage.
static int PasswordRecordCreate( const char *, char * ) { return FALSE; }
static int PasswordRecordCheck( const char *, const char * ) { return FALSE; }
static int PasswordRecordWrite( const char *, const char *, int ) { return FALSE; }
#endif

'''+server[b:]
for n,(dst,source) in enumerate(files.items()):
 shutil.copy2(dst,backup/f'{n}.original.cpp')
 dst.write_bytes(server.encode('latin1') if 'OnSever' in dst.name else source.read_bytes())
print('PERSISTED_SOURCE',backup,'SHIFT',files[root/'sinbaram'/'sinCharStatus.cpp'].stat().st_size,'SERVER',files[root/'SrcServer'/'OnSever.cpp'].stat().st_size)
