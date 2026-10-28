import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {characterPortrait} from '../login-portrait.mjs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('full screen selector uses instant inline SVG with no iframe or 3D model downloads',()=>{
 const js=source('login.mjs'),html=source('login.html');
 assert.match(js,/import \{characterPortrait\}/);
 assert.match(js,/characterPortrait\(selected\.job\)/);
 assert.match(js,/characterPortrait\(character\.job,\{mini:true\}\)/);
 assert.doesNotMatch(js,/<iframe|node\("iframe"|rosterPreview=1|previewFrames|api\("\/api\/local\/skills"\)/);
 assert.match(js,/selected = character;\s*for \(const other of list\.querySelectorAll/);
 assert.match(js,/detail\(\);\s*\};\s*list\.append\(card\)/);
 assert.match(html,/body\.roster-cinematic \.cards/);
 assert.match(html,/body\.roster-cinematic \.detail/);
 assert.match(html,/\.character-art-main svg/);
 assert.match(html,/#play-character/);
});
test('all 11 class portraits are built synchronously without fetching assets',()=>{
 const old=globalThis.document;
 globalThis.document={createElement(name){return {nodeName:name,innerHTML:'',className:''};}};
 try{
  for(let job=1;job<=11;job++){
   const node=characterPortrait(job);
   assert.equal(node.nodeName,'span');
   assert.ok(node.innerHTML.startsWith('<svg'));
   assert.match(node.innerHTML,/viewBox="0 0 280 340"/);
   assert.ok(node.innerHTML.includes('fill='));
   assert.equal(characterPortrait(job,{mini:true}).className,'character-art character-art-mini');
  }
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
