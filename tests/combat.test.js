import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, statsFor, levelForXp, physicalDamage, magicDamage, healAmount, createBattle, perform, nextActor, applyBattleResult, enemyChoose, itemUsable, spellsFor } from '../js/combat.js';
import { XP_TABLE, ENEMIES } from '../js/data.js';
import { newGame, joinParty } from '../js/game.js';

const fixed = (v) => () => v;

test('dégâts physiques : formule, minimum 1, défense divise par deux', () => {
  const att = { atk: 12 }, tgt = { def: 4 };
  assert.equal(physicalDamage(att, tgt, fixed(0.5)).amount, 10); // (12-2)*1.0
  assert.equal(physicalDamage({ atk: 1 }, { def: 50 }, fixed(0.5)).amount, 1);
  assert.equal(physicalDamage(att, { def: 4, defending: true }, fixed(0.5)).amount, 5);
  const crit = physicalDamage(att, tgt, (() => { const seq = [0.5, 0.01]; return () => seq.shift(); })());
  assert.equal(crit.crit, true); assert.equal(crit.amount, 15);
});

test('magie et soin', () => {
  assert.equal(magicDamage({ mag: 13 }, { def: 8 }, 9, fixed(0.5)).amount, 20);
  assert.equal(healAmount({ mag: 10 }, 12, fixed(0.5)), 24);
});

test('niveaux et statistiques', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(XP_TABLE[1] - 1), 1);
  assert.equal(levelForXp(XP_TABLE[1]), 2);
  assert.equal(levelForXp(99999), XP_TABLE.length);
  assert.deepEqual(statsFor('asher', 1), { hp: 44, mp: 6, atk: 12, def: 6, mag: 4, spd: 9 });
  assert.equal(statsFor('asher', 3).atk, 18);
  assert.deepEqual(spellsFor('asher', 1), []);
  assert.deepEqual(spellsFor('asher', 2), ['fronde']);
  assert.deepEqual(spellsFor('tamar', 3), ['soin', 'baume']);
});

test('victoire : XP, cuivre, montée de niveau et sorts appris', () => {
  const s = newGame();
  const b = createBattle(s, ['soldat', 'soldat'], { rng: mulberry32(1) });
  b.enemies.forEach((e) => { e.hp = 1; });
  const asher = b.party[0];
  perform(b, asher, { type: 'attack', target: b.enemies[0].uid }, s.inv);
  const ev = perform(b, asher, { type: 'attack', target: b.enemies[1].uid }, s.inv);
  assert.equal(b.outcome, 'victory');
  assert.ok(ev.some((e) => e.type === 'victory'));
  const coins = s.coins;
  const ups = applyBattleResult(s, b);
  assert.equal(s.members.asher.xp, ENEMIES.soldat.xp * 2);
  assert.equal(s.coins, coins + ENEMIES.soldat.coins * 2);
  assert.equal(s.members.asher.level, 2);
  assert.deepEqual(ups, [{ id: 'asher', from: 1, to: 2, newSpells: ['fronde'] }]);
  assert.equal(s.stats.battles, 1);
});

test('défaite quand toute l\'équipe est K.-O.', () => {
  const s = newGame();
  const b = createBattle(s, ['kish'], { rng: mulberry32(2), boss: true });
  b.party[0].hp = 1;
  const ev = perform(b, b.enemies[0], { type: 'attack', target: 'asher' }, s.inv);
  assert.equal(b.outcome, 'defeat');
  assert.ok(ev.some((e) => e.type === 'ko'));
});

test('soin de Tamar, coût en PM et refus sans PM', () => {
  const s = newGame(); joinParty(s, 'tamar');
  const b = createBattle(s, ['chacal'], { rng: mulberry32(3) });
  const [asher, tamar] = b.party;
  asher.hp = 10;
  const ev = perform(b, tamar, { type: 'spell', spell: 'soin', target: 'asher' }, s.inv);
  assert.ok(asher.hp > 10);
  assert.equal(tamar.mp, tamar.maxMp - 4);
  assert.ok(ev.some((e) => e.type === 'heal' && e.target === 'asher'));
  tamar.mp = 0;
  const ev2 = perform(b, tamar, { type: 'spell', spell: 'soin', target: 'asher' }, s.inv);
  assert.ok(ev2.some((e) => e.type === 'fail'));
});

test('sort d\'Eber et tempête touchant tous les ennemis', () => {
  const s = newGame(); s.members.asher.xp = 100; s.members.asher.level = 4; joinParty(s, 'eber');
  const b = createBattle(s, ['chacal', 'chacal', 'serpent'], { rng: mulberry32(4) });
  const eber = b.party.find((p) => p.id === 'eber');
  const ev = perform(b, eber, { type: 'spell', spell: 'tempete' }, s.inv);
  assert.equal(ev.filter((e) => e.type === 'damage').length, 3);
});

test('objets : dattes, sel de réveil, refus des cas invalides', () => {
  const s = newGame(); s.inv.sel = 1;
  const b = createBattle(s, ['chacal'], { rng: mulberry32(5) });
  const a = b.party[0];
  assert.equal(itemUsable('datte', a, s.inv), false); // PV pleins
  a.hp = 5;
  perform(b, a, { type: 'item', item: 'datte', target: 'asher' }, s.inv);
  assert.equal(a.hp, 40);
  assert.equal(s.inv.datte, 2);
  a.hp = 0;
  assert.equal(itemUsable('datte', a, s.inv), false);
  assert.equal(itemUsable('sel', a, s.inv), true);
});

test('fuite : impossible contre le boss, possible ailleurs', () => {
  const s = newGame();
  const boss = createBattle(s, ['kish'], { rng: mulberry32(6), boss: true });
  assert.ok(perform(boss, boss.party[0], { type: 'flee' }, s.inv).some((e) => e.type === 'noflee'));
  assert.equal(boss.outcome, null);
  const b = createBattle(s, ['scorpion'], { rng: fixed(0.01) });
  perform(b, b.party[0], { type: 'flee' }, s.inv);
  assert.equal(b.outcome, 'fled');
});

test('ordre des tours par vitesse et IA de Kish qui appelle des renforts', () => {
  const s = newGame();
  const b = createBattle(s, ['kish'], { rng: fixed(0.1), boss: true });
  const first = nextActor(b);
  assert.ok(first);
  const cmd = enemyChoose(b, b.enemies[0]);
  assert.equal(cmd.type, 'summon');
  perform(b, b.enemies[0], cmd, s.inv);
  assert.equal(b.enemies.length, 2);
  assert.match(b.enemies[1].name, /renfort/);
});
