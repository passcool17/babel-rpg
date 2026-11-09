import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const h = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 10);

test('index.html : chaque module, la feuille de style et le script principal portent le hash à jour', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.ok(html.includes(`src="./js/main.js?v=${h('js/main.js')}"`), 'script principal');
  assert.ok(html.includes(`style.css?v=${h('style.css')}`), 'feuille de style');
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  assert.equal(map.imports.three, `./vendor/three.module.min.js?v=${h('vendor/three.module.min.js')}`);
  for (const f of readdirSync('js').filter((x) => x.endsWith('.js'))) assert.equal(map.imports[`./js/${f}`], `./js/${f}?v=${h(`js/${f}`)}`, f);
});
