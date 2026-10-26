// Pinned native HUD buildInventory: both bags use cols:12, rows:6, cell:22.
export const BAG_COLUMNS = 12;
export const BAG_ROWS = 6;
export function canPlace(bag, item, x, y, ignore = null) {
  if (
    ![x, y, item.w, item.h].every(Number.isInteger) ||
    item.w < 1 ||
    item.h < 1 ||
    x < 0 ||
    y < 0 ||
    x + item.w > BAG_COLUMNS ||
    y + item.h > BAG_ROWS
  )
    return false;
  return !bag.some(
    (p) =>
      p !== ignore &&
      x < p.x + p.item.w &&
      x + item.w > p.x &&
      y < p.y + p.item.h &&
      y + item.h > p.y,
  );
}
export function firstSpace(bag, item) {
  if(!item||![item.w,item.h].every(Number.isInteger)||item.w<1||item.h<1||item.w>BAG_COLUMNS||item.h>BAG_ROWS)return null;
  for (let y = 0; y <= BAG_ROWS - item.h; y++)
    for (let x = 0; x <= BAG_COLUMNS - item.w; x++) if (canPlace(bag, item, x, y)) return { x, y };
  return null;
}
export function organizeBag(bag) {
  // Place large rectangles first. Fail atomically if this packing cannot fit.
  const sorted = [...bag].sort(
    (a, b) =>
      b.item.h * b.item.w - a.item.h * a.item.w ||
      b.item.h - a.item.h ||
      a.item.code.localeCompare(b.item.code) ||
      a.item.uid - b.item.uid,
  );
  const placed = [];
  for (const p of sorted) {
    const position = firstSpace(placed, p.item);
    if (!position) return null;
    placed.push({ ...position, item: p.item });
  }
  return placed;
}
export function repairBags(inv) {
  const target=inv;
  inv={...inv,bag:[...(inv.bag??[])],bagB:[...(inv.bagB??[])]};
  const overflow = [];
  for (const key of ["bag", "bagB"]) {
    const placed = [],
      pending = [];
    for (const p of inv[key] ?? []) {
      if (canPlace(placed, p.item, p.x, p.y)) placed.push(p);
      else pending.push(p);
    }
    for (const p of pending) {
      const position = firstSpace(placed, p.item);
      if (position) placed.push({ ...position, item: p.item });
      else overflow.push(p);
    }
    inv[key] = placed;
  }
  for (const p of overflow) {
    const key = firstSpace(inv.bag, p.item) ? "bag" : "bagB";
    const position = firstSpace(inv[key], p.item);
    if (!position)
      throw Error(
        "Inventário salvo excede duas bolsas; recuperação interrompida para preservar seus itens.",
      );
    inv[key].push({ ...position, item: p.item });
  }
  target.bag=inv.bag;target.bagB=inv.bagB;
}
export function swapWeaponSet(inv) {
  const spare = {};
  for (const slot of ["weapon", "shield"]) {
    if (inv.equip[slot]) spare[slot] = inv.equip[slot];
    if (inv.equipB?.[slot]) inv.equip[slot] = inv.equipB[slot];
    else delete inv.equip[slot];
  }
  inv.equipB = spare;
  inv.set = inv.set === "B" ? "A" : "B";
}
