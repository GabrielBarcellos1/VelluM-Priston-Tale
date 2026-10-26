// Cosmetics use the original client's skins packet; inventory stats stay intact.
export function mountSkinShop({
  game,
  hero,
  deliver,
  save,
  flush,
  refreshWallet,
  notice,
  generation,
}) {
  let snapshot = null,
    dialog = null,
    busy = false;
  const button = document.createElement("button");
  button.textContent = "Skins";
  button.className = "local-button";
  document.querySelector(".local-controls")?.append(button);
  async function api(data) {
    const response = await fetch(
      data ? "/api/local/game/skin" : `/api/local/game/skins?job=${hero.jobCode}`,
      data
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, job: hero.jobCode, generation }),
          }
        : { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok) throw Error(result.error ?? "Não foi possível carregar as skins.");
    return result;
  }
  function apply(next) {
    snapshot = next;
    deliver({ t: "skinsUi", show: false });
    deliver({ t: "skins", equip: next.equip, worn: next.worn });
    if (dialog?.open) render();
  }
  async function refresh() {
    apply(await api());
  }
  function element(tag, text) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function compatible(skin) {
    const eq = game.lastInventory?.equip ?? {};
    const base = eq[{ arma: "weapon", escudo: "shield", traje: "armor" }[skin.cat]];
    return (
      base &&
      base.code.slice(0, 3) === skin.look.slice(0, 3) &&
      (skin.cat !== "arma" || base.slot === (skin.hands === 2 ? "WEAPON_TWO" : "WEAPON_ONE"))
    );
  }
  async function mutate(action, skin) {
    if (busy) return;
    busy = true;
    render();
    try {
      if (!save()) throw Error("Não foi possível salvar.");
      await flush();
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
      const result = await api({ action, id: skin.id, price: skin.price, requestId: id });
      apply(result.skins);
      await refreshWallet();
      const message =
        action === "buy"
          ? "Skin comprada. Agora você pode equipá-la."
          : action === "equip"
            ? "Skin equipada."
            : "Skin removida.";
      dialog.querySelector("[role=status]").textContent = message;
    } catch (error) {
      dialog.querySelector("[role=status]").textContent = error.message;
    } finally {
      busy = false;
      render();
    }
  }
  function render() {
    if (!dialog) return;
    dialog.querySelector(".skin-balance").textContent =
      `${snapshot?.coins ?? 0} coins · Skins permanentes, apenas visuais`;
    const filter = dialog.querySelector("select").value,
      search = dialog.querySelector("input").value.toLowerCase();
    const list = dialog.querySelector(".skin-cards");
    list.replaceChildren();
    for (const skin of snapshot?.catalog ?? []) {
      if (filter && skin.cat !== filter) continue;
      if (search && !`${skin.name} ${skin.look}`.toLowerCase().includes(search)) continue;
      const card = element("article"),
        img = element("img");
      img.src = "/assets/" + skin.image;
      img.alt = skin.name;
      img.loading = "lazy";
      card.append(
        img,
        element("h3", skin.name),
        element("p", skin.description),
        element(
          "small",
          skin.look + " · " + { arma: "Arma", escudo: "Escudo", traje: "Armadura/robe" }[skin.cat],
        ),
      );
      const owned = snapshot.owned.includes(skin.id),
        equipped = snapshot.equip[skin.cat] === skin.id,
        action = owned ? (equipped ? "remove" : "equip") : "buy";
      const b = element(
        "button",
        owned ? (equipped ? "Remover visual" : "Equipar visual") : `Comprar · ${skin.price} coins`,
      );
      b.disabled = busy || (owned && !equipped && !compatible(skin));
      b.onclick = () => mutate(action, skin);
      card.append(b);
      if (owned && !compatible(skin))
        card.append(element("small", "Requer equipamento do mesmo tipo."));
      list.append(card);
    }
    if (!list.children.length)
      list.append(
        element("p", "Nenhuma skin nesta seleção. O ADM pode publicar modelos pelo painel."),
      );
  }
  async function open() {
    if (!dialog) {
      dialog = element("dialog");
      dialog.id = "freeston-skins";
      const header = element("header"),
        title = element("h2", "Loja de Skins"),
        close = element("button", "×");
      close.type = "button";
      close.setAttribute("aria-label", "Fechar loja de skins");
      close.onclick = () => dialog.close();
      header.append(title, close);
      const balance = element("p");
      balance.className = "skin-balance";
      const controls = element("div");
      controls.className = "skin-filters";
      const search = element("input");
      search.placeholder = "Buscar nome ou código";
      search.setAttribute("aria-label", "Buscar skin");
      search.type = "search";
      search.oninput = render;
      const filter = element("select");
      filter.setAttribute("aria-label", "Categoria de skin");
      for (const [value, label] of [
        ["", "Todas"],
        ["arma", "Armas"],
        ["escudo", "Escudos"],
        ["traje", "Armaduras e robes"],
      ]) {
        const o = element("option", label);
        o.value = value;
        filter.append(o);
      }
      filter.onchange = render;
      controls.append(search, filter);
      const cards = element("div");
      cards.className = "skin-cards";
      const status = element("p");
      status.setAttribute("role", "status");
      dialog.append(header, balance, controls, status, cards);
      document.body.append(dialog);
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    }
    try {
      await refresh();
      if (!dialog.open) dialog.showModal();
      render();
    } catch (error) {
      notice(error.message);
    }
  }
  button.onclick = open;
  refresh().catch((e) => notice(e.message));
  const timer = setInterval(() => {
    if (!document.hidden) refresh().catch(() => {});
  }, 10000);
  addEventListener("pagehide", () => clearInterval(timer), { once: true });
  return {
    open,
    refresh,
    get snapshot() {
      return snapshot;
    },
  };
}
