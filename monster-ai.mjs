import { accuracyChance } from "./classic-combat.mjs";
import { worldFacingAngle } from "./character-facing.mjs";
import { monsterControl } from "./skill-runtime.mjs";
import { defenseMitigation } from "./balance-rules.mjs";
// Local simulation only. Distances, movement and balance are not private official rules.
export function stepMonster(m, ctx) {
  const { now, dt, player, ground, safe, disabled } = ctx;
  const attackNow = ctx.attackNow ?? now;
  if (m.hp <= 0 || m.owner) return null;
  const control=monsterControl(m,now);
  if(control.stunned) {
    if(m.motion==='stand')return null;
    m.motion='stand';m.seq++;
    return {update:{id:m.id,motion:'stand',seq:m.seq}};
  }
  m.home ??= { x: m.x, y: m.y, z: m.z };
  const distance = Math.hypot(player.x - m.x, player.z - m.z);
  const homeDistance = Math.hypot(player.x - m.home.x, player.z - m.home.z);
  const chasing =
    !safe && !disabled && homeDistance < 1100 && (distance < 400 || (m.aggroUntil ?? 0) > now);
  if (chasing) m.aggroUntil = now + 8000;
  // Keep the native strike alive during its windup, even if the player steps away.
  if (chasing && m.motion === "attack" && attackNow < (m.nextAttack ?? 0)) {
    const angle = worldFacingAngle(m, player, m.angle ?? 0);
    if (angle === m.angle) return null;
    m.angle = angle;
    return { update: { id: m.id, angle, seq: m.seq } };
  }
  const target = chasing ? player : m.home;
  const gap = Math.hypot(target.x - m.x, target.z - m.z);
  const range = 105;
  if (chasing && gap <= range) {
    const angle = worldFacingAngle(m, player, m.angle ?? 0);
    if (attackNow < (m.nextAttack ?? 0)) {
      if (angle === m.angle) return null;
      m.angle = angle;
      // Turning must not restart the attack animation or invalidate its pending hit.
      return { update: { id: m.id, angle, seq: m.seq } };
    }
    m.nextAttack = attackNow + (ctx.attackDuration ?? 1800);
    m.motion = "attack";
    m.angle = angle;
    m.seq++;
    return { attack: true, update: { id: m.id, motion: "attack", angle: m.angle, seq: m.seq } };
  }
  if (gap > (chasing ? range - 10 : 10)) {
    const step = Math.min(gap, Math.max(0, Math.min(dt, 0.4)) * 145 * (1-control.slowPercent/100));
    const x = m.x + ((target.x - m.x) / gap) * step;
    const z = m.z + ((target.z - m.z) / gap) * step;
    const p = ground(x, z);
    if (p && Math.hypot(p.x - m.x, p.z - m.z) <= step + 25) {
      const wasRunning = m.motion === "run";
      Object.assign(m, {
        x: p.x,
        y: p.y,
        z: p.z,
        angle: worldFacingAngle(m, { x, z }, m.angle ?? 0),
        motion: "run",
      });
      if (!wasRunning) m.seq++;
      return {
        update: { id: m.id, x: m.x, y: m.y, z: m.z, angle: m.angle, motion: m.motion, seq: m.seq },
      };
    }
  }
  if (m.motion !== "stand") {
    m.motion = "stand";
    m.seq++;
    return { update: { id: m.id, motion: "stand", seq: m.seq } };
  }
  return null;
}

export function incomingDamage(definition, stats, random = Math.random) {
  const [min, max] = definition.attack;
  const raw = min + Math.floor(random() * (max - min + 1));
  return Math.max(1, Math.floor(raw - (stats.absorb ?? 0)));
}

// Block, evasion and defense are independent hit avoidance, not flat damage.
export function incomingHit(definition, stats, table, random = Math.random, options = {}) {
  if (random() * 100 < (stats.evade ?? 0)) return { amount: 0, kind: "evade" };
  if (random() * 100 < (stats.block ?? 0)) return { amount: 0, kind: "block" };
  // Attack rating is absent from the public wiki; level*8 is an explicit local fallback.
  const rating = definition.attackRating ?? Math.max(20, (definition.level ?? 1) * 8);
  const chance = accuracyChance(
    { level: definition.level ?? 1, attackRating: rating },
    { level: stats.level ?? 1, defense: stats.defense ?? 0 },
    table,
  );
  if (random() * 100 >= chance) return { amount: 0, kind: "defense" };
  const absorb =
    (stats.absorb ?? 0) +
    (definition.undead ? Math.floor(((stats.absorb ?? 0) * (stats.undeadAbsorb ?? 0)) / 100) : 0);
  let amount = incomingDamage(definition, { ...stats, absorb }, random);
  // Only a defined elemental attack uses resistance; wiki does not identify all attacks.
  if (definition.element)
    amount = Math.max(
      1,
      Math.floor(
        amount * (1 - Math.max(0, Math.min(75, stats.resist?.[definition.element] ?? 0)) / 100),
      ),
    );
  const protection = Math.min(90, stats.damageReduction ?? 0);
  amount = Math.max(1, Math.floor(amount * (1 - protection / 100)));
  if(options.defenseCap)amount=Math.max(1,Math.floor(amount*(1-defenseMitigation(stats.defense??0,definition.level,options.defenseCap))));
  const heal = definition.undead ? Math.floor(amount * Math.max(0, Math.min(100, stats.undeadConversion ?? 0)) / 100) : 0;
  return { amount: amount - heal, heal, kind: "normal" };
}

// Explicit FREEston elemental profile, not recovered private attack definitions.
// Other monsters keep neutral hits until their attack type can be established.
export function withAttackProfile(definition) {
  const model = definition.model.toLowerCase();
  const element = ["icegoblin", "icegolem", "frost"].some((s) => model.includes(s))
    ? "ice"
    : model.includes("fireworm")
      ? "fire"
      : null;
  return element ? { ...definition, element, attackSource: "freeston-local-element" } : definition;
}

// Strike deadlines follow the same clock as the native player animations.
// Wall time still governs aggro and skill-control expiration.
export function createMonsterTimeline() {
  let previous = null;
  let pending = [];
  return {
    sample(seconds, paused = false) {
      const now = Number.isFinite(seconds) ? seconds * 1000 : previous ?? 0;
      const dt = previous === null || paused ? 0 : Math.max(0, Math.min(.4, (now - previous) / 1000));
      if (paused || (previous !== null && now < previous)) pending = [];
      previous = now;
      return { now, dt };
    },
    schedule(now, delay, hit) {
      pending.push({ at: now + Math.max(0, delay), hit });
    },
    drain(now) {
      const due = pending.filter(entry => entry.at <= now);
      pending = pending.filter(entry => entry.at > now);
      for (const entry of due) entry.hit();
    },
  };
}
