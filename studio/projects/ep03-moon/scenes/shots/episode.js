// Episode 03 sample — "What If the Moon Disappeared?" (≤ 1 min).
// Reference-matched grammar: three long continuous shots (room → fly-through the window → space → cut → room),
// camera glides with ease-in-out reframes (~0.9 s) and a constant slow push-in between them, blurred foreground props,
// lighting beats (night room, moonlit space, sideways Earth).
import { E, registerShot, ease, clamp, lerp, text, rr, alpha, FONTS } from '/engine/core.js';
import { POSES, posesAt, breathe } from '/engine/rig2d.js';
import { kText } from '/engine/motion.js';
import { THREE } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { room3d } from '../sets/room3d.js';
import { space3d } from '../sets/space3d.js';
import { planet } from '../sets/props3d.js';
import { INK, PIP, talkOf } from '../cast.js';

const GOLD = '#ffd47e', CORAL = '#ff7a4a', MINT = '#7cf2a8';
const sstep = (u) => u * u * u * (u * (u * 6 - 15) + 10);
const V3 = (a) => new THREE.Vector3(...a);

// ---------- camera: glides between framings + creeping push-in ----------
// F = [[tStart, {pos, look, fov, roll, m (move seconds), lens:[focus, cInf]}], ...]  (times are shot-local)
const CREEP = 0.04, CREEP_MAX = 0.22;
function camState(F, t) {
  let i = 0; while (i < F.length - 1 && t >= F[i + 1][0]) i++;
  const [t0, f] = F[i], m = f.m ?? 0.9;
  const prev = i ? camState(F, t0 - 1e-4) : { ...f, pos: f.pos.slice(), look: f.look.slice() };
  const u = i ? (f.ease === 'in' ? ease.in(clamp((t - t0) / m)) : sstep(clamp((t - t0) / m))) : 1;
  const L = (a, b) => a.map((v, j) => lerp(v, b[j], u));
  const st = { pos: L(prev.pos, f.pos), look: L(prev.look, f.look), fov: lerp(prev.fov, f.fov ?? prev.fov, u), roll: lerp(prev.roll || 0, f.roll ?? 0, u),
    lens: [lerp(prev.lens?.[0] ?? 3, f.lens?.[0] ?? prev.lens?.[0] ?? 3, u), lerp(prev.lens?.[1] ?? 0, f.lens?.[1] ?? prev.lens?.[1] ?? 0, u)] };
  const hold = Math.max(0, t - t0 - (i ? m : 0)), k = f.creep === false ? 0 : Math.min(CREEP_MAX, hold * CREEP);
  st.pos = st.pos.map((v, j) => st.look[j] + (v - st.look[j]) * (1 - k));
  return st;
}
function applyCam(W, s) { const c = W.camera; c.position.set(...s.pos); c.up.set(0, 1, 0); c.lookAt(...s.look); if (s.roll) c.rotateZ(s.roll * Math.PI / 180); c.fov = s.fov; c.updateProjectionMatrix(); W.lens(s.lens[0], s.lens[1]); }

// ---------- sparkle burst (flat 2D sprites over the 3D frame) ----------
function burst(g, t, t0, x, y, col = '#fff6d8', n = 14, R = 120) {
  const u = (t - t0) / 0.6; if (u < 0 || u > 1) return; g.save(); g.globalAlpha = 1 - u;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + i, r = R * ease.out(u) * (0.6 + 0.4 * ((i * 7) % 5) / 5), sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r, s = 14 * (1 - u) + 4;
    g.fillStyle = col; g.beginPath(); for (let k = 0; k < 8; k++) { const aa = k * Math.PI / 4, rr2 = k % 2 ? s * 0.35 : s; g.lineTo(sx + Math.cos(aa) * rr2, sy + Math.sin(aa) * rr2); } g.closePath(); g.fill(); }
  g.restore();
}
const toScreen = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * E.W, (1 - p.y) / 2 * E.H]; };

// ---------- ROOM ----------
const PIP_AT = [-0.75, -0.15], INK_AT = [0.7, -0.35];
const ROOM_A = [
  [0.0, { pos: [0.25, 1.32, 3.1], look: [0.35, 1.45, -1.2], fov: 38, lens: [3.6, 6] }],
  [2.35, { pos: [0.5, 1.28, 2.65], look: [0.55, 1.28, -0.6], fov: 36, lens: [3.0, 10] }],
  [3.95, { pos: [-0.25, 1.3, 2.55], look: [-0.4, 1.3, -0.4], fov: 35, lens: [2.8, 11] }],
  [5.15, { pos: [0.4, 1.36, 2.7], look: [1.0, 1.62, -2.0], fov: 36, lens: [3.2, 9] }],
  [7.5, { pos: [0.05, 1.18, 2.75], look: [0.15, 1.25, -0.6], fov: 36, lens: [3.0, 10] }],
  [9.55, { pos: [-0.22, 1.3, 2.3], look: [-0.6, 1.3, -0.2], fov: 34, lens: [2.4, 12] }],
  [11.8, { pos: [1.15, 1.32, 2.3], look: [0.72, 1.28, -0.45], fov: 34, lens: [2.6, 12] }],
  [12.55, { pos: [1.65, 1.72, -2.7], look: [1.7, 1.8, -9], fov: 40, m: 0.55, ease: 'in', lens: [8, 0], creep: false }],
];
const ROOM_C = [
  [0.0, { pos: [0.05, 1.25, 2.85], look: [0.05, 1.25, -0.6], fov: 36, lens: [3.1, 10] }],
  [1.45, { pos: [0.5, 1.3, 2.4], look: [0.7, 1.28, -0.45], fov: 34, lens: [2.6, 12] }],
  [2.65, { pos: [0.25, 1.38, 3.2], look: [0.45, 1.5, -1.4], fov: 38, lens: [3.6, 7] }],
];
function buildRoom(prm) {
  const W = W3.inkWorld({ look: 'night', fov: 38, fog: [14, 60], bloom: 0.5, exposure: prm.exposure ?? 1.6 });
  const room = room3d(W, { night: true, foreground: [-0.72, 1.6] });
  const pip = W3.card(W, PIP, { x: PIP_AT[0], z: PIP_AT[1], outline: '#241726', rimDir: [0.6, -0.8], rimColor: '#ffd2a0' });
  const ink = W3.card(W, INK, { x: INK_AT[0], z: INK_AT[1], outline: '#241726', rimDir: [0.6, -0.8], rimColor: '#ffd2a0', gain: 1.0 });
  return { stage: W, room, pip, ink };
}
// acting beats: [shot-local time, pip [expr, pose], ink [expr, pose]]
const ACT_A = [[0, ['awe', 'pointUp'], ['neutral', 'stand']], [1.8, ['shocked', 'handsOnHead'], ['neutral', 'stand']], [2.4, ['worried', 'stand'], ['smirk', 'explain']],
  [4.0, ['surprised', 'point'], ['neutral', 'crossArms']], [5.2, ['awe', 'stand'], ['smirk', 'explain']], [7.4, ['happy', 'stand'], ['smile', 'explain']],
  [9.6, ['joy', 'cheer'], ['smirk', 'crossArms']], [11.8, ['surprised', 'stand'], ['neutral', 'explain']]];
const ACT_C = [[0, ['thinking', 'think'], ['smirk', 'crossArms']], [1.5, ['surprised', 'stand'], ['smirk', 'explain']], [2.7, ['joy', 'cheer'], ['smile', 'relaxed']]];
const actAt = (A, t) => { let a = A[0]; for (const x of A) if (t >= x[0] - 0.08) a = x; return a; };
function poseOf(spec, t, speaking) { const p = spec?.[1] ?? 'stand'; let pose = POSES[p] || POSES.stand; if (speaking && (p === 'stand' || p === 'relaxed')) pose = posesAt(t, [[0, POSES.stand], [0.3, POSES.talk]]); return pose; }
function roomDraw(s, t, info) {
  const g = info.globalT, A = info.part === 'end' ? ROOM_C : ROOM_A, ACT = info.part === 'end' ? ACT_C : ACT_A;
  applyCam(s.stage, camState(A, t));
  // the Moon: present, vanishes on "vanished" (part A, t≈1.7); comes back on "seatbelt" (part C)
  const mo = info.part === 'end' ? ease.outBack(clamp((t - 1.75) / 0.35)) : 1 - ease.in(clamp((t - 1.55) / 0.25));
  s.room.sunDisc.scale.setScalar(Math.max(0.001, mo)); s.room.sunDisc.visible = mo > 0.01;
  const pt = talkOf('PIP', g), it = talkOf('INK', g), [, pa, ia] = actAt(ACT, t);
  s.pip.set({ pose: breathe(poseOf(pa, t, pt > 0), t), expr: pa[0], talk: pt, facing: 1, blink: W3.blinkAt(g, 1) });
  s.ink.set({ pose: breathe(poseOf(ia, t, it > 0), t, 1, 3), expr: ia[0], talk: it, facing: -1, blink: W3.blinkAt(g, 2) });
  const hop = ACT === ACT_A && t > 9.6 ? Math.max(0, Math.sin(clamp((t - 9.65) / 0.45) * Math.PI)) * 0.12 : ACT === ACT_C && t > 2.7 ? Math.max(0, Math.sin(clamp((t - 2.75) / 0.45) * Math.PI)) * 0.12 : 0;
  s.pip.group.position.y = hop; s.pip.blob.material.opacity = 0.75 * clamp(1 - hop * 2.2);
  s.moonScreen = toScreen(s.room.sunDisc.position, s.stage.camera);
}
function roomOverlay(g, t, info, s) {
  const [mx, my] = s.moonScreen || [0, 0];
  if (info.part !== 'end') { burst(g, t, 1.6, mx, my, '#fff6d8', 16, 150); if (t > 5.4 && t < 9.4) kText(g, t - 5.4, 'MORE STARS', E.W * 0.78, 200, { start: 0.2, mode: 'drop', size: 70, color: GOLD, glow: 22 }); }
  else { burst(g, t, 1.8, mx, my, '#fff6d8', 16, 150); if (t > 1.9) kText(g, t - 1.9, 'THE SEATBELT', E.W * 0.75, 190, { start: 0.1, mode: 'slam', size: 76, color: MINT, glow: 24 }); }
}

// ---------- SPACE (tides → tilt → sideways Earth) ----------
const SP = [
  [0.0, { pos: [1.4, 1.1, 15], look: [1.4, 0.2, 0], fov: 36, lens: [15, 0], creep: false }],
  [0.05, { pos: [1.5, 0.6, 8.8], look: [1.5, 0.1, 0], fov: 35, m: 1.3, lens: [8.8, 0] }],
  [3.1, { pos: [0.7, 0.95, 7.8], look: [0.7, 0.0, 0], fov: 35, lens: [7.8, 0] }],
  [6.8, { pos: [0.1, 0.7, 7.3], look: [0.0, 0.0, 0], fov: 35, lens: [7.3, 0] }],
  [10.5, { pos: [-0.6, 0.35, 6.3], look: [-0.2, 0.25, 0], fov: 34, roll: 3, lens: [6.3, 0] }],
  [15.5, { pos: [0.6, 0.3, 7.6], look: [0.6, 0.0, 0], fov: 35, roll: 0, lens: [7.6, 0] }],
  [19.0, { pos: [0.3, 0.5, 7.1], look: [0.1, 0.0, 0], fov: 35, lens: [7.1, 0] }],
  [22.85, { pos: [0.0, 0.8, 8.0], look: [0.0, 0.1, 0], fov: 35, lens: [8.0, 0] }],
  [26.0, { pos: [0.3, 0.2, 7.2], look: [0.1, 0.0, 0], fov: 35, lens: [7.2, 0] }],
  [29.55, { pos: [0.0, 0.0, 6.6], look: [0.0, 0.0, 0], fov: 34, roll: -7, lens: [6.6, 0] }],
  [31.75, { pos: [-3.4, 1.1, 6.9], look: [0.0, 0.0, 0], fov: 35, roll: 0, m: 1.1, lens: [7.6, 0] }],
];
const T_SP = 13.0;   // global start of the space shot (moon/tide/tilt beats below are global times)
function buildSpace() {
  const W = W3.inkWorld({ look: 'space', fov: 35, bloom: 0.7, exposure: 1.7, sky: ['#1c1f44', '#45426e'], lookOverride: { hemiI: 0.8, keyI: 3.0, hemiSky: '#6a74c8' } });
  const sp = space3d(W);
  const moon = planet(W, 'moon', 0.62); moon.position.set(4.9, 0.35, -1.4);
  moon.traverse(m => { if (m.material) { m.material.transparent = true; } });
  // tidal water shell: points at the Moon (or the Sun), does not spin with the Earth
  const water = new THREE.Mesh(new THREE.SphereGeometry(2.0, 96, 64), new THREE.MeshLambertMaterial({ color: '#5ab4f0', transparent: true, opacity: 0.4, depthWrite: false }));
  water.userData.noink = true; W.scene.add(water);
  // axis of spin through the poles (in the tilt group) + a fixed upright reference
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 6.2, 12), W3.glow('#ffd47e', 1.6)); axis.userData.noink = true; sp.tilt.add(axis);
  return { stage: W, sp, moon, water, axis };
}
const tiltAt = (g) => g < 35.9 ? 23.4 + Math.sin(g * 2.1) * 0.6 : lerp(23.4, 85, ease.inOut(clamp((g - 36.4) / 6.0)));
const moonAt = (g) => (g < 19.9 ? 1 : g < 20.4 ? 1 - ease.in(clamp((g - 19.9) / 0.5)) : g < 28.6 ? 0 : g < 35.9 ? 0.55 * ease.out(clamp((g - 28.6) / 0.5)) : 0.55 * (1 - ease.in(clamp((g - 35.9) / 0.5))));
function spaceDraw(s, t, info) {
  const g = info.globalT;
  applyCam(s.stage, camState(SP, t));
  if (g > 42.6 && g < 43.0) W3.kick(s.stage, g, 42.65, 0.03);
  const tilt = tiltAt(g), wob = g > 35.9 ? Math.sin((g - 35.9) * 1.6) * 0.25 * clamp((g - 35.9) / 2) : 0;
  s.sp.tilt.rotation.set(wob * 0.6, 0, tilt * Math.PI / 180);
  s.sp.setSpin(g * 0.9 + 2.2);
  const m = moonAt(g); s.moon.visible = m > 0.01; s.moon.scale.setScalar(Math.max(0.001, g < 21 ? lerp(0.2, 1, m) : 1)); s.moon.traverse(x => { if (x.material) x.material.opacity = g < 21 ? 1 : m / 0.55 * 0.6; });
  s.moon.rotation.y = g * 0.05;
  // tides: strong bulge toward the Moon, then a weaker (46 %) one toward the Sun once the Moon is gone
  const tideMoon = g < 19.9 ? clamp((g - 14.0) / 1.2) : 1 - clamp((g - 19.9) / 0.9), tideSun = g < 20.2 ? 0 : clamp((g - 20.2) / 1.4) * 0.46;
  const k = Math.max(0.001, tideMoon * 0.22 + tideSun * 0.22), dir = tideMoon > tideSun ? s.moon.position.clone().normalize() : new THREE.Vector3(-50, 14, 38).normalize();
  s.water.visible = g < 29 && k > 0.004; s.water.scale.set(1.005 + k, 1.005, 1.005); s.water.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  s.axis.visible = g > 28.6;
}
function spaceOverlay(g, t, info, s) {
  const G = info.globalT, cam = s.stage.camera;
  if (G > 14.2 && G < 19.8) kText(g, G - 14.2, 'TWO TIDE BULGES', E.W * 0.5, 160, { start: 0.1, mode: 'drop', size: 66, color: GOLD, glow: 22 });
  if (G > 20.5 && G < 23.2) kText(g, G - 20.5, 'SUN TIDES: LESS THAN HALF', E.W * 0.5, 160, { start: 0.1, mode: 'slam', size: 62, color: CORAL, glow: 22 });
  if (G > 23.3 && G < 27.0) crab(g, G - 23.3, E.W * 0.8, E.H * 0.6);
  if (G > 28.9 && G < 44.8) { const d = tiltAt(G); kText(g, G - 28.9, `TILT ${d.toFixed(d < 30 ? 1 : 0)}°`, E.W * 0.8, 190, { start: 0.05, mode: 'drop', size: 70, color: d > 40 ? CORAL : GOLD, glow: 22 }); }
  if (G > 31.0 && G < 35.8) kText(g, G - 31.0, 'SEASONS', E.W * 0.2, 190, { start: 0.1, mode: 'drop', size: 60, color: MINT, glow: 20 });
  if (G > 44.9) { kText(g, G - 44.9, '6 MONTHS DAY', E.W * 0.2, 170, { start: 0.1, mode: 'drop', size: 56, color: GOLD, glow: 20 }); kText(g, G - 45.6, '6 MONTHS NIGHT', E.W * 0.8, 170, { start: 0.1, mode: 'drop', size: 56, color: '#9fb6ff', glow: 20 }); }
  if (G > 19.85 && G < 20.6) { const p = toScreen(s.moon.position, cam); burst(g, G, 19.95, p[0], p[1], '#fff6d8', 16, 140); }
  if (G > 35.85 && G < 36.6) { const p = toScreen(s.moon.position, cam); burst(g, G, 35.95, p[0], p[1], '#fff6d8', 12, 110); }
}
// a nervous little crab (flat 2D sprite), 0.9 s pop-in, then side-steps
function crab(g, t, x, y) {
  const s = ease.outBack(clamp(t / 0.35)) * 1.0, dx = Math.sin(t * 9) * 18; if (s <= 0) return;
  g.save(); g.translate(x + dx, y); g.scale(s, s); g.lineWidth = 7; g.strokeStyle = '#1a0d12'; g.fillStyle = '#ff6a4a';
  for (const k of [-1, 1]) { for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(k * 50, 10 + i * 14); g.lineTo(k * 95, 30 + i * 18 + Math.sin(t * 18 + i) * 5); g.stroke(); }
    g.beginPath(); g.moveTo(k * 45, -20); g.lineTo(k * 85, -60); g.stroke(); g.beginPath(); g.ellipse(k * 95, -75, 26, 20, k * 0.5, 0, 7); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(0, 10, 70, 48, 0, 0, 7); g.fill(); g.stroke();
  for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * 18, -30); g.lineTo(k * 22, -62); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(k * 22, -70, 13, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#1a0d12'; g.beginPath(); g.arc(k * 24, -68, 5, 0, 7); g.fill(); g.fillStyle = '#ff6a4a'; }
  g.beginPath(); g.arc(0, 18, 16, 3.5, 5.9, false); g.stroke(); // worried mouth
  g.restore();
}

for (const shot of E.shots) {
  const p = shot.params || {};
  if (shot.kind === 'room') registerShot(shot.id, { kind: '3d', init: () => buildRoom(p), draw: (s, t, info) => roomDraw(s, t, info), overlay: (g, t, info, s) => roomOverlay(g, t, info, s) });
  if (shot.kind === 'space') registerShot(shot.id, { kind: '3d', init: () => buildSpace(p), draw: (s, t, info) => spaceDraw(s, t, info), overlay: (g, t, info, s) => spaceOverlay(g, t, info, s) });
}
