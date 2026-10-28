import test from 'node:test';
import assert from 'node:assert/strict';
import { skillActionTiming } from '../skill-action-timing.mjs';

test('zero additional cooldown still locks until final hit',()=>{
  assert.deepEqual(skillActionTiming({duration:1.4},[0.4,1.1,2.2],0),
    {actionDuration:2.2,cooldown:0,lastHit:2.2});
});
test('nonzero cooldown cannot end before last scheduled hit',()=>{
  assert.deepEqual(skillActionTiming({duration:1.1},[0.4,2.2],0.5),
    {actionDuration:2.2,cooldown:2.2,lastHit:2.2});
});
test('longer historical cooldown is preserved without adjustment',()=>{
  assert.deepEqual(skillActionTiming({duration:1.65},[0.6,1.4],4),
    {actionDuration:1.65,cooldown:4,lastHit:1.4});
});
test('invalid hit timestamps are rejected',()=>{
  assert.throws(()=>skillActionTiming({duration:1},[0.5,-1],0),/inválida/);
  assert.throws(()=>skillActionTiming({duration:1},[Infinity],0),/inválida/);
  assert.throws(()=>skillActionTiming({duration:-1},[0.5],0),/inválida/);
});
