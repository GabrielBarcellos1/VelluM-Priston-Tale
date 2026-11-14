import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectEndgameKit, ENDGAME_KIT_LEVELS} from "../endgame-kit.mjs";

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
    assert.equal(kit.equipment.boots.code,"DB130","Mokova must be equipped, not merely in the inventory");
    assert.ok(!kit.extras.some(x=>x.code==="DB130"),"Never duplicate Mokova in bonus inventory");
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

test("five staged kit levels are ordered and stay within the active original catalog",()=>{
  assert.deepEqual(ENDGAME_KIT_LEVELS,[108,110,112,116,120]);
  for (const level of ENDGAME_KIT_LEVELS) {
    for (const job of [1,2,3,4,5,6,7,8]) {
      const kit=selectEndgameKit(catalog,job,starter[job],level);
      assert.equal(kit.tier,level);
      for (const item of [...Object.values(kit.equipment),...Object.values(kit.secondary)]) {
        if (["AMULET","RING","SHELTOM"].includes(item.slot)) continue;
        if (item.code==="DB130") {assert.equal(level,120);continue;}
        assert.ok(item.req.level<=level, `Job ${job} tier ${level}: ${item.code} requires ${item.req.level}`);
      }
      assert.equal(kit.equipment.amulet.code,"OA144");
      assert.equal(kit.equipment.ring1.code,"OR205"); // fallback without custom staff items
      assert.equal(kit.equipment.ring2.code,"OR205");
      assert.ok(kit.extras.some(x=>x.code==="DB130") === (level!==120));
    }
  }
});

test("available Yagdhita amulet has priority over Tulla and available Shy ring is used twice",()=>{
  const augmented=new Map(catalog);
  augmented.set("OR299",{...catalog.get("OR205"),code:"OR299",name:"Anel Shy (VelluM)",slot:"RING"});
  const tier=selectEndgameKit(augmented,3,starter[3],108);
  assert.equal(tier.equipment.amulet.code,"OA144");
  assert.equal(tier.equipment.ring1.code,"OR299");
  assert.equal(tier.equipment.ring2.code,"OR299");
  augmented.set("OA299",{...catalog.get("OA144"),code:"OA299",name:"Yagdhita Amulet",slot:"AMULET"});
  assert.equal(selectEndgameKit(augmented,3,starter[3],108).equipment.amulet.code,"OA299");
});
