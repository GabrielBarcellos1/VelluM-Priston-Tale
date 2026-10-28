import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const session=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const login=await readFile(new URL('../login.mjs',import.meta.url),'utf8');
const html=await readFile(new URL('../login.html',import.meta.url),'utf8');
test('character exit waits for final save and stays in roster',()=>{
 const a=session.slice(session.indexOf('async function leaveCharacter('),session.indexOf('charactersButton.onclick',session.indexOf('async function leaveCharacter(')));
 assert.match(a,/await sendState\(JSON\.parse\(state\)\)/);
 assert.match(a,/if \(stateWrite\) await stateWrite/);
 assert.match(a,/location\.replace\("\/personagens"\)/);
});
test('logout and switch account are separate actions',()=>{
 assert.match(session,/logout\.onclick = \(\) => leaveCharacter\(false\)/);
 assert.match(session,/switchAccount\.onclick = \(\) => leaveCharacter\(true\)/);
 assert.match(login,/\$\("#entry"\)\.hidden = false/);
});
test('roster swaps instantly and uses complete art for broken portraits',()=>{
 assert.match(login,/selected=ranked\[/);
 assert.match(login,/detail\(\);\s*updatePosition\(\)/);
 assert.match(login,/\[6,10,11\]\.includes\(Number\(job\)\)/);
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
