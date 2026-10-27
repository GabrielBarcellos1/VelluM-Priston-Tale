import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicEndgame,CLASSIC_QUESTS,CLASSIC_NPCS} from '../classic-endgame.mjs';
function fixture(level=100,loaded){
 const completed=new Set(loaded??[]),meta={},messages=[],rewards=[],saves=[];
 const q=createClassicEndgame({meta,completed,level:()=>level,notice:s=>messages.push(s),award:id=>rewards.push(id),save:()=>saves.push(true),random:()=>0});
 return {q,completed,meta,messages,rewards,saves};
}
test('classic quest catalog has correct levels and official NPC identifiers',()=>{
 assert.deepEqual(CLASSIC_QUESTS.map(q=>q.level),[80,80,85,90,90,100]);
 assert.equal(CLASSIC_NPCS.cleric,21222);assert.equal(CLASSIC_NPCS.ray,21113);
 assert.equal(CLASSIC_QUESTS.find(q=>q.id==='classic.fury').map,23);
 assert.equal(CLASSIC_QUESTS.find(q=>q.id==='classic.calliar').map,27);
 assert.equal(CLASSIC_QUESTS.find(q=>q.id==='classic.eura').map,28);
});
test('80 Fúria Aprisionado requires five Ratoos on Templo Maldito 2 and Cleric turn-in',()=>{
 const f=fixture(80);const q=f.q;
 assert.ok(q.actions(CLASSIC_NPCS.cleric).some(a=>a.id==='classic.fury'));
 q.choose('classic.fury');
 for(let n=0;n<4;n++)q.kill('Ratoo',23);
 q.kill('Ratoo',22);
 assert.equal(q.entries['classic.fury'].kills,4);
 assert.ok(!q.actions(CLASSIC_NPCS.cleric).some(a=>a.id==='classic.fury'));
 q.kill('Ratoo',23);
 assert.ok(q.actions(CLASSIC_NPCS.cleric).some(a=>a.id==='classic.fury'));
 q.choose('classic.fury');
 assert.ok(f.completed.has('classic.fury'));assert.deepEqual(f.rewards,['classic.fury']);
});
test('80 Teste Real needs Derik, Minuren, exactly three boss Vamps then Derik',()=>{
 const f=fixture(80),q=f.q;
 q.choose('classic.royal');
 assert.equal(q.entries['classic.royal'].stage,1);
 q.choose('classic.royal');assert.equal(q.entries['classic.royal'].stage,2);
 for(const name of ['Rasha','Vermun Actarun','Zzangpi'])q.kill(name,22);
 assert.deepEqual(new Set(q.entries['classic.royal'].vamps),new Set(['gold','silver','bronze']));
 assert.ok(q.actions(21219).some(a=>a.id==='classic.royal'));
 q.choose('classic.royal');assert.equal(q.entries['classic.royal'].stage,3);
 assert.ok(q.actions(21244).some(a=>a.id==='classic.royal'));
 q.choose('classic.royal');
 assert.ok(f.completed.has('classic.royal'));
});
test('85 Calliar is unavailable without Fúria, resets on death and persists after completion',()=>{
 const f=fixture(85),q=f.q;
 assert.ok(!q.actions(21222).some(a=>a.id==='classic.calliar'));
 f.completed.add('classic.fury');
 q.choose('classic.calliar');
 for(let n=0;n<8;n++)q.kill('Grotesco',27);
 q.resetOnDeath();assert.equal(q.entries['classic.calliar'].stage,0);
 q.choose('classic.calliar');
 for(let n=0;n<10;n++)q.kill('Grotesco',27);
 q.choose('classic.calliar');
 assert.ok(f.completed.has('classic.calliar'));
 q.resetOnDeath();assert.ok(f.completed.has('classic.calliar'));
});
test('90 Eura requires 10 Iron Fists; bitter curse selects one of three monsters and requires 50 kills',()=>{
 const f=fixture(90,['classic.calliar']),q=f.q;
 q.choose('classic.eura');
 for(let n=0;n<10;n++)q.kill('Punhos de Aco',28);
 q.choose('classic.eura');
 assert.ok(f.completed.has('classic.eura'));
 q.choose('classic.bitter');q.choose('classic.bitter');
 assert.equal(q.entries['classic.bitter'].target,'Omega');
 assert.equal(q.activePenalty(),0.3);
 for(let n=0;n<49;n++)q.kill('Omega',28);
 assert.equal(q.actions(21113).some(a=>a.id==='classic.bitter'),false);
 q.kill('Omega',28);
 q.choose('classic.bitter');
 assert.equal(q.activePenalty(),0);
 assert.ok(f.completed.has('classic.bitter'));
});
test('level 100 starts 50-kill phase but does not fake missing specter boss or reward',()=>{
 const f=fixture(100,['classic.eura']),q=f.q;
 q.choose('classic.furyghost');
 for(let n=0;n<50;n++)q.kill('Máquina-D',28);
 assert.equal(q.entries['classic.furyghost'].kills,50);
 assert.throws(()=>q.choose('classic.furyghost'),/ainda não está habilitada/);
 assert.ok(!f.completed.has('classic.furyghost'));
});
