import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const gameSource=await readFile(new URL('../game-features.mjs',import.meta.url),'utf8');
const npcSource=await readFile(new URL('../npc-panels.mjs',import.meta.url),'utf8');
const start=gameSource.indexOf('async function rankAction(q,npcId)');
const end=gameSource.indexOf('function openNpc(npc)',start);
assert.ok(start>=0&&end>start);
function actionAt(level,rank=0){
 const completed=new Set(),accepted=new Set(),logs=[];
 const c={stats:{level},completed,accepted,world:{rank:()=>rank,done(q){logs.push('done:'+q.id)},accept(){throw Error('Nível insuficiente')}},recalculate(){logs.push('recalculate')},publish(){logs.push('publish')},save(){logs.push('save');return true},notice(m){logs.push(m)},promoted(){logs.push('promoted')}};
 const fn=new Function('c','npcTeacher','loanWeapon','startDuel',gameSource.slice(start,end)+';return rankAction;');
 return {action:fn(c,()=>true,()=>{},()=>{}),completed,logs};
}
test('skill master opens skills directly without the old choice dialog',()=>{
 assert.match(npcSource,/if\(services\.includes\('skill'\)\)\s*\{\s*ctx\.skills\(npc\.id\);\s*mountSkillChallenge\(npc,ctx\)/);
});
test('at level 20 accepting Tier 2 immediately completes the correct class challenge',async()=>{
 const f=actionAt(20);
 await f.action({id:'rank.1.tempskron',state:'available',title:'Tier 2'},21157);
 assert.equal(f.completed.has('rank.1.tempskron'),true);
 assert.ok(f.logs.includes('promoted'));
 assert.equal(f.logs.filter(x=>x==='save').length,1);
});
test('before level 20 no instant promotion is granted',async()=>{
 const f=actionAt(19);
 await assert.rejects(f.action({id:'rank.1.tempskron',state:'available',title:'Tier 2'},21157),/Nível insuficiente/);
 assert.equal(f.completed.size,0);
 assert.ok(!f.logs.includes('promoted'));
});
