import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextAutomaticMap } from '../auto-map-progression.mjs';
const rules=JSON.parse(readFileSync(new URL('../data/balance.json',import.meta.url),'utf8'));
test('only changes maps after the current EXP range ends',()=>{
 assert.equal(nextAutomaticMap(10,2,rules),null);
 assert.equal(nextAutomaticMap(11,2,rules)?.name,'Floresta do Bamboo');
 assert.equal(nextAutomaticMap(16,1,rules)?.id,0);
 assert.equal(nextAutomaticMap(21,0,rules)?.id,4);
 assert.equal(nextAutomaticMap(26,4,rules)?.id,5);
});
test('never changes from a town or toward a map above the level requirement',()=>{
 assert.equal(nextAutomaticMap(1,3,rules),null);
 const special={maps:[{id:1,experienceMin:1,experienceMax:10,minimum:1},{id:2,experienceMin:11,experienceMax:20,minimum:20}]};
 assert.equal(nextAutomaticMap(11,1,special),null);
});
