import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const [view,script,controller]=await Promise.all(['dashboard.html','dashboard.mjs','dashboard-game.mjs'].map(s=>readFile(new URL(s,root),'utf8')));
test('admin has a dedicated accessible skill balance tab',()=>{
 assert.match(view,/data-tab="skills"/);
 assert.match(view,/data-panel="skills"/);
 assert.match(script,/skills:\s*\["Habilidades"/);
});
test('skill editor exposes all ten levels, ability filters and reset',()=>{
 assert.match(controller,/for\(let level=1;level<=10;level\+\+\)/);
 assert.match(controller,/\/api\/local\/admin\/skill-save/);
 assert.match(controller,/reset:true/);
 assert.match(controller,/Recarga \(segundos\)/);
});
