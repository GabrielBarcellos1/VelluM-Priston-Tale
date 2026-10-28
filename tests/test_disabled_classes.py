"""Regression checks for reversible class and loot suspension."""
import unittest
import class_availability as policy
import game_control as game
import server_economy as economy
import premium_store as store
import local_accounts as accounts

class DisabledClassTests(unittest.TestCase):
    def test_classes_preserved_but_inaccessible(self):
        self.assertEqual(policy.DISABLED_JOBS,{9,10,11})
        for job in range(1,12):
            self.assertEqual(policy.active_job(job),job not in (9,10,11))
        for job in (9,10,11):
            self.assertIsNone(accounts.load_state('__disabled_policy_test__',job))
            self.assertEqual(accounts.character_record('__disabled_policy_test__',job),{'state':None,'generation':None})
            with self.assertRaises(ValueError):
                accounts.manage_character({'username':'__disabled_policy_test__'},{'action':'create','job':job})
            with self.assertRaises(ValueError):
                accounts.manage_character({'username':'__disabled_policy_test__'},{'action':'delete','job':job})

    def test_exclusive_items_never_generated(self):
        for item in game.ITEMS.values():
            if item.get('family') in ('WD1','WN1','WV1') or item.get('code')=='CA300':
                self.assertFalse(policy.active_item(item))
                self.assertFalse(economy.allowed(item['code']))
        for monster in ({},{'level':120}):
            self.assertTrue(all(policy.active_item(i) for i in game.eligible(monster,1,150)))
        self.assertTrue(all(policy.active_item(i) for i in economy._legacy_pool(1,150)))
        for job in (1,2,6):
            self.assertTrue(policy.active_job(job))

    def test_shop_costume_suspended(self):
        catalog=store.base_catalog()
        self.assertTrue(any(p['code']=='CA300' for p in catalog))
        self.assertFalse(policy.active_product(next(p for p in catalog if p['code']=='CA300')))
        self.assertTrue(policy.active_product(next(p for p in catalog if p['code']!='CA300')))
if __name__=='__main__':unittest.main()
