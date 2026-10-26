import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as grid from '../inventory-grid.mjs';
import {equipmentError} from '../equipment-rules.mjs';
import {salePrice,saleError,repairPrice} from '../gameplay-rules.mjs';
import {captureBaseRolls,restoreItemRolls} from '../item-save.mjs';
import {potionCanUse,registerPotion} from '../balance-rules.mjs';
import {craftAtNpc} from '../npc-crafting.mjs';
const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
function fixture(){
 const inv={bag:[],bagB:[],equip:{},equipB:{},belt:[null,null,null]},stats={job:1,level:30,gold:10000,hp:100,hpMax:500,mp:100,mpMax:500,sp:100,spMax:500,str:100,tal:100,dex:100,health:30};
 const definitions=new Map([['WA101',{code:'WA101',name:'Axe',slot:'WEAPON_ONE',w:2,h:3,price:100,req:{level:1},count:1}],['PL101',{code:'PL101',name:'Life',slot:'POTION',w:1,h:1,price:10,count:1,restore:{life:[100,200]}}]]);
 let uid=1000,time=0;const notices=[],packets=[];
 const context={inv,stats,definitions,messages:[],warehouse:{items:[],gold:1000},npcs:[{id:1,x:0,z:0,services:['shop','warehouse'],shop:['WA101','PL101']}],
  game:{pos:{x:0,z:0}},B:{itemSlots:i=>i.slot==='WEAPON_ONE'?['weapon']:['shield'],itemClass:()=>null},
  GM_POTION:'BI998',wallet:{stock:[]},potionReady:{},balanceRules:{potionCooldownSeconds:2},pendingPremiums:new Set(),performance:{now:()=>time*1000},
  clone:structuredClone,number:(v,f,min=0,max=1e9)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):f,
  instance:(code,count=1)=>({...structuredClone(definitions.get(code)),count,uid:uid++}),
  notice:m=>notices.push(m),deliver:p=>packets.push(p),recalculate(){},save(){},updateQuests(){},emitWarehouse(){},
  statHistory:[],salePrice,saleError,repairPrice,equipmentError,...grid,potionCanUse,registerPotion,
  economyUncertain:false,economyBusy:false,pendingLoot:0,findSpace:item=>grid.firstSpace(inv.bag,item),
  warehouseSpace:()=>({x:0,y:0}),pendingCommands:new Set(),isAdmin:false,hero:{name:'Fixture'},
 };
 const addCode=source.slice(source.indexOf('function addBag('),source.indexOf('function syncPremiumInventory('));
 vm.runInNewContext(addCode,context);
 vm.runInNewContext(source.slice(source.indexOf('function findItem('),source.indexOf('function questAtNpc(')),context);
 const handle=vm.runInNewContext(`(${source.slice(source.indexOf('async function handle('),source.indexOf('conn.sendGame ='))})`,context);
 return {context,inv,stats,notices,packets,handle,advance:n=>{time+=n;}};
}
test('full bag purchase fails atomically and cannot deduct gold or partially add items',async()=>{
 const f=fixture();f.inv.bag=[{x:0,y:0,item:{uid:1,code:'FULL',w:12,h:6,count:1}}];const before=structuredClone(f.inv);
 await f.handle({t:'buy',npcId:1,code:'WA101',count:2});assert.deepEqual(f.inv,before);assert.equal(f.stats.gold,10000);
 const poor=fixture();poor.stats.gold=0;await poor.handle({t:'buy',npcId:1,code:'WA101',count:1});assert.equal(poor.stats.gold,0);assert.equal(poor.inv.bag.length,0);
});
test('actual buy, equip, unequip and sell handlers preserve identity and currency',async()=>{
 const f=fixture();await f.handle({t:'buy',npcId:1,code:'WA101',count:1});assert.equal(f.stats.gold,9900);const uid=f.inv.bag[0].item.uid;
 await f.handle({t:'equip',uid,slot:'weapon'});assert.equal(f.inv.equip.weapon.uid,uid);assert.equal(f.inv.bag.length,0);
 await f.handle({t:'unequip',slot:'weapon'});assert.equal(f.inv.bag[0].item.uid,uid);
 await f.handle({t:'sell',uid,npcId:1});assert.equal(f.stats.gold,9920);assert.equal(f.inv.bag.length,0);
});
test('stack overflow is rejected without loss; maximum stacks survive item restoration',async()=>{
 const f=fixture();f.inv.bag.push({x:0,y:0,item:{...f.context.instance('PL101'),count:9998}});
 await f.handle({t:'buy',npcId:1,code:'PL101',count:2});assert.equal(f.inv.bag[0].item.count,9998);assert.equal(f.stats.gold,10000);
 f.inv.belt[0]={...f.context.instance('PL101'),count:9999};
 await f.handle({t:'beltSet',uid:f.inv.bag[0].item.uid,index:0});assert.equal(f.inv.belt[0].count,9999);assert.equal(f.inv.bag[0].item.count,9998);
 assert.match(source,/number\(item\.count, 1, 1, 9999\)/);
 const native={...f.context.instance('WA101')};delete native.count;assert.equal(f.context.addBag(native),true);assert.equal(native.count,1);
});
test('potion cooldown consumes one unit, recovers HP once and blocks the immediate retry',async()=>{
 const f=fixture();const item=f.context.instance('PL101',3);f.inv.belt[0]=item;
 await f.handle({t:'useItem',uid:item.uid});assert.equal(f.stats.hp,200);assert.equal(item.count,2);
 await f.handle({t:'useItem',uid:item.uid});assert.equal(f.stats.hp,200);assert.equal(item.count,2);
 f.advance(2);await f.handle({t:'useItem',uid:item.uid});assert.equal(f.stats.hp,300);assert.equal(item.count,1);
});
test('warehouse rejects distant movement and gold withdrawals, then round-trips nearby',async()=>{
 const f=fixture(),item=f.context.instance('WA101');f.inv.bag.push({x:0,y:0,item});f.context.game.pos.x=1000;
 await f.handle({t:'warehouseMove',npcId:1,uid:item.uid});assert.equal(f.inv.bag.length,1);
 await f.handle({t:'warehouseGold',npcId:1,amount:-500});assert.equal(f.stats.gold,10000);
 f.context.game.pos.x=0;await f.handle({t:'warehouseMove',npcId:1,uid:item.uid});assert.equal(f.inv.bag.length,0);assert.equal(f.context.warehouse.items.length,1);
 await f.handle({t:'warehouseMove',npcId:1,uid:item.uid});assert.equal(f.inv.bag[0].item.uid,item.uid);assert.equal(f.context.warehouse.items.length,0);
});
test('invalid spare equipment cannot bypass requirements by swapping sets',async()=>{
 const f=fixture();f.inv.equipB.weapon={...f.context.instance('WA101'),req:{str:999}};const before=structuredClone(f.inv);
 await f.handle({t:'swapSet'});assert.deepEqual(f.inv,before);
});
test('recovery of a corrupt overfull inventory leaves both original bags unchanged',()=>{
 const inv={bag:[{x:0,y:0,item:{code:'A',w:12,h:6}},{x:0,y:0,item:{code:'C',w:12,h:6}}],bagB:[{x:0,y:0,item:{code:'B',w:12,h:6}}]};
 const before=structuredClone(inv);assert.throws(()=>grid.repairBags(inv));assert.deepEqual(inv,before);
 for(const item of [{w:Infinity,h:1},{w:1,h:-Infinity},{w:0,h:1},{w:1,h:7}])assert.equal(grid.firstSpace([],item),null);
});
test('packing randomized valid bags preserves every UID and never overlaps items',()=>{
 let seed=123;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
 for(let trial=0;trial<300;trial++){
  const bag=[];for(let i=0;i<20;i++){const item={uid:i+1,code:'T'+i,w:1+Math.floor(random()*3),h:1+Math.floor(random()*3)};const p=grid.firstSpace(bag,item);if(p)bag.push({...p,item});}
  const sorted=grid.organizeBag(bag);if(!sorted)continue;
  assert.deepEqual(sorted.map(p=>p.item.uid).sort((a,b)=>a-b),bag.map(p=>p.item.uid).sort((a,b)=>a-b));
  const placed=[];for(const p of sorted){assert.ok(grid.canPlace(placed,p.item,p.x,p.y));placed.push(p);}
 }
});
test('item upgrades restore once, craft reset preserves base rolls, and invalid numeric values are ignored',()=>{
 const base=captureBaseRolls({code:'WA101',damage:[10,20],attackRating:40,uid:1});const saved={...base,damage:[20,30],attackRating:80,critical:NaN};
 const restored=restoreItemRolls({...base},saved);assert.deepEqual(restored.damage,[20,30]);assert.equal(restored.attackRating,80);assert.ok(!Number.isNaN(restored.critical));
 assert.deepEqual(restoreItemRolls({...restored},saved,{resetCraft:true}).damage,[10,20]);
});
test('force crafting rollback restores materials and gold when the output has no space',()=>{
 const item={uid:1,code:'OS101',slot:'SHELTOM',count:1},inv={bag:[{x:0,y:0,item}],bagB:[]},before=structuredClone(inv),stats={gold:100};
 assert.throws(()=>craftAtNpc({t:'force',npcId:1,sheltoms:[1]},{inv,stats,npcs:[{id:1,x:0,z:0,services:['force']}],position:{x:0,z:0},bridge:{forceRecipe:()=>({price:10,code:'FO101'})},instance:code=>({code}),addBag:()=>false}),/Sem espaço/);
 assert.deepEqual(inv,before);assert.equal(stats.gold,100);
});
