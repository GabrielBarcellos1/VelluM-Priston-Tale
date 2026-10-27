// Classic level 80-100 quest progression. No earlier legacy quest window is re-enabled.
// Text is independently authored; identifiers reference the current VelluM NPC and monster catalog.
export const CLASSIC_NPCS={cleric:21222,derik:21244,minuren:21219,force:21137,ray:21113};
export const CLASSIC_QUESTS=[
 {id:'classic.fury',name:'O Fúria Aprisionado',level:80,npc:21222,prereq:[],goal:'Derrote 5 Ratoos no Templo Maldito 2.',target:'Ratoo',map:23,count:5,reward:'5 pontos de status e 2 pontos de habilidade'},
 {id:'classic.royal',name:'Teste da Realeza',level:80,npc:21244,prereq:[],goal:'Obtenha os Vamps de Ouro, Prata e Bronze dos chefes e entregue a Minuren.',reward:'7 pontos de status por nível'},
 {id:'classic.calliar',name:'As Lágrimas de Calliar',level:85,npc:21222,prereq:['classic.fury'],goal:'Derrote 10 Grotescos na Estrada do Ferro do Caos.',target:'Grotesco',map:27,count:10,reward:'Menos 1 ponto percentual de EXP perdida ao morrer'},
 {id:'classic.eura',name:'A Vila Eura',level:90,npc:21137,prereq:['classic.calliar'],goal:'Derrote 10 Punhos de Aço no Coração de Perum.',target:'Punhos de Aco',map:28,count:10,reward:'Roitra: +40 HP permanente'},
 {id:'classic.bitter',name:'Desafio Amargo',level:90,npc:21244,prereq:['classic.eura'],goal:'Vença 50 inimigos determinados por Ray sob maldição de -30% de ataque.',reward:'10 pontos de status por nível'},
 {id:'classic.furyghost',name:'Fantasma do Fúria',level:100,npc:21113,prereq:['classic.eura'],goal:'Cinco etapas: caça, espectro defensivo, caça, espectro ofensivo e espectro balanceado.',reward:'Arma especial do nível 100'}
];
const bosses={
 gold:['Rasha','Arqueiro STYX'],silver:['Vermun Actarun','HellSing','Bloody Rose','Slayon','Cavaleiro Profano','Vega Demitri'],
 bronze:['Vega Demir','Apostasy','Fright Nemyun','El Rasi Kun','Duende das Trevas','Bauton','Ciclone','Grave Shakins','Platin Mav','Eed','Mekhist','Zzangpi']
};
const clean=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const bitterTargets=['Omega','Máquina-D','Montanha'];
export function createClassicEndgame({meta,completed,level,notice,award,save,random=Math.random}){
 const entries=meta.classicEndgame??=(Object.create(null));
 function data(id){return entries[id]??=( {stage:0,kills:0,vamps:[],target:null});}
 function unlocked(q){return level()>=q.level&&q.prereq.every(id=>completed.has(id));}
 function summary(id){
  const q=CLASSIC_QUESTS.find(x=>x.id===id);if(!q)return null;
  const p=data(id);
  if(completed.has(id))return q.name+': concluída.';
  if(!unlocked(q))return q.name+': indisponível (nível '+q.level+' e pré-requisitos).';
  if(!p.stage)return q.name+': disponível com '+({21222:'Clériga do Templo',21244:'Derik',21137:'Mestre da Força',21113:'Ray'}[q.npc]??'NPC')+'.';
  if(id==='classic.royal')return q.name+': '+p.vamps.join(', ')+' / Ouro, Prata, Bronze.';
  return q.name+': '+Math.min(p.kills,q.count??50)+' / '+(q.count??50)+' — '+q.goal;
 }
 function actions(npcId){
  const out=[];
  for(const q of CLASSIC_QUESTS){
   if(completed.has(q.id)||!unlocked(q))continue;
   const p=data(q.id),id=q.id;
   if(id==='classic.royal'){
    if(npcId===21244 && p.stage===0)out.push({id,label:'Iniciar Teste Real',detail:'Derik enviará você a Minuren em Navisko.'});
    if(npcId===21219 && p.stage===1)out.push({id,label:'Receber missão dos três Vamps',detail:'Caçar Bosses específicos para obter Ouro, Prata e Bronze.'});
    if(npcId===21219 && p.stage===2 && p.vamps.length===3)out.push({id,label:'Entregar Vamps a Minuren',detail:'Obter a carta de recomendação.'});
    if(npcId===21244 && p.stage===3)out.push({id,label:'Entregar referência e concluir Teste Real',detail:q.reward});
   } else if(id==='classic.bitter'){
    if(npcId===21244 && p.stage===0)out.push({id,label:'Iniciar Desafio Amargo',detail:'Derik enviará você ao Mago Real Ray.'});
    if(npcId===21113 && p.stage===1)out.push({id,label:'Aceitar o desafio de Ray',detail:'Seu ataque cairá 30% até completar 50 mortes.'});
    if(npcId===21113 && p.stage===2 && p.kills>=50)out.push({id,label:'Concluir Desafio Amargo',detail:q.reward});
   } else if(id==='classic.furyghost'){
    if(npcId===21113 && p.stage===0)out.push({id,label:'Iniciar Fantasma do Fúria',detail:'Primeira etapa: 50 monstros no Coração de Perum.'});
    if(npcId===21113 && p.stage===1 && p.kills>=50)out.push({id,label:'Preparar arena do espectro defensivo',detail:'A etapa de combate requer o modelo próprio do Fantasma do Fúria.'});
   } else if(npcId===q.npc){
    if(p.stage===0)out.push({id,label:'Aceitar: '+q.name,detail:q.goal});
    if(p.stage===1 && p.kills>=q.count)out.push({id,label:'Concluir: '+q.name,detail:q.reward});
   }
  }
  return out;
 }
 function choose(id){
  const q=CLASSIC_QUESTS.find(x=>x.id===id);if(!q||completed.has(id)||!unlocked(q))throw Error('Missão indisponível.');
  const p=data(id);
  if(id==='classic.royal'){
   if(p.stage===0)p.stage=1;
   else if(p.stage===1)p.stage=2;
   else if(p.stage===2&&p.vamps.length===3)p.stage=3;
   else if(p.stage===3){complete(q);return 'Teste Real concluído: você agora recebe 7 pontos de status por nível.';}
   else throw Error('Reúna os três Vamps antes de entregar.');
  }else if(id==='classic.bitter'){
   if(p.stage===0)p.stage=1;
   else if(p.stage===1){p.stage=2;p.kills=0;p.target=bitterTargets[Math.floor(random()*3)];}
   else if(p.stage===2&&p.kills>=50){complete(q);return 'Desafio Amargo concluído: 10 pontos de status por nível a partir de agora.';}
   else throw Error('Faltam monstros para concluir o desafio.');
  }else if(id==='classic.furyghost'){
   if(p.stage===0){p.stage=1;p.kills=0;}
   else throw Error('A arena do Fantasma do Fúria ainda não está habilitada neste servidor. A etapa de caça permanece salva.');
  }else if(p.stage===0){p.stage=1;p.kills=0;}
  else if(p.stage===1 && p.kills>=q.count){complete(q);return q.name+' concluída! '+q.reward+'.';}
  else throw Error('Objetivos incompletos.');
  save();
  return id==='classic.bitter' && p.stage===2 ?
    'Ray escolheu '+p.target+'. Derrote 50 no Coração de Perum sob penalidade de 30% de ataque.':
    (q.name+' — '+(p.stage===2&&id==='classic.royal'?'Colete os Vamps nos Bosses.':q.goal));
 }
 function complete(q){
  completed.add(q.id);entries[q.id].stage=99;
  award(q.id);save();notice(q.name+' concluída!');
 }
 function kill(name,map){
  let changed=false;
  for(const q of CLASSIC_QUESTS){
   if(completed.has(q.id)||!unlocked(q))continue;
   const p=data(q.id);
   if(q.id==='classic.royal'&&p.stage===2){
    for(const [key,list] of Object.entries(bosses))if(!p.vamps.includes(key)&&list.some(n=>clean(n)===clean(name))){
      p.vamps.push(key);changed=true;notice('Vamp '+({gold:'de Ouro',silver:'de Prata',bronze:'de Bronze'}[key])+' obtido para o Teste Real.');
    }
   }else if(q.id==='classic.bitter'&&p.stage===2&&map===28&&clean(name)===clean(p.target)){
    p.kills=Math.min(50,p.kills+1);changed=true;
   }else if(q.id==='classic.furyghost'&&p.stage===1&&map===28){p.kills=Math.min(50,p.kills+1);changed=true;}
   else if(q.target&&p.stage===1&&map===q.map&&clean(name)===clean(q.target)){
    p.kills=Math.min(q.count,p.kills+1);changed=true;
   }
  }
  if(changed)save();return changed;
 }
 function resetOnDeath(){
  let changed=false;
  for(const id of ['classic.calliar','classic.bitter']){
   const p=entries[id];if(p&&!completed.has(id)&&p.stage){p.stage=id==='classic.bitter'?1:0;p.kills=0;changed=true;}
  }
  if(changed){save();notice('Um desafio clássico foi reiniciado após sua derrota.');}
 }
 function activePenalty(){return !completed.has('classic.bitter') && data('classic.bitter').stage===2 ? 0.3 : 0;}
 return {actions,choose,kill,summary,resetOnDeath,activePenalty,entries,definitions:CLASSIC_QUESTS};
}
