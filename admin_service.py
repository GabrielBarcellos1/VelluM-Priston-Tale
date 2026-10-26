"""Administrative operations for the local server; all mutation is authenticated and audited."""
import hashlib
import json
import re
import secrets
import time
import local_accounts as accounts
import premium_store as store


class ConflictError(ValueError):
    pass


def require_admin(actor):
    if not actor or actor['role']!='admin':raise PermissionError('Painel exclusivo do administrador.')


def audit(db,actor,action,target,detail):
    db.execute('INSERT INTO admin_audit(actor,action,target,detail,created) VALUES(?,?,?,?,?)',
               (actor['username'],action,target,json.dumps(detail,ensure_ascii=False),time.time()))


def products(actor):
    require_admin(actor)
    with accounts.connection() as db:
        store.setup(db)
        return [{**json.loads(row['data']),'enabled':bool(row['enabled']),'archived':bool(row['archived']),'version':row['version']}
                for row in db.execute('SELECT * FROM shop_products ORDER BY rowid')]


def library(actor):
    require_admin(actor)
    source=store.base_catalog()+[{'code':i['code'],'name':i['name'],'kind':'item','category':'items','price':1000,
                                'permanent':i['slot']!='POTION','icon':i['image'],'definition':i}
                               for i in json.loads((accounts.ROOT/'data/shop-items.json').read_text(encoding='utf-8'))['items']]
    return list({p['code']:p for p in source}.values())


def save_product(actor,data):
    require_admin(actor)
    code=data.get('code')
    canonical=next((p for p in library(actor) if p['code']==code),None)
    if not canonical:raise ValueError('Escolha um item do catálogo disponível.')
    price=data.get('price');name=data.get('name');enabled=data.get('enabled',True)
    if type(price) is not int or not 0<=price<=10**9:raise ValueError('Preço deve ser inteiro entre 0 e 1000000000 coins.')
    if not isinstance(name,str) or not 1<=len(name.strip())<=100:raise ValueError('Nome deve ter entre 1 e 100 caracteres.')
    if type(enabled) is not bool:raise ValueError('Disponibilidade inválida.')
    description=data.get('description','')
    if not isinstance(description,str) or len(description)>1000:raise ValueError('Descrição deve ter até 1000 caracteres.')
    with accounts.connection() as db:
        store.setup(db);db.execute('BEGIN IMMEDIATE')
        old=db.execute('SELECT * FROM shop_products WHERE code=?',(code,)).fetchone()
        if old and data.get('version')!=old['version']:raise ConflictError('Produto alterado em outra aba. Atualize a lista e tente novamente.')
        product={**canonical,'name':name.strip(),'price':price,'description':description.strip()}
        db.execute('INSERT INTO shop_products VALUES(?,?,?,0,1) ON CONFLICT(code) DO UPDATE SET data=excluded.data,enabled=excluded.enabled,archived=0,version=shop_products.version+1',
                   (code,json.dumps(product,ensure_ascii=False),int(enabled)))
        audit(db,actor,'product.save',code,{'oldPrice':json.loads(old['data'])['price'] if old else None,'price':price,'enabled':enabled,'name':product['name']})
    return {'ok':True}


def remove_product(actor,data):
    require_admin(actor)
    with accounts.connection() as db:
        store.setup(db);db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT * FROM shop_products WHERE code=?',(data.get('code'),)).fetchone()
        if not row:raise ValueError('Produto não encontrado.')
        if row['version']!=data.get('version'):raise ConflictError('Produto alterado em outra aba. Atualize a lista.')
        db.execute('UPDATE shop_products SET enabled=0,archived=1,version=version+1 WHERE code=?',(data['code'],))
        audit(db,actor,'product.remove',data['code'],{'name':json.loads(row['data'])['name']})
    return {'ok':True}


def users(actor):
    require_admin(actor)
    with accounts.connection() as db:
        now=time.time()
        result=[]
        for row in db.execute('SELECT username,role,blocked,version FROM users ORDER BY username'):
            characters=[]
            for character in db.execute('SELECT job,state FROM characters WHERE username=?',(row['username'],)):
                state=json.loads(character['state'])
                characters.append({'job':character['job'],'name':accounts.identity(row['username'],row['role'])['displayName'] or state.get('name') or row['username'],
                                   'level':state.get('stats',{}).get('level',1),'gold':state.get('stats',{}).get('gold',0)})
            sessions=db.execute('SELECT count(*) FROM sessions WHERE username=? AND expires>?',(row['username'],now)).fetchone()[0]
            wallet=db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='wallets'").fetchone()
            balance=db.execute('SELECT coins FROM wallets WHERE username=?',(row['username'],)).fetchone() if wallet else None
            result.append({**dict(row),'blocked':bool(row['blocked']),'characters':characters,'sessions':sessions,'coins':balance['coins'] if balance else 0})
        return result


def mutate_user(actor,data):
    require_admin(actor)
    username=data.get('username');operation=data.get('operation')
    if not isinstance(username,str) or not re.fullmatch(r'[a-zA-Z0-9_]{3,24}',username):raise ValueError('ID inválido (3 a 24 letras, números ou sublinhado).')
    username=username.lower()
    with accounts.connection() as db:
        db.execute('BEGIN IMMEDIATE')
        old=db.execute('SELECT username,role,blocked,version FROM users WHERE username=?',(username,)).fetchone()
        if operation=='create':
            if old:raise ValueError('Esse usuário já existe.')
            role=data.get('role','player');password=data.get('password')
            if role not in ('player','gm','admin'):raise ValueError('Papel inválido.')
            if not isinstance(password,str) or not 8<=len(password)<=256:raise ValueError('Senha precisa ter entre 8 e 256 caracteres.')
            salt=secrets.token_bytes(16);digest=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,accounts.ITERATIONS).hex()
            db.execute('INSERT INTO users(username,role,salt,digest) VALUES(?,?,?,?)',(username,role,salt.hex(),digest))
            audit(db,actor,'user.create',username,{'role':role})
        else:
            if not old:raise ValueError('Usuário não encontrado.')
            if old['version']!=data.get('version'):raise ConflictError('Usuário alterado em outra aba. Atualize a lista.')
            if operation=='edit':
                role=data.get('role',old['role']);blocked=data.get('blocked',bool(old['blocked']));password=data.get('password','')
                if role not in ('player','gm','admin') or type(blocked) is not bool:raise ValueError('Papel ou bloqueio inválido.')
                if username==actor['username'] and (role!='admin' or blocked):raise ValueError('Você não pode retirar seu próprio acesso administrativo.')
                if old['role']=='admin' and not old['blocked'] and (role!='admin' or blocked) and db.execute("SELECT count(*) FROM users WHERE role='admin' AND blocked=0").fetchone()[0]<=1:raise ValueError('Mantenha pelo menos um administrador ativo.')
                if not isinstance(password,str) or (password and not 8<=len(password)<=256):raise ValueError('Nova senha precisa ter entre 8 e 256 caracteres.')
                db.execute('UPDATE users SET role=?,blocked=?,version=version+1 WHERE username=?',(role,int(blocked),username))
                if password:
                    salt=secrets.token_bytes(16);digest=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,accounts.ITERATIONS).hex()
                    db.execute('UPDATE users SET salt=?,digest=? WHERE username=?',(salt.hex(),digest,username))
                if password or blocked or role!=old['role']:db.execute('DELETE FROM sessions WHERE username=?',(username,))
                audit(db,actor,'user.edit',username,{'role':role,'blocked':blocked,'passwordReset':bool(password)})
            elif operation=='disconnect':
                db.execute('DELETE FROM sessions WHERE username=?',(username,));db.execute('UPDATE users SET version=version+1 WHERE username=?',(username,))
                audit(db,actor,'user.disconnect',username,{})
            elif operation=='delete':
                if username==actor['username']:raise ValueError('Você não pode remover sua própria conta.')
                if old['role']=='admin' and not old['blocked'] and db.execute("SELECT count(*) FROM users WHERE role='admin' AND blocked=0").fetchone()[0]<=1:raise ValueError('Mantenha pelo menos um administrador ativo.')
                db.execute('INSERT OR IGNORE INTO deleted_users VALUES(?)',(username,))
                for table,column in [('sessions','username'),('characters','username'),('character_versions','username'),('clan_members','username'),('wallets','username'),('premium_stock','username'),('premium_active','username'),('store_requests','actor'),('skin_owned','username'),('skin_equipped','username'),('game_requests','username')]:
                    if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone():db.execute(f'DELETE FROM {table} WHERE {column}=?',(username,))
                if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='game_events'").fetchone():
                    db.execute("UPDATE game_events SET status='expired' WHERE username=? AND kind='drop' AND status='generated'",(username,))
                db.execute('DELETE FROM users WHERE username=?',(username,));audit(db,actor,'user.delete',username,{'role':old['role']})
            else:raise ValueError('Operação inválida.')
    return {'ok':True}


def logs(actor):
    require_admin(actor)
    with accounts.connection() as db:
        return [{**dict(r),'detail':json.loads(r['detail'])} for r in db.execute('SELECT * FROM admin_audit ORDER BY id DESC LIMIT 200')]
