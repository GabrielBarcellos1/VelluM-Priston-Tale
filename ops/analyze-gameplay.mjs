import {readFile,writeFile} from 'node:fs/promises';
import {catalog,items,monsters,median,simulateLevel,buildCharacter,rotation} from './simulate-balance.mjs';
import {experienceSpan,killExperience,classDamageScale,duelDamage} from '../balance-rules.mjs';
import {objectiveImplemented} from '../quest-progress.mjs';
const rules=JSON.parse(await readFile(new URL('../data/balance.json',import.meta.url),'utf8'));
const before=JSON.parse(await readFile(new URL('../audit/balance-v24-baseline.json',import.meta.url),'utf8'));
function oldTTK(job,level){const rows=before.levels;if(level<=rows[0].level)return rows[0].classes.find(c=>c.job===job).ttk;for(let i=1;i<rows.length;i++)if(level<=rows[i].level){const a=rows[i-1],b=rows[i],x=a.classes.find(c=>c.job===job).ttk,y=b.classes.find(c=>c.job===job).ttk;return x+(y-x)*(level-a.level)/(b.level-a.level);}return rows.at(-1).classes.find(c=>c.job===job).ttk;}
const levels=[];
for(let level=1;level<=120;level++){
 const classes=simulateLevel(level,rules).map(c=>{
  const cycle=(c.ttk+4)*1.2,xp=median(c.monsters.map(m=>killExperience({level:m.monsterLevel},level,rules)));
  const rawTimes=c.monsters.map(m=>monsters.find(o=>o.name===m.monster).hp/(m.dps/classDamageScale(c.job,level,rules)));
  const oldCycle=(oldTTK(c.job,level)+4)*1.2;
  const aoe=median(c.monsters.map(m=>m.aoeShare)),mixedCycle=(c.ttk/(1+.6*aoe)+4)*1.2;
  const incoming=median(c.monsters.map(m=>m.incomingDps)),lifeEffective=Math.min(1500,c.build.stats.hpMax);
  return {job:c.job,className:c.className,level,dps:c.dps,ttk:c.ttk,unhealedSurvivalSeconds:c.secondsToDie,
   cycleSeconds:cycle,xpPerKill:xp,xpNeeded:experienceSpan(level,rules),soloHours:experienceSpan(level,rules)/xp*cycle/3600,
   mixedHours:experienceSpan(level,rules)/xp*mixedCycle/3600,oldHours:(2*level-1)*100/(median(c.monsters.map(m=>m.monsterLevel))*8)*oldCycle/3600,
   mpPotionsPerHour:c.mpPotionsPerHour,spPotionsPerHour:c.spPotionsPerHour,lifePotionsPerHour:incoming*3600/Math.max(1,lifeEffective),
   equipmentCost:c.build.equipmentCost,weapon:c.build.gear.weapon?.code,armor:c.build.gear.armor?.code,
   stats:{hp:c.build.stats.hpMax,mp:c.build.stats.mpMax,damage:[c.build.stats.damageMin,c.build.stats.damageMax],defense:c.build.stats.defense,absorb:c.build.stats.absorb,block:c.build.stats.block,evade:c.build.stats.evade},
   skillPointsUsed:Object.entries(c.build.learned).reduce((n,[,v])=>n+v,0),monsters:c.monsters.map(m=>({name:m.monster,level:m.monsterLevel,hp:m.monsterHP,ttk:m.ttk,dps:m.dps,survival:m.secondsToDie}))};
 });
 levels.push({level,classes});
 if(level%20===0)console.log('Analyzed level '+level);
}
const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
const bands=rules.bands.map(b=>{const times=catalog.classes.map(cls=>{
 const rows=levels.filter(l=>l.level>=b.from&&l.level<b.to).map(l=>l.classes.find(c=>c.job===cls.job));
 return {job:cls.job,className:cls.name,hours:rows.reduce((n,r)=>n+r.soloHours,0),mixedHours:rows.reduce((n,r)=>n+r.mixedHours,0),oldHours:rows.reduce((n,r)=>n+r.oldHours,0)};});
 return {...b,targetHours:b.hours,meanHours:mean(times.map(t=>t.hours)),minHours:Math.min(...times.map(t=>t.hours)),maxHours:Math.max(...times.map(t=>t.hours)),mixedMeanHours:mean(times.map(t=>t.mixedHours)),oldMeanHours:mean(times.map(t=>t.oldHours)),classes:times};});
const duels=[];
for(const level of [20,40,60,80,100,110,120])for(const attackerClass of catalog.classes)for(const defenderClass of catalog.classes){
 const a=buildCharacter(attackerClass.job,level),d=buildCharacter(defenderClass.job,level);
 const raw=rotation(a,d.stats,1,120,true),defenseFactor=duelDamage(1000,a.stats,{...d.stats,hpMax:1e9},rules)/1000;
 const dps=raw.dps*defenseFactor;
 duels.push({level,attacker:a.job,defender:d.job,rawDps:raw.dps,proposedDps:dps,noHealTTK:d.stats.hpMax/Math.max(.001,dps),rawBurst:raw.burst,proposedBurst:duelDamage(raw.burst,a.stats,d.stats,rules),defenderHP:d.stats.hpMax});
}
const questData=JSON.parse(await readFile(new URL('../data/quests.json',import.meta.url),'utf8')).quests;
const supported=new Set(['talk','ui','reach','kill','use']);
const questAudit={total:questData.length,allObjectivesRecognizedBefore:questData.filter(q=>q.steps.every(s=>supported.has(s.type))).length,
 allObjectivesRecognizedAfter:questData.filter(q=>q.steps.every(s=>objectiveImplemented(q,s))).length,
 objectiveTypes:Object.fromEntries([...new Set(questData.flatMap(q=>q.steps.map(s=>s.type)))].map(t=>[t,questData.filter(q=>q.steps.some(s=>s.type===t)).length])),
 unsupported:questData.filter(q=>q.steps.some(s=>!objectiveImplemented(q,s))).map(q=>({id:q.id,types:[...new Set(q.steps.filter(s=>!objectiveImplemented(q,s)).map(s=>s.type))]}))};
const result={schema:'vellum-gameplay-audit/v1',configuration:rules.name,simulationOnly:true,
 assumptions:{gear:'ordinary +0, average rolls, no paid premium, full level-qualified set; acquisition time not simulated',skills:'legal points, all prerequisites, damage-first allocation; active buffs maintained without uptime loss',combat:'stationary, single normal monster near player level; 1.8s monster attack, physical animation 80/attackStep, spells one second',time:'4 sec travel per kill +20% downtime; MP/SP potions at most one per 8 sec; no quests, AoE or paid XP in solo baseline',mixed:'sensitivity with one partial additional area target; no quest bonus',pvp:'847 ordered analytical matchups, stationary 120s rotation; no healing, potions, movement, target line of sight, stun rotation, network latency or human decisions. Not win probabilities; not enabled in the game.'},
 totals:{soloMeanHours:bands.reduce((n,b)=>n+b.meanHours,0),mixedMeanHours:bands.reduce((n,b)=>n+b.mixedMeanHours,0),oldMeanHours:bands.reduce((n,b)=>n+b.oldMeanHours,0),classes:11,builds:levels.length*11,pvpMatchups:duels.length},bands,levels,duels,questAudit,
 economy:{potionPrices:items.filter(i=>['PL104','PM104','PS104'].includes(i.code)).map(i=>({code:i.code,price:i.price})),goldPerNormalKill:'monster.level * 3, existing server rule; no arbitrary gold increase',equipmentChance:'5% default; actual live administrator overrides must be inspected',warning:'Full equipment is a reference assumption, not a grant. Picking up and selling drops, potion over-heal, repairs, training, deaths and aging change the result.'}};
await writeFile(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify({totals:result.totals,bands:bands.map(b=>({from:b.from,to:b.to,target:b.targetHours,mean:b.meanHours,min:b.minHours,max:b.maxHours})),questAudit:{total:questAudit.total,supported:questAudit.allObjectivesRecognizedBefore}}));
