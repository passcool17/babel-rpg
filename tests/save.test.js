import test from 'node:test';
import assert from 'node:assert/strict';
import { save, load, clear, SAVE_KEY, validate } from '../js/save.js';
import { newGame, talk } from '../js/game.js';

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('aller-retour de sauvegarde', () => {
  const st = memStorage();
  const s = newGame(); talk(s, 'adah'); s.pos = { x: 10.5, z: 30.25, dir: 'up' };
  assert.equal(save(s, st), true);
  const l = load(st);
  assert.equal(l.step, s.step);
  assert.deepEqual(l.pos, s.pos);
  assert.equal(l.inv.datte, 5);
  assert.equal(JSON.parse(st.m.get(SAVE_KEY)).v, 1);
});

test('sauvegarde corrompue, version future ou vide : null', () => {
  const st = memStorage();
  assert.equal(load(st), null);
  st.setItem(SAVE_KEY, '{pas du json');
  assert.equal(load(st), null);
  st.setItem(SAVE_KEY, JSON.stringify({ v: 99 }));
  assert.equal(load(st), null);
  st.setItem(SAVE_KEY, JSON.stringify({ ...newGame(), party: ['tamar'] }));
  assert.equal(load(st), null);
});

test('champs manquants complétés', () => {
  const raw = newGame(); delete raw.legends; delete raw.settings; raw.pos = null;
  const v = validate(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(v.legends, []);
  assert.equal(v.settings.quality, 'auto');
  assert.ok(Number.isFinite(v.pos.x));
});

test('stockage indisponible ou qui lance des erreurs', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } };
  assert.equal(save(newGame(), bad), false);
  assert.equal(load(bad), null);
  assert.doesNotThrow(() => clear(bad));
  assert.equal(save(newGame(), null), false);
});
