// Explicit local event contracts. Unsupported arena/collect/social mechanics never auto-complete.
export function questSkill(q,catalog){const match=/^skill\.(\d+)\.(\d+)$/.exec(q.id);return match?catalog.skills.filter(s=>s.job===Number(match[1]))[Number(match[2])-1]:null;}
export function questCollectionCode(o){
 if(o.type!=='collect'||o.monsters?.length||o.monsterIds?.length)return null;
 const text=(o.item??o.text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!text.includes('pocao'))return null;const prefix=text.includes('mana')?'PM':/res|stamina/.test(text)?'PS':'PL';
 return prefix+(text.includes('media')?'102':text.includes('grande')?'103':text.includes('mistica')?'104':'101');
}
export function objectiveValue(q,o,stored,stats,learned,catalog,inv=null){
 if(o.type==='mechanic'&&/Obtenha Tier (\d)/.test(o.text??'')){const tier=Number(/Obtenha Tier (\d)/.exec(o.text)[1]);if((stats.classRank??0)+1>=tier)return o.need;}
 const code=questCollectionCode(o);if(code&&inv)return [...(inv.bag??[]),...(inv.bagB??[])].reduce((n,p)=>n+(p.item.code===code&&!p.item.premiumManaged?(p.item.count??1):0),0);
 if(o.type==='level'){const n=/(?:nível|nivel)\s+(\d+)/i.exec(o.text??'');if(n&&stats.level>=Number(n[1]))return o.need;}
 if(o.type==='skill'&&String(o.id)==='0'){const skill=questSkill(q,catalog);if(skill&&learned[skill.code])return o.need;}
 return stored??0;
}
const actions={
 'tutorial.03-primeira-cacada:4':'pickup','tutorial.04-pocoes-e-cinto:0':'belt',
 'tutorial.05-equipamento:0':'equip','tutorial.06-status:0':'stat',
 'tutorial.07-loja:2':'buy','tutorial.07-loja:3':'sell',
 'tutorial.08-armazem:2':'deposit','tutorial.08-armazem:3':'withdraw',
 'tutorial.09-habilidades:0':'learn','tutorial.09-habilidades:1':'skillCast',
 'journey.j020:0':'repair','journey.j020:1':'repair',
};
export function objectiveIncrement(q,o,type,value,catalog,learned){
 if(o.maps?.length&&value?.field!==undefined&&!o.maps.includes(value.field))return 0;
 if(actions[q.id+':'+o.id]===type)return type==='stat'?value.count??1:1;
 if(o.type==='mechanic'){
  const text=o.text??'';
  if(/Baú de Caridade/.test(text))return type==='npcService'&&value.service==='charity'&&value.action==='claim'?1:0;
  if(/pacote no Distribuidor/.test(text))return type==='npcService'&&value.service==='post'&&value.action==='claim'?1:0;
  if(/ranking de nível/.test(text))return type==='npcService'&&value.service==='levelRanking'?1:0;
  if(/Entre em Bellatra/.test(text))return type==='npcService'&&value.service==='bellatra'&&value.action==='start'?1:0;
  if(/Crie ou entre num clã/.test(text))return type==='npcService'&&value.service==='clan'&&['create','join'].includes(value.action)?1:0;
  if(/Use a habilidade/.test(text))return type==='skillCast'?1:0;
  if(/Faça uma Orb/.test(text))return type==='force'?1:0;
  if(/Reconstrua|resete um item/.test(text))return ['mix','mixReset'].includes(type)?1:0;
 }
 if(['arena','personalBoss'].includes(o.type))return type==='encounterWin'&&value.questId===q.id?1:0;
 if(o.type==='collect'&&!questCollectionCode(o)&&type==='kill'){
  const matches=o.monsterIds?.length?o.monsterIds.includes(value.id):o.monsters?.includes(value.name);
  return matches&&(value.dropRoll??Math.random())<(o.dropChance??(o.drop?.always?.includes(value.name)?1:.2))?1:0;
 }
 if(o.type!=='skill'||String(o.id)==='0')return 0;
 const skill=questSkill(q,catalog);if(!skill||!learned[skill.code])return 0;
 const text=o.text??'',matches=value?.code===skill.code;
 if(/golpes normais/i.test(text))return type==='normalHit'?1:0;
 if(/Mantenha/i.test(text))return type==='skillSecond'&&value.codes?.includes(skill.code)?1:0;
 if(/Converta/i.test(text))return type==='skillConverted'&&matches?1:0;
 if(/Use a habilidade/i.test(text))return type==='skillCast'&&matches?1:0;
 if(/Derrote|derrota/i.test(text))return type==='skillKill'&&matches?1:0;
 if(/Afete/i.test(text))return type==='skillAffect'&&matches?value.count??0:0;
 if(/Atinja/i.test(text))return type==='skillHit'&&matches&&(!/mortos-vivos/i.test(text)||value.undead)?1:0;
 return 0;
}
export function objectiveImplemented(q,o){
 return ['talk','ui','reach','kill','use','level'].includes(o.type)||o.type==='skill'&&/^skill\.\d+\.\d+$/.test(q.id)||Object.hasOwn(actions,q.id+':'+o.id);
}
