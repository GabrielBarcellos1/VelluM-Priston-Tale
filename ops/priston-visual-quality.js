/* Per-browser presentation: a gentle VelluM-like colour grade, never changes textures or game logic. */
(function(){
 'use strict';
 var canvas=document.getElementById('canvas');
 if(!canvas)return;
 var key='vellum-classic-visual-safe-v2';
 var mode='classic';
 try{mode=localStorage.getItem(key)||'classic';}catch(e){}
 if(mode!=='classic'&&mode!=='vellum')mode='vellum';
 var style=document.createElement('style');
 style.textContent='#canvas.vellum-visual{filter:contrast(1.075) saturate(1.105) brightness(1.015)}'+
 '#vellum-image-quality{position:fixed;top:12px;right:65px;z-index:30;background:rgba(12,20,21,.78);color:#e9d49d;border:1px solid #766039;border-radius:8px;font:600 12px system-ui;padding:9px 10px;cursor:pointer;opacity:.46;transition:opacity .2s}'+
 '#vellum-image-quality:hover,#vellum-image-quality:focus{opacity:1}'+
 '@media(max-width:520px){#vellum-image-quality{font-size:10px;padding:10px 6px;right:61px}}';
 document.head.appendChild(style);
 var b=document.createElement('button');
 b.id='vellum-image-quality';b.type='button';
 function render(){
  canvas.classList.toggle('vellum-visual',mode==='vellum');
  b.textContent=mode==='vellum'?'Visual: HD':'Visual: clássico';
  b.title='Alternar tratamento visual do VelluM. Não aumenta o download nem altera a jogabilidade.';
  b.setAttribute('aria-pressed',mode==='vellum'?'true':'false');
 }
 b.addEventListener('click',function(){
  mode=mode==='vellum'?'classic':'vellum';
  try{localStorage.setItem(key,mode);}catch(e){}
  render();
 });
 document.body.appendChild(b);
 render();
})();