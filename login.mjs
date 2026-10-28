import {characterPortrait} from './login-portrait.mjs';
const $ = (selector) => document.querySelector(selector);
let account, roster, selected, deleting;
const skills = new Map();
const fullPortraits=new Map();
function rosterPortrait(job,mini=false){
 const src=fullPortraits.get(Number(job));
 if(!src){
  const fallback=characterPortrait(job,{mini});
  fallback.dataset.portraitJob=String(job);
  return fallback;
 }
 const holder=node("span",undefined,mini?"character-art character-art-mini":"character-art character-art-main");
 const img=node("img",undefined,"roster-native-portrait");
 img.alt="Visualização da classe equipada com itens avançados";
 img.decoding="async";
 img.src=src;
 if(Number(job)===11){
  holder.classList.add('roster-composite');
  const body=characterPortrait(job,{mini});
  body.className='roster-composite-base';
  holder.append(body);
 }
 holder.append(img);
 holder.dataset.portraitJob=String(job);
 return holder;
}
fetch("/assets/roster-full-portraits.json",{cache:"force-cache"})
 .then(r=>{if(!r.ok)throw Error("retratos indisponíveis");return r.json();})
 .then(data=>{
  for(const [job,src] of Object.entries(data.portraits??{}))
   if(/^data:image\/webp;base64,/.test(src))fullPortraits.set(Number(job),src);
  for(const old of document.querySelectorAll("[data-portrait-job]")){
   const job=Number(old.dataset.portraitJob);
   if(fullPortraits.has(job))old.replaceWith(rosterPortrait(job,old.classList.contains("character-art-mini")));
  }
 }).catch(()=>{}); // SVG remains as an immediate, safe fallback.
const descriptions = [
  "Combate corpo a corpo com machados e golpes de força.",
  "Versatilidade, proteção e domínio das máquinas.",
  "Ataques à distância com arco e precisão.",
  "Alcance de lança e golpes críticos.",
  "Agilidade com lanças de arremesso e escudo.",
  "Espadas, resistência e poderes sagrados.",
  "Magia elemental e ataques em área.",
  "Cura, proteção e magia divina.",
  "Ataques ágeis e domínio de adagas.",
  "Magia espiritual e poderes ancestrais.",
  "Combate marcial e golpes com os punhos.",
];
async function api(path, data) {
  const response = await fetch(
    path,
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && document.body.dataset.rosterReady === "true") {
      for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
      $("#delete-form").reset();
      $("#entry").hidden = false;
      $("#roster").hidden = true;
      $("#account-nav").hidden = true;
      document.body.dataset.rosterReady = "false";
      document.body.classList.remove("roster-cinematic");
      clearPreviewCache();
      $("#message").textContent = "Sua sessão expirou. Entre novamente.";
    }
    const error = Error(result.error ?? "Não foi possível concluir. Tente novamente.");
    error.status = response.status;
    throw error;
  }
  return result;
}
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function icon(job) {
  const img = node("img", undefined, "class-icon");
  img.alt = "";
  img.loading = "lazy";
  const path = skills.get(job);
  if (path) img.src = "/assets/" + path;
  else img.hidden = true;
  img.onerror = () => {
    img.hidden = true;
  };
  return img;
}
// Instant character selection: no iframe, no 3D engine, no asset request.
// Illustrated portraits are built synchronously in the current document.
function clearPreviewCache() {}
function detail(){
  const panel=$("#character-detail");
  panel.replaceChildren();
  if(!selected){
    panel.append(node("h2","Encontre seu herói."),
      node("p","Crie um personagem para começar.","muted"));
    return;
  }
  const type=roster.classes.find(c=>c.job===selected.job);
  const stage=node("div",undefined,"character-model-stage");
  const ranked=rankedCharacters(),index=ranked.findIndex(c=>c.job===selected.job);
  if(ranked.length>1){
    for(const [offset,cls] of [[-1,"side-previous"],[1,"side-next"]]){
      const other=ranked[(index+offset+ranked.length)%ranked.length];
      if(other.job===selected.job)continue;
      const side=node("button",undefined,"roster-side-hero "+cls);
      side.type="button";side.title="Selecionar "+other.name;
      side.setAttribute("aria-label","Selecionar "+other.name);
      side.append(rosterPortrait(other.job));
      side.onclick=()=>{selected=other;detail();updatePosition();};
      stage.append(side);
    }
  }
  const hero=node("div",undefined,"roster-center-hero");
  hero.append(rosterPortrait(selected.job));
  stage.append(hero);
  panel.append(stage);
  const info=node('div',undefined,'selected-hero-badge');
  info.append(node('small','PERSONAGEM SELECIONADO'),node('strong',selected.name),node('span',type.name+' · Nível '+selected.level));
  const favorite=node("button",isFavorite(selected.job)?"★ Personagem padrão":"☆ Definir como padrão","roster-favorite");
  favorite.type="button";
  favorite.title="Escolher qual personagem aparece primeiro nesta conta neste navegador";
  favorite.onclick=()=>{
    try{localStorage.setItem(favoriteKey(),String(selected.job));}catch{}
    detail();
  };
  info.append(favorite);
  panel.append(info);
  panel.append(node("span",type.tribe,"eyebrow"),
    node("h2",selected.name),
    node("p",descriptions[selected.job-1],"muted"));
  const dl=node("dl");
  for(const [label,value] of [
    ["Classe",type.name],["Nível",selected.level],
    ["Status",selected.online?"Em jogo":"Disponível"],["Conta",account.username]
  ]){
    const group=node("div");
    group.append(node("dt",label),node("dd",value));dl.append(group);
  }
  panel.append(dl);
  const play=node("button","Entrar no mundo","primary");
  play.id="play-character";
  play.onclick=()=>{play.disabled=true;location.assign("/jogar?classe="+selected.job);};
  const remove=node("button","Excluir personagem","quiet danger");
  remove.id="delete-character";
  remove.disabled=selected.online;
  remove.onclick=()=>{
    deleting={...selected};
    $("#delete-form").reset();$("#delete-form .status").textContent="";
    $("#delete-description").textContent=`Você está excluindo ${deleting.name}, ${type.name} nível ${deleting.level}. Esta ação não pode ser desfeita.`;
    $("#delete-dialog").showModal();
  };
  panel.append(play,remove);
  if(selected.online)panel.append(node("p",
    "Saia deste personagem antes de excluí-lo. Se fechou a aba do jogo, aguarde 12 segundos e atualize.","form-note"));
}
// Highest character level wins. Experience breaks ties without altering saves;
// the original order breaks any remaining ties predictably.
function favoriteKey(){return "vellum-roster-favorite:"+String(account?.username??"");}
function favoriteJob(){
  try{const value=Number(localStorage.getItem(favoriteKey()));return Number.isInteger(value)&&value>=1&&value<=11?value:null;}catch{return null;}
}
function isFavorite(job){return favoriteJob()===job;}
function rankedCharacters(){
  return [...(roster?.characters??[])].sort((a,b)=>
    (Number(b.level)||0)-(Number(a.level)||0) ||
    (Number(b.experience??b.exp)||0)-(Number(a.experience??a.exp)||0) ||
    a.job-b.job);
}
function updatePosition(){
  const label=$("#roster-position");
  if(!label)return;
  const ranked=rankedCharacters(),index=ranked.findIndex(c=>c.job===selected?.job);
  label.replaceChildren();
  label.append(node("span",String(Math.max(0,index)+1).padStart(2,"0")+" / "+String(ranked.length).padStart(2,"0"),"roster-position-count"),
    node("span",ranked.length>1?"Use as setas para escolher seu personagem":"Seu personagem está pronto","roster-position-hint"));
  for(const button of document.querySelectorAll(".roster-arrow"))button.disabled=ranked.length<2;
}
function moveSelection(step){
  const ranked=rankedCharacters();
  if(ranked.length<2)return;
  const index=ranked.findIndex(c=>c.job===selected?.job);
  selected=ranked[(Math.max(index,0)+step+ranked.length)%ranked.length];
  detail();
  updatePosition();
}
window.addEventListener("keydown",event=>{
  if(document.body.dataset.rosterReady!=="true"||!roster?.characters?.length)return;
  if(document.querySelector("dialog[open]")||event.altKey||event.ctrlKey||event.metaKey)return;
  const el=event.target;
  if(el?.matches?.("input,textarea,select,[contenteditable]"))return;
  if(event.key==="ArrowLeft"||event.key==="ArrowRight"){
    event.preventDefault();moveSelection(event.key==="ArrowRight"?1:-1);
  }
});
function render() {
  $("#entry").hidden = true;
  $("#roster").hidden = false;
  $("#account-nav").hidden = false;
  $("#account-name").textContent =
    (account.displayName ?? account.username) + (account.staff ? " · Staff" : "");
  $("#admin-panel").hidden = account.role !== "admin";
  $("#character-count").textContent =
    `${roster.characters.length} de ${roster.limit} personagens · Um de cada classe`;
  $("#new-character").disabled = roster.characters.length >= roster.limit;
  const list = $("#character-list");
  list.replaceChildren();
  if (!roster.characters.length) {
    const empty=node("div",undefined,"empty");
    empty.append(node("span","UMA HISTÓRIA AINDA POR ESCREVER","eyebrow"),
      node("h2","Sua aventura espera por você."),
      node("p","Crie seu primeiro personagem para começar.","muted"));
    list.append(empty);
  } else {
    const previous=node("button","‹","roster-arrow roster-arrow-prev");
    const next=node("button","›","roster-arrow roster-arrow-next");
    previous.type=next.type="button";
    previous.setAttribute("aria-label","Personagem anterior");
    next.setAttribute("aria-label","Próximo personagem");
    previous.title="Personagem anterior";
    next.title="Próximo personagem";
    previous.onclick=()=>moveSelection(-1);
    next.onclick=()=>moveSelection(1);
    const position=node("div",undefined,"roster-position");
    position.id="roster-position";
    position.setAttribute("aria-live","polite");
    list.append(previous,position,next);
    updatePosition();
  }
  detail();
  document.body.classList.toggle("roster-cinematic", roster.characters.length > 0);
  document.body.dataset.rosterReady = "true";
}
async function refresh(preferredJob = selected?.job) {
  roster = await api("/api/local/characters");
  selected =
    roster.characters.find((c) => c.job === preferredJob) ??
    roster.characters.find(c=>c.job===favoriteJob()) ??
    rankedCharacters()[0];
  render();
}
async function enterAccount() {
  account = await api("/api/local/me");
  if (
    location.pathname === "/painel" ||
    new URLSearchParams(location.search).get("next") === "painel"
  ) {
    location.replace("/painel");
    return;
  }
  // No skills API request or icon downloads are needed for portrait selection.
  await refresh();
  $("#login").reset();
}
async function submit(form, action) {
  if (form.dataset.busy === "true") return;
  form.dataset.busy = "true";
  const button = form.querySelector('[type="submit"]'),
    status = form.querySelector(".status");
  button.disabled = true;
  status.textContent = "Aguarde…";
  try {
    await action(Object.fromEntries(new FormData(form)));
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    form.dataset.busy = "false";
    button.disabled = false;
  }
}
async function finishMutation(dialog, job, message) {
  $(dialog).close();
  $("#roster-message").textContent = message;
  try {
    await refresh(job);
  } catch (error) {
    $("#roster-message").textContent =
      `${message} Não foi possível atualizar a lista: ${error.message} Use o botão Atualizar.`;
  }
}
$("#login").onsubmit = (event) => {
  event.preventDefault();
  submit(event.currentTarget, async (data) => {
    await api("/api/local/login", data);
    await enterAccount();
  });
};
$("#refresh").onclick = async () => {
  $("#refresh").disabled = true;
  try {
    await refresh();
    $("#roster-message").textContent = "Personagens atualizados.";
  } catch (error) {
    $("#roster-message").textContent = error.message;
  } finally {
    $("#refresh").disabled = false;
  }
};
$("#new-character").onclick = () => {
  const form = $("#create-form");
  form.reset();
  form.querySelector(".status").textContent = "";
  const select = form.elements.job;
  select.replaceChildren();
  for (const type of roster.classes.filter(
    (c) => !roster.characters.some((p) => p.job === c.job),
  )) {
    const option = node("option", type.name);
    option.value = type.job;
    select.append(option);
  }
  const name = form.elements.name;
  name.readOnly = false;
  name.value = "";
  select.onchange = () => {
    $("#class-description").textContent = descriptions[Number(select.value) - 1];
  };
  select.onchange();
  $("#create-dialog").showModal();
};
$("#create-form").onsubmit = (event) => {
  event.preventDefault();
  submit(event.currentTarget, async (data) => {
    await api("/api/local/characters", {
      action: "create",
      job: Number(data.job),
      name: data.name,
    });
    await finishMutation(
      "#create-dialog",
      Number(data.job),
      "Personagem criado. Sua jornada começa no nível 1.",
    );
  });
};
$("#delete-form").onsubmit = (event) => {
  event.preventDefault();
  submit(event.currentTarget, async (data) => {
    const target = { ...deleting };
    await api("/api/local/characters", {
      action: "delete",
      job: target.job,
      generation: target.generation,
      ...data,
    });
    try {
      const prefix = `pweb-local-${account.username}-character-v4-${target.job}-`;
      for (const key of Object.keys(localStorage))
        if (key.startsWith(prefix)) localStorage.removeItem(key);
    } catch {
      /* Server deletion is authoritative even without local storage. */
    }
    $("#delete-form").reset();
    await finishMutation(
      "#delete-dialog",
      undefined,
      "Personagem excluído. Recursos compartilhados da conta foram preservados.",
    );
  });
};
for (const button of document.querySelectorAll("[data-close]"))
  button.onclick = () => {
    const dialog = button.closest("dialog");
    if (dialog.querySelector("form").dataset.busy !== "true") dialog.close();
  };
for (const dialog of document.querySelectorAll("dialog"))
  dialog.addEventListener("cancel", (event) => {
    if (dialog.querySelector("form").dataset.busy === "true") event.preventDefault();
  });
$("#logout").onclick = async () => {
  try {
    await api("/api/local/logout", {});
    // Keep the mount prefix and display the login form without a hard reload.
    account = null;
    roster = null;
    selected = null;
    document.body.dataset.rosterReady = "false";
    document.body.classList.remove("roster-cinematic");
    clearPreviewCache();
    $("#login").reset();
    $("#entry").hidden = false;
    $("#roster").hidden = true;
    $("#account-nav").hidden = true;
    $("#message").textContent = "Sessao encerrada. Entre com outra conta.";
  } catch (error) {
    $("#roster-message").textContent = error.message;
  }
};
enterAccount().catch((error) => {
  if (error.status !== 401) $("#message").textContent = error.message;
});
