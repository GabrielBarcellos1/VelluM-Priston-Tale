from pathlib import Path
import hashlib,base64,socket,urllib.request,re,json
root=Path(r'C:\VelluM\classic-server-test')
stage=Path(r'C:\VelluM\investigation\premium-shop-stage')
items=root/'GameServer'/'OpenItem'
checks={}
codes=[f'BI{i}' for i in range(300,319)]
checks['all_19_item_files']=all((items/(code+'.txt')).is_file() for code in codes)
checks['item_id_and_price_match']=all(
  ('*코드\t"'+code+'"') in (items/(code+'.txt')).read_bytes().decode('cp949')
  and any(l.startswith('*가격\t') and l.split('\t')[1].isdigit() for l in (items/(code+'.txt')).read_bytes().decode('cp949').splitlines())
  for code in codes)
skus=['BI300','BI302','BI304','BI306','BI308','BI310','BI312','BI314','BI316','BI318']
for city in ['ricarten','pillai']:
 data=(root/'GameServer'/'NPC'/('premium-shop-'+city+'.npc')).read_bytes().decode('cp949')
 checks[city+'_npc_name_and_skus']='*Name\t"Premium Shop"' in data and all(x in data for x in skus)
checks['ricarten_field_reference']=b'premium-shop-ricarten.npc' in (root/'GameServer'/'Field'/'village-2.ase.spc').read_bytes()
checks['pillai_field_reference']=b'premium-shop-pillai.npc' in (root/'GameServer'/'Field'/'pilai.ASE.spc').read_bytes()
code=(stage/'OnSever.premium-final-safety.staged.cpp').read_text('latin1')
checks['kit_nine_slot_guard']='if (freeEntries<9 || registered!=9)' in code
checks['kit_nine_unique_rewards']=all(f'sinBI2|sin{i}' in code for i in range(39,56,2))
checks['server_price_guard']='expectedPrice' in code and 'lpPlayInfo->ServerMoney<expectedPrice' in code
checks['gravity_server_expiry']='smCharInfo.dwTemp[10]' in code
checks['client_all_nine_effects']=all(f'case {i}:' in (stage/'HaPremiumItem.premium-gravity.staged.cpp').read_text('latin1') for i in range(160,178))
checks['client_gravity_expiration']='sinChar->dwTemp[10]' in (stage/'sinCharStatus.premium-gravity.staged.cpp').read_text('latin1')
for port in (10007,10008,19065):
 with socket.socket() as sock:
  sock.settimeout(2)
  checks[f'port_{port}_listening']=sock.connect_ex(('127.0.0.1',port))==0
resp=urllib.request.urlopen('http://127.0.0.1:8101/',timeout=15)
checks['test_page_http_200']=resp.status==200
for asset in ('game.js','game.wasm'):
 req=urllib.request.urlopen('http://127.0.0.1:8101/'+asset,timeout=20)
 checks['test_'+asset+'_http_200']=req.status==200
key=base64.b64encode(b'priston-test-123').decode()
expected=base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
with socket.create_connection(('127.0.0.1',8101),timeout=10) as sock:
 sock.sendall(('GET /ws.ashx?port=10008 HTTP/1.1\r\nHost: 127.0.0.1:8101\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: '+key+'\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
 response=sock.recv(2048).decode('latin1')
 checks['test_bridge_websocket_handshake']='101 Switching Protocols' in response and 'Sec-WebSocket-Accept: '+expected in response
passed=sum(checks.values())
print(json.dumps({'passed':passed,'total':len(checks),'checks':checks},indent=2))
report=Path(r'C:\VelluM\investigation\premium-stage-verification-20261113.json')
report.write_text(json.dumps({'passed':passed,'total':len(checks),'checks':checks,'not_validated':['real character login','buy and gold deduction','kit nine-item delivery','timers persist after relog','server crash/disconnect rollback']},indent=2),encoding='utf8')
if passed<len(checks):raise SystemExit(1)
