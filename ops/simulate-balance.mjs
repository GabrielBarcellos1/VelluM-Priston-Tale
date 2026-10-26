// Deterministic balance laboratory. No accounts, database, admin gear or premium effects.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {combatStats} from '../character-stats.mjs';
import {effectFor,sumEffects} from '../skill-effects.mjs';
import {skillAttackProfile} from '../skill-damage.mjs';
import {physicalHit} from '../classic-combat.mjs';
import {incomingHit} from '../monster-ai.mjs';
import {balanceMonster,classDamageScale} from '../balance-rules.mjs';
const root=new URL('../data/',import.meta.url);
const read=async n=>JSON.parse(await readFile(new URL(n+'.json',root),'utf8'));
export const catalog=await read('skills'),items=(await read('loot-items')).items,monsters=(await read('wiki')).wiki.monsters;
export const median=a=>{a=[...a].sort((x,y)=>x-y);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:0;};
const avg=a=>a.reduce((n,v)=>n+v,0)/Math.max(1,a.length);
const family={1:'WA1',2:'WH1',3:'WS1',4:'WP1',5:'WT1',6:'WS2',7:'WM1',8:'WM1',9:'WD1',10:'WN1',11:'WV1'};
const basic={str:25,spi:15,tal:20,dex:19,health:24};
const rank=n=>n>=60?4:n>=40?3:n>=20?2:1;
const value=(a,n)=>a[Math.max(0,Math.min(9,n-1))];
export function randomSeed(seed=12345){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};}
function rollItem(item){const r=structuredClone(item);for(const[k,v]of Object.entries(r))if(Array.isArray(v)&&v.every(Number.isFinite))r[k]=k==='damage'?[avg(v.slice(0,2)),avg(v.slice(2,4))]:avg(v);return r;}
export function buildCharacter(job,level){
 const stats={...basic,job,level,hp:1e9,mp:1e9,sp:1e9},gear={},costs=[];
 const budget=5*(level-1),spent=s=>Object.keys(basic).reduce((n,k)=>n+Math.max(0,s[k]-basic[k]),0);
 const canFit=i=>{const s={...stats};for(const[k,v]of Object.entries(i.req??{}))if(k in basic)s[k]=Math.max(s[k],v);return spent(s)<=budget;};
 const equip=(slot,predicate)=>{
  const candidates=items.filter(i=>predicate(i)&&i.price>0&&(i.req?.level??1)<=level&&canFit(i)&&!/[()]|costume|halloween|christmas|replica|korea|swimsuit/i.test(i.name));
  candidates.sort((a,b)=>(b.req?.level??1)-(a.req?.level??1)||(b.price??0)-(a.price??0));
  if(candidates[0]){const i=candidates[0];gear[slot]=rollItem(i);for(const[k,v]of Object.entries(i.req??{}))if(k in basic)stats[k]=Math.max(stats[k],v);costs.push(i.price);}
 };
 equip('weapon',i=>i.family===family[job]);
 equip('armor',i=>i.family===([7,8,10].includes(job)?'DA2':'DA1')&&i.slot==='ARMOR');
 equip('boots',i=>i.family==='DB1');equip('gloves',i=>i.family==='DG1');equip('bracelets',i=>i.family==='OA2');
 if(gear.weapon?.slot==='WEAPON_ONE')equip('shield',i=>i.family==='DS1');
 // Jewelry uses only level-qualified ordinary items and remains subject to stat requirements.
 equip('amulet',i=>i.family==='OA1');equip('ring1',i=>i.family==='OR1');equip('ring2',i=>i.family==='OR1');equip('sheltom',i=>i.family==='OS1');
 let free=budget-spent(stats);const primary=[7,8,10].includes(job)?'spi':[3,5].includes(job)?'dex':'str';
 const vitality=Math.floor(free*.2);stats.health+=vitality;stats[primary]+=free-vitality;
 const definitions=catalog.skills.filter(s=>s.job===job),learned={};let normal=Math.max(0,Math.floor((level-8)/2)),elite=Math.max(0,Math.floor((level-58)/2));
 for(const s of definitions){if(s.reqLevel>level||s.tier>rank(level))continue;const left=s.tier===4?elite:normal;if(left>0){learned[s.code]=1;if(s.tier===4)elite--;else normal--;}}
 Object.assign(stats,combatStats(stats,gear));
 const dummy={level,defense:level*8,absorb:level/3,block:5};
 const importance=s=>{
  const p=catalog.rules.skills[s.code].runtime;
  if(['melee','shot','beam','sky','aoe','nova'].includes(p.kind)&&!p.special){const a=skillAttackProfile(s,catalog.rules.skills[s.code],Math.min(10,Math.floor((level-s.reqLevel)/2)+1),stats,gear);
   return (a.damageRange?avg(a.damageRange):avg([stats.damageMin,stats.damageMax]))*a.power*(a.hitCount??1)/Math.max(1,p.cooldown[0]);}
  return ['passive','buff','party'].includes(p.kind)?20:p.kind==='summon'?30:0;
 };
 for(const pool of [0,1]){
  const ordered=definitions.filter(s=>learned[s.code]&&Number(s.tier===4)===pool).sort((a,b)=>importance(b)-importance(a));
  for(const s of ordered){let left=pool?elite:normal;const cap=Math.min(10,Math.floor((level-s.reqLevel)/2)+1),extra=Math.min(left,cap-learned[s.code]);learned[s.code]+=extra;if(pool)elite-=extra;else normal-=extra;}
 }
 const effects=sumEffects(definitions.filter(s=>learned[s.code]&&['buff','party','passive','summon'].includes(catalog.rules.skills[s.code].runtime.kind)&&!catalog.rules.skills[s.code].runtime.special).map(s=>effectFor(s,learned[s.code],catalog.rules,gear)));
 Object.assign(stats,combatStats(stats,gear,{},effects));
 stats.hpMax=Math.floor((120+(level-1)*12+(stats.health-24)*2+effects.hp)*(1+effects.hpPercent/100));
 stats.mpMax=Math.floor((80+(level-1)*8+effects.mp)*(1+effects.mpPercent/100));
 stats.spMax=Math.floor((180+(level-1)*5)*(1+effects.spPercent/100));
 stats.hp=stats.hpMax;stats.mp=stats.mpMax;stats.sp=stats.spMax;
 return {job,level,stats,gear,learned,effects,equipmentCost:costs.reduce((a,b)=>a+b,0),allocated:spent(stats),pointBudget:budget};
}
export function expectedDamage(attacker,defender,power=1,options={},samples=256){const random=randomSeed(7123);let n=0;for(let i=0;i<samples;i++)n+=physicalHit(attacker,defender,power,catalog.rules.accuracy,random,options).amount;return n/samples;}
export function rotation(build,defender,scale=1,duration=120,pvp=false,resourceFree=false){
 const {stats,gear,learned}=build,defs=catalog.skills.filter(s=>s.job===build.job&&learned[s.code]);
 const autoTime=Math.max(.4,80/stats.attackStep),auto=expectedDamage(stats,defender,1,{magic:stats.magicAttack})*scale;
 const attacks=defs.flatMap(s=>{
  const p=catalog.rules.skills[s.code].runtime;if(!['melee','shot','beam','sky','aoe','nova'].includes(p.kind)||p.special)return[];
  const n=learned[s.code],a=skillAttackProfile(s,catalog.rules.skills[s.code],n,stats,gear,stats.magicPowerPercent);
  const animation=a.magic?1:autoTime,interval=Math.max(animation,value(p.cooldown,n));
  const amount=expectedDamage(stats,defender,a.power,a)*(a.hitCount??1)*scale;
  return [{code:s.code,kind:p.kind,amount,interval,animation,mp:value(p.mp,n),sp:value(p.stamina,n),radius:value(p.radius,n),control:a.control,dot:a.dot}];
 }).sort((a,b)=>b.amount/b.animation-a.amount/a.animation);
 const ready={},used={},regenMp=1+stats.mpRegen,regenSp=2+stats.spRegen;
 const potionTier=build.level>=80?'104':build.level>=40?'103':build.level>=20?'102':'101';
 const mpRecovery=items.find(i=>i.code==='PM'+potionTier)?.restore?.mana?.[0]??40;
 const spRecovery=items.find(i=>i.code==='PS'+potionTier)?.restore?.stamina?.[0]??40;
 let t=0,total=0,mp=stats.mpMax,sp=stats.spMax,mpPot=0,spPot=0,nextMp=0,nextSp=0,mpUsed=0,spUsed=0,aoe=0;
 while(t<duration){
  if(resourceFree){mp=stats.mpMax;sp=stats.spMax;}
  const skill=attacks.find(a=>(ready[a.code]??0)<=t&&mp>=a.mp&&sp>=a.sp&&a.amount/a.animation>auto/autoTime);
  const step=skill?.animation??autoTime;
  if(skill){total+=skill.amount;mp-=skill.mp;sp-=skill.sp;mpUsed+=skill.mp;spUsed+=skill.sp;ready[skill.code]=t+skill.interval;used[skill.code]=(used[skill.code]??0)+1;if(skill.radius)aoe+=skill.amount;}
  else total+=auto;
  t+=step;mp=Math.min(stats.mpMax,mp+regenMp*step);sp=Math.min(stats.spMax,sp+regenSp*step);
  if(!pvp&&mp<stats.mpMax*.25&&t>=nextMp){mp=Math.min(stats.mpMax,mp+mpRecovery);mpPot++;nextMp=t+8;}
  if(!pvp&&sp<stats.spMax*.25&&t>=nextSp){sp=Math.min(stats.spMax,sp+spRecovery);spPot++;nextSp=t+8;}
 }
 let petDps=0;
 for(const s of defs){const p=catalog.rules.skills[s.code].runtime;if(p.kind==='summon'){const n=learned[s.code];petDps+=expectedDamage(stats,defender,1,{damageRange:value(p.summon.damage,n),magic:true})/value(p.summon.interval,n)*scale;}}
 return {dps:total/t+petDps,burst:Math.max(auto,...attacks.map(a=>a.amount)),mpPerSecond:mpUsed/t,spPerSecond:spUsed/t,mpPotionsPerHour:mpPot/t*3600,spPotionsPerHour:spPot/t*3600,aoeShare:aoe/Math.max(1,total),petDps,used};
}
export function expectedIncoming(monster,stats,balanced=false){const random=randomSeed(345);let amount=0;for(let i=0;i<512;i++)amount+=incomingHit(monster,stats,catalog.rules.accuracy,random,balanced?{defenseCap:.35}:{}).amount;return amount/512/1.8;}
export function representativeMonsters(level){const normal=monsters.filter(m=>!m.boss&&Math.abs(m.level-level)<=Math.max(3,level*.04)&&avg(m.attack)>0);return normal.length?normal:monsters.filter(m=>!m.boss).sort((a,b)=>Math.abs(a.level-level)-Math.abs(b.level-level)).slice(0,3);}
export function simulateLevel(level,config=null){
 return catalog.classes.map(cls=>{
  const b=buildCharacter(cls.job,level),normal=representativeMonsters(level);
  const scale=config?classDamageScale(cls.job,level,config):1;
  const rows=normal.map(original=>{const monster=config?balanceMonster(original,config):structuredClone(original);
   const r=rotation(b,monster,scale),incoming=expectedIncoming(monster,b.stats,!!config);
   return {monster:monster.name,monsterLevel:monster.level,monsterHP:monster.hp,dps:r.dps,ttk:monster.hp/Math.max(.001,r.dps),incomingDps:incoming,secondsToDie:incoming?b.stats.hpMax/incoming:1e9,...r};});
  return {job:cls.job,className:cls.name,level,build:b,dps:median(rows.map(r=>r.dps)),ttk:median(rows.map(r=>r.ttk)),secondsToDie:median(rows.map(r=>r.secondsToDie)),mpPotionsPerHour:median(rows.map(r=>r.mpPotionsPerHour)),spPotionsPerHour:median(rows.map(r=>r.spPotionsPerHour)),monsters:rows};
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const levels=[1,5,10,20,30,40,50,60,70,80,90,100,110,120],result={assumptions:{gear:'Ordinary level-appropriate average rolls +0, no specialization, no premiums',stats:'Five stat points per earned level; equipment requirements paid first, 20% spare vitality',skills:'Legal point budgets and level/rank caps; chosen damage priority; buffs active',timing:'80/attackStep seconds physical, one second spell; monster swings 1.8 sec; MP/SP potion at most once per 8 sec',limitations:'Stationary mathematical rotation, not recorded human play; poison/control/kiting omitted from sustained DPS; summons included; no party'},levels:levels.map(level=>({level,classes:simulateLevel(level)}))};
 if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2));
 console.log(JSON.stringify(result.levels.map(r=>({level:r.level,medianTTK:Math.round(median(r.classes.map(c=>c.ttk))),fastest:Math.round(Math.min(...r.classes.map(c=>c.ttk))),slowest:Math.round(Math.max(...r.classes.map(c=>c.ttk))),survival:Math.round(median(r.classes.map(c=>c.secondsToDie)))}))));
 console.log(JSON.stringify(result.levels.at(-1).classes.map(c=>({class:c.className,dps:Math.round(c.dps),ttk:Math.round(c.ttk),survival:Math.round(c.secondsToDie),gear:c.build.gear.weapon?.code,stats:c.build.allocated,cost:c.build.equipmentCost}))));
}
