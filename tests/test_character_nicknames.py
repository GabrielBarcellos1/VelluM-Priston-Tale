"""Character nicknames belong to characters, not a staff account display name."""
import unittest
from test_server_audit import ServerAudit
import local_accounts as accounts

class IndividualNames(ServerAudit):
 def test_admin_can_create_different_character_nick_without_account_display_override(self):
  with accounts.connection() as db:
   db.execute("UPDATE users SET role='admin' WHERE username=?",('audituser',))
  admin={'username':'audituser','role':'admin','displayName':'ADM-VelluM'}
  result=accounts.manage_character(admin,{'action':'create','job':2,'name':'ValenteMecanico'})
  roster=accounts.roster(admin)
  entry=next(c for c in roster['characters'] if c['job']==2)
  self.assertEqual(entry['name'],'ValenteMecanico')
  with accounts.connection() as db:
   row=db.execute('SELECT state FROM characters WHERE username=? AND job=?',('audituser',2)).fetchone()
  import json
  self.assertEqual(json.loads(row['state'])['name'],'ValenteMecanico')
  self.assertEqual(admin['displayName'],'ADM-VelluM')

 def test_existing_character_name_not_overridden_by_account_badge(self):
  admin={'username':'audituser','role':'admin','displayName':'ADM-VelluM'}
  roster=accounts.roster(admin)
  name=next(c['name'] for c in roster['characters'] if c['job']==1)
  self.assertNotEqual(name,'ADM-VelluM')
