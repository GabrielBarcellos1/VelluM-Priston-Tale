/* Preserve the renderer's *actual* framebuffer ratio (16:9 or 4:3). */
(function(){
'use strict';
var key='vellum-aspect-v2';
var canvas=document.getElementById('canvas');
if(!canvas)return;
function read(){try{return localStorage.getItem(key)==='preserve'}catch(e){return false}}
function size(){
 if(!document.documentElement.classList.contains('vm-keep-aspect')){
  canvas.style.removeProperty('width');canvas.style.removeProperty('height');return;
 }
 var sourceW=canvas.width||1024,sourceH=canvas.height||768;
 if(!sourceW||!sourceH)return;
 var w=Math.max(1,innerWidth),h=Math.max(1,innerHeight),ratio=sourceW/sourceH;
 var fittedW=Math.min(w,h*ratio),fittedH=fittedW/ratio;
 canvas.style.setProperty('width',Math.round(fittedW)+'px','important');
 canvas.style.setProperty('height',Math.round(fittedH)+'px','important');
}
function apply(v){
 document.documentElement.classList.toggle('vm-keep-aspect',!!v);
 try{localStorage.setItem(key,v?'preserve':'fill')}catch(e){}
 size();
}
var b=document.createElement('button');b.type='button';b.id='vellum-aspect-switch';b.setAttribute('aria-label','Alternar proporção da tela');
function paint(){b.textContent=document.documentElement.classList.contains('vm-keep-aspect')?'Tela: proporcional':'Tela: preencher'}
apply(read());paint();
b.addEventListener('click',function(){apply(!document.documentElement.classList.contains('vm-keep-aspect'));paint()});
var css=document.createElement('style');
css.textContent='#vellum-aspect-switch{position:fixed;top:max(10px,env(safe-area-inset-top));right:max(65px,env(safe-area-inset-right));z-index:29;background:#172521b9;color:#f2d99e;border:1px solid #776039;border-radius:8px;padding:7px 10px;font:600 12px system-ui;cursor:pointer}@media(pointer:coarse){#vellum-aspect-switch{top:auto;bottom:max(9px,env(safe-area-inset-bottom));left:50%;right:auto;transform:translateX(-50%);opacity:.72}}';
document.head.appendChild(css);document.body.appendChild(b);
window.addEventListener('resize',size,{passive:true});
new MutationObserver(size).observe(canvas,{attributes:true,attributeFilter:['width','height']});
window.VelluMAspect={set:apply,get:()=>document.documentElement.classList.contains('vm-keep-aspect'),refresh:size};
})();
