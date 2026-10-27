// Classic level 80-100 quest progression. No earlier legacy quest window is re-enabled.
// Text is independently authored; identifiers reference the current VelluM NPC and monster catalog.
export const CLASSIC_NPCS={cleric:21222,derik:21244,minuren:21219,force:21137,ray:21113};
export const CLASSIC_QUESTS=[
 {id:'classic.fury',name:'O Fúria Aprisionado',level:80,npc:21222,prereq:[],goal:'Derrote 5 Ratoos no Templo Maldito 2.',target:'Ratoo',map:23,count:5,reward:'5 pontos de status e 2 pontos de habilidade'},
 {id:'classic.royal',name:'Teste da Realeza',level:80,npc:21244,prereq:[],goal:'Obtenha os Vamps de Ouro, Prata e Bronze dos chefes e entregue a Minuren.',reward:'7 pontos de status por nível'},
 {id:'classic.calliar',name:'As Lágrimas de Calliar',level:85,npc:21222,prereq:['classic.fury'],goal:'Derrote 10 Grotescos na Estrada do Ferro do Caos.',target:'Grotesco',map:27,count:10,reward:'Menos 1 ponto percentual de EXP perdida ao morrer'},
 {id:'classic.eura',name:'A Vila Eura',level:90,npc:21137,prereq:['classic.calliar'],goal:'Derrote 10 Punhos de Aço no Coração de Perum.',target:'Punhos de Aco',map:28,count:10,reward:'Roitra: +40 HP permanente'},
 {id:'classic.bitter',name:'Desafio Amargo',level:90,npc:21244,prereq:['classic.eura'],goal:'Vença 50 inimigos determinados por Ray sob maldição de -30% de ataque.',reward:'10 pontos de status por nível'},
 {id:'classic.furyghost',name:'Fantasma do Fúria',level:100,npc:21113,prereq:['classic.fury','classic.calliar','classic.eura'],goal:'Cinco etapas: caça, espectro defensivo, caça, espectro ofensivo e espectro balanceado.',reward:'Arma especial do nível 100'}
];
export const FURY_WEAPONS=[
 ['WA120','Machado Minotauro'],['WP121','Foice Infernal'],['WS223','Espada Imortal'],
 ['WM121','Cajado Gotico'],['WT121','Lanca Salamandra'],['WH121','Martelo Osso de Dragao'],
 ['WC120','Garra Extrema'],['WS122','Arco da Vinganca'],['WD121','Adaga Enigma'],
 ['WN121','Fantasma Kahsehtha'],['WV121','Bracelete Arina']
];
export function furyHealthAfterHit(hp,hpMax,heals,damage){
 if(!Number.isFinite(damage)||damage<=0)return {hp,heals,defeated:false,recovered:false};
 const next=Math.max(0,hp-damage);
 if(heals<3&&next<=hpMax*.15)return {hp:hpMax,heals:heals+1,defeated:false,recovered:true};
 return {hp:next,heals,defeated:next===0,recovered:false};
}
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
  if(id==='classic.furyghost'){
   const steps={1:'50 monstros em Coracao de Perum',2:'Furia defensivo na Arena',
    3:'Retorne a Ray',4:'100 monstros em Vale Gallubia',5:'Furia ofensivo na Arena',
    6:'Retorne a Ray',7:'Furia balanceado na Arena',8:'Volte a Ray e escolha a arma'};
   return q.name+': '+(steps[p.stage]??'Fale com Ray')+' ('+p.kills+' abates).';
  }
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
   } else if(id==='classic.furyghost'&&npcId===21113){
    const label={0:'Iniciar Fantasma do Furia',1:'Entrar na Arena: Furia defensivo',
     2:'Voltar a Arena: Furia defensivo',3:'Iniciar caca em Vale Gallubia',
     4:'Entrar na Arena: Furia ofensivo',5:'Voltar a Arena: Furia ofensivo',
     6:'Entrar na Arena: Furia balanceado',7:'Voltar a Arena: Furia balanceado',
     8:'Escolher arma da Quest 100'};
    const canAct=p.stage!==1||p.kills>=50;
    if(label[p.stage]&&canAct)out.push({id,label:label[p.stage],detail:q.goal});
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
   else if(p.stage===1&&p.kills>=50){p.stage=2;p.heals=0;}
   else if(p.stage===3){p.stage=4;p.kills=0;}
   else if(p.stage===4&&p.kills>=100){p.stage=5;p.heals=0;}
   else if(p.stage===6){p.stage=7;p.heals=0;}
   else if(p.stage===8)return 'Escolha uma arma de nivel 100 com Ray.';
   else if(![2,5,7].includes(p.stage))throw Error('Conclua a etapa atual antes de falar com Ray.');
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
   }else if(q.id==='classic.furyghost'&&((p.stage===1&&map===28)||(p.stage===4&&map===31))){p.kills=Math.min(p.stage===1?50:100,p.kills+1);changed=true;}
   else if(q.target&&p.stage===1&&map===q.map&&clean(name)===clean(q.target)){
    p.kills=Math.min(q.count,p.kills+1);changed=true;
   }
  }
  if(changed)save();return changed;
 }
 function arenaPhase(){
  const p=data('classic.furyghost');
  return unlocked(CLASSIC_QUESTS.find(q=>q.id==='classic.furyghost'))&&[2,5,7].includes(p.stage)
   ? {stage:p.stage,kind:({2:'defensive',5:'offensive',7:'balanced'})[p.stage]} : null;
 }
 function arenaDefeated(heals){
  const p=data('classic.furyghost');
  if(!arenaPhase()||heals!==3)throw Error('O Fury precisa recuperar HP tres vezes antes de cair.');
  p.stage=({2:3,5:6,7:8})[p.stage];p.kills=0;p.heals=3;save();
  return p.stage;
 }
 function claimFury(code){
  const p=data('classic.furyghost');
  if(p.stage!==8||completed.has('classic.furyghost'))throw Error('A missao ainda nao terminou.');
  if(!FURY_WEAPONS.some(([id])=>id===code))throw Error('Arma especial desconhecida.');
  completed.add('classic.furyghost');p.stage=99;p.rewardCode=code;save();
  notice('Fantasma do Furia concluido! Arma especial recebida.');
 }
 function resetOnDeath(){
  let changed=false;
  for(const id of ['classic.calliar','classic.bitter']){
   const p=entries[id];if(p&&!completed.has(id)&&p.stage){p.stage=id==='classic.bitter'?1:0;p.kills=0;changed=true;}
  }
  if(changed){save();notice('Um desafio clássico foi reiniciado após sua derrota.');}
 }
 function activePenalty(){return !completed.has('classic.bitter') && data('classic.bitter').stage===2 ? 0.3 : 0;}
 return {actions,choose,kill,summary,resetOnDeath,activePenalty,arenaPhase,arenaDefeated,claimFury,entries,definitions:CLASSIC_QUESTS};
}
