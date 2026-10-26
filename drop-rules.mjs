// Explicit LOCAL balancing, not recovered private server probabilities.
export function rollDrops(monster, mapId, definitions, rules, random = Math.random, options = {}) {
  const out = [];
  if (!monster.maps.includes(mapId)) return out;
  const special = rules.bosses[monster.name];
  if (special && options.special !== false)
    for (const entry of special)
      if (definitions.has(entry.code) && random() < entry.chance)
        out.push({ code: entry.code, count: entry.count ?? 1 });
  const level = monster.level;
  const potion = level >= 80 ? "PL104" : level >= 40 ? "PL103" : level >= 20 ? "PL102" : "PL101";
  if (definitions.has(potion) && random() < rules.common.potionChance)
    out.push({ code: potion, count: 1 });
  const bossCodes = new Set(
    Object.values(rules.bosses)
      .flat()
      .map((e) => e.code),
  );
  const allowed = new Set([
    "WEAPON_ONE",
    "WEAPON_TWO",
    "ARMOR",
    "BOOTS",
    "GLOVES",
    "ARMLET",
    "SHIELDS",
    "AMULET",
    "RING",
    "SHELTOM",
  ]);
  const candidates = [...definitions.values()].filter(
    (d) =>
      allowed.has(d.slot) &&
      !bossCodes.has(d.code) &&
      d.family !== "OR2" &&
      Number(d.req?.level ?? 0) <= level &&
      Number(d.req?.level ?? 0) >= Math.max(0, level - 20) &&
      Number(d.price) > 0 &&
      !/\(|costume|event|halloween|christmas/i.test(d.name),
  );
  if (candidates.length && random() < rules.common.equipmentChance)
    out.push({ code: candidates[Math.floor(random() * candidates.length)].code, count: 1 });
  return out;
}
