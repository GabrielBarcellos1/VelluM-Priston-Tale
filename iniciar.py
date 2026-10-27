"""Run the original public client against an independent browser-local session.

Only static public files are fetched. No account/password/API writes are sent
to the original service. Python 3 standard library only.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit, quote, parse_qs
from urllib.request import urlopen, Request
import argparse
import hashlib
import json
import mimetypes
import os
import ssl
import tempfile
import threading
import time
import socket
from urllib.error import HTTPError, URLError
import webbrowser
import sys
from http.cookies import SimpleCookie
sys.path.insert(0, str(Path(__file__).resolve().parent))
import local_accounts as accounts
import release_info
import skill_icons
import admin_service
import premium_store
import online_world
import game_control
import npc_services
import level_rewards
import boss_roulette
import server_economy
import custom_skins
import gm_tools
import path_mount

ROOT = Path(__file__).resolve().parent
CACHE = Path(os.environ.get('PWEB_CACHE_DIR', str(ROOT / '.original-cache'))).resolve()
JS_PATH = '/_app/index-uQp4-Rtd.js'
CSS_PATH = '/_app/index-BukRxWRn.css'
PINNED = {
    JS_PATH: '309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac',
    CSS_PATH: 'ac6a92d028c2bd04f63aff9ddeaa4a6645eb34dde463851f198635e6b4cf4b5b',
}
STARTUP = b'const $0t=$M?null:AYt();$M?T0x($M):$0t?L0x($0t):tE();'
BRIDGE = b'globalThis.__localGameBridge={Session:$1,Game:eA,Runtime:Jw,ui:Uex,root:eE,loading:g1,classes:HAt,settings:y0,low:(preset="low")=>VS(y0.get(),preset,pB()),state:i7,servers:Rc,keyOf:Fl,item:up,extra:j7e,age:GSt,maxAging:NS,itemClass:GG,premiumCatalog:_st,premiumIcons:KCe,specialize:dot,specJobs:Qce,itemSlots:U9,skillMotion:Hq,skillVisual:Pw,Aura:hMe,agingChance:Fg,craftAccept:Id,mixRecipe:Vxt,applyMix:cMt,forceInfo:$w,forceIcon:lEt,forceRecipe:sE,mixById:zO,Crowns:$w0,RingGeometry:H7,MeshBasicMaterial:gi,Mesh:yt,Group:ea,BufferGeometry:C0,Float32BufferAttribute:Q0,MeshStandardMaterial:lke,AmbientLight:O2t,DirectionalLight:R2t,PerspectiveCamera:Ra,Scene:dl,WebGLRenderer:Ake,Color:$e};import("/session.mjs");'
DOWNLOADS = threading.Semaphore(6)
LOCKS = {}
LOCKS_GUARD = threading.Lock()
MAX_ASSET = 64 * 1024 * 1024
LOGIN_FAILURES = {}
LOGIN_LOCK = threading.Lock()
CHARACTER_FAILURES = {}


def static_asset(path):
    """Fetch one fixed-host static file, with normal TLS and pinned entrypoints."""
    if not path.startswith(('/assets/', '/_app/')):
        raise ValueError('Not a public static asset')
    if '..' in path.split('/') or '\\' in path or '\x00' in path:
        raise ValueError('Invalid static asset path')
    destination = (CACHE / path.lstrip('/')).resolve()
    if not destination.is_relative_to(CACHE):
        raise ValueError('Invalid path')
    with LOCKS_GUARD:
        lock = LOCKS.setdefault(path, threading.Lock())
    with lock:
        if destination.is_file():
            data = destination.read_bytes()
        else:
            host = 'cdn.pweb.world' if path.startswith('/assets/') else 'pweb.world'
            url = 'https://' + host + quote(path, safe='/@-._~')
            with DOWNLOADS:
                request = Request(url, headers={'User-Agent': 'PioneirandoLocal/1.0'})
                for attempt in range(3):
                    try:
                        with urlopen(request, timeout=45, context=ssl.create_default_context()) as response:
                            if int(response.headers.get('content-length', '0')) > MAX_ASSET:
                                raise ValueError('Asset exceeds local download limit')
                            data = response.read(MAX_ASSET + 1)
                        break
                    except (HTTPError, URLError, TimeoutError, ConnectionError) as error:
                        if isinstance(error, HTTPError) and error.code not in (408, 429) and error.code < 500:
                            raise
                        if attempt == 2:
                            raise
                        time.sleep(0.25 * (attempt + 1))
            if len(data) > MAX_ASSET:
                raise ValueError('Asset exceeds local download limit')
            if data.lstrip().lower().startswith((b'<!doctype html', b'<html')):
                raise ValueError('Upstream returned HTML instead of a static asset')
            if path in PINNED and hashlib.sha256(data).hexdigest() != PINNED[path]:
                raise ValueError('Public client integrity mismatch; no unverified client was started')
            destination.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as temporary:
                temporary.write(data)
                temporary_path = Path(temporary.name)
            temporary_path.replace(destination)
        if path in PINNED and hashlib.sha256(data).hexdigest() != PINNED[path]:
            raise ValueError('Cached public client integrity mismatch')
        if path == JS_PATH:
            if data.count(STARTUP) != 1:
                raise ValueError('Unsupported client entrypoint; local startup patch not applied')
            return data.replace(STARTUP, BRIDGE)
        return data


HTML = '''<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0e0b08"><title>FREEston Tale - sessao local</title>
<link rel="stylesheet" href="/mobile.css"><link rel="stylesheet" href="/freeston.css"><link rel="icon" href="/_app/favicon-32-BruDaQOO.png">
<link rel="stylesheet" href="%s"><script type="module" src="%s"></script>
</head><body data-package="freeston-tale-21"><canvas id="gl"></canvas><div id="ui"></div></body></html>''' % (CSS_PATH, JS_PATH)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def mount_path(self):
        self.mount,self.path=path_mount.strip_mount(self.path)

    def send_header(self,name,value):
        super().send_header(name,path_mount.header(name,value,getattr(self,'mount','')))

    def end_headers(self):
        # The original client cannot connect to production accounts or sockets.
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'")
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def reply(self, data, content_type, status=200, headers=None):
        data=path_mount.rewrite(data,content_type,getattr(self,'mount',''))
        self.send_response(status)
        for name,value in (headers or {}).items():
            self.send_header(name,value)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        mutable = urlsplit(self.path).path in (JS_PATH, '/mobile.css', '/freeston.css', '/dashboard.css') or urlsplit(self.path).path.endswith('.mjs') or urlsplit(self.path).path.startswith(('/assets/image/freeston/skill/','/assets/image/freeston/classic-skill/'))
        self.send_header('Cache-Control', 'no-store' if mutable or content_type.startswith(('application/json', 'text/html')) else 'public, max-age=3600')
        self.end_headers()
        self.wfile.write(data)

    def json_reply(self, value, status=200, headers=None):
        self.reply(json.dumps(value, ensure_ascii=False).encode(), 'application/json; charset=utf-8', status, headers)

    def token(self):
        try:
            cookie = SimpleCookie(self.headers.get('Cookie',''))
            return cookie['pweb_local'].value if 'pweb_local' in cookie else ''
        except Exception:
            return ''

    def user(self):
        return accounts.user_for(self.token())


    def do_GET(self):
        self.mount_path()
        path = unquote(urlsplit(self.path).path)
        if '..' in path.split('/') or '\x00' in path or '\\' in path:
            self.send_error(400)
            return
        try:
            if path == '/api/local/build':
                self.json_reply(release_info.build_info())
            elif path == '/api/local/admin-status':
                user=self.user()
                if not user:return self.json_reply({'error':'Entre na conta.'},401)
                if user['role']!='admin':return self.json_reply({'error':'Somente administrador.'},403)
                self.json_reply({'build':release_info.build_info(),'link':release_info.read_link()})
            elif path.startswith('/api/local/admin/'):
                user=self.user()
                if not user:return self.json_reply({'error':'Entre na conta.'},401)
                if user['role']!='admin':
                    game_control.log(user,'admin.denied','warning',{'path':path})
                    return self.json_reply({'error':'Painel exclusivo do administrador.'},403)
                resource=path.rsplit('/',1)[-1]
                if resource in ('rules','rule-defaults','game-history','skins','item-library'):
                    try:
                        query=parse_qs(urlsplit(self.path).query)
                        if resource=='rules':result=game_control.rules(user)
                        elif resource=='rule-defaults':result=game_control.DEFAULTS
                        elif resource=='skins':result=game_control.skin_admin(user)
                        elif resource=='item-library':result=[{'code':i['code'],'name':i['name'],'level':i.get('req',{}).get('level',0)} for i in game_control.ITEMS.values()]
                        else:
                            kind=query.get('kind',['drop'])[0]
                            if kind not in ('drop','security','craft','kill','shop'):raise ValueError('Tipo de histórico inválido.')
                            result=game_control.history(user,query,kind)
                        return self.json_reply(result)
                    except (ValueError,TypeError) as error:return self.json_reply({'error':str(error)},400)
                readers={'products':admin_service.products,'library':admin_service.library,'users':admin_service.users,'audit':admin_service.logs}
                if resource not in readers:return self.json_reply({'error':'Recurso não encontrado.'},404)
                self.json_reply(readers[resource](user))
            elif path in ('/api/local/game/rules','/api/local/game/skins'):
                user=self.user()
                if not user:return self.json_reply({'error':'Entre na conta.'},401)
                try:
                    if path.endswith('/rules'):
                        result=game_control.rules();result.pop('monitor',None)
                    else:result=game_control.skins(user,int(parse_qs(urlsplit(self.path).query).get('job',['1'])[0]))
                    return self.json_reply(result)
                except (ValueError,TypeError) as error:return self.json_reply({'error':str(error)},400)
            elif path == '/api/local/community':
                user=self.user()
                if not user:return self.json_reply({'error':'Entre na conta.'},401)
                job=int(parse_qs(urlsplit(self.path).query).get('classe',['1'])[0])
                self.json_reply(accounts.community(user,job))
            elif path == '/api/local/wallet':
                user=self.user()
                if not user:return self.json_reply({'error':'Entre na conta.'},401)
                self.json_reply(premium_store.wallet(user['username']))
            elif path == '/painel':
                user=self.user()
                if not user:return self.reply((ROOT/'login.html').read_bytes(),'text/html; charset=utf-8')
                if user['role']!='admin':return self.json_reply({'error':'Somente administrador.'},403)
                self.reply((ROOT/'dashboard.html').read_bytes(),'text/html; charset=utf-8')
            elif path.startswith('/assets/image/freeston/classic-skill/') and path.endswith('.png'):
                name=path.rsplit('/',1)[-1][:-4]
                data=skill_icons.classic(name[:-1] if name.endswith('_') else name,name.endswith('_'))
                if data is None:return self.send_error(404)
                self.reply(data,'image/png')
            elif path.startswith('/assets/image/freeston/skill/') and path.endswith('.svg'):
                code=path.rsplit('/',1)[-1][:-4]
                skill=next((s for s in json.loads((ROOT/'data/skills.json').read_text())['skills'] if s['code']==code),None)
                if not skill:return self.send_error(404)
                self.reply(skill_icons.render(skill['code'],skill['kind'],skill['job'],skill['tier'],skill['index']),'image/svg+xml')
            elif path == '/api/local/balance':
                self.json_reply(json.loads((ROOT/'data/balance.json').read_text(encoding='utf-8')))
            elif path == '/api/local/skills':
                self.reply((ROOT / 'data' / 'skills.json').read_bytes(),'application/json; charset=utf-8')
            elif path == '/api/local/drops':
                self.reply((ROOT / 'data' / 'drops.json').read_bytes(),'application/json; charset=utf-8')
            elif path == '/api/local/me':
                user=self.user()
                self.json_reply(user if user else {'error':'Entre na conta local.'},200 if user else 401)
            elif path == '/api/local/state':
                user=self.user()
                if not user:
                    return self.json_reply({'error':'Entre na conta local.'},401)
                job=int(parse_qs(urlsplit(self.path).query).get('classe',['1'])[0])
                self.json_reply(accounts.character_record(user['username'],job))
            elif path == '/api/local/characters':
                user=self.user()
                if not user:return self.json_reply({'error':'Entre na sua conta.'},401)
                self.json_reply(accounts.roster(user))
            elif path in ('/','/personagens','/jogar'):
                user=self.user();query=parse_qs(urlsplit(self.path).query)
                playing=user and path!='/personagens' and (path=='/jogar' or 'classe' in query or 'mapa' in query)
                if playing and not accounts.load_state(user['username'],int(query.get('classe',[user['preferredClass']])[0])):
                    self.send_response(302);self.send_header('Location','/personagens');self.end_headers();return
                self.reply(HTML.encode() if playing else (ROOT / 'login.html').read_bytes(), 'text/html; charset=utf-8')
            elif path == '/assets/items.json':
                items=json.loads((ROOT/'data/loot-items.json').read_text(encoding='utf-8'))['items']
                prices=json.loads((ROOT/'data/balance.json').read_text(encoding='utf-8')).get('potionPrices',{})
                for item in items:
                    if item['code'] in prices:item['price']=prices[item['code']]
                user=self.user()
                if user and user['role'] in ('admin','gm'):items+=gm_tools.definitions(game_control.ITEMS)
                self.json_reply(items)
            elif path.startswith('/assets/image/freeston/gm/') and path.endswith('.svg'):
                result=gm_tools.icon(path.rsplit('/',1)[-1][:-4])
                if result is None:return self.send_error(404)
                self.reply(result,'image/svg+xml; charset=utf-8')
            elif path.startswith('/assets/image/freeston/sapphire/') and path.endswith('.svg'):
                result=custom_skins.icon(path.rsplit('/',1)[-1][:-4])
                if result is None:return self.send_error(404)
                self.reply(result,'image/svg+xml; charset=utf-8')
            elif path=='/api/local/custom-skins':self.json_reply({'skins':custom_skins.catalog()})
            elif path.startswith(('/assets/', '/_app/')):
                content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
                self.reply(static_asset(path), content_type)
            elif path in ['/api/map-fields', '/api/map-npcs', '/api/map-spawns', '/api/map-links', '/api/wiki', '/api/wiki/quests']:
                name = {'/api/wiki': 'wiki', '/api/wiki/quests': 'quests'}.get(path, path.rsplit('/', 1)[-1])
                self.reply((ROOT / 'data' / (name + '.json')).read_bytes(), 'application/json; charset=utf-8')
            elif path.endswith('/api/status') or path == '/api/status':
                self.json_reply({'ok': True, 'online': online_world.count(), 'max': 100, 'full': False})
            elif path.startswith('/api/'):
                self.json_reply({'ok': False, 'error': 'Servico privado ainda nao reconstruido na sessao local.'}, 501)
            elif path in ['/mobile.css','/freeston.css','/dashboard.css']:
                self.reply((ROOT / path.lstrip('/')).read_bytes(),'text/css; charset=utf-8')
            elif path in ['/map-travel.mjs', '/gm-tools.mjs', '/gameplay-rules.mjs', '/item-save.mjs', '/character-facing.mjs', '/premium-effects.mjs', '/skill-damage.mjs', '/session.mjs', '/online-session.mjs', '/skill-effects.mjs', '/character-stats.mjs', '/npc-crafting.mjs', '/inventory-grid.mjs', '/classic-combat.mjs', '/skill-cooldowns.mjs', '/shop-inventory.mjs', '/native-rules.mjs', '/staff-presence.mjs', '/item-specialization.mjs', '/brand-ui.mjs', '/premium-shop.mjs', '/monster-ai.mjs', '/skill-book.mjs', '/equipment-rules.mjs', '/release-client.mjs', '/dashboard.mjs', '/dashboard-game.mjs', '/skins-shop.mjs', '/admin-names.mjs', '/drop-rules.mjs', '/command-help.mjs', '/boss-roulette.mjs', '/boss-admin.mjs', '/economy-admin.mjs', '/economy-effects.mjs', '/sapphire-geometry.mjs', '/custom-skins.mjs', '/world-quests.mjs', '/npc-panels.mjs', '/game-features.mjs', '/quest-targets.mjs', '/quest-progress.mjs', '/balance-rules.mjs', '/skill-runtime.mjs', '/skill-system.mjs', '/login.mjs', '/README.md']:
                data = (ROOT / path.lstrip('/')).read_bytes()
                self.reply(data, 'text/javascript; charset=utf-8' if path.endswith('.mjs') else 'text/plain; charset=utf-8')
            else:
                self.send_error(404)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as error:
            print('Falha ao carregar recurso publico:', path, str(error), flush=True)
            try:
                self.json_reply({'ok': False, 'error': str(error)}, 502)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def do_POST(self):
        self.mount_path()
        path=urlsplit(self.path).path
        if path.startswith('/api/telemetry/'):
            return self.json_reply({'ok':True})
        if not path.startswith('/api/local/'):
            return self.json_reply({'ok':False,'error':'Local-only session'},405)
        origin=self.headers.get('Origin')
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<0 or length>1100000 or not self.headers.get('Content-Type','').startswith('application/json'):
                return self.json_reply({'error':'Requisição inválida.'},400)
            body=self.rfile.read(length)
            # Drain the bounded request before rejecting its origin, avoiding a TCP
            # reset on Windows that can hide the intended 403 response.
            if (origin and urlsplit(origin).netloc.lower()!=self.headers.get('Host','').lower()) or self.headers.get('Sec-Fetch-Site')=='cross-site':
                return self.json_reply({'error':'Origem inválida.'},403)
            data=json.loads(body) if length else {}
            if not isinstance(data,dict):
                return self.json_reply({'error':'Requisição inválida.'},400)
            if path=='/api/local/login':
                ip=self.client_address[0]
                with LOGIN_LOCK:
                    failures=[t for t in LOGIN_FAILURES.get(ip,[]) if time.time()-t<60]
                    LOGIN_FAILURES[ip]=failures
                    if len(failures)>=8:
                        return self.json_reply({'error':'Muitas tentativas. Aguarde um minuto.'},429)
                token=accounts.login(data.get('username'),data.get('password'))
                if not token:
                    game_control.log(None,'auth.login-failed','warning',{'username':str(data.get('username',''))[:24]})
                    with LOGIN_LOCK:
                        LOGIN_FAILURES.setdefault(ip,[]).append(time.time())
                    return self.json_reply({'error':'Usuário ou senha inválidos.'},401)
                with LOGIN_LOCK:
                    LOGIN_FAILURES.pop(ip,None)
                game_control.log(accounts.user_for(token),'auth.login')
                cookie='pweb_local='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'
                if self.headers.get('X-Forwarded-Proto','').split(',')[0].strip().lower() == 'https':
                    cookie += '; Secure'
                return self.json_reply({'ok':True},headers={'Set-Cookie':cookie})
            user=self.user()
            if not user:
                return self.json_reply({'error':'Entre na conta local.'},401)
            if path.startswith('/api/local/game/'):
                action=path.rsplit('/',1)[-1]
                handlers={'rewards':level_rewards.claim,'gm':gm_tools.action,'aging':game_control.aging,'kill':game_control.kill,'pickup':game_control.pickup,'report':game_control.report,'skin':game_control.skin_action,'npc':npc_services.action,'boss':boss_roulette.action,'economy':server_economy.runtime}
                if action not in handlers:return self.json_reply({'error':'Ação inválida.'},404)
                try:
                    if action!='report' and not isinstance(data.get('generation'),str):raise ValueError('Atualize a página e selecione seu personagem novamente.')
                    return self.json_reply(handlers[action](user,data))
                except PermissionError as error:return self.json_reply({'error':str(error)},403)
                except (ValueError,TypeError,KeyError) as error:
                    game_control.log(user,'request.rejected','warning',{'path':path,'reason':str(error)[:300]})
                    return self.json_reply({'error':str(error)},400)
            if path.startswith('/api/local/online/'):
                action=path.rsplit('/',1)[-1]
                handlers={'heartbeat':online_world.heartbeat,'chat':online_world.chat,'leave':online_world.leave,'skill':online_world.skill}
                if action not in handlers:return self.json_reply({'error':'Ação inválida.'},404)
                try:
                    if action=='heartbeat' and not isinstance(data.get('generation'),str):raise ValueError('Atualize a página e selecione seu personagem novamente.')
                    return self.json_reply(handlers[action](user,data))
                except (ValueError,TypeError) as error:return self.json_reply({'error':str(error)},400)
            if path.startswith('/api/local/admin/'):
                if user['role']!='admin':
                    game_control.log(user,'admin.denied','warning',{'path':path})
                    return self.json_reply({'error':'Painel exclusivo do administrador.'},403)
                action=path.rsplit('/',1)[-1]
                handlers={'rules-save':game_control.save_rules,'skin-save':game_control.save_skin,'product-save':admin_service.save_product,'product-remove':admin_service.remove_product,'user-save':admin_service.mutate_user,'boss-config':boss_roulette.configs,'boss-save':boss_roulette.save_config,'economy-config':server_economy.admin_data,'map-save':server_economy.save_map,'event-save':server_economy.save_event,'economy-preview':server_economy.preview}
                if action=='coins':
                    result=premium_store.transact(user,'grant',data)
                    if not result.get('repeated'):
                        with accounts.connection() as db:admin_service.audit(db,user,'coins.grant',result['target'],{'amount':data['amount'],'balance':result['balance']})
                    return self.json_reply(result)
                if action not in handlers:return self.json_reply({'error':'Ação não encontrada.'},404)
                try:return self.json_reply(handlers[action](user,data))
                except admin_service.ConflictError as error:return self.json_reply({'error':str(error)},409)
                except ValueError as error:return self.json_reply({'error':str(error)},400)
            if path=='/api/local/logout':
                accounts.logout(self.token())
                return self.json_reply({'ok':True},headers={'Set-Cookie':'pweb_local=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})
            if path=='/api/local/characters':
                deleting=data.get('action')=='delete'
                if deleting:
                    with LOGIN_LOCK:
                        failures=[t for t in CHARACTER_FAILURES.get(user['username'],[]) if time.time()-t<60]
                        CHARACTER_FAILURES[user['username']]=failures
                        if len(failures)>=8:return self.json_reply({'error':'Muitas tentativas de exclusão. Aguarde um minuto.'},429)
                try:
                    result=accounts.manage_character(user,data)
                    if deleting:
                        with LOGIN_LOCK:CHARACTER_FAILURES.pop(user['username'],None)
                    return self.json_reply(result)
                except ValueError as error:
                    if deleting:
                        with LOGIN_LOCK:CHARACTER_FAILURES.setdefault(user['username'],[]).append(time.time())
                    game_control.log(user,'character.rejected','warning',{'action':str(data.get('action'))[:20],'reason':str(error)[:200]})
                    return self.json_reply({'error':str(error)},400)
            if path=='/api/local/gm':
                command=str(data.get('command',''))[:80].split(' ')[0]
                game_control.log(user,'gm.request' if user['role'] in ('admin','gm') else 'gm.denied','info' if user['role'] in ('admin','gm') else 'warning',{'command':command})
                return self.json_reply({'ok':True} if user['role'] in ('admin','gm') else {'error':'Comando reservado à Staff.'},200 if user['role'] in ('admin','gm') else 403)
            if path=='/api/local/password':
                try:
                    accounts.change_password(user['username'],data.get('currentPassword'),data.get('newPassword'),self.token())
                    return self.json_reply({'ok':True})
                except ValueError as error:return self.json_reply({'error':str(error)},400)
            if path=='/api/local/accounts':
                if user['role']!='admin':return self.json_reply({'error':'Somente administrador.'},403)
                try:
                    accounts.create_player(data.get('username'),data.get('password'))
                    return self.json_reply({'ok':True})
                except ValueError as error:
                    return self.json_reply({'error':str(error)},400)
            if path in ('/api/local/coins','/api/local/premium/purchase','/api/local/premium/activate','/api/local/premium/consume'):
                action={'/api/local/coins':'grant','/api/local/premium/purchase':'purchase','/api/local/premium/activate':'activate','/api/local/premium/consume':'consume'}[path]
                try:
                    result=premium_store.transact(user,action,data)
                    if not result.get('repeated'):game_control.log(user,'economy.'+action,detail={'code':data.get('code'),'target':data.get('username',user['username']),'amount':data.get('amount'),'count':data.get('count',1)})
                    return self.json_reply(result)
                except PermissionError as error:return self.json_reply({'error':str(error)},403)
                except ValueError as error:return self.json_reply({'error':str(error)},400)
            if path=='/api/local/state':
                if data.get('username',user['username']) != user['username']:
                    return self.json_reply({'error':'A conta mudou. Reabra a sessão.'},409)
                try:accounts.save_state(user,int(data.get('job',0)),data.get('state'),data.get('generation'),require_generation=True)
                except (ValueError,TypeError) as error:
                    game_control.log(user,'state.rejected','warning',{'reason':str(error)[:200]})
                    return self.json_reply({'error':str(error)},400)
                return self.json_reply({'ok':True})
            return self.json_reply({'error':'Serviço local desconhecido.'},404)
        except (ValueError,TypeError,json.JSONDecodeError):
            return self.json_reply({'error':'Dados inválidos.'},400)

    def log_message(self, format, *args):
        pass


class LocalServer(ThreadingHTTPServer):
    request_queue_size = 64
    daemon_threads = True

    def server_bind(self):
        # Windows otherwise allows two Python servers to share a port with reuse.
        if os.name == 'nt' and hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.allow_reuse_address = False
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def main():
    parser = argparse.ArgumentParser(description='Cliente publico original com sessao local independente')
    parser.add_argument('--port', type=int, default=19065)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--host', default='0.0.0.0', help='Interface de rede; 0.0.0.0 permite acesso na rede de casa')
    options = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    try:
        server = LocalServer((options.host, options.port), Handler)
    except OSError:
        raise SystemExit('A porta ja esta ocupada. Feche a janela anterior do jogo e tente novamente.')
    print('FREEston Tale - cliente original, contas locais.', flush=True)
    print('Endereco desta versao: http://127.0.0.1:' + str(options.port), flush=True)
    try:
        addresses=socket.gethostbyname_ex(socket.gethostname())[2]
    except OSError:
        addresses=[]
    for address in sorted(set(addresses)):
        if not address.startswith('127.'):
            print('Na rede de casa: http://' + address + ':' + str(options.port), flush=True)
    print('A primeira abertura baixa os arquivos publicos do jogo e precisa de Internet.', flush=True)
    print('Mantenha esta janela aberta. Ctrl+C encerra o jogo.', flush=True)
    print('Verificando os arquivos principais do cliente...', flush=True)
    try:
        for path in PINNED:
            static_asset(path)
    except Exception as error:
        server.server_close()
        raise SystemExit('Falha ao verificar/baixar o cliente publico: ' + str(error))
    if not options.no_browser:
        threading.Timer(1, lambda: webbrowser.open('http://127.0.0.1:' + str(options.port))).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()

