import { mountGameControls } from "/dashboard-game.mjs";
const $ = (s) => document.querySelector(s);
const requestId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
const state = { products: [], users: [], library: [], audit: [], me: null, tab: "overview" };
const number = new Intl.NumberFormat("pt-BR");
const roles = { player: "Jogador", gm: "GM", admin: "ADM" };
const categories = { premium: "Premiums", costume: "Trajes", items: "Itens" };
const titles = {
  overview: ["Visão geral", "Acompanhe sua comunidade e prepare a loja."],
  products: ["Loja do jogo", "Escolha o que os jogadores encontram no Item Shop."],
  users: ["Usuários", "Contas, personagens e permissões em um só lugar."],
  aging: ["Aging", "Chances por etapa, com sorteio no servidor."],
  events: ["Eventos", "Agende XP, drops, Sheltoms e benefícios de Aging."],
  skills: ["Habilidades", "Configure delays e durações das 176 skills por nível, com salvamento e restauração."],
  drops: ["Drops", "Ouro, equipamentos e itens exclusivos de boss."],
  "drop-history": ["Histórico de drops", "Filtre por conta, item, nível e período."],
  security: ["Logs e alertas", "Revise sinais de abuso, falhas e operações importantes."],
  skins: ["Loja de Skins", "Publique visuais de armas, escudos e armaduras."],
  audit: ["Histórico de ações", "Acompanhe as alterações administrativas do servidor."],
  settings: ["Acesso e servidor", "Link do jogo, versão e acesso da sua conta."],
};
let gameControls;
let coinRequestId = requestId(),
  toastTimer,
  busy = false,
  confirmAction = null;
function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function toast(text) {
  const box = $("#toast");
  box.textContent = text;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (box.hidden = true), 4500);
}
async function api(path, data) {
  const r = await fetch(path, {
    cache: "no-store",
    ...(data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
  });
  if (r.status === 401) {
    location.replace("/?next=painel");
    throw Error("Entre novamente com sua conta ADM.");
  }
  const result = await r.json();
  if (!r.ok) {
    const error = Error(result.error ?? "Não foi possível concluir a ação.");
    error.status = r.status;
    throw error;
  }
  return result;
}
function tab(name) {
  if (!titles[name]) return;
  state.tab = name;
  location.hash = name;
  for (const b of document.querySelectorAll("[data-tab]"))
    b.setAttribute("aria-selected", String(b.dataset.tab === name));
  for (const p of document.querySelectorAll("[data-panel]")) p.hidden = p.dataset.panel !== name;
  $("#page-title").textContent = titles[name][0];
  $("#page-description").textContent = titles[name][1];
}
for (const b of document.querySelectorAll("[data-tab], [data-go]"))
  b.onclick = () => tab(b.dataset.tab ?? b.dataset.go);
for (const b of document.querySelectorAll("[data-close]"))
  b.onclick = () => b.closest("dialog").close();
function badge(text, style = "") {
  return el("span", text, "badge " + style);
}
function action(text, fn, style = "secondary") {
  const b = el("button", text, style);
  b.type = "button";
  b.onclick = fn;
  return b;
}
function cell(row, text) {
  const td = el("td");
  if (text instanceof Node) td.append(text);
  else td.textContent = text;
  row.append(td);
  return td;
}
function renderProducts() {
  const search = norm($("#product-search").value),
    category = $("#product-category").value,
    status = $("#product-state").value;
  const rows = state.products.filter(
    (p) =>
      (!search || norm(p.name + " " + p.code).includes(search)) &&
      (!category || (p.category ?? "premium") === category) &&
      (status === "all" ||
        (status === "archived"
          ? p.archived
          : !p.archived &&
            (status === "active" || (status === "visible" ? p.enabled : !p.enabled)))),
  );
  $("#products-body").replaceChildren(
    ...rows.map((p) => {
      const tr = el("tr");
      tr.dataset.code = p.code;
      const info = el("div", undefined, "product-cell"),
        img = el("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = "/assets/" + (p.definition?.image ?? p.icon);
      img.onerror = () => (img.hidden = true);
      const caption = el("div", p.name);
      caption.append(
        el(
          "small",
          p.code + (p.hours ? ` · ${p.hours}h` : p.permanent ? " · Permanente" : " · Consumível"),
        ),
      );
      info.append(img, caption);
      cell(tr, info);
      cell(tr, categories[p.category ?? "premium"]);
      cell(tr, number.format(p.price) + " coins");
      cell(
        tr,
        badge(
          p.archived ? "Removido" : p.enabled ? "Publicado" : "Pausado",
          p.archived ? "blocked" : p.enabled ? "" : "paused",
        ),
      );
      const buttons = el("div", undefined, "row-actions");
      buttons.append(action(p.archived ? "Restaurar" : "Editar", () => openProduct(p)));
      if (!p.archived)
        buttons.append(
          action(p.enabled ? "Pausar" : "Publicar", () =>
            confirmMutation(
              p.enabled ? "Pausar produto?" : "Publicar produto?",
              `${p.name} · ${p.code}`,
              null,
              () => api("/api/local/admin/product-save", { ...p, enabled: !p.enabled }),
            ),
          ),
          action(
            "Remover",
            () =>
              confirmMutation(
                "Remover oferta?",
                `${p.name} sairá da loja. Quem já comprou continuará com o item.`,
                null,
                () => api("/api/local/admin/product-remove", { code: p.code, version: p.version }),
              ),
            "danger",
          ),
        );
      cell(tr, buttons);
      return tr;
    }),
  );
  $("#products-empty").hidden = rows.length > 0;
}
function characterText(u) {
  return u.characters.map((c) => `${c.name} · classe ${c.job} · nv. ${c.level}`).join(" / ");
}
function renderUsers() {
  const search = norm($("#user-search").value),
    role = $("#user-role").value;
  const rows = state.users.filter(
    (u) =>
      (!search || norm(u.username + " " + characterText(u)).includes(search)) &&
      (!role || u.role === role),
  );
  $("#users-body").replaceChildren(
    ...rows.map((u) => {
      const tr = el("tr");
      tr.dataset.username = u.username;
      const info = el("div", u.username);
      info.append(el("small", characterText(u) || "Ainda sem personagens salvos"));
      cell(tr, info);
      cell(tr, badge(roles[u.role], u.role === "player" ? "paused" : ""));
      cell(tr, badge(u.blocked ? "Bloqueado" : "Liberado", u.blocked ? "blocked" : ""));
      cell(tr, number.format(u.coins));
      cell(tr, String(u.sessions));
      const buttons = el("div", undefined, "row-actions");
      buttons.append(
        action("Editar", () => openUser(u)),
        action("Coins", () => openCoins(u)),
        action("Desconectar", () =>
          confirmMutation(
            "Encerrar sessões?",
            `Todos os acessos de ${u.username} precisarão entrar novamente.`,
            null,
            () =>
              api("/api/local/admin/user-save", {
                username: u.username,
                operation: "disconnect",
                version: u.version,
              }),
          ),
        ),
      );
      if (u.username !== state.me?.username)
        buttons.append(
          action(
            "Remover",
            () =>
              confirmMutation(
                "Remover usuário?",
                `A conta ${u.username}, seus personagens, coins e itens comprados serão excluídos. Esta ação não pode ser desfeita.`,
                u.username,
                () =>
                  api("/api/local/admin/user-save", {
                    username: u.username,
                    operation: "delete",
                    version: u.version,
                  }),
              ),
            "danger",
          ),
        );
      cell(tr, buttons);
      return tr;
    }),
  );
  $("#users-empty").hidden = rows.length > 0;
}
const auditNames = {
  "rules.aging": "Chances de Aging alteradas",
  "rules.drops": "Regras de drops alteradas",
  "rules.monitor": "Monitoramento alterado",
  "skin.save": "Oferta de skin alterada",
  "product.save": "Produto salvo",
  "product.remove": "Oferta removida",
  "user.create": "Conta criada",
  "user.edit": "Conta editada",
  "user.delete": "Conta removida",
  "user.disconnect": "Sessões encerradas",
  "coins.grant": "Coins adicionados",
};
function renderAudit() {
  $("#audit-body").replaceChildren(
    ...state.audit.map((a) => {
      const tr = el("tr");
      cell(tr, new Date(a.created * 1000).toLocaleString("pt-BR"));
      cell(tr, a.actor);
      cell(tr, auditNames[a.action] ?? a.action);
      cell(tr, a.target);
      const d = a.detail,
        parts = [];
      if (d.price !== undefined) parts.push(`Preço: ${d.oldPrice ?? "novo"} → ${d.price}`);
      if (d.enabled !== undefined) parts.push(d.enabled ? "Publicado" : "Pausado");
      if (d.role) parts.push(roles[d.role]);
      if (d.blocked !== undefined) parts.push(d.blocked ? "Bloqueado" : "Liberado");
      if (d.passwordReset) parts.push("Senha redefinida");
      if (d.amount !== undefined)
        parts.push(`+${number.format(d.amount)} coins · saldo ${number.format(d.balance)}`);
      if (d.before !== undefined) {
        const detail = el("details"),
          summary = el("summary", "Ver antes e depois"),
          pre = el("pre", JSON.stringify(d, null, 2));
        detail.append(summary, pre);
        cell(tr, detail);
      } else cell(tr, parts.join(" · ") || "—");
      return tr;
    }),
  );
  $("#audit-empty").hidden = state.audit.length > 0;
}
function renderSummary() {
  $("#stat-users").textContent = number.format(state.users.length);
  $("#stat-staff").textContent =
    `${state.users.filter((u) => u.role !== "player").length} contas da Staff`;
  $("#stat-products").textContent = number.format(
    state.products.filter((p) => p.enabled && !p.archived).length,
  );
  $("#stat-sessions").textContent = number.format(state.users.reduce((s, u) => s + u.sessions, 0));
  $("#stat-blocked").textContent = number.format(state.users.filter((u) => u.blocked).length);
  $("#product-count").textContent = state.products.filter((p) => !p.archived).length;
  $("#user-count").textContent = state.users.length;
}
function renderServer(data) {
  const candidate = data.link.url,
    valid =
      typeof candidate === "string" &&
      /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?\/?$/i.test(candidate) &&
      data.link.status !== "offline";
  $("#public-url").value = valid ? candidate : "";
  $("#copy-link").disabled = $("#open-link").disabled = !valid;
  $("#link-status").textContent = data.link.verified
    ? "Link verificado. Pronto para divulgar."
    : valid
      ? "Endereço criado; aguardando verificação de DNS."
      : "Sem túnel ativo. Abra INICIAR_INTERNET.bat.";
  $("#build").textContent =
    `${data.build.name} · versão ${data.build.version} · revisão ${data.build.revision}`;
  $("#footer-version").textContent = "· revisão " + data.build.version;
}
async function refreshAll() {
  if (busy) return;
  busy = true;
  $("#refresh").disabled = true;
  try {
    const [me, products, users, audit, status] = await Promise.all([
      api("/api/local/me"),
      api("/api/local/admin/products"),
      api("/api/local/admin/users"),
      api("/api/local/admin/audit"),
      api("/api/local/admin-status"),
    ]);
    Object.assign(state, { me, products, users, audit });
    $("#admin-name").textContent = `${me.displayName ?? me.username} · ADM`;
    if (!state.library.length) state.library = await api("/api/local/admin/library");
    renderSummary();
    renderProducts();
    renderUsers();
    renderAudit();
    renderServer(status);
    if (gameControls) await gameControls.refresh();
    document.body.dataset.adminReady = "true";
    $("#page-error").hidden = true;
  } catch (e) {
    $("#page-error").textContent = e.message;
    $("#page-error").hidden = false;
  } finally {
    busy = false;
    $("#refresh").disabled = false;
  }
}
for (const id of ["product-search", "product-category", "product-state"])
  $("#" + id).addEventListener("input", renderProducts);
for (const id of ["user-search", "user-role"]) $("#" + id).addEventListener("input", renderUsers);
$("#refresh").onclick = refreshAll;
$("#logout").onclick = async () => {
  await api("/api/local/logout", {});
  location.replace("/?next=painel");
};
const pf = $("#product-form"),
  field = (form, name) => form.elements.namedItem(name);
let editingProduct = false;
function fillProduct(p) {
  const current = state.products.find((x) => x.code === p.code),
    value = current ?? p;
  field(pf, "version").value = current?.version ?? "";
  field(pf, "name").value = value.name;
  field(pf, "price").value = value.price;
  field(pf, "enabled").checked = current?.archived ? true : (value.enabled ?? true);
  field(pf, "description").value = value.description ?? "";
  $("#product-kind").textContent =
    `${categories[p.category ?? "premium"]} · ${p.hours ? p.hours + " horas de efeito" : p.permanent ? "Permanente; uma aquisição por código e conta" : "Consumível"}. Item vinculado à conta.`;
}
function libraryOptions(selected) {
  const search = norm($("#library-search").value);
  const available = state.library.filter(
    (p) =>
      (editingProduct
        ? p.code === selected
        : !state.products.some((x) => x.code === p.code && !x.archived)) &&
      (!search || norm(p.name + " " + p.code).includes(search)),
  );
  field(pf, "code").replaceChildren(
    ...available.map((p) => {
      const o = el("option", `${p.name}${p.hours ? " · " + p.hours + "h" : ""} — ${p.code}`);
      o.value = p.code;
      return o;
    }),
  );
  if (available.some((p) => p.code === selected)) field(pf, "code").value = selected;
  const item = available.find((p) => p.code === field(pf, "code").value);
  if (item) fillProduct(item);
  else {
    field(pf, "name").value = "";
    $("#product-kind").textContent = "Nenhum item encontrado. Altere a busca.";
  }
}
function openProduct(p) {
  pf.reset();
  pf.querySelector(".form-error").textContent = "";
  editingProduct = !!p;
  $("#product-title").textContent = p
    ? p.archived
      ? "Restaurar produto"
      : "Editar produto"
    : "Adicionar produto";
  $("#library-search").closest("label").hidden = !!p;
  field(pf, "code").disabled = !!p;
  libraryOptions(p?.code);
  $("#product-dialog").showModal();
}
$("#new-product").onclick = () => openProduct();
$("#library-search").oninput = () => libraryOptions(field(pf, "code").value);
field(pf, "code").onchange = () => {
  const p = state.library.find((p) => p.code === field(pf, "code").value);
  if (p) fillProduct(p);
};
const uf = $("#user-form");
function openUser(u) {
  uf.reset();
  uf.querySelector(".form-error").textContent = "";
  $("#user-title").textContent = u ? "Editar usuário" : "Criar usuário";
  field(uf, "operation").value = u ? "edit" : "create";
  field(uf, "version").value = u?.version ?? "";
  field(uf, "username").value = u?.username ?? "";
  field(uf, "username").readOnly = !!u;
  field(uf, "role").value = u?.role ?? "player";
  field(uf, "blocked").checked = u?.blocked ?? false;
  $("#blocked-label").hidden = !u;
  field(uf, "password").required = !u;
  field(uf, "password").placeholder = u
    ? "Deixe em branco para manter a senha"
    : "Pelo menos 8 caracteres";
  $("#user-characters").textContent = u
    ? characterText(u)
    : "A conta começa sem personagens. ADM e GM entram automaticamente na Staff.";
  $("#user-dialog").showModal();
}
$("#new-user").onclick = () => openUser();
function openCoins(u) {
  coinRequestId = requestId();
  const f = $("#coins-form");
  f.reset();
  f.querySelector(".form-error").textContent = "";
  field(f, "username").value = u.username;
  $("#coins-dialog").showModal();
}
async function submit(form, fn, message) {
  const button = form.querySelector('[type="submit"]') ?? form.querySelector("button");
  button.disabled = true;
  const errorBox = form.querySelector(".form-error");
  if (errorBox) errorBox.textContent = "";
  try {
    await fn();
    form.closest("dialog")?.close();
    toast(message);
    await refreshAll();
  } catch (e) {
    if (errorBox)
      errorBox.textContent =
        e.message + (e.status === 409 ? " Feche e abra o formulário novamente." : "");
    else toast(e.message);
  } finally {
    button.disabled = false;
  }
}
pf.onsubmit = (e) => {
  e.preventDefault();
  submit(
    pf,
    () =>
      api("/api/local/admin/product-save", {
        code: field(pf, "code").value,
        version: field(pf, "version").value ? Number(field(pf, "version").value) : undefined,
        name: field(pf, "name").value,
        price: Number(field(pf, "price").value),
        description: field(pf, "description").value,
        enabled: field(pf, "enabled").checked,
      }),
    "Produto salvo. A loja do jogo será atualizada.",
  );
};
uf.onsubmit = (e) => {
  e.preventDefault();
  submit(
    uf,
    () =>
      api("/api/local/admin/user-save", {
        ...Object.fromEntries(new FormData(uf)),
        version: Number(field(uf, "version").value),
        blocked: field(uf, "blocked").checked,
      }),
    "Usuário salvo.",
  );
};
$("#coins-form").onsubmit = (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  submit(
    f,
    () =>
      api("/api/local/admin/coins", {
        username: field(f, "username").value,
        amount: Number(field(f, "amount").value),
        requestId: coinRequestId,
      }),
    "Coins adicionados.",
  );
};
function confirmMutation(title, description, expected, fn) {
  $("#confirm-title").textContent = title;
  $("#confirm-description").textContent = description;
  $("#confirm-label").hidden = !expected;
  $("#confirm-value").value = "";
  $("#confirm-form .form-error").textContent = "";
  confirmAction = { expected, fn };
  $("#confirm-dialog").showModal();
}
$("#confirm-dialog").onclose = () => (confirmAction = null);
$("#confirm-form").onsubmit = (e) => {
  e.preventDefault();
  if (!confirmAction) return;
  const { expected, fn } = confirmAction;
  if (expected && $("#confirm-value").value !== expected) {
    $("#confirm-form .form-error").textContent =
      "Digite exatamente o ID do usuário para confirmar.";
    return;
  }
  submit(e.currentTarget, fn, "Alteração aplicada.");
};
$("#copy-link").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("#public-url").value);
    toast("Link copiado.");
  } catch {
    $("#public-url").select();
    toast("Selecione e copie o endereço.");
  }
};
$("#open-link").onclick = () => {
  if ($("#public-url").value) window.open($("#public-url").value, "_blank", "noopener");
};
$("#change-password").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget,
    b = f.querySelector("button");
  b.disabled = true;
  try {
    await api("/api/local/password", Object.fromEntries(new FormData(f)));
    f.reset();
    $("#password-result").textContent = "Senha alterada. Outras sessões encerradas.";
  } catch (error) {
    $("#password-result").textContent = error.message;
  } finally {
    b.disabled = false;
  }
};
gameControls = mountGameControls({ api, toast });
tab(location.hash.slice(1) || "overview");
refreshAll();
setInterval(
  () =>
    api("/api/local/admin-status")
      .then(renderServer)
      .catch(() => {}),
  15000,
);

$("#coins-form input[name=amount]").oninput = () => {
  coinRequestId = requestId();
};
