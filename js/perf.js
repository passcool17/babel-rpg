// Gouverneur de qualité : baisse automatiquement si les FPS chutent, remonte prudemment.
export const QUALITY_LEVELS = [
  { name: 'Minimale', pixelRatio: 0.75, shadows: false, shadowSize: 0, decor: 0.35 },
  { name: 'Basse', pixelRatio: 1, shadows: false, shadowSize: 0, decor: 0.6 },
  { name: 'Moyenne', pixelRatio: 1.5, shadows: true, shadowSize: 1024, decor: 0.85 },
  { name: 'Haute', pixelRatio: 2, shadows: true, shadowSize: 2048, decor: 1 },
];

export class QualityGovernor {
  constructor({ start = 3, mode = 'auto', low = 48, high = 58, window = 2, upAfter = 8, maxUps = 2 } = {}) {
    this.level = start; this.mode = mode;
    this.low = low; this.high = high; this.window = window; this.upAfter = upAfter; this.maxUps = maxUps;
    this.acc = 0; this.frames = 0; this.goodTime = 0; this.ups = 0; this.warmup = 1.5;
  }
  setMode(mode) { // 'auto' ou un niveau 0-3
    this.mode = mode;
    if (mode !== 'auto') this.level = Math.max(0, Math.min(3, Number(mode)));
    this.acc = 0; this.frames = 0; this.goodTime = 0;
  }
  // Retourne le nouveau niveau si changement, sinon null.
  update(dt) {
    if (this.mode !== 'auto') return null;
    if (this.warmup > 0) { this.warmup -= dt; return null; }
    if (dt > 0.5) return null; // onglet en pause, chargement
    this.acc += dt; this.frames++;
    if (this.acc < this.window) return null;
    const fps = this.frames / this.acc;
    this.acc = 0; this.frames = 0;
    this.lastFps = fps;
    if (fps < this.low && this.level > 0) { this.level--; this.goodTime = 0; this.warmup = 1; return this.level; }
    if (fps > this.high) {
      this.goodTime += this.window;
      if (this.goodTime >= this.upAfter && this.level < 3 && this.ups < this.maxUps) {
        this.level++; this.ups++; this.goodTime = 0; this.warmup = 1; return this.level;
      }
    } else this.goodTime = 0;
    return null;
  }
}

export function initialLevel({ coarse = false, dpr = 1, cores = 4 } = {}) {
  if (coarse) return dpr >= 2.5 && cores >= 8 ? 2 : 1;
  return 3;
}
