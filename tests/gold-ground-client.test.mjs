import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const catalog=JSON.parse(await readFile(new URL('../data/skills.json',import.meta.url),'utf8'));
const start=source.indexOf('function spawnGoldDrop(data, announce = false) {');
const end=source.indexOf('async function restorePendingGold()',start);
assert.ok(start>=0&&end>start);
function fixture(){
 const groundDrops=new Map(), packets=[], notices=[];
 const game={ground:{spawnPoint:(x,z)=>({x,y:12,z})},pos:{x:0,y:0,z:0}};
 const run=new Function('groundDrops','game','hero','deliver','renderGroundLoot','notice',`
 let nextDropId=1000000;
 ${source.slice(start,end)}
 return spawnGoldDrop;
 `)(groundDrops,game,{name:'Tester'},p=>packets.push(p),()=>{},s=>notices.push(s));
 return {run,groundDrops,packets,notices};
}
test('server-generated gold uses native ground packets and appears only once',()=>{
 const f=fixture();
 f.run({eventId:71,gold:55,x:100,z:200},true);
 f.run({eventId:71,gold:55,x:100,z:200},true);
 assert.equal(f.groundDrops.size,1);
 assert.equal(f.packets.length,1);
 const gold=f.packets[0].add[0];
 assert.equal(gold.gold,55);assert.equal(gold.code,'GOLD');assert.equal(gold.z,200);
 assert.equal(gold.y,12);
 assert.match(f.notices[0],/55 de ouro/);
});
test('session only credits gold when server confirms pickup',()=>{
 assert.doesNotMatch(source,/stats\.gold \+= result\.gold/);
 assert.match(source,/stats\.gold = confirmed\.goldBalance/);
 assert.match(source,/postLocal\('\/api\/local\/game\/ground'/);
 assert.match(source,/await restorePendingGold\(\)/);
});
test('skills belong to four tiers only, sixteen per class',()=>{
 const groups=new Map();
 for(const s of catalog.skills){
  assert.ok(s.tier>=1&&s.tier<=4,s.code);
  groups.set(s.job,(groups.get(s.job)??0)+1);
 }
 for(const count of groups.values())assert.equal(count,16);
});
