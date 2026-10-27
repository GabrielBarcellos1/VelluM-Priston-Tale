import {openNpcServices,questReadyToast,mountClassCrest} from './npc-panels.mjs';
import {balanceMonster} from './balance-rules.mjs';
const families={1:'WA1',2:'WH1',3:'WS1',4:'WP1',5:'WT1',6:'WS2',7:'WM1',8:'WM1',9:'WD1',10:'WN1',11:'WV1'};
export function createGameFeatures(c){
 let id=800000,timer,crest;const encounters=new Set();
 const now=()=>c.now()/1000,town=()=>c.tribe==='morion'?21:3;
 const activeItems=()=>[...Object.values(c.inv.equip),...Object.values(c.inv.equipB),...c.inv.bag.map(p=>p.item),...c.inv.bagB.map(p=>p.item),...c.warehouse.items.map(p=>p.item)].filter(Boolean);
 function loanWeapon(){
  const previous=activeItems().find(i=>i.questWeapon?.owner===c.name);if(previous)return previous;
  const d=[...c.definitions.values()].filter(i=>i.family===families[c.job]&&(i.req?.level??0)<=40&&i.price>0&&!/[()]|event|costume/i.test(i.name)).sort((a,b)=>(b.req?.level??0)-(a.req?.level??0))[0];
  if(!d)throw Error('Não foi encontrada uma arma compatível.');
  const item=c.instance(d.code);item.questWeapon={owner:c.name,challenge:'rank.2.2.'+([7,8,10].includes(c.job)?'caster':[3,5].includes(c.job)?'ranged':'melee'),stage:0};item.req={level:40};item.noGold=true;item.bound=true;item.name='Arma emprestada do Desafio — '+d.name;
  if(!c.addBag(item))throw Error('Abra espaço na bolsa para a arma emprestada.');return item;
 }
 function npcTeacher(npcId){const npc=c.npcs.find(n=>n.id===npcId&&n.services?.includes('skill'));return npc&&npc.id===(c.tribe==='morion'?21200:21157)&&Math.hypot(c.game().pos.x-npc.x,-c.game().pos.z-npc.z)<=500;}
 async function npcAction(npcId,service,action,data={}){
  if(c.busy()||c.pendingLoot())throw Error('Aguarde a operação atual terminar.');c.setBusy(true);
  try{if(!c.save(true))throw Error('Não foi possível salvar.');await c.flush();
   const result=await c.post('/api/local/game/npc',{npcId,service,action,...data,savedAt:c.savedAt(),requestId:c.requestId()});
   if(result.state){const inv=result.state.inv??{};
    for(const group of ['bag','bagB'])c.inv[group]=(inv[group]??[]).map(p=>({...p,item:c.restoreItem(p.item)})).filter(p=>p.item);
    for(const group of ['equip','equipB'])c.inv[group]=Object.fromEntries(Object.entries(inv[group]??{}).map(([k,v])=>[k,c.restoreItem(v)]).filter(([,v])=>v));
    c.inv.belt=(inv.belt??[]).map(i=>i?c.restoreItem(i):null);Object.assign(c.stats,result.state.stats);c.setSavedAt(result.state.savedAt);c.recalculate();c.save(true);
   }
   if(result.wallet)c.applyWallet(result.wallet);c.update('npcService',{service,action});return result;
  }finally{c.setBusy(false);}
 }
 function startDuel(npcId){
  if(!npcTeacher(npcId))throw Error('Procure o Mestre de Habilidades da sua cidade.');
  const q=c.views().find(q=>q.id==='rank.3.duel');if(!q||!c.accepted.has(q.id))throw Error('Aceite a prova final com o Mestre.');
  c.meta.duel={expires:now()+600,questId:q.id,teacher:npcId};
  c.navigate(32);
 }
 async function rankAction(q,npcId){
  if(!npcTeacher(npcId))throw Error('Procure o Mestre de Habilidades correto.');
  if(q.state==='ready'){c.complete(q.id,npcId);return;}
  if(q.state==='available' && q.id.startsWith('rank.1.') && c.stats.level>=20 && c.world.rank()===0){
   c.completed.add(q.id);c.accepted.delete(q.id);c.world.done(q);
   c.recalculate();c.publish();c.save(true);
   c.notice('Desafio de classe aceito e concluído! Tier 2 liberada. As habilidades da nova Tier estão disponíveis no Mestre.');
   c.promoted();return;
  }
  if(q.state==='available'){c.world.accept(q);c.save();c.publish();c.notice('Desafio aceito: '+q.title);}
  if(q.id==='rank.3.duel'){startDuel(npcId);return;}
  if(q.id.startsWith('rank.2.2.'))loanWeapon();
  c.notice(q.offer??'Consulte os objetivos no Guia de Missões (Q).');
 }
 function openNpc(npc){return openNpcServices(npc,{game:c.game,rank:c.world.rank,level:()=>c.stats.level,canPromote:()=>c.world.allSkillsThrough(c.world.rank()+1),promote:async()=>{
  if(!npcTeacher(npc.id))throw Error('Aproxime-se do Mestre de Habilidades.');
  const current=c.world.rank(),minimum=[20,40,60][current];
  if(current>=3||c.stats.level<minimum)throw Error('A próxima promoção ainda não está disponível.');
  if(!c.world.allSkillsThrough(current+1))throw Error('Aprenda todas as habilidades da Tier atual antes de promover.');
  c.completed.add('rank.auto.'+(current+1));
  c.stats.classRank=c.world.rank();
  c.recalculate();c.publish();
  if(!c.save(true))throw Error('Não foi possível salvar a promoção.');
  await c.flush();
  c.notice('Promoção concluída! Tier '+(current+2)+' liberada.');
  c.promoted();
 },skills:c.openSkills,action:npcAction,refresh:c.refresh,trial:()=>c.meta.trial,enterTrial:t=>{c.meta.trial=t;c.meta.trial.kills=0;c.navigate(30);}});}
 function spawn(def,extra={},offset=200){
  const g=c.game(),p=g.ground.spawnPoint(g.pos.x+offset,g.pos.z+80);if(!p)return null;
  const m={id:++id,name:def.name,level:def.level,definition:def,model:def.model.replace(/\\/g,'/').replace(/\.[^/.]+$/,'').toLowerCase(),x:p.x,y:p.y,z:-p.z,hp:def.hp,hpMax:def.hp,motion:'stand',angle:0,seq:0,body:20,nextAttack:0,featureSpawn:true,...extra};
  c.monsters.set(m.id,m);const{definition,...publicState}=m;c.deliver({t:'monsters',add:[publicState],ts:performance.now()/1000});return m;
 }
 function tick(){
  if(!c.game()||c.game().dead||c.busy?.())return;c.world.expire();
  let expired=false;for(const key of ['bag','bagB']){const old=c.inv[key].length;c.inv[key]=c.inv[key].filter(p=>!p.item.expiresAt||p.item.expiresAt>now());expired||=old!==c.inv[key].length;}
  for(const group of ['equip','equipB'])for(const[slot,item]of Object.entries(c.inv[group]))if(item.expiresAt&&item.expiresAt<=now()){delete c.inv[group][slot];expired=true;}
  if(expired){c.recalculate();c.save();c.notice('Um equipamento temporário do desafio expirou.');}
  if(c.field.id===32&&c.meta.duel){
   if(c.meta.duel.expires<now()){delete c.meta.duel;c.notice('O prazo do duelo terminou. Volte ao Mestre.');c.navigate(town());return;}
   if(!encounters.has('duel')){
    const master=c.wiki.npcs.find(n=>n.id===c.meta.duel.teacher);if(master){const average=(c.stats.damageMin+c.stats.damageMax)/2,level=c.stats.level;
     const def={id:'rank-master',name:master.name,model:master.model,level,hp:Math.max(6000,Math.floor(average*35)),attack:[Math.floor(c.stats.hpMax*.06),Math.floor(c.stats.hpMax*.08)],defense:level*5,absorb:level/8,block:5,maps:[32]};
     if(spawn(def,{questDuel:true}))encounters.add('duel');
    }
   }return;
  }
  const trial=c.meta.trial;
  if(c.field.id===30&&trial&&!trial.done){
   if(trial.expires<now()){trial.failed=true;c.notice('O tempo da Bellatra terminou.');c.navigate(town());return;}
   if(![...c.monsters.values()].some(m=>m.trialToken===trial.token&&m.hp>0)&&(trial.kills??0)<12){
    const candidates=c.wiki.monsters.filter(m=>!m.boss&&!m.maps.includes(30)&&Math.abs(m.level-c.stats.level)<=10&&m.attack.some(n=>n>0)).sort((a,b)=>Math.abs(a.level-c.stats.level)-Math.abs(b.level-c.stats.level));
    for(let i=0;i<Math.min(4,12-(trial.kills??0));i++)if(candidates[i%candidates.length])spawn(balanceMonster(candidates[i%candidates.length],c.balance),{trialToken:trial.token},180+i*35);
   }return;
  }
  if(c.field.village)return;
  for(const q of c.views().filter(q=>q.state==='active')){
   for(const o of q.objectives){
    if(o.done>=o.need)continue;
    const maps=o.maps?.length?o.maps:[o.target?.field];
    if(!maps.includes(c.field.id)&&!(['arena','personalBoss'].includes(o.type)&&c.field.id===32))continue;
    if(!['collect','kill','rankMature','arena','personalBoss'].includes(o.type))continue;
    let targets=c.wiki.monsters.filter(m=>o.monsterIds?.includes(m.id)||o.monsters?.includes(m.name));
    if(['arena','personalBoss'].includes(o.type)){
     c.meta.encounters??={};let challenge=c.meta.encounters[q.id];
     if(challenge?.expires<now()){delete c.meta.encounters[q.id];c.notice('O tempo do desafio terminou. Volte para tentar novamente.');c.navigate(town());return;}
     if(!challenge)challenge=c.meta.encounters[q.id]={expires:now()+(o.type==='arena'?300:600),wave:0,killed:[]};
     const ordered=(o.monsterIds??[]).map(id=>c.wiki.monsters.find(m=>m.id===id)).filter(Boolean),boss=ordered.at(-1);
     if(!boss)continue;
     const ordinary=ordered.slice(0,-1),middle=Math.ceil(ordinary.length/2);
     const waves=o.type==='arena'?[ordinary.slice(0,middle),ordinary.slice(middle),[boss]].filter(w=>w.length):[[boss]];
     while(challenge.wave<waves.length&&waves[challenge.wave].every(m=>challenge.killed.includes(m.id)))challenge.wave++;
     targets=(waves[challenge.wave]??[]).filter(m=>!challenge.killed.includes(m.id));
    }
    for(const source of targets.slice(0,3)){
     if([...c.monsters.values()].some(m=>m.hp>0&&m.definition.id===source.id))continue;
     const boss=['arena','personalBoss'].includes(o.type);
     spawn(balanceMonster(source,c.balance),boss?{featureQuest:q.id}:{});
    }
    if(q.ordered)break;
   }
  }
 }
 function defeated(monster){
  if(monster.questDuel||monster.featureQuest||monster.trialToken)setTimeout(()=>{if(c.monsters.get(monster.id)===monster&&monster.hp<=0){c.monsters.delete(monster.id);c.deliver({t:'monsters',remove:[monster.id]});}},3500);
  if(monster.questDuel){c.update('duelWin',{questId:'rank.3.duel',field:32});delete c.meta.duel;c.save();c.notice('Mestre derrotado! Entregue o desafio para receber o Tier 4.');setTimeout(()=>c.navigate(town()),2500);return true;}
  if(monster.featureQuest){const q=c.views().find(q=>q.id===monster.featureQuest),o=q?.objectives.find(o=>['arena','personalBoss'].includes(o.type));
   const challenge=c.meta.encounters?.[monster.featureQuest];if(challenge&&!challenge.killed.includes(monster.definition.id))challenge.killed.push(monster.definition.id);
   const ids=(o?.monsterIds??[]).filter(id=>c.wiki.monsters.some(m=>m.id===id)),required=o?.type==='arena'?ids:ids.slice(-1);
   if(required.length&&required.every(id=>challenge?.killed.includes(id))){c.update('encounterWin',{questId:monster.featureQuest,monsterId:monster.definition.id,field:c.field.id});delete c.meta.encounters[monster.featureQuest];c.notice('Desafio vencido. A missão pode ser concluída no Guia.');}
   c.save();return true;}
  if(monster.trialToken){const trial=c.meta.trial;trial.kills=(trial.kills??0)+1;c.dropLoot(monster);c.save();if(trial.kills>=12){trial.done=true;c.notice('Bellatra concluída! Receba a recompensa com Karina.');c.lootFlush().then(()=>c.navigate(town()));}return true;}
  return false;
 }
 return {openNpc,loanWeapon,npcTeacher,defeated,tick,travel:map=>c.navigate(map),ready(q){c.notice('Objetivos concluídos: '+q.title+'. Abra Q para concluir.');questReadyToast(q,id=>id.startsWith('rank.')?(c.notice('Entregue este desafio ao Mestre de Habilidades.'),false):c.complete(id));},
  promoted(){c.stats.classRank=c.world.rank();if(c.stats.classRank>0)c.notice('Promoção concluída! Nova insígnia e habilidades liberadas.');crest?.dispose();crest=mountClassCrest(c.game(),c.B,c.stats.classRank);c.recalculate();c.openSkills();c.save(true);},
  start(){crest=mountClassCrest(c.game(),c.B,c.world.rank());tick();timer=setInterval(tick,5000);},dispose(){clearInterval(timer);crest?.dispose();}};
}
