import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../js/combat.js';
import { ENCOUNTERS, PATROLS, HERBS, HEAL_SPOTS } from '../js/data.js';
import { newGame, talk, pickHerb, STEP, bossReady, bossVictory, reachedGate, finishChapter, useHealSpot, defeatPatrol, onDefeat } from '../js/game.js';
import { runBattle } from './helpers.js';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// Joue le chapitre du début à la fin avec une politique de combat automatique.
export function playChapter(seed, { healAtWell = true, healAtSpring = true } = {}) {
  const rng = mulberry32(seed);
  const s = newGame();
  const log = { battles: 0, defeats: 0 };
  const fight = (enemies, opts = {}) => {
    for (let tries = 0; tries < 5; tries++) {
      const r = runBattle(s, enemies, rng, opts);
      log.battles++;
      if (r.outcome === 'victory') return true;
      log.defeats++;
      onDefeat(s); // réveil au puits, puis on retente
    }
    return false;
  };
  talk(s, 'adah'); talk(s, 'tamar');
  assert.equal(s.step, STEP.herbes);
  for (const h of HERBS) {
    assert.ok(fight(pick(rng, ENCOUNTERS.roseaux.groups)));
    pickHerb(s, h.id);
  }
  if (healAtWell) useHealSpot(s, HEAL_SPOTS[0].id);
  talk(s, 'tamar');
  for (let i = 0; i < 3; i++) assert.ok(fight(pick(rng, ENCOUNTERS.champs.groups)));
  talk(s, 'eber'); talk(s, 'lavan');
  assert.equal(s.step, STEP.kish);
  for (let i = 0; i < 2; i++) assert.ok(fight(pick(rng, ENCOUNTERS.canyon.groups)));
  assert.ok(fight(PATROLS[0].group)); defeatPatrol(s, PATROLS[0].id);
  assert.ok(fight(pick(rng, ENCOUNTERS.canyon.groups)));
  assert.ok(fight(PATROLS[1].group)); defeatPatrol(s, PATROLS[1].id);
  if (healAtSpring) useHealSpot(s, HEAL_SPOTS[1].id);
  assert.ok(bossReady(s, { x: 18, z: 7 }));
  const levelAtBoss = s.members.asher.level;
  let bossTries = 0, won = false, bossRounds = 0;
  while (!won && bossTries < 6) {
    bossTries++;
    const r = runBattle(s, ['kish'], rng, { boss: true });
    if (bossTries === 1) bossRounds = r.battle.round;
    if (r.outcome === 'victory') won = true;
    else {
      // Réveil au puits, puis retour par le canyon : deux combats en chemin, soin à la source.
      onDefeat(s);
      for (let i = 0; i < 2; i++) fight(pick(rng, ENCOUNTERS.canyon.groups));
      useHealSpot(s, HEAL_SPOTS[1].id);
    }
  }
  assert.ok(won, `boss vaincu (graine ${seed})`);
  bossVictory(s);
  assert.ok(reachedGate(s, { x: 18, z: 2 }));
  finishChapter(s);
  return { s, log, levelAtBoss, bossTries, bossRounds };
}

test('le chapitre est terminable sur 40 graines', () => {
  const tries = [];
  for (let seed = 1; seed <= 40; seed++) {
    const r = playChapter(seed);
    assert.equal(r.s.step, STEP.fin);
    assert.ok(r.s.flags.done);
    tries.push(r.bossTries);
  }
  const firstTry = tries.filter((t) => t === 1).length;
  assert.ok(firstTry >= 28, `le boss reste un défi raisonnable : ${firstTry}/40 au premier essai`);
});

test('le boss demande un vrai combat (pas trivial)', () => {
  let rounds = 0, retries = 0;
  for (let seed = 101; seed <= 200; seed++) { const r = playChapter(seed); rounds += r.bossRounds; if (r.bossTries > 1) retries++; }
  assert.ok(rounds / 100 >= 8, `durée moyenne du boss : ${rounds / 100} rondes`);
  assert.ok(retries >= 1 && retries <= 30, `parties qui demandent un 2e essai : ${retries}/100`);
});
