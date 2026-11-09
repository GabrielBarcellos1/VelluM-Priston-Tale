// Combat action lock: the last damage hit must resolve before a new cast.
// Cooldown 0 means no extra wait beyond the complete animation/hit sequence.
export function skillActionTiming(timing, hitTimes, recharge) {
  if (!Number.isFinite(recharge) || recharge < 0) throw Error("Tempo de recarga inválido.");
  const duration = Number(timing?.duration);
  if (!Number.isFinite(duration) || duration < 0) throw Error("Duração de animação inválida.");
  if (!Array.isArray(hitTimes) || hitTimes.some(t => !Number.isFinite(t) || t < 0))
    throw Error("Sequência de golpes inválida.");
  const lastHit = hitTimes.length ? Math.max(...hitTimes) : 0;
  const actionDuration = Math.max(duration, lastHit);
  const cooldown = recharge === 0 ? 0 : Math.max(recharge, actionDuration);
  return { actionDuration, cooldown, lastHit };
}

// Persisted cooldowns use wall time, but never exceed their own original total.
// This validates storage, without changing the configured skill cooldown.
export function restoreSkillCooldown(saved, wallNow) {
  if (!Number.isFinite(wallNow) || !Number.isFinite(saved?.expiresAt) ||
      !Number.isFinite(saved?.total) || saved.total <= 0 || saved.total > 3600) return null;
  const remaining = Math.min(saved.total, saved.expiresAt - wallNow);
  return remaining > 0 ? { remaining, total: saved.total } : null;
}
