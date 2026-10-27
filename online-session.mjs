// Shared authenticated map presence and chat; server does not simulate PvE yet.
export function mountOnlineSession({
  game,
  hero,
  stats,
  field,
  adminState,
  deliver,
  notice,
  generation,
  onSupport,
}) {
  const key = "freeston-online-client";
  let clientId = sessionStorage.getItem(key);
  if (!/^[a-f0-9]{32}$/.test(clientId ?? "")) {
    clientId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("");
    sessionStorage.setItem(key, clientId);
  }
  let inFlight, leaving, mapEpoch = 0;
  let stopped = false,
    cursor = 0,
    timer,
    last = null,
    sequence = 0,
    peers = new Map(),
    failures = 0;
  const status = { connected: false, count: 0, error: null };
  const badge = document.createElement("span");
  badge.className = "freeston-online-status";
  badge.textContent = "Conectando ao mundo…";
  document.querySelector(".local-controls")?.append(badge);
  async function post(path, data, keepalive = false) {
    const response = await fetch("/api/local/online/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, ...data }),
      keepalive,
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error ?? "Não foi possível conectar ao mundo.");
    return result;
  }
  async function poll() {
    if (stopped) return;
    try {
      const epoch = mapEpoch;
      const x = game.pos.x,
        z = -game.pos.z,
        moving = last && Math.hypot(x - last.x, z - last.z) > 1;
      const result = await (inFlight = post("heartbeat", {
        job: hero.jobCode,
        generation,
        field: field.id,
        x,
        y: game.pos.y,
        z,
        angle: Math.round(((Math.PI - (game.heading ?? 0)) * 4096) / (Math.PI * 2)) & 4095,
        moving: !!moving,
        running: !!moving,
        motion: game.dead ? "dead" : moving ? "run" : (game.player.motionState ?? "stand"),
        dead: game.dead,
        seq: ++sequence,
        hidden: adminState.hidden,
        cursor,
      }));
      last = { x, z };
      if (stopped || epoch !== mapEpoch) return;
      const next = new Map(result.players.map((p) => [p.name, p])),
        add = [],
        update = [],
        remove = [];
      for (const name of peers.keys()) if (!next.has(name)) remove.push(name);
      for (const [name, p] of next) {
        const old = peers.get(name);
        if (!old) add.push(p);
        else if (old.job !== p.job || old.body !== p.body) {
          remove.push(name);
          add.push(p);
        } else update.push(p);
      }
      if (remove.length) deliver({ t: "players", remove });
      deliver({ t: "players", add, update });
      peers = next;
      cursor = result.cursor;
      for (const chat of result.chats) deliver(chat);
      for (const event of result.support ?? []) onSupport?.(event);
      status.connected = true;
      status.count = result.online;
      status.error = null;
      failures = 0;
      badge.textContent = `Online · ${result.online} jogador${result.online === 1 ? "" : "es"}`;
    } catch (e) {
      failures++;
      status.connected = false;
      status.error = e.message;
      badge.textContent = "Mundo indisponível";
      if (failures === 1) notice(e.message);
    } finally {
      if (!stopped) timer = setTimeout(poll, failures ? Math.min(5000, failures * 1000) : 500);
    }
  }
  function dispose() {
    if (stopped) return leaving;
    stopped = true;
    clearTimeout(timer);
    leaving = Promise.resolve(inFlight)
      .catch(() => {})
      .then(() => post("leave", {}, true))
      .catch(() => {});
    badge.remove();
    return leaving;
  }
  addEventListener("pagehide", dispose, { once: true });
  const ready = poll();
  return {
    ready,
    status,
    peers:()=>[...peers.values()],
    changeMap() {
      mapEpoch++;
      last = null;
      if (peers.size) deliver({ t: "players", remove: [...peers.keys()] });
      peers.clear();
    },
    dispose,
    canResurrect: () => [...peers.values()].some(p=>p.dead&&Math.hypot(p.x-game.pos.x,p.z+game.pos.z)<=500),
    support: (code,target) => post('skill',{code,target,generation}),
    chat: async (text, channel = "normal", announcement = false) => post("chat", { text, channel, announcement }),
  };
}
