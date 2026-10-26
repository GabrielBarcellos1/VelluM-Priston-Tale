import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSkillSystem } from '../skill-system.mjs';
import { selectSkillTargets, monsterControl } from '../skill-runtime.mjs';
import { combatStats } from '../character-stats.mjs';
import { stepMonster } from '../monster-ai.mjs';
import { physicalHit } from '../classic-combat.mjs';
import vm from 'node:vm';
import {classDamageScale} from '../balance-rules.mjs';
const catalog=JSON.parse(await readFile(new URL('../data/skills.json',import.meta.url),'utf8'));
function fixture(skill,level=1,extra={}) {
  let time=0,system;const pending=[],calls={damage:[],summon:[],support:[],convert:[]};
  const stats={job:skill.job,level:120,str:100,spi:100,tal:100,dex:100,health:100,
    damageMin:100,damageMax:200,hp:5000,hpMax:10000,mp:5000,mpMax:10000,sp:5000,spMax:10000,gold:1e9};
  const equipment={weapon:{code:({1:'WA101',4:'WP101',5:'WT101',6:'WS201'})[skill.job]??'WS101',spec:skill.job,damage:[100,200],attackSpeed:8},shield:skill.job===4?null:{},armor:{spec:skill.job}};
  const monster={id:1,hp:1e6,hpMax:1e6,x:30,z:0,seq:1,definition:{undead:true,level:50,attack:[10,20]}};
  const ctx={catalog,job:skill.job,name:'Test',stats,saved:{[skill.code]:level},equipment:()=>equipment,
    now:()=>time,wallNow:()=>time,game:()=>({pos:{x:0,z:0}}),monsters:new Map([[1,monster]]),random:()=>0,
    timing:()=>({duration:1,hits:[.2,.8]}),schedule:fn=>pending.push(fn),canSupport:()=>true,
    damage:(...a)=>calls.damage.push(a),summon:(...a)=>calls.summon.push(a),support:(...a)=>calls.support.push(a),convert:(...a)=>calls.convert.push(a),
    recalculate(){},emit(){},save(){},buffsChanged(){},...extra};
  system=createSkillSystem(ctx);
  return {system,stats,monster,calls,ctx,pending,advance:n=>{time+=n;},equipment};
}
for(const cls of catalog.classes)test(`${cls.name}: execute every learned active skill at all ten levels`,()=>{
  for(const skill of catalog.skills.filter(s=>s.job===cls.job))for(let n=1;n<=10;n++){
    const p=catalog.rules.skills[skill.code].runtime,f=fixture(skill,n),before={...f.stats};
    if(p.kind==='passive'){
      // No skill may silently disappear from the effect aggregation.
      const effect=f.system.bonuses();assert.ok(Object.values(effect).some(v=>typeof v==='number'&&v!==0)||Object.values(effect.resist).some(Boolean),skill.code);continue;
    }
    f.system.cast(skill.id,p.target==='enemy'||p.target==='ally'?1:undefined);
    f.pending.forEach(fn=>fn());
    assert.ok(Number.isFinite(f.stats.hp)&&Number.isFinite(f.stats.mp)&&Number.isFinite(f.stats.sp),skill.code);
    assert.equal(before.mp-f.stats.mp,p.special==='agony'?p.mp[n-1]-Math.floor(before.hpMax*catalog.rules.skills[skill.code].tables.Agony_ConvLife[n-1]/100):p.mp[n-1],skill.code+' MP');
    assert.equal(before.sp-f.stats.sp,p.stamina[n-1],skill.code+' stamina');
    if(p.special==='agony')assert.ok(f.stats.hp<before.hp&&f.stats.mp>before.mp);
    else if(p.special==='convert')assert.equal(f.calls.convert.length,1);
    else if(p.special==='drain')assert.ok(f.calls.damage.length&&f.stats.hp>before.hp);
    else if(p.special==='extinction')assert.ok(f.calls.damage.length,skill.code);
    else if(p.special==='resurrection'||p.kind==='heal')assert.equal(f.calls.support.length,1);
    else if(p.kind==='summon')assert.equal(f.calls.summon.length,1);
    else if(['buff','party'].includes(p.kind))assert.ok(f.system.buffs().length,skill.code);
    else if(p.kind==='debuff'){
      const c=monsterControl(f.monster,0);assert.ok(c.stunned||c.slowPercent||c.attackReductionPercent||c.criticalBonus,skill.code);
    }else assert.ok(f.calls.damage.length,skill.code+' produced no strike');
  }
});
test('line attacks exclude enemies behind and beside the caster; chain jumps have a distance limit',()=>{
  const foes=[{id:1,hp:10,x:50,z:0},{id:2,hp:10,x:100,z:0},{id:3,hp:10,x:-5,z:0},{id:4,hp:10,x:30,z:60},{id:5,hp:10,x:500,z:0}];
  const p={targetLimit:Array(10).fill(5),radius:Array(10).fill(0),shape:{type:'line',width:10,length:Array(10).fill(120)}};
  assert.deepEqual(selectSkillTargets(p,1,{x:0,z:0},foes[0],foes).map(m=>m.id),[1,2]);
  p.shape.type='chain';p.chainRange=Array(10).fill(55);
  assert.deepEqual(selectSkillTargets(p,1,{x:0,z:0},foes[0],foes).map(m=>m.id),[1,2]);
});
test('Roar stops movement and pending attacks, then expires; slow reduces actual movement',()=>{
  const s=catalog.skills.find(s=>s.code==='SKILL_ROAR'),f=fixture(s,2);
  f.system.cast(s.id);assert.equal(monsterControl(f.monster,100).stunned,true);
  const context={now:100,dt:.2,player:{x:200,z:0},ground:(x,z)=>({x,z,y:0}),safe:false};
  f.monster.motion='attack';const seq=f.monster.seq;
  assert.equal(stepMonster(f.monster,context).update.motion,'stand');assert.ok(f.monster.seq>seq);
  assert.equal(monsterControl(f.monster,3000).stunned,false);
  const make=()=>({hp:10,x:0,y:0,z:0,motion:'stand',seq:0});const a=make(),b=make();
  b.skillControls={slow:{until:99999,slowPercent:50}};
  stepMonster(a,context);stepMonster(b,context);assert.equal(b.x,a.x/2);
});
test('poison ticks, resets cancel them, buffs expire and saved buffs retain remaining time',()=>{
  const poison=catalog.skills.find(s=>s.code==='SKILL_VENOM_THRONE'),f=fixture(poison,3);
  f.system.cast(poison.id,1);f.pending.forEach(fn=>fn());const before=f.calls.damage.length;
  f.advance(1);f.system.expire();assert.ok(f.calls.damage.length>before);
  f.system.reset();f.advance(1);f.system.expire();assert.equal(f.calls.damage.length,before+1);
  const swift=catalog.skills.find(s=>s.code==='SKILL_SWIFT_AXE'),g=fixture(swift,10);
  g.system.cast(swift.id);const saved=g.system.exportBuffs();assert.equal(saved[0].expiresAt,300);
  const h=fixture(swift,10,{savedBuffs:saved});assert.equal(h.system.bonuses().attackSpeedPercent,15);
  g.advance(301);g.system.expire();assert.equal(g.system.bonuses().attackSpeedPercent,0);
});
test('magic power and health regeneration reach combat stats and evaluated spell damage',async()=>{
  const spirit=catalog.skills.find(s=>s.code==='SKILL_SPIRIT_ELEMENTAL'),f=fixture(spirit,10);
  f.system.cast(spirit.id);const b=f.system.bonuses(),stats=combatStats(f.stats,f.equipment,{},b);
  assert.ok(stats.magicPowerPercent>0);
  const {skillAttackProfile}=await import('../skill-damage.mjs');const fire=catalog.skills.find(s=>s.code==='SKILL_FIRE_BOLT'),r=catalog.rules.skills[fire.code];
  const base=skillAttackProfile(fire,r,1,f.stats,f.equipment),boost=skillAttackProfile(fire,r,1,f.stats,f.equipment,stats.magicPowerPercent);
  assert.ok(boost.damageRange[0]>base.damageRange[0]);
  const regen=catalog.skills.find(s=>s.code==='SKILL_REGENERATION_FIELD'),g=fixture(regen,10);g.system.cast(regen.id);
  assert.ok(combatStats(g.stats,g.equipment,{},g.system.bonuses()).hpRegen>0);
});
test('invalid conversion and insufficient Agony HP do not consume resources or start cooldowns',()=>{
  for(const code of ['SKILL_HOLY_INCANTATION','SKILL_AGONY']){
    const s=catalog.skills.find(s=>s.code===code),f=fixture(s,10);f.monster.definition.undead=false;f.stats.hp=1;
    const before={...f.stats};assert.throws(()=>f.system.cast(s.id,1));assert.deepEqual(f.stats,before);assert.deepEqual(f.system.exportCooldowns(),{});
  }
});
test('the actual session damage handler changes monster HP and returns damage for life drain',async()=>{
  const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('function damageMonster('),source.indexOf('function publicMonster('));
  const monster={id:1,x:10,z:0,hp:10000,hpMax:10000,seq:0,definition:{level:1,defense:0,absorb:0,attack:[1,1]}};
  const packets=[],stats={hp:1000,damageMin:100,damageMax:100,critical:0,attackRating:1000,level:100};
  const math=Object.create(Math);math.random=()=>.5;
  const context={monsters:new Map([[1,monster]]),game:{pos:{x:0,z:0}},stats,skillData:catalog,Math:math,
    physicalHit,monsterControl,classDamageScale,characterClass:{job:1},balanceRules:{classes:{1:{damageCurve:[{level:1,value:2},{level:150,value:2}]}}},performance:{now:()=>0},skills:{reveal(){},exportState(){return{}}},updateQuests(){},premiumRecovery:()=>({hp:0,mp:0}),premiumValue:()=>0,deliver:p=>packets.push(p)};
  const hit=vm.runInNewContext(`(${fn})`,context);
  assert.equal(hit(1,1.5,500,{magic:true}),300);assert.equal(monster.hp,9700);
  assert.equal(hit(1,1,500,{fixedDamage:500,magic:true,noLeech:true}),500);assert.equal(monster.hp,9200);
  monster.owner='friend';assert.equal(hit(1,100,500,{magic:true}),undefined);assert.equal(monster.hp,9200);
  assert.ok(packets.some(p=>p.t==='damage'&&p.amount===300));
});
