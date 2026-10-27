// Class challenges and map quest lifecycle. Quest objects are data, never executable instructions.
export function promotionRank(completed,job,level){
 if(Number.isFinite(level))return level>=60?3:level>=40?2:level>=20?1:0;
 const c=new Set(completed??[]);
 if(c.has('rank.3.duel'))return 3;
 if(['rank.2.2.melee','rank.2.2.ranged','rank.2.2.caster'].some(id=>c.has(id)))return 2;
 if(c.has('rank.1.tempskron')||c.has('rank.1.morion-jelly')||c.has('rank.1.morion-oil'))return 1;
 return 0;
}
export function classCrest(rank){return rank>0?{color:[0,0xdab35c,0x72c7ff,0xcf95ff][Math.min(3,rank)],points:[0,3,4,8][Math.min(3,rank)],name:['','Insígnia do Tier 2','Insígnia do Tier 3','Insígnia do Tier 4'][Math.min(3,rank)]}:null;}
const hash=s=>[...s].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);
export function createWorldQuests(ctx){
 const {completed,accepted,progress,meta,definitions,catalog,job,tribe,stats}=ctx;
 const now=ctx.now??(()=>Date.now()/1000),learned=()=>ctx.learned?.()??{};
 meta.choices??={};meta.deadlines??={};meta.readyNotified??=[];
 const marked=new Set(meta.readyNotified);
 const branch=()=>hash(ctx.name+':'+job)%2?'oil':'jelly';
 const automatic=ctx.automaticPromotions!==false;
 const rank=()=>promotionRank(completed,job,automatic?stats.level:undefined);
 function allSkillsThrough(tier){return catalog.skills.filter(s=>s.job===job&&s.tier<=tier).every(s=>(learned()[s.code]??0)>=1);}
 function prerequisite(q){
  const id=q.id;
  if(id==='rank.1.tempskron')return tribe==='tempskron'&&rank()===0;
  if(id.startsWith('rank.1.morion-'))return tribe==='morion'&&id.endsWith(branch())&&rank()===0;
  if(id==='rank.2')return rank()===1;
  if(id.startsWith('rank.2.2.'))return rank()===1&&completed.has('rank.2');
  if(id==='rank.3.hunt1')return rank()===2;
  if(id==='rank.3.hunt2')return rank()===2&&completed.has('rank.3.hunt1');
  if(id==='rank.3.3')return rank()===2&&completed.has('rank.3.hunt2');
  if(id==='rank.3.duel')return rank()===2&&completed.has('rank.3.3');
  return true;
 }
 function resolve(q){
  if(!q.id.startsWith('rank.3.hunt'))return q;
  const stage=q.id.endsWith('1')?'1':'2';
  const pool=(ctx.policy?.rankPools?.[stage]??[]).filter(p=>p.minLevel<=stats.level&&(!p.maxLevel||p.maxLevel>=stats.level));
  const choice=meta.choices[q.id];const source=(ctx.policy?.rankPools?.[stage]??[]).find(p=>p.id===choice)??pool[hash(ctx.name+job+stage)%Math.max(1,pool.length)];
  return source?{...q,steps:source.steps.map(s=>({...s,need:50})),offer:source.offer}:q;
 }
 function eligible(q){if(automatic&&q.id.startsWith('rank.'))return false;return !completed.has(q.id)&&stats.level>=q.minLevel&&(!q.race||q.race===tribe)&&(!q.jobs?.length||q.jobs.includes(job))&&prerequisite(q);}
 function accept(q){
  if(!eligible(q))throw Error('Este desafio ainda não está disponível.');
  if(!allSkillsThrough(rank()+1))throw Error('Aprenda pelo menos um nível de todas as habilidades dos tiers anteriores.');
  if(accepted.has(q.id))return;
  if(q.id.startsWith('rank.3.hunt')){
   const stage=q.id.endsWith('1')?'1':'2',pool=(ctx.policy?.rankPools?.[stage]??[]).filter(p=>p.minLevel<=stats.level&&(!p.maxLevel||p.maxLevel>=stats.level));
   if(!pool.length)throw Error('Não há uma caçada definida para esse nível.');
   meta.choices[q.id]=pool[hash(ctx.name+job+stage)%pool.length].id;
  }
  accepted.add(q.id);if(q.timerSeconds)meta.deadlines[q.id]=now()+q.timerSeconds;
 }
 function expire(){for(const q of definitions)if(accepted.has(q.id)&&meta.deadlines[q.id]&&meta.deadlines[q.id]<now()){
  accepted.delete(q.id);for(const o of q.steps)delete progress[q.id+':'+o.id];delete meta.deadlines[q.id];ctx.notice?.('O prazo da caçada terminou. Volte ao Mestre para tentar novamente.');
  marked.delete(q.id);meta.readyNotified=[...marked];
 }}
 function event(q,objectives,type,value){
  if(!q.id.startsWith('rank.')||!accepted.has(q.id))return false;
  const ordered=q.ordered||q.id.startsWith('rank.1.morion'),open=objectives.find(o=>(progress[q.id+':'+o.id]??0)<o.need);let changed=false;
  for(const o of objectives){if(ordered&&o!==open)continue;const key=q.id+':'+o.id;if((progress[key]??0)>=o.need)continue;
   if(o.maps?.length&&!o.maps.includes(value.field))continue;
   let count=0;
   if(['talk','rankMix'].includes(o.type)&&type==='talk'&&o.npcIds?.includes(value.npcId))count=1;
   if(o.type==='rankDuel'&&type==='duelWin'&&value.questId===q.id)count=1;
   if(type==='kill'){
    const matches=(o.monsterIds?.length?o.monsterIds.includes(value.id):!o.monsters?.length||o.monsters.includes(value.name));
    if(o.type==='collect'&&matches&&(ctx.random??Math.random)()<(o.dropChance??.2))count=1;
    if(o.type==='rankMature'&&matches&&ctx.equipment?.()?.weapon?.questWeapon?.challenge===q.id)count=1;
    if(o.type==='kill'&&matches)count=1;
   }
   if(count){progress[key]=Math.min(o.need,(progress[key]??0)+count);changed=true;}
  }return changed;
 }
 function notify(views){for(const q of views)if(q.state==='ready'&&!marked.has(q.id)){marked.add(q.id);meta.readyNotified=[...marked];ctx.ready?.(q);}}
 function done(q){delete meta.deadlines[q.id];stats.classRank=rank();ctx.changed?.(q,rank());}
 return {rank,allSkillsThrough,prerequisite,eligible,resolve,accept,expire,event,notify,done,
  pending:()=>definitions.filter(q=>q.id.startsWith('rank.')&&eligible(q)).map(resolve)};
}

export function mergeNpcRecords(field,canonical,extras){
 const all=new Map(canonical.filter(n=>n.map===field.id).map(n=>[n.id,{...n}]));
 for(const npc of extras??[])if(!all.has(npc.id))all.set(npc.id,{...npc,map:field.id,services:[],model:npc.model??canonical.find(n=>n.kind===npc.kind)?.model??canonical[0]?.model,dialogueOnly:true});
 return [...all.values()];
}
