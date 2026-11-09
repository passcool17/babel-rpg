// Entrées : clavier (WASD/flèches, E/Entrée/Espace, Échap) et manette tactile.
export class Input {
  constructor(ui) {
    this.ui = ui;
    this.held = new Set();
    this.stick = { x: 0, z: 0, active: false };
    this.onAction = () => {};
    this.onMenu = () => {};
    this.touchMode = false;
    window.addEventListener('keydown', (e) => this.keydown(e));
    window.addEventListener('keyup', (e) => this.held.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.held.clear());
    this.setupTouch();
  }

  keydown(e) {
    const k = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
    if (e.repeat && ['Enter', ' ', 'e', 'E', 'Escape'].includes(k)) return;
    if (this.ui.handleKey(k)) { e.preventDefault(); this.held.clear(); return; }
    if (k === 'Enter') e.preventDefault(); // évite le clic natif d'un bouton qui aurait le focus
    this.held.add(k.toLowerCase());
    if (['e', 'E', 'Enter', ' '].includes(k)) this.onAction();
    if (k === 'Escape') this.onMenu();
  }

  // Vecteur de déplacement (x, z), longueur ≤ 1.
  vector() {
    if (this.ui.busy) return { x: 0, z: 0 };
    let x = 0, z = 0;
    const h = this.held;
    if (h.has('a') || h.has('arrowleft')) x -= 1;
    if (h.has('d') || h.has('arrowright')) x += 1;
    if (h.has('w') || h.has('arrowup')) z -= 1;
    if (h.has('s') || h.has('arrowdown')) z += 1;
    if (this.stick.active) { x = this.stick.x; z = this.stick.z; }
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z };
  }

  enableTouch() {
    if (this.touchMode) return;
    this.touchMode = true;
    this.ui.showTouch(true);
    document.body.classList.add('touch');
  }

  setupTouch() {
    const stick = document.getElementById('stick'), knob = document.getElementById('stick-knob');
    const a = document.getElementById('btn-a');
    if (matchMedia('(pointer: coarse)').matches) this.enableTouch();
    window.addEventListener('touchstart', () => this.enableTouch(), { passive: true, once: true });
    let id = null, cx = 0, cy = 0;
    const R = 46;
    stick.addEventListener('pointerdown', (e) => {
      id = e.pointerId; stick.setPointerCapture(id);
      const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      this.stick.active = true; move(e);
    });
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const m = Math.hypot(dx, dy) / R;
      this.stick.x = m < 0.18 ? 0 : dx / R; this.stick.z = m < 0.18 ? 0 : dy / R;
    };
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.stick = { x: 0, z: 0, active: false }; knob.style.transform = ''; };
    stick.addEventListener('pointermove', move);
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    a.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!this.ui.handleKey('A')) this.onAction(); });
    document.getElementById('menu-btn').addEventListener('click', (e) => { e.stopPropagation(); if (!this.ui.busy) this.onMenu(); });
  }
}
