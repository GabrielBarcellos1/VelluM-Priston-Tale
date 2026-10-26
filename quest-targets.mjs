// Quest data uses (0,0) as a map-only destination, not a world coordinate.
export function questTarget(objective, fields, stages, npcs) {
 const fieldId = objective.target?.field ?? objective.maps?.[0];
 const field = fields.find(f => f.id === fieldId);
 const npc = npcs.find(n => (objective.npcIds ?? []).includes(n.id) && n.map === fieldId);
 if (npc) return { ...objective.target, field: fieldId, x: npc.x, z: npc.z, npcId: npc.id };
 const target = objective.target;
 if (!field || !target || (Number.isFinite(target.x) && Number.isFinite(target.z) && (target.x !== 0 || target.z !== 0))) return target;
 const start = field.start?.[0];
 const zones = (stages[field.stage]?.zones ?? []).filter(z => z.n > 0 && Number.isFinite(z.x) && Number.isFinite(z.z));
 const zone = zones.slice().sort((a,b) => start ? Math.hypot(a.x-start[0], a.z-start[1])-Math.hypot(b.x-start[0], b.z-start[1]) : b.n-a.n)[0];
 const point = zone ? [zone.x,zone.z] : start;
 return point ? { ...target, field: fieldId, x: point[0], z: point[1] } : target;
}
