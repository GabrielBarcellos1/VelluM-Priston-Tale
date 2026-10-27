import { effectFor, sumEffects, effectRows } from "./skill-effects.mjs";
import { configuredSkillCooldown } from "./skill-cooldowns.mjs";
import { createRuntimeSkillSystem } from "./skill-runtime.mjs";
import {
  skillAttackProfile,
  skillHitTimes,
  skillAreaProfile,
  selectSplashTargets,
  skillHealingRange,
  skillAttackRows,
} from "./skill-damage.mjs";
export function validateSkillCatalog(catalog) {
  const ids = new Set(),
    codes = new Set();
  for (const c of catalog.classes ?? []) {
    const entries = catalog.skills.filter((s) => s.job === c.job);
    if (entries.length !== 16 || new Set(entries.map((s) => `${s.tier}:${s.index}`)).size !== 16)
      throw Error(`Catálogo incompleto da classe ${c.name}.`);
  }
  for (const s of catalog.skills) {
    if (![1, 2, 3, 4].includes(s.tier) || ![0, 1, 2, 3].includes(s.index))
      throw Error(`Somente quatro habilidades por Tier, de 1 a 4: ${s.code}.`);
    if (ids.has(s.id) || codes.has(s.code) || s.publicVisual?.k !== s.kind)
      throw Error(`Habilidade inconsistente: ${s.code}.`);
    ids.add(s.id);
    codes.add(s.code);
  }
}
// Classic source tables where available; remaining effects are explicitly local.
export function createSkillSystem(ctx) {
  validateSkillCatalog(ctx.catalog);
  if (!ctx.catalog.classes.some((c) => c.job === ctx.job)) throw Error("Classe desconhecida.");
  if (ctx.catalog.rules.runtimeVersion === 1) return createRuntimeSkillSystem(ctx);
  const list = ctx.catalog.skills.filter((s) => s.job === ctx.job),
    levels = new Map(),
    ready = new Map(),
    cooldownTotals = new Map(),
    active = new Map();
  for (const s of list)
    levels.set(
      s.id,
      Math.max(0, Math.min(s.maxLevel, Math.floor(Number(ctx.saved?.[s.code]) || 0))),
    );
  const now = ctx.now ?? (() => performance.now() / 1000);
  const wallNow = ctx.wallNow ?? (() => Date.now() / 1000);
  for (const s of list) {
    const profile = ctx.catalog.rules?.freestonProfile?.[s.code];
    if (profile?.cooldownSeconds === 0 && levels.get(s.id) >= profile.minimumLevel) continue;
    const saved = ctx.savedCooldowns?.[s.code];
    if (
      !Number.isFinite(saved?.expiresAt) ||
      !Number.isFinite(saved?.total) ||
      saved.total <= 0 ||
      saved.total > 3600
    )
      continue;
    const left = Math.min(saved.total, saved.expiresAt - wallNow());
    if (left > 0) {
      ready.set(s.id, now() + left);
      cooldownTotals.set(s.id, saved.total);
    }
  }
  let actionReadyAt = 0, generation = 0;
  const rank = () => ctx.rank();
  const learned = (id) => levels.get(id) ?? 0;
  const points = () => ({
    skill: Math.max(
      0,
      Math.floor(Math.max(0, ctx.stats.level - 8) / 2) -
        list.filter((s) => s.tier < 4).reduce((sum, s) => sum + learned(s.id), 0),
    ),
    elite: Math.max(
      0,
      Math.floor(Math.max(0, ctx.stats.level - 58) / 2) -
        list.filter((s) => s.tier === 4).reduce((sum, s) => sum + learned(s.id), 0),
    ),
  });
  const ruleFor = (s) => ctx.catalog.rules?.skills?.[s.code];
  const at = (values, level) => values?.[Math.max(0, Math.min(9, level - 1))];
  function attackFor(s, level) {
    const spirit = [...active.values()].find(
      (b) => b.code === "SKILL_SPIRIT_ELEMENTAL" && b.until > now(),
    );
    const spiritPercent = spirit
      ? (at(ruleFor(spirit)?.tables?.Spirit_Elemental_Damage, spirit.level) ?? 0)
      : 0;
    return skillAttackProfile(
      s,
      ruleFor(s),
      level,
      ctx.stats,
      ctx.equipment?.() ?? {},
      spiritPercent,
    );
  }
  function view(s) {
    const rule = ruleFor(s);
    const level = learned(s.id),
      passive = s.kind === "passive",
      self = ["buff", "party", "heal", "summon"].includes(s.kind);
    const profile = ctx.catalog.rules?.freestonProfile?.[s.code];
    const classicCooldown = configuredSkillCooldown(rule, level, profile);
    const area = skillAreaProfile(s, rule, Math.max(1, level));
    const baseCooldown = passive
      ? 0
      : (classicCooldown ??
        (["buff", "party", "summon"].includes(s.kind) ? 8 : 1.5 + s.tier * 0.5));
    const result = {
      ...s,
      icon: s.classicIcon ?? `image/freeston/skill/${s.code}.svg`,
      iconProvenance: s.classicIcon
        ? (s.iconProvenance ?? "classic-priston-client")
        : "freeston-placeholder",
      level,
      passive,
      locked: false,
      reqLevel: (rule?.reqLevel ?? s.reqLevel) + level * 2,
      ruleSource: rule ? "classic-public-client" : "local-fallback",
      price: 100 * s.tier * (level + 1) ** 2,
      mp: passive
        ? 0
        : Math.ceil(
            (at(rule?.mp, level) ?? 6 + s.tier * 3 + level * 2) *
              (1 - (ctx.premiumValue?.("manaReduce") ?? 0) / 100),
          ),
      mpNext: passive
        ? 0
        : Math.ceil(
            (at(rule?.mp, level + 1) ?? 8 + s.tier * 3 + level * 2) *
              (1 - (ctx.premiumValue?.("manaReduce") ?? 0) / 100),
          ),
      stamina: passive
        ? 0
        : Math.ceil(
            (at(rule?.stamina, level) ?? s.tier * 2) *
              (1 - (ctx.premiumValue?.("staminaReduce") ?? 0) / 100),
          ),
      cooldown: baseCooldown,
      recharge: baseCooldown,
      cooldownSource: passive
        ? "passive"
        : classicCooldown === null
          ? "local-fallback"
          : profile && level >= profile.minimumLevel
            ? "freeston-primary-attack"
            : "classic-gauge",
      duration: ["buff", "party", "summon"].includes(s.kind)
        ? (at(rule?.duration, level) ?? 30 + level * 6)
        : 0,
      range: ["shot", "sky", "beam"].includes(s.kind)
        ? 500
        : s.kind === "aoe" || s.kind === "nova"
          ? area.radius || 250
          : 130,
      area,
      target: self ? "self" : ["aoe", "nova"].includes(s.kind) ? "area" : "enemy",
      slot: passive ? undefined : (rule?.slot ?? "both"),
      desc:
        s.descriptionPt ?? `${s.name} · ${passive ? "habilidade passiva" : "habilidade ativa"}.`,
      rows: [],
      mastery: level ? 10000 : 0,
    };
    if (!passive) {
      if ((ready.get(s.id) ?? 0) > now()) result.cooldown = cooldownTotals.get(s.id);
      else {
        try {
          const duration = ctx.timing?.(result)?.duration;
          if (Number.isFinite(duration) && duration > 0 && baseCooldown > 0)
            result.cooldown = Math.max(baseCooldown, duration);
        } catch {
          // Models are not available during initial character loading.
        }
      }
    }
    if (passive || ["buff", "party"].includes(s.kind)) {
      const rows = effectRows(effectFor(s, level, ctx.catalog.rules));
      const nextRows = effectRows(effectFor(s, Math.min(s.maxLevel, level + 1), ctx.catalog.rules));
      const nextByLabel = new Map(nextRows.map((row) => [row.label, row.cur]));
      const currentByLabel = new Map(rows.map((row) => [row.label, row.cur]));
      result.rows = [...new Set([...currentByLabel.keys(), ...nextByLabel.keys()])].map((label) => ({
        label,
        cur: currentByLabel.get(label) ?? "0",
        next: nextByLabel.get(label) ?? "0",
      }));
    }
    if (!passive && !self && s.kind !== "debuff") {
      const attack = attackFor(s, level),
        next = attackFor(s, Math.min(s.maxLevel, level + 1));
      result.damageSource = attack.source;
      result.rows = skillAttackRows(attack, next);
    }
    if (!passive) result.rows.push({ label: "Recarga", cur: `${result.cooldown.toFixed(2)} s` });
    return result;
  }
  function snapshot() {
    const p = points();
    return {
      t: "skills",
      job: ctx.job,
      className: ctx.catalog.classes.find((c) => c.job === ctx.job).name,
      skills: list.map(view),
      skillPoints: p.skill,
      elitePoints: p.elite,
      rank: rank(),
    };
  }
  function tickCooldowns() {
    for (const [id, until] of ready) {
      const seconds = Math.max(0, until - now());
      ctx.emit({ t: "skillCooldown", id, seconds, total: cooldownTotals.get(id) });
      if (seconds === 0) {
        ready.delete(id);
        cooldownTotals.delete(id);
      }
    }
  }
  function publish() {
    ctx.emit(snapshot());
    tickCooldowns();
  }
  function learn(id, npcId) {
    if (!ctx.isTrainer(npcId)) throw Error("Procure o mestre de habilidades da sua cidade.");
    const s = list.find((s) => s.id === id);
    if (!s) throw Error("Habilidade incompatível com a classe.");
    const v = view(s),
      p = points();
    if (v.level >= s.maxLevel) throw Error("Habilidade já está no nível máximo.");
    if (ctx.stats.level < v.reqLevel || s.tier > rank() + 1)
      throw Error(`Requer nível ${v.reqLevel}.`);
    const prev = list.find((x) => x.id === id - 1);
    if (v.level === 0 && prev && !learned(prev.id)) throw Error(`Aprenda ${prev.name} primeiro.`);
    if ((s.tier === 4 ? p.elite : p.skill) < 1)
      throw Error("Sem pontos de habilidade. Ganhe mais níveis.");
    if (ctx.stats.gold < v.price) throw Error(`Ouro insuficiente: precisa de ${v.price}.`);
    ctx.stats.gold -= v.price;
    levels.set(id, v.level + 1);
    publish();
    ctx.recalculate();
    ctx.save();
    return `${s.name} aprendida no nível ${v.level + 1}.`;
  }
  function expire() {
    let changed = false;
    for (const [id, b] of active)
      if (b.until <= now()) {
        active.delete(id);
        changed = true;
      }
    if (changed) {
      ctx.recalculate();
      ctx.buffsChanged();
    }
    return changed;
  }
  function bonuses() {
    const equipment = ctx.equipment?.() ?? null;
    return sumEffects([
      ...list
        .filter((s) => s.kind === "passive" && learned(s.id))
        .map((s) => effectFor(s, learned(s.id), ctx.catalog.rules, equipment)),
      ...[...active.values()]
        .filter((b) => b.until > now())
        .map((b) => effectFor(b, b.level, ctx.catalog.rules, equipment)),
    ]);
  }
  function buffs() {
    return [...active.values()]
      .filter((b) => b.until > now())
      .map((b) => ({
        code: "skill:" + b.code,
        name: b.name,
        rows: effectRows(effectFor(b, b.level, ctx.catalog.rules, ctx.equipment?.() ?? null)).map(
          (r) => ({ label: r.label, value: r.cur }),
        ),
        icon: b.icon,
        level: b.level,
        left: Math.ceil(b.until - now()),
        secondsLeft: Math.ceil(b.until - now()),
      }));
  }
  function cast(id, target) {
    const s = list.find((s) => s.id === id);
    if (!s || !learned(id) || s.kind === "passive")
      throw Error("Aprenda uma habilidade ativa antes de usá-la.");
    const game = ctx.game();
    if (game?.dead || ctx.stats.hp <= 0) throw Error("O personagem está morto.");
    if (game?.worldLocked || game?.air?.motion)
      throw Error("Aguarde o personagem ficar disponível.");
    if (ctx.isVillage?.() && !["buff", "party", "heal"].includes(s.kind))
      throw Error("Habilidades de combate só podem ser usadas fora da cidade.");
    const v = view(s);
    if (s.code === "SKILL_SWIFT_AXE" && !ctx.equipment?.()?.weapon?.code?.startsWith("WA1"))
      throw Error("Equipe um machado para usar Machado Veloz.");
    if ((ready.get(id) ?? 0) > now()) throw Error("Aguarde a recarga da habilidade.");
    if (actionReadyAt > now()) throw Error("Aguarde a animação do golpe terminar.");
    if (!ctx.freeCast?.() && (ctx.stats.mp < v.mp || ctx.stats.sp < v.stamina))
      throw Error("MP ou resistência insuficiente. Use uma poção.");
    let enemies = [];
    if (v.target === "enemy") {
      const m = ctx.monsters.get(target);
      if (!m || m.hp <= 0 || m.owner) throw Error("Selecione um monstro vivo.");
      if (Math.hypot(game.pos.x - m.x, game.pos.z + m.z) > v.range + 100)
        throw Error("Aproxime-se do alvo.");
      enemies = selectSplashTargets(v.area, m, ctx.monsters.values());
    } else if (v.target === "area")
      enemies = [...ctx.monsters.values()].filter(
        (m) => !m.owner && m.hp > 0 && Math.hypot(game.pos.x - m.x, game.pos.z + m.z) <= v.range,
      );
    if (s.code === "SKILL_RESURRECTION")
      throw Error(
        "Ressurreição precisa de outro jogador; o mundo compartilhado ainda está em reconstrução.",
      );
    const timing = ctx.timing?.(v) ?? { duration: 1, hits: [0.5] };
    const attack = !["buff", "party", "heal", "summon", "debuff"].includes(s.kind)
      ? attackFor(s, v.level)
      : null;
    const hitTimes = attack ? skillHitTimes(attack, timing) : timing.hits;
    if (!ctx.freeCast?.()) {
      ctx.stats.mp -= v.mp;
      ctx.stats.sp -= v.stamina;
    }
    const cooldown = v.recharge === 0 ? 0 : Math.max(v.recharge, timing.duration);
    actionReadyAt = now() + timing.duration;
    if (cooldown) {
      ready.set(id, now() + cooldown);
      cooldownTotals.set(id, cooldown);
    } else {
      ready.delete(id);
      cooldownTotals.delete(id);
      ctx.emit({ t: "skillCooldown", id, seconds: 0, total: 0 });
    }
    publish();
    ctx.emit({
      t: "skillFx",
      from: ctx.name,
      skill: id,
      code: s.code,
      level: v.level,
      x: game.pos.x,
      z: -game.pos.z,
      ...(target !== undefined ? { target } : {}),
      ...(enemies.length > 1 ? { targets: enemies.map((m) => m.id) } : {}),
      dur: timing.duration,
      hits: enemies.length ? hitTimes : [],
    });
    if (s.code === "SKILL_AGONY") {
      const percent = at(ruleFor(s)?.tables?.Agony_ConvLife, v.level) ?? 5;
      const cost = Math.floor((ctx.stats.hpMax * percent) / 100);
      if (ctx.stats.hp > cost) {
        ctx.stats.hp -= cost;
        ctx.stats.mp = Math.min(ctx.stats.mpMax, ctx.stats.mp + cost);
      }
    } else if (s.kind === "heal") {
      const range = skillHealingRange(s, ruleFor(s), v.level, ctx.stats, ctx.equipment?.() ?? {});
      const amount = range
        ? range[0] + Math.floor((ctx.random ?? Math.random)() * (range[1] - range[0] + 1))
        : 40 + v.level * 30;
      ctx.stats.hp = Math.min(ctx.stats.hpMax, ctx.stats.hp + amount);
      ctx.emit({ t: "stats", stats: ctx.stats });
    } else if (["buff", "party", "summon"].includes(s.kind)) {
      active.set(id, {
        ...v,
        until: now() + v.duration,
        ...(s.code === "SKILL_ENCHANT_WEAPON"
          ? {
              enchantElement: ["fire", "ice", "lightning"][
                Math.floor((ctx.random ?? Math.random)() * 3)
              ],
            }
          : {}),
      });
      if (s.kind === "summon") ctx.summon?.(v, v.duration);
      ctx.buffsChanged();
    } else if (s.kind === "debuff") {
      for (const m of enemies)
        m.nextAttack = Math.max(m.nextAttack ?? 0, performance.now() + 2000 + v.level * 200);
    } else {
      const castGeneration = generation;
      for (const hit of hitTimes)
        ctx.schedule?.(() => {
          if (ctx.game()?.dead || castGeneration !== generation) return;
          for (const m of enemies)
            if (m.hp > 0)
              ctx.damage(
                m.id,
                attack.power,
                v.range +
                  100 +
                  (v.area.radius || 0) +
                  (v.area.chainRange || 0) * Math.max(0, (v.area.targetLimit || 1) - 1),
                {
                  ...attack,
                  area: v.target === "area" || v.area.radius > 0 || v.area.chainRange > 0,
                },
              );
        }, hit * 1000);
    }
    ctx.recalculate();
    ctx.save();
    return v;
  }
  function maximize() {
    for (const s of list) levels.set(s.id, s.maxLevel);
    publish();
    ctx.recalculate();
  }
  for (const saved of ctx.savedBuffs ?? []) {
    const s = list.find((s) => s.code === saved.code);
    if (!s || !learned(s.id) || !["buff", "party", "summon"].includes(s.kind)) continue;
    const v = view(s),
      left = Math.min(v.duration, Number(saved.expiresAt) - wallNow());
    if (left > 0 && Number.isFinite(left))
      active.set(s.id, { ...v, enchantElement: saved.enchantElement, until: now() + left });
  }
  return {
    reset: () => {
      generation++;
      for (const s of list) {
        levels.set(s.id, 0);
        ctx.emit({ t: "skillCooldown", id: s.id, seconds: 0, total: 0 });
      }
      ready.clear();
      cooldownTotals.clear();
      active.clear();
      actionReadyAt = 0;
      ctx.recalculate();
      ctx.buffsChanged();
      publish();
      return points();
    },
    exportBuffs: () =>
      [...active.values()]
        .filter((b) => b.until > now())
        .map((b) => ({
          code: b.code,
          enchantElement: b.enchantElement,
          expiresAt: wallNow() + b.until - now(),
        })),
    cancel: (code) => {
      const skill = list.find((s) => "skill:" + s.code === code);
      if (!skill || !active.delete(skill.id)) return false;
      ctx.recalculate();
      ctx.buffsChanged();
      ctx.save();
      return true;
    },
    snapshot,
    publish,
    tickCooldowns,
    learn,
    cast,
    bonuses,
    buffs,
    expire,
    maximize,
    exportState: () =>
      Object.fromEntries(list.filter((s) => learned(s.id)).map((s) => [s.code, learned(s.id)])),
    exportCooldowns: () =>
      Object.fromEntries(
        list
          .filter((s) => (ready.get(s.id) ?? 0) > now())
          .map((s) => [
            s.code,
            { expiresAt: wallNow() + ready.get(s.id) - now(), total: cooldownTotals.get(s.id) },
          ]),
      ),
    points,
  };
}
