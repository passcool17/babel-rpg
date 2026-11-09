// Carte du chapitre 1, générée de façon déterministe. Pure : aucune dépendance au DOM.
import { NPCS, HERBS, CHESTS, HEAL_SPOTS } from './data.js';

export const W = 40;
export const H = 56;

// Légende des tuiles
// '.' herbe  ',' terre battue  'f' blé  'r' roseaux  'b' berge  '=' sentier  'd' sable du canyon
// 'W' eau  'X' falaise  'R' rocher  'H' maison  'T' palmier  'O' puits  'M' étal  'S' tablette  'P' pilier  'C' tente  'Q' source
export const BLOCKING = new Set(['W', 'X', 'R', 'H', 'T', 'O', 'M', 'S', 'P', 'C', 'Q']);

export const HOUSES = [
  { x: 3, z: 43, w: 4, d: 3, h: 1.7, door: 'S', name: 'maison d\'Asher' },
  { x: 9, z: 39, w: 4, d: 3, h: 1.6, door: 'S' },
  { x: 18, z: 39, w: 5, d: 3, h: 1.9, door: 'S' },
  { x: 2, z: 50, w: 3, d: 3, h: 1.5, door: 'E' },
  { x: 7, z: 53, w: 4, d: 2, h: 1.5, door: 'N' },
  { x: 20, z: 50, w: 4, d: 3, h: 1.7, door: 'W' },
  { x: 14, z: 51, w: 3, d: 3, h: 1.6, door: 'N' },
];

export function pathCenter(z) {
  if (z >= 17) return 17;
  return 17 + Math.round(2.4 * Math.sin((17 - z) * 0.42));
}
export function riverStart(z) {
  return 33 + Math.round(Math.sin(z * 0.21) * 1.2);
}

function hash(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function buildMap() {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const set = (x, z, c) => { if (x >= 0 && x < W && z >= 0 && z < H) g[z][x] = c; };
  const get = (x, z) => (x >= 0 && x < W && z >= 0 && z < H ? g[z][x] : 'X');

  // Canyon du nord (rangées 0 à 18) : falaises, sauf le sentier.
  for (let z = 0; z <= 18; z++) for (let x = 0; x < W; x++) set(x, z, 'X');
  for (let z = 3; z <= 16; z++) {
    const c = pathCenter(z);
    for (let x = c - 3; x <= c + 3; x++) set(x, z, Math.abs(x - c) <= 1 ? '=' : 'd');
  }
  // Clairière de la porte (rangées 1-2) et camp du contremaître (3-7).
  for (let z = 1; z <= 7; z++) for (let x = 12; x <= 23; x++) set(x, z, z <= 2 || Math.abs(x - 18) <= 1 ? '=' : 'd');
  for (let x = 12; x <= 23; x++) if (x < 15 || x > 21) set(x, 1, 'X');
  set(14, 1, 'P'); set(22, 1, 'P');
  set(13, 4, 'C'); set(22, 5, 'C');
  // Rochers dans le canyon, hors du sentier.
  for (let z = 8; z <= 16; z++) {
    const c = pathCenter(z);
    for (const x of [c - 3, c + 3]) if (hash(x, z) < 0.35) set(x, z, 'R');
  }
  // Corridor unique gardé par Lavan.
  for (let z = 17; z <= 18; z++) set(17, z, '=');

  // Champs (rangées 19 à 37).
  for (let z = 19; z <= 37; z++) for (let x = 1; x <= 30; x++) set(x, z, '.');
  const plots = [[2, 20, 6, 4], [10, 20, 5, 6], [2, 28, 5, 6], [20, 21, 7, 5], [20, 29, 6, 6], [9, 30, 6, 5]];
  for (const [px, pz, pw, pd] of plots) for (let z = pz; z < pz + pd; z++) for (let x = px; x < px + pw; x++) set(x, z, 'f');
  for (let z = 19; z <= 38; z++) for (let x = 16; x <= 18; x++) set(x, z, '=');
  set(7, 24, 'T'); set(9, 24, 'S');

  // Village (rangées 38 à 54).
  for (let z = 38; z <= 54; z++) for (let x = 1; x <= 26; x++) set(x, z, ',');
  for (let z = 38; z <= 54; z++) for (let x = 27; x <= 31; x++) set(x, z, '.');
  for (const hs of HOUSES) for (let z = hs.z; z < hs.z + hs.d; z++) for (let x = hs.x; x < hs.x + hs.w; x++) set(x, z, 'H');
  set(19, 46, 'M'); set(20, 46, 'M'); set(21, 46, 'M');

  // Rivière (Euphrate) et berge.
  for (let z = 19; z < H; z++) {
    const rs = riverStart(z);
    for (let x = rs; x < W; x++) set(x, z, 'W');
    set(rs - 1, z, 'b'); set(rs - 2, z, 'b');
    if (z >= 20 && z <= 37) { set(rs - 3, z, 'r'); if (z % 5 !== 0) set(rs - 2, z, 'r'); if (hash(rs - 4, z) < 0.5) set(rs - 4, z, 'r'); }
  }

  // Palmiers.
  const palms = [[1, 38], [26, 38], [1, 46], [25, 44], [12, 47], [26, 50], [5, 47], [17, 54], [27, 40], [29, 44], [28, 48], [29, 52], [24, 19], [1, 26], [14, 37], [27, 27], [8, 37], [30, 39], [23, 47]];
  for (const [x, z] of palms) if (get(x, z) === '.' || get(x, z) === ',' || get(x, z) === 'b') set(x, z, 'T');

  // Bords.
  for (let z = 19; z < H; z++) set(0, z, 'X');
  for (let x = 0; x < W; x++) set(x, H - 1, 'X');

  // Points d'intérêt bloquants.
  const well = HEAL_SPOTS[0]; set(well.x, well.z, 'O');
  const spring = HEAL_SPOTS[1]; set(spring.x, spring.z, 'Q');
  // Les herbes, jarres et PNJ restent sur des tuiles praticables (vérifié par les tests).
  return g;
}

export const MAP = buildMap();

export function tileAt(x, z, map = MAP) {
  const tx = Math.floor(x), tz = Math.floor(z);
  if (tx < 0 || tz < 0 || tx >= W || tz >= H) return 'X';
  return map[tz][tx];
}

export function zoneAt(x, z, map = MAP) {
  const t = tileAt(x, z, map);
  if (t === 'f') return 'champs';
  if (t === 'r') return 'roseaux';
  if ((t === '=' || t === 'd') && z < 17 && z > 7.5) return 'canyon';
  return null;
}

export function regionName(x, z) {
  if (z < 3) return 'Porte de Shinar';
  if (z < 19) return 'Canyon du nord';
  if (x >= riverStart(Math.floor(z)) - 4) return 'Berge de l\'Euphrate';
  if (z < 38) return 'Champs';
  return 'Village';
}

// Positions occupées par des objets solides en plus de la carte.
export function solidPoints(state) {
  const pts = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (id === 'kish' && state && state.flags.kishBeaten) continue;
    if (state && state.party.includes(id)) continue;
    if (id === 'lavan' && state && state.flags.lavanAside) pts.push({ id, x: n.asideX + 0.5, z: n.asideZ + 0.5 });
    else pts.push({ id, x: n.x + 0.5, z: n.z + 0.5 });
  }
  for (const c of CHESTS) pts.push({ id: c.id, x: c.x + 0.5, z: c.z + 0.5, r: 0.35 });
  return pts;
}

export function blockedTile(tx, tz, map = MAP) {
  return BLOCKING.has(tileAt(tx + 0.5, tz + 0.5, map));
}

// Déplacement avec collisions (cercle contre tuiles et points solides). Retourne la nouvelle position.
export function moveWithCollision(pos, dx, dz, radius, state, map = MAP) {
  const solids = solidPoints(state);
  const free = (x, z) => {
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
      if (BLOCKING.has(tileAt(x + ox * radius, z + oz * radius, map))) return false;
    }
    for (const s of solids) {
      const r = (s.r || 0.38) + radius;
      if ((s.x - x) ** 2 + (s.z - z) ** 2 < r * r) return false;
    }
    return true;
  };
  let { x, z } = pos;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.15)); // pas de traversée
  const sx = dx / steps, sz = dz / steps;
  for (let i = 0; i < steps; i++) {
    if (free(x + sx, z)) x += sx;
    if (free(x, z + sz)) z += sz;
  }
  return { x, z };
}

// Parcours en largeur sur les tuiles : utile aux tests (chapitre terminable).
export function reachable(start, state, map = MAP) {
  const solids = new Set(solidPoints(state).map((s) => `${Math.floor(s.x)},${Math.floor(s.z)}`));
  const seen = new Set();
  const q = [[Math.floor(start.x), Math.floor(start.z)]];
  seen.add(q[0].join(','));
  while (q.length) {
    const [x, z] = q.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = `${nx},${nz}`;
      if (seen.has(k) || blockedTile(nx, nz, map) || solids.has(k)) continue;
      seen.add(k); q.push([nx, nz]);
    }
  }
  return seen;
}

export function adjacentReachable(seen, tx, tz) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen.has(`${tx + dx},${tz + dz}`));
}

export { HERBS, CHESTS };
