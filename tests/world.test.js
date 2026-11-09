import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, W, H, reachable, adjacentReachable, tileAt, BLOCKING, moveWithCollision, zoneAt } from '../js/world.js';
import { NPCS, HERBS, CHESTS, HEAL_SPOTS, SPAWN, PATROLS } from '../js/data.js';
import { newGame, joinParty } from '../js/game.js';

test('dimensions de la carte', () => {
  assert.equal(MAP.length, H);
  MAP.forEach((r) => assert.equal(r.length, W));
});

test('points d\'intérêt praticables ou accessibles', () => {
  assert.ok(!BLOCKING.has(tileAt(SPAWN.x, SPAWN.z)));
  for (const p of [...HERBS, ...CHESTS, ...PATROLS]) assert.ok(!BLOCKING.has(MAP[p.z][p.x]), `${p.id} sur tuile libre`);
  for (const [id, n] of Object.entries(NPCS)) assert.ok(!BLOCKING.has(MAP[n.z][n.x]), `${id} sur tuile libre`);
});

test('avant le départ : tout le sud est accessible, le canyon est fermé par Lavan', () => {
  const s = newGame();
  const seen = reachable(SPAWN, s);
  for (const id of ['adah', 'tamar', 'ilan', 'noa', 'milka', 'eber', 'lavan']) assert.ok(adjacentReachable(seen, NPCS[id].x, NPCS[id].z), id);
  for (const h of HERBS) assert.ok(seen.has(`${h.x},${h.z}`), h.id);
  assert.ok(adjacentReachable(seen, HEAL_SPOTS[0].x, HEAL_SPOTS[0].z));
  assert.ok(!seen.has('18,5'), 'le camp de Kish est inaccessible avant que Lavan se tasse');
});

test('après Lavan : canyon, source, jarre, camp et porte accessibles', () => {
  const s = newGame(); joinParty(s, 'tamar'); joinParty(s, 'eber'); s.flags.lavanAside = true; s.flags.kishBeaten = true;
  const seen = reachable(SPAWN, s);
  assert.ok(adjacentReachable(seen, HEAL_SPOTS[1].x, HEAL_SPOTS[1].z));
  for (const c of CHESTS) assert.ok(adjacentReachable(seen, c.x, c.z), c.id);
  assert.ok(seen.has('18,5'));
  assert.ok(seen.has('18,1'), 'porte de Shinar');
});

test('collisions : pas de traversée des murs ni de l\'eau', () => {
  const s = newGame();
  const p = moveWithCollision({ x: 5.5, z: 46.6 }, 0, -3, 0.3, s); // vers la maison d'Asher
  assert.ok(p.z > 46, `bloqué devant la maison (${p.z})`);
  const q = moveWithCollision({ x: 31.5, z: 45.5 }, 3, 0, 0.3, s);
  assert.ok(q.x < 33 && q.x > 32, 'bloqué au bord de la rivière');
});

test('zones de rencontre', () => {
  assert.equal(zoneAt(3.5, 21.5), 'champs');
  assert.equal(zoneAt(30.5, 22.5), 'roseaux');
  assert.equal(zoneAt(17.5, 12.5), 'canyon');
  assert.equal(zoneAt(10.5, 45.5), null);
});
