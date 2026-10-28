import { renderSapphireItemIcons } from "/custom-skins.mjs";

// A shop window built in the visual language of the original Priston Tale
// inventory, not the website/card dialog. Purchases remain server-authoritative.
export function openPremiumShop(ctx) {
  document.querySelector("#freeston-shop")?.dispatchEvent(new Event("dismiss"));
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const dialog=el("dialog","ft-native-shop");
  dialog.id="freeston-shop";
  dialog.setAttribute("aria-label","Loja de itens premium e skins");
  const heading=el("div","ft-native-heading");
  const title=el("strong","ft-native-title","Loja de Itens");
  const close=el("button","ft-native-close","×");
  close.type="button";close.setAttribute("aria-label","Fechar loja");
  heading.append(title,close);
  const tabs=el("nav","ft-native-tabs");
  const premiumTab=el("button","ft-native-tab","Premiums");
  const skinsTab=el("button","ft-native-tab","Skins");
  premiumTab.type=skinsTab.type="button";
  tabs.append(premiumTab,skinsTab);
  const body=el("div","ft-native-body");
  const inventory=el("section","ft-native-inventory");
  inventory.setAttribute("aria-label","Itens da loja");
  const grid=el("div","ft-native-grid");
  const empty=el("p","ft-native-empty","Nenhum item disponível.");
  inventory.append(grid,empty);
  const details=el("aside","ft-native-details");
  const caption=el("div","ft-native-caption","Miscellaneous");
  const selectedIcon=el("div","ft-native-selected-icon");
  const itemName=el("div","ft-native-item-name","Selecione um item");
  const itemDescription=el("p","ft-native-description","");
  const priceRow=el("div","ft-native-price-row");
  const coin=el("span","ft-native-coin","✦");
  const price=el("span","ft-native-price","0");
  priceRow.append(coin,price);
  const state=el("p","ft-native-owned","");
  const buy=el("button","ft-native-buy","Comprar");
  const preview=el("button","ft-native-view","Ver modelo 3D");
  preview.type="button";preview.hidden=true;
  details.append(caption,selectedIcon,itemName,itemDescription,priceRow,state,buy,preview);
  body.append(inventory,details);
  const footer=el("footer","ft-native-footer");
  const balance=el("span","ft-native-balance","");
  const status=el("span","ft-native-status","");
  status.setAttribute("role","status");
  footer.append(balance,status);
  const previewHost=el("section","ft-native-preview");
  previewHost.hidden=true;
  dialog.append(heading,tabs,body,footer,previewHost);
  document.body.append(dialog);
  dialog.showModal();
  let tab=ctx.initialTab==="skins"?"skins":"premium";
  let selectedId=null,busy=false,disposed=false,renderingIcons=false;
  const skinIcons=new Map();
  let iconRun=0;
  const skinShop=()=>ctx.skins?.();
  const snapshot=()=>skinShop()?.snapshot;
  const currentItems=()=>tab==="skins"?(snapshot()?.catalog??[]):(ctx.wallet()?.catalog??[]);
  const itemKey=(item)=>tab==="skins"?item.id:item.code;
  const formatCoins=(v)=>Number(v??0).toLocaleString("pt-BR");
  const owned=(skin)=>!!snapshot()?.owned?.includes(skin.id);
  const equipped=(skin)=>snapshot()?.equip?.[skin.cat]===skin.id;
  const itemIcon=(item,kind=tab)=>{
    if(kind==="skins")return skinIcons.get(item.id)||
      (ctx.itemImage?.(item.look)?"/assets/"+ctx.itemImage(item.look):"");
    return item.icon?"/assets/"+item.icon:"";
  };
  function image(item,kind=tab){
    const src=itemIcon(item,kind);
    const img=el("img","ft-native-item-art");
    if(src)img.src=src;
    img.alt=item.name;
    img.loading="lazy";
    img.onerror=()=>{img.style.visibility="hidden";};
    return img;
  }
  function dismiss(){
    if(disposed)return;
    disposed=true;iconRun++;
    clearInterval(timer);
    dialog.close();dialog.remove();
  }
  close.onclick=dismiss;
  dialog.addEventListener("dismiss",dismiss);
  dialog.addEventListener("cancel",e=>{e.preventDefault();dismiss();});
  dialog.addEventListener("close",()=>{if(!disposed)dismiss();});
  const notify=(message)=>{status.textContent=message;};
  function selectedItem(){return currentItems().find(x=>itemKey(x)===selectedId);}
  function showDetails(){
    const item=selectedItem();
    selectedIcon.replaceChildren();
    if(!item){
      itemName.textContent="Selecione um item";
      itemDescription.textContent="";
      price.textContent="0";state.textContent="";
      buy.disabled=true;preview.hidden=true;
      return;
    }
    selectedIcon.append(image(item));
    itemName.textContent=item.name+(tab==="premium"&&item.hours?" · "+item.hours+"h":"");
    itemDescription.textContent=item.description||"";
    price.textContent=formatCoins(item.price);
    preview.hidden=tab!=="skins"||!item.customModel;
    if(tab==="skins"){
      const have=owned(item),wear=equipped(item);
      state.textContent=wear?"✓ Visual equipado":have?"✓ Skin adquirida":'Visual permanente';
      buy.textContent=have?(wear?"Remover visual":"Equipar visual"):"Comprar";
      buy.disabled=busy||(have&&!wear&&!skinShop()?.compatible(item))||(!have&&(snapshot()?.coins??0)<item.price);
    }else{
      const wallet=ctx.wallet();
      const count=wallet.stock?.find(x=>x.code===item.code)?.quantity??0;
      state.textContent=count?"Na conta: "+count:"Disponível para compra";
      buy.textContent=count?"Ativar / Comprar":"Comprar";
      buy.disabled=busy||(wallet.coins<item.price&&count<1);
    }
  }
  function draw(){
    if(disposed)return;
    const items=currentItems();
    if(items.length&&!items.some(x=>itemKey(x)===selectedId))selectedId=itemKey(items[0]);
    if(!items.length)selectedId=null;
    grid.replaceChildren();
    for(const item of items){
      const slot=el("button","ft-native-slot");
      slot.type="button";slot.dataset.itemId=itemKey(item);
      slot.title=item.name+" — "+formatCoins(item.price)+" coins";
      slot.setAttribute("aria-label",slot.title);
      if(selectedId===itemKey(item))slot.classList.add("selected");
      if(tab==="skins"&&owned(item))slot.classList.add("owned");
      slot.append(image(item));
      if(tab==="skins"&&equipped(item))slot.append(el("span","ft-native-equipped","E"));
      slot.onclick=()=>{selectedId=itemKey(item);draw();};
      grid.append(slot);
    }
    // Keep the empty inventory squares visible, as in the classic shop.
    for(let i=items.length;i<Math.max(81,Math.ceil(items.length/9)*9);i++){
      const blank=el("div","ft-native-slot ft-native-slot-empty");
      blank.setAttribute("aria-hidden","true");grid.append(blank);
    }
    empty.hidden=items.length>0;
    premiumTab.setAttribute("aria-selected",String(tab==="premium"));
    skinsTab.setAttribute("aria-selected",String(tab==="skins"));
    balance.textContent="Saldo: "+formatCoins(tab==="skins"?(snapshot()?.coins??ctx.wallet().coins):ctx.wallet().coins)+" coins";
    showDetails();
  }
  async function loadSkins(){
    const run=++iconRun;
    try{
      await skinShop()?.refresh();
      if(disposed||run!==iconRun)return;
      draw();
      if(renderingIcons||!ctx.B)return;
      renderingIcons=true;
      await renderSapphireItemIcons(ctx.B,snapshot()?.catalog??[],(id,data)=>{
        if(disposed)return;
        skinIcons.set(id,data);
        for(const img of dialog.querySelectorAll(".ft-native-slot img")){
          if(img.parentElement?.dataset.itemId===id)img.src=data;
        }
        if(selectedId===id&&tab==="skins")showDetails();
      });
    }catch(error){notify("Não foi possível carregar os modelos 3D: "+error.message);}
    finally{renderingIcons=false;}
  }
  async function selectTab(next){
    tab=next;selectedId=null;
    previewHost.hidden=true;previewHost.replaceChildren();
    draw();
    if(tab==="skins")await loadSkins();
  }
  premiumTab.onclick=()=>selectTab("premium");
  skinsTab.onclick=()=>selectTab("skins");
  buy.onclick=async()=>{
    if(busy)return;
    const item=selectedItem();if(!item)return;
    busy=true;draw();
    try{
      if(tab==="skins"){
        const action=!owned(item)?"buy":equipped(item)?"remove":"equip";
        const result=await skinShop().mutate(action,item);
        notify(result?.message??"Operação concluída.");
      }else{
        const count=ctx.wallet().stock?.find(x=>x.code===item.code)?.quantity??0;
        const action=count?"activate":"purchase";
        const result=await ctx.action(action,item.code);
        notify(result?.message??"Operação concluída.");
      }
    }catch(error){notify(error.message);}
    finally{busy=false;draw();}
  };
  preview.onclick=()=>{
    const item=selectedItem();
    if(!item?.customModel)return;
    previewHost.replaceChildren();previewHost.hidden=false;
    try{ctx.preview?.(item,previewHost);}
    catch(error){notify(error.message);previewHost.hidden=true;}
  };
  draw();
  if(tab==="skins")loadSkins();
  const timer=setInterval(async()=>{
    if(disposed||document.hidden||busy)return;
    try{
      if(tab==="premium")await ctx.refresh();
      else await skinShop()?.refresh();
      if(!disposed)draw();
    }catch(error){notify(error.message);}
  },10000);
  return dialog;
}
