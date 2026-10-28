// Measured by a BPT player frame-by-frame in January 2018. This is a
// version-specific community measurement, NOT recovered classic server code.
// Times are raw cooldown from cast start, not extra delay after animation.
// For shaman skills the source did not report every rank separately; applying
// the same measured time to all ranks is a provisional server balance choice.
const MAGE = 'https://forum.priston.com.br/forum/guia-do-pristoniano/wiki/2275-skills-magos';
const SHAMAN = 'https://forum.priston.com.br/forum/guia-do-pristoniano/guia-dos-morions/xam%C3%A3/2042-tutorial-completo-de-xam%C3%A3/page3';
export const MEASURED_COOLDOWNS = Object.freeze({
  SKILL_FLAME_WAVE: Object.freeze({seconds:2.5,source:MAGE,rankCoverage:'all-ranks-explicit'}),
  SKILL_CURSE_LAZY: Object.freeze({seconds:7.5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated'}),
  SKILL_SOUL_MANACLE: Object.freeze({seconds:17.5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated'}),
  SKILL_CHASING_HUNT: Object.freeze({seconds:5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated'}),
  SKILL_JUDGEMENT: Object.freeze({seconds:0.5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated'}),
  SKILL_MOURNING_OF_PRAY: Object.freeze({seconds:5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated'}),
});
export function measuredSkillCooldown(code, level) {
  if (!Number.isInteger(level) || level < 1 || level > 10) return null;
  return MEASURED_COOLDOWNS[code]?.seconds ?? null;
}
