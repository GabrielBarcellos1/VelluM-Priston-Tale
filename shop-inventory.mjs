// Account stock and regular loot with the same item code stay separate.
export function syncShopInventory(inv, wallet, create, add) {
  const products = new Map(
    [...wallet.catalog, ...(wallet.ownedCatalog ?? [])].map((p) => [p.code, p]),
  );
  const stock = new Map(wallet.stock.map((p) => [p.code, p.quantity]));
  const seen = new Set();
  const managed = (item) =>
    item &&
    (item.premiumManaged || (products.has(item.code) && products.get(item.code).kind !== "item"));
  for (const equipment of [inv.equip, inv.equipB ?? {}])
    for (const [slot, item] of Object.entries(equipment)) {
      if (!managed(item)) continue;
      if (!products.get(item.code)?.permanent || !stock.get(item.code) || seen.has(item.code))
        delete equipment[slot];
      else {
        item.premiumManaged = true;
        item.count = 1;
        seen.add(item.code);
      }
    }
  inv.belt = inv.belt.map((item) => {
    if (!managed(item)) return item;
    if (item.slot !== "POTION" || !stock.get(item.code) || seen.has(item.code)) return null;
    item.premiumManaged = true;
    item.count = stock.get(item.code);
    seen.add(item.code);
    return item;
  });
  for (const key of ["bag", "bagB"])
    inv[key] = (inv[key] ?? []).filter((record) => {
      const item = record.item;
      if (!managed(item)) return true;
      if (!stock.get(item.code) || seen.has(item.code)) return false;
      item.premiumManaged = true;
      item.count = stock.get(item.code);
      seen.add(item.code);
      return true;
    });
  for (const [code, quantity] of stock)
    if (!seen.has(code)) {
      const item = create(code, quantity, true);
      if (item) add(item);
    }
}
