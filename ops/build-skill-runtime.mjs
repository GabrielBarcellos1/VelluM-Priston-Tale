// Reproducible VelluM profile. Public observations are facts; other values are authored balance.
import { readFile, writeFile } from 'node:fs/promises';
import { effectFor, emptyEffects } from '../skill-effects.mjs';
import { skillAttackProfile } from '../skill-damage.mjs';
import { configuredSkillCooldown } from '../skill-cooldowns.mjs';
const path = new URL('../data/skills.json', import.meta.url);
const catalog = JSON.parse(await readFile(path, 'utf8'));
const rules = catalog.rules;
const originalCodes = rules.classicSkillCodes ?? Object.keys(rules.skills);
rules.classicSkillCodes = originalCodes;
for (const code of Object.keys(rules.skills)) {
  if (!originalCodes.includes(code)) delete rules.skills[code];
  else delete rules.skills[code].runtime;
}
const levels = fn => Array.from({ length: 10 }, (_, i) => fn(i + 1));
const linear = (first, increment) => levels(n => Math.round((first + increment * (n - 1)) * 100) / 100);
const key = code => 'SKILL_' + code;
const overrides = {
  SCOUT_HAWK: 'buff', COMPULSION: 'buff', MAGNETIC_SPHERE: 'summon', SPIRIT_ELEMENTAL: 'buff',
  REGENERATION_FIELD: 'buff', VIRTUAL_LIFE:'party', ADVENT_MIGAL: 'party', ADVENT_MIDRANDA: 'party',
  LAND_OF_GHOST: 'aoe', SOUL_SHOCK: 'debuff', FROST_WIND: 'aoe',
};
const specials = { AGONY:'agony', RESURRECTION:'resurrection', SOUL_SUCKER:'drain',
  HOLY_INCANTATION:'convert', EXTINCTION:'extinction', REGENERATION_FIELD:'regeneration',
  COMPULSION:'taunt', VANISH:'stealth', BLIND:'stealth' };
const ownEffects = {
 DUALSWORDMASTERY: ['weaponDamage', .04, .02], ATTACK_MASTERY: ['attackRatingPercent', 6, 3],
 FATAL_MASTERY: ['critical', 2, 1.5], ALAS: ['evade', 3, 1.5], INPES: ['attackSpeedPercent', 3, 2],
 BLIND: ['damage', .05, .025], INNER_PEACE: ['mpPercent', 6, 3],
 CHASING_HUNT: ['attackRatingPercent', 5, 3], RAIN_MAKER: ['absorbPercent', 3, 1.5],
 ADVENT_MIGAL: ['damage', .05, .02], ADVENT_MIDRANDA: ['attackSpeedPercent', 3, 2],
 STRENGTH_MASTERY: ['weaponDamage', .04, .02], STAMINA_MASTERY: ['spPercent', 6, 3],
 RAGE_UP: ['damage', .05, .025], INSTANT_BULK_UP: ['hpPercent', 5, 3], STEELERS: ['absorbPercent', 3, 1.5],
};
const multi = { RUNNING_HIT:2, SORE_SWORD:2, BEAT_UP:3, PASTING_SHADOW:4,
 DOUBLE_BACKSPIN_BLOW:2, PATRIOT:2, TYPHOON:3, JUMPING_HEEL_KICK:2, COMBINATION:4 };
const rangedTables = {
 MECHANIC_BOMB:'Mechanic_Bomb_Damage', PIKE_WIND:'Pike_Wind_Damage', GROUND_PIKE:'G_Pike_Damage',
 VENOM_SPEAR:'VenomSpear_Damage', SHIELD_STRIKE:'S_Strike_Damage', VIGOR_SPEAR:'V_Spear_Damage',
 FIRE_JAVELIN:'Fire_Javelin_Damage', LIGHTNING_JAVELIN:'Lightning_Javelin_Damage', SWORD_BLAST:'Sword_Blast_Damage',
};
const models = {
 METAL_GOLEM:'char/monster/chaingolem/chaingolem', RECALL_WOLVERIN:'char/monster/monwolverin/monwolverin-01',
 FIRE_ELEMENTAL:'char/monster/firegolem/firegolem', RECALL_BLOODY_KNIGHT:'char/monster/bloodyknight/bknight',
};
const summonTables = { METAL_GOLEM:['Metal_Golem_Damage','Metal_Golem_Life'],
 RECALL_WOLVERIN:['Recall_Wolverin_Damage','Recall_Wolverin_Life'], FIRE_ELEMENTAL:['Fire_Elemental_Damage','Fire_Elemental_Life'],
 FALCON:['Falcon_Damage'], GOLDEN_FALCON:['Golden_Falcon_Damage'], DANCING_SWORD:['Dancing_Sword_FireDamage'],
 MAGNETIC_SPHERE:['Magnetic_Sphere_AddDamage'], SUMMON_MUSPELL:['Summon_Muspell_Damage'] };
const geometryTables = { MECHANIC_BOMB:'Mechanic_Bomb_Attack_Range', PIKE_WIND:'Pike_Wind_Push_Lenght',
 GROUND_PIKE:'G_Pike_Range', VENOM_SPEAR:'VenomSpear_Range', ROAR:'Roar_Range', DISTORTION:'Distortion_Area',
 COMPULSION:'Compulsion_Area', REGENERATION_FIELD:'Regeneration_Field_Area', CYCLONE_STRIKE:'Cyclone_Strike_Area',
 BRANDISH:'Brandish_Range', FIRE_BALL:'FireBall_Area', WATORNADO:'Watornado_Area', M_METEO:'Meteo_Area',
 DIASTROPHISM:'Diastrophism_Area', FLAME_WAVE:'Flame_Wave_Area', GLACIAL_SPIKE:'Glacial_Spike_Area',
 ARROW_OF_RAGE:'A_Rage_Area', BOMB_SHOT:'BombShot_Area', X_RAGE:'X_Rage_Area', TORNADO:'Tornado_Range' };
const lines={PERFORATION:[40,[270,274,278,282,286,290,294,298,305,310]],PHOENIX_SHOT:[50,340],
 SHIELD_STRIKE:[50,160],SOUL_SUCKER:[30,200],STORM_JAVELIN:[30,340],
 SWORD_BLAST:[40,[120,125,130,135,140,145,150,155,160,170]],PIERCING:[40,140],
 SWORD_OF_JUSTICE:[70,[140,150,160,170,180,200,220,240,260,280]],FLAME_WAVE:[60,340],
 GLACIAL_SPIKE:[50,340],EXPANSION:[30,levels(n=>100+Math.trunc(480*n/100))]};
const targetCircles=new Set(['ARROW_OF_RAGE','BOMB_SHOT','X_RAGE','BRANDISH','FIRE_BALL','WATORNADO','M_METEO','MECHANIC_BOMB','GREAT_SMASH','SPARK','IMPULSION','LIGHTNING_JAVELIN']);
for (const skill of catalog.skills) {
 const code = skill.code, name = code.slice(6), old = rules.skills[code];
 const tables = old?.tables ?? {}, kind = overrides[name] ?? skill.kind;
 const profile = { version:1, source:old?'classic-tables-with-vellum-execution':'vellum-authored',
   verifiedCompleteForPweb:false, kind, special:specials[name] ?? null,
   mp:old?.mp ?? linear(8 + skill.tier*5, 2 + skill.tier),
   stamina:old?.stamina ?? linear(12 + skill.tier*4, 2),
   duration:old?.duration ?? levels(() => ['buff','party','summon'].includes(kind)?120:kind==='debuff'?6:0),
   cooldown:levels(n => kind==='passive'?0:configuredSkillCooldown(old,n,rules.freestonProfile?.[code]) ??
     (['buff','party','summon'].includes(kind)?8:kind==='debuff'?10:multi[name]?2.5:kind==='aoe'||kind==='nova'?4:1)),
   range:levels(() => ['melee'].includes(kind)?130:500),
   radius:levels(n => tables[geometryTables[name]]?.[n-1] ?? (['aoe','nova','debuff'].includes(kind)?100+n*6:0)),
   targetLimit:levels(n => Math.min(12, 3+Math.floor(n/2)+skill.tier)),
   effects:[], attacks:[], controls:[], summon:null,
 };
 profile.shape={type:lines[name]?'line':name==='CHAIN_LIGHTNING'?'chain':'circle',
   center:targetCircles.has(name)||lines[name]||name==='CHAIN_LIGHTNING'?'target':'self',
   width:lines[name]?.[0]??0,
   length:levels(n=>Array.isArray(lines[name]?.[1])?lines[name][1][n-1]:lines[name]?.[1]??0)};
 if(name==='LIGHTNING_JAVELIN')profile.radius=levels(()=>100);
 if(name==='DIVINE_LIGHTNING')profile.radius=levels(()=>180);
 if(name==='EXTINCTION')profile.radius=levels(()=>160);
 if(name==='GREAT_SMASH')profile.radius=levels(()=>70);
 if(name==='SPARK'||name==='MECHANIC_BOMB')profile.radius=levels(n=>80+5*n);
 if(name==='CHAIN_LIGHTNING'){profile.chainRange=tables.Chain_Lightning_Range;profile.targetLimit=tables.Chain_Lightning_Num;}
 if(name==='IMPULSION')profile.targetLimit=tables.Impulsion_LightingNum;
 if(name==='DIVINE_LIGHTNING')profile.targetLimit=tables.Divine_Lightning_Num;
 profile.target=['buff','party','summon','heal'].includes(kind)?'self':profile.shape.center==='target'?'enemy':
   ['aoe','nova','debuff'].includes(kind)?'area':'enemy';
 if(name==='HEALING')profile.target='ally';
 if(name==='RESURRECTION')profile.target='self';
 if(name==='HOLY_INCANTATION')profile.target='enemy';
 if (kind==='passive') { profile.mp=levels(()=>0); profile.stamina=levels(()=>0); }
 for (let n=1;n<=10;n++) {
   const e=ownEffects[name]?emptyEffects():effectFor(skill,n,rules);
   if(ownEffects[name]) { const [field,base,step]=ownEffects[name]; e[field]=Math.round((base+(n-1)*step)*10000)/10000; }
   if(name==='SCOUT_HAWK')e.attackRatingPercent=tables.Scout_Hawk_Attack_Rate?.[n-1]??5+3*n;
   if(name==='COMPULSION')e.absorb=tables.Compulsion_AddAbsorb?.[n-1]??5+n;
   if(name==='SPIRIT_ELEMENTAL')e.magicPowerPercent=tables.Spirit_Elemental_Damage?.[n-1]??3*n;
   if(name==='ADVENT_MIGAL')e.magicPowerPercent=5+2*(n-1);
   if(name==='VANISH'||name==='BLIND')e.stealth=1;
   if(name==='REGENERATION_FIELD') {e.hpRegen=tables.Regeneration_Field_LifeRegen?.[n-1]??n;e.regen=tables.Regeneration_Field_ManaRegen?.[n-1]??n;}
   if(name==='GOLDEN_FALCON')e.hpRegen=tables.Golden_Falcon_LifeRegen?.[n-1]??0;
   if(name==='DIVINE_INHALATION')e.hp=tables.D_Inhalation_Life?.[n-1]??0;
   if(name==='SUMMON_MUSPELL'){e.undeadAbsorb=tables.Summon_Muspell_UndeadAbsorbPercent?.[n-1]??0;e.block=tables.Summon_Muspell_BlockPercent?.[n-1]??0;}
   profile.effects.push(Object.fromEntries(Object.entries(e).filter(([,v])=>typeof v==='object'?Object.values(v).some(Boolean):v!==0)));
   const evaluated=skillAttackProfile(skill,old,n,{level:100,spi:100},{});
   let attack={ model:'classic' };
   if(evaluated.source==='freeston-fallback') {
     const pair=tables[rangedTables[name]]?.[n-1];
     attack=Array.isArray(pair)?{model:'range',range:pair,weaponFactor:.25,magic:!['PIKE_WIND'].includes(name),element:skill.publicVisual.el??null}:
       {model:'weapon',percent:8+skill.tier*10+(n-1)*(4+skill.tier),hitCount:multi[name]??1,magic:[7,8,10].includes(skill.job)};
     if(skill.job===10)attack={model:'range',range:[10+skill.tier*10+n*6,25+skill.tier*15+n*9],weaponFactor:.3,spiritDivisors:[8,6],levelDivisor:3,magic:true};
     if(name==='CRITICAL_HIT')attack={model:'weapon',percent:0,criticalBonus:tables.Critical_Hit_Critical[n-1]};
     if(name==='FARINA')attack={model:'weapon',percent:0,attackRatingPercent:tables.Farina_AttackRate[n-1]};
     if(name==='GREAT_SMASH')attack={model:'weapon',percent:0,flatDamage:tables.G_Smash_Attack_Rage[n-1],attackRatingPercent:tables.G_Smash_Attack_Rate[n-1]};
     if(name==='ELEMENTAL_SHOT')attack={model:'range',range:tables.Elemental_Shot_Fire[n-1],weaponFactor:1,magic:true,element:'fire'};
   }
   if(name==='RAVING')attack={model:'weapon',percent:3*n,hitCount:tables.Ravind_Speed[n-1],hpCostPercent:tables.Raving_UseLife[n-1]};
   if(name==='IMPACT')attack={model:'weapon',percent:8+2*n,attackRatingFlat:3+3*n};
   if(name==='TRIPLE_IMPACT')attack={model:'weapon',percent:4+3*n,hitCount:tables.T_Impact_Hit[n-1]};
   if(name==='BRUTAL_SWING')attack={model:'weapon',percent:2+3*n,criticalBonus:1+2*(n-1),monsterBonus:{demon:40}};
   if(name==='RAGE_OF_ZECRAM')attack={model:'weapon',percent:3*n,element:'fire'};
   if(name==='SOUL_SHOCK')profile.special='stun';
   if(name==='VENOM_THRONE'||name==='POLLUTED'||name==='VENOM_SPEAR')attack.dot={percent:3+n*1.5,seconds:4+Math.floor(n/2),element:'poison'};
   if(name==='FROST_WIND'||name==='GLACIAL_SPIKE'||name==='GROUND_PIKE')attack.control={slowPercent:15+n*2,seconds:2+n*.3};
   if(name==='BODY_CHECK')attack.control={stunSeconds:.3+n*.08};
   profile.attacks.push(attack);
   const control={seconds:Math.min(12,tables.Distortion_Time?.[n-1]??tables.Assassin_Eye_Time?.[n-1]??2+n*.5),
     slowPercent:0,attackReductionPercent:0,defenseReductionPercent:0,criticalBonus:0,stunSeconds:0};
   if(name==='ROAR'||name==='SOUL_SHOCK'||name==='WAR_CRY')control.stunSeconds=name==='ROAR'?n:1+n*.3;
   if(name==='DISTORTION'||name==='CURSE_LAZY') {control.slowPercent=tables.Distortion_SpeedSubPercent?.[n-1]??8+n*2;control.attackReductionPercent=tables.Distortion_DamageSubPercent?.[n-1]??4+n;}
   if(name==='WISP'||name==='HOLY_MIND')control.attackReductionPercent=tables.HolyMind_DecDamage?.[n-1]??5+n*2;
   if(name==='SOUL_MANACLE')control.stunSeconds=1+n*.35;
   control.seconds=Math.max(control.seconds,control.stunSeconds);
   if(name==='ASSASSIN_EYE'){control.criticalBonus=tables.Assassin_Eye_AddCritical[n-1];control.attackReductionPercent=tables.Assassin_Eye_M_SubCritical[n-1];}
   profile.controls.push(control);
 }
 if(kind==='summon') {
   const [damageKey,lifeKey]=summonTables[name]??[];
   profile.summon={model:models[name]??null, damage:levels(n=>{const v=tables[damageKey]?.[n-1]??[10+skill.tier*10+n*4,20+skill.tier*15+n*6];return Array.isArray(v)?v:[v,v];}),
    hp:levels(n=>tables[lifeKey]?.[n-1]??100+n*100),interval:levels(n=>tables.Magnetic_Sphere_AttackDelay?.[n-1]??tables.Dancing_Sword_AttackDelay?.[n-1]??tables.Summon_Muspell_Attack_Delay?.[n-1]??1.8),range:600};
 }
 if(name==='RESURRECTION'){profile.cooldown=linear(30,-1);profile.radius=levels(()=>500);}
 if(name==='AGONY'||name==='RESURRECTION')profile.duration=levels(()=>0);
 if(kind==='debuff'&&!profile.special||profile.special==='stun')profile.duration=profile.controls.map(c=>c.stunSeconds||c.seconds);
 if(name==='ROAR')profile.controls.forEach((c,i)=>c.seconds=profile.duration[i]);
 if(name==='SCOUT_HAWK')profile.duration=tables.Scout_Hawk_UseTime;
 if(name==='SPIRIT_ELEMENTAL')profile.duration=tables.Spirit_Elemental_Time;
 if(name==='COMPULSION')profile.duration=tables.Compulsion_Time;
 if(name==='REGENERATION_FIELD')profile.duration=tables.Regeneration_Field_Time;
 if(name==='METAL_GOLEM'||name==='RECALL_WOLVERIN'||name==='FIRE_ELEMENTAL')profile.duration=levels(()=>300);
 const record=rules.skills[code]??{reqLevel:skill.reqLevel,mp:profile.mp,stamina:profile.stamina,tables:{}};
 record.runtime=profile;rules.skills[code]=record;
}
rules.runtimeVersion=1;
rules.runtimePolicy={name:'VelluM class roles v1',pwebEquivalent:false,partyMode:'nearby-allies',
 observedFirstTwoLevels:['SKILL_MELEE_MASTERY','SKILL_FIRE_ATTRIBUTE','SKILL_RAVING','SKILL_IMPACT','SKILL_TRIPLE_IMPACT','SKILL_BRUTAL_SWING','SKILL_ROAR'],
 authoredRemainingProgressions:true};
await writeFile(path,JSON.stringify(catalog,null,2)+'\n','utf8');
console.log(JSON.stringify({skills:catalog.skills.length,profiles:Object.values(rules.skills).filter(r=>r.runtime).length}));
