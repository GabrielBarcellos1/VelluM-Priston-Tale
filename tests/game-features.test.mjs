import test from 'node:test';import assert from 'node:assert/strict';
import{createGameFeatures}from'../game-features.mjs';
import{readFileSync}from'node:fs';
const balance=JSON.parse(readFileSync(new URL('../data/balance.json',import.meta.url),'utf8'));
test('session supplies the live monster registry and routes quest travel to the feature adapter',()=>{
 const source=readFileSync(new URL('../session.mjs',import.meta.url),'utf8');
 const context=source.slice(source.indexOf('gameFeatures=createGameFeatures('),source.indexOf('function dropLoot('));
 assert.match(context,/\bmonsters\b/);assert.match(source,/case "questTravelReq"/);assert.match(source,/await gameFeatures.travel\(map\)/);
});
function fixture(){
 const monsters=new Map(),events=[],meta={},definitions=new Map([['WA101',{code:'WA101',family:'WA1',name:'Axe',req:{level:1},price:10}]]);
 const sources=Array.from({length:4},(_,i)=>({id:'m'+i,name:'Monster '+i,level:20,hp:100,model:'char/test.ini',attack:[1,2],maps:[32]}));
 const q={id:'journey.synthetic',state:'active',objectives:[{id:'0',type:'arena',maps:[32],monsterIds:sources.map(m=>m.id),need:1,done:0}]};
 const inv={equip:{},equipB:{},bag:[],bagB:[]};let room=true,clock=0;
 const ctx={name:'Hero',job:1,tribe:'tempskron',inv,warehouse:{items:[]},definitions,instance:code=>({...definitions.get(code)}),addBag:item=>{if(room)inv.bag.push({item});return room},npcs:[],stats:{level:20},world:{expire(){}},field:{id:32},meta,now:()=>clock,game:()=>({dead:false,pos:{x:0,z:0},ground:{spawnPoint:(x,z)=>({x,y:0,z})}}),monsters,wiki:{monsters:sources},balance,views:()=>[q],deliver(){},notice(){},save(){},navigate:map=>events.push(['navigate',map]),update:(type,value)=>events.push([type,value])};
 return{ctx,feature:createGameFeatures(ctx),events,monsters,meta,inv,room:v=>room=v,advance:ms=>clock+=ms};
}
test('arena requires both waves and the final boss; an early kill cannot award the quest',()=>{
 const f=fixture();f.feature.tick();assert.equal(f.monsters.size,2);
 for(let i=0;i<4;i++){
  let m=[...f.monsters.values()].find(m=>m.hp>0);assert.ok(m);m.hp=0;f.feature.defeated(m);
  if(i<3)assert.equal(f.events.filter(e=>e[0]==='encounterWin').length,0);
  f.feature.tick();
 }
 assert.equal(f.events.filter(e=>e[0]==='encounterWin').length,1);
});
test('expired arena returns to town and does not award completion',()=>{
 const f=fixture();f.feature.tick();f.advance(301000);f.feature.tick();assert.deepEqual(f.events,[['navigate',3]]);
});
test('loan weapon recovery is idempotent and full bags do not create a hidden weapon',()=>{
 const f=fixture();f.room(false);assert.throws(()=>f.feature.loanWeapon(),/espaço/);assert.equal(f.inv.bag.length,0);
 f.room(true);const first=f.feature.loanWeapon();assert.equal(first.questWeapon.challenge,'rank.2.2.melee');assert.equal(f.feature.loanWeapon(),first);assert.equal(f.inv.bag.length,1);
});


test('map transition pauses quest monster spawning until the destination context is ready',()=>{
 const f=fixture();f.ctx.busy=()=>true;f.feature.tick();assert.equal(f.monsters.size,0);
 f.ctx.busy=()=>false;f.feature.tick();assert.equal(f.monsters.size,2);
});
