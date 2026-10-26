import {mountBossAdmin} from "/boss-admin.mjs";
export function mountGameControls({ api, toast }) {
  const $ = (s) => document.querySelector(s),
    panel = (name) => $(`[data-panel="${name}"]`);
  let rules = null,
    defaults = null,
    skins = [],
    library = [],
    historyCursor = null,
    securityCursor = null;
  const fields = ["plus1", "plus2", "minus1", "minus2", "destroy", "kept"];
  const node = (tag, text) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const numeric = (name, label, min = 0, max = 100, value = "") =>
    `<label>${label}<input name="${name}" type="number" min="${min}" max="${max}" step="0.01" value="${value}" required></label>`;
  panel("aging").innerHTML =
    `<article class="card"><h2>Chances reais de Aging</h2><p>O servidor sorteia o resultado com a tabela salva aqui. Sucesso é a soma de +1 e +2. Cada linha deve somar 100%. Pedras especiais de proteção continuam indisponíveis.</p><div class="toolbar"><button id="aging-defaults" class="secondary" type="button">Carregar padrão do cliente</button><button id="aging-guaranteed" class="secondary" type="button">Preencher +1 com 100%</button></div><form id="aging-form"><div class="table-wrap"><table><thead><tr><th>Etapa</th><th>+1 %</th><th>+2 %</th><th>−1 %</th><th>−2 %</th><th>Quebra %</th><th>Mantém %</th><th>Sucesso / soma</th></tr></thead><tbody id="aging-rows"></tbody></table></div><p class="form-error" role="alert"></p><button class="primary" type="submit">Salvar chances de Aging</button></form><p class="muted">Preencher não salva automaticamente. Alterações salvas valem no próximo sorteio; a janela do jogo consulta a tabela a cada 5 segundos.</p></article>`;
  panel("drops").innerHTML =
    `<article class="card"><h2>Probabilidade por monstro derrotado</h2><p>Uma chance de 100% garante o sorteio quando há itens elegíveis para o nível e mapa do monstro. Os Bosses usam a roleta compartilhada configurada abaixo.</p><form id="drops-form"><div class="control-grid">${numeric("goldChance", "Chance de ouro %")}${numeric("goldMultiplier", "Multiplicador da quantidade de ouro", 0, 100)}${numeric("equipmentChance", "Equipamentos abaixo do nível 80 %")}${numeric("highLevelChance", "Equipamentos nível 80 ou superior %")}${numeric("potionChance", "Poções %")}${numeric("bossChance", "Itens exclusivos de boss — chance geral %")}</div><details><summary>Chance por boss (opcional)</summary><p class="muted">Deixe vazio para usar a chance geral.</p><div id="boss-overrides" class="control-grid"></div></details><p class="muted">Ouro recebido automaticamente; quantidade base = nível do monstro × 3. Poções, equipamentos comuns e exclusivos são sorteios separados. Terceiro Olho permite uma tentativa comum adicional, sem duplicar o exclusivo do boss.</p><p class="form-error" role="alert"></p><button class="primary" type="submit">Salvar regras de drops</button></form></article>`;
  const filters = (kind) =>
    `<form id="${kind}-filter" class="toolbar"><label>Conta<input name="username" placeholder="ID de login"></label>${kind === "loot" ? '<label class="search">Códigos dos itens<input name="codes" list="control-item-list" placeholder="OR205, OA130 ou GOLD"></label><label>Nível mínimo do item<input name="minLevel" type="number" min="0" max="200" value="0"></label><label>Nível máximo do item<input name="maxLevel" type="number" min="0" max="200" value="200"></label><label>Situação<select name="status"><option value="">Todas</option><option value="generated">Gerado no chão</option><option value="collected">Recolhido / ouro recebido</option><option value="expired">Expirado</option></select></label>' : '<label>Área<select name="kind"><option value="security">Segurança e alertas</option><option value="craft">Aging</option><option value="shop">Skins e compras</option><option value="kill">Relatos de abate</option></select></label><label>Gravidade<select name="severity"><option value="">Todas</option><option value="warning">Atenção</option><option value="info">Informação</option></select></label><label>Ação<input name="action" placeholder="auth., gm., request., state."></label>'}<label>Origem<select name="trust"><option value="">Todas</option><option value="client-kill/server-roll">Jogador / sorteio no servidor</option><option value="staff-test">Teste de Staff</option><option value="server">Servidor</option><option value="heuristic">Indício para revisão</option><option value="client-report">Relato do navegador</option></select></label><label>Início<input name="since" type="datetime-local"></label><label>Fim<input name="until" type="datetime-local"></label><button type="submit" class="primary">Filtrar</button></form>`;
  panel("drop-history").innerHTML =
    `<article class="card"><h2>Monitorar volume de drops</h2><form id="monitor-form"><div class="control-grid">${numeric("minLevel", "Nível mínimo do item", 0, 200)}${numeric("maxLevel", "Nível máximo do item", 0, 200)}${numeric("windowMinutes", "Janela em minutos", 1, 1440)}${numeric("threshold", "Gerar alerta a partir de quantos registros", 1, 10000)}<label>Códigos específicos (opcional)<input name="codes" list="control-item-list" placeholder="OR205, OA130"></label></div><p class="muted">Filtros de nível e código são combinados. Vazio acompanha todos os itens do intervalo. Testes de Staff são excluídos dos alertas. Volume alto gera um aviso para revisão, sem banimento automático.</p><p class="form-error" role="alert"></p><button type="submit" class="primary">Salvar monitoramento</button></form></article><article class="card"><h2>Histórico central de drops</h2>${filters("loot")}<p class="muted">Sorteio feito no servidor; abate informado pelo cliente. “Recolhido” indica confirmação de recolhimento do navegador. Gerado no chão não significa que o jogador recebeu o item. O inventário comum ainda não tem autoridade completa no servidor.</p><p id="loot-total" role="status"></p><div id="loot-summary" class="control-summary"></div><div class="table-wrap"><table><thead><tr><th>Data</th><th>Conta / personagem</th><th>Item / quantidade</th><th>Monstro / mapa</th><th>Situação</th><th>Origem</th></tr></thead><tbody id="loot-rows"></tbody></table></div><button id="loot-more" class="secondary" hidden>Carregar registros anteriores</button></article><datalist id="control-item-list"></datalist>`;
  panel("security").innerHTML =
    `<article class="card"><h2>Logs de segurança e operação</h2><p>Falhas de login, pedidos GM, requisições recusadas, inventários com sinais anormais, volume de drops e erros reportados pelo navegador. Indícios e relatos do cliente não comprovam invasão.</p>${filters("security")}<p id="security-total" role="status"></p><div class="table-wrap"><table><thead><tr><th>Data</th><th>Conta</th><th>Ação</th><th>Gravidade</th><th>Origem / detalhes</th></tr></thead><tbody id="security-rows"></tbody></table></div><button id="security-more" class="secondary" hidden>Carregar registros anteriores</button></article>`;
  panel("skins").innerHTML =
    `<article class="card"><h2>Modelos cosméticos do cliente</h2><p>O motor possui skins de armas, escudos e armaduras/robes. Publique modelos, altere preços e pause a venda. Aparência não concede atributos. Nenhum modelo é publicado automaticamente nesta atualização.</p><div class="toolbar"><label class="search">Buscar modelo<input id="skin-search" type="search" placeholder="Nome ou código"></label><label>Categoria<select id="skin-cat"><option value="">Todas</option><option value="arma">Armas</option><option value="escudo">Escudos</option><option value="traje">Armaduras / robes</option></select></label><label>Situação<select id="skin-state"><option value="">Todas</option><option value="on">Publicadas</option><option value="off">Fora da loja</option></select></label></div><p id="skins-count"></p><div class="table-wrap"><table><thead><tr><th>Modelo</th><th>Categoria</th><th>Preço</th><th>Venda</th><th>Ações</th></tr></thead><tbody id="skin-rows"></tbody></table></div></article><dialog id="skin-editor"><form id="skin-form"><div class="dialog-heading"><h2>Editar skin</h2><button type="button" id="skin-close" aria-label="Fechar edição da skin">×</button></div><input name="id" type="hidden"><input name="version" type="hidden"><p id="skin-model"></p><label>Nome<input name="name" maxlength="100" required></label>${numeric("price", "Preço em coins", 0, 1000000000)}<label>Descrição<textarea name="description" maxlength="1000"></textarea></label><label class="check"><input name="enabled" type="checkbox"> Publicar na loja de Skins</label><p class="muted">Pausar não remove skins já adquiridas. No jogo, abra o botão Skins.</p><p class="form-error" role="alert"></p><div class="dialog-footer"><button class="primary" type="submit">Salvar skin</button></div></form></dialog>`;
  mountBossAdmin({api,toast,panel:panel("drops")});
  $("#drops-form input[name=bossChance]").closest("label").hidden=true;
  $("#boss-overrides").closest("details").hidden=true;
  for (const input of $("#monitor-form").querySelectorAll("input[type=number]")) input.step = "1";
  $("#skin-form input[name=price]").step = "1";
  for (const [kind, name] of [
    ["loot", "drop-history"],
    ["security", "security"],
  ]) {
    const label = node("label"),
      check = node("input");
    label.className = "check";
    check.type = "checkbox";
    check.checked = true;
    label.append(
      check,
      document.createTextNode("Atualizar registros automaticamente a cada 10 segundos"),
    );
    $(`#${kind}-filter`).after(label);
    const timer = setInterval(() => {
      if (
        !document.hidden &&
        !panel(name).hidden &&
        check.checked &&
        $(`#${kind}-rows`).children.length <= 100 &&
        !panel(name).querySelector("details[open]") &&
        !$(`#${kind}-filter`).querySelector("input:focus,select:focus,textarea:focus")
      )
        loadHistory(kind);
    }, 10000);
    addEventListener("pagehide", () => clearInterval(timer), { once: true });
  }
  const actionNames = {
    "auth.login": "Login efetuado",
    "auth.login-failed": "Falha no login",
    "gm.request": "Comando GM solicitado",
    "gm.denied": "Comando GM negado",
    "admin.denied": "Acesso ao painel negado",
    "request.rejected": "Requisição recusada",
    "state.rejected": "Save recusado",
    "state.anomaly": "Alteração fora do padrão",
    "monitor.drop-volume": "Volume acima do limite",
    "client.report": "Erro informado pelo navegador",
  };
  const date = (v) => new Date(v * 1000).toLocaleString("pt-BR");
  const formValues = (form) => Object.fromEntries(new FormData(form));
  function field(form, name) {
    return form.elements.namedItem(name);
  }
  function renderAging(value = rules.aging) {
    $("#aging-rows").replaceChildren(
      ...value.map((row, age) => {
        const tr = node("tr");
        tr.dataset.age = age;
        tr.append(node("td", `+${age} → +${age + 1}`));
        for (const k of fields) {
          const td = node("td"),
            i = node("input");
          i.type = "number";
          i.min = 0;
          i.max = 100;
          i.step = ".01";
          i.required = true;
          i.name = `${age}-${k}`;
          i.value = row[k];
          i.setAttribute("aria-label", `Aging ${age} ${k}`);
          td.append(i);
          tr.append(td);
        }
        tr.append(node("td"));
        tr.oninput = () => updateAgingRow(tr);
        updateAgingRow(tr);
        return tr;
      }),
    );
  }
  function updateAgingRow(tr) {
    const values = fields.map((k) =>
      Number(tr.querySelector(`[name="${tr.dataset.age}-${k}"]`).value),
    );
    const sum = values.reduce((n, v) => n + v, 0);
    tr.lastElementChild.textContent = `${+(values[0] + values[1]).toFixed(2)}% / ${+sum.toFixed(2)}%`;
    tr.classList.toggle("invalid-row", Math.abs(sum - 100) > 0.00001);
  }
  async function submit(form, fn, message) {
    const b = form.querySelector("[type=submit]");
    b.disabled = true;
    form.querySelector(".form-error").textContent = "";
    try {
      await fn();
      toast(message);
      await refresh();
    } catch (e) {
      form.querySelector(".form-error").textContent = e.message;
    } finally {
      b.disabled = false;
    }
  }
  async function saveRules(section, value) {
    const result = await api("/api/local/admin/rules-save", {
      section,
      value,
      version: rules.version,
    });
    rules = result.rules;
  }
  $("#aging-defaults").onclick = () => renderAging(defaults.aging);
  $("#aging-guaranteed").onclick = () =>
    renderAging(
      rules.aging.map(() => ({ plus1: 100, plus2: 0, minus1: 0, minus2: 0, destroy: 0, kept: 0 })),
    );
  $("#aging-form").onsubmit = (e) => {
    e.preventDefault();
    submit(
      e.currentTarget,
      () =>
        saveRules(
          "aging",
          Array.from({ length: 20 }, (_, age) =>
            Object.fromEntries(
              fields.map((k) => [k, Number(field(e.currentTarget, `${age}-${k}`).value)]),
            ),
          ),
        ),
      "Chances de Aging salvas e ativas.",
    );
  };
  $("#drops-form").onsubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      value = {};
    for (const k of Object.keys(defaults.drops))
      if (k !== "bossOverrides") value[k] = Number(field(form, k).value);
    value.bossOverrides = {};
    for (const i of $("#boss-overrides").querySelectorAll("input"))
      if (i.value !== "") value.bossOverrides[i.dataset.boss] = Number(i.value);
    submit(form, () => saveRules("drops", value), "Regras de drops salvas e ativas.");
  };
  $("#monitor-form").onsubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      v = formValues(form);
    for (const k of ["minLevel", "maxLevel", "windowMinutes", "threshold"]) v[k] = Number(v[k]);
    v.codes = v.codes
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map((s) => s.toUpperCase());
    submit(form, () => saveRules("monitor", v), "Monitoramento atualizado.");
  };
  function queryFor(kind, cursor) {
    const form = $(`#${kind}-filter`),
      q = new URLSearchParams({ kind: kind === "loot" ? "drop" : "security" });
    for (const [key, value] of Object.entries(formValues(form)))
      if (value) {
        q.set(key, ["since", "until"].includes(key) ? new Date(value).getTime() / 1000 : value);
      }
    if (cursor) q.set("before", cursor);
    return q;
  }
  function trust(value) {
    return (
      {
        "client-kill/server-roll": "Abate do cliente / sorteio do servidor",
        "staff-test": "Teste de Staff",
        server: "Servidor",
        heuristic: "Indício para revisão",
        "client-report": "Relato do navegador",
      }[value] ?? value
    );
  }
  function appendCells(tr, values) {
    for (const v of values) tr.append(node("td", v));
  }
  async function loadHistory(kind, append = false) {
    try {
      const result = await api(
        "/api/local/admin/game-history?" +
          queryFor(kind, append ? (kind === "loot" ? historyCursor : securityCursor) : null),
      );
      const body = $(`#${kind}-rows`);
      if (!append) body.replaceChildren();
      for (const r of result.rows) {
        const tr = node("tr");
        tr.dataset.eventId = r.id;
        if (kind === "loot")
          appendCells(tr, [
            date(r.created),
            `${r.username} / ${r.character ?? "—"}`,
            `${r.item_name} (${r.code}) × ${r.quantity} · nv ${r.item_level}`,
            `${r.monster} / ${r.map}`,
            r.status === "generated"
              ? "Gerado no chão"
              : r.status === "expired"
                ? "Expirado"
                : r.code === "GOLD"
                  ? "Ouro recebido"
                  : "Recolhido (cliente)",
            trust(r.trust),
          ]);
        else {
          appendCells(tr, [
            date(r.created),
            r.username,
            actionNames[r.action] ? `${actionNames[r.action]} (${r.action})` : r.action,
            r.severity === "warning" ? "Atenção" : "Informação",
          ]);
          const td = node("td"),
            d = node("details"),
            s = node("summary", trust(r.trust)),
            pre = node("pre", JSON.stringify(r.detail, null, 2));
          d.append(s, pre);
          td.append(d);
          tr.append(td);
        }
        body.append(tr);
      }
      if (!body.children.length) {
        const tr = node("tr"),
          td = node("td", "Nenhum registro encontrado neste filtro.");
        td.colSpan = 6;
        tr.append(td);
        body.append(tr);
      }
      $(`#${kind}-total`).textContent =
        `${result.total} registros no filtro · exibindo até 100 por página`;
      if (kind === "loot") {
        historyCursor = result.next;
        $("#loot-summary").replaceChildren(
          ...result.summary.map((r) => node("span", `${r.username}: ${r.drops} registros`)),
        );
      } else securityCursor = result.next;
      $(`#${kind}-more`).hidden = !result.next;
    } catch (e) {
      $(`#${kind}-total`).textContent = e.message;
    }
  }
  for (const kind of ["loot", "security"]) {
    $(`#${kind}-filter`).onsubmit = (e) => {
      e.preventDefault();
      loadHistory(kind);
    };
    $(`#${kind}-more`).onclick = () => loadHistory(kind, true);
  }
  function renderSkins() {
    const text = $("#skin-search").value.toLowerCase(),
      cat = $("#skin-cat").value,
      status = $("#skin-state").value;
    const filtered = skins.filter(
      (s) =>
        (!text || `${s.name} ${s.look}`.toLowerCase().includes(text)) &&
        (!cat || cat === s.cat) &&
        (!status || s.enabled === (status === "on")),
    );
    $("#skins-count").textContent =
      `${filtered.length} modelos encontrados · até 100 exibidos. Use a busca para localizar outros.`;
    $("#skin-rows").replaceChildren(
      ...filtered.slice(0, 100).map((s) => {
        const tr = node("tr"),
          td = node("td"),
          img = node("img");
        img.src = "/assets/" + s.image;
        img.alt = "";
        img.loading = "lazy";
        img.className = "skin-thumb";
        td.append(img, node("span", `${s.name} · ${s.look}`));
        tr.append(td);
        appendCells(tr, [
          { arma: "Arma", escudo: "Escudo", traje: "Armadura/robe" }[s.cat],
          `${s.price} coins`,
          s.enabled ? "Publicada" : "Fora da loja",
        ]);
        const action = node("td"),
          b = node("button", "Gerenciar");
        b.className = "secondary";
        b.onclick = () => editSkin(s);
        action.append(b);
        tr.append(action);
        return tr;
      }),
    );
  }
  for (const id of ["skin-search", "skin-cat", "skin-state"]) $("#" + id).oninput = renderSkins;
  function editSkin(s) {
    const f = $("#skin-form");
    for (const key of ["id", "version", "name", "price", "description"])
      field(f, key).value = s[key] ?? "";
    field(f, "enabled").checked = s.enabled;
    $("#skin-model").textContent = `Modelo ${s.look} · ${s.cat}`;
    f.querySelector(".form-error").textContent = "";
    $("#skin-editor").showModal();
  }
  $("#skin-close").onclick = () => $("#skin-editor").close();
  $("#skin-form").onsubmit = (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      v = formValues(f);
    v.version = Number(v.version);
    v.price = Number(v.price);
    v.enabled = field(f, "enabled").checked;
    submit(
      f,
      async () => {
        await api("/api/local/admin/skin-save", v);
        $("#skin-editor").close();
      },
      "Oferta de skin salva.",
    );
  };
  async function refresh() {
    const next = await Promise.all([
      api("/api/local/admin/rules"),
      api("/api/local/admin/rule-defaults"),
      api("/api/local/admin/skins"),
    ]);
    [rules, defaults, skins] = next;
    renderAging();
    for (const [key, value] of Object.entries(rules.drops))
      if (key !== "bossOverrides") field($("#drops-form"), key).value = value;
    const bossNames = defaults.bossNames;
    $("#boss-overrides").replaceChildren(
      ...bossNames.map((name) => {
        const label = node("label", name),
          i = node("input");
        i.type = "number";
        i.min = 0;
        i.max = 100;
        i.step = ".01";
        i.dataset.boss = name;
        i.value = rules.drops.bossOverrides[name] ?? "";
        i.placeholder = `Geral: ${rules.drops.bossChance}%`;
        label.append(i);
        return label;
      }),
    );
    for (const [key, value] of Object.entries(rules.monitor))
      field($("#monitor-form"), key).value = Array.isArray(value) ? value.join(", ") : value;
    if (!library.length) {
      library = await api("/api/local/admin/item-library");
      $("#control-item-list").replaceChildren(
        ...library.map((i) => {
          const o = node("option");
          o.value = i.code;
          o.label = `${i.name} · nível ${i.level}`;
          return o;
        }),
      );
    }
    renderSkins();
    await Promise.all([loadHistory("loot"), loadHistory("security")]);
  }
  return { refresh };
}


