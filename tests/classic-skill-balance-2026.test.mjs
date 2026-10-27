import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSkillSystem} from '../skill-system.mjs';
import {initialMastery,afterSkillUse,hitsRemaining,HITS_PER_PERCENT,MASTERY_MAX} from '../skill-maturity.mjs';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const catalog=JSON.parse(await read('data/skills.json'));
const refs=JSON.parse(await read('data/classic-skill-reference.json'));
const changes=JSON.parse(await read('data/classic-skill-changes.json'));
test('only tier one to four: 176 skills for 11 characters, 10 rows each',()=>{
 assert.equal(catalog.skills.length,176);
 assert.equal(new Set(catalog.skills.map(s=>s.job)).size,11);
 for(const skill of catalog.skills){
  assert.ok(skill.tier>=1&&skill.tier<=4,skill.code);
  const p=catalog.rules.skills[skill.code].runtime;
  for(const k of ['mp','stamina','duration','cooldown','attacks'])assert.equal(p[k].length,10,skill.code+'/'+k);
 }
});
test('published numeric costs match every ten-level exact-name reference',()=>{
 let covered=0;
 for(const [code,ref] of Object.entries(refs.skills)){
  const p=catalog.rules.skills[code].runtime;
  for(const [field,labels] of [['mp',['mpusage','mp']],['stamina',['staminausage','stm','stmusage']]]){
   const pos=ref.columns.findIndex(k=>labels.includes(k.toLowerCase().replace(/[^a-z]/g,'')));
   if(pos===-1)continue;
   const values=ref.levels.map(r=>r[pos]);
   if(!values.every(v=>/^\d+$/.test(v)))continue;
   assert.deepEqual(p[field],values.map(Number),code+'/'+field);
   covered++;
  }
 }
 assert.ok(covered>200,'insufficient verified resource tables');
});
test('Fighter damage bonus and hit counts follow recovered classic tables',()=>{
 for(const code of ['SKILL_RAVING','SKILL_IMPACT','SKILL_TRIPLE_IMPACT','SKILL_BRUTAL_SWING','SKILL_RAGE_OF_ZECRAM']){
  const r=catalog.rules.skills[code];
  assert.deepEqual(r.runtime.attacks.map(x=>x.percent),r.damagePercent,code);
 }
 assert.deepEqual(catalog.rules.skills.SKILL_RAVING.runtime.attacks.map(a=>a.hitCount),[2,2,2,3,3,3,4,4,4,4]);
});
test('classic documented no-delay bounds and 6-second Meteor',()=>{
 const p=code=>catalog.rules.skills[code].runtime.cooldown;
 assert.deepEqual(p('SKILL_M_METEO'),Array(10).fill(6));
 assert.deepEqual(p('SKILL_PERFORATION'),Array(10).fill(0));
 assert.deepEqual(p('SKILL_PHOENIX_SHOT'),Array(10).fill(0));
 assert.deepEqual(p('SKILL_AVALANCHE').slice(0,8),Array(8).fill(0));
 assert.deepEqual(p('SKILL_WIND_ARROW').slice(0,7),Array(7).fill(0));
 assert.deepEqual(p('SKILL_PERFECT_AIM').slice(0,7),Array(7).fill(0));
});
test('mastery is usage-based and legacy learned skills remain fully trained',()=>{
 assert.equal(initialMastery({},'SKILL_RAVING',1),MASTERY_MAX);
 assert.equal(initialMastery({SKILL_RAVING:0},'SKILL_RAVING',1),0);
 assert.equal(initialMastery({SKILL_RAVING:501},'SKILL_RAVING',1),501);
 assert.equal(initialMastery({},'SKILL_RAVING',0),0);
 assert.equal(afterSkillUse(0,1,5),100);
 assert.equal(afterSkillUse(0,2,7),100);
 assert.equal(afterSkillUse(9999,3,5),MASTERY_MAX);
 for(const tier of [1,2,3,4])assert.ok(HITS_PER_PERCENT[tier]>0);
 assert.equal(hitsRemaining(10000,4),0);
});
test('newly learned skill starts untrained, gains mastery from casts without altering stats',()=>{
 const skill=catalog.skills.find(s=>s.code==='SKILL_RAVING');
 const state={};
 let timestamp=0,saves=0;
 const stats={job:1,level:120,str:100,spi:100,tal:100,dex:100,health:100,damageMin:100,damageMax:200,
  hp:5000,hpMax:5000,mp:5000,mpMax:5000,sp:5000,spMax:5000,gold:1e8};
 const ctx={catalog,job:1,name:'Test',stats,masteryProgress:state,
  saved:{SKILL_MELEE_MASTERY:1,SKILL_FIRE_ATTRIBUTE:1},
  rank:()=>3,now:()=>timestamp,wallNow:()=>timestamp,
  equipment:()=>({weapon:{code:'WA101',damage:[100,200]}}),
  isTrainer:()=>true,isVillage:()=>false,
  game:()=>({pos:{x:0,z:0}}),monsters:new Map([[1,{id:1,hp:1e8,hpMax:1e8,x:30,z:0,definition:{level:50}}]]),
  timing:()=>({duration:1,hits:[.2,.4]}),schedule:()=>{},
  damage:()=>10,emit:()=>{},recalculate:()=>{},save:()=>{saves++},
  buffsChanged:()=>{},premiumValue:()=>0};
 const sys=createSkillSystem(ctx);
 assert.equal(sys.snapshot().skills.find(s=>s.code===skill.code).level,0);
 sys.learn(skill.id,123);
 assert.equal(state[skill.code],0);
 assert.equal(sys.snapshot().skills.find(s=>s.code===skill.code).mastery,0);
 sys.cast(skill.id,1);
 assert.ok(state[skill.code]>0&&state[skill.code]<MASTERY_MAX);
 assert.equal(saves,2);
});
test('change log documents exactly which parameters were edited',()=>{
 assert.ok(changes.count>=79);
 assert.ok(changes.revisedSkills>=43);
 for(const change of changes.changes)assert.equal(change.before.length,10);
});
