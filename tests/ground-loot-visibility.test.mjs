import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const session=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const admin=await readFile(new URL('../economy-admin.mjs',import.meta.url),'utf8');
const features=await readFile(new URL('../game-features.mjs',import.meta.url),'utf8');
const crest=await readFile(new URL('../npc-panels.mjs',import.meta.url),'utf8');
test('loot panel must walk through the native pickup target, not collect instantly',()=>{
  const view=session.slice(session.indexOf('function renderGroundLoot()'),session.indexOf('async function dropBagItem('));
  assert.match(view,/game\.goPickup\(view\)/);
  assert.doesNotMatch(view,/handle\(\{t:'pickup'/);
});
test('class promotion refreshes skills and crown without reloading',()=>{
  const f=features.slice(features.indexOf('  promoted(){'),features.indexOf('  start(){'));
  assert.doesNotMatch(f,/reload/);
  assert.match(f,/mountClassCrest/);
  assert.match(f,/c\.openSkills\(\)/);
  assert.match(crest,/ConeGeometry/);
});
test('physical merchant exposes gold, item shop coins and skins',()=>{
  const section=session.slice(session.indexOf('function npcTalk('),session.indexOf('  } else if (npc.services?.includes("skill"))',session.indexOf('function npcTalk(')));
  assert.match(section,/Itens comuns por ouro/);
  assert.match(section,/Item Shop - itens por coins/);
  assert.match(section,/Skins por coins/);
});
test('exp event shortcut remains opt-in',()=>{
  assert.match(admin,/Preparar evento EXP 2x \(24 horas\)/);
  assert.match(admin,/clique em Salvar evento para ativar/);
});
