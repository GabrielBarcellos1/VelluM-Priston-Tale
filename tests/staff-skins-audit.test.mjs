import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const load=x=>readFile(new URL(x,root),'utf8');
const [skin,shop,session,online,staff]=await Promise.all(['custom-skins.mjs','skins-shop.mjs','session.mjs','online-session.mjs','staff-presence.mjs'].map(load));
test('Reaper sapphire scythe uses twice original equipped scale',()=>{
 assert.match(skin,/skin\.id\?\.startsWith\('sapphire-wp1-'\)\?2:1/);
 assert.match(skin,/model\.scale\.setScalar/);
});
test('purchased cosmetics visible in My Skins without another purchase',()=>{
 assert.match(shop,/\["owned", "Minhas skins"\]/);
 assert.match(shop,/snapshot\.owned\.includes\(skin\.id\)/);
 assert.match(shop,/Adquirida e equipada/);
 assert.match(shop,/Skins são visuais permanentes da conta/);
});
test('GM announcement command is routed before generic slash command and uses server validation',()=>{
 const special=session.indexOf('message.text.trim().startsWith("/>")');
 const generic=session.indexOf('message.text.trim().startsWith("/")',special);
 assert.ok(special>0&&generic>special);
 assert.match(session,/\.online\.chat\(content,"all",true\)/);
 assert.match(online,/announcement = false/);
});
test('staff aura is distinct from other players',()=>{
 assert.match(staff,/scope==="staff"\?0xb56aff:0xffd05c/);
});
