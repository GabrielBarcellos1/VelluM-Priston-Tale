"""Editable class skill balance remains admin-only, versioned and reversible."""
from test_server_audit import ServerAudit
import copy
import game_control as game

class SkillSettings(ServerAudit):
    def test_admin_can_override_and_restore_skill_timing(self):
        records=game.skill_balance(self.admin)['skills']
        skill=next(s for s in records if s['code']=='SKILL_CONCENTRATION')
        code=skill['code']
        effects=copy.deepcopy(skill['effects']);effects[0]['attackRating']+=7
        edited={'cooldown':[3]*10,'duration':[120+i*10 for i in range(10)],'effects':effects}
        response=game.save_skill_balance(self.admin,{'code':code,'version':0,'value':edited})
        self.assertEqual(response['version'],1)
        catalog=game.merged_skills()
        self.assertEqual(catalog['rules']['skills'][code]['runtime']['cooldown'],edited['cooldown'])
        self.assertEqual(catalog['rules']['skills'][code]['runtime']['duration'],edited['duration'])
        self.assertEqual(catalog['rules']['skills'][code]['runtime']['effects'][0]['attackRating'],effects[0]['attackRating'])
        with self.assertRaisesRegex(ValueError,'outra aba'):
            game.save_skill_balance(self.admin,{'code':code,'version':0,'value':edited})
        game.save_skill_balance(self.admin,{'code':code,'version':1,'reset':True})
        restored=game.merged_skills()['rules']['skills'][code]['runtime']
        self.assertEqual(restored['cooldown'],skill['defaultCooldown'])
        self.assertEqual(restored['duration'],skill['defaultDuration'])
    def test_non_admin_and_malformed_levels_cannot_change_skill(self):
        skill=game.skill_balance(self.admin)['skills'][0]
        value={'cooldown':[1]*10,'duration':[30]*10}
        with self.assertRaises(PermissionError):
            game.save_skill_balance(self.user,{'code':skill['code'],'version':0,'value':value})
        with self.assertRaises(ValueError):
            game.save_skill_balance(self.admin,{'code':skill['code'],'version':0,'value':{**value,'cooldown':[1]*9}})
        self.assertFalse(game.skill_balance(self.admin)['skills'][0]['customized'])
