import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const begin=source.indexOf('async function dropBagItem(name, requestedCount) {');
const end=source.indexOf('let nextDropId =',begin);
assert.ok(begin>0 && end>begin);
const fragment=source.slice(begin,end);
function fixture({bound=false,saveOk=true,count=1}={}) {
 const inv={bag:[{item:{uid:42,code:'WA101',name:'Espada simples',count,bound}}],bagB:[]};
 const packets=[],persisted=[],drops=new Map(),alerts=[];
 const context=new Function('inv','packets','persisted','drops','alerts','saveOk',`
 let economyBusy=false,pendingLoot=0,economyUncertain=false,stateWrite=Promise.resolve(),nextDropId=1000000;
 const game={dead:false,pos:{x:0,z:0},ground:{spawnPoint:()=>({x:60,y:0,z:45})}};
 const hero={name:'Hero'};
 const clone=(value)=>structuredClone(value);
 function recalculate(){}
 function save(){persisted.push(inv.bag.length);stateWrite=Promise.resolve();return saveOk;}
 function deliver(packet){packets.push(packet);}
 function renderGroundLoot(){alerts.push('loot');}
 const groundDrops=drops;
 ${fragment}
 return {dropBagItem};
 `)(inv,packets,persisted,drops,alerts,saveOk);
 return {inv,packets,persisted,drops,alerts,...context};
}
test('discarding an ordinary item saves removal before spawning pickup',async()=>{
 const f=fixture();
 const result=await f.dropBagItem('Espada');
 assert.match(result,/colocado no chão/);
 assert.deepEqual(f.persisted,[0]);
 assert.equal(f.inv.bag.length,0);
 assert.equal(f.drops.size,1);
 assert.equal(f.packets[0].t,'ground');
 assert.equal(f.packets[0].add[0].owner,'Hero');
});
test('partial inventory drop keeps the remaining stack without UID duplication',async()=>{
 const f=fixture({count:5});
 await f.dropBagItem('42',2);
 assert.equal(f.inv.bag[0].item.count,3);
 const spawned=[...f.drops.values()][0].item;
 assert.equal(spawned.count,2);
 assert.notEqual(spawned.uid,f.inv.bag[0].item.uid);
 assert.equal(f.persisted[0],1);
});
test('bound item cannot be discarded',async()=>{
 const f=fixture({bound:true});
 await assert.rejects(f.dropBagItem('Espada'),/vinculado/);
 assert.equal(f.inv.bag.length,1);assert.equal(f.drops.size,0);
});
test('discard rollbacks inventory if save fails',async()=>{
 const f=fixture({saveOk:false});
 await assert.rejects(f.dropBagItem('Espada'),/salvar/);
 assert.equal(f.inv.bag.length,1);assert.equal(f.drops.size,0);
});
test('native and panel pickup branch allows manual items without a server loot event',()=>{
 assert.match(source,/if \(drop\.manual\) \{/);
 assert.match(source,/if \(!save\(true\)\) throw Error\('Não foi possível salvar o recolhimento/);
 assert.match(source,/drop\.pickupBusy/);
});
