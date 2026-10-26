// Public classic source: sinGetAccuracy, GetCritical and Svr_Damge.
// These rules are NOT evidence of current Zephira server configuration.
export function accuracyChance(attacker, defender, table) {
  const delta = Math.trunc(((attacker.attackRating ?? 0) - (defender.defense ?? 0)) * 1.4);
  let chance = delta < -190 ? 50 : 95;
  if (delta >= -190 && delta <= 2100)
    for (let i = 0; i < table.length - 1; i++)
      if (delta >= table[i][0] && delta <= table[i + 1][0]) {
        chance = table[i + 1][1];
        break;
      }
  return Math.max(
    30,
    Math.min(95, Math.trunc(chance - ((defender.level ?? 1) - (attacker.level ?? 1)) * 0.28)),
  );
}
export function physicalHit(attacker, defender, power, table, random = Math.random, options = {}) {
  const hitAttacker = options.attackRatingPercent
    ? {
        ...attacker,
        attackRating: Math.floor(
          (attacker.attackRating ?? 0) * (1 + options.attackRatingPercent / 100),
        ),
      }
    : attacker;
  if (!options.magic && random() * 100 >= accuracyChance(hitAttacker, defender, table))
    return { amount: 0, kind: "miss" };
  if (!options.magic && random() * 100 < Math.max(0, Math.min(100, defender.block ?? 0)))
    return { amount: 0, kind: "block" };
  const critical = Math.max(
    0,
    Math.min(
      70,
      Math.floor(
        (attacker.critical ?? 0) *
          (1 + (options.criticalPercent ?? 0) / 100) *
          (options.criticalScale ?? 1),
      ) +
        (options.criticalBonus ?? 0) +
        ((attacker.level ?? 1) - (defender.level ?? 1)) * 0.25,
    ),
  );
  const kind =
    !options.magic && !options.noCritical && random() * 100 < critical ? "critical" : "normal";
  const min = options.damageRange?.[0] ?? attacker.damageMin ?? 1,
    max = Math.max(min, options.damageRange?.[1] ?? attacker.damageMax ?? min);
  let raw =
    Math.floor((min + Math.floor(random() * (max - min + 1))) * power) + (options.flatDamage ?? 0);
  if (kind === "critical") raw = Math.floor(raw * 1.7);
  // Public wiki absorption is a flat combat stat in this local profile.
  // Treating Valento's 99 as 99% made all classes nearly unable to hurt it.
  const resistance = options.element
    ? Math.max(
        0,
        Math.min(
          75,
          defender.resist?.[
            options.element === "water"
              ? "ice"
              : options.element === "earth"
                ? "bio"
                : options.element
          ] ?? 0,
        ),
      )
    : 0;
  raw = Math.floor(raw * (1 - resistance / 100));
  for (const [element, value] of Object.entries(
    options.magic ? {} : (attacker.elementalDamage ?? {}),
  ))
    raw += Math.floor(
      value * power * (1 - Math.max(0, Math.min(75, defender.resist?.[element] ?? 0)) / 100),
    );
  return { amount: Math.max(1, raw - Math.max(0, defender.absorb ?? 0)), kind };
}
export function nativeMonsterTiming(model) {
  const clip = model?.data?.json?.clips?.attack;
  if (!clip) return { duration: 1800, hit: 900, source: "local-fallback" };
  const duration = (Math.max(1, (clip.samples - 1) * clip.step) / 35) * 1000;
  return { duration, hit: duration / 2, source: "native-model" };
}
