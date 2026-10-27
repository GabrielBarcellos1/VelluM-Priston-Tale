"""Staff announcements are server-authorized, not client-trusted."""
import unittest
import online_world as world
import local_accounts as accounts

class StaffAnnouncementTests(unittest.TestCase):
    def test_staff_identity_uses_distinct_display_name(self):
        self.assertEqual(accounts.identity('admin','admin')['displayName'],'ADM-VelluM')
        self.assertTrue(accounts.identity('admin','admin')['staff'])
        self.assertIsNone(accounts.identity('regular','player')['displayName'])

    def test_player_cannot_forge_staff_announcement(self):
        with self.assertRaisesRegex(ValueError,'equipe'):
            world.chat({'username':'regular','role':'player'},
                {'text':'Teste','channel':'all','announcement':True,'clientId':'test'})

    def test_normal_chat_rejects_slash_command(self):
        with self.assertRaises(ValueError):
            world.chat({'username':'regular','role':'player'},
                {'text':'/> Anúncio falso','channel':'all','clientId':'test'})
