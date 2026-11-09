// État de partie, quête et dialogues. Pur : aucune dépendance au DOM ni à three.js.
import { CHARACTERS, NPCS, HERBS, CHESTS, HEAL_SPOTS, PATROLS, ITEMS, QUEST_STEPS, SPAWN, BOSS_TRIGGER_Z, GATE_Z, LEGENDS } from './data.js';
import { statsFor, levelForXp } from './combat.js';

export const SAVE_VERSION = 1;
export const STEP = Object.fromEntries(QUEST_STEPS.map((s, i) => [s.id, i]));

function member(id, xp = 0) {
  const level = levelForXp(xp);
  const st = statsFor(id, level);
  return { id, level, xp, hp: st.hp, mp: st.mp };
}

export function newGame() {
  return {
    v: SAVE_VERSION,
    step: STEP.intro,
    flags: {},
    herbs: [],
    chests: [],
    patrols: [],
    legends: [],
    party: ['asher'],
    members: { asher: member('asher') },
    inv: { datte: 3, eau: 1, sel: 0 },
    coins: 15,
    pos: { x: SPAWN.x, z: SPAWN.z, dir: 'down' },
    settings: { quality: 'auto' },
    stats: { battles: 0, playtime: 0 },
  };
}

export function objective(state) {
  const s = QUEST_STEPS[state.step];
  if (state.step === STEP.herbes) return `${s.goal} (${state.herbs.length}/3)`;
  return s.goal;
}

export function joinParty(state, id) {
  if (state.party.includes(id)) return;
  // Le nouveau membre arrive au niveau d'Asher, avec la même XP.
  state.members[id] = member(id, state.members.asher.xp);
  state.party.push(id);
}

export function learnLegend(state, id) {
  if (!LEGENDS[id] || state.legends.includes(id)) return false;
  state.legends.push(id);
  return true;
}

export function healAll(state) {
  for (const id of state.party) {
    const m = state.members[id];
    const st = statsFor(id, m.level);
    m.hp = st.hp; m.mp = st.mp;
  }
}

const L = (who, text) => ({ who, text });

// Parler à un PNJ. Retourne { lines, effects } et modifie l'état.
export function talk(state, npcId) {
  const s = state.step;
  const effects = [];
  let lines = [];
  const legend = (id) => { if (learnLegend(state, id)) effects.push({ type: 'legend', id }); };

  switch (npcId) {
    case 'adah':
      if (s === STEP.intro) {
        lines = [
          L('Adah', 'Asher! Enfin, te voilà revenu des pâturages... Assieds-toi, mon grand. J\'ai une mauvaise nouvelle.'),
          L('Adah', 'Ce matin, des soldats de Nimrod sont passés. Ils ramassent tous les bras solides pour bâtir une grande ville, là-bas, dans les plaines de Shinar.'),
          L('Adah', 'Ils ont emmené ton frère Yonah. Il a pas eu le temps de dire un mot.'),
          L('Asher', 'Je vais le ramener, maman. Je te le promets.'),
          L('Adah', 'Je te connais, je pourrai pas t\'en empêcher. Mais pars pas tout seul! Va voir Tamar, la guérisseuse, près du puits.'),
          L('Adah', 'Tiens, prends ces dattes. Et que l\'Éternel te garde.'),
        ];
        state.inv.datte += 2;
        state.step = STEP.tamar;
        effects.push({ type: 'item', item: 'datte', qty: 2 });
      } else if (s >= STEP.sentier) {
        lines = [L('Adah', 'Vous êtes trois, maintenant. Ça me rassure un peu. Ramène-moi Yonah, Asher.')];
      } else {
        lines = [L('Adah', 'Tamar est près du puits. Et si tu es blessé, l\'eau du puits te fera du bien.')];
      }
      break;

    case 'tamar':
      if (s < STEP.tamar) lines = [L('Tamar', 'Ta mère te cherche, Asher. Va la voir d\'abord.')];
      else if (s === STEP.tamar) {
        lines = [
          L('Tamar', 'Asher... J\'ai entendu pour Yonah. Je suis tellement désolée.'),
          L('Asher', 'Je pars le chercher. Viendrais-tu avec moi? Sur la route, on aura besoin d\'une guérisseuse.'),
          L('Tamar', 'Je viens. Mais pas les mains vides : il me faut des herbes de baume pour mes remèdes.'),
          L('Tamar', 'Elles poussent dans les roseaux de la berge, à l\'est, au bord de l\'Euphrate. Ramène-m\'en trois. Fais attention aux serpents!'),
        ];
        state.step = STEP.herbes;
      } else if (s === STEP.herbes) {
        lines = [L('Tamar', `Encore ${3 - state.herbs.length} herbe${3 - state.herbs.length > 1 ? 's' : ''} de baume. Cherche les petites lueurs vertes dans les roseaux, à l'est.`)];
      } else if (s === STEP.retour) {
        lines = [
          L('Tamar', 'Elles sont parfaites! Avec ça, je peux soigner une caravane au complet.'),
          L('Tamar', 'Je viens avec toi. On devrait demander conseil au vieux Eber : il connaît les chemins du nord mieux que personne.'),
          L('Tamar', 'Il passe ses journées dans les champs, au nord-ouest, près de sa vieille tablette.'),
        ];
        joinParty(state, 'tamar');
        state.step = STEP.eber;
        effects.push({ type: 'join', id: 'tamar' });
      }
      break;

    case 'eber':
      if (s < STEP.eber) {
        lines = [
          L('Eber', 'Hmm? Un jeune berger. Le vent du nord sent la brique cuite, ces temps-ci.'),
          L('Eber', 'Reviens me voir quand tu sauras où tu t\'en vas.'),
        ];
      } else if (s === STEP.eber) {
        lines = [
          L('Eber', 'Asher, fils d\'Adah. Et Tamar avec toi. Je sais pourquoi vous venez.'),
          L('Eber', 'Il est écrit que Nimrod « commença à être puissant sur la terre ». Il fut un grand chasseur, et il régna d\'abord sur Babel, Érec, Accad et Calné, au pays de Shinar.'),
          L('Eber', 'Aujourd\'hui, toute la terre parle une seule langue. Et les gens veulent bâtir une ville et une tour pour se faire un nom.'),
          L('Tamar', 'Et les histoires de géants, Eber? Les soldats disent que Nimrod en est un.'),
          L('Eber', 'Ah, ça... Certains conteurs disent que le mot « gibbor », homme puissant, ferait de lui un géant. C\'est une légende, ma fille. Le texte dit seulement qu\'il devint puissant.'),
          L('Eber', 'Mes vieux os ont encore du chemin à faire. Je viens avec vous. Ma lumière éloignera les bêtes du sentier.'),
        ];
        joinParty(state, 'eber');
        legend('ecrit_nimrod'); legend('ecrit_langue'); legend('legende_gibbor');
        state.step = STEP.sentier;
        effects.push({ type: 'join', id: 'eber' });
      }
      break;

    case 'lavan':
      if (state.flags.lavanAside) {
        lines = [L('Lavan', 'Le sentier vous attend. Gardez l\'œil ouvert, les patrouilles de Kish rôdent dans le canyon.')];
      } else if (s < STEP.sentier) {
        lines = [
          L('Lavan', 'Holà, le jeune! Le canyon est plein de soldats et de bêtes.'),
          L('Lavan', 'Je laisse passer personne qui part tout seul. Reviens avec des compagnons.'),
        ];
      } else {
        lines = [
          L('Lavan', 'Trois, c\'est un bon nombre pour la route. Et avec Eber, en plus!'),
          L('Lavan', 'Kish, le contremaître, a monté son camp au bout du canyon, juste avant la porte de Shinar. C\'est lui qui mène les prisonniers.'),
          L('Lavan', 'Il y a une source au milieu du canyon. Buvez-y avant d\'aller plus loin.'),
        ];
        state.flags.lavanAside = true;
        state.step = STEP.kish;
        effects.push({ type: 'aside', id: 'lavan' });
      }
      break;

    case 'noa':
      lines = s >= STEP.sentier
        ? [L('Noa', 'Tu pars pour vrai? Ramène Yonah, pis raconte-moi tout après!')]
        : [L('Noa', 'Les soldats avaient des lances super longues! Pis un des grands disait que Nimrod a des taureaux avec des ailes pour le garder. C\'est-tu vrai?'), L('Asher', 'C\'est une rumeur de soldats, Noa. Inquiète-toi pas.')];
      legend('legende_lamassu');
      break;

    case 'milka':
      lines = [
        L('Milka', 'Mon père disait qu\'avant, les familles s\'en allaient remplir la terre, comme il avait été demandé à Noé.'),
        L('Milka', 'Astheure, tout le monde veut rester ensemble, dans une seule ville. Je sais pas si c\'est une bonne idée.'),
      ];
      if (s >= STEP.sentier) {
        lines.push(L('Eber', 'Je me demande parfois si la langue qu\'on parle tous était celle d\'Adam et Ève... Ce n\'est qu\'une pensée de vieux, Milka.'));
        legend('legende_langue_pure');
      }
      break;

    case 'ilan':
      lines = [L('Ilan', 'Salut, Asher! Des dattes, de l\'eau de source, du sel de réveil... Qu\'est-ce que je te sers?')];
      effects.push({ type: 'shop', items: NPCS.ilan.shop });
      break;

    default:
      lines = [L('', '...')];
  }
  return { lines, effects };
}

export function buy(state, itemId) {
  const it = ITEMS[itemId];
  if (!it || state.coins < it.price) return false;
  state.coins -= it.price;
  state.inv[itemId] = (state.inv[itemId] || 0) + 1;
  return true;
}

export function pickHerb(state, herbId) {
  if (state.step !== STEP.herbes || state.herbs.includes(herbId) || !HERBS.some((h) => h.id === herbId)) return false;
  state.herbs.push(herbId);
  if (state.herbs.length >= 3) state.step = STEP.retour;
  return true;
}

export function openChest(state, chestId) {
  const c = CHESTS.find((x) => x.id === chestId);
  if (!c || state.chests.includes(chestId)) return null;
  state.chests.push(chestId);
  if (c.coins) { state.coins += c.coins; return { coins: c.coins }; }
  state.inv[c.item] = (state.inv[c.item] || 0) + c.qty;
  return { item: c.item, qty: c.qty };
}

export function useHealSpot(state, spotId) {
  if (!HEAL_SPOTS.some((h) => h.id === spotId)) return false;
  healAll(state);
  return true;
}

// Patrouille visible qui bloque le canyon à la hauteur z.
export function patrolAhead(state, pos) {
  if (state.step < STEP.kish) return null;
  return PATROLS.find((p) => !state.patrols.includes(p.id) && pos.z < p.z + 0.9) || null;
}
export function defeatPatrol(state, id) { if (!state.patrols.includes(id)) state.patrols.push(id); }

export function bossReady(state, pos) {
  return state.step === STEP.kish && !state.flags.kishBeaten && pos.z < BOSS_TRIGGER_Z && state.patrols.length >= PATROLS.length;
}

export function bossIntro() {
  return [
    L('Kish', 'Tiens, tiens. Un berger, une guérisseuse et un vieux radoteux. Vous venez vous porter volontaires?'),
    L('Asher', 'Où est mon frère Yonah?'),
    L('Kish', 'En route vers Babel avec les autres, à mouler des briques pour la gloire de Nimrod! Vous allez le rejoindre... enchaînés.'),
    L('Eber', 'Personne ne se fait un nom en écrasant les petits, Kish.'),
  ];
}

export function bossVictory(state) {
  state.flags.kishBeaten = true;
  state.step = STEP.porte;
  return [
    L('Kish', 'Ugh... Vous savez pas à qui vous vous attaquez. La tour montera jusqu\'au ciel, avec ou sans vous!'),
    L('Kish', 'Ton frère est déjà loin dans les plaines. Bonne chance pour le retrouver dans la foule de Babel...'),
    L('Tamar', 'Il s\'enfuit vers le nord. Asher, la porte est ouverte.'),
    L('Eber', 'Au-delà, ce sont les plaines de Shinar. Et au bout, la ville qu\'on bâtit sans relâche.'),
  ];
}

export function reachedGate(state, pos) {
  return state.step === STEP.porte && pos.z < GATE_Z;
}

export function finishChapter(state) { state.step = STEP.fin; state.flags.done = true; }

// Défaite : réveil au puits, PV/PM pleins, perte de 25 % du cuivre.
export function onDefeat(state) {
  healAll(state);
  state.coins = Math.floor(state.coins * 0.75);
  const well = HEAL_SPOTS[0];
  state.pos = { x: well.x + 0.5, z: well.z + 1.6, dir: 'down' };
}

export function partySummary(state) {
  return state.party.map((id) => {
    const m = state.members[id];
    const st = statsFor(id, m.level);
    return { id, name: CHARACTERS[id].name, level: m.level, hp: m.hp, maxHp: st.hp, mp: m.mp, maxMp: st.mp, xp: m.xp, ...st };
  });
}
