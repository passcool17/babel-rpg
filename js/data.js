// Données du chapitre 1. Aucune dépendance : importable dans Node et le navigateur.

export const STAT_KEYS = ['hp', 'mp', 'atk', 'def', 'mag', 'spd'];

export const CHARACTERS = {
  asher: {
    name: 'Asher', role: 'Berger',
    base: { hp: 44, mp: 6, atk: 12, def: 6, mag: 4, spd: 9 },
    growth: { hp: 9, mp: 2, atk: 3, def: 2, mag: 1, spd: 1 },
    spells: [{ id: 'fronde', level: 2 }],
  },
  tamar: {
    name: 'Tamar', role: 'Guérisseuse',
    base: { hp: 32, mp: 18, atk: 7, def: 4, mag: 10, spd: 8 },
    growth: { hp: 6, mp: 4, atk: 1, def: 1, mag: 3, spd: 1 },
    spells: [{ id: 'soin', level: 1 }, { id: 'baume', level: 3 }],
  },
  eber: {
    name: 'Eber', role: 'Vieux sage',
    base: { hp: 30, mp: 20, atk: 6, def: 4, mag: 13, spd: 6 },
    growth: { hp: 5, mp: 4, atk: 1, def: 1, mag: 3, spd: 0.5 },
    spells: [{ id: 'eclair', level: 1 }, { id: 'tempete', level: 3 }],
  },
};

// Seuil d'XP cumulée pour atteindre le niveau i+1 (index 0 = niveau 1).
export const XP_TABLE = [0, 20, 50, 95, 155, 235, 340, 470, 630, 820];
export const MAX_LEVEL = XP_TABLE.length;

export const SPELLS = {
  fronde: { name: 'Fronde', mp: 3, kind: 'physical', mult: 1.6, target: 'enemy', desc: 'Un caillou bien visé.' },
  soin: { name: 'Soin', mp: 4, kind: 'heal', power: 12, target: 'ally', desc: 'Soigne un allié.' },
  baume: { name: 'Baume', mp: 7, kind: 'heal', power: 6, target: 'allies', desc: 'Soigne toute l\'équipe.' },
  eclair: { name: 'Éclair', mp: 4, kind: 'magic', power: 9, target: 'enemy', desc: 'Une lumière vive frappe un ennemi.' },
  tempete: { name: 'Tempête de sable', mp: 7, kind: 'magic', power: 5, target: 'enemies', desc: 'Le sable fouette tous les ennemis.' },
};

export const ITEMS = {
  datte: { name: 'Dattes', kind: 'heal', amount: 35, price: 8, desc: 'Rend 35 PV.' },
  eau: { name: 'Eau de source', kind: 'mana', amount: 12, price: 12, desc: 'Rend 12 PM.' },
  sel: { name: 'Sel de réveil', kind: 'revive', amount: 0.5, price: 25, desc: 'Relève un allié K.-O. avec la moitié de ses PV.' },
};

export const ENEMIES = {
  chacal: { name: 'Chacal', hp: 18, atk: 9, def: 3, mag: 0, spd: 10, xp: 6, coins: 4, drop: { item: 'datte', chance: 0.15 }, sprite: 'chacal' },
  serpent: { name: 'Serpent des roseaux', hp: 22, atk: 10, def: 4, mag: 0, spd: 7, xp: 8, coins: 5, drop: { item: 'datte', chance: 0.2 }, sprite: 'serpent' },
  scorpion: { name: 'Scorpion', hp: 30, atk: 12, def: 8, mag: 0, spd: 5, xp: 12, coins: 7, drop: { item: 'eau', chance: 0.15 }, sprite: 'scorpion' },
  soldat: { name: 'Soldat de Nimrod', hp: 42, atk: 14, def: 8, mag: 2, spd: 8, xp: 16, coins: 12, drop: { item: 'datte', chance: 0.25 }, sprite: 'soldat', skill: 'lance' },
  kish: { name: 'Kish, contremaître', hp: 420, atk: 24, def: 12, mag: 15, spd: 9, xp: 120, coins: 100, drop: { item: 'sel', chance: 1 }, sprite: 'kish', boss: true },
};

export const ENCOUNTERS = {
  champs: { rate: 0.055, groups: [['chacal'], ['chacal', 'chacal'], ['serpent']] },
  roseaux: { rate: 0.075, groups: [['serpent'], ['chacal'], ['serpent', 'chacal'], ['scorpion']] },
  canyon: { rate: 0.1, groups: [['soldat'], ['scorpion', 'chacal'], ['soldat', 'chacal'], ['scorpion', 'scorpion'], ['chacal', 'chacal', 'serpent']] },
};
export const ENCOUNTER_GRACE = 6; // unités de marche sans combat après chaque combat

// Patrouilles visibles dans le canyon : elles bloquent le sentier jusqu'à leur défaite.
export const PATROLS = [
  { id: 'p1', x: 18, z: 14, group: ['soldat', 'chacal'], line: 'Halte! Personne ne quitte le village sans l\'ordre de Kish!' },
  { id: 'p2', x: 16, z: 10, group: ['soldat', 'soldat'], line: 'Encore des fuyards? On va vous ramener par la peau du cou!' },
];

// Personnages non joueurs : position en tuiles (x, z). Le nord est en haut (z petit).
export const NPCS = {
  adah: { name: 'Adah', title: 'ta mère', x: 8, z: 47, look: 'adah' },
  tamar: { name: 'Tamar', title: 'guérisseuse', x: 15, z: 43, look: 'tamar' },
  ilan: { name: 'Ilan', title: 'marchand', x: 20, z: 47, look: 'ilan', shop: ['datte', 'eau', 'sel'] },
  noa: { name: 'Noa', title: 'enfant du village', x: 11, z: 51, look: 'noa' },
  milka: { name: 'Milka', title: 'tisserande', x: 5, z: 40, look: 'milka' },
  eber: { name: 'Eber', title: 'vieux sage', x: 8, z: 25, look: 'eber' },
  lavan: { name: 'Lavan', title: 'vieux berger', x: 17, z: 18, look: 'lavan', asideX: 19, asideZ: 19 },
  kish: { name: 'Kish', title: 'contremaître de Nimrod', x: 18, z: 5, look: 'kish' },
};

export const HERBS = [
  { id: 'h1', x: 30, z: 22 },
  { id: 'h2', x: 31, z: 29 },
  { id: 'h3', x: 30, z: 35 },
];

export const CHESTS = [
  { id: 'j1', x: 3, z: 20, item: 'datte', qty: 2 },
  { id: 'j2', x: 25, z: 53, item: 'sel', qty: 1 },
  { id: 'j3', x: 28, z: 31, coins: 30 },
  { id: 'j4', x: 21, z: 12, item: 'eau', qty: 2 },
];

// Points de soin complet.
export const HEAL_SPOTS = [
  { id: 'puits', name: 'le puits', x: 14, z: 45 },
  { id: 'source', name: 'la source du canyon', x: 15, z: 9 },
];

export const SPAWN = { x: 7.5, z: 48.5 };
export const BOSS_TRIGGER_Z = 7.5;
export const GATE_Z = 2.6;

// Écrit (Genèse, Louis Segond 1910, domaine public) versus légendes du jeu.
export const LEGENDS = {
  ecrit_nimrod: { kind: 'Écrit', title: 'Nimrod, vaillant chasseur', text: '« Cusch engendra aussi Nimrod ; c\'est lui qui commença à être puissant sur la terre. Il fut un vaillant chasseur devant l\'Éternel. » Il régna d\'abord sur Babel, Érec, Accad et Calné, au pays de Schinear. (d\'après Genèse 10:8-10)' },
  ecrit_langue: { kind: 'Écrit', title: 'Une seule langue', text: '« Toute la terre avait une seule langue et les mêmes mots. » Les gens voulurent bâtir une ville et une tour pour se faire un nom. (d\'après Genèse 11:1-4)' },
  legende_gibbor: { kind: 'Légende du jeu', title: 'Le « gibbor »', text: 'Certains conteurs disent que le mot hébreu gibbor, « homme puissant », ferait de Nimrod un géant. C\'est une interprétation, pas un fait : le texte dit seulement qu\'il devint puissant.' },
  legende_lamassu: { kind: 'Légende du jeu', title: 'Les gardiens ailés', text: 'Dans les villes de Shinar, on sculptera plus tard des taureaux ailés à tête d\'homme pour garder les portes. Dans notre jeu, les soldats racontent qu\'ils protègent Nimrod. Ce n\'est qu\'une rumeur de caserne.' },
  legende_langue_pure: { kind: 'Légende du jeu', title: 'La langue pure', text: 'Eber se demande si la langue d\'avant Babel était celle d\'Adam et Ève. Le prophète Sophonie (3:9) parle de « lèvres pures » données aux peuples ; le reste est une méditation de vieux sage.' },
};

export const QUEST_STEPS = [
  { id: 'intro', goal: 'Parle à ta mère, Adah, devant la maison.' },
  { id: 'tamar', goal: 'Trouve Tamar, la guérisseuse, près du puits.' },
  { id: 'herbes', goal: 'Cueille 3 herbes de baume dans les roseaux de la berge (est).' },
  { id: 'retour', goal: 'Rapporte les herbes à Tamar, près du puits.' },
  { id: 'eber', goal: 'Trouve Eber, le vieux sage, dans les champs (nord-ouest).' },
  { id: 'sentier', goal: 'Prends le sentier du nord. Le vieux Lavan garde l\'entrée du canyon.' },
  { id: 'kish', goal: 'Rattrape le contremaître Kish au bout du canyon.' },
  { id: 'porte', goal: 'Franchis la porte des plaines de Shinar.' },
  { id: 'fin', goal: 'À suivre : les plaines de Shinar.' },
];
