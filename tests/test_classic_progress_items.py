import unittest,sys,math,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import level_rewards,game_control
class ClassicItemProgression(unittest.TestCase):
 def test_original_gift_catalog_present(self):
  table=level_rewards.classic_weapons()
  self.assertEqual(len(table),8)
  for job,rows in table.items():
   self.assertEqual(len(rows),3)
   for row in rows:self.assertIn(row['code'],game_control.ITEMS)
 def test_kit_does_not_grant_unusable_level_equipment(self):
  for job in range(1,9):
   for lv in (10,20,30,40,50,60,70):
    codes=level_rewards.kit_codes(lv,job)
    self.assertEqual(len(codes),8,(job,lv))
    for code in codes:
     item=game_control.ITEMS[code]
     self.assertLessEqual(item.get('req',{}).get('level',0),lv,(job,lv,code))
 def test_high_level_xp_is_accepted_by_backend(self):
  state={'stats':{'level':150,'exp':8524113065780,'progressionVersion':2},'inv':{'equip':{},'equipB':{},'bag':[],'bagB':[],'belt':[]},'warehouse':{}}
  self.assertIsNone(game_control.inspect_state(None,{'role':'admin','username':'test'},1,state,None))
 def test_classic_first_and_40th_weapons(self):
  self.assertEqual(level_rewards.kit_codes(10,1)[0],'WA104')
  self.assertEqual(level_rewards.kit_codes(10,2)[0],'WC104')
  self.assertEqual(level_rewards.kit_codes(40,2)[0],'WC108')
if __name__=='__main__':unittest.main()