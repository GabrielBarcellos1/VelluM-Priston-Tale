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
  const costumesTab=el("button","ft-native-tab","Trajes");
  premiumTab.type=skinsTab.type=costumesTab.type="button";
  tabs.append(premiumTab,skinsTab,costumesTab);
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
  let tab=["premium","skins","costume"].includes(ctx.initialTab)?ctx.initialTab:"premium";
  let selectedId=null,busy=false,disposed=false,renderingIcons=false;
  const skinIcons=new Map();
  let kitIcon=null;
  let iconRun=0;
  const skinShop=()=>ctx.skins?.();
  const snapshot=()=>skinShop()?.snapshot;
  // Legacy 3/24/48/72h effects are retained server-side for existing owners,
  // but the storefront only shows the individually purchasable Item Shop range.
  const currentItems=()=>{
    if(tab==="skins")return snapshot()?.catalog??[];
    const products=ctx.wallet()?.catalog??[];
    return products.filter(item=>tab==="costume"
      ? item.category==="costume"||item.kind==="costume"
      : item.category==="premium"||item.category==="items"||item.kind==="item");
  };
  const itemKey=(item)=>tab==="skins"?item.id:item.code;
  const formatCoins=(v)=>Number(v??0).toLocaleString("pt-BR");
  const owned=(skin)=>!!snapshot()?.owned?.includes(skin.id);
  const equipped=(skin)=>snapshot()?.equip?.[skin.cat]===skin.id;
  const itemIcon=(item,kind=tab)=>{
    if(kind==="skins")return skinIcons.get(item.id)||
      (ctx.itemImage?.(item.look)?"/assets/"+ctx.itemImage(item.look):"");
    if(item.code==="BI900")return kitIcon??"";
    return item.icon?"/assets/"+item.icon:(ctx.itemImage?.(item.code)?"/assets/"+ctx.itemImage(item.code):"");
  };
  function image(item,kind=tab){
    const src=itemIcon(item,kind);
    const img=el("img","ft-native-item-art");
    if(src)img.src=src;
    else if(item.code==="BI900") {
      img.alt="Kit Up — conjunto de itens premium";
      img.classList.add("ft-native-kit-loading");
    }
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
      if(tab==="skins")slot.classList.add("ft-native-skin-slot");
      if(tab==="costume")slot.classList.add("ft-native-costume-slot");
      slot.append(image(item));
      if(item.code==="BI900"&&!kitIcon)slot.append(el("span","ft-native-kit-label","KIT"));
      if(tab==="skins"&&equipped(item))slot.append(el("span","ft-native-equipped","E"));
      slot.onclick=()=>{selectedId=itemKey(item);draw();};
      grid.append(slot);
    }
    // Keep the empty inventory squares visible, as in the classic shop.
    const cols=tab==="skins"?4:9;
    const minSlots=tab==="skins"?Math.max(20,Math.ceil(items.length/cols)*cols):Math.max(81,Math.ceil(items.length/cols)*cols);
    for(let i=items.length;i<minSlots;i++){
      const blank=el("div","ft-native-slot ft-native-slot-empty"+(tab==="skins"?" ft-native-skin-slot":""));
      blank.setAttribute("aria-hidden","true");grid.append(blank);
    }
    empty.hidden=items.length>0;
    grid.classList.toggle("ft-native-skins-grid",tab==="skins");
    grid.classList.toggle("ft-native-costumes-grid",tab==="costume");
    premiumTab.setAttribute("aria-selected",String(tab==="premium"));
    skinsTab.setAttribute("aria-selected",String(tab==="skins"));
    costumesTab.setAttribute("aria-selected",String(tab==="costume"));
    caption.textContent=tab==="costume"?"Trajes":tab==="skins"?"Skins":"Miscellaneous";
    balance.textContent="Saldo: "+formatCoins(tab==="skins"?(snapshot()?.coins??ctx.wallet().coins):ctx.wallet().coins)+" coins";
    showDetails();
  }

  // Compose a distinct Kit Up inventory sprite from genuine Priston premium
  // item art. No Fenix-only thumbnail and no external generated illustration.
  async function buildKitIcon(){
    if(kitIcon||disposed)return;
    const codes=["BI133","BI901","BI906"];
    const images=await Promise.all(codes.map(async code=>{
      const item=ctx.wallet()?.catalog?.find(x=>x.code===code);
      const src=item?.icon;
      if(!src)return null;
      return new Promise(resolve=>{
        const img=new Image();
        img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
        img.src="/assets/"+src;
      });
    }));
    if(disposed)return;
    const canvas=document.createElement("canvas");canvas.width=96;canvas.height=96;
    const g=canvas.getContext("2d");
    if(!g)return;
    const fill=g.createLinearGradient(0,0,96,96);
    fill.addColorStop(0,"#a47c37");fill.addColorStop(.5,"#3b2816");fill.addColorStop(1,"#9a6a28");
    g.fillStyle=fill;g.fillRect(0,0,96,96);
    g.strokeStyle="#efc46d";g.lineWidth=3;g.strokeRect(3,3,90,90);
    g.fillStyle="#181b1b";g.fillRect(8,8,80,64);
    g.strokeStyle="#b68d49";g.lineWidth=1;g.strokeRect(8,8,80,64);
    const positions=[[8,13,46,46],[49,13,34,34],[49,44,34,28]];
    images.forEach((img,i)=>{if(img){const [x,y,w,h]=positions[i];g.drawImage(img,x,y,w,h);}});
    g.fillStyle="#d8b86b";g.fillRect(8,75,80,15);
    g.fillStyle="#26170d";g.font="bold 14px Georgia";g.textAlign="center";
    g.fillText("KIT UP",48,87);
    kitIcon=canvas.toDataURL("image/png");
    draw();
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
  costumesTab.onclick=()=>selectTab("costume");
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
    try{
      ctx.preview?.(item,previewHost);
      const previewClose=el("button","ft-native-preview-close","×");
      previewClose.type="button";
      previewClose.setAttribute("aria-label","Fechar visualização 3D");
      previewClose.onclick=()=>previewHost.querySelector(".skin-inline-preview button")?.click();
      previewHost.append(previewClose);
      previewHost.querySelector(".skin-inline-preview button")?.addEventListener("click",()=>{
        previewHost.hidden=true;
      },{once:true});
    }catch(error){notify(error.message);previewHost.hidden=true;}
  };
  dialog.addEventListener("walletRefresh",()=>{draw();buildKitIcon();});
  dialog.addEventListener("walletRefreshError",e=>notify(e.detail));
  draw();
  buildKitIcon();
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
