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

// Scheduled impacts run on the same fixed-step clock as native skill motion.
// Cooldown persistence continues to use wall time in the skill engines.
export function createSkillActionTimeline({ game, scope = () => null, paused = () => false, onCancel = () => {}, onError = error => { throw error; } }) {
  let owner = null, key = null, previous = null, pending = [], blocked = false, sequence = 0, generation = 0, initialized = false;
  function clear() { pending = []; generation++; onCancel(); }
  function capture() {
    const current = game(), nextKey = scope(), seconds = current?.time;
    if (!initialized) { owner = current; key = nextKey; initialized = true; }
    else if (current !== owner || nextKey !== key || previous !== null && seconds < previous) {
      clear(); owner = current; key = nextKey;
    }
    previous = Number.isFinite(seconds) ? seconds : null;
    return { owner: current, key: nextKey, seconds };
  }
  return {
    schedule(callback, milliseconds) {
      if (typeof callback !== 'function' || !Number.isFinite(milliseconds) || milliseconds < 0)
        throw Error('Impacto agendado inválido.');
      const state = capture();
      if (!state.owner || !Number.isFinite(state.seconds) || paused()) return false;
      pending.push({ callback, at: state.seconds + milliseconds / 1000, owner: state.owner, key: state.key, order: sequence++, generation });
      return true;
    },
    tick() {
      const state = capture(), unavailable = !state.owner || !Number.isFinite(state.seconds) || paused();
      if (unavailable) { if (!blocked || pending.length) clear(); blocked = true; return; }
      blocked = false;
      const due = pending.filter(entry => entry.at <= state.seconds).sort((a,b) => a.at-b.at || a.order-b.order);
      pending = pending.filter(entry => entry.at > state.seconds);
      for (const entry of due) {
        if (entry.generation !== generation || game() !== entry.owner || scope() !== entry.key || paused()) { clear(); break; }
        try { entry.callback(); } catch (error) { onError(error); }
      }
    },
    clear,
    get size() { return pending.length; },
  };
}
export function mountSkillActionTimeline(game, timeline) {
  const original = game.tick;
  const tick = function(...args) { const result = original.apply(this,args); timeline.tick(); return result; };
  game.tick = tick;
  return () => { timeline.clear(); if (game.tick === tick) game.tick = original; };
}
