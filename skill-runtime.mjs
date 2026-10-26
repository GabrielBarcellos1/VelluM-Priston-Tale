import { emptyEffects, effectFor, effectRows, sumEffects } from './skill-effects.mjs';
import { skillAttackProfile, skillAttackRows, skillHitTimes, skillHealingRange } from './skill-damage.mjs';

const at = (a, n) => a?.[Math.max(0, Math.min(9, Math.trunc(n) - 1))];
const alive = m => m && m.hp > 0 && !m.owner;
export function validateRuntimeCatalog(catalog) {
  for (const skill of catalog.skills) {
    const p = catalog.rules.skills[skill.code]?.runtime;
    if (!p) throw Error(`Perfil ausente: ${skill.code}`);
    for (const key of ['mp','stamina','cooldown','duration','range','radius','targetLimit','effects','attacks','controls']) {
      if (!Array.isArray(p[key]) || p[key].length !== 10) throw Error(`Progressão incompleta: ${skill.code}/${key}`);
      if (!['effects','attacks','controls'].includes(key) && p[key].some(v => !Number.isFinite(v) || v < 0))
        throw Error(`Progressão inválida: ${skill.code}/${key}`);
    }
    if (p.kind === 'summon' && !p.summon) throw Error(`Invocação incompleta: ${skill.code}`);
  }
}

export function selectSkillTargets(profile, level, origin, primary, monsters) {
  const living = [...monsters].filter(alive);
  const count = at(profile.targetLimit, level) ?? 20;
  const radius = at(profile.radius, level) ?? 0;
  if (profile.shape.type === 'chain') {
    if (!alive(primary)) return [];
    const result = [primary], range = at(profile.chainRange, level) ?? radius;
    while (result.length < count) {
      const from = result.at(-1);
      const next = living.filter(m => !result.includes(m) && Math.hypot(m.x-from.x,m.z-from.z) <= range)
        .sort((a,b) => Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z))[0];
      if (!next) break; result.push(next);
    }
    return result;
  }
  if (profile.shape.type === 'line') {
    if (!primary) return [];
    const dx=primary.x-origin.x,dz=primary.z-origin.z,len=Math.hypot(dx,dz)||1;
    const reach=Math.max(at(profile.shape.length,level),len),width=profile.shape.width;
    return living.filter(m => {const x=m.x-origin.x,z=m.z-origin.z,t=(x*dx+z*dz)/len;
      return t>=0 && t<=reach && Math.abs(x*dz-z*dx)/len<=width;})
      .sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z)).slice(0,count);
  }
  const center=profile.shape.center==='target'?primary:origin;
  if (!center) return [];
  if (!radius) return alive(primary)?[primary]:[];
  return living.filter(m=>Math.hypot(m.x-center.x,m.z-center.z)<=radius)
    .sort((a,b)=>Number(b===primary)-Number(a===primary)||Math.hypot(a.x-center.x,a.z-center.z)-Math.hypot(b.x-center.x,b.z-center.z)).slice(0,count);
}

export function monsterControl(monster, now = performance.now()) {
  const out={slowPercent:0,attackReductionPercent:0,criticalBonus:0,stunned:false};
  for (const [key,c] of Object.entries(monster.skillControls??{})) {
    if(c.until<=now){delete monster.skillControls[key];continue;}
    out.slowPercent=Math.max(out.slowPercent,c.slowPercent??0);
    out.attackReductionPercent=Math.max(out.attackReductionPercent,c.attackReductionPercent??0);
    out.criticalBonus=Math.max(out.criticalBonus,c.criticalBonus??0);
    out.stunned ||= (c.stunUntil??0)>now;
  }
  return out;
}

export function createRuntimeSkillSystem(ctx) {
  validateRuntimeCatalog(ctx.catalog);
  const definitions=ctx.catalog.skills;
  const rule=s=>ctx.catalog.rules.skills[s.code];
  const profile=s=>rule(s).runtime;
  const list=definitions.filter(s=>s.job===ctx.job).map(s=>({...s,kind:profile(s).kind}));
  const now=ctx.now??(()=>performance.now()/1000),wall=ctx.wallNow??(()=>Date.now()/1000);
  const levels=new Map(list.map(s=>[s.id,Math.max(0,Math.min(10,Math.trunc(ctx.saved?.[s.code]??0)))]));
  const ready=new Map(),totals=new Map(),active=new Map(),dots=new Map();
  let actionReady=0,generation=0;
  const learned=s=>levels.get(typeof s==='number'?s:s.id)??0;
  const rank=()=>ctx.rank?ctx.rank():ctx.stats.level>=60?3:ctx.stats.level>=40?2:ctx.stats.level>=20?1:0;
  const points=()=>({skill:Math.max(0,Math.floor(Math.max(0,ctx.stats.level-8)/2)-list.filter(s=>s.tier<4).reduce((n,s)=>n+learned(s),0)),
    elite:Math.max(0,Math.floor(Math.max(0,ctx.stats.level-58)/2)-list.filter(s=>s.tier===4).reduce((n,s)=>n+learned(s),0))});
  function liveBuffs(){const best=new Map();for(const b of active.values())if(b.until>now()&&(!best.has(b.code)||best.get(b.code).level<b.level))best.set(b.code,b);return [...best.values()];}
  const attackFor=(s,n)=>skillAttackProfile(s,rule(s),Math.max(1,n),ctx.stats,ctx.equipment?.()??{},ctx.stats.magicPowerPercent??0);
  function view(s) {
    const p=profile(s),n=learned(s),next=Math.min(10,n+1),passive=p.kind==='passive';
    const v={...s,level:n,passive,locked:s.tier>rank()+1,icon:s.classicIcon??s.icon,iconProvenance:s.iconProvenance,
      reqLevel:(rule(s).reqLevel??s.reqLevel)+n*2,maxLevel:10,price:100*s.tier*(n+1)**2,
      mp:passive||ctx.resourceFree?.()?0:Math.ceil(at(p.mp,n)*(1-(ctx.premiumValue?.('manaReduce')??0)/100)),
      mpNext:passive||ctx.resourceFree?.()?0:Math.ceil(at(p.mp,next)*(1-(ctx.premiumValue?.('manaReduce')??0)/100)),
      stamina:passive||ctx.resourceFree?.()?0:Math.ceil(at(p.stamina,n)*(1-(ctx.premiumValue?.('staminaReduce')??0)/100)),
      recharge:at(p.cooldown,n),cooldown:at(p.cooldown,n),duration:at(p.duration,n),range:at(p.range,n),
      target:p.target,slot:passive?undefined:rule(s).slot??'both',mastery:n?10000:0,
      ruleSource:p.source,cooldownSource:p.source,desc:s.descriptionPt??s.name,rows:[],
      area:{radius:at(p.radius,n),targetLimit:at(p.targetLimit,n),shape:p.shape.type}};
    if(p.shape.type === 'line') v.range = Math.min(v.range, at(p.shape.length,n) ?? v.range);
    if(!passive&&v.cooldown){try{v.cooldown=Math.max(v.cooldown,ctx.timing?.(v)?.duration??0);}catch{}}
    if(ready.get(s.id)>now())v.cooldown=totals.get(s.id);
    if(['buff','party','summon','passive'].includes(p.kind)) {
      const current=new Map(effectRows(effectFor(s,n,ctx.catalog.rules)).map(r=>[r.label,r.cur]));
      const following=new Map(effectRows(effectFor(s,next,ctx.catalog.rules)).map(r=>[r.label,r.cur]));
      v.rows=[...new Set([...current.keys(),...following.keys()])].map(label=>({label,cur:current.get(label)??'0',next:following.get(label)??'0'}));
    }
    if(['melee','shot','beam','sky','aoe','nova'].includes(p.kind)&&!p.special) {
      const a=attackFor(s,n),b=attackFor(s,next);v.rows=skillAttackRows(a,b);v.damageSource=a.source;
    }
    if(p.kind==='summon')v.rows.push({label:'Dano da invocação',cur:at(p.summon.damage,n).join('–'),next:at(p.summon.damage,next).join('–')},
      {label:'Intervalo de ataque',cur:`${at(p.summon.interval,n)} s`,next:`${at(p.summon.interval,next)} s`});
    if(p.kind==='heal') {
      const heal=rank=>skillHealingRange(s,rule(s),Math.max(1,rank),ctx.stats,ctx.equipment?.()??{})??[40+rank*25,60+rank*35];
      v.rows.push({label:'HP recuperado',cur:heal(n).join('–'),next:heal(next).join('–')});
    }
    if(p.special==='agony')v.rows.push({label:'HP convertido em MP',cur:`${at(rule(s).tables.Agony_ConvLife,n)}%`,next:`${at(rule(s).tables.Agony_ConvLife,next)}%`});
    if(p.special==='resurrection')v.rows.push({label:'HP ao ressuscitar',cur:`${30+Math.max(1,n)*5}%`,next:`${30+next*5}%`});
    if(p.kind==='debuff'||p.special==='stun') {
      const c=at(p.controls,n),d=at(p.controls,next);
      for(const [field,label] of [['slowPercent','Redução de velocidade'],['attackReductionPercent','Redução de ataque'],['criticalBonus','Crítico contra o alvo'],['stunSeconds','Atordoamento']])
        if(c[field]||d[field])v.rows.push({label,cur:`${c[field]}${field==='stunSeconds'?' s':'%'}`,next:`${d[field]}${field==='stunSeconds'?' s':'%'}`});
    }
    if(v.duration)v.rows.push({label:'Duração',cur:`${v.duration} s`,next:`${at(p.duration,next)} s`});
    if(!passive)v.rows.push({label:'Recarga',cur:`${v.cooldown.toFixed(2)} s`,next:`${at(p.cooldown,next).toFixed(2)} s`});
    return v;
  }
  const snapshot=()=>({t:'skills',job:ctx.job,className:ctx.catalog.classes.find(c=>c.job===ctx.job).name,
    skills:list.map(view),skillPoints:points().skill,elitePoints:points().elite,rank:rank()});
  function tickCooldowns(){for(const [id,until]of ready){const seconds=Math.max(0,until-now());ctx.emit?.({t:'skillCooldown',id,seconds,total:totals.get(id)});if(!seconds){ready.delete(id);totals.delete(id);}}}
  function publish(){ctx.emit?.(snapshot());tickCooldowns();}
  function bonuses(){return sumEffects([...list.filter(s=>s.kind==='passive'&&learned(s)).map(s=>effectFor(s,learned(s),ctx.catalog.rules,ctx.equipment?.()??null)),
    ...liveBuffs().map(b=>effectFor(b,b.level,ctx.catalog.rules,ctx.equipment?.()??null))]);}
  function buffs(){return liveBuffs().map(b=>({code:'skill:'+b.code,name:b.name,level:b.level,icon:b.icon??b.classicIcon,
    secondsLeft:Math.ceil(b.until-now()),left:Math.ceil(b.until-now()),total:at(profile(b).duration,b.level),
    rows:effectRows(effectFor(b,b.level,ctx.catalog.rules)).map(r=>({label:r.label,value:r.cur}))}));}
  function buff(s,n,seconds=at(profile(s).duration,n),party=false){active.set((party?'party:':'')+s.code,{...s,level:n,until:now()+seconds,party});ctx.recalculate?.();ctx.buffsChanged?.();}
  function control(s,n,targets,custom=null){const c=custom??at(profile(s).controls,n);for(const m of targets){
    const boss=m.definition?.boss||m.definition?.class==='boss',scale=boss ? .25 : 1;
    m.skillControls??={};m.skillControls[s.code]={...c,until:now()*1000+(c.seconds??3)*1000,
      stunUntil:now()*1000+(c.stunSeconds??0)*1000*scale,slowPercent:Math.min(60,(c.slowPercent??0)*scale),attackReductionPercent:Math.min(60,(c.attackReductionPercent??0)*scale)};
    if(c.stunSeconds)m.seq=(m.seq??0)+1;
    m.skillMarks??={};m.skillMarks[s.code]=now()*1000;
  }}
  function reveal(){let changed=false;for(const [id,b]of active)if(profile(b).special==='stealth'){active.delete(id);changed=true;}if(changed){ctx.recalculate?.();ctx.buffsChanged?.();}}
  function cast(id,target) {
    const s=list.find(s=>s.id===id),n=learned(id);if(!s||!n||s.kind==='passive')throw Error('Aprenda uma habilidade ativa antes de usá-la.');
    if(s.tier>rank()+1&&!ctx.freeCast?.())throw Error('Conclua o desafio de classe para liberar este tier.');
    const game=ctx.game(),p=profile(s),v=view(s);
    if(!game||game.dead||ctx.stats.hp<=0)throw Error('O personagem está morto.');
    if(game.worldLocked||game.air?.motion)throw Error('Aguarde o personagem ficar disponível.');
    const offensive=!['buff','party','heal','summon'].includes(s.kind);
    if(ctx.isVillage?.()&&offensive)throw Error('Habilidades de combate só podem ser usadas fora da cidade.');
    if(s.code==='SKILL_SWIFT_AXE'&&!ctx.equipment?.()?.weapon?.code?.startsWith('WA1'))throw Error('Equipe um machado para usar Machado Veloz.');
    if((ready.get(id)??0)>now())throw Error('Aguarde a recarga da habilidade.');
    if(actionReady>now())throw Error('Aguarde a animação do golpe terminar.');
    if(!ctx.freeCast?.()&&!ctx.resourceFree?.()&&(ctx.stats.mp<v.mp||ctx.stats.sp<v.stamina))throw Error('MP ou resistência insuficiente. Use uma poção.');
    if(p.special==='resurrection'&&!ctx.canSupport?.('resurrection',target))throw Error('Aproxime-se de um aliado morto para ressuscitar.');
    const origin={x:game.pos.x,z:-game.pos.z},primary=ctx.monsters.get(target);
    if(v.target==='enemy'&&!alive(primary))throw Error('Selecione um monstro vivo.');
    if(alive(primary)&&Math.hypot(primary.x-origin.x,primary.z-origin.z)>v.range+100)throw Error('Aproxime-se do alvo.');
    if(p.special==='convert'&&(!primary?.definition?.undead||primary.definition.boss))throw Error('Selecione um monstro morto-vivo comum.');
    const agonyCost=p.special==='agony'?Math.floor(ctx.stats.hpMax*(at(rule(s).tables.Agony_ConvLife,n)??5+n)/100):0;
    if(agonyCost&&!ctx.resourceFree?.()&&ctx.stats.hp<=agonyCost)throw Error('HP insuficiente para converter em MP.');
    const targets=offensive?selectSkillTargets(p,n,origin,primary,ctx.monsters.values()):[];
    if(v.target==='enemy'&&!targets.length)throw Error('O alvo está fora da área da habilidade.');
    const timing=ctx.timing?.(v)??{duration:1,hits:[.5]},attack=offensive?attackFor(s,n):null;
    const hits=attack?skillHitTimes(attack,timing):timing.hits??[];
    if(!ctx.freeCast?.()&&!ctx.resourceFree?.()){ctx.stats.mp-=v.mp;ctx.stats.sp-=v.stamina;}
    const cooldown=v.recharge===0?0:Math.max(v.recharge,timing.duration);
    actionReady=now()+timing.duration;if(cooldown){ready.set(id,now()+cooldown);totals.set(id,cooldown);}
    ctx.emit?.({t:'skillFx',from:ctx.name,skill:id,code:s.code,level:n,x:origin.x,z:origin.z,
      ...(target!==undefined?{target}:{}),targets:targets.map(m=>m.id),dur:timing.duration,hits:targets.length?hits:[]});
    if(p.special==='agony'){
      const cost=agonyCost;
      if(!ctx.resourceFree?.())ctx.stats.hp-=cost;ctx.stats.mp=Math.min(ctx.stats.mpMax,ctx.stats.mp+cost);
    }else if(p.special==='resurrection'){ctx.support?.(s,n,target);}
    else if(s.kind==='heal'){
      const range=skillHealingRange(s,rule(s),n,ctx.stats,ctx.equipment?.()??{})??[40+n*25,60+n*35];
      if(v.target!=='ally'||target===undefined)ctx.stats.hp=Math.min(ctx.stats.hpMax,ctx.stats.hp+Math.trunc(range[0]+(ctx.random??Math.random)()*(range[1]-range[0]+1)));
      ctx.support?.(s,n,target);
    }else if(['buff','party','summon'].includes(s.kind)){
      if(p.special!=='agony')buff({...s,icon:v.icon},n);
      if(s.kind==='summon')ctx.summon?.({...v,runtime:p},v.duration);
      if(s.kind==='party'||p.special==='regeneration')ctx.support?.(s,n,target);
      if(p.special==='taunt')for(const m of selectSkillTargets(p,n,origin,null,ctx.monsters.values()))m.aggroUntil=now()*1000+v.duration*1000;
    }else if(p.special==='drain'){
      const percent=at(rule(s).tables.Soul_Sucker_Absorb,n)??5+n;
      const amount=Math.min(primary.hp,Math.floor(primary.hp*percent/100));
      const dealt=ctx.damage(primary.id,1,v.range+100,{fixedDamage:amount,magic:true,noLeech:true});ctx.stats.hp=Math.min(ctx.stats.hpMax,ctx.stats.hp+(Number.isFinite(dealt)?dealt:amount));
    }else if(p.special==='convert'){
      if(!primary?.definition?.undead)throw Error('Selecione um monstro morto-vivo.');
      ctx.convert?.(primary,{...v,runtime:p});
    }else if(p.special==='extinction'){
      const chance=at(rule(s).tables.Extinction_Percent,n),percent=at(rule(s).tables.Extinction_Amount,n);
      for(const m of targets)if(m.definition?.undead&&!m.definition?.boss&&(ctx.random??Math.random)()*100<chance)
        ctx.damage(m.id,1,v.range+500,{fixedDamage:Math.floor(m.hp*percent/100),magic:true,noLeech:true});
    }else if(s.kind==='debuff'||p.special==='stun')control(s,n,targets);
    else {
      if(attack.hpCostPercent&&!ctx.freeCast?.()&&!ctx.resourceFree?.())ctx.stats.hp=Math.max(1,ctx.stats.hp-Math.floor(ctx.stats.hpMax*attack.hpCostPercent/100));
      const token=generation;
      for(const time of hits)ctx.schedule?.(()=>{if(token!==generation||ctx.game()?.dead)return;
        for(const m of targets)if(alive(m)){
          const dealt=ctx.damage(m.id,attack.power,Math.max(v.range,at(p.shape.length,n)??0)+1000,{...attack,skillCode:s.code,area:targets.length>1});
          if(dealt===0)continue;
          if(attack.control)control(s,n,[m],attack.control);
          if(attack.dot)dots.set(s.code+':'+m.id,{s,m,attack,until:now()+attack.dot.seconds,next:now()+1,token});
        }reveal();
      },time*1000);
    }
    ctx.progress?.("skillCast",{code:s.code});
    if(s.kind==='debuff')ctx.progress?.("skillAffect",{code:s.code,count:targets.length});
    ctx.recalculate?.();ctx.buffsChanged?.();publish();ctx.save?.();return v;
  }
  function expire(){let changed=false;for(const [key,b]of active)if(b.until<=now()){active.delete(key);changed=true;}
    for(const [key,d]of dots){if(d.until<now()||d.token!==generation||!alive(d.m)){dots.delete(key);continue;}
      if(now()>=d.next){d.next=now()+1;ctx.damage(d.m.id,d.attack.dot.percent/100,100000,{magic:true,element:d.attack.dot.element,noLeech:true,area:true});}}
    if(changed){ctx.recalculate?.();ctx.buffsChanged?.();}return changed;}
  function learn(id,npcId){if(!ctx.isTrainer?.(npcId))throw Error('Procure o mestre de habilidades da sua cidade.');
    const s=list.find(s=>s.id===id);if(!s)throw Error('Habilidade incompatível com a classe.');const v=view(s),p=points();
    if(v.level>=10)throw Error('Habilidade já está no nível máximo.');
    if(ctx.stats.level<v.reqLevel||s.tier>rank()+1)throw Error(`Requer nível ${v.reqLevel}.`);
    const previous=list.find(x=>x.id===id-1);if(!v.level&&previous&&!learned(previous))throw Error(`Aprenda ${previous.name} primeiro.`);
    if((s.tier===4?p.elite:p.skill)<1)throw Error('Sem pontos de habilidade.');if(ctx.stats.gold<v.price)throw Error('Ouro insuficiente.');
    ctx.stats.gold-=v.price;levels.set(id,v.level+1);publish();ctx.recalculate?.();ctx.save?.();return `${s.name} aprendida no nível ${v.level+1}.`;}
  const exportBuffs=()=>liveBuffs().map(b=>({code:b.code,level:b.level,party:!!b.party,expiresAt:wall()+b.until-now()}));
  for(const s of list){const p=profile(s),saved=ctx.savedCooldowns?.[s.code];if(saved&&at(p.cooldown,learned(s))!==0){const left=Math.min(3600,saved.expiresAt-wall());if(left>0){ready.set(s.id,now()+left);totals.set(s.id,saved.total);}}}
  for(const saved of ctx.savedBuffs??[]){const s=definitions.find(s=>s.code===saved.code);if(!s||!saved.party&&!learned(s))continue;
    const n=saved.party?Math.max(1,Math.min(10,saved.level??1)):learned(s),left=Math.min(at(profile(s).duration,n),saved.expiresAt-wall());
    if(left>0)active.set((saved.party?'party:':'')+s.code,{...s,kind:profile(s).kind,level:n,until:now()+left,party:!!saved.party});}
  return {snapshot,publish,tickCooldowns,learn,cast,bonuses,buffs,expire,points,reveal,
    maximize(){for(const s of list)levels.set(s.id,10);ctx.recalculate?.();publish();},
    cancel(code){let changed=false;for(const [key,b]of active)if('skill:'+b.code===code){active.delete(key);changed=true;}if(changed){ctx.recalculate?.();ctx.buffsChanged?.();ctx.save?.();}return changed;},
    reset(){generation++;levels.forEach((_,id)=>{levels.set(id,0);ctx.emit?.({t:'skillCooldown',id,seconds:0,total:0});});ready.clear();totals.clear();active.clear();dots.clear();actionReady=0;ctx.recalculate?.();ctx.buffsChanged?.();publish();return points();},
    exportState:()=>Object.fromEntries(list.filter(s=>learned(s)).map(s=>[s.code,learned(s)])),
    exportCooldowns:()=>Object.fromEntries(list.filter(s=>ready.get(s.id)>now()).map(s=>[s.code,{expiresAt:wall()+ready.get(s.id)-now(),total:totals.get(s.id)}])),
    exportBuffs,
    restoreCompanions(){for(const b of liveBuffs())if(profile(b).kind==='summon')ctx.summon?.({...b,runtime:profile(b)},b.until-now());},
    receiveSupport(event){const s=definitions.find(s=>s.code===event.code);if(!s)return;
      if(event.kind==='buff')buff({...s,kind:profile(s).kind},event.level,event.seconds,true);
      else if(event.kind==='heal')ctx.stats.hp=Math.min(ctx.stats.hpMax,ctx.stats.hp+event.amount);
      else if(event.kind==='resurrection')ctx.resurrect?.(event.hpPercent);
      ctx.recalculate?.();ctx.buffsChanged?.();ctx.save?.();},
  };
}
