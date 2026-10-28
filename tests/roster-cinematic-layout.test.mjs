import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {characterPortrait} from '../login-portrait.mjs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('full screen selector uses instant inline SVG with no iframe or 3D model downloads',()=>{
 const js=source('login.mjs'),html=source('login.html');
 assert.match(js,/import \{characterPortrait\}/);
 assert.match(js,/rosterPortrait\(selected\.job\)/);
 assert.match(js,/rankedCharacters\(\)/);
 assert.doesNotMatch(js,/<iframe|node\("iframe"|rosterPreview=1|previewFrames|api\("\/api\/local\/skills"\)/);
 assert.match(js,/selected=ranked\[/);
 assert.match(js,/previous\.onclick=\(\)=>moveSelection\(-1\)/);
 assert.match(js,/next\.onclick=\(\)=>moveSelection\(1\)/);
 assert.match(html,/body\.roster-cinematic \.roster-arrow/);
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

test('real level 150 portraits are loaded once in a compressed transparent image atlas',()=>{
 const script=source('login.mjs'),server=source('iniciar.py');
 const atlas=JSON.parse(source('data/roster-full-portraits.json'));
 assert.equal(Object.keys(atlas.portraits).length,11);
 for(let i=1;i<=11;i++)assert.match(atlas.portraits[String(i)],/^data:image\/webp;base64,/);
 assert.match(script,/fetch\("\/assets\/roster-full-portraits\.json"/);
 assert.match(script,/fullPortraits\.set/);
 assert.match(script,/old\.replaceWith\(rosterPortrait/);
 assert.match(server,/\/assets\/roster-full-portraits\.json/);
});

test('strongest character first; only one hero with accessible left/right controls',()=>{
 const js=source('login.mjs'),html=source('login.html');
 assert.match(js,/Number\(b\.level\).*Number\(a\.level\)/);
 assert.match(js,/rankedCharacters\(\)\[0\]/);
 assert.match(js,/aria-label","Personagem anterior"/);
 assert.match(js,/aria-label","Próximo personagem"/);
 assert.match(js,/keydown/);
 assert.match(js,/event\.key==="ArrowLeft"/);
 assert.doesNotMatch(js,/character-miniature/);
 assert.match(html,/\.roster-position-count/);
 assert.match(html,/\.roster-arrow-next/);
});
