// VelluM authored progression and PvE tuning. All values come from data/balance.json.
export function interpolate(curve,level,key='value'){
 const n=Math.max(1,Number(level)||1);if(n<=curve[0].level)return curve[0][key];
 for(let i=1;i<curve.length;i++)if(n<=curve[i].level){const a=curve[i-1],b=curve[i];return a[key]+(b[key]-a[key])*(n-a.level)/(b.level-a.level);}
 return curve.at(-1)[key];
}
export function experienceFloor(level,rules){return rules.experience[Math.max(0,Math.min(rules.experience.length-1,Math.trunc(level)-1))];}
export function experienceSpan(level,rules){return experienceFloor(level+1,rules)-experienceFloor(level,rules);}
export function migrateExperience(stats,rules){
 if(stats.progressionVersion===rules.version)return false;
 const level=Math.max(1,Math.min(150,Math.trunc(stats.level)||1));
 const previousFloor=(level-1)**2*100,span=(2*level-1)*100;
 const fraction=Math.max(0,Math.min(.999999,((stats.exp??previousFloor)-previousFloor)/span));
 stats.exp=experienceFloor(level,rules)+Math.floor(experienceSpan(level,rules)*fraction);
 stats.progressionVersion=rules.version;return true;
}
export function killExperience(monster,playerLevel,rules,bonus=0,mapId=null){
 if(mapId!==null&&!mapExperienceAllowed(playerLevel,mapId,rules))return 0;
 if(monster.attack?.every(n=>n===0)&&!monster.boss)return 0;
 const excess=Math.max(0,playerLevel-monster.level-5),penalty=Math.max(.03,.86**excess);
 return Math.max(1,Math.floor(monster.level*8*penalty*(monster.boss?rules.bossExperienceMultiplier:1)*(1+Math.max(0,bonus)/100)));
}
export function classDamageScale(job,level,rules){return interpolate(rules.classes[String(job)].damageCurve,level);}
export function balanceMonster(original,rules){
 const normalHP=interpolate(rules.monsters,original.level,'health'),sourceHP=interpolate(rules.monsters,original.level,'sourceHealth');
 const ratio=original.boss?Math.max(12,Math.min(24,original.hp/sourceHP*12)):Math.max(.6,Math.min(2,original.hp/sourceHP));
 const scale=interpolate(rules.monsters,original.level,'attack');
 return {...original,hp:Math.max(1,Math.round(normalHP*ratio)),attack:original.attack.map(n=>Math.round(n*scale*(original.boss?1.15:1))),balanceVersion:rules.version};
}
export function defenseMitigation(defense,level,cap=.35){return Math.max(0,Math.min(cap,defense/(defense+200+Math.max(1,level)*18)));}
export function questExperienceReward(rewards,level,rules){
 if(Number.isFinite(rewards?.exp))return Math.max(0,Math.floor(rewards.exp));
 const capped=Math.max(1,Math.min(level,rewards?.expCapLevel??level));
 return Math.floor(experienceSpan(capped,rules)*Math.max(0,rewards?.expPct??0)/100);
}
export function potionCanUse(ready,kind,now,rules){return (ready[kind]??0)<=now;}
export function registerPotion(ready,kind,now,rules){ready[kind]=now+rules.potionCooldownSeconds;}
// Prospective duel rules, exercised by the laboratory only. No PvP network is enabled.
export function duelDamage(amount,attacker,defender,rules){
 const mitigation=defenseMitigation(defender.defense??0,attacker.level,rules.pvp.defenseCap);
 const protection=Math.max(0,Math.min(rules.pvp.damageReductionCap,defender.damageReduction??0))/100;
 return Math.max(1,Math.floor(Math.min(defender.hpMax*rules.pvp.maxHitFraction,amount*rules.pvp.damageScale*(1-mitigation)*(1-protection))));
}

export function mapExperienceRange(mapId,rules){
 const map=rules.maps?.find(m=>m.id===mapId);
 return {min:map?.experienceMin??1,max:map?.experienceMax??rules.maxLevel??150};
}
export function mapExperienceAllowed(level,mapId,rules){
 const band=mapExperienceRange(mapId,rules);return level>=band.min&&level<=band.max;
}
export function capKillExperience(amount,stats,mapId,rules){
 if(!mapExperienceAllowed(stats.level,mapId,rules))return 0;
 const {max}=mapExperienceRange(mapId,rules);
 const limit=max<rules.maxLevel?experienceFloor(max+1,rules):Number.MAX_SAFE_INTEGER;
 return Math.max(0,Math.min(Math.floor(amount),limit-(stats.exp??0)));
}
