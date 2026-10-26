"""Disposable SQLite: shared bosses, secure draws and transactional delivery."""
import copy,json,time,uuid
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from test_server_audit import ServerAudit
import boss_roulette as boss
import local_accounts as accounts
import game_control as game

class BossRoulette(ServerAudit):
    def setUp(self):
        super().setUp();self.stack.enter_context(patch.object(boss,'ROUND_SECONDS',0))
        self.second={'username':'auditsecond','role':'player'}
        accounts.create_player('auditsecond','Synthetic-fixture-only-910!')
        for user in (self.second,self.admin):accounts.manage_character(user,{'action':'create','job':1,'name':'Hero '+user['username']})
        for user in (self.user,self.second,self.admin):
            accounts.save_state(user,1,self.state(field=31,position={'x':0,'z':0}),accounts.character_generation(user['username'],1),require_generation=True)
    def call(self,action,user=None,**values):
        user=user or self.user
        return boss.action(user,{'action':action,'job':1,'generation':accounts.character_generation(user['username'],1),'requestId':uuid.uuid4().hex,**values})
    def spawn(self,forced=False):
        return self.call('spawn' if forced else 'observe',self.admin if forced else self.user,monster='dn-monster-144',forceDrop=forced,x=0,y=0,z=0)['boss']
    def die(self,forced=False,two=True):
        b=self.spawn(forced)
        if two:self.call('hit',encounter=b['id'],damage=1)
        self.call('hit',self.second if two else self.user,encounter=b['id'],damage=b['hpMax'])
        return b
    def test_every_participant_gets_new_number_in_three_to_five_rounds(self):
        self.die();result=self.call('state');self.assertIn(len(result['rounds']),(3,4,5))
        for r in result['rounds']:
            self.assertEqual(len(r['rolls']),2)
            self.assertTrue(all(type(p['number']) is int and 0<=p['number']<=1000 for p in r['rolls']))
            winner=next(p for p in r['rolls'] if p['ticket']==r['winner'])
            self.assertEqual(winner['number'],max(p['number'] for p in r['rolls']))
            self.assertNotIn('username',r['rolls'][0])
    def test_forced_valento_has_exactly_one_ring_and_regular_rounds(self):
        self.die(True);rounds=self.call('state')['rounds']
        self.assertEqual(sum(r['item']['code']=='OR205' for r in rounds),1)
        self.assertEqual(sum(r['rare'] for r in rounds),1)
    def test_spawn_permission_and_wrong_map(self):
        with self.assertRaises(PermissionError):self.call('spawn',monster='dn-monster-144',forceDrop=True)
        s=accounts.load_state('audituser',1);s['field']=3;s['savedAt']+=1;self.save(s)
        with self.assertRaises(ValueError):self.call('observe',monster='dn-monster-144')
    def test_observation_reuses_one_shared_hp_and_cooldown(self):
        a=self.spawn();b=self.call('observe',self.second,monster='dn-monster-144')['boss'];self.assertEqual(a['id'],b['id'])
        self.call('hit',encounter=a['id'],damage=10);self.assertEqual(self.call('state',self.second)['bosses'][0]['hp'],a['hpMax']-10)
    def test_hit_replay_and_late_hits_cannot_create_extra_rounds(self):
        b=self.spawn();data={'action':'hit','job':1,'generation':self.generation,'encounter':b['id'],'damage':b['hpMax'],'requestId':uuid.uuid4().hex}
        boss.action(self.user,data);self.assertTrue(boss.action(self.user,data)['repeated'])
        self.call('hit',self.second,encounter=b['id'],damage=10)
        self.assertTrue(all(len(r['rolls'])==1 for r in self.call('state')['rounds']))
        with accounts.connection() as db:self.assertIn(db.execute('SELECT count(*) FROM boss_awards').fetchone()[0],(3,4,5))
    def test_claim_only_winner_once_and_full_bag_keeps_award(self):
        self.die(two=False);awards=self.call('state')['awards'];self.assertTrue(awards)
        with self.assertRaises(ValueError):self.call('claim',self.second,award=awards[0]['id'],savedAt=0)
        s=accounts.load_state('audituser',1);block=npc_item('WA101',1);block.update(w=12,h=6);other=copy.deepcopy(block);other['uid']=2
        s['inv']['bag']=[{'x':0,'y':0,'item':block}];s['inv']['bagB']=[{'x':0,'y':0,'item':other}];s['savedAt']+=1;self.save(s)
        with self.assertRaisesRegex(ValueError,'espaço'):self.call('claim',award=awards[0]['id'],savedAt=s['savedAt'])
        self.assertEqual(len(self.call('state')['awards']),len(awards))
        s['inv']['bag']=[];s['inv']['bagB']=[];s['savedAt']+=1;self.save(s)
        data={'action':'claim','job':1,'generation':self.generation,'award':awards[0]['id'],'savedAt':s['savedAt'],'requestId':uuid.uuid4().hex}
        first=boss.action(self.user,data);self.assertTrue(boss.action(self.user,data)['repeated']);self.assertEqual(len(first['state']['inv']['bag']),1)
        self.assertEqual(len(self.call('state')['awards']),len(awards)-1)
    def test_zero_and_hundred_percent_rare_and_config_version(self):
        cfg=next(b for b in boss.configs(self.admin)['bosses'] if b['name']=='Valento')
        value={'rareChance':0,'common':[{'code':'OS108','weight':1}],'rare':[{'code':'OR205','weight':1}]}
        boss.save_config(self.admin,{'monster':cfg['id'],'version':cfg['version'],'value':value})
        self.die();self.assertFalse(any(r['rare'] for r in self.call('state')['rounds']))
        with self.assertRaises(ValueError):boss.save_config(self.admin,{'monster':cfg['id'],'version':cfg['version'],'value':value})
        value['rareChance']=100;boss.save_config(self.admin,{'monster':cfg['id'],'version':1,'value':value})
        self.call('spawn',self.admin,monster=cfg['id']);b=self.call('state')['bosses'][-1];self.call('hit',encounter=b['id'],damage=b['hpMax'])
        latest=[r for r in self.call('state')['rounds'] if r['encounter']==b['id']];self.assertEqual(sum(r['rare'] for r in latest),1)
    def test_hidden_rounds_and_pending_awards_survive_reconnect(self):
        with patch.object(boss,'ROUND_SECONDS',5):self.die(two=False)
        self.assertEqual(self.call('state')['rounds'],[]);self.assertEqual(self.call('state')['awards'],[])
        with accounts.connection() as db:db.execute("UPDATE boss_rounds SET data=json_set(data,'$.revealAt',0)")
        self.assertGreaterEqual(len(self.call('state')['awards']),3)
    def test_all_tied_players_use_explicit_random_tiebreak(self):
        with patch.object(boss.RNG,'randint',side_effect=lambda low,high:3 if low==3 else 500):self.die()
        self.assertTrue(all(r['tiebreak'] for r in self.call('state')['rounds']))
    def test_normal_kill_endpoint_cannot_bypass_boss_roulette(self):
        with self.assertRaisesRegex(ValueError,'roleta'):game.kill(self.user,{'job':1,'generation':self.generation,'map':31,'monster':'dn-monster-144','requestId':uuid.uuid4().hex})
    def test_concurrent_final_hits_create_one_roulette(self):
        b=self.spawn();self.call('hit',encounter=b['id'],damage=1);self.call('hit',self.second,encounter=b['id'],damage=1)
        with accounts.connection() as db:db.execute('UPDATE boss_hits SET last=0')
        with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(lambda user:self.call('hit',user,encounter=b['id'],damage=b['hpMax']),[self.user,self.second]))
        rounds=self.call('state')['rounds'];self.assertIn(len(rounds),(3,4,5));self.assertTrue(all(len(r['rolls'])==2 for r in rounds))
    def test_bad_config_rare_in_common_and_stale_character_are_rejected(self):
        with self.assertRaises(PermissionError):boss.configs(self.user)
        value={'rareChance':1,'common':[{'code':'OR205','weight':1}],'rare':[]}
        with self.assertRaises(ValueError):boss.save_config(self.admin,{'monster':'dn-monster-144','version':0,'value':value})
        with self.assertRaises(ValueError):boss.action(self.user,{'action':'state','job':1,'generation':'obsolete'})
    def test_http_authentication_commands_and_admin_configuration(self):
        import iniciar,http.cookiejar,threading,urllib.request,urllib.error
        server=iniciar.LocalServer(('127.0.0.1',0),iniciar.Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
        self.addCleanup(server.server_close);self.addCleanup(server.shutdown)
        client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));base='http://127.0.0.1:'+str(server.server_port)
        def request(path,data=None):
            req=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'})
            try:
                with client.open(req,timeout=5) as r:return r.status,r.read()
            except urllib.error.HTTPError as e:return e.code,e.read()
        payload={'action':'spawn','job':1,'generation':self.generation,'monster':'dn-monster-144','forceDrop':True,'requestId':uuid.uuid4().hex}
        self.assertEqual(request('/api/local/game/boss',payload)[0],401)
        request('/api/local/login',{'username':'audituser','password':'Synthetic-fixture-only-910!'})
        self.assertEqual(request('/api/local/game/boss',payload)[0],403)
        self.assertEqual(request('/api/local/admin/boss-config',{})[0],403)
        request('/api/local/login',{'username':'auditadmin','password':'Synthetic-fixture-only-910!'})
        self.assertEqual(request('/api/local/admin/boss-config',{})[0],200)
        payload['generation']=accounts.character_generation('auditadmin',1)
        status,body=request('/api/local/game/boss',payload);self.assertEqual(status,200);self.assertGreater(json.loads(body)['boss']['hp'],0)
        self.assertEqual(request('/boss-roulette.mjs')[0],200);self.assertEqual(request('/boss-admin.mjs')[0],200)

def npc_item(code,uid):
    import npc_services
    item=npc_services.item_instance(code,[]);item['uid']=uid;return item
for _name in list(vars(ServerAudit)):
    if _name.startswith('test_') and _name not in vars(BossRoulette):setattr(BossRoulette,_name,None)
del ServerAudit
