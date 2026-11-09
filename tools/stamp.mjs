// Ajoute ?v=<hash du contenu> à chaque module et à la feuille de style (anti-cache, sans build).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const h = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 10);
const files = ['vendor/three.module.min.js', ...readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => `js/${f}`)];
const imports = { three: `./vendor/three.module.min.js?v=${h('vendor/three.module.min.js')}` };
for (const f of files) imports[`./${f}`] = `./${f}?v=${h(f)}`;
const map = JSON.stringify({ imports }, null, 1);
let html = readFileSync('index.html', 'utf8');
html = html.replace(/<!-- IMPORTMAP:START -->[\s\S]*<!-- IMPORTMAP:END -->/, `<!-- IMPORTMAP:START -->\n  <script type="importmap">${map}</script>\n  <!-- IMPORTMAP:END -->`);
html = html.replace(/style\.css\?v=[\w_]+/, `style.css?v=${h('style.css')}`);
html = html.replace(/js\/main\.js\?v=[\w_]+/, `js/main.js?v=${h('js/main.js')}`);
writeFileSync('index.html', html);
console.log(`import map : ${Object.keys(imports).length} entrées`);
