import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {experienceFloor,experienceSpan,migrateExperience,killExperience,balanceMonster,classDamageScale,defenseMitigation,questExperienceReward,potionCanUse,registerPotion,duelDamage} from '../balance-rules.mjs';
import {objectiveValue,objectiveIncrement,questSkill} from '../quest-progress.mjs';
import {buildCharacter,simulateLevel,catalog,monsters,rotation} from '../ops/simulate-balance.mjs';
const rules=JSON.parse(await readFile(new URL('../data/balance.json',import.meta.url),'utf8'));
const quests=JSON.parse(await readFile(new URL('../data/quests.json',import.meta.url),'utf8')).quests;
test('XP is increasing through level 150 and all twelve bands retain the authorized 300-hour target',()=>{
 assert.equal(rules.bands.reduce((n,b)=>n+b.hours,0),300);
 for(let n=1;n<=150;n++){assert.ok(experienceSpan(n,rules)>0);assert.ok(Number.isSafeInteger(experienceFloor(n,rules)));}
 assert.equal(rules.bands.filter(b=>b.to<=80).reduce((n,b)=>n+b.hours,0),12);
 assert.equal(rules.bands.filter(b=>b.to<=100).reduce((n,b)=>n+b.hours,0),40);
});
test('migration preserves level, attributes and within-level progress, is idempotent and does not award points',()=>{
 for(const level of [1,10,80,100,119,150])for(const fraction of [0,.25,.9]){
  const stats={level,exp:(level-1)**2*100+(2*level-1)*100*fraction,str:90,statPoints:4};
  assert.equal(migrateExperience(stats,rules),true);
  assert.equal(stats.level,level);assert.equal(stats.str,90);assert.equal(stats.statPoints,4);
  assert.ok(Math.abs((stats.exp-experienceFloor(level,rules))/experienceSpan(level,rules)-fraction)<=1/experienceSpan(level,rules)+1e-9);
  const saved={...stats};assert.equal(migrateExperience(stats,rules),false);assert.deepEqual(stats,saved);
 }
});
test('level-appropriate kills pay normally, low-level farming is penalized and quest percentages use the same XP curve',()=>{
 assert.equal(killExperience({level:100},100,rules),800);
 assert.ok(killExperience({level:10},100,rules)<8);
 assert.equal(killExperience({level:100,boss:true},100,rules),800*rules.bossExperienceMultiplier);
 assert.equal(questExperienceReward({expPct:20,expCapLevel:40},100,rules),Math.floor(experienceSpan(40,rules)*.2));
 assert.equal(questExperienceReward({exp:1000},100,rules),1000);
});
test('PvE profiles preserve original definitions and give bosses greater durability than comparable normal monsters',()=>{
 for(const original of monsters){const before=structuredClone(original),tuned=balanceMonster(original,rules);
  assert.deepEqual(original,before);assert.ok(tuned.hp>0&&tuned.attack.every(n=>Number.isFinite(n)&&n>=0));
  if(original.boss)assert.ok(tuned.hp>balanceMonster({...original,boss:false},rules).hp*5);
 }
});
test('defense reduces real incoming damage within a cap; potion cooldowns do not interfere across resource types',()=>{
 assert.ok(defenseMitigation(1000,100)>defenseMitigation(100,100));assert.equal(defenseMitigation(1e9,100),.35);
 const ready={};assert.ok(potionCanUse(ready,'life',0,rules));registerPotion(ready,'life',0,rules);
 assert.equal(potionCanUse(ready,'life',1,rules),false);assert.equal(potionCanUse(ready,'life',2,rules),true);assert.equal(potionCanUse(ready,'mana',1,rules),true);
});
test('reference builds respect available attribute points, skill budgets and skill level requirements',()=>{
 for(const level of [1,10,20,40,60,80,100,120])for(const cls of catalog.classes){const b=buildCharacter(cls.job,level);assert.ok(b.allocated<=b.pointBudget);
  const entries=catalog.skills.filter(s=>s.job===cls.job);for(const s of entries)if(b.learned[s.code])assert.ok(s.reqLevel+(b.learned[s.code]-1)*2<=level);
  const count=tier=>entries.filter(s=>(s.tier===4)===tier).reduce((n,s)=>n+(b.learned[s.code]??0),0);
  assert.ok(count(false)<=Math.max(0,Math.floor((level-8)/2)));assert.ok(count(true)<=Math.max(0,Math.floor((level-58)/2)));
 }
});
test('all classes have viable equal-level endgame PvE cycles with ordinary gear',()=>{
 const rows=simulateLevel(120,rules);for(const c of rows){assert.ok(c.ttk>=8&&c.ttk<=40,c.className+' ttk '+c.ttk);assert.ok(c.secondsToDie>c.ttk*.9,c.className+' survival');}
 assert.ok(Math.max(...rows.map(c=>c.dps))/Math.min(...rows.map(c=>c.dps))<1.5);
});
test('high-level casters use damaging skills instead of relying entirely on free basic attacks',()=>{
 for(const job of [7,8,10]){const b=buildCharacter(job,120),r=rotation(b,{level:120,defense:1000,absorb:60,resist:{}},classDamageScale(job,120,rules));assert.ok(Object.values(r.used).reduce((n,x)=>n+x,0)>10);assert.ok(r.mpPerSecond>0);}
});
test('prospective PvP rules remain disabled and cap burst damage; they cannot be confused with enabled player combat',()=>{
 assert.equal(rules.pvp.enabled,false);assert.equal(rules.pvp.status,'simulation-only');
 assert.ok(duelDamage(1e9,{level:120},{hpMax:2000,defense:1000},rules)<=2000*.15);
});
test('level, tutorial and skill journal progress comes from actual matching events',()=>{
 const q=quests.find(q=>q.id==='skill.1.03'),s=questSkill(q,catalog),learned={[s.code]:1};
 assert.equal(objectiveValue(q,q.steps[0],0,{level:20},learned,catalog),1);
 assert.equal(objectiveIncrement(q,q.steps[1],'skillKill',{code:s.code},catalog,learned),1);
 assert.equal(objectiveIncrement(q,q.steps[1],'skillKill',{code:'OTHER'},catalog,learned),0);
 assert.equal(objectiveIncrement(q,q.steps[1],'skillCast',{code:s.code},catalog,learned),0);
 const level=quests.find(q=>q.steps.some(o=>o.type==='level')),o=level.steps.find(o=>o.type==='level');
 assert.equal(objectiveValue(level,o,0,{level:120},{},catalog),o.need);
 const tutorial={id:'tutorial.06-status'},stat={id:'0',type:'action'};
 assert.equal(objectiveIncrement(tutorial,stat,'stat',{count:5},catalog,{}),5);
});
