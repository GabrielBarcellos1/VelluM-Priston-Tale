import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const start=source.indexOf('function spawnAdminMonster(');
const end=source.indexOf('function teleportHere(',start);
assert.ok(start>=0&&end>start);
const spawnSource=source.slice(start,end);
function fixture(){
  const monsters=new Map(), packets=[];
  const game={pos:{x:0,z:0},ground:{spawnPoint:(x,z)=>({x,y:0,z})}};
  const spawn=new Function('monsters','game','deliver','publicMonster',`
    let nextAdminMonsterId=20000;
    ${spawnSource}
    return spawnAdminMonster;
  `)(monsters,game,p=>packets.push(p),m=>({id:m.id,name:m.name,gmAlly:m.gmAlly,gmLevelUp:m.gmLevelUp}));
  return {spawn,monsters,packets};
}
const hopi={name:'Hopi',level:1,hp:50,model:'monster/hopi.ase'};
test('GM /monstro hopi 10 creates ten independently attackable ordinary mobs',()=>{
 const f=fixture();
 f.spawn(hopi,10);
 assert.equal(f.monsters.size,10);
 assert.equal(new Set(f.monsters.keys()).size,10);
 assert.ok([...f.monsters.values()].every(m=>m.adminSpawn&&!m.gmAlly&&!m.gmLevelUp));
 assert.equal(f.packets[0].add.length,10);
});
test('/monstro hopiup marks only that summoned Hopi for a one-level reward',()=>{
 const f=fixture();f.spawn(hopi,1,{levelUp:true});
 assert.equal([...f.monsters.values()][0].gmLevelUp,true);
 assert.equal([...f.monsters.values()][0].gmAlly,undefined);
});
test('/mymonster Valento remains a friendly non-hostile spawn',()=>{
 const f=fixture();f.spawn({...hopi,name:'Valento',boss:true},1,{ally:true});
 const ally=[...f.monsters.values()][0];
 assert.equal(ally.gmAlly,true);
 assert.equal(ally.featureSpawn,true);
 assert.equal(ally.hp,ally.hpMax);
});
test('GM tools are wired to ally combat and one-level kill XP',()=>{
 assert.match(source,/case "mymonster":/);
 assert.match(source,/case "monstro":/);
 assert.match(source,/if\(monster\.gmAlly\)/);
 assert.match(source,/experienceFloor\(stats\.level\+1,balanceRules\)-stats\.exp/);
});
