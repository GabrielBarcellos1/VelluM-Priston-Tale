"""Local accounts and per-account characters. No production account connection."""
from pathlib import Path
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
import re
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('PWEB_DATA_DIR', str(ROOT / '.local-data')))
ITERATIONS = 210000


@contextmanager
def connection():
    DATA.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DATA / 'accounts.sqlite3', timeout=15)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA journal_mode=WAL')
    db.executescript('''CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY, role TEXT NOT NULL, salt TEXT NOT NULL, digest TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, username TEXT NOT NULL, expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS characters(username TEXT NOT NULL, job INTEGER NOT NULL, state TEXT NOT NULL, PRIMARY KEY(username,job));
CREATE TABLE IF NOT EXISTS deleted_users(username TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,detail TEXT NOT NULL,created REAL NOT NULL);''')
    columns={row['name'] for row in db.execute('PRAGMA table_info(users)')}
    for column in ('blocked','version'):
        if column not in columns:db.execute(f'ALTER TABLE users ADD COLUMN {column} INTEGER NOT NULL DEFAULT {0 if column=="blocked" else 1}')
    for user in json.loads((ROOT / 'data' / 'accounts.seed.json').read_text()):
        if db.execute('SELECT 1 FROM deleted_users WHERE username=?',(user['username'],)).fetchone():continue
        db.execute('INSERT OR IGNORE INTO users(username,role,salt,digest) VALUES(?,?,?,?)', (user['username'], user['role'], user['salt'], user['digest']))
    setup_world(db)
    db.commit()
    try:
        with db:
            yield db
    finally:
        db.close()


def login(username, password):
    if not isinstance(username, str) or not isinstance(password, str) or len(password)>256:
        return None
    with connection() as db:
        row = db.execute('SELECT * FROM users WHERE username=?', (username.strip().lower(),)).fetchone()
        salt = bytes.fromhex(row['salt']) if row else bytes(16)
        digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, ITERATIONS).hex()
        if not row or row['blocked'] or not hmac.compare_digest(digest, row['digest']):
            return None
        token = secrets.token_hex(32)
        db.execute('DELETE FROM sessions WHERE expires<?', (time.time(),))
        db.execute('INSERT INTO sessions VALUES(?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), row['username'], time.time()+43200))
        return token


def user_for(token):
    if not token or len(token)>128:
        return None
    with connection() as db:
        row = db.execute('SELECT u.username,u.role FROM sessions s JOIN users u ON s.username=u.username WHERE s.token=? AND s.expires>? AND u.blocked=0', (hashlib.sha256(token.encode()).hexdigest(),time.time())).fetchone()
        return {**dict(row),**identity(row["username"],row["role"])} if row else None


def logout(token):
    with connection() as db:
        db.execute('DELETE FROM sessions WHERE token=?', (hashlib.sha256(token.encode()).hexdigest(),))


def load_state(username, job):
    with connection() as db:
        row = db.execute('SELECT state FROM characters WHERE username=? AND job=?',(username,job)).fetchone()
        return json.loads(row['state']) if row else None


def character_record(username,job):
    with connection() as db:
        row=db.execute('SELECT c.state,v.generation FROM characters c JOIN character_versions v USING(username,job) WHERE c.username=? AND c.job=? AND v.deleted=0',(username,job)).fetchone()
        return {'state':json.loads(row['state']),'generation':row['generation']} if row else {'state':None,'generation':None}


def save_state(user, job, state, generation=None, require_generation=False):
    if job not in range(1,12) or not isinstance(state,dict):
        raise ValueError('Personagem inválido')
    if user['role'] not in ('admin','gm'):
        state['endgame'] = False
        for item in (state.get('inv',{}).get('equip',{}) or {}).values():
            if isinstance(item,dict):
                item.pop('endgame',None)
    # Staff role display badges are account-level, not character nicknames.
    # The persisted nickname is authoritative and is fixed to the original on writes.
    for key in ('clan','staff','crown','topClass'):state.pop(key,None)
    encoded = json.dumps(state,ensure_ascii=False,allow_nan=False)
    if len(encoded)>1000000:
        raise ValueError('Personagem excede o limite')
    import game_control
    with connection() as db:
        game_control.setup(db)
        db.execute('BEGIN IMMEDIATE')
        previous = db.execute('SELECT state FROM characters WHERE username=? AND job=?',(user['username'],job)).fetchone()
        version=db.execute('SELECT generation,deleted FROM character_versions WHERE username=? AND job=?',(user['username'],job)).fetchone()
        if (version and version['deleted']) or (require_generation and (not previous or not version or generation!=version['generation'])):
            raise ValueError('Este personagem mudou ou foi excluído. Volte à seleção de personagens.')
        if previous and require_generation:
            original=json.loads(previous['state'])
            state['name']=original.get('name') or user['username']
            if isinstance(state.get('stats'),dict):state['stats']['name']=state['name']
            encoded=json.dumps(state,ensure_ascii=False,allow_nan=False)
        game_control.inspect_state(db,user,job,state,json.loads(previous['state']) if previous else None)
        if previous:
            old = json.loads(previous['state']).get('savedAt', 0)
            new = state.get('savedAt', 0)
            if isinstance(old, (int,float)) and isinstance(new, (int,float)) and old > new:
                return
        db.execute('INSERT INTO characters VALUES(?,?,?) ON CONFLICT(username,job) DO UPDATE SET state=excluded.state',(user['username'],job,encoded))
        if not version:db.execute('INSERT INTO character_versions VALUES(?,?,?,0)',(user['username'],job,secrets.token_hex(16)))


def create_player(username,password):
    if not isinstance(username,str) or not re.fullmatch(r'[a-zA-Z0-9_]{3,24}',username):
        raise ValueError('Usuário deve ter 3 a 24 letras, números ou sublinhado.')
    if not isinstance(password,str) or not 8<=len(password)<=256:
        raise ValueError('A senha precisa ter entre 8 e 256 caracteres.')
    salt=secrets.token_bytes(16)
    digest=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,ITERATIONS).hex()
    try:
        with connection() as db:
            db.execute('INSERT INTO users(username,role,salt,digest) VALUES(?,?,?,?)',(username.lower(),'player',salt.hex(),digest))
    except sqlite3.IntegrityError:
        raise ValueError('Esse usuário já existe.') from None


def change_password(username,current_password,new_password,current_token):
    if not isinstance(current_password,str) or len(current_password)>256:
        raise ValueError('Senha atual inválida.')
    if not isinstance(new_password,str) or not 8<=len(new_password)<=256:
        raise ValueError('A nova senha precisa ter entre 8 e 256 caracteres.')
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT salt,digest FROM users WHERE username=?',(username,)).fetchone()
        if not row or not hmac.compare_digest(hashlib.pbkdf2_hmac('sha256',current_password.encode(),bytes.fromhex(row['salt']),ITERATIONS).hex(),row['digest']):
            raise ValueError('Senha atual incorreta.')
        salt=secrets.token_bytes(16)
        digest=hashlib.pbkdf2_hmac('sha256',new_password.encode(),salt,ITERATIONS).hex()
        db.execute('UPDATE users SET salt=?,digest=? WHERE username=?',(salt.hex(),digest,username))
        db.execute('DELETE FROM sessions WHERE username=? AND token<>?',(username,hashlib.sha256(current_token.encode()).hexdigest()))


def identity(username, role):
    return {'displayName':'ADM-VelluM' if username=='admin' else None,
            'preferredClass':2 if username=='huss' else 1,
            'staff':role in ('admin','gm')}


def setup_world(db):
    db.executescript('''CREATE TABLE IF NOT EXISTS local_migrations(id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS clans(id INTEGER PRIMARY KEY,name TEXT UNIQUE,locked INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS clan_members(username TEXT PRIMARY KEY,clan_id INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS world_state(key TEXT PRIMARY KEY,value TEXT NOT NULL);''')
    db.execute('CREATE TABLE IF NOT EXISTS character_versions(username TEXT NOT NULL,job INTEGER NOT NULL,generation TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(username,job))')
    db.execute("INSERT OR IGNORE INTO clans VALUES(1,'Staff',1)")
    db.execute("INSERT INTO clan_members SELECT username,1 FROM users WHERE role IN ('admin','gm') ON CONFLICT(username) DO UPDATE SET clan_id=1")
    db.execute("DELETE FROM clan_members WHERE clan_id=1 AND username IN (SELECT username FROM users WHERE role NOT IN ('admin','gm'))")
    if not db.execute("SELECT 1 FROM local_migrations WHERE id='15-admin-name'").fetchone():
        for row in db.execute("SELECT job,state FROM characters WHERE username='admin'").fetchall():
            state=json.loads(row['state']);state['name']='VelluM'
            if isinstance(state.get('stats'),dict):state['stats']['name']='VelluM'
            db.execute("UPDATE characters SET state=? WHERE username='admin' AND job=?",(json.dumps(state,ensure_ascii=False),row['job']))
        db.execute("INSERT INTO local_migrations VALUES('15-admin-name')")
    if not db.execute("SELECT 1 FROM local_migrations WHERE id='15-teio'").fetchone():
        seed=json.loads((ROOT/'data/characters.seed.json').read_text(encoding='utf-8'))
        for entry in seed:
            db.execute('INSERT OR IGNORE INTO characters VALUES(?,?,?)',(entry['username'],entry['job'],json.dumps(entry['state'],ensure_ascii=False)))
        db.execute("INSERT INTO local_migrations VALUES('15-teio')")
    db.execute('INSERT OR IGNORE INTO character_versions SELECT username,job,lower(hex(randomblob(16))),0 FROM characters')


CLASS_NAMES=('Lutador','Mecânico','Arqueira','Pike','Atalanta','Cavaleiro','Mago','Sacerdotisa','Assassina','Xamã','Guerreira')


def character_generation(username,job):
    with connection() as db:
        row=db.execute('SELECT generation FROM character_versions WHERE username=? AND job=? AND deleted=0',(username,job)).fetchone()
        return row['generation'] if row else None


def roster(user):
    import online_world
    with online_world.LOCK:
        online_world.prune(time.monotonic())
        active=online_world.PLAYERS.get(user['username'])
        active_job=active['job'] if active else None
    with connection() as db:
        characters=[]
        for row in db.execute('SELECT c.job,c.state,v.generation FROM characters c JOIN character_versions v USING(username,job) WHERE c.username=? AND v.deleted=0 ORDER BY c.job',(user['username'],)):
            state=json.loads(row['state'])
            characters.append({'job':row['job'],'name':state.get('name') or user['username'],
                               'level':state.get('stats',{}).get('level',1),'field':state.get('field'),
                               'generation':row['generation'],'online':active_job==row['job']})
    return {'characters':characters,'classes':[{'job':i+1,'name':name,'tribe':'Morion' if i+1 in (5,6,7,8,10) else 'Tempskron'} for i,name in enumerate(CLASS_NAMES)],'limit':11}


def manage_character(user,data):
    import online_world
    job=data.get('job');action=data.get('action')
    if type(job) is not int or job not in range(1,12):raise ValueError('Escolha uma classe válida.')
    if action not in ('create','delete'):raise ValueError('Ação inválida.')
    with online_world.LOCK,connection() as db:
        db.execute('BEGIN IMMEDIATE')
        previous=db.execute('SELECT state FROM characters WHERE username=? AND job=?',(user['username'],job)).fetchone()
        version=db.execute('SELECT generation FROM character_versions WHERE username=? AND job=?',(user['username'],job)).fetchone()
        if action=='create':
            if previous:raise ValueError('Você já tem um personagem desta classe.')
            name=data.get('name','')
            if not isinstance(name,str) or not re.fullmatch(r'[\w -]{3,18}',name) or name!=name.strip():raise ValueError('Nome: 3 a 18 letras, números, espaços ou sublinhado.')
            if name.casefold() in ('admin','administrator','administrador','gm','staff','vellum') and not (name=='VelluM' and user['username']=='admin'):raise ValueError('Este nome é reservado à Staff.')
            for other in db.execute('SELECT username,state FROM characters'):
                other_name=json.loads(other['state']).get('name',other['username'])
                if str(other_name).casefold()==name.casefold() and not (user['username']=='admin' and other['username']=='admin'):
                    raise ValueError('Este nome já está em uso.')
            state={'name':name,'stats':{'name':name,'level':1},'field':21 if job in (5,6,7,8,10) else 3,'savedAt':int(time.time()*1000)}
            generation=secrets.token_hex(16)
            db.execute('INSERT INTO characters VALUES(?,?,?)',(user['username'],job,json.dumps(state,ensure_ascii=False)))
            db.execute('INSERT INTO character_versions VALUES(?,?,?,0) ON CONFLICT(username,job) DO UPDATE SET generation=excluded.generation,deleted=0',(user['username'],job,generation))
        else:
            if not previous or not version or data.get('generation')!=version['generation']:raise ValueError('O personagem mudou. Atualize a seleção.')
            online_world.prune(time.monotonic())
            active=online_world.PLAYERS.get(user['username'])
            if active and active['job']==job:raise ValueError('Saia deste personagem antes de excluí-lo. Se fechou a aba, aguarde 12 segundos.')
            name=json.loads(previous['state']).get('name') or user['username']
            if data.get('confirmation')!=name:raise ValueError('Digite o nome exato do personagem para confirmar.')
            password=data.get('password')
            row=db.execute('SELECT salt,digest FROM users WHERE username=?',(user['username'],)).fetchone()
            if not isinstance(password,str) or len(password)>256 or not hmac.compare_digest(hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(row['salt']),ITERATIONS).hex(),row['digest']):raise ValueError('Senha da conta incorreta.')
            db.execute('DELETE FROM characters WHERE username=? AND job=?',(user['username'],job))
            db.execute('UPDATE character_versions SET deleted=1 WHERE username=? AND job=?',(user['username'],job))
            if db.execute("SELECT 1 FROM sqlite_master WHERE name='skin_equipped'").fetchone():db.execute('DELETE FROM skin_equipped WHERE username=? AND job=?',(user['username'],job))
            if db.execute("SELECT 1 FROM sqlite_master WHERE name='game_events'").fetchone():db.execute("UPDATE game_events SET status='expired' WHERE username=? AND job=? AND kind='drop' AND status='generated'",(user['username'],job))
        db.execute('INSERT INTO admin_audit(actor,action,target,detail,created) VALUES(?,?,?,?,?)',(user['username'],'character.'+action,user['username'],json.dumps({'job':job,'name':name},ensure_ascii=False),time.time()))
    return {'ok':True}


def community(user,job):
    if job not in range(1,12):raise ValueError('Classe inválida.')
    with connection() as db:
        rows=db.execute('SELECT c.username,c.job,c.state,u.role FROM characters c JOIN users u ON c.username=u.username WHERE u.blocked=0').fetchall()
        staff=[];tops={}
        for row in rows:
            state=json.loads(row['state']);profile=identity(row['username'],row['role'])
            name=profile['displayName'] or state.get('name') or row['username']
            stats=state.get('stats',{})
            level=stats.get('level',1)
            if type(level) not in (int,float) or not 1<=level<=150:continue
            record={'username':row['username'],'name':str(name)[:18],'job':row['job'],'level':int(level),'rank':1}
            if profile['staff']:
                staff.append({**record,'position':'leader' if row['role']=='admin' else 'member','online':row['username']==user['username'],'offlineMs':0 if row['username']==user['username'] else None})
            else:
                exp=stats.get('exp',0)
                if type(exp) not in (int,float) or not 0<=exp<=10**12:exp=0
                key=(-int(level),-exp,row['username'])
                if row['job'] not in tops or key<tops[row['job']][0]:tops[row['job']]=(key,record)
        known={m['username'] for m in staff}
        for row in db.execute("SELECT username,role FROM users WHERE role IN ('admin','gm') AND blocked=0"):
            if row['username'] not in known:
                staff.append({'username':row['username'],'name':identity(row['username'],row['role'])['displayName'] or row['username'],'job':1,'level':1,'rank':1,'position':'leader' if row['role']=='admin' else 'member','online':row['username']==user['username'],'offlineMs':None})
        # Several staff characters may have the same account-wide display name.
        staff=list({m['name'].lower():m for m in staff}.values())
        profile=identity(user['username'],user['role'])
        admins=[r['username'] for r in db.execute("SELECT username FROM users WHERE role='admin' AND blocked=0 ORDER BY username")]
        leader='admin' if 'admin' in admins else next(iter(admins),None)
        for member in staff:
            member['position']='leader' if member['username']==leader else 'subLeader' if member['username'] in admins else 'member'
        leader_name=next((m['name'] for m in staff if m['username']==leader),leader or 'Staff')
        clan={'id':1,'name':'Staff','leader':leader_name,'members':staff,'note':'Clã reservado à administração. Coroa honorária permanente; resultados de BC são independentes.','locked':True}
        winner=db.execute("SELECT value FROM world_state WHERE key='castleWinner'").fetchone()
        top_list=[tops[k][1] for k in sorted(tops)]
        return {'staff':profile['staff'],'staffClan':clan,'clan':clan if profile['staff'] else None,
                'clanTags':[{'name':m['name'],'clanId':1,'clan':'Staff'} for m in staff],
                'tops':top_list,'aura': 'staff' if profile['staff'] else 'player' if any(t['username']==user['username'] and t['job']==job for t in top_list) else None,
                'castleWinner':json.loads(winner['value']) if winner else None}
