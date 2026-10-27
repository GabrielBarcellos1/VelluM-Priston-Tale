"""Map loot policies and scheduled events. RNG and validation stay on the server."""
import copy,json,math,time,uuid
from functools import lru_cache
from pathlib import Path
import local_accounts as accounts
FIELDS=json.loads((Path(__file__).parent/'data/map-fields.json').read_text(encoding='utf8'))['fields']
MAPS={f['id']:f for f in FIELDS}
TIER80D=['WA119','WC119','WH120','WM120','WP120','WS121','WS222','WT120','DA121','DA221','DB119','DG119','DS119','OA219']
KINDS={'xp':'XP extra','drops':'Drop de equipamentos','gold':'Ouro extra','sheltoms':'Chuva de Sheltoms','moriph':'Moriph: Aging facilitado','aging_free':'Aging sem ouro','boss':'Exclusivos na roleta Boss'}

def setup(db):
    db.execute('CREATE TABLE IF NOT EXISTS map_economy(field INTEGER PRIMARY KEY,version INTEGER,data TEXT)')
    db.execute('CREATE TABLE IF NOT EXISTS scheduled_events(id TEXT PRIMARY KEY,version INTEGER,data TEXT)')

def base_policy():return {'custom':False,'paused':False,'gold':{'chance':30,'min':1,'max':100},'equipment':[], 'potionChance':20,'sheltoms':{'chance':0,'min':1,'max':10},'extras':[]}

def policy(db,field):
    row=db.execute('SELECT * FROM map_economy WHERE field=?',(field,)).fetchone()
    return {'version':row['version'] if row else 0,**(json.loads(row['data']) if row else base_policy())}

def admin_data(user,data=None):
    import game_control as g,admin_service as admin
    admin.require_admin(user)
    with accounts.connection() as db:
        g.setup(db)
        return {'maps':[{'id':f['id'],'name':f['name'],'village':f.get('village',False),'policy':policy(db,f['id'])} for f in FIELDS],
                'events':[{'id':r['id'],'version':r['version'],**json.loads(r['data'])} for r in db.execute('SELECT * FROM scheduled_events ORDER BY rowid DESC')],
                'kinds':KINDS,'presets':{'80D':{'name':'80D clássico','codes':[c for c in TIER80D if c in g.ITEMS]}},
                'items':[{'code':i['code'],'name':i['name'],'level':i.get('req',{}).get('level',0)} for i in g.ITEMS.values() if allowed(i['code'])],
                'sheltoms':[{'index':n,'code':f'OS1{n:02}','name':g.ITEMS[f'OS1{n:02}']['name']} for n in range(1,18)],'serverTime':time.time()}

@lru_cache(maxsize=4096)
def allowed(code):
    import game_control as g
    i=g.ITEMS.get(code)
    return bool(i and code not in g.BOSS_CODES and i.get('family')!='OR2' and i.get('slot') in ('WEAPON_ONE','WEAPON_TWO','ARMOR','BOOTS','GLOVES','ARMLET','SHIELDS','AMULET','RING','SHELTOM','POTION','FORCEORB') and i.get('price',0)>0 and not __import__('re').search(r'\(|costume|event|halloween|christmas',i['name'],__import__('re').I))

def chance(value,label='Chance'):
    import game_control as g
    return g.number(value,0,100,label)

def integer(value,lo,hi,label):
    import game_control as g
    return g.int_value(value,lo,hi,label)

def validate_policy(value):
    if not isinstance(value,dict):raise ValueError('Regras inválidas.')
    for key in ('custom','paused'):
        if type(value.get(key)) is not bool:raise ValueError('Informe as opções do mapa.')
    gold=value.get('gold',{});chance(gold.get('chance'));integer(gold.get('min'),0,1000000,'Ouro mínimo');integer(gold.get('max'),gold['min'],1000000,'Ouro máximo');chance(value.get('potionChance'))
    stones=value.get('sheltoms',{});chance(stones.get('chance'));integer(stones.get('min'),1,17,'Sheltom inicial');integer(stones.get('max'),stones['min'],17,'Sheltom final')
    rows=value.get('equipment');extras=value.get('extras')
    if not isinstance(rows,list) or len(rows)>12 or not isinstance(extras,list) or len(extras)>20:raise ValueError('Limite: 12 grupos e 20 itens específicos por mapa.')
    clean=[]
    for r in rows:
        chance(r.get('chance'));integer(r.get('minLevel'),0,200,'Nível mínimo');integer(r.get('maxLevel'),r['minLevel'],200,'Nível máximo')
        codes=r.get('codes',[])
        if not isinstance(codes,list) or len(codes)>250 or len(codes)!=len(set(codes)) or any(not allowed(c) for c in codes):raise ValueError('Lista de equipamentos inválida; exclusivos de Boss são separados.')
        pool=equipment_pool(r)
        if r['chance']>0 and not pool:raise ValueError('O grupo não possui itens elegíveis. Confira nível e códigos.')
        clean.append({'label':str(r.get('label','Grupo'))[:60],'chance':r['chance'],'minLevel':r['minLevel'],'maxLevel':r['maxLevel'],'codes':codes})
    extra_clean=[];seen=set()
    for r in extras:
        code=r.get('code')
        if not allowed(code) or code in seen:raise ValueError('Item específico inválido ou repetido.')
        chance(r.get('chance'));integer(r.get('count'),1,99,'Quantidade');seen.add(code);extra_clean.append({'code':code,'chance':r['chance'],'count':r['count']})
        import game_control as g
        if g.ITEMS[code]['slot'] not in ('POTION','SHELTOM') and r['count']!=1:raise ValueError('Equipamentos e Forças devem ter quantidade 1 por sorteio.')
    return {'custom':value['custom'],'paused':value['paused'],'gold':{k:gold[k] for k in ('chance','min','max')},'equipment':clean,'potionChance':value['potionChance'],'sheltoms':{k:stones[k] for k in ('chance','min','max')},'extras':extra_clean}

def equipment_pool(row):
    return _equipment_pool(row['minLevel'],row['maxLevel'],tuple(row.get('codes',[])))

@lru_cache(maxsize=512)
def _equipment_pool(low,high,codes):
    import game_control as g
    return [i for i in g.ITEMS.values() if allowed(i['code']) and i.get('slot') not in ('POTION','SHELTOM','FORCEORB') and low<=i.get('req',{}).get('level',0)<=high and (not codes or i['code'] in codes)]

@lru_cache(maxsize=256)
def _legacy_pool(low,high):
    import game_control as g
    return g.eligible({},low,high)

def save_map(user,data):
    import game_control as g,admin_service as admin
    admin.require_admin(user);value=validate_policy(data.get('value'));targets=data.get('maps')
    if not isinstance(targets,list) or not 1<=len(targets)<=len(MAPS) or any(type(i) is not int or i not in MAPS for i in targets) or len(targets)!=len(set(targets)):raise ValueError('Escolha mapas válidos.')
    versions=data.get('versions',{})
    with accounts.connection() as db:
        g.setup(db);db.execute('BEGIN IMMEDIATE')
        for field in targets:
            if versions.get(str(field))!=policy(db,field)['version']:raise ValueError('Um mapa foi alterado. Recarregue antes de copiar as regras.')
        for field in targets:db.execute('INSERT INTO map_economy VALUES(?,?,?) ON CONFLICT(field) DO UPDATE SET version=excluded.version,data=excluded.data',(field,policy(db,field)['version']+1,json.dumps(value)))
        g.event(db,user,'economy.maps.save',detail={'maps':targets,'value':value})
        return {'ok':True}

def save_event(user,data):
    import game_control as g,admin_service as admin
    admin.require_admin(user);value=data.get('value',{});kind=value.get('kind')
    if kind not in KINDS:raise ValueError('Tipo de evento inválido.')
    if not isinstance(value.get('name'),str) or not 1<=len(value['name'].strip())<=80:raise ValueError('Informe um nome de até 80 caracteres.')
    if type(value.get('enabled')) is not bool:raise ValueError('Informe se o evento está ligado.')
    start=g.number(value.get('start'),0,4102444800,'Início');end=g.number(value.get('end'),start+1,4102444800,'Fim')
    maps=value.get('maps',[])
    if not isinstance(maps,list) or any(type(i) is not int or i not in MAPS for i in maps):raise ValueError('Mapas do evento inválidos.')
    params=value.get('params',{});clean={}
    if kind in ('xp','drops','gold','boss'):clean['multiplier']=g.number(params.get('multiplier'),1,10,'Multiplicador')
    if kind=='sheltoms':
        chance(params.get('chance'));integer(params.get('min'),1,17,'Sheltom inicial');integer(params.get('max'),params['min'],17,'Sheltom final');clean={k:params[k] for k in ('chance','min','max')}
    if kind in ('moriph','aging_free'):
        clean={'discount':100 if kind=='aging_free' else chance(params.get('discount'),'Desconto'),'successBonus':chance(params.get('successBonus'),'Bônus de sucesso')}
        if kind=='moriph':
            chance(params.get('chance',0));integer(params.get('min',1),1,17,'Sheltom inicial');integer(params.get('max',10),params.get('min',1),17,'Sheltom final')
            clean.update(chance=params.get('chance',0),min=params.get('min',1),max=params.get('max',10))
    value={'name':value['name'].strip(),'kind':kind,'enabled':value['enabled'],'start':start,'end':end,'maps':sorted(set(maps)),'params':clean}
    event_id=data.get('id') or uuid.uuid4().hex
    if not isinstance(event_id,str) or not __import__('re').fullmatch(r'[a-f0-9]{32}',event_id):raise ValueError('Identificador inválido.')
    with accounts.connection() as db:
        g.setup(db);db.execute('BEGIN IMMEDIATE');old=db.execute('SELECT version FROM scheduled_events WHERE id=?',(event_id,)).fetchone()
        version=old['version'] if old else 0
        if data.get('version',0)!=version:raise ValueError('Este evento mudou. Recarregue o editor.')
        db.execute('INSERT INTO scheduled_events VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,data=excluded.data',(event_id,version+1,json.dumps(value)))
        g.event(db,user,'event.save',detail={'id':event_id,'value':value});return {'ok':True,'id':event_id}

def active(db,field,now=None):
    now=time.time() if now is None else now;rows=[]
    for row in db.execute('SELECT id,data FROM scheduled_events'):
        e=json.loads(row['data'])
        if e['enabled'] and e['start']<=now<e['end'] and (not e['maps'] or field in e['maps']):rows.append({'id':row['id'],**e})
    return rows

def effects(db,field,now=None):
    events=active(db,field,now);out={k:1 for k in ('xp','drops','gold','boss')};out.update(discount=0,successBonus=0,sheltoms=[],events=[{'name':e['name'],'kind':e['kind'],'end':e['end']} for e in events])
    for e in events:
        k=e['kind'];p=e['params']
        if k in ('xp','drops','gold','boss'):out[k]=max(out[k],p['multiplier'])
        elif k=='sheltoms':out['sheltoms'].append(p)
        else:
            out['discount']=max(out['discount'],p['discount']);out['successBonus']=max(out['successBonus'],p['successBonus'])
            if k=='moriph' and p.get('chance',0):out['sheltoms'].append({key:p[key] for key in ('chance','min','max')})
    return out

def runtime(user,data):
    import game_control as g
    field=integer(data.get('field'),0,10000,'Mapa')
    if field not in MAPS:raise ValueError('Mapa desconhecido.')
    with accounts.connection() as db:g.setup(db);return {'ok':True,'effects':effects(db,field),'policy':policy(db,field),'globalDrops':g.rules_in(db)['drops'],'serverTime':time.time()}

def roll(db,monster,field,premium_extra=0,rng=None,preview=False,job=None,player_level=None):
    import game_control as g
    rng=rng or g.RNG;p=policy(db,field);e=effects(db,field);gold=0;items=[]
    if field not in monster['maps'] or not any(monster.get('attack',[])) or p['paused']:return {'gold':0,'items':[],'effects':e,'policyVersion':p['version']}
    rules=g.rules_in(db)['drops'];level=monster['level'];low=max(0,level-20)
    groups=p['equipment'] if p['custom'] else [{'minLevel':low,'maxLevel':min(level,79),'chance':rules['equipmentChance']},{'minLevel':max(80,low),'maxLevel':level,'chance':rules['highLevelChance']}]
    import level_rewards
    assisted=job in level_rewards.WEAPONS and player_level is not None
    if assisted and not p['custom']:
        low,high=level_rewards.drop_band(field,player_level,level)
        config=level_rewards.rules()
        groups=[{'minLevel':low,'maxLevel':min(high,79),'chance':max(rules['equipmentChance'],config['minimumEquipmentChance']) if rules['equipmentChance']>0 else 0},
                {'minLevel':max(80,low),'maxLevel':high,'chance':max(rules['highLevelChance'],config['minimumHighLevelChance']) if rules['highLevelChance']>0 else 0}]
    def wins(ch):return rng.random()*100<min(100,ch)
    def choose(pool):
        useful=[i for i in pool if level_rewards.preferred(i,job)] if assisted else []
        return rng.choice(useful if useful and rng.random()<level_rewards.rules()['preferredClassChance'] else pool)
    def equipment():
        for group in groups:
            pool=equipment_pool(group) if p['custom'] else _legacy_pool(group['minLevel'],group['maxLevel'])
            if pool and wins(group['chance']*e['drops']):items.append((choose(pool)['code'],1,'equipment'))
    if p['custom']:
        if wins(p['gold']['chance']):gold=rng.randint(p['gold']['min'],p['gold']['max'])
    elif wins(rules['goldChance']):gold=math.floor(level*3*rules['goldMultiplier'])
    gold=math.floor(gold*e['gold']);equipment()
    for extra in (premium_extra if isinstance(premium_extra,list) else [premium_extra]):
        if extra and wins(extra):
            if p['custom']:equipment()
            else:
                pool=_legacy_pool(low,high if assisted else level)
                if pool:
                    selected=choose(pool);item_level=selected.get('req',{}).get('level',0)
                    ch=next((group['chance'] for group in groups if group['minLevel']<=item_level<=group['maxLevel']),0) if assisted else (rules['highLevelChance'] if item_level>=80 else rules['equipmentChance'])
                    if wins(ch*e['drops']):items.append((selected['code'],1,'equipment'))
    potion=p['potionChance'] if p['custom'] else rules['potionChance']
    if wins(potion):items.append((g.common_potion(level,rng.random()),1,'potion'))
    stones=([p['sheltoms']] if p['custom'] else [])+e['sheltoms']
    # One additional sheltom roll: overlapping events do not multiply material supply.
    if stones:
        stone=max(stones,key=lambda s:(s['chance'],s['max'],s['min']))
        if wins(stone['chance']):items.append((f"OS1{rng.randint(stone['min'],stone['max']):02}",1,'sheltom'))
    if p['custom']:
        for row in p['extras']:
            if wins(row['chance']):items.append((row['code'],row['count'],'configured'))
    return {'gold':gold,'items':items,'effects':e,'policyVersion':p['version']}

def preview(user,data):
    import game_control as g,admin_service as admin
    admin.require_admin(user);field=data.get('field')
    with accounts.connection() as db:
        g.setup(db);p=policy(db,field);e=effects(db,field);summary=[]
        if p['custom']:
            expected=p['gold']['chance']/100*(p['gold']['min']+p['gold']['max'])/2*e['gold']
            for row in p['equipment']:summary.append({'label':row['label'],'items':len(equipment_pool(row)),'chance':min(100,row['chance']*e['drops']),'codes':[i['code'] for i in equipment_pool(row)]})
        else:
            rules=g.rules_in(db)['drops'];mobs=[m for m in g.MONSTERS.values() if field in m['maps'] and not m.get('boss') and any(m.get('attack',[]))];expected=sum(m['level']*3*rules['goldMultiplier']*rules['goldChance']/100 for m in mobs)/max(1,len(mobs))*e['gold']
        return {'expectedGoldPer1000':0 if p['paused'] else round(expected*1000,2),'groups':summary,'effects':e,'paused':p['paused'],'inherited':not p['custom']}

def aging_terms(db,field,chances,fee):
    e=effects(db,field);out=copy.deepcopy(chances);needed=min(e['successBonus'],100-out['plus1']-out['plus2'])
    for key in ('destroy','minus2','minus1','kept'):
        moved=min(needed,out[key]);out[key]-=moved;out['plus1']+=moved;needed-=moved
    return out,math.floor(fee*(1-e['discount']/100))
