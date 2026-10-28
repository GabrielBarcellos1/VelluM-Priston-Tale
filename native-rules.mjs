import { measuredSkillAnimation } from './skill-measured-cooldowns.mjs';
// Public client model playback: playSkill defaults to Yn=35 frames/second.
export function nativeSkillTiming(player, skill, motionName, visual = {}, attackStep = 80) {
  const skeleton = player?.skeleton;
  const clipName =
    (motionName &&
      player.pickClip("skill", (m) =>
        m.skills?.some((s) => s.toLowerCase() === motionName.toLowerCase()),
      )) ||
    player?.pickClip("attack");
  const clip = skeleton?.clips[clipName];
  if (!clip) throw Error("Aguarde o modelo do personagem carregar.");
  const frames = Math.max(1, (clip.samples - 1) * clip.step);
  const loops = Math.max(1, visual.motionLoops ?? 1);
  const physicalAttack = ![7, 8, 10].includes(skill.job) &&
    ["melee", "shot", "beam", "sky", "aoe", "nova"].includes(skill.kind);
  const step = Number.isFinite(attackStep) ? Math.max(40, Math.min(400, attackStep)) : 80;
  // The native client consumes the emitted skillFx.dur as the actual motion
  // playback duration (player.playSkill(..., dur)). Calibrate both playback
  // and hit frames together; changing only the cooldown would leave the
  // visual animation out of sync with the classic reference.
  const measuredDuration = measuredSkillAnimation(skill.code, skill.level);
  const fps = measuredDuration !== null
    ? frames * loops / measuredDuration
    : physicalAttack ? step * 70 / 160 : 35;
  const seconds = frames / fps;
  const events = skeleton.motions.find((m) => m.clip === clipName)?.events ?? [];
  const baseHits = events.length ? events.map((f) => f / fps) : [seconds * 0.5];
  const duration = seconds * loops;
  const hits = Array.from({ length: loops }, (_, i) =>
    baseHits.map((h) => Math.min(duration, i * seconds + h)),
  ).flat();
  return { duration, hits, clip: clipName, fps, code: skill.code };
}

export function nativeShopPacket(wallet, definitions) {
  return {
    t: "itemShop",
    coin: wallet.coins,
    time: 0,
    event: 0,
    arena: 0,
    boss: 0,
    sections: [
      { id: "premium", label: "Premiums", icon: "premium" },
      { id: "costume", label: "Trajes", icon: "costume" },
      { id: "items", label: "Itens", icon: "other" },
    ],
    catalog: {
      coin: ["premium", "costume", "items"].map((category) => ({
        id: category,
        items: wallet.catalog
          .filter((p) => (p.category ?? "premium") === category)
          .map((p) => ({
            code: p.code,
            name: p.permanent || p.kind === "item" ? p.name : `${p.name} (${p.hours}h)`,
            price: p.price,
            image: definitions.get(p.code)?.image ?? p.icon,
            bound: true,
            tag: p.permanent ? "Permanente" : p.kind === "item" ? "Consumível" : `${p.hours}h`,
            desc: p.description ?? "",
            preview: { item: definitions.get(p.code) },
          })),
      })),
      time: [],
      event: [],
      arena: [],
      boss: [],
    },
  };
}

