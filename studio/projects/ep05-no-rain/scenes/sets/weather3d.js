// sets/weather3d.js — episode 05 locations ("What If It Never Rained Again?"):
//   SKY    (Pip & Ink standing on a giant cloud above the sea; vapour rising, rain shafts under far clouds;
//           mode 'drop' adds a giant raindrop that morphs ball → bun → parachute → split; mode 'grey' = hazy, swollen, red-sun sky)
//   VALLEY (green valley: river with a bumpy bed (puddles when low), lake with a rowing boat and a cracked-mud bed,
//           wheat fields, trees, snow-capped mountains; setDry(d) browns everything; snow caps shrink; rain(amount))
//           modes: valley · forest (rainforest, mist "flying river", browning, distant smoke) · desert (Atacama, fog nets, rover)
//   rainField(W, box) — falling rain streaks (LineSegments), amount 0..1; glassOfWater(W) prop for the room.
import { THREE, box, cyl, sphere } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { rng, lerp, clamp } from '/engine/core.js';

const P = W3.paint;
const TX = {};
const tex = (k, f) => TX[k] ||= f();
const C = (c) => new THREE.Color(c);

// ---------- textures ----------
const noiseTex = (seed = 3, rep = [14, 14]) => W3.paintTex(1024, 1024, (g, w, h) => { g.fillStyle = '#e8e8e0'; g.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < 5000; i++) { const x = r() * w, y = r() * h, l = 5 + r() * 12; g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.45)' : 'rgba(60,60,40,.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y - l); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(80,80,60,.08)'; g.beginPath(); g.ellipse(r() * w, r() * h, 40 + r() * 80, 20 + r() * 40, r() * 3, 0, 7); g.fill(); } }, rep);
const sandTex = (base, seed) => W3.paintTex(1024, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed); for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,240,210,.25)' : 'rgba(120,80,40,.16)'; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); } for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(140,100,60,.18)'; g.lineWidth = 3; g.beginPath(); const y = r() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 8); g.stroke(); } }, [10, 10]);
// cracked mud: tiles of dry clay with dark gaps
const crackTex = () => W3.paintTex(1024, 1024, (g, w, h) => { g.clearRect(0, 0, w, h); const r = rng(11); const pts = []; for (let i = 0; i < 70; i++) pts.push([r() * w, r() * h]);
  g.fillStyle = '#c8a070'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2416'; g.lineWidth = 9; g.lineJoin = 'round';
  // voronoi-ish cracks: connect each point to its 3 nearest neighbours with jagged lines
  for (const [x, y] of pts) { const nn = pts.map(p => [Math.hypot(p[0] - x, p[1] - y), p]).sort((a, b) => a[0] - b[0]).slice(1, 4);
    for (const [, [x2, y2]] of nn) { const mx = (x + x2) / 2 + (r() - 0.5) * 30, my = (y + y2) / 2 + (r() - 0.5) * 30; g.beginPath(); g.moveTo(mx + (y2 - y) * 0.25, my - (x2 - x) * 0.25); g.lineTo(mx, my); g.lineTo(mx - (y2 - y) * 0.25, my + (x2 - x) * 0.25); g.stroke(); } }
  for (let i = 0; i < 2000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,230,190,.25)' : 'rgba(90,60,30,.15)'; g.fillRect(r() * w, r() * h, 3, 3); } }, [3, 3]);
const softTex = () => W3.paintTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const netTex = () => W3.paintTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(40,30,30,.85)'; g.lineWidth = 3; for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * w / 16, 0); g.lineTo(i * w / 16 + 8, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 16); g.lineTo(w, i * h / 16 + 6); g.stroke(); } }, [4, 2]);

function terrain(W, f, mat, size = 120, seg = 140) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, f(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; W.scene.add(m); return m;
}
// soft billboards (mist, fog, haze, smoke)
function puffs(W, n, spawn, o = {}) {
  const mat = new THREE.SpriteMaterial({ map: tex('soft', softTex), color: o.color || '#ffffff', transparent: true, opacity: o.opacity ?? 0.5, depthWrite: false, fog: o.fog ?? true });
  const list = []; const r = rng(o.seed || 5);
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat.clone()); s.userData.noink = true; s.userData.seed = [r(), r(), r(), r()]; s.userData.base = spawn(r, i); W.scene.add(s); list.push(s); }
  return list;
}

// ---------- rain (LineSegments streaks falling at ~9 m/s) ----------
export function rainField(W, o = {}) {
  const [x0, x1] = o.x || [-8, 8], [y0, y1] = o.y || [0, 7], [z0, z1] = o.z || [-10, 4], N = o.n || 1400, len = o.len || 0.32;
  const pos = new Float32Array(N * 6), seed = new Float32Array(N * 3), r = rng(o.seed || 9);
  for (let i = 0; i < N; i++) { seed[i * 3] = lerp(x0, x1, r()); seed[i * 3 + 1] = r(); seed[i * 3 + 2] = lerp(z0, z1, r()); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: o.color || '#d8ecff', transparent: true, opacity: o.opacity ?? 0.7, depthWrite: false, fog: true });
  const lines = new THREE.LineSegments(geo, mat); lines.userData.noink = true; lines.frustumCulled = false; W.scene.add(lines);
  const H = y1 - y0, sp = o.speed || 9, wind = o.wind ?? 0.6;
  lines.userData.set = (t, amount) => { const a = geo.attributes.position.array; lines.visible = amount > 0.01;
    for (let i = 0; i < N; i++) { const on = seed[i * 3 + 1] < amount; const y = on ? y1 - ((t * sp + seed[i * 3 + 1] * H * 7.3) % H) : -500, x = seed[i * 3] + (y1 - y) * wind * 0.05;
      a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = seed[i * 3 + 2]; a[i * 6 + 3] = x - wind * 0.03; a[i * 6 + 4] = y - len; a[i * 6 + 5] = seed[i * 3 + 2]; }
    geo.attributes.position.needsUpdate = true; };
  return lines;
}

// ---------- room prop: a glass of water on a small round table ----------
export function glassOfWater(W, x = 0.02, z = 0.05) {
  const g = new THREE.Group(); g.position.set(x, 0, z); W.scene.add(g);
  const wood = P('#a8703a'), dark = P('#6a4a2a');
  g.add(cyl(0.42, 0.42, 0.05, wood, 0, 0.72, 0, 32)); g.add(cyl(0.05, 0.07, 0.7, dark, 0, 0.36, 0, 10)); g.add(cyl(0.22, 0.24, 0.04, dark, 0, 0.02, 0, 20));
  const glass = new THREE.Group(); const gm = new THREE.MeshLambertMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  glass.add(cyl(0.06, 0.05, 0.18, gm, 0, 0.09, 0, 24)); const water = cyl(0.055, 0.047, 0.12, new THREE.MeshLambertMaterial({ color: '#5ab4f0', transparent: true, opacity: 0.8 }), 0, 0.065, 0, 24); glass.add(water);
  glass.position.set(0.05, 0.745, 0.05); g.add(glass);
  const jug = new THREE.Group(); jug.add(cyl(0.07, 0.085, 0.22, gm, 0, 0.11, 0, 20)); jug.add(cyl(0.065, 0.08, 0.15, new THREE.MeshLambertMaterial({ color: '#5ab4f0', transparent: true, opacity: 0.75 }), 0, 0.08, 0, 20)); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 14), gm); hd.position.set(0.09, 0.12, 0); jug.add(hd); jug.position.set(-0.22, 0.745, -0.1); g.add(jug);
  return { group: g, glass, water, jug };
}

// ================= SKY (on a cloud) =================
const cloudMat = (c = '#ffffff') => P(c, null, { flatShading: false });
function cloud(W, x, y, z, s, mat, r, n = 9) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = r() * 1.4 * s, b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.7 + r() * 0.6) * s, 2), mat); b.position.set(Math.cos(a) * d, (r() * 0.5) * s, Math.sin(a) * d * 0.6); b.scale.y = 0.75; g.add(b); }
  W.scene.add(g); return g;
}
export function sky3d(W, o = {}) {
  const mode = o.mode || 'title', grey = mode === 'grey', r = rng(17);
  const mat = cloudMat(grey ? '#d8d4dc' : '#f4f6fc'), far = cloudMat(grey ? '#bab4c0' : '#eef2fc');
  // the cloud we stand on: a flat-topped mound of puffs (top at y = 0 around the cast)
  const deck = new THREE.Group(); W.scene.add(deck);
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 4.2, R = 0.8 + r() * 0.9, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8 - 0.6;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 2), mat); b.position.set(x, -R * 0.82 - Math.max(0, d - 1.5) * 0.55 - (z > 1.2 ? (z - 1.2) * 0.5 : 0), z); b.scale.y = 0.8; deck.add(b); }
  for (let i = 0; i < 10; i++) { const a = Math.PI * (1.1 + r() * 0.8), d = 2.8 + r() * 1.8, R = 0.5 + r() * 0.5; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 2), mat); b.position.set(Math.cos(a) * d, -0.1 + r() * 0.25, Math.sin(a) * d * 0.8 - 1.6); deck.add(b); }
  // the sea far below
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: grey ? '#5a7080' : '#2f86c8' })); sea.rotation.x = -Math.PI / 2; sea.position.y = -60; sea.userData.noink = true; W.scene.add(sea);
  // other clouds around (some low over the sea), a few with rain shafts under them
  const clouds = []; for (let i = 0; i < 22; i++) { const a = -Math.PI * 0.95 + r() * Math.PI * 0.9 - 0.05, d = 14 + r() * 50; const c = cloud(W, Math.cos(a) * d, -6 - r() * 22 + (d > 40 ? 6 : 0), Math.sin(a) * d * 0.9 - 6, 2.4 + r() * 3.4, far, r); clouds.push(c); }
  const shafts = []; for (const i of [2, 6, 9, 13, 17]) { const c = clouds[i]; const sh = new THREE.Mesh(new THREE.PlaneGeometry(6, 40), new THREE.MeshBasicMaterial({ map: tex('rainShaft', () => W3.paintTex(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; for (let k = 0; k < 40; k++) g.fillRect((k * 37) % w, 0, 2, h); })), color: '#cfe0f4', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
    sh.position.set(c.position.x, c.position.y - 20, c.position.z); sh.lookAt(0, sh.position.y, 10); sh.userData.noink = true; W.scene.add(sh); shafts.push(sh); }
  // vapour rising: soft puffs drifting up past the deck edge
  const vapour = puffs(W, 56, (rr) => [(rr() - 0.3) * 30, -30 + rr() * 6, -2 - rr() * 22], { opacity: 0.35, seed: 3 });
  // sun
  const sun = new THREE.Mesh(new THREE.CircleGeometry(grey ? 3.2 : 2.6, 48), new THREE.MeshBasicMaterial({ color: grey ? new THREE.Color(2.6, 0.9, 0.5) : new THREE.Color(3.4, 3.0, 2.4), fog: false })); sun.position.set(-26, 18, -70); sun.lookAt(0, 1, 6); sun.userData.noink = true; W.scene.add(sun);
  // haze in the grey sky
  const haze = grey ? puffs(W, 26, (rr) => [(rr() - 0.5) * 60, -4 + rr() * 14, -14 - rr() * 30], { color: '#c8a088', opacity: 0, seed: 8, fog: false }) : [];
  for (const h of haze) h.scale.setScalar(14 + h.userData.seed[0] * 10);
  const out = { deck, clouds, shafts, vapour, sun, sea, haze, mode };
  out.update = (t, k = {}) => {
    vapour.forEach((v, i) => { const [a, b, c] = v.userData.seed, [x, y0, z] = v.userData.base, H = 34, y = y0 + ((t * (0.9 + a) + b * H) % H); v.position.set(x + Math.sin(t * 0.3 + c * 9) * 0.8, y, z); const f = clamp((y - y0) / 4) * clamp((y0 + H - y) / 6); v.material.opacity = (k.vapour ?? 0.35) * f; v.scale.setScalar(2.5 + a * 2 + (y - y0) * 0.08); });
    shafts.forEach(s => { s.material.opacity = 0.45 * (k.rain ?? 1); s.visible = (k.rain ?? 1) > 0.01; });
    const sw = k.swell ?? 0; clouds.forEach((c, i) => { const s = 1 + sw * (0.5 + (i % 3) * 0.15); c.scale.set(s, s * (1 + sw * 0.3), s); });
    if (grey) { const gk = k.grey ?? 0; far.color.copy(C('#f4f6ff')).lerp(C('#8e8a98'), gk); mat.color.copy(C('#ffffff')).lerp(C('#c8c4cc'), gk); haze.forEach((h, i) => { h.material.opacity = (k.haze ?? 0) * 0.32; h.position.set(h.userData.base[0] + Math.sin(t * 0.05 + i) * 2, h.userData.base[1], h.userData.base[2]); });
      sun.material.color.copy(new THREE.Color(3.4, 3.0, 2.4)).lerp(new THREE.Color(2.6, 0.9, 0.45), k.red ?? 0); }
  };
  if (mode === 'drop') out.drop = raindrop(W);
  W.sunFrom([-0.5, 0.75, 0.6], 30);
  return out;
}
// giant raindrop: shape(k) 0 = ball · 1 = bun · 2 = parachute · 3 = split into small drops
function raindrop(W) {
  const g = new THREE.Group(); W.scene.add(g);
  const geo = new THREE.SphereGeometry(0.5, 48, 32), base = geo.attributes.position.array.slice();
  const wm = new THREE.MeshLambertMaterial({ color: '#7cc8f4', transparent: true, opacity: 0.88, emissive: '#1a4a7a', emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(geo, wm); g.add(body);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.4) })); hl.position.set(-0.18, 0.2, 0.36); hl.scale.set(1, 0.6, 0.4); hl.userData.noink = true; g.add(hl);
  const kids = []; for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12 + (i % 3) * 0.04, 20, 14), wm); m.visible = false; g.add(m); kids.push(m); }
  const p = geo.attributes.position;
  g.userData.shape = (k) => {
    const bun = clamp(k), para = clamp(k - 1), split = clamp(k - 2);
    for (let i = 0; i < p.count; i++) { let x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]; const rxz = (x * x + z * z) / 0.25;
      if (y < 0) y *= 1 - 0.7 * bun; else y *= 1 - 0.2 * bun; x *= 1 + 0.18 * bun + 0.55 * para; z *= 1 + 0.18 * bun + 0.55 * para;
      if (y < 0.05) y += para * 0.55 * Math.pow(1 - Math.min(1, rxz), 1.5); else y *= 1 - 0.25 * para;
      p.setXYZ(i, x, y, z); }
    p.needsUpdate = true; geo.computeVertexNormals();
    body.visible = split < 0.05; hl.visible = body.visible; hl.position.y = 0.2 - 0.06 * bun;
    kids.forEach((m, i) => { m.visible = split >= 0.05; const a = i / kids.length * Math.PI * 2; const d = 0.15 + split * 0.9; m.position.set(Math.cos(a) * d, -0.05 + Math.sin(a * 3) * 0.15 * split, Math.sin(a) * d * 0.6); });
  };
  g.userData.shape(0);
  return g;
}

// ================= VALLEY (river · lake · fields · mountains) + forest + desert =================
function tree(W, x, z, s, h, leafMat, o = {}) {
  const g = new THREE.Group(); g.position.set(x, h(x, z), z);
  const bark = P(o.bark || '#7a5236'), r = rng(Math.round(x * 13 + z * 7) + 50), tall = o.tall || 1;
  g.add(cyl(0.09 * s, 0.14 * s, 1.4 * s * tall, bark, 0, 0.7 * s * tall, 0, 8));
  for (let i = 0; i < (o.n || 7); i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry((0.42 + r() * 0.25) * s, 1), leafMat); c.position.set((r() - 0.5) * 1.1 * s, (1.4 * tall + 0.35 + r() * 0.6) * s, (r() - 0.5) * 1.1 * s); g.add(c); }
  W.scene.add(g); return g;
}
export function valley3d(W, o = {}) {
  const mode = o.mode || 'valley', r = rng(mode.length * 7 + 1);
  const desert = mode === 'desert', forest = mode === 'forest';
  // river channel along x at z ≈ -3.4 (bumpy bed → puddles when low); lake bowl at (5, -12); far rise toward the mountains
  const RZ = -3.4, LAKE = [5.5, -12.5, 6.5];
  const bed = (x, z) => -0.55 + 0.09 * Math.sin(x * 1.3) * Math.cos(x * 0.7 + 1) + 0.04 * Math.sin(x * 3.1);
  const h0 = (x, z) => 0.1 * Math.sin(x * 0.3 + 1) * Math.cos(z * 0.25) + (z < -16 ? (-16 - z) * 0.1 : 0) + 0.2 * Math.sin(x * 0.07 - 0.5);
  const h = (x, z) => { let y = h0(x, z) - h0(0, 0.6);
    if (mode === 'valley') { const d = Math.abs(z - RZ); if (d < 1.4) y = lerp(bed(x, z), y, sstep(clamp((d - 0.6) / 0.8)));
      const dl = Math.hypot((x - LAKE[0]) / 1.4, z - LAKE[1]); if (dl < LAKE[2]) y = lerp(-0.95 + dl * 0.02, y, sstep(clamp((dl - LAKE[2] * 0.62) / (LAKE[2] * 0.38)))); }
    if (desert) y += 0.25 * Math.sin(x * 0.25) * Math.cos(z * 0.2 + 2) + (z < -8 ? (-8 - z) * 0.05 : 0);
    return y; };
  const H = (x, z) => h(x, z);
  // terrain with vertex colours (wet / dry per vertex), neutral grass-noise texture on top
  const tmat = new THREE.MeshLambertMaterial({ color: '#ffffff', map: desert ? tex('desertSand', () => sandTex('#d8a878', 6)) : tex('vnoise', () => noiseTex(5)), vertexColors: !desert });
  const ter = terrain(W, H, tmat);
  let setGround = () => {};
  if (!desert) { const p = ter.geometry.attributes.position, n = p.count, cols = new Float32Array(n * 3), wet = [], dry = [];
    const G1 = C(forest ? '#3f7a3a' : '#6aa84a'), G2 = C(forest ? '#9a7a40' : '#c8a060'), M1 = C('#5a4a3a'), M2 = C('#b89468');
    for (let i = 0; i < n; i++) { const y = p.getY(i); const mud = clamp((-0.15 - y) / 0.25); wet.push(G1.clone().lerp(M1, mud)); dry.push(G2.clone().lerp(M2, mud)); }
    ter.geometry.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    let last = -1; setGround = (d) => { if (Math.abs(d - last) < 0.004) return; last = d; const c = new THREE.Color(); for (let i = 0; i < n; i++) { c.copy(wet[i]).lerp(dry[i], d); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; } ter.geometry.attributes.color.needsUpdate = true; }; setGround(0); }
  const out = { h: H, mode, trees: [], leafMats: [] };
  // mountains (snow caps shrink)
  const mtn = P(desert ? '#b07a5a' : '#7a8aa0', null, { flatShading: true }), snow = P('#ffffff', null, { flatShading: true }); out.caps = [];
  for (const [x, z, s, hh] of [[-34, -60, 16, 20], [-12, -70, 20, 26], [12, -64, 17, 22], [36, -68, 21, 24], [58, -75, 18, 19], [-56, -72, 18, 18]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(s, hh, 7), mtn); m.position.set(x, hh / 2 - 2, z); W.scene.add(m);
    if (!desert) { const c = new THREE.Mesh(new THREE.ConeGeometry(s * 0.36, hh * 0.36, 7), snow); c.position.set(x, hh - 2 - hh * 0.18 + 0.05, z); c.userData.h = hh; c.userData.y = hh - 2; W.scene.add(c); out.caps.push(c); } }
  out.setSnow = (k) => out.caps.forEach(c => { const s = Math.max(0.001, k); c.scale.set(s, s, s); c.position.y = c.userData.y - c.userData.h * 0.18 * s + 0.05; });
  if (mode === 'valley') {
    // river water (level animates) + lake water + cracked bed decal + boat
    const wmat = new THREE.MeshLambertMaterial({ color: '#3a9ad0', transparent: true, opacity: 0.86 });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(120, 2.6), wmat); river.rotation.x = -Math.PI / 2; river.position.set(0, -0.08, RZ); river.userData.noink = true; W.scene.add(river);
    const lake = new THREE.Mesh(new THREE.CircleGeometry(LAKE[2], 48), wmat); lake.rotation.x = -Math.PI / 2; lake.scale.x = 1.4; lake.position.set(LAKE[0], -0.08, LAKE[1]); lake.userData.noink = true; W.scene.add(lake);
    const cracks = new THREE.Mesh(new THREE.CircleGeometry(LAKE[2] * 0.66, 48), new THREE.MeshLambertMaterial({ map: tex('cracks', crackTex), transparent: true, opacity: 0 })); cracks.rotation.x = -Math.PI / 2; cracks.scale.x = 1.4; cracks.position.set(LAKE[0], -0.93 + LAKE[2] * 0.0, LAKE[1]); W.scene.add(cracks);
    const boat = new THREE.Group(); const hull = P('#c8543a'), rim = P('#f4e8d8'); boat.add(box(1.6, 0.28, 0.6, hull, 0, 0.14, 0)); boat.add(box(1.7, 0.06, 0.66, rim, 0, 0.3, 0)); boat.add(box(0.12, 0.05, 0.62, rim, 0.2, 0.3, 0)); const oar = cyl(0.02, 0.02, 1.4, P('#8a6a3a'), 0.1, 0.35, 0.3, 5); oar.rotation.z = 1.3; boat.add(oar);
    boat.position.set(LAKE[0] - 2.2, 0, LAKE[1] + 2.2); boat.rotation.y = 0.5; W.scene.add(boat);
    // wheat field (left back), instanced stalks share one material (colour = green → gold → brown)
    const N = 2600, wheat = P('#ffffff'), stalk = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.75, 4), wheat, N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < N; i++) { const x = -17 + r() * 13, z = -6 - r() * 10; e.set((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25); q.setFromEuler(e); m4.compose(v.set(x, H(x, z) + 0.36, z), q, sc.set(1, 0.8 + r() * 0.4, 1)); stalk.setMatrixAt(i, m4); }
    stalk.instanceMatrix.needsUpdate = true; stalk.receiveShadow = true; W.scene.add(stalk);
    const fence = P('#d8b88a'); for (let i = 0; i < 9; i++) { const x = -17 + i * 1.6; W.scene.add(box(0.08, 0.7, 0.08, fence, x, H(x, -5.5) + 0.35, -5.5)); } W.scene.add(box(13, 0.06, 0.04, fence, -10.6, H(-10, -5.5) + 0.5, -5.5));
    const barn = new THREE.Group(); barn.add(box(3, 2.2, 2.4, P('#c8443a'), 0, 1.1, 0)); const rf = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.2, 4), P('#5a3a3a')); rf.rotation.y = Math.PI / 4; rf.position.y = 2.8; rf.scale.z = 0.8; barn.add(rf); barn.position.set(-12, H(-12, -19), -19); W.scene.add(barn);
    const leaf = P('#5a9a4a', null, { flatShading: true }); out.leafMats.push(leaf);
    for (const [x, z, s] of [[-3.6, -0.6, 1.2], [3.8, 0.2, 1.3], [-6.5, 1.4, 1.4], [7, -6.5, 1.5], [-2, -9, 1.3], [1.5, -8, 1.2], [10, -15, 1.6], [-20, -14, 1.7], [0.5, -20, 1.6], [14, -9, 1.4]]) out.trees.push(tree(W, x, z, s, H, leaf));
    // reeds along the river
    const reed = P('#4a8a3a'); out.reeds = new THREE.Group(); for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 22, z = RZ + (r() < 0.5 ? -1 : 1) * (1.3 + r() * 0.35); if (Math.abs(x) < 1.5 && z > RZ) continue; const hh = 0.25 + r() * 0.15, c = new THREE.Mesh(new THREE.ConeGeometry(0.018, hh, 4), reed); c.position.set(x, H(x, z) + hh / 2, z); out.reeds.add(c); } W.scene.add(out.reeds); out.leafMats.push(reed);
    // fish (little 2D-ish shapes in the water, visible while it's deep)
    out.fish = []; for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), P(['#ff9a3a', '#f4d04a', '#ff6a5a'][i % 3])); f.scale.set(1.8, 0.7, 0.6); W.scene.add(f); out.fish.push(f); }
    Object.assign(out, { river, lake, cracks, boat, wheat, RZ, LAKE, bed });
    out.setWater = (riverK, lakeK) => {   // 1 = full, 0 = empty
      river.position.y = lerp(-0.6, -0.08, riverK); river.visible = riverK > 0.02; lake.position.y = lerp(-0.94, -0.08, lakeK); lake.scale.setScalar(lerp(0.55, 1, Math.sqrt(lakeK))); lake.scale.x *= 1.4; lake.visible = lakeK > 0.02; lake.material.opacity = 0.86;
      cracks.material.opacity = clamp((0.35 - lakeK) / 0.3);
      const by = Math.max(lake.position.y - 0.12, -0.92); boat.position.y = by; boat.rotation.z = lakeK < 0.2 ? lerp(0.18, 0, lakeK / 0.2) : 0; };
    out.setWater(1, 1);
  }
  if (forest) {
    const mats = ['#2f6a3a', '#3a7a40', '#4a8a3a', '#2a5a30'].map(c => P(c, null, { flatShading: true })); out.leafMats.push(...mats); out.leafBase = ['#2f6a3a', '#3a7a40', '#4a8a3a', '#2a5a30'];
    for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 34, z = 1 - r() * 26; if (Math.abs(x) < 2.4 && z > -2.2) continue; out.trees.push(tree(W, x, z, 1.3 + r() * 0.9, H, mats[i % 4], { tall: 1.6 + r() * 0.8, n: 9, bark: '#5a3a26' })); }
    for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 14, z = -1 - r() * 6; if (Math.abs(x) < 1.8 && z > -2.5) continue; const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mats[i % 4]); f.scale.set(1.4, 0.55, 1); f.position.set(x, H(x, z) + 0.2, z); W.scene.add(f); }
    // big fern leaves near the cast
    for (const [x, z, a] of [[-2.6, 0.4, 0.4], [2.7, 0.2, -0.5], [-3.4, -1.2, 0.9], [3.2, -1.6, -0.9]]) { for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), mats[k % 4]); l.scale.set(1.2, 0.1, 0.35); l.position.set(x + Math.cos(k * 1.3 + a) * 0.4, 0.35 + k * 0.05, z + Math.sin(k * 1.3 + a) * 0.4); l.rotation.set(0.3, -k * 1.3 - a, 0.5); W.scene.add(l); } }
    // the flying river: mist puffs rising out of the canopy and drifting away to the left
    out.mist = puffs(W, 70, (rr) => [(rr() - 0.5) * 34, 3.5 + rr() * 2, -6 - rr() * 18], { opacity: 0.5, seed: 4 });
    out.smoke = puffs(W, 18, (rr) => [12 + rr() * 10, 3, -18 - rr() * 6], { color: '#6a5a5a', opacity: 0, seed: 6 });
    out.fire = puffs(W, 8, (rr) => [12 + rr() * 10, 1.2, -18 - rr() * 6], { color: '#ff8a3a', opacity: 0, seed: 7, fog: false });
    out.updateForest = (t, dry, smokeK) => {
      mats.forEach((m, i) => m.color.copy(C(out.leafBase[i])).lerp(C(['#9a6a30', '#a87a3a', '#8a5a2a', '#b08040'][i]), dry));
      out.mist.forEach((v, i) => { const [a, b, c] = v.userData.seed, [x, y0, z] = v.userData.base, L = 12, u = ((t * (0.12 + a * 0.1) + b) % 1); v.position.set(x - u * L, y0 + u * 6, z); v.material.opacity = 0.5 * (1 - dry) * Math.sin(u * Math.PI); v.scale.setScalar(2.2 + u * 3 + c); });
      out.smoke.forEach((v, i) => { const [a, b] = v.userData.seed, [x, y0, z] = v.userData.base, u = ((t * (0.1 + a * 0.08) + b) % 1); v.position.set(x - u * 3, y0 + u * 10, z); v.material.opacity = 0.55 * smokeK * Math.sin(u * Math.PI); v.scale.setScalar(2.5 + u * 5); });
      out.fire.forEach((v, i) => { const [a] = v.userData.seed; v.material.opacity = 0.8 * smokeK * (0.7 + 0.3 * Math.sin(t * 9 + i)); v.scale.setScalar(1.6 + a); v.position.set(...v.userData.base); }); };
  }
  if (desert) {
    const rock = P('#a0705a', null, { flatShading: true }); for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 40, z = 2 - r() * 34; if (Math.abs(x) < 2 && z > -2) continue; const s = 0.2 + r() * (z < -10 ? 2.2 : 0.7); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s), rock); m.position.set(x, H(x, z) + s * 0.25, z); m.scale.y = 0.55; m.rotation.y = r() * 3; W.scene.add(m); }
    // fog nets: two posts + a net, a gutter and a pipe into a tank (right side)
    out.nets = []; const post = P('#6a4a2a'), gut = P('#4a6a8a'), tank = P('#4a7ab0');
    for (const [x, z, ry] of [[2.6, -1.8, -0.35], [5.6, -3.4, -0.35], [-4.2, -4.4, 0.3]]) { const g = new THREE.Group(); g.position.set(x, H(x, z), z); g.rotation.y = ry;
      for (const sx of [-1.3, 1.3]) g.add(cyl(0.05, 0.06, 2.6, post, sx, 1.3, 0, 6)); const net = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: tex('net', netTex), color: '#5a4a4a', transparent: true, side: THREE.DoubleSide, alphaTest: 0.3, depthWrite: false })); net.position.y = 1.75; g.add(net);
      g.add(box(2.6, 0.08, 0.14, gut, 0, 0.95, 0)); const pipe = cyl(0.04, 0.04, 0.9, gut, 1.3, 0.55, 0, 6); g.add(pipe); g.add(cyl(0.3, 0.3, 0.6, tank, 1.6, 0.3, 0.3, 16)); W.scene.add(g); out.nets.push(g); }
    // falling droplets along the nets (points)
    const ND = 160, dpos = new Float32Array(ND * 3), dseed = []; for (let i = 0; i < ND; i++) dseed.push([r(), r(), Math.floor(r() * 3)]);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); const drops = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#bfe6ff', size: 5 * W.pxS, sizeAttenuation: false, transparent: true, opacity: 0.95, depthWrite: false })); drops.userData.noink = true; drops.frustumCulled = false; W.scene.add(drops);
    out.fog = puffs(W, 50, (rr) => [-26 + rr() * 10, 0.8 + rr() * 2.2, -4 - rr() * 14], { opacity: 0.45, seed: 9 });
    // a little Mars-test rover
    const rv = new THREE.Group(); rv.add(box(0.7, 0.18, 0.5, P('#e8e0d0'), 0, 0.32, 0)); for (const [x, z] of [[-0.3, -0.3], [0, -0.3], [0.3, -0.3], [-0.3, 0.3], [0, 0.3], [0.3, 0.3]]) { const w = cyl(0.1, 0.1, 0.08, P('#2a2a2a'), x, 0.12, z, 12); w.rotation.x = Math.PI / 2; rv.add(w); }
    rv.add(cyl(0.025, 0.025, 0.45, P('#9a9aa8'), 0.25, 0.62, 0, 6)); rv.add(box(0.16, 0.1, 0.12, P('#3a3a4a'), 0.25, 0.86, 0)); rv.add(box(0.5, 0.02, 0.32, P('#3a4a8a'), -0.1, 0.43, 0)); rv.position.set(-1.6, H(-1.6, -3.4), -3.4); rv.rotation.y = 0.5; W.scene.add(rv); out.rover = rv;
    out.updateDesert = (t, fogK, dripK) => {
      out.fog.forEach((v, i) => { const [a, b, c] = v.userData.seed, [x, y0, z] = v.userData.base, u = ((t * (0.04 + a * 0.03) + b) % 1); v.position.set(x + u * 34, y0 + Math.sin(t * 0.4 + c * 6) * 0.2, z); v.material.opacity = 0.35 * fogK * Math.sin(u * Math.PI); v.scale.setScalar(2.5 + c * 2.5); });
      const a = dg.attributes.position.array; dseed.forEach(([s, u, k], i) => { const n = out.nets[k]; const on = s < dripK; const yy = on ? 2.45 - ((t * 0.7 + u * 3) % 1.5) : -50; const lx = (s * 2 - 1) * 1.2, w = new THREE.Vector3(lx, yy, 0.03).applyMatrix4(n.matrixWorld); a[i * 3] = w.x; a[i * 3 + 1] = w.y; a[i * 3 + 2] = w.z; }); dg.attributes.position.needsUpdate = true;
      out.rover.position.x = -1.6 + Math.sin(t * 0.15) * 0.4; };
    out.nets.forEach(n => n.updateMatrixWorld(true));
  }
  out.setLeaves = (d) => { if (mode !== 'valley') return; out.leafMats[0].color.copy(C('#5a9a4a')).lerp(C('#a88a4a'), d); out.leafMats[1].color.copy(C('#4a8a3a')).lerp(C('#a8905a'), d); out.wheat.color.copy(C('#7ab04a')).lerp(C('#e8c060'), clamp(d * 1.6)).lerp(C('#9a7048'), clamp(d * 1.6 - 0.8)); };
  out.setDry = (d) => { setGround(d); out.setLeaves(d); };
  if (mode === 'valley') out.setDry(0);
  W.sunFrom(desert ? [0.5, 0.8, 0.4] : [0.4, 0.85, 0.7], 30);
  return out;
}
const sstep = (u) => u * u * (3 - 2 * u);
