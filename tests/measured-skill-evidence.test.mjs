import test from 'node:test';
import assert from 'node:assert/strict';
import {MEASURED_COOLDOWNS,measuredSkillCooldown} from '../skill-measured-cooldowns.mjs';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../data/skills.json',import.meta.url),'utf8'));
test('measured cooldown registry is scoped, sourced and agrees with original 2018 reference levels',()=>{
  assert.equal(Object.keys(MEASURED_COOLDOWNS).length,11);
  for(const [code,m] of Object.entries(MEASURED_COOLDOWNS)){
    assert.ok(data.skills.some(s=>s.code===code),code);
    assert.ok(m.source==='user-provided-community-2019'||/^https:\/\/forum\.priston\.com\.br\//.test(m.source));
    assert.ok(Number.isFinite(m.seconds)&&m.seconds>=0,code);
    assert.ok(['all-ranks-explicit','single-measurement-extrapolated','rank-10-only'].includes(m.rankCoverage),code);
    if(m.animationSeconds!==undefined)assert.ok(m.animationSeconds>0,code);
    for(let level=1;level<=10;level++){
      assert.equal(measuredSkillCooldown(code,level),m.level&&level!==m.level?null:m.seconds,code+' lvl '+level);
    }
  }
  assert.equal(measuredSkillCooldown('SKILL_DIVINE_PIERCING',10),5.2);
  assert.equal(measuredSkillCooldown('SKILL_DIASTROPHISM',9),null);
  assert.equal(measuredSkillCooldown('SKILL_DIASTROPHISM',10),4);
  assert.equal(measuredSkillCooldown('SKILL_M_METEO',10),6);
  assert.equal(measuredSkillCooldown('SKILL_DEAD_RAY',1),0.5);
  assert.equal(measuredSkillCooldown('SKILL_DISTORTION',4),17.5);
  assert.equal(measuredSkillCooldown('SKILL_FLAME_WAVE',5),2.5);
  assert.equal(measuredSkillCooldown('SKILL_CURSE_LAZY',1),7.5);
  assert.equal(measuredSkillCooldown('SKILL_SOUL_MANACLE',1),17.5);
  assert.equal(measuredSkillCooldown('SKILL_CHASING_HUNT',1),5);
  assert.equal(measuredSkillCooldown('SKILL_JUDGEMENT',1),0.5);
  assert.equal(measuredSkillCooldown('SKILL_MOURNING_OF_PRAY',1),5);
});
