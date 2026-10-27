"""Synthetic gold-in-world lifecycle: server owns credits until collection."""
import copy,time,uuid
from unittest.mock import patch
from test_server_audit import ServerAudit
import game_control as game
import local_accounts as accounts
import server_economy

class GroundGold(ServerAudit):
    def setUp(self):
        super().setUp()
        self.monster=next(m for m in game.MONSTERS.values() if 37 in m['maps'] and not m.get('boss') and any(m.get('attack',[])))
        self.save(self.state(field=37),generation=self.generation)
    def gold_kill(self, gold=43):
        with patch.object(server_economy,'roll',return_value={'gold':gold,'items':[],'policyVersion':0}):
            return game.kill(self.user,{'job':1,'generation':self.generation,'monster':self.monster['id'],'map':37,'x':100,'z':200,'requestId':uuid.uuid4().hex})
    def test_gold_stays_on_ground_until_pickup_and_is_idempotent(self):
        before=accounts.load_state('audituser',1)['stats']['gold']
        r=self.gold_kill()
        self.assertEqual(r['gold'],0)
        drop=r['goldDrop']
        self.assertEqual(drop['gold'],43)
        self.assertEqual(accounts.load_state('audituser',1)['stats']['gold'],before)
        # Collection happens while playing, before reconnect or a map change.
        req={'job':1,'generation':self.generation,'eventId':drop['eventId'],'requestId':uuid.uuid4().hex}
        c=game.pickup(self.user,req)
        self.assertEqual(c['goldBalance'],before+43)
        self.assertEqual(game.pickup(self.user,req)['goldBalance'],before+43)
        self.assertEqual(accounts.load_state('audituser',1)['stats']['gold'],before+43)
        self.assertEqual(game.pending_gold(self.user,{'job':1,'generation':self.generation})['goldDrops'],[])
        with self.assertRaises(ValueError):
            game.pickup(self.user,{**req,'requestId':uuid.uuid4().hex})
    def test_unclaimed_gold_expires_on_reconnect(self):
        r=self.gold_kill()
        self.assertEqual(game.pending_gold(self.user,{'job':1,'generation':self.generation})['goldDrops'],[])
        with self.assertRaisesRegex(ValueError,'Drop inexistente'):
            game.pickup(self.user,{'job':1,'generation':self.generation,'eventId':r['goldDrop']['eventId'],'requestId':uuid.uuid4().hex})
        self.assertEqual(accounts.load_state('audituser',1)['stats']['gold'],1000000)
    def test_gold_not_collected_from_another_map(self):
        r=self.gold_kill()
        state=accounts.load_state('audituser',1)
        state['field']=2
        state['savedAt']=max(int(time.time()*1000),state['savedAt']+2)
        self.save(state)
        with self.assertRaisesRegex(ValueError,'mapa'):
            game.pickup(self.user,{'job':1,'generation':self.generation,'eventId':r['goldDrop']['eventId'],'requestId':uuid.uuid4().hex})
        self.assertEqual(len(game.pending_gold(self.user,{'job':1,'generation':self.generation})['goldDrops']),0)
