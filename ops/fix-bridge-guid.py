from pathlib import Path
from datetime import datetime
import shutil
files=[
 Path(r'C:\inetpub\priston\[project]\src\web\serve.py'),
 Path(r'C:\VelluM\investigation\serve-premium-debug.py')
]
old='258EAFA5-E914-47DA-95CA-C5AB0DC11B65'
new='258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
for file in files:
 s=file.read_text('utf8')
 assert s.count(old)==1,(str(file),s.count(old))
 shutil.copy2(file,file.with_name(file.name+'.before-ws-guid-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak'))
 file.write_text(s.replace(old,new),'utf8')
 print('WEBSOCKET_RFC6455_GUID_FIXED',file)
