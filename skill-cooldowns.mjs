// Classic CheckSkillMastery: 35 gauge units, updated by MainSub at 70 Hz.
// This is a recovered classic-client rule, not verified Zephira server balance.
export function classicSkillCooldown(rule, level, mastery = 10000) {
  const params = rule?.requireMastery;
  if (!Array.isArray(params) || params.length !== 2 || !params.every(Number.isFinite)) return null;
  const rank = Math.max(1, Math.min(10, Math.floor(level) || 1));
  const trained = Math.max(0, Math.min(10000, Math.floor(mastery) || 0));
  const delay = Math.max(1, Math.min(70, params[0] + params[1] * rank - Math.floor(trained / 100)));
  const increment = Math.floor(70 / delay);
  const ticksPerUnit = Math.max(1, Math.floor(35 / increment));
  return (35 * ticksPerUnit) / 70;
}

// A local server profile can intentionally differ from the historical tables.
// This currently represents the user's primary attack at rank 10, not a claim
// that the private Zephira server's cooldown table has been recovered.
export function configuredSkillCooldown(rule, level, profile, mastery = 10000) {
  if (
    profile &&
    level >= profile.minimumLevel &&
    Number.isFinite(profile.cooldownSeconds) &&
    profile.cooldownSeconds >= 0
  )
    return profile.cooldownSeconds;
  return classicSkillCooldown(rule, level, mastery);
}
