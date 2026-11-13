from pathlib import Path
import shutil,datetime,hashlib,re
site=Path(r'C:\VelluM\integration-priston')
sw=site/'sw.js';prewarm=site/'prewarm.js'
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
for f in (sw,prewarm):
 shutil.copy2(f,f.with_name(f.name+'.before-fast-cache-'+stamp+'.bak'))
s=sw.read_text('utf8')
engine=hashlib.sha256((site/'game.wasm').read_bytes()).hexdigest()[:12]
startup=hashlib.sha256((site/'data_startup.pack').read_bytes()).hexdigest()[:12]
startup_gzip=hashlib.sha256((site/'data_startup.pack.gz').read_bytes()).hexdigest()[:12]
marker="var CACHE = 'pt-data-1';"
assert s.count(marker)==1
s=s.replace(marker,marker+f"""
// Immutable releases: instantly reuse the large startup payload and WASM after
// the first load, instead of downloading/revalidating 84MB on every visit.
var BOOT_CACHE = 'pt-boot-{startup}-{startup_gzip}';
var ENGINE_CACHE = 'pt-engine-{engine}';
var FAST_BOOT = ['data_startup.pack','data_startup.pack.gz'];
var FAST_ENGINE = ['game.wasm','game.js'];
async function immutableAsset(req, cacheName, cacheKey) {{
    var cache = await caches.open(cacheName);
    var hit = await cache.match(cacheKey);
    if (hit) return hit;
    var response = await fetch(req);
    if (response.ok && response.status === 200) {{
        // Cache in the background, without blocking the main game download.
        // A failed/quota-limited cache write does not prevent gameplay.
        cache.put(cacheKey, response.clone()).catch(function(err) {{
            console.warn('[VelluM] Cache storage unavailable:', String(err));
        }});
    }}
    return response;
}}
""",1)
old="""return Promise.all(names.filter(function (n) { return n.indexOf('pt-data-') == 0 && n != CACHE; })
\t\t\t.map(function (n) { return caches.delete(n); }));"""
assert s.count(old)==1
new="""return Promise.all(names.filter(function (n) {
            return (n.indexOf('pt-data-') == 0 && n != CACHE) ||
                (n.indexOf('pt-boot-') == 0 && n != BOOT_CACHE) ||
                (n.indexOf('pt-engine-') == 0 && n != ENGINE_CACHE);
        }).map(function (n) { return caches.delete(n); }));"""
s=s.replace(old,new,1)
old="""if (url.origin != location.origin || url.search || url.pathname.indexOf(scopePath) != 0) return;
\tvar rel = url.pathname.slice(scopePath.length);"""
assert s.count(old)==1
new="""if (url.origin != location.origin || url.pathname.indexOf(scopePath) != 0) return;
    var rel = url.pathname.slice(scopePath.length);
    // Cache first for version-identified engine and startup files. Versioned
    // game.js uses a unique URL with each build; WASM uses ENGINE_CACHE.
    if (req.method == 'GET' && !req.headers.has('Range') &&
        (FAST_BOOT.indexOf(rel) >= 0 || FAST_ENGINE.indexOf(rel) >= 0)) {
        var boot = FAST_BOOT.indexOf(rel) >= 0;
        var key = boot ? new URL(rel, self.registration.scope).href : req.url;
        e.respondWith(immutableAsset(req, boot ? BOOT_CACHE : ENGINE_CACHE, key));
        return;
    }
    if (url.search) return;"""
s=s.replace(old,new,1)
# Avoid a racing duplicate fetch crash for requests already being saved.
old="""if (inflight.has(e.request.url)) {
\t\tvar shared = await inflight.get(e.request.url).ready;"""
assert s.count(old)==1
new="""if (inflight.has(e.request.url) && inflight.get(e.request.url).ready) {
        var shared = await inflight.get(e.request.url).ready;"""
s=s.replace(old,new,1)
# Keep the service worker alive while large assets are written to cache.
s=s.replace('async function immutableAsset(req, cacheName, cacheKey) {',
            'async function immutableAsset(event, cacheName, cacheKey) {\n    var req = event.request;',1)
s=s.replace('cache.put(cacheKey, response.clone()).catch(function(err) {',
            'event.waitUntil(cache.put(cacheKey, response.clone()).catch(function(err) {',1)
s=s.replace("console.warn('[VelluM] Cache storage unavailable:', String(err));\n        });",
            "console.warn('[VelluM] Cache storage unavailable:', String(err));\n        }));",1)
s=s.replace('immutableAsset(req, boot ? BOOT_CACHE : ENGINE_CACHE, key)',
            'immutableAsset(e, boot ? BOOT_CACHE : ENGINE_CACHE, key)',1)
sw.write_text(s,'utf8')
p=prewarm.read_text('utf8')
old='setTimeout(prepare,4000);'
assert p.count(old)==1
p=p.replace(old,'setTimeout(prepare,18000);',1)
prewarm.write_text(p,'utf8')
print('FAST_CACHE_APPLIED',stamp,'ENGINE',engine,'BOOT',startup,'GZ',startup_gzip)
