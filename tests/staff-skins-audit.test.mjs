import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const load=x=>readFile(new URL(x,root),'utf8');
const [skin,shop,session,online,staff]=await Promise.all(['custom-skins.mjs','skins-shop.mjs','session.mjs','online-session.mjs','staff-presence.mjs'].map(load));
test('Reaper sapphire scythe uses twice original equipped scale',()=>{
 assert.match(skin,/model\.scale\.setScalar\(\(skin\.customScale\?\?\.8\)\*2\)/);
 assert.match(skin,/model\.scale\.setScalar/);
 assert.doesNotMatch(skin,/skin\.family===base\.code/);
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

test('Shaman phantom is a two-hand combat weapon and cannot pair with a shield',async()=>{
 const {equipmentError,isShamanPhantom}=await import('../equipment-rules.mjs');
 const shaman={job:10},phantom={code:'WN101',slot:'WEAPON_ONE'},shield={code:'DS101',slot:'SHIELDS'};
 assert.equal(isShamanPhantom(shaman,phantom),true);
 assert.match(equipmentError(shield,'shield',shaman,{weapon:phantom},()=>null),/Fantasma/);
 assert.equal(equipmentError(shield,'shield',{job:7},{weapon:phantom},()=>null),null);
 assert.equal(isShamanPhantom(shaman,{code:'WA101'}),false);
 assert.match(session,/isShamanPhantom\(stats, record\.item\)/);
});
test('premium store exposes integrated 3D skin catalog',async()=>{
 const premium=await load('premium-shop.mjs');
 assert.match(premium,/ft-native-shop/);
 assert.match(premium,/"Premiums"/);
 assert.match(premium,/"Skins"/);
 assert.match(premium,/renderSapphireItemIcons\(ctx\.B/);
 assert.match(premium,/ctx\.itemImage/);
 assert.match(shop,/preview\(skin, card\)/);
 assert.match(skin,/skin\.customModel==='vambrace'/);
});

test('paired Shaman phantoms and Martial Artist fists use animated hand bones',()=>{
 assert.match(skin,/\['phantom','vambrace','claw'\]/);
 assert.match(skin,/const bone=index===0\?15:25/);
 assert.match(skin,/actor\.object\.add\(hand\)/);
 assert.match(skin,/updateHands\(actor,record\)/);
 assert.match(skin,/record\.handModels\?\?/);
 assert.match(skin,/if\(root!==primary\)/);
});

test('classic shop uses original item images, actual 3D skin icons and empty inventory slots',async()=>{
 const premium=await load('premium-shop.mjs');
 const css=await load('freeston.css');
 assert.match(premium,/skinIcons\.get\(item\.id\)\|\|""/);
 assert.match(premium,/renderSapphireItemIcons\(ctx\.B/);
 assert.match(premium,/Math\.max\(81,/);
 assert.match(premium,/ft-native-slot-empty/);
 assert.match(css,/\.ft-native-shop/);
 assert.match(css,/\.ft-native-preview:not\(\[hidden\]\)/);
 assert.doesNotMatch(premium,/sapphire-.*\.svg/);
});

test('Precious Item Shop opens three-tab store directly and keeps classic merchants unchanged',async()=>{
 const session=await load('session.mjs');
 const shop=await load('premium-shop.mjs');
 assert.match(session,/\/\^Precious Item Shop\$\/i\.test\(npc\.name\)/);
 assert.match(session,/showShop\(\)\.catch/);
 assert.match(shop,/"Premiums"/);
 assert.match(shop,/"Skins"/);
 assert.match(shop,/"Trajes"/);
 assert.match(shop,/item\.category==="costume"/);
 assert.match(shop,/item\.category==="premium"/);
 assert.match(shop,/item\.category==="items"/);
 assert.match(shop,/item\.code==="BI900"/);
 assert.match(shop,/canvas\.toDataURL\("image\/png"\)/);
});

test('skin inventory does not flash stale catalog or wrong base equipment sprites',async()=>{
 const premium=await load('premium-shop.mjs');
 assert.match(premium,/if\(tab==="skins"\)return skinsLoading\?\[\]/);
 assert.match(premium,/if\(kind==="skins"\)return skinIcons\.get\(item\.id\)\|\|""/);
 assert.match(premium,/img\.hidden=true/);
 assert.match(premium,/img\.src=data;img\.hidden=false/);
 assert.match(premium,/await skinShop\(\)\?\.refresh\(\)/);
});
