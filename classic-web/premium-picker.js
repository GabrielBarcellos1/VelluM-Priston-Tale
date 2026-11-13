(function(){
'use strict';
const css=document.createElement('style');
css.textContent=`
.vc-shadow{position:fixed;inset:0;z-index:100000;background:rgba(3,5,14,.82);display:grid;place-items:center;padding:12px;color:#f5f0ff;font-family:Arial,sans-serif;font-size:13px}
.vc-shadow[hidden]{display:none}
.vc-modal{width:min(930px,96vw);height:min(680px,94vh);border:1px solid #7865b0;border-radius:13px;background:#161525;display:flex;flex-direction:column;box-shadow:0 16px 65px #000c;overflow:hidden}
.vc-top{background:linear-gradient(110deg,#35234d,#211a33);display:flex;align-items:center;justify-content:space-between;padding:14px 17px}
.vc-top h2{font-size:20px;margin:0}.vc-top p{margin:3px 0 0;color:#c3b7d5;font-size:12px}
.vc-button{border-radius:7px;border:1px solid #685486;background:#332a48;color:#f8f3ff;padding:9px 11px;cursor:pointer}
.vc-button:hover,.vc-button.on{background:#7351a6;border-color:#ac86e7}
.vc-tabs{display:flex;gap:7px;padding:10px 14px;border-bottom:1px solid #423653}
.vc-filters{display:flex;gap:6px;padding:10px 14px;overflow-x:auto;scrollbar-width:thin;border-bottom:1px solid #38334b;flex-shrink:0}
.vc-filters .vc-button{white-space:nowrap;font-size:12px;padding:7px 10px}
.vc-query{background:#0f1020;color:white;border:1px solid #695680;border-radius:7px;margin:10px 14px;padding:10px 12px;outline:none}
.vc-query:focus{border-color:#aa8bed}
.vc-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));align-content:start;gap:9px;padding:10px 14px;overflow-y:auto;flex:1}
.vc-entry{display:flex;gap:9px;align-items:center;text-align:left;min-height:74px;background:#252139;color:white;border:1px solid #4d3e69;border-radius:9px;cursor:pointer;padding:9px}
.vc-entry:hover{border-color:#b594f1;background:#39304e}
.vc-icon{width:46px;height:46px;object-fit:contain;flex-shrink:0;background:#15101e;border-radius:6px}
.vc-name{display:block;font-size:12px;font-weight:bold;overflow-wrap:anywhere}
.vc-code{display:block;font-size:11px;color:#b7a8d4;margin-top:5px}
.vc-bottom{padding:10px 14px;border-top:1px solid #403853;color:#bdb1ce}
.vc-empty{grid-column:1/-1;text-align:center;padding:30px;color:#cfc0df}
.vc-preview[hidden]{display:none}
.vc-preview{position:absolute;inset:0;display:grid;place-items:center;background:rgba(2,2,7,.83);padding:14px;z-index:4}
.vc-preview-card{width:min(390px,95vw);background:#211c32;border:1px solid #8a70b1;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px;text-align:center}
.vc-preview-icon{width:110px;height:110px;object-fit:contain;background:#14121c;border-radius:9px}
.vc-preview-name{font-size:17px;font-weight:bold;overflow-wrap:anywhere}
.vc-preview-action{display:flex;gap:10px;margin-top:8px}
.vc-info{font-size:12px;color:#c9bed6}
@media(max-width:520px){.vc-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:7px}.vc-entry{padding:6px;gap:5px}.vc-icon{width:37px;height:37px}.vc-modal{height:94vh}.vc-top h2{font-size:18px}}
`;
document.head.appendChild(css);
const overlay=document.createElement('div');overlay.className='vc-shadow';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Criar itens GM');
overlay.innerHTML=`
<section class="vc-modal" style="position:relative">
<header class="vc-top"><div><h2>CRIAR • Gerenciador GM</h2><p>Selecione um item real do catálogo do Priston</p></div><button class="vc-button vc-close">Fechar ✕</button></header>
<nav class="vc-tabs"><button class="vc-button on" data-tab="premium">Premium</button><button class="vc-button" data-tab="items">Itens</button></nav>
<nav class="vc-filters" aria-label="Categorias de itens"></nav>
<input class="vc-query" type="search" autocomplete="off" placeholder="Pesquise pelo nome ou código...">
<div class="vc-list"></div><footer class="vc-bottom"><span class="vc-count">Carregando...</span> · Somente conta ADM com GM ativo</footer>
<section class="vc-preview" hidden><div class="vc-preview-card">
<img class="vc-preview-icon" alt="Ícone do item"><div class="vc-preview-name"></div><div class="vc-preview-code"></div>
<div class="vc-info">O item será solicitado ao servidor e entregue ao inventário quando autorizado.</div>
<div class="vc-preview-action"><button class="vc-button vc-back">Voltar</button><button class="vc-button vc-confirm on">Criar item</button></div>
</div></section></section>`;
document.body.appendChild(overlay);
const list=overlay.querySelector('.vc-list'),search=overlay.querySelector('.vc-query'),filters=overlay.querySelector('.vc-filters'),preview=overlay.querySelector('.vc-preview'),count=overlay.querySelector('.vc-count');
let state={tab:'premium',category:'Todos',premium:[],items:[],loaded:false,selected:null};
function normalizePremium(entry){
  const item={...entry};
  const name=item.name||item.code;
  const m=name.match(/(?:\(|\b)(30)\s*(?:dias?|days?)(?:\)|\b)/i);
  if(m){item.name=name.replace(/\s*\(\s*30\s*(?:days?|dias?)\s*\)/gi,'').trim()+' (30 dias)';item.duration=30;}
  else if(/\b7\s*(?:dias?|days?)\b/i.test(name)){item.duration=7;item.name=name.replace(/\s*\(\s*7\s*(?:days?|dias?)\s*\)/gi,'').trim()+' (7 dias)';}
  else item.duration=0;
  return item;
}
function exit(){overlay.hidden=true;preview.hidden=true;state.selected=null;search.value='';}
function categoryTabs(){
  const cats=state.tab==='premium'?['Todos','7 dias','30 dias']:[
    'Todos','Armaduras','Roupões','Foices','Espadas','Machados','Martelos','Lanças','Arcos','Adagas',
    'Garras','Maças','Dardos','Punhos','Escudos','Botas','Luvas','Braceletes','Anéis','Amuletos','Orbes','Forças','Outros'
  ];
  filters.replaceChildren();
  for(const title of cats){
    const b=document.createElement('button');b.type='button';b.className='vc-button'+(title===state.category?' on':'');
    b.textContent=title;b.addEventListener('click',()=>{state.category=title;categoryTabs();draw();});
    filters.appendChild(b);
  }
}
function imgNode(item,kind){
  const icon=document.createElement('img');icon.className=kind;icon.loading='lazy';icon.decoding='async';icon.fetchPriority='low';icon.src=item.icon||'';icon.alt='';
  icon.onerror=()=>{icon.removeAttribute('src');icon.alt='Sem ícone';};
  return icon;
}
function filteredItems(){
 const all=state.tab==='premium'?state.premium:state.items;
 const q=search.value.trim().toLocaleLowerCase('pt-BR');
 return all.filter(x=>(!q||(x.name+' '+x.code).toLocaleLowerCase('pt-BR').includes(q))&&
 (state.category==='Todos'||(state.tab==='premium'?
 (state.category==='7 dias'&&x.duration===7)||(state.category==='30 dias'&&x.duration===30):x.category===state.category)));
}
function draw(){
 const all=state.tab==='premium'?state.premium:state.items,found=filteredItems();
 list.replaceChildren();const frag=document.createDocumentFragment();
 for(const item of found.slice(0,1200)){
   const button=document.createElement('button');button.type='button';button.className='vc-entry';
   button.appendChild(imgNode(item,'vc-icon'));
   const txt=document.createElement('span');
   const name=document.createElement('span');name.className='vc-name';name.textContent=item.name;
   const code=document.createElement('span');code.className='vc-code';code.textContent=item.code;
   txt.append(name,code);button.append(txt);button.addEventListener('click',()=>selectItem(item));
   frag.appendChild(button);
 }
 if(!found.length){const empty=document.createElement('div');empty.className='vc-empty';empty.textContent='Nenhum item encontrado.';frag.appendChild(empty);}
 list.appendChild(frag);
 count.textContent=found.length+' de '+all.length+' itens';
}
function selectItem(item){
 state.selected=item;preview.hidden=false;
 const img=overlay.querySelector('.vc-preview-icon');img.src=item.icon||'';img.alt=item.name;img.onerror=()=>{img.removeAttribute('src');};
 overlay.querySelector('.vc-preview-name').textContent=item.name;
 overlay.querySelector('.vc-preview-code').textContent=item.code+' • '+(state.tab==='premium'?'Premium':item.category);
}
function make(){
 const item=state.selected;if(!item)return;
 if(typeof Module==='undefined'){count.textContent='Cliente não carregou.';preview.hidden=true;return;}
 if(state.tab==='premium'){
   if(typeof Module._PtPremiumPick!=='function'){count.textContent='Cliente Premium indisponível.';preview.hidden=true;return;}
   Module._PtPremiumPick(item.id);
 }else{
   if(typeof Module._PtItemPick!=='function'){count.textContent='Cliente de itens indisponível.';preview.hidden=true;return;}
   Module._PtItemPick(item.id);
 }
 exit();
}
async function open(){
 overlay.hidden=false;preview.hidden=true;search.value='';search.focus();
 if(!state.loaded){
   try{
    const [p,i]=await Promise.all(['/premium-catalog.json','/items-catalog.json'].map(url=>fetch(url,{cache:'no-cache'})));
    if(!p.ok||!i.ok)throw new Error('Catálogo não disponível');
    state.premium=(await p.json()).map(normalizePremium);state.items=await i.json();state.loaded=true;
   }catch(e){count.textContent='Erro ao carregar catálogos';console.warn('[VelluM Criar]',e);}
 }
 state.category='Todos';categoryTabs();draw();
}
overlay.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
 state.tab=b.dataset.tab;state.category='Todos';overlay.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('on',x===b));
 categoryTabs();draw();
}));
overlay.querySelector('.vc-close').addEventListener('click',exit);
overlay.querySelector('.vc-back').addEventListener('click',()=>{preview.hidden=true;state.selected=null;});
overlay.querySelector('.vc-confirm').addEventListener('click',make);
overlay.addEventListener('mousedown',e=>{if(e.target===overlay)exit()});
overlay.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if(!preview.hidden)preview.hidden=true;else exit();}});
search.addEventListener('input',draw);
window.addEventListener('pt-criar-open',open);
window.addEventListener('pt-premium-open',open);
window.VelluMCreateShop={open,close:exit};
})();
