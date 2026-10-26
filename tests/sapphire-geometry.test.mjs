import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{buildSapphireWeapon}from'../sapphire-geometry.mjs';
const catalog=JSON.parse(readFileSync(new URL('../data/custom-skins.json',import.meta.url),'utf8')).skins;
for(const s of catalog)test(`${s.id}: finite triangle data, unit normals and a bounded GPU budget`,()=>{
 const model=buildSapphireWeapon(s.customModel,s.hands);assert.ok(model.triangles>1000&&model.triangles<8000);assert.equal(model.bounds.length,3);
 for(const p of model.parts){assert.equal(p.positions.length,p.normals.length);assert.equal(p.positions.length%9,0);assert.ok(p.positions.every(Number.isFinite));for(let i=0;i<p.normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...p.normals.slice(i,i+3))-1)<1e-8);}
 assert.ok(model.bounds[1][1]-model.bounds[1][0]>15);assert.ok(model.bounds[2][1]-model.bounds[2][0]>1);
});
test('all weapon families and hand modes have unique canonical offers',()=>{assert.equal(catalog.length,17);assert.equal(new Set(catalog.map(s=>s.id)).size,17);assert.equal(new Set(catalog.map(s=>s.customModel)).size,12);assert.equal(new Set(catalog.map(s=>s.family)).size,11);assert.ok(catalog.every(s=>s.cat==='arma'&&s.price>0&&s.look.startsWith(s.family)));});
test('scythe has a blade, gold filigree, bone ribs, skull and faceted gems as actual geometry',()=>{const m=buildSapphireWeapon('scythe',2);assert.deepEqual(new Set(m.parts.map(p=>p.material)),new Set([0,1,2,3,4,5,6]));assert.ok(m.bounds[0][1]>30);assert.ok(m.parts.find(p=>p.material===3).positions.length>1000);assert.throws(()=>buildSapphireWeapon('unknown'));});
