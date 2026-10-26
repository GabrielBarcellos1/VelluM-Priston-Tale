import {readFile,writeFile}from'node:fs/promises';
import {catalog,items,monsters,buildCharacter,rotation,expectedIncoming,median}from'./simulate-balance.mjs';
import {balanceMonster,classDamageScale}from'../balance-rules.mjs';
const path=process.argv[2],report=JSON.parse(await readFile(path,'utf8')),rules=JSON.parse(await readFile(new URL('../data/balance.json',import.meta.url),'utf8'));
const drops=JSON.parse(await readFile(new URL('../data/drops.json',import.meta.url),'utf8'));
const excluded=new Set(Object.values(drops.bosses).flat().map(d=>d.code));
const avg=a=>a.reduce((n,v)=>n+v,0)/Math.max(1,a.length);
const slots=new Set(['WEAPON_ONE','WEAPON_TWO','ARMOR','BOOTS','GLOVES','ARMLET','SHIELDS','AMULET','RING','SHELTOM']);
report.economy.scenarios=[20,40,60,80,100,110,120].map(level=>{
 const rows=report.levels.find(r=>r.level===level).classes;
 const pool=items.filter(i=>slots.has(i.slot)&&!excluded.has(i.code)&&i.family!=='OR2'&&(i.req?.level??0)<=level&&(i.req?.level??0)>=Math.max(0,level-20)&&i.price>0&&!/\(|costume|event|halloween|christmas/i.test(i.name));
 const averageSale=avg(pool.map(i=>Math.floor(i.price/5))),killsHour=median(rows.map(c=>3600/c.cycleSeconds));
 const tier=level>=80?'104':level>=40?'103':level>=20?'102':'101';
 const price=prefix=>rules.potionPrices?.[prefix+tier]??items.find(i=>i.code===prefix+tier)?.price??0;
 const cost=median(rows.map(c=>c.lifePotionsPerHour*price('PL')+c.mpPotionsPerHour*price('PM')+c.spPotionsPerHour*price('PS')));
 const income=killsHour*(level*3+.05*averageSale);
 return {level,killsPerHour:killsHour,rawGoldPerHour:killsHour*level*3,estimatedSaleIncomePerHour:killsHour*.05*averageSale,grossGoldPerHour:income,consumablesGoldPerHour:cost,netBeforeRepairsTrainingAging:income-cost,medianEquipmentCost:median(rows.map(c=>c.equipmentCost)),assumesAllDropsSold:true};
});
const builds=new Map();report.monsterAudit=[];
for(const monster of monsters){const level=Math.min(120,Math.max(1,monster.level)),tuned=balanceMonster(monster,rules);
 const classes=catalog.classes.map(cls=>{
  const key=cls.job+':'+level;if(!builds.has(key))builds.set(key,buildCharacter(cls.job,level));const build=builds.get(key);
  const r=rotation(build,tuned,classDamageScale(cls.job,level,rules)),incoming=expectedIncoming(tuned,build.stats,true);
  return{job:cls.job,dps:r.dps,secondsToKill:tuned.hp/Math.max(.001,r.dps),secondsToDieWithoutHealing:incoming?build.stats.hpMax/incoming:null};
 });
 report.monsterAudit.push({id:monster.id,name:monster.name,level:monster.level,playerReferenceLevel:level,boss:!!monster.boss,combatObject:monster.attack.every(n=>n===0),originalHP:monster.hp,adjustedHP:tuned.hp,adjustedAttack:tuned.attack,classes});
}
report.totals.monsterScenarios=report.monsterAudit.length*11;
report.assumptions.combat+='; active healing, mana shield consumption, reflect, sustained controls and kiting are not simulated; unhealed survival is a conservative reference, not a PvE win probability';
await writeFile(path,JSON.stringify(report,null,2));
console.log(JSON.stringify({monsterScenarios:report.totals.monsterScenarios,economy:report.economy.scenarios.map(r=>({level:r.level,net:Math.round(r.netBeforeRepairsTrainingAging)}))}));
