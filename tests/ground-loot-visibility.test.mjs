import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const admin=await readFile(new URL('../economy-admin.mjs',import.meta.url),'utf8');
const start=source.indexOf('function renderGroundLoot() {'),end=source.indexOf('let nextDropId',start);
assert.ok(start>0&&end>start);
function fixture(drops) {
 const elements=new Map();
 function element(tag) {
  return {tag,children:[],style:{},dataset:{},disabled:false,textContent:'',id:null,
   append(...nodes){this.children.push(...nodes);if(this.id)elements.set(this.id,this);},
   replaceChildren(...nodes){this.children=nodes;},
   remove(){elements.delete(this.id);},setAttribute(){},click(){this.onclick?.({stopPropagation(){}})}
  };
 }
 const doc={getElementById:id=>elements.get(id),createElement:element,body:{append(n){elements.set(n.id,n)}}};
 const state=new Map(drops);const actions=[];
 const render=new Function('groundDrops','document','game','economyBusy','handle',
  source.slice(start,end)+';return renderGroundLoot;')(state,doc,{pos:{x:0,z:0}},false,async msg=>actions.push(msg));
 return {render,state,elements,actions};
}
test('visible nearby loot has a working pickup button',async()=>{
 const f=fixture([[7,{item:{name:'Machado',count:1},state:{x:10,z:0}}]]);
 f.render();
 const panel=f.elements.get('vellum-ground-loot');assert.ok(panel);
 assert.equal(panel.children[1].children[0].textContent,'Machado ×1');
 const button=panel.children[1].children[1];assert.equal(button.disabled,false);
 button.click();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(f.actions,[{t:'pickup',id:7}]);
});
test('distant loot cannot be collected from the panel and empty panel is removed',()=>{
 const f=fixture([[9,{item:{name:'Poção'},state:{x:1000,z:0}}]]);
 f.render();
 assert.equal(f.elements.get('vellum-ground-loot').children[1].children[1].disabled,true);
 f.state.clear();f.render();assert.equal(f.elements.has('vellum-ground-loot'),false);
});
test('server event preset requires explicit saving and uses global 24h 2x XP',()=>{
 assert.match(admin,/Preparar evento EXP 2x \(24 horas\)/);
 assert.match(admin,/drawParams\(\{multiplier:2\}\)/);
 assert.match(admin,/24\*60\*60\*1000/);
 assert.match(admin,/clique em Salvar evento para ativar/);
});
