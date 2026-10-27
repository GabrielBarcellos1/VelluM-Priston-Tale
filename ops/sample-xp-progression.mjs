// Isolated sampling of the actual XP handler; no connection to accounts or live game state.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {experienceFloor,killExperience,capKillExperience} from '../balance-rules.mjs';
const root=new URL('../',import.meta.url);
const rules=JSON.parse(await readFile(new URL('data/balance.json',root),'utf8'));
const monsters=JSON.parse(await readFile(new URL('data/wiki.json',root),'utf8')).wiki.monsters;
const session=await readFile(new URL('session.mjs',root),'utf8');
const start=session.indexOf('function gainExperience(gained) {');
const end=session.indexOf('function completeQuest(',start);
assert.ok(start>=0&&end>start);
const body=session.slice(start,end);
function fixture(level,exp=experienceFloor(level,rules)){
 const stats={level,exp,expNext:experienceFloor(level+1,rules),statPoints:0,hpMax:100,mpMax:100,spMax:100};
 const events=[];
 const recalculate=()=>{stats.expNext=experienceFloor(stats.level+1,rules);};
 const gain=Function('stats','deliver','recalculate','skills','noticeMapProgression',body+';return gainExperience;')(stats,e=>events.push(e),recalculate,{publish(){}},()=>{});
 return {stats,events,gain};
}
const world=process.argv[3]?JSON.parse(await readFile(process.argv[3],'utf8')):null;
const rows=[];let samples=0;const covered=new Set();
for(const map of rules.maps.filter(m=>m.experienceMin!==undefined&&m.experienceMin<=120)){
 const candidates=monsters.filter(m=>m.maps.includes(map.id));
 const field=world?.fields.fields.find(f=>f.id===map.id);
 const population=world?.spawns.stages[field?.stage];
 if(world)assert.ok(population?.zones.some(z=>z.n>0),'No active spawn zones for '+map.id);
 const pool=world?population.monsters.filter(m=>m.pct>0).map(w=>candidates.find(m=>m.name===w.name)??candidates[0]):candidates;
 const mobs=[...new Map(pool.filter(m=>m&&!m.boss&&m.attack.some(n=>n>0)&&!m.id.startsWith('dn-wanted')).map(m=>[m.id,m])).values()];
 assert.ok(mobs.length,'No ordinary monsters for '+map.id);
 let beginningXp=0,sampleMonster=null;
 for(let level=map.experienceMin;level<=Math.min(120,map.experienceMax);level++){
  const target=[...mobs].sort((a,b)=>Math.abs(a.level-level)-Math.abs(b.level-level))[0];
  const f=fixture(level),before=f.stats.exp;
  const reward=capKillExperience(killExperience(target,level,rules,0,map.id),f.stats,map.id,rules);
  assert.ok(reward>0,'No XP at '+map.id+'/'+level);
  f.gain(reward);
  assert.equal(f.stats.exp,before+reward);
  assert.ok(f.events.some(e=>e.t==='exp'&&e.gained===reward));
  if(level===map.experienceMin){beginningXp=reward;sampleMonster={id:target.id,name:target.name,level:target.level};}
  covered.add(level);samples++;
 }
 const last=map.experienceMax;
 const boundary=experienceFloor(last+1,rules);
 const f=fixture(last,boundary-1);
 const capped=capKillExperience(1e15,f.stats,map.id,rules);
 assert.equal(capped,1);
 f.gain(capped);
 assert.equal(f.stats.level,last+1);
 assert.equal(f.stats.exp,boundary);
 assert.equal(f.stats.statPoints,5);
 assert.equal(capKillExperience(100,f.stats,map.id,rules),0);
 if(map.experienceMin>1)assert.equal(capKillExperience(100,fixture(map.experienceMin-1).stats,map.id,rules),0);
 rows.push({map:map.id,name:map.name,min:map.experienceMin,max:map.experienceMax,beginningXp,sampleMonster,spawnZones:population?.zones.filter(z=>z.n>0).length,entryGate:true,exitCap:true,outgrownXp:0});
}
assert.deepEqual([...covered].sort((a,b)=>a-b),Array.from({length:120},(_,i)=>i+1));
const report={method:'isolated execution of the actual session gainExperience function and published XP rules',actualGameplay:false,maps:rows.length,levelMapSamples:samples,allLevels1to120Covered:true,results:rows};
await writeFile(process.argv[2]??new URL('../audit/sampled-xp.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({maps:rows.length,levelMapSamples:samples,levels:'1-120',entryAndExitCaps:'passed'}));
