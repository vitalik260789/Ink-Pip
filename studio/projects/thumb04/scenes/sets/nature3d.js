// sets/nature3d.js — episode 04 locations ("What If All the Bees Disappeared?"):
//   MEADOW (flowers, hive, buzzing bees; modes: meadow · orchard (blossoming trees, ladders) · farm (clover, cows, cotton) · cacao (rainforest edge))
//   FLOWER (macro: one giant flower + a big bee; UV view; 'comb' mode = honeycomb wall for the waggle dance)
//   MARKET (fruit stall with crates whose contents shrink; staples stay full; poster on the wall)
//   Breakfast table props for the room.
// Shared: bee(W, s) 3D cartoon bee, flowers as InstancedMesh (cheap), sprite() billboards from worlds3d.
import { THREE, box, cyl, sphere } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { rng } from '/engine/core.js';
import { sprite } from './worlds3d.js';

const P = W3.paint;
const TX = {};
const tex = (k, f) => TX[k] ||= f();

// ---------- textures ----------
const grassTex = (base = '#6aa84a', seed = 3) => W3.paintTex(1024, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < 5200; i++) { const x = r() * w, y = r() * h, l = 6 + r() * 14; g.strokeStyle = r() < 0.5 ? 'rgba(170,220,110,.35)' : 'rgba(40,90,40,.28)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y - l); g.stroke(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(60,110,50,.12)'; g.beginPath(); g.ellipse(r() * w, r() * h, 40 + r() * 80, 20 + r() * 40, r() * 3, 0, 7); g.fill(); } }, [14, 14]);
const stripeTex = () => W3.paintTex(256, 128, (g, w, h) => { g.fillStyle = '#ffc832'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e1612'; for (const x of [0.36, 0.56, 0.76]) g.fillRect(x * w, 0, w * 0.1, h); g.fillRect(0.93 * w, 0, w * 0.07, h); });
const woodTex = (base = '#b98a56', seed = 4) => W3.planksTex(base, 4, [1, 1], seed);
const awningTex = () => W3.paintTex(512, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff3e0' : '#e8504a'; g.fillRect(i * w / 8, 0, w / 8, h); } g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h * 0.85, w, h * 0.15); });
const combTex = () => W3.paintTex(1024, 1024, (g, w, h) => { g.fillStyle = '#8a5a1a'; g.fillRect(0, 0, w, h); const R = 34, dx = R * Math.sqrt(3), dy = R * 1.5; const r = rng(7);
  for (let row = -1; row < h / dy + 1; row++) for (let col = -1; col < w / dx + 1; col++) { const x = col * dx + (row % 2 ? dx / 2 : 0), y = row * dy; const full = r() < 0.55;
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(x + Math.cos(a) * (R - 3), y + Math.sin(a) * (R - 3)); } g.closePath();
    const gr = g.createRadialGradient(x - 6, y - 8, 2, x, y, R); gr.addColorStop(0, full ? '#ffd86a' : '#e6b25a'); gr.addColorStop(1, full ? '#e69a1a' : '#b07a2a'); g.fillStyle = gr; g.fill(); g.lineWidth = 5; g.strokeStyle = '#f0c870'; g.stroke(); } }, [2, 2]);
const petalTex = (uv) => W3.paintTex(512, 512, (g, w, h) => { const cx = w / 2, cy = h / 2;
  if (!uv) { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff9ac0'); gr.addColorStop(1, '#ffe0ec'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(200,80,130,.35)'; g.lineWidth = 6; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(0, cy); g.quadraticCurveTo(w * 0.5, cy + i * 40, w, cy + i * 70); g.stroke(); } }
  else { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2a1060'); gr.addColorStop(0.45, '#5a2ab0'); gr.addColorStop(1, '#c8a0ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 10; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, cy); g.lineTo(w * 0.55, cy + i * 55); g.stroke(); } } });
export const cowDraw = (g, w, h) => { g.translate(w / 2, h * 0.55); const k = w / 360; g.scale(k, k); g.lineWidth = 9; g.strokeStyle = '#1a0d12'; g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = '#f4f0ea'; for (const x of [-95, -60, 60, 95]) { g.beginPath(); g.rect(x - 12, 30, 24, 80); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(0, 0, 140, 72, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#2a2026'; for (const [x, y, a, b] of [[-50, -20, 34, 24], [40, 18, 28, 20], [90, -30, 22, 16]]) { g.beginPath(); g.ellipse(x, y, a, b, 0.4, 0, 7); g.fill(); }
  g.fillStyle = '#f4f0ea'; g.beginPath(); g.ellipse(150, -50, 52, 44, 0.2, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#ffb0b8'; g.beginPath(); g.ellipse(180, -30, 30, 22, 0.2, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#1a0d12'; g.beginPath(); g.arc(148, -62, 7, 0, 7); g.fill(); g.strokeStyle = '#1a0d12'; g.beginPath(); g.moveTo(130, -88); g.lineTo(118, -112); g.moveTo(160, -92); g.lineTo(168, -118); g.stroke();
  g.beginPath(); g.moveTo(-138, -10); g.quadraticCurveTo(-170, 20, -160, 60); g.stroke(); };
const midgeDraw = (g, w, h) => { g.translate(w / 2, h / 2); g.lineWidth = 6; g.strokeStyle = '#1a0d12'; g.fillStyle = 'rgba(220,240,255,.7)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 40, -30, 44, 18, s * 0.5, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = '#4a3a2a'; g.beginPath(); g.ellipse(0, 0, 18, 40, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -46, 14, 0, 7); g.fill(); g.stroke(); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * 12, -10 + i * 14); g.lineTo(s * 50, 10 + i * 22); g.stroke(); } };

// ---------- terrain ----------
function terrain(W, f, map, size = 90, seg = 120) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, f(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, P('#ffffff', map)); m.receiveShadow = true; W.scene.add(m); return m;
}

// ---------- bee ----------
export function bee(W, s = 1) {
  const g = new THREE.Group(), stripe = P('#ffffff', tex('stripe', stripeTex)), dark = P('#1e1612');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), stripe); body.scale.set(1.45, 0.95, 0.95); body.rotation.y = Math.PI; g.add(body);   // stripes run along x (tail = +x after flip)
  const head = sphere(0.062, dark, -0.15, 0.02, 0); g.add(head);
  for (const z of [-0.03, 0.03]) { const e = sphere(0.022, P('#ffffff'), -0.19, 0.04, z); g.add(e); const pu = sphere(0.011, dark, -0.207, 0.045, z * 1.1); g.add(pu); }
  for (const z of [-0.025, 0.025]) { const a = cyl(0.005, 0.005, 0.08, dark, -0.18, 0.09, z, 5); a.rotation.z = 0.5; g.add(a); }
  const st = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), dark); st.rotation.z = -Math.PI / 2; st.position.x = 0.165; g.add(st);
  const wm = new THREE.MeshBasicMaterial({ color: '#eaf6ff', transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const wings = [-1, 1].map(sd => { const pv = new THREE.Group(); const w = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), wm); w.scale.set(1.0, 0.55, 1); w.rotation.x = -Math.PI / 2; w.position.set(0.03, 0, sd * 0.085); w.userData.noink = true; pv.add(w); pv.position.set(-0.02, 0.07, 0); g.add(pv); pv.userData.sd = sd; return pv; });
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const l = cyl(0.006, 0.006, 0.09, dark, -0.06 + i * 0.05, -0.08, sd * 0.06, 5); l.rotation.x = sd * 0.5; g.add(l); }
  g.scale.setScalar(s); W.scene.add(g);
  g.userData.flap = (t, k = 1) => wings.forEach(pv => { pv.rotation.x = pv.userData.sd * (0.2 + Math.abs(Math.sin(t * 60)) * 0.9 * k); });
  return g;
}

// ---------- flowers (instanced) ----------
const FCOLS = ['#ff7aa8', '#ffd84a', '#ffffff', '#b07ae8', '#ff9a4a', '#6aa0ff', '#ff5a6a'];
function flowerField(W, spots, o = {}) {
  const n = spots.length, PET = 5, stemM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 1, 5), P('#5aa04a'), n); stemM.userData.noink = true;
  const petM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), P('#ffffff'), n * PET), cenM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), P('#ffb020'), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(); const heads = [];
  spots.forEach(([x, y0, z, hgt, s, ci], i) => {
    s *= o.k ?? 1.7; const y = y0 + hgt; m4.compose(v.set(x, y0 + hgt / 2, z), q.identity(), sc.set(1, hgt, 1)); stemM.setMatrixAt(i, m4);
    m4.compose(v.set(x, y, z), q.identity(), sc.set(0.035 * s, 0.03 * s, 0.035 * s)); cenM.setMatrixAt(i, m4); heads.push([x, y, z]);
    for (let k = 0; k < PET; k++) { const a = k / PET * Math.PI * 2 + i; e.set(0, a, 0.15); q.setFromEuler(e); const off = new THREE.Vector3(0.055 * s, -0.004, 0).applyQuaternion(q);
      m4.compose(v.set(x + off.x, y + off.y, z + off.z), q, sc.set(0.05 * s, 0.012 * s, 0.03 * s)); petM.setMatrixAt(i * PET + k, m4); petM.setColorAt(i * PET + k, col.set(o.colors ? o.colors[ci % o.colors.length] : FCOLS[ci % FCOLS.length])); } });
  for (const m of [stemM, petM, cenM]) { m.instanceMatrix.needsUpdate = true; m.castShadow = false; m.receiveShadow = true; W.scene.add(m); }
  petM.instanceColor.needsUpdate = true;
  return { stemM, petM, cenM, heads };
}
function tree(W, x, z, s, h, o = {}) {
  const g = new THREE.Group(); g.position.set(x, h(x, z), z);
  const bark = P(o.bark || '#7a5236'); const t = cyl(0.09 * s, 0.13 * s, 1.4 * s, bark, 0, 0.7 * s, 0, 8); g.add(t);
  for (const [a, l] of [[0.6, 0.7], [-0.7, 0.6], [2.3, 0.55]]) { const b = cyl(0.04 * s, 0.06 * s, l * s, bark, Math.sin(a) * 0.2 * s, 1.35 * s, Math.cos(a) * 0.2 * s, 6); b.rotation.set(Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7); g.add(b); }
  const leaf = P(o.leaf || '#5a9a4a', null, { flatShading: true }); const r = rng(Math.round(x * 13 + z * 7) + 50); const crowns = [];
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry((0.42 + r() * 0.25) * s, 1), leaf); c.position.set((r() - 0.5) * 1.1 * s, (1.75 + r() * 0.6) * s, (r() - 0.5) * 1.1 * s); g.add(c); crowns.push(c); }
  W.scene.add(g); return { g, crowns };
}
function blossoms(W, trees, n = 60, col = '#ffe4ee') {   // instanced blossom dots on the crowns
  const N = trees.length * n, m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), P(col), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), r = rng(77); let i = 0;
  const pts = []; for (const t of trees) { t.g.updateMatrixWorld(true); for (let k = 0; k < n; k++) { const c = t.crowns[k % t.crowns.length], R = c.geometry.parameters.radius; const d = new THREE.Vector3(r() - 0.5, r() - 0.3, r() - 0.5).normalize().multiplyScalar(R * 1.0); const wp = c.getWorldPosition(new THREE.Vector3()).add(d);
    const s = 0.035 + r() * 0.025; m4.compose(v.copy(wp), q.identity(), sc.set(s, s, s)); m.setMatrixAt(i++, m4); pts.push(wp); } }
  m.instanceMatrix.needsUpdate = true; W.scene.add(m); return { mesh: m, pts };
}
function hive(W, x, z, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); const wood = P('#f2e2b8'), roof = P('#c8643a'), leg = P('#6a4a2a');
  for (const [lx, lz] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]]) g.add(box(0.05, 0.3, 0.05, leg, lx, 0.15, lz));
  for (let i = 0; i < 3; i++) g.add(box(0.56, 0.24, 0.46, i % 2 ? P('#ffd86a') : wood, 0, 0.42 + i * 0.25, 0));
  const r = box(0.66, 0.06, 0.56, roof, 0, 1.12, 0); g.add(r); g.add(box(0.2, 0.03, 0.04, P('#2a1a10'), 0, 0.33, 0.235));
  W.scene.add(g); return g;
}

// ================= MEADOW (+ orchard, farm, cacao) =================
export function meadow3d(W, o = {}) {
  const mode = o.mode || 'meadow';
  const h = (x, z) => 0.12 * Math.sin(x * 0.3 + 1) * Math.cos(z * 0.25) + (z < -10 ? (-10 - z) * 0.12 : 0) + (mode === 'cacao' ? 0 : 0.25 * Math.sin(x * 0.08 - 0.5));
  const flat = (x, z) => h(x, z) - h(0, 0.4);   // characters stand near (0, 0.4) on y = 0
  const H = (x, z) => flat(x, z);
  terrain(W, H, tex('grass' + mode, () => grassTex(mode === 'farm' ? '#86a860' : mode === 'cacao' ? '#5a8048' : '#7aa85c', mode.length)));
  const r = rng(mode.length * 11 + 3), out = { h: H, mode, bees: [], flowers: null, trees: [], cows: [], extras: {} };
  // far hills
  for (const [x, z, s, c] of [[-30, -45, 22, '#7ab06a'], [8, -55, 26, '#6aa060'], [40, -48, 20, '#86b872'], [-60, -60, 30, '#8ab8a0']]) { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 24, 12), P(c, null, { flatShading: true })); m.scale.y = 0.35; m.position.set(x, -s * 0.12, z); W.scene.add(m); }
  // flowers
  const spots = []; const nF = mode === 'meadow' ? 520 : mode === 'farm' ? 420 : mode === 'orchard' ? 220 : 80;
  for (let i = 0; i < nF; i++) { const x = (r() - 0.5) * 22, z = 3.5 - r() * 20; if (Math.abs(x) < 1.6 && z > -0.6 && z < 2.6) continue; spots.push([x, H(x, z), z, 0.22 + r() * 0.35, 0.8 + r() * 0.6, Math.floor(r() * 7)]); }
  out.flowers = flowerField(W, spots, mode === 'farm' ? { colors: ['#b07ae8', '#d0a0ff', '#ffffff', '#ff9ad0'] } : {});
  if (mode === 'meadow') {
    out.hive = hive(W, 2.6, -1.6, H(2.6, -1.6));
    for (let i = 0; i < 4; i++) out.trees.push(tree(W, -7 + i * 4.6 + r() * 2, -9 - r() * 5, 1.3 + r() * 0.5, H));
  }
  if (mode === 'orchard') {
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) { const x = -7.5 + i * 3 + (row % 2) * 1.5, z = -1.8 - row * 3.2; if (Math.abs(x) < 1.2 && row === 0) continue; out.trees.push(tree(W, x, z, 1.25, H, { leaf: '#6aa85a' })); }
    out.bloom = blossoms(W, out.trees, 260, '#ffc4dc');
    // ladders next to two trees (for the hand pollinators)
    out.ladders = []; for (const [x, z] of [[-1.9, -1.9], [2.3, -1.9]]) { const g = new THREE.Group(); const wd = P('#c89a5a'); for (const sx of [-0.18, 0.18]) g.add(cyl(0.025, 0.025, 1.9, wd, sx, 0.95, 0, 6)); for (let k = 0; k < 6; k++) g.add(box(0.36, 0.03, 0.04, wd, 0, 0.25 + k * 0.3, 0)); g.position.set(x, H(x, z), z + 0.55); g.rotation.x = -0.18; W.scene.add(g); out.ladders.push(g); }
    // falling petals (points)
    const N = 500, pos = new Float32Array(N * 3), seed = []; for (let i = 0; i < N; i++) seed.push([(r() - 0.5) * 18, r() * 3, -r() * 10, r()]);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffe6f0', size: 6 * W.pxS, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false })); pts.userData.noink = true; W.scene.add(pts);
    out.petals = (t, amt) => { const a = pg.attributes.position.array; seed.forEach(([x, y, z, v], i) => { const on = v < amt; const yy = on ? 3.2 - ((t * (0.25 + v * 0.25) + y) % 3.2) : -40; a[i * 3] = x + Math.sin(t * 0.8 + v * 9) * 0.3; a[i * 3 + 1] = yy; a[i * 3 + 2] = z + 1; }); pg.attributes.position.needsUpdate = true; };
  }
  if (mode === 'farm') {
    out.cows = [[-3.2, -3.5, 1], [3.4, -4.6, -1], [-0.6, -6.8, 1], [5.5, -8, -1]].map(([x, z, f]) => { const s = sprite(W, 2.0, 1.25, cowDraw, { px: 360 }); s.position.set(x, H(x, z) + 0.6, z); if (f < 0) s.material.map.repeat.x = 1; s.userData.base = [x, z]; return s; });
    // cotton plants (front right) + fence
    out.cotton = []; for (const [x, z] of [[2.2, 0.9], [2.7, 0.3], [3.2, 1.0], [-2.6, 0.6]]) { const g = new THREE.Group(); g.position.set(x, H(x, z), z); const st = P('#6a5a3a'), boll = P('#fbf8f2');
      g.add(cyl(0.02, 0.03, 0.8, st, 0, 0.4, 0, 6)); for (let k = 0; k < 6; k++) { const a = k * 2.3, y = 0.35 + k * 0.08; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), boll); b.position.set(Math.cos(a) * 0.14, y, Math.sin(a) * 0.14); g.add(b); }
      for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), P('#4f8a3a')); l.scale.set(1, 0.3, 0.6); l.position.set(Math.cos(k * 1.6) * 0.1, 0.25 + k * 0.1, Math.sin(k * 1.6) * 0.1); g.add(l); } W.scene.add(g); out.cotton.push(g); }
    const fw = P('#d8b88a'); for (let i = 0; i < 12; i++) { const x = -9 + i * 1.6; W.scene.add(box(0.08, 0.8, 0.08, fw, x, H(x, -2.2) + 0.4, -2.2)); } for (const y of [0.35, 0.65]) W.scene.add(box(19, 0.06, 0.04, fw, -0.2, H(0, -2.2) + y, -2.2));
    const barn = new THREE.Group(); barn.add(box(4, 2.6, 3, P('#c8443a'), 0, 1.3, 0)); const rf = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.4, 4), P('#5a3a3a')); rf.rotation.y = Math.PI / 4; rf.position.y = 3.3; rf.scale.z = 0.75; barn.add(rf); barn.add(box(1.2, 1.6, 0.05, P('#f4e8d8'), 0, 0.8, 1.53)); barn.position.set(-7, H(-7, -12), -12); W.scene.add(barn);
  }
  if (mode === 'cacao') {
    // cacao tree with pods growing straight from the trunk + big leaves; jungle behind
    const g = new THREE.Group(); g.position.set(1.3, 0, -1.2); const bark = P('#6a4a30'); g.add(cyl(0.13, 0.17, 2.6, bark, 0, 1.3, 0, 10));
    const pods = []; for (let k = 0; k < 7; k++) { const a = k * 2.1, y = 0.55 + k * 0.22; const pm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), P(['#e8a030', '#c85a2a', '#d8c040', '#a84a2a'][k % 4], null, { flatShading: true })); pm.scale.set(0.75, 1.5, 0.75); pm.position.set(Math.cos(a) * 0.2, y, Math.sin(a) * 0.2); pm.rotation.z = Math.cos(a) * 0.3; g.add(pm); pods.push(pm); }
    const leafM = P('#3f7a3a', null, { flatShading: true, side: THREE.DoubleSide }); for (let k = 0; k < 14; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), leafM); l.scale.set(1, 0.12, 0.4); const a = k * 0.9; l.position.set(Math.cos(a) * 0.7, 2.3 + (k % 3) * 0.25, Math.sin(a) * 0.7); l.rotation.set(0.3, -a, 0.4); g.add(l); }
    W.scene.add(g); out.cacao = g; out.pods = pods;
    for (let i = 0; i < 12; i++) out.trees.push(tree(W, -9 + i * 1.7 + r(), -6 - r() * 6, 1.6 + r() * 0.8, H, { leaf: ['#2f6a3a', '#3a7a40', '#4a8a3a'][i % 3] }));
    for (let i = 0; i < 10; i++) { const x = (r() - 0.5) * 12, z = -2 - r() * 4; const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), P('#3a7a3a', null, { flatShading: true })); f.scale.set(1.3, 0.5, 1); f.position.set(x, H(x, z) + 0.2, z); W.scene.add(f); }
    out.midge = sprite(W, 0.16, 0.16, midgeDraw, { px: 128 }); out.midge.position.set(0.8, 1.0, -0.75);
  }
  if (mode === 'meadow' || mode === 'farm') for (let i = 0; i < 14; i++) out.bees.push(bee(W, 0.7));
  if (mode === 'orchard') for (let i = 0; i < 4; i++) out.bees.push(bee(W, 0.7));
  W.sunFrom([0.4, 0.85, 0.7], 30);
  return out;
}

// ================= FLOWER (macro) + honeycomb =================
export function flower3d(W, o = {}) {
  const out = { mode: o.mode || 'flower' };
  if (out.mode === 'comb') {
    const comb = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), P('#ffffff', tex('comb', combTex))); comb.position.set(0, 1.6, -0.2); W.scene.add(comb); out.comb = comb;
    // the frame of the hive around the comb
    const fr = P('#d8b070'); W.scene.add(box(8.4, 0.25, 0.3, fr, 0, 4.2, -0.1)); W.scene.add(box(8.4, 0.25, 0.3, fr, 0, -0.95, -0.1));
    out.bees = []; for (let i = 0; i < 16; i++) { const b = bee(W, 0.9); out.bees.push(b); }
    W.sunFrom([0.2, 0.6, 1], 30); return out;
  }
  // a soft meadow behind (far flowers + hills, blurred by the lens)
  const g0 = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), P('#ffffff', tex('grassF', () => grassTex('#7ab85a', 9)))); g0.rotation.x = -Math.PI / 2; g0.position.y = -1.2; W.scene.add(g0);
  const r = rng(5), spots = []; for (let i = 0; i < 160; i++) { const x = (r() - 0.5) * 30, z = -3 - r() * 20; spots.push([x, -1.2, z, 0.8 + r() * 1.4, 3 + r() * 3, Math.floor(r() * 7)]); } out.far = flowerField(W, spots);
  // the giant flower: centre at (0, 1.2, 0), facing the camera (+z) and a bit up
  const F = new THREE.Group(); F.position.set(0, 1.15, 0); F.rotation.x = 0.55; W.scene.add(F); out.F = F;
  const stem = cyl(0.06, 0.09, 3, P('#3f8a4a'), 0, -1.6, -0.1, 10); stem.rotation.x = -0.55; F.add(stem);
  const nT = tex('petal', () => petalTex(false)), uT = tex('petalUV', () => petalTex(true)); out.petalMats = [];
  for (let k = 0; k < 8; k++) { const pg = new THREE.Group(); pg.rotation.y = k / 8 * Math.PI * 2; const m = P('#ffffff', nT); out.petalMats.push(m); const pm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), m); pm.scale.set(0.62, 0.06, 0.26); pm.position.x = 0.62; pm.rotation.z = 0.12; pg.add(pm); F.add(pg); }
  out.uvTex = [nT, uT];
  const disc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12), P('#ffb020')); disc.scale.y = 0.35; disc.position.y = 0.05; F.add(disc); out.disc = disc;
  out.glow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 48), new THREE.MeshBasicMaterial({ map: tex('uvglow', () => W3.paintTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,140,1)'); gr.addColorStop(0.45, 'rgba(255,220,80,.85)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); })), color: new THREE.Color(2.2, 2.0, 1.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  out.glow.rotation.x = -Math.PI / 2; out.glow.position.y = 0.13; out.glow.userData.noink = true; F.add(out.glow);
  const stam = P('#f6e8a0'), tip = P('#ffcc20'); for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, rr2 = 0.12 + (k % 2) * 0.06; const s = cyl(0.008, 0.008, 0.18, stam, Math.cos(a) * rr2, 0.14, Math.sin(a) * rr2, 5); F.add(s); F.add(sphere(0.025, tip, Math.cos(a) * rr2, 0.24, Math.sin(a) * rr2)); }
  // pollen grains (points): sit on the stamens, jump to the bee
  const N = 220, pos = new Float32Array(N * 3), seed = []; for (let i = 0; i < N; i++) seed.push([r() * Math.PI * 2, 0.08 + r() * 0.16, r(), r()]);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffd020', size: 7 * W.pxS, sizeAttenuation: false, transparent: true, depthWrite: false })); pts.userData.noink = true; W.scene.add(pts);
  out.pollen = (beeObj, k, t) => { const a = pg.attributes.position.array, c = new THREE.Vector3(); F.updateMatrixWorld(true);
    seed.forEach(([ang, rad, u, v], i) => { const home = new THREE.Vector3(Math.cos(ang) * rad, 0.24 + v * 0.03, Math.sin(ang) * rad).applyMatrix4(F.matrixWorld); let p = home;
      if (beeObj && u < k) { const off = new THREE.Vector3(Math.cos(ang * 3) * 0.12, -0.05 + Math.sin(ang * 5) * 0.06, Math.sin(ang * 2) * 0.08).multiplyScalar(beeObj.scale.x); p = c.copy(beeObj.position).add(off); }
      a[i * 3] = p.x; a[i * 3 + 1] = p.y + (p === home ? Math.sin(t * 2 + i) * 0.004 : 0); a[i * 3 + 2] = p.z; });
    pg.attributes.position.needsUpdate = true; };
  out.bee = bee(W, 2.4);
  W.sunFrom([0.5, 0.9, 0.8], 30);
  return out;
}

// ================= MARKET =================
const CROPS = [   // name, colour, size, shape, bee-dependent
  ['apples', '#e0403a', 0.07, 'ball', true], ['blueberries', '#4a5ac8', 0.028, 'ball', true], ['cherries', '#b0182a', 0.035, 'ball', true], ['almonds', '#b07a4a', 0.04, 'egg', true],
  ['avocados', '#4a7a2a', 0.07, 'egg', true], ['pumpkins', '#f08a2a', 0.14, 'ball', true], ['melons', '#c8d860', 0.12, 'egg', true], ['bread', '#d8a058', 0.12, 'loaf', false],
  ['corn', '#f6d040', 0.05, 'cob', false], ['rice', '#f4f0e0', 0.16, 'sack', false], ['bananas', '#f6d840', 0.05, 'cob', false], ['wheat', '#e0b860', 0.16, 'sack', false],
];
export function market3d(W, o = {}) {
  const out = { crates: [] }, add = (m) => { W.scene.add(m); return m; };
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(40, 30), P('#ffffff', tex('cobble', () => W3.paintTex(1024, 1024, (g, w, h) => { g.fillStyle = '#b8a890'; g.fillRect(0, 0, w, h); const r = rng(3); for (let y = 0; y < h; y += 48) for (let x = (y / 48) % 2 * 32; x < w; x += 64) { g.fillStyle = `rgb(${150 + r() * 40},${135 + r() * 35},${115 + r() * 30})`; g.beginPath(); g.ellipse(x + 30, y + 22, 28, 20, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(80,60,40,.35)'; g.lineWidth = 3; g.stroke(); } }, [8, 6])))));
  ground.rotation.x = -Math.PI / 2; ground.position.z = -4; ground.receiveShadow = true;
  // shop facade behind
  const wall = add(box(16, 5, 0.3, P('#ffffff', W3.plasterTex('#e8d2a8', [3, 1], 8)), 0, 2.5, -4.2));
  for (const x of [-5, 5]) { add(box(2.2, 2.4, 0.05, P('#5a7a9a'), x, 2.2, -4.03)); add(box(2.4, 0.12, 0.12, P('#f2e6cf'), x, 3.45, -4.0)); }
  add(box(1.4, 2.4, 0.08, P('#7a4a2a'), 2.2, 1.2, -4.02));
  out.poster = add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshLambertMaterial({ map: tex('poster', () => W3.paintTex(768, 512, (g, w, h) => { g.fillStyle = '#f6eedc'; g.fillRect(0, 0, w, h); g.lineWidth = 10; g.strokeStyle = '#3a2a2a'; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#2a1a1a'; g.textAlign = 'center'; g.font = '800 46px Nunito'; g.fillText('"IF THE BEE DISAPPEARS,', w / 2, 120); g.fillText('MAN WOULD HAVE ONLY', w / 2, 190); g.fillText('FOUR YEARS LEFT."', w / 2, 260); g.font = 'italic 700 40px Nunito'; g.fillText('— Einstein?', w / 2, 360);
    g.fillStyle = '#ffc832'; g.beginPath(); g.ellipse(w / 2, 440, 46, 28, 0, 0, 7); g.fill(); g.fillStyle = '#1e1612'; g.fillRect(w / 2 - 8, 412, 12, 56); g.fillRect(w / 2 + 16, 416, 10, 48); })) })));
  out.poster.position.set(-2.4, 2.3, -3.99); out.poster.userData.noink = true; add(box(1.58, 1.08, 0.03, P('#3a2a2a'), -2.4, 2.3, -4.04));
  // stall: table + awning on poles
  const wood = P('#ffffff', tex('wood', () => woodTex())), dark = P('#6a4a2a');
  add(box(5.6, 0.08, 1.3, wood, 0, 0.78, -2.6)); for (const x of [-2.7, 2.7]) for (const z of [-3.15, -2.05]) add(box(0.08, 0.78, 0.08, dark, x, 0.39, z));
  add(box(5.6, 0.5, 0.06, wood, 0, 0.55, -1.96));
  for (const x of [-2.75, 2.75]) add(cyl(0.04, 0.04, 2.6, dark, x, 1.3, -1.95, 8));
  const aw = add(new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.7), P('#ffffff', tex('awning', awningTex), { side: THREE.DoubleSide }))); aw.position.set(0, 2.55, -2.6); aw.rotation.x = -1.15;
  const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshBasicMaterial({ map: tex('sign', () => W3.paintTex(512, 96, (g, w, h) => { g.fillStyle = '#2f6a4a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff3e0'; g.textAlign = 'center'; g.font = '900 60px Fredoka'; g.fillText('FRESH MARKET', w / 2, 70); })) })));
  sign.position.set(0, 3.0, -1.88); sign.userData.noink = true;
  // crates: 2 rows of 6 on the table (front row = bee crops)
  const crateM = P('#ffffff', tex('crate', () => woodTex('#c8985a', 6))); const r = rng(11);
  CROPS.forEach(([name, col, s, shape, beeDep], i) => {
    const row = i < 6 ? 0 : 1, x = -2.3 + (i % 6) * 0.92, z = row ? -3.0 : -2.25, y = 0.82 + row * 0.12;
    const cg = new THREE.Group(); cg.position.set(x, y, z); add(cg);
    cg.add(box(0.84, 0.05, 0.62, crateM, 0, 0.0, 0)); for (const [sx, sz, w, d] of [[0, -0.3, 0.84, 0.03], [0, 0.3, 0.84, 0.03], [-0.41, 0, 0.03, 0.62], [0.41, 0, 0.03, 0.62]]) cg.add(box(w, 0.22, d, crateM, sx, 0.11, sz));
    if (row) cg.rotation.x = -0.12;
    const geo = shape === 'ball' ? new THREE.SphereGeometry(1, 12, 8) : shape === 'egg' ? new THREE.SphereGeometry(1, 12, 8) : shape === 'sack' ? new THREE.SphereGeometry(1, 12, 8) : shape === 'loaf' ? new THREE.CapsuleGeometry(0.6, 1, 4, 8) : new THREE.CylinderGeometry(1, 1, 3, 8);
    const pts = []; const step = Math.max(s * 1.9, 0.04);
    if (shape === 'sack') pts.push([-0.18, 0.2, 0, 1], [0.18, 0.2, 0.02, 1]);
    else for (let ly = 0; ly < 3; ly++) for (let xx = -0.36 + s; xx <= 0.36 - s + 1e-6; xx += step) for (let zz = -0.26 + s; zz <= 0.26 - s + 1e-6; zz += step) { if (r() < 0.1 * ly) continue; pts.push([xx + (r() - 0.5) * s * 0.3, 0.05 + s + ly * s * 1.5, zz + (r() - 0.5) * s * 0.3, 1]); }
    pts.sort((a, b) => a[1] - b[1]);   // bottom first: the top empties first
    const mesh = new THREE.InstancedMesh(geo, P(col, null, { flatShading: shape !== 'ball' }), pts.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), v = new THREE.Vector3();
    pts.forEach(([px, py, pz], k) => { e.set(r() * 3, r() * 3, shape === 'cob' || shape === 'loaf' ? Math.PI / 2 : r()); q.setFromEuler(e); const kk = shape === 'egg' ? [s * 0.8, s * 1.15, s * 0.8] : shape === 'sack' ? [s * 1.1, s * 1.3, s * 1.0] : shape === 'cob' ? [s * 0.7, s * 0.6, s * 0.7] : shape === 'loaf' ? [s * 0.8, s * 0.6, s * 0.8] : [s, s, s];
      m4.compose(v.set(px, shape === 'sack' ? 0.22 : py, pz), q, sc.set(...kk)); mesh.setMatrixAt(k, m4); });
    mesh.instanceMatrix.needsUpdate = true; cg.add(mesh);
    const tag = sprite(W, 0.3, 0.115, (g, w, h) => { g.fillStyle = beeDep ? '#fff3e0' : '#e8f0ff'; g.fillRect(4, 4, w - 8, h - 8); g.strokeStyle = '#1a0d12'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#1a0d12'; g.textAlign = 'center'; g.font = '900 30px Nunito'; g.fillText(name.toUpperCase(), w / 2, h * 0.68); }, { px: 256 });
    tag.position.set(x, y + 0.13, z + 0.36); tag.material.fog = false;
    out.crates.push({ name, beeDep, mesh, n: pts.length, group: cg, tag, set(k) { mesh.count = Math.max(0, Math.round(pts.length * k)); } });
  });
  W.sunFrom([0.4, 0.9, 0.7], 30);
  return out;
}

// ================= breakfast table (room) =================
export function breakfast(W, x = 0.02, z = 0.05) {
  const g = new THREE.Group(); g.position.set(x, 0, z); W.scene.add(g);
  const wood = P('#a8703a'), dark = P('#6a4a2a');
  g.add(cyl(0.42, 0.42, 0.05, wood, 0, 0.72, 0, 32)); g.add(cyl(0.05, 0.07, 0.7, dark, 0, 0.36, 0, 10)); g.add(cyl(0.22, 0.24, 0.04, dark, 0, 0.02, 0, 20));
  g.add(cyl(0.16, 0.13, 0.02, P('#f4f0ea'), -0.05, 0.755, 0.08, 28));
  const toast = box(0.16, 0.03, 0.14, P('#d89a50'), -0.05, 0.78, 0.08); toast.rotation.y = 0.3; g.add(toast); const crust = box(0.17, 0.025, 0.15, P('#a8682a'), -0.05, 0.772, 0.08); crust.rotation.y = 0.3; g.add(crust);
  const apple = new THREE.Group(); apple.add(sphere(0.07, P('#e0403a'))); const st = cyl(0.006, 0.006, 0.04, P('#5a3a1a'), 0, 0.075, 0, 5); apple.add(st); const lf = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), P('#5a9a3a')); lf.scale.set(1, 0.3, 0.5); lf.position.set(0.02, 0.085, 0); apple.add(lf); apple.position.set(0.2, 0.815, -0.08); g.add(apple);
  const honey = new THREE.Group(); honey.add(cyl(0.055, 0.055, 0.13, new THREE.MeshLambertMaterial({ color: '#f0a020', transparent: true, opacity: 0.92 }), 0, 0, 0, 20)); honey.add(cyl(0.06, 0.06, 0.03, P('#e8d8c0'), 0, 0.075, 0, 20)); honey.add(box(0.07, 0.05, 0.005, P('#fff3e0'), 0, 0, 0.056)); honey.position.set(0.24, 0.81, 0.14); g.add(honey);
  const bowl = new THREE.Group(); bowl.add(cyl(0.08, 0.05, 0.05, P('#5a8ac8'), 0, 0, 0, 20)); const r = rng(4); for (let k = 0; k < 14; k++) bowl.add(sphere(0.017, P('#3a3ab0'), (r() - 0.5) * 0.1, 0.03 + r() * 0.015, (r() - 0.5) * 0.1)); bowl.position.set(-0.26, 0.775, -0.1); g.add(bowl);
  const mug = new THREE.Group(); mug.add(cyl(0.045, 0.04, 0.1, P('#f6ead2'), 0, 0, 0, 16)); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 12), P('#f6ead2')); hd.position.x = 0.05; mug.add(hd); mug.add(cyl(0.04, 0.04, 0.005, P('#6a3a1a'), 0, 0.045, 0, 16)); mug.position.set(0.05, 0.8, -0.2); g.add(mug);
  return { group: g, apple, honey, bowl, toast, mug };
}
