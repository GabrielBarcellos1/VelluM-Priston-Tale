import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {abyssCatalogStatus, selectAbyssKit, ABYSS_REQUIRED} from "../endgame-kit.mjs";

const items=JSON.parse(readFileSync(new URL("../data/loot-items.json",import.meta.url),"utf8")).items;
const catalog=new Map(items.map(item=>[item.code,item]));

test("Abyss catalog does not disguise missing armor as another item",()=>{
  const status=abyssCatalogStatus(catalog);
  assert.equal(status.ready,false);
  assert.ok(status.missing.includes("DA303"));
  for(const code of ["DB129","DG129","OA229"])
    assert.ok(!status.missing.includes(code),code+" must exist with valid original attributes");
  assert.throws(()=>selectAbyssKit(catalog,6,"WS201"),/DA303/);
});

test("Abyss kit uses real catalog pieces and preserves class weapons",()=>{
  const augmented=new Map(catalog);
  const template=catalog.get("DA129");
  assert.ok(template,"test requires an original armor template");
  augmented.set("DA303",{...template,code:"DA303",name:"Abyss Armor",slot:"ARMOR",image:"image/sinimage/items/defense/itda303.png",req:{level:117},defense:[200,240]});
  const status=abyssCatalogStatus(augmented);
  assert.equal(status.ready,true);
  const kit=selectAbyssKit(augmented,6,"WS201");
  for(const [slot,code] of Object.entries(ABYSS_REQUIRED))
    assert.equal(kit.equipment[slot].code,code);
  assert.match(kit.equipment.weapon.code,/^WS2/);
  assert.ok(kit.secondary.weapon);
  assert.equal(kit.abyssVerified,true);
});
