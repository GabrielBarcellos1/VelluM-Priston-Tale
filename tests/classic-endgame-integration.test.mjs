import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CLASSIC_NPCS, CLASSIC_QUESTS,createClassicEndgame} from '../classic-endgame.mjs';
const [npc,world,session,skill,server]=await Promise.all([
 'data/map-npcs.json','data/wiki.json','session.mjs','skill-system.mjs','iniciar.py'
].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));
const npcs=Object.values(JSON.parse(npc).stages).flat();
const monsters=JSON.parse(world).wiki.monsters;
test('classic quest NPCs exist with physical placements',()=>{
 for(const id of Object.values(CLASSIC_NPCS))
  assert.ok(npcs.some(x=>x.id===id&&Number.isFinite(x.x)&&Number.isFinite(x.z)),String(id));
});
test('required monsters exist in map catalog (not invented spawns)',()=>{
 for(const entry of CLASSIC_QUESTS.filter(x=>x.target&&x.map))
  assert.ok(monsters.some(m=>m.name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()===entry.target.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()&&m.maps.includes(entry.map)),entry.target+' @ '+entry.map);
});
test('game invokes high-level quest NPCs and kill progression and grants configured rewards',()=>{
 assert.match(session,/createClassicEndgame\(/);
 assert.match(session,/classicEndgame\?\.actions\(id\)/);
 assert.match(session,/classicEndgame\?\.kill\(monster\.name,field\.id\)/);
 assert.match(session,/classicEndgame\?\.kill\(def\.name,field\.id\)/);
 assert.match(session,/completed\.has\("classic\.eura"\) \? 40 : 0/);
 assert.match(session,/completed\.has\("classic\.bitter"\) \? 10 : completed\.has\("classic\.royal"\) \? 7 : 5/);
 assert.match(session,/extraSkillPoints:\(\)=>completed\.has\('classic\.fury'\)\?2:0/);
 assert.match(skill,/ctx\.extraSkillPoints\?\.\(\)/);
});
test('quest module is served and accessible to normal player chat',()=>{
 assert.match(server,/'\/classic-endgame\.mjs'/);
 assert.match(session,/"quests",\s*"loja"/);
});
test('quest journal state persists across module recreation',()=>{
 const meta={},completed=new Set(),save=()=>{};
 let q=createClassicEndgame({meta,completed,level:()=>85,save,notice(){},award(){}});
 q.choose('classic.fury');
 q.kill('Ratoo',23);
 q=createClassicEndgame({meta,completed,level:()=>85,save,notice(){},award(){}});
 assert.equal(q.entries['classic.fury'].kills,1);
});
