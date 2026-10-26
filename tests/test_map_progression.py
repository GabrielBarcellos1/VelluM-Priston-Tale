import unittest
import progression
import gm_tools

class MapProgression(unittest.TestCase):
    def test_map_boundaries_are_shared_with_staff_training(self):
        for field,maximum in [(2,10),(1,15),(0,20),(43,120)]:
            self.assertTrue(progression.experience_allowed(maximum,field))
            self.assertFalse(progression.experience_allowed(maximum+1,field))
        self.assertTrue(progression.experience_allowed(11,1))
        self.assertFalse(progression.experience_allowed(1,43))

    def test_staff_reward_is_zero_after_finishing_a_map(self):
        value=gm_tools.experience(None,{'role':'gm'},{'gmTraining':True,'map':2},{'stats':{'level':11}}, {})
        self.assertEqual(value,0)

    def test_a_large_training_reward_cannot_skip_the_map_exit_level(self):
        floor=progression.rules()['experience'][10]
        self.assertEqual(progression.cap_experience(10**12,{'level':10,'exp':floor-3},2),3)
        self.assertEqual(progression.cap_experience(10**12,{'level':11,'exp':floor},2),0)

from unittest.mock import patch
import test_server_audit as server_audit
import local_accounts as accounts
import game_control as game
import server_economy

class GameplayTestProfile(unittest.TestCase):
    setUp=server_audit.ServerAudit.setUp
    save=server_audit.ServerAudit.save
    state=server_audit.ServerAudit.state
    def test_gameplay_profile_excludes_staff_legacy_drop_premium(self):
        self.user['role']='gm'
        with accounts.connection() as db:
            db.execute("UPDATE users SET role='gm' WHERE username='audituser'")
        monster=next(m for m in game.MONSTERS.values() if 2 in m['maps'] and not m.get('boss'))
        for enabled,expected in [(True,[]),(False,[50])]:
            state=self.state(endgame=True,gmGameplayTest=enabled)
            self.save(state)
            with patch.object(server_economy,'roll',return_value={'gold':0,'items':[],'policyVersion':0}) as roll:
                game.kill(self.user,{'job':1,'generation':self.generation,'monster':monster['id'],
                                    'map':2,'requestId':'gameplay-profile-'+str(enabled)})
                self.assertEqual(roll.call_args.args[3],expected)
