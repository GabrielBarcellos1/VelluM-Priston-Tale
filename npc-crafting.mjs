// Material requirements are an explicit FREEston profile: private server recipes
// are not present in the public bundle. Native item eligibility/chances are reused.
export function decorateCraftItem(item, bridge) {
  delete item.agingNeeds;
  delete item.agingPrice;
  if (
    !bridge.craftAccept("aging", "item", item.code) ||
    item.mixed ||
    item.premiumManaged ||
    (item.aging ?? 0) >= bridge.maxAging
  )
    return item;
  const age = item.aging ?? 0;
  const tier = 1 + Math.floor(age / 4);
  const count = 1 + Math.floor((age % 4) / 2);
  item.agingNeeds = Array.from(
    { length: 3 * count },
    (_, n) => "OS1" + String(tier + Math.floor(n / count)).padStart(2, "0"),
  );
  item.agingPrice = Math.floor(Math.floor(((age + 1) * (item.price ?? 0)) / 2)*(1-(globalThis.__localEconomy?.().discount??0)/100));
  item.agingRecipeSource = "freeston-local";
  return item;
}
// Native recipe helpers and fees; transactions remain in this local PvE adapter.
export function craftAtNpc(message, ctx) {
  const { inv, stats, npcs, bridge: B, instance, addBag, restoreItem } = ctx;
  const kind = message.t,
    service = kind === "mixReset" ? "mixreset" : kind;
  const npc = npcs.find((n) => n.id === message.npcId && n.services?.includes(service));
  if (!npc) throw Error("Procure o NPC responsável por esse serviço.");
  if (ctx.position && Math.hypot(ctx.position.x - npc.x, ctx.position.z - npc.z) > 500)
    throw Error("Aproxime-se do NPC.");
  const bag = [...inv.bag, ...inv.bagB],
    record = bag.find((p) => p.item.uid === message.item),
    item = record?.item;
  const ids = message.sheltoms ?? [];
  if (!Array.isArray(ids) || ids.length > 16 || new Set(ids).size !== ids.length)
    throw Error("Materiais inválidos.");
  const materials = ids.map((uid) => bag.find((p) => p.item.uid === uid)?.item);
  if (
    materials.some((i) => !i || i.slot !== "SHELTOM" || i.premiumManaged) ||
    materials.some((i) => i.uid === item?.uid)
  )
    throw Error("Use sheltoms comuns da bolsa.");
  if (message.stone && kind !== "mixReset")
    throw Error("Esta pedra especial ainda não tem regra de proteção validada; nada foi gasto.");
  if (kind !== "force" && !item) throw Error("Coloque um equipamento da bolsa.");
  let fee = 0,
    recipe;
  if (kind === "aging") {
    if (!item.agingNeeds?.length || (item.aging ?? 0) >= B.maxAging)
      throw Error("Item sem próximo aging disponível.");
    const needed = [...item.agingNeeds].sort(),
      codes = materials.map((i) => i.code).sort();
    if (JSON.stringify(needed) !== JSON.stringify(codes))
      throw Error("Coloque todas as sheltoms pedidas pelo aging.");
    fee = Math.floor((((item.aging ?? 0) + 1) * item.price) / 2);
    fee = Math.floor(fee*(1-(globalThis.__localEconomy?.().discount??0)/100));
  } else if (kind === "mix") {
    if (item.mixed || (item.aging ?? 0) > 0)
      throw Error("Limpe o mix/aging antes de aplicar outra mistura.");
    recipe = B.mixRecipe(
      item.code,
      materials.map((i) => i.code),
    );
    if (!recipe) throw Error("Não existe fórmula para esses materiais; nada foi gasto.");
    fee = item.price ?? 0;
  } else if (kind === "force") {
    if (!materials.length) throw Error("Coloque as sheltoms.");
    if (materials.some((i) => !B.forceRecipe(i.code)))
      throw Error("Essa sheltom não possui Force Orb.");
    fee = materials.reduce((n, i) => n + B.forceRecipe(i.code).price, 0);
  } else if (kind === "mixReset") {
    const stone = bag.find((p) => p.item.uid === message.stone)?.item;
    if (stone?.code !== "BI189" || stone.premiumManaged)
      throw Error("Coloque a Pedra de Limpeza comum (Mixture Reset Stone).");
    if (!item.mixed && !(item.aging > 0)) throw Error("O item já está limpo.");
  } else throw Error("Serviço de fabricação desconhecido.");
  if (stats.gold < fee) throw Error(`Ouro insuficiente: ${fee}.`);
  if (ctx.preview) return { item: item?.uid, aging: item?.aging ?? 0, fee };
  const backup = structuredClone(inv),
    oldGold = stats.gold;
  const removeOne = (i) => {
    i.count = (i.count ?? 1) - 1;
    for (const key of ["bag", "bagB"]) inv[key] = inv[key].filter((p) => (p.item.count ?? 1) > 0);
  };
  try {
    stats.gold -= fee;
    for (const material of materials) removeOne(material);
    let ok = true,
      text;
    if (kind === "aging") {
      const chances = B.agingChance(item.aging ?? 0, null),
        random = ctx.random ?? Math.random;
      let roll = random() * 100,
        outcome = "kept";
      for (const key of ["plus2", "plus1", "minus1", "minus2", "destroy", "kept"]) {
        roll -= chances[key] ?? 0;
        if (roll < 0) {
          outcome = key;
          break;
        }
      }
      const old = item.aging ?? 0;
      if (outcome === "destroy") {
        for (const key of ["bag", "bagB"])
          inv[key] = inv[key].filter((p) => p.item.uid !== item.uid);
        ok = false;
        text = "O aging falhou e o item foi destruído.";
      } else {
        const delta = { plus2: 2, plus1: 1, minus1: -1, minus2: -2, kept: 0 }[outcome];
        B.age(item, Math.max(0, Math.min(B.maxAging, old + delta)) - old);
        ok = delta > 0;
        text = `Aging: +${old} → +${item.aging ?? 0}.`;
      }
    } else if (kind === "mix") {
      B.applyMix(
        item,
        recipe,
        materials.map((i) => i.code),
      );
      text = "Mistura aplicada com a fórmula do cliente.";
    } else if (kind === "force") {
      for (const material of materials)
        if (!addBag(instance(B.forceRecipe(material.code).code)))
          throw Error("Sem espaço para receber as Force Orbs.");
      text = `${materials.length} Force Orb(s) criada(s).`;
    } else {
      removeOne(bag.find((p) => p.item.uid === message.stone).item);
      const clean = restoreItem(
        {
          ...item,
          aging: 0,
          mixed: false,
          mixRecipeId: undefined,
          mixId: undefined,
        },
        { resetCraft: true },
      );
      Object.keys(item).forEach((k) => delete item[k]);
      Object.assign(item, clean);
      text = "Mix e aging removidos; especialização preservada.";
    }
    if (item && B.craftAccept) decorateCraftItem(item, B);
    return {
      t: "craftResult",
      kind,
      ok,
      text,
      item: kind === "aging" || kind === "mix" || kind === "mixReset" ? item : undefined,
    };
  } catch (e) {
    Object.assign(inv, backup);
    stats.gold = oldGold;
    throw e;
  }
}
