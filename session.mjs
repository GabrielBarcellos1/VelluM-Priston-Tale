import { questTarget } from "/quest-targets.mjs";
import { serviceDialog } from "/npc-panels.mjs";
import { walkingStages, createMapTravel, forestSeamArrival } from "/map-travel.mjs";
import {
  repairPrice,
  salePrice,
  saleError,
  questEligible,
  questExperience,
  objectiveMatches,
  allocateStat,
  undoStat,
  planAttributeReset,
} from "/gameplay-rules.mjs";
import { craftAtNpc, decorateCraftItem } from "/npc-crafting.mjs";
import { mountOnlineSession } from "/online-session.mjs";
import { worldFacingAngle, faceNearbyNpcs, mountStableCamera } from "/character-facing.mjs";
import {GM_SHELTOM,GM_POTION,gmProtection,gmClientLevel,gmProtectionEnabled,gmCombatEquipment,protectGm,applyGmAttack,gmTrainingActive} from "/gm-tools.mjs";
import { premiumRecovery } from "/premium-effects.mjs";
import { captureBaseRolls, restoreItemRolls } from "/item-save.mjs";
import { combatStats } from "/character-stats.mjs";
import { physicalHit, nativeMonsterTiming } from "/classic-combat.mjs";
import { canPlace, firstSpace, organizeBag, repairBags, swapWeaponSet } from "/inventory-grid.mjs";
import { syncShopInventory } from "/shop-inventory.mjs";
import { mountStaffPresence } from "/staff-presence.mjs";
import { nativeSkillTiming, nativeShopPacket } from "/native-rules.mjs";
import { specializationRule, effectiveSpecialization } from "/item-specialization.mjs";
import { equipmentError } from "/equipment-rules.mjs";
import { brandInterface } from "/brand-ui.mjs";
import { stepMonster, incomingHit, withAttackProfile, createMonsterTimeline } from "/monster-ai.mjs";
import { watchRelease } from "/release-client.mjs";
import { canonicalCommand, openCommandHelp } from "/command-help.mjs";
import { promotionRank, createWorldQuests, mergeNpcRecords } from "/world-quests.mjs";
import { agingEventChances, eventExperience } from "/economy-effects.mjs";
import { mountBossRoulette } from "/boss-roulette.mjs";
import { createGameFeatures } from "/game-features.mjs";
import { objectiveValue, objectiveIncrement, questCollectionCode } from "/quest-progress.mjs";
import { experienceFloor, migrateExperience, killExperience, mapExperienceRange, mapExperienceAllowed, capKillExperience, classDamageScale, balanceMonster, questExperienceReward, potionCanUse, registerPotion } from "/balance-rules.mjs";
import { monsterControl, applyConversionHealth, restoreConversionHealth, mountLocalSkillCasting } from "/skill-runtime.mjs";
import { createSkillSystem } from "/skill-system.mjs";

import { mountCustomSkins, openSapphirePreview } from "/custom-skins.mjs";
import { mountSkinShop } from "/skins-shop.mjs";
import { resolveName } from "/admin-names.mjs";
// Browser-local service adapter for the pinned public client. No production login.
const B = globalThis.__localGameBridge;
// Preserve the original server-list object while limiting it to this machine.
B.servers.splice(1);
Object.assign(B.servers[0], {
  id: "local",
  name: "FREEston Tale",
  region: "Mundo FREEston",
  url: "/ws",
  world: "local",
  status: [],
});
const get = async (path) => {
  const response = await fetch(path);
  if (response.status === 401) {
    location.replace("/");
    throw Error("Entre na conta local.");
  }
  if (!response.ok) throw Error(`HTTP ${response.status}: ${path}`);
  return response.json();
};
const account = await get("/api/local/me");
const loadedBuild = await get("/api/local/build");
const balanceRules = await get("/api/local/balance");
const potionReady = {};
const isAdmin = ["admin", "gm"].includes(account.role);
let wallet = await get("/api/local/wallet");
const premiumCodes = new Set(wallet.catalog.map((p) => p.code));
const pendingPremiums = new Set();
const pendingCommands = new Set();
const statHistory = [];
let shopBuying = false;
let economyUncertain = false;
let economyBusy = false,
  pendingLoot = 0,
  lootQueue = Promise.resolve();
let controlRules = await get("/api/local/game/rules");
const nativeAgingChance = B.agingChance;
B.agingChance = (age, stone, ...args) =>
  stone || !controlRules.aging[age]
    ? nativeAgingChance(age, stone, ...args)
    : agingEventChances(controlRules.aging[age],globalThis.__localEconomy?.().successBonus??0);
let walletClock = wallet.serverTime * 1000 - Date.now();
const serverNow = () => Date.now() + walletClock;
const premiumValue = (kind) => gameplayTestMode ? 0 :
  (["manaReduce","staminaReduce"].includes(kind) && gmSheltomActive()) ? 100 : Math.max(
    0,
    ...wallet.active
      .filter((p) => p.kind === kind && p.expiresAt * 1000 > serverNow())
      .map((p) => p.value),
    ...endgamePremiums()
      .filter((p) => p.kind === kind)
      .map((p) => p.value),
  );
const requestId = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
async function postLocal(path, data) {
  if (path.startsWith("/api/local/game/"))
    data = { ...data, job: characterClass.job, generation: characterGeneration };
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = Error(result.error ?? "Falha ao consultar o servidor.");
    error.status = response.status;
    throw error;
  }
  return result;
}
function applyWallet(value) {
  if (value.username !== account.username) {
    location.replace("/");
    throw Error("A conta mudou. Reabra a sessão.");
  }
  wallet = value;
  walletClock = wallet.serverTime * 1000 - Date.now();
  syncShopCatalog();
  syncPremiumInventory();
  recalculate();
  skills.publish();
  publishBuffs();
  deliver(nativeShopPacket(wallet, definitions));
}
async function refreshWallet() {
  applyWallet(await get("/api/local/wallet"));
}
async function showShop() {
  game?.keys.clear();
  await refreshWallet();
  game.events.emit("npcOpen", { npcId: 0, name: "Item Shop", windowKind: "itemshop", data: {} });
}
const [fieldData, wikiData, itemData, questData, spawnData, dropRules, skillData,npcStageData,mapLinks] =
  await Promise.all([
    get("/api/map-fields"),
    get("/api/wiki"),
    get("/assets/items.json"),
    get("/api/wiki/quests"),
    get("/api/map-spawns"),
    get("/api/local/drops"),
    get("/api/local/skills"),
    get("/api/map-npcs"),
    get("/api/map-links"),
  ]);
const wiki = { ...wikiData.wiki, monsters: wikiData.wiki.monsters.map(withAttackProfile) };
const definitions = new Map(itemData.map((item) => [item.code, item]));
const shopProducts = new Map();
function syncShopCatalog() {
  shopProducts.clear();
  premiumCodes.clear();
  for (const product of [...wallet.catalog, ...(wallet.ownedCatalog ?? [])]) {
    shopProducts.set(product.code, product);
    premiumCodes.add(product.code);
    if (product.kind === "item") continue;
    const group = B.premiumCatalog.find((p) => p.codes.includes(product.code));
    const base = product.definition ?? group?.codes.map((c) => definitions.get(c)).find(Boolean);
    if (!base) continue;
    definitions.set(product.code, {
      ...structuredClone(base),
      code: product.code,
      name: product.permanent ? product.name : `${product.name} (${product.hours}h)`,
      price: 0,
      bound: true,
    });
  }
}
syncShopCatalog();
function applySpecialization(item, job) {
  if (!job) {
    delete item.spec;
    delete item.specBonus;
    return item;
  }
  const entry = specializationRule(item.code, wiki.specs ?? {});
  if (!entry) {
    item.spec = job;
    return item;
  }
  const error = B.specialize(item, job, entry.rule, definitions.get(item.code));
  if (error) {
    delete item.spec;
    delete item.specBonus;
    return item;
  }
  item.specRuleSource = entry.source;
  return item;
}

const params = new URLSearchParams(location.search);
const characterClass =
  B.classes.find((c) => c.job === Number(params.get("classe"))) ??
  B.classes.find((c) => c.job === (account.preferredClass ?? 1));
const characterRecord = await get(`/api/local/state?classe=${characterClass.job}`);
const characterGeneration = characterRecord.generation;
if (!characterRecord.state || !characterGeneration) {
  location.replace("/personagens");
  throw Error("Escolha ou crie seu personagem.");
}
const saveKey = `pweb-local-${account.username}-character-v4-${characterClass.job}-${characterGeneration}`;
let stored = characterRecord.state;
try {
  const cached = JSON.parse(localStorage.getItem(saveKey) ?? "null");
  if (cached && (!stored || (Number(cached.savedAt) || 0) > (Number(stored.savedAt) || 0)))
    stored = cached;
} catch {
  /* The server save remains available when browser storage is unavailable. */
}
const gameplayTestMode = isAdmin && stored?.gmGameplayTest === true;
let lastSavedAt = Math.max(0, Number(stored?.savedAt) || 0);
const claimedKitLevels = new Set(stored?.progressionRewards ?? []);
let nextKitAttempt = 0;
let activeForce = stored?.force && Number.isFinite(stored.force.expiresAt) ? stored.force : null;
const requestedMap = Number(
  params.get("mapa") ?? stored?.field ?? (characterClass.tribe === "morion" ? 21 : 3),
);
const field = { ...(fieldData.fields.find((f) => f.id === requestedMap) ?? fieldData.fields.find((f) => f.id === 3)) };
const spawn = field.start?.[0] ?? [0, 0];
const number = (value, fallback, min = 0, max = 1e9) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
let nextUid = 100;
function instance(code, count = 1, managed = false) {
  const definition = definitions.get(code);
  if (!definition) return null;
  const item = { ...structuredClone(definition), ...B.item(definition, ++nextUid), count };
  if (managed || (premiumCodes.has(code) && shopProducts.get(code)?.kind !== "item")) {
    item.premiumManaged = true;
    item.bound = true;
    if (shopProducts.get(code)?.kind === "item") item.name = shopProducts.get(code).name;
  }
  return captureBaseRolls(item);
}
const starterWeapon = {
  1: "WA101",
  2: "WH101",
  3: "WS101",
  4: "WP101",
  5: "WT101",
  6: "WS201",
  7: "WM101",
  8: "WM101",
  9: "WD101",
  10: "WN101",
  11: "WV101",
}[characterClass.job];
const stats = {
  name:
    account.displayName ??
    (typeof stored?.name === "string" ? stored.name.slice(0, 18) : account.username),
  job: characterClass.job,
  level: number(stored?.stats?.level, 1, 1, 150),
  hp: number(stored?.stats?.hp, 120),
  hpMax: 120,
  mp: number(stored?.stats?.mp, 80),
  mpMax: 80,
  sp: number(stored?.stats?.sp, 180),
  spMax: 180,
  exp: number(stored?.stats?.exp, 0, 0, Number.MAX_SAFE_INTEGER),
  progressionVersion: stored?.stats?.progressionVersion,
  expLevel: 0,
  expNext: 100,
  gold: number(stored?.stats?.gold, 1000),
  str: number(stored?.stats?.str, 25, 1, 999),
  spi: number(stored?.stats?.spi, 15, 1, 999),
  tal: number(stored?.stats?.tal, 20, 1, 999),
  dex: number(stored?.stats?.dex, 19, 1, 999),
  health: number(stored?.stats?.health, 24, 1, 999),
  damageMin: 5,
  damageMax: 10,
  attackRating: 50,
  attackStep: 80,
  defense: 5,
  absorb: 0,
  critical: 1,
  block: 0,
  evade: 0,
  weight: 0,
  weightMax: 1000,
  statPoints: number(stored?.stats?.statPoints, 0),
  speed: 1,
  resist: { bio: 0, poison: 0, fire: 0, lightning: 0, ice: 0 },
  shootingRange: definitions.get(starterWeapon)?.range ?? 0,
};
migrateExperience(stats, balanceRules);
stats.classRank=promotionRank(stored?.completed,characterClass.job);
const fieldMinimum=balanceRules.maps?.find(m=>m.id===field.id)?.minimum??1;
if((!isAdmin||gameplayTestMode)&&stats.level<fieldMinimum&&!((field.id===30&&stored?.questMeta?.trial?.expires>serverNow()/1000)||(field.id===32&&stored?.questMeta?.duel?.expires>serverNow()/1000))){location.replace(`?classe=${characterClass.job}&mapa=${characterClass.tribe==='morion'?21:3}`);throw Error(`Este mapa requer nível ${fieldMinimum}.`);}
const inv = {
  costumeOn:
    typeof stored?.inv?.costumeOn === "boolean"
      ? stored.inv.costumeOn
      : !!stored?.inv?.equip?.costume,
  costumeAlways: stored?.inv?.costumeAlways === true,
  equipB: {},
  set: stored?.inv?.set === "B" ? "B" : "A",
  bagPage: stored?.inv?.bagPage === 1 ? 1 : 0,
  equip: { weapon: instance(starterWeapon) },
  bag: [],
  bagB: [],
  quest: [],
  belt: [instance("PL101", 20), instance("PM101", 20), instance("PS101", 20)],
};
function restoreItem(item, options = {}) {
  if (!item || !definitions.has(item.code) || (item.expiresAt&&item.expiresAt<=serverNow()/1000)) return null;
  const result = instance(item.code, number(item.count, 1, 1, 9999), item.premiumManaged === true);
  if (item.endgame === true && isAdmin) {
    const upgraded = endgameItem(item.code, number(item.uid, result.uid, 1));
    if (upgraded) {
      B.age(upgraded, number(item.aging, 0, 0, B.maxAging) - (upgraded.aging ?? 0));
      if (item.mixed && B.mixById(item.mixRecipeId))
        B.applyMix(upgraded, B.mixById(item.mixRecipeId));
      return restoreItemRolls(upgraded, item, options);
    }
  }
  if (item.perfect === true) {
    const perfect = Object.assign(
      perfectItem(
        item.code,
        number(item.uid, result.uid, 1),
        number(item.aging, 0, 0, B.maxAging),
        item.spec === undefined ? 0 : number(item.spec, 0, 0, 11),
      ),
      item.premiumManaged ? { premiumManaged: true, bound: true } : {},
    );
    if (item.mixed && B.mixById(item.mixRecipeId)) B.applyMix(perfect, B.mixById(item.mixRecipeId));
    return restoreItemRolls(perfect, item, options);
  }
  if (item.spec !== undefined)
    applySpecialization(result, number(item.spec, characterClass.job, 1, 11));
  const aging = number(item.aging, 0, 0, B.maxAging);
  if (aging) B.age(result, aging);
  if (item.mixed && B.mixById(item.mixRecipeId)) B.applyMix(result, B.mixById(item.mixRecipeId));
  result.uid = number(item.uid, result.uid, 1);
  nextUid = Math.max(nextUid, result.uid);
  restoreItemRolls(result,item,options);
  if(item.questWeapon){result.questWeapon=structuredClone(item.questWeapon);result.req={level:40};result.noGold=true;result.bound=true;result.name=item.name;}
  if(item.expiresAt){result.expiresAt=item.expiresAt;result.noGold=true;result.bound=true;}
  return result;
}
if (stored?.inv && typeof stored.inv.equip === "object" && Array.isArray(stored.inv.bag)) {
  inv.equip = Object.fromEntries(
    Object.entries(stored.inv.equip)
      .map(([slot, item]) => [slot, restoreItem(item)])
      .filter(([, item]) => item),
  );
  for (const key of ["bag", "bagB"])
    inv[key] = (stored.inv[key] ?? [])
      .map((p) => ({ item: restoreItem(p.item), x: p.x, y: p.y }))
      .filter((p) => p.item);
  inv.equipB = Object.fromEntries(
    ["weapon", "shield"]
      .map((slot) => [slot, restoreItem(stored.inv.equipB?.[slot])])
      .filter(([, item]) => item),
  );
  repairBags(inv);
  inv.belt = Array.isArray(stored.inv.belt)
    ? stored.inv.belt.slice(0, 3).map(restoreItem)
    : inv.belt;
}
let endgameEnabled = isAdmin && stored?.endgame === true;
function endgameItem(code, uid) {
  const item = perfectItem(code, uid);
  if (item) item.endgame = true;
  return item;
}
function perfectItem(code, uid, aging = B.maxAging, job = characterClass.job) {
  const def = definitions.get(code);
  if (!def) return null;
  const item = B.item(def, uid ?? ++nextUid);
  nextUid = Math.max(nextUid, item.uid);
  item.perfect = true;
  for (const key of ["defense", "absorb", "attackRating", "block"])
    if (Array.isArray(def[key])) item[key] = Math.max(...def[key]);
  if (def.damage?.length >= 4) item.damage = [def.damage[1], def.damage[3]];
  const extra = B.extra(code);
  for (const key of ["hpAdd", "mpAdd", "spAdd", "hpRegen", "mpRegen", "spRegen"])
    if (Array.isArray(extra?.[key])) item[key] = Math.max(...extra[key]);
  applySpecialization(item, job);
  captureBaseRolls(item);
  if (
    [
      "WA1",
      "WC1",
      "WH1",
      "WM1",
      "WD1",
      "WN1",
      "WP1",
      "WS1",
      "WS2",
      "WT1",
      "WV1",
      "DS1",
      "DA1",
      "DA2",
      "OM1",
      "DG1",
      "DB1",
      "OA2",
    ].includes(code.slice(0, 3))
  )
    B.age(item, aging);
  return item;
}
function endgamePremiums() {
  if (!endgameEnabled) return [];
  const strongest = new Map();
  const supported = new Set([
    "expUp",
    "thirdEyes",
    "vampiricEx",
    "manaRecharge",
    "manaReduce",
    "staminaReduce",
    "mightOfAwell",
  ]);
  for (const p of wallet.catalog.filter((p) => supported.has(p.kind))) {
    const old = strongest.get(p.kind);
    if (!old || (p.value ?? p.type ?? 0) >= (old.value ?? old.type ?? 0)) strongest.set(p.kind, p);
  }
  return [...strongest.values()];
}
function endgameBuffs() {
  return endgamePremiums().map((p) => ({
    code:
      "premium:" +
      (B.premiumIcons[p.kind]?.[(p.type ?? 1) - 1] ?? B.premiumIcons[p.kind]?.[0] ?? p.kind),
    name: p.name,
    left: 86400 * 365,
    secondsLeft: 86400 * 365,
    level: 1,
    value: p.value,
    type: p.type,
  }));
}
function equipEndgame() {
  const best = (slot, prefix) =>
    [...definitions.values()]
      .filter((d) => d.slot === slot && (!prefix || d.code.startsWith(prefix)) && d.req?.level > 0)
      .sort(
        (a, b) =>
          b.req.level - a.req.level ||
          (b.damage?.[3] ?? b.defense?.[1] ?? b.price ?? 0) -
            (a.damage?.[3] ?? a.defense?.[1] ?? a.price ?? 0),
      )[0];
  const weaponPrefix = starterWeapon.slice(0, 3);
  const weapon = [...definitions.values()]
    .filter((d) => d.code.startsWith(weaponPrefix) && d.damage && d.req?.level > 0)
    .sort((a, b) => b.req.level - a.req.level || b.damage[3] - a.damage[3])[0];
  if (!weapon) throw Error("Nenhuma arma compatível disponível no catálogo.");
  const selected = {
    weapon,
    armor: best("ARMOR", [7, 8, 10].includes(characterClass.job) ? "DA2" : "DA1"),
    boots: best("BOOTS"),
    gloves: best("GLOVES"),
    bracelets: best("ARMLET"),
    amulet: best("AMULET"),
    ring1: definitions.get("OR205"),
    ring2: definitions.get("OR205"),
    sheltom: best("SHELTOM"),
  };
  if (weapon.slot === "WEAPON_ONE") selected.shield = best("SHIELDS");
  const equipment = Object.fromEntries(
    Object.entries(selected)
      .filter(([, def]) => def)
      .map(([slot, def]) => [slot, endgameItem(def.code)]),
  );
  // Retain previous loadout as a recoverable per-class backup before replacement.
  localStorage.setItem(
    saveKey + "-before-equipar",
    JSON.stringify({ inv, stats, endgame: endgameEnabled }),
  );
  for (const slot of [
    "weapon",
    "armor",
    "shield",
    "boots",
    "gloves",
    "bracelets",
    "amulet",
    "ring1",
    "ring2",
    "sheltom",
  ])
    delete inv.equip[slot];
  Object.assign(inv.equip, equipment);
  stats.level = 150;
  hero.level = 150;
  stats.exp = experienceFloor(150,balanceRules);
  for (const key of ["str", "spi", "tal", "dex", "health"]) stats[key] = 999;
  endgameEnabled = true;
  skills.maximize();
  recalculate();
  stats.hp = stats.hpMax;
  stats.mp = stats.mpMax;
  stats.sp = stats.spMax;
  publishBuffs();
  return (
    `Endgame local equipado para ${characterClass.name}; nível 150, itens perfeitos e aging +${B.maxAging} nas peças compatíveis. Premiums ativos: ${endgameBuffs()
      .map((b) => b.name)
      .join(", ")}.\n` +
    Object.entries(selected)
      .filter(([, d]) => d)
      .map(([slot, d]) => `${slot}: ${d.name} (${d.code})`)
      .join("\n")
  );
}
const conn = new B.Session("ws://127.0.0.1/local", "Sessão local");
conn.creds = { id: account.username };
conn.charName = stats.name;
conn.worldId = "local";
conn.worldName = "FREEston Tale";
conn.onboardDone = true;
conn.ws = { readyState: 1, send() {}, close() {} };
conn.raw = () => {};
// The original visibility watchdog expects a remote PONG. A local session
// acknowledges locally instead of nulling ws and entering remote reconnect.
conn.checkAlive = () => {
  conn.lastRecvAt = performance.now();
};
conn.lastRecvAt = performance.now();
conn.connect = async () => {};
const hero = {
  name: stats.name,
  modelName: characterClass.body,
  modelName2: characterClass.faces[0],
  jobCode: characterClass.job,
  level: stats.level,
  rank: stats.classRank,
  brood: characterClass.tribe === "morion" ? 1 : 0,
  startField: field.id,
  posX: spawn[0],
  posZ: spawn[1],
};
const previousPosition = stored?.field === field.id && stored?.position;
const enter = {
  fieldId: field.id,
  x: number(previousPosition?.x, spawn[0], -200000, 200000),
  z: number(previousPosition?.z, spawn[1], -200000, 200000),
  y: null,
  angle: 0,
  stage: field.stage,
  bgm: field.village ? "town2" : "forest",
  name: field.name,
  sky: "day",
};
const npcs = mergeNpcRecords(field,wiki.npcs,npcStageData.stages[field.stage])
  .map((n) => ({ ...n, y: null, angle: worldFacingAngle(n, enter) }));
conn.world = Promise.resolve({ enter, npcs });
let game = null, mapTravel = null, pendingMapTravel = null, mapBackup = null;
let nextPopulationId = 10000000;
let pendingState = null,
  stateWrite = null;
let kills = number(stored?.kills, 0);
const completed = new Set(Array.isArray(stored?.completed) ? stored.completed : []);
const accepted = new Set(Array.isArray(stored?.accepted) ? stored.accepted : []);
const objectiveProgress =
  stored?.objectiveProgress && typeof stored.objectiveProgress === "object"
    ? stored.objectiveProgress
    : {};

const questMeta=stored?.questMeta&&typeof stored.questMeta==='object'?stored.questMeta:{};
let worldQuests,gameFeatures,bossRoulette;
let economyEffects={xp:1,discount:0,successBonus:0,events:[]};
async function refreshEconomy(){const mapId=field.id;const result=await postLocal("/api/local/game/economy",{field:mapId});if(field.id!==mapId)return result;const changed=JSON.stringify(economyEffects)!==JSON.stringify(result.effects);economyEffects=result.effects;globalThis.__localEconomy=()=>economyEffects;if(changed&&game){recalculate();deliver({t:'inventory',inv});if(economyEffects.events.length)notice('Eventos ativos: '+economyEffects.events.map(e=>e.name).join(', '));}return result;}
// Administration belongs to this independent local session only.
const adminState = {
  god: false,
  frozen: false,
  hidden: false,
  fly: false,
  altitude: 200,
  speed: isAdmin ? 4 : 1,
};
const diagnostics = [];
try {
  const previous = JSON.parse(localStorage.getItem("pweb-local-diagnostics") ?? "[]");
  if (Array.isArray(previous))
    diagnostics.push(
      ...previous
        .filter((e) => e && typeof e.at === "string" && typeof e.message === "string")
        .slice(-20),
    );
} catch {
  /* Start a fresh log if saved diagnostics are invalid. */
}
let nextAdminMonsterId = 20000;
function recordDiagnostic(message) {
  fetch("/api/local/game/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: String(message).slice(0, 500) }),
  }).catch(() => {});
  diagnostics.push({ at: new Date().toISOString(), message: String(message).slice(0, 500) });
  if (diagnostics.length > 30) diagnostics.shift();
  try {
    localStorage.setItem("pweb-local-diagnostics", JSON.stringify(diagnostics));
  } catch {
    /* Browser storage can be disabled. */
  }
}
addEventListener("error", (e) => recordDiagnostic(e.message || "Falha ao carregar recurso."));
addEventListener("unhandledrejection", (e) => recordDiagnostic(e.reason?.message ?? e.reason));
function syncGm() {
  deliver({
    t: "gm",
    level: gmClientLevel(account.role,gameplayTestMode),
    speed: adminState.speed,
    god: adminState.god,
    hidden: adminState.hidden,
    noDelay: false,
  });
  if (game?.player) game.player.object.visible = !adminState.hidden;
}
function spawnAdminMonster(def, count = 1, options = {}) {
  if (monsters.size + count > 1000)
    throw Error("Limite de 1000 monstros. Use /limpar para liberar espaço.");
  const add = [];
  for (let i = 0; i < count; i++) {
    const p = game.ground.spawnPoint(game.pos.x + 80 + i * 30, game.pos.z + 80);
    if (!p) continue;
    const id = ++nextAdminMonsterId;
    const m = {
      id,
      name: def.name,
      level: def.level,
      model: def.model
        .replace(/\\/g, "/")
        .replace(/\.[^/.]+$/, "")
        .toLowerCase(),
      x: p.x,
      y: p.y,
      z: -p.z,
      angle: 0,
      hp: def.hp,
      hpMax: def.hp,
      motion: "stand",
      seq: 0,
      body: 20,
      definition: def,
      nextAttack: 0,
      adminSpawn: true,
      ...(options.ally ? { gmAlly: true, featureSpawn: true } : {}),
      ...(options.levelUp ? { gmLevelUp: true } : {}),
    };
    monsters.set(id, m);
    add.push(publicMonster(m));
  }
  if (!add.length)
    throw Error("Não há terreno válido perto do personagem. Mova-se e tente novamente.");
  deliver({ t: "monsters", add, ts: performance.now() / 1000 });
  return `${add.length} × ${def.name} criado(s) perto de você (HP ${def.hp}).`;
}
function teleportHere(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 200000 || Math.abs(z) > 200000)
    throw Error("Coordenadas inválidas. Use /pos para consultar X Z.");
  const p = game.ground.spawnPoint(x, -z);
  if (!p) throw Error("Sem terreno válido nesse ponto; teleporte cancelado.");
  game.snapTo(p.x, -p.z, p.y);
  game.keys.clear();
  game.air = null;
  return `Teletransportado: X ${Math.round(p.x)}, Z ${Math.round(-p.z)}.`;
}
function mountGmMovement() {
  const move = game.move.bind(game),
    fall = game.fallTick.bind(game);
  game.move = () => {
    if (!adminState.fly) return move();
    const target = game.target;
    if (target) {
      const dx = target.x - game.pos.x,
        dz = target.z - game.pos.z,
        d = Math.hypot(dx, dz),
        step = Math.min(d, 8 * adminState.speed);
      if (d > 1) {
        game.pos.x += (dx / d) * step;
        game.pos.z += (dz / d) * step;
        game.player.object.rotation.y = Math.atan2(dx, dz);
      } else game.target = null;
    }
    const floor = game.ground.heightAt(game.pos.x, game.pos.z, null);
    if (Number.isFinite(floor)) game.pos.y = floor + adminState.altitude;
    game.air = null;
    game.player.object.position.copy(game.pos);
  };
  game.fallTick = (...args) => (adminState.fly ? game.move() : fall(...args));
  document.querySelector("#gl").addEventListener("webglcontextlost", () => {
    save();
    recordDiagnostic("WebGL perdido; progresso salvo. Recarregue a página para recuperar.");
  });
}

let gmTraining=null;
function gmSheltomActive(){return gmProtectionEnabled(isAdmin,inv.equip,gameplayTestMode);}
function gmExpActive(){return gmTrainingActive(isAdmin,gmTraining,stats.level,serverNow()/1000);}
async function gmOperation(action,extra={}){
 if(!isAdmin)throw Error('Exclusivo de GM.');
 if(action==='status'){const r=await postLocal('/api/local/game/gm',{action});gmTraining=r.training;return r;}
 if(economyBusy||pendingLoot)throw Error('Aguarde os drops e a operação atual.');
 economyBusy=true;
 try{
  if(!save(true))throw Error('Falha ao salvar o inventário.');await stateWrite;
  const r=await postLocal('/api/local/game/gm',{action,...extra,savedAt:lastSavedAt,requestId:requestId()});
  for(const key of ['bag','bagB'])inv[key]=(r.state.inv[key]??[]).map(p=>({...p,item:restoreItem(p.item)})).filter(p=>p.item);
  inv.equip=Object.fromEntries(Object.entries(r.state.inv.equip??{}).map(([key,item])=>[key,restoreItem(item)]));
  skills.publish();
  lastSavedAt=r.state.savedAt;gmTraining=r.training;recalculate();save(true);notice(r.message);return r;
 }finally{economyBusy=false;}
}
async function gmRoute(){
 const r=await gmOperation('status'),t=r.training;
 const lines=[`EXP GM: ${gmExpActive()?'ATIVO':'inativo'} · nível ${stats.level} · Sheltom ${gmSheltomActive()?'equipada':'não equipada'}.`,
  `Rota atual: ${t.route.maps.map(m=>m.name+' (mapa '+m.id+')').join(' / ')} · XP ${t.route.multiplier.toFixed(1)}×.`,
  `Monstros indicados: ${t.route.monsters.map(id=>wiki.monsters.find(m=>m.id===id)?.name??id).join(', ')}. O bônus só vale para esses alvos nos mapas da rota.`,
  'Meta: 1–120 em cerca de 60 min de caça. Níveis 1–10: 4,5 min; cada faixa seguinte de 10 níveis: cerca de 5 min.',t.assumptions,
  ...t.routes.map(row=>`Nível ${row.level}: ${row.maps.map(m=>m.name).join(' / ')}`)];
 const old=document.getElementById('gm-route');if(old)old.remove();
 const panel=document.createElement('dialog');panel.id='gm-route';panel.style.cssText='max-width:750px;max-height:80vh;overflow:auto;background:#141b24;color:#eee;border:1px solid #bd994b;padding:24px;';
 const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>panel.remove();panel.append(close);
 for(const line of lines){const p=document.createElement('p');p.textContent=line;panel.append(p);}
 document.body.append(panel);panel.showModal();return 'Guia de evolução GM aberto.';
}
function adminCommand(input) {
  const [rawCommand, ...args] = input.trim().replace(/^\//, "").split(/\s+/);
  const command = canonicalCommand(rawCommand);
  const integer = (value, min, max) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max)
      throw Error(`Informe um inteiro entre ${min} e ${max}.`);
    return n;
  };
  let result = "OK";
  switch (command?.toLowerCase()) {
    case "gmkit":return gmOperation('grant').then(()=>null);
    case "gmrota":return gmRoute();
    case "gmexp":
      if(args[0]==='off')return gmOperation('stop').then(()=>null);
      if(args[0]==='on'){
        const item=[...inv.bag,...inv.bagB].find(p=>p.item.code===GM_POTION)?.item;
        if(!item)throw Error('Use /gmkit para retirar sua Poção EXP GM.');
        return gmOperation('activate',{uid:item.uid}).then(()=>null);
      }
      return gmRoute();
    case "skins":
      return globalThis.__localSession.skinShop?.open().then(() => "Loja de Skins aberta.");
    case "drops":
      return postLocal('/api/local/game/economy',{field:field.id}).then(r=>{
       const p=r.policy,d=r.globalDrops;return `Drops de ${field.name}: ${p.paused?'SUSPENSOS':p.custom?`ouro ${p.gold.chance}% entre ${p.gold.min} e ${p.gold.max}; equipamentos: ${p.equipment.map(g=>g.label+' '+Math.min(100,g.chance*r.effects.drops)+'%').join(', ')||'nenhum grupo'}`:`padrão global — ouro ${d.goldChance}%; equipamentos ${d.equipmentChance}% / ${d.highLevelChance}%`}. Evento XP ×${r.effects.xp}, ouro ×${r.effects.gold}. Bosses usam roleta e tabela própria.`;
      });
    case "ajuda":
      game?.keys.clear();
      openCommandHelp({
        isAdmin,
        onUse: (example) => {
          const input = document.querySelector("input.hud-chat-input");
          if (input) {
            input.value = example;
            input.focus();
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
      });
      return null;
    case "habilidades":
      if (args[0]?.toLowerCase() === "liberar") {
        if (!isAdmin) throw Error("Liberar habilidades é exclusivo do administrador.");
        skills.maximize();
        save();
        notice(`Habilidades de ${characterClass.name} liberadas para teste GM.`);
      }
      showSkillBook();
      return `Livro de ${characterClass.name}: 16 habilidades da classe. Aprenda com Mestre Verkan ou Mestre Raymon.`;
    case "loja":
      return showShop().then(() => null);
    case "coins": {
      if (!isAdmin) throw Error("Somente administrador pode adicionar coins.");
      if (args.length < 1 || args.length > 2)
        throw Error("Use /coins QUANTIA ou /coins ID QUANTIA.");
      const username = args.length === 2 ? args[0] : account.username;
      const amount = integer(args.at(-1), 1, 1000000000);
      return postLocal("/api/local/coins", { username, amount, requestId: requestId() }).then(
        (result) => {
          applyWallet(result.wallet);
          return result.message;
        },
      );
    }
    case "additem": {
      const code = args[0]?.toUpperCase();
      if (!definitions.has(code))
        throw Error("Código de item desconhecido. Use /itens para pesquisar.");
      const spec = args[1] === undefined ? hero.jobCode : integer(args[1], 1, 11),
        age = args[2] === undefined ? 0 : integer(args[2], 0, B.maxAging);
      const item = instance(code);
      applySpecialization(item, spec);
      if (
        age &&
        !["WEAPON_ONE", "WEAPON_TWO", "ARMOR", "SHIELDS", "BOOTS", "GLOVES", "ARMLET"].includes(
          item.slot,
        )
      )
        throw Error("Este item não aceita aging.");
      if (age) B.age(item, age);
      if (!addBag(item)) throw Error("Sem espaço na bolsa.");
      result = `${item.name} criado para classe ${spec}${age ? `, aging +${age}` : ""}.`;
      break;
    }
    case "mymonster": {
      if (!args.length) throw Error('Use /mymonster NOME.');
      const def = resolveName(wiki.monsters,args.join(' '));
      for (const [id,m] of [...monsters]) if (m.gmAlly) {
        monsters.delete(id);deliver({t:'monsters',remove:[id]});
      }
      result = spawnAdminMonster(def,1,{ally:true})+' Aliado GM ativo neste mapa.';
      break;
    }
    case "valento":
    case "monstro": {
      const forceDrop=args.at(-1)?.toLowerCase()==='drop';if(forceDrop)args.pop();
      const levelUp = command==='monstro' && args.length===1 && args[0].toLowerCase()==='hopiup';
      const count = command==='monstro' && !levelUp && /^\d+$/.test(args.at(-1)??'') ? integer(args.pop(),1,10) : 1;
      const def=resolveName(wiki.monsters,command==='valento'?'Valento':levelUp?'Hopi':args.join(' '));
      if(def.boss){if(count!==1)throw Error('Boss permite apenas uma invocação por vez.');return bossRoulette.spawn(def,forceDrop);}
      if(forceDrop)throw Error('A opção drop requer um Boss.');
      result = spawnAdminMonster(def,count,{levelUp});
      break;
    }
    case "criar": {
      let def,
        count = 1;
      try {
        def = resolveName([...definitions.values()], args.join(" "));
      } catch (error) {
        if (args.length < 2 || !/^\d+$/.test(args.at(-1))) throw error;
        count = integer(args.pop(), 1, 99);
        def = resolveName([...definitions.values()], args.join(" "));
      }
      const backup = clone(inv.bag);
      for (let i = 0; i < (def.slot === "POTION" ? 1 : count); i++) {
        const item = instance(def.code, def.slot === "POTION" ? count : 1);
        if (!addBag(item)) {
          inv.bag = backup;
          throw Error("Sem espaço na bolsa; criação cancelada sem perder itens.");
        }
      }
      result = `${count} × ${def.name} (${def.code}) criado(s) na bolsa.`;
      break;
    }
    case "invisivel": {
      if (args.length && !["on", "off"].includes(args[0])) throw Error("Use /invisivel on ou off.");
      adminState.hidden = args.length ? args[0] === "on" : !adminState.hidden;
      syncGm();
      result = `Invisibilidade ${adminState.hidden ? "ativada" : "desativada"}.`;
      break;
    }
    case "voar": {
      if (!args.length) adminState.fly = !adminState.fly;
      else if (["on", "off"].includes(args[0])) adminState.fly = args[0] === "on";
      else {
        adminState.altitude = integer(args[0], 10, 2000);
        adminState.fly = true;
      }
      game.attackTarget = null;
      game.attackHeld = false;
      game.talkTo = null;
      game.target = null;
      game.releaseSkill();
      game.air = null;
      if (!adminState.fly) {
        try {
          teleportHere(game.pos.x, -game.pos.z);
        } catch (error) {
          adminState.fly = true;
          throw error;
        }
      }
      result = adminState.fly
        ? `Voo ativado a ${adminState.altitude} unidades do chão. Clique para mover; /subir, /descer e /voar off para pousar.`
        : "Voo desativado.";
      break;
    }
    case "subir":
    case "descer": {
      if (!adminState.fly) throw Error("Ative /voar primeiro.");
      const step = args.length ? integer(args[0], 1, 1000) : 50;
      adminState.altitude = Math.max(
        10,
        Math.min(2000, adminState.altitude + (command === "subir" ? step : -step)),
      );
      result = `Altitude: ${adminState.altitude}.`;
      break;
    }
    case "velocidade":
      adminState.speed = integer(args[0], 1, 10);
      syncGm();
      result = `Velocidade GM ${adminState.speed}× (segure Shift no chão).`;
      break;
    case "pos":
      return `Mapa ${field.id} (${field.name}), X ${Math.round(game.pos.x)} Z ${Math.round(-game.pos.z)}, Y ${Math.round(game.pos.y)}.`;
    case "tp": {
      if (args.length === 2 && args.every((a) => a.trim() !== "" && Number.isFinite(Number(a)))) {
        result = teleportHere(Number(args[0]), Number(args[1]));
        break;
      }
      const map = resolveName(fieldData.fields, args.join(" "));
      if (map.id === field.id) {
        result = teleportHere(...(field.start?.[0] ?? spawn));
        break;
      }
      save();
      location.search = `?mapa=${map.id}&classe=${hero.jobCode}`;
      return `Carregando ${map.name}…`;
    }
    case "gm":
      return `GM local · ${hero.name} · nível ${stats.level} · deus ${adminState.god ? "on" : "off"} · voo ${adminState.fly ? "on" : "off"} · invisível ${adminState.hidden ? "on" : "off"} · velocidade ${adminState.speed}×. /ajuda lista os comandos.`;
    case "diagnostico":
      return `Transporte local: ${conn.open ? "ativo" : "inativo"}; não usa conexão ao servidor original.\n${diagnostics.map((e) => `${e.at}: ${e.message}`).join("\n") || "Nenhum erro registrado nesta sessão."}`;
    case "reconectar":
      save();
      location.reload();
      return "Reabrindo a sessão local com seu progresso salvo…";
    case "equipar":
      result = equipEndgame();
      break;
    case "nivel":
      stats.level = integer(args[0], 1, 150);
      stats.exp = experienceFloor(stats.level,balanceRules);
      hero.level = stats.level;
      break;
    case "ouro":
      stats.gold = integer(args[0], 0, 1e9);
      break;
    case "atributo":
      if (!["str", "spi", "tal", "dex", "health"].includes(args[0]))
        throw Error("Atributo desconhecido.");
      stats[args[0]] = integer(args[1], 1, 999);
      break;
    case "curar":
      recalculate();
      stats.hp = stats.hpMax;
      stats.mp = stats.mpMax;
      stats.sp = stats.spMax;
      break;
    case "deus":
    case "congelar": {
      if (!["on", "off"].includes(args[0])) throw Error("Use on ou off.");
      adminState[command === "deus" ? "god" : "frozen"] = args[0] === "on";
      syncGm();
      result = `${command}: ${args[0]} (somente nesta sessão)`;
      break;
    }
    case "itens":
      return (
        [...definitions.values()]
          .filter((i) => `${i.code} ${i.name}`.toLowerCase().includes(args.join(" ").toLowerCase()))
          .slice(0, 80)
          .map((i) => `${i.code}: ${i.name}`)
          .join("\n") || "Nenhum item."
      );
    case "mapas":
      return fieldData.fields
        .filter((f) => `${f.id} ${f.name}`.toLowerCase().includes(args.join(" ").toLowerCase()))
        .map((f) => `${f.id}: ${f.name}`)
        .join("\n");
    case "classes":
      return B.classes.map((c) => `${c.job}: ${c.name}`).join("\n");
    case "classe": {
      const entries = B.classes.map((c) => c.job);
      const id = Number(args[0]);
      if (!entries.includes(id)) throw Error("ID desconhecido. Consulte mapas ou classes.");
      save();
      location.search = `?mapa=${field.id}&classe=${id}`;
      return "Carregando…";
    }
    case "monstros":
      return wiki.monsters
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => m.name.toLowerCase().includes(args.join(" ").toLowerCase()))
        .slice(0, 80)
        .map(({ m, i }) => `${i}: ${m.name} (nível ${m.level})`)
        .join("\n");
    case "invocar": {
      const def = wiki.monsters[integer(args[0], 0, wiki.monsters.length - 1)];
      result = spawnAdminMonster(def, args[1] === undefined ? 1 : integer(args[1], 1, 10));
      break;
    }
    case "limpar":
      for (const m of monsters.values()) {
        m.hp = 0;
        m.seq++;
      }
      deliver({ t: "monsters", remove: [...monsters.keys()] });
      for (const [id, m] of monsters) if (m.adminSpawn) monsters.delete(id);
      result = "Monstros removidos sem recompensas.";
      break;
    case "renascer":
      for (const m of monsters.values()) {
        m.hp = m.hpMax;
        m.seq++;
        m.motion = "stand";
      }
      deliver({
        t: "monsters",
        add: [...monsters.values()].map(publicMonster),
        ts: performance.now() / 1000,
      });
      break;
    case "salvar":
      if (!save()) throw Error("O navegador não permitiu salvar.");
      break;
    default:
      throw Error("Comando desconhecido. Use ajuda.");
  }
  recalculate();
  skills.publish();
  save();
  return result;
}

const messages = [];
const monsters = new Map();
const companions = new Map();
let nextPetId = 70000;
function summonCompanion(skill, duration) {
  const models = {
    SKILL_METAL_GOLEM: "char/monster/metalgolem/metalgolem",
    SKILL_RECALL_WOLVERIN: "char/monster/wolverin/wolverin_a",
    SKILL_FIRE_ELEMENTAL: "char/monster/firegolem/firegolem",
    SKILL_RECALL_BLOODY_KNIGHT: "char/monster/bloodyknight/bknight",
  };
  const model = skill.runtime?.summon?.model ?? models[skill.code];
  const definition = skill.runtime?.summon;
  const index = Math.max(0, (skill.level ?? 1)-1);
  for (const [id, p] of companions)
    if (p.code === skill.code || ['SKILL_FALCON','SKILL_GOLDEN_FALCON'].includes(skill.code) && ['SKILL_FALCON','SKILL_GOLDEN_FALCON'].includes(p.code)) {
      companions.delete(id);
      deliver({ t: "monsters", remove: [id] });
    }
  const p = game.ground.spawnPoint(game.pos.x + 55, game.pos.z + 50);
  if (!p) return;
  const id = ++nextPetId,
    state = {
      id,
      name: skill.name,
      owner: hero.name,
      level: stats.level,
      model,
      x: p.x,
      y: p.y,
      z: -p.z,
      angle: 0,
      hp: definition?.hp[index] ?? stats.level * 50 + 100,
      hpMax: definition?.hp[index] ?? stats.level * 50 + 100,
      motion: "stand",
      seq: 0,
      body: 20,
    };
  companions.set(id, {
    code: skill.code,
    definition,
    skill: skill.level,
    state,
    until: performance.now() + duration * 1000,
    next: 0,
  });
  if(model) deliver({ t: "monsters", add: [state], ts: performance.now() / 1000 });
  deliver({ t: "pets", list: [...companions.values()].filter(p=>p.state.model).map((p) => ({ id: p.state.id })) });
}
function showSkillBook(trainerId) {
  game?.keys.clear();
  if (trainerId !== undefined) {
    game.events.emit("npcOpen", {
      npcId: trainerId,
      name: "Mestre de habilidades",
      windowKind: "skill",
      data: {},
    });
    return;
  }
  const windows = globalThis.__localSession.ui?.windows;
  if (!windows?.hotkeyRoute?.("skills", { repeat: false })) windows?.get("skill")?.show();
}
function publishBuffs() {
  const simulated = new Set(endgamePremiums().map((p) => p.kind));
  deliver({
    t: "buffs",
    list: [
      ...endgameBuffs(),
      ...skills.buffs(),
      ...(activeForce && activeForce.expiresAt > serverNow() / 1000 && B.forceInfo(activeForce.code)
        ? [
            {
              ...B.forceInfo(activeForce.code),
              code: "forceOrb",
              orb: B.forceInfo(activeForce.code).point,
              name: definitions.get(activeForce.code)?.name ?? "Force Orb",
              icon: B.forceIcon(
                B.forceInfo(activeForce.code).point,
                B.forceInfo(activeForce.code).magic,
              ),
              secondsLeft: Math.ceil(activeForce.expiresAt - serverNow() / 1000),
              level: 1,
            },
          ]
        : []),
      ...wallet.active
        .filter(
          (p) =>
            !gameplayTestMode && p.expiresAt * 1000 > serverNow() &&
            !simulated.has(p.kind) &&
            !(p.kind === "vampiric" && simulated.has("vampiricEx")),
        )
        .map((p) => ({
          code: "premium:" + (B.premiumIcons[p.kind]?.[0]??p.buffIcon),
          name: p.name,
          secondsLeft: Math.ceil((p.expiresAt * 1000 - serverNow()) / 1000),
          total: p.seconds,
          value: p.value,
          level: 1,
        })),
    ],
  });
}
const skills = createSkillSystem({
  catalog: skillData,
  job: characterClass.job,
  rank: () => isAdmin&&endgameEnabled?3:stats.classRank,
  name: hero.name,
  stats,
  saved: stored?.skills,
  savedCooldowns: stored?.skillCooldowns,
  savedBuffs: stored?.skillBuffs,
  equipment: () => inv.equip,
  game: () => game,
  isVillage: () => !!field.village,
  freeCast: () => isAdmin && adminState.god,
  resourceFree: () => gmSheltomActive(),
  timing: (skill) =>
    nativeSkillTiming(
      game.player,
      skill,
      B.skillMotion({ code: skill.code, level: skill.level ?? 1 }),
      B.skillVisual(skill.code),
      stats.attackStep,
    ),
  premiumValue,
  monsters,
  emit: deliver,
  recalculate,
  save,
  damage: damageMonster,
  schedule: (callback, ms) => setTimeout(callback, ms),
  isTrainer: (id) => npcs.some((n) => n.id === id && n.services?.includes("skill")),
  buffsChanged: publishBuffs,
  summon: summonCompanion,
  progress: (type,value)=>updateQuests(type,value),
  canSupport: () => globalThis.__localSession.online?.canResurrect(),
  support: (skill, level, target) => {
    const online=globalThis.__localSession.online;
    if(!online)return;
    (async()=>{save(true);await stateWrite;await online.support(skill.code,target);})().catch(e=>notice(e.message));
  },
  resurrect: (percent) => {
    if(!game.dead&&stats.hp>0)return;
    stats.hp=Math.max(1,Math.floor(stats.hpMax*percent/100));
    (async()=>{save(true);await stateWrite;location.reload();})().catch(e=>notice(e.message));
  },
  convert: (monster, skill) => {
    const chance=skillData.rules.skills[skill.code].tables.H_Incantation_Success?.[skill.level-1]??40+skill.level*4;
    if(Math.random()*100>=chance){notice('A conversão falhou.');return;}
    applyConversionHealth(monster,skillData.rules.skills[skill.code].tables.H_Incantation_AddLife[skill.level-1]);
    monster.owner=hero.name;monster.seq++;monster.motion='stand';
    updateQuests("skillConverted",{code:skill.code});
    const until=performance.now()+skill.duration*1000;
    companions.set(monster.id,{code:skill.code,skill:skill.level,state:monster,until,next:0,converted:true,
      definition:{damage:Array.from({length:10},()=>monster.definition.attack),interval:Array(10).fill(1.8),range:600}});
    deliver({t:'monsters',remove:[monster.id]});deliver({t:'monsters',add:[publicMonster(monster)]});
  },
});
const groundDrops = new Map();
let nextDropId = 1000000;
const warehouse = { items: [], gold: 0, pages: 3, weightMax: 10000, locked: [] };
if (stored?.warehouse) {
  warehouse.gold = number(stored.warehouse.gold, 0);
  warehouse.items = (stored.warehouse.items ?? [])
    .slice(0, 243)
    .map((p) => ({ ...p, item: restoreItem(p.item) }))
    .filter((p) => p.item);
}
worldQuests=createWorldQuests({name:hero.name,job:characterClass.job,tribe:characterClass.tribe,stats,
 completed,accepted,progress:objectiveProgress,meta:questMeta,definitions:questData.quests,catalog:skillData,policy:questData.classQuestPolicy,
 learned:()=>skills.exportState(),equipment:()=>inv.equip,now:()=>serverNow()/1000,notice,ready:q=>gameFeatures?.ready(q),changed:()=>skills.publish()});
gameFeatures=createGameFeatures({name:hero.name,job:characterClass.job,tribe:characterClass.tribe,stats,inv,warehouse,hero,npcs,wiki,field,monsters,balance:balanceRules,B,
 definitions,completed,accepted,meta:questMeta,world:worldQuests,game:()=>game,now:serverNow,instance,addBag,restoreItem,notice,deliver,recalculate,
 save,flush:()=>stateWrite,savedAt:()=>lastSavedAt,setSavedAt:n=>{lastSavedAt=Math.max(lastSavedAt,n??0)},post:postLocal,requestId,applyWallet,refresh:refreshWallet,
 busy:()=>economyBusy||!!mapTravel?.busy,setBusy:value=>{economyBusy=value},pendingLoot:()=>pendingLoot,lootFlush:()=>lootQueue,dropLoot,
 views:questViews,publish:()=>deliver({t:'quests',list:questViews()}),complete:completeQuest,update:updateQuests,openSkills:showSkillBook,
 navigate:async map=>{if(!save(true))throw Error('Não foi possível salvar.');await stateWrite;await globalThis.__localSession.online?.dispose();location.search=`?classe=${characterClass.job}&mapa=${map}`;},
 reload:()=>location.reload()});
bossRoulette=mountBossRoulette({meta:questMeta,monsters,wiki,field,zones:spawnData.stages[field.stage]?.zones,game:()=>game,post:postLocal,requestId,deliver,publicMonster,save,
 flush:()=>stateWrite,busy:()=>economyBusy,notice,diagnostic:recordDiagnostic,
 defeated:def=>{kills++;gainExperience(mapKillExperience(def));updateQuests('kill',{id:def.id,name:def.name,field:field.id});recalculate();},
 claim:async award=>{if(economyBusy||pendingLoot)throw Error('Aguarde a operação atual.');economyBusy=true;
  try{if(!save(true))throw Error('Falha ao salvar.');await stateWrite;const r=await postLocal('/api/local/game/boss',{action:'claim',award,savedAt:lastSavedAt,requestId:requestId()});
   for(const key of ['bag','bagB'])inv[key]=(r.state.inv[key]??[]).map(p=>({...p,item:restoreItem(p.item)})).filter(p=>p.item);lastSavedAt=r.state.savedAt;recalculate();save(true);notice('Recompensa do Boss recebida.');
  }finally{economyBusy=false;}}
});
function dropLoot(monster) {
  const source = { ...monster },
    key = requestId();
  pendingLoot++;
  lootQueue = lootQueue
    .then(async () => {
      if (!save(true)) throw Error("Não foi possível salvar antes de sortear os drops.");
      await stateWrite;
      const data = {
        job: hero.jobCode,
        monster: source.definition.id,
        map: field.id,
        adminSpawn: !!source.adminSpawn,
        gmTraining: !!source.gmTraining,
        ...(source.trialToken?{trialToken:source.trialToken}:{}),
        requestId: key,
      };
      let result;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          result = await postLocal("/api/local/game/kill", data);
          break;
        } catch (e) {
          if (e.status || attempt === 2) throw e;
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      lastSavedAt = Math.max(lastSavedAt, result.savedAt ?? 0);
      stats.gold += result.gold;
      if(source.gmTraining){
        const normal=mapKillExperience(source.definition);
        gainExperience(result.gmExperience??normal);recalculate();
        if(result.gmExperience===null)notice('EXP GM: este monstro/mapa está fora da rota ou a poção expirou. Consulte /gmrota.');
      }
      const add = [];
      for (const [index, entry] of result.items.entries()) {
        const item = instance(entry.code, entry.count),
          id = ++nextDropId;
        if (!item) continue;
        const specEntry = specializationRule(item.code, wiki.specs ?? {});
        if (entry.spec === characterClass.job) {
          applySpecialization(item, entry.spec);
        } else if (specEntry && Math.random() < dropRules.common.specializationChance) {
          const jobs = B.specJobs(specEntry.rule);
          if (jobs.length) applySpecialization(item, jobs[Math.floor(Math.random() * jobs.length)]);
        }
        const state = {
          ...item,
          id,
          x: source.x + index * 14,
          y: source.y,
          z: source.z,
          owner: hero.name,
        };
        groundDrops.set(id, { state, item, eventId: entry.eventId });
        add.push(state);
      }
      if (add.length) {
        deliver({ t: "ground", add });
        notice(
          `Drop de ${source.name}: ${add.map((d) => d.name).join(", ")}. Clique para recolher.`,
        );
      }
      deliver({ t: "stats", stats });
    })
    .catch((error) => {
      notice("Drops: " + error.message);
      recordDiagnostic("Drop não confirmado: " + error.message);
    })
    .finally(() => {
      pendingLoot--;
      save();
    });
}

function emitWarehouse() {
  deliver({ t: "warehouse", ...warehouse });
}
function warehouseSpace(item, page) {
  for (let y = 0; y <= 9 - item.h; y++)
    for (let x = 0; x <= 9 - item.w; x++)
      if (
        !warehouse.items.some(
          (p) =>
            p.page === page &&
            x < p.x + p.item.w &&
            x + item.w > p.x &&
            y < p.y + p.item.h &&
            y + item.h > p.y,
        )
      )
        return { x, y };
  return null;
}
function travelDestinations() {
  return fieldData.fields
    .filter((f) => f.start?.length && f.id !== field.id)
    .map((f) => ({ field: f.id, name: f.name, fee: 100, level: balanceRules.maps?.find(m=>m.id===f.id)?.minimum??1 }));
}

const clone = (value) => structuredClone(value);
function deliver(message) {
  conn.lastRecvAt = performance.now();
  const copy = clone(message);
  for (const tap of conn.gameTaps) tap(copy);
  if (conn.gameHandler) conn.gameHandler(copy);
  else conn.gameBacklog.push(copy);
}
function notice(text) {
  deliver({ t: "chat", from: "", text, channel: "system" });
}
function recalculate() {
  for (const item of [
    ...Object.values(inv.equip),
    ...Object.values(inv.equipB),
    ...inv.bag.map((p) => p.item),
    ...inv.bagB.map((p) => p.item),
  ])
    if (item) decorateCraftItem(item, B);
  const effects = skills.bonuses();
  const combatEquipment = gmCombatEquipment(isAdmin,inv.equip,gameplayTestMode);
  const gear = Object.values(combatEquipment).filter(Boolean);
  const specBonus = effectiveSpecialization(gear, characterClass.job, stats.level);
  const bonus = (key) => gear.reduce((sum, item) => sum + (item[key] ?? 0), 0);
  stats.hpMax =
    120 +
    (stats.level - 1) * 12 +
    (stats.health - 24) * 2 +
    ((stats.classRank ?? 0) >= 2 ? 15 : 0) +
    (endgameEnabled ? 1000 : 0) +
    bonus("hpAdd") +
    (specBonus.hpAdd ?? 0) +
    effects.hp;
  stats.weightMax = 1000 + premiumValue("mightOfAwell");
  stats.mpMax = 80 + (stats.level - 1) * 8 + bonus("mpAdd") + (specBonus.mpAdd ?? 0) + effects.mp;
  stats.spMax = 180 + (stats.level - 1) * 5 + bonus("spAdd") + (specBonus.spAdd ?? 0);
  stats.hpMax = Math.floor(stats.hpMax * (1 + effects.hpPercent / 100));
  stats.mpMax = Math.floor(stats.mpMax * (1 + effects.mpPercent / 100));
  stats.spMax = Math.floor(stats.spMax * (1 + effects.spPercent / 100));
  stats.hp = Math.min(stats.hp, stats.hpMax);
  stats.mp = Math.min(stats.mp, stats.mpMax);
  stats.sp = Math.min(stats.sp, stats.spMax);
  stats.expLevel = experienceFloor(stats.level,balanceRules);
  stats.expNext = experienceFloor(stats.level+1,balanceRules);
  Object.assign(stats, combatStats(stats, combatEquipment, specBonus, effects));
  applyGmAttack(stats,gmProtection(isAdmin,inv.equip));
  protectGm(stats,gmSheltomActive());
  const force =
    activeForce && activeForce.expiresAt > serverNow() / 1000
      ? B.forceInfo(activeForce.code)
      : null;
  if (force) {
    const weapon = inv.equip.weapon?.damage ?? [0, 0];
    const extra =
      (force.damage ?? 0) +
      (((weapon[0] + weapon[1]) / 2) * (force.weaponPct ?? 0)) / 100 +
      (((stats.damageMin + stats.damageMax) / 2) * (force.damageAvgPct ?? 0)) / 100;
    stats.damageMin += Math.floor(extra);
    stats.damageMax += Math.floor(extra);
  }
  stats.weight =
    [...Object.values(inv.equip), ...Object.values(inv.equipB)]
      .filter(Boolean)
      .reduce((a, b) => a + (b.weight ?? 0), 0) +
    [...inv.bag, ...inv.bagB].reduce((a, b) => a + (b.item.weight ?? 0) * (b.item.count ?? 1), 0);
  deliver({ t: "stats", stats });
  deliver({ t: "inventory", inv });
}
function sendState(state, unload = false) {
  const write = (snapshot) =>
    fetch("/api/local/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: account.username,
        job: hero.jobCode,
        generation: characterGeneration,
        state: snapshot,
      }),
      priority: "high",
      keepalive: unload,
    });
  if (unload) return write(state);
  pendingState = state;
  if (stateWrite) return stateWrite;
  stateWrite = (async () => {
    let response;
    while (pendingState) {
      const snapshot = pendingState;
      pendingState = null;
      response = await write(snapshot);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw Error(result.error ?? "HTTP " + response.status);
      }
    }
    return response;
  })().finally(() => {
    stateWrite = null;
  });
  return stateWrite;
}
function save(force = false) {
  if (economyUncertain) return false;
  if ((economyBusy || pendingLoot) && !force) return true;
  try {
    localStorage.setItem(
      saveKey,
      JSON.stringify({
        savedAt: (lastSavedAt = Math.max(lastSavedAt + 1, Math.floor(serverNow()))),
        endgame: endgameEnabled,
        gmGameplayTest: gameplayTestMode,
        progressionRewards: [...claimedKitLevels],
        name: stats.name,
        stats,
        inv,
        field: pendingMapTravel?.field ?? field.id,
        position: pendingMapTravel?.position ?? game?.playerPosition() ?? enter,
        kills,
        completed: [...completed],
        accepted: [...accepted],
        objectiveProgress,
        questMeta,
        warehouse,
        skills: skills.exportState(),
        skillCooldowns: skills.exportCooldowns(),
        skillBuffs: skills.exportBuffs(),
        force: activeForce,
        selectedSkills: game ? { ...game.skillSlots } : stored?.selectedSkills,
      }),
    );
    sendState(JSON.parse(localStorage.getItem(saveKey)))
      .then((response) => {
        if (!response.ok)
          recordDiagnostic("Não foi possível salvar a conta no servidor: HTTP " + response.status);
      })
      .catch((error) => recordDiagnostic("Salvar conta: " + error.message));
    return true;
  } catch (error) {
    recordDiagnostic("Salvar progresso: " + error.message);
    console.error("[local save]", error);
    return false;
  }
}
function questViews() {
  return questData.quests
    .filter((q) => q.id.startsWith('rank.')?worldQuests.eligible(q):questEligible(q, stats, characterClass.tribe, completed))
    .map((raw) => {
      const q=worldQuests.resolve(raw);
      const objectives = q.steps
        .filter((o) => !o.race || o.race === characterClass.tribe)
        .map((o) => {
          const npc = wiki.npcs.find(
            (n) => (o.npcIds ?? []).includes(n.id) && n.map === o.target?.field,
          );
          return {
            ...o,
            done: Math.min(o.need,objectiveValue(q,o,objectiveProgress[`${q.id}:${o.id}`],stats,skills.exportState(),skillData,inv)),
            target: questTarget(o, fieldData.fields, spawnData.stages, wiki.npcs),
          };
        });
      return {
        ...q,
        state:
          !q.auto && !accepted.has(q.id)
            ? "available"
            : objectives.every((o) => o.done >= o.need)
              ? "ready"
              : "active",
        objectives,
        dialogue: {
          offer: q.offer ?? "",
          progress: q.offer ?? "",
          complete: "Objetivos concluídos.",
        },
        giverNpc: q.giver?.find(n=>!n.race||n.race===characterClass.tribe),
        turnInNpc: q.turnIn?.find(n=>!n.race||n.race===characterClass.tribe),
      };
    });
}
function updateQuests(type,value){
 const data={...(value&&typeof value==='object'?value:{}),field:field.id};
 if(type==='talk')data.npcId=value;
 for(const q of questViews()){
  if(q.state==='available')continue;
  if(q.id.startsWith('rank.')){worldQuests.event(q,q.objectives,type,data);continue;}
  for(const objective of q.objectives){
   const normal=type==='kill'&&typeof value==='object'?value.name:value;
   const increment=objectiveMatches(q,objective,type,normal,field.id)?1:objectiveIncrement(q,objective,type,data,skillData,skills.exportState());
   if(increment)objectiveProgress[q.id+':'+objective.id]=Math.min(objective.need,(objectiveProgress[q.id+':'+objective.id]??0)+increment);
  }
 }
 const views=questViews();worldQuests.notify(views);deliver({t:'quests',list:views});
}
function mapKillExperience(monster) {
  const base=killExperience(monster,stats.level,balanceRules,premiumValue('expUp'),field.id);
  return base?capKillExperience(eventExperience(base,economyEffects),stats,field.id,balanceRules):0;
}
let lastMapProgressionNotice = '';
function noticeMapProgression() {
  if(mapExperienceAllowed(stats.level,field.id,balanceRules))return;
  const band=mapExperienceRange(field.id,balanceRules),key=field.id+':'+stats.level;
  if(lastMapProgressionNotice===key)return;
  lastMapProgressionNotice=key;
  const next=balanceRules.maps.filter(m=>m.experienceMin!==undefined&&m.minimum<=stats.level&&mapExperienceAllowed(stats.level,m.id,balanceRules))
    .sort((a,b)=>b.experienceMin-a.experienceMin);
  notice(field.name+' não rende EXP no nível '+stats.level+'. Faixa: '+band.min+'–'+band.max+'.'+
    (next.length?' Próximo mapa de UP: '+next[0].name+'.':''));
}
async function claimLevelKits() {
  if (!game || game.dead || economyBusy || economyUncertain || pendingLoot || mapTravel?.busy ||
      stats.level < 10 || stats.level >= 80 || performance.now() < nextKitAttempt ||
      ![10,20,30,40,50,60,70].some(level => level <= stats.level && !claimedKitLevels.has(level))) return;
  nextKitAttempt = performance.now() + 30000;
  economyBusy = true;
  try {
    if (!save(true)) throw Error('Não foi possível salvar para receber o kit.');
    await stateWrite;
    const payload = {savedAt:lastSavedAt,requestId:requestId()};
    let result;
    for (let attempt=0;attempt<3;attempt++) {
      try { result=await postLocal('/api/local/game/rewards',payload); break; }
      catch(error) {
        if(error.status) throw error;
        if(attempt===2) {economyUncertain=true;throw Error('Recarregue para recuperar o kit confirmado pelo servidor.');}
      }
    }
    for(const level of result.levels ?? []) claimedKitLevels.add(level);
    if(result.state) {
      for(const group of ['bag','bagB'])
        inv[group]=(result.state.inv[group]??[]).map(p=>({...p,item:restoreItem(p.item)})).filter(p=>p.item);
      lastSavedAt=result.state.savedAt;
      recalculate(); save(true);
      notice('Kit de evolução do nível '+result.awarded+' recebido: 8 equipamentos com o spec da sua classe. Confira a bolsa.');
    }
  } catch(error) { notice('Kit de evolução: '+error.message); }
  finally { economyBusy=false; }
}
function gainExperience(gained) {
  const previousLevel=stats.level;
  stats.exp += gained;
  deliver({ t: "exp", gained, exp: stats.exp });
  while (stats.exp >= stats.expNext && stats.level < 150) {
    stats.level++;
    stats.statPoints += 5;
    recalculate();
    stats.hp = stats.hpMax;
    stats.mp = stats.mpMax;
    stats.sp = stats.spMax;
    deliver({ t: "levelUp", level: stats.level });
  }
  skills.publish();
  if(stats.level!==previousLevel)noticeMapProgression();
}
function completeQuest(id,npcId=null) {
  const quest = questViews().find((q) => q.id === id);
  if (!quest || quest.state !== "ready") return notice("Conclua os objetivos da missão primeiro.");
  const previousRank=stats.classRank;
  if(id.startsWith('rank.')&&(!gameFeatures.npcTeacher(npcId)||!worldQuests.allSkillsThrough(worldQuests.rank()+1)))return notice('Entregue ao Mestre correto, com todas as habilidades anteriores aprendidas.'),false;
  const backup = clone(inv);
  for(const o of quest.objectives){const code=questCollectionCode(o);if(code){let remaining=o.need;for(const bag of [inv.bag,inv.bagB])for(const p of bag)if(p.item.code===code&&!p.item.premiumManaged){const count=Math.min(remaining,p.item.count??1);p.item.count-=count;remaining-=count;}if(remaining){Object.assign(inv,backup);notice('Os itens da missão não estão mais disponíveis.');return false;}for(const key of ['bag','bagB'])inv[key]=inv[key].filter(p=>(p.item.count??1)>0);}}
  if(id==='rank.2'){try{gameFeatures.loanWeapon();}catch(e){Object.assign(inv,backup);notice(e.message);return false;}}
  for (const reward of (quest.rewards?.items ?? []).filter(r=>!r.jobs?.length||r.jobs.includes(characterClass.job))) {
    const item = instance(reward.code, reward.count ?? 1);
    if(item&&id.startsWith('rank.2.2.')){item.expiresAt=serverNow()/1000+5*86400;item.noGold=true;item.bound=true;}
    if (item && !addBag(item)) {
      Object.assign(inv,backup);
      notice("Abra espaço na bolsa para receber a recompensa.");return false;
    }
  }
  completed.add(id);
  if(id.startsWith('rank.'))worldQuests.done(quest);
  if(id.startsWith('rank.2.2.'))for(const item of [...Object.values(inv.equip),...Object.values(inv.equipB),...inv.bag.map(p=>p.item),...inv.bagB.map(p=>p.item)])if(item?.questWeapon)item.expiresAt=serverNow()/1000+5*86400;
  stats.gold += quest.rewards?.gold ?? 0;
  gainExperience(questExperienceReward(quest.rewards, stats.level,balanceRules));
  deliver({ t: "questDone", id: quest.id, title: quest.title, rewards: quest.rewards ?? {} });
  deliver({ t: "quests", list: questViews() });
  recalculate();
  save();
  if(stats.classRank>previousRank)gameFeatures.promoted();
  return true;
}
function findSpace(item) {
  return firstSpace(inv.bag, item);
}
function addBag(item) {
  if(!item||!Number.isInteger(item.count??1)||(item.count??1)<1||(item.count??1)>9999)return false;
  item.count??=1;
  if (item.slot === "POTION" || item.premiumManaged) {
    const existing = inv.bag.find(
      (p) => p.item.code === item.code && !!p.item.premiumManaged === !!item.premiumManaged,
    );
    if (existing) {
      if(existing.item.count+item.count>9999)return false;
      existing.item.count += item.count;
      return true;
    }
  }
  const position = findSpace(item);
  if (!position) return false;
  inv.bag.push({ ...position, item });
  return true;
}
function syncPremiumInventory() {
  if(gameplayTestMode)return;
  syncShopInventory(inv, wallet, instance, addBag);
}

function findItem(uid) {
  return (
    [...inv.bag, ...inv.bagB].find((p) => p.item.uid === uid)?.item ??
    inv.belt.find((i) => i?.uid === uid) ??
    [...Object.values(inv.equip), ...Object.values(inv.equipB)].find((i) => i?.uid === uid)
  );
}
function consume(item) {
  item.count--;
  if (item.count > 0) return;
  inv.bag = inv.bag.filter((p) => p.item !== item);
  inv.bagB = inv.bagB.filter((p) => p.item !== item);
  inv.belt = inv.belt.map((i) => (i === item ? null : i));
}
function questAtNpc(id, state) {
  const npc=npcs.find(n=>n.id===id);
  if(!npc||!game||Math.hypot(game.pos.x-npc.x,-game.pos.z-npc.z)>500)return null;
  return questViews().find(
    (q) =>
      q.state === state &&
      (
        questData.quests.find((d) => d.id === q.id)?.[state === "ready" ? "turnIn" : "giver"] ?? []
      ).some((n) => n.npcId === id),
  );
}
function showRedistribution(npc) {
  game.keys.clear();
  game.events.emit("npcOpen", { npcId: npc.id, name: npc.name, windowKind: "event", data: {} });
}

async function redistributeAtNpc(npcId, mode) {
  const npc = npcs.find((n) => n.id === npcId && n.services?.includes("event") && /event girl/i.test(n.name));
  if (!npc || !["stats", "skills", "both"].includes(mode)) throw Error("Redistribuição inválida.");
  if (!game || game.dead || stats.hp <= 0) throw Error("O personagem precisa estar vivo.");
  if (Math.hypot(game.pos.x - npc.x, -game.pos.z - npc.z) > 500)
    throw Error("Aproxime-se da Event Girl para redistribuir.");
  if (economyBusy || economyUncertain || pendingLoot)
    throw Error("Aguarde o salvamento e as operações do inventário terminarem.");
  economyBusy = true;
  try {
    if (stateWrite) await stateWrite;
    const plan = mode !== "skills" ? planAttributeReset(stats, inv) : null;
    if (plan) {
      Object.assign(stats, plan.attributes);
      Object.assign(inv, plan.inventory);
      statHistory.length = 0;
    }
    if (mode !== "stats") {
      skills.reset();
      for (const side of ["left", "right"]) game.setSkillSlot(side, null);
      const removed = [...companions.keys()].filter(id=>!companions.get(id).converted);
      for(const pet of companions.values())if(pet.converted){restoreConversionHealth(pet.state);delete pet.state.owner;}
      companions.clear();
      if (removed.length) deliver({ t: "monsters", remove: removed });
      deliver({ t: "pets", list: [] });
    }
    recalculate();
    skills.publish();
    publishBuffs();
    if (!save(true)) throw Error("Não foi possível preparar o salvamento da redistribuição.");
    await stateWrite;
    const points = skills.points();
    return `Redistribuição gratuita salva. Atributos: ${stats.statPoints} pontos livres. Skills: ${points.skill} SP e ${points.elite} EP livres. Aprenda as habilidades novamente com o mestre.`;
  } finally {
    economyBusy = false;
  }
}


function npcTalk(id, interactive) {
  const npc = npcs.find((n) => n.id === id);
  if (!npc || !game || game.dead) return;
  if (!interactive) return;
  if(Math.hypot(game.pos.x-npc.x,-game.pos.z-npc.z)>500)return notice('Aproxime-se do NPC.');
  updateQuests("talk", id);
  if (npc.services?.includes("event") && /event girl/i.test(npc.name)) {
    showRedistribution(npc);
  } else if (npc.services?.includes("shop")) {
    const stock = (npc.shop ?? []).map((code) => definitions.get(code)).filter(Boolean);
    // The native shop hides misc whenever an equipment tab is populated.
    const supplies = stock.some(i => i.slot === "POTION");
    game.events.emit("npcOpen", {
      npcId: id,
      name: npc.name,
      windowKind: "shop",
      data: {
        weapons: stock.filter((i) => i.slot.startsWith("WEAPON")).map((i) => i.code),
        armors: (supplies ? [] : stock)
          .filter((i) => !i.slot.startsWith("WEAPON") && i.slot !== "POTION")
          .map((i) => i.code),
        misc: (supplies ? stock.filter(i => !i.slot.startsWith("WEAPON")) : []).map((i) => i.code),
        vipPct: 0,
        taxPct: 0,
      },
    });
  } else if (npc.services?.includes("skill")) {
    skills.publish();
    gameFeatures.openNpc(npc).catch(e=>notice(e.message));
  } else if (npc.services?.includes("itemshop")) {
    showShop().catch((e) => notice(e.message));
  } else if (npc.services?.includes("warehouse")) {
    game.events.emit("npcOpen", { npcId: id, name: npc.name, windowKind: "warehouse", data: {} });
    emitWarehouse();
  } else if (npc.services?.some((s) => ["teleport", "wing"].includes(s))) {
    game.keys.clear();
    const panel = serviceDialog(npc.name, "Escolha o destino. A taxa será cobrada ao viajar.");
    travelDestinations().forEach((dest, index) => {
      const button = panel.button(`${dest.name} — nível ${dest.level} — ${dest.fee} ouro`,
        async () => { if (await handle({ t: "npcTeleport", npcId: id, index })) panel.close(); });
      button.disabled = !canEnterWalking({ id: dest.field }) || stats.gold < dest.fee;
    });
  } else if (
    npc.services?.some((service) => ["aging", "mix", "force", "mixreset"].includes(service))
  ) {
    const windowKind = npc.services.find((service) =>
      ["aging", "mix", "force", "mixreset"].includes(service),
    );
    game.events.emit("npcOpen", { npcId: id, name: npc.name, windowKind, data: { taxPct: 0 } });
  } else if (npc.services?.some(s=>['charity','post','clan','levelRanking','manufacture','smelting','bellatra'].includes(s))) {
    gameFeatures.openNpc(npc).catch(e=>notice(e.message));
  } else if (npc.services?.includes("quest")) {
    const q = questAtNpc(id, "ready") ?? questAtNpc(id, "available");
    if (q)
      game.events.emit("npcOpen", {
        npcId: id,
        name: npc.name,
        windowKind: "quest",
        data: {
          title: q.title,
          text: q.description ?? q.title,
          action: q.state === "ready" ? "complete" : "accept",
        },
      });
    else notice(`${npc.name}: não há missão disponível para este personagem.`);
  } else {
    gameFeatures.openNpc(npc).catch(e=>notice(e.message));
  }
}
function damageMonster(id, power = 1, rangeOverride = null, options = {}) {
  if (mapTravel?.busy) return;
  const monster = monsters.get(id);
  if (!monster || monster.owner || monster.hp <= 0 || !game || game.dead || stats.hp <= 0) return;
  const control=monsterControl(monster);
  const distance = Math.hypot(game.pos.x - monster.x, game.pos.z + monster.z);
  if (distance > (rangeOverride ?? (stats.shootingRange || 100) + 80)) return;
  const attack =
    options.fixedDamage !== undefined
      ? {
          ...stats,
          damageMin: options.fixedDamage,
          damageMax: options.fixedDamage,
          elementalDamage: {},
        }
      : stats;
  const adjustedPower =
    options.fixedDamage !== undefined
      ? 1
      : power * (monster.definition.undead ? 1 + ((stats.undeadDamage ?? 0) + (options.undeadDamagePercent ?? 0)) / 100 : 1);
  const hit = physicalHit(
    attack,
    monster.definition,
    adjustedPower * (1 + (options.monsterBonus?.[monster.definition.type] ?? 0) / 100),
    skillData.rules.accuracy,
    Math.random,
    {
      ...options,
      criticalBonus: (options.criticalBonus ?? 0) + control.criticalBonus,
      magic: options.fixedDamage !== undefined || (options.magic ?? stats.magicAttack),
      element: options.element,
    },
  );
  const kind=hit.kind;
  const amount=hit.amount===0?0:Math.max(1,Math.floor(hit.amount*(options.fixedDamage!==undefined?1:classDamageScale(characterClass.job,stats.level,balanceRules))));
  if(!options.noLeech)skills.reveal?.();
  if (amount === 0) {
    monster.aggroUntil = performance.now() + 10000;
    deliver({
      t: "damage",
      from: 0,
      to: id,
      amount: 0,
      hp: monster.hp,
      hpMax: monster.hpMax,
      kind,
      atk: true,
    });
    return 0;
  }
  const dealt = Math.min(monster.hp, amount);
  if(options.skillCode){monster.skillMarks??={};monster.skillMarks[options.skillCode]=performance.now();updateQuests('skillHit',{code:options.skillCode,undead:monster.definition.undead});}
  else if(!options.noLeech)updateQuests('normalHit',{});
  if(monster.sharedBoss){bossRoulette.hit(monster,amount);monster.aggroUntil=performance.now()+10000;
   const recovered=options.noLeech?{hp:0,mp:0}:premiumRecovery(stats,premiumValue,dealt,{area:options.area});stats.hp+=recovered.hp;stats.mp+=recovered.mp;return dealt;}
  monster.hp = Math.max(0, monster.hp - amount);
  monster.aggroUntil = performance.now() + 10000;
  const recovered = options.noLeech
    ? { hp: 0, mp: 0 }
    : premiumRecovery(stats, premiumValue, dealt, { area: options.area });
  stats.hp += recovered.hp;
  stats.mp += recovered.mp;
  if (recovered.hp || recovered.mp) deliver({ t: "stats", stats });
  if (monster.hp === 0) monster.seq++;
  deliver({
    t: "damage",
    from: options.sourceId ?? 0,
    to: id,
    amount,
    hp: monster.hp,
    hpMax: monster.hpMax,
    kind,
    atk: true,
    mseq: monster.seq,
  });
  deliver({
    t: "monsters",
    update: [
      { id, hp: monster.hp, motion: monster.hp === 0 ? "dead" : monster.motion, seq: monster.seq },
    ],
    ts: performance.now() / 1000,
  });
  if (monster.hp === 0) {
    if(gameFeatures.defeated(monster))return dealt;
    kills++;
    const gained = mapKillExperience(monster.definition);
    monster.gmTraining=gmExpActive();
    if(monster.gmLevelUp && isAdmin && stats.level < 150) {
      gainExperience(Math.max(0,experienceFloor(stats.level+1,balanceRules)-stats.exp));
      notice('Hopi UP: +1 nível de GM!');
    } else if(!monster.gmTraining && !monster.gmLevelUp) gainExperience(gained);
    dropLoot(monster);
    updateQuests('kill',{id:monster.definition.id,name:monster.name,field:field.id});
    for(const [code,at]of Object.entries(monster.skillMarks??{}))if(performance.now()-at<=10000)updateQuests("skillKill",{code});
    recalculate();
    save();
    const deathSeq = monster.seq;
    setTimeout(() => {
      if (monsters.get(id) !== monster || monster.seq !== deathSeq || monster.hp > 0) return;
      deliver({ t: "monsters", remove: [id] });
      if (monster.adminSpawn || monster.featureSpawn) monsters.delete(id);
    }, 3500);
    if (!monster.adminSpawn && !monster.featureSpawn)
      setTimeout(() => {
        if (monsters.get(id) !== monster || monster.seq !== deathSeq || monster.hp > 0) return;
        if (monster.adminSpawn) {
          monsters.delete(id);
          return;
        }
        monster.hp = monster.hpMax;
        monster.skillMarks={};
        if (monster.home) Object.assign(monster, monster.home);
        monster.motion = "stand";
        monster.aggroUntil = 0;
        monster.seq++;
        deliver({ t: "monsters", add: [publicMonster(monster)], ts: performance.now() / 1000 });
      }, monster.definition.boss?900000:35000);
  }
  return dealt;
}
function publicMonster(m) {
  const { definition, nextAttack, home, aggroUntil, ...state } = m;
  return state;
}
async function handle(message) {
  messages.push(clone(message));
  if (messages.length > 100) messages.shift();
  switch (message.t) {
    case "skinsOpen":
      await globalThis.__localSession.skinShop?.open();
      break;
    case "itemShopOpen":
      await refreshWallet();
      break;
    case "itemShopBuy": {
      if (shopBuying) return;
      shopBuying = true;
      try {
        if (message.tab !== "coin") throw Error("Esta loja usa coins.");
        if (message.giftTo)
          throw Error(
            "Presente por Item Shop ainda indisponível. O admin pode conceder coins ao ID desejado.",
          );
        const count = message.count ?? message.units ?? 1;
        const result = await postLocal("/api/local/premium/purchase", {
          code: message.code,
          count,
          expectedTotal: message.total,
          requestId: requestId(),
        });
        applyWallet(result.wallet);
        deliver({ t: "itemShopResult", ok: true, text: result.message });
        save();
      } catch (error) {
        await refreshWallet().catch(() => {});
        deliver({ t: "itemShopResult", ok: false, text: error.message });
      } finally {
        shopBuying = false;
      }
      break;
    }
    case "buffCancel":
      if (message.code === "forceOrb") {
        activeForce = null;
        recalculate();
        publishBuffs();
      } else skills.cancel(message.code);
      break;
    case "eventReset":
      try {
        const text = await redistributeAtNpc(message.npcId, message.what);
        deliver({ t: "craftResult", kind: "eventReset", ok: true, text });
        notice("Event Girl: redistribuição salva com sucesso.");
      } catch (error) {
        deliver({ t: "craftResult", kind: "eventReset", ok: false, text: error.message });
      }
      break;
    case "skillMaster":
      if (npcs.some((n) => n.id === message.npcId && n.services?.includes("skill")))
        skills.publish();
      break;
    case "learnSkill":
      try {
        notice(skills.learn(message.id, message.npcId));
        updateQuests("learn",{});
      } catch (error) {
        notice(error.message);
      }
      break;
    case "skill":
      try {
        const used = skills.cast(message.id, message.target);
        if (used.code === "SKILL_SWIFT_AXE") {
          const percent = skillData.rules.skills[used.code]?.tables?.Swift_Axe_Speed?.[used.level - 1] ?? 0;
          notice(`Machado Veloz ativo: +${percent}% de velocidade de ataque com machado por ${used.duration} segundos.`);
        }
      } catch (error) {
        if (gameplayTestMode) console.debug("[playtest:skill-refused]", message.id, error.message);
        deliver({ t: "error", text: error.message });
      }
      break;
    case 'rankUp': {const npc=npcs.find(n=>n.id===message.npcId);if(npc)gameFeatures.openNpc(npc).catch(e=>notice(e.message));break;}
    case "skillGuide":
      deliver({ t: "skillGuide", job: characterClass.job, skills: skills.snapshot().skills });
      break;
    case "skillRelease":
    case "skillCancel":
      break;
    case "pickup": {
      const drop = groundDrops.get(message.id);
      if (!drop) return;
      if (Math.hypot(game.pos.x - drop.state.x, game.pos.z + drop.state.z) > 100)
        return notice("Aproxime-se do item.");
      const before = clone(inv);
      if (!addBag(drop.item)) return notice("Bolsa cheia. O item continua no chão.");
      economyBusy = true;
      try {
        drop.pickupRequestId ??= requestId();
        const payload = { eventId: drop.eventId, requestId: drop.pickupRequestId };
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await postLocal("/api/local/game/pickup", payload);
            break;
          } catch (error) {
            if (error.status || attempt === 2) throw error;
            await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
      } catch (error) {
        Object.assign(inv, before);
        recalculate();
        notice(error.message);
        return;
      } finally {
        economyBusy = false;
      }
      groundDrops.delete(message.id);
      deliver({ t: "ground", remove: [message.id] });
      recalculate();
      updateQuests("item", drop.item.code);
      updateQuests("pickup",{});
      break;
    }
    case "warehouseMove": {
      const npc=npcs.find(n=>n.id===message.npcId&&n.services?.includes('warehouse'));
      if(!npc||Math.hypot(game.pos.x-npc.x,-game.pos.z-npc.z)>500)return notice('Aproxime-se do armazém.');
      const bagIndex = inv.bag.findIndex((p) => p.item.uid === message.uid),
        chestIndex = warehouse.items.findIndex((p) => p.item.uid === message.uid);
      if (bagIndex >= 0) {
        if (inv.bag[bagIndex].item.premiumManaged)
          return notice("Premium vinculado à conta: mantenha na bolsa para ativar.");
        const p = inv.bag[bagIndex],
          page = Math.floor(number(message.page, 0, 0, 2)),
          space = warehouseSpace(p.item, page);
        if (!space) return notice("Página do baú cheia.");
        inv.bag.splice(bagIndex, 1);
        warehouse.items.push({ item: p.item, page, ...space });
        updateQuests('deposit',{});
      } else if (chestIndex >= 0) {
        if (!addBag(warehouse.items[chestIndex].item)) return notice("Bolsa cheia.");
        warehouse.items.splice(chestIndex, 1);
        updateQuests('withdraw',{});
      }
      emitWarehouse();
      recalculate();
      break;
    }
    case "warehouseGold": {
      const npc=npcs.find(n=>n.id===message.npcId&&n.services?.includes('warehouse'));
      if(!npc||Math.hypot(game.pos.x-npc.x,-game.pos.z-npc.z)>500)return notice('Aproxime-se do armazém.');
      const amount = Number(message.amount);
      if (
        !Number.isSafeInteger(amount) ||
        amount === 0 ||
        amount > stats.gold ||
        -amount > warehouse.gold
      )
        return notice("Quantidade de ouro inválida.");
      stats.gold -= amount;
      warehouse.gold += amount;
      emitWarehouse();
      recalculate();
      break;
    }
    case "warehouseSort":
      emitWarehouse();
      break;
    case "aging": {
      if (pendingLoot) return notice("Aguarde a confirmação dos drops antes do Aging.");
      economyBusy = true;
      try {
        craftAtNpc(message, {
          inv,
          stats,
          npcs,
          bridge: B,
          preview: true,
          position: { x: game.pos.x, z: -game.pos.z },
        });
        if (!save(true)) throw Error("Não foi possível salvar o inventário.");
        await stateWrite;
        const snapshot = JSON.parse(localStorage.getItem(saveKey));
        const payload = {
          ...message,
          job: hero.jobCode,
          requestId: requestId(),
          savedAt: snapshot.savedAt,
        };
        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            result = await postLocal("/api/local/game/aging", payload);
            break;
          } catch (error) {
            if (error.status) throw error;
            if (attempt === 2) {
              economyUncertain = true;
              throw Error(
                "Aging sem confirmação. Recarregue a página para recuperar o estado salvo no servidor.",
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
        const item = inv.bag.concat(inv.bagB).find((p) => p.item.uid === message.item)?.item;
        if (item && result.outcome !== "destroy") B.age(item, result.newAge - (item.aging ?? 0));
        const localItems = new Map(inv.bag.concat(inv.bagB).map((p) => [p.item.uid, p.item]));
        for (const group of ["bag", "bagB"]) {
          inv[group] = result.inv[group]
            .map((p) => {
              const local = localItems.get(p.item.uid) ?? restoreItem(p.item);
              if (local) local.count = p.item.count ?? 1;
              return { ...p, item: local };
            })
            .filter((p) => p.item);
        }
        lastSavedAt = Math.max(lastSavedAt, result.savedAt);
        stats.gold = result.gold;
        recalculate();
        const updated = inv.bag.concat(inv.bagB).find((p) => p.item.uid === message.item)?.item;
        deliver({
          t: "craftResult",
          kind: "aging",
          ok: ["plus1", "plus2"].includes(result.outcome),
          item: updated,
          text:
            result.outcome === "destroy"
              ? "O Aging falhou e o item foi destruído."
              : `Aging: +${result.oldAge} → +${result.newAge}.`,
        });
      } catch (error) {
        deliver({ t: "craftResult", kind: "aging", ok: false, text: error.message });
      } finally {
        economyBusy = false;
        save();
      }
      break;
    }
    case "mix":
    case "force":
    case "mixReset": {
      try {
        const result = craftAtNpc(message, {
          inv,
          stats,
          npcs,
          bridge: B,
          instance,
          addBag,
          restoreItem,
          position: { x: game.pos.x, z: -game.pos.z },
        });
        deliver(result);
        if(result.ok)updateQuests(message.t,{});
        postLocal("/api/local/game/report", {
          message: result.text,
          operation: message.t,
          ok: result.ok,
        }).catch(() => {});
      } catch (e) {
        deliver({ t: "craftResult", kind: message.t, ok: false, text: e.message });
      }
      recalculate();
      break;
    }
    case "repair":
    case "repairAll": {
      const npc = npcs.find((n) => n.id === message.npcId && n.services?.includes("shop"));
      if (!npc || Math.hypot(game.pos.x - npc.x, -game.pos.z - npc.z) > 500)
        return notice("Aproxime-se do vendedor.");
      const items = [...inv.bag.map((p) => p.item),...inv.bagB.map(p=>p.item), ...Object.values(inv.equip),...Object.values(inv.equipB)].filter(
        (i) => i?.durability && (message.t === "repairAll" || i.uid === message.uid),
      );
      const price = items.reduce((sum, i) => sum + repairPrice(i), 0);
      if (stats.gold < price) return notice("Ouro insuficiente para reparar.");
      stats.gold -= price;
      for (const i of items) i.durability[0] = i.durability[1];
      recalculate();
      notice(`Equipamento reparado por ${price} de ouro.`);
      updateQuests("repair",{});
      break;
    }
    case "npcTeleport": {
      const npc = npcs.find(n => n.id === message.npcId &&
        n.services?.some(s => ["teleport", "wing"].includes(s)));
      if (!npc || game.dead || stats.hp <= 0 || economyBusy || pendingLoot || economyUncertain) return false;
      if (Math.hypot(game.pos.x - npc.x, -game.pos.z - npc.z) > 500) return false;
      const index = message.index ?? 0;
      if (!Number.isInteger(index) || index < 0) return false;
      const dest = travelDestinations()[index];
      if (!dest) return false;
      if (!canEnterWalking({ id: dest.field })) { notice(`Este destino requer nível ${dest.level}.`); return false; }
      if (stats.gold < dest.fee) { notice("Ouro insuficiente para teleportar."); return false; }
      economyBusy = true;
      stats.gold -= dest.fee;
      try { await gameFeatures.travel(dest.field); return true; }
      catch (error) { stats.gold += dest.fee; recalculate(); save(true); notice("Teleporte cancelado: " + error.message); return false; }
      finally { economyBusy = false; }
    }
    case "questAccept": {
      const q = questAtNpc(message.npcId, "available");
      if(q){if(q.id.startsWith('rank.'))worldQuests.accept(q);else accepted.add(q.id);}
      deliver({ t: "quests", list: questViews() });
      break;
    }
    case "questComplete": {
      const q = questAtNpc(message.npcId, "ready");
      if (q) completeQuest(q.id,message.npcId);
      break;
    }
    case "field": {
      const blocked=mapTravel.forestReturnBlocked(message.id);
      const changed=await mapTravel.walk(message.id);
      if (!changed && blocked && game.currentStage!==field.stage) {
        game.currentStage=field.stage;
        game.stagePicker.reset();
        deliver(fieldPacket());
      }
      return;
    }
    case "move":
      return;
    case "attack":
      damageMonster(message.target);
      break;
    case "shot":
      break;
    case "clanInfo":
      if (globalThis.__localSession.presence) await globalThis.__localSession.presence.refresh();
      break;
    case "clanLeave":
    case "clanDisband":
    case "clanKick":
    case "clanAnswer":
    case "clanApply":
      deliver({
        t: "clanResult",
        ok: false,
        text: isAdmin
          ? "A Staff pertence permanentemente ao clã Staff."
          : "O clã Staff é reservado a ADM e GM.",
      });
      break;
    case "socialOpen":
      deliver({
        t: "social",
        friends: [],
        blocks: [],
        clan: globalThis.__localSession.presence?.status?.clan?.members ?? [],
      });
      break;
    case "sortBag": {
      const sorted = organizeBag(inv.bag);
      if (sorted) inv.bag = sorted;
      else notice("Não foi possível organizar sem perder itens. Libere espaço na bolsa.");
      recalculate();
      break;
    }
    case "swapBag":
      [inv.bag, inv.bagB] = [inv.bagB, inv.bag];
      inv.bagPage = inv.bagPage === 1 ? 0 : 1;
      deliver({ t: "inventory", inv, bagAck: message.seq });
      break;
    case "swapSet":
      {const next={...inv.equip,weapon:inv.equipB?.weapon,shield:inv.equipB?.shield};
      for(const slot of ['weapon','shield'])if(next[slot]){const error=equipmentError(next[slot],slot,stats,next,B.itemClass);if(error)return notice(error);}}
      swapWeaponSet(inv);
      recalculate();
      deliver({ t: "inventory", inv, swapAck: message.seq });
      break;
    case "moveItem": {
      const record = inv.bag.find((p) => p.item.uid === message.uid);
      if (record && canPlace(inv.bag, record.item, message.x, message.y, record))
        Object.assign(record, { x: message.x, y: message.y });
      recalculate();
      break;
    }
    case "beltMove": {
      const { from, index } = message;
      if (![from, index].every((n) => Number.isInteger(n) && n >= 0 && n < 3)) break;
      [inv.belt[from], inv.belt[index]] = [inv.belt[index], inv.belt[from]];
      break;
    }
    case "beltClear": {
      const index = message.index;
      if (!Number.isInteger(index) || index < 0 || index > 2) break;
      if (inv.belt[index] && addBag(inv.belt[index])) inv.belt[index] = null;
      else if (inv.belt[index]) notice("Sem espaço na bolsa.");
      break;
    }
    case "beltSet": {
      const bag = inv.bag.some((p) => p.item.uid === message.uid) ? inv.bag : inv.bagB;
      const index = message.index,
        at = bag.findIndex((p) => p.item.uid === message.uid);
      if (!Number.isInteger(index) || index < 0 || index > 2 || at < 0) break;
      const record = bag[at],
        old = inv.belt[index];
      if (record.item.slot !== "POTION") break;
      if (old?.code === record.item.code && !!old.premiumManaged === !!record.item.premiumManaged) {
        if(old.count+record.item.count>9999)return notice('Limite de 9999 poções por pilha.');
        old.count += record.item.count;
        bag.splice(at, 1);
        updateQuests("belt",{});
        break;
      }
      bag.splice(at, 1);
      if (old && !addBag(old)) {
        bag.splice(at, 0, record);
        notice("Sem espaço na bolsa.");
        break;
      }
      inv.belt[index] = record.item;
      updateQuests("belt",{});
      break;
    }
    case "useItem": {
      const item = findItem(message.uid);
      if(item?.code===GM_POTION){try{await gmOperation("activate",{uid:item.uid});}catch(e){notice(e.message);}break;}
      if (item?.slot === "ECORE") {
        const destination = { EC101: 3, EC104: 21 }[item.code];
        if (destination == null) return notice("Este tipo de core ainda não tem destino disponível.");
        if (game.dead || stats.hp <= 0) return notice("Não é possível usar core enquanto estiver morto.");
        const unit = { ...item, count: 1 };
        consume(item);
        recalculate();
        try { await gameFeatures.travel(destination); }
        catch (error) {
          const remaining = findItem(unit.uid);
          if (remaining) remaining.count++;
          else if (!addBag(unit)) throw Error("Não foi possível restaurar o core: " + error.message);
          recalculate(); save(true);
          notice("Core preservado: " + error.message);
        }
        return;
      }
      if (item?.slot === "FORCEORB") {
        const force = B.forceInfo(item.code);
        if (!force || stats.level < force.level[0] || stats.level > force.level[1])
          return notice("Force Orb incompatível com seu nível.");
        if (activeForce && activeForce.expiresAt > serverNow() / 1000)
          return notice("Aguarde a Força atual terminar antes de usar outra.");
        if(item.premiumManaged){
          if(pendingPremiums.has(item.code))return;pendingPremiums.add(item.code);
          try{const result=await postLocal('/api/local/premium/consume',{code:item.code,requestId:requestId()});applyWallet(result.wallet);}finally{pendingPremiums.delete(item.code);}
        }else consume(item);
        activeForce = { code: item.code, expiresAt: serverNow() / 1000 + force.seconds };
        recalculate();
        publishBuffs();
        break;
      }
      if (item?.premiumManaged && item.slot !== "COSTUME" && !item.restore) {
        if (pendingPremiums.has(item.code)) return;
        pendingPremiums.add(item.code);
        try {
          const result = await postLocal("/api/local/premium/activate", {
            job:characterClass.job,generation:characterGeneration,
            code: item.code,
            requestId: requestId(),
          });
          applyWallet(result.wallet);
          notice(result.message);
          save();
        } catch (error) {
          notice(error.message);
        } finally {
          pendingPremiums.delete(item.code);
        }
        break;
      }
      if (!item?.restore) return;
      const potionKind=item.restore.life?'life':item.restore.mana?'mana':'stamina';
      if(!potionCanUse(potionReady,potionKind,performance.now()/1000,balanceRules))return notice('Aguarde 2 segundos para usar outra poção deste tipo.');
      if (item.premiumManaged) {
        if (pendingPremiums.has(item.code)) return;
        pendingPremiums.add(item.code);
        try {
          const result = await postLocal("/api/local/premium/consume", {
            code: item.code,
            requestId: requestId(),
          });
          applyWallet(result.wallet);
        } catch (error) {
          notice(error.message);
          return;
        } finally {
          pendingPremiums.delete(item.code);
        }
      }
      let which;
      if (item.restore.life) {
        stats.hp = Math.min(stats.hpMax, stats.hp + item.restore.life[0]);
        which = "life";
      }
      if (item.restore.mana) {
        stats.mp = Math.min(stats.mpMax, stats.mp + item.restore.mana[0]);
        which = "mana";
      }
      if (item.restore.stamina) {
        stats.sp = Math.min(stats.spMax, stats.sp + item.restore.stamina[0]);
        which = "stamina";
      }
      registerPotion(potionReady,potionKind,performance.now()/1000,balanceRules);
      const usedFromBelt = inv.belt.includes(item);
      if (!item.premiumManaged) consume(item);
      deliver({ t: "fx", kind: "potion", name: hero.name, which, x: game.pos.x, z: -game.pos.z });
      updateQuests("use", { belt: usedFromBelt, potion: item.slot === "POTION" });
      recalculate();
      break;
    }
    case "costume":
      if (typeof message.on === "boolean") inv.costumeOn = message.on;
      if (typeof message.always === "boolean") inv.costumeAlways = message.always;
      recalculate();
      break;
    case "equip": {
      const index = inv.bag.findIndex((p) => p.item.uid === message.uid);
      if (index < 0) return;
      const record = inv.bag[index];
      if (
        record.item.slot === "COSTUME" &&
        !wallet.stock.some((p) => p.code === record.item.code && p.quantity > 0)
      )
        return notice("Compre esse traje no Item Shop antes de equipar.");
      const slots = B.itemSlots(record.item);
      const slot = message.slot ?? slots.find((s) => !inv.equip[s]) ?? slots[0];
      const checkedEquip =
        slot === "shield" && inv.equip.weapon?.slot === "WEAPON_TWO"
          ? { ...inv.equip, weapon: undefined }
          : inv.equip;
      const error = equipmentError(record.item, slot, stats, checkedEquip, B.itemClass);
      if (error) {
        recalculate();
        return notice(error);
      }
      const backup = clone(inv);
      inv.bag.splice(index, 1);
      const old = inv.equip[slot];
      if (old && !addBag(old)) {
        Object.assign(inv, backup);
        recalculate();
        return notice("Sem espaço na bolsa.");
      }
      if (slot === "weapon" && record.item.slot === "WEAPON_TWO" && inv.equip.shield) {
        if (!addBag(inv.equip.shield)) {
          Object.assign(inv, backup);
          recalculate();
          return notice("Sem espaço para guardar o escudo.");
        }
        delete inv.equip.shield;
      }
      if (slot === "shield" && inv.equip.weapon?.slot === "WEAPON_TWO") {
        if (!addBag(inv.equip.weapon)) {
          Object.assign(inv, backup);
          recalculate();
          return notice("Sem espaço para guardar a arma de duas mãos.");
        }
        delete inv.equip.weapon;
      }
      inv.equip[slot] = record.item;
      updateQuests('equip',{});
      recalculate();
      break;
    }
    case "unequip": {
      const item = inv.equip[message.slot];
      if (!item) break;
      const positioned = Number.isInteger(message.x) && Number.isInteger(message.y);
      const position = positioned
        ? canPlace(inv.bag, item, message.x, message.y) && { x: message.x, y: message.y }
        : findSpace(item);
      if (position) {
        inv.bag.push({ ...position, item });
        delete inv.equip[message.slot];
      } else notice("Esse espaço não comporta o item.");
      recalculate();
      break;
    }
    case "buy": {
      const npc = npcs.find((n) => n.id === message.npcId),
        def = definitions.get(message.code),
        count = Math.floor(number(message.count, 1, 1, 99));
      if (!npc?.shop?.includes(message.code) || !def) return;
      if (Math.hypot(game.pos.x - npc.x, -game.pos.z - npc.z) > 500)
        return notice("Aproxime-se do vendedor.");
      const cost = def.price * count;
      if (stats.gold < cost) return notice("Ouro insuficiente.");
      const backup = clone(inv.bag);
      const quantity = def.slot === "POTION" ? 1 : count;
      for (let n = 0; n < quantity; n++) {
        if (!addBag(instance(message.code, def.slot === "POTION" ? count : 1))) {
          inv.bag = backup;
          recalculate();
          return notice("Sem espaço no inventário.");
        }
      }
      stats.gold -= cost;
      updateQuests('buy',{});
      recalculate();
      notice(`Comprou ${count} × ${def.name}.`);
      break;
    }
    case "sell": {
      const index = inv.bag.findIndex((p) => p.item.uid === message.uid);
      if (index < 0) return;
      const npc = npcs.find((n) => n.id === message.npcId && n.services?.includes("shop"));
      if (!npc || Math.hypot(game.pos.x - npc.x, -game.pos.z - npc.z) > 500)
        return notice("Aproxime-se do vendedor.");
      const error = saleError(inv.bag[index].item);
      if (error) return notice(error);
      const [p] = inv.bag.splice(index, 1);
      stats.gold += salePrice(p.item);
      updateQuests('sell',{});
      recalculate();
      break;
    }
    case "chat":
      if (typeof message.text === "string" && message.text.trim().startsWith("/")) {
        const commandKey = message.text.trim().toLowerCase();
        if (pendingCommands.has(commandKey)) return;
        pendingCommands.add(commandKey);
        try {
          const name = canonicalCommand(message.text.trim().slice(1).split(/\s+/)[0]);
          const safe = [
            "ajuda",
            "habilidades",
            "itens",
            "monstros",
            "mapas",
            "pos",
            "salvar",
            "diagnostico",
            "reconectar",
            "skins",
            "drops",
            "loja",
          ];
          if (!isAdmin && !safe.includes(name)) throw Error("Comando reservado ao administrador.");
          if (isAdmin) {
            const response = await fetch("/api/local/gm", {
              priority: "high",
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: message.text.trim().split(/\s+/)[0] }),
            });
            if (!response.ok) throw Error("Sua sessão de administrador expirou. Entre novamente.");
          }
          const result = await adminCommand(message.text);
          if (result)
            for (const line of result.split("\n")) notice(`[${isAdmin ? "GM" : "Guia"}] ${line}`);
        } catch (error) {
          notice(`[Sistema] Erro: ${error.message}`);
        } finally {
          pendingCommands.delete(commandKey);
        }
        break;
      }
      if (globalThis.__localSession.online) {
        try {
          await globalThis.__localSession.online.chat(message.text, message.channel ?? "normal");
        } catch (e) {
          notice(e.message);
        }
      } else notice("Aguarde a conexão com o mundo.");
      break;
    case "stat":
    case "statAdd":
    case "addStat": {
      const previousPoints=stats.statPoints;
      if (!allocateStat(stats, message.stat ?? message.attr, message.n, statHistory)) return;
      updateQuests("stat",{count:previousPoints-stats.statPoints});
      recalculate();
      break;
    }
    case "undoStat":
      if (!undoStat(stats, inv.equip, statHistory))
        return notice("Não há alteração que possa ser desfeita com o equipamento atual.");
      recalculate();
      break;
    case "statCommit":
      statHistory.length = 0;
      break;
    case "respawn": {
      if (!game?.dead || !["field", "town"].includes(message.where)) return;
      if (economyBusy || pendingLoot)
        return notice("Aguarde a confirmação dos drops antes de renascer.");
      const destination =
        message.where === 'field' && ![30,32].includes(field.id) ? field.id : characterClass.tribe === 'morion' ? 21 : 3;
      stats.hp = stats.hpMax;
      stats.mp = stats.mpMax;
      stats.sp = stats.spMax;
      if (!save()) return notice("Não foi possível salvar antes de renascer.");
      await sendState(JSON.parse(localStorage.getItem(saveKey)));
      await globalThis.__localSession.online?.dispose();
      location.search = `?classe=${hero.jobCode}&mapa=${destination}`;
      return;
    }
    case "restart":
      location.search = `?classe=${hero.jobCode}&mapa=${characterClass.tribe === "morion" ? 21 : 3}`;
      return;
    case "questList":
      deliver({ t: "quests", list: questViews() });
      break;
    case "questTravelReq": {
      const q=questViews().find(q=>q.id===message.id);
      const o=q?.objectives.find(o=>o.done<o.need);
      const map=o?.target?.field??o?.maps?.[0];
      if(!q||q.state==='available'||!Number.isInteger(map))return notice('Escolha uma missão ativa com destino conhecido.');
      if(q.id.startsWith('rank.')&&o.type==='rankDuel')return notice('Inicie o duelo no Mestre de Habilidades.');
      if(map===field.id)return notice('O objetivo está neste mapa. Consulte o Guia de Missões.');
      await gameFeatures.travel(map);return;
    }
    case "questUiEvent":
      updateQuests("ui", message.name);
      break;
    case "questTake": {
      const quest = questViews().find((q) => q.id === message.id);
      if (quest) {
        if(quest.id.startsWith('rank.'))return notice('Aceite o desafio no Mestre de Habilidades.');
        accepted.add(quest.id);
        deliver({ t: "quests", list: questViews() });
      }
      break;
    }
    case "questTurnIn":
      completeQuest(message.id);
      break;
    case "questAbandon":
      accepted.delete(message.id);
      deliver({ t: "quests", list: questViews() });
      break;
    case "questTips":
    case "supportSummary":
    case "npcClose":
    case "perf":
    case "clientMode":
    case "myShopViewClose":
    case "charCfg":
    case "autoHunt":
    case "onboard":
      break;
    default:
      if (!message.t.startsWith("perf") && !message.t.startsWith("afk")) {
        console.info("[local:unsupported]", message.t);
        notice("Este serviço do servidor ainda não foi reconstruído na sessão local.");
      }
  }
  save();
}
conn.sendGame = (message) => {
  if (mapTravel?.busy) return;
  if(!message||typeof message.t!=='string')return notice('Ação inválida.');
  if (economyUncertain)
    return notice("Recarregue para recuperar a operação confirmada pelo servidor.");
  if (economyBusy && !["move", "shot", "field"].includes(message.t))
    return notice("Aguarde a operação do inventário terminar.");
  if (message.t !== "chat" && conn.onGameSend?.(message) === false) return;
  queueMicrotask(async () => {
    if(economyUncertain)return notice('Recarregue para recuperar a operação confirmada pelo servidor.');
    if(economyBusy&&!['move','shot','field'].includes(message.t))return notice('Aguarde a operação do inventário terminar.');
    try {
      await handle(message);
    } catch (error) {
      console.error("[local service]", error);
      notice("Não foi possível processar esta ação local.");
    }
  });
};
conn.send = (packet) => {
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  if (view.getUint32(4, true) === 1212645123)
    queueMicrotask(() => npcTalk(view.getUint32(12, true), view.getInt32(8, true) === 1));
};
conn.close = () => save();

function spawnMapPopulation() {
  let seed = field.id + 1337;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const population = spawnData.stages[field.stage];
  const candidates = wiki.monsters.filter((m) => m.maps.includes(field.id));

  if (population && candidates.length) {
    for (const zone of population.zones) {
      for (let i = 0; i < Math.min(zone.n, 12); i++) {
        const weights = population.monsters.filter((m) => m.pct > 0);
        let pick = random() * weights.reduce((sum, m) => sum + m.pct, 0),
          selected = weights[0];
        for (const weight of weights) {
          pick -= weight.pct;
          if (pick <= 0) {
            selected = weight;
            break;
          }
        }
        const definition = balanceMonster(candidates.find((m) => m.name === selected?.name) ?? candidates[0],balanceRules);
        const angle = random() * Math.PI * 2,
          r = Math.sqrt(random()) * zone.r * 0.7;
        const x = zone.x + Math.cos(angle) * r,
          z = zone.z + Math.sin(angle) * r;
        const position = game.ground.spawnPoint(x, -z);
        if (!position) continue;
        const record = {
          id: ++nextPopulationId,
          name: definition.name,
          level: definition.level,
          model: definition.model
            .replace(/\\/g, "/")
            .replace(/\.[^/.]+$/, "")
            .toLowerCase(),
          x: position.x,
          y: position.y,
          z: -position.z,
          angle: 0,
          hp: definition.hp,
          hpMax: definition.hp,
          motion: "stand",
          seq: 0,
          body: 20,
          definition,
          nextAttack: 0,
        };
        monsters.set(record.id, record);
      }
    }
    deliver({
      t: "monsters",
      add: [...monsters.values()].map(publicMonster),
      ts: performance.now() / 1000,
    });
  }

}
function calibrateMapPortals() {
  for (const portal of mapLinks.portals.filter(p => p.fromField === field.id)) {
    const floor = game.ground.spawnPoint(portal.x, -portal.z);
    portal.disabled = !floor;
    if (floor) portal.floorY = floor.y;
  }
}
function fieldPacket() {
  return { t: "fields", current: field.id,
    stages: walkingStages(fieldData.fields, field.id).map(f => ({ ...f, bgm: f.village ? "town2" : "forest" })), gates: [] };
}
async function activateMap(next) {
  const target = fieldData.fields.find(f => f.id === next.field);
  nextPopulationId = Math.max(nextPopulationId, ...monsters.keys());
  deliver({ t: "monsters", remove: [...monsters.keys(), ...companions.keys()] });
  deliver({ t: "ground", remove: [...groundDrops.keys()] });
  monsters.clear();
  groundDrops.clear();
  for (const [id, pet] of companions) if (pet.converted) companions.delete(id);
  const seamArrival = !next.portal && forestSeamArrival(field.id, target, game.playerPosition());
  Object.assign(field, target);
  const at = next.portal ? next.position : seamArrival ?? game.playerPosition();
  Object.assign(enter, { fieldId: field.id, stage: field.stage, name: field.name,
    bgm: field.village ? "town2" : "forest", x: at.x, z: at.z, y: null });
  hero.startField = field.id;
  npcs.splice(0, npcs.length, ...mergeNpcRecords(field, wiki.npcs, npcStageData.stages[field.stage])
    .map(n => ({ ...n, y: null, angle: worldFacingAngle(n, enter) })));
  game.attackTarget = game.talkTo = null;
  game.attackHeld = false;
  deliver(fieldPacket());
  deliver({ t: "npcs", npcs });
  if (next.portal || seamArrival) {
    deliver({ t: "teleport", fieldId: field.id, x: at.x, z: at.z, y: null, warp: true });
  }
  await game.stageLoad;
  await game.npcsReady.catch(error => recordDiagnostic(error.message));
  calibrateMapPortals();
  spawnMapPopulation();
  for (const pet of companions.values()) {
    const p = game.ground.spawnPoint(game.pos.x + 55, game.pos.z + 50);
    if (!p) continue;
    Object.assign(pet.state, { x: p.x, y: p.y, z: -p.z });
    if (pet.state.model) deliver({ t: "monsters", add: [pet.state], ts: performance.now() / 1000 });
  }
  deliver({ t: "pets", list: [...companions.values()].filter(p => p.state.model).map(p => ({ id: p.state.id })) });
  pendingMapTravel = null;
  updateQuests("reach", field.id);
  noticeMapProgression();
  publishBuffs();
  globalThis.__localSession.online?.changeMap();
  bossRoulette.resumeMap(spawnData.stages[field.stage]?.zones);
  economyEffects = { xp: 1, discount: 0, successBonus: 0, events: [] };
  refreshEconomy().catch(error => recordDiagnostic(error.message));
  const url = new URL(location.href);
  url.searchParams.set("mapa", String(field.id));
  history.replaceState(history.state, "", url);
  save(true);
  mapBackup = null;
}

const canEnterWalking = target => (isAdmin&&!gameplayTestMode) ||
  stats.level >= (balanceRules.maps?.find(m => m.id === target.id)?.minimum ?? 1);
mapTravel = createMapTravel({
  fields: fieldData.fields, current: field.id, portals: mapLinks.portals,
  canEnter: canEnterWalking, alive: () => stats.hp > 0 && !game?.dead,
  position: () => game?.playerPosition() ?? enter,
  ready: () => !economyBusy && !pendingLoot && !economyUncertain,
  prepare: async landing => {
    mapBackup = { field: { ...field }, enter: { ...enter }, position: game.playerPosition(),
      npcs: [...npcs], monsters: [...monsters], drops: [...groundDrops] };
    await bossRoulette.pauseMap();
    const target = fieldData.fields.find(f => f.id === landing.field);
    if (!game.stageMeshes.has(target.stage))
      await (game.stageLoading.get(target.stage)?.promise ?? game.loadNeighbor(target.stage));
    if (!game.stageInfo.has(target.stage)) throw Error('Não foi possível carregar o terreno de destino.');
    if (landing.portal) {
      game.keys.clear();
      game.target = null;
    }
    pendingMapTravel = landing;
  },
  save: () => save(true), flush: () => stateWrite,
  activate: activateMap,
  rollback: async () => {
    pendingMapTravel = null;
    const backup = mapBackup;
    if (backup) {
      Object.assign(field, backup.field);
      Object.assign(enter, backup.enter);
      npcs.splice(0, npcs.length, ...backup.npcs);
      deliver({ t: "monsters", remove: [...monsters.keys()] });
      deliver({ t: "ground", remove: [...groundDrops.keys()] });
      monsters.clear(); groundDrops.clear();
      for (const [id, m] of backup.monsters) monsters.set(id, m);
      for (const [id, drop] of backup.drops) groundDrops.set(id, drop);
    }
    if (game) {
      game.currentStage = field.stage;
      game.stagePicker.reset();
      deliver(fieldPacket());
      deliver({ t: "npcs", npcs });
      const at = backup?.position ?? enter;
      teleportHere(at.x, at.z);
      deliver({ t: "monsters", add: [...monsters.values()].map(publicMonster), ts: performance.now() / 1000 });
      deliver({ t: "ground", add: [...groundDrops.values()].map(d => d.state) });
    }
    bossRoulette.resumeMap(spawnData.stages[field.stage]?.zones);
    mapBackup = null;
    save(true);
  }, notice,
});
syncPremiumInventory();
recalculate();
conn.gameBacklog.push(
  fieldPacket(),
  skills.snapshot(),
  { t: "pets", list: [] },
  { t: "quests", list: questViews() },
);
publishBuffs();
const loading = B.loading.show();
loading.setStatus("Carregando o mapa e os modelos originais…");
globalThis.__localSession = {
  conn,
  hero,
  enter,
  stats,
  inv,
  field,
  messages,
  monsters,
  groundDrops,
  warehouse,
  skills,
  get kills() {
    return kills;
  },
  save,
  get wallet() {
    return wallet;
  },
  adminState,
};
try {
  const mobile = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  B.settings.set({
    ...B.low(mobile ? "potato" : "low"),
    ...(mobile ? { maxPixelRatio: 1, renderScale: 0.7 } : {}),
  });
  document.body.dataset.localDevice = mobile ? "touch" : "desktop";
  B.state("loading");
  game = await B.Game.create(B.root, conn, hero, () => location.reload());
  mountStableCamera(game);
  globalThis.__localSession.game = game;
  game.skillSlotStore = () =>
    `freeston-skills-${account.username}-${characterClass.job}-${characterGeneration}`;
  game.skillSlots = { left: null, right: null };
  game.skillSlotsRestored = false;
  game.restoreSkillSlots();
  for (const side of ["left", "right"]) {
    const id = stored?.selectedSkills?.[side];
    if (skills.snapshot().skills.some((s) => s.id === id && s.level > 0 && !s.passive))
      game.setSkillSlot(side, id);
  }
  globalThis.__localSession.ui = B.ui(game, conn, hero);
  B.Runtime.set(game);
  mountLocalSkillCasting(game,()=>!!field.village);
  mountGmMovement();
  syncGm();
  B.state("field");
  await game.warmedUp(() => loading.setStatus("Preparando as texturas originais…"));
  skills.publish();
  addEventListener("visibilitychange", () => {
    if (!document.hidden) skills.tickCooldowns();
  });
  loading.hide();
  document.title = "FREEston Tale";
  brandInterface();
  mountLocalMenu();
  let customSkinState=null;
  const customCatalog=await get('/api/local/custom-skins');
  globalThis.__localSession.customSkins=mountCustomSkins({B,game,own:()=>customSkinState,inventory:()=>inv.equip,catalog:customCatalog.skins,peers:()=>globalThis.__localSession.online?.peers()??[]});
  globalThis.__localSession.skinShop = mountSkinShop({
    onApply:value=>{customSkinState=value;},
    preview:skin=>openSapphirePreview(B,skin),
    generation: characterGeneration,
    game,
    hero,
    deliver,
    save,
    flush: () => stateWrite,
    refreshWallet,
    notice,
  });
  globalThis.__localSession.presence = mountStaffPresence({
    game,
    bridge: B,
    fetchCommunity: () => get(`/api/local/community?classe=${characterClass.job}`),
    deliver,
  });
  await globalThis.__localSession.presence.ready;
  globalThis.__localSession.online = mountOnlineSession({
    generation: characterGeneration,
    game,
    hero,
    stats,
    field,
    adminState,
    deliver,
    notice,
    onSupport: event => skills.receiveSupport?.(event),
  });
  await globalThis.__localSession.online.ready;
  calibrateMapPortals();
  globalThis.__localSession.mapTravel = mapTravel;
  setInterval(() => mapTravel.tick(), 150);
  skills.restoreCompanions?.();
  addEventListener(
    "keydown",
    (event) => {
      if (
        event.code !== "F9" ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.target?.closest?.("input,textarea,select,[contenteditable=true]")
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showShop().catch((e) => notice(e.message));
    },
    true,
  );
  globalThis.__localSession.release = watchRelease({
    revision: loadedBuild.revision,
    save: async () => {
      if (!save()) throw Error("Armazenamento indisponível.");
      await sendState(JSON.parse(localStorage.getItem(saveKey)));
    },
  });
  updateQuests("reach", field.id);
  spawnMapPopulation();
  await refreshEconomy();
  setInterval(()=>refreshEconomy().catch(e=>recordDiagnostic(e.message)),5000);
  gameFeatures.start();
  bossRoulette.start();
  const monsterTimeline = createMonsterTimeline();
  setInterval(() => {
    const paused = document.hidden || !game || game.dead || mapTravel?.busy;
    const combat = monsterTimeline.sample(game?.time ?? 0, paused);
    if (paused) return;
    const now = performance.now();
    const dt = combat.dt;
    monsterTimeline.drain(combat.now);
    faceNearbyNpcs(
      game.npcs.filter((view) => npcs.some((entry) => entry.id === view.id)),
      game.pos,
      game.time,
    );
    const update = [];
    for (const monster of monsters.values()) {
      if(monster.gmAlly){
        if(monster.hp<=0 || field.village || now < (monster.nextAllyAttack??0))continue;
        const enemies=[...monsters.values()].filter(m=>m!==monster && !m.gmAlly && !m.owner && !m.sharedBoss && m.hp>0 && Math.hypot(game.pos.x-m.x,-game.pos.z-m.z)<1600);
        enemies.sort((a,b)=>Math.hypot(monster.x-a.x,monster.z-a.z)-Math.hypot(monster.x-b.x,monster.z-b.z));
        const enemy=enemies[0];if(!enemy)continue;
        const distance=Math.hypot(monster.x-enemy.x,monster.z-enemy.z);
        if(distance>150){
          const x=enemy.x+(monster.x-enemy.x)/distance*95,z=enemy.z+(monster.z-enemy.z)/distance*95;
          const ground=game.ground.spawnPoint(x,-z);
          if(ground){monster.x=ground.x;monster.y=ground.y;monster.z=-ground.z;monster.seq++;update.push({id:monster.id,x:monster.x,y:monster.y,z:monster.z,seq:monster.seq,motion:'walk'});}
        }
        monster.nextAllyAttack=now+1200;
        if(Math.hypot(monster.x-enemy.x,monster.z-enemy.z)<240){
          monster.seq++;update.push({id:monster.id,motion:'attack',seq:monster.seq});
          damageMonster(enemy.id,1,100000,{fixedDamage:Math.max(100,Math.ceil(enemy.hpMax/3)),noLeech:true,sourceId:monster.id});
        }
        continue;
      }
      const timing = nativeMonsterTiming(game.monsters.views.get(monster.id)?.model);
      const step = stepMonster(monster, {
        attackDuration: timing.duration,
        attackNow: combat.now,
        now,
        dt,
        player: { x: game.pos.x, z: -game.pos.z },
        safe: !!field.village,
        disabled: adminState.frozen || adminState.hidden || adminState.fly || stats.stealth,
        ground: (x, z) => {
          const p = game.ground.spawnPoint(x, -z);
          return p && { x: p.x, y: p.y, z: -p.z };
        },
      });
      if (!step) continue;
      update.push(step.update);
      if (!step.attack || adminState.god || gmSheltomActive()) continue;
      const attackSeq = monster.seq;
      monsterTimeline.schedule(combat.now, timing.hit, () => {
        if (
          mapTravel?.busy || monsters.get(monster.id) !== monster ||
          monster.hp <= 0 ||
          monster.owner || monsterControl(monster).stunned || stats.stealth ||
          game.dead ||
          field.village ||
          adminState.god || gmSheltomActive() ||
          adminState.hidden ||
          adminState.fly ||
          adminState.frozen ||
          monster.seq !== attackSeq ||
          Math.hypot(game.pos.x - monster.x, -game.pos.z - monster.z) > 140
        )
          return;
        const reduction=monsterControl(monster).attackReductionPercent;
        const hit = incomingHit({...monster.definition,attack:monster.definition.attack.map(n=>Math.floor(n*(1-reduction/100)))}, stats, skillData.rules.accuracy, Math.random, {defenseCap:.35});
        let amount = hit.amount;
        if (amount > 0 && stats.manaShield && stats.mp > 0) {
          const absorbed = Math.min(stats.mp, Math.floor((amount * stats.manaShield) / 100));
          stats.mp -= absorbed;
          amount -= absorbed;
        }
        stats.hp = Math.max(0, Math.min(stats.hpMax, stats.hp - amount + (hit.heal ?? 0)));

        deliver({
          t: "damage",
          from: monster.id,
          to: 0,
          amount,
          hp: stats.hp,
          kind: hit.kind,
          atk: true,
        });
        const reflected =
          stats.retaliationFlat +
          (monster.definition.undead ? Math.floor((amount * stats.reflection) / 100) : 0);
        if (amount > 0 && reflected > 0)
          damageMonster(monster.id, 1, 800, { fixedDamage: reflected, noLeech: true });
        if (stats.hp === 0) {
          deliver({ t: "dead", field: characterClass.tribe === "morion" ? 21 : 3 });
          save();
        }
      });
    }
    if (update.length) deliver({ t: "monsters", update, ts: now / 1000 });
  }, 200);
  setInterval(() => {
    if (document.hidden || !game || game.dead || mapTravel?.busy) return;
    skills.tickCooldowns();
    skills.expire();
    updateQuests("skillSecond",{codes:skills.buffs().map(b=>b.code.replace(/^skill:/,""))});
    if (activeForce && activeForce.expiresAt <= serverNow() / 1000) {
      activeForce = null;
      recalculate();
      publishBuffs();
      save();
    }
    let petChanged = false;
    for (const [id, pet] of companions) {
      if (performance.now() > pet.until || (!pet.converted && !skills.buffs().some(b=>b.code==='skill:'+pet.code))) {
        companions.delete(id);
        if(pet.converted){restoreConversionHealth(pet.state);delete pet.state.owner;pet.state.seq++;deliver({t:'monsters',remove:[id]});deliver({t:'monsters',add:[publicMonster(pet.state)]});}
        else deliver({ t: "monsters", remove: [id] });
        petChanged = true;
        continue;
      }
      const target = game.attackTarget?.state?.id;
      const foe = monsters.get(target);
      if (foe?.hp > 0 && !foe.owner && Math.hypot(foe.x-game.pos.x,foe.z+game.pos.z)<=(pet.definition?.range??600) && performance.now() > pet.next) {
        pet.next = performance.now() + (pet.definition?.interval[pet.skill-1]??1.8)*1000;
        damageMonster(foe.id, pet.definition?1:0.3 + pet.skill * 0.1, 800, { noLeech: true,magic:true,skillCode:pet.code,damageRange:pet.definition?.damage[pet.skill-1] });
      }
      if (pet.state.model && Math.hypot(pet.state.x - game.pos.x, pet.state.z + game.pos.z) > 140) {
        const p = game.ground.spawnPoint(game.pos.x + 55, game.pos.z + 50);
        if (p) {
          Object.assign(pet.state, { x: p.x, y: p.y, z: -p.z });
          deliver({ t: "monsters", update: [pet.state], ts: performance.now() / 1000 });
        }
      }
    }
    if (petChanged) deliver({ t: "pets", list: [...companions.values()].filter(p=>p.state.model).map(p=>({id:p.state.id})) });
    protectGm(stats,gmSheltomActive());
    stats.hp = Math.min(stats.hpMax, stats.hp + (stats.hpRegen ?? 0));
    stats.mp = Math.min(stats.mpMax, stats.mp + 1 + (stats.mpRegen ?? 0));
    stats.sp = Math.min(stats.spMax, stats.sp + 2 + (stats.spRegen ?? 0));
    deliver({ t: "stats", stats });
  }, 1000);
  if(isAdmin)gmOperation("status").catch(e=>recordDiagnostic(e.message));
  setInterval(save, 2000);
  setInterval(() => claimLevelKits(), 5000);
  claimLevelKits();
  setInterval(async () => {
    if (document.hidden) return;
    try {
      const next = await get("/api/local/game/rules");
      const changed = next.version !== controlRules.version;
      controlRules = next;
      if (changed) deliver({ t: "inventory", inv });
    } catch (error) {
      recordDiagnostic(error.message);
    }
  }, 5000);
  setInterval(() => {
    if (!document.hidden) refreshWallet().catch((e) => recordDiagnostic(e.message));
  }, 10000);
  addEventListener("focus", () => refreshWallet().catch((e) => recordDiagnostic(e.message)));
  publishBuffs();
  addEventListener("beforeunload", () => {
    if (economyUncertain) return;
    save();
    try {
      const cached = localStorage.getItem(saveKey);
      if (cached) sendState(JSON.parse(cached), true).catch(() => {});
    } catch {
      /* Browser storage can be unavailable. */
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
  });
  notice(
    "Cliente original em sessão local. V: inventário · C: status · Q: missões. Use /ajuda para comandos e /habilidades para o livro de habilidades.",
  );
  if(gameplayTestMode)notice("Teste de jogabilidade: apenas ataque +50 e EXP GM. Defesa, poções e custos de MP/RES seguem as regras normais.");
  document.body.dataset.localReady = "true";
} catch (error) {
  console.error("[local boot]", error);
  loading.setStatus("Falha ao abrir o cliente original: " + error.message);
  document.body.dataset.localError = error.message;
}

function mountLocalMenu() {
  const style = document.createElement("style");
  style.textContent =
    ".sup-launch{top:var(--local-toolbar-bottom,10px)!important}.local-controls{position:fixed;top:10px;left:10px;z-index:50;display:flex;flex-wrap:wrap;gap:6px;align-items:center;max-width:calc(100vw - 230px);padding:7px 10px;color:#eedaae;background:#171813dc;border:1px solid #ac9158;border-radius:3px;font:11px Georgia,serif}.local-controls label{display:flex;gap:5px;align-items:center}.local-controls select,.local-controls button{font:11px Georgia,serif;color:#eedaae;background:#27271e;border:1px solid #7d714e;padding:4px;border-radius:2px}.local-controls>span{color:#c5bc97;margin-right:4px}@media(max-width:700px){.local-controls{max-width:calc(100vw - 20px);top:4px;left:4px;font-size:9px}.local-controls select{max-width:130px}}";
  document.head.append(style);
  const menu = document.createElement("div");
  menu.className = "local-controls";
  for (const type of [
    "pointerdown",
    "mousedown",
    "mouseup",
    "touchstart",
    "touchend",
    "wheel",
  ])
    menu.addEventListener(type, (event) => event.stopPropagation());
  menu.addEventListener("keydown", event => {
    if (event.target.closest("input,select,textarea,[contenteditable=true]") ||
        ["Enter"," ","Spacebar"].includes(event.key)) event.stopPropagation();
  });
  const caption = document.createElement("span");
  caption.textContent = `FREEston Tale ${loadedBuild.version} · ${stats.name} (${account.username}) · ${account.role === "admin" ? "Administrador" : account.role === "gm" ? "GM" : "Jogador"}`;
  caption.textContent += ` · ${characterClass.name}`;
  menu.append(caption);
  const charactersButton = document.createElement("button");
  charactersButton.textContent = "Personagens";
  async function leaveCharacter(logoutAccount = false) {
    if (economyUncertain) throw Error("Há uma operação sem confirmação. Recarregue antes de sair.");
    if (economyBusy || pendingLoot)
      throw Error("Aguarde a confirmação das operações antes de sair.");
    if (!save()) throw Error("Não foi possível salvar. Tente novamente antes de sair.");
    const state = localStorage.getItem(saveKey);
    if (state) await sendState(JSON.parse(state));
    await globalThis.__localSession.online?.dispose();
    if (logoutAccount) {
      const response = await fetch("/api/local/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw Error("Não foi possível encerrar a sessão.");
    }
    location.replace(logoutAccount ? "/" : "/personagens");
  }
  charactersButton.onclick = () => leaveCharacter().catch((error) => notice(error.message));
  menu.append(charactersButton);
  for (const [label, key] of [
    ["Bolsa", "inventory"],
    ["Status", "status"],
    ["Habilidades", "skill"],
  ]) {
    const button = document.createElement("button");
    button.textContent = label;
    button.onclick = () => {
      if (compactMedia.matches) compact.open = false;
      const windows = globalThis.__localSession.ui.windows;
      const route = key === "skill" ? "skills" : key;
      if (!windows.hotkeyRoute?.(route, { repeat: false })) windows.get(key)?.toggle();
    };
    menu.append(button);
  }
  const helpButton = document.createElement("button");
  helpButton.textContent = "Ajuda";
  helpButton.onclick = () => {
    if (compactMedia.matches) compact.open = false;
    adminCommand("/ajuda");
  };
  menu.append(helpButton);
  const shopButton = document.createElement("button");
  shopButton.textContent = "Loja premium";
  shopButton.onclick = () => {
    if (compactMedia.matches) compact.open = false;
    showShop().catch((e) => notice(e.message));
  };
  menu.append(shopButton);
  const saveButton = document.createElement("button");
  saveButton.textContent = "Salvar";
  saveButton.onclick = async () => {
    saveButton.disabled = true;
    try {
      if (economyBusy || pendingLoot)
        throw Error("Aguarde a confirmação das operações antes de salvar.");
      if (!save())
        throw Error("Não foi possível salvar. Recarregue para consultar o estado do servidor.");
      await sendState(JSON.parse(localStorage.getItem(saveKey)));
      notice("Progresso salvo no servidor.");
    } catch (error) {
      notice(error.message);
    } finally {
      saveButton.disabled = false;
    }
  };
  menu.append(saveButton);
  if (isAdmin) {
    const panel = document.createElement("button");
    panel.textContent = "Link do jogo";
    panel.onclick = () => window.open("/painel", "_blank", "noopener");
    menu.append(panel);
  }
  const logout = document.createElement("button");
  logout.textContent = "Sair";
  logout.onclick = () => leaveCharacter(true).catch((error) => notice(error.message));
  menu.append(logout);
  const compact = document.createElement("details");
  compact.className = "local-mobile-menu";
  const summary = document.createElement("summary");
  summary.textContent = `${characterClass.name} · Conta`;
  compact.append(summary);
  const compactMedia = matchMedia("(pointer: coarse), (max-width:700px)");
  compact.open = !compactMedia.matches;
  compactMedia.addEventListener("change", () => {
    compact.open = !compactMedia.matches;
  });
  const nativeQuick = document.querySelector(".m-qbar");
  if (nativeQuick) {
    compact.classList.add("has-native-trigger");
    const trigger = document.createElement("button");
    trigger.className = "m-qbtn local-account-trigger";
    trigger.setAttribute("aria-label", "Conta");
    const icon = document.createElement("i"),
      label = document.createElement("b");
    icon.textContent = "◎";
    label.textContent = "Conta";
    trigger.append(icon, label);
    for (const event of ["pointerdown", "mousedown", "touchstart", "touchend"])
      trigger.addEventListener(event, (e) => e.stopPropagation());
    trigger.onclick = () => {
      compact.open = !compact.open;
    };
    nativeQuick.append(trigger);
    const close = document.createElement("button");
    close.className = "local-account-close";
    close.textContent = "Fechar conta";
    close.onclick = () => {
      compact.open = false;
    };
    menu.prepend(close);
  }
  compact.append(menu);
  document.body.append(compact);
  const placeNativeShortcuts = () => {
    const box=menu.getBoundingClientRect(), small=summary.getBoundingClientRect();
    const bottom=Math.max(box.width ? box.bottom : 0, small.width ? small.bottom : 0);
    document.documentElement.style.setProperty("--local-toolbar-bottom", Math.ceil(bottom+8)+"px");
  };
  const toolbarSize = new ResizeObserver(placeNativeShortcuts);
  toolbarSize.observe(menu); toolbarSize.observe(summary);
  compact.addEventListener("toggle", placeNativeShortcuts);
  addEventListener("resize", placeNativeShortcuts);
  placeNativeShortcuts();
}

if (gameplayTestMode) setInterval(() => {
  console.debug("[playtest:clock]", JSON.stringify({ real: performance.now()/1000,
    simulation: game?.time, motion: game?.player?.motionState, bot: game?.botSelf?.() }));
}, 10000);
