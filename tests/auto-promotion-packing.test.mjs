import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {promotionRank} from '../world-quests.mjs';
import {organizeBag,canPlace} from '../inventory-grid.mjs';
test('all classes promote at level 20,40,60 without completed quests',()=>{
 for(let job=1;job<=11;job++)for(const [level,rank] of [[1,0],[19,0],[20,1],[39,1],[40,2],[59,2],[60,3],[120,3]])assert.equal(promotionRank([],job,level),rank);
});
test('crowded valid layout packs without loss, overlap or false full bag',async()=>{
 const original=JSON.parse(await readFile(new URL('./packing-regression.json',import.meta.url),'utf8'));
 const packed=organizeBag(original);assert.ok(packed);assert.equal(packed.length,original.length);
 assert.deepEqual(packed.map(p=>p.item.uid).sort(),original.map(p=>p.item.uid).sort());
 for(let i=0;i<packed.length;i++)assert.ok(canPlace(packed.filter((_,j)=>i!==j),packed[i].item,packed[i].x,packed[i].y));
 assert.deepEqual(original,JSON.parse(await readFile(new URL('./packing-regression.json',import.meta.url),'utf8')));
});
test('organization compacts rectangles and rejects impossible capacity',()=>{
 const bag=Array.from({length:12},(_,i)=>({x:i,y:5,item:{uid:i+1,code:'X',w:1,h:1}}));
 assert.ok(organizeBag(bag).every(p=>p.y===0));
 assert.equal(organizeBag([{item:{w:12,h:6}},{item:{w:1,h:1}}]),null);
});
