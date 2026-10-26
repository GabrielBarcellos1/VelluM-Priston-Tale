import test from 'node:test';
import assert from 'node:assert/strict';
import {mountOnlineSession} from '../online-session.mjs';

test('map presence retains the client and ignores an in-flight response from the previous map',async()=>{
 const keys=['document','sessionStorage','fetch','addEventListener','setTimeout','clearTimeout'];
 const original=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const requests=[],packets=[],timers=[];let completeFirst;
 const result=players=>({ok:true,json:async()=>({players,chats:[],support:[],cursor:1,online:2})});
 Object.assign(globalThis,{
  document:{createElement:()=>({remove(){}}),querySelector:()=>({append(){}})},
  sessionStorage:{getItem:()=> 'a'.repeat(32)},addEventListener(){},
  setTimeout(fn){const timer={fn};timers.push(timer);return timer;},
  clearTimeout(timer){if(timer)timer.cancelled=true;},
  fetch:async(url,options)=>{
   const body=JSON.parse(options.body);requests.push({url,body});
   if(requests.length===1)return new Promise(resolve=>{completeFirst=resolve;});
   return result([]);
  },
 });
 let session;
 try{
  const field={id:2},game={pos:{x:1,y:0,z:2},dead:false,player:{motionState:'stand'}};
  session=mountOnlineSession({game,hero:{jobCode:1},stats:{},field,adminState:{},
   deliver:p=>packets.push(p),notice(){},generation:'synthetic-generation'});
  field.id=1;session.changeMap();
  completeFirst(result([{name:'Previous map player',job:1,body:'fixture'}]));
  await session.ready;
  assert.deepEqual(session.peers(),[]);
  assert.ok(!packets.some(p=>p.add?.some(v=>v.name==='Previous map player')));
  await timers.find(t=>!t.cancelled).fn();
  assert.deepEqual(requests.filter(r=>r.url.endsWith('/heartbeat')).map(r=>r.body.field),[2,1]);
  assert.equal(new Set(requests.map(r=>r.body.clientId)).size,1);
  assert.ok(!requests.some(r=>r.url.endsWith('/leave')));
 }finally{
  if(session)await session.dispose();
  for(const key of keys){if(original[key])Object.defineProperty(globalThis,key,original[key]);else delete globalThis[key];}
 }
});
