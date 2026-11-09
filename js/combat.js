// Logique de combat au tour par tour. Pure et déterministe avec un générateur aléatoire injecté.
import { CHARACTERS, ENEMIES, SPELLS, ITEMS, XP_TABLE, MAX_LEVEL, STAT_KEYS } from './data.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function statsFor(id, level) {
  const c = CHARACTERS[id];
  const s = {};
  for (const k of STAT_KEYS) s[k] = c.base[k] + Math.floor(c.growth[k] * (level - 1));
  return s;
}

export function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_TABLE[level]) level++;
  return level;
}

export function xpToNext(xp) {
  const l = levelForXp(xp);
  return l >= MAX_LEVEL ? 0 : XP_TABLE[l] - xp;
}

export function spellsFor(id, level) {
  return CHARACTERS[id].spells.filter((s) => level >= s.level).map((s) => s.id);
}

export function physicalDamage(att, target, rng, mult = 1) {
  const base = Math.max(1, att.atk - target.def / 2) * mult;
  let dmg = Math.round(base * (0.875 + rng() * 0.25));
  let crit = false;
  if (rng() < 1 / 16) { dmg = Math.round(dmg * 1.5); crit = true; }
  if (target.defending) dmg = Math.round(dmg / 2);
  return { amount: Math.max(1, dmg), crit };
}

export function magicDamage(caster, target, power, rng) {
  const base = Math.max(1, power + caster.mag - target.def / 4);
  let dmg = Math.round(base * (0.9 + rng() * 0.2));
  if (target.defending) dmg = Math.round(dmg / 2);
  return { amount: Math.max(1, dmg), crit: false };
}

export function healAmount(caster, power, rng) {
  return Math.max(1, Math.round((power + caster.mag * 1.2) * (0.95 + rng() * 0.1)));
}

function makePartyActor(state, id) {
  const m = state.members[id];
  const st = statsFor(id, m.level);
  return {
    side: 'party', id, uid: id, name: CHARACTERS[id].name,
    maxHp: st.hp, maxMp: st.mp, atk: st.atk, def: st.def, mag: st.mag, spd: st.spd,
    hp: Math.min(m.hp, st.hp), mp: Math.min(m.mp, st.mp), level: m.level, defending: false,
  };
}

function makeEnemyActor(eid, index, total, counts) {
  const e = ENEMIES[eid];
  counts[eid] = (counts[eid] || 0) + 1;
  const sameKind = total.filter((x) => x === eid).length;
  const suffix = sameKind > 1 ? ' ' + 'ABCDEFG'[counts[eid] - 1] : '';
  return {
    side: 'enemy', id: eid, uid: `${eid}#${index}`, name: e.name + suffix, sprite: e.sprite,
    maxHp: e.hp, maxMp: 0, hp: e.hp, mp: 0, atk: e.atk, def: e.def, mag: e.mag, spd: e.spd,
    boss: !!e.boss, defending: false,
  };
}

export function createBattle(state, enemyIds, { rng = Math.random, boss = false } = {}) {
  const counts = {};
  const b = {
    party: state.party.map((id) => makePartyActor(state, id)),
    enemies: enemyIds.map((eid, i) => makeEnemyActor(eid, i, enemyIds, counts)),
    enemyIds: [...enemyIds],
    round: 0, queue: [], rng, boss, outcome: null, rewards: null, summons: 0, nextIndex: enemyIds.length,
  };
  return b;
}

export const living = (list) => list.filter((a) => a.hp > 0);
export const allActors = (b) => [...b.party, ...b.enemies];
export const findActor = (b, uid) => allActors(b).find((a) => a.uid === uid);

function startRound(b) {
  b.round++;
  const all = [...living(b.party), ...living(b.enemies)];
  for (const a of all) a._init = a.spd + b.rng() * 4;
  b.queue = all.sort((x, y) => y._init - x._init).map((a) => a.uid);
}

// Prochain acteur vivant. Retourne null si le combat est fini.
export function nextActor(b) {
  for (let guard = 0; guard < 100; guard++) {
    if (b.outcome) return null;
    if (!b.queue.length) startRound(b);
    const a = findActor(b, b.queue.shift());
    if (a && a.hp > 0) { a.defending = false; return a; }
  }
  return null;
}

function damage(b, target, amount, crit, events, source) {
  target.hp = Math.max(0, target.hp - amount);
  events.push({ type: 'damage', target: target.uid, amount, crit, source });
  if (target.hp === 0) events.push({ type: 'ko', target: target.uid });
}

function heal(target, amount, events) {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  events.push({ type: 'heal', target: target.uid, amount: target.hp - before });
}

export function canCast(actor, spellId) {
  const sp = SPELLS[spellId];
  return !!sp && actor.mp >= sp.mp && spellsFor(actor.id, actor.level).includes(spellId);
}

export function itemUsable(itemId, target, inv) {
  const it = ITEMS[itemId];
  if (!it || !inv || !(inv[itemId] > 0) || !target) return false;
  if (it.kind === 'revive') return target.hp === 0;
  if (target.hp === 0) return false;
  if (it.kind === 'heal') return target.hp < target.maxHp;
  if (it.kind === 'mana') return target.mp < target.maxMp;
  return false;
}

export function applyItem(itemId, target, inv, events) {
  const it = ITEMS[itemId];
  inv[itemId]--;
  if (it.kind === 'heal') heal(target, it.amount, events);
  else if (it.kind === 'mana') {
    const before = target.mp;
    target.mp = Math.min(target.maxMp, target.mp + it.amount);
    events.push({ type: 'mana', target: target.uid, amount: target.mp - before });
  } else if (it.kind === 'revive') {
    target.hp = Math.max(1, Math.round(target.maxHp * it.amount));
    events.push({ type: 'revive', target: target.uid, amount: target.hp });
  }
}

// Exécute une commande. cmd : {type:'attack'|'spell'|'item'|'defend'|'flee', target, spell, item}
export function perform(b, actor, cmd, inv) {
  const events = [{ type: 'act', actor: actor.uid, cmd: cmd.type, spell: cmd.spell, item: cmd.item }];
  if (b.outcome || actor.hp <= 0) return events;
  const foes = actor.side === 'party' ? b.enemies : b.party;
  const pickFoe = (uid) => {
    const t = findActor(b, uid);
    if (t && t.hp > 0 && t.side !== actor.side) return t;
    return living(foes)[0];
  };

  if (cmd.type === 'attack') {
    const t = pickFoe(cmd.target);
    if (t) { const r = physicalDamage(actor, t, b.rng, cmd.mult || 1); damage(b, t, r.amount, r.crit, events, actor.uid); }
  } else if (cmd.type === 'spell') {
    const sp = SPELLS[cmd.spell];
    if (!canCast(actor, cmd.spell)) { events.push({ type: 'fail', reason: 'mp' }); return finish(b, events); }
    actor.mp -= sp.mp;
    if (sp.kind === 'physical') {
      const t = pickFoe(cmd.target);
      if (t) { const r = physicalDamage(actor, t, b.rng, sp.mult); damage(b, t, r.amount, r.crit, events, actor.uid); }
    } else if (sp.kind === 'magic') {
      const targets = sp.target === 'enemies' ? living(foes) : [pickFoe(cmd.target)].filter(Boolean);
      for (const t of targets) { const r = magicDamage(actor, t, sp.power, b.rng); damage(b, t, r.amount, false, events, actor.uid); }
    } else if (sp.kind === 'heal') {
      const allies = actor.side === 'party' ? b.party : b.enemies;
      let targets;
      if (sp.target === 'allies') targets = living(allies);
      else { const t = findActor(b, cmd.target); targets = t && t.hp > 0 && t.side === actor.side ? [t] : [actor]; }
      for (const t of targets) heal(t, healAmount(actor, sp.power, b.rng), events);
    }
  } else if (cmd.type === 'item') {
    const t = findActor(b, cmd.target);
    if (!itemUsable(cmd.item, t, inv)) { events.push({ type: 'fail', reason: 'item' }); return finish(b, events); }
    applyItem(cmd.item, t, inv, events);
  } else if (cmd.type === 'defend') {
    actor.defending = true;
    events.push({ type: 'defend', target: actor.uid });
  } else if (cmd.type === 'flee') {
    if (b.boss) events.push({ type: 'noflee' });
    else {
      const avg = (l) => living(l).reduce((s, a) => s + a.spd, 0) / Math.max(1, living(l).length);
      const chance = Math.min(0.9, Math.max(0.25, 0.55 + (avg(b.party) - avg(b.enemies)) * 0.05));
      if (b.rng() < chance) { b.outcome = 'fled'; events.push({ type: 'fled' }); }
      else events.push({ type: 'fleefail' });
    }
  } else if (cmd.type === 'summon') {
    const eid = cmd.enemy || 'soldat';
    const e = makeEnemyActor(eid, b.nextIndex++, [], {});
    e.name = ENEMIES[eid].name + ' (renfort)';
    b.enemies.push(e);
    b.enemyIds.push(eid);
    b.summons++;
    events.push({ type: 'summon', target: e.uid });
  } else if (cmd.type === 'shout') {
    for (const t of living(foes)) { const r = magicDamage(actor, t, cmd.power || 6, b.rng); damage(b, t, r.amount, false, events, actor.uid); }
  }
  return finish(b, events);
}

function finish(b, events) {
  const o = checkOutcome(b);
  if (o) events.push({ type: o });
  return events;
}

export function checkOutcome(b) {
  if (b.outcome) return null;
  if (living(b.enemies).length === 0) { b.outcome = 'victory'; b.rewards = rewardsFor(b); return 'victory'; }
  if (living(b.party).length === 0) { b.outcome = 'defeat'; return 'defeat'; }
  return null;
}

export function rewardsFor(b) {
  let xp = 0, coins = 0;
  const drops = [];
  for (const e of b.enemies) {
    const d = ENEMIES[e.id];
    xp += d.xp; coins += d.coins;
    if (d.drop && b.rng() < d.drop.chance) drops.push(d.drop.item);
  }
  return { xp, coins, drops };
}

// Choix d'action d'un ennemi.
export function enemyChoose(b, actor) {
  const targets = living(b.party);
  if (!targets.length) return { type: 'defend' };
  const rnd = () => targets[Math.floor(b.rng() * targets.length)];
  if (actor.id === 'kish') {
    const allies = living(b.enemies).filter((e) => e !== actor).length;
    const r = b.rng();
    if (b.summons < 2 && allies === 0 && r < 0.45) return { type: 'summon', enemy: 'soldat', label: 'Appel des gardes' };
    if (r < 0.3) return { type: 'shout', power: 9, label: 'Ordre cinglant' };
    const weakest = targets.reduce((m, t) => (t.hp < m.hp ? t : m));
    return { type: 'attack', target: (b.rng() < 0.4 ? weakest : rnd()).uid, mult: 1.25, label: 'Coup de fouet' };
  }
  if (actor.id === 'soldat' && b.rng() < 0.2) return { type: 'attack', target: rnd().uid, mult: 1.3, label: 'Coup de lance' };
  return { type: 'attack', target: rnd().uid };
}

// Applique le résultat du combat à l'état de partie. Retourne les montées de niveau.
export function applyBattleResult(state, b) {
  const levelUps = [];
  for (const a of b.party) {
    const m = state.members[a.uid];
    m.hp = a.hp; m.mp = a.mp;
    if (b.outcome === 'victory') {
      if (m.hp <= 0) m.hp = 1; // relevé après la victoire
      const from = m.level;
      m.xp += b.rewards.xp;
      m.level = levelForXp(m.xp);
      if (m.level > from) {
        const before = statsFor(a.uid, from), after = statsFor(a.uid, m.level);
        m.hp += after.hp - before.hp; m.mp += after.mp - before.mp;
        const newSpells = spellsFor(a.uid, m.level).filter((s) => !spellsFor(a.uid, from).includes(s));
        levelUps.push({ id: a.uid, from, to: m.level, newSpells });
      }
    }
  }
  if (b.outcome === 'victory') {
    state.coins += b.rewards.coins;
    for (const d of b.rewards.drops) state.inv[d] = (state.inv[d] || 0) + 1;
    state.stats.battles++;
  }
  return levelUps;
}
