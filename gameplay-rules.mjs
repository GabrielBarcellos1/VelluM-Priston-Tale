// Rules visible in the pinned public client; EXP curve remains FREEston's profile.
export function repairPrice(item) {
  const [current, maximum] = item.durability ?? [];
  if (!(maximum > 0) || current >= maximum) return 0;
  return Math.max(
    0,
    Math.floor(((item.price ?? 0) * (1 - Math.max(0, current) / maximum) * 0.75) / 8),
  );
}
export function salePrice(item) {
  const price = Math.max(0, item.price ?? 0);
  const [current, maximum] = item.durability ?? [];
  const ratio = maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 1;
  let unit = Math.floor((price * (0.25 + 0.75 * ratio)) / 5);
  if (item.foreignLoot && unit > 0) unit = Math.max(1, Math.floor(unit / 3));
  return unit * Math.max(1, Math.trunc(item.count ?? 1));
}
export function saleError(item) {
  if (
    item.premiumManaged ||
    item.noGold ||
    item.slot === "QUEST" ||
    item.code.startsWith("QT") ||
    item.code === "GF101" ||
    item.slot === "POTION" ||
    (item.questWeapon && !item.questWeapon.lent)
  )
    return "Este item não pode ser vendido por ouro.";
  return null;
}
export function questEligible(q, stats, race, completed) {
  return (
    !completed.has(q.id) &&
    q.minLevel <= stats.level &&
    (!q.maxLevel || stats.level <= q.maxLevel) &&
    (!q.jobs?.length || q.jobs.includes(stats.job)) &&
    (!q.race || q.race === race) &&
    (q.requires ?? []).every((r) => completed.has(r.id))
  );
}
export function questExperience(rewards, level) {
  if (Number.isFinite(rewards?.exp)) return Math.max(0, rewards.exp);
  const capped = Math.max(1, Math.min(level, rewards?.expCapLevel ?? level));
  return Math.floor((rewards?.expPct ?? 0) * (capped ** 2 - (capped - 1) ** 2));
}
export function objectiveMatches(q, objective, type, value, field) {
  if (objective.type !== type) return false;
  if (objective.maps?.length && !objective.maps.includes(field)) return false;
  if (type === "talk") return (objective.npcIds ?? []).includes(value);
  if (type === "kill") return !objective.monsters?.length || objective.monsters.includes(value);
  if (type === "reach") return objective.target?.field === value;
  if (type === "ui")
    return (
      q.id === "tutorial.02-sua-tela" &&
      ["window:inventory", "window:status", "window:skills", "window:map"][Number(objective.id)] ===
        value
    );
  if (type === "use") return value?.belt === true && value?.potion === true;
  return false; // Unspecified private objective contracts must not progress on unrelated actions.
}
export function allocateStat(stats, attribute, count, history) {
  if (!["str", "spi", "tal", "dex", "health"].includes(attribute) || stats.statPoints <= 0)
    return false;
  const n = Math.min(stats.statPoints, Math.max(1, Math.min(10, Math.floor(Number(count) || 1))));
  stats[attribute] += n;
  stats.statPoints -= n;
  history.push({ attribute, n });
  return true;
}
export function undoStat(stats, equipment, history) {
  const last = history.at(-1);
  if (!last) return false;
  const minimum = Math.max(
    0,
    ...Object.entries(equipment)
      .filter(([slot]) => slot !== "costume")
      .map(([, item]) => item?.req?.[last.attribute] ?? 0),
  );
  if (stats[last.attribute] - last.n < minimum) return false;
  stats[last.attribute] -= last.n;
  stats.statPoints += last.n;
  history.pop();
  return true;
}
