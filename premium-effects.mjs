// Arithmetic shown by the pinned public client's premium tooltip (TEt/CEt).
// This recovers client-visible rules, not the private server's PvP modifiers.
const positive = (value) => (Number.isFinite(value) ? Math.max(0, value) : 0);
const drains = { vampiric: [20, 10], vampiricEx: [15, 7], manaRecharge: [13, 10] };

export function premiumDrain(kind, attribute, damage, targets = 1) {
  const rule = drains[kind];
  damage = positive(damage);
  targets = Math.trunc(positive(targets));
  if (!rule || !damage || !targets) return 0;
  const [divisor, targetScale] = rule;
  return Math.trunc(
    ((positive(attribute) + damage / 10) / divisor) * (1 + targets / targetScale) * targets + 1,
  );
}

// Pass effective damage (capped at the victim's remaining HP), once per landed
// target. Misses/evades and a finished corpse cannot generate HP or mana.
export function premiumRecovery(stats, premiumValue, damage, options = {}) {
  if (options.area && options.suppressAreaDrain) return { hp: 0, mp: 0 };
  const targets = options.targets ?? 1;
  const hpKind =
    premiumValue("vampiricEx") > 0
      ? "vampiricEx"
      : premiumValue("vampiric") > 0
        ? "vampiric"
        : null;
  return {
    hp: Math.min(
      Math.max(0, positive(stats.hpMax) - positive(stats.hp)),
      premiumDrain(hpKind, stats.str, damage, targets),
    ),
    mp: Math.min(
      Math.max(0, positive(stats.mpMax) - positive(stats.mp)),
      premiumValue("manaRecharge") > 0
        ? premiumDrain("manaRecharge", stats.spi, damage, targets)
        : 0,
    ),
  };
}

export function premiumResourceCost(cost, reductionPercent) {
  const amount = Math.trunc(positive(cost));
  const reduction = Math.min(100, positive(reductionPercent));
  return amount - Math.floor((amount * reduction) / 100);
}
