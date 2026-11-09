// Sauvegarde automatique versionnée dans localStorage, tolérante aux erreurs.
import { newGame, SAVE_VERSION } from './game.js';

export const SAVE_KEY = 'babel.save';

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function serialize(state) {
  return JSON.stringify({ ...state, v: SAVE_VERSION, savedAt: Date.now() });
}

// Valide et complète une sauvegarde. Retourne null si elle est inutilisable.
export function validate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.v !== SAVE_VERSION) return migrate(raw);
  const base = newGame();
  const s = { ...base, ...raw };
  s.flags = { ...base.flags, ...(raw.flags || {}) };
  s.inv = { ...base.inv, ...(raw.inv || {}) };
  s.settings = { ...base.settings, ...(raw.settings || {}) };
  s.stats = { ...base.stats, ...(raw.stats || {}) };
  for (const k of ['herbs', 'chests', 'patrols', 'legends', 'party']) if (!Array.isArray(s[k])) s[k] = base[k];
  if (!s.party.includes('asher')) return null;
  if (!s.members || typeof s.members !== 'object') return null;
  for (const id of s.party) {
    const m = s.members[id];
    if (!m || !Number.isFinite(m.hp) || !Number.isFinite(m.level) || !Number.isFinite(m.xp)) return null;
  }
  if (!s.pos || !Number.isFinite(s.pos.x) || !Number.isFinite(s.pos.z)) s.pos = base.pos;
  if (!Number.isInteger(s.step) || s.step < 0) return null;
  return s;
}

// Aucune ancienne version n'existe encore : point d'entrée pour les futures migrations.
export function migrate(raw) {
  if (typeof raw.v === 'number' && raw.v > SAVE_VERSION) return null;
  return null;
}

export function save(state, storage = defaultStorage()) {
  if (!storage) return false;
  try { storage.setItem(SAVE_KEY, serialize(state)); return true; } catch { return false; }
}

export function load(storage = defaultStorage()) {
  if (!storage) return null;
  try {
    const txt = storage.getItem(SAVE_KEY);
    if (!txt) return null;
    return validate(JSON.parse(txt));
  } catch { return null; }
}

export function clear(storage = defaultStorage()) {
  try { storage && storage.removeItem(SAVE_KEY); } catch { /* rien */ }
}
