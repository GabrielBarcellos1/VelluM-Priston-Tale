// Rebuild the authored calibration from the frozen baseline, never from player accounts.
import {readFile,writeFile} from 'node:fs/promises';
import {catalog,median,simulateLevel,representativeMonsters} from './simulate-balance.mjs';
import {balanceMonster,classDamageScale,experienceSpan} from '../balance-rules.mjs';
const input=process.argv[2];if(!input)throw Error('Pass the baseline JSON path');
const baseline=JSON.parse(await readFile(input,'utf8'));
const fields=JSON.parse(await readFile(new URL('../data/map-fields.json',import.meta.url),'utf8')).fields;
const populations=JSON.parse(await readFile(new URL('../data/map-spawns.json',import.meta.url),'utf8')).stages;
const bands=[{from:1,to:10,hours:.25},{from:10,to:20,hours:.5},{from:20,to:30,hours:.75},{from:30,to:40,hours:1},{from:40,to:50,hours:1.5},{from:50,to:60,hours:2},{from:60,to:70,hours:2.5},{from:70,to:80,hours:3.5},{from:80,to:90,hours:10},{from:90,to:100,hours:18},{from:100,to:110,hours:80},{from:110,to:120,hours:180}];
const roles={1:1.1,2:.95,3:1.05,4:1.1,5:1,6:.98,7:.95,8:.88,9:1.1,10:.94,11:1.06};
const desiredTTK={1:6,5:7,10:8,20:9,30:10,40:10,50:11,60:12,70:13,80:14,90:15,100:16,110:18,120:20};
const rules={version:1,name:'VelluM 300 active hours to 120',authored:true,maxLevel:150,analyzedThrough:120,
 targetHoursTo80:12,targetHoursTo100:40,targetHoursTo120:300,bands,experience:[],classes:{},monsters:[],bossExperienceMultiplier:12,potionCooldownSeconds:2,
 pvp:{enabled:false,status:'simulation-only',damageScale:.18,defenseCap:.35,damageReductionCap:50,maxHitFraction:.15},
 calibration:{method:'Class-role normalization, equal level ordinary gear, average rolls +0; median solo cycle, four seconds travel, 20% downtime, no paid premium or quests',baselineSource:'ops/simulate-balance.mjs',humanTelemetry:false}};
rules.maps=fields.map(f=>{const entries=[...(populations[f.stage]?.monsters??[])].sort((a,b)=>a.level-b.level),sum=entries.reduce((n,m)=>n+m.pct,0);let cumulative=0,recommended=1;for(const m of entries){cumulative+=m.pct;if(cumulative>=sum/2){recommended=m.level;break;}}return{id:f.id,name:f.name,recommended:f.village?1:recommended,minimum:f.village?1:Math.max(1,Math.floor((recommended-15)/5)*5)};});
rules.potionPrices=Object.fromEntries(Object.entries({PL:[5,15,30,100,100],PM:[10,25,50,200,600],PS:[5,15,30,100,100]}).flatMap(([prefix,prices])=>prices.map((price,i)=>[prefix+'10'+(i+1),price])));
for(const cls of catalog.classes)rules.classes[cls.job]={name:cls.name,roleWeight:roles[cls.job],damageCurve:[]};
let previousHealth=0;
for(const row of baseline.levels){
 const dps=median(row.classes.map(c=>c.dps)),sourceHealth=median(representativeMonsters(row.level).map(m=>m.hp));
 const health=Math.round(Math.max(previousHealth*1.03,sourceHealth*desiredTTK[row.level]/median(row.classes.map(c=>c.ttk))));previousHealth=health;
 rules.monsters.push({level:row.level,health,sourceHealth,attack:row.level<40?1:row.level<80?.9:.85});
 for(const c of row.classes){const multiplier=row.level<10?1:Math.max(.35,Math.min(3,dps/c.dps*roles[c.job]));rules.classes[c.job].damageCurve.push({level:row.level,value:Math.round(multiplier*10000)/10000});}
}
const last=rules.monsters.at(-1);rules.monsters.push({...last,level:150,health:last.health*3,sourceHealth:last.sourceHealth*3,attack:1});
for(const cls of Object.values(rules.classes))cls.damageCurve.push({level:150,value:cls.damageCurve.at(-1).value});
const targets=new Map();
for(const b of bands){const n=b.to-b.from,growth=b.from>=110?1.06:b.from>=100?1.13:1.08,weights=Array.from({length:n},(_,i)=>growth**i),sum=weights.reduce((a,v)=>a+v,0);weights.forEach((v,i)=>targets.set(b.from+i,b.hours*3600*v/sum));}
// The full per-level run is done in the analysis pass. XP calibration uses interpolated
// measured anchor cycles, preventing accidental dependence on a character's live gear.
const cycles=baseline.levels.map(row=>{
 const times=row.classes.map(c=>{
  const adjusted=c.monsters.map(m=>{const original=representativeMonsters(row.level).find(o=>o.name===m.monster);return balanceMonster(original,rules).hp/(m.dps*classDamageScale(c.job,row.level,rules));});
  return (median(adjusted)+4)*1.2;
 });return {level:row.level,value:median(times)};
});
const interpolate=(level)=>{if(level<=cycles[0].level)return cycles[0].value;for(let i=1;i<cycles.length;i++)if(level<=cycles[i].level){const a=cycles[i-1],b=cycles[i];return a.value+(b.value-a.value)*(level-a.level)/(b.level-a.level);}return cycles.at(-1).value;};
rules.experience=[0];rules.calibration.referenceCycles=cycles;
for(let level=1;level<=150;level++){
 const seconds=targets.get(level)??targets.get(119)*1.15**(level-119);
 const kills=seconds/interpolate(level),xp=Math.max(8,Math.round(kills*level*8));
 rules.experience.push(rules.experience.at(-1)+xp);
}
await writeFile(new URL('../data/balance.json',import.meta.url),JSON.stringify(rules,null,2)+'\n');
console.log(JSON.stringify({bands:bands.map(b=>({...b,xp:rules.experience[b.to-1]-rules.experience[b.from-1]})),classes:rules.classes,monsters:rules.monsters}));
