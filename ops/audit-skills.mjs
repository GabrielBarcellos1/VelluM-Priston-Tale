// Export evaluated facts and provenance. This is a coverage audit, not an official balance export.
import { readFile, writeFile } from 'node:fs/promises';
import { createSkillSystem } from '../skill-system.mjs';
import { skillAttackProfile } from '../skill-damage.mjs';
import { effectFor } from '../skill-effects.mjs';
const catalog = JSON.parse(await readFile(new URL('../data/skills.json', import.meta.url), 'utf8'));
const stats = { level: 100, spi: 100, hp: 1000, hpMax: 1000, mp: 10000, sp: 10000, gold: 1e9 };
const equipment = { weapon: { damage: [100, 150] } };
const skills = [];
const attackKinds = new Set(['melee', 'shot', 'sky', 'beam', 'aoe', 'nova']);
for (const cls of catalog.classes) {
  const classSkills = catalog.skills.filter(skill => skill.job === cls.job);
  const records = classSkills.map(skill => ({ code: skill.code, name: skill.name, job: skill.job,
    className: cls.name, kind: catalog.rules.skills[skill.code].runtime?.kind??skill.kind, verifiedCompleteForPweb: false,
    tableSource: catalog.rules.classicSkillCodes.includes(skill.code) ? 'classic-public-source' : 'vellum-authored',
    runtime:catalog.rules.skills[skill.code].runtime, levels: [] }));
  for (let level = 1; level <= 10; level++) {
    const saved = Object.fromEntries(classSkills.map(s => [s.code, level]));
    const system = createSkillSystem({ catalog, job: cls.job, saved, stats,
      equipment: () => equipment, game: () => null, now: () => 0, wallNow: () => 0 });
    const snapshot = system.snapshot();
    for (const [i, skill] of classSkills.entries()) {
      const evaluated = snapshot.skills.find(s => s.id === skill.id);
      const attack = attackKinds.has(skill.kind)
        ? skillAttackProfile(skill, catalog.rules.skills[skill.code], level, stats, equipment) : null;
      records[i].levels.push({ level, mp: evaluated.mp, stamina: evaluated.stamina,
        cooldown: evaluated.cooldown, cooldownSource: evaluated.cooldownSource,
        duration: evaluated.duration, attack, effects: effectFor(skill, level, catalog.rules), rows: evaluated.rows });
    }
  }
  skills.push(...records);
}
const result = { schema: 'vellum-skill-progressions-audit/v1',
  warning: 'Evaluated local rules, not recovered private pweb balance. Character stats affect computed spell ranges.',
  referenceStats: stats, referenceEquipment: equipment,
  summary: { classes: catalog.classes.length, skills: skills.length, levelStates: skills.length * 10,
    classicTables: skills.filter(s => s.tableSource === 'classic-public-source').length,
    missingSpecificTables: skills.filter(s => s.tableSource === 'vellum-authored').length,
    explicitRuntimeProfiles: skills.filter(s=>s.runtime).length,
    attackSkillsUsingGenericPower: skills.filter(s => s.levels.some(l => l.attack?.source === 'freeston-fallback')).length },
  skills };
const target = process.argv[2];
if (target) await writeFile(target, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result.summary));
