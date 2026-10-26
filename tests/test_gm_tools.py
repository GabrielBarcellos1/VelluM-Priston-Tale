import copy,time
from unittest.mock import patch
from test_server_audit import ServerAudit
import gm_tools as gm
import game_control as game
import local_accounts as accounts
import npc_services as npc

class GmTools(ServerAudit):
    def setUp(self):
        super().setUp()
        self.user['role']='gm'
        with accounts.connection() as db:db.execute("UPDATE users SET role='gm' WHERE username='audituser'")
        self.save(self.state())
    def call(self,action,**extra):
        s=accounts.load_state('audituser',1)
        return gm.action(self.user,{'job':1,'generation':self.generation,'action':action,'savedAt':s['savedAt'],'requestId':'test-gm-'+str(time.time_ns()),**extra})
    def activate(self):
        r=self.call('grant');item=next(i for i in npc.all_items(r['state']) if i['code']==gm.POTION)
        return self.call('activate',uid=item['uid'])
    def test_staff_grant_inventory_and_idempotency(self):
        s=accounts.load_state('audituser',1);data={'job':1,'generation':self.generation,'action':'grant','savedAt':s['savedAt'],'requestId':'gm-grant-replay'}
        a=gm.action(self.user,data);b=gm.action(self.user,data)
        self.assertTrue(b['repeated']);self.assertEqual(a['state']['inv'],b['state']['inv'])
        self.assertEqual({i['code'] for i in npc.all_items(a['state'])},{gm.SHELTOM,gm.POTION})
        self.assertEqual(len(npc.all_items(self.call('grant')['state'])),2)
        self.assertEqual(a['state']['inv']['equip']['sheltom']['code'],gm.SHELTOM)
        self.assertTrue(all(i['bound'] and i['price']==0 for i in npc.all_items(a['state'])))
    def test_previous_sheltom_is_preserved_when_gm_item_is_equipped(self):
        s=accounts.load_state('audituser',1);item=npc.item_instance('OS110',[]);s['inv']['equip']['sheltom']=item;self.save(s)
        r=self.call('grant');self.assertEqual(r['state']['inv']['equip']['sheltom']['code'],gm.SHELTOM)
        self.assertTrue(any(i['code']=='OS110' and i['uid']==item['uid'] for i in npc.all_items(r['state'])))
    def test_player_access_and_inventory_forgery_denied(self):
        player={**self.user,'role':'player'}
        with self.assertRaises(PermissionError):gm.action(player,{'action':'grant'})
        for slot in ('bag','warehouse','equip'):
            s=self.state();item=npc.item_instance(gm.SHELTOM,[])
            if slot=='bag':s['inv']['bag']=[{'x':0,'y':0,'item':item}]
            elif slot=='equip':s['inv']['equip']['sheltom']=item
            else:s['warehouse']['items']=[{'page':0,'x':0,'y':0,'item':item}]
            with accounts.connection() as db:
                game.setup(db)
                with self.assertRaisesRegex(ValueError,'exclusivo de GM'):game.inspect_state(db,player,1,s,None)
    def test_full_inventory_rolls_back_whole_kit(self):
        s=self.state()
        for group,n in [('bag',1),('bagB',2)]:s['inv'][group]=[{'x':0,'y':0,'item':{'code':'WA101','uid':n,'w':12,'h':6,'count':1}}]
        self.save(s)
        with self.assertRaisesRegex(ValueError,'espaço'):self.call('grant')
        self.assertEqual(accounts.load_state('audituser',1)['inv'],s['inv'])
    def test_potion_consumption_persistence_expiry_and_stop(self):
        r=self.activate();self.assertGreater(r['training']['expires'],time.time()+86000)
        self.assertNotIn(gm.POTION,[i['code'] for i in npc.all_items(r['state'])])
        self.assertEqual(self.call('status')['training']['expires'],r['training']['expires'])
        self.call('grant')
        item=next(i for i in npc.all_items(accounts.load_state('audituser',1)) if i['code']==gm.POTION)
        with self.assertRaisesRegex(ValueError,'já está ativa'):self.call('activate',uid=item['uid'])
        self.assertEqual(self.call('stop')['training']['expires'],0)
    def test_xp_uses_class_level_and_valid_route_and_caps_at_120(self):
        self.activate()
        with accounts.connection() as db:
            game.setup(db)
            for job in range(1,12):
                db.execute('INSERT OR REPLACE INTO gm_training VALUES(?,?,?,?)',('audituser',job,self.generation,time.time()+60))
                for level in (1,10,40,80,100,119):
                    route=gm.profile()['classes'][str(job)]['levels'][level-1]
                    monster=next(game.MONSTERS[mid] for mid in route['monsters'] if any(m['id'] in game.MONSTERS[mid]['maps'] for m in route['maps']))
                    map_id=next(m['id'] for m in route['maps'] if m['id'] in monster['maps'])
                    data={'job':job,'generation':self.generation,'map':map_id,'gmTraining':True}
                    saved={'stats':{'level':level,'exp':gm.balance()['experience'][level-1]}}
                    value=gm.experience(db,self.user,data,saved,monster)
                    self.assertGreater(value,0)
                    self.assertLessEqual(value,gm.balance()['experience'][119]-saved['stats']['exp'])
                    self.assertIsNone(gm.experience(db,self.user,{**data,'adminSpawn':True},saved,monster))
                    self.assertIsNone(gm.experience(db,self.user,{**data,'map':999},saved,monster))
                    self.assertIsNone(gm.experience(db,{**self.user,'role':'player'},data,saved,monster))
            saved={'stats':{'level':119,'exp':gm.balance()['experience'][119]-1}}
            route=gm.profile()['classes']['11']['levels'][118]
            self.assertEqual(gm.experience(db,self.user,data,saved,monster),1)
            saved['stats']['level']=120;self.assertEqual(gm.experience(db,self.user,data,saved,monster),0)
            db.execute('UPDATE gm_training SET expires=0')
            saved['stats']['level']=119;self.assertIsNone(gm.experience(db,self.user,data,saved,monster))
    def test_old_generation_cannot_replay_or_retain_potion(self):
        self.activate()
        with self.assertRaisesRegex(ValueError,'mudou'):gm.action(self.user,{'action':'status','job':1,'generation':'old-generation'})
        with accounts.connection() as db:
            game.setup(db)
            s=gm.snapshot(db,self.user,1,'different-generation',20)
            self.assertEqual(s['expires'],0)

for name in vars(ServerAudit):
    if name.startswith('test_') and name not in vars(GmTools):setattr(GmTools,name,None)
del ServerAudit
