import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeSkillTiming} from '../native-rules.mjs';
import {MEASURED_COOLDOWNS,measuredSkillAnimation} from '../skill-measured-cooldowns.mjs';
const player={
  skeleton:{clips:{m73:{samples:71,step:1}},motions:[{clip:'m73',events:[14,42]}]},
  pickClip(){return 'm73';},
};
test('measured mage/shaman animations control real skillFx playback duration and hit timestamps',()=>{
  let measured=0;
  for(const [code,m] of Object.entries(MEASURED_COOLDOWNS)){
    if(!m.animationSeconds)continue;
    measured++;
    for(let level=1;level<=10;level++){
      const expected=measuredSkillAnimation(code,level);
      const job=code.startsWith('SKILL_DIASTROPHISM')||['SKILL_FLAME_WAVE','SKILL_DEAD_RAY','SKILL_M_METEO'].includes(code)?7:code==='SKILL_DIVINE_PIERCING'?6:10;
      const timing=nativeSkillTiming(player,{code,job,kind:'aoe',level},'Test',{motionLoops:1},80);
      assert.ok(Math.abs(timing.duration-(expected??2))<1e-8,code+' level '+level);
      assert.equal(timing.hits.length,2);
      assert.ok(timing.hits[0]>0&&timing.hits[1]<timing.duration,code);
      assert.ok(Math.abs(timing.hits[0]-timing.duration*.2)<1e-8,code);
    }
  }
  assert.equal(measured,10);
  const loops=nativeSkillTiming(player,{code:'SKILL_FLAME_WAVE',job:7,kind:'aoe',level:10},'Test',{motionLoops:2});
  assert.ok(Math.abs(loops.duration-1.6)<1e-8);
  assert.equal(loops.hits.length,4);
  const raw=nativeSkillTiming(player,{code:'SKILL_DIASTROPHISM',job:7,kind:'aoe',level:9},'Test',{});
  assert.equal(raw.duration,2);
});
