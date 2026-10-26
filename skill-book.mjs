export function openSkillBook(ctx) {
  document.querySelector("#freeston-skills")?.dispatchEvent(new Event("dismiss"));
  const dialog = document.createElement("dialog");
  dialog.id = "freeston-skills";
  dialog.className = "ft-dialog";
  dialog.setAttribute("aria-labelledby", "ft-skills-title");
  const header = document.createElement("header"),
    title = document.createElement("h2"),
    intro = document.createElement("p"),
    close = document.createElement("button");
  title.id = "ft-skills-title";
  title.textContent = `Habilidades · ${ctx.snapshot().className}`;
  intro.textContent = ctx
    .snapshot()
    .skills.every((s) => ["classic-priston-client", "priston-br-upload"].includes(s.iconProvenance))
    ? "16 habilidades · Artes clássicas do cliente Priston Tale, recuperadas sem redesenho."
    : "16 habilidades · Artes oficiais desta classe ainda não recuperadas. Ilustrações FREEston provisórias.";
  close.textContent = "×";
  close.setAttribute("aria-label", "Fechar habilidades");
  close.className = "ft-close";
  const dismiss = () => {
    dialog.close();
    dialog.remove();
  };
  close.onclick = dismiss;
  dialog.addEventListener("dismiss", dismiss);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    dismiss();
  });
  dialog.addEventListener("close", () => dialog.remove());
  header.append(title, intro, close);
  const summary = document.createElement("p");
  summary.className = "ft-skill-summary";
  const message = document.createElement("p");
  message.className = "ft-message";
  message.setAttribute("role", "status");
  const grid = document.createElement("div");
  grid.className = "ft-skill-grid";
  const explain = (skill) => {
    if (skill.level >= skill.maxLevel) return "Nível máximo";
    if (ctx.stats.level < skill.reqLevel) return `Requer personagem nível ${skill.reqLevel}`;
    return `Aprender/evoluir: ${skill.price} ouro + 1 ponto. Procure o mestre na cidade.`;
  };
  const act = (fn) => {
    try {
      const text = fn();
      if (text) message.textContent = text;
      draw();
    } catch (e) {
      message.textContent = e.message;
    }
  };
  function draw() {
    const snapshot = ctx.snapshot();
    summary.textContent = `${snapshot.className} · Nível ${ctx.stats.level} · ${snapshot.skillPoints} pontos · ${snapshot.elitePoints} elite · ${ctx.stats.gold.toLocaleString("pt-BR")} ouro`;
    grid.replaceChildren();
    for (const skill of snapshot.skills) {
      const card = document.createElement("article");
      card.dataset.skillCode = skill.code;
      card.dataset.skillJob = snapshot.job;
      card.dataset.iconProvenance = skill.iconProvenance;
      const name = document.createElement("h3"),
        badge = document.createElement("span"),
        level = document.createElement("p"),
        cost = document.createElement("p"),
        reason = document.createElement("p"),
        actions = document.createElement("div");
      const icon = document.createElement("img");
      icon.src = "/assets/" + skill.icon;
      icon.alt = "";
      icon.width = ["classic-priston-client", "priston-br-upload"].includes(skill.iconProvenance)
        ? 49
        : 48;
      icon.height = ["classic-priston-client", "priston-br-upload"].includes(skill.iconProvenance)
        ? 46
        : 48;
      icon.title = ["classic-priston-client", "priston-br-upload"].includes(skill.iconProvenance)
        ? "Arte clássica do cliente Priston Tale"
        : "Ilustração provisória FREEston";
      badge.append(icon);
      badge.className = "ft-skill-badge";
      badge.append(document.createTextNode(` T${skill.tier} · ${skill.index + 1}`));
      name.textContent = skill.name;
      level.textContent = `${skill.passive ? "Passiva" : "Ativa"} · Nível ${skill.level}/${skill.maxLevel}`;
      cost.textContent = skill.passive
        ? "Bônus automático quando aprendida"
        : `MP ${skill.mp} · Resistência ${skill.stamina} · Recarga ${skill.cooldown}s`;
      reason.textContent = explain(skill);
      actions.className = "ft-skill-actions";
      const learn = document.createElement("button");
      learn.textContent = skill.level ? "Evoluir" : "Aprender";
      learn.disabled = skill.level >= skill.maxLevel || ctx.stats.level < skill.reqLevel;
      learn.onclick = () => act(() => ctx.learn(skill.id));
      actions.append(learn);
      if (!skill.passive) {
        const equip = document.createElement("button");
        equip.textContent = "Selecionar no ataque";
        equip.disabled = !skill.level;
        equip.onclick = () => act(() => ctx.select(skill.id));
        const use = document.createElement("button");
        use.textContent = "Usar";
        use.disabled = !skill.level;
        use.onclick = () => {
          try {
            ctx.use(skill.id);
            dismiss();
          } catch (e) {
            message.textContent = e.message;
          }
        };
        actions.append(equip, use);
      }
      card.append(badge, name, level, cost, reason, actions);
      grid.append(card);
    }
  }
  for (const type of [
    "keydown",
    "keyup",
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "wheel",
    "touchstart",
    "touchend",
  ])
    dialog.addEventListener(type, (e) => e.stopPropagation());
  dialog.append(header, summary, message, grid);
  document.body.append(dialog);
  draw();
  dialog.showModal();
  close.focus();
  return dialog;
}
