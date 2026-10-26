import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {adjacentFields,walkingStages,portalAt,createMapTravel} from '../map-travel.mjs';
const fields=JSON.parse(await readFile(new URL('../data/map-fields.json',import.meta.url))).fields;
const portals=JSON.parse(await readFile(new URL('../data/map-links.json',import.meta.url))).portals;
test('every declared outdoor connection loads both directions, including Jardim/Bamboo',()=>{
 for(const from of fields)for(const to of from.neighbors){
  if(to===30||from.id===30)continue;
  assert.ok(walkingStages(fields,from.id).some(f=>f.id===to));
  assert.ok(walkingStages(fields,to).some(f=>f.id===from.id));
 }
 assert.deepEqual(adjacentFields(fields,2).map(f=>f.id),[1,3,4]);
 assert.deepEqual(walkingStages(fields,2,f=>f.id!==1).map(f=>f.id),[2,3,4]);
 assert.deepEqual(walkingStages(fields,999),[]);
});
test('all configured portals have valid maps, finite landings and a working proximity trigger',()=>{
 assert.ok(portals.length>=30);
 for(const p of portals){
  assert.ok(fields.some(f=>f.id===p.fromField));assert.ok(fields.some(f=>f.id===p.to));
  for(const value of [p.x,p.z,p.y,p.radius,p.arrival.x,p.arrival.z])assert.ok(Number.isFinite(value));
  assert.equal(portalAt([p],p.fromField,{x:p.x,z:p.z,y:p.y}),p);
  assert.equal(portalAt([p],p.fromField,{x:p.x+1000,z:p.z,y:p.y}),null);
  if(p.y)assert.equal(portalAt([p],p.fromField,{x:p.x,z:p.z,y:p.y+300}),null);
 }
});
function fixture(extra={}){
 const calls=[];let clock=0;
 const options={fields,current:2,portals,canEnter:()=>true,alive:()=>true,
 position:()=>({x:-300,z:-9548,y:100}),prepare:v=>calls.push(['prepare',v]),
 save:()=>{calls.push(['save']);return true;},flush:async()=>calls.push(['flush']),
 dispose:async()=>calls.push(['dispose']),navigate:id=>calls.push(['navigate',id]),
 rollback:()=>calls.push(['rollback']),notice:t=>calls.push(['notice',t]),now:()=>clock,...extra};
 return {calls,options,travel:createMapTravel(options),advance:()=>{clock=3000;}};
}
test('walking saves exact crossing position and waits for server before leaving; duplicate transitions ignored',async()=>{
 const f=fixture();const first=f.travel.walk(1);
 assert.equal(await f.travel.walk(3),false);assert.equal(await first,true);
 assert.deepEqual(f.calls.map(c=>c[0]),['prepare','save','flush','dispose','navigate']);
 assert.deepEqual(f.calls[0][1],{field:1,position:{x:-300,z:-9548,y:100}});
});
test('walking rejects unrelated maps, low levels and death',async()=>{
 for(const extra of [{canEnter:()=>false},{alive:()=>false}]){
  const f=fixture(extra);assert.equal(await f.travel.walk(1),false);assert.ok(!f.calls.some(c=>c[0]==='navigate'));
 }
 const f=fixture();assert.equal(await f.travel.walk(44),false);
});
test('save failures cancel travel and allow retry without losing character state',async()=>{
 const f=fixture({flush:async()=>{throw Error('offline');}});
 assert.equal(await f.travel.walk(1),false);assert.equal(f.travel.busy,false);
 assert.ok(f.calls.some(c=>c[0]==='rollback'));assert.ok(!f.calls.some(c=>c[0]==='navigate'));
});
test('cave entrance and exit use their paired arrival coordinates after startup cooldown',async()=>{
 for(const [from,to]of [[0,24],[24,0],[13,14],[14,13],[40,41],[41,40]]){
  const p=portals.find(p=>p.fromField===from&&p.to===to);assert.ok(p);
  const f=fixture({current:from,position:()=>({x:p.x,z:p.z,y:p.y})});
  assert.equal(f.travel.tick(),undefined);f.advance();assert.equal(await f.travel.tick(),true);
  assert.deepEqual(f.calls[0][1],{field:to,position:p.arrival});
 }
});

test('portal triggers use converted collision-floor elevations rather than legacy heights',()=>{
 const p={fromField:0,x:10,z:20,y:267,floorY:629,radius:64,height:32};
 assert.equal(portalAt([p],0,{x:10,z:20,y:629}),p);
 assert.equal(portalAt([p],0,{x:10,z:20,y:267}),null);
 assert.equal(portalAt([{...p,disabled:true}],0,{x:10,z:20,y:629}),null);
});
