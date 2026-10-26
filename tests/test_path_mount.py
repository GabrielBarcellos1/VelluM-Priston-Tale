import http.cookiejar,json,threading,urllib.error,urllib.request,unittest
from test_server_audit import ServerAudit
import path_mount as mount

class MountRules(unittest.TestCase):
    def test_mount_boundary_query_and_root_mode(self):
        for source,target in [('/priston','/'),('/priston/','/'),('/priston/jogar?classe=1&mapa=2','/jogar?classe=1&mapa=2')]:self.assertEqual(mount.strip_mount(source),('/priston',target))
        for source in ['/guacamole/','/priston-other/','/api/local/build']:self.assertEqual(mount.strip_mount(source),('',source))
    def test_urls_rebase_without_corrupting_native_path_separators_or_external_urls(self):
        source=b'''import x from "/session.mjs";fetch(`/api/local/me`);let a="/assets/",b="/_app/x.js";location.replace("/");location.pathname==="/painel";let x=logoutAccount ? "/" : "/personagens";let separator="/";x.split("/");let cdn="https://cdn.example/assets/x";let absolute="//other.example/x";'''
        result=mount.rewrite(source,'text/javascript','/priston').decode()
        for text in ['"/priston/session.mjs"','`/priston/api/local/me`','"/priston/assets/"','"/priston/_app/x.js"','location.replace("/priston/")','pathname==="/priston/painel"','logoutAccount ? "/priston/" : "/priston/personagens"','x.split("/")','separator="/"','"https://cdn.example/assets/x"','"//other.example/x"']:self.assertIn(text,result)
        self.assertEqual(mount.rewrite(source,'text/javascript',''),source)
        self.assertEqual(mount.rewrite(result.encode(),'text/javascript','/priston'),result.encode())
    def test_html_css_json_binary_cookie_and_redirects(self):
        html=b'<a href="/personagens"><a href="/">Voltar</a><script src="/login.mjs"></script><link href="/mobile.css">'
        self.assertIn(b'href="/priston/personagens"',mount.rewrite(html,'text/html','/priston'))
        self.assertIn(b'href="/priston/"',mount.rewrite(html,'text/html','/priston'))
        self.assertIn(b'url(/priston/assets/x)',mount.rewrite(b'p{background:url(/assets/x)}','text/css','/priston'))
        value={'image':'/assets/x','model':'/_app/x','name':'A /personagens B','stats':{'hp':3}}
        result=json.loads(mount.rewrite(json.dumps(value).encode(),'application/json','/priston'))
        self.assertEqual(result,{**value,'image':'/priston/assets/x','model':'/priston/_app/x'})
        self.assertEqual(mount.rewrite(b'\x00\xff','image/png','/priston'),b'\x00\xff')
        self.assertEqual(mount.header('Location','/jogar?classe=1','/priston'),'/priston/jogar?classe=1')
        self.assertEqual(mount.header('Location','https://example.test/','/priston'),'https://example.test/')
        self.assertEqual(mount.header('Set-Cookie','test=value; HttpOnly; Path=/; Secure','/priston'),'test=value; HttpOnly; Path=/priston/; Secure')

class MountHttp(ServerAudit):
    def test_prefixed_login_cookie_api_modules_assets_and_csrf(self):
        import iniciar
        server=iniciar.LocalServer(('127.0.0.1',0),iniciar.Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
        self.addCleanup(server.server_close);self.addCleanup(server.shutdown)
        base='http://127.0.0.1:'+str(server.server_port);jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        def req(path,data=None,headers=None):
            r=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json',**(headers or {})})
            try:
                with client.open(r,timeout=6) as response:return response.status,response.headers,response.read()
            except urllib.error.HTTPError as error:return error.code,error.headers,error.read()
        status,h,body=req('/priston/');self.assertEqual(status,200);self.assertIn(b'/priston/login.mjs',body);self.assertIn("frame-src 'none'",h['Content-Security-Policy'])
        self.assertEqual(req('/priston/api/local/me')[0],401)
        status,h,body=req('/priston/api/local/login',{'username':'audituser','password':'Synthetic-fixture-only-910!'})
        self.assertEqual(status,200);self.assertIn('Path=/priston/',h['Set-Cookie']);self.assertEqual(req('/priston/api/local/me')[0],200)
        self.assertEqual(req('/api/local/me')[0],401)
        for _ in range(10):self.assertEqual(req('/priston/api/local/state',{'job':1},{'Origin':'https://outside.invalid'})[0],403)
        status,h,body=req('/priston/session.mjs');self.assertEqual(status,200);self.assertIn(b'from "/priston/gm-tools.mjs"',body);self.assertIn(b'/priston/api/local/',body)
        self.assertEqual(req('/priston/assets/image/freeston/gm/sheltom.svg')[0],200)
        self.assertEqual(req('/priston/api/local/build')[0],200)
        self.assertEqual(req('/priston/%2e%2e/data/accounts.seed.json')[0],400)

for name in vars(ServerAudit):
    if name.startswith('test_') and name not in vars(MountHttp):setattr(MountHttp,name,None)
del ServerAudit

