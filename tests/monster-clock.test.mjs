import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonsterTimeline, stepMonster } from '../monster-ai.mjs';

const monster = () => ({id:1,hp:100,x:0,y:0,z:0,seq:0,motion:'stand',definition:{}});
const ctx = (now,attackNow) => ({now,attackNow,dt:.2,player:{x:50,z:0},
  ground:(x,z)=>({x,y:0,z}),attackDuration:1800});

test('monster cannot repeat an attack while player animation time is stalled', () => {
  const m=monster();
  assert.equal(stepMonster(m,ctx(1000,0)).attack,true);
  const seq=m.seq;
  assert.equal(stepMonster(m,ctx(11000,500)),null);
  assert.equal(m.seq,seq);
  assert.equal(stepMonster(m,ctx(12000,1800)).attack,true);
});

test('a pending hit waits for animation time, then lands exactly once', () => {
  const clock=createMonsterTimeline();
  let hits=0;
  clock.sample(0);
  clock.schedule(0,900,()=>hits++);
  for(let i=0;i<50;i++) clock.drain(500);
  assert.equal(hits,0);
  clock.drain(900);
  clock.drain(2000);
  assert.equal(hits,1);
});

test('paused or reset scenes discard pending hits without catch-up movement', () => {
  const clock=createMonsterTimeline();
  let hits=0;
  clock.sample(1);
  clock.schedule(1000,900,()=>hits++);
  assert.equal(clock.sample(100,true).dt,0);
  clock.drain(100000);
  assert.equal(hits,0);
  assert.ok(Math.abs(clock.sample(100.2).dt-.2)<1e-9);
  clock.schedule(100200,900,()=>hits++);
  assert.equal(clock.sample(0).dt,0);
  clock.drain(200000);
  assert.equal(hits,0);
});

test('monster travel uses animation progress instead of stalled wall time', () => {
  const clock=createMonsterTimeline();
  const m=monster();
  clock.sample(1);
  const combat=clock.sample(1.1);
  stepMonster(m,{...ctx(10000,combat.now),dt:combat.dt,player:{x:300,z:0}});
  assert.ok(Math.abs(m.x-14.5)<1e-7);
});
