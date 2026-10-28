import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('full screen selection highlights active hero and renders other saved models',()=>{
 const script=source('login.mjs'),html=source('login.html');
 assert.match(script,/roster\.characters\.length > 0/);
 assert.match(script,/classList\.toggle\("roster-cinematic"/);
 assert.match(script,/selected\?\.job !== character\.job/);
 assert.match(script,/character-miniature-frame/);
 assert.match(script,/character-model-frame/);
 assert.match(script,/selected = character;\s*render\(\)/);
 assert.match(script,/character\.name/);
 assert.match(script,/character\.level/);
 assert.match(html,/body\.roster-cinematic \.detail/);
 assert.match(html,/body\.roster-cinematic \.cards/);
 assert.match(html,/\.character-miniature-frame/);
 assert.match(html,/width: 100%;\s*height: 100%/);
 assert.match(html,/#play-character/);
});
test('read-only preview loads original game model without logging in or changing characters',()=>{
 const script=source('roster-3d.mjs'),session=source('session.mjs');
 assert.match(script,/game\.player\?\.object/);
 assert.match(script,/const canvas=document\.querySelector\('#gl'\)/);
 assert.match(script,/game\.camDist=165/);
 assert.match(script,/game\.camYaw=angle/);
 assert.match(session,/if \(rosterPreviewMode\) \{/);
 assert.match(session,/conn\.sendGame = \(\) => \{\}/);
 assert.match(session,/await mountRosterCharacterPreview/);
});

test('switching characters preserves preview frames and never rerenders all roster cards',()=>{
 const script=source('login.mjs');
 assert.match(script,/const previewFrames = new Map\(\)/);
 assert.match(script,/if \(entry\) return entry/);
 assert.match(script,/entry\.frame\.hidden=!active/);
 assert.match(script,/entry\.loading\.hidden=!active\|\|entry\.ready/);
 assert.match(script,/for\(const child of \[\.\.\.panel\.children\]\)if\(child!==stage\)child\.remove\(\)/);
 assert.match(script,/selected = character;\s*for \(const other of list\.querySelectorAll/);
 assert.match(script,/detail\(\);\s*\};\s*list\.append\(card\)/);
 assert.match(script,/card\.addEventListener\("pointerenter"/);
 assert.match(script,/clearPreviewCache\(\)/);
});
