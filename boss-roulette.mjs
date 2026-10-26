// Display only: participation, numbers, winners and awards come from the server.
export function mountBossRoulette(c){
 let polling=false,timer,box,body,awards=[],hitTimer,flushing=null,suspended=false,mapEpoch=0;const observed=new Map(),seeds=new Map(),seen=new Set(),pending=new Map();
 const deadSeen=new Set(c.meta.bossDeaths??[]);
 function ui(){if(box?.isConnected)return;box=document.createElement('aside');box.style.cssText='position:fixed;right:12px;top:90px;z-index:9998;background:#191611;color:#fff;border:1px solid #c8a65c;padding:16px;width:min(390px,92vw);max-height:70vh;overflow:auto';
  const title=document.createElement('strong'),close=document.createElement('button');title.textContent='Roleta dos Bosses · 0–1000';close.textContent='×';close.style.float='right';close.onclick=()=>box.remove();body=document.createElement('div');box.append(title,close,body);document.body.append(box);
 }
 function line(parent,text){const p=document.createElement('p');p.textContent=text;parent.append(p);return p;}
 function round(r){const key=r.encounter+':'+r.round;if(seen.has(key))return;seen.add(key);ui();
  const card=document.createElement('section');card.style.borderTop='1px solid #665332';line(card,`Rodada ${r.round}/${r.total} — ${r.item.name}${r.rare?' ★ exclusivo':''}`);
  const rows=r.rolls.map(roll=>line(card,roll.name+': sorteando…')),winner=line(card,'Sorteando os números…');
  const animation=setInterval(()=>rows.forEach((row,i)=>{row.textContent=r.rolls[i].name+': '+Math.floor(Math.random()*1001);}),60);
  setTimeout(()=>{clearInterval(animation);rows.forEach((row,i)=>{const roll=r.rolls[i];row.textContent=`${roll.name}: ${roll.number}${roll.ticket===r.winner?' 🏆':''}`;});winner.textContent=`Vencedor: ${r.winnerName}${r.tiebreak?' (empate no maior número: desempate aleatório no servidor)':''}`;},1200);
  body.prepend(card);while(body.children.length>15)body.lastChild.remove();c.notice(`Boss, rodada ${r.round}/${r.total}: ${r.winnerName} ganhou ${r.item.name}.`);
 }
 function rewards(){document.querySelector('#vellum-boss-awards')?.remove();if(!awards.length)return;
  const button=document.createElement('button');button.id='vellum-boss-awards';button.textContent=`Recompensas Boss (${awards.length})`;button.style.cssText='position:fixed;right:12px;bottom:100px;z-index:9999;padding:12px;background:#b48a38;color:#111';button.onclick=()=>{ui();const section=document.createElement('section');line(section,'Itens aguardando espaço na bolsa:');
   for(const a of awards){const b=document.createElement('button');b.textContent='Receber '+a.name;b.style.cssText='display:block;margin:8px;padding:10px';b.onclick=async()=>{b.disabled=true;try{await c.claim(a.id);await poll();b.remove();}catch(e){c.notice(e.message);b.disabled=false;}};section.append(b);}body.prepend(section);
  };document.body.append(button);
 }
 function apply(b,participated=[]){
  if(b.field!==c.field.id)return;
  const id=2000000+b.id,def=c.wiki.monsters.find(m=>m.id===b.monster);if(!def)return;
  let m=c.monsters.get(id);
  if(!m&&!b.dead){m={id,definition:def,name:def.name,level:def.level,model:def.model.replace(/\\/g,'/').replace(/\.[^/.]+$/,'').toLowerCase(),x:b.x,y:b.y,z:b.z,angle:0,hp:b.hp,hpMax:b.hpMax,seq:0,motion:'stand',body:20,nextAttack:0,sharedBoss:b.id};c.monsters.set(id,m);c.deliver({t:'monsters',add:[c.publicMonster(m)],ts:performance.now()/1000});}
  if(m){const old=m.hp;m.hp=b.hp;m.hpMax=b.hpMax;if(!m.hp&&old>0){m.motion='dead';m.seq++;setTimeout(()=>{if(c.monsters.get(id)!==m)return;c.deliver({t:'monsters',remove:[id]});c.monsters.delete(id);},3500);}c.deliver({t:'monsters',update:[{id,hp:m.hp,hpMax:m.hpMax,motion:m.motion,seq:m.seq}],ts:performance.now()/1000});}
  if(b.dead&&participated.includes(b.id)&&!deadSeen.has(b.id)){deadSeen.add(b.id);c.meta.bossDeaths=[...deadSeen].slice(-256);c.defeated(def);c.save();c.notice(`${def.name} derrotado! A roleta terá de 3 a 5 rodadas.`);}
 }
 async function observe(m){seeds.set(m.definition.id,m);if(Date.now()-(observed.get(m.definition.id)??0)<60000)return;observed.set(m.definition.id,Date.now());try{await c.post('/api/local/game/boss',{action:'observe',monster:m.definition.id,x:m.x,y:m.y,z:m.z,requestId:c.requestId()});}catch(e){observed.delete(m.definition.id);c.notice(e.message);}}
 async function poll(){if(polling||suspended||!c.game())return;polling=true;const epoch=mapEpoch;
  try{for(const[id,m]of c.monsters)if(m.definition.boss&&!m.sharedBoss&&!m.featureSpawn&&!m.owner){await observe(m);c.monsters.delete(id);c.deliver({t:'monsters',remove:[id]});}
   for(const seed of seeds.values())await observe(seed);
   const result=await c.post('/api/local/game/boss',{action:'state'});if(epoch!==mapEpoch)return;for(const b of result.bosses)apply(b,result.participated);for(const r of result.rounds)round(r);
   if(JSON.stringify(awards)!==JSON.stringify(result.awards)){awards=result.awards;rewards();}
  }catch(e){c.diagnostic('Boss: '+e.message);}finally{polling=false;}
 }
 async function sendHits(){hitTimer=null;for(const[id,amount]of [...pending]){if(c.busy()){if(!hitTimer)hitTimer=setTimeout(flushHits,200);continue;}pending.delete(id);try{if(!c.save(true))throw Error('Não foi possível salvar antes do golpe.');await c.flush();const result=await c.post('/api/local/game/boss',{action:'hit',encounter:id,damage:Math.min(10000000,Math.floor(amount)),requestId:c.requestId()});apply(result.boss);}catch(e){c.notice(e.message);}}}
 function flushHits(){clearTimeout(hitTimer);hitTimer=null;return flushing??(flushing=sendHits().finally(()=>{flushing=null;}));}
 function seedMap(){if(c.field&&!c.field.village){const definitions=c.wiki.monsters.filter(m=>m.boss&&m.maps.includes(c.field.id));for(const [i,definition]of definitions.entries()){const zones=c.zones??[],zone=zones[(i*7+Math.floor(zones.length/2))%Math.max(1,zones.length)];const p=zone&&c.game().ground.spawnPoint(zone.x,-zone.z);if(p)seeds.set(definition.id,{definition,x:p.x,y:p.y,z:-p.z});}}}
 return {poll,
  async pauseMap(){
    suspended=true;clearTimeout(hitTimer);
    await flushHits();
    const until=Date.now()+10000;
    while(polling){if(Date.now()>until)throw Error('Aguarde a sincronização dos Bosses.');await new Promise(resolve=>setTimeout(resolve,25));}
  },
  resumeMap(zones){
    mapEpoch++;observed.clear();seeds.clear();pending.clear();c.zones=zones;
    seedMap();suspended=false;poll();
  },
  start(){seedMap();poll();timer=setInterval(poll,1000);},hit(m,amount){pending.set(m.sharedBoss,(pending.get(m.sharedBoss)??0)+amount);if(!hitTimer)hitTimer=setTimeout(flushHits,150);},
  async spawn(def,forceDrop=false){if(!def.boss)throw Error('Este monstro não é Boss.');c.save(true);await c.flush();const pos=c.game().ground.spawnPoint(c.game().pos.x+120,c.game().pos.z+80);if(!pos)throw Error('Mova-se para um terreno válido.');const r=await c.post('/api/local/game/boss',{action:'spawn',monster:def.id,forceDrop,x:pos.x,y:pos.y,z:-pos.z,requestId:c.requestId()});apply(r.boss);return `${def.name} invocado para todos neste mapa${forceDrop?' com Anel do Valento garantido em uma rodada':''}.`;},
  dispose(){clearInterval(timer);clearTimeout(hitTimer);box?.remove();document.querySelector('#vellum-boss-awards')?.remove();}};
}
