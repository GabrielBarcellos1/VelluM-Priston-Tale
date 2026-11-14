// Admin-only endgame loadout selection, using only the real item catalog.
// The two-handed weapon belongs to equipment set A; one-hand + shield to B.
const PREFERENCES = Object.freeze({
  1: ["WA1", "WC1"],  // Mechanician: axe + claw
  2: ["WH1", "WC1"],  // Fighter: hammer + claw
  3: ["WS1", "WC1"],  // Archer: bow + claw
  4: ["WP1", "WM1"],  // Pikeman: scythe + staff
  5: ["WT1", "WT1"],  // Atalanta: javelin + shield, secondary two-hander
  6: ["WS2", "WS2"],  // Knight: two-handed sword + one-handed sword
  7: ["WM1", "WM1"],  // Magician: staff / wand
  8: ["WM1", "WM1"],  // Priestess: staff / wand
  9: ["WD1", "WC1"],  // Assassin: dagger + claw
  10: ["WN1", "WN1"], // Shaman: phantom
  11: ["WV1", "WC1"], // Fighter class with fists: vambrace + claw
});
const ordering=(a,b)=> (b.req?.level??0)-(a.req?.level??0)
  || (b.damage?.[3]??b.defense?.[1]??b.price??0)-(a.damage?.[3]??a.defense?.[1]??a.price??0);
export function selectEndgameKit(definitions, job, starterCode, maxLevel=150) {
  const items=[...definitions.values()];
  const best=(slot,prefix=null)=>items.filter(d=>
    d.slot===slot && (prefix===null || d.code.startsWith(prefix)) &&
    Number.isFinite(d.req?.level) && d.req.level>0 && d.req.level<=maxLevel
  ).sort(ordering)[0]??null;
  const [primary,alternate]=PREFERENCES[job]??[String(starterCode??"").slice(0,3),"WC1"];
  let twoHand=best("WEAPON_TWO",primary);
  let oneHand=best("WEAPON_ONE",alternate);
  if (!twoHand) twoHand=best("WEAPON_TWO",primary==="WT1"?"WS1":primary==="WN1"?"WM1":"WS2");
  if (!oneHand) oneHand=best("WEAPON_ONE",primary)??best("WEAPON_ONE","WC1")??best("WEAPON_ONE","WM1");
  if(!twoHand||!oneHand)throw Error("Catálogo incompleto: falta arma de uma ou duas mãos para o kit.");
  const shield=best("SHIELDS");
  if(!shield)throw Error("Nenhum escudo disponível para o kit.");
  const armor=best("ARMOR",[7,8,10].includes(job)?"DA2":"DA1")??best("ARMOR");
  const equipment={
    weapon:twoHand,
    armor,
    // Mokova is the required final kit boot, not an optional inventory extra.
    boots:definitions.get("DB130")??best("BOOTS"),
    gloves:best("GLOVES"),
    bracelets:best("ARMLET"),
    amulet:best("AMULET"),
    ring1:definitions.get("OR205")??best("RING"),
    ring2:definitions.get("OR205")??best("RING"),
    sheltom:best("SHELTOM"),
  };
  const secondary={weapon:oneHand,shield};
  const extras=["BI139","BI140","BI141"].map(c=>definitions.get(c)).filter(Boolean);
  return {equipment,secondary,extras};
}
