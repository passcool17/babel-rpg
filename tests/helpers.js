import { createBattle, nextActor, perform, enemyChoose, applyBattleResult, living, canCast, itemUsable } from '../js/combat.js';

// Politique automatique simple, proche d'une joueuse prudente.
export function autoCommand(b, actor, inv) {
  const allies = b.party;
  const foes = living(b.enemies);
  const hurt = living(allies).filter((a) => a.hp < a.maxHp * 0.45).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp);
  const ko = allies.find((a) => a.hp === 0);
  if (ko && inv.sel > 0) return { type: 'item', item: 'sel', target: ko.uid };
  if (actor.id === 'tamar') {
    if (living(allies).filter((a) => a.hp < a.maxHp * 0.6).length >= 2 && canCast(actor, 'baume')) return { type: 'spell', spell: 'baume' };
    if (hurt.length && canCast(actor, 'soin')) return { type: 'spell', spell: 'soin', target: hurt[0].uid };
  }
  if (hurt.length && hurt[0] === actor && inv.datte > 0 && itemUsable('datte', actor, inv)) return { type: 'item', item: 'datte', target: actor.uid };
  if (actor.id === 'asher' && hurt.length && !allies.some((a) => a.id === 'tamar' && a.hp > 0) && inv.datte > 0) return { type: 'item', item: 'datte', target: hurt[0].uid };
  const strongest = foes.reduce((m, f) => (f.hp > m.hp ? f : m), foes[0]);
  if (actor.id === 'eber') {
    if (foes.length >= 2 && canCast(actor, 'tempete')) return { type: 'spell', spell: 'tempete' };
    if (canCast(actor, 'eclair') && (b.boss || strongest.hp > 15)) return { type: 'spell', spell: 'eclair', target: strongest.uid };
  }
  if (actor.id === 'asher' && b.boss && canCast(actor, 'fronde')) return { type: 'spell', spell: 'fronde', target: strongest.uid };
  const weakest = foes.reduce((m, f) => (f.hp < m.hp ? f : m), foes[0]);
  return { type: 'attack', target: weakest.uid };
}

export function runBattle(state, enemies, rng, { boss = false, maxTurns = 400 } = {}) {
  const b = createBattle(state, enemies, { rng, boss });
  for (let i = 0; i < maxTurns && !b.outcome; i++) {
    const a = nextActor(b);
    if (!a) break;
    const cmd = a.side === 'party' ? autoCommand(b, a, state.inv) : enemyChoose(b, a);
    perform(b, a, cmd, state.inv);
  }
  const levelUps = applyBattleResult(state, b);
  return { outcome: b.outcome, battle: b, levelUps };
}
