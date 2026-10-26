// Damage/AR/defense follow the public classic inventory formulas. New jobs
// inherit a matching archetype locally; this is not private Zephira balance.
const extraAgingCritical = new Set(["WM1", "WM3", "WM5", "WH1", "WH3", "WN1", "WD1", "WV1"]);

function agingCritical(item) {
  if (!extraAgingCritical.has(item?.code?.slice(0, 3).toUpperCase())) return 0;
  return Math.floor(Math.max(0, Math.min(20, Number(item.aging) || 0)) / 2);
}

export function combatStats(s, equipment, spec = {}, e = {}) {
  const gear = Object.values(equipment).filter(Boolean),
    w = equipment.weapon;
  const sum = (k) => gear.reduce((n, i) => n + (Number.isFinite(i[k]) ? i[k] : 0), 0);
  const family = w?.code?.slice(0, 3),
    magic = ["WM1", "WN1"].includes(family),
    ranged = ["WS1", "WT1"].includes(family);
  const magicJob = [7, 8, 10].includes(s.job);
  const primary = magic ? s.spi : ranged ? s.dex : s.str;
  const divisor = magic
    ? s.job === 8
      ? 170
      : 150
    : ranged
      ? [3, 5].includes(s.job)
        ? 130
        : 190
      : [1, 4, 6, 9].includes(s.job)
        ? 130
        : s.job === 3 || s.job === 8
          ? 190
          : 150;
  const secondary = magic ? s.tal : s.tal + (ranged ? s.str : s.dex),
    secondaryDiv = magic ? 30 : divisor === 130 ? 40 : divisor === 150 ? 45 : 50;
  const min = w?.damage?.[0] ?? 1,
    max = w?.damage?.[1] ?? 3;
  const flat = (spec.damage ?? 0) + (e.damageFlat ?? 0);
  let damageMin =
    2 +
    Math.trunc((min * (primary + divisor)) / divisor) +
    Math.trunc(secondary / secondaryDiv) +
    Math.trunc((min + max) / 16) +
    flat +
    Math.floor(min * (e.weaponDamage ?? 0));
  let damageMax =
    4 +
    Math.trunc((max * (primary + divisor)) / divisor) +
    Math.trunc(secondary / secondaryDiv) +
    flat +
    Math.floor(max * ((e.weaponDamage ?? 0) + (e.weaponDamageMax ?? 0)));
  damageMin = Math.floor(damageMin * (1 + (e.damage ?? 0)));
  damageMax = Math.floor(damageMax * (1 + (e.damage ?? 0) + (e.damageMax ?? 0)));
  const defense = Math.floor(
    (s.dex / 2 +
      s.tal / 4 +
      s.level * 1.4 +
      sum("defense") +
      (spec.defense ?? 0) +
      (e.defense ?? 0) +
      Math.floor(
        (((equipment.armor?.defense ?? 0) +
          (equipment.armor?.spec === s.job ? (equipment.armor.specBonus?.defense ?? 0) : 0)) *
          (e.armorDefensePercent ?? 0)) /
          100,
      )) *
      (1 + (e.defensePercent ?? 0) / 100),
  );
  const absorb = Math.max(
    0,
    Math.floor(
      defense / 100 + s.level / 10 + sum("absorb") + (spec.absorb ?? 0) + (s.str + s.tal) / 40,
    ) +
      1 +
      Math.min(2, Math.floor(gear.filter((i) => i.absorb > 0).length / 2)) +
      (e.absorb ?? 0),
  );
  const resist = {};
  for (const type of ["bio", "poison", "fire", "lightning", "ice"])
    resist[type] =
      gear.reduce(
        (n, i) =>
          n + (i.resist?.[type] ?? 0) + (i.spec === s.job ? (i.specBonus?.resist?.[type] ?? 0) : 0),
        0,
      ) + (e.resist?.[type] ?? 0);
  const attackSpeed = (w?.attackSpeed ?? 6) + (spec.attackSpeed ?? 0) + (e.attackSpeed ?? 0);
  return {
    damageMin,
    damageMax: Math.max(damageMin, damageMax),
    magicAttack: magic && magicJob,
    attackRating: Math.floor(
      (sum("attackRating") +
        (spec.attackRating ?? 0) +
        s.dex * 3.1 +
        s.level * 1.9 +
        s.tal * 1.5 +
        (e.attackRating ?? 0) +
        Math.floor(((w?.attackRating ?? 0) * (e.weaponRatingPercent ?? 0)) / 100)) *
        (1 + (e.attackRatingPercent ?? 0) / 100),
    ),
    defense,
    absorb,
    resist,
    elementalDamage: { ...(e.elementalDamage ?? {}) },
    attackStep: Math.max(
      40,
      Math.min(400, (20 + attackSpeed * 10) * (1 + (e.attackSpeedPercent ?? 0) / 100)),
    ),
    block: Math.min(75, sum("block") + (spec.block ?? 0) + (e.block ?? 0)),
    evade: Math.min(75, e.evade ?? 0),
    // Public VSt/Aj adds this to the effective stat; GSt already writes aging
    // critical into claw/pike/sword/bow/javelin items, so those must not double.
    critical: Math.min(
      70,
      (w?.critical ?? 0) + agingCritical(w) + (spec.critical ?? 0) + (e.critical ?? 0),
    ),
    damageReduction: Math.min(75, e.absorbPercent ?? 0),
    undeadAbsorb: e.undeadAbsorb ?? 0,
    undeadDamage: e.undeadDamage ?? 0,
    reflection: Math.min(100, e.reflection ?? 0),
    retaliationFlat: e.retaliationFlat ?? 0,
    manaShield: Math.min(75, e.manaShield ?? 0),
    hpRegen: sum("hpRegen") + (spec.hpRegen ?? 0) + (e.hpRegen ?? 0),
    magicPowerPercent: e.magicPowerPercent ?? 0,
    stealth: (e.stealth ?? 0) > 0,
    mpRegen: sum("mpRegen") + (spec.mpRegen ?? 0) + (e.regen ?? 0),
    spRegen: sum("spRegen") + (spec.spRegen ?? 0),
    shootingRange: (w?.range ?? 0) + (spec.range ?? 0),
  };
}
