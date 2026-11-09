// Contrôleur du jeu : boucle, exploration, interactions, combats, menus.
import { GameRenderer } from './render.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { QualityGovernor, initialLevel, QUALITY_LEVELS } from './perf.js';
import { NPCS, HERBS, CHESTS, HEAL_SPOTS, PATROLS, ENCOUNTERS, ENCOUNTER_GRACE, ITEMS, SPELLS, CHARACTERS, LEGENDS, ENEMIES } from './data.js';
import { moveWithCollision, zoneAt, regionName } from './world.js';
import { newGame, talk, objective, pickHerb, openChest, useHealSpot, buy, patrolAhead, defeatPatrol, bossReady, bossIntro, bossVictory, reachedGate, finishChapter, onDefeat, partySummary, healAll, joinParty, STEP } from './game.js';
import { createBattle, nextActor, perform, enemyChoose, applyBattleResult, living, spellsFor, canCast, itemUsable, applyItem, findActor, xpToNext, statsFor } from './combat.js';
import { save, load, clear } from './save.js';

const params = new URLSearchParams(location.search);
const TEST = params.get('test');
const SPEED = 3.6;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ui = new UI(document.getElementById('ui'));
const input = new Input(ui);
const coarse = matchMedia('(pointer: coarse)').matches;
const gov = new QualityGovernor({ start: initialLevel({ coarse, dpr: devicePixelRatio, cores: navigator.hardwareConcurrency || 4 }) });

let renderer;
try {
  renderer = new GameRenderer(document.getElementById('scene'), { level: gov.level });
} catch (err) {
  document.getElementById('ui').innerHTML = '<div class="screen"><h1>Oups</h1><p>Ton navigateur n\'a pas pu démarrer la 3D (WebGL). Essaie Chrome à jour.</p></div>';
  throw err;
}

let state = newGame();
let mode = 'title'; // title | explore | busy | battle | end
let trail = [];
let encounterMeter = 0, graceLeft = ENCOUNTER_GRACE;
let moving = false;
let saveTimer = 0;
const noSave = !!TEST;

function persist() { if (!noSave) save(state); }

function applyQualitySetting() {
  if (params.has('q')) { gov.setMode(params.get('q')); renderer.setQuality(gov.level); return; }
  gov.setMode(state.settings.quality === 'auto' ? 'auto' : String(state.settings.quality));
  if (state.settings.quality !== 'auto') renderer.setQuality(gov.level);
}

// ---------- Interactions ----------
function interactables() {
  const list = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (state.party.includes(id) || id === 'kish') continue;
    const x = id === 'lavan' && state.flags.lavanAside ? n.asideX : n.x;
    const z = id === 'lavan' && state.flags.lavanAside ? n.asideZ : n.z;
    list.push({ kind: 'npc', id, x: x + 0.5, z: z + 0.5, label: `Parler à ${n.name}` });
  }
  if (state.step === STEP.herbes) for (const h of HERBS) if (!state.herbs.includes(h.id)) list.push({ kind: 'herb', id: h.id, x: h.x + 0.5, z: h.z + 0.5, label: 'Cueillir l\'herbe de baume' });
  for (const c of CHESTS) if (!state.chests.includes(c.id)) list.push({ kind: 'chest', id: c.id, x: c.x + 0.5, z: c.z + 0.5, label: 'Ouvrir la jarre' });
  for (const h of HEAL_SPOTS) list.push({ kind: 'heal', id: h.id, x: h.x + 0.5, z: h.z + 0.5, label: `Boire à ${h.name}` });
  return list;
}

function nearest() {
  let best = null, bd = 1.45;
  for (const it of interactables()) {
    const d = Math.hypot(it.x - state.pos.x, it.z - state.pos.z);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

async function doInteract() {
  if (mode !== 'explore' || ui.busy) return;
  const it = nearest();
  if (!it) return;
  mode = 'busy';
  ui.hint(null);
  if (it.kind === 'npc') {
    const prevParty = state.party.length;
    const { lines, effects } = talk(state, it.id);
    await ui.dialog(lines);
    for (const e of effects) {
      if (e.type === 'join') ui.toast(`${CHARACTERS[e.id].name} se joint à l'équipe!`);
      if (e.type === 'legend') ui.toast(`Nouvelle entrée : ${LEGENDS[e.id].title} (menu ☰ › Légendes)`, 2800);
      if (e.type === 'item') ui.toast(`+${e.qty} ${ITEMS[e.item].name}`);
      if (e.type === 'shop') await shop();
    }
    if (state.party.length > prevParty) trail = [];
  } else if (it.kind === 'herb') {
    pickHerb(state, it.id);
    ui.toast(`Herbe de baume cueillie (${state.herbs.length}/3)`);
    if (state.herbs.length === 3) await ui.dialog([{ who: 'Asher', text: 'Trois herbes de baume. Tamar va être contente. Retournons au puits du village.' }]);
  } else if (it.kind === 'chest') {
    const r = openChest(state, it.id);
    if (r) ui.toast(r.coins ? `Tu trouves ${r.coins} pièces de cuivre!` : `Tu trouves : ${ITEMS[r.item].name} ×${r.qty}`);
  } else if (it.kind === 'heal') {
    useHealSpot(state, it.id);
    ui.toast('L\'eau fraîche redonne toutes leurs forces à l\'équipe. Partie sauvegardée.');
  }
  persist();
  mode = 'explore';
}

async function shop() {
  for (;;) {
    const items = Object.entries(ITEMS).map(([id, it]) => ({ label: `${it.name} — ${it.price} cuivre`, note: `${it.desc} (tu en as ${state.inv[id] || 0})`, value: id, disabled: state.coins < it.price }));
    const v = await ui.choose(items, { title: `Étal d'Ilan · Cuivre : ${state.coins}` });
    if (!v) return;
    if (buy(state, v)) ui.toast(`Acheté : ${ITEMS[v].name}`);
  }
}

// ---------- Menu ----------
async function openMenu() {
  if (mode !== 'explore' || ui.busy) return;
  mode = 'busy';
  ui.hint(null);
  for (;;) {
    const v = await ui.choose([
      { label: 'Équipe', value: 'team' }, { label: 'Objets', value: 'items' }, { label: 'Quête', value: 'quest' },
      { label: `Légendes (${state.legends.length})`, value: 'legends' }, { label: 'Options', value: 'options' }, { label: 'Reprendre', value: null },
    ], { title: 'Menu' });
    if (!v) break;
    if (v === 'team') await ui.panel('Équipe', partySummary(state).map((p) => `<div class="stat"><b>${p.name}</b> · ${CHARACTERS[p.id].role} · Niv. ${p.level}<br>PV ${p.hp}/${p.maxHp} · PM ${p.mp}/${p.maxMp}<br>Force ${p.atk} · Défense ${p.def} · Magie ${p.mag} · Vitesse ${p.spd}<br><small>Prochain niveau dans ${xpToNext(p.xp)} XP · Sorts : ${spellsFor(p.id, p.level).map((s) => SPELLS[s].name).join(', ') || 'aucun'}</small></div>`).join('') + `<p>Cuivre : ${state.coins}</p>`);
    if (v === 'items') await itemsMenu();
    if (v === 'quest') await ui.panel('Quête', `<p><b>Objectif :</b> ${objective(state)}</p><p>Yonah, le frère d'Asher, a été emmené par les soldats de Nimrod vers les plaines de Shinar.</p><p class="small">Combats gagnés : ${state.stats.battles} · Temps : ${Math.round(state.stats.playtime / 60)} min</p>`);
    if (v === 'legends') await ui.panel('Écrits et légendes', state.legends.length ? state.legends.map((id) => `<div class="legend ${LEGENDS[id].kind === 'Écrit' ? 'ecrit' : 'leg'}"><span class="tag">${LEGENDS[id].kind}</span><b>${LEGENDS[id].title}</b><p>${LEGENDS[id].text}</p></div>`).join('') : '<p>Parle aux gens du village et à Eber pour découvrir ce qui est écrit et ce qui se raconte.</p>');
    if (v === 'options') await optionsMenu();
  }
  persist();
  mode = 'explore';
}

async function itemsMenu() {
  for (;;) {
    const items = Object.entries(ITEMS).map(([id, it]) => ({ label: `${it.name} ×${state.inv[id] || 0}`, note: it.desc, value: id, disabled: !(state.inv[id] > 0) }));
    const id = await ui.choose(items, { title: 'Objets' });
    if (!id) return;
    const who = await ui.choose(partySummary(state).map((p) => ({ label: `${p.name}  PV ${p.hp}/${p.maxHp}  PM ${p.mp}/${p.maxMp}`, value: p.id })), { title: `Utiliser ${ITEMS[id].name} sur...` });
    if (!who) continue;
    const m = state.members[who], st = statsFor(who, m.level);
    const target = { uid: who, hp: m.hp, maxHp: st.hp, mp: m.mp, maxMp: st.mp };
    if (!itemUsable(id, target, state.inv)) { ui.toast('Ça ne servirait à rien maintenant.'); continue; }
    applyItem(id, target, state.inv, []);
    m.hp = target.hp; m.mp = target.mp;
    ui.toast(`${CHARACTERS[who].name} utilise ${ITEMS[id].name}.`);
  }
}

async function optionsMenu() {
  for (;;) {
    const cur = state.settings.quality;
    const v = await ui.choose([
      { label: `Qualité : ${cur === 'auto' ? `Auto (${QUALITY_LEVELS[gov.level].name})` : QUALITY_LEVELS[cur].name}`, value: 'q', note: 'Auto baisse les effets si le jeu ralentit.' },
      { label: 'Plein écran', value: 'fs' },
      { label: 'Nouvelle partie', value: 'new', note: 'Efface la sauvegarde.' },
    ], { title: 'Options' });
    if (!v) return;
    if (v === 'q') {
      const q = await ui.choose([{ label: 'Auto', value: 'auto' }, ...QUALITY_LEVELS.map((l, i) => ({ label: l.name, value: String(i) })).reverse()], { title: 'Qualité graphique' });
      if (q) { state.settings.quality = q === 'auto' ? 'auto' : Number(q); applyQualitySetting(); persist(); }
    }
    if (v === 'fs') { try { await document.documentElement.requestFullscreen(); } catch { ui.toast('Plein écran non disponible.'); } }
    if (v === 'new') {
      const ok = await ui.choose([{ label: 'Oui, recommencer', value: 'y' }, { label: 'Non', value: null }], { title: 'Effacer la partie et recommencer?' });
      if (ok) { clear(); location.reload(); }
    }
  }
}

// ---------- Combat ----------
function targetItems(list, extra = (a) => `PV ${a.hp}/${a.maxHp}`) {
  return list.map((a) => ({ label: `${a.name}  ${extra(a)}`, value: a.uid }));
}

async function chooseCommand(b, actor) {
  for (;;) {
    const spells = spellsFor(actor.id, actor.level);
    const top = await ui.battleChoose([
      { label: 'Attaquer', value: 'attack' },
      { label: 'Magie', value: 'magic', disabled: !spells.length, note: spells.length ? '' : 'Pas encore' },
      { label: 'Objets', value: 'item' },
      { label: 'Défense', value: 'defend' },
      { label: b.boss ? 'Fuir (impossible)' : 'Fuir', value: 'flee', disabled: b.boss },
    ], `${actor.name} — que faire?`, false);
    if (top === 'attack') {
      const t = await ui.battleChoose(targetItems(living(b.enemies)), 'Cible');
      if (t) return { type: 'attack', target: t };
    } else if (top === 'magic') {
      const sp = await ui.battleChoose(spells.map((id) => ({ label: `${SPELLS[id].name} (${SPELLS[id].mp} PM)`, note: SPELLS[id].desc, value: id, disabled: !canCast(actor, id) })), 'Magie');
      if (!sp) continue;
      const S = SPELLS[sp];
      if (S.target === 'enemies' || S.target === 'allies') return { type: 'spell', spell: sp };
      const pool = S.target === 'ally' ? living(b.party) : living(b.enemies);
      const t = await ui.battleChoose(targetItems(pool), 'Cible');
      if (t) return { type: 'spell', spell: sp, target: t };
    } else if (top === 'item') {
      const it = await ui.battleChoose(Object.entries(ITEMS).map(([id, x]) => ({ label: `${x.name} ×${state.inv[id] || 0}`, note: x.desc, value: id, disabled: !(state.inv[id] > 0) })), 'Objets');
      if (!it) continue;
      const pool = b.party.filter((p) => itemUsable(it, p, state.inv));
      if (!pool.length) { ui.battleLog('Personne n\'en a besoin pour l\'instant.'); continue; }
      const t = await ui.battleChoose(targetItems(pool), 'Sur qui?');
      if (t) return { type: 'item', item: it, target: t };
    } else if (top === 'defend') return { type: 'defend' };
    else if (top === 'flee') return { type: 'flee' };
  }
}

function describe(b, actor, cmd) {
  if (cmd.label) return `${actor.name} : ${cmd.label}!`;
  if (cmd.type === 'attack') return `${actor.name} attaque!`;
  if (cmd.type === 'spell') return `${actor.name} lance ${SPELLS[cmd.spell].name}!`;
  if (cmd.type === 'item') return `${actor.name} utilise ${ITEMS[cmd.item].name}.`;
  if (cmd.type === 'defend') return `${actor.name} se met en garde.`;
  if (cmd.type === 'flee') return 'L\'équipe tente de fuir...';
  return `${actor.name} agit.`;
}

async function playEvents(b, actor, cmd, events) {
  ui.battleLog(describe(b, actor, cmd));
  if (cmd.type === 'attack') await renderer.lunge(actor.uid, cmd.target);
  if (cmd.type === 'spell' && SPELLS[cmd.spell].kind === 'physical') await renderer.projectile(actor.uid, cmd.target || living(b.enemies)[0]?.uid);
  if (cmd.type === 'shout') await renderer.lunge(actor.uid, null);
  const dmgTargets = events.filter((e) => e.type === 'damage').map((e) => e.target);
  if (cmd.type === 'spell' && SPELLS[cmd.spell].kind === 'magic') await renderer.burst(dmgTargets, cmd.spell === 'eclair' ? 0xfff3a0 : 0xe0b070, { rise: cmd.spell === 'eclair' });
  if (cmd.type === 'shout') await renderer.burst(dmgTargets, 0xd04040, { rise: false });
  const healTargets = events.filter((e) => ['heal', 'mana', 'revive'].includes(e.type)).map((e) => e.target);
  if (healTargets.length) renderer.burst(healTargets, 0xb8ffcf);
  for (const e of events) {
    const pos = renderer.battleActorScreen(e.target);
    if (e.type === 'damage') { ui.float(pos, e.crit ? `${e.amount}!` : String(e.amount), e.crit ? 'crit' : ''); renderer.hit(e.target); }
    if (e.type === 'heal') ui.float(pos, `+${e.amount}`, 'heal');
    if (e.type === 'mana') ui.float(pos, `+${e.amount} PM`, 'mana');
    if (e.type === 'revive') { renderer.revive(e.target); ui.float(pos, 'Debout!', 'heal'); }
    if (e.type === 'defend') ui.float(pos, 'Garde', 'mana');
    if (e.type === 'summon') { renderer.addBattleActor(b, findActor(b, e.target), b.enemies.length - 1); ui.battleLog('Kish appelle des gardes en renfort!'); }
    if (e.type === 'noflee') ui.battleLog('Impossible de fuir devant Kish!');
    if (e.type === 'fleefail') ui.battleLog('La fuite échoue!');
    if (e.type === 'fled') ui.battleLog('L\'équipe prend ses jambes à son cou!');
    if (e.type === 'fail') ui.battleLog(e.reason === 'mp' ? 'Pas assez de PM!' : 'Impossible.');
  }
  await wait(380);
  for (const e of events) if (e.type === 'ko') await renderer.ko(e.target);
  if (events.some((e) => e.type === 'ko')) await wait(150);
}

async function battle(enemyIds, { boss = false, zone = 'champs', intro = null } = {}) {
  mode = 'battle';
  ui.hint(null);
  await ui.flash();
  const b = createBattle(state, enemyIds, { rng: Math.random, boss });
  renderer.startBattle(b, boss ? 'boss' : zone);
  ui.showHud(false);
  ui.showTouch(false);
  ui.showBattle(true);
  ui.renderBattleParty(b);
  const names = [...new Set(b.enemies.map((e) => ENEMIES[e.id].name))].join(', ');
  ui.battleLog(intro || `Combat! ${names}`);
  await wait(900);
  while (!b.outcome) {
    const actor = nextActor(b);
    if (!actor) break;
    ui.renderBattleParty(b, actor.uid);
    renderer.highlight(actor.uid);
    let cmd;
    if (actor.side === 'party') { ui.battleLog(`Au tour de ${actor.name}.`); cmd = await chooseCommand(b, actor); }
    else { ui.el.battleMenu.innerHTML = ''; await wait(420); cmd = enemyChoose(b, actor); }
    ui.el.battleMenu.innerHTML = '';
    const events = perform(b, actor, cmd, state.inv);
    await playEvents(b, actor, cmd, events);
    ui.renderBattleParty(b);
  }
  renderer.highlight(null);
  const outcome = b.outcome;
  const levelUps = applyBattleResult(state, b);
  if (outcome === 'victory') {
    const r = b.rewards;
    ui.battleLog(`Victoire! +${r.xp} XP, +${r.coins} cuivre${r.drops.length ? ', ' + r.drops.map((d) => ITEMS[d].name).join(', ') : ''}`);
    await wait(1300);
    for (const u of levelUps) {
      ui.battleLog(`${CHARACTERS[u.id].name} passe au niveau ${u.to}!${u.newSpells.length ? ' Nouveau sort : ' + u.newSpells.map((s) => SPELLS[s].name).join(', ') : ''}`);
      await wait(1400);
    }
  } else if (outcome === 'defeat') {
    ui.battleLog('L\'équipe perd connaissance...');
    await wait(1600);
  } else await wait(700);
  await ui.flash();
  ui.showBattle(false);
  renderer.endBattle();
  ui.showHud(true);
  if (input.touchMode) ui.showTouch(true);
  graceLeft = ENCOUNTER_GRACE;
  if (outcome === 'defeat') {
    onDefeat(state);
    trail = [];
    await ui.dialog(state.party.includes('tamar')
      ? [{ who: 'Tamar', text: 'Asher... réveille-toi. Des bergers nous ont ramenés au puits. Reprends ton souffle, on va réessayer.' }]
      : [{ who: 'Adah', text: 'Mon pauvre garçon! Des bergers t\'ont ramené au puits. Repose-toi un peu, puis repars.' }]);
  }
  persist();
  return outcome;
}

// ---------- Exploration ----------
function dirFrom(v, prev) {
  if (Math.abs(v.x) < 0.01 && Math.abs(v.z) < 0.01) return prev;
  return Math.abs(v.x) > Math.abs(v.z) ? (v.x > 0 ? 'right' : 'left') : (v.z > 0 ? 'down' : 'up');
}

async function checkTriggers(dist) {
  // Patrouilles visibles
  const p = patrolAhead(state, state.pos);
  if (p) {
    mode = 'busy';
    await ui.dialog([{ who: 'Soldat', text: p.line }]);
    const out = await battle(p.group, { zone: 'canyon' });
    if (out === 'victory') defeatPatrol(state, p.id);
    else if (out === 'fled') { state.pos.z = p.z + 2.2; }
    persist();
    mode = 'explore';
    return;
  }
  if (bossReady(state, state.pos)) {
    mode = 'busy';
    await ui.dialog(bossIntro());
    const out = await battle(['kish'], { boss: true, intro: 'Kish, le contremaître de Nimrod, attaque!' });
    if (out === 'victory') { await ui.dialog(bossVictory(state)); persist(); }
    mode = 'explore';
    return;
  }
  if (reachedGate(state, state.pos)) { await endChapter(); return; }
  // Rencontres aléatoires
  const zone = zoneAt(state.pos.x, state.pos.z);
  if (!zone || dist <= 0) return;
  if (graceLeft > 0) { graceLeft -= dist; return; }
  encounterMeter += dist;
  while (encounterMeter >= 0.25) {
    encounterMeter -= 0.25;
    if (Math.random() < ENCOUNTERS[zone].rate / 4) {
      const groups = ENCOUNTERS[zone].groups;
      // Asher seul : pas de groupes de trois
      const pool = state.party.length === 1 ? groups.filter((g) => g.length <= 2) : groups;
      const g = pool[Math.floor(Math.random() * pool.length)];
      mode = 'busy';
      await battle(g, { zone });
      mode = 'explore';
      return;
    }
  }
}

function updateExplore(dt) {
  const v = input.vector();
  const dx = v.x * SPEED * dt, dz = v.z * SPEED * dt;
  const before = { x: state.pos.x, z: state.pos.z };
  const np = moveWithCollision(state.pos, dx, dz, 0.28, state);
  state.pos.x = np.x; state.pos.z = np.z;
  state.pos.dir = dirFrom(v, state.pos.dir);
  const dist = Math.hypot(np.x - before.x, np.z - before.z);
  moving = dist > 0.001;
  if (moving) {
    const last = trail[0];
    if (!last || Math.hypot(last.x - np.x, last.z - np.z) > 0.12) { trail.unshift({ x: np.x, z: np.z }); if (trail.length > 40) trail.pop(); }
  }
  const it = nearest();
  ui.hint(it ? `${input.touchMode ? 'A' : 'E'} : ${it.label}` : null);
  renderer.showMarker(it);
  ui.updateHud(state, regionName(state.pos.x, state.pos.z), objective(state), partySummary(state));
  saveTimer += dt;
  if (saveTimer > 8) { saveTimer = 0; persist(); }
  if (mode === 'explore') checkTriggers(dist);
}

async function endChapter() {
  mode = 'end';
  finishChapter(state);
  persist();
  ui.showHud(false); ui.showTouch(false); ui.hint(null);
  const lv = state.members.asher.level;
  const v = await ui.screen(`
    <div class="end">
      <div class="kicker">Fin du chapitre 1</div>
      <h1>À suivre : les plaines de Shinar</h1>
      <p>Asher, Tamar et Eber franchissent la porte. Au loin, la ville monte, brique après brique. Quelque part dans la foule, Yonah attend.</p>
      <p class="small">Niveau d'Asher : ${lv} · Combats gagnés : ${state.stats.battles} · Légendes : ${state.legends.length}/${Object.keys(LEGENDS).length} · Temps : ${Math.max(1, Math.round(state.stats.playtime / 60))} min</p>
      <p class="small">Inspiré de Genèse 10-11. Les légendes du jeu sont des interprétations et des spéculations, pas des faits.</p>
    </div>`, [{ label: 'Continuer à explorer', value: 'explore' }, { label: 'Écran titre', value: 'title' }]);
  if (v === 'title') { location.href = location.pathname + (params.get('v') ? `?v=${params.get('v')}` : ''); return; }
  ui.showHud(true); if (input.touchMode) ui.showTouch(true);
  state.pos.z = 4.5; mode = 'explore';
}

// ---------- Démarrage ----------
async function title() {
  const saved = load();
  renderer.syncWorld(state, trail);
  const buttons = [];
  if (saved) buttons.push({ label: 'Continuer', value: 'continue' });
  buttons.push({ label: saved ? 'Nouvelle partie' : 'Commencer', value: 'new' });
  const v = await ui.screen(`
    <div class="title">
      <div class="kicker">Un RPG inspiré de Genèse 10-11</div>
      <h1>BABEL</h1>
      <h2>Chapitre 1 · Le village de départ</h2>
      <p class="small">Clavier : WASD ou flèches · E / Entrée : parler, valider · Échap : menu. Sur téléphone : joystick et bouton A.</p>
    </div>`, buttons);
  if (v === 'continue' && saved) { state = saved; }
  else {
    if (saved) clear();
    state = newGame();
  }
  applyQualitySetting();
  ui.showHud(true);
  if (input.touchMode) ui.showTouch(true);
  mode = 'explore';
  if (v === 'new') {
    mode = 'busy';
    await ui.dialog([
      { who: '', text: 'Il y a très, très longtemps, après le déluge, les familles de Noé s\'étaient multipliées le long des grands fleuves.' },
      { who: '', text: 'Cette aventure s\'inspire de la Genèse. Ce qui y est écrit est présenté comme « Écrit ». Le reste vient de légendes et d\'idées de conteurs : ce sont des légendes du jeu, pas des faits.' },
      { who: 'Asher', text: 'Le troupeau est rentré... Mais le village est bien silencieux. Où est Yonah?' },
    ]);
    persist();
    mode = 'explore';
  }
}

async function testStart() {
  state = newGame();
  const lvl = TEST === 'boss' ? 5 : 3;
  const xp = [0, 0, 20, 50, 95, 155][lvl];
  state.members.asher.xp = xp; state.members.asher.level = lvl;
  joinParty(state, 'tamar'); joinParty(state, 'eber');
  healAll(state);
  state.step = STEP.kish; state.flags.lavanAside = true; state.herbs = HERBS.map((h) => h.id);
  state.legends = Object.keys(LEGENDS);
  applyQualitySetting();
  ui.showHud(true); if (input.touchMode) ui.showTouch(true);
  if (TEST === 'combat') { state.pos = { x: 4.5, z: 22.5, dir: 'up' }; mode = 'busy'; await battle(['chacal', 'serpent'], { zone: 'champs' }); mode = 'explore'; }
  else if (TEST === 'boss') { state.patrols = PATROLS.map((p) => p.id); state.pos = { x: 18.5, z: 8.2, dir: 'up' }; mode = 'explore'; }
  else if (TEST === 'fin') { state.patrols = PATROLS.map((p) => p.id); bossVictory(state); state.pos = { x: 18.5, z: 3.5, dir: 'up' }; mode = 'explore'; await wait(600); await endChapter(); }
  else if (TEST === 'canyon') { state.pos = { x: 17.5, z: 17.5, dir: 'up' }; mode = 'explore'; }
  else mode = 'explore';
}

input.onAction = () => doInteract();
input.onMenu = () => openMenu();
window.addEventListener('resize', () => renderer.resize());
document.addEventListener('visibilitychange', () => { if (document.hidden && mode !== 'title') persist(); });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const changed = gov.update((now - lastRaw) / 1000);
  lastRaw = now;
  if (changed !== null) renderer.setQuality(changed);
  renderer.step(dt);
  if (renderer.active === 'battle') renderer.updateBattle(dt);
  else {
    if (mode === 'explore' && !ui.busy) updateExplore(dt);
    else moving = false;
    if (mode !== 'title') state.stats.playtime += dt;
    renderer.updateWorld(dt, state, { moving, dir: state.pos.dir, trail, titleMode: mode === 'title' });
    if (mode !== 'explore') renderer.showMarker(null);
  }
  renderer.render();
  requestAnimationFrame(frame);
}
let lastRaw = performance.now();
requestAnimationFrame(frame);
window.__babel = { get state() { return state; }, get mode() { return mode; }, renderer, gov };
document.body.classList.add('ready');
if (TEST) testStart(); else title();
