export function openPremiumShop(ctx) {
  document.querySelector("#freeston-shop")?.dispatchEvent(new Event("dismiss"));
  const dialog = document.createElement("dialog");
  dialog.id = "freeston-shop";
  dialog.className = "ft-dialog ft-shop";
  dialog.setAttribute("aria-label", "Loja premium FREEston Tale");
  const header = document.createElement("header"),
    title = document.createElement("h2"),
    close = document.createElement("button"),
    balance = document.createElement("p"),
    status = document.createElement("p"),
    note = document.createElement("p"),
    grid = document.createElement("div"),
    tabs = document.createElement("nav"),
    skinsHost = document.createElement("section");
  title.textContent = "FREEston Tale · Loja premium";
  close.className = "ft-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Fechar loja premium");
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
  status.className = "ft-message";
  status.setAttribute("role", "status");
  balance.className = "ft-skill-summary";
  note.className = "ft-shop-note";
  note.textContent =
    "Compras ficam em Meus premiums nesta conta, em qualquer classe. Ative quando quiser. A duração continua offline. Coins são moeda de teste do servidor.";
  grid.className = "ft-skill-grid";
  const premiumTab = document.createElement("button");
  const skinsTab = document.createElement("button");
  premiumTab.type = skinsTab.type = "button";
  premiumTab.textContent = "Itens premium";
  skinsTab.textContent = "Skins 3D";
  tabs.className = "ft-shop-tabs";
  tabs.append(premiumTab, skinsTab);
  skinsHost.className = "ft-shop-skins";
  skinsHost.hidden = true;
  const selectTab = async (skinTab) => {
    grid.hidden = skinTab;
    skinsHost.hidden = !skinTab;
    premiumTab.setAttribute("aria-pressed", String(!skinTab));
    skinsTab.setAttribute("aria-pressed", String(skinTab));
    note.hidden = skinTab;
    if (skinTab) {
      try { await ctx.openSkins(skinsHost); }
      catch (e) { status.textContent = e.message; }
    }
  };
  premiumTab.onclick = () => selectTab(false);
  skinsTab.onclick = () => selectTab(true);
  header.append(title, close);
  dialog.append(header, balance, tabs, note, status, grid, skinsHost);
  document.body.append(dialog);
  dialog.showModal();
  close.focus();
  let busy = false;
  async function act(action, code) {
    if (busy) return;
    busy = true;
    draw();
    try {
      const result = await ctx.action(action, code);
      status.textContent = result.message;
    } catch (e) {
      status.textContent = e.message;
    } finally {
      busy = false;
      draw();
    }
  }
  function draw() {
    const wallet = ctx.wallet();
    balance.textContent = `ID ${wallet.username} · Saldo: ${wallet.coins.toLocaleString("pt-BR")} coins`;
    grid.replaceChildren();
    for (const item of wallet.catalog) {
      const card = document.createElement("article"),
        icon = document.createElement("img"),
        name = document.createElement("h3"),
        desc = document.createElement("p"),
        stock = document.createElement("p"),
        actions = document.createElement("div"),
        buy = document.createElement("button"),
        use = document.createElement("button");
      card.dataset.premiumCode = item.code;
      icon.src = "/assets/" + item.icon;
      icon.alt = item.name;
      icon.width = icon.height = 40;
      name.textContent = `${item.name} · ${item.hours}h`;
      desc.textContent = item.description;
      const count = wallet.stock.find((s) => s.code === item.code)?.quantity ?? 0;
      const active = wallet.active.find(
        (s) =>
          s.kind === item.kind ||
          (["vampiric", "vampiricEx"].includes(item.kind) &&
            ["vampiric", "vampiricEx"].includes(s.kind)),
      );
      const left = active
        ? Math.max(0, Math.ceil((active.expiresAt * 1000 - ctx.serverNow()) / 60000))
        : 0;
      stock.textContent = `Meus premiums: ${count}${left ? ` · Ativo: ${active.name}, ${left} min restantes` : ""}`;
      buy.textContent = `Comprar · ${item.price} coins`;
      buy.disabled = busy || wallet.coins < item.price;
      buy.onclick = () => act("purchase", item.code);
      use.textContent = "Ativar";
      use.disabled = busy || count < 1;
      use.onclick = () => act("activate", item.code);
      actions.className = "ft-skill-actions";
      actions.append(buy, use);
      card.append(icon, name, desc, stock, actions);
      grid.append(card);
    }
  }
  draw();
  if (ctx.initialTab === "skins") selectTab(true);
  const refresh = async () => {
    if (!dialog.isConnected) {
      clearInterval(timer);
      return;
    }
    if (busy || document.hidden) return;
    try {
      await ctx.refresh();
      if (!busy) draw();
    } catch (e) {
      status.textContent = e.message;
    }
  };
  const timer = setInterval(refresh, 5000);
  dialog.addEventListener("close", () => clearInterval(timer));
  return dialog;
}
