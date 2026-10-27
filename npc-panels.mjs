import {classCrest} from './world-quests.mjs';
export function serviceDialog(title,text=''){
 document.querySelector('#vellum-npc-service')?.close();document.querySelector('#vellum-npc-service')?.remove();
 const dialog=document.createElement('dialog');dialog.id='vellum-npc-service';dialog.className='ft-dialog';dialog.style.cssText='max-width:650px;width:min(92vw,650px);max-height:85vh;overflow:auto;padding:22px;background:#191611;color:#eee;border:1px solid #a68b52';
 const heading=document.createElement('h2'),description=document.createElement('p'),body=document.createElement('div'),close=document.createElement('button');heading.textContent=title;description.textContent=text;close.textContent='Fechar';
 close.onclick=()=>{dialog.close();dialog.remove();};dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.addEventListener('close',()=>dialog.remove());dialog.append(heading,description,body,close);document.body.append(dialog);dialog.showModal();
 return {dialog,body,text:description,button(label,action){const b=document.createElement('button');b.textContent=label;b.style.cssText='display:block;width:100%;padding:10px;margin:8px 0;text-align:left';b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){description.textContent=e.message;}finally{b.disabled=false;}};body.append(b);return b;},line(text){const p=document.createElement('p');p.textContent=text;body.append(p);},close:()=>{dialog.close();dialog.remove();}};
}
export function questReadyToast(quest,claim){
 const box=document.createElement('aside'),label=document.createElement('p'),button=document.createElement('button'),close=document.createElement('button');box.style.cssText='position:fixed;right:18px;top:100px;z-index:9999;padding:16px;max-width:330px;background:#201b12;color:#fff;border:1px solid #c8a65c';
 label.textContent='Missão concluída: '+quest.title;button.textContent=quest.id.startsWith('rank.')?'Ver no Mestre':'Concluir e receber';button.onclick=()=>{if(claim(quest.id)!==false)box.remove();};close.textContent='×';close.onclick=()=>box.remove();box.append(label,button,close);document.body.append(box);return box;
}
export function mountClassCrest(game,B,rank){
 const spec=classCrest(rank);if(!spec||!game.player?.object)return{dispose(){}};
 const geometry=new B.RingGeometry(4,7,spec.points),material=new B.MeshBasicMaterial({color:spec.color,side:2,transparent:true,opacity:.95}),mesh=new B.Mesh(geometry,material);
 mesh.position.set(0,44,0);mesh.name=spec.name;game.player.object.add(mesh);
 return {dispose(){mesh.parent?.remove(mesh);geometry.dispose();material.dispose();}};
}
export async function openNpcServices(npc,ctx){
 const services=npc.services??[];ctx.game()?.keys.clear();
 if(services.includes('skill')){
  document.getElementById('vellum-skill-challenge')?.remove();
  ctx.skills(npc.id);
  const tier=ctx.rank(),required=[20,40,60][tier];
  if(tier<3 && ctx.level()>=required && ctx.canPromote()){
   const panel=serviceDialog('Promoção de classe',`Todas as habilidades da Tier ${tier+1} foram aprendidas. Aceitar a nova classe conclui a promoção e libera as habilidades da Tier ${tier+2}.`);
   panel.button('Aceitar nova classe - Tier '+(tier+2),async()=>{await ctx.promote();panel.close();});
  }
  return;
 }
 const service=services.find(s=>['charity','post','clan','levelRanking','smelting','manufacture','bellatra'].includes(s));
 if(!service){serviceDialog(npc.name,'Olá! Você pode conversar comigo e avançar os objetivos que pedem este NPC. As missões de mapa são recebidas e concluídas pelo Guia de Missões.');return;}
 const panel=serviceDialog(npc.name,service==='smelting'?'Refino VelluM: três sheltoms iguais produzem uma do próximo grau.':service==='manufacture'?'Forjamento VelluM: equipamento comum sem Aging/Mix + três sheltoms produzem o próximo modelo da família. Confira o custo e os requisitos.':'Serviço ativo do VelluM.');
 if(service==='charity')panel.button('Retirar 20 poções de HP, MP e RES — uma vez a cada 24h',async()=>{const r=await ctx.action(npc.id,service,'claim');panel.text.textContent=r.message;});
 else if(service==='post')panel.button('Sincronizar entregas e produtos comprados',async()=>{const r=await ctx.action(npc.id,service,'claim');await ctx.refresh();panel.text.textContent=r.message;});
 else if(service==='bellatra'){
  panel.line('Desafio local: três ondas, doze inimigos, dez minutos. Nível mínimo 20. Não é uma disputa de clãs.');
  panel.button('Iniciar desafio Bellatra VelluM',async()=>{const r=await ctx.action(npc.id,service,'start');ctx.enterTrial(r.trial);});
  panel.button('Receber recompensa do último desafio',async()=>{const r=await ctx.action(npc.id,service,'claim',{token:ctx.trial()?.token});panel.text.textContent=r.message;});
 }else{
  const info=await ctx.action(npc.id,service,'view');
  if(service==='levelRanking')for(const [i,r]of info.ranking.entries())panel.line(`${i+1}. ${r.name} — nível ${r.level}`);
  else if(service==='clan'){
   panel.line(info.membership?.name?'Seu clã: '+info.membership.name:'Você ainda não participa de um clã.');
   const input=document.createElement('input');input.placeholder='Nome do novo clã';input.maxLength=18;panel.body.append(input);
   panel.button('Criar clã — nível 20 e 500.000 de ouro',async()=>{const r=await ctx.action(npc.id,service,'create',{name:input.value});panel.text.textContent=r.message;});
   panel.button('Sair do clã atual',async()=>{const r=await ctx.action(npc.id,service,'leave');panel.text.textContent=r.message;});
   for(const clan of info.clans)panel.button(`Entrar em ${clan.name} (${clan.members} membros)`,async()=>{const r=await ctx.action(npc.id,service,'join',{clanId:clan.id});panel.text.textContent=r.message;});
  }else{if(!info.recipes.length)panel.line('Não há receitas disponíveis para os itens e nível atuais.');for(const recipe of info.recipes)panel.button(`${recipe.name} → ${recipe.output} | ${recipe.needs} | ${recipe.fee.toLocaleString('pt-BR')} ouro`,async()=>{const r=await ctx.action(npc.id,service,'craft',{recipe:recipe.id});panel.text.textContent=r.message;});}
 }
}
