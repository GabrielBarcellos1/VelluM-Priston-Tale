// Public client model playback: playSkill defaults to Yn=35 frames/second.
export function nativeSkillTiming(player, skill, motionName, visual = {}) {
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
  const seconds = frames / 35;
  const events = skeleton.motions.find((m) => m.clip === clipName)?.events ?? [];
  const baseHits = events.length ? events.map((f) => f / 35) : [seconds * 0.5];
  const duration = seconds * loops;
  const hits = Array.from({ length: loops }, (_, i) =>
    baseHits.map((h) => Math.min(duration, i * seconds + h)),
  ).flat();
  return { duration, hits, clip: clipName, fps: 35, code: skill.code };
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
