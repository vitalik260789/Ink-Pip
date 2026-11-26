// sets/dino3d.js — episode 06 locations ("What If the Dinosaurs Never Went Extinct?"):
//   cretaceous3d(W, {mode}) — one valley, four moods:
//     'plain'  : Cretaceous day — fern floor, cycads, conifers, river, smoking volcano, titanosaur herd, T. rex by the river,
//                triceratops, pterosaurs circling.
//     'impact' : the same valley at dusk — fireball crossing the sky, impact glow behind the mountains, burning embers,
//                fires, dust darkening; update(t, {ball, hit, embers, fire, dark})
//     'miss'   : dawn — the fireball crosses and climbs away (ball path 'miss')
//     'night'  : moonlit fern floor with tiny mammals (glowing eyes), a sauropod silhouette walking behind
//     'today'  : 66 Myr later — cold windy grassland, snowy mountains, a running flock of feathered dinosaurs,
//                the dinosauroid statue (grows in with update(t, {statue}))
//   Builders: titanosaur · trex · triceratops · pterosaur · raptor (feathered) · mammal · dinosauroid · pigeon · toyRex.
//   Every animal is a THREE.Group facing +x with userData.update(t) for its idle/walk motion.
import { THREE, box, cyl, sphere } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { rng, lerp, clamp } from '/engine/core.js';

const P = W3.paint;
const TX = {};
const tex = (k, f) => TX[k] ||= f();
const C = (c) => new THREE.Color(c);
const sstep = (u) => u * u * (3 - 2 * u);
const flat = (c) => P(c, null, { flatShading: true });

// ---------- textures ----------
const noiseTex = (seed = 3, rep = [14, 14]) => W3.paintTex(1024, 1024, (g, w, h) => { g.fillStyle = '#e8e8e0'; g.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < 5000; i++) { const x = r() * w, y = r() * h, l = 5 + r() * 12; g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.45)' : 'rgba(60,60,40,.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y - l); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(80,80,60,.08)'; g.beginPath(); g.ellipse(r() * w, r() * h, 40 + r() * 80, 20 + r() * 40, r() * 3, 0, 7); g.fill(); } }, rep);
const softTex = () => W3.paintTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const skinTex = (base, spot, seed) => W3.paintTex(512, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < 160; i++) { g.fillStyle = spot; g.globalAlpha = 0.25 + r() * 0.3; g.beginPath(); g.ellipse(r() * w, r() * h * 0.6, 6 + r() * 16, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 0.35; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(255,240,210,1)'); g.fillStyle = gr; g.fillRect(0, h * 0.5, w, h * 0.5); g.globalAlpha = 1; });
const skin = (base, spot, seed) => P('#ffffff', tex('skin' + base + spot, () => skinTex(base, spot, seed)));

function terrain(W, f, mat, size = 160, seg = 150) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, f(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; W.scene.add(m); return m;
}
function puffs(W, n, spawn, o = {}) {
  const mat = new THREE.SpriteMaterial({ map: tex('soft', softTex), color: o.color || '#ffffff', transparent: true, opacity: o.opacity ?? 0.5, depthWrite: false, fog: o.fog ?? true, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const list = []; const r = rng(o.seed || 5);
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat.clone()); s.userData.noink = true; s.userData.seed = [r(), r(), r(), r()]; s.userData.base = spawn(r, i); W.scene.add(s); list.push(s); }
  return list;
}

// tapered tube along a curve: r(u) radius 0..1 along the curve
function taper(points, r, mat, seg = 24, rad = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, seg, 1, rad, false); const p = geo.attributes.position;
  for (let i = 0; i <= seg; i++) { const c = curve.getPointAt(i / seg), k = r(i / seg); for (let j = 0; j <= rad; j++) { const idx = i * (rad + 1) + j; const v = new THREE.Vector3(p.getX(idx), p.getY(idx), p.getZ(idx)).sub(c).multiplyScalar(k).add(c); p.setXYZ(idx, v.x, v.y, v.z); } }
  geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  // round caps
  const cap0 = new THREE.Mesh(new THREE.SphereGeometry(r(0), 12, 8), mat); cap0.position.copy(curve.getPointAt(0)); const cap1 = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.01, r(1)), 12, 8), mat); cap1.position.copy(curve.getPointAt(1));
  const g = new THREE.Group(); g.add(m, cap0, cap1); return g;
}
const ell = (rx, ry, rz, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
function eye(r, x, y, z, glowing = false) { const g = new THREE.Group(); const w = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), glowing ? new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 0.8) }) : P('#fff8e8')); g.add(w);
  if (!glowing) { const pu = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 12, 8), P('#140c10')); pu.position.set(r * 0.62, 0, 0); g.add(pu); } else w.userData.noink = true; g.position.set(x, y, z); return g; }
// leg with a hip pivot: returns pivot group (rotate .rotation.z to swing)
function leg(len, r0, r1, mat, x, y, z, foot = true) { const pv = new THREE.Group(); pv.position.set(x, y, z); const l = cyl(r1, r0, len, mat, 0, -len / 2, 0, 10); pv.add(l); if (foot) pv.add(ell(r1 * 1.6, r1 * 0.6, r1 * 1.3, mat, r1 * 0.5, -len, 0)); return pv; }

// ================= ANIMALS =================
export function titanosaur(s = 1, o = {}) {
  const g = new THREE.Group(), m = skin(o.color || '#8a9a6a', o.spot || '#5a6a4a', 3), belly = P('#c8c09a');
  const body = ell(3.2, 1.7, 1.5, m, 0, 4.4, 0); g.add(body); g.add(ell(2.6, 1.0, 1.2, belly, 0.2, 3.5, 0));
  const neck = new THREE.Group(); neck.position.set(2.6, 5.0, 0); g.add(neck);
  neck.add(taper([[0, 0, 0], [2.2, 2.0, 0], [3.6, 5.0, 0], [4.4, 7.6, 0]], u => lerp(1.1, 0.42, u), m));
  const head = new THREE.Group(); head.position.set(4.6, 7.8, 0); neck.add(head); head.add(ell(0.75, 0.42, 0.42, m, 0.35, 0, 0)); head.add(eye(0.1, 0.55, 0.15, 0.32)); head.add(eye(0.1, 0.55, 0.15, -0.32));
  g.add(taper([[-2.8, 4.6, 0], [-5.5, 3.8, 0.3], [-8.5, 2.6, -0.4], [-11, 2.0, 0.2]], u => lerp(1.0, 0.08, u), m));
  const legs = [[1.7, 0.9], [1.7, -0.9], [-1.7, 0.9], [-1.7, -0.9]].map(([x, z]) => { const l = leg(3.7, 0.55, 0.5, m, x, 3.8, z); g.add(l); return l; });
  g.scale.setScalar(s);
  g.userData.update = (t, walk = 0.35) => { const ph = t * 1.1 * walk + (o.phase || 0); legs.forEach((l, i) => { l.rotation.z = Math.sin(ph * 2 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.22 * walk; });
    neck.rotation.z = Math.sin(t * 0.35 + (o.phase || 0)) * 0.08 + (o.graze || 0); neck.rotation.y = Math.sin(t * 0.22 + 1 + (o.phase || 0)) * 0.15; head.rotation.z = -0.15 + Math.sin(t * 0.7) * 0.08; body.position.y = 4.4 + Math.abs(Math.sin(ph * 2)) * 0.06 * walk; };
  return g;
}
export function trex(s = 1, o = {}) {
  const g = new THREE.Group(), m = skin(o.color || '#6a5a3e', o.spot || '#3a2e22', 7), belly = P('#d8c8a0'), tooth = P('#fffaf0'), mouth = P('#6a1a1e');
  const hip = new THREE.Group(); hip.position.set(0, 3.0, 0); g.add(hip);
  hip.add(ell(2.0, 1.15, 0.95, m, 0.4, 0.15, 0)); hip.add(ell(1.6, 0.7, 0.75, belly, 0.6, -0.35, 0));
  hip.add(taper([[-1.2, 0.2, 0], [-3.4, 0.0, 0], [-5.6, -0.4, 0], [-7.4, -0.9, 0]], u => lerp(0.85, 0.06, u), m));
  hip.add(taper([[1.6, 0.4, 0], [2.4, 1.0, 0], [2.9, 1.25, 0]], u => lerp(0.8, 0.6, u), m));
  const head = new THREE.Group(); head.position.set(3.0, 1.3, 0); hip.add(head);
  head.add(ell(1.25, 0.6, 0.5, m, 0.9, 0.15, 0)); head.add(ell(0.5, 0.18, 0.42, m, 0.35, 0.55, 0));
  head.add(eye(0.12, 0.7, 0.45, 0.42)); head.add(eye(0.12, 0.7, 0.45, -0.42));
  for (let i = 0; i < 9; i++) for (const z of [0.36, -0.36]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 5), tooth); c.rotation.x = Math.PI; c.position.set(0.5 + i * 0.17, -0.38, z * (1 - i * 0.05)); head.add(c); }
  const jaw = new THREE.Group(); jaw.position.set(0.2, -0.2, 0); head.add(jaw); jaw.add(ell(1.05, 0.25, 0.42, m, 0.8, -0.3, 0)); jaw.add(ell(0.9, 0.12, 0.33, mouth, 0.8, -0.1, 0));
  for (let i = 0; i < 7; i++) for (const z of [0.3, -0.3]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), tooth); c.position.set(0.4 + i * 0.18, -0.03, z * (1 - i * 0.05)); jaw.add(c); }
  for (const z of [0.55, -0.55]) { const a = taper([[1.8, -0.1, z], [2.2, -0.5, z * 1.1], [2.5, -0.55, z * 1.1]], () => 0.12, m); hip.add(a); }
  const legs = [0.75, -0.75].map((z) => { const pv = new THREE.Group(); pv.position.set(0.3, 0, z); hip.add(pv); pv.add(ell(0.8, 1.2, 0.5, m, 0, -0.6, 0)); const shin = leg(1.8, 0.32, 0.22, m, 0.2, -1.4, 0); pv.add(shin); return pv; });
  g.scale.setScalar(s);
  g.userData.jaw = jaw; g.userData.head = head;
  g.userData.update = (t, walk = 0.6, roar = 0) => { const ph = t * 2.4 * walk + (o.phase || 0); legs.forEach((l, i) => l.rotation.z = Math.sin(ph + i * Math.PI) * 0.35 * walk);
    hip.position.y = 3.0 + Math.abs(Math.cos(ph)) * 0.12 * walk; hip.rotation.z = Math.sin(ph * 2) * 0.03; head.rotation.z = Math.sin(t * 0.9) * 0.06 + roar * 0.25; jaw.rotation.z = -(0.08 + Math.max(0, Math.sin(t * 0.7)) * 0.1 + roar * 0.6); head.rotation.y = Math.sin(t * 0.5) * 0.15; };
  return g;
}
export function triceratops(s = 1, o = {}) {
  const g = new THREE.Group(), m = skin(o.color || '#9a6a4a', o.spot || '#6a3a2a', 11), horn = P('#f4ead0'), frillM = P(o.frill || '#d8643a');
  g.add(ell(2.0, 1.15, 1.15, m, 0, 1.9, 0)); g.add(taper([[-1.8, 2.0, 0], [-3.0, 1.6, 0], [-4.0, 1.1, 0]], u => lerp(0.6, 0.06, u), m));
  const head = new THREE.Group(); head.position.set(2.0, 1.8, 0); g.add(head);
  head.add(ell(0.95, 0.65, 0.62, m, 0.6, -0.1, 0)); head.add(ell(0.35, 0.3, 0.28, m, 1.5, -0.35, 0));
  const frill = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.12, 24), frillM); frill.rotation.z = Math.PI / 2 - 0.5; frill.position.set(0.0, 0.5, 0); frill.castShadow = true; head.add(frill);
  for (let i = 0; i < 9; i++) { const a = -1.4 + i * 0.35; const b = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 5), horn); b.position.set(-0.2 + Math.sin(-0.5) * 0, 0.5 + Math.cos(a) * 1.25, Math.sin(a) * 1.25); b.position.x = 0.0 - Math.cos(a) * 1.25 * Math.sin(0.5) * 0.9; b.lookAt(-3, b.position.y + 2, b.position.z * 2); head.add(b); }
  for (const z of [0.32, -0.32]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2, 8), horn); h.position.set(0.95, 0.55, z); h.rotation.z = -1.0; head.add(h); }
  const nh = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 8), horn); nh.position.set(1.55, 0.0, 0); nh.rotation.z = -0.6; head.add(nh);
  head.add(eye(0.09, 1.1, 0.25, 0.48)); head.add(eye(0.09, 1.1, 0.25, -0.48));
  const legs = [[1.2, 0.7], [1.2, -0.7], [-1.2, 0.7], [-1.2, -0.7]].map(([x, z]) => { const l = leg(1.45, 0.35, 0.3, m, x, 1.4, z); g.add(l); return l; });
  g.scale.setScalar(s);
  g.userData.update = (t, walk = 0.3) => { const ph = t * 2 * walk + (o.phase || 0); legs.forEach((l, i) => l.rotation.z = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.3 * walk); head.rotation.z = -0.15 + Math.sin(t * 0.6 + 2) * 0.12; };
  return g;
}
export function pterosaur(s = 1, o = {}) {
  const g = new THREE.Group(), m = P(o.color || '#c87a4a'), wingM = new THREE.MeshLambertMaterial({ color: o.wing || '#e0a070', side: THREE.DoubleSide }), crest = P('#e8443a');
  g.add(ell(0.6, 0.22, 0.22, m, 0, 0, 0)); g.add(ell(0.15, 0.15, 0.15, m, 0.62, 0.12, 0));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.9, 6), P('#f0d8a0')); beak.rotation.z = -Math.PI / 2; beak.position.set(1.15, 0.1, 0); g.add(beak);
  const cr = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 4), crest); cr.rotation.z = Math.PI / 2 + 0.4; cr.position.set(0.35, 0.3, 0); g.add(cr);
  const wings = [1, -1].map(side => { const pv = new THREE.Group(); g.add(pv); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0.3, 0, 0, -0.4, 0, 0, 0.2, 0, 2.8 * side, 0.3, 0, 0, 0.2, 0, 2.8 * side, 0.7, 0, 1.4 * side], 3)); geo.computeVertexNormals();
    const w = new THREE.Mesh(geo, wingM); w.castShadow = true; pv.add(w); return [pv, side]; });
  g.scale.setScalar(s);
  g.userData.update = (t) => { const f = Math.sin(t * 4 + (o.phase || 0)); wings.forEach(([pv, side]) => pv.rotation.x = side * f * 0.45); };
  return g;
}
export function raptor(s = 1, o = {}) {   // feathered dinosaur of the 'today' world
  const g = new THREE.Group(), fe = flat(o.color || '#d8743a'), fe2 = flat(o.color2 || '#4a3a6a'), skinM = P('#e8c890');
  const hip = new THREE.Group(); hip.position.set(0, 1.0, 0); g.add(hip);
  hip.add(ell(0.75, 0.45, 0.4, fe, 0, 0, 0)); hip.add(taper([[-0.6, 0.1, 0], [-1.3, 0.15, 0], [-2.0, 0.25, 0]], u => lerp(0.3, 0.08, u), fe2));
  for (let i = 0; i < 6; i++) { const f = ell(0.4, 0.04, 0.12, fe, -1.9 - i * 0.05, 0.3, (i - 2.5) * 0.1); f.rotation.y = (i - 2.5) * 0.25; hip.add(f); }
  hip.add(taper([[0.5, 0.2, 0], [0.8, 0.6, 0], [0.95, 0.9, 0]], u => lerp(0.24, 0.17, u), fe));
  const head = new THREE.Group(); head.position.set(1.05, 1.0, 0); hip.add(head); head.add(ell(0.28, 0.2, 0.18, fe2, 0.1, 0, 0));
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), P('#f4d060')); bk.rotation.z = -Math.PI / 2; bk.position.set(0.45, -0.03, 0); head.add(bk); head.add(eye(0.05, 0.22, 0.07, 0.15)); head.add(eye(0.05, 0.22, 0.07, -0.15));
  for (const z of [0.38, -0.38]) { const w = ell(0.45, 0.06, 0.16, fe2, 0.3, 0.05, z); w.rotation.z = -0.4; hip.add(w); }
  const legs = [0.18, -0.18].map(z => { const pv = leg(1.0, 0.12, 0.06, skinM, 0, -0.1, z); hip.add(pv); return pv; });
  g.scale.setScalar(s);
  g.userData.update = (t, run = 1) => { const ph = t * 9 * run + (o.phase || 0); legs.forEach((l, i) => l.rotation.z = Math.sin(ph + i * Math.PI) * 0.6 * run); hip.position.y = 1.0 + Math.abs(Math.sin(ph)) * 0.1 * run; head.rotation.z = Math.sin(ph * 0.5) * 0.1; };
  return g;
}
export function mammal(s = 1, o = {}) {
  const g = new THREE.Group(), fur = P(o.color || '#7a5a44'), pink = P('#e8a0a0');
  g.add(ell(0.16, 0.1, 0.1, fur, 0, 0.1, 0)); g.add(ell(0.08, 0.075, 0.075, fur, 0.15, 0.15, 0));
  const nose = ell(0.035, 0.025, 0.025, pink, 0.235, 0.14, 0); g.add(nose);
  for (const z of [0.045, -0.045]) { g.add(ell(0.03, 0.04, 0.015, pink, 0.12, 0.23, z)); g.add(eye(0.018, 0.2, 0.17, z * 1.0, true)); }
  g.add(taper([[-0.14, 0.09, 0], [-0.3, 0.05, 0.03], [-0.42, 0.08, 0.06]], () => 0.015, pink));
  g.scale.setScalar(s); g.userData.nose = nose;
  g.userData.update = (t) => { g.rotation.z = Math.max(0, Math.sin(t * 1.3 + (o.phase || 0))) * 0.25; nose.scale.y = 1 + Math.sin(t * 18 + (o.phase || 0)) * 0.2; };
  return g;
}
export function dinosauroid(s = 1) {
  const g = new THREE.Group(), m = P('#7aa86a'), belly = P('#d8e0a8'), stone = flat('#9a948a');
  g.add(cyl(0.6, 0.7, 0.4, stone, 0, 0.2, 0, 10));
  const body = new THREE.Group(); body.position.y = 0.4; g.add(body);
  for (const x of [0.13, -0.13]) { body.add(cyl(0.07, 0.09, 0.75, m, x, 0.4, 0, 10)); body.add(ell(0.12, 0.05, 0.08, m, x, 0.03, 0.05)); }
  body.add(ell(0.26, 0.42, 0.2, m, 0, 1.05, 0)); body.add(ell(0.18, 0.3, 0.1, belly, 0, 1.0, 0.11));
  body.add(cyl(0.07, 0.08, 0.18, m, 0, 1.5, 0, 10));
  body.add(ell(0.22, 0.22, 0.22, m, 0, 1.72, 0.02)); body.add(ell(0.13, 0.08, 0.1, m, 0, 1.64, 0.18));
  for (const x of [0.1, -0.1]) { const e = new THREE.Group(); e.position.set(x, 1.76, 0.17); const w = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), P('#f4e890')); e.add(w); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), P('#140c10')); pu.position.z = 0.05; pu.scale.x = 0.45; e.add(pu); body.add(e); }
  for (const x of [0.33, -0.33]) { const a = cyl(0.045, 0.055, 0.6, m, x, 1.0, 0.02, 8); a.rotation.z = x > 0 ? 0.12 : -0.12; body.add(a); for (let k = 0; k < 3; k++) { const f = cyl(0.015, 0.015, 0.1, m, x * 1.1 + (k - 1) * 0.025, 0.66, 0.03, 5); body.add(f); } }
  g.scale.setScalar(s); return g;
}
export function pigeon(s = 1) {
  const g = new THREE.Group(), grey = P('#9aa0b0'), dark = P('#5a6070'), neckM = P('#6a9a8a'), orange = P('#e8843a');
  const body = new THREE.Group(); g.add(body);
  body.add(ell(0.17, 0.12, 0.11, grey, 0, 0.16, 0)); body.add(ell(0.16, 0.03, 0.1, dark, -0.18, 0.15, 0)).rotation.z = 0.25;
  for (const z of [0.1, -0.1]) { const w = ell(0.15, 0.06, 0.03, dark, -0.04, 0.18, z); w.rotation.z = 0.2; body.add(w); }
  const head = new THREE.Group(); head.position.set(0.12, 0.27, 0); body.add(head);
  head.add(ell(0.075, 0.07, 0.065, neckM, -0.02, -0.04, 0)); head.add(ell(0.06, 0.06, 0.055, grey, 0.02, 0.03, 0));
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 6), P('#3a3a3a')); bk.rotation.z = -Math.PI / 2; bk.position.set(0.1, 0.02, 0); head.add(bk);
  for (const z of [0.045, -0.045]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), orange); e.position.set(0.05, 0.05, z); head.add(e); }
  for (const z of [0.04, -0.04]) g.add(cyl(0.008, 0.008, 0.07, P('#d86a6a'), 0.01, 0.035, z, 5));
  g.scale.setScalar(s); g.userData.head = head; g.userData.body = body;
  g.userData.update = (t) => { const b = Math.sin(t * 5); head.position.x = 0.12 + b * 0.025; head.rotation.z = Math.max(0, Math.sin(t * 1.1)) > 0.85 ? -0.6 : 0; };
  return g;
}
export function toyRex(W, x, z) {   // small table with a plastic T. rex (room)
  const g = new THREE.Group(); g.position.set(x, 0, z); W.scene.add(g);
  const wood = P('#a8703a'), dark = P('#6a4a2a');
  g.add(cyl(0.42, 0.42, 0.05, wood, 0, 0.72, 0, 32)); g.add(cyl(0.05, 0.07, 0.7, dark, 0, 0.36, 0, 10)); g.add(cyl(0.22, 0.24, 0.04, dark, 0, 0.02, 0, 20));
  const t = trex(0.055, { color: '#4aa84a', spot: '#2a7a3a' }); t.position.set(-0.02, 0.745, 0.02); t.rotation.y = -0.6; g.add(t);
  return { group: g, rex: t };
}

// ================= PLANTS =================
function frondMesh(N, colors, seedObj) { const geo = new THREE.SphereGeometry(1, 8, 5); const m = new THREE.InstancedMesh(geo, P('#ffffff', null, { flatShading: true }), N); m.castShadow = true; m.receiveShadow = true; m.userData.i = 0; m.userData.colors = colors.map(C); return m; }
function addFrond(m, x, y, z, len, wid, yaw, pitch, col) { const i = m.userData.i++; if (i >= m.count) return; const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.set(0, yaw, pitch, 'YZX'); o.translateX(len * 0.9); o.scale.set(len, len * 0.06, wid); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, m.userData.colors[col % m.userData.colors.length]); }
function fern(m, x, y, z, s, r) { const n = 7 + Math.floor(r() * 3); for (let k = 0; k < n; k++) addFrond(m, x, y + 0.05, z, (0.55 + r() * 0.3) * s, 0.13 * s, k / n * Math.PI * 2 + r() * 0.4, 0.5 + r() * 0.35, k); }
function cycad(W, m, x, y, z, s, r, trunkM) { const h = (0.8 + r() * 1.0) * s; const t = cyl(0.16 * s, 0.22 * s, h, trunkM, x, y + h / 2, z, 8); W.scene.add(t); const n = 11; for (let k = 0; k < n; k++) addFrond(m, x, y + h, z, (0.9 + r() * 0.3) * s, 0.16 * s, k / n * Math.PI * 2, 0.15 - r() * 0.5, k + 1); }
function palm(W, m, x, y, z, s, r, trunkM) { const h = (3.5 + r() * 2) * s; const t = taper([[x, y, z], [x + 0.3 * s, y + h * 0.5, z], [x + 0.2 * s, y + h, z + 0.1]], u => lerp(0.22, 0.14, u) * s, trunkM); W.scene.add(t); for (let k = 0; k < 9; k++) addFrond(m, x + 0.2 * s, y + h, z + 0.1, (1.3 + r() * 0.4) * s, 0.22 * s, k / 9 * Math.PI * 2, -0.25 - r() * 0.4, k); }
function conifer(W, x, y, z, s, mat, trunk) { const g = new THREE.Group(); g.position.set(x, y, z); g.add(cyl(0.15 * s, 0.22 * s, 2 * s, trunk, 0, s, 0, 7)); for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.3 - k * 0.25) * s, 1.6 * s, 7), mat); c.position.y = (1.8 + k * 0.9) * s; c.castShadow = true; g.add(c); } W.scene.add(g); return g; }

// ================= THE VALLEY =================
export function cretaceous3d(W, o = {}) {
  const mode = o.mode || 'plain', today = mode === 'today', night = mode === 'night', r = rng(mode === 'today' ? 41 : 23);
  const RZ = -7.5;   // river across the valley
  const h0 = (x, z) => 0.12 * Math.sin(x * 0.3 + 1) * Math.cos(z * 0.25) + (z < -22 ? (-22 - z) * 0.12 : 0) + 0.25 * Math.sin(x * 0.07 - 0.5);
  const h = (x, z) => { let y = h0(x, z) - h0(0, 0.8); if (!today) { const d = Math.abs(z - RZ - Math.sin(x * 0.12) * 1.2); if (d < 2.2) y = lerp(-0.5, y, sstep(clamp((d - 1.0) / 1.2))); } return y; };
  const ground = new THREE.MeshLambertMaterial({ color: today ? '#b8b070' : '#7a9a4a', map: tex('cnoise', () => noiseTex(7)) });
  terrain(W, h, ground);
  const out = { h, mode, animals: [], RZ };
  if (!today) { const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 3.2, 80, 1), new THREE.MeshLambertMaterial({ color: night ? '#2a4a7a' : '#4a9ac0', transparent: true, opacity: 0.9 }));
    const wp = water.geometry.attributes.position; for (let i = 0; i < wp.count; i++) wp.setY(i, wp.getY(i) + Math.sin(wp.getX(i) * 0.12) * 1.2); water.rotation.x = -Math.PI / 2; water.position.set(0, -0.22, RZ); water.userData.noink = true; W.scene.add(water); out.water = water; }
  // mountains + volcano
  const mtn = flat(today ? '#8a96aa' : '#6a7a6a'), snow = flat('#ffffff');
  for (const [x, z, s, hh] of [[-40, -78, 18, 22], [-14, -88, 22, 28], [16, -80, 18, 22], [44, -86, 22, 26], [66, -92, 18, 20], [-64, -90, 20, 20]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(s, hh, 7), mtn); m.position.set(x, hh / 2 - 2, z); W.scene.add(m);
    if (today) { const c = new THREE.Mesh(new THREE.ConeGeometry(s * 0.45, hh * 0.45, 7), snow); c.position.set(x, hh - 2 - hh * 0.225 + 0.05, z); W.scene.add(c); } }
  if (!today) { const vol = new THREE.Mesh(new THREE.CylinderGeometry(3, 16, 20, 9, 1, true), flat('#5a4a4a')); vol.position.set(28, 8, -60); W.scene.add(vol); const lava = new THREE.Mesh(new THREE.CircleGeometry(3, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3) })); lava.rotation.x = -Math.PI / 2; lava.position.set(28, 17.6, -60); lava.userData.noink = true; W.scene.add(lava);
    out.smoke = puffs(W, 22, (rr) => [28, 19, -60], { color: night ? '#4a4a5a' : '#8a8088', opacity: 0.5, seed: 12 }); }
  // plants
  const fr = frondMesh(today ? 600 : 2600, today ? ['#6a8a4a', '#7a9a5a', '#5a7a44'] : ['#3f7a3a', '#4a8a3a', '#5a9a44', '#2f6a36']);
  const trunkM = P('#7a5a3a'), conM = flat(today ? '#2f5a44' : '#3a6a3a');
  const clear = (x, z) => Math.abs(x) < 2.6 && z > -2.4 && z < 3.5;
  if (!today) {
    for (let i = 0; i < (night ? 130 : 160); i++) { const x = (r() - 0.5) * 40, z = 3 - r() * 22; if (clear(x, z) || Math.abs(z - RZ) < 2 || (z > 0.5 && Math.abs(x) < 6)) continue; fern(fr, x, h(x, z), z, 0.8 + r() * 0.9, r); }
    if (night) for (const [x, z] of [[-2.4, 0.6], [2.5, 0.9], [-2.8, -0.5], [2.9, -0.6], [-0.2, -2.0]]) fern(fr, x, h(x, z), z, 0.7 + r() * 0.3, r);
    for (let i = 0; i < 16; i++) { const x = (r() - 0.5) * 36, z = -2 - r() * 20; if (clear(x, z) || Math.abs(z - RZ) < 2.4) continue; cycad(W, fr, x, h(x, z), z, 1.0 + r() * 0.5, r, trunkM); }
    for (let i = 0; i < 12; i++) { const x = (r() - 0.5) * 50, z = -10 - r() * 26; if (Math.abs(z - RZ) < 2.4) continue; palm(W, fr, x, h(x, z), z, 1.0 + r() * 0.4, r, trunkM); }
    for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 80, z = -24 - r() * 30; conifer(W, x, h(x, z), z, 1.4 + r() * 1.2, conM, trunkM); }
  } else {
    for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * 90, z = -20 - r() * 40; conifer(W, x, h(x, z), z, 1.2 + r() * 1.2, conM, trunkM); }
    for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 30, z = 2 - r() * 16; if (clear(x, z)) continue; fern(fr, x, h(x, z), z, 0.5 + r() * 0.3, r); }
    // grass: instanced blades
    const N = 9000, bl = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.5, 3), P('#ffffff'), N), oo = new THREE.Object3D(), cols = ['#c8c070', '#a8b060', '#d8c880', '#9aa858'].map(C);
    for (let i = 0; i < N; i++) { const x = (r() - 0.5) * 44, z = 4 - r() * 30; if (Math.abs(x) < 1.6 && z > -1.2 && z < 2.6) continue; oo.position.set(x, h(x, z) + 0.2, z); oo.rotation.set((r() - 0.5) * 0.3 + 0.15, r() * 3, (r() - 0.5) * 0.3); oo.scale.set(1, 0.7 + r() * 0.8, 1); oo.updateMatrix(); bl.setMatrixAt(i, oo.matrix); bl.setColorAt(i, cols[i % 4]); }
    bl.receiveShadow = true; W.scene.add(bl); out.grass = bl;
  }
  fr.count = fr.userData.i; fr.instanceMatrix.needsUpdate = true; if (fr.instanceColor) fr.instanceColor.needsUpdate = true; W.scene.add(fr);
  // rocks
  const rock = flat('#8a8278'); for (let i = 0; i < 24; i++) { const x = (r() - 0.5) * 30, z = 3 - r() * 20; if (clear(x, z)) continue; const s = 0.15 + r() * 0.6; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s), rock); m.position.set(x, h(x, z) + s * 0.2, z); m.scale.y = 0.6; W.scene.add(m); }
  // animals
  const add = (a, x, z, ry = 0) => { a.position.set(x, h(x, z), z); a.rotation.y = ry; W.scene.add(a); out.animals.push(a); return a; };
  if (mode === 'plain' || mode === 'impact' || mode === 'miss') {
    out.herd = [add(titanosaur(1.0, { phase: 0 }), -14, -26, 0.35), add(titanosaur(0.85, { phase: 1.7, color: '#7a8a66' }), -4, -32, 0.25), add(titanosaur(0.7, { phase: 3.1, color: '#9a9a72' }), -22, -34, 0.4)];
    out.herd.forEach(a => a.userData.x0 = a.position.x);
    out.rex = add(trex(1.0), 10, -11, -2.4); out.rex.userData.x0 = 10;
    out.trike = add(triceratops(1.0), -6.5, -13, 0.5);
    out.pteros = [0, 1, 2, 3].map(i => { const p = pterosaur(i === 0 ? 1.6 : 1.0, { phase: i * 1.3 }); W.scene.add(p); return p; });
  }
  if (night) {
    out.mammals = [[-1.9, 1.9, 0.6], [1.9, 2.1, 2.6], [-0.4, -1.3, 1.2], [2.5, -0.2, 3.6], [-2.4, -0.9, 0.1]].map(([x, z, ph]) => { const m = mammal(1.6, { phase: ph }); m.position.set(x, h(x, z) + 0.02, z); m.rotation.y = x > 0 ? Math.PI - 0.4 : 0.4; W.scene.add(m); out.animals.push(m); return m; });
    out.herd = [add(titanosaur(0.9, { phase: 0.6, color: '#4a5a6a' }), -20, -24, 0.3)]; out.herd[0].userData.x0 = -20;
    const moon = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.0), fog: false })); moon.position.set(-30, 30, -110); moon.lookAt(0, 2, 5); moon.userData.noink = true; W.scene.add(moon);
    out.flies = puffs(W, 30, (rr) => [(rr() - 0.5) * 10, 0.3 + rr() * 1.5, -rr() * 6], { color: '#d8ff7a', opacity: 0.9, seed: 5, fog: false, add: true });
  }
  if (today) {
    const cols = [['#d8743a', '#4a3a6a'], ['#3a8ad8', '#f4d04a'], ['#e8d8c0', '#8a4a3a'], ['#6ab04a', '#2a4a6a'], ['#d8443a', '#f4e8d8'], ['#8a6ac8', '#f4a03a']];
    out.flock = cols.map(([a, b], i) => { const d = raptor(0.9 + (i % 3) * 0.12, { color: a, color2: b, phase: i * 1.7 }); W.scene.add(d); d.userData.off = [i * 1.6 + (i % 2) * 0.7, (i % 3) * 1.3]; return d; });
    out.big = add(raptor(3.4, { color: '#7a5a3a', color2: '#e8d0a0', phase: 2 }), 12, -16, -2.6);
    out.statue = dinosauroid(1.0); out.statue.position.set(2.5, h(2.5, -1.4), -1.4); out.statue.rotation.y = -0.6; W.scene.add(out.statue);
    out.snow = puffs(W, 60, (rr) => [(rr() - 0.5) * 16, rr() * 6, 4 - rr() * 14], { opacity: 0.9, seed: 21 });
  }
  // fireball + trail + impact glow + embers + fires + dust (impact / miss)
  if (mode === 'impact' || mode === 'miss') {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 2.2), fog: false })); ball.userData.noink = true; W.scene.add(ball);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('soft', softTex), color: '#ffb060', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.userData.noink = true; halo.scale.setScalar(12); W.scene.add(halo);
    const trailGeo = new THREE.ConeGeometry(1.3, 1, 16, 1, true); trailGeo.translate(0, -0.5, 0);
    const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.2, 0.5), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); trail.userData.noink = true; W.scene.add(trail);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.1, 0.45), transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })); dome.position.set(20, -2, -140); dome.userData.noink = true; W.scene.add(dome);
    const A = mode === 'miss' ? [new THREE.Vector3(-120, 34, -150), new THREE.Vector3(-10, 30, -110), new THREE.Vector3(120, 90, -150)] : [new THREE.Vector3(-120, 80, -170), new THREE.Vector3(-40, 44, -150), new THREE.Vector3(20, -2, -140)];
    const path = new THREE.QuadraticBezierCurve3(...A);
    out.ball = { ball, halo, trail, dome, path };
    out.embers = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: new THREE.Color(3, 1.4, 0.5), transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
    const NE = 260, ep = new Float32Array(NE * 6), es = []; for (let i = 0; i < NE; i++) es.push([(r() - 0.5) * 80, r(), -10 - r() * 60]); out.embers.geometry.setAttribute('position', new THREE.BufferAttribute(ep, 3)); out.embers.userData.noink = true; out.embers.frustumCulled = false; W.scene.add(out.embers); out.embers.userData.seed = es;
    out.fires = puffs(W, 24, (rr) => [(rr() - 0.5) * 60, 1 + rr() * 2, -14 - rr() * 30], { color: '#ff7a2a', opacity: 0, seed: 31, fog: false, add: true });
    out.dust = puffs(W, 40, (rr) => [(rr() - 0.5) * 120, 6 + rr() * 24, -40 - rr() * 60], { color: '#4a3a3a', opacity: 0, seed: 32, fog: false });
  }
  out.update = (t, k = {}) => {
    for (const a of out.herd || []) { const sp = a.userData.walk ?? 0.35; a.position.x = a.userData.x0 + t * 0.35 * sp; a.position.y = h(a.position.x, a.position.z); a.userData.update(t, sp); }
    if (out.rex) { const rx = out.rex.userData.x0 - (k.rexWalk ?? 0) * 3; out.rex.position.x = rx; out.rex.userData.update(t, k.rexWalk ? 0.6 : 0.0001, k.roar || 0); }
    if (out.trike) out.trike.userData.update(t, 0.0001);
    (out.pteros || []).forEach((p, i) => { const a = t * (0.12 + i * 0.02) + i * 1.7, R = 16 + i * 5; p.position.set(Math.cos(a) * R - 4, 11 + i * 2.5 + Math.sin(t * 0.7 + i) * 0.8, -26 + Math.sin(a) * R * 0.5); p.rotation.y = -a - Math.PI / 2 * 0 + Math.PI; p.rotation.z = 0.25; p.userData.update(t); });
    (out.mammals || []).forEach((m, i) => { m.userData.update(t); const peek = k.peek ?? 1; m.scale.setScalar(1.6 * Math.max(0.001, clamp(peek * 3 - i * 0.4))); });
    (out.flies || []).forEach((f, i) => { const [a, b, c] = f.userData.seed, [x, y, z] = f.userData.base; f.position.set(x + Math.sin(t * 0.5 + a * 9) * 0.6, y + Math.sin(t * 0.8 + b * 9) * 0.3, z + Math.cos(t * 0.4 + c * 9) * 0.5); const on = 0.5 + 0.5 * Math.sin(t * 3 + a * 20); f.material.opacity = 0.8 * on; f.scale.setScalar(0.12); });
    (out.smoke || []).forEach((v, i) => { const [a, b, c] = v.userData.seed, u = ((t * (0.05 + a * 0.03) + b) % 1); v.position.set(28 + u * 14 + Math.sin(t * 0.2 + c * 6), 19 + u * 18, -60 + c * 3); v.material.opacity = 0.55 * Math.sin(u * Math.PI); v.scale.setScalar(4 + u * 10); });
    if (out.flock) out.flock.forEach((d, i) => { const [o1, o2] = d.userData.off, L = 46, u = ((t * 5.2 + o1 * 3) % L); d.position.set(-23 + u, 0, -6.5 - o2 - (i % 2) * 0.5); d.position.y = h(d.position.x, d.position.z); d.userData.update(t, 1); });
    if (out.big) out.big.userData.update(t, 0.15);
    if (out.statue) { const sk = k.statue ?? 0; out.statue.visible = sk > 0.01; out.statue.scale.setScalar(Math.max(0.001, sk)); }
    (out.snow || []).forEach((v, i) => { const [a, b, c] = v.userData.seed, [x, y0, z] = v.userData.base, y = 6 - ((t * (0.5 + a * 0.3) + b * 6) % 6); v.position.set(x + Math.sin(t * 0.6 + c * 9) * 0.5 + (t * 0.8 % 4), y, z); v.scale.setScalar(0.06 + a * 0.05); });
    if (out.ball) { const B = out.ball, u = k.ball ?? 0; const vis = u > 0.001 && u < 0.999 && !(k.hit > 0.02 && mode === 'impact'); B.ball.visible = B.halo.visible = B.trail.visible = vis;
      if (vis) { const p = B.path.getPointAt(clamp(u)), d = B.path.getTangentAt(clamp(u)); B.ball.position.copy(p); B.halo.position.copy(p); const sz = 0.6 + u * 1.2; B.ball.scale.setScalar(sz); B.halo.scale.setScalar(10 * sz + Math.sin(t * 30) * 0.6);
        B.trail.position.copy(p); B.trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate()); const L = 20 + u * 50; B.trail.scale.set(sz, L, sz); B.trail.position.add(d.clone().multiplyScalar(-0.2)); }
      const hk = k.hit ?? 0; B.dome.material.opacity = hk > 0 ? 0.55 * clamp(hk * 4) * (1 - clamp((hk - 0.5) / 0.5) * 0.5) : 0; B.dome.scale.set(8 + hk * 50, 4 + hk * 30, 8 + hk * 50);
      const em = k.embers ?? 0, a = out.embers.geometry.attributes.position.array; out.embers.visible = em > 0.01; out.embers.userData.seed.forEach(([x, s, z], i) => { const on = s < em; const y = on ? 40 - ((t * 14 + s * 300) % 40) : -500; a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x - 1.2; a[i * 6 + 4] = y + 2.8; a[i * 6 + 5] = z; }); out.embers.geometry.attributes.position.needsUpdate = true;
      out.fires.forEach((v, i) => { const [a2, b] = v.userData.seed; v.material.opacity = (k.fire ?? 0) * (0.6 + 0.3 * Math.sin(t * 8 + i)); v.scale.setScalar(3 + a2 * 4); v.position.set(v.userData.base[0], v.userData.base[1] + Math.sin(t * 2 + b * 9) * 0.3, v.userData.base[2]); });
      out.dust.forEach((v, i) => { const [a2, b] = v.userData.seed; v.material.opacity = (k.dark ?? 0) * 0.85; v.scale.setScalar(26 + a2 * 20); v.position.set(v.userData.base[0] + Math.sin(t * 0.05 + b * 9) * 4, v.userData.base[1], v.userData.base[2]); });
    }
  };
  if (night) W.sunFrom([-0.6, 0.7, -0.6], 30); else if (mode === 'impact') W.sunFrom([-0.8, 0.35, -0.4], 30); else W.sunFrom([0.4, 0.85, 0.7], 30);
  return out;
}
