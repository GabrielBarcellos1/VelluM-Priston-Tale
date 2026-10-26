import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {questTarget} from '../quest-targets.mjs';
const json=async name=>JSON.parse(await readFile(new URL('../data/'+name,import.meta.url),'utf8'));
const fields=(await json('map-fields.json')).fields,stages=(await json('map-spawns.json')).stages,npcs=(await json('wiki.json')).wiki.npcs;
test('placeholder hunt destinations stay in the requested map at a real spawn zone',()=>{
 for(const id of [1,2,17,18,19,20,27,43]){
  const target=questTarget({target:{field:id,x:0,z:0}},fields,stages,npcs),field=fields.find(f=>f.id===id);
  assert.equal(target.field,id);assert.ok(stages[field.stage].zones.some(z=>z.n>0&&z.x===target.x&&z.z===target.z));
  assert.ok(target.x!==0||target.z!==0);
 }
});
test('NPC coordinates and explicit quest locations retain their exact targets',()=>{
 const target=questTarget({target:{field:21,x:0,z:0},npcIds:[21200]},fields,stages,npcs);
 assert.equal(target.npcId,21200);assert.equal(target.x,3248);assert.equal(target.z,75479);
 const explicit={field:19,x:500,z:600};assert.deepEqual(questTarget({target:explicit},fields,stages,npcs),explicit);
 assert.equal(questTarget({},fields,stages,npcs),undefined);
});
