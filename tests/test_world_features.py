"""Synthetic fixtures: no live accounts or purchases are used."""
import time,uuid,copy
from test_server_audit import ServerAudit
import local_accounts as accounts
import premium_store as store
import npc_services as npc
import game_control as game

class WorldFeatures(ServerAudit):
    # Reuse only the disposable fixture, not the previous test methods.
    def buy_kit(self):
        store.transact(self.admin,'grant',{'username':'audituser','amount':48000,'requestId':uuid.uuid4().hex})
        request={'code':'BI900','count':1,'expectedTotal':24000,'requestId':uuid.uuid4().hex}
        store.transact(self.user,'purchase',request);store.transact(self.user,'purchase',request)
        self.assertEqual(store.wallet('audituser')['coins'],24000)
    def test_kit_seven_days_exactly_once_and_ten_physical_forces(self):
        self.buy_kit();before=time.time()
        data={'code':'BI900','job':1,'generation':self.generation,'requestId':uuid.uuid4().hex}
        store.transact(self.user,'activate',data);store.transact(self.user,'activate',data)
        wallet=store.wallet('audituser');self.assertEqual(len(wallet['active']),7)
        for effect in wallet['active']:self.assertAlmostEqual(effect['expiresAt']-before,604800,delta=3)
        self.assertEqual(next(i['quantity'] for i in wallet['stock'] if i['code']=='FO110'),10)
        self.assertFalse(any(i['code']=='BI900' for i in wallet['stock']))
    def test_kit_invalid_generation_and_partial_effect_failure_roll_back(self):
        self.buy_kit();data={'code':'BI900','job':1,'generation':'obsolete','requestId':uuid.uuid4().hex}
        with self.assertRaises(ValueError):store.transact(self.user,'activate',data)
        with accounts.connection() as db:
            db.execute('INSERT INTO premium_active VALUES(?,?,?,?,?)',('audituser','thirdEyes','BI906',time.time()+100,999))
        with self.assertRaises(ValueError):store.transact(self.user,'activate',{**data,'generation':self.generation,'requestId':uuid.uuid4().hex})
        w=store.wallet('audituser');self.assertEqual(len(w['active']),1)
        self.assertEqual(next(i['quantity'] for i in w['stock'] if i['code']=='BI900'),1)
    def test_kit_caster_receives_magic_mirage(self):
        self.buy_kit();accounts.manage_character(self.user,{'job':7,'action':'create','name':'Synthetic Mage'})
        r=store.transact(self.user,'activate',{'code':'BI900','job':7,'generation':accounts.character_generation('audituser',7),'requestId':uuid.uuid4().hex})
        self.assertEqual(next(i['quantity'] for i in r['wallet']['stock'] if i['code']=='FO130'),10)
    def call(self,service,action='view',extra=None,state=None,request=None):
        n=next(n for n in game.NPCS.values() if service in n.get('services',[]))
        if state is not None:
            state['field']=n['map'];state['position']={'x':n['x'],'z':n['z']};self.save(state)
        saved=accounts.load_state('audituser',1)
        data={'job':1,'generation':self.generation,'npcId':n['id'],'service':service,'action':action,'savedAt':saved['savedAt'],'requestId':request or uuid.uuid4().hex,**(extra or {})}
        return npc.action(self.user,data),data
    def test_charity_replay_cooldown_and_stale_snapshot(self):
        result,data=self.call('charity','claim',state=self.state())
        self.assertTrue(npc.action(self.user,data)['repeated'])
        self.assertEqual(sum(p['item']['count'] for p in result['state']['inv']['bag']),60)
        with self.assertRaises(ValueError):self.call('charity','claim')
        with self.assertRaisesRegex(ValueError,'inventário mudou'):self.call('charity','claim',{'savedAt':0})
    def test_charity_full_bags_roll_back_without_daily_claim(self):
        state=self.state();item=npc.item_instance('WA101',[])
        # A synthetic full-size blocker in each bag exercises atomic reward failure.
        item.update(w=12,h=6)
        state['inv']['bag']=[{'x':0,'y':0,'item':item}]
        other=copy.deepcopy(item);other['uid']+=1;state['inv']['bagB']=[{'x':0,'y':0,'item':other}]
        with self.assertRaisesRegex(ValueError,'espaço'):self.call('charity','claim',state=state)
        with accounts.connection() as db:self.assertEqual(db.execute('SELECT count(*) FROM npc_claims').fetchone()[0],0)
    def test_smelting_consumes_three_and_charges_once(self):
        state=self.state();item=npc.item_instance('OS101',[]);item['count']=3;state['inv']['bag']=[{'x':0,'y':0,'item':item}]
        result,data=self.call('smelting','craft',{'recipe':'OS101'},state)
        self.assertEqual(result['state']['stats']['gold'],999000)
        self.assertEqual([p['item']['code'] for p in result['state']['inv']['bag']],['OS102'])
        self.assertTrue(npc.action(self.user,data)['repeated'])
    def test_bellatra_rejects_early_claim_and_awards_once(self):
        result,_=self.call('bellatra','start',state=self.state());token=result['trial']['token']
        with self.assertRaises(ValueError):self.call('bellatra','claim',{'token':token})
        saved=accounts.load_state('audituser',1);saved['field']=30;self.save(saved)
        data={'job':1,'generation':self.generation,'map':30,'trialToken':token}
        with accounts.connection() as db:
            for _ in range(20):npc.record_trial_kill(db,self.user,data,{'level':20,'boss':False})
            self.assertEqual(db.execute('SELECT kills FROM npc_trials WHERE token=?',(token,)).fetchone()[0],12)
        result,req=self.call('bellatra','claim',{'token':token},state=self.state())
        self.assertEqual(result['state']['stats']['gold'],1020000)
        self.assertTrue(npc.action(self.user,req)['repeated'])
        with self.assertRaises(ValueError):self.call('bellatra','claim',{'token':token})

# Avoid collecting inherited tests twice while keeping fixture helpers readable.
for _name in list(vars(ServerAudit)):
    if _name.startswith('test_') and _name not in vars(WorldFeatures):setattr(WorldFeatures,_name,None)
del ServerAudit
