import copy,json,time,uuid
import unittest
import test_server_audit as fixture
import game_control as game
import local_accounts as accounts
import npc_services as npc

class GroundItems(unittest.TestCase):
    setUp=fixture.ServerAudit.setUp
    save=fixture.ServerAudit.save
    state=fixture.ServerAudit.state
    def command(self,action,**fields):
        state=accounts.load_state('audituser',1)
        return game.ground(self.user,dict(job=1,generation=self.generation,action=action,savedAt=state['savedAt'],requestId=str(uuid.uuid4()),**fields))
    def seed(self,count=1):
        state=self.state(position={'x':100,'y':0,'z':100})
        item=copy.deepcopy(game.ITEMS['PL101']);item.update(uid=777,count=count,aging=0,spec=1)
        state['inv']['bag']=[dict(x=0,y=0,item=item)];self.save(state);return state
    def test_floor_roundtrip_and_replays(self):
        original=self.seed(9)
        data=dict(job=1,generation=self.generation,action='drop',savedAt=original['savedAt'],requestId='floor-replay-001',uid=777,count=3)
        result=game.ground(self.user,data);again=game.ground(self.user,data)
        self.assertEqual(result['id'],again['id'])
        self.assertEqual(accounts.load_state('audituser',1)['inv']['bag'][0]['item']['count'],6)
        self.assertEqual(len(self.command('list')['items']),1)
        with self.assertRaises(ValueError):self.save(original)
        take=dict(job=1,generation=self.generation,action='pickup',savedAt=result['state']['savedAt'],requestId='floor-pickup-001',id=result['id'])
        game.ground(self.user,take);game.ground(self.user,take)
        self.assertEqual(sum(p['item']['count'] for p in accounts.load_state('audituser',1)['inv']['bag']),9)
        self.assertEqual(self.command('list')['items'],[])
        with self.assertRaises(ValueError):self.command('pickup',id=result['id'])
    def test_floor_distance_full_bags_and_bound(self):
        self.seed();drop=self.command('drop',uid=777)
        state=accounts.load_state('audituser',1);state['position']['x']=1000;state['savedAt']+=1;self.save(state)
        with self.assertRaisesRegex(ValueError,'Aproxime'):self.command('pickup',id=drop['id'])
        state=accounts.load_state('audituser',1);state['position']['x']=100
        for group in ('bag','bagB'):
            state['inv'][group]=[dict(x=0,y=0,item=dict(code='PM101',uid=800 if group=='bag' else 801,count=1,w=12,h=6,slot='POTION'))]
        state['savedAt']+=1;self.save(state)
        with self.assertRaisesRegex(ValueError,'espaço'):self.command('pickup',id=drop['id'])
        self.assertEqual(len(self.command('list')['items']),1)
        state=accounts.load_state('audituser',1);state['inv']['bag']=[];state['savedAt']+=1;self.save(state)
        self.command('pickup',id=drop['id'])
        state=accounts.load_state('audituser',1);state['inv']['bag'][0]['item']['bound']=True;uid=state['inv']['bag'][0]['item']['uid'];state['savedAt']+=1;self.save(state)
        with self.assertRaisesRegex(ValueError,'vinculado'):self.command('drop',uid=uid)
    def test_auto_rank_without_quests_on_load_and_save(self):
        for level,rank in [(1,0),(19,0),(20,1),(39,1),(40,2),(59,2),(60,3),(120,3)]:
            state=self.state();state['stats'].update(level=level,classRank=0);state['savedAt']=int(time.time()*1000)+level
            self.save(state)
            self.assertEqual(accounts.load_state('audituser',1)['stats']['classRank'],rank)

    def test_equipment_attributes_preserved_and_public_reservation(self):
        state=self.seed();state['inv']['bag'][0]['item'].update(code='WA101',slot='WEAPON_ONE',w=2,h=3,aging=0,spec=1,rollAttack=17);state['savedAt']+=1;self.save(state)
        dropped=self.command('drop',uid=777)
        accounts.manage_character(self.admin,{'job':1,'action':'create','name':'Other Hero'})
        other=self.state(position={'x':100,'z':100});accounts.save_state(self.admin,1,other,accounts.character_generation('auditadmin',1),require_generation=True)
        request=dict(job=1,action='pickup',id=dropped['id'],savedAt=other['savedAt'],requestId='other-floor-001')
        with self.assertRaisesRegex(ValueError,'reservado'):game.ground(self.admin,request)
        with accounts.connection() as db:db.execute('UPDATE ground_items SET created=created-16 WHERE id=?',(dropped['id'],))
        result=game.ground(self.admin,request);item=result['state']['inv']['bag'][0]['item']
        self.assertEqual(item['rollAttack'],17);self.assertEqual(item['spec'],1)
        self.assertEqual(self.command('list')['items'],[])
