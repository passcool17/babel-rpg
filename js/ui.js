// Interface DOM : dialogues, menus, HUD, combat, écrans. Clavier et tactile.
import { portraitDataURL, LOOKS } from './sprites.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const WHO_LOOK = { Asher: 'asher', Tamar: 'tamar', Eber: 'eber', Adah: 'adah', Ilan: 'ilan', Noa: 'noa', Milka: 'milka', Lavan: 'lavan', Kish: 'kish' };

export class UI {
  constructor(root) {
    this.root = root;
    this.stack = []; // gestionnaires clavier modaux (le dernier reçoit les touches)
    this.portraits = {};
    root.innerHTML = `
      <div id="hud" class="hidden">
        <div id="hud-top"><div id="region"></div><div id="objective"></div></div>
        <div id="party-chips"></div>
        <button id="menu-btn" aria-label="Menu">☰</button>
      </div>
      <div id="hint" class="hidden"></div>
      <div id="toast" class="hidden"></div>
      <div id="dialog" class="hidden"><div id="dlg-portrait"></div><div id="dlg-body"><div id="dlg-name"></div><div id="dlg-text"></div><div id="dlg-next">▼</div></div></div>
      <div id="battle-ui" class="hidden"><div id="battle-log"></div><div id="battle-bottom"><div id="battle-party"></div><div id="battle-menu"></div></div></div>
      <div id="overlay" class="hidden"></div>
      <div id="floaters"></div>
      <div id="flash"></div>
      <div id="touch" class="hidden"><div id="stick"><div id="stick-knob"></div></div><button id="btn-a" aria-label="Action">A</button></div>
    `;
    this.el = {
      hud: $('#hud', root), region: $('#region', root), objective: $('#objective', root), chips: $('#party-chips', root),
      hint: $('#hint', root), toast: $('#toast', root), dialog: $('#dialog', root), dlgName: $('#dlg-name', root), dlgText: $('#dlg-text', root),
      dlgPortrait: $('#dlg-portrait', root), battle: $('#battle-ui', root), battleLog: $('#battle-log', root), battleParty: $('#battle-party', root),
      battleMenu: $('#battle-menu', root), overlay: $('#overlay', root), floaters: $('#floaters', root), flash: $('#flash', root), touch: $('#touch', root),
      menuBtn: $('#menu-btn', root), btnA: $('#btn-a', root),
    };
  }

  portrait(who) {
    const look = WHO_LOOK[who];
    if (!look || !LOOKS[look]) return '';
    if (!this.portraits[look]) this.portraits[look] = portraitDataURL(look, 4);
    return this.portraits[look];
  }

  push(handler) { this.stack.push(handler); document.body.classList.add('modal'); }
  pop(handler) { const i = this.stack.lastIndexOf(handler); if (i >= 0) this.stack.splice(i, 1); if (!this.stack.length) document.body.classList.remove('modal'); }
  get busy() { return this.stack.length > 0; }
  handleKey(key) {
    const h = this.stack[this.stack.length - 1];
    if (!h) return false;
    h(key);
    return true;
  }

  // ----- HUD -----
  showHud(on) { this.el.hud.classList.toggle('hidden', !on); }
  updateHud(state, region, objective, party) {
    this.el.region.textContent = region;
    this.el.objective.textContent = objective;
    const html = party.map((p) => `<div class="chip"><b>${esc(p.name)}</b> <small>Niv. ${p.level}</small><div class="bar"><i style="width:${(100 * p.hp) / p.maxHp}%"></i></div></div>`).join('');
    if (this.el.chips.innerHTML !== html) this.el.chips.innerHTML = html;
  }
  hint(text) {
    this.el.hint.classList.toggle('hidden', !text);
    if (text && this.el.hint.textContent !== text) this.el.hint.textContent = text;
  }
  toast(text, ms = 2200) {
    const t = this.el.toast;
    t.textContent = text; t.classList.remove('hidden');
    clearTimeout(this._toast);
    this._toast = setTimeout(() => t.classList.add('hidden'), ms);
  }
  showTouch(on) { this.el.touch.classList.toggle('hidden', !on); }

  // ----- Dialogue -----
  dialog(lines) {
    return new Promise((resolve) => {
      const d = this.el.dialog;
      let i = 0, typing = null, full = '';
      const show = () => {
        const l = lines[i];
        const pic = this.portrait(l.who);
        this.el.dlgPortrait.innerHTML = pic ? `<img alt="" src="${pic}">` : '';
        this.el.dlgPortrait.classList.toggle('hidden', !pic);
        this.el.dlgName.textContent = l.who || '';
        full = l.text; let n = 0;
        this.el.dlgText.textContent = '';
        clearInterval(typing);
        typing = setInterval(() => {
          n += 2;
          this.el.dlgText.textContent = full.slice(0, n);
          if (n >= full.length) { clearInterval(typing); typing = null; }
        }, 16);
      };
      const advance = () => {
        if (typing) { clearInterval(typing); typing = null; this.el.dlgText.textContent = full; return; }
        i++;
        if (i >= lines.length) { close(); resolve(); } else show();
      };
      const key = (k) => { if (['Enter', ' ', 'e', 'E', 'Escape', 'A'].includes(k)) advance(); };
      const click = (ev) => { ev.preventDefault(); advance(); };
      const close = () => { d.classList.add('hidden'); d.removeEventListener('pointerup', click); this.pop(key); };
      d.classList.remove('hidden');
      d.addEventListener('pointerup', click);
      this.push(key);
      show();
    });
  }

  // ----- Liste de choix générique -----
  // items : [{label, value, disabled, note}] ; retourne la valeur choisie ou null (annulation).
  choose(items, { title = '', container = null, cancelable = true, className = '' } = {}) {
    return new Promise((resolve) => {
      const host = container || this.el.overlay;
      const isOverlay = !container;
      const box = document.createElement('div');
      box.className = 'choice ' + className;
      box.innerHTML = (title ? `<div class="choice-title">${esc(title)}</div>` : '') + '<div class="choice-list"></div>' + (cancelable ? '<button class="choice-back">← Retour</button>' : '');
      const list = $('.choice-list', box);
      let idx = Math.max(0, items.findIndex((it) => !it.disabled));
      const btns = items.map((it, i) => {
        const b = document.createElement('button');
        b.className = 'choice-item' + (it.disabled ? ' disabled' : '');
        b.innerHTML = `<span>${esc(it.label)}</span>${it.note ? `<small>${esc(it.note)}</small>` : ''}`;
        b.addEventListener('click', (ev) => { ev.stopPropagation(); if (!it.disabled) done(it.value); else { idx = i; paint(); } });
        list.appendChild(b);
        return b;
      });
      const paint = () => btns.forEach((b, i) => b.classList.toggle('focus', i === idx));
      const move = (d) => { for (let n = 0; n < items.length; n++) { idx = (idx + d + items.length) % items.length; if (!items[idx].disabled) break; } paint(); };
      const key = (k) => {
        if (k === 'ArrowDown' || k === 's' || k === 'S') move(1);
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') move(-1);
        else if (['Enter', ' ', 'e', 'E', 'A'].includes(k)) { const it = items[idx]; if (it && !it.disabled) done(it.value); }
        else if (k === 'Escape' && cancelable) done(null);
      };
      const done = (v) => {
        this.pop(key); box.remove();
        if (isOverlay && !host.children.length) host.classList.add('hidden');
        resolve(v);
      };
      if (cancelable) $('.choice-back', box).addEventListener('click', (ev) => { ev.stopPropagation(); done(null); });
      host.appendChild(box);
      if (isOverlay) host.classList.remove('hidden');
      this.push(key);
      paint();
    });
  }

  // Panneau d'information (fermé par Échap/Entrée/clic).
  panel(title, html) {
    return new Promise((resolve) => {
      const o = this.el.overlay;
      const box = document.createElement('div');
      box.className = 'panel';
      box.innerHTML = `<div class="choice-title">${esc(title)}</div><div class="panel-body">${html}</div><button class="choice-back">← Retour</button>`;
      const key = (k) => { if (['Escape', 'Enter', ' ', 'e', 'E', 'A'].includes(k)) done(); };
      const done = () => { this.pop(key); box.remove(); if (!o.children.length) o.classList.add('hidden'); resolve(); };
      $('.choice-back', box).addEventListener('click', done);
      o.appendChild(box); o.classList.remove('hidden');
      this.push(key);
    });
  }

  // ----- Écrans -----
  screen(html, buttons) {
    return new Promise((resolve) => {
      const o = this.el.overlay;
      const box = document.createElement('div');
      box.className = 'screen';
      box.innerHTML = html + '<div class="screen-buttons"></div>';
      const host = $('.screen-buttons', box);
      const items = buttons.map((b) => ({ label: b.label, value: b.value }));
      o.appendChild(box); o.classList.remove('hidden');
      this.choose(items, { container: host, cancelable: false, className: 'screen-choice' }).then((v) => { box.remove(); if (!o.children.length) o.classList.add('hidden'); resolve(v); });
    });
  }

  flash() {
    const f = this.el.flash;
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    return new Promise((r) => setTimeout(r, 520));
  }

  // ----- Combat -----
  showBattle(on) { this.el.battle.classList.toggle('hidden', !on); if (!on) { this.el.battleMenu.innerHTML = ''; this.el.floaters.innerHTML = ''; } }
  battleLog(text) { this.el.battleLog.textContent = text; }
  renderBattleParty(b, activeUid) {
    this.el.battleParty.innerHTML = b.party.map((p) => `
      <div class="bp ${p.uid === activeUid ? 'active' : ''} ${p.hp === 0 ? 'ko' : ''}">
        <b>${esc(p.name)}</b>
        <span class="hp">PV ${p.hp}/${p.maxHp}</span><div class="bar"><i style="width:${(100 * p.hp) / p.maxHp}%"></i></div>
        <span class="mp">PM ${p.mp}/${p.maxMp}</span><div class="bar mpb"><i style="width:${p.maxMp ? (100 * p.mp) / p.maxMp : 0}%"></i></div>
      </div>`).join('');
  }
  battleChoose(items, title, cancelable = true) {
    this.el.battleMenu.innerHTML = '';
    return this.choose(items, { title, container: this.el.battleMenu, cancelable, className: 'battle-choice' });
  }
  float(pos, text, cls = '') {
    if (!pos) return;
    const d = document.createElement('div');
    d.className = 'floater ' + cls;
    d.textContent = text;
    d.style.left = `${pos.x * 100}%`; d.style.top = `${pos.y * 100}%`;
    this.el.floaters.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }
}
