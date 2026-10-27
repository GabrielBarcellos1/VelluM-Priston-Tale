import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const session=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const login=await readFile(new URL('../login.mjs',import.meta.url),'utf8');
const html=await readFile(new URL('../login.html',import.meta.url),'utf8');
test('exit waits for durable server write before leaving the multiplayer room',()=>{
 const section=session.slice(session.indexOf('async function leaveCharacter('),session.indexOf('charactersButton.onclick',session.indexOf('async function leaveCharacter(')));
 assert.match(section,/save\(true\)/);
 assert.match(section,/await stateWrite;/);
 assert.ok(section.indexOf('await stateWrite')<section.indexOf('online?.dispose'));
 assert.match(section,/location\.replace\("\/personagens"\)/);
});
test('logout and account switch stay within the mount path',()=>{
 assert.match(session,/logout\.textContent = "Sair"/);
 assert.match(session,/switchUser\.textContent = "Trocar usuario"/);
 assert.doesNotMatch(session,/location\.replace\(logoutAccount \? "\/" :/);
 assert.match(login,/history\.replaceState\(null, "", "\/personagens"\)/);
 assert.match(login,/Sessao encerrada\. Entre com outra conta/);
});
test('account role badge does not force all characters to have same nickname',()=>{
 assert.match(login,/name\.readOnly = false/);
 assert.match(login,/name\.value = ""/);
 assert.match(login,/node\("strong", character\.name\)/);
});
test('character selection has large hero display and selected visual states',()=>{
 assert.match(login,/character-hero-preview/);
 assert.match(login,/character-card-portrait/);
 assert.match(html,/\.character-hero-portrait/);
 assert.match(html,/\.character-card\[aria-pressed="true"\]/);
});
