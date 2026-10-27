import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{createWorldQuests,promotionRank,classCrest,mergeNpcRecords}from'../world-quests.mjs';
import{createSkillSystem}from'../skill-system.mjs';import{objectiveValue,questCollectionCode}from'../quest-progress.mjs';
const read=async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url),'utf8'));
const data=await read('quests'),catalog=await read('skills');
function fixture(job=1){
 const stats={level:120,classRank:0},completed=new Set(),accepted=new Set(),progress={},meta={},equipment={};let clock=0,ready=0;
 const learned=Object.fromEntries(catalog.skills.filter(s=>s.job===job).map(s=>[s.code,1]));
 const ctx={automaticPromotions:false,name:'Scenario Hero',job,tribe:[5,6,7,8,10].includes(job)?'morion':'tempskron',stats,completed,accepted,progress,meta,definitions:data.quests,catalog,policy:data.classQuestPolicy,learned:()=>learned,equipment:()=>equipment,now:()=>clock,random:()=>0,ready:()=>ready++};
 const world=createWorldQuests(ctx),views=q=>({...world.resolve(q),objectives:world.resolve(q).steps.map(o=>({...o,done:progress[q.id+':'+o.id]??0}))});
 function finish(q){const v=views(q);assert.ok(v.objectives.every(o=>o.done>=o.need),q.id);completed.add(q.id);world.done(q);}
 function play(q){world.accept(q);if(q.id.startsWith('rank.2.2.'))equipment.weapon={questWeapon:{challenge:q.id}};
  for(const o of views(q).objectives){for(let i=0;i<o.need;i++){
   const type=o.type==='rankDuel'?'duelWin':['talk','rankMix'].includes(o.type)?'talk':'kill';
   world.event(world.resolve(q),views(q).objectives,type,{id:o.monsterIds?.[0],name:o.monsters?.[0],field:o.maps?.[0]??32,npcId:o.npcIds?.[0],questId:q.id});
  }}finish(q);
 }
 return{world,ctx,stats,completed,accepted,progress,meta,equipment,learned,views,play,finish,advance:n=>{clock+=n},ready:()=>ready};
}
for(let job=1;job<=11;job++)test(`class ${job}: complete all three rank-up challenges without skipping weapon maturation or the final duel`,()=>{
 const f=fixture(job);let steps=0;
 while(f.world.rank()<3&&steps++<15){const q=f.world.pending()[0];assert.ok(q,`No next quest for job ${job}, rank ${f.world.rank()}`);
  const before=f.world.rank();f.play(q);if(q.id==='rank.2')assert.equal(f.world.rank(),before);
 }
 assert.equal(f.world.rank(),3);assert.equal(promotionRank([...f.completed],job),3);assert.ok(f.completed.has('rank.3.duel'));assert.equal(f.stats.classRank,3);
});
test('rank quests enforce level and previous skills; active skills cannot bypass a locked tier',()=>{
 const f=fixture();f.stats.level=19;const q=data.quests.find(q=>q.id==='rank.1.tempskron');assert.throws(()=>f.world.accept(q));
 f.stats.level=120;delete f.learned.SKILL_MELEE_MASTERY;assert.throws(()=>f.world.accept(q),/habilidades/);
 const s=catalog.skills.find(s=>s.job===1&&s.tier===2);const sys=createSkillSystem({catalog,job:1,stats:{level:120,hp:100,mp:100,sp:100},rank:()=>0,saved:{[s.code]:1},monsters:new Map(),game:()=>({pos:{x:0,z:0}})});
 assert.equal(sys.snapshot().skills.find(x=>x.id===s.id).locked,true);assert.throws(()=>sys.cast(s.id),/nível necessário/);
});
test('maturation requires the right equipped loan weapon and advances only the first unfinished step',()=>{
 const f=fixture();f.play(f.world.pending()[0]);f.play(f.world.pending().find(q=>q.id==='rank.2'));
 const q=f.world.pending().find(q=>q.id.startsWith('rank.2.2.'));f.world.accept(q);const v=f.views(q),o=v.objectives[0];
 f.world.event(q,v.objectives,'kill',{name:o.monsters[0],field:o.maps[0]});assert.equal(f.progress[q.id+':0'],undefined);
 f.equipment.weapon={questWeapon:{challenge:q.id}};f.world.event(q,f.views(q).objectives,'kill',{name:o.monsters[0],field:o.maps[0]});assert.equal(f.progress[q.id+':0'],1);assert.equal(f.progress[q.id+':1'],undefined);
});
test('70 minute hunt deadline survives reload, expires and can be retried with the same target',()=>{
 const f=fixture();while(f.world.rank()<2)f.play(f.world.pending()[0]);const q=f.world.pending()[0];f.world.accept(q);
 const choice=f.meta.choices[q.id];assert.equal(f.meta.deadlines[q.id],4200);f.advance(4201);f.world.expire();assert.equal(f.accepted.has(q.id),false);
 f.world.accept(q);assert.equal(f.meta.choices[q.id],choice);assert.ok(f.meta.deadlines[q.id]>4201);
});
test('ready notifications are once-only and never claim a reward or promotion automatically',()=>{
 const f=fixture(),q=f.world.pending()[0];f.world.accept(q);const ready=[{...q,state:'ready'}];f.world.notify(ready);f.world.notify(ready);
 assert.equal(f.ready(),1);assert.equal(f.completed.size,0);assert.equal(f.world.rank(),0);
 const reloaded=createWorldQuests(f.ctx);reloaded.notify(ready);assert.equal(f.ready(),1);
});
test('common quests are auto-accepted and remotely claimable while class quests stay with the master',()=>{
 for(const q of data.quests){if(q.id.startsWith('rank.'))assert.ok(q.giver.length);else{assert.equal(q.auto,true);assert.equal(q.remoteComplete,true);assert.deepEqual(q.turnIn,[]);}}
});
test('quest potion collections use real ordinary inventory counts, not premium stock',()=>{
 const o={type:'collect',item:'Poção Media de Mana'};assert.equal(questCollectionCode(o),'PM102');
 const inv={bag:[{item:{code:'PM102',count:4}},{item:{code:'PM102',count:99,premiumManaged:true}}],bagB:[{item:{code:'PM102',count:3}}]};
 assert.equal(objectiveValue({},o,0,{}, {},catalog,inv),7);
});
test('all NPC records are retained once and class crest cosmetics differ at every promotion',()=>{
 const field={id:3};const records=mergeNpcRecords(field,[{id:1,map:3,model:'known',services:['shop']}],[{id:1,name:'duplicate'},{id:2,name:'flavor'}]);
 assert.equal(records.length,2);assert.deepEqual(records[0].services,['shop']);assert.equal(records[1].dialogueOnly,true);
 assert.equal(classCrest(0),null);assert.equal(new Set([1,2,3].map(n=>classCrest(n).points)).size,3);
});
