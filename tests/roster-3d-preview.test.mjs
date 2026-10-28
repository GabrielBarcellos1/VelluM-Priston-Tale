import test from 'node:test';
import assert from 'node:assert/strict';
import {mountRosterCharacterPreview} from '../roster-3d.mjs';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('selection preview uses original game renderer and keeps gameplay path separate',()=>{
 const session=read('session.mjs'),markup=read('login.mjs'),server=read('iniciar.py');
 assert.match(session,/const rosterPreviewMode = params\.get\('rosterPreview'\) === '1'/);
 assert.match(session,/if \(rosterPreviewMode\) \{/);
 assert.match(session,/conn\.sendGame = \(\) => \{\};/);
 assert.match(session,/await mountRosterCharacterPreview\(B,game,hero\)/);
 assert.match(markup,/character-model-frame/);
 assert.match(markup,/rosterPreview=1/);
 assert.match(server,/frame-src 'self'/);
 assert.match(server,/roster-3d\.mjs/);
});
test('original Priston actor preview camera is interactive but has no extra WebGL context or saves',async()=>{
 const old={document:globalThis.document,window:globalThis.window,location:globalThis.location,parent:globalThis.parent,
  requestAnimationFrame:globalThis.requestAnimationFrame,addEventListener:globalThis.addEventListener};
 const listeners=new Map(),frames=[],posted=[],attrs={};
 const el=(tag)=>({tag,style:{},children:[],addEventListener(name,fn){listeners.set(tag+':'+name,fn);},
   append(...children){this.children.push(...children);},setPointerCapture(){},textContent:''});
 const canvas=el('canvas'),ui=el('div'),link=el('a'),body=el('body');
 globalThis.document={querySelector(selector){return {'#ui':ui,'#vellum-roster-link':link,'#gl':canvas}[selector]??null;},
   createElement:el,body:Object.assign(body,{dataset:attrs})};
 globalThis.window={addEventListener(name,fn){listeners.set('window:'+name,fn);},removeEventListener(){}};
 globalThis.location={origin:'http://example.test'};
 globalThis.parent={postMessage(value,origin){posted.push({value,origin});}};
 globalThis.requestAnimationFrame=callback=>frames.push(callback);
 globalThis.addEventListener=()=>{};
 try{
  const game={player:{object:{}},camDist:400,camPitch:.6,camYaw:0};
  await mountRosterCharacterPreview(null,game,{jobCode:6});
  for(let i=0;i<12;i++){const frame=frames.shift();assert.ok(frame);frame();}
  assert.equal(game.camDist,165);assert.equal(game.camPitch,.12);assert.equal(game.camYaw,Math.PI);
  assert.equal(attrs.rosterPreviewReady,'true');
  assert.equal(posted.length,1);assert.equal(posted[0].value.job,6);
  assert.equal(canvas.style.cssText.includes('display:block'),true);
  assert.equal(ui.style.display,'none');
  assert.ok(listeners.has('div:pointermove'));
  assert.ok(!read('roster-3d.mjs').includes('new B.WebGLRenderer('),'native renderer must be reused');
 }finally{for(const [k,v]of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
