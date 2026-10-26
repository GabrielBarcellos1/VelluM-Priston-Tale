// Named effects from the pinned classic tables; later classes use explicit local rules.
export function emptyEffects() {
  return {
    damage: 0,
    damageMax: 0,
    weaponDamage: 0,
    weaponDamageMax: 0,
    weaponRatingPercent: 0,
    armorDefensePercent: 0,
    damageFlat: 0,
    hp: 0,
    hpPercent: 0,
    mp: 0,
    mpPercent: 0,
    spPercent: 0,
    defense: 0,
    defensePercent: 0,
    absorb: 0,
    absorbPercent: 0,
    block: 0,
    evade: 0,
    critical: 0,
    attackRating: 0,
    attackRatingPercent: 0,
    attackSpeed: 0,
    attackSpeedPercent: 0,
    regen: 0,
    hpRegen: 0,
    magicPowerPercent: 0,
    stealth: 0,
    reflection: 0,
    retaliationFlat: 0,
    manaShield: 0,
    undeadDamage: 0,
    undeadAbsorb: 0,
    elementalDamage: { fire: 0, ice: 0, lightning: 0 },
    resist: { bio: 0, poison: 0, fire: 0, lightning: 0, ice: 0 },
  };
}
const mappings = {
  SKILL_MELEE_MASTERY: [["weaponDamage", "Melee_Mastery_DamagePercent", 0.01]],
  SKILL_FIRE_ATTRIBUTE: [["resist.fire", "PlusFire"]],
  SKILL_POISON_ATTRIBUTE: [["resist.poison", "PlusPoison"]],
  SKILL_ICE_ATTRIBUTE: [["resist.ice", "PlusIce"]],
  SKILL_BOOST_HEALTH: [["hp", "Boost_Health_Life"]],
  SKILL_CONCENTRATION: [["attackRating", "Concentration_AttackRate"]],
  SKILL_SWIFT_AXE: [["attackSpeedPercent", "Swift_Axe_Speed"]],
  SKILL_BERSERKER: [
    ["damageFlat", "Berserker_AddAttack"],
    ["absorb", "Berserker_SubAbsorb", -1],
  ],
  SKILL_EXTREME_SHIELD: [["block", "E_Shield_BlockRate"]],
  SKILL_PHYSICAL_ABSORB: [["absorb", "P_Absorb"]],
  SKILL_MAXIMIZE: [["weaponDamageMax", "Maximize_Damage", 0.01]],
  SKILL_AUTOMATION: [
    ["weaponDamage", "Automation_Damage", 0.01],
    ["attackSpeed", "Automation_Speed"],
  ],
  SKILL_METAL_ARMOR: [["armorDefensePercent", "Metal_Armor_Defense"]],
  SKILL_MECHANIC_WEAPON: [["weaponDamage", "M_Weapon_Mastey", 0.01]],
  SKILL_SPARK_SHIELD: [
    ["defense", "Spark_Shield_Defense"],
    ["retaliationFlat", "Spark_Shield_Damage"],
  ],
  SKILL_SHOOTING_MASTERY: [["weaponDamage", "S_Mastery_DamagePercent", 0.01]],
  SKILL_DIONS_EYE: [["weaponRatingPercent", "D_Eye_Attack_Rate"]],
  SKILL_EVASION_MASTERY: [["evade", "Evasion_Mastery_AddPercent"]],
  SKILL_FORCE_OF_NATURE: [
    ["damageFlat", "Force_Of_Nature_AddDamage"],
    ["attackRating", "Force_Of_Nature_AddHit"],
  ],
  SKILL_VANISH: [["damage", "Vanish_Damage", 0.01]],
  SKILL_CRITICAL_MASTERY: [["critical", "Critical_Mastery_Critical"]],
  SKILL_WEAPONE_DEFENCE_MASTERY: [["block", "W_D_Mastery_Block"]],
  SKILL_VAGUE: [["evade", "Vague_EvasionPercent"]],
  SKILL_THROWING_MASTERY: [["weaponDamage", "T_Mastery_Damage", 0.01]],
  SKILL_WINDY: [["weaponRatingPercent", "Windy_Attack_Rating"]],
  SKILL_TRIUMPH_OF_VALHALLA: [["damageFlat", "T_Of_Valhalla_Damage"]],
  SKILL_HALL_OF_VALHALLA: [["evade", "Hall_Of_Valhalla_AddEvation"]],
  SKILL_FROST_JAVELIN: [["elemental.ice", "Frost_Javelin_IceAddDamage"]],
  SKILL_HOLY_BODY: [["undeadAbsorb", "HolyBody_Absorb"]],
  SKILL_PHYSICAL_TRANING: [["spPercent", "P_Traning_Stamina"]],
  SKILL_HOLY_VALOR: [["undeadDamage", "Holy_Valor_Damage"]],
  SKILL_DRASTIC_SPIRIT: [["defensePercent", "Drastic_Spirit_Defense"]],
  SKILL_SWORD_MASTERY: [["weaponDamage", "Sword_Mastery_DamagePercent", 0.01]],
  SKILL_DIVINE_INHALATION: [["block", "D_Inhalation_Block"]],
  SKILL_GODLY_SHIELD: [["absorbPercent", "Godly_Shield_AbsorbPercent"]],
  SKILL_GOD_BLESS: [["damageFlat", "God_Bless_AddDamage"]],
  SKILL_ZENITH: [["resist.all", "Zenith_Element"]],
  SKILL_MENTAL_MASTERY: [["mpPercent", "Mental_Mastery_Mana"]],
  SKILL_MEDITATION: [["regen", "Meditation_Regen"]],
  SKILL_ENERGY_SHIELD: [["manaShield", "Energy_Shield_DecDamage"]],
  SKILL_HOLY_REFLECTION: [["reflection", "Holy_Reflection_Return_Damage"]],
  SKILL_VIRTUAL_LIFE: [["hpPercent", "Virtual_Life_Percent"]],
};
// Explicit local effects for jobs absent from the classic source; never official figures.
const local = {
  SKILL_DUALSWORDMASTERY: ["damage", 0.02],
  SKILL_ATTACK_MASTERY: ["damage", 0.02],
  SKILL_FATAL_MASTERY: ["critical", 1],
  SKILL_ALAS: ["evade", 2],
  SKILL_INPES: ["attackSpeedPercent", 2],
  SKILL_BLIND: ["damage", 0.03],
  SKILL_INNER_PEACE: ["mpPercent", 3],
  SKILL_CHASING_HUNT: ["attackRatingPercent", 3],
  SKILL_RAIN_MAKER: ["absorbPercent", 2],
  SKILL_STRENGTH_MASTERY: ["damage", 0.02],
  SKILL_STAMINA_MASTERY: ["spPercent", 3],
  SKILL_RAGE_UP: ["damage", 0.03],
  SKILL_INSTANT_BULK_UP: ["hpPercent", 3],
  SKILL_STEELERS: ["absorbPercent", 2],
};
const families = {
  SKILL_SWIFT_AXE: ["WA1"],
  SKILL_SHOOTING_MASTERY: ["WS1"],
  SKILL_THROWING_MASTERY: ["WT1"],
  SKILL_SWORD_MASTERY: ["WS2"],
  SKILL_AUTOMATION: ["WS1", "WT1"],
  SKILL_MELEE_MASTERY: ["WA1", "WC1", "WH1", "WP1", "WS2"],
  SKILL_WINDY: ["WT1"],
  SKILL_DIONS_EYE: ["WS1"],
  SKILL_WEAPONE_DEFENCE_MASTERY: ["WP1"],
};
const shields = new Set([
  "SKILL_EXTREME_SHIELD",
  "SKILL_SPARK_SHIELD",
  "SKILL_DIVINE_INHALATION",
  "SKILL_GODLY_SHIELD",
]);
export function effectFor(skill, level, rules, equipment = null) {
  const out = emptyEffects(),
    rule = rules?.skills?.[skill.code],
    n = Math.max(0, Math.min(9, level - 1));
  if (!level) return out;
  if (equipment) {
    if (families[skill.code] && !families[skill.code].includes(equipment.weapon?.code?.slice(0, 3)))
      return out;
    if (shields.has(skill.code) && !equipment.shield) return out;
    if (skill.code === "SKILL_WEAPONE_DEFENCE_MASTERY" && equipment.shield) return out;
    if (skill.code === "SKILL_METAL_ARMOR" && equipment.armor?.spec !== skill.job) return out;
    if (skill.code === "SKILL_MECHANIC_WEAPON" && equipment.weapon?.spec !== skill.job) return out;
  }
  if (rule?.runtime) return sumEffects([rule.runtime.effects[n]]);
  for (const [field, key, scale = 1] of mappings[skill.code] ?? []) {
    let value = rule?.tables?.[key]?.[n];
    if (Array.isArray(value)) value = (value[0] + value[1]) / 2;
    if (!Number.isFinite(value)) continue;
    if (field.startsWith("elemental.")) out.elementalDamage[field.slice(10)] += value * scale;
    else if (field.startsWith("resist.")) {
      const type = field.slice(7);
      for (const k of type === "all" ? Object.keys(out.resist) : [type])
        out.resist[k] += value * scale;
    } else out[field] += value * scale;
  }
  if (skill.code === "SKILL_ENCHANT_WEAPON") {
    const element = ["fire", "ice", "lightning"].includes(skill.enchantElement)
      ? skill.enchantElement
      : "fire";
    const key = { fire: "Fire", ice: "Ice", lightning: "Lightning" }[element];
    const pair = rule?.tables?.["Enchant_Weapon_Damage_" + key]?.[n];
    if (Array.isArray(pair)) out.elementalDamage[element] = (pair[0] + pair[1]) / 2;
  }
  if (local[skill.code]) {
    const [key, perLevel] = local[skill.code];
    out[key] += level * perLevel;
  }
  return out;
}
export function sumEffects(effects) {
  const out = emptyEffects();
  for (const e of effects)
    for (const [k, v] of Object.entries(e)) {
      if (k === "resist" || k === "elementalDamage")
        for (const [type, amount] of Object.entries(v)) out[k][type] += amount;
      else out[k] += v;
    }
  return out;
}
export function effectRows(effect) {
  const names = {
    damage: "Poder de ataque",
    damageMax: "Ataque máximo",
    damageFlat: "Ataque adicional",
    weaponDamage: "Dano da arma",
    weaponDamageMax: "Dano máximo da arma",
    weaponRatingPercent: "Taxa de ataque da arma",
    armorDefensePercent: "Defesa da armadura",
    defense: "Defesa adicional",
    hp: "HP adicional",
    hpPercent: "HP máximo",
    mpPercent: "MP máximo",
    spPercent: "RES máxima",
    defensePercent: "Defesa",
    absorb: "Absorção",
    absorbPercent: "Redução de dano",
    block: "Bloqueio",
    evade: "Esquiva",
    critical: "Crítico",
    attackRating: "Taxa de ataque",
    attackRatingPercent: "Taxa de ataque",
    attackSpeed: "Velocidade da arma",
    attackSpeedPercent: "Velocidade de ataque",
    regen: "Regeneração de MP",
    hpRegen: "Regeneração de HP",
    magicPowerPercent: "Poder mágico",
    stealth: "Ocultação",
    reflection: "Reflexão em mortos-vivos",
    retaliationFlat: "Retaliação elétrica",
    manaShield: "Escudo de mana",
    undeadDamage: "Dano em mortos-vivos",
    undeadAbsorb: "Proteção contra mortos-vivos",
  };
  const fraction = new Set(["damage", "damageMax", "weaponDamage", "weaponDamageMax"]);
  const percent = new Set([
    "weaponRatingPercent",
    "armorDefensePercent",
    "hpPercent",
    "mpPercent",
    "spPercent",
    "defensePercent",
    "absorbPercent",
    "block",
    "evade",
    "critical",
    "attackRatingPercent",
    "attackSpeedPercent",
    "reflection",
    "manaShield",
    "undeadDamage",
    "undeadAbsorb",
    "magicPowerPercent",
  ]);
  const rows = [];
  for (const [k, v] of Object.entries(effect)) {
    if (k === "elementalDamage") {
      for (const [t, a] of Object.entries(v))
        if (a)
          rows.push({
            label: `Dano de ${{ fire: "fogo", ice: "gelo", lightning: "raio" }[t]}`,
            cur: `+${a}`,
          });
    } else if (k === "resist") {
      for (const [t, a] of Object.entries(v))
        if (a)
          rows.push({
            label: `Resistência a ${{ fire: "fogo", ice: "gelo", lightning: "raio", poison: "veneno", bio: "orgânico" }[t]}`,
            cur: `+${a}`,
          });
    } else if (v && names[k])
      rows.push({
        label: names[k],
        cur: `${v > 0 ? "+" : ""}${Math.round((fraction.has(k) ? v * 100 : v) * 100) / 100}${fraction.has(k) || percent.has(k) ? "%" : ""}`,
      });
  }
  return rows;
}
