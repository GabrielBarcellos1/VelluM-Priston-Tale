import test from 'node:test';import assert from 'node:assert/strict';import{mountBossRoulette}from'../boss-roulette.mjs';import{readFileSync}from'node:fs';
test('boss HP follows one server encounter and is not cloned on repeated polls',async()=>{
 const def={id:'valento',name:'Valento',boss:true,level:100,model:'char/test.ini'},monsters=new Map();let hp=200;
 const c={meta:{},monsters,wiki:{monsters:[def]},game:()=>({}),post:async()=>({bosses:[{id:9,monster:def.id,hp,hpMax:200,x:0,y:0,z:0,dead:0}],rounds:[],awards:[],participated:[]}),deliver(){},publicMonster:m=>m,diagnostic:msg=>{throw Error(msg)}};
 const r=mountBossRoulette(c);await r.poll();assert.equal(monsters.size,1);assert.equal(monsters.get(2000009).hp,200);hp=117;await r.poll();assert.equal(monsters.size,1);assert.equal(monsters.get(2000009).hp,117);
});
test('ordinary boss copies are replaced by shared encounters while quest encounters stay personal',async()=>{
 const def={id:'valento',name:'Valento',boss:true,model:'char/test.ini'},monsters=new Map([[1,{id:1,definition:def,x:1,y:0,z:2}],[2,{id:2,definition:def,featureSpawn:true}]]),calls=[];
 const c={meta:{},monsters,wiki:{monsters:[def]},game:()=>({}),post:async(path,data)=>{calls.push(data.action);return data.action==='observe'?{}:{bosses:[],rounds:[],awards:[],participated:[]}},deliver(){},diagnostic:msg=>{throw Error(msg)},requestId:()=>crypto.randomUUID()};
 await mountBossRoulette(c).poll();assert.deepEqual(calls,['observe','state']);assert.equal(monsters.has(1),false);assert.equal(monsters.has(2),true);
});
test('integration includes staff commands, shared damage, admin editor and persisted claims',()=>{
 const source=readFileSync(new URL('../session.mjs',import.meta.url),'utf8');assert.match(source,/case "valento"/);assert.match(source,/if\(monster.sharedBoss\)/);assert.match(source,/bossRoulette.start\(\)/);assert.match(source,/action:'claim',award,savedAt:lastSavedAt/);
 const admin=readFileSync(new URL('../dashboard-game.mjs',import.meta.url),'utf8');assert.match(admin,/mountBossAdmin\(\{api,toast,panel:panel\("drops"\)\}\)/);
});
