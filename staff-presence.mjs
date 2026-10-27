// Local policy decorations. Staff honors never rewrite the competitive BC owner.
export function mountStaffPresence({ game, bridge: B, fetchCommunity, deliver }) {
  let status = null,
    stopped = false,
    refreshing = false,
    frameId;
  const staffNames = new Set(),
    auras = new Map();
  const originalCastleRank = game.castleRank.bind(game);
  game.castleRank = (name) => {
    if (status && name.toLowerCase() === game.char.name.toLowerCase())
      return status.staff ? 1 : status.clan ? originalCastleRank(name) : 0;
    return staffNames.has(name.toLowerCase()) ? 1 : originalCastleRank(name);
  };
  const effects = new Map();
  let lastFrame = performance.now();
  function drop(name) {
    const aura = auras.get(name);
    if (!aura) return;
    game.scene.remove(aura);
    effects.get(name)?.dispose();
    effects.delete(name);
    auras.delete(name);
  }
  function makeAura(name, scope) {
    // Reuse the original client's textured additive ring, light column and particles.
    const effect = new B.Aura(scope==="staff"?0xb56aff:0xffd05c, scope==="staff"?37:25),
      root = effect.object;
    root.name = `FREEston aura ${scope}: ${name}`;
    root.userData.scope = scope;
    effect.show(true);
    game.scene.add(root);
    auras.set(name, root);
    effects.set(name, effect);
    return root;
  }
  async function refresh() {
    if (refreshing || stopped) return;
    refreshing = true;
    try {
      const previousStaff = [...staffNames];
      status = await fetchCommunity();
      staffNames.clear();
      for (const member of status.staffClan.members) staffNames.add(member.name.toLowerCase());
      deliver({ t: "clan", clan: status.clan });
      deliver({
        t: "clanTags",
        list: [
          ...status.clanTags,
          ...previousStaff
            .filter((name) => !staffNames.has(name))
            .map((name) => ({ name, clanId: 0 })),
        ],
      });
      deliver({ t: "topClass", tops: status.tops });
      if (status.castleWinner) deliver({ t: "castle", master: status.castleWinner });
      if (staffNames.size) game.crowns ??= new B.Crowns(game.scene);
    } finally {
      refreshing = false;
    }
  }
  function frame(time) {
    if (stopped) return;
    const dt = Math.min(0.1, (time - lastFrame) / 1000);
    lastFrame = time;
    const seen = new Set();
    if (status) {
      const topNames = new Set(status.tops.map((t) => t.name.toLowerCase()));
      const entities = [
        { name: game.char.name, char: game.player, alive: !game.dead },
        ...game.others.views.values(),
      ];
      for (const entity of entities) {
        const key = entity.name.toLowerCase(),
          staff = staffNames.has(key);
        const self = entity.char === game.player;
        const scope = self ? (staff ? "staff" : status.aura) : staff ? "staff" : topNames.has(key) ? "player" : null;
        if (!scope || !entity.char) continue;
        const aura = auras.get(key) ?? makeAura(key, scope);
        aura.userData.scope = scope;
        aura.position.copy(entity.char.object.position);
        aura.position.y += 1.5;
        const effect = effects.get(key);
        effect.show(entity.alive !== false && !entity.other?.dead && entity.char.object.visible);
        effect.update(time / 1000, dt, innerHeight);
        seen.add(key);
      }
    }
    for (const key of auras.keys()) if (!seen.has(key)) drop(key);
    frameId = requestAnimationFrame(frame);
  }
  frameId = requestAnimationFrame(frame);
  const timer = setInterval(() => refresh().catch(console.error), 20000);
  const ready = refresh();
  function dispose() {
    stopped = true;
    clearInterval(timer);
    cancelAnimationFrame(frameId);
    for (const name of auras.keys()) drop(name);
    game.castleRank = originalCastleRank;
  }
  addEventListener("pagehide", dispose, { once: true });
  return {
    ready,
    refresh,
    dispose,
    auras,
    get status() {
      return status;
    },
  };
}
