"""Account coins and premium storage. All balance mutations happen in SQLite."""
import json
import re
import time
import local_accounts as accounts

MAX_COINS = 10**12
LEGACY_EFFECT_DESCRIPTIONS = {
    'thirdEyes': 'Chance local de drop extra: +20%.',
    'vampiric': 'Recupera HP em 5% do dano causado.',
    'vampiricEx': 'Recupera HP em 10% do dano causado; substitui a Presa comum.',
    'manaRecharge': 'Recupera MP em 5% do dano causado.',
    'mightOfAwell': 'Adiciona 1000 HP máximos enquanto ativo.',
}


def base_catalog():
    return json.loads((accounts.ROOT/'data/premium.json').read_text(encoding='utf-8'))['items'] + json.loads((accounts.ROOT/'data/costumes.json').read_text(encoding='utf-8'))['items']


def catalog(db=None, include_hidden=False):
    if db is None:
        with accounts.connection() as connection:
            setup(connection)
            return catalog(connection,include_hidden)
    query='SELECT data FROM shop_products'
    if not include_hidden:query+=' WHERE enabled=1 AND archived=0'
    return [p for row in db.execute(query+' ORDER BY rowid') if __import__('class_availability').active_product(p:=json.loads(row['data'])) or include_hidden]

def activate_effect(db,target,item):
    group='vampiric' if item['kind']=='vampiricEx' else item['kind']
    old=db.execute('SELECT expires,value FROM premium_active WHERE username=? AND kind=?',(target,group)).fetchone()
    if old and old['expires']>time.time() and old['value']>item['value']:raise ValueError('Há um efeito mais forte ativo. Aguarde terminar antes de ativar este produto.')
    expires=max(time.time(),old['expires'] if old else 0)+item['seconds']
    db.execute('INSERT INTO premium_active VALUES(?,?,?,?,?) ON CONFLICT(username,kind) DO UPDATE SET code=excluded.code,expires=excluded.expires,value=excluded.value',(target,group,item['code'],expires,item['value']))


def setup(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS shop_products(code TEXT PRIMARY KEY,data TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS wallets(username TEXT PRIMARY KEY,coins INTEGER NOT NULL DEFAULT 0 CHECK(coins>=0));
    CREATE TABLE IF NOT EXISTS premium_stock(username TEXT,code TEXT,quantity INTEGER NOT NULL CHECK(quantity>=0),PRIMARY KEY(username,code));
    CREATE TABLE IF NOT EXISTS premium_active(username TEXT,kind TEXT,code TEXT,expires REAL,value REAL,PRIMARY KEY(username,kind));
    CREATE TABLE IF NOT EXISTS coin_ledger(id INTEGER PRIMARY KEY,actor TEXT,target TEXT,delta INTEGER,reason TEXT,created REAL);
    CREATE TABLE IF NOT EXISTS store_requests(actor TEXT,request_id TEXT,payload TEXT,result TEXT,PRIMARY KEY(actor,request_id));
    ''')
    for product in base_catalog():
        db.execute('INSERT OR IGNORE INTO shop_products(code,data) VALUES(?,?)',(product['code'],json.dumps(product,ensure_ascii=False)))
    if not db.execute("SELECT 1 FROM local_migrations WHERE id='26-kit-up-and-phoenix'").fetchone():
        for p in base_catalog():
            if p['code'] in ('BI133','BI900','BI901','BI902','BI903','BI904','BI905','BI906','FO110','FO130'):
                db.execute('UPDATE shop_products SET data=?,enabled=1,archived=0,version=version+1 WHERE code=?',(json.dumps(p,ensure_ascii=False),p['code']))
        db.execute("INSERT INTO local_migrations VALUES('26-kit-up-and-phoenix')")
    if not db.execute("SELECT 1 FROM local_migrations WHERE id='21-public-premium-effects'").fetchone():
        # Preserve published offers, prices, custom names/descriptions and stock.
        # Only migrate the old generated rule metadata and default descriptions.
        for canonical in base_catalog():
            if canonical['kind'] not in LEGACY_EFFECT_DESCRIPTIONS:continue
            row=db.execute('SELECT data FROM shop_products WHERE code=?',(canonical['code'],)).fetchone()
            product=json.loads(row['data']);updated={**product,'effectRule':canonical['effectRule']}
            if product.get('description')==LEGACY_EFFECT_DESCRIPTIONS[canonical['kind']]:updated['description']=canonical['description']
            if canonical['kind']=='thirdEyes' and product.get('value')==20:updated['value']=50
            if updated!=product:db.execute('UPDATE shop_products SET data=?,version=version+1 WHERE code=?',(json.dumps(updated,ensure_ascii=False),canonical['code']))
        db.execute("UPDATE premium_active SET value=50 WHERE kind='thirdEyes' AND value=20")
        db.execute("INSERT INTO local_migrations VALUES('21-public-premium-effects')")
    db.commit()


def snapshot(db, username):
    row=db.execute('SELECT coins FROM wallets WHERE username=?',(username,)).fetchone()
    items={i['code']:i for i in catalog(db,True)}
    active=[]
    for row_active in db.execute('SELECT * FROM premium_active WHERE username=? AND expires>?',(username,time.time())):
        if row_active['code'] in items:
            active.append({**items[row_active['code']],'expiresAt':row_active['expires'],'value':row_active['value']})
    return {'username':username,'coins':row['coins'] if row else 0,
            'stock':[{'code':s['code'],'quantity':s['quantity']} for s in db.execute('SELECT code,quantity FROM premium_stock WHERE username=? AND quantity>0',(username,))],
            'active':active,'catalog':catalog(db),'ownedCatalog':[items[r['code']] for r in db.execute('SELECT code FROM premium_stock WHERE username=? AND quantity>0',(username,)) if r['code'] in items],'serverTime':time.time()}


def wallet(username):
    with accounts.connection() as db:
        setup(db)
        return snapshot(db,username)


def transact(user,action,data):
    if action=='grant' and user['role']!='admin':raise PermissionError('Somente administrador pode adicionar coins.')
    request_id=data.get('requestId')
    if not isinstance(request_id,str) or not re.fullmatch(r'[a-zA-Z0-9_-]{8,80}',request_id):
        raise ValueError('Identificador da operação inválido.')
    payload=json.dumps({'action':action,**{k:v for k,v in data.items() if k!='requestId'}},sort_keys=True,ensure_ascii=False)
    with accounts.connection() as db:
        setup(db)
        db.execute('BEGIN IMMEDIATE')
        old=db.execute('SELECT payload,result FROM store_requests WHERE actor=? AND request_id=?',(user['username'],request_id)).fetchone()
        if old:
            if old['payload']!=payload:raise ValueError('Identificador já usado em outra operação.')
            return {**json.loads(old['result']),'wallet':snapshot(db,user['username']),'repeated':True}
        target=user['username']
        if action=='grant':
            target=data.get('username',user['username'])
            amount=data.get('amount')
            if not isinstance(target,str) or not re.fullmatch(r'[a-zA-Z0-9_]{3,24}',target):raise ValueError('Informe o ID de login da conta.')
            target=target.lower()
            if not db.execute('SELECT 1 FROM users WHERE username=?',(target,)).fetchone():raise ValueError('Conta não encontrada. Crie a conta no painel primeiro.')
            if type(amount) is not int or not 1<=amount<=10**9:raise ValueError('Quantidade deve ser um inteiro entre 1 e 1000000000.')
            current=snapshot(db,target)['coins']
            if current+amount>MAX_COINS:raise ValueError('Limite de coins excedido.')
            db.execute('INSERT INTO wallets VALUES(?,?) ON CONFLICT(username) DO UPDATE SET coins=coins+excluded.coins',(target,amount))
            result={'target':target,'balance':current+amount,'message':f'{amount} coins adicionados para {target}. Saldo: {current+amount}.'}
            reason='GM grant'
        else:
            item=next((p for p in catalog(db,action!='purchase') if p['code']==data.get('code')),None)
            if not item or not __import__('class_availability').active_product(item):raise ValueError('Produto temporariamente indisponível.')
            if action=='purchase':
                count=data.get('count',1)
                if type(count) is not int or not 1<=count<=99:raise ValueError('Quantidade inválida (1 a 99).')
                if 'expectedTotal' in data and data['expectedTotal']!=item['price']*count:raise ValueError('O preço mudou. Confira a loja e confirme a compra novamente.')
                if item.get('permanent'):
                    if count!=1:raise ValueError('Compre um traje por vez.')
                    if db.execute('SELECT 1 FROM premium_stock WHERE username=? AND code=? AND quantity>0',(target,item['code'])).fetchone():raise ValueError('Você já possui esse traje permanente.')
                amount=-item['price']*count
                db.execute('INSERT OR IGNORE INTO wallets VALUES(?,0)',(target,))
                changed=db.execute('UPDATE wallets SET coins=coins+? WHERE username=? AND coins>=?',(amount,target,-amount)).rowcount
                if not changed:raise ValueError('Coins insuficientes.')
                db.execute('INSERT INTO premium_stock VALUES(?,?,?) ON CONFLICT(username,code) DO UPDATE SET quantity=quantity+excluded.quantity',(target,item['code'],count))
                result={'message':f"{count} × {item['name']} comprado. Use pela bolsa ou cinto." if item['kind']=='item' else f"{item['name']} comprado. Equipe pela bolsa." if item.get('permanent') else f"{count} × {item['name']} ({item['hours']}h) comprado. Use no inventário para ativar."}
                reason='Purchase '+item['code']
            elif action=='consume':
                if item['kind']!='item' or item['definition'].get('slot') not in ('POTION','FORCEORB'):raise ValueError('Este produto não é um consumível.')
                if not db.execute('UPDATE premium_stock SET quantity=quantity-1 WHERE username=? AND code=? AND quantity>0',(target,item['code'])).rowcount:raise ValueError('Você não possui esse item.')
                amount=0;reason='Consume '+item['code'];result={'message':item['name']+' utilizado.'}
            elif action=='activate':
                if item.get('permanent') or item['kind']=='item':raise ValueError('Trajes são equipamentos permanentes. Equipe na bolsa.')
                if item['kind']=='bundle':
                    job=data.get('job');generation=data.get('generation')
                    if type(job) is not int or not __import__('class_availability').active_job(job):raise ValueError('Escolha uma classe ativa para receber as Forças Mirage.')
                    row=db.execute('SELECT generation FROM character_versions WHERE username=? AND job=? AND deleted=0',(target,job)).fetchone()
                    if not row or row['generation']!=generation:raise ValueError('Atualize a página e selecione o personagem novamente.')
                    parts={p['code']:p for p in catalog(db,True)}
                    for code in item['bundle']['components']:
                        if code not in parts:raise ValueError('Componente do kit indisponível. Nenhum item foi consumido.')
                        activate_effect(db,target,parts[code])
                    if not db.execute('UPDATE premium_stock SET quantity=quantity-1 WHERE username=? AND code=? AND quantity>0',(target,item['code'])).rowcount:raise ValueError('Você não possui esse kit.')
                    force=item['bundle']['magicForce'] if job in (7,8,10) else item['bundle']['physicalForce']
                    quantity=item['bundle']['forceQuantity']
                    db.execute('INSERT INTO premium_stock VALUES(?,?,?) ON CONFLICT(username,code) DO UPDATE SET quantity=quantity+excluded.quantity',(target,force,quantity))
                    amount=0;reason='Activate '+item['code'];result={'message':'Kit Up ativado: sete efeitos por 7 dias e 10 Forças Mirage entregues. O tempo continua offline.'}
                    db.execute('INSERT INTO coin_ledger(actor,target,delta,reason,created) VALUES(?,?,?,?,?)',(user['username'],target,amount,reason,time.time()))
                    db.execute('INSERT INTO store_requests VALUES(?,?,?,?)',(user['username'],request_id,payload,json.dumps(result,ensure_ascii=False)))
                    return {**result,'wallet':snapshot(db,target)}
                # Vampiric variants share one group, so they can never stack.
                group='vampiric' if item['kind']=='vampiricEx' else item['kind']
                old_active=db.execute('SELECT expires,value FROM premium_active WHERE username=? AND kind=?',(target,group)).fetchone()
                if old_active and old_active['expires']>time.time() and old_active['value']>item['value']:
                    raise ValueError('Há um premium mais forte ativo. Aguarde terminar antes de usar este.')
                if not db.execute('UPDATE premium_stock SET quantity=quantity-1 WHERE username=? AND code=? AND quantity>0',(target,item['code'])).rowcount:
                    raise ValueError('Você não possui esse premium.')
                expires=max(time.time(),old_active['expires'] if old_active else 0)+item['seconds']
                db.execute('INSERT INTO premium_active VALUES(?,?,?,?,?) ON CONFLICT(username,kind) DO UPDATE SET code=excluded.code,expires=excluded.expires,value=excluded.value',(target,group,item['code'],expires,item['value']))
                amount=0
                reason='Activate '+item['code']
                result={'message':f"{item['name']} ativado por {item['hours']}h. Tempo corrido, inclusive offline."}
            else:raise ValueError('Operação desconhecida.')
        db.execute('INSERT INTO coin_ledger(actor,target,delta,reason,created) VALUES(?,?,?,?,?)',(user['username'],target,amount,reason,time.time()))
        db.execute('INSERT INTO store_requests VALUES(?,?,?,?)',(user['username'],request_id,payload,json.dumps(result,ensure_ascii=False)))
        return {**result,'wallet':snapshot(db,user['username'])}
