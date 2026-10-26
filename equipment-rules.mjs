const slots = {
  costume: ["COSTUME"],
  weapon: ["WEAPON_ONE", "WEAPON_TWO"],
  armor: ["ARMOR"],
  shield: ["SHIELDS"],
  boots: ["BOOTS"],
  gloves: ["GLOVES"],
  bracelets: ["ARMLET"],
  amulet: ["AMULET"],
  ring1: ["RING"],
  ring2: ["RING"],
  sheltom: ["SHELTOM"],
};
export function equipmentError(item, slot, stats, equipment, classCheck) {
  if (!Object.hasOwn(slots, slot) || !slots[slot].includes(item.slot))
    return "Esse item não pertence a esse espaço de equipamento.";
  const incompatible = classCheck?.(stats.job, item.code);
  if (incompatible) return incompatible;
  for (const [attribute, minimum] of Object.entries(item.req ?? {}))
    if (Number(stats[attribute] ?? 0) < minimum)
      return `Requisito insuficiente: ${attribute} ${minimum}.`;
  if (slot === "shield" && equipment.weapon?.slot === "WEAPON_TWO")
    return "Retire a arma de duas mãos antes de equipar o escudo.";
  return null;
}
