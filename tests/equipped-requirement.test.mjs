import test from "node:test";
import assert from "node:assert/strict";
import { allocateEquippedRequirement } from "../gameplay-rules.mjs";

test("equipped requirement spends only the exact missing amount", () => {
  const stats = { str: 45, statPoints: 100 };
  const history = [];
  const equipment = [{ weapon: { req: { str: 80 } }, ring1: { req: { str: 60 } } }, { weapon: { req: { str: 72 } } }];
  assert.equal(allocateEquippedRequirement(stats, "str", equipment, history), true);
  assert.deepEqual(stats, { str: 80, statPoints: 65 });
  assert.deepEqual(history, [{ attribute: "str", n: 35 }]);
});

test("insufficient points cannot partially alter stats", () => {
  const stats = { spi: 15, statPoints: 20 };
  const history = [];
  assert.equal(allocateEquippedRequirement(stats, "spi", [{ amulet: { req: { spi: 60 } } }], history), false);
  assert.deepEqual(stats, { spi: 15, statPoints: 20 });
  assert.deepEqual(history, []);
});

test("no missing points, invalid attributes, and costumes are ignored", () => {
  const stats = { dex: 80, statPoints: 50 };
  const history = [];
  assert.equal(allocateEquippedRequirement(stats, "dex", [{ boots: { req: { dex: 40 } } }], history), false);
  assert.equal(allocateEquippedRequirement(stats, "str", [{ costume: { req: { str: 999 } } }], history), false);
  assert.equal(allocateEquippedRequirement(stats, "unknown", [{}], history), false);
  assert.equal(history.length, 0);
});

test("checks secondary equipment set and handles malformed requirements", () => {
  const stats = { tal: 20, statPoints: 40 };
  const history = [];
  assert.equal(allocateEquippedRequirement(stats, "tal", [{ armor: { req: { tal: "invalid" } } }, { weapon: { req: { tal: 38 } } }], history), true);
  assert.equal(stats.tal, 38);
  assert.equal(stats.statPoints, 22);
});
