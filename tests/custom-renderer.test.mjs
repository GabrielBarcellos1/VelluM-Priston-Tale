import test from'node:test';import assert from'node:assert/strict';import{mountCustomSkins}from'../custom-skins.mjs';
class Matrix{clone(){return new Matrix()}identity(){return this}copy(){return this}}
class Group{constructor(){this.children=[];this.userData={};this.position={set(){}};this.rotation={};this.scale={setScalar(){}};this.matrix=new Matrix();}add(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}traverse(fn){fn(this);for(const c of [...this.children])c.traverse(fn);}removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
class Geometry{setAttribute(){}computeBoundingSphere(){}dispose(){this.disposed=true}}
class Material{constructor(v={}){Object.assign(this,v);this.visible=true;}clone(){return new Material()}dispose(){this.disposed=true}}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}}
const B={Group,Mesh,BufferGeometry:Geometry,Float32BufferAttribute:class{},MeshStandardMaterial:Material,AmbientLight:Group,DirectionalLight:Group};
test('cosmetics attach to both native hand tools, preserve attributes, restore materials and release meshes',()=>{
 const originals={requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,document:globalThis.document};let next;
 globalThis.requestAnimationFrame=fn=>(next=fn,1);globalThis.cancelAnimationFrame=()=>{};globalThis.document={body:{dataset:{}}};
 try{const materials=[new Material(),new Material()],roots=materials.map(m=>new Mesh(new Geometry(),m)),scene=new Group(),skin={cat:'arma',id:'test',family:'WD1',customModel:'dagger',hands:2};let own={worn:[skin]};const weapon={code:'WD120',slot:'WEAPON_TWO',damage:[50,100],aging:12},before=structuredClone(weapon);
  const game={scene,player:{tools:roots.map(root=>({slot:'weapon',model:{object:root,boneMatrix:(i,m)=>m}}))},others:{views:new Map()}};
  const manager=mountCustomSkins({B,game,own:()=>own,catalog:[skin],peers:()=>[],inventory:()=>({weapon})});assert.equal(manager.active(),2);assert.ok(roots.every(r=>r.children.length===1));assert.ok(roots.every(r=>r.material.visible===false));assert.deepEqual(weapon,before);
  own={worn:[]};next();assert.equal(manager.active(),0);assert.ok(roots.every((r,i)=>r.material===materials[i]&&!materials[i].disposed&&r.children.length===0));manager.dispose();
 }finally{Object.assign(globalThis,originals);}
});

