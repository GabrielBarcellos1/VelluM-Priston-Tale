"""Persistent shared boss HP, participation, server draws and claimable awards."""
import json,math,secrets,time
import local_accounts as accounts
import game_control as game
import admin_service as admin
import npc_services as npc
RNG=secrets.SystemRandom()
ROUND_SECONDS=5

def setup(db):
    db.executescript('''
CREATE TABLE IF NOT EXISTS boss_config(monster TEXT PRIMARY KEY,version INTEGER,data TEXT);
CREATE TABLE IF NOT EXISTS boss_encounters(id INTEGER PRIMARY KEY AUTOINCREMENT,monster TEXT,field INTEGER,x REAL,y REAL,z REAL,hp INTEGER,hpmax INTEGER,created REAL,dead REAL,forced TEXT);
CREATE INDEX IF NOT EXISTS boss_map ON boss_encounters(field,monster,id);
CREATE TABLE IF NOT EXISTS boss_hits(encounter INTEGER,username TEXT,job INTEGER,generation TEXT,name TEXT,damage INTEGER,last REAL,PRIMARY KEY(encounter,username));
CREATE TABLE IF NOT EXISTS boss_rounds(encounter INTEGER,round INTEGER,data TEXT,PRIMARY KEY(encounter,round));
CREATE TABLE IF NOT EXISTS boss_awards(id INTEGER PRIMARY KEY AUTOINCREMENT,encounter INTEGER,round INTEGER,username TEXT,job INTEGER,generation TEXT,code TEXT,claimed INTEGER DEFAULT 0,UNIQUE(encounter,round));
''')
    db.commit()

def default_config(monster):
    rare=game.BOSS_RULES.get(monster['name'],[])
    common=game.eligible(monster,max(1,monster['level']-25),monster['level'])
    codes=[i['code'] for i in common[:40]] or ['OS108','OS109','OS110']
    return {'rareChance':.1 if rare else 0,'common':[{'code':c,'weight':1} for c in codes],
            'rare':[{'code':r['code'],'weight':1} for r in rare if r['code'] in game.ITEMS]}

def configuration(db,monster):
    row=db.execute('SELECT * FROM boss_config WHERE monster=?',(monster['id'],)).fetchone()
    return {'version':row['version'] if row else 0,**(json.loads(row['data']) if row else default_config(monster))}

def configs(user,data=None):
    admin.require_admin(user)
    with accounts.connection() as db:
        setup(db)
        return {'bosses':[{'id':m['id'],'name':m['name'],**configuration(db,m)} for m in game.MONSTERS.values() if m.get('boss')],
                'items':[{'code':i['code'],'name':i['name']} for i in game.ITEMS.values() if i.get('price',0)>0 or i['code'] in game.BOSS_CODES]}

def save_config(user,data):
    admin.require_admin(user);m=game.MONSTERS.get(data.get('monster'))
    if not m or not m.get('boss'):raise ValueError('Boss desconhecido.')
    value=data.get('value',{});game.number(value.get('rareChance'),0,100,'Chance do exclusivo')
    clean={'rareChance':value['rareChance']}
    for group in ('common','rare'):
        rows=value.get(group)
        if not isinstance(rows,list) or len(rows)>100 or (group=='common' and not rows):raise ValueError('Informe de 1 a 100 itens comuns e até 100 exclusivos.')
        clean[group]=[];seen=set()
        for row in rows:
            code=row.get('code')
            if code not in game.ITEMS or code in seen:raise ValueError('Código inexistente ou repetido na lista.')
            if group=='common' and code in game.BOSS_CODES:raise ValueError('Item exclusivo deve ficar na lista de exclusivos.')
            game.number(row.get('weight'),.001,100000,'Peso');seen.add(code);clean[group].append({'code':code,'weight':row['weight']})
    if clean['rareChance']>0 and not clean['rare']:raise ValueError('Defina um exclusivo ou deixe sua chance em zero.')
    with accounts.connection() as db:
        game.setup(db);setup(db);db.execute('BEGIN IMMEDIATE')
        if configuration(db,m)['version']!=data.get('version'):raise ValueError('A configuração mudou. Reabra o editor.')
        version=data['version']+1
        db.execute('INSERT INTO boss_config VALUES(?,?,?) ON CONFLICT(monster) DO UPDATE SET version=excluded.version,data=excluded.data',(m['id'],version,json.dumps(clean)))
        game.event(db,user,'boss.config','security',detail={'monster':m['id'],'value':clean})
        return {'ok':True,'version':version}

def choose(rows):return RNG.choices(rows,weights=[r['weight'] for r in rows],k=1)[0]['code']

def finish(db,encounter):
    participants=[]
    for p in db.execute('SELECT * FROM boss_hits WHERE encounter=? ORDER BY username',(encounter['id'],)):
        current=db.execute('SELECT generation,deleted FROM character_versions WHERE username=? AND job=?',(p['username'],p['job'])).fetchone()
        if current and not current['deleted'] and current['generation']==p['generation']:participants.append(dict(p))
    if not participants:return
    cfg=configuration(db,game.MONSTERS[encounter['monster']]);count=RNG.randint(3,5)
    rare=encounter['forced'] or (choose(cfg['rare']) if cfg['rare'] and RNG.random()*100<cfg['rareChance'] else None)
    rare_round=RNG.randrange(count) if rare else -1
    for index in range(count):
        code=rare if index==rare_round else choose(cfg['common']);rolls=[{'name':p['name'],'job':p['job'],'number':RNG.randint(0,1000),'ticket':secrets.token_hex(6)} for p in participants]
        high=max(r['number'] for r in rolls);tied=[i for i,r in enumerate(rolls) if r['number']==high];winner=RNG.choice(tied);p=participants[winner]
        result={'round':index+1,'total':count,'item':{'code':code,'name':game.ITEMS[code]['name']},'rare':index==rare_round,'rolls':rolls,'winner':rolls[winner]['ticket'],'winnerName':p['name'],'tiebreak':len(tied)>1,'revealAt':encounter['dead']+(index+1)*ROUND_SECONDS}
        db.execute('INSERT INTO boss_rounds VALUES(?,?,?)',(encounter['id'],index+1,json.dumps(result)))
        db.execute('INSERT INTO boss_awards(encounter,round,username,job,generation,code) VALUES(?,?,?,?,?,?)',(encounter['id'],index+1,p['username'],p['job'],p['generation'],code))
        game.event(db,{'username':p['username']},'boss.roulette','drop',job=p['job'],character=p['name'],map_id=encounter['field'],monster=game.MONSTERS[encounter['monster']]['name'],code=code,item_name=game.ITEMS[code]['name'],quantity=1,status='pending',detail={'encounter':encounter['id'],'round':index+1,'rolls':rolls,'winner':result['winner'],'tiebreak':result['tiebreak']})

def public_encounter(row):
    return {'id':row['id'],'monster':row['monster'],'field':row['field'],'x':row['x'],'y':row['y'],'z':row['z'],'hp':row['hp'],'hpMax':row['hpmax'],'dead':row['dead']}

def action(user,data):
    with accounts.connection() as db:
        game.setup(db);setup(db);db.execute('BEGIN IMMEDIATE');job,saved,name=game.context(user,data,db)
        op=data.get('action','state');field=saved.get('field');now=time.time()
        if op in ('observe','spawn'):
            m=game.MONSTERS.get(data.get('monster'))
            if not m or not m.get('boss'):raise ValueError('Boss desconhecido.')
            if op=='spawn':admin.require_admin(user)
            elif field not in m['maps']:raise ValueError('Boss não pertence a este mapa.')
            key,payload,old=game.request(db,user,data,'boss-'+op)
            if old:return old
            previous=db.execute('SELECT * FROM boss_encounters WHERE monster=? AND field=? ORDER BY id DESC LIMIT 1',(m['id'],field)).fetchone()
            if op=='observe' and previous and (not previous['dead'] or now-previous['dead']<900):result={'boss':public_encounter(previous)}
            else:
                if op=='spawn' and db.execute('SELECT count(*) FROM boss_encounters WHERE field=? AND dead=0',(field,)).fetchone()[0]>=10:raise ValueError('Limite de dez Bosses vivos neste mapa.')
                pos=saved.get('position',{});x=game.number(data.get('x',pos.get('x',0)),-200000,200000,'X');z=game.number(data.get('z',pos.get('z',0)),-200000,200000,'Z');y=game.number(data.get('y',0),-20000,20000,'Y')
                forced='OR205' if data.get('forceDrop') and op=='spawn' and m['name']=='Valento' else None
                if data.get('forceDrop') and not forced:raise ValueError('O teste de drop garantido está disponível para Valento.')
                cursor=db.execute('INSERT INTO boss_encounters(monster,field,x,y,z,hp,hpmax,created,dead,forced) VALUES(?,?,?,?,?,?,?,?,0,?)',(m['id'],field,x,y,z,m['hp'],m['hp'],now,forced))
                result={'boss':public_encounter(db.execute('SELECT * FROM boss_encounters WHERE id=?',(cursor.lastrowid,)).fetchone())}
            return game.remember(db,user,key,payload,{'ok':True,**result})
        if op=='hit':
            key,payload,old=game.request(db,user,data,'boss-hit')
            if old:return old
            row=db.execute('SELECT * FROM boss_encounters WHERE id=?',(data.get('encounter'),)).fetchone()
            if not row or row['field']!=field:raise ValueError('Boss fora deste mapa.')
            amount=game.int_value(data.get('damage'),1,10000000,'Dano');pos=saved.get('position',{})
            if saved.get('stats',{}).get('hp',1)<=0:raise ValueError('Personagem morto não pode atacar.')
            if math.hypot(pos.get('x',0)-row['x'],pos.get('z',0)-row['z'])>1200:raise ValueError('Aproxime-se do Boss.')
            if not row['dead']:
                last=db.execute('SELECT * FROM boss_hits WHERE encounter=? AND username=?',(row['id'],user['username'])).fetchone()
                if last and now-last['last']<.03:raise ValueError('Aguarde o próximo golpe.')
                if last and (last['job']!=job or last['generation']!=data['generation']):raise ValueError('Use o personagem que iniciou este combate.')
                amount=min(amount,row['hp']);hp=row['hp']-amount
                db.execute('INSERT INTO boss_hits VALUES(?,?,?,?,?,?,?) ON CONFLICT(encounter,username) DO UPDATE SET damage=damage+excluded.damage,last=excluded.last',(row['id'],user['username'],job,data['generation'],name,amount,now))
                db.execute('UPDATE boss_encounters SET hp=?,dead=? WHERE id=?',(hp,now if hp==0 else 0,row['id']))
                if hp==0:finish(db,db.execute('SELECT * FROM boss_encounters WHERE id=?',(row['id'],)).fetchone())
            return game.remember(db,user,key,payload,{'ok':True,'boss':public_encounter(db.execute('SELECT * FROM boss_encounters WHERE id=?',(row['id'],)).fetchone())})
        if op=='claim':
            key,payload,old=game.request(db,user,data,'boss-claim')
            if old:return old
            award=db.execute('SELECT * FROM boss_awards WHERE id=? AND username=? AND job=? AND generation=?',(data.get('award'),user['username'],job,data['generation'])).fetchone()
            if not award or award['claimed']:raise ValueError('Recompensa indisponível ou já recebida.')
            result=json.loads(db.execute('SELECT data FROM boss_rounds WHERE encounter=? AND round=?',(award['encounter'],award['round'])).fetchone()[0])
            if now<result['revealAt']:raise ValueError('A rodada ainda não terminou.')
            if saved.get('savedAt')!=data.get('savedAt'):raise ValueError('O inventário mudou. Tente novamente.')
            npc.add_bag(saved,npc.item_instance(award['code'],npc.all_items(saved)))
            saved['savedAt']=max(int(now*1000),saved.get('savedAt',0)+1)
            db.execute('UPDATE characters SET state=? WHERE username=? AND job=?',(json.dumps(saved),user['username'],job));db.execute('UPDATE boss_awards SET claimed=1 WHERE id=?',(award['id'],))
            game.event(db,user,'boss.award.claim','drop',job=job,code=award['code'],item_name=game.ITEMS[award['code']]['name'],quantity=1,status='collected',detail={'award':award['id']})
            return game.remember(db,user,key,payload,{'ok':True,'state':saved})
        if op!='state':raise ValueError('Ação inválida.')
        bosses=[public_encounter(r) for r in db.execute('SELECT * FROM boss_encounters WHERE field=? AND (dead=0 OR dead>?)',(field,now-180))]
        rounds=[]
        for row in db.execute('SELECT r.encounter,r.data FROM boss_rounds r JOIN boss_encounters e ON e.id=r.encounter WHERE e.field=? AND e.dead>? ORDER BY e.id,r.round',(field,now-180)):
            result=json.loads(row['data'])
            if result['revealAt']<=now:rounds.append({'encounter':row['encounter'],**result})
        awards=[{'id':r['id'],'code':r['code'],'name':game.ITEMS[r['code']]['name'],'round':r['round']} for r in db.execute('SELECT a.* FROM boss_awards a JOIN boss_rounds r ON r.encounter=a.encounter AND r.round=a.round WHERE a.username=? AND a.job=? AND a.generation=? AND a.claimed=0',(user['username'],job,data['generation'])) if json.loads(db.execute('SELECT data FROM boss_rounds WHERE encounter=? AND round=?',(r['encounter'],r['round'])).fetchone()[0])['revealAt']<=now]
        participated=[r['encounter'] for r in db.execute('SELECT h.encounter FROM boss_hits h JOIN boss_encounters e ON e.id=h.encounter WHERE h.username=? AND h.job=? AND h.generation=? AND e.field=? AND e.dead>?',(user['username'],job,data['generation'],field,now-180))]
        return {'ok':True,'bosses':bosses,'rounds':rounds,'awards':awards,'participated':participated}
