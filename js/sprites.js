// Pixel art original généré par code (canvas). Aucun fichier image externe.
export const FRAME_W = 16, FRAME_H = 24;
export const ENEMY_FRAME = 32;
const OUTLINE = [42, 26, 18, 255];

export const LOOKS = {
  asher: { skin: '#c98d5e', hair: '#3a2416', hairStyle: 'short', robe: '#d9c39a', robeDark: '#b39a6c', sash: '#2a9d8f', item: 'crook' },
  tamar: { skin: '#b97a52', hair: '#1f1410', hairStyle: 'long', robe: '#3f8f88', robeDark: '#2c6b66', sash: '#e9c46a', scarf: '#e76f51', item: 'bag' },
  eber: { skin: '#c48a63', hair: '#e8e4dc', hairStyle: 'bald', beard: '#efeae2', robe: '#7a5c99', robeDark: '#5b4475', sash: '#e9c46a', item: 'staff' },
  adah: { skin: '#b98058', hair: '#2b1b12', hairStyle: 'scarf', scarf: '#c8553d', robe: '#a8746a', robeDark: '#87574f', sash: '#f2cc8f' },
  ilan: { skin: '#c18a5f', hair: '#2a1a10', hairStyle: 'short', beard: '#2a1a10', robe: '#e9c46a', robeDark: '#c9a043', sash: '#9c2f2f', item: 'bag' },
  noa: { skin: '#c99063', hair: '#3b2414', hairStyle: 'short', robe: '#f4a261', robeDark: '#d48541', sash: '#264653', kid: true },
  milka: { skin: '#b67a55', hair: '#9a9a9a', hairStyle: 'scarf', scarf: '#3d5a80', robe: '#98c1d9', robeDark: '#7aa3bb', sash: '#ee6c4d' },
  lavan: { skin: '#b9845c', hair: '#cfcac0', hairStyle: 'short', beard: '#d8d3ca', robe: '#8d6e4f', robeDark: '#6e5238', sash: '#c9b37e', item: 'crook' },
  soldat: { skin: '#b37650', hair: '#1c120c', hairStyle: 'helmet', helmet: '#b08d57', beard: '#4a2e1c', robe: '#8c2f2f', robeDark: '#6b2020', sash: '#b08d57', item: 'spear' },
  kish: { skin: '#a96d47', hair: '#120c08', hairStyle: 'helmet', helmet: '#d4a84b', beard: '#3a2416', robe: '#5e1f2b', robeDark: '#45141e', sash: '#d4a84b', item: 'whip', cape: '#2b2d42' },
};

function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

// Dessine un humain 16x24. dir : 'down' | 'up' | 'right'. frame : 0 ou 1 (pas).
export function drawHuman(ctx, ox, oy, L, dir, frame) {
  const k = L.kid ? 3 : 0; // les enfants sont plus petits
  const p = (x, y, w, h, c) => px(ctx, ox + x, oy + y + k, w, h, c);
  const pBody = (x, y, w, h, c) => px(ctx, ox + x, oy + y + k, w, Math.max(0, h - (y + h > 20 ? 0 : 0)), c);
  const step = frame === 1;
  // Cape (dos)
  if (L.cape && dir !== 'up') { p(3, 10, 10, 10, L.cape); }
  if (L.cape && dir === 'up') { p(3, 10, 10, 11, L.cape); }
  // Jambes et sandales
  const legY = 19;
  if (dir === 'right') {
    p(6, legY, 2, step ? 4 : 5 - k, L.skin); p(8, legY, 2, step ? 5 - k : 4, L.skin);
    p(step ? 5 : 6, 23 - k, 3, 1, '#5a3a22'); p(step ? 9 : 8, 23 - k, 3, 1, '#5a3a22');
  } else {
    p(5, legY, 2, step ? 4 - k : 5 - k, L.skin); p(9, legY, 2, step ? 5 - k : 4 - k, L.skin);
    p(5, (step ? 22 : 23) - k, 2, 1, '#5a3a22'); p(9, (step ? 23 : 22) - k, 2, 1, '#5a3a22');
  }
  // Robe
  pBody(4, 10, 8, 10, L.robe);
  p(3, 16, 10, 4, L.robe);
  p(3, 19, 10, 1, L.robeDark);
  p(dir === 'right' ? 4 : 10, 11, 2, 8, L.robeDark);
  p(4, 14, 8, 1, L.sash);
  if (dir === 'down') p(7, 15, 2, 1, L.sash);
  // Bras
  const swing = step ? 1 : 0;
  if (dir === 'right') {
    p(7, 11 + swing, 3, 5, L.robeDark); p(8, 16 + swing, 2, 2, L.skin);
  } else {
    p(2, 11 + swing, 2, 5, L.robeDark); p(12, 12 - swing, 2, 5, L.robeDark);
    p(2, 16 + swing, 2, 2, L.skin); p(12, 17 - swing, 2, 2, L.skin);
  }
  // Tête
  p(7, 9, 2, 1, L.skin);
  p(5, 3, 6, 6, L.skin);
  p(4, 4, 1, 4, L.skin); p(11, 4, 1, 4, L.skin);
  // Cheveux / coiffe
  const hs = L.hairStyle;
  if (hs === 'short') { p(4, 2, 8, 2, L.hair); p(4, 4, 1, 2, L.hair); p(11, 4, 1, 2, L.hair); if (dir === 'up') p(4, 2, 8, 6, L.hair); if (dir === 'right') p(4, 2, 4, 5, L.hair); }
  if (hs === 'long') { p(4, 2, 8, 2, L.hair); p(3, 3, 2, 8, L.hair); p(11, 3, 2, 8, L.hair); if (dir === 'up') p(3, 2, 10, 9, L.hair); if (dir === 'right') p(3, 2, 5, 9, L.hair); }
  if (hs === 'bald') { p(4, 5, 1, 3, L.hair); p(11, 5, 1, 3, L.hair); if (dir === 'up') p(4, 5, 8, 3, L.hair); }
  if (hs === 'scarf' || L.scarf) {
    const c = L.scarf || L.hair;
    if (hs === 'scarf') { p(4, 1, 8, 3, c); p(3, 3, 2, 9, c); p(11, 3, 2, 9, c); if (dir === 'up') p(3, 1, 10, 11, c); if (dir === 'right') p(3, 1, 6, 11, c); }
    else { p(4, 2, 8, 1, c); } // bandeau
  }
  if (hs === 'helmet') { p(4, 1, 8, 3, L.helmet); p(3, 3, 10, 1, L.helmet); p(7, 0, 2, 1, L.helmet); if (dir === 'up') p(4, 1, 8, 6, L.helmet); }
  // Barbe
  if (L.beard && dir !== 'up') { if (dir === 'right') { p(7, 8, 4, 2, L.beard); p(10, 7, 1, 1, L.beard); } else { p(5, 8, 6, 2, L.beard); p(5, 7, 1, 1, L.beard); p(10, 7, 1, 1, L.beard); } }
  // Yeux
  if (dir === 'down') { p(6, 5, 1, 2, '#1a1010'); p(9, 5, 1, 2, '#1a1010'); if (!L.beard) p(7, 8, 2, 1, '#9b5a3c'); }
  if (dir === 'right') { p(9, 5, 1, 2, '#1a1010'); }
  // Accessoires
  if (L.item === 'crook') { const x = dir === 'right' ? 11 : 13; p(x, 4, 1, 19 - k, '#7a5230'); p(x - 1, 3, 2, 1, '#7a5230'); p(x - 2, 4, 1, 2, '#7a5230'); }
  if (L.item === 'staff') { const x = dir === 'right' ? 11 : 13; p(x, 2, 1, 21, '#6b4a2b'); p(x - 1, 1, 3, 2, '#e9c46a'); }
  if (L.item === 'spear') { const x = dir === 'right' ? 11 : 13; p(x, 0, 1, 23, '#7a5230'); p(x - 1, 0, 3, 2, '#c9c9c9'); }
  if (L.item === 'whip') { if (dir !== 'up') { p(12, 15, 1, 3, '#3a2416'); p(13, 18, 1, 3, '#3a2416'); p(12, 21, 2, 1, '#3a2416'); } }
  if (L.item === 'bag' && dir !== 'up') { p(dir === 'right' ? 3 : 10, 15, 3, 3, '#8a5a3a'); }
}

function outline(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a(x, y) > 0) continue;
    if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
      const i = (y * w + x) * 4;
      out[i] = OUTLINE[0]; out[i + 1] = OUTLINE[1]; out[i + 2] = OUTLINE[2]; out[i + 3] = OUTLINE[3];
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
}

function canvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Feuille de 8 images : bas0 bas1 haut0 haut1 droite0 droite1 gauche0 gauche1.
export const DIR_FRAMES = { down: 0, up: 2, right: 4, left: 6 };
export function humanSheet(look) {
  const L = LOOKS[look];
  const c = canvas(FRAME_W * 8, FRAME_H);
  const ctx = c.getContext('2d');
  const dirs = ['down', 'up', 'right'];
  dirs.forEach((dir, di) => { for (let f = 0; f < 2; f++) drawHuman(ctx, (di * 2 + f) * FRAME_W, 0, L, dir, f); });
  // gauche = miroir de droite
  for (let f = 0; f < 2; f++) {
    ctx.save();
    ctx.translate((6 + f) * FRAME_W + FRAME_W, 0); ctx.scale(-1, 1);
    ctx.drawImage(c, (4 + f) * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
    ctx.restore();
  }
  outline(ctx, c.width, c.height);
  return c;
}

// --- Ennemis (32x32, 2 images de respiration, tournés vers la droite) ---
function drawJackal(p, f) {
  const b = '#c98a4b', d = '#9c6634', l = '#e8c28f';
  p(6, 16 - f, 16, 7, b); p(7, 22 - f, 14, 2, l);
  p(20, 11 - f, 7, 7, b); p(26, 14 - f, 3, 3, b); p(28, 15 - f, 1, 1, '#1a1010');
  p(21, 7 - f, 2, 4, d); p(25, 7 - f, 2, 4, d); p(24, 13 - f, 1, 1, '#f2e14b');
  p(2, 14 - f, 5, 2, d); p(1, 12 - f, 2, 2, d);
  p(7, 23, 2, 6, d); p(11, 23, 2, 6 - f, d); p(17, 23, 2, 6, d); p(20, 23, 2, 6 - f, d);
}
function drawSnake(p, f) {
  const g = '#4f8a3c', d = '#35612a', t = '#2ec4b6';
  p(4, 24, 22, 5, g); p(6, 21, 18, 3, d); p(8, 25, 3, 2, t); p(15, 25, 3, 2, t); p(21, 25, 3, 2, t);
  p(18, 12 + f, 5, 10, g); p(19, 14 + f, 2, 6, t);
  p(19, 8 + f, 9, 5, g); p(25, 9 + f, 1, 1, '#f2e14b'); p(28, 11 + f, 3, 1, '#d62828'); p(30, 10 + f, 1, 1, '#d62828');
}
function drawScorpion(p, f) {
  const b = '#5c3b24', d = '#3e2716', h = '#8a5a3a';
  p(6, 20, 16, 6, b); p(8, 18, 12, 2, h);
  for (let i = 0; i < 4; i++) { p(7 + i * 4, 26, 2, 3, d); }
  p(4, 14 - f, 3, 7, b); p(4, 10 - f, 3, 4, b); p(6, 7 - f, 5, 3, b); p(10, 8 - f, 2, 3, '#e9c46a');
  p(21, 18, 6, 3, b); p(25, 15 + f, 5, 4, h); p(29, 14 + f, 2, 2, d); p(29, 18 + f, 2, 2, d);
  p(20, 19, 1, 1, '#d62828'); p(18, 19, 1, 1, '#d62828');
}

export function enemySheet(kind) {
  const c = canvas(ENEMY_FRAME * 2, ENEMY_FRAME);
  const ctx = c.getContext('2d');
  for (let f = 0; f < 2; f++) {
    const ox = f * ENEMY_FRAME;
    const p = (x, y, w, h, col) => px(ctx, ox + x, y, w, h, col);
    if (kind === 'chacal') drawJackal(p, f);
    else if (kind === 'serpent') drawSnake(p, f);
    else if (kind === 'scorpion') drawScorpion(p, f);
    else drawHuman(ctx, ox + 8, 8 - f, LOOKS[kind] || LOOKS.soldat, 'right', 0);
  }
  outline(ctx, c.width, c.height);
  return c;
}

// Lueur d'herbe de baume, 16x16.
export function herbSprite() {
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(220,255,200,1)'); g.addColorStop(0.35, 'rgba(120,230,140,0.9)'); g.addColorStop(1, 'rgba(60,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
  px(ctx, 7, 6, 2, 6, '#2d6a4f'); px(ctx, 5, 7, 2, 2, '#52b788'); px(ctx, 9, 5, 2, 2, '#52b788');
  return c;
}

export function shadowTexture() {
  const c = canvas(32, 32);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(40,20,10,0.55)'); g.addColorStop(1, 'rgba(40,20,10,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  return c;
}

// Portrait agrandi (image de face) pour les dialogues.
export function portraitDataURL(look, scale = 4) {
  if (!LOOKS[look]) return '';
  const sheet = humanSheet(look);
  const c = canvas(FRAME_W * scale, FRAME_H * scale);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, 0, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W * scale, FRAME_H * scale);
  return c.toDataURL ? c.toDataURL() : '';
}
