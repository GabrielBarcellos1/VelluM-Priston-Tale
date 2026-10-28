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
test('GM resource protection removes MP/RES and self-HP costs, retaining skill cooldowns and tier requirements',()=>{
 for(const skill of catalog.skills.filter(s=>['melee','shot','beam','sky','aoe','nova','buff','party','heal','summon'].includes(catalog.rules.skills[s.code].runtime.kind))){
  const f=fixture(skill,1,{resourceFree:()=>true});f.stats.mp=0;f.stats.sp=0;
  const view=f.system.snapshot().skills.find(s=>s.id===skill.id);assert.equal(view.mp,0);assert.equal(view.stamina,0);
 }
 const agony=catalog.skills.find(s=>catalog.rules.skills[s.code].runtime.special==='agony');
 const a=fixture(agony,1,{resourceFree:()=>true});a.stats.hp=1;a.system.cast(agony.id);assert.equal(a.stats.hp,1);
 const top=catalog.skills.find(s=>s.tier===4&&s.job===1),locked=fixture(top,1,{resourceFree:()=>true,rank:()=>0});
 assert.throws(()=>locked.system.cast(top.id,1),/tier/);
 const swift=catalog.skills.find(s=>s.code==='SKILL_SWIFT_AXE'),b=fixture(swift,1,{resourceFree:()=>true});
 b.stats.mp=0;b.stats.sp=0;b.system.cast(swift.id);assert.equal(b.stats.mp,0);assert.equal(b.stats.sp,0);assert.throws(()=>b.system.cast(swift.id),/recarga|animação/);
});
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
  const context={mapTravel:null,monsters:new Map([[1,monster]]),game:{pos:{x:0,z:0}},stats,skillData:catalog,Math:math,
    physicalHit,monsterControl,classDamageScale,characterClass:{job:1},balanceRules:{classes:{1:{damageCurve:[{level:1,value:2},{level:150,value:2}]}}},performance:{now:()=>0},skills:{reveal(){},exportState(){return{}}},updateQuests(){},premiumRecovery:()=>({hp:0,mp:0}),premiumValue:()=>0,deliver:p=>packets.push(p)};
  const hit=vm.runInNewContext(`(${fn})`,context);
  assert.equal(hit(1,1.5,500,{magic:true}),300);assert.equal(monster.hp,9700);
  assert.equal(hit(1,1,500,{fixedDamage:500,magic:true,noLeech:true}),500);assert.equal(monster.hp,9200);
  monster.owner='friend';assert.equal(hit(1,100,500,{magic:true}),undefined);assert.equal(monster.hp,9200);
  assert.ok(packets.some(p=>p.t==='damage'&&p.amount===300));
});

test('Sword Blast advertises an achievable range and hits a target near that range',()=>{
 const skill=catalog.skills.find(s=>s.code==='SKILL_SWORD_BLAST'),f=fixture(skill);
 const view=f.system.snapshot().skills.find(s=>s.id===skill.id);
 assert.equal(view.range,120);f.monster.x=110;
 const mp=f.stats.mp,sp=f.stats.sp;f.system.cast(skill.id,1);f.pending.forEach(fn=>fn());
 assert.ok(f.calls.damage.some(call=>call[0]===1));assert.equal(mp-f.stats.mp,8);assert.equal(sp-f.stats.sp,22);
 const distant=fixture(skill);distant.monster.x=400;const before=distant.stats.mp;
 assert.throws(()=>distant.system.cast(skill.id,1),/Aproxime/);assert.equal(distant.stats.mp,before);
});

test('line skills include the validated primary target inside the native collision tolerance',()=>{
 const skill=catalog.skills.find(s=>s.code==='SKILL_SWORD_BLAST'),f=fixture(skill);
 f.monster.x=190;f.system.cast(skill.id,1);f.pending.forEach(fn=>fn());
 assert.ok(f.calls.damage.some(call=>call[0]===1));
});


test('Knight: Grand Cross 10 repeats without cooldown after its animation; Divine Piercing 10 retains seven strikes and delay',()=>{
 const cross=catalog.skills.find(s=>s.code==='SKILL_GRAND_CROSS'),f=fixture(cross,10);
 const view=f.system.cast(cross.id,1);f.pending.splice(0).forEach(fn=>fn());
 assert.equal(view.recharge,0);assert.equal(f.calls.damage.length,2);
 assert.equal(f.calls.damage[0][3].undeadDamagePercent,50);
 assert.ok(view.rows.some(r=>r.label==='No. de acertos'&&r.cur==='2'));
 assert.throws(()=>f.system.cast(cross.id,1),/animação/);
 f.advance(1);f.system.cast(cross.id,1);assert.deepEqual(f.system.exportCooldowns(),{});
 const piercing=catalog.skills.find(s=>s.code==='SKILL_DIVINE_PIERCING'),g=fixture(piercing,10);
 const p=g.system.cast(piercing.id,1);g.pending.forEach(fn=>fn());assert.equal(g.calls.damage.length,7);
 assert.equal(p.recharge,17.5);g.advance(1);assert.throws(()=>g.system.cast(piercing.id,1),/recarga/);
 const h=fixture(piercing,10,{savedCooldowns:g.system.exportCooldowns(),wallNow:()=>1});
 assert.throws(()=>h.system.cast(piercing.id,1),/recarga/);
 g.advance(16.5);g.system.cast(piercing.id,1);
});

test('Knight: attack profiles honor damage, accuracy, repeats and undead bonus tables at every rank',async()=>{
 const {skillAttackProfile}=await import('../skill-damage.mjs');
 const tableNames={SKILL_DOUBLE_CRASH:'D_Crash_Damage',SKILL_BRANDISH:'Brandish_Damage',SKILL_PIERCING:'Piercing_Damage',SKILL_GRAND_CROSS:'Grand_Cross_Damage',SKILL_SWORD_OF_JUSTICE:'Sword_Of_Justice_DamagePercent',SKILL_DIVINE_PIERCING:'Divine_Piercing_DamagePercent'};
 for(const [code,key]of Object.entries(tableNames))for(let n=1;n<=10;n++){
  const s=catalog.skills.find(s=>s.code===code),r=catalog.rules.skills[code],f=fixture(s,n),a=skillAttackProfile(s,r,n,f.stats,f.equipment);
  assert.equal(a.power,1+r.tables[key][n-1]/100,code+'/'+n);
  const count=code==='SKILL_DIVINE_PIERCING'?r.tables.Divine_Piercing_AttackNum[n-1]:['SKILL_DOUBLE_CRASH','SKILL_GRAND_CROSS'].includes(code)?2:1;
  assert.equal(a.hitCount,count,code+'/'+n);
  f.system.cast(s.id,1);f.pending.forEach(fn=>fn());assert.equal(f.calls.damage.length,count,code+'/'+n);
  if(code==='SKILL_GRAND_CROSS'){assert.equal(a.attackRatingPercent,r.tables.Grand_Cross_AttackRate[n-1]);assert.equal(a.undeadDamagePercent,r.tables.Grand_Cross_UndeadDamage[n-1]);}
 }
});

test('Knight: buffs reach combat stats, refresh without stacking, survive reconnect and expire; shield and sword conditions apply',()=>{
 const cases=[['SKILL_HOLY_BODY','undeadAbsorb',33],['SKILL_HOLY_VALOR','undeadDamage',54],['SKILL_DRASTIC_SPIRIT','defensePercent',25],['SKILL_DIVINE_INHALATION','undeadConversion',90],['SKILL_GODLY_SHIELD','absorbPercent',20],['SKILL_GOD_BLESS','damageFlat',33]];
 for(const [code,key,value]of cases){
  const s=catalog.skills.find(s=>s.code===code),f=fixture(s,10);f.system.cast(s.id);
  assert.equal(f.system.bonuses()[key],value,code);assert.equal(f.system.bonuses().hp,0,code+' must not fabricate max HP');
  const actual=combatStats(f.stats,f.equipment,{},f.system.bonuses()),base=combatStats(f.stats,f.equipment);
  if(key==='undeadAbsorb'||key==='undeadDamage'||key==='undeadConversion')assert.equal(actual[key],value);
  if(key==='defensePercent')assert.ok(actual.defense>base.defense);
  if(key==='absorbPercent')assert.equal(actual.damageReduction,value);
  if(key==='damageFlat')assert.equal(actual.damageMin-base.damageMin,value);
  f.advance(20);f.system.cast(s.id);assert.equal(f.system.bonuses()[key],value);
  const h=fixture(s,10,{savedBuffs:f.system.exportBuffs(),wallNow:()=>20});assert.equal(h.system.bonuses()[key],value);
  f.advance(301);f.system.expire();assert.equal(f.system.bonuses()[key],0);
  if(['SKILL_DIVINE_INHALATION','SKILL_GODLY_SHIELD'].includes(code)){h.equipment.shield=null;assert.equal(h.system.bonuses()[key],0);}
 }
 const sword=catalog.skills.find(s=>s.code==='SKILL_SWORD_MASTERY'),f=fixture(sword,10);
 assert.equal(f.system.bonuses().weaponDamage,.38);f.equipment.weapon.code='WA101';assert.equal(f.system.bonuses().weaponDamage,0);
 const training=catalog.skills.find(s=>s.code==='SKILL_PHYSICAL_TRANING');assert.equal(fixture(training,10).system.bonuses().spPercent,30);
});

test('Knight: Divine Inhalation converts only landed undead damage into HP, bounded by maximum HP',async()=>{
 const {incomingHit}=await import('../monster-ai.mjs');
 const stats={level:50,defense:0,absorb:0,undeadConversion:90,hp:500,hpMax:1000};
 const foe={level:50,attack:[100,100],undead:true};
 // Zero rolls avoid misses, blocks and evade with zero defensive chances.
 assert.deepEqual(incomingHit(foe,stats,catalog.rules.accuracy,()=>0),{amount:10,heal:90,kind:'normal'});
 assert.deepEqual(incomingHit({...foe,undead:false},stats,catalog.rules.accuracy,()=>0),{amount:100,heal:0,kind:'normal'});
 assert.equal(incomingHit(foe,{...stats,block:100},catalog.rules.accuracy,()=>0).heal,undefined);
 const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
 const apply=source.slice(source.indexOf('        let amount = hit.amount;'),source.indexOf('        const reflected ='));
 const execute=(hp)=>{const state={...stats,hp};vm.runInNewContext(apply,{stats:state,hit:{amount:10,heal:90,kind:'normal'},monster:{id:1},deliver(){}});return state.hp;};
 assert.equal(execute(500),580);assert.equal(execute(990),1000);
});

test('Knight: actual damage handler applies Grand Cross undead bonus only to undead targets',async()=>{
 const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function damageMonster('),source.indexOf('function publicMonster('));
 const monster={id:1,x:10,z:0,hp:10000,hpMax:10000,seq:0,definition:{level:100,defense:0,absorb:0,attack:[1,1],undead:false}};
 const math=Object.create(Math);math.random=()=>.5;
 const context={mapTravel:null,monsters:new Map([[1,monster]]),game:{pos:{x:0,z:0}},stats:{hp:1000,damageMin:100,damageMax:100,critical:0,attackRating:1000,level:100,undeadDamage:54},skillData:catalog,Math:math,physicalHit,monsterControl,classDamageScale,characterClass:{job:6},balanceRules:{classes:{6:{damageCurve:[{level:1,value:1},{level:150,value:1}]}}},performance:{now:()=>0},skills:{reveal(){}},updateQuests(){},premiumRecovery:()=>({hp:0,mp:0}),premiumValue:()=>0,deliver(){}};
 const hit=vm.runInNewContext(`(${fn})`,context);
 assert.equal(hit(1,1.8,500,{magic:true,undeadDamagePercent:50}),180);
 monster.definition.undead=true;assert.equal(hit(1,1.8,500,{magic:true,undeadDamagePercent:50}),367);
});

test('Knight: Holy Incantation applies advertised HP bonus only on success and restores health on release',async()=>{
 const {applyConversionHealth,restoreConversionHealth}=await import('../skill-runtime.mjs');
 const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('  convert: (monster, skill) => {')+11,source.indexOf('\n});\nconst groundDrops'));
 const math=Object.create(Math),companions=new Map();math.random=()=>0;
 const convert=vm.runInNewContext('('+fn.trim().replace(/,$/,'')+')',{skillData:catalog,Math:math,notice(){},hero:{name:'Knight'},applyConversionHealth,performance:{now:()=>0},updateQuests(){},companions,deliver(){},publicMonster:m=>m});
 const make=()=>({id:1,hp:50,hpMax:100,seq:0,definition:{attack:[10,20]}});
 const m=make();convert(m,{code:'SKILL_HOLY_INCANTATION',level:10,duration:300});assert.equal(m.hpMax,380);assert.equal(m.hp,190);assert.equal(m.owner,'Knight');assert.equal(companions.size,1);
 restoreConversionHealth(m);assert.equal(m.hpMax,100);assert.equal(m.hp,50);
 math.random=()=>.99;const failed=make();convert(failed,{code:'SKILL_HOLY_INCANTATION',level:10,duration:300});assert.equal(failed.owner,undefined);assert.equal(failed.hpMax,100);
});

test('Knight: Sword of Justice hits the advertised circular area, including enemies beside and behind',()=>{
 const s=catalog.skills.find(s=>s.code==='SKILL_SWORD_OF_JUSTICE'),f=fixture(s,10);
 for(const m of [{id:2,hp:100,x:0,z:170},{id:3,hp:100,x:-170,z:0},{id:4,hp:100,x:176,z:0}])f.ctx.monsters.set(m.id,m);
 const v=f.system.cast(s.id);f.pending.forEach(fn=>fn());assert.equal(v.area.radius,175);
 assert.deepEqual(f.calls.damage.map(a=>a[0]).sort(),[1,2,3]);
});


test('native village adapter casts self buffs through the real runtime, preserving costs and blocking cooldown, death and offense',async()=>{
 const {mountLocalSkillCasting}=await import('../skill-runtime.mjs');
 const s=catalog.skills.find(s=>s.code==='SKILL_HOLY_BODY'),f=fixture(s,10,{isVillage:()=>true});
 let delegated=0;const game={gm:{god:false},lastStats:f.stats,time:0,attackAnimUntil:0,markManual(){},eatHold:()=>false,skillCooldownLeft:()=>0,skillInfo:id=>f.system.snapshot().skills.find(s=>s.id===id),useSkill(){delegated++;return false;},sendSkill:id=>f.system.cast(id)};
 const original=game.useSkill,dispose=mountLocalSkillCasting(game,()=>true),mp=f.stats.mp;
 assert.equal(game.useSkill(s.id),true);assert.equal(f.stats.mp,mp-catalog.rules.skills[s.code].runtime.mp[9]);assert.equal(f.system.bonuses().undeadAbsorb,33);
 game.skillCooldownLeft=()=>17;assert.equal(game.useSkill(s.id),false);assert.equal(f.stats.mp,mp-catalog.rules.skills[s.code].runtime.mp[9]);
 game.skillCooldownLeft=()=>0;game.dead=true;assert.equal(game.useSkill(s.id),false);game.dead=false;
 game.lastStats={mp:0,sp:0};assert.equal(game.useSkill(s.id),false);
 assert.equal(game.useSkill(601),false);assert.equal(delegated,1);dispose();assert.equal(game.useSkill,original);
});

test('Knight shield skills reject missing shields before charging MP or cooldown',()=>{
 for(const code of ['SKILL_DIVINE_INHALATION','SKILL_GODLY_SHIELD']){const s=catalog.skills.find(s=>s.code===code),f=fixture(s,10);f.equipment.shield=null;const before={...f.stats};assert.throws(()=>f.system.cast(s.id),/escudo/);assert.deepEqual(f.stats,before);assert.deepEqual(f.system.exportCooldowns(),{});assert.equal(f.system.buffs().length,0);}
});


test('Knight restored buffs retain their classic icon after travel or reconnect',()=>{
 for(const code of ['SKILL_HOLY_BODY','SKILL_HOLY_VALOR','SKILL_DRASTIC_SPIRIT','SKILL_DIVINE_INHALATION','SKILL_GODLY_SHIELD','SKILL_GOD_BLESS']){const s=catalog.skills.find(s=>s.code===code),f=fixture(s,10);f.system.cast(s.id);const restored=fixture(s,10,{savedBuffs:f.system.exportBuffs()});assert.equal(restored.system.buffs()[0].icon,s.classicIcon,code);assert.equal(restored.system.buffs()[0].icon,f.system.buffs()[0].icon);}
});

test('measured 2018 raw cooldowns are enforced at all ten ranks in actual runtime',()=>{
  const measured={SKILL_FLAME_WAVE:2.5,SKILL_CURSE_LAZY:7.5,SKILL_SOUL_MANACLE:17.5,
    SKILL_CHASING_HUNT:5,SKILL_JUDGEMENT:0.5,SKILL_MOURNING_OF_PRAY:5};
  for(const [code,seconds] of Object.entries(measured)){
    const skill=catalog.skills.find(s=>s.code===code);
    assert.ok(skill,code);
    for(let level=1;level<=10;level++){
      const f=fixture(skill,level),p=catalog.rules.skills[code].runtime;
      const v=f.system.snapshot().skills.find(s=>s.id===skill.id);
      assert.equal(v.recharge,seconds,code+' rank '+level);
      assert.equal(v.cooldownSource,'community-frame-measurement-2018',code);
      const target=p.target==='enemy'||p.target==='ally'?1:undefined;
      f.system.cast(skill.id,target);
      const total=Math.max(1,seconds);
      if(seconds>0.5){
        assert.equal(f.system.exportCooldowns()[code].total,total,code+' persisted');
        f.advance(total-0.01);
        assert.throws(()=>f.system.cast(skill.id,target),/recarga|animação/,code);
        f.advance(0.02);
      }else{
        f.advance(0.99);
        assert.throws(()=>f.system.cast(skill.id,target),/recarga|animação/,code);
        f.advance(0.02);
      }
      f.system.cast(skill.id,target);
    }
  }
});

test('Divine Piercing plays a 2.2s combo, keeps 3/5/7 hits and cannot be spammed before 5.2s',()=>{
  const skill=catalog.skills.find(s=>s.code==='SKILL_DIVINE_PIERCING');
  const alt=catalog.skills.find(s=>s.code==='SKILL_PIERCING');
  for(const [level,count] of [[1,3],[4,3],[5,5],[8,5],[9,7],[10,7]]){
    const f=fixture(skill,level,{saved:{[skill.code]:level,[alt.code]:10},timing:()=>({duration:2.2,hits:[.4,1.1,1.8]})});
    const view=f.system.snapshot().skills.find(s=>s.id===skill.id);
    assert.equal(view.recharge,5.2,'raw cooldown level '+level);
    f.system.cast(skill.id,1);
    assert.equal(f.pending.length,count,'damage strikes level '+level);
    assert.equal(f.system.exportCooldowns()[skill.code].total,5.2);
    assert.throws(()=>f.system.cast(alt.id,1),/animação|recarga/,'cannot interrupt combo level '+level);
    f.advance(2.19);
    assert.throws(()=>f.system.cast(alt.id,1),/animação|recarga/);
    f.advance(.02);
    f.system.cast(alt.id,1);
    assert.throws(()=>f.system.cast(skill.id,1),/recarga|animação/);
    f.advance(3.0);
    f.system.cast(skill.id,1);
  }
});
