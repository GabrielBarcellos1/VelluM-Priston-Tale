// Measured by a BPT player frame-by-frame in January 2018. This is a
// version-specific community measurement, NOT recovered classic server code.
// Times are raw cooldown from cast start, not extra delay after animation.
// For shaman skills the source did not report every rank separately; applying
// the same measured time to all ranks is a provisional server balance choice.
const MAGE = 'https://forum.priston.com.br/forum/guia-do-pristoniano/wiki/2275-skills-magos';
const SHAMAN = 'https://forum.priston.com.br/forum/guia-do-pristoniano/guia-dos-morions/xam%C3%A3/2042-tutorial-completo-de-xam%C3%A3/page3';
export const MEASURED_COOLDOWNS = Object.freeze({
  // User-provided community test (2019): ~2.2s execution, ~5.2s between executions.
  // No original recording was supplied. Provisional all-rank application.
  SKILL_DIVINE_PIERCING: Object.freeze({seconds:5.2,animationSeconds:2.2,source:'user-provided-community-2019',rankCoverage:'single-measurement-extrapolated'}),
  SKILL_FLAME_WAVE: Object.freeze({seconds:2.5,source:MAGE,rankCoverage:'all-ranks-explicit',animationSeconds:1.6}),
  SKILL_DEAD_RAY: Object.freeze({seconds:0.5,source:MAGE,rankCoverage:'all-ranks-explicit',animationSeconds:1.15}),
  SKILL_DISTORTION: Object.freeze({seconds:17.5,source:MAGE,rankCoverage:'all-ranks-explicit'}),
  SKILL_M_METEO: Object.freeze({seconds:6,source:MAGE,rankCoverage:'all-ranks-explicit',animationSeconds:1.4}),
  SKILL_DIASTROPHISM: Object.freeze({seconds:4,source:MAGE,rankCoverage:'rank-10-only',animationSeconds:1.65,level:10}),
  SKILL_CURSE_LAZY: Object.freeze({seconds:7.5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated',animationSeconds:1.6}),
  SKILL_SOUL_MANACLE: Object.freeze({seconds:17.5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated',animationSeconds:1.55}),
  SKILL_CHASING_HUNT: Object.freeze({seconds:5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated',animationSeconds:1.8}),
  SKILL_JUDGEMENT: Object.freeze({seconds:0.5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated',animationSeconds:1.25}),
  SKILL_MOURNING_OF_PRAY: Object.freeze({seconds:5,source:SHAMAN,rankCoverage:'single-measurement-extrapolated',animationSeconds:1.8}),
});
export function measuredSkillCooldown(code, level) {
  if (!Number.isInteger(level) || level < 1 || level > 10) return null;
  const measurement = MEASURED_COOLDOWNS[code];
  if (!measurement || (measurement.level && measurement.level !== level)) return null;
  return measurement.seconds;
}

export function measuredSkillAnimation(code, level) {
  if (!Number.isInteger(level) || level < 1 || level > 10) return null;
  const measurement = MEASURED_COOLDOWNS[code];
  if (!measurement || (measurement.level && measurement.level !== level)) return null;
  return measurement.animationSeconds ?? null;
}
