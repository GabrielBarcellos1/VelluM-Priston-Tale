import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {promotionRank} from '../world-quests.mjs';
const game=await readFile(new URL('../game-features.mjs',import.meta.url),'utf8');
const session=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
const npc=await readFile(new URL('../npc-panels.mjs',import.meta.url),'utf8');
const skills=await readFile(new URL('../skill-system.mjs',import.meta.url),'utf8');
test('promotions persist at each tier while retaining legacy quest completion',()=>{
 assert.equal(promotionRank([],1),0);
 assert.equal(promotionRank(['rank.auto.1'],1),1);
 assert.equal(promotionRank(['rank.auto.1','rank.auto.2'],1),2);
 assert.equal(promotionRank(['rank.auto.1','rank.auto.2','rank.auto.3'],1),3);
 assert.equal(promotionRank(['rank.1.tempskron'],1),1);
 assert.equal(promotionRank(['rank.2.2.melee'],1),2);
});
test('20 40 60 level gates and all learned skills are required at master',()=>{
 assert.match(game,/minimum=\[20,40,60\]\[current\]/);
 assert.match(game,/c\.stats\.level<minimum/);
 assert.match(game,/c\.world\.allSkillsThrough\(current\+1\)/);
 assert.match(game,/c\.completed\.add\('rank\.auto\.'\+\(current\+1\)\)/);
 assert.match(game,/await c\.flush\(\)/);
 assert.match(skills,/const rank = \(\) => ctx\.rank\(\)/);
});
test('old evolution quest view and top toolbar are disabled, commands use normal chat',()=>{
 assert.match(session,/function questViews\(\)\s*\{[\s\S]*?return \[\];/);
 assert.match(session,/disableLegacyMissions\(\);/);
 assert.doesNotMatch(session,/\n  mountLocalMenu\(\);/);
 assert.match(session,/slashCommandInProgress \? "normal" : "system"/);
 assert.doesNotMatch(npc,/mountSkillChallenge/);
 assert.match(npc,/Aceitar nova classe/);
});
