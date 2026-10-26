import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mapExperienceAllowed,capKillExperience,killExperience,experienceFloor} from '../balance-rules.mjs';
import {gmProtectionEnabled,gmCombatEquipment,applyGmAttack,protectGm} from '../gm-tools.mjs';
import {combatStats} from '../character-stats.mjs';
const rules=JSON.parse(await readFile(new URL('../data/balance.json',import.meta.url)));
const fields=JSON.parse(await readFile(new URL('../data/map-fields.json',import.meta.url))).fields;
const spawns=JSON.parse(await readFile(new URL('../data/map-spawns.json',import.meta.url)));
const monster={level:5,attack:[1,2],boss:false};
test('Garden ends at level 10, Bamboo at 15 and Acacias at 20, even with XP premiums',()=>{
 for(const [map,inside,outside]of [[2,10,11],[1,15,16],[0,20,21]]){
  assert.ok(killExperience(monster,inside,rules,1000,map)>0);
  assert.equal(killExperience(monster,outside,rules,1000,map),0);
 }
 assert.equal(mapExperienceAllowed(11,1,rules),true);
 assert.equal(mapExperienceAllowed(16,0,rules),true);
 assert.equal(mapExperienceAllowed(1,43,rules),false);
});
test('the last kill in a map reaches only the next level and cannot skip its exit requirement',()=>{
 const stats={level:10,exp:experienceFloor(11,rules)-7};
 assert.equal(capKillExperience(1e9,stats,2,rules),7);
 assert.equal(capKillExperience(1e9,{level:11,exp:experienceFloor(11,rules)},2,rules),0);
});
test('every level through 150 has a legal hunt map with actual spawns',()=>{
 for(let level=1;level<=150;level++){
  const available=rules.maps.filter(m=>m.experienceMin!==undefined&&m.minimum<=level&&mapExperienceAllowed(level,m.id,rules));
  assert.ok(available.some(m=>{const stage=fields.find(f=>f.id===m.id)?.stage;return spawns.stages[stage]?.zones.length&&spawns.stages[stage].monsters.some(x=>x.pct>0);}),String(level));
 }
});
test('the gameplay GM profile adds only attack and retains normal HP, defense and resources',()=>{
 const stats={job:6,level:1,str:25,spi:15,tal:20,dex:19,health:24};
 const weapon={code:'WS201',damage:[2,4]},equip={weapon,sheltom:{code:'OS199',defense:1000000,hpAdd:999}};
 const profile=gmCombatEquipment(true,equip,true);
 assert.equal(profile.sheltom,null);assert.equal(equip.sheltom.defense,1000000);
 const actual=combatStats(stats,profile),ordinary=combatStats(stats,{weapon});
 assert.deepEqual(actual,ordinary);applyGmAttack(actual,true);
 assert.equal(actual.damageMin,ordinary.damageMin+50);assert.equal(actual.damageMax,ordinary.damageMax+50);
 assert.equal(gmProtectionEnabled(true,equip,true),false);
 assert.equal(gmProtectionEnabled(true,equip,false),true);
 const resources={hp:3,mp:4,sp:5,hpMax:100,mpMax:100,spMax:100,defense:7};
 protectGm(resources,gmProtectionEnabled(true,equip,true));
 assert.deepEqual(resources,{hp:3,mp:4,sp:5,hpMax:100,mpMax:100,spMax:100,defense:7});
 assert.equal(gmProtectionEnabled(false,equip,false),false);
});
