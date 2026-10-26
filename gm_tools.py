"""Private staff items and reproducible, per-class accelerated PvE testing."""
import copy,json,math,time
from functools import lru_cache
from pathlib import Path
import local_accounts as accounts

SHELTOM='OS199'
POTION='BI998'
ROOT=Path(__file__).resolve().parent

def definitions(items):
    result=[]
    for base,code,name,slot in [('OS110',SHELTOM,'Sheltom GM — Proteção de Teste','SHELTOM'),('BI143',POTION,'Poção EXP GM — Rota 120','ECORE')]:
        item=copy.deepcopy(items[base]);item.update(code=code,name=name,slot=slot,req={},price=0,weight=0,noGold=True,bound=True,gmOnly=True)
        item['image']='image/freeston/gm/'+('sheltom' if code==SHELTOM else 'potion')+'.svg'
        if code==SHELTOM:item.update(defense=[1000000,1000000],damage=[50,50,50,50])
        result.append(item)
    return result

def icon(name):
    if name not in ('sheltom','potion'):return None
    shape=('<path d="M32 8 52 29 32 52 12 29Z" fill="#44ddff" stroke="#e9fbff" stroke-width="2"/><path d="m32 8-8 21 8 23 8-23Z" fill="#2777ce"/><path d="M12 29h40" stroke="#c7fcff"/>' if name=='sheltom' else '<path d="M25 8h14v17l11 19q4 11-8 12H22q-12-1-8-12l11-19Z" fill="#372a69" stroke="#e9dbff" stroke-width="2"/><path d="m19 38-3 8q-2 7 7 7h18q9 0 7-7l-3-8Z" fill="#bc6cff"/><path d="M23 8h18M26 20h12" stroke="#ffd975" stroke-width="4"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'+shape+'<text x="32" y="62" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffdb79">GM</text></svg>').encode()

def setup(db):
    db.execute('CREATE TABLE IF NOT EXISTS gm_training(username TEXT,job INTEGER,generation TEXT,expires REAL,PRIMARY KEY(username,job))')

def staff(user):
    if user.get('role') not in ('admin','gm'):raise PermissionError('Itens de teste exclusivos de GM.')

@lru_cache(maxsize=1)
def profile():return json.loads((ROOT/'data/gm-training.json').read_text(encoding='utf-8'))

@lru_cache(maxsize=1)
def balance():return json.loads((ROOT/'data/balance.json').read_text(encoding='utf-8'))

def snapshot(db,user,job,generation,level):
    row=db.execute('SELECT expires FROM gm_training WHERE username=? AND job=? AND generation=?',(user['username'],job,generation)).fetchone()
    cls=profile()['classes'][str(job)]
    return {'expires':row['expires'] if row else 0,'level':level,'route':cls['levels'][min(118,max(0,level-1))],
            'routes':[cls['levels'][n-1] for n in [1,10,20,30,40,50,60,70,80,90,100,110,119]],'assumptions':profile()['assumptions']}

def experience(db,user,data,saved,monster):
    if not data.get('gmTraining') or user.get('role') not in ('admin','gm'):return None
    level=saved.get('stats',{}).get('level',1)
    if level>=120:return 0
    row=db.execute('SELECT expires FROM gm_training WHERE username=? AND job=? AND generation=?',(user['username'],data['job'],data.get('generation'))).fetchone()
    if not row or row['expires']<=time.time():return None
    route=profile()['classes'][str(data['job'])]['levels'][level-1]
    if monster.get('boss') or data.get('adminSpawn') or data['map'] not in [m['id'] for m in route['maps']] or monster['id'] not in route['monsters'] or data['map'] not in monster['maps']:return None
    base=max(1,math.floor(monster['level']*8*max(.03,.86**max(0,level-monster['level']-5))))
    return max(0,min(math.floor(base*route['multiplier']),balance()['experience'][119]-saved['stats'].get('exp',0)))

def action(user,data):
    import game_control as game
    import npc_services as npc
    staff(user)
    with accounts.connection() as db:
        game.setup(db);db.execute('BEGIN IMMEDIATE')
        job,saved,name=game.context(user,data,db)
        op=data.get('action','status')
        if op=='status':return {'ok':True,'training':snapshot(db,user,job,data['generation'],saved['stats'].get('level',1))}
        key,payload,old=game.request(db,user,data,'gm-tools')
        if old:return old
        if saved.get('savedAt')!=data.get('savedAt'):raise ValueError('O inventário mudou. Tente novamente.')
        items=npc.all_items(saved)
        if op=='grant':
            for code in (SHELTOM,POTION):
                if not any(i.get('code')==code for i in npc.all_items(saved)):npc.add_bag(saved,npc.item_instance(code,npc.all_items(saved)))
            equip=saved['inv'].setdefault('equip',{})
            if (equip.get('sheltom') or {}).get('code')!=SHELTOM:
                for group in ('bag','bagB'):
                    p=next((p for p in saved['inv'][group] if p['item']['code']==SHELTOM),None)
                    if p:
                        previous=equip.get('sheltom');equip['sheltom']=p['item']
                        if previous:p['item']=previous
                        else:saved['inv'][group].remove(p)
                        break
            equipped=(equip.get('sheltom') or {}).get('code')==SHELTOM
            message=('Kit GM entregue. Sheltom GM equipada.' if equipped else 'Kit GM entregue. Retire sua Sheltom GM do armazém e equipe-a.')+' Use a poção ou /gmexp on. /gmrota mostra a rota.'
        elif op=='activate':
            if saved['stats'].get('level',1)>=120:raise ValueError('A poção de teste acelera somente a evolução até o nível 120.')
            row=db.execute('SELECT expires,generation FROM gm_training WHERE username=? AND job=?',(user['username'],job)).fetchone()
            if row and row['generation']==data['generation'] and row['expires']>time.time():raise ValueError('A Poção EXP GM já está ativa. Use /gmexp off para encerrar o teste.')
            found=False
            for group in ('bag','bagB'):
                bag=saved['inv'].get(group,[])
                for p in list(bag):
                    item=p['item']
                    if item.get('code')==POTION and item.get('uid')==data.get('uid'):
                        if item.get('count',1)>1:item['count']-=1
                        else:bag.remove(p)
                        found=True;break
                if found:break
            if not found:raise ValueError('Poção GM ausente da bolsa.')
            db.execute('INSERT INTO gm_training VALUES(?,?,?,?) ON CONFLICT(username,job) DO UPDATE SET generation=excluded.generation,expires=excluded.expires',(user['username'],job,data['generation'],time.time()+86400))
            message='EXP GM ativo por até 24h, encerrando o bônus no nível 120. Meta: aproximadamente 1h de caça; consulte /gmrota.'
        elif op=='stop':
            db.execute('DELETE FROM gm_training WHERE username=? AND job=?',(user['username'],job));message='Teste de EXP GM encerrado.'
        else:raise ValueError('Ação GM inválida.')
        saved['savedAt']=max(int(time.time()*1000),saved.get('savedAt',0)+1)
        db.execute('UPDATE characters SET state=? WHERE username=? AND job=?',(json.dumps(saved,ensure_ascii=False),user['username'],job))
        game.event(db,user,'gm-tools.'+op,job=job,character=name,trust='staff-test')
        return game.remember(db,user,key,payload,{'ok':True,'state':saved,'message':message,'training':snapshot(db,user,job,data['generation'],saved['stats'].get('level',1))})
