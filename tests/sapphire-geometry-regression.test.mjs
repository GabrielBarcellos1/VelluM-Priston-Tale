import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSapphireWeapon} from '../sapphire-geometry.mjs';
const kinds=['scythe','axe','hammer','bow','sword','dagger','javelin','claw','vambrace','wand','staff','phantom'];
for(const kind of kinds)for(const hands of [1,2])test(kind+' '+hands+'-hand geometry is finite, bounded and detailed',()=>{
 const w=buildSapphireWeapon(kind,hands);
 assert.ok(w.triangles>150,kind+' unexpectedly simple: '+w.triangles);
 assert.ok(w.triangles<25000,kind+' excessive polygon count: '+w.triangles);
 assert.ok(w.parts.length>=3,kind+' has no material variation');
 for(const part of w.parts){assert.equal(part.positions.length,part.normals.length);assert.equal(part.positions.length%9,0);assert.ok(part.positions.every(Number.isFinite));assert.ok(part.normals.every(Number.isFinite));}
 assert.ok(w.bounds.every(([low,high])=>Number.isFinite(low)&&Number.isFinite(high)&&high>low));
 assert.ok(w.bounds[1][1]-w.bounds[1][0]>20);
});
test('redesigned sword is taller than wide and has bone, gold, sapphire and sharpened silver',()=>{
 for(const hands of [1,2]){
  const x=buildSapphireWeapon('sword',hands),width=x.bounds[0][1]-x.bounds[0][0],height=x.bounds[1][1]-x.bounds[1][0];
  assert.ok(height>width*1.75,{hands,width,height});
  for(const mat of [1,2,3,4,5,6])assert.ok(x.parts.some(p=>p.material===mat),{hands,mat});
 }
});
