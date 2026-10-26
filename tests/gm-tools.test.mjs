import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gmProtection,protectGm,applyGmAttack,gmTrainingActive} from '../gm-tools.mjs';
import {experienceSpan,killExperience} from '../balance-rules.mjs';
const read=async name=>JSON.parse(await readFile(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
const [profile,balance,wiki,fields]=await Promise.all(['gm-training','balance','wiki','map-fields'].map(read));
test('GM protection requires staff and an equipped Sheltom, and preserves offensive attributes',()=>{
 const equip={sheltom:{code:'OS199'}};
 assert.equal(gmProtection(false,equip),false);assert.equal(gmProtection(true,{}),false);assert.equal(gmProtection(true,equip),true);
 const s={hp:1,mp:2,sp:3,hpMax:100,mpMax:80,spMax:70,defense:9,damageMin:10,damageMax:20,attackStep:80};
 const original=structuredClone(s);protectGm(s,false);assert.deepEqual(s,original);
 protectGm(s,true);assert.equal(s.hp,100);assert.equal(s.mp,80);assert.equal(s.sp,70);assert.equal(s.defense,1000000);assert.equal(s.damageMax,20);assert.equal(s.attackStep,80);
});
test('GM potion expires, requires staff, and never accelerates level 120+',()=>{
 assert.equal(gmTrainingActive(true,{expires:101},119,100),true);
 for(const [staff,expires,level]of [[false,200,1],[true,99,1],[true,200,120],[true,200,150]])assert.equal(gmTrainingActive(staff,{expires},level,100),false);
});
test('all 11 classes have reachable hunting maps and finite XP for all 119 level transitions',()=>{
 assert.equal(Object.keys(profile.classes).length,11);
 for(const cls of Object.values(profile.classes)){
  assert.equal(cls.levels.length,119);
  for(const row of cls.levels){
   assert.ok(Number.isFinite(row.multiplier)&&row.multiplier>=1);assert.ok(row.maps.length);
   for(const map of row.maps){assert.ok(!fields.fields.find(m=>m.id===map.id).village);assert.ok(balance.maps.find(m=>m.id===map.id).minimum<=row.level);}
   assert.ok(row.monsters.some(id=>wiki.wiki.monsters.find(m=>m.id===id).maps.some(id=>row.maps.some(m=>m.id===id))));
  }
 }
});
test('reference cycles target roughly one hour rather than 300 hours; normal progression table unchanged',()=>{
 assert.equal(balance.targetHoursTo120,300);
 for(const cls of Object.values(profile.classes)){
  let total=0;
  for(const row of cls.levels){
   const mobs=row.monsters.map(id=>wiki.wiki.monsters.find(m=>m.id===id));
   const averageXP=mobs.reduce((sum,m)=>sum+Math.floor(killExperience(m,row.level,balance)*row.multiplier),0)/mobs.length;
   total+=experienceSpan(row.level,balance)/averageXP*row.cycleSeconds;
  }
  assert.ok(total>3300&&total<3900,`${cls.name}: ${total}s`);
 }
});

test('GM Sheltom adds 50 to both damage limits only when equipped by staff',()=>{
 for(const [staff,equip,expected] of [[true,{sheltom:{code:'OS199'}},50],[false,{sheltom:{code:'OS199'}},0],[true,{},0],[true,{sheltom:{code:'OS110'}},0]]){
  const s={damageMin:10,damageMax:20,attackStep:80};
  applyGmAttack(s,gmProtection(staff,equip));
  assert.deepEqual(s,{damageMin:10+expected,damageMax:20+expected,attackStep:80});
 }
});