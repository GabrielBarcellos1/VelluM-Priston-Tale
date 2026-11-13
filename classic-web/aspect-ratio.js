/* VelluM aspect ratio: explicit per-player choice; no change to 1024x768 internal render target. */
(function(){
'use strict';
var key='vellum-aspect-v1';
function read(){try{return localStorage.getItem(key)==='preserve'}catch(e){return false}}
function apply(v){document.documentElement.classList.toggle('vm-keep-aspect',!!v);try{localStorage.setItem(key,v?'preserve':'fill')}catch(e){}}
apply(read());
window.VelluMAspect={set:apply,get:()=>document.documentElement.classList.contains('vm-keep-aspect')};
var b=document.createElement('button');
b.type='button';b.id='vellum-aspect-switch';
b.setAttribute('aria-label','Alternar proporção da tela');
function paint(){b.textContent=window.VelluMAspect.get()?'Tela: proporcional':'Tela: preencher'}
paint();
b.addEventListener('click',function(){apply(!window.VelluMAspect.get());paint()});
var css=document.createElement('style');
css.textContent='#vellum-aspect-switch{position:fixed;top:max(10px,env(safe-area-inset-top));right:max(65px,env(safe-area-inset-right));z-index:29;background:#172521b9;color:#f2d99e;border:1px solid #776039;border-radius:8px;padding:7px 10px;font:600 12px system-ui;cursor:pointer}@media(pointer:coarse){#vellum-aspect-switch{top:auto;bottom:max(9px,env(safe-area-inset-bottom));left:50%;right:auto;transform:translateX(-50%);opacity:.72}}';
document.head.appendChild(css);document.body.appendChild(b);
})();
