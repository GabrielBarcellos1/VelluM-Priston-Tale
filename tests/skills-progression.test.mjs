import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSkillSystem } from '../skill-system.mjs';
import { skillAttackProfile } from '../skill-damage.mjs';

const catalog = JSON.parse(await readFile(new URL('../data/skills.json', import.meta.url), 'utf8'));
function scenario(job, level) {
  const scheduled = [], damage = [];
  const saved = Object.fromEntries(catalog.skills.filter(s => s.job === job).map(s => [s.code, level]));
  const monster = { id: 1, x: 0, z: 0, hp: 100000 };
  const stats = { level: 200, gold: 1e9, hp: 1000, hpMax: 1000, mp: 10000, sp: 10000, spi: 100 };
  const ctx = { catalog, job, stats, saved, name: 'Progression test',
    monsters: new Map([[1, monster]]), equipment: () => ({}),
    game: () => ({ pos: { x: 0, z: 0 }, dead: false }),
    timing: () => ({ duration: 1, hits: [.2, .8] }), now: () => 0,
    wallNow: () => 0, isVillage: () => false, freeCast: () => true,
    emit() {}, recalculate() {}, save() {}, buffsChanged() {},
    schedule: (fn, at) => scheduled.push({ fn, at }),
    damage: (...args) => damage.push(args),
  };
  return { system: createSkillSystem(ctx), scheduled, damage };
}

for (const cls of catalog.classes) {
  test(`${cls.name}: every skill evaluates at levels 1–10 without invalid resources or missing row pairs`, () => {
    for (let level = 1; level <= 10; level++) {
      const skills = scenario(cls.job, level).system.snapshot().skills;
      assert.equal(skills.length, 16);
      for (const skill of skills) {
        assert.equal(skill.level, level);
        for (const key of ['mp', 'stamina', 'cooldown', 'range']) {
          assert.ok(Number.isFinite(skill[key]) && skill[key] >= 0, `${skill.code} ${level} ${key}`);
        }
        for (const row of skill.rows) {
          assert.ok(!String(row.cur).match(/NaN|undefined/), `${skill.code} current ${row.label}`);
          if (row.next !== undefined) assert.ok(!String(row.next).match(/NaN|undefined/));
        }
      }
    }
  });
}

test('weapon mastery shows actual current and next effects instead of a fabricated per-level percentage', () => {
  const skill = scenario(1, 1).system.snapshot().skills.find(s => s.code === 'SKILL_MELEE_MASTERY');
  assert.deepEqual(skill.rows.find(r => r.label === 'Dano da arma'),
    { label: 'Dano da arma', cur: '+6%', next: '+10%' });
  assert.equal(skill.rows.some(r => r.label === 'Bônus por nível'), false);
});

test('Raving applies the catalog strike count over the whole level progression', () => {
  const definition = catalog.skills.find(s => s.code === 'SKILL_RAVING');
  for (const [level, expected] of [[1, 2], [3, 2], [4, 3], [6, 3], [7, 4], [10, 4]]) {
    const { system, scheduled, damage } = scenario(1, level);
    system.cast(definition.id, 1);
    assert.equal(scheduled.length, expected, `level ${level}`);
    scheduled.forEach(event => event.fn());
    assert.equal(damage.length, expected);
    const hitRow = system.snapshot().skills.find(s => s.id === definition.id).rows.find(r => r.label === 'No. de acertos');
    assert.equal(hitRow.cur, String(expected));
  }
});

test('explicit hit-count tables can describe any class without adding a class-specific branch', () => {
  const definition = catalog.skills.find(s => s.code === 'SKILL_STINGGER');
  const rule = { damagePercent: [10,20,30,40,50,60,70,80,90,100], hitCount: [1,1,2,2,3,3,4,4,5,5] };
  assert.equal(skillAttackProfile(definition, rule, 7, {}).hitCount, 4);
});

test('fixed additions and spell damage ranges are presented as the damage actually used by combat', () => {
  const aim = scenario(3, 1).system.snapshot().skills.find(s => s.code === 'SKILL_PERFECT_AIM');
  assert.ok(aim.rows.some(r => r.label === 'Ataque adicional'));
  assert.equal(aim.rows.some(r => r.label === 'Potência'), false);
  const fire = scenario(7, 1).system.snapshot().skills.find(s => s.code === 'SKILL_FIRE_BOLT');
  assert.ok(fire.rows.some(r => r.label === 'Dano da habilidade' && r.cur !== r.next));
});

