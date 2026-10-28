"""Isolated support tests: account functions are replaced; no player DB is opened."""
import contextlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import online_world as world

class EmptyDb:
    def execute(self,*args):return self
    def fetchone(self):return None

class OnlineSkills(unittest.TestCase):
    def setUp(self):
        world.PLAYERS.clear();world.EVENTS.clear();world.SUPPORT.clear();world.SEQ=0
        self.saved={'caster':{'stats':{'level':100,'spi':100},'skills':{'SKILL_ZENITH':2,'SKILL_RESURRECTION':2,'SKILL_HEALING':2}},'ally':{'stats':{'level':50}},'far':{'stats':{'level':50}}}
        self.users={k:{'username':k,'displayName':k,'role':'player'} for k in self.saved}
        self.clients={k:str(i+1)*32 for i,k in enumerate(self.saved)}
        self.stack=contextlib.ExitStack();self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(world.accounts,'load_state',side_effect=lambda u,j:self.saved[u]))
        self.stack.enter_context(patch.object(world.accounts,'character_record',side_effect=lambda u,j:{'state':self.saved[u],'generation':'g'}))
        self.stack.enter_context(patch.object(world.accounts,'connection',side_effect=lambda:contextlib.nullcontext(EmptyDb())))
    def heartbeat(self,name,**kwargs):
        return world.heartbeat(self.users[name],{'job':7 if name=='caster' else 1,'field':3,'clientId':self.clients[name],'generation':'g','x':0,'z':0,'y':0,**kwargs})
    def cast(self,code,**kwargs):
        return world.skill(self.users['caster'],{'code':code,'clientId':self.clients['caster'],'generation':'g',**kwargs})
    def test_buff_goes_only_to_nearby_authenticated_character(self):
        self.heartbeat('caster');self.heartbeat('ally',x=30);self.heartbeat('far',x=900)
        self.assertEqual(self.cast('SKILL_ZENITH')['recipients'],1)
        events=self.heartbeat('ally')['support'];self.assertEqual(events[0]['code'],'SKILL_ZENITH');self.assertEqual(events[0]['level'],2)
        self.assertEqual(self.heartbeat('far')['support'],[])
        world.chat(self.users['caster'],{'clientId':self.clients['caster'],'text':'Synthetic chat fixture','channel':'normal'})
        self.assertEqual(self.heartbeat('ally')['chats'][0]['text'],'Synthetic chat fixture')
        with self.assertRaises(ValueError):world.chat(self.users['caster'],{'clientId':self.clients['caster'],'text':'too soon','channel':'normal'})
        self.assertEqual(self.heartbeat('ally',cursor=world.SEQ)['support'],[])
        self.heartbeat('caster')
        with self.assertRaisesRegex(ValueError,'recarga'):self.cast('SKILL_ZENITH')
    def test_gm_pink_announcement_is_authenticated_and_global(self):
        self.heartbeat('caster')
        self.heartbeat('ally')
        with self.assertRaisesRegex(ValueError, 'equipe'):
            world.chat(self.users['caster'], {'clientId': self.clients['caster'],
                                              'text': 'Não autorizado', 'announcement': True})
        self.users['caster']['role'] = 'gm'
        world.chat(self.users['caster'], {'clientId': self.clients['caster'],
                                          'text': 'Evento começando!', 'announcement': True})
        delivered = self.heartbeat('ally')['chats']
        self.assertEqual(len(delivered), 1)
        self.assertTrue(delivered[0]['staff'])
        self.assertEqual(delivered[0]['channel'], 'all')
        self.assertEqual(delivered[0]['text'], 'Evento começando!')
        self.assertTrue(delivered[0]['from'].startswith('[GM]'))

    def test_server_rejects_unlearned_wrong_class_and_stale_generation(self):
        self.heartbeat('caster');self.heartbeat('ally')
        for code in ('SKILL_INPES','SKILL_GOD_BLESS'):
            with self.assertRaisesRegex(ValueError,'aprendida'):self.cast(code)
        with self.assertRaises(ValueError):self.cast('SKILL_ZENITH',generation='stale')
        self.assertEqual(len(world.SUPPORT),0)
    def test_resurrection_targets_one_dead_ally_and_heal_targets_selected_ally(self):
        # Priestess fixture uses the same isolated account, with an appropriate class.
        self.heartbeat('caster',job=8);self.heartbeat('ally',dead=True);self.heartbeat('far',dead=False)
        self.assertEqual(self.cast('SKILL_RESURRECTION')['recipients'],1)
        event=self.heartbeat('ally')['support'][0];self.assertEqual(event['kind'],'resurrection');self.assertEqual(event['hpPercent'],40)
        self.heartbeat('ally',dead=False,cursor=world.SEQ)
        target=world.PLAYERS['ally']['packet']['id']
        self.assertEqual(self.cast('SKILL_HEALING',target=target)['recipients'],1)
        event=self.heartbeat('ally',cursor=world.SEQ-1)['support'][0];self.assertEqual(event['kind'],'heal');self.assertGreater(event['amount'],0)
    def test_resurrection_without_dead_target_rejects_without_cooldown(self):
        self.heartbeat('caster',job=8);self.heartbeat('ally')
        with self.assertRaisesRegex(ValueError,'morto'):self.cast('SKILL_RESURRECTION')
        self.assertEqual(world.PLAYERS['caster']['supportReady'],{})

if __name__=='__main__':unittest.main()
