"""Live rules, server RNG and observation. Kill reports are not authoritative combat."""
import json
import math
import re
import secrets
import time
from functools import lru_cache
from pathlib import Path
import local_accounts as accounts
import premium_store as store
import admin_service as admin
import gm_tools

ROOT=Path(__file__).resolve().parent
DEFAULTS=json.loads((ROOT/'data/control-defaults.json').read_text())
ITEMS={i['code']:i for i in json.loads((ROOT/'data/loot-items.json').read_text())['items']}
ITEMS.update({i['code']:i for i in gm_tools.definitions(ITEMS)})
MONSTERS={m['id']:m for m in json.loads((ROOT/'data/wiki.json').read_text())['wiki']['monsters']}
NPCS={n['id']:n for n in json.loads((ROOT/'data/wiki.json').read_text())['wiki']['npcs']}
BOSS_RULES=json.loads((ROOT/'data/drops.json').read_text())['bosses']
BOSS_CODES={e['code'] for rows in BOSS_RULES.values() for e in rows}
DEFAULTS['bossNames']=list(BOSS_RULES)
OUTCOMES=('plus2','plus1','minus1','minus2','destroy','kept')
RNG=secrets.SystemRandom()


def setup(db):
    db.executescript('''
CREATE TABLE IF NOT EXISTS game_rules(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS game_events(id INTEGER PRIMARY KEY,created REAL NOT NULL,username TEXT NOT NULL,job INTEGER,character TEXT,kind TEXT NOT NULL,severity TEXT NOT NULL,action TEXT NOT NULL,map INTEGER,monster TEXT,code TEXT,item_name TEXT,item_level INTEGER NOT NULL DEFAULT 0,quantity INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL,trust TEXT NOT NULL,detail TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS game_event_actor_time ON game_events(username,created);
CREATE INDEX IF NOT EXISTS game_event_loot ON game_events(kind,item_level,code,id);
CREATE TABLE IF NOT EXISTS game_requests(username TEXT,request_id TEXT,payload TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(username,request_id));
CREATE TABLE IF NOT EXISTS skin_offers(id TEXT PRIMARY KEY,data TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS skin_owned(username TEXT,id TEXT,created REAL,PRIMARY KEY(username,id));
CREATE TABLE IF NOT EXISTS skin_equipped(username TEXT,job INTEGER,cat TEXT,id TEXT,PRIMARY KEY(username,job,cat));
''')
    gm_tools.setup(db)
    import server_economy
    server_economy.setup(db)
    db.execute('INSERT OR IGNORE INTO game_rules VALUES(1,1,?)',(json.dumps({k:DEFAULTS[k] for k in ('aging','drops','monitor')}),))
    if not db.execute('SELECT 1 FROM skin_offers LIMIT 1').fetchone():
        for skin in skin_library():
            db.execute('INSERT OR IGNORE INTO skin_offers(id,data,enabled) VALUES(?,?,?)',(skin['id'],json.dumps(skin,ensure_ascii=False),int(bool(skin.get('customModel')))))
    import custom_skins
    for skin in custom_skins.catalog():
        db.execute('INSERT OR IGNORE INTO skin_offers(id,data,enabled) VALUES(?,?,1)',(skin['id'],json.dumps(skin,ensure_ascii=False)))
    db.commit()


def event(db,user,action,kind='security',severity='info',job=None,character=None,map_id=None,monster=None,code=None,item_name=None,item_level=0,quantity=0,status='recorded',trust='server',detail=None):
    return db.execute('INSERT INTO game_events(created,username,job,character,kind,severity,action,map,monster,code,item_name,item_level,quantity,status,trust,detail) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        (time.time(),user['username'] if user else '-',job,character,kind,severity,action,map_id,monster,code,item_name,item_level,quantity,status,trust,json.dumps(detail or {},ensure_ascii=False))).lastrowid


def log(user,action,severity='info',detail=None,trust='server'):
    with accounts.connection() as db:
        setup(db)
        event(db,user,action,severity=severity,detail=detail,trust=trust)


def rules_in(db):
    row=db.execute('SELECT * FROM game_rules WHERE id=1').fetchone()
    return {'version':row['version'],**json.loads(row['data'])}


def rules(user=None):
    with accounts.connection() as db:
        setup(db);return rules_in(db)


def number(value,low,high,label):
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not low<=value<=high:raise ValueError(label+' inválido.')
    return value


def int_value(value,low,high,label):
    if type(value) is not int:raise ValueError(label+' deve ser inteiro.')
    return number(value,low,high,label)


def save_rules(user,data):
    admin.require_admin(user)
    section=data.get('section');value=data.get('value')
    if section=='aging':
        if not isinstance(value,list) or len(value)!=20:raise ValueError('Informe as 20 etapas de Aging.')
        for row in value:
            if not isinstance(row,dict) or set(row)!=set(OUTCOMES):raise ValueError('Informe todos os resultados do Aging.')
            for v in row.values():number(v,0,100,'Chance')
            if abs(sum(row.values())-100)>0.00001:raise ValueError('Cada etapa precisa somar 100%.')
    elif section=='drops':
        if not isinstance(value,dict) or set(value)!=set(DEFAULTS['drops']):raise ValueError('Configuração de drops inválida.')
        for k in ('goldChance','equipmentChance','highLevelChance','potionChance','bossChance'):number(value[k],0,100,k)
        number(value['goldMultiplier'],0,100,'Multiplicador de ouro')
        if not isinstance(value['bossOverrides'],dict) or any(k not in BOSS_RULES for k in value['bossOverrides']):raise ValueError('Boss desconhecido.')
        for v in value['bossOverrides'].values():number(v,0,100,'Chance de boss')
    elif section=='monitor':
        if not isinstance(value,dict) or set(value)!=set(DEFAULTS['monitor']):raise ValueError('Monitor inválido.')
        int_value(value['minLevel'],0,200,'Nível mínimo');int_value(value['maxLevel'],value['minLevel'],200,'Nível máximo')
        int_value(value['windowMinutes'],1,1440,'Janela');int_value(value['threshold'],1,10000,'Limite de alerta')
        if not isinstance(value['codes'],list) or len(value['codes'])>100 or any(c not in ITEMS for c in value['codes']):raise ValueError('Use até 100 códigos de itens existentes.')
    else:raise ValueError('Área de configuração desconhecida.')
    with accounts.connection() as db:
        setup(db);db.execute('BEGIN IMMEDIATE');old=rules_in(db)
        if data.get('version')!=old['version']:raise admin.ConflictError('Regras alteradas em outra aba. Atualize o painel.')
        new={k:old[k] for k in ('aging','drops','monitor')};new[section]=value
        db.execute('UPDATE game_rules SET version=version+1,data=? WHERE id=1',(json.dumps(new),))
        admin.audit(db,user,'rules.'+section,'server',{'before':old[section],'after':value})
        return {'ok':True,'rules':rules_in(db)}


def context(user,data,db=None):
    job=int_value(data.get('job'),1,11,'Classe')
    if db is None:
        with accounts.connection() as connection:
            return context(user,data,connection)
    row=db.execute('SELECT c.state,v.generation FROM characters c JOIN character_versions v USING(username,job) WHERE c.username=? AND c.job=? AND v.deleted=0',(user['username'],job)).fetchone()
    if not row:raise ValueError('Este personagem foi excluído. Volte à seleção de personagens.')
    if 'generation' in data and (not isinstance(data['generation'],str) or data['generation']!=row['generation']):
        raise ValueError('Este personagem mudou. Volte à seleção de personagens.')
    saved=json.loads(row['state'])
    name=accounts.identity(user['username'],user['role'])['displayName'] or saved.get('name') or user['username']
    return job,saved,name


def request(db,user,data,action):
    # This runs under the write lock, including before an idempotent replay.
    # A request from an old browser must never target a newly created hero.
    if action in ('aging','kill','skin') or 'generation' in data:context(user,data,db)
    key=data.get('requestId')
    if not isinstance(key,str) or not re.fullmatch(r'[a-zA-Z0-9_-]{8,80}',key):raise ValueError('Identificador de operação inválido.')
    payload=json.dumps({'operation':action,'data':data},sort_keys=True,ensure_ascii=False,allow_nan=False)
    old=db.execute('SELECT * FROM game_requests WHERE username=? AND request_id=?',(user['username'],key)).fetchone()
    if old:
        if old['payload']!=payload:raise ValueError('Identificador reutilizado com dados diferentes.')
        return key,payload,{**json.loads(old['result']),'repeated':True}
    return key,payload,None


def remember(db,user,key,payload,result):
    db.execute('INSERT INTO game_requests VALUES(?,?,?,?)',(user['username'],key,payload,json.dumps(result,ensure_ascii=False)))
    return result


def apply_aging_attributes(item,new_age):
    """Public pinned GSt deltas; keep serialized values aligned with aging.

    Missing numeric values in legacy seed items remain missing, so the client
    can rebuild those from the catalog. Do not turn an absent base into zero.
    """
    old=int_value(item.get('aging',0),0,20,'Aging atual')
    new=int_value(new_age,0,20,'Novo Aging')
    family=item['code'][:3];direction=1 if new>old else -1
    def valid(value):return type(value) in (int,float) and math.isfinite(value)
    def rounded(value,places=0):
        scale=10**places
        return math.floor(value*scale+.5)/scale
    def add(key,amount,places=None):
        if valid(item.get(key)):
            value=item[key]+amount
            item[key]=rounded(value,places) if places is not None else value
    for level in range(abs(new-old)):
        age=old+direction*level-(1 if direction<0 else 0)
        step=3 if age>=19 else 2 if age>=9 else 1
        odd=age%2==1
        damage=item.get('damage')
        if family.startswith('W') and isinstance(damage,list) and len(damage)==2 and all(valid(v) for v in damage):
            item['damage']=[value+direction*step for value in damage]
        if family in ('WA1','WH1','WM1'):add('attackRating',direction*10)
        if family in ('WC1','WP1','WS2','OA2'):add('attackRating',direction*5)
        if family in ('WC1','WP1','WS2','WS1','WT1') and odd:add('critical',direction)
        if family=='DS1':
            if odd:add('block',direction,2)
            add('absorb',direction*.2*step,3)
        if family in ('DA1','DA2','OM1','DG1','DB1','OA2'):
            multiplier=1.05 if family in ('DA1','DA2') else 1.10
            if valid(item.get('defense')):item['defense']=rounded(item['defense']*multiplier if direction>0 else item['defense']/multiplier)
            if family!='OA2':add('absorb',direction*.5*step,3)
    item['aging']=new


def aging(user,data):
    job,saved,name=context(user,data)
    if data.get('stone'):raise ValueError('Pedra de proteção não validada. Nada foi gasto.')
    with accounts.connection() as db:
        setup(db);db.execute('BEGIN IMMEDIATE');key,payload,old=request(db,user,data,'aging')
        if old:return old
        # Read after the write lock, not the earlier snapshot used for identity.
        job,saved,name=context(user,data,db)
        if saved.get('savedAt')!=data.get('savedAt'):raise ValueError('Inventário mudou. Aguarde o salvamento e tente novamente.')
        npc=NPCS.get(data.get('npcId'));pos=saved.get('position',{})
        if not npc or 'aging' not in npc.get('services',[]) or npc['map']!=saved.get('field'):raise ValueError('Procure o NPC de Aging no mapa correto.')
        # playerPosition stores world Z (the public map also uses world Z).
        z=pos.get('z',pos.get('posZ',0));x=pos.get('x',pos.get('posX',0))
        if math.hypot(x-npc['x'],z-npc['z'])>500:raise ValueError('Aproxime-se do NPC de Aging.')
        inv=saved.get('inv',{});bags=inv.get('bag',[])+inv.get('bagB',[])
        item=next((p['item'] for p in bags if p['item'].get('uid')==data.get('item')),None)
        if not item:raise ValueError('Equipamento não encontrado na bolsa.')
        age=int_value(item.get('aging',0),0,19,'Aging atual');code=item['code'];definition=ITEMS.get(code)
        if not definition or code[:3] not in ('WA1','WC1','WH1','WM1','WP1','WS1','WS2','WT1','DA1','DS1','OM1','DA2','WD1','WN1','WV1') or item.get('mixed') or item.get('premiumManaged'):raise ValueError('Equipamento não pode receber Aging.')
        # Public native eligibility exclusions; recipe is the documented FREEston profile.
        excluded={'WA179','WC171','WH159','WM173','WP174','WS173','WS282','WT171'}
        excluded.update(f'{family}{n}' for family in ('DA1','DA2') for n in [*range(31,47),48,51,54,55])
        if code in excluded:raise ValueError('Este equipamento não aceita Aging.')
        ids=data.get('sheltoms')
        if not isinstance(ids,list) or not all(type(i) is int for i in ids) or len(ids)!=len(set(ids)):raise ValueError('Materiais inválidos.')
        materials=[next((p['item'] for p in bags if p['item'].get('uid')==uid),None) for uid in ids]
        tier=1+age//4;count=1+(age%4)//2
        needed=sorted([f'OS1{tier+n:02}' for n in range(3) for _ in range(count)])
        if any(not i or i.get('premiumManaged') or i.get('count',1)<1 for i in materials) or sorted(i['code'] for i in materials)!=needed:raise ValueError('Sheltoms incompletas ou inválidas.')
        fee=math.floor((age+1)*max(0,definition.get('price',0))/2)
        gold=number(saved['stats'].get('gold',0),0,10**12,'Ouro')
        table=rules_in(db)
        import server_economy
        chances,fee=server_economy.aging_terms(db,saved.get('field'),table['aging'][age],fee)
        if gold<fee:raise ValueError('Ouro insuficiente para Aging.')
        roll=RNG.random()*100;outcome='kept'
        for k in OUTCOMES:
            roll-=chances[k]
            if roll<0:outcome=k;break
        for i in materials:i['count']=i.get('count',1)-1
        for bag in ('bag','bagB'):inv[bag]=[p for p in inv.get(bag,[]) if p['item'].get('count',1)>0 and not(outcome=='destroy' and p['item']['uid']==item['uid'])]
        new_age=max(0,min(20,age+{'plus2':2,'plus1':1,'minus1':-1,'minus2':-2,'kept':0,'destroy':0}[outcome]))
        apply_aging_attributes(item,new_age);saved['stats']['gold']=gold-fee;saved['savedAt']=max(int(time.time()*1000),int(saved.get('savedAt',0))+1)
        db.execute('UPDATE characters SET state=? WHERE username=? AND job=?',(json.dumps(saved,ensure_ascii=False),user['username'],job))
        event(db,user,'aging.'+outcome,'craft',job=job,character=name,map_id=npc['map'],code=code,item_name=definition['name'],detail={'from':age,'to':new_age,'fee':fee,'chance':chances,'rulesVersion':table['version']})
        return remember(db,user,key,payload,{'ok':True,'outcome':outcome,'oldAge':age,'newAge':new_age,'gold':saved['stats']['gold'],'inv':inv,'savedAt':saved['savedAt'],'rulesVersion':table['version']})


def eligible(monster,low,high):
    return [i for i in ITEMS.values() if i['slot'] in ('WEAPON_ONE','WEAPON_TWO','ARMOR','BOOTS','GLOVES','ARMLET','SHIELDS','AMULET','RING','SHELTOM') and i['code'] not in BOSS_CODES and i.get('family')!='OR2' and low<=i.get('req',{}).get('level',0)<=high and i.get('price',0)>0 and not re.search(r'\(|costume|event|halloween|christmas',i['name'],re.I)]

def common_potion(level,roll):
    prefix='PL' if roll<.45 else 'PM' if roll<.8 else 'PS'
    return prefix+('104' if level>=80 else '103' if level>=40 else '102' if level>=20 else '101')


def kill(user,data):
    job,saved,name=context(user,data);monster=MONSTERS.get(data.get('monster'));map_id=int_value(data.get('map'),0,10000,'Mapa')
    if not monster:raise ValueError('Monstro desconhecido.')
    if monster.get('boss'):raise ValueError('Bosses usam combate compartilhado e roleta no servidor.')
    if data.get('adminSpawn') and user['role'] not in ('admin','gm'):raise ValueError('Jogador não pode declarar invocação de GM.')
    if saved.get('field')!=map_id:raise ValueError('Mapa não corresponde ao personagem salvo.')
    with accounts.connection() as db:
        setup(db);db.execute('BEGIN IMMEDIATE');key,payload,old=request(db,user,data,'kill')
        if old:return old
        job,saved,name=context(user,data,db)
        if saved.get('field')!=map_id:raise ValueError('Mapa não corresponde ao personagem salvo.')
        recent=db.execute("SELECT count(*) FROM game_events WHERE username=? AND kind='kill' AND created>?",(user['username'],time.time()-60)).fetchone()[0]
        if recent>=600:raise ValueError('Limite de relatos de abate excedido. Aguarde um minuto.')
        table=rules_in(db);r=table['drops'];valid_map=map_id in monster['maps'];gold=0;items=[]
        import server_economy
        premiums=[]
        gameplay_test=user['role'] in ('admin','gm') and saved.get('gmGameplayTest') is True
        if not gameplay_test and user['role'] in ('admin','gm') and saved.get('endgame'):premiums.append(50)
        if not gameplay_test and db.execute("SELECT 1 FROM sqlite_master WHERE name='premium_active'").fetchone():
            third=db.execute("SELECT value FROM premium_active WHERE username=? AND kind='thirdEyes' AND expires>?",(user['username'],time.time())).fetchone()
            if third:premiums=[max([third['value'],*premiums])]
            if db.execute("SELECT 1 FROM premium_active WHERE username=? AND kind='phoenix' AND expires>?",(user['username'],time.time())).fetchone():premiums.append(25)
        rolled=server_economy.roll(db,monster,map_id,premiums,RNG);gold=rolled['gold'];items=rolled['items']
        origin='staff-test' if user['role'] in ('admin','gm') else 'client-kill/server-roll'
        event(db,user,'monster.kill','kill',job=job,character=name,map_id=map_id,monster=monster['name'],trust=origin,detail={'monsterId':monster['id'],'rulesVersion':table['version'],'combatVerified':False})
        if data.get('trialToken'):
            import npc_services
            npc_services.record_trial_kill(db,user,data,monster)
        result=[]
        if gold:
            latest=json.loads(db.execute('SELECT state FROM characters WHERE username=? AND job=?',(user['username'],job)).fetchone()['state'])
            latest['stats']['gold']=latest['stats'].get('gold',0)+gold
            latest['savedAt']=max(int(time.time()*1000),int(latest.get('savedAt',0))+1)
            db.execute('UPDATE characters SET state=? WHERE username=? AND job=?',(json.dumps(latest,ensure_ascii=False),user['username'],job))
            event(db,user,'drop.gold','drop',job=job,character=name,map_id=map_id,monster=monster['name'],code='GOLD',item_name='Ouro',quantity=gold,status='collected',trust=origin)
        for code,count,category in items:
            item=ITEMS[code];event_id=event(db,user,'drop.'+category,'drop',job=job,character=name,map_id=map_id,monster=monster['name'],code=code,item_name=item['name'],item_level=item.get('req',{}).get('level',0),quantity=count,status='generated',trust=origin)
            result.append({'code':code,'count':count,'eventId':event_id})
        monitor=table['monitor'];conditions=['username=?',"kind='drop'",'created>?','item_level BETWEEN ? AND ?',"trust!='staff-test'"]
        args=[user['username'],time.time()-monitor['windowMinutes']*60,monitor['minLevel'],monitor['maxLevel']]
        if monitor['codes']:conditions.append('code IN ('+','.join('?' for _ in monitor['codes'])+')');args+=monitor['codes']
        amount=db.execute('SELECT count(*) FROM game_events WHERE '+' AND '.join(conditions),args).fetchone()[0]
        last=db.execute("SELECT 1 FROM game_events WHERE username=? AND action='monitor.drop-volume' AND created>?",(user['username'],time.time()-monitor['windowMinutes']*60)).fetchone()
        if amount>=monitor['threshold'] and not last:event(db,user,'monitor.drop-volume',severity='warning',job=job,character=name,trust='heuristic',detail={'count':amount,'monitor':monitor,'note':'Volume para revisão; não comprova trapaça.'})
        return remember(db,user,key,payload,{'ok':True,'gold':gold,'items':result,'rulesVersion':table['version'],'economyVersion':rolled['policyVersion'],'gmExperience':gm_tools.experience(db,user,data,saved,monster),'combatVerified':False,'savedAt':latest['savedAt'] if gold else saved.get('savedAt',0)})


def pickup(user,data):
    with accounts.connection() as db:
        setup(db);db.execute('BEGIN IMMEDIATE');key,payload,old=request(db,user,data,'pickup')
        if old:return old
        row=db.execute("SELECT * FROM game_events WHERE id=? AND username=? AND kind='drop'",(data.get('eventId'),user['username'])).fetchone()
        if not row or row['code']=='GOLD' or row['status']!='generated' or ('job' in data and row['job']!=data['job']):raise ValueError('Drop inexistente ou já recolhido para este personagem.')
        db.execute("UPDATE game_events SET status='collected' WHERE id=?",(row['id'],))
        return remember(db,user,key,payload,{'ok':True,'eventId':row['id']})


def history(user,query,kind='drop'):
    admin.require_admin(user)
    def one(k,default=''):return query.get(k,[default])[0]
    where=['kind=?'];args=[kind]
    for field in ('username','code','severity','status','trust'):
        value=one(field)
        if value:where.append(field+'=?');args.append(str(value)[:100])
    if one('codes'):
        codes=[c.strip().upper() for c in one('codes').split(',') if c.strip()]
        if len(codes)>100 or any(c not in ITEMS and c!='GOLD' for c in codes):raise ValueError('Filtro contém código de item desconhecido.')
        where.append('code IN ('+','.join('?' for _ in codes)+')');args+=codes
    if one('action'):where.append('action LIKE ?');args.append(str(one('action'))[:80]+'%')
    for label,op,default in [('minLevel','>=',0),('maxLevel','<=',200)]:
        value=int(one(label,default));int_value(value,0,200,label)
        if kind=='drop':where.append('item_level '+op+' ?');args.append(value)
    if int(one('minLevel',0))>int(one('maxLevel',200)):raise ValueError('Nível mínimo maior que o máximo.')
    since=number(float(one('since',time.time()-86400)),0,time.time()+60,'Data inicial')
    until=number(float(one('until',time.time()+1)),since,time.time()+60,'Data final')
    where+=['created>=?','created<=?'];args+=[since,until]
    base=' AND '.join(where);cursor=int(one('before',0))
    with accounts.connection() as db:
        setup(db)
        total=db.execute('SELECT count(*) FROM game_events WHERE '+base,args).fetchone()[0]
        summary=[dict(r) for r in db.execute('SELECT username,count(*) AS drops,sum(quantity) AS quantity FROM game_events WHERE '+base+' GROUP BY username ORDER BY drops DESC LIMIT 100',args)]
        if cursor:where.append('id<?');args.append(cursor)
        rows=db.execute('SELECT * FROM game_events WHERE '+' AND '.join(where)+' ORDER BY id DESC LIMIT 101',args).fetchall()
        return {'rows':[{**dict(r),'detail':json.loads(r['detail'])} for r in rows[:100]],'total':total,'summary':summary,'next':rows[99]['id'] if len(rows)>100 else None}


def report(user,data):
    text=data.get('message')
    if not isinstance(text,str) or not 1<=len(text)<=500:raise ValueError('Relato inválido.')
    with accounts.connection() as db:
        setup(db)
        craft=data.get('operation')
        craft=craft if craft in ('mix','force','mixReset') else None
        scope="kind='craft' AND trust='client-report'" if craft else "action='client.report'"
        limit=30 if craft else 5
        if db.execute("SELECT count(*) FROM game_events WHERE username=? AND "+scope+" AND created>?",(user['username'],time.time()-60)).fetchone()[0]>=limit:return {'ok':True,'limited':True}
        if craft in ('mix','force','mixReset'):
            event(db,user,'craft.'+craft,'craft',trust='client-report',detail={'message':text,'ok':data.get('ok') is True})
        else:event(db,user,'client.report',severity='warning',trust='client-report',detail={'message':text})
    return {'ok':True}


@lru_cache(maxsize=1)
def skin_library():
    result=[]
    for i in ITEMS.values():
        if i['slot'] not in ('WEAPON_ONE','WEAPON_TWO','ARMOR','SHIELDS') or not i.get('image') or i.get('price',0)<=0:continue
        cat='arma' if i['slot'].startswith('WEAPON') else 'escudo' if i['slot']=='SHIELDS' else 'traje'
        result.append({'id':'look-'+i['code'],'name':i['name'],'look':i['code'],'cat':cat,'hands':2 if i['slot']=='WEAPON_TWO' else 1 if i['slot']=='WEAPON_ONE' else None,'image':i['image'],'price':1000,'description':'Visual cosmético. Preserva os atributos do equipamento.'})
    import custom_skins
    return result+custom_skins.catalog()


def skin_admin(user):
    admin.require_admin(user)
    with accounts.connection() as db:
        setup(db)
        return [{**json.loads(r['data']),'enabled':bool(r['enabled']),'version':r['version']} for r in db.execute('SELECT * FROM skin_offers ORDER BY id')]


def save_skin(user,data):
    admin.require_admin(user)
    canonical=next((i for i in skin_library() if i['id']==data.get('id')),None)
    if not canonical:raise ValueError('Escolha uma skin do catálogo de modelos.')
    name=data.get('name');description=data.get('description','')
    if not isinstance(name,str) or not 1<=len(name.strip())<=100 or not isinstance(description,str) or len(description)>1000:raise ValueError('Nome/descrição inválidos.')
    price=int_value(data.get('price'),0,10**9,'Preço');enabled=data.get('enabled')
    if type(enabled) is not bool:raise ValueError('Disponibilidade inválida.')
    with accounts.connection() as db:
        setup(db);db.execute('BEGIN IMMEDIATE');old=db.execute('SELECT * FROM skin_offers WHERE id=?',(canonical['id'],)).fetchone()
        if data.get('version')!=old['version']:raise admin.ConflictError('Skin alterada em outra aba. Atualize o painel.')
        offer={**canonical,'name':name.strip(),'price':price,'description':description.strip()}
        db.execute('UPDATE skin_offers SET data=?,enabled=?,version=version+1 WHERE id=?',(json.dumps(offer,ensure_ascii=False),int(enabled),canonical['id']))
        admin.audit(db,user,'skin.save',canonical['id'],{'oldPrice':json.loads(old['data'])['price'],'price':price,'enabled':enabled,'name':name})
    return {'ok':True}


def skin_snapshot(db,username,job):
    catalog=[json.loads(r['data']) for r in db.execute('SELECT * FROM skin_offers WHERE enabled=1 OR id IN (SELECT id FROM skin_owned WHERE username=?)',(username,))]
    owned=[r['id'] for r in db.execute('SELECT id FROM skin_owned WHERE username=?',(username,))]
    equip={r['cat']:r['id'] for r in db.execute('SELECT * FROM skin_equipped WHERE username=? AND job=?',(username,job))}
    balance=db.execute('SELECT coins FROM wallets WHERE username=?',(username,)).fetchone()
    return {'catalog':catalog,'owned':owned,'equip':equip,'coins':balance['coins'] if balance else 0,'worn':[i for i in catalog if i['id'] in equip.values()]}


def skins(user,job):
    int_value(job,1,11,'Classe')
    with accounts.connection() as db:
        setup(db);store.setup(db);return skin_snapshot(db,user['username'],job)


def skin_action(user,data):
    job,saved,name=context(user,data);action=data.get('action')
    with accounts.connection() as db:
        setup(db);store.setup(db);db.execute('BEGIN IMMEDIATE');key,payload,old=request(db,user,data,'skin')
        if old:return {**old,'skins':skin_snapshot(db,user['username'],job)}
        job,saved,name=context(user,data,db)
        offer=db.execute('SELECT * FROM skin_offers WHERE id=?',(data.get('id'),)).fetchone()
        if not offer:raise ValueError('Skin desconhecida.')
        skin=json.loads(offer['data'])
        if action=='buy':
            if not offer['enabled']:raise ValueError('Esta skin não está à venda.')
            if data.get('price')!=skin['price']:raise ValueError('Preço mudou. Atualize a loja.')
            if db.execute('SELECT 1 FROM skin_owned WHERE username=? AND id=?',(user['username'],skin['id'])).fetchone():raise ValueError('Você já possui essa skin.')
            db.execute('INSERT OR IGNORE INTO wallets VALUES(?,0)',(user['username'],))
            if not db.execute('UPDATE wallets SET coins=coins-? WHERE username=? AND coins>=?',(skin['price'],user['username'],skin['price'])).rowcount:raise ValueError('Coins insuficientes.')
            db.execute('INSERT INTO skin_owned VALUES(?,?,?)',(user['username'],skin['id'],time.time()))
            db.execute('INSERT INTO coin_ledger(actor,target,delta,reason,created) VALUES(?,?,?,?,?)',(user['username'],user['username'],-skin['price'],'Skin '+skin['id'],time.time()))
        elif action in ('equip','remove'):
            if not db.execute('SELECT 1 FROM skin_owned WHERE username=? AND id=?',(user['username'],skin['id'])).fetchone():raise ValueError('Skin não pertence à conta.')
            if action=='remove':db.execute('DELETE FROM skin_equipped WHERE username=? AND job=? AND cat=? AND id=?',(user['username'],job,skin['cat'],skin['id']))
            else:
                equipment=saved.get('inv',{}).get('equip',{});base=equipment.get({'arma':'weapon','escudo':'shield','traje':'armor'}[skin['cat']])
                if not base or (skin['cat']=='arma' and (base['code'][:3]!=skin['look'][:3] or base['slot']!=ITEMS[skin['look']]['slot'])) or (skin['cat']=='traje' and base['code'][:3]!=skin['look'][:3]):raise ValueError('Equipe arma/armadura do mesmo tipo para usar esta skin.')
                db.execute('INSERT INTO skin_equipped VALUES(?,?,?,?) ON CONFLICT(username,job,cat) DO UPDATE SET id=excluded.id',(user['username'],job,skin['cat'],skin['id']))
        else:raise ValueError('Ação de skin inválida.')
        event(db,user,'skin.'+action,'shop',job=job,character=name,code=skin['look'],item_name=skin['name'],detail={'price':skin['price'] if action=='buy' else 0})
        result=remember(db,user,key,payload,{'ok':True})
        return {**result,'skins':skin_snapshot(db,user['username'],job)}


def inspect_state(db,user,job,state,previous):
    if 'savedAt' in state:number(state['savedAt'],0,10**15,'Versão do save')
    stats=state.get('stats',{})
    if not isinstance(stats,dict):raise ValueError('Atributos inválidos.')
    for field in ('level','gold','exp','str','spi','tal','dex','health'):
        if field not in stats:continue
        number(stats[field],0,10**12,field)
    inv=state.get('inv',{});items=[]
    if not isinstance(inv,dict):raise ValueError('Inventário inválido.')
    for group in ('equip','equipB'):
        if not isinstance(inv.get(group,{}),dict):raise ValueError('Equipamentos inválidos.')
    for group in ('bag','bagB'):
        bag=inv.get(group,[])
        if not isinstance(bag,list) or len(bag)>200 or any(not isinstance(p,dict) or not isinstance(p.get('item'),dict) for p in bag):raise ValueError('Bolsa inválida.')
    belt=inv.get('belt',[])
    if not isinstance(belt,list) or len(belt)>3 or any(i is not None and not isinstance(i,dict) for i in belt):raise ValueError('Cinto inválido.')
    warehouse=state.get('warehouse',{})
    if not isinstance(warehouse,dict):raise ValueError('Armazém inválido.')
    chest=warehouse.get('items',[])
    if not isinstance(chest,list) or len(chest)>600 or any(not isinstance(p,dict) or not isinstance(p.get('item'),dict) for p in chest):raise ValueError('Armazém inválido.')
    if 'gold' in warehouse:number(warehouse['gold'],0,10**12,'Ouro do armazém')
    if isinstance(inv,dict):
        for group in ('equip','equipB'):items+=list((inv.get(group) or {}).values())
        for group in ('bag','bagB'):items += [r.get('item') for r in inv.get(group,[]) if isinstance(r,dict)]
    items += [i for i in belt if i is not None]+[p['item'] for p in chest]
    uids=[i.get('uid') for i in items if isinstance(i,dict) and i.get('uid') is not None]
    flags=[]
    if any(type(uid) is not int or not 1<=uid<=2**53-1 for uid in uids):raise ValueError('Identificador de item inválido.')
    if len(uids)!=len(set(uids)):raise ValueError('UID repetido entre bolsas/equipamentos.')
    for item in items:
        if isinstance(item,dict):
            if item.get('code') in (gm_tools.SHELTOM,gm_tools.POTION) and user['role'] not in ('admin','gm'):raise ValueError('Item exclusivo de GM.')
            int_value(item.get('count',1),1,9999,'Quantidade do item')
            int_value(item.get('aging',0),0,20,'Aging do item')
    if 'level' in stats:int_value(stats['level'],1,150,'Nível')
    if previous and user['role'] not in ('admin','gm'):
        old_inv=previous.get('inv',{});old_items=[]
        for group in ('equip','equipB'):old_items+=list((old_inv.get(group) or {}).values())
        for group in ('bag','bagB'):old_items += [p.get('item') for p in old_inv.get(group,[]) if isinstance(p,dict)]
        old_items += [i for i in old_inv.get('belt',[]) if isinstance(i,dict)]
        old_items += [p.get('item') for p in previous.get('warehouse',{}).get('items',[]) if isinstance(p,dict)]
        old_ages={i.get('uid'):i.get('aging',0) for i in old_items if isinstance(i,dict)}
        for item in items:
            if isinstance(item,dict) and item.get('aging',0)>old_ages.get(item.get('uid'),0):
                raise ValueError('Aging aumentado fora da operação confirmada pelo servidor.')
    before=(previous or {}).get('stats',{})
    for key,threshold in [('gold',100000),('level',5),('exp',10000000)]:
        if key in stats and key in before and stats[key]-before[key]>threshold:flags.append('Salto de '+key)
    if flags:
        last=db.execute("SELECT 1 FROM game_events WHERE username=? AND action='state.anomaly' AND created>?",(user['username'],time.time()-60)).fetchone()
        if not last:event(db,user,'state.anomaly',severity='info' if user['role'] in ('admin','gm') else 'warning',job=job,trust='heuristic',detail={'signals':flags,'staff':user['role'] in ('admin','gm'),'note':'Indício para revisão; pode ser teste de GM, recompensa ou erro do cliente.'})

