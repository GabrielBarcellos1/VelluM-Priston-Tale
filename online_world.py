"""Authenticated shared presence/chat. Combat and ordinary loot remain local."""
from collections import deque
import math,re,threading,time
from pathlib import Path
import json
import local_accounts as accounts
LOCK=threading.RLock(); PLAYERS={}; EVENTS=deque(maxlen=300); SEQ=0; NEXT_ID=1000000
FIELDS={f['id'] for f in json.loads((Path(__file__).parent/'data/map-fields.json').read_text())['fields']}
MODELS={1:('b001','tmh-b01'),2:('a001','tmh-a01'),3:('d001','tfh-d01'),4:('c001','tmh-c01'),5:('mb001','mfh-b01'),6:('ma001','mmh-a01'),7:('md001','mmh-d01'),8:('mc001','mfh-c01'),9:('e001','tfh-e01'),10:('me001','mmh-e01'),11:('f001','tfh-f01')}
def finite(value,low,high):
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not low<=value<=high:raise ValueError('Coordenada inválida.')
    return value

def prune(now):
    for name in [name for name,p in PLAYERS.items() if now-p['at']>12]:PLAYERS.pop(name,None)

def heartbeat(user,data):
    global NEXT_ID
    job=data.get('job');field=data.get('field');client=data.get('clientId')
    if type(job) is not int or job not in MODELS or type(field) is not int or field not in FIELDS:raise ValueError('Classe ou mapa inválido.')
    if not isinstance(client,str) or not re.fullmatch(r'[a-f0-9]{32}',client):raise ValueError('Identificador inválido.')
    pos={k:finite(data.get(k),-200000,200000) for k in ('x','z','y')}
    angle=finite(data.get('angle',0),-10000,10000)
    saved=accounts.load_state(user['username'],job) or {}; stats=saved.get('stats',{});equip=saved.get('inv',{}).get('equip',{})
    name=user.get('displayName') or saved.get('name') or user['username']
    if not isinstance(name,str) or not re.fullmatch(r'[\w -]{1,18}',name) or (name.casefold()=='vellum' and user['username']!='admin'):name=user['username']
    now=time.monotonic();staff=user['role'] in ('admin','gm')
    body,face=MODELS[job]
    packet={'name':name,'job':job,'level':max(1,min(150,int(stats.get('level',1)))),'body':f'char/tmabcd/{body}.ini','face':f'char/tmabcd/{face}.inf',
            **pos,'angle':angle,'moving':data.get('moving') is True,'running':data.get('running') is True,'motion':data.get('motion') if data.get('motion') in ('stand','run','walk','attack','skill','damage','dead') else 'stand','dead':data.get('dead') is True,'seq':int(data.get('seq',0)) if isinstance(data.get('seq',0),int) and 0<=data.get('seq',0)<=1e9 else 0,'hp':1,'hpMax':1,'gm':staff}
    for slot in ('weapon','shield','armor'):
        item=equip.get(slot) or {};code=item.get('code')
        if isinstance(code,str) and re.fullmatch(r'[A-Z]{2}\d{3}',code):
            packet[slot]=code
            if slot in ('weapon','shield'):packet[slot+'Aging']=max(0,min(25,int(item.get('aging',0))))
    costume=equip.get('costume') or {}
    if saved.get('inv',{}).get('costumeOn') or saved.get('inv',{}).get('costumeAlways'):
        if re.fullmatch(r'CA\d{3}',costume.get('code','')):packet['costume']=costume['code']
    with accounts.connection() as db:
        if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='skin_equipped'").fetchone():
            for row in db.execute('SELECT o.data FROM skin_equipped e JOIN skin_offers o ON o.id=e.id JOIN skin_owned n ON n.username=e.username AND n.id=e.id WHERE e.username=? AND e.job=?',(user['username'],job)):
                skin=json.loads(row['data']);base=equip.get({'arma':'weapon','escudo':'shield','traje':'armor'}.get(skin['cat'],''))
                if base and base['code'][:3]==skin['look'][:3]:packet[{'arma':'skinWeapon','escudo':'skinShield','traje':'costume'}[skin['cat']]]=skin['look']
    with LOCK:
        # Deletion also holds LOCK. Validate at publication time so a heartbeat
        # already in flight cannot bring back a deleted/recreated character.
        if 'generation' in data:
            current=accounts.character_record(user['username'],job)
            if not current['state'] or not isinstance(data['generation'],str) or data['generation']!=current['generation']:
                raise ValueError('Este personagem mudou ou foi excluído. Volte à seleção de personagens.')
        prune(now);old=PLAYERS.get(user['username'])
        if old and old['client']!=client:raise ValueError('Esta conta já está online em outra aba. Feche-a e aguarde 12 segundos.')
        if len(PLAYERS)>=100 and not old:raise ValueError('Servidor de teste cheio (100 contas).')
        if not old:NEXT_ID+=1
        packet['id']=old['packet']['id'] if old else NEXT_ID
        packet['ts']=time.time()
        if any(p['packet']['name'].casefold()==name.casefold() and k!=user['username'] for k,p in PLAYERS.items()):packet['name']=user['username']
        PLAYERS[user['username']]={'client':client,'field':field,'job':job,'generation':data.get('generation'),'packet':packet,'at':now,'hidden':staff and data.get('hidden') is True}
        peers=[p['packet'] for k,p in PLAYERS.items() if k!=user['username'] and p['field']==field and not p['hidden']]
        cursor=data.get('cursor',0);cursor=cursor if isinstance(cursor,int) and cursor>=0 else 0
        chats=[e['packet'] for e in EVENTS if e['seq']>cursor and (e['field']==field or e['field'] is None) and time.time()-e['at']<120]
        return {'players':peers,'chats':chats,'cursor':SEQ,'online':len(PLAYERS),'selfName':packet['name'],'world':'shared-presence','sharedCombat':False}

def chat(user,data):
    global SEQ
    text=data.get('text');channel=data.get('channel','normal')
    if not isinstance(text,str) or not text.strip() or len(text)>240 or text.strip().startswith('/') or channel not in ('normal','all'):raise ValueError('Mensagem inválida. Use o chat normal ou global.')
    with LOCK:
        now=time.monotonic();prune(now);p=PLAYERS.get(user['username'])
        if not p or p['client']!=data.get('clientId'):raise ValueError('Entre no mapa antes de conversar.')
        if now-p.get('chatAt',-100)<.5:raise ValueError('Aguarde um instante entre mensagens.')
        p['chatAt']=now;SEQ+=1
        EVENTS.append({'seq':SEQ,'at':time.time(),'field':None if channel=='all' else p['field'],'packet':{'t':'chat','from':p['packet']['name'],'text':re.sub(r'[\x00-\x1f]',' ',text.strip()),'channel':channel}})
        return {'ok':True}

def leave(user,data):
    with LOCK:
        p=PLAYERS.get(user['username'])
        if p and p['client']==data.get('clientId'):PLAYERS.pop(user['username'],None)
    return {'ok':True}

def count():
    with LOCK:prune(time.monotonic());return len(PLAYERS)
