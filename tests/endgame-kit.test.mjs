import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectEndgameKit} from "../endgame-kit.mjs";

const items=JSON.parse(readFileSync(new URL("../data/loot-items.json",import.meta.url),"utf8")).items;
const catalog=new Map(items.map(item=>[item.code,item]));
const starter={1:"WA101",2:"WH101",3:"WS101",4:"WP101",5:"WT101",6:"WS201",7:"WM101",8:"WM101",9:"WD101",10:"WN101",11:"WV101"};

for (const job of [1,2,3,4,5,6,7,8,9,10,11]) {
  test("GM kit for class "+job+" contains both weapon sets and endgame armor",()=>{
    const kit=selectEndgameKit(catalog,job,starter[job]);
    assert.equal(kit.equipment.weapon.slot,"WEAPON_TWO");
    assert.equal(kit.secondary.weapon.slot,"WEAPON_ONE");
    assert.equal(kit.secondary.shield.slot,"SHIELDS");
    for (const key of ["armor","boots","gloves","bracelets"])
      assert.ok(kit.equipment[key],"Missing "+key);
    assert.ok(kit.equipment.weapon.req.level<=150);
    assert.ok(kit.secondary.weapon.req.level<=150);
    assert.ok(kit.extras.some(x=>x.code==="DB130"),"Mokova boots required");
    for (const code of ["BI139","BI140","BI141"])
      assert.ok(kit.extras.some(x=>x.code===code),"Missing training stone "+code);
  });
}
test("archer gets claw and shield rather than a non-compatible staff",()=>{
  const kit=selectEndgameKit(catalog,3,starter[3]);
  assert.match(kit.secondary.weapon.code,/^WC1/);
});
test("pikeman gets staff (bastão) and shield as one-hand option",()=>{
  const kit=selectEndgameKit(catalog,4,starter[4]);
  assert.match(kit.secondary.weapon.code,/^WM1/);
});
