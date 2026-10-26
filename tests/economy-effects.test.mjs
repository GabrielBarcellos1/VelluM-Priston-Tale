import test from'node:test';import assert from'node:assert/strict';import{agingEventChances,eventExperience}from'../economy-effects.mjs';
test('Moriph redistributes failure chances without changing the total or exceeding 100%',()=>{
 const original={plus1:10,plus2:10,destroy:20,minus2:20,minus1:20,kept:20};
 const r=agingEventChances(original,30);assert.equal(r.success,50);assert.equal(r.destroy,0);assert.equal(r.minus2,10);assert.equal(r.plus2,10);assert.equal(r.fail,50);assert.equal(original.destroy,20);
 const guaranteed=agingEventChances(original,100);assert.equal(guaranteed.success,100);assert.equal(guaranteed.fail,0);
});
test('event XP is applied once to the premium-adjusted monster XP with a bounded multiplier',()=>{
 assert.equal(eventExperience(144,{xp:2}),288);assert.equal(eventExperience(144,{xp:1}),144);assert.equal(eventExperience(15.5,{xp:3}),46);assert.equal(eventExperience(100,{xp:999}),1000);
});
