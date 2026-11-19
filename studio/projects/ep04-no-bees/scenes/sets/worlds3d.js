// sets/worlds3d.js — episode 03 locations: DUNE (night, dung beetle), REEF (underwater; deep mode = ocean mixing),
// BEACH (tide line that moves; 'ancient' = giant early Moon + tide pools; 'sky' = looking up for the eclipse).
// Shared helpers: sprite(canvas draw) for flat 2D cartoon props in 3D, sand terrain with a height function.
import { THREE, box, cyl, sphere } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { rng } from '/engine/core.js';

const P = W3.paint;
const TX = {};
const tex = (k, f) => TX[k] ||= f();

// flat 2D cartoon prop living in the 3D world (billboard, no world ink — it carries its own outline)
export function sprite(W, w, h, draw, o = {}) {
  const t = W3.paintTex(o.px ?? 256, Math.round((o.px ?? 256) * h / w), draw);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: o.fog ?? true, color: o.color || '#ffffff' }));
  s.scale.set(w, h, 1); s.userData.noink = true; W.scene.add(s); return s;
}
export const crabDraw = (g, w, h) => {
  g.translate(w / 2, h * 0.62); const k = w / 260; g.scale(k, k); g.lineWidth = 9; g.strokeStyle = '#1a0d12'; g.fillStyle = '#ff6a4a'; g.lineCap = 'round';
  for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * 50, 10 + i * 14); g.lineTo(s * 100, 40 + i * 16); g.stroke(); }
    g.beginPath(); g.moveTo(s * 45, -20); g.lineTo(s * 85, -60); g.stroke(); g.beginPath(); g.ellipse(s * 95, -75, 26, 20, s * 0.5, 0, 7); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(0, 10, 72, 48, 0, 0, 7); g.fill(); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 18, -30); g.lineTo(s * 22, -62); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 22, -72, 14, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#1a0d12'; g.beginPath(); g.arc(s * 24, -70, 6, 0, 7); g.fill(); g.fillStyle = '#ff6a4a'; }
};
const starDraw = (col) => (g, w, h) => { g.translate(w / 2, h / 2); g.fillStyle = col; g.strokeStyle = '#1a0d12'; g.lineWidth = 8; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? w * 0.17 : w * 0.42; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); };
const birdDraw = (g, w, h) => { g.translate(w / 2, h / 2); g.lineWidth = 8; g.strokeStyle = '#1a0d12'; g.fillStyle = '#f4f0ea'; g.beginPath(); g.ellipse(0, 10, 60, 34, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(48, -24, 24, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(68, -26); g.lineTo(108, -18); g.lineTo(68, -12); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#1a0d12'; g.beginPath(); g.arc(54, -30, 5, 0, 7); g.fill(); g.strokeStyle = '#ff9a3a'; g.lineWidth = 7; g.beginPath(); g.moveTo(-6, 42); g.lineTo(-10, 90); g.moveTo(12, 42); g.lineTo(14, 90); g.stroke(); };

// terrain: a big plane whose height comes from f(x, z)
function terrain(W, f, map, size = 80, seg = 160) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, f(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, P('#ffffff', map)); m.receiveShadow = true; W.scene.add(m); return m;
}
const sandTex = (base, seed) => W3.paintTex(1024, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed); for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,240,210,.25)' : 'rgba(120,80,40,.16)'; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); } for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(140,100,60,.18)'; g.lineWidth = 3; g.beginPath(); const y = r() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 8); g.stroke(); } }, [10, 10]);
function starsAndMoon(W, n = 1600, moonPos = [-14, 16, -60], moonR = 3.2) {
  const r = rng(13), pts = []; for (let i = 0; i < n; i++) { const u = r() * 0.95 + 0.05, a = r() * Math.PI * 2, rr = Math.sqrt(1 - u * u); pts.push(rr * Math.cos(a) * 140, u * 140, rr * Math.sin(a) * 140); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff6e0', size: 2.0 * W.pxS, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.5 })); stars.userData.noink = true; W.scene.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(moonR, 48), new THREE.MeshBasicMaterial({ map: tex('moonface', () => W3.paintTex(256, 256, (g) => { g.fillStyle = '#fbf4e4'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = 'rgba(190,180,200,.55)'; for (const [x, y, rr] of [[90, 80, 26], [160, 110, 18], [110, 170, 30], [175, 175, 14]]) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } })), color: new THREE.Color(...(moonR > 6 ? [0.95, 0.93, 0.9] : [2.0, 1.95, 1.85])), fog: false, transparent: true }));
  moon.position.set(...moonPos); moon.lookAt(0, 2, 6); moon.userData.noink = true; W.scene.add(moon);
  return { stars, moon };
}

// ---------------- DUNE (night) ----------------
export function dune3d(W) {
  const h = (x, z) => 0.18 * Math.sin(x * 0.35 + 1) * Math.cos(z * 0.28) + 0.35 * Math.sin(x * 0.12 - z * 0.09) + (z < -8 ? (-8 - z) * 0.18 : 0);
  terrain(W, h, tex('duneSand', () => sandTex('#c9a074', 4)));
  const sky = starsAndMoon(W, 1800, [-10, 13, -50], 2.6);
  // grass tufts and pebbles
  const r = rng(21), grass = P('#5a7a4a', null, { flatShading: true }), peb = P('#8a7a6a', null, { flatShading: true });
  for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 24, z = -r() * 22 + 4; if (Math.abs(x) < 1.2 && z > -3) continue; const k = 0.1 + r() * 0.2;
    if (r() < 0.6) for (let j = 0; j < 5; j++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.02 * (1 + k * 3), k * 2.4, 4), grass); c.position.set(x + (r() - 0.5) * 0.2, h(x, z) + k, z + (r() - 0.5) * 0.2); c.rotation.set((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6); W.scene.add(c); }
    else { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(k * 0.6), peb); s.position.set(x, h(x, z) + k * 0.2, z); W.scene.add(s); } }
  // the beetle + its ball
  const beetle = new THREE.Group(); const shell = P('#2f4a3a'), dark = P('#1a221c');
  const body = sphere(0.09, shell); body.scale.set(1, 0.6, 1.35); beetle.add(body); const head = sphere(0.05, dark, 0, 0.0, 0.13); head.scale.set(1.3, 0.7, 0.8); beetle.add(head);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const l = cyl(0.008, 0.008, 0.14, dark, s * 0.09, -0.03, -0.06 + i * 0.07); l.rotation.z = s * 1.0; beetle.add(l); }
  const ball = sphere(0.13, P('#6b4a2a', null, { flatShading: true })); W.scene.add(beetle, ball);
  W.sunFrom([-0.5, 0.8, -1], 30);
  return { h, beetle, ball, ...sky };
}

// ---------------- REEF (underwater) ----------------
export function reef3d(W, o = {}) {
  const deep = !!o.deep;
  const h = (x, z) => 0.25 * Math.sin(x * 0.4) * Math.cos(z * 0.3) + (deep ? Math.max(0, 4.5 - Math.hypot(x + 3, z + 14) * 0.9) + Math.max(0, 3.5 - Math.hypot(x - 7, z + 18) * 0.8) : 0);
  terrain(W, h, tex(deep ? 'deepSand' : 'reefSand', () => sandTex(deep ? '#4a5a80' : '#bfa67c', deep ? 8 : 6)));
  const r = rng(deep ? 31 : 17), cols = ['#ff7a8a', '#ffb04a', '#b07ad8', '#ffd84a', '#ff5a7a', '#6ad0c0'], corals = [];
  if (!deep) for (let i = 0; i < 90; i++) {
    const x = (r() - 0.5) * 16, z = -r() * 16 + 2.5; if (Math.abs(x) < 0.7 && z > 0) continue; const c = cols[i % cols.length], g = new THREE.Group(); g.position.set(x, h(x, z), z);
    const kind = i % 3, s = (0.7 + r() * 1.0) * (z > -4 ? 1.3 : 1);
    if (kind === 0) { for (let j = 0; j < 6; j++) { const b = cyl(0.04 * s, 0.06 * s, (0.4 + r() * 0.5) * s, P(c), 0, 0, 0, 8); b.position.set((r() - 0.5) * 0.3 * s, 0.25 * s, (r() - 0.5) * 0.3 * s); b.rotation.set((r() - 0.5) * 0.9, 0, (r() - 0.5) * 0.9); g.add(b); g.add(sphere(0.06 * s, P(c), b.position.x + Math.sin(b.rotation.z) * -0.2 * s, 0.5 * s, b.position.z)); } }
    else if (kind === 1) { const b = sphere(0.35 * s, P(c, null, { flatShading: true }), 0, 0.15 * s, 0); b.scale.y = 0.65; g.add(b); }
    else { for (let j = 0; j < 4; j++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.05 * s, 0.08 * s, 12), P(c)); f.position.set((r() - 0.5) * 0.4, (0.15 + j * 0.18) * s, (r() - 0.5) * 0.4); g.add(f); } }
    W.scene.add(g); corals.push(g);
  }
  // seaweed
  const weeds = []; for (let i = 0; i < (deep ? 6 : 12); i++) { const x = (r() - 0.5) * 14, z = -r() * 14 + 1; if (Math.abs(x) < 1 && z > -1.5) continue; const w = cyl(0.025, 0.04, 1 + r() * 1.2, P('#3f8a5a'), x, 0, z, 6); w.position.y = h(x, z) + w.geometry.parameters.height / 2; W.scene.add(w); weeds.push(w); }
  // light shafts from the surface
  const shafts = []; for (let i = 0; i < 6; i++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 14), new THREE.MeshBasicMaterial({ map: tex('shaft', () => W3.paintTex(64, 256, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); })), color: deep ? '#5a7ad8' : '#cfe8ff', transparent: true, opacity: deep ? 0.04 : 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    sh.position.set(-5 + i * 2.2, 5, -4 - (i % 3) * 2.5); sh.rotation.set(0, 0, 0.25); sh.userData.noink = true; W.scene.add(sh); shafts.push(sh); }
  // particles: spawn (pink eggs) or two water masses (warm / cold)
  const N = deep ? 900 : 1200, pos = new Float32Array(N * 3), seed = new Float32Array(N * 4); for (let i = 0; i < N; i++) { seed[i * 4] = (r() - 0.5) * 14; seed[i * 4 + 1] = r(); seed[i * 4 + 2] = -r() * 14 + 2; seed[i * 4 + 3] = r(); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mk = (col, sz) => { const pts = new THREE.Points(pg.clone(), new THREE.PointsMaterial({ color: col, size: sz * W.pxS, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false })); pts.userData.noink = true; W.scene.add(pts); return pts; };
  const eggs = mk(deep ? '#ff9a5a' : '#ffb0c8', deep ? 5 : 6), cold = deep ? mk('#6ad0ff', 5) : null;
  function particles(t, amt) {   // amt 0..1 spawn amount (reef) or stir strength (deep)
    for (const [pts, k] of cold ? [[eggs, 0], [cold, 1]] : [[eggs, 0]]) { const a = pts.geometry.attributes.position.array, n = a.length / 3;
      for (let i = 0; i < n; i++) { const sx = seed[i * 4], u = seed[i * 4 + 1], sz = seed[i * 4 + 2], v = seed[i * 4 + 3];
        if (!deep) { const on = u < amt; const y = on ? ((t * (0.25 + v * 0.3) + u * 6) % 6) : -50; a[i * 3] = sx + Math.sin(t * 0.7 + u * 9) * 0.2; a[i * 3 + 1] = y; a[i * 3 + 2] = sz; }
        else { const ang = t * (0.15 + 0.35 * amt) * (k ? -1 : 1) + u * Math.PI * 2, rr = 3 + v * 4, cy = k ? 1.5 : 4.5; a[i * 3] = sx * 0.4 + Math.cos(ang) * rr * (0.4 + 0.6 * amt); a[i * 3 + 1] = cy + Math.sin(ang) * rr * 0.35 * amt + (k ? -0.5 : 0.5) * (1 - amt) * 2; a[i * 3 + 2] = sz - 3; } }
      pts.geometry.attributes.position.needsUpdate = true; }
  }
  W.sunFrom([0.2, 1, 0.2], 30);
  return { h, corals, weeds, shafts, particles };
}

// ---------------- BEACH ----------------
// sand flat around the characters (z > -1), sloping down into the sea; water level animates the tide line.
export function beach3d(W, o = {}) {
  const mode = o.mode || 'day';
  const h = (x, z) => (z > -1 ? 0.02 * Math.sin(x * 0.7) : (z + 1) * 0.11 + 0.02 * Math.sin(x * 0.7)) + (z > 6 ? (z - 6) * 0.15 : 0);
  terrain(W, h, tex('beachSand', () => sandTex('#e6c78e', 5)));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), new THREE.MeshLambertMaterial({ color: mode === 'ancient' ? '#4a6aa8' : '#3a9ad0', transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2; water.position.z = -100; water.userData.noink = true; W.scene.add(water);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.35), new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.85 })); foam.rotation.x = -Math.PI / 2; foam.userData.noink = true; W.scene.add(foam);
  const setTide = (y) => { water.position.y = y; const z = y / 0.11 - 1; foam.position.set(0, y + 0.005, z + 0.05); return z; };
  // rocks
  const r = rng(9), rock = P('#7a7a86', null, { flatShading: true }); const rocks = [];
  for (const [x, z, s] of [[-4.2, -3.2, 0.7], [-3.4, -2.6, 0.4], [3.8, -2.4, 0.6], [4.6, -3.6, 0.9], [-6, -6, 1.2], [6.5, -7, 1.4]]) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s), rock); m.position.set(x, h(x, z) + s * 0.3, z); m.scale.y = 0.6; m.rotation.y = r() * 3; W.scene.add(m); rocks.push(m); }
  // palm on the left
  const trunk = P('#8a6040'), leaf = P('#4f9a4a', null, { flatShading: true, side: THREE.DoubleSide });
  const palm = new THREE.Group(); palm.position.set(-3.6, 0, 1.6); for (let i = 0; i < 7; i++) { const s = cyl(0.12 - i * 0.008, 0.14 - i * 0.008, 0.5, trunk, Math.sin(i * 0.3) * 0.25 * i * 0.15, 0.25 + i * 0.48, 0, 8); palm.add(s); }
  for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.8, 4, 1, true), leaf); l.position.set(0.5, 3.5, 0); l.rotation.set(Math.sin(i) * 0.3, i / 7 * Math.PI * 2, 2.0); const g = new THREE.Group(); g.add(l); g.rotation.y = i / 7 * Math.PI * 2; g.position.set(0.5, 0, 0); palm.add(g); }
  W.scene.add(palm);
  // little beach life (2D sprites), placed in the strip between high and low tide
  const crabs = [[-1.6, -2.0], [1.9, -2.6], [0.4, -3.6], [-2.6, -4.2]].map(([x, z]) => { const s = sprite(W, 0.42, 0.34, crabDraw); s.position.set(x, h(x, z) + 0.17, z); s.userData.home = [x, z]; return s; });
  const stars = [[-0.9, -3.0, '#ff9a3a'], [2.8, -3.4, '#ff6a9a']].map(([x, z, c]) => { const s = sprite(W, 0.36, 0.36, starDraw(c)); s.position.set(x, h(x, z) + 0.06, z); return s; });
  const bird = sprite(W, 0.55, 0.55, birdDraw); bird.position.set(3.2, h(3.2, -1.6) + 0.27, -1.6);
  let sky = null, pools = [];
  if (mode === 'ancient') { sky = starsAndMoon(W, 600, [6, 9, -60], 11); sky.stars.material.opacity = 0.3;
    for (const [x, z, s] of [[-1.8, -1.6, 0.7], [1.6, -1.3, 0.55], [0.2, -2.4, 0.5], [-3, -2.6, 0.45]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(s, 32), new THREE.MeshLambertMaterial({ color: '#5ab4e0', transparent: true, opacity: 0.85 })); p.rotation.x = -Math.PI / 2; p.position.set(x, h(x, z) + 0.02, z); p.scale.y = 0.7; p.userData.noink = true; W.scene.add(p); pools.push(p); } }
  if (mode === 'sky') { const sun = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 2.8), fog: false })); sun.position.set(0, 26, -40); sun.lookAt(0, 1, 4); sun.userData.noink = true; W.scene.add(sun);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(2.24, 64), new THREE.MeshBasicMaterial({ color: '#141022', fog: false })); moon.position.set(0, 26, -39.8); moon.lookAt(0, 1, 4); moon.userData.noink = true; W.scene.add(moon);
    const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('corona', () => W3.paintTex(256, 256, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, w * 0.18, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.25, 'rgba(220,235,255,.6)'); gr.addColorStop(1, 'rgba(200,220,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); })), color: new THREE.Color(2.2, 2.2, 2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    corona.scale.setScalar(13); corona.position.set(0, 26, -40.2); corona.userData.noink = true; W.scene.add(corona); sky = { sun, moon, corona }; }
  if (mode === 'ancient') W.sunFrom([-0.8, 0.35, -1], 30); else W.sunFrom([0.4, 0.9, 0.6], 30);
  return { h, water, foam, setTide, crabs, stars, bird, rocks, palm, pools, sky };
}
