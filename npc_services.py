"""VelluM NPC transactions. Recipes are local adaptations, explicitly quoted to players."""
import copy,json,math,re,secrets,time
import local_accounts as accounts
import game_control as game
import premium_store as store

def setup(db):
    db.execute('CREATE TABLE IF NOT EXISTS npc_claims(username TEXT,kind TEXT,at REAL,PRIMARY KEY(username,kind))')
    db.execute('CREATE TABLE IF NOT EXISTS npc_trials(token TEXT PRIMARY KEY,username TEXT,job INTEGER,started REAL,expires REAL,kills INTEGER,claimed INTEGER)')

def item_instance(code,items):
    d=copy.deepcopy(game.ITEMS[code]);d.update(uid=max([int(i.get('uid',0)) for i in items]+[100])+1,count=1,aging=0)
    for key,value in list(d.items()):
        if isinstance(value,list) and value and all(type(n) in (int,float) for n in value):
            if key=='damage' and len(value)>=4:d[key]=[value[0],value[2]]
            elif key=='durability':d[key]=[value[-1],value[-1]]
            elif key!='damage':d[key]=value[0]
    return d

def all_items(saved):
    inv=saved.get('inv',{})
    return [i for group in ('equip','equipB') for i in (inv.get(group) or {}).values() if isinstance(i,dict)]+[p['item'] for group in ('bag','bagB') for p in inv.get(group,[])]+[i for i in inv.get('belt',[]) if isinstance(i,dict)]+[p['item'] for p in saved.get('warehouse',{}).get('items',[])]

def add_bag(saved,item):
    inv=saved.setdefault('inv',{});bag=inv.setdefault('bag',[]);inv.setdefault('bagB',[])
    if item['slot']=='POTION':
        existing=next((p['item'] for p in bag if p['item']['code']==item['code'] and not p['item'].get('premiumManaged')),None)
        if existing and existing.get('count',1)+item['count']<=9999:existing['count']=existing.get('count',1)+item['count'];return
    for key in ('bag','bagB'):
        for y in range(7-item['h']):
            for x in range(13-item['w']):
                if not any(x<p['x']+p['item'].get('w',game.ITEMS.get(p['item']['code'],{}).get('w',1)) and x+item['w']>p['x'] and y<p['y']+p['item'].get('h',game.ITEMS.get(p['item']['code'],{}).get('h',1)) and y+item['h']>p['y'] for p in inv[key]):inv[key].append({'x':x,'y':y,'item':item});return
    raise ValueError('Abra espaço em uma das bolsas. Nada foi consumido.')

def quotes(saved,service):
    bag=saved.get('inv',{}).get('bag',[])+saved.get('inv',{}).get('bagB',[]);result=[]
    if service=='smelting':
        for code in sorted({p['item']['code'] for p in bag if p['item']['code'].startswith('OS1')}):
            target='OS1'+str(int(code[3:])+1).zfill(2)
            if target in game.ITEMS and int(code[3:])<10:result.append({'id':code,'name':game.ITEMS[code]['name'],'output':game.ITEMS[target]['name'],'fee':1000*int(code[3:])**2,'needs':f'3 × {game.ITEMS[code]["name"]}','code':target})
    elif service=='manufacture':
        for p in bag:
            item=p['item'];d=game.ITEMS.get(item['code'])
            if not d or item.get('premiumManaged') or item.get('questWeapon') or item.get('aging',0) or item.get('mixed') or d['slot'] not in ('WEAPON_ONE','WEAPON_TWO','ARMOR','BOOTS','GLOVES','ARMLET','SHIELDS'):continue
            candidates=[i for i in game.ITEMS.values() if __import__('class_availability').active_item(i) and i.get('family')==d.get('family') and i.get('req',{}).get('level',0)>d.get('req',{}).get('level',0) and i.get('price',0)>d.get('price',0) and i.get('price',0)>0 and not re.search(r'\(|costume|event|halloween|christmas',i['name'],re.I)]
            if not candidates:continue
            target=min(candidates,key=lambda i:(i.get('req',{}).get('level',0),i['price']))
            if target.get('req',{}).get('level',0)>saved.get('stats',{}).get('level',1):continue
            material='OS1'+str(min(10,max(1,target.get('req',{}).get('level',1)//10))).zfill(2)
            result.append({'id':item['uid'],'name':item['name'],'output':target['name'],'fee':max(100,math.floor(target['price']*.25)),'needs':f'Equipamento base + 3 × {game.ITEMS[material]["name"]}','code':target['code'],'material':material})
    return result

def action(user,data):
    with accounts.connection() as db:
        game.setup(db);setup(db);store.setup(db);db.commit();db.execute('BEGIN IMMEDIATE')
        key,payload,old=game.request(db,user,data,'npc')
        if old:return old
        job,saved,name=game.context(user,data,db);npc=game.NPCS.get(data.get('npcId'));pos=saved.get('position',{})
        if not npc or npc['map']!=saved.get('field') or math.hypot(pos.get('x',0)-npc['x'],pos.get('z',0)-npc['z'])>500:raise ValueError('Aproxime-se do NPC correto.')
        service=data.get('service');op=data.get('action','view')
        if service not in npc.get('services',[]):raise ValueError('Este NPC não oferece esse serviço.')
        if op!='view' and saved.get('savedAt')!=data.get('savedAt'):raise ValueError('O inventário mudou. Atualize o serviço antes de continuar.')
        stats=saved.setdefault('stats',{})
        if op=='view':
            if service=='clan':
                result={'clans':[dict(r) for r in db.execute('SELECT c.id,c.name,count(m.username) members FROM clans c LEFT JOIN clan_members m ON m.clan_id=c.id WHERE c.locked=0 GROUP BY c.id')],'membership':dict(db.execute('SELECT c.id,c.name,c.locked FROM clans c JOIN clan_members m ON m.clan_id=c.id WHERE m.username=?',(user['username'],)).fetchone() or {})}
            elif service=='levelRanking':result={'ranking':[{'name':json.loads(r['state']).get('name') or r['username'],'job':r['job'],'level':json.loads(r['state']).get('stats',{}).get('level',1)} for r in db.execute('SELECT c.username,c.job,c.state FROM characters c JOIN users u ON u.username=c.username WHERE u.blocked=0') ]};result['ranking'].sort(key=lambda r:-r['level']);result['ranking']=result['ranking'][:100]
            else:result={'recipes':quotes(saved,service)}
            return {'ok':True,**result}
        changed=False
        if service=='charity' and op=='claim':
            previous=db.execute('SELECT at FROM npc_claims WHERE username=? AND kind=?',(user['username'],'charity')).fetchone()
            if previous and time.time()-previous['at']<86400:raise ValueError('A caridade pode ser retirada novamente após 24 horas.')
            tier='104' if stats.get('level',1)>=80 else '103' if stats.get('level',1)>=40 else '102' if stats.get('level',1)>=20 else '101'
            for prefix in ('PL','PM','PS'):
                item=item_instance(prefix+tier,all_items(saved));item['count']=20;add_bag(saved,item)
            db.execute('INSERT INTO npc_claims VALUES(?,?,?) ON CONFLICT(username,kind) DO UPDATE SET at=excluded.at',(user['username'],'charity',time.time()));changed=True;result={'message':'Retiradas 20 poções de HP, MP e RES. Próxima retirada em 24 horas.'}
        elif service in ('smelting','manufacture') and op=='craft':
            quote=next((q for q in quotes(saved,service) if q['id']==data.get('recipe')),None)
            if not quote:raise ValueError('Receita indisponível. Atualize a lista.')
            if stats.get('gold',0)<quote['fee']:raise ValueError('Ouro insuficiente.')
            inv=saved['inv'];bag=inv.get('bag',[])+inv.get('bagB',[]);material=quote.get('material',quote['id']);remaining=3
            available=[p['item'] for p in bag if p['item']['code']==material and not p['item'].get('premiumManaged')]
            if sum(i.get('count',1) for i in available)<3:raise ValueError('Faltam as três sheltoms comuns da receita.')
            for item in available:
                n=min(remaining,item.get('count',1));item['count']=item.get('count',1)-n;remaining-=n
                if not remaining:break
            if service=='manufacture':
                for p in bag:
                    if p['item']['uid']==quote['id']:p['item']['count']=0
            for group in ('bag','bagB'):inv[group]=[p for p in inv.get(group,[]) if p['item'].get('count',1)>0]
            add_bag(saved,item_instance(quote['code'],all_items(saved)));stats['gold']-=quote['fee'];changed=True;result={'message':'Produção VelluM concluída: '+quote['output']}
        elif service=='post' and op=='claim':result={'message':'Os produtos comprados e as Forças do kit são sincronizados com sua bolsa ao atualizar a Loja.','wallet':store.snapshot(db,user['username'])}
        elif service=='clan':
            member=db.execute('SELECT c.* FROM clans c JOIN clan_members m ON m.clan_id=c.id WHERE m.username=?',(user['username'],)).fetchone()
            if member and member['locked']:raise ValueError('O clã Staff é permanente.')
            if op=='leave':db.execute('DELETE FROM clan_members WHERE username=?',(user['username'],));result={'message':'Você saiu do clã.'}
            elif op=='create':
                clan_name=data.get('name','').strip()
                if member:raise ValueError('Saia do clã atual primeiro.')
                if not re.fullmatch(r'[\w -]{3,18}',clan_name) or clan_name.casefold() in ('staff','admin','gm'):raise ValueError('Nome do clã inválido ou reservado.')
                if stats.get('level',1)<20 or stats.get('gold',0)<500000:raise ValueError('Criar um clã requer nível 20 e 500.000 de ouro.')
                if db.execute('SELECT 1 FROM clans WHERE lower(name)=lower(?)',(clan_name,)).fetchone():raise ValueError('Este nome de clã já existe.')
                clan_id=db.execute('INSERT INTO clans(name,locked) VALUES(?,0)',(clan_name,)).lastrowid;db.execute('INSERT INTO clan_members VALUES(?,?)',(user['username'],clan_id));stats['gold']-=500000;changed=True;result={'message':'Clã criado: '+clan_name}
            elif op=='join':
                if member:raise ValueError('Você já participa de um clã.')
                clan=db.execute('SELECT * FROM clans WHERE id=? AND locked=0',(data.get('clanId'),)).fetchone()
                if not clan:raise ValueError('Clã indisponível.')
                db.execute('INSERT INTO clan_members VALUES(?,?)',(user['username'],clan['id']));result={'message':'Entrada no clã '+clan['name']+' confirmada.'}
            else:raise ValueError('Ação de clã inválida.')
        elif service=='bellatra' and op=='start':
            if stats.get('level',1)<20:raise ValueError('O desafio Bellatra VelluM requer nível 20.')
            recent=db.execute('SELECT started FROM npc_trials WHERE username=? ORDER BY started DESC LIMIT 1',(user['username'],)).fetchone()
            if recent and time.time()-recent['started']<600:raise ValueError('Aguarde dez minutos entre desafios Bellatra.')
            token=secrets.token_hex(16);db.execute('INSERT INTO npc_trials VALUES(?,?,?,?,?,0,0)',(token,user['username'],job,time.time(),time.time()+600));result={'message':'Derrote 12 inimigos do desafio em dez minutos.','trial':{'token':token,'expires':time.time()+600,'field':30,'required':12}}
        elif service=='bellatra' and op=='claim':
            trial=db.execute('SELECT * FROM npc_trials WHERE token=? AND username=? AND job=?',(data.get('token'),user['username'],job)).fetchone()
            if not trial or trial['claimed'] or trial['kills']<12:raise ValueError('Desafio ainda não concluído ou recompensa já recebida.')
            db.execute('UPDATE npc_trials SET claimed=1 WHERE token=?',(trial['token'],));stats['gold']=stats.get('gold',0)+stats.get('level',1)*1000;changed=True;result={'message':'Bellatra VelluM concluída. Recompensa de ouro recebida uma vez.'}
        else:raise ValueError('Ação indisponível para este serviço.')
        if changed:
            saved['savedAt']=max(int(time.time()*1000),saved.get('savedAt',0)+1);db.execute('UPDATE characters SET state=? WHERE username=? AND job=?',(json.dumps(saved,ensure_ascii=False),user['username'],job));result['state']=saved
        game.event(db,user,'npc.'+service+'.'+op,'service',job=job,map_id=npc['map'],detail={'npcId':npc['id']})
        return game.remember(db,user,key,payload,{'ok':True,**result})

def record_trial_kill(db,user,data,monster):
    token=data.get('trialToken')
    if not token or data.get('map')!=30 or monster.get('boss'):return
    job,saved,name=game.context(user,data,db)
    if abs(monster['level']-saved.get('stats',{}).get('level',1))>10:return
    setup(db)
    db.execute('UPDATE npc_trials SET kills=min(12,kills+1) WHERE token=? AND username=? AND job=? AND expires>? AND claimed=0',(token,user['username'],data['job'],time.time()))
