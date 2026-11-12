"""Limit concurrently active ASP.NET Classic WebSocket bridge sessions.
No per-IP quotas because Cloudflare Tunnel/NAT can make players share addresses.
"""
from pathlib import Path
import re,sys,shutil,datetime
mode=sys.argv[1] if len(sys.argv)>1 else 'stage'
if mode not in ('stage','prod'):raise SystemExit('stage|prod required')
root=Path(r'C:\VelluM\classic-client-test' if mode=='stage' else r'C:\VelluM\integration-priston')
p=root/'ws.ashx'
s=p.read_text('utf8')
if 'MaxClassicSockets' in s:print('ALREADY_PATCHED',p);sys.exit(0)
backup=p.with_name(p.name+'.before-quota-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak')
shutil.copy2(p,backup)
original='public class PristonBridge : IHttpHandler\n{'
assert s.count(original)==1
s=s.replace(original,original+'\n    private static int ActiveClassicSockets = 0;\n    private const int MaxClassicSockets = 64;\n',1)
pattern=r'context\.AcceptWebSocketRequest\(\s*ws\s*=>\s*Bridge\(\s*ws\.WebSocket\s*,\s*(port|10008)\s*\)\s*\);'
m=re.search(pattern,s)
assert m, 'Unexpected bridge callback layout'
dest=m.group(1)
new='''// Bound concurrent upgraded sockets so unauthenticated requests cannot
        // consume unbounded IIS/network resources.
        if ( Interlocked.Increment(ref ActiveClassicSockets)>MaxClassicSockets ) {
            Interlocked.Decrement(ref ActiveClassicSockets);
            context.Response.StatusCode = 503;
            return;
        }
        try {
            context.AcceptWebSocketRequest( async ws => {
                try { await Bridge( ws.WebSocket, %s ); }
                finally { Interlocked.Decrement(ref ActiveClassicSockets); }
            } );
        }
        catch {
            Interlocked.Decrement(ref ActiveClassicSockets);
            throw;
        }'''%dest
s=s[:m.start()]+new+s[m.end():]
p.write_text(s,'utf8')
print('QUOTA_PATCHED',mode,'DEST',dest,'BACKUP',backup)