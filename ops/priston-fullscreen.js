(function(){
'use strict';
var b=document.createElement('button');
b.type='button';b.id='vellum-fullscreen';b.title='Tela cheia (Esc para sair)';
b.setAttribute('aria-label','Ativar tela cheia');b.textContent='⛶';
var css=document.createElement('style');
css.textContent='#vellum-fullscreen{position:fixed;top:12px;right:12px;z-index:30;background:rgba(12,20,21,.78);color:#e9d49d;border:1px solid #766039;border-radius:8px;font:28px/1 system-ui;padding:4px 9px;cursor:pointer;opacity:.42;transition:opacity .2s}#vellum-fullscreen:hover,#vellum-fullscreen:focus{opacity:1}';
document.head.appendChild(css);
document.body.appendChild(b);
b.addEventListener('click',async function(){
try{
if(document.fullscreenElement)await document.exitFullscreen();
else await document.documentElement.requestFullscreen();
}catch(e){console.warn('[VelluM] Fullscreen unsupported:',e);}
});
document.addEventListener('fullscreenchange',function(){
b.title=document.fullscreenElement?'Sair da tela cheia (Esc)':'Tela cheia';
b.setAttribute('aria-label',b.title);
});
})();