import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSapphireWeapon} from '../sapphire-geometry.mjs';

const skins=JSON.parse(readFileSync(new URL('../data/custom-skins.json',import.meta.url),'utf8')).skins;
const themed=skins.filter(s=>s.theme);
const themes=['sombria','cibernetica','chef','halloween'];

test('four theme collections have 11 uniquely identified weapon cosmetics each',()=>{
 assert.equal(themed.length,44);
 assert.equal(new Set(skins.map(s=>s.id)).size,skins.length);
 for(const name of themes){
  const group=themed.filter(s=>s.theme===name);
  assert.equal(group.length,11);
  assert.equal(new Set(group.map(s=>s.customModel)).size,11);
  assert.ok(group.every(s=>s.cat==='arma'&&s.price>=0&&s.image.endsWith(s.id+'.svg')));
 }
});

test('every themed weapon uses supported procedural geometry and keeps stats separate',()=>{
 for(const skin of themed){
  const shape=buildSapphireWeapon(skin.customModel,skin.hands);
  assert.ok(shape.triangles>0,skin.id);
  assert.equal(skin.look.length,5);
  assert.ok(!('damage' in skin)&&!('defense' in skin)&&!('attack' in skin),skin.id);
 }
});
