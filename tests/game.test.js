import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, talk, pickHerb, openChest, objective, STEP, bossReady, bossVictory, reachedGate, finishChapter, onDefeat, buy, patrolAhead, defeatPatrol, useHealSpot } from '../js/game.js';
import { PATROLS, HEAL_SPOTS } from '../js/data.js';

test('quête : enchaînement complet des étapes', () => {
  const s = newGame();
  assert.match(objective(s), /Adah/);
  talk(s, 'tamar');
  assert.equal(s.step, STEP.intro, 'Tamar renvoie vers Adah');
  talk(s, 'adah');
  assert.equal(s.step, STEP.tamar);
  assert.equal(s.inv.datte, 5);
  talk(s, 'tamar');
  assert.equal(s.step, STEP.herbes);
  assert.equal(pickHerb(s, 'h1'), true);
  assert.equal(pickHerb(s, 'h1'), false, 'pas deux fois la même herbe');
  assert.match(objective(s), /1\/3/);
  pickHerb(s, 'h2'); pickHerb(s, 'h3');
  assert.equal(s.step, STEP.retour);
  const r = talk(s, 'tamar');
  assert.ok(r.effects.some((e) => e.type === 'join' && e.id === 'tamar'));
  assert.deepEqual(s.party, ['asher', 'tamar']);
  talk(s, 'lavan');
  assert.ok(!s.flags.lavanAside, 'Lavan bloque sans Eber');
  talk(s, 'eber');
  assert.deepEqual(s.party, ['asher', 'tamar', 'eber']);
  assert.ok(s.legends.includes('legende_gibbor'));
  talk(s, 'lavan');
  assert.ok(s.flags.lavanAside);
  assert.equal(s.step, STEP.kish);
  assert.equal(bossReady(s, { x: 18, z: 6 }), false, 'patrouilles d\'abord');
  assert.equal(patrolAhead(s, { x: 18, z: 14.5 }).id, 'p1');
  PATROLS.forEach((p) => defeatPatrol(s, p.id));
  assert.equal(patrolAhead(s, { x: 18, z: 5 }), null);
  assert.equal(bossReady(s, { x: 18, z: 8 }), false);
  assert.equal(bossReady(s, { x: 18, z: 7 }), true);
  bossVictory(s);
  assert.equal(s.step, STEP.porte);
  assert.equal(bossReady(s, { x: 18, z: 7 }), false);
  assert.equal(reachedGate(s, { x: 18, z: 2 }), true);
  finishChapter(s);
  assert.equal(s.step, STEP.fin);
  assert.match(objective(s), /plaines de Shinar/);
});

test('herbes non cueillables avant la demande de Tamar', () => {
  const s = newGame();
  assert.equal(pickHerb(s, 'h1'), false);
});

test('jarres, marchand, points de soin', () => {
  const s = newGame();
  assert.deepEqual(openChest(s, 'j1'), { item: 'datte', qty: 2 });
  assert.equal(openChest(s, 'j1'), null);
  assert.deepEqual(openChest(s, 'j3'), { coins: 30 });
  const c = s.coins;
  assert.equal(buy(s, 'datte'), true);
  assert.equal(s.coins, c - 8);
  s.coins = 0;
  assert.equal(buy(s, 'sel'), false);
  s.members.asher.hp = 1;
  useHealSpot(s, HEAL_SPOTS[1].id);
  assert.equal(s.members.asher.hp, 44);
});

test('défaite : réveil au puits, jamais bloquant', () => {
  const s = newGame();
  s.coins = 100; s.members.asher.hp = 0; s.pos = { x: 18, z: 5 };
  onDefeat(s);
  assert.equal(s.members.asher.hp, 44);
  assert.equal(s.coins, 75);
  assert.ok(s.pos.z > 40);
});

test('les légendes du jeu sont étiquetées comme telles', async () => {
  const { LEGENDS } = await import('../js/data.js');
  for (const l of Object.values(LEGENDS)) assert.ok(['Écrit', 'Légende du jeu'].includes(l.kind));
  assert.ok(Object.values(LEGENDS).some((l) => l.kind === 'Légende du jeu' && /pas un fait|légende|rumeur|méditation/i.test(l.text)));
});
