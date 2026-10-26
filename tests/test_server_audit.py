"""Transactions tested against disposable SQLite and synthetic accounts only."""
import contextlib,copy,json,random,shutil,sys,tempfile,time,unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import local_accounts as accounts
import game_control as game
import premium_store as store
import online_world as world
import admin_service as admin

class ServerAudit(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='vellum-synthetic-audit-');self.addCleanup(self.temp.cleanup)
        folder=Path(self.temp.name);(folder/'data').mkdir()
        for name in ('accounts.seed.json','characters.seed.json'):(folder/'data'/name).write_text('[]')
        for name in ('premium.json','costumes.json'):shutil.copyfile(accounts.ROOT/'data'/name,folder/'data'/name)
        self.stack=contextlib.ExitStack();self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(accounts,'ROOT',folder));self.stack.enter_context(patch.object(accounts,'DATA',folder/'db'))
        self.stack.enter_context(patch.object(game,'RNG',random.Random(42)))
        accounts.create_player('audituser','Synthetic-fixture-only-910!')
        accounts.create_player('auditadmin','Synthetic-fixture-only-910!')
        with accounts.connection() as db:db.execute("UPDATE users SET role='admin' WHERE username='auditadmin'")
        self.user={'username':'audituser','role':'player'};self.admin={'username':'auditadmin','role':'admin'}
        world.PLAYERS.clear();world.EVENTS.clear();world.SUPPORT.clear()
        accounts.manage_character(self.user,{'job':1,'action':'create','name':'Synthetic Hero'})
        self.generation=accounts.character_generation('audituser',1)
    def save(self,state,job=1,generation=None):
        return accounts.save_state(self.user,job,state,generation or self.generation,require_generation=True)
    def state(self,**kwargs):
        return {'name':'Synthetic Hero','stats':{'level':20,'gold':1000000,'exp':20000},'field':2,'savedAt':int(time.time()*1000),
                'inv':{'bag':[],'bagB':[],'equip':{},'equipB':{},'belt':[]},'warehouse':{'items':[],'gold':0},**kwargs}
    def test_login_logout_and_blocking(self):
        self.assertIsNone(accounts.login('audituser','wrong'))
        token=accounts.login('audituser','Synthetic-fixture-only-910!');self.assertEqual(accounts.user_for(token)['username'],'audituser')
        accounts.logout(token);self.assertIsNone(accounts.user_for(token))
        token=accounts.login('audituser','Synthetic-fixture-only-910!')
        with accounts.connection() as db:db.execute("UPDATE users SET blocked=1 WHERE username='audituser'")
        self.assertIsNone(accounts.user_for(token))
    def test_save_isolation_stale_generation_and_older_snapshot(self):
        s=self.state();self.save(s);old=copy.deepcopy(s);old['savedAt']-=1;old['stats']['gold']=1;self.save(old)
        self.assertEqual(accounts.load_state('audituser',1)['stats']['gold'],1000000)
        with self.assertRaises(ValueError):self.save(s,generation='obsolete')
        self.assertIsNone(accounts.load_state('auditadmin',1))
    def test_duplicate_item_across_belt_warehouse_and_bag_is_rejected(self):
        item={'code':'PL101','uid':777,'count':1,'aging':0}
        for container in ('belt','warehouse'):
            s=self.state();s['inv']['bag']=[{'x':0,'y':0,'item':copy.deepcopy(item)}]
            if container=='belt':s['inv']['belt']=[copy.deepcopy(item)]
            else:s['warehouse']['items']=[{'page':0,'x':0,'y':0,'item':copy.deepcopy(item)}]
            with self.assertRaisesRegex(ValueError,'UID repetido'):self.save(s)
    def test_malformed_inventory_and_illegal_counts_leave_saved_state_unchanged(self):
        s=self.state();self.save(s)
        for count in (0,-1,10000,1.5):
            bad=copy.deepcopy(s);bad['inv']['belt']=[{'uid':10,'code':'PL101','count':count}]
            with self.assertRaises(ValueError):self.save(bad)
        self.assertEqual(accounts.load_state('audituser',1)['inv'],s['inv'])
    def test_aged_warehouse_item_can_be_saved_but_cannot_gain_aging_outside_the_service(self):
        s=self.state();item={'code':'WA101','uid':800,'count':1,'aging':0};s['warehouse']['items']=[{'page':0,'x':0,'y':0,'item':item}];self.save(s)
        # Simulate an already confirmed server upgrade in the disposable fixture.
        item['aging']=3
        with accounts.connection() as db:db.execute('UPDATE characters SET state=? WHERE username=? AND job=1',(json.dumps(s),'audituser'))
        self.save(s)
        item['aging']=4
        with self.assertRaisesRegex(ValueError,'Aging aumentado'):self.save(s)
    def test_http_routes_authentication_csrf_and_private_file_boundaries(self):
        import http.cookiejar,threading,urllib.request,urllib.error
        import iniciar
        folder=accounts.ROOT;original=Path(__file__).resolve().parents[1]
        for name in ('balance.json','loot-items.json'):shutil.copyfile(original/'data'/name,folder/'data'/name)
        for name in ('gm-tools.mjs','balance-rules.mjs','quest-progress.mjs','skill-runtime.mjs'):shutil.copyfile(original/name,folder/name)
        self.stack.enter_context(patch.object(iniciar,'ROOT',folder));self.stack.enter_context(patch.object(iniciar,'CACHE',folder/'cache'))
        server=iniciar.LocalServer(('127.0.0.1',0),iniciar.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        self.addCleanup(server.server_close);self.addCleanup(server.shutdown)
        base='http://127.0.0.1:'+str(server.server_port);client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        def req(path,data=None,headers=None):
            h={'Content-Type':'application/json',**(headers or {})};r=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers=h)
            try:
                with client.open(r,timeout=5) as response:return response.status,response.headers,response.read()
            except urllib.error.HTTPError as error:return error.code,error.headers,error.read()
        self.assertEqual(req('/api/local/me')[0],401)
        self.assertEqual(req('/api/local/state',{'job':1})[0],401)
        self.assertEqual(req('/api/local/login',{'username':'audituser','password':'Synthetic-fixture-only-910!'})[0],200)
        self.assertEqual(req('/api/local/me')[0],200)
        self.assertEqual(req('/api/local/state',{'job':1}, {'Origin':'https://untrusted.invalid'})[0],403)
        self.assertEqual(req('/%2e%2e/data/accounts.seed.json')[0],400)
        self.assertEqual(req('/data/accounts.seed.json')[0],404)
        status,headers,body=req('/balance-rules.mjs');self.assertEqual(status,200);self.assertEqual(headers['Cache-Control'],'no-store');self.assertIn(b'export function',body)
        self.assertEqual(json.loads(req('/api/local/balance')[2])['targetHoursTo120'],300)
        items=json.loads(req('/assets/items.json')[2]);self.assertEqual(next(i for i in items if i['code']=='PM104')['price'],200)
        self.assertFalse(any(i.get('gmOnly') for i in items))
        self.assertEqual(req('/gm-tools.mjs')[0],200)
        self.assertEqual(req('/assets/image/freeston/gm/sheltom.svg')[0],200)
        self.assertEqual(req('/assets/image/freeston/gm/potion.svg')[0],200)
        self.assertEqual(req('/api/local/game/gm',{'action':'grant','generation':self.generation,'job':1})[0],403)
    def test_grant_and_purchase_replays_do_not_duplicate_coins_or_stock(self):
        grant={'username':'audituser','amount':10000,'requestId':'audit-grant-001'}
        store.transact(self.admin,'grant',grant);self.assertTrue(store.transact(self.admin,'grant',grant)['repeated'])
        self.assertEqual(store.wallet('audituser')['coins'],10000)
        product=next(p for p in store.wallet('audituser')['catalog'] if not p.get('permanent') and p['kind']!='item' and p['price']<=10000)
        buy={'code':product['code'],'count':1,'requestId':'audit-purchase-001','expectedTotal':product['price']}
        store.transact(self.user,'purchase',buy);store.transact(self.user,'purchase',buy)
        w=store.wallet('audituser');self.assertEqual(w['coins'],10000-product['price']);self.assertEqual(next(s for s in w['stock'] if s['code']==product['code'])['quantity'],1)
        with self.assertRaises(ValueError):store.transact(self.user,'purchase',{**buy,'count':2})
        with self.assertRaises(PermissionError):store.transact(self.user,'grant',grant)
    def test_concurrent_duplicate_grants_are_atomic(self):
        data={'username':'audituser','amount':100,'requestId':'audit-concurrent-grant'}
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:store.transact(self.admin,'grant',data),range(2)))
        self.assertEqual(store.wallet('audituser')['coins'],100);self.assertEqual(sum(bool(r.get('repeated')) for r in results),1)
    def test_kill_replay_and_pickup_cannot_be_collected_twice(self):
        monster=next(m for m in game.MONSTERS.values() if 2 in m['maps'] and not m.get('boss'))
        s=self.state();self.save(s)
        data={'job':1,'generation':self.generation,'monster':monster['id'],'map':2,'requestId':'audit-kill-001'}
        first=game.kill(self.user,data);again=game.kill(self.user,data);self.assertTrue(again['repeated'])
        self.assertEqual(accounts.load_state('audituser',1)['stats']['gold'],1000000+first['gold'])
        with accounts.connection() as db:
            game.setup(db);event_id=game.event(db,self.user,'drop.equipment','drop',job=1,code='WA101',quantity=1,status='generated')
        p={'job':1,'generation':self.generation,'eventId':event_id,'requestId':'audit-pickup-001'}
        game.pickup(self.user,p);self.assertTrue(game.pickup(self.user,p)['repeated'])
        with self.assertRaises(ValueError):game.pickup(self.user,{**p,'requestId':'audit-pickup-002'})
    def test_deleted_character_generation_cannot_be_restored_by_an_old_save(self):
        s=self.state();self.save(s)
        accounts.manage_character(self.user,{'action':'delete','job':1,'generation':self.generation,'confirmation':'Synthetic Hero','password':'Synthetic-fixture-only-910!'})
        accounts.manage_character(self.user,{'action':'create','job':1,'name':'New Synthetic Hero'})
        with self.assertRaises(ValueError):self.save(s)
        self.assertNotEqual(accounts.character_generation('audituser',1),self.generation)
    def test_potion_mix_and_aging_damage_are_defined_for_every_supported_class(self):
        self.assertEqual([game.common_potion(80,r) for r in (0,.449,.45,.799,.8,.999)],['PL104','PL104','PM104','PM104','PS104','PS104'])
        self.assertEqual(game.common_potion(1,.5),'PM101')
        for code in ('WA101','WH101','WS101','WP101','WT101','WS201','WM101','WD101','WN101','WV101'):
            item={'code':code,'aging':0,'damage':[10,20],'attackRating':50,'critical':3};game.apply_aging_attributes(item,6)
            self.assertGreater(item['damage'][0],10);self.assertEqual(item['aging'],6)
            game.apply_aging_attributes(item,0);self.assertEqual(item['damage'],[10,20])
    def test_admin_endpoints_reject_players(self):
        for function in (admin.products,admin.users,admin.logs):
            with self.assertRaises(PermissionError):function(self.user)
    def test_zip_update_rejects_traversal_and_preserves_private_progress(self):
        import update_client
        from zipfile import ZipFile
        root=accounts.ROOT/'update-fixture';root.mkdir()
        for name in update_client.BACKEND:
            path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(b'synthetic-backend')
        (root/'login.mjs').write_bytes(b'old interface');(root/'data/accounts.seed.json').write_bytes(b'private fixture')
        archive=root/'candidate.zip'
        with ZipFile(archive,'w') as z:
            for name in update_client.BACKEND:z.writestr(name,b'synthetic-backend')
            z.writestr('login.mjs',b'new interface');z.writestr('data/accounts.seed.json',b'cannot replace private data')
        self.assertEqual(update_client.apply_update(archive,root),1)
        self.assertEqual((root/'login.mjs').read_bytes(),b'new interface');self.assertEqual((root/'data/accounts.seed.json').read_bytes(),b'private fixture')
        with ZipFile(archive,'a') as z:z.writestr('../escape.txt',b'invalid')
        with self.assertRaises(ValueError):update_client.apply_update(archive,root)
        self.assertFalse((root.parent/'escape.txt').exists())
    def test_zip_backend_change_and_write_failure_do_not_partially_replace_the_interface(self):
        import update_client
        from zipfile import ZipFile
        root=accounts.ROOT/'update-rollback';root.mkdir()
        for name in update_client.BACKEND:
            path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(b'backend')
        (root/'login.mjs').write_bytes(b'old')
        archive=root/'update.zip'
        with ZipFile(archive,'w') as z:
            for name in update_client.BACKEND:z.writestr(name,b'backend')
            z.writestr('login.mjs',b'new')
        native=update_client.replace
        def fail_new(path,data):
            if path==root/'login.mjs' and data==b'new':raise OSError('Synthetic write failure')
            return native(path,data)
        with patch.object(update_client,'replace',side_effect=fail_new):
            with self.assertRaises(OSError):update_client.apply_update(archive,root)
        self.assertEqual((root/'login.mjs').read_bytes(),b'old')
        (root/'game_control.py').write_bytes(b'changed backend')
        with self.assertRaisesRegex(ValueError,'servidor Python'):update_client.apply_update(archive,root)
        self.assertEqual((root/'login.mjs').read_bytes(),b'old')

if __name__=='__main__':unittest.main()
