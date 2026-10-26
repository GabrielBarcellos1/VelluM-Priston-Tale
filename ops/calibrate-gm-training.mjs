// Staff laboratory: same legal equipment/skills as normal progression, unlimited MP/RES.
import {readFile,writeFile} from 'node:fs/promises';
import {buildCharacter,rotation,monsters,median,catalog} from './simulate-balance.mjs';
import {balanceMonster,classDamageScale,experienceSpan,killExperience} from '../balance-rules.mjs';
const rules=JSON.parse(await readFile(new URL('../data/balance.json',import.meta.url),'utf8'));
const fields=JSON.parse(await readFile(new URL('../data/map-fields.json',import.meta.url),'utf8')).fields;
const seconds=3600/119,classes={};
for(const cls of catalog.classes){
 const rows=[];
 for(let level=1;level<120;level++){
  const maps=rules.maps.filter(m=>m.minimum<=level&&!fields.find(f=>f.id===m.id)?.village&&![16,30,32,33,39].includes(m.id));
  const available=monsters.filter(m=>!m.boss&&m.attack.some(n=>n>0)&&m.maps.some(id=>maps.some(f=>f.id===id)));
  const nearest=Math.min(...available.map(m=>Math.abs(m.level-level)));
  const mobs=available.filter(m=>Math.abs(m.level-level)<=Math.max(3,nearest)).sort((a,b)=>Math.abs(a.level-level)-Math.abs(b.level-level)).slice(0,6);
  if(!mobs.length)throw Error(`No route for ${level}`);
  const build=buildCharacter(cls.job,level),samples=mobs.map(m=>{
   const target=balanceMonster(m,rules),fight=rotation(build,target,classDamageScale(cls.job,level,rules),60,false,true);
   const cycle=target.hp/Math.max(.001,fight.dps)+4;
   return {cycle,multiplier:experienceSpan(level,rules)*cycle/(killExperience(m,level,rules)*seconds)};
  });
  const allowed=maps.filter(f=>mobs.some(m=>m.maps.includes(f.id))).sort((a,b)=>Math.abs(a.recommended-level)-Math.abs(b.recommended-level)).slice(0,5);
  const multiplier=Math.max(1,median(samples.map(r=>r.multiplier)));
  rows.push({level,multiplier:+multiplier.toFixed(6),cycleSeconds:+median(samples.map(r=>r.cycle)).toFixed(3),maps:allowed.map(m=>({id:m.id,name:m.name})),monsters:mobs.map(m=>m.id)});
 }
 classes[cls.job]={name:cls.name,levels:rows};
}
const result={version:1,targetSeconds:3600,secondsPerLevel:seconds,expiresHours:24,assumptions:'Caça solo contínua, equipamento comum +0 adequado, atributos e skills legais, Sheltom GM equipada, rotação simulada, 4 segundos entre monstros. Deslocamentos e quests não estão incluídos. Bônus de XP e eventos não acumulam.',classes};
await writeFile(new URL('../data/gm-training.json',import.meta.url),JSON.stringify(result));
console.log(JSON.stringify(Object.values(classes).map(c=>({class:c.name,levels:c.levels.length,lowestMultiplier:Math.min(...c.levels.map(r=>r.multiplier)),highestMultiplier:Math.max(...c.levels.map(r=>r.multiplier))}))));
