const $ = (selector) => document.querySelector(selector);
let account, roster, selected, deleting;
const skills = new Map();
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
function detail() {
  const panel = $("#character-detail");
  panel.replaceChildren();
  if (!selected) {
    panel.append(
      node("span", "SEU PRÓXIMO CAPÍTULO", "eyebrow"),
      node("h2", "Encontre seu herói."),
      node(
        "p",
        "Crie um personagem para começar. Seu progresso será salvo separadamente para cada classe.",
        "muted",
      ),
    );
    return;
  }
  const type = roster.classes.find((c) => c.job === selected.job);
  panel.append(
    icon(selected.job),
    node("span", type.tribe, "eyebrow"),
    node("h2", selected.name),
    node("p", descriptions[selected.job - 1], "muted"),
  );
  const dl = node("dl");
  for (const [label, value] of [
    ["Classe", type.name],
    ["Nível", selected.level],
    ["Status", selected.online ? "Em jogo" : "Disponível"],
    ["Conta", account.username],
  ]) {
    const group = node("div");
    group.append(node("dt", label), node("dd", value));
    dl.append(group);
  }
  panel.append(dl);
  const play = node("button", "Entrar no mundo", "primary");
  play.id = "play-character";
  play.onclick = () => {
    play.disabled = true;
    location.assign("/jogar?classe=" + selected.job);
  };
  const remove = node("button", "Excluir personagem", "quiet danger");
  remove.id = "delete-character";
  remove.disabled = selected.online;
  remove.onclick = () => {
    deleting = { ...selected };
    $("#delete-form").reset();
    $("#delete-form .status").textContent = "";
    $("#delete-description").textContent =
      `Você está excluindo ${deleting.name}, ${type.name} nível ${deleting.level}. Esta ação não pode ser desfeita.`;
    $("#delete-dialog").showModal();
  };
  panel.append(play, remove);
  if (selected.online)
    panel.append(
      node(
        "p",
        "Saia deste personagem antes de excluí-lo. Se fechou a aba do jogo, aguarde 12 segundos e atualize.",
        "form-note",
      ),
    );
}
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
    const empty = node("div", undefined, "empty");
    empty.append(
      node("span", "UMA HISTÓRIA AINDA POR ESCREVER", "eyebrow"),
      node("h2", "Sua aventura espera por você."),
      node("p", "Escolha uma das 11 classes e crie seu primeiro personagem."),
    );
    list.append(empty);
  }
  for (const character of roster.characters) {
    const type = roster.classes.find((c) => c.job === character.job);
    const card = node("button", undefined, "character-card");
    card.dataset.job = character.job;
    card.setAttribute("aria-pressed", String(selected?.job === character.job));
    card.append(
      icon(character.job),
      node("small", type.tribe.toUpperCase()),
      node("strong", character.name),
      node("span", `${type.name} · Nível ${character.level}`),
    );
    if (character.online) card.append(node("span", "● Em jogo", "online"));
    card.onclick = () => {
      selected = character;
      render();
    };
    list.append(card);
  }
  detail();
  document.body.dataset.rosterReady = "true";
}
async function refresh(preferredJob = selected?.job) {
  roster = await api("/api/local/characters");
  selected =
    roster.characters.find((c) => c.job === preferredJob) ??
    roster.characters.find((c) => c.job === account.preferredClass) ??
    roster.characters[0];
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
  try {
    const catalog = await api("/api/local/skills");
    for (const skill of catalog.skills)
      if (!skills.has(skill.job) && skill.classicIcon) skills.set(skill.job, skill.classicIcon);
  } catch {
    /* The roster remains usable if decorative icons are unavailable. */
  }
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
  name.readOnly = !!account.displayName;
  name.value = account.displayName ?? "";
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
    location.replace("/");
  } catch (error) {
    $("#roster-message").textContent = error.message;
  }
};
enterAccount().catch((error) => {
  if (error.status !== 401) $("#message").textContent = error.message;
});
