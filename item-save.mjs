// Item identity/catalog metadata comes from the public definition. Persist the
// actual attribute values separately: rebuilding a native preview selects the
// bottom of each catalog range and is not a restoration of a rolled item.
const scalarKeys = [
  "attackRating",
  "critical",
  "defense",
  "absorb",
  "block",
  "attackSpeed",
  "range",
  "moveSpeed",
  "hpRegen",
  "mpRegen",
  "spRegen",
  "hpAdd",
  "mpAdd",
  "spAdd",
];
const resistanceKeys = ["bio", "poison", "fire", "lightning", "ice"];
const requirementKeys = ["level", "str", "spi", "tal", "dex", "health"];
const bonusKeys = [...scalarKeys, "damage", "magicMastery", "potionSpace"];
const finite = (value) =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1e9;
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
function numericObject(source, keys) {
  const result = {};
  if (object(source)) for (const key of keys) if (finite(source[key])) result[key] = source[key];
  return result;
}
function attributes(source) {
  const result = numericObject(source, scalarKeys);
  if (
    Array.isArray(source?.damage) &&
    source.damage.length === 2 &&
    source.damage.every(finite) &&
    source.damage[0] >= 0 &&
    source.damage[1] >= source.damage[0]
  )
    result.damage = [...source.damage];
  if (
    Array.isArray(source?.durability) &&
    source.durability.length === 2 &&
    source.durability.every(finite) &&
    source.durability[0] >= 0 &&
    source.durability[1] >= source.durability[0]
  )
    result.durability = [...source.durability];
  if (object(source?.resist)) result.resist = numericObject(source.resist, resistanceKeys);
  return result;
}
function baseSnapshot(saved, code) {
  const base = saved?.baseRolls;
  return base?.version === 1 && base.code === code && object(base.values)
    ? { version: 1, code, values: attributes(base.values) }
    : null;
}
// Capture after an item has been rolled/perfected, before Aging or Mix. This is
// also used by the reset service so clearing upgrades does not reroll the item.
export function captureBaseRolls(item) {
  if (!item || typeof item.code !== "string") return item;
  item.baseRolls = { version: 1, code: item.code, values: attributes(item) };
  return item;
}
// Call AFTER reconstructing the catalog item, specialization, Aging and Mix.
// Saved values already include those transformations: replace them, never add
// them a second time. A craft reset restores only the separate pre-upgrade roll.
export function restoreItemRolls(rebuilt, saved, { resetCraft = false } = {}) {
  if (!rebuilt || !saved || rebuilt.code !== saved.code) return rebuilt;
  const base = baseSnapshot(saved, rebuilt.code);
  if (base) rebuilt.baseRolls = base;
  const values = resetCraft ? base?.values : attributes(saved);
  if (values) Object.assign(rebuilt, values);
  // Keep a matching specialization's rolled values and its requirement roll.
  // The class, name, slot, UID, price, shop ownership and upgrade metadata stay
  // with the normal restoration path, rather than arbitrary serialized fields.
  if (saved.spec === rebuilt.spec && Number.isInteger(rebuilt.spec) && rebuilt.spec > 0) {
    if (object(saved.specBonus)) {
      const bonus = numericObject(saved.specBonus, bonusKeys);
      if (object(saved.specBonus.resist))
        bonus.resist = numericObject(saved.specBonus.resist, resistanceKeys);
      rebuilt.specBonus = bonus;
    }
    if (object(saved.specReq)) rebuilt.specReq = numericObject(saved.specReq, requirementKeys);
    if (object(saved.req)) rebuilt.req = numericObject(saved.req, requirementKeys);
  }
  return rebuilt;
}
