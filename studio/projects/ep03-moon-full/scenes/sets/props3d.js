// sets/props3d.js — episode 02 3D props: the Spin Dial (room), planets (Jupiter, Saturn, Haumea, dumbbell world),
// Moon, space station, geostationary satellites, hurricane layer, equator debris, polar safe-zone ring.
import { THREE, box, cyl, sphere } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { rng } from '/engine/core.js';

const P = W3.paint;
// ---------- Spin Dial (on a pedestal between Ink and Pip) ----------
export const DIAL_VALUES = [24, 22, 12, 10, 4, 1.4, 1];
export const dayLabel = (v) => (v === 1.4 ? '1 h 24 m' : `${v} h`);
const angOf = (v) => { const i = DIAL_VALUES.indexOf(v); const k = i < 0 ? 0 : i / (DIAL_VALUES.length - 1); return (0.75 - k * 1.5) * Math.PI * 0.85; };
let dialTex = null;
const faceTex = () => dialTex ||= W3.paintTex(1024, 1024, (g, w, h) => {
  const c = w / 2; const gr = g.createRadialGradient(c, c, 40, c, c, c); gr.addColorStop(0, '#fff6e2'); gr.addColorStop(1, '#e8d3a8'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, c - 6, 0, 7); g.fill();
  g.lineWidth = 16; g.strokeStyle = '#5a3a1a'; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  DIAL_VALUES.forEach((v) => { const a = -angOf(v) - Math.PI / 2; const x = c + Math.cos(a) * c * 0.7, y = c + Math.sin(a) * c * 0.7;
    g.strokeStyle = '#3a2410'; g.lineWidth = 10; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.84, c + Math.sin(a) * c * 0.84); g.lineTo(c + Math.cos(a) * c * 0.93, c + Math.sin(a) * c * 0.93); g.stroke();
    g.fillStyle = v === 1 ? '#c0352a' : '#2a1a0c'; g.font = `700 ${v === 1.4 ? 58 : 84}px Fredoka, sans-serif`; g.fillText(v === 1.4 ? '1:24' : String(v), x, y); });
  g.fillStyle = '#2a1a0c'; g.font = '700 64px Fredoka, sans-serif'; g.fillText('HOURS', c, c + c * 0.42);
  g.fillStyle = '#c0352a'; g.font = '700 54px Fredoka, sans-serif'; g.fillText('SPIN DIAL', c, c - c * 0.36);
});
export function spinDial(W, x = 0.0, z = -1.25) {
  const brass = P('#d8a84a'), dark = P('#5a3a2a');
  const g = new THREE.Group(); g.position.set(x, 0, z); W.scene.add(g);
  g.add(cyl(0.16, 0.22, 0.85, dark, 0, 0.425, 0)); g.add(cyl(0.3, 0.3, 0.05, P('#8a5a3a'), 0, 0.875, 0));
  const head = new THREE.Group(); head.position.set(0, 1.08, 0); head.rotation.x = -0.35; g.add(head);
  head.add(cyl(0.3, 0.32, 0.12, brass, 0, 0, 0).rotateX(Math.PI / 2));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.27, 64), P('#ffffff', faceTex())); face.position.z = 0.065; head.add(face);
  const ptr = new THREE.Group(); ptr.position.z = 0.08; head.add(ptr);
  const needle = box(0.035, 0.2, 0.02, P('#c0352a'), 0, 0.1, 0); ptr.add(needle); ptr.add(cyl(0.045, 0.045, 0.04, brass, 0, 0, 0).rotateX(Math.PI / 2));
  const lamp = new THREE.PointLight('#ffd59a', 0.0, 1.2, 2); lamp.position.set(0, 0.1, 0.25); head.add(lamp);
  return { group: g, head, setValue(v) { ptr.rotation.z = angOf(v); }, setAngle(a) { ptr.rotation.z = a; }, angOf, lamp };
}

// ---------- space bodies ----------
let TX = null;
const tex = () => TX ||= {
  jupiter: W3.paintTex(2048, 1024, (g, w, h) => {
    const bands = ['#e8d8bc', '#c8955f', '#f2e6cc', '#b8733f', '#ead6b0', '#a86a3c', '#f0e2c4', '#c48a58', '#e2cfa8', '#b07848', '#ecdcbc'];
    const r = rng(9); let y = 0; bands.forEach((c, i) => { const bh = h / bands.length * (0.7 + r() * 0.6); g.fillStyle = c; g.fillRect(0, y, w, bh + 2); y += bh; });
    g.globalAlpha = 0.35; for (let i = 0; i < 160; i++) { g.strokeStyle = r() < 0.5 ? '#fff6e6' : '#8a5a34'; g.lineWidth = 2 + r() * 5; const yy = r() * h, x = r() * w; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + 60, yy - 10, x + 140, yy + 10, x + 220, yy); g.stroke(); } g.globalAlpha = 1;
    g.fillStyle = '#c0553a'; g.beginPath(); g.ellipse(w * 0.62, h * 0.66, 90, 52, 0, 0, 7); g.fill(); g.strokeStyle = '#7a2e1e'; g.lineWidth = 8; g.stroke();
  }),
  saturn: W3.paintTex(1024, 512, (g, w, h) => { const c = ['#f2e2b8', '#e2c88e', '#f6eacc', '#d8b878', '#efdcae', '#cfae72']; c.forEach((x, i) => { g.fillStyle = x; g.fillRect(0, i * h / c.length, w, h / c.length + 2); }); }),
  ring: W3.paintTex(1024, 64, (g, w, h) => { for (let x = 0; x < w; x++) { const u = x / w, a = u < 0.08 ? 0 : (0.55 + 0.4 * Math.sin(u * 40) * Math.sin(u * 7)) * (u > 0.58 && u < 0.64 ? 0.15 : 1); g.fillStyle = `rgba(${226 - u * 40},${200 - u * 50},${150 - u * 50},${Math.max(0, a)})`; g.fillRect(x, 0, 1, h); } }),
  haumea: W3.paintTex(1024, 512, (g, w, h) => { g.fillStyle = '#e8eef6'; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(150,170,200,${0.15 + r() * 0.25})`; g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 30, 0, 7); g.fill(); } g.fillStyle = '#9a3a3a'; g.beginPath(); g.ellipse(w * 0.3, h * 0.55, 70, 45, 0, 0, 7); g.fill(); }),
  moon: W3.paintTex(1024, 512, (g, w, h) => { g.fillStyle = '#c9c4bc'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 140; i++) { const x = r() * w, y = r() * h, rr = 4 + r() * 28; g.fillStyle = 'rgba(90,86,80,.35)'; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); g.strokeStyle = 'rgba(240,236,228,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(x - 1, y - 1, rr, 3.4, 5.6); g.stroke(); } g.fillStyle = 'rgba(70,66,62,.45)'; for (const [x, y, a, b] of [[300, 200, 120, 70], [520, 260, 90, 60], [700, 180, 80, 50]]) { g.beginPath(); g.ellipse(x, y, a, b, 0.3, 0, 7); g.fill(); } }),
  storm: W3.paintTex(1024, 512, (g, w, h) => { const r = rng(12); for (let n = 0; n < 9; n++) { const cx = r() * w, cy = h * (0.25 + r() * 0.5), R = 30 + r() * 30, dir = cy < h / 2 ? 1 : -1; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 6; for (let k = 0; k < 3; k++) { g.beginPath(); for (let i = 0; i < 60; i++) { const a = dir * i * 0.16 + k * 2.1, rr = 4 + i * R / 60; g.lineTo(cx + Math.cos(a) * rr * 1.6, cy + Math.sin(a) * rr); } g.stroke(); } g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill(); } }),
};
export function planet(W, kind, R = 2) {
  const T = tex(), grp = new THREE.Group(); W.scene.add(grp);
  if (kind === 'jupiter') { const m = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), P('#ffffff', T.jupiter)); m.scale.y = 0.935; m.castShadow = m.receiveShadow = true; grp.add(m); grp.userData.body = m; }
  if (kind === 'saturn') { const m = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), P('#ffffff', T.saturn)); m.scale.y = 0.902; grp.add(m);
    const rg = new THREE.RingGeometry(R * 1.25, R * 2.3, 128, 1); const pos = rg.attributes.position, uv = rg.attributes.uv; for (let i = 0; i < pos.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - R * 1.25) / (R * 1.05), 0.5); }
    const ring = new THREE.Mesh(rg, new THREE.MeshLambertMaterial({ map: T.ring, transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.userData.noink = true; grp.add(ring); grp.rotation.z = 0.45; grp.rotation.x = 0.25; grp.userData.body = m; }
  if (kind === 'haumea') { const m = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), P('#ffffff', T.haumea)); m.scale.set(1, 0.5, 0.76); grp.add(m); grp.userData.body = m; }
  if (kind === 'moon') { const m = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), P('#ffffff', T.moon)); grp.add(m); grp.userData.body = m; }
  if (kind === 'dumbbell') { const mat = P('#ffffff', T.haumea); const a = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 64, 48), mat), b = a.clone(); const neck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), mat); neck.rotation.z = Math.PI / 2; grp.add(a, b, neck);
    grp.userData.split = (k) => { const d = R * (0.55 + 1.4 * k); a.position.x = -d; b.position.x = d; const nr = R * 0.5 * Math.max(0, 1 - k * 1.6); neck.visible = nr > 0.02; neck.scale.set(nr, d * 2, nr); a.scale.setScalar(1 + 0.15 * (1 - k)); b.scale.copy(a.scale); }; grp.userData.split(0); }
  return grp;
}
export const stormLayer = (parent) => { const s = new THREE.Mesh(new THREE.SphereGeometry(2.06, 64, 48), new THREE.MeshLambertMaterial({ map: tex().storm, transparent: true, depthWrite: false })); s.userData.noink = true; parent.add(s); return s; };
export function station(W) { const g = new THREE.Group(); const m = P('#e8e4dc'), pan = P('#2f4f8a'); g.add(box(0.36, 0.06, 0.06, m)); g.add(box(0.06, 0.04, 0.3, m)); for (const x of [-0.24, 0.24]) g.add(box(0.12, 0.01, 0.34, pan, x, 0, 0)); W.scene.add(g); return g; }
export function satellites(W, n = 6) { const r = rng(7), out = []; for (let i = 0; i < n; i++) { const g = new THREE.Group(); g.add(box(0.12, 0.12, 0.12, P('#e2c060'))); g.add(box(0.36, 0.01, 0.09, P('#2f4f8a'))); g.userData.a0 = i / n * Math.PI * 2 + r() * 0.3; W.scene.add(g); out.push(g); } return out; }
export function debris(W, n = 70) { const r = rng(4), out = []; const m = P('#6a5040'); for (let i = 0; i < n; i++) { const b = box(0.05 + r() * 0.1, 0.05 + r() * 0.08, 0.05 + r() * 0.1, i % 3 ? m : P('#3c8fd0')); b.userData = { a: r() * Math.PI * 2, y: (r() - 0.5) * 0.25, v: 0.6 + r() * 1.4, s: r() * 3 }; W.scene.add(b); out.push(b); } return out; }
export function poleRing(W) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 12, 48), W3.glow('#7cf2a8', 1.8)); t.userData.noink = true; W.scene.add(t); return t; }
