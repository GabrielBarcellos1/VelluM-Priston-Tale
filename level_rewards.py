"""Class equipment milestones and map-aware common loot. No boss/unique rewards."""
import json,time
from functools import lru_cache
from pathlib import Path
import local_accounts as accounts

WEAPONS={1:'WA1',2:'WH1',3:'WS1',4:'WP1',5:'WT1',6:'WS2',7:'WM1',8:'WM1',9:'WD1',10:'WN1',11:'WV1'}
CASTERS=(7,8,10)

@lru_cache(maxsize=1)
def rules():
    return json.loads((Path(__file__).parent/'data/progression-loot.json').read_text(encoding='utf-8'))

def preferred(item,job):
    family=item.get('family',item['code'][:3])
    if item.get('slot') in ('WEAPON_ONE','WEAPON_TWO'):return family==WEAPONS.get(job)
    if item.get('slot')=='ARMOR':return family==('DA2' if job in CASTERS else 'DA1')
    return True

def kit_codes(level,job):
    import game_control as game,server_economy as economy
    base={'str':25,'spi':15,'tal':20,'dex':19,'health':24}
    required=dict(base);result=[]
    for milestone in sorted(n for n in rules()['kitLevels'] if n<=level):
        result=[]
        def fits(item):
            next_stats={k:max(value,item.get('req',{}).get(k,0)) for k,value in required.items()}
            return sum(next_stats[k]-base[k] for k in base)<=5*(milestone-1)
        for slot in ('weapon','ARMOR','BOOTS','GLOVES','ARMLET','RING','RING','AMULET'):
            pool=[i for i in game.ITEMS.values() if economy.allowed(i['code']) and preferred(i,job)
                  and (i.get('slot') in ('WEAPON_ONE','WEAPON_TWO') if slot=='weapon' else i.get('slot')==slot)
                  and i.get('req',{}).get('level',0)<=milestone and fits(i)]
            if not pool:raise ValueError('Catálogo sem equipamento para o kit de evolução.')
            selected=max(pool,key=lambda i:(i.get('req',{}).get('level',0),i.get('price',0),i['code']))
            result.append(selected['code'])
            for key in required:required[key]=max(required[key],selected.get('req',{}).get(key,0))
    return result

def drop_band(field,player_level,monster_level):
    import progression
    band=next((m for m in progression.rules()['maps'] if m['id']==field),{})
    if 'experienceMin' not in band:return max(0,monster_level-20),monster_level
    high=min(band['experienceMax'],player_level+5)
    return max(0,band['experienceMin']-5,high-rules()['dropLevelWindow']),high

def claim(user,data):
    import game_control as game,npc_services as npc
    with accounts.connection() as db:
        game.setup(db)
        db.execute('CREATE TABLE IF NOT EXISTS level_kit_claims(username TEXT,job INTEGER,generation TEXT,level INTEGER,at REAL,PRIMARY KEY(username,job,generation,level))')
        db.execute('BEGIN IMMEDIATE')
        key,payload,old=game.request(db,user,data,'level-kit')
        if old:return old
        job,saved,name=game.context(user,data,db)
        if saved.get('savedAt')!=data.get('savedAt'):raise ValueError('O inventário mudou. Tente novamente.')
        level=saved.get('stats',{}).get('level',1)
        done={r[0] for r in db.execute('SELECT level FROM level_kit_claims WHERE username=? AND job=? AND generation=?',(user['username'],job,data['generation']))}
        available=[n for n in rules()['kitLevels'] if n<=level and n not in done] if level<80 else []
        if not available:return game.remember(db,user,key,payload,{'ok':True,'levels':sorted(done),'awarded':None})
        milestone=min(available)
        codes=kit_codes(milestone,job)
        for code in codes:
            item=npc.item_instance(code,npc.all_items(saved))
            item['spec']=job
            npc.add_bag(saved,item)
        db.execute('INSERT INTO level_kit_claims VALUES(?,?,?,?,?)',(user['username'],job,data['generation'],milestone,time.time()))
        saved['progressionRewards']=sorted(done|{milestone})
        saved['savedAt']=max(int(time.time()*1000),saved.get('savedAt',0)+1)
        db.execute('UPDATE characters SET state=? WHERE username=? AND job=?',(json.dumps(saved,ensure_ascii=False),user['username'],job))
        game.event(db,user,'progression.kit','reward',job=job,character=name,quantity=len(codes),status='collected',detail={'level':milestone,'codes':codes,'spec':job})
        return game.remember(db,user,key,payload,{'ok':True,'state':saved,'levels':saved['progressionRewards'],'awarded':milestone})
