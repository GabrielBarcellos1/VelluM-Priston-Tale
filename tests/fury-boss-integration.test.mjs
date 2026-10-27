import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createClassicEndgame,furyHealthAfterHit} from '../classic-endgame.mjs';
const s=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const start=s.indexOf('function spawnQuestFury(){'),end=s.indexOf('function calibrateMapPortals()',start);
assert.ok(start>=0&&end>start);
const spawnSource=s.slice(start,end);
function spawn(kind='defensive'){
 const stage={defensive:2,offensive:5,balanced:7}[kind],notices=[],packets=[],monsters=new Map();
 const context={field:{id:32},classicEndgame:{arenaPhase:()=>({kind,stage})},
  wiki:{monsters:[{name:'Original',model:'char/monster/monster.ini',maps:[28],level:110,hp:2000,attack:[100,120]}]},
  game:{pos:{x:0,z:0},ground:{spawnPoint:(x,z)=>({x,y:1,z})}},
  nextPopulationId:50000,monsters,deliver:p=>packets.push(p),
  notice:x=>notices.push(x),performance:{now:()=>10},publicMonster:m=>m};
 vm.runInNewContext(spawnSource+';spawnQuestFury()',context);
 return {monsters,notices,packets,context};
}
test('Fury appears with the actual monfury animation model in quest arena',()=>{
 const f=spawn();
 assert.equal(f.monsters.size,1);
 const m=[...f.monsters.values()][0];
 assert.equal(m.model,'char/monster/monfury/monfury');
 assert.equal(m.questFury.heals,0);
 assert.equal(m.hp,m.hpMax);
 assert.equal(f.packets[0].t,'monsters');
});
test('Fury defensive, offensive and balanced profiles are distinct',()=>{
 const a=[...spawn('defensive').monsters.values()][0];
 const b=[...spawn('offensive').monsters.values()][0];
 const c=[...spawn('balanced').monsters.values()][0];
 assert.ok(a.definition.defense>b.definition.defense);
 assert.ok(b.definition.attack[0]>a.definition.attack[0]);
 assert.ok(c.definition.attack[0]>a.definition.attack[0] && c.definition.attack[0]<b.definition.attack[0]);
});
test('damage handler requires three HP restorations before Fury is beaten',()=>{
 const quest={heals:0,defeated:0};
 const f=spawn(),monster=[...f.monsters.values()][0];
 monster.hp=monster.hpMax=100;
 const messages=[];
 const context={
 mapTravel:null,monsters:new Map([[monster.id,monster]]),game:{pos:{x:0,z:0},dead:false},
 stats:{hp:1000,mp:1000,damageMin:1000,damageMax:1000,level:100},
 monsterControl:()=>({criticalBonus:0}),physicalHit:()=>({amount:200,kind:'hit'}),
 classDamageScale:()=>1,characterClass:{job:1},skillData:{rules:{accuracy:{}}},
 performance:{now:()=>100},skills:{reveal(){}},updateQuests(){},premiumRecovery:()=>({hp:0,mp:0}),premiumValue:()=>0,
 deliver:p=>messages.push(p),notice(){},furyHealthAfterHit,
 gameFeatures:{defeated(){throw Error('Generic death used');},navigate:async()=>{}},
 classicEndgame:{arenaDefeated:count=>{assert.equal(count,3);quest.defeated++;}},requestId:()=>1,
 Math,Set,Map,setTimeout:()=>{},mapKillExperience(){},adminState:{},gmSheltomActive:()=>false
 };
 const fn=s.slice(s.indexOf('function damageMonster('),s.indexOf('function publicMonster('));
 const damage=vm.runInNewContext('('+fn+')',context);
 for(let i=1;i<=3;i++){
   damage(monster.id,1,500,{fixedDamage:200});
   assert.equal(monster.hp,100);
   assert.equal(monster.questFury.heals,i);
 }
 damage(monster.id,1,500,{fixedDamage:200});
 assert.equal(monster.hp,0);assert.equal(quest.defeated,1);
});
test('reward is only claimable once after all three victories',()=>{
 const meta={},completed=new Set(['classic.fury','classic.calliar','classic.eura']);
 const q=createClassicEndgame({meta,completed,level:()=>100,notice(){},award(){},save(){}});
 q.choose('classic.furyghost');for(let i=0;i<50;i++)q.kill('a',28);q.choose('classic.furyghost');
 q.arenaDefeated(3);q.choose('classic.furyghost');
 for(let i=0;i<100;i++)q.kill('b',31);q.choose('classic.furyghost');
 q.arenaDefeated(3);q.choose('classic.furyghost');q.arenaDefeated(3);
 assert.throws(()=>q.claimFury('INVALID'),/desconhecida/);
 q.claimFury('WP121');
 assert.equal(meta.classicEndgame['classic.furyghost'].rewardCode,'WP121');
 assert.throws(()=>q.claimFury('WP121'));
});
