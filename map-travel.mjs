// Coordinates use the server/world Z convention; rendering negates Z.
export function adjacentFields(fields, current) {
  const from = fields.find(f => f.id === current);
  if (!from) return [];
  return fields.filter(f => f.id !== current && f.id !== 30 &&
    (from.neighbors?.includes(f.id) || f.neighbors?.includes(current)));
}
export function walkingStages(fields, current, canEnter = () => true) {
  const from = fields.find(f => f.id === current);
  return from ? [from, ...adjacentFields(fields, current).filter(canEnter)] : [];
}
// The Bamboo/Acacias boundary overlaps terrain collision zones. Move arrivals
// into the destination's interior rather than leaving them on an ambiguous seam.
export function forestSeamArrival(from, target, position) {
  if (!((from === 0 && target?.id === 1) || (from === 1 && target?.id === 0))) return null;
  const starts = (target.start ?? []).filter(p => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite));
  if (!starts.length) return null;
  const [x, z] = starts.reduce((a, b) => Math.hypot(b[0] - position.x, b[1] - position.z) < Math.hypot(a[0] - position.x, a[1] - position.z) ? b : a);
  return { x, z };
}
export function portalAt(portals, current, position) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
  return portals.find(p => !p.disabled && p.fromField === current &&
    Math.hypot(position.x - p.x, position.z - p.z) < p.radius &&
    (!(p.floorY ?? p.y) || (Number.isFinite(position.y) &&
      Math.abs(position.y - (p.floorY ?? p.y)) <= Math.max(96, p.height)))) ?? null;
}
export function createMapTravel({ fields, current: initial, portals = [], canEnter, alive,
  position, prepare, save, flush, activate, rollback, notice,
  ready = () => true, now = () => Date.now() }) {
  let current = initial, busy = false, readyAt = now() + 2000, blockedUntil = 0, walkingCooldownUntil = 0, forestArrival = null;
  const travel = async (id, portal = null) => {
    if (busy || id === current && !portal || (!portal && now() < walkingCooldownUntil)) return false;
    if (!portal && forestArrival && current === forestArrival.to && id === forestArrival.from) {
      const pos = position();
      if (pos && Math.hypot(pos.x-forestArrival.x,pos.z-forestArrival.z)<2200) return false;
      forestArrival = null;
    }
    const target = fields.find(f => f.id === id);
    if (!target || !alive()) return false;
    if (portal) {
      if (!portals.includes(portal) || portal.fromField !== current ||
          portal.to !== id || portalAt([portal], current, position()) !== portal) return false;
    } else if (!adjacentFields(fields, current).some(f => f.id === id)) return false;
    if (!canEnter(target)) {
      if (now() >= blockedUntil) { notice('Este destino exige um nível maior.'); blockedUntil = now() + 3000; }
      if (!portal) await rollback();
      return false;
    }
    busy = true;
    const previous = current;
    try {
      const until = now() + 10000;
      while (!ready()) {
        if (now() >= until) throw Error('Aguarde a operação do inventário terminar e tente novamente.');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const landing = portal ? { ...portal.arrival } : { ...position() };
      if (!Number.isFinite(landing.x) || !Number.isFinite(landing.z)) throw Error('Posição de passagem inválida.');
      const next = { field: id, position: landing, portal: !!portal };
      await prepare(next);
      if (!save()) throw Error('Não foi possível salvar o personagem.');
      await flush();
      await activate(next);
      current = id;
      if (!portal && ((previous===0&&id===1)||(previous===1&&id===0))) {
        const arrival=forestSeamArrival(previous,target,landing);
        forestArrival = arrival ? {from:previous,to:id,...arrival} : null;
      } else forestArrival=null;
      readyAt = now() + 1500;
      if (!portal) walkingCooldownUntil = now() + 2000;
      busy = false;
      return true;
    } catch (error) {
      current = previous;
      readyAt = now() + 3000;
      try { await rollback(); } finally { busy = false; }
      notice('Passagem cancelada: ' + error.message);
      return false;
    }
  };
  return {
    get current() { return current; },
    get busy() { return busy; },
    forestReturnBlocked: id => !!forestArrival && current===forestArrival.to && id===forestArrival.from && Math.hypot(position().x-forestArrival.x,position().z-forestArrival.z)<2200,
    walk: id => travel(id),
    tick() {
      if (busy || !alive() || !ready() || now() < readyAt || now() < blockedUntil) return;
      const gate = portalAt(portals, current, position());
      if (gate) return travel(gate.to, gate);
    },
  };
}
