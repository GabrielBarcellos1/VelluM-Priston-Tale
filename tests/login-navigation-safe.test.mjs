import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const session=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const login=await readFile(new URL('../login.mjs',import.meta.url),'utf8');
const html=await readFile(new URL('../login.html',import.meta.url),'utf8');
test('mobile account exits use the verified save-and-flush path',()=>{
 assert.match(session,/async function leaveCharacter\(logoutAccount = false\) \{\s*\/\/ Use the same fully flushed exit flow[\s\S]*?await leaveFromChat\(logoutAccount\)/);
 assert.match(session,/async function leaveFromChat\(logout=false\)[\s\S]*?if\(!save\(true\)\)/);
 assert.match(session,/await stateWrite;[\s\S]*?location\.replace\('\/personagens'\)/);
 assert.match(session,/logout\.onclick = \(\) => exitFromMenu\(false, logout\)/);
 assert.match(session,/switchAccount\.onclick = \(\) => exitFromMenu\(true, switchAccount\)/);
 assert.match(session,/maxPixelRatio: Math\.min\(2, window\.devicePixelRatio \|\| 1\.5\), renderScale: 1/);
});
test('roster swaps instantly and uses complete art for broken portraits',()=>{
 assert.match(login,/selected=ranked\[/);
 assert.match(login,/detail\(\);\s*updatePosition\(\)/);
 assert.match(login,/Number\(job\)===11/);
 assert.doesNotMatch(login,/rosterPreview=1/);
});

test('rapid character switching discards stale outgoing stages',()=>{
 assert.match(login,/querySelector\("\.character-model-stage:not\(\.roster-transition-exit\)"\)/);
 assert.match(login,/panel\.replaceChildren\(\)/);
 assert.match(login,/previousStage\.className="character-model-stage roster-transition-exit /);
});

test('new character nick is editable and roster selection is visually highlighted',()=>{
 assert.match(login,/name\.readOnly = false/);
 assert.match(login,/name\.value = ""/);
 assert.match(html,/\.character-card\[aria-pressed="true"\]/);
 assert.match(html,/width: 84px/);
});
