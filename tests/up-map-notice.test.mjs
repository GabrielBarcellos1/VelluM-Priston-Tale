import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {nextUpMap,showUpMapNotice} from '../up-map-notice.mjs';
import {mapExperienceAllowed} from '../balance-rules.mjs';
const rules=JSON.parse(await readFile(new URL('../data/balance.json',import.meta.url)));
test('next map notice at the exact Garden, Bamboo, and Acacias level thresholds',()=>{
 assert.equal(nextUpMap(10,2,rules,mapExperienceAllowed),null);
 assert.equal(nextUpMap(11,2,rules,mapExperienceAllowed).next.id,1);
 assert.equal(nextUpMap(15,1,rules,mapExperienceAllowed),null);
 assert.equal(nextUpMap(16,1,rules,mapExperienceAllowed).next.id,0);
 assert.equal(nextUpMap(20,0,rules,mapExperienceAllowed),null);
 assert.equal(nextUpMap(21,0,rules,mapExperienceAllowed).next.id,4);
});
test('notice chooses an eligible map and hides in a correct XP map',()=>{
 for(let level=11;level<150;level++){
   const stale=rules.maps.find(m=>m.experienceMax!==undefined && m.experienceMax<level);
   if(!stale)continue;
   const info=nextUpMap(level,stale.id,rules,mapExperienceAllowed);
   if(info?.next){assert.ok(info.next.minimum<=level);assert.ok(mapExperienceAllowed(level,info.next.id,rules));}
 }
 assert.equal(nextUpMap(16,0,rules,mapExperienceAllowed),null);
});
test('HUD element is idempotent and removed when arriving in a valid map',()=>{
 const nodes=new Map();
 const doc={
  body:{append(node){nodes.set(node.id,node);}},
  getElementById(id){return nodes.get(id)??null;},
  createElement(tag){return {tag,id:null,children:[],setAttribute(){},append(...items){this.children.push(...items);},querySelector(selector){return this.children.find(c=>c.className===selector.slice(1));},remove(){nodes.delete(this.id);}};}
 };
 const info=nextUpMap(16,1,rules,mapExperienceAllowed);
 showUpMapNotice(info,doc);
 assert.equal(nodes.size,1);
 assert.match(nodes.get('vellum-next-up-map').children[1].textContent,/Mata das Acasias/);
 showUpMapNotice(info,doc);assert.equal(nodes.size,1);
 showUpMapNotice(null,doc);assert.equal(nodes.size,0);
});
