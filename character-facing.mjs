// Public client protocol: _pe / XYe decode yaw as PI - angle * 2PI / 4096.
// World packets use +z; Three.js scene positions invert z.
const TURN = 4096;
const TAU = Math.PI * 2;

export function worldFacingAngle(from, to, fallback = 0) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) < 1e-6) return fallback;
  return ((Math.round((Math.atan2(dx, dz) / TAU) * TURN) % TURN) + TURN) % TURN;
}

export function protocolHeading(angle) {
  return Math.PI - (angle * TAU) / TURN;
}

// Native NPCs use scene radians for faceYaw, never a protocol angle here.
// Nearby NPCs acknowledge the player while their base orientation remains intact.
export function faceNearbyNpcs(npcs, player, time, range = 180) {
  for (const npc of npcs) {
    const dx = player.x - npc.pos.x;
    const dz = player.z - npc.pos.z;
    if (!Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) > range) continue;
    if (Math.hypot(dx, dz) < 1e-6) continue;
    npc.faceYaw = Math.atan2(dx, dz);
    npc.faceUntil = Math.max(npc.faceUntil ?? 0, time + 1);
  }
}
