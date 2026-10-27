"""Fast, disposable integration sampling. Never advances a production character."""
import argparse,hashlib,json,random,sqlite3,subprocess,sys,time,unittest,urllib.request,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT),str(ROOT/'tests')]
from test_server_audit import ServerAudit
import local_accounts as accounts
import game_control as game
import level_rewards as rewards
import npc_services as npc
import server_economy as economy
parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:19065/priston')
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--production-db',type=Path)
args=parser.parse_args()

def production_fingerprint():
 if not args.production_db:return None
 db=sqlite3.connect(args.production_db.resolve().as_uri()+'?mode=ro',uri=True)
 try:
  rows=db.execute('SELECT username,job,state FROM characters ORDER BY username,job').fetchall()
  return hashlib.sha256(json.dumps(rows,ensure_ascii=False).encode()).hexdigest()
 finally:db.close()

def get_metadata(route):
 request=urllib.request.Request(args.base_url.rstrip('/')+route,headers={'User-Agent':'VelluM-Health/1.0'})
 with urllib.request.urlopen(request,timeout=20) as response:return json.load(response)

class SampledProgression(unittest.TestCase):
 state=ServerAudit.state
 def setUp(self):
  ServerAudit.setUp(self)
  self.assertTrue(accounts.DATA.resolve().is_relative_to(Path(self.temp.name).resolve()))
  for actor,name in ((self.user,'Sample Knight'),(self.admin,'Sample Staff')):
   accounts.manage_character(actor,{'job':6,'action':'create','name':name})
 def seed(self,actor,level,field):
  s=self.state();s['name']='Sample Knight';s['field']=field
  s['stats'].update(level=level,exp=rewards_progression()['experience'][level-1],gold=0)
  s['savedAt']=int(time.time()*1000)
  with accounts.connection() as db:
   db.execute('UPDATE characters SET state=? WHERE username=? AND job=6',(json.dumps(s),actor['username']))
  return s
 def payload(self,actor,**data):
  return {'job':6,'generation':accounts.character_generation(actor['username'],6),'requestId':uuid.uuid4().hex,**data}
 def test_sample_every_map_and_milestone(self):
  before=production_fingerprint()
  world={'fields':get_metadata('/api/map-fields'),'spawns':get_metadata('/api/map-spawns')}
  world_file=Path(self.temp.name)/'world.json';world_file.write_text(json.dumps(world),encoding='utf-8')
  xp_file=Path(self.temp.name)/'xp.json'
  subprocess.run(['node',str(ROOT/'ops/sample-xp-progression.mjs'),str(xp_file),str(world_file)],check=True,capture_output=True,text=True,encoding='utf-8')
  xp=json.loads(xp_file.read_text(encoding='utf-8'))
  results=[];total_draws=0;total_gear=0;total_useful=0
  for index,row in enumerate(xp['results']):
   actor=(self.user,self.admin)[index%2];level=row['min'];field=row['map'];monster=game.MONSTERS[row['sampleMonster']['id']]
   self.seed(actor,level,field)
   low,high=rewards.drop_band(field,level,monster['level']);sample_gear=[]
   with accounts.connection() as db:
    game.setup(db);rng=random.Random(9300+field)
    for _ in range(200):
     sample_gear += [game.ITEMS[c] for c,n,kind in economy.roll(db,monster,field,rng=rng,job=6,player_level=level)['items'] if kind=='equipment']
   self.assertTrue(sample_gear,'No equipment in 200 samples for '+str(field))
   self.assertTrue(all(low<=i.get('req',{}).get('level',0)<=high for i in sample_gear))
   useful=sum(rewards.preferred(i,6) for i in sample_gear)
   owned=None
   for attempt in range(200):
    payload=self.payload(actor,monster=monster['id'],map=field)
    result=game.kill(actor,payload)
    owned=next((i for i in result['items'] if i.get('spec')==6),None)
    if owned:break
   self.assertIsNotNone(owned,'No own-spec drop for '+str(field))
   replay=game.kill(actor,payload);self.assertTrue(replay['repeated']);self.assertEqual(replay['items'],result['items'])
   pickup=self.payload(actor,eventId=owned['eventId'])
   game.pickup(actor,pickup);self.assertTrue(game.pickup(actor,pickup)['repeated'])
   saved=accounts.load_state(actor['username'],6)
   item=npc.item_instance(owned['code'],npc.all_items(saved));item['spec']=6;npc.add_bag(saved,item);saved['savedAt']+=1
   accounts.save_state(actor,6,saved,pickup['generation'],require_generation=True)
   self.assertTrue(any(i['code']==owned['code'] for i in npc.all_items(accounts.load_state(actor['username'],6))))
   results.append({**row,'dropDraws':200,'equipmentDrops':len(sample_gear),'usefulClassDrops':useful,'dropLevelMin':low,'dropLevelMax':high,'ownSpecDrop':owned['code'],'killsUntilOwnSpec':attempt+1,'pickupAndReplay':True,'inventoryPersisted':True})
   total_draws+=200;total_gear+=len(sample_gear);total_useful+=useful
  kits=[]
  for level in [10,20,30,40,50,60,70,80,90,100,110,120]:
   state=self.seed(self.user,level,21);payload=self.payload(self.user,savedAt=state['savedAt'])
   result=rewards.claim(self.user,payload)
   if level<=70:
    self.assertEqual(result['awarded'],level);items=npc.all_items(result['state'])
    self.assertEqual(len(items),8);self.assertTrue(all(i['spec']==6 for i in items))
    self.assertTrue(rewards.claim(self.user,payload)['repeated'])
   else:self.assertIsNone(result['awarded'])
   kits.append({'level':level,'itemsGranted':8 if result['awarded'] else 0,'duplicateProtected':True})
  unchanged=before==production_fingerprint();self.assertTrue(unchanged,'Production character data changed during sampling')
  report={'method':'isolated XP-handler execution plus real server kill/drop/pickup/kit transactions on disposable SQLite','actualContinuousPlaythrough':False,'levelMapSamples':xp['levelMapSamples'],'levels1to120Covered':xp['allLevels1to120Covered'],'mapsValidated':len(results),'dropDraws':total_draws,'equipmentDrops':total_gear,'usefulClassDropShare':round(total_useful/total_gear,4),'productionCharactersUnchanged':unchanged,'kitChecks':kits,'maps':results}
  args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
  print(json.dumps({k:v for k,v in report.items() if k not in ('maps','kitChecks')},ensure_ascii=False),flush=True)

def rewards_progression():
 import progression
 return progression.rules()

if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=1).run(unittest.defaultTestLoader.loadTestsFromTestCase(SampledProgression))
 sys.exit(0 if result.wasSuccessful() else 1)
