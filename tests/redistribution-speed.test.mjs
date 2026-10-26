import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planAttributeReset, INITIAL_ATTRIBUTES } from '../gameplay-rules.mjs';
import { createSkillSystem } from '../skill-system.mjs';
import { combatStats } from '../character-stats.mjs';
import { nativeSkillTiming } from '../native-rules.mjs';
import vm from 'node:vm';

const catalog = JSON.parse(await readFile(new URL('../data/skills.json', import.meta.url), 'utf8'));
const axe = { code: 'WA101', damage: [10, 20], attackSpeed: 8, w: 2, h: 3, req: { str: 60 } };
const actor = () => ({ ...INITIAL_ATTRIBUTES, job: 1, level: 100, hp: 1000, hpMax: 1000,
  mp: 10000, sp: 10000, gold: 99999, str: 100, statPoints: 5 });
const inventory = () => ({ bag: [], bagB: [], equip: { weapon: axe }, equipB: {} });
function scenario() {
  const stats = actor(), inv = inventory(), scheduled = [];
  let time = 0, hits = 0, system;
  const ctx = { catalog, job: 1, name: 'Test', stats, saved: { SKILL_SWIFT_AXE: 10, SKILL_RAVING: 5 },
    equipment: () => inv.equip, monsters: new Map([[1, { id: 1, hp: 10000, x: 0, z: 0 }]]),
    game: () => ({ pos: { x: 0, z: 0 } }), now: () => time, wallNow: () => time,
    timing: () => ({ duration: 1, hits: [.5] }), isVillage: () => false,
    recalculate: () => Object.assign(stats, combatStats(stats, inv.equip, {}, system.bonuses())),
    emit() {}, save() {}, buffsChanged() {},
    schedule: fn => scheduled.push(fn), damage: () => { hits++; } };
  system = createSkillSystem(ctx); ctx.recalculate();
  return { system, stats, inv, scheduled, ctx, get hits() { return hits; }, advance: n => { time += n; } };
}

test('attribute reset refunds allocated plus unspent points without changing level, gold or items', () => {
  const stats = actor(), inv = inventory();
  const plan = planAttributeReset(stats, inv);
  assert.equal(plan.attributes.statPoints, 80);
  assert.equal(plan.attributes.str, 25);
  assert.equal(plan.inventory.equip.weapon, undefined);
  assert.equal(plan.inventory.bag[0].item, axe);
  assert.equal(inv.equip.weapon, axe);
  assert.equal(stats.str, 100);
  assert.equal(stats.level, 100);
  assert.equal(stats.gold, 99999);
  assert.equal(planAttributeReset({ ...stats, ...plan.attributes }, plan.inventory).attributes.statPoints, 80);
});

test('reset does not modify anything when both bags are full', () => {
  const inv = inventory();
  for (const bag of [inv.bag, inv.bagB]) bag.push({ x: 0, y: 0, item: { w: 12, h: 6 } });
  assert.throws(() => planAttributeReset(actor(), inv), /Abra espaço/);
  assert.equal(inv.equip.weapon, axe);
  assert.equal(inv.bag.length, 1);
});

test('Machado Veloz raises actual attack speed only with an axe and reverts on reset', () => {
  const fixture = scenario();
  const swift = catalog.skills.find(s => s.code === 'SKILL_SWIFT_AXE');
  const before = fixture.stats.attackStep;
  fixture.system.cast(swift.id);
  assert.ok(Math.abs(fixture.stats.attackStep - before * 1.15) < 1e-8);
  assert.ok(fixture.system.buffs().some(b => b.code === 'skill:SKILL_SWIFT_AXE'));
  fixture.system.reset();
  assert.equal(fixture.stats.attackStep, before);
  assert.equal(fixture.system.buffs().length, 0);
  assert.deepEqual(fixture.system.exportState(), {});
  assert.deepEqual(fixture.system.exportCooldowns(), {});
  assert.deepEqual(fixture.system.points(), { skill: 46, elite: 21 });
  fixture.inv.equip.weapon = { ...axe, code: 'WH101' };
  // Test the weapon restriction with a learned skill in another fresh scenario.
  const other = scenario(); other.inv.equip.weapon = { ...axe, code: 'WH101' };
  assert.throws(() => other.system.cast(swift.id), /Equipe um machado/);
});

test('pending skill hits are cancelled when skills are reset', () => {
  const fixture = scenario();
  fixture.system.cast(catalog.skills.find(s => s.code === 'SKILL_RAVING').id, 1);
  assert.ok(fixture.scheduled.length > 0);
  fixture.system.reset(); fixture.scheduled.forEach(fn => fn());
  assert.equal(fixture.hits, 0);
});

test('self buffs work in town while offensive skills remain blocked', () => {
  const fixture = scenario(); fixture.ctx.isVillage = () => true;
  fixture.system.cast(catalog.skills.find(s => s.code === 'SKILL_SWIFT_AXE').id);
  assert.ok(fixture.system.bonuses().attackSpeedPercent > 0);
  assert.throws(() => fixture.system.cast(catalog.skills.find(s => s.code === 'SKILL_RAVING').id, 1), /fora da cidade/);
});

test('physical skill animations and hit times use attack speed; spell timing is unchanged', () => {
  const player = { pickClip: () => 'attack', skeleton: { clips: { attack: { samples: 36, step: 1 } },
    motions: [{ clip: 'attack', events: [17.5] }] } };
  const physical = { code: 'SKILL_RAVING', kind: 'melee', job: 1 };
  const before = nativeSkillTiming(player, physical, 'Raving', {}, 100);
  const after = nativeSkillTiming(player, physical, 'Raving', {}, 115);
  assert.ok(Math.abs(after.duration - before.duration / 1.15) < 1e-10);
  assert.ok(Math.abs(after.hits[0] - before.hits[0] / 1.15) < 1e-10);
  assert.equal(nativeSkillTiming(player, { ...physical, job: 7, kind: 'shot' }, 'FireBolt', {}, 115).fps, 35);
});

test('the Event Girl handler saves an actual combined reset and validates proximity before modifying state', async () => {
  const fixture = scenario();
  const source = await readFile(new URL('../session.mjs', import.meta.url), 'utf8');
  const code = source.slice(source.indexOf('async function redistributeAtNpc('), source.indexOf('function npcTalk(')).trim();
  let saved = null;
  const context = { planAttributeReset, npcs: [{ id: 21237, name: 'Event Girl', x: 0, z: 0, services: ['event'] }],
    game: { pos: { x: 0, z: 0 }, setSkillSlot() {} }, stats: fixture.stats, inv: fixture.inv,
    skills: fixture.system, statHistory: [], companions: new Map(), economyBusy: false,
    economyUncertain: false, pendingLoot: 0, stateWrite: null,
    deliver() {}, recalculate() {}, publishBuffs() {},
    save: () => { saved = JSON.parse(JSON.stringify({ stats: fixture.stats, skills: fixture.system.exportState(), inv: fixture.inv }));
      context.stateWrite = Promise.resolve({ ok: true }); return true; } };
  const reset = vm.runInNewContext(`(${code})`, context);
  context.game.pos.x = 1000;
  await assert.rejects(reset(21237, 'both'), /Aproxime-se/);
  assert.equal(fixture.stats.str, 100); assert.equal(saved, null);
  context.game.pos.x = 0;
  await assert.rejects(reset(1, 'both'), /inválida/);
  const result = await reset(21237, 'both');
  assert.match(result, /salva/);
  assert.equal(saved.stats.str, 25);
  assert.equal(saved.stats.statPoints, 80);
  assert.deepEqual(saved.skills, {});
  assert.equal(saved.inv.bag[0].item.code, 'WA101');
  assert.equal(saved.stats.gold, 99999);
  assert.equal(context.economyBusy, false);
});

