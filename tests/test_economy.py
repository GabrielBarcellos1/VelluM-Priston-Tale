"""Map economy and scheduled effects exercised on disposable data only."""
import copy,json,random,time,uuid
from unittest.mock import patch
from test_server_audit import ServerAudit
import server_economy as economy
import game_control as game
import local_accounts as accounts
import npc_services as npc

class Economy(ServerAudit):
    def config(self,field=37,**changes):
        p=economy.base_policy();p.update(custom=True,potionChance=0,**changes)
        economy.save_map(self.admin,{'maps':[field],'versions':{str(field):0},'value':p});return p
    def event(self,kind,params,maps=None,start=None,end=None,enabled=True):
        now=time.time();return economy.save_event(self.admin,{'version':0,'value':{'name':'Synthetic '+kind,'kind':kind,'params':params,'maps':maps or [],'start':start if start is not None else now-60,'end':end if end is not None else now+3600,'enabled':enabled}})
    def monster(self,field=37):return next(m for m in game.MONSTERS.values() if field in m['maps'] and not m.get('boss') and any(m.get('attack',[])))
    def test_exact_80d_never_drops_other_level_80_equipment(self):
        self.config(equipment=[{'label':'80D','chance':100,'minLevel':80,'maxLevel':80,'codes':economy.TIER80D}],gold={'chance':100,'min':1,'max':100})
        with accounts.connection() as db:
            game.setup(db)
            for _ in range(100):
                result=economy.roll(db,self.monster(),37,rng=random.Random(_));self.assertTrue(1<=result['gold']<=100)
                self.assertEqual(len(result['items']),1);self.assertIn(result['items'][0][0],economy.TIER80D);self.assertNotEqual(result['items'][0][0],'DA122')
    def test_gold_expected_value_and_thirty_percent_monte_carlo(self):
        self.config(gold={'chance':30,'min':1,'max':100});self.assertEqual(economy.preview(self.admin,{'field':37})['expectedGoldPer1000'],15150)
        rng=random.Random(400)
        with accounts.connection() as db:
            game.setup(db);values=[economy.roll(db,self.monster(),37,rng=rng)['gold'] for _ in range(5000)]
        self.assertAlmostEqual(sum(v>0 for v in values)/len(values),.30,delta=.025);self.assertAlmostEqual(sum(values)/len(values),15.15,delta=1)
    def test_zero_probability_paused_map_and_wrong_monster_cannot_be_bypassed(self):
        self.config(paused=True,equipment=[{'label':'80D','chance':100,'minLevel':80,'maxLevel':80,'codes':economy.TIER80D}])
        self.event('sheltoms',{'chance':100,'min':1,'max':10});self.event('gold',{'multiplier':10})
        with accounts.connection() as db:
            game.setup(db);r=economy.roll(db,self.monster(),37,premium_extra=[100,100]);self.assertEqual(r['gold'],0);self.assertEqual(r['items'],[])
            r=economy.roll(db,self.monster(),3,premium_extra=100);self.assertEqual(r['items'],[])
    def test_event_schedule_scope_pause_and_highest_multiplier(self):
        self.event('xp',{'multiplier':2},[37],start=100,end=200);self.event('xp',{'multiplier':3},[37],start=120,end=180)
        self.event('xp',{'multiplier':10},[37],start=100,end=200,enabled=False)
        with accounts.connection() as db:
            game.setup(db);self.assertEqual(economy.effects(db,37,99)['xp'],1);self.assertEqual(economy.effects(db,37,100)['xp'],2);self.assertEqual(economy.effects(db,37,150)['xp'],3);self.assertEqual(economy.effects(db,37,200)['xp'],1);self.assertEqual(economy.effects(db,3,150)['xp'],1)
    def test_sheltoms_never_exceed_selected_tier_including_moriph(self):
        self.config(gold={'chance':0,'min':0,'max':0})
        self.event('moriph',{'chance':100,'min':4,'max':6,'discount':50,'successBonus':10},[37])
        with accounts.connection() as db:
            game.setup(db)
            for n in range(50):
                r=economy.roll(db,self.monster(),37,rng=random.Random(n));self.assertEqual(len(r['items']),1);self.assertIn(r['items'][0][0],['OS104','OS105','OS106'])
    def test_bulk_copy_is_atomic_and_preserves_other_maps(self):
        p=self.config();payload={'maps':[37,38],'versions':{'37':0,'38':0},'value':p}
        with self.assertRaises(ValueError):economy.save_map(self.admin,payload)
        with accounts.connection() as db:self.assertEqual(economy.policy(db,38)['version'],0)
        payload['versions']['37']=1;economy.save_map(self.admin,payload)
        with accounts.connection() as db:self.assertEqual(economy.policy(db,38)['gold'],p['gold']);self.assertFalse(economy.policy(db,3)['custom'])
    def test_validation_rejects_boss_items_empty_groups_and_bad_ranges(self):
        p=economy.base_policy();p['custom']=True
        for row in [{'label':'bad','minLevel':80,'maxLevel':80,'chance':100,'codes':['OR205']},{'label':'bad','minLevel':199,'maxLevel':200,'chance':100,'codes':[]}]:
            p['equipment']=[row]
            with self.assertRaises(ValueError):economy.validate_policy(p)
        p['equipment']=[];p['gold']['max']=-1
        with self.assertRaises(ValueError):economy.validate_policy(p)
        with self.assertRaises(PermissionError):economy.admin_data(self.user)
    def test_drop_events_and_premiums_do_not_escape_configured_equipment_pool(self):
        self.config(equipment=[{'label':'80D','minLevel':80,'maxLevel':80,'chance':50,'codes':['DA121']}],gold={'chance':0,'min':0,'max':0})
        self.event('drops',{'multiplier':2})
        with accounts.connection() as db:
            game.setup(db);r=economy.roll(db,self.monster(),37,premium_extra=[100,100]);self.assertEqual(r['items'],[('DA121',1,'equipment')]*3)
    def test_aging_bonus_preserves_total_chance_and_zero_fee_works(self):
        teacher=next(n for n in game.NPCS.values() if 'aging' in n.get('services',[]));self.event('moriph',{'discount':100,'successBonus':100,'chance':0,'min':1,'max':10},[teacher['map']])
        s=self.state(field=teacher['map'],position={'x':teacher['x'],'z':teacher['z']});s['stats']['gold']=0
        weapon=npc.item_instance('WA101',[]);s['inv']['bag']=[{'x':0,'y':0,'item':weapon}];ids=[]
        for i,code in enumerate(['OS101','OS102','OS103']):
            item=npc.item_instance(code,[p['item'] for p in s['inv']['bag']]);ids.append(item['uid']);s['inv']['bag'].append({'x':i+3,'y':0,'item':item})
        self.save(s);r=game.aging(self.user,{'job':1,'generation':self.generation,'npcId':teacher['id'],'item':weapon['uid'],'sheltoms':ids,'savedAt':s['savedAt'],'requestId':uuid.uuid4().hex});self.assertEqual(r['gold'],0);self.assertIn(r['newAge'],[1,2])
        with accounts.connection() as db:
            row,fee=economy.aging_terms(db,teacher['map'],{'plus1':10,'plus2':10,'minus1':20,'minus2':20,'destroy':20,'kept':20},100)
            self.assertEqual(sum(row.values()),100);self.assertEqual(row['plus1']+row['plus2'],100);self.assertEqual(fee,0)
    def test_actual_kill_uses_map_policy_and_request_replay(self):
        self.config(equipment=[{'label':'80D','minLevel':80,'maxLevel':80,'chance':100,'codes':['DA121']}],gold={'chance':100,'min':100,'max':100})
        s=self.state(field=37);self.save(s);payload={'job':1,'generation':self.generation,'map':37,'monster':self.monster()['id'],'requestId':uuid.uuid4().hex}
        r=game.kill(self.user,payload);self.assertEqual(r['gold'],100);self.assertEqual(r['items'][0]['code'],'DA121');self.assertTrue(game.kill(self.user,payload)['repeated']);self.assertEqual(accounts.load_state('audituser',1)['stats']['gold'],1000100)
    def test_event_versions_and_bounds(self):
        r=self.event('xp',{'multiplier':2});
        with self.assertRaises(ValueError):economy.save_event(self.admin,{'id':r['id'],'version':0,'value':{'kind':'xp','name':'Stale','enabled':True,'start':0,'end':200,'maps':[],'params':{'multiplier':3}}})
        with self.assertRaises(ValueError):self.event('sheltoms',{'chance':100,'min':1,'max':99})
        with self.assertRaises(ValueError):self.event('xp',{'multiplier':999})
    def test_http_permissions_runtime_and_admin_tabs_modules(self):
        import iniciar,http.cookiejar,threading,urllib.request,urllib.error
        self.save(self.state())
        server=iniciar.LocalServer(('127.0.0.1',0),iniciar.Handler);threading.Thread(target=server.serve_forever,daemon=True).start();self.addCleanup(server.server_close);self.addCleanup(server.shutdown)
        client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));base='http://127.0.0.1:'+str(server.server_port)
        def request(path,data=None):
            req=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'})
            try:
                with client.open(req,timeout=5) as r:return r.status,r.read()
            except urllib.error.HTTPError as e:return e.code,e.read()
        self.assertEqual(request('/api/local/admin/economy-config',{})[0],401)
        request('/api/local/login',{'username':'audituser','password':'Synthetic-fixture-only-910!'})
        self.assertEqual(request('/api/local/admin/economy-config',{})[0],403)
        status,body=request('/api/local/game/economy',{'job':1,'generation':self.generation,'field':37});self.assertEqual(status,200);self.assertEqual(json.loads(body)['effects']['xp'],1)
        request('/api/local/login',{'username':'auditadmin','password':'Synthetic-fixture-only-910!'})
        status,body=request('/api/local/admin/economy-config',{});self.assertEqual(status,200);self.assertEqual(json.loads(body)['presets']['80D']['codes'],economy.TIER80D)
        self.assertEqual(request('/api/local/admin/map-save',{'maps':[37],'versions':{'37':0},'value':economy.base_policy()})[0],200)
        self.assertEqual(request('/economy-admin.mjs')[0],200);self.assertEqual(request('/economy-effects.mjs')[0],200)

for _name in list(vars(ServerAudit)):
    if _name.startswith('test_') and _name not in vars(Economy):setattr(Economy,_name,None)
del ServerAudit
