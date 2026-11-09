import test from 'node:test';
import assert from 'node:assert/strict';
import { QualityGovernor, initialLevel } from '../js/perf.js';

const run = (g, fps, seconds) => { const changes = []; for (let t = 0; t < seconds; t += 1 / fps) { const c = g.update(1 / fps); if (c !== null) changes.push(c); } return changes; };

test('baisse la qualité quand les FPS chutent', () => {
  const g = new QualityGovernor({ start: 3 });
  const ch = run(g, 30, 12);
  assert.ok(ch.length >= 2);
  assert.ok(g.level <= 1);
});

test('remonte prudemment et sans osciller sans fin', () => {
  const g = new QualityGovernor({ start: 1 });
  run(g, 60, 60);
  assert.ok(g.level === 3);
  assert.ok(g.ups <= 2);
});

test('mode manuel figé', () => {
  const g = new QualityGovernor({ start: 3 });
  g.setMode('1');
  assert.equal(g.level, 1);
  assert.deepEqual(run(g, 20, 10), []);
});

test('niveau initial mobile plus léger', () => {
  assert.equal(initialLevel({ coarse: false }), 3);
  assert.ok(initialLevel({ coarse: true, dpr: 3, cores: 8 }) <= 2);
});
