// Rendu 2.5D : décor three.js low-poly + sprites pixel art face caméra.
import * as THREE from 'three';
import { MAP, W, H, HOUSES, riverStart, pathCenter } from './world.js';
import { NPCS, HERBS, CHESTS, PATROLS, HEAL_SPOTS } from './data.js';
import { humanSheet, enemySheet, herbSprite, shadowTexture, DIR_FRAMES, FRAME_W, FRAME_H } from './sprites.js';
import { QUALITY_LEVELS } from './perf.js';

const COLORS = {
  sky: 0x8fd3d0, haze: 0xeed9b0, grass: '#9bb35a', grass2: '#8aa64e', earth: '#cfa875', earth2: '#c39a66',
  wheat: '#e3bd5b', wheat2: '#d6a944', path: '#dcc08c', path2: '#cfb27c', sand: '#d9a86c', sand2: '#c99658',
  bank: '#cdb084', reed: '#6f9a4a', water: '#1f6f78', cliff: '#b5774a', brick: '#c9935c',
};

function hash(x, z) { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

function canvasTex(c, { repeat = false, nearest = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.userData && o.userData.shared) return;
    if (o.geometry) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach((m) => { if (m.map && !m.map.userData.shared) m.map.dispose(); m.dispose(); });
  });
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function groundCanvas() {
  const T = 8;
  const c = mkCanvas(W * T, H * T);
  const ctx = c.getContext('2d');
  const pal = {
    '.': [COLORS.grass, COLORS.grass2], ',': [COLORS.earth, COLORS.earth2], 'f': [COLORS.wheat2, '#c99a3c'], 'r': ['#7f9f52', '#6d8c45'],
    'b': [COLORS.bank, '#bfa274'], '=': [COLORS.path, COLORS.path2], 'd': [COLORS.sand, COLORS.sand2], 'W': ['#1d5a60', '#1a5157'],
    'X': [COLORS.cliff, '#a86c42'], 'R': [COLORS.sand, COLORS.sand2], 'H': [COLORS.earth2, COLORS.earth2], 'T': [COLORS.grass2, COLORS.grass2],
    'O': [COLORS.earth, COLORS.earth], 'M': [COLORS.earth, COLORS.earth], 'S': [COLORS.grass, COLORS.grass], 'P': [COLORS.path, COLORS.path], 'C': [COLORS.sand, COLORS.sand], 'Q': [COLORS.sand, COLORS.sand],
  };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = MAP[z][x];
    const [a, b] = pal[t] || pal['.'];
    ctx.fillStyle = a; ctx.fillRect(x * T, z * T, T, T);
    for (let i = 0; i < 6; i++) {
      const r = hash(x * 13 + i, z * 7 + i * 3);
      ctx.fillStyle = r < 0.5 ? b : (t === '.' ? '#a9c068' : b);
      ctx.fillRect(x * T + Math.floor(hash(x + i * 5, z) * T), z * T + Math.floor(hash(x, z + i * 9) * T), 1 + (r < 0.2 ? 1 : 0), 1);
    }
  }
  // Transitions douces : bord du sentier
  return c;
}

function brickCanvas(base = '#c9935c') {
  const c = mkCanvas(32, 32);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = 'rgba(90,50,25,0.35)';
  for (let y = 0; y < 32; y += 6) {
    ctx.fillRect(0, y, 32, 1);
    for (let x = (y / 6) % 2 ? 0 : 5; x < 32; x += 10) ctx.fillRect(x, y, 1, 6);
  }
  for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,230,190,0.12)' : 'rgba(80,40,20,0.12)'; ctx.fillRect(hash(i, 3) * 32 | 0, hash(3, i) * 32 | 0, 2, 1); }
  return c;
}

function skyCanvas() {
  const c = mkCanvas(2, 256);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#4fb0b8'); g.addColorStop(0.45, '#9fd8cf'); g.addColorStop(0.75, '#f1dcae'); g.addColorStop(1, '#eed9b0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
  return c;
}

function waterCanvas() {
  const c = mkCanvas(64, 64);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2aa6a1'; ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = i % 3 ? 'rgba(180,240,230,0.45)' : 'rgba(20,90,100,0.5)';
    ctx.fillRect(hash(i, 11) * 64 | 0, hash(17, i) * 64 | 0, 3 + (hash(i, i) * 6 | 0), 1);
  }
  return c;
}

function palmLeafGeometry() {
  const g = new THREE.PlaneGeometry(0.32, 1.5, 1, 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.75; // 0..1.5
    const w = Math.sin((y / 1.5) * Math.PI) * 0.9 + 0.1;
    p.setX(i, p.getX(i) * w);
    p.setZ(i, -0.45 * (y / 1.5) ** 2 * 1.5);
    p.setY(i, y);
  }
  g.rotateX(-Math.PI / 2.3);
  g.computeVertexNormals();
  return g;
}

function makeSpriteTexture(sheet, frames) {
  const t = canvasTex(sheet);
  t.repeat.set(1 / frames, 1);
  return t;
}

export class GameRenderer {
  constructor(canvas, { level = 3 } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.clock = 0;
    this.tweens = [];
    this.scene = new THREE.Scene();
    this.battleScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.battleCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.active = 'world';
    this.sheets = {};
    this.shadowTex = canvasTex(shadowTexture(), { nearest: false }); this.shadowTex.userData.shared = true;
    this.decorMeshes = [];
    this.level = level;
    this.buildWorld();
    this.buildBattleStage();
    this.setQuality(level);
    this.resize();
  }

  sheet(look, enemy = false) {
    const k = (enemy ? 'e:' : 'h:') + look;
    if (!this.sheets[k]) this.sheets[k] = enemy ? enemySheet(look) : humanSheet(look);
    return this.sheets[k];
  }

  // ---------- Monde ----------
  buildWorld() {
    const s = this.scene;
    s.background = canvasTex(skyCanvas(), { nearest: false });
    s.fog = new THREE.Fog(COLORS.haze, 30, 110);
    this.hemi = new THREE.HemisphereLight(0xfff1d6, 0x7a6a4a, 1.25);
    s.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe2b0, 2.1);
    this.sun.position.set(12, 22, 14);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 70;
    this.sun.shadow.bias = -0.0008;
    s.add(this.sun); s.add(this.sun.target);

    // Sol de la carte
    const gtex = canvasTex(groundCanvas());
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: gtex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, 0, H / 2); ground.receiveShadow = true;
    s.add(ground);
    // Sol lointain
    const far = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0xc9a66d }));
    far.rotation.x = -Math.PI / 2; far.position.set(W / 2, -0.03, H / 2);
    s.add(far);

    this.buildWater();
    this.buildCliffs();
    this.buildHouses();
    this.buildPalms();
    this.buildFields();
    this.buildProps();
    this.buildFarScenery();
    this.buildActors();
  }

  buildWater() {
    const tex = canvasTex(waterCanvas(), { repeat: true });
    tex.repeat.set(10, 30);
    this.waterTex = tex;
    const mat = new THREE.MeshPhongMaterial({ color: 0x3cc4bc, map: tex, transparent: true, opacity: 0.86, shininess: 90, specular: 0xbff5ef });
    const pos = [];
    const quad = (x0, z0, x1, z1) => { pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z0, x1, 0, z0, x0, 0, z1, x1, 0, z1); };
    for (let z = 19; z < H; z++) quad(riverStart(z) - 0.1, z, 40, z + 1);
    quad(40, 18.5, 200, 200); quad(30, 56, 40, 200);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / 6, pos[i + 2] / 6);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.position.y = 0.04; m.receiveShadow = true;
    tex.repeat.set(1, 1);
    this.scene.add(m);
  }

  buildCliffs() {
    const tiles = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (MAP[z][x] === 'X') tiles.push([x, z]);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geo, mat, tiles.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    tiles.forEach(([x, z], i) => {
      const canyon = z <= 18;
      const h = canyon ? 1.6 + hash(x, z) * 1.6 + Math.min(3, Math.abs(x - pathCenter(Math.min(z, 16))) * 0.08) : 0.7;
      m4.makeScale(1, h, 1); m4.setPosition(x + 0.5, 0, z + 0.5);
      mesh.setMatrixAt(i, m4);
      col.set(canyon ? (hash(z, x) < 0.5 ? 0xb5774a : 0xa96a40) : 0xc9935c); col.offsetHSL(0, 0, (hash(x * 3, z) - 0.5) * 0.08);
      mesh.setColorAt(i, col);
    });
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.scene.add(mesh);
    // Rochers
    const rocks = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (MAP[z][x] === 'R') rocks.push([x, z]);
    const rg = new THREE.DodecahedronGeometry(0.5, 0);
    const rm = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0x9c6a48, flatShading: true }), rocks.length);
    rocks.forEach(([x, z], i) => {
      const s = 0.8 + hash(x, z) * 0.5;
      m4.compose(new THREE.Vector3(x + 0.5, 0.3, z + 0.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(hash(x, 1), hash(z, 2) * 3, 0)), new THREE.Vector3(s, s * 0.8, s));
      rm.setMatrixAt(i, m4);
    });
    rm.castShadow = true; rm.receiveShadow = true;
    this.scene.add(rm);
  }

  buildHouses() {
    const brick = canvasTex(brickCanvas(), { repeat: true });
    const brick2 = canvasTex(brickCanvas('#d7a46b'), { repeat: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xe2c08e });
    const dark = new THREE.MeshLambertMaterial({ color: 0x3a2416 });
    const straw = new THREE.MeshLambertMaterial({ color: 0xd8b768 });
    HOUSES.forEach((hs, i) => {
      const g = new THREE.Group();
      const t = (i % 2 ? brick2 : brick).clone(); t.repeat.set(hs.w * 0.8, hs.h * 0.8); t.needsUpdate = true;
      const body = new THREE.Mesh(new THREE.BoxGeometry(hs.w - 0.1, hs.h, hs.d - 0.1), new THREE.MeshLambertMaterial({ map: t }));
      body.position.y = hs.h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(hs.w + 0.1, 0.14, hs.d + 0.1), roofMat);
      roof.position.y = hs.h + 0.07; roof.castShadow = true; g.add(roof);
      // parapet
      for (const [dx, dz, w, d] of [[0, -hs.d / 2, hs.w + 0.1, 0.12], [0, hs.d / 2, hs.w + 0.1, 0.12], [-hs.w / 2, 0, 0.12, hs.d], [hs.w / 2, 0, 0.12, hs.d]]) {
        const pp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), roofMat); pp.position.set(dx, hs.h + 0.22, dz); g.add(pp);
      }
      // porte et fenêtres
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.05), dark);
      const dw = { S: [0, 0.47, hs.d / 2 - 0.02, 0], N: [0, 0.47, -hs.d / 2 + 0.02, 0], E: [hs.w / 2 - 0.02, 0.47, 0, Math.PI / 2], W: [-hs.w / 2 + 0.02, 0.47, 0, Math.PI / 2] }[hs.door];
      door.position.set(dw[0], dw[1], dw[2]); door.rotation.y = dw[3]; g.add(door);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.05), dark);
      win.position.set(hs.w / 4 + 0.2, hs.h * 0.7, hs.d / 2 - 0.02); g.add(win);
      const win2 = win.clone(); win2.position.x = -hs.w / 4 - 0.2; g.add(win2);
      // auvent de roseaux
      if (i % 2 === 0) {
        const aw = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.7), straw);
        aw.position.set(dw[0] * 0.9, 1.15, dw[2] + Math.sign(dw[2] || 1) * 0.35); aw.rotation.x = 0.25 * Math.sign(dw[2] || 1); aw.castShadow = true;
        if (hs.door === 'S' || hs.door === 'N') g.add(aw);
      }
      g.position.set(hs.x + hs.w / 2, 0, hs.z + hs.d / 2);
      this.scene.add(g);
    });
  }

  buildPalms() {
    const pts = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (MAP[z][x] === 'T') pts.push([x + 0.5, z + 0.5, 1]);
    // Palmiers décoratifs hors carte (rive est, sud, ouest)
    for (let i = 0; i < 70; i++) {
      const side = i % 3;
      const x = side === 0 ? 44 + hash(i, 1) * 30 : side === 1 ? -2 - hash(i, 2) * 20 : hash(i, 3) * 40;
      const z = side === 2 ? 58 + hash(i, 4) * 20 : 20 + hash(i, 5) * 45;
      pts.push([x, z, 0]);
    }
    const n = pts.length;
    this.palmCount = { essential: pts.filter((p) => p[2]).length, total: n };
    const trunkGeo = new THREE.CylinderGeometry(0.07, 0.13, 2.3, 6, 4);
    trunkGeo.translate(0, 1.15, 0);
    const tp = trunkGeo.attributes.position;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) + 0.06 * (y / 2.3) ** 2 * 4); }
    trunkGeo.computeVertexNormals();
    const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x8b6a45, flatShading: true }), n);
    const LEAVES = 7;
    const leaves = new THREE.InstancedMesh(palmLeafGeometry(), new THREE.MeshLambertMaterial({ color: 0x4f8f3a, side: THREE.DoubleSide }), n * LEAVES);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    // Les palmiers essentiels d'abord : la densité ne coupe que les décoratifs.
    pts.sort((a, b) => b[2] - a[2]).forEach(([x, z], i) => {
      const s = 0.85 + hash(x | 0, z | 0) * 0.4, rot = hash(z | 0, x | 0) * 6.28;
      m4.compose(v.set(x, 0, z), q.setFromEuler(e.set(0, rot, 0)), sc.set(s, s, s));
      trunk.setMatrixAt(i, m4);
      for (let k = 0; k < LEAVES; k++) {
        m4.compose(v.set(x + 0.24 * s * Math.cos(rot) * 0 + 0.24 * s, 2.3 * s, z), q.setFromEuler(e.set(0, rot + (k / LEAVES) * Math.PI * 2, 0)), sc.set(s, s, s));
        // recentre le bouquet au sommet du tronc courbé
        const top = new THREE.Vector3(0.24 * s, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        m4.setPosition(x + top.x, 2.25 * s, z + top.z);
        leaves.setMatrixAt(i * LEAVES + k, m4);
        col.setHSL(0.27 + hash(i, k) * 0.05, 0.45, 0.33 + hash(k, i) * 0.08);
        leaves.setColorAt(i * LEAVES + k, col);
      }
    });
    trunk.castShadow = leaves.castShadow = true;
    this.scene.add(trunk, leaves);
    this.decorMeshes.push({ mesh: trunk, total: n, min: this.palmCount.essential }, { mesh: leaves, total: n * LEAVES, min: this.palmCount.essential * LEAVES });
  }

  buildFields() {
    const wheat = [], reeds = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      if (MAP[z][x] === 'f') for (let k = 0; k < 4; k++) wheat.push([x + 0.15 + hash(x * 4 + k, z) * 0.7, z + 0.15 + hash(x, z * 4 + k) * 0.7]);
      if (MAP[z][x] === 'r') for (let k = 0; k < 4; k++) reeds.push([x + 0.1 + hash(x * 5 + k, z) * 0.8, z + 0.1 + hash(x, z * 5 + k) * 0.8]);
    }
    const shuffle = (arr) => arr.sort((a, b) => hash(a[0] * 100 | 0, a[1] * 100 | 0) - hash(b[0] * 100 | 0, b[1] * 100 | 0));
    shuffle(wheat); shuffle(reeds);
    const wg = new THREE.ConeGeometry(0.16, 0.6, 4); wg.translate(0, 0.3, 0);
    const wm = new THREE.InstancedMesh(wg, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), wheat.length);
    const rg = new THREE.CylinderGeometry(0.02, 0.035, 1.1, 3); rg.translate(0, 0.55, 0);
    const rm = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0x5e8a3e }), reeds.length * 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    wheat.forEach(([x, z], i) => {
      m4.compose(v.set(x, 0, z), q.setFromEuler(e.set((hash(i, 1) - 0.5) * 0.3, hash(i, 2) * 3, (hash(i, 3) - 0.5) * 0.3)), sc.setScalar(0.8 + hash(i, 4) * 0.5));
      wm.setMatrixAt(i, m4);
      col.set(hash(i, 5) < 0.5 ? 0xe9c15c : 0xd9a843); wm.setColorAt(i, col);
    });
    reeds.forEach(([x, z], i) => {
      for (let k = 0; k < 3; k++) {
        m4.compose(v.set(x + (k - 1) * 0.07, 0, z + hash(i, k) * 0.1), q.setFromEuler(e.set((hash(i, k + 5) - 0.5) * 0.4, 0, (hash(k, i) - 0.5) * 0.4)), sc.set(1, 0.7 + hash(i, k + 9) * 0.6, 1));
        rm.setMatrixAt(i * 3 + k, m4);
      }
    });
    wm.castShadow = rm.castShadow = true; wm.receiveShadow = true;
    this.scene.add(wm, rm);
    this.decorMeshes.push({ mesh: wm, total: wheat.length, min: Math.floor(wheat.length * 0.25) }, { mesh: rm, total: reeds.length * 3, min: Math.floor(reeds.length * 0.9) });
    this.wheatMesh = wm;
  }

  buildProps() {
    const s = this.scene;
    const stone = new THREE.MeshLambertMaterial({ color: 0xb8a58a, flatShading: true });
    const wood = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
    const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; s.add(mesh); return mesh; };
    // Puits
    const [well, spring] = HEAL_SPOTS;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.6, 10, 1, true), stone), well.x + 0.5, 0.3, well.z + 0.5).material.side = THREE.DoubleSide;
    add(new THREE.Mesh(new THREE.CircleGeometry(0.44, 10).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x2aa6a1, shininess: 80 })), well.x + 0.5, 0.45, well.z + 0.5);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), wood), well.x + 0.05, 0.6, well.z + 0.5);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), wood), well.x + 0.95, 0.6, well.z + 0.5);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), wood), well.x + 0.5, 1.2, well.z + 0.5);
    // Source du canyon
    add(new THREE.Mesh(new THREE.CircleGeometry(0.55, 12).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x46d1c6, shininess: 100, emissive: 0x0b3b38 })), spring.x + 0.5, 0.06, spring.z + 0.5);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), stone), spring.x + 0.5 + Math.cos(a) * 0.6, 0.1, spring.z + 0.5 + Math.sin(a) * 0.6); }
    // Étal du marchand
    add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.7, 0.8), wood), 20.5, 0.35, 46.5);
    const cloth = add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 1.2), new THREE.MeshLambertMaterial({ color: 0x2a9d8f })), 20.5, 1.65, 46.7); cloth.rotation.x = 0.18;
    for (const dx of [-1.5, 1.5]) add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.08), wood), 20.5 + dx, 0.85, 46.2);
    const fruit = new THREE.MeshLambertMaterial({ color: 0x9c4a2a });
    for (let i = 0; i < 5; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), i % 2 ? fruit : new THREE.MeshLambertMaterial({ color: 0xe9c46a })), 19.4 + i * 0.5, 0.78, 46.5);
    // Tablette d'Eber
    add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.18), new THREE.MeshLambertMaterial({ color: 0x9a8f7a, flatShading: true })), 9.5, 0.5, 24.5).rotation.y = 0.2;
    // Tentes du camp
    for (const [x, z, c] of [[13, 4, 0xa63d32], [22, 5, 0xc98a3a]]) {
      const t = add(new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.3, 4), new THREE.MeshLambertMaterial({ color: c, flatShading: true })), x + 0.5, 0.65, z + 0.5); t.rotation.y = Math.PI / 4;
    }
    // Porte de Shinar (briques émaillées)
    const glaze = new THREE.MeshPhongMaterial({ color: 0x2457a6, shininess: 60, specular: 0x8fb8ff });
    const gold = new THREE.MeshLambertMaterial({ color: 0xe0b34a });
    for (const x of [14, 22]) { add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.2, 1.2), glaze), x + 0.5, 2.1, 1.5); add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 1.3), gold), x + 0.5, 4.3, 1.5); }
    add(new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.9, 1.1), glaze), 18.5, 4.0, 1.5);
    for (let i = 0; i < 6; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), gold), 15.5 + i * 1.2, 4.0, 2.07);
    // Jarres
    const potGeo = new THREE.LatheGeometry([[0, 0], [0.2, 0.02], [0.28, 0.2], [0.26, 0.42], [0.14, 0.55], [0.15, 0.62], [0, 0.62]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
    this.jars = {};
    for (const c of CHESTS) {
      const jar = add(new THREE.Mesh(potGeo, new THREE.MeshLambertMaterial({ color: 0xb4643a })), c.x + 0.5, 0, c.z + 0.5);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10), new THREE.MeshLambertMaterial({ color: 0x8a4a2a }));
      lid.position.y = 0.65; jar.add(lid);
      this.jars[c.id] = { jar, lid };
    }
  }

  buildFarScenery() {
    const s = this.scene;
    const mud = new THREE.MeshLambertMaterial({ color: 0xc49a6a, flatShading: true });
    // Ziggourat lointaine
    const zig = new THREE.Group();
    const tiers = [[34, 4], [26, 4], [19, 4], [13, 3.5], [8, 3]];
    let y = 0;
    for (const [w, h] of tiers) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mud); m.position.y = y + h / 2; zig.add(m); y += h; }
    const temple = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), new THREE.MeshLambertMaterial({ color: 0x2f6fb0 })); temple.position.y = y + 1.5; zig.add(temple);
    const stair = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 22), mud); stair.position.set(0, 7, 14); stair.rotation.x = -0.62; zig.add(stair);
    zig.position.set(20, 0, -48);
    s.add(zig);
    this.ziggurat = zig;
    // Plateau et dunes derrière les falaises
    const dune = new THREE.MeshLambertMaterial({ color: 0xd6ae78, flatShading: true });
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 4), dune);
      m.scale.set(8 + hash(i, 1) * 14, 2 + hash(i, 2) * 4, 6 + hash(i, 3) * 8);
      m.position.set(-40 + i * 9 + hash(i, 4) * 6, -0.5, -14 - hash(i, 5) * 30);
      s.add(m);
    }
  }

  makeActorSprite(look, { enemy = false, scale = 1 } = {}) {
    const sheet = this.sheet(look, enemy);
    const frames = enemy ? 2 : 8;
    const tex = makeSpriteTexture(sheet, frames);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.4 });
    const sp = new THREE.Sprite(mat);
    sp.center.set(0.5, 0.02);
    if (enemy) sp.scale.set(2 * scale, 2 * scale, 1); else sp.scale.set((FRAME_W / 16) * scale, (FRAME_H / 16) * scale, 1);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * scale * (enemy ? 1.4 : 1), 0.6 * scale * (enemy ? 1.4 : 1)), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03;
    const g = new THREE.Group(); g.add(shadow); g.add(sp);
    g.userData = { sprite: sp, tex, frames, look, enemy, dir: 'down', frame: 0, anim: 0 };
    return g;
  }

  setFrame(actor, dir, moving, dt) {
    const u = actor.userData;
    u.dir = dir;
    if (moving) { u.anim += dt * 7; } else u.anim = 0;
    const f = moving ? Math.floor(u.anim) % 2 : 0;
    const idx = u.enemy ? Math.floor(this.clock * 2) % 2 : DIR_FRAMES[dir] + f;
    u.tex.offset.x = idx / u.frames;
    u.sprite.position.y = moving ? Math.abs(Math.sin(u.anim * Math.PI)) * 0.05 : 0;
  }

  buildActors() {
    const s = this.scene;
    this.player = this.makeActorSprite('asher'); s.add(this.player);
    this.followers = { tamar: this.makeActorSprite('tamar'), eber: this.makeActorSprite('eber') };
    this.npcs = {};
    for (const [id, n] of Object.entries(NPCS)) {
      const a = this.makeActorSprite(n.look, { scale: id === 'kish' ? 1.25 : n.look === 'noa' ? 1 : 1 });
      a.position.set(n.x + 0.5, 0, n.z + 0.5);
      s.add(a); this.npcs[id] = a;
    }
    this.patrols = {};
    for (const p of PATROLS) {
      const g = new THREE.Group();
      p.group.forEach((e, i) => {
        const a = e === 'soldat' ? this.makeActorSprite('soldat') : this.makeActorSprite(e, { enemy: true, scale: 0.55 });
        a.position.set(i * 0.9 - 0.4, 0, 0); g.add(a);
      });
      g.position.set(p.x + 0.5, 0, p.z + 0.5);
      s.add(g); this.patrols[p.id] = g;
    }
    const htex = canvasTex(herbSprite(), { nearest: true });
    this.herbs = {};
    for (const h of HERBS) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: htex, transparent: true, depthWrite: false }));
      sp.scale.set(0.7, 0.7, 1); sp.position.set(h.x + 0.5, 0.45, h.z + 0.5);
      sp.visible = false; s.add(sp); this.herbs[h.id] = sp;
    }
    // Marqueur d'interaction
    const mc = mkCanvas(16, 16), mx = mc.getContext('2d');
    mx.fillStyle = '#fff6d8'; mx.fillRect(6, 2, 4, 8); mx.fillRect(6, 12, 4, 3); mx.fillStyle = '#2a1a12'; mx.fillRect(7, 3, 2, 6); mx.fillRect(7, 13, 2, 1);
    this.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(mc), transparent: true, depthTest: false }));
    this.marker.scale.set(0.45, 0.45, 1); this.marker.visible = false; this.marker.renderOrder = 10;
    s.add(this.marker);
  }

  // Synchronise le monde avec l'état de partie.
  syncWorld(state, trail) {
    this.player.position.set(state.pos.x, 0, state.pos.z);
    for (const [id, a] of Object.entries(this.npcs)) {
      const n = NPCS[id];
      a.visible = !state.party.includes(id) && !(id === 'kish' && state.flags.kishBeaten);
      if (id === 'lavan' && state.flags.lavanAside) a.position.set(n.asideX + 0.5, 0, n.asideZ + 0.5);
    }
    for (const [id, f] of Object.entries(this.followers)) {
      const idx = state.party.indexOf(id);
      if (idx < 0) { if (f.parent) this.scene.remove(f); continue; }
      if (!f.parent) this.scene.add(f);
      // Décalés de côté pour ne pas cacher Asher (la caméra regarde vers le nord).
      const side = idx === 1 ? -0.5 : 0.5;
      const t = trail && trail.length > idx * 5 ? trail[idx * 5] : null;
      if (t) f.position.set(t.x + side, 0, t.z + 0.15); else f.position.set(state.pos.x + side, 0, state.pos.z + 0.5);
    }
    for (const p of PATROLS) this.patrols[p.id].visible = !state.patrols.includes(p.id);
    for (const h of HERBS) this.herbs[h.id].visible = state.step === 2 && !state.herbs.includes(h.id);
    for (const c of CHESTS) { const j = this.jars[c.id]; const open = state.chests.includes(c.id); j.lid.visible = !open; j.jar.material.color.set(open ? 0x8f5232 : 0xb4643a); }
  }

  showMarker(pos) {
    if (!pos) { this.marker.visible = false; return; }
    this.marker.visible = true;
    this.marker.position.set(pos.x, 1.9 + Math.sin(this.clock * 5) * 0.08, pos.z);
  }

  updateWorld(dt, state, { moving, dir, trail, titleMode = false }) {
    this.clock += dt;
    this.syncWorld(state, trail);
    this.setFrame(this.player, dir, moving, dt);
    for (const f of Object.values(this.followers)) {
      if (!f.parent) continue;
      const u = f.userData;
      if (!u.prev) u.prev = f.position.clone();
      const dx = f.position.x - u.prev.x, dz = f.position.z - u.prev.z;
      let fdir = u.dir;
      if (dx * dx + dz * dz > 1e-5) fdir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
      this.setFrame(f, fdir, moving, dt);
      u.prev.copy(f.position);
    }
    for (const a of Object.values(this.npcs)) this.setFrame(a, 'down', false, dt);
    for (const g of Object.values(this.patrols)) g.children.forEach((a) => this.setFrame(a, 'right', false, dt));
    for (const h of Object.values(this.herbs)) { h.material.opacity = 0.7 + Math.sin(this.clock * 4) * 0.3; h.position.y = 0.45 + Math.sin(this.clock * 3) * 0.06; }
    this.waterTex.offset.set(this.clock * 0.02, this.clock * 0.05);
    // Caméra inclinée qui suit Asher
    const p = this.player.position;
    const aspect = this.aspect || 1;
    const portrait = aspect < 1;
    const back = portrait ? 11 : 9, up = portrait ? 7.4 : 6.2;
    const target = this._camTarget || (this._camTarget = new THREE.Vector3());
    if (titleMode) target.set(p.x + Math.sin(this.clock * 0.1) * 3, up + 2, p.z + back + 2);
    else target.set(p.x, up, p.z + back);
    if (!this.camInit) { this.camera.position.copy(target); this.camInit = true; }
    this.camera.position.lerp(target, Math.min(1, dt * 5));
    this.camLook = this.camLook || new THREE.Vector3(p.x, 1.4, p.z - 5);
    this._lookTarget = (this._lookTarget || new THREE.Vector3()).set(p.x, 1.4, p.z - 5);
    this.camLook.lerp(this._lookTarget, Math.min(1, dt * 5));
    this.camera.lookAt(this.camLook);
    this.sun.position.set(p.x + 10, 22, p.z + 12);
    this.sun.target.position.set(p.x, 0, p.z - 2);
  }

  // ---------- Combat ----------
  buildBattleStage() {
    const s = this.battleScene;
    s.background = canvasTex(skyCanvas(), { nearest: false });
    s.fog = new THREE.Fog(COLORS.haze, 18, 60);
    s.add(new THREE.HemisphereLight(0xfff1d6, 0x7a6a4a, 1.4));
    const sun = new THREE.DirectionalLight(0xffe2b0, 1.8); sun.position.set(5, 10, 8); s.add(sun);
    this.stageGroundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 32), this.stageGroundMat);
    ground.rotation.x = -Math.PI / 2; s.add(ground);
    this.stageDecor = new THREE.Group(); s.add(this.stageDecor);
    this.battleActors = {};
  }

  stageGroundTexture(zone) {
    const pal = { champs: ['#c9a548', '#b8933d', '#9bb35a'], roseaux: ['#8aa64e', '#7a9446', '#cdb084'], canyon: ['#d9a86c', '#c99658', '#b5774a'], boss: ['#d9a86c', '#c99658', '#b5774a'] }[zone] || ['#d9a86c', '#c99658', '#cfa875'];
    const c = mkCanvas(128, 128), ctx = c.getContext('2d');
    ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = pal[1 + (i % 2)]; ctx.fillRect(hash(i, 1) * 128 | 0, hash(1, i) * 128 | 0, 2, 1); }
    const t = canvasTex(c, { repeat: true }); t.repeat.set(16, 16);
    return t;
  }

  startBattle(b, zone) {
    const s = this.battleScene;
    if (this.stageGroundMat.map) this.stageGroundMat.map.dispose();
    this.stageGroundMat.map = this.stageGroundTexture(zone); this.stageGroundMat.needsUpdate = true;
    for (const c of [...this.stageDecor.children]) { this.stageDecor.remove(c); if (!c.userData.shared) disposeTree(c); }
    const rock = new THREE.MeshLambertMaterial({ color: 0xa96a40, flatShading: true });
    const palmT = new THREE.MeshLambertMaterial({ color: 0x8b6a45 }), palmL = new THREE.MeshLambertMaterial({ color: 0x4f8f3a, side: THREE.DoubleSide });
    const leaf = palmLeafGeometry();
    const addPalm = (x, z, sc = 1) => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.4, 6), palmT); t.position.y = 1.2; g.add(t);
      for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(leaf, palmL); l.position.y = 2.35; l.rotation.y = (k / 7) * Math.PI * 2; g.add(l); }
      g.position.set(x, 0, z); g.scale.setScalar(sc); this.stageDecor.add(g);
    };
    if (zone === 'canyon' || zone === 'boss') {
      for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(3, 3 + hash(i, 1) * 4, 3), rock); m.position.set(-22 + i * 3, 1.5, -9 - hash(i, 2) * 3); this.stageDecor.add(m); }
      if (zone === 'boss') {
        const zig = this.ziggurat.clone(); zig.userData.shared = true; zig.scale.setScalar(0.5); zig.position.set(4, 0, -38); this.stageDecor.add(zig);
        const tent = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 4), new THREE.MeshLambertMaterial({ color: 0xa63d32, flatShading: true })); tent.position.set(-6, 1.1, -4); this.stageDecor.add(tent);
      }
    } else {
      for (let i = 0; i < 6; i++) addPalm(-10 + i * 4 + hash(i, 3) * 2, -6 - hash(i, 4) * 5, 1 + hash(i, 5) * 0.4);
      if (zone === 'roseaux') {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(80, 12), new THREE.MeshPhongMaterial({ color: 0x3cc4bc, shininess: 80 })); w.rotation.x = -Math.PI / 2; w.position.set(0, 0.02, -16); this.stageDecor.add(w);
      }
    }
    for (const a of Object.values(this.battleActors)) { s.remove(a); disposeTree(a); }
    this.battleActors = {};
    this.battlePortrait = (this.aspect || 1) < 0.8;
    b.party.forEach((p, i) => this.addBattleActor(b, p, i));
    b.enemies.forEach((e, i) => this.addBattleActor(b, e, i));
    this.active = 'battle';
    this.layoutBattleCamera();
  }

  addBattleActor(b, actor, i) {
    let g;
    const portrait = this.battlePortrait;
    if (actor.side === 'party') {
      g = this.makeActorSprite(actor.id, { scale: portrait ? 1.05 : 1.3 });
      if (portrait) { g.position.set((i - 1) * 1.15, 0, 1.7 + (i === 1 ? 0.2 : 0)); this.setFrame(g, 'up', false, 0); }
      else { g.position.set(2.6 + i * 0.55, 0, -0.9 + i * 1.1); this.setFrame(g, 'left', false, 0); }
    } else {
      const big = actor.boss ? 1.6 : 1;
      const human = ['soldat', 'kish'].includes(actor.sprite);
      g = this.makeActorSprite(actor.sprite, { enemy: true, scale: (human ? 1.3 : 1.1) * big * (portrait ? 0.85 : 1) });
      const n = Math.max(b.enemies.length, b.boss ? 3 : 1);
      if (portrait) {
        const slots = b.boss ? [0, -1.75, 1.75] : n === 1 ? [0] : n === 2 ? [-0.95, 0.95] : [-1.6, 0, 1.6];
        g.position.set(slots[i % slots.length] - 0.6, 0, -2.3 - (i % 2) * 0.35 - (actor.boss ? 0.4 : 0));
      } else {
        const col = i % 2, row = Math.floor(i / 2);
        g.position.set(-2.4 - col * 1.4 - row * 0.3, 0, (b.enemies.length === 1 ? 0 : -1.1 + (i % 3) * 1.1) + (actor.boss ? -0.3 : 0));
      }
    }
    g.userData.home = g.position.clone();
    g.userData.uid = actor.uid;
    this.battleScene.add(g);
    this.battleActors[actor.uid] = g;
    return g;
  }

  layoutBattleCamera() {
    const aspect = this.aspect || 1;
    if (this.battlePortrait ?? aspect < 0.8) {
      this.battleCamera.fov = 56; this.battleCamera.updateProjectionMatrix();
      this.battleCamera.position.set(0, 5.2, 9.4);
      this.battleCamera.lookAt(0, -1.5, -1.2);
      return;
    }
    this.battleCamera.fov = 42; this.battleCamera.updateProjectionMatrix();
    const portrait = aspect < 1;
    // Garde environ 10 unités de large visibles.
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(42) / 2) * aspect);
    const dist = Math.max(7.5, 5.4 / Math.tan(hfov / 2));
    this.battleCamera.position.set(0.2, portrait ? 3.8 : 2.8, dist);
    this.battleCamera.lookAt(0.2, portrait ? 1.6 : 1.1, 0);
  }

  battleActorScreen(uid) {
    const g = this.battleActors[uid];
    if (!g) return null;
    const v = g.position.clone(); v.y += g.userData.sprite.scale.y * 0.9;
    v.project(this.battleCamera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  }

  tween(dur, fn) { return new Promise((res) => this.tweens.push({ t: 0, dur, fn, res })); }

  async lunge(uid, targetUid) {
    const g = this.battleActors[uid]; if (!g) return;
    const home = g.userData.home.clone();
    const t = this.battleActors[targetUid];
    const dir = t ? t.userData.home.clone().sub(home) : new THREE.Vector3(this.battlePortrait ? 0 : 1, 0, this.battlePortrait ? 1 : 0);
    dir.y = 0; dir.setLength(0.9);
    await this.tween(0.16, (k) => { g.position.set(home.x + dir.x * k, 0, home.z + dir.z * k); });
    await this.tween(0.16, (k) => { g.position.set(home.x + dir.x * (1 - k), 0, home.z + dir.z * (1 - k)); });
  }

  async hit(uid) {
    const g = this.battleActors[uid]; if (!g) return;
    const sp = g.userData.sprite, home = g.userData.home;
    await this.tween(0.3, (k) => {
      sp.material.color.setRGB(1, 0.4 + 0.6 * k, 0.4 + 0.6 * k);
      g.position.x = home.x + Math.sin(k * 30) * 0.08 * (1 - k);
    });
    sp.material.color.setRGB(1, 1, 1);
  }

  async ko(uid) {
    const g = this.battleActors[uid]; if (!g) return;
    const sp = g.userData.sprite;
    if (g.userData.enemy) await this.tween(0.45, (k) => { sp.material.opacity = 1 - k; sp.material.color.setRGB(1, 1 - k * 0.5, 1 - k * 0.5); });
    else { sp.material.rotation = Math.PI / 2; sp.material.color.setRGB(0.7, 0.6, 0.6); }
  }

  revive(uid) {
    const g = this.battleActors[uid]; if (!g) return;
    g.userData.sprite.material.rotation = 0; g.userData.sprite.material.color.setRGB(1, 1, 1);
  }

  async burst(uids, color, { rise = true, count = 26 } = {}) {
    const groups = [];
    for (const uid of uids) {
      const g = this.battleActors[uid]; if (!g) continue;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3), vel = [];
      for (let i = 0; i < count; i++) { pos[i * 3] = g.position.x; pos[i * 3 + 1] = 0.8; pos[i * 3 + 2] = g.position.z; vel.push([(Math.random() - 0.5) * 2, rise ? 1 + Math.random() * 2 : (Math.random() - 0.3) * 3, (Math.random() - 0.5) * 2]); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.16, transparent: true, depthWrite: false }));
      this.battleScene.add(pts); groups.push({ pts, pos, vel, base: g.position.clone() });
    }
    await this.tween(0.6, (k) => {
      for (const gr of groups) {
        for (let i = 0; i < gr.vel.length; i++) {
          gr.pos[i * 3] = gr.base.x + gr.vel[i][0] * k * 0.6;
          gr.pos[i * 3 + 1] = 0.8 + gr.vel[i][1] * k * 0.8;
          gr.pos[i * 3 + 2] = gr.base.z + gr.vel[i][2] * k * 0.6;
        }
        gr.pts.geometry.attributes.position.needsUpdate = true;
        gr.pts.material.opacity = 1 - k;
      }
    });
    for (const gr of groups) { this.battleScene.remove(gr.pts); gr.pts.geometry.dispose(); }
  }

  async projectile(fromUid, toUid, color = 0x8a7a6a) {
    const a = this.battleActors[fromUid], b = this.battleActors[toUid]; if (!a || !b) return;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color }));
    this.battleScene.add(m);
    await this.tween(0.28, (k) => { m.position.set(a.position.x + (b.position.x - a.position.x) * k, 1.1 + Math.sin(k * Math.PI) * 0.6, a.position.z + (b.position.z - a.position.z) * k); });
    this.battleScene.remove(m);
  }

  highlight(uid) {
    for (const [id, g] of Object.entries(this.battleActors)) {
      const sp = g.userData.sprite;
      if (g.userData.enemy) continue;
      sp.position.y = id === uid ? 0.25 : 0;
      g.children[0].material.opacity = id === uid ? 1 : 0.6;
    }
  }

  updateBattle(dt) {
    this.clock += dt;
    for (const g of Object.values(this.battleActors)) {
      const u = g.userData;
      if (u.enemy) u.tex.offset.x = (Math.floor(this.clock * 2 + (u.uid ? u.uid.length : 0)) % 2) / 2;
    }
  }

  endBattle() { this.active = 'world'; }

  // ---------- Boucle ----------
  step(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.res(); }
    }
  }

  render() {
    if (this.active === 'battle') this.renderer.render(this.battleScene, this.battleCamera);
    else this.renderer.render(this.scene, this.camera);
  }

  setQuality(level) {
    this.level = level;
    const q = QUALITY_LEVELS[level];
    const dpr = Math.min(window.devicePixelRatio || 1, q.pixelRatio);
    this.renderer.setPixelRatio(dpr);
    const shadowsChanged = this.renderer.shadowMap.enabled !== q.shadows;
    this.renderer.shadowMap.enabled = q.shadows;
    this.sun.castShadow = q.shadows;
    if (q.shadows && this.sun.shadow.mapSize.x !== q.shadowSize) {
      this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    if (shadowsChanged) this.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    for (const d of this.decorMeshes) d.mesh.count = Math.max(d.min, Math.floor(d.total * q.decor));
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.aspect = w / h;
    this.renderer.setSize(w, h, false);
    const portrait = this.aspect < 1;
    // Champ horizontal minimal pour que le téléphone en portrait voie assez de décor.
    const hTarget = THREE.MathUtils.degToRad(portrait ? 50 : 60);
    let vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hTarget / 2) / this.aspect));
    vfov = Math.min(portrait ? 80 : 55, Math.max(42, vfov));
    this.camera.fov = vfov; this.camera.aspect = this.aspect; this.camera.updateProjectionMatrix();
    this.battleCamera.aspect = this.aspect; this.battleCamera.updateProjectionMatrix();
    this.layoutBattleCamera();
  }
}
