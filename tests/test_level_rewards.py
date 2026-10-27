import copy,json,random,uuid
from unittest.mock import patch
from test_server_audit import ServerAudit
import local_accounts as accounts
import game_control as game
import level_rewards as rewards
import npc_services as npc
import server_economy as economy

class LevelRewards(ServerAudit):
    def payload(self,state):
        return {'job':1,'generation':self.generation,'savedAt':state['savedAt'],'requestId':uuid.uuid4().hex}
    def put(self,level):
        s=self.state();s['stats']['level']=level
        with accounts.connection() as db:db.execute('UPDATE characters SET state=? WHERE username=? AND job=1',(json.dumps(s),self.user['username']))
        return s
    def test_all_classes_and_milestones_receive_eight_legal_level_appropriate_pieces(self):
        for job in range(1,12):
            cumulative={'str':25,'spi':15,'tal':20,'dex':19,'health':24}
            for level in rewards.rules()['kitLevels']:
                codes=rewards.kit_codes(level,job)
                self.assertEqual(len(codes),8)
                base={'str':25,'spi':15,'tal':20,'dex':19,'health':24}
                needed={k:max([v]+[game.ITEMS[c].get('req',{}).get(k,0) for c in codes]) for k,v in base.items()}
                self.assertLessEqual(sum(needed[k]-base[k] for k in base),5*(level-1))
                cumulative={k:max(cumulative[k],needed[k]) for k in base}
                self.assertLessEqual(sum(cumulative[k]-base[k] for k in base),5*(level-1))
                for code in codes:
                    item=game.ITEMS[code]
                    self.assertTrue(economy.allowed(code));self.assertTrue(rewards.preferred(item,job))
                    self.assertLessEqual(item.get('req',{}).get('level',0),level)
                self.assertEqual([game.ITEMS[c]['slot'] for c in codes[1:]],['ARMOR','BOOTS','GLOVES','ARMLET','RING','RING','AMULET'])
    def test_claim_is_atomic_idempotent_and_preserves_inventory_and_gold(self):
        s=self.put(10);data=self.payload(s)
        result=rewards.claim(self.user,data)
        self.assertEqual(result['awarded'],10)
        items=npc.all_items(result['state'])
        self.assertEqual(len(items),8);self.assertEqual(len({i['uid'] for i in items}),8)
        self.assertTrue(all(i['spec']==1 for i in items))
        self.assertEqual(result['state']['stats'],s['stats'])
        self.assertTrue(rewards.claim(self.user,data)['repeated'])
        again=rewards.claim(self.user,self.payload(result['state']))
        self.assertIsNone(again['awarded'])
        self.assertEqual(len(npc.all_items(accounts.load_state('audituser',1))),8)
    def test_no_kits_below_ten_or_at_eighty_and_above(self):
        for level in (1,9,80,120):
            s=self.put(level)
            self.assertIsNone(rewards.claim(self.user,self.payload(s))['awarded'])
    def test_each_ten_levels_through_seventy_only_once(self):
        for level in range(10,80,10):
            s=self.put(level)
            result=rewards.claim(self.user,self.payload(s))
            self.assertEqual(result['awarded'],level)
            self.assertEqual(result['levels'],list(range(10,level+1,10)))
    def test_stale_generation_or_snapshot_does_not_grant_a_kit(self):
        s=self.put(30);data=self.payload(s);data['generation']='stale'
        with self.assertRaises(ValueError):rewards.claim(self.user,data)
        data=self.payload(s);data['savedAt']-=1
        with self.assertRaises(ValueError):rewards.claim(self.user,data)
        self.assertEqual(npc.all_items(accounts.load_state('audituser',1)),[])
    def test_full_bags_roll_back_entire_kit_and_allow_retry_after_space_is_freed(self):
        s=self.put(10)
        for page,key in enumerate(('bag','bagB')):
            s['inv'][key]=[{'x':x,'y':y,'item':{'uid':1000+page*72+y*12+x,'code':'OS101','w':1,'h':1,'slot':'SHELTOM','count':1}} for y in range(6) for x in range(12)]
        with accounts.connection() as db:db.execute('UPDATE characters SET state=? WHERE username=? AND job=1',(json.dumps(s),self.user['username']))
        with self.assertRaisesRegex(ValueError,'espaço'):rewards.claim(self.user,self.payload(s))
        self.assertEqual(len(npc.all_items(accounts.load_state('audituser',1))),144)
        s=self.put(10)
        self.assertEqual(rewards.claim(self.user,self.payload(s))['awarded'],10)
    def test_assisted_common_drops_follow_endgame_map_band_and_class(self):
        monster=next(m for m in game.MONSTERS.values() if 43 in m['maps'] and not m.get('boss') and any(m.get('attack',[])))
        rng=random.Random(17);drops=[]
        with accounts.connection() as db:
            game.setup(db)
            for _ in range(500):
                drops += [game.ITEMS[c] for c,n,kind in economy.roll(db,monster,43,rng=rng,job=6,player_level=120)['items'] if kind=='equipment']
        self.assertGreater(len(drops),20)
        self.assertTrue(all(111<=i.get('req',{}).get('level',0)<=120 for i in drops))
        self.assertGreater(sum(rewards.preferred(i,6) for i in drops)/len(drops),.8)
    def test_assistance_respects_paused_and_zero_drop_policies(self):
        p=economy.base_policy();p.update(custom=True,paused=True)
        economy.save_map(self.admin,{'maps':[19],'versions':{'19':0},'value':p})
        monster=next(m for m in game.MONSTERS.values() if 19 in m['maps'] and not m.get('boss'))
        with accounts.connection() as db:
            game.setup(db)
            self.assertEqual(economy.roll(db,monster,19,rng=random.Random(1),job=6,player_level=12)['items'],[])

    def test_server_kill_returns_own_spec_and_replay_does_not_reroll(self):
        self.put(10)
        monster=next(m for m in game.MONSTERS.values() if 2 in m['maps'] and not m.get('boss'))
        data={'job':1,'generation':self.generation,'map':2,'monster':monster['id'],'requestId':uuid.uuid4().hex}
        config={**rewards.rules(),'preferredClassChance':1,'ownSpecChance':1,'minimumEquipmentChance':100}
        with patch.object(rewards,'rules',return_value=config):
            result=game.kill(self.user,data)
            gear=[e for e in result['items'] if game.ITEMS[e['code']]['slot'] in ('WEAPON_ONE','WEAPON_TWO','ARMOR','BOOTS','GLOVES','ARMLET','SHIELDS','AMULET','RING')]
            self.assertEqual(len(gear),1);self.assertEqual(gear[0]['spec'],1)
            replay=game.kill(self.user,data)
            self.assertTrue(replay['repeated']);self.assertEqual(replay['items'],result['items'])
