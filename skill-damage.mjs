// Classic Svr_Damge.cpp at 299c615e. Public pweb only carries skill FX and
// server-delivered tooltips; these are traceable classic rules, not Zephira values.
const at = (values, level) => values?.[Math.max(0, Math.min(9, level - 1))];
const spells = {
  SKILL_FIRE_BOLT: ["FireBolt_Damage", "fire", 0, 8, 6, 3],
  SKILL_FIRE_BALL: ["FireBall_Damage", "fire", 2, 6, 4, 0],
  SKILL_WATORNADO: ["Watornado_Damage", undefined, 2, 6, 3, 0],
  SKILL_DEAD_RAY: ["Dead_Ray_Damage", undefined, 2, 4, 2, 1],
  SKILL_DIASTROPHISM: ["Diastrophism_Damage", undefined, 2, 6, 3, 0],
  SKILL_FLAME_WAVE: ["Flame_Wave_FireDamage", "fire", 2, 6, 3, 0],
  SKILL_M_METEO: ["Meteo_Damage", "fire", 3, 6, 3, 3],
  SKILL_HOLY_BOLT: ["HolyBolt_Damage", undefined, 0, 8, 6, 3],
  SKILL_MULTISPARK: ["M_Spark_Damage", undefined, 0, 8, 6, 3],
  SKILL_DIVINE_LIGHTNING: ["Divine_Lightning_Damage", "lightning", 2, 6, 3, 0],
  SKILL_VIGOR_BALL: ["Vigor_Ball_Damage", undefined, 2, 6, 3, 0],
  SKILL_GLACIAL_SPIKE: ["Glacial_Spike_Damage", "ice", 2, 6, 3, 0],
  SKILL_CHAIN_LIGHTNING: ["Chain_Lightning_Damage", "lightning", 3, 6, 3, 3],
};
const rating = {
  SKILL_IMPACT: "Impact_Attack_Rating",
  SKILL_JUMPING_CRASH: "Jumping_Crash_Attack_Rating",
  SKILL_AVANGING_CRASH: "A_Crash_AttackRate",
  SKILL_GRAND_SMASH: "Grand_Smash_AttackRate",
  SKILL_TWIST_JAVELIN: "Twist_Javelin_Attack_Rating",
  SKILL_SPLIT_JAVELIN: "Split_Javelin_AttackRate",
  SKILL_PIERCING: "Piercing_Attack_Rating",
  SKILL_GRAND_CROSS: "Grand_Cross_AttackRate",
};
const critical = {
  SKILL_CRITICAL_HIT: "Critical_Hit_Critical",
  SKILL_DETORYER: "Destoryer_AddCritical",
  SKILL_PERFORATION: "Perforation_Critical",
  SKILL_DOUBLE_CRASH: "D_Crash_Critical",
};
const repeats = {
  SKILL_RAVING: "Ravind_Speed",
  SKILL_TRIPLE_IMPACT: "T_Impact_Hit",
  SKILL_AVALANCHE: "Avalanche_ArrowNum",
  SKILL_SHADOW_MASTER: "Shadow_Master_ShadowNum",
  SKILL_DIVINE_PIERCING: "Divine_Piercing_AttackNum",
};
export function skillAttackProfile(skill, rule, level, stats, equipment = {}, spiritPercent = 0) {
  const tables = rule?.tables ?? {};
  const value = (key) => at(tables[key], level);
  const profile = {
    hitCount: 1,
    power: rule?.damagePercent
      ? 1 + at(rule.damagePercent, level) / 100
      : 1 + skill.tier * 0.25 + level * 0.12,
    magic: [7, 8, 10].includes(skill.job),
    element: [7, 8, 10].includes(skill.job) ? skill.publicVisual?.el : undefined,
    source: rule?.damagePercent ? "classic-public-source" : "freeston-fallback",
    attackRatingPercent: value(rating[skill.code]) ?? 0,
    criticalBonus: value(critical[skill.code]) ?? 0,
  };
  const mechanicalTable = {
    SKILL_SPARK: "Spark_Damage",
    SKILL_IMPULSION: "Impulsion_LightingDamage",
  }[skill.code];
  const mechanicalRange = value(mechanicalTable);
  if (Array.isArray(mechanicalRange) && mechanicalRange.length === 2) {
    profile.damageRange = mechanicalRange.map(
      (n) => n + (skill.code === "SKILL_SPARK" ? Math.trunc((stats.level ?? 1) / 5) : 0),
    );
    profile.power = 1;
    profile.magic = true;
    profile.element = "lightning";
    profile.source = "classic-public-source";
    return profile;
  }
  if (skill.code === "SKILL_ARROW_OF_RAGE" && value("A_Rage_Damage") > 0) {
    profile.power = 1;
    profile.flatDamage = Math.trunc((stats.level ?? 1) / value("A_Rage_Damage"));
    profile.source = "classic-public-source";
  }
  const spell = spells[skill.code];
  const range = spell && value(spell[0]);
  if (Array.isArray(range) && range.length === 2) {
    const [, element, levelDiv, spiritMin, spiritMax, weaponDiv] = spell;
    profile.magic = true;
    profile.element = element;
    profile.power = 1;
    profile.source = "classic-public-source";
    profile.hitCount = 1;
    profile.damageRange = range.map(
      (base, i) =>
        Math.trunc(base * (1 + (skill.job === 7 ? spiritPercent : 0) / 100)) +
        (levelDiv ? Math.trunc((stats.level ?? 1) / levelDiv) : 0) +
        Math.trunc((stats.spi ?? 0) / (i ? spiritMax : spiritMin)) +
        (weaponDiv ? Math.trunc((equipment.weapon?.damage?.[i] ?? 0) / weaponDiv) : 0),
    );
    if (skill.code === "SKILL_MULTISPARK") profile.power = value("M_Spark_Num") ?? 1;
    return profile;
  }
  if (skill.code === "SKILL_PERFECT_AIM") {
    profile.power = 1;
    profile.flatDamage =
      (value("Perfect_Aim_Damage") ?? 0) +
      Math.trunc((stats.level ?? 1) / (value("Perfect_Aim_Damage_LV") ?? 1));
    profile.source = "classic-public-source";
  }
  if (skill.code === "SKILL_BRUTAL_SWING") profile.criticalPercent = value("B_Swing_Critical") ?? 0;
  if (skill.code === "SKILL_AVALANCHE") profile.criticalScale = 0.5;
  const hitCount = at(rule?.hitCount, level) ?? value(repeats[skill.code]);
  if (Number.isFinite(hitCount)) profile.hitCount = Math.max(1, Math.min(10, Math.trunc(hitCount)));
  if (skill.code === "SKILL_SPLIT_JAVELIN") {
    profile.power *= value("Split_Javelin_AttackNum") ?? 1;
    profile.noCritical = true;
    profile.hitCount = 1;
  }
  return profile;
}

// The tooltip and combat must describe the same evaluated per-level profile.
// Raw percentage tables alone omit spell ranges, fixed additions and repeats.
export function skillAttackRows(current, next) {
  const rows = [];
  const pair = (label, field, format, show = true) => {
    if (!show) return;
    rows.push({ label, cur: format(current[field] ?? 0), next: format(next[field] ?? 0) });
  };
  if (current.damageRange && next.damageRange) {
    rows.push({
      label: "Dano da habilidade",
      cur: current.damageRange.map((n) => Math.floor(n * current.power)).join("–"),
      next: next.damageRange.map((n) => Math.floor(n * next.power)).join("–"),
    });
  } else if (current.power !== 1 || next.power !== 1) {
    const bonus = (value) => `${Math.round((value - 1) * 10000) / 100}%`;
    pair("Bônus no dano", "power", bonus);
  }
  pair("Ataque adicional", "flatDamage", (n) => `+${n}`,
       current.flatDamage !== undefined || next.flatDamage !== undefined);
  pair("No. de acertos", "hitCount", String, current.hitCount > 1 || next.hitCount > 1);
  pair("Taxa de ataque", "attackRatingPercent", (n) => `+${n}%`,
       !!(current.attackRatingPercent || next.attackRatingPercent));
  pair("Crítico adicional", "criticalBonus", (n) => `+${n}%`,
       !!(current.criticalBonus || next.criticalBonus));
  pair("Bônus no crítico", "criticalPercent", (n) => `+${n}%`,
       !!(current.criticalPercent || next.criticalPercent));
  return rows;
}
// Native event frames place strikes visually, but do not prove the number of
// damaging hits. Only counts recovered from skill tables enable multiple hits.
export function skillHitTimes(profile, timing) {
  const events = timing.hits?.filter((n) => Number.isFinite(n) && n >= 0) ?? [];
  const base = events.length ? events : [timing.duration * 0.5];
  if (!profile.hitCount) return base;
  const count = Math.max(1, Math.min(10, Math.floor(profile.hitCount)));
  if (count === base.length) return base;
  if (count === 1) return [base[0]];
  const first = base[0],
    last = base.length > 1 ? base.at(-1) : Math.max(first, timing.duration * 0.85);
  return Array.from({ length: count }, (_, i) => first + ((last - first) * i) / (count - 1));
}

const areas = {
  SKILL_FIRE_BALL: "FireBall_Area",
  SKILL_WATORNADO: "Watornado_Area",
  SKILL_M_METEO: "Meteo_Area",
  SKILL_DIASTROPHISM: "Diastrophism_Area",
  SKILL_FLAME_WAVE: "Flame_Wave_Area",
  SKILL_GLACIAL_SPIKE: "Glacial_Spike_Area",
  SKILL_MECHANIC_BOMB: "Mechanic_Bomb_Attack_Range",
  SKILL_SPARK: "Spark_Area",
  SKILL_IMPULSION: "Impulsion_Range",
  SKILL_ARROW_OF_RAGE: "A_Rage_Area",
  SKILL_BOMB_SHOT: "BombShot_Area",
  SKILL_CYCLONE_STRIKE: "Cyclone_Strike_Area",
  SKILL_TORNADO: "Tornado_Range",
  SKILL_BRANDISH: "Brandish_Range",
  SKILL_SWORD_OF_JUSTICE: "Sword_Of_Justice_Area",
  SKILL_X_RAGE: "X_Rage_Area",
};
export function skillAreaProfile(skill, rule, level) {
  const tables = rule?.tables ?? {};
  const area = { radius: at(tables[areas[skill.code]], level) ?? 0 };
  if (skill.code === "SKILL_CHAIN_LIGHTNING") {
    area.chainRange = at(tables.Chain_Lightning_Range, level) ?? 0;
    area.targetLimit = at(tables.Chain_Lightning_Num, level) ?? 1;
  }
  // The public classic code provides Divine Lightning's target count but no
  // independent radius table. Preserve the existing local 500-unit reach.
  if (skill.code === "SKILL_DIVINE_LIGHTNING") {
    area.radius = 500;
    area.targetLimit = at(tables.Divine_Lightning_Num, level) ?? 1;
    area.radiusSource = "freeston-existing-reach";
  }
  return area;
}
export function selectSplashTargets(area, primary, all) {
  const living = [...all].filter((m) => m.hp > 0 && !m.owner);
  const limit = area.targetLimit ?? living.length;
  const result = [primary];
  if (area.chainRange) {
    let from = primary;
    while (result.length < limit) {
      const next = living
        .filter(
          (m) => !result.includes(m) && Math.hypot(m.x - from.x, m.z - from.z) <= area.chainRange,
        )
        .sort(
          (a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z),
        )[0];
      if (!next) break;
      result.push(next);
      from = next;
    }
  } else if (area.radius > 0) {
    result.push(
      ...living
        .filter(
          (m) => m.id !== primary.id && Math.hypot(m.x - primary.x, m.z - primary.z) <= area.radius,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - primary.x, a.z - primary.z) -
            Math.hypot(b.x - primary.x, b.z - primary.z),
        )
        .slice(0, Math.max(0, limit - 1)),
    );
  }
  return result;
}

export function skillHealingRange(skill, rule, level, stats, equipment = {}) {
  const key =
    skill.code === "SKILL_HEALING"
      ? "Healing_Heal"
      : skill.code === "SKILL_GRAND_HEALING"
        ? "Grand_Healing"
        : null;
  const base = key && at(rule?.tables?.[key], level);
  if (!Array.isArray(base)) return null;
  return base.map(
    (n, i) =>
      n +
      Math.trunc((equipment.weapon?.damage?.[i] ?? 0) / 3) +
      Math.trunc((stats.spi ?? 0) / (i ? 6 : 8)),
  );
}

