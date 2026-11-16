// Episode 02 — every shot is registered from story/shots.json by its "kind" + params (room / dial / earth / planet / board).
import { E, V, registerShot, ease, clamp, lerp, prog, text, rr, circle, seg, linGrad, alpha, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe } from '/engine/rig2d.js';
import { camPath, kText } from '/engine/motion.js';
import { THREE } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { room3d } from '../sets/room3d.js';
import { space3d } from '../sets/space3d.js';
import { spinDial, dayLabel, planet, stormLayer, station, satellites, debris, poleRing } from '../sets/props3d.js';
import { INK, PIP, talkOf } from '../cast.js';

const pv = (v, t, dur, d = 0) => (Array.isArray(v) ? lerp(v[0], v[1], ease.inOut(clamp(t / Math.max(0.01, dur)))) : (v ?? d));
const rnd = (i, k) => { const x = Math.sin(i * 91.7 + k * 13.3) * 43758.5; return x - Math.floor(x); };
const GOLD = '#ffd47e', BLUE = '#8fb8e8', CORAL = '#ff7a4a', NAVY = '#0d1630', CREAM = '#fff1dc';
const num = (v) => Math.round(v).toLocaleString('en-US');

// ---------- shared 2D overlays ----------
function dayBadge(g, day) {
  if (day == null) return; const s = 'DAY = ' + dayLabel(day);
  const by = E.vertical ? 300 : 96, bx = E.vertical ? (E.W - (40 + s.length * 21)) / 2 : 40; g.save(); rr(g, bx, by, 40 + s.length * 21, 66, 18); g.fillStyle = 'rgba(12,16,34,.72)'; g.fill(); g.lineWidth = 3; g.strokeStyle = alpha(GOLD, 0.8); g.stroke();
  text(g, s, bx + 22, by + 34, { size: 36, color: GOLD, align: 'left', font: FONTS.ui, weight: 900 }); g.restore();
}
const label = (g, t, s, o = {}) => s && kText(g, t, s, E.vertical ? E.W / 2 : (o.x ?? E.W * 0.74), E.vertical ? 420 : (o.y ?? 190), { start: o.start ?? 0.35, mode: 'slam', size: o.size ?? 78, color: o.color ?? GOLD, glow: 24 });
const toScreen = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * E.W, (1 - p.y) / 2 * E.H]; };

// ---------- ROOM ----------
const PIP_AT = [-0.75, -0.15], INK_AT = [0.7, -0.35];
const RC = {
  wide:   { a: [0.3, 1.5, 3.9], b: [0.15, 1.45, 3.45], look: [0.1, 1.12, -1.0], fov: 40, lens: [4.0, 5] },
  two:    { a: [-0.05, 1.22, 2.95], b: [-0.03, 1.21, 2.72], look: [0, 1.05, -0.3], fov: 36, lens: [3.1, 11] },
  pip:    { a: [0.05, 1.3, 1.75], b: [-0.02, 1.31, 1.58], look: [-0.75, 1.3, -0.15], fov: 32, lens: [2.05, 13] },
  pipMed: { a: [-0.35, 1.25, 2.3], b: [-0.38, 1.3, 2.12], look: [-0.75, 1.2, -0.15], fov: 34, lens: [2.5, 10] },
  ink:    { a: [1.6, 1.32, 1.45], b: [1.45, 1.31, 1.25], look: [0.55, 1.25, -0.4], fov: 30, lens: [1.95, 14] },
};
function buildRoom(prm) {
  const W = W3.inkWorld({ look: 'golden', fov: 38, fog: [12, 60], bloom: 0.45 });
  const room = room3d(W); const dial = spinDial(W); dial.setValue(prm.dialValue ?? prm.day ?? 24);
  const pip = W3.card(W, PIP, { x: PIP_AT[0], z: PIP_AT[1], outline: '#241726', rimDir: [0.6, -0.8] });
  const ink = W3.card(W, INK, { x: INK_AT[0], z: INK_AT[1], outline: '#241726', rimDir: [0.6, -0.8], gain: 1.0 });
  return { stage: W, room, dial, pip, ink };
}
function dayCycle(s, phase) {
  const W = s.stage, a = phase * Math.PI * 2, el = Math.sin(a), day = clamp(el * 2.2 + 0.25);
  W.sunFrom([Math.cos(a) * 0.9, Math.max(0.08, el * 0.75), -1]); W.sun.intensity = W.L.keyI * day;
  W.hemi.intensity = lerp(0.55, W.L.hemiI, day); W.hemi.color.set(day > 0.5 ? W.L.hemiSky : '#4a56a8');
  const o = lerp(0.18, 0.92, day); s.room.out.material.color.setRGB(o * (0.75 + 0.25 * day), o * (0.8 + 0.1 * day), o + (1 - day) * 0.25);
  s.room.sunDisc.visible = el > -0.05; s.room.sunDisc.position.set(1.4 - Math.cos(a) * 3.2, 0.6 + el * 2.4, -8.9);
  s.room.lamp.intensity = lerp(4.5, 2.2, day); for (const sh of s.room.shafts) sh.material.opacity = 0.07 * day;
}
function poseOf(spec, t, speaking) { const p = spec?.[1] ?? 'stand'; let pose = POSES[p] || POSES.stand; if (speaking && (p === 'stand' || p === 'relaxed')) pose = posesAt(t, [[0, POSES.stand], [0.3, POSES.talk]]); return pose; }
function roomDraw(s, t, info) {
  const prm = info, g = info.globalT, i = info.shot._i || 0, C = RC[prm.cam] || RC.two, dur = info.dur;
  const fl = pv(prm.float, t, dur, 0), j = (rnd(i, 1) - 0.5) * 0.18, jr = (rnd(i, 2) - 0.5) * 3;
  const up = (prm.cam === 'pip' || prm.cam === 'pipMed') ? fl * 0.8 : 0;
  const L = (p) => [p[0], p[1] + up, p[2]];
  W3.camKeys(s.stage, t, [[0, { pos: [C.a[0] + j, C.a[1] + up, C.a[2]], look: L(C.look), fov: C.fov, roll: jr }], [dur, { pos: [C.b[0] + j, C.b[1] + up, C.b[2]], look: L(C.look), fov: C.fov, roll: jr * 1.4 }]]);
  s.stage.lens(C.lens[0], C.lens[1]);
  if (prm.light === 'cycle') dayCycle(s, 0.08 + t / (prm.cycle || 3));
  const pt = talkOf('PIP', g), it = talkOf('INK', g);
  s.pip.set({ pose: breathe(poseOf(prm.pip, t, pt > 0), t), expr: prm.pip?.[0] ?? (pt ? 'smile' : 'neutral'), talk: pt, facing: 1, blink: W3.blinkAt(g, 1), look: fl > 0.2 ? [0, 0.5] : null });
  s.ink.set({ pose: breathe(poseOf(prm.ink, t, it > 0), t, 1, 3), expr: prm.ink?.[0] ?? (it ? 'smirk' : 'neutral'), talk: it, facing: prm.cam === 'ink' ? 1 : -1, blink: W3.blinkAt(g, 2) });
  let h = fl; if (prm.hop) h += Math.max(0, Math.sin(clamp((t - 0.15) / 0.5) * Math.PI)) * 0.12;
  s.pip.group.position.y = h; s.pip.blob.position.y = 0.012 - h; s.pip.blob.material.opacity = 0.75 * clamp(1 - h * 2.2);
  if (prm.cam === 'pipMed' || fl > 0.2) s.pip.mesh.rotation.z = Math.sin(g * 1.3) * 0.08 * clamp(fl * 3);
}

// ---------- DIAL close-up ----------
function dialDraw(s, t, info) {
  const prm = info, dur = info.dur;
  W3.camKeys(s.stage, t, [[0, { pos: [0.1, 1.36, 0.35], look: [0.33, 1.02, -1.25], fov: 30, roll: -3 }], [dur, { pos: [0.06, 1.34, 0.18], look: [0.33, 1.02, -1.25], fov: 30, roll: -1.5 }]]);
  W3.kick(s.stage, t, 0.5, 0.02);
  s.stage.lens(1.65, 12);
  const a0 = s.dial.angOf(prm.from), a1 = s.dial.angOf(prm.to), k = ease.outBack(clamp((t - 0.45) / 0.35));
  s.dial.setAngle(lerp(a0, a1, k)); s.dial.lamp.intensity = prm.from !== prm.to ? 0.35 * Math.max(0, 1 - Math.abs(t - 0.6) * 3) : 0;
  const g = info.globalT; s.pip.set({ pose: POSES.stand, expr: 'neutral', facing: 1, blink: W3.blinkAt(g, 1) }); s.ink.set({ pose: POSES.stand, expr: 'smirk', facing: -1, blink: W3.blinkAt(g, 2) });
}
function dialOverlay(g, t, info) { const vx = E.vertical ? E.W / 2 : null; if (info.from !== info.to) kText(g, t, dayLabel(info.to), vx ?? E.W * 0.8, E.vertical ? 420 : E.H * 0.42, { start: 0.55, mode: 'slam', size: 150, color: GOLD, glow: 30 }); else kText(g, t, 'SPIN DIAL', vx ?? E.W * 0.78, E.vertical ? 420 : E.H * 0.3, { start: 0.4, mode: 'drop', size: 110, color: GOLD, glow: 26 }); }

// ---------- EARTH ----------
const EC = {
  hook:    { a: [1.2, 1.0, 9.0], b: [0.9, 0.9, 8.1], look: [0, 0, 0], fov: 35, r: [-4, -5] },
  close:   { a: [0.4, 0.6, 7.6], b: [0.3, 0.5, 6.8], look: [0, 0, 0], fov: 35, r: [0, -2] },
  wide:    { a: [-2.5, 1.6, 11], b: [-1.6, 1.2, 9.4], look: [0, 0, 0], fov: 35, r: [3, 5] },
  equator: { a: [0.6, 0.3, 4.7], b: [0.5, 0.25, 4.25], look: [0, 0, 0], fov: 35, r: [2, 3] },
  pole:    { a: [0.8, 7.6, 3.4], b: [0.6, 7.0, 2.8], look: [0, 0.4, 0], fov: 38, r: [0, 2] },
  moon:    { a: [-3.5, 1.4, 11], b: [-3.0, 1.2, 10], look: [2.5, 0, 0], fov: 38, r: [0, -2] },
  station: { a: [0.6, 1.0, 7.0], b: [0.4, 0.8, 6.3], look: [0, 0, 0], fov: 35, r: [-2, -3] },
  fling:   { a: [0.4, 0.6, 7.6], b: [0.2, 0.9, 9.6], look: [0.4, 0.3, 0], fov: 38, r: [0, -3] },
};
function buildEarth(prm) {
  const W = W3.inkWorld({ look: 'space', fov: 35, bloom: 0.7 }); W.vfov = 1.75; const sp = space3d(W); const s = { stage: W, sp };
  if (prm.storms) s.storms = stormLayer(sp.spin);
  if (prm.sats) { s.sats = satellites(W); s.sats.forEach(x => sp.tilt.add(x)); }
  if (prm.crack) { s.debris = debris(W); s.debris.forEach(x => sp.tilt.add(x)); }
  if (prm.station) s.station = station(W);
  if (prm.moon) s.moon = planet(W, 'moon', 0.55);
  if (prm.safe) { s.ring = poleRing(W); sp.tilt.add(s.ring); }
  if (prm.pipFly) { s.pip = W3.card(W, PIP, { s: 0.35, outline: '#241726', rim: false }); s.pip.blob.visible = false; }
  return s;
}
function earthDraw(s, t, info) {
  const prm = info, g = info.globalT, dur = info.dur, C = EC[prm.cam] || EC.close;
  W3.camKeys(s.stage, t, [[0, { pos: C.a, look: C.look, fov: C.fov, roll: C.r[0] }], [dur, { pos: C.b, look: C.look, fov: C.fov, roll: C.r[1] }]]);
  s.stage.lens(9, 0);
  s.sp.setSpin(g * (prm.spin ?? 0.5));
  const sq = pv(prm.squash, t, dur), b = pv(prm.bulge, t, dur), st = pv(prm.stretch, t, dur);
  s.sp.shape(sq, b, st);
  if (s.sats) s.sats.forEach((x, k) => { const a = x.userData.a0 + t * 0.18 * (k % 2 ? 1 : 0.6); x.position.set(Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3); x.rotation.y = -a; });
  if (s.debris) s.debris.forEach((d) => { const u = d.userData, r = 2.05 * (1 + 0.14 * sq) + ((t * u.v + u.s) % 3.2); const a = u.a + g * 0.4; d.position.set(Math.cos(a) * r, u.y * r * 0.3, Math.sin(a) * r); d.rotation.set(t * u.v, t * 2, 0); });
  if (s.station) { const a = t * 0.9 + 1; s.station.position.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5 * 0.45, Math.sin(a) * 2.5 * 0.9); s.station.lookAt(0, 0, 0); }
  if (s.moon) { const m = prm.moon, x = m === 'close' ? 4.6 : m === 'brake' ? 7.2 : lerp(6.5, 10.5, ease.inOut(clamp(t / dur))); s.moon.position.set(x, 0.6, -1.5); s.moon.rotation.y = g * 0.05; }
  if (s.ring) { s.ring.position.set(0, 2.05 * (1 - 0.2 * sq) + 0.04, 0); s.ring.rotation.x = Math.PI / 2; s.ring.scale.setScalar(1 + 0.08 * Math.sin(t * 4)); }
  if (s.pip) { const f = ease.in(clamp((t - 1.4) / 2.6)); s.pip.place(lerp(0.9, 4.2, f), lerp(1.85, 3.0, f), lerp(-0.05, 1.6, f)); s.pip.mesh.rotation.z = -f * 2.5; s.pip.set({ pose: f > 0.02 ? POSES.fall : POSES.stand, expr: f > 0.02 ? 'shocked' : 'surprised', facing: 1 }); }
}
function earthOverlay(g, t, info, s) {
  label(g, t, info.label);
  if (info.safe) kText(g, t, 'SAFE ZONE: THE POLES', E.W / 2, 150, { start: 0.6, mode: 'drop', size: 64, color: '#7cf2a8', glow: 20 });
  if (info.moon === 'brake') { const m = toScreen(s.moon.position, s.stage.camera), e = toScreen(new THREE.Vector3(0, 0, 0), s.stage.camera); g.save(); g.strokeStyle = CORAL; g.lineWidth = 8; g.setLineDash([18, 14]); g.beginPath(); g.moveTo(m[0] - 60, m[1]); g.lineTo(e[0] + 260, e[1]); g.stroke(); g.restore(); text(g, 'TIDAL BRAKE', (m[0] + e[0]) / 2 + 80, m[1] - 50, { size: 44, color: CORAL, font: FONTS.ui, weight: 900 }); }
}

// ---------- PLANETS ----------
const PC = {
  earthJupiter: { a: [1.5, 1.6, 17], b: [1.8, 1.3, 15.2], look: [2.2, 0, 0], fov: 38 },
  close: { a: [0.3, 0.5, 6.4], b: [0.2, 0.35, 5.7], look: [0, 0, 0], fov: 35 },
  stripes: { a: [-1.2, 0.2, 4.6], b: [-0.9, 0.1, 4.2], look: [0, 0.3, 0], fov: 35 },
  front: { a: [0, 0, 7.4], b: [0, 0, 6.8], look: [0, 0, 0], fov: 35 },
  saturn: { a: [0.6, 1.0, 10.5], b: [0.4, 0.8, 9.4], look: [0, 0, 0], fov: 38 },
  reveal: { a: [0.6, 0.8, 18], b: [0.3, 0.4, 7.2], look: [0, 0, 0], fov: 35 },
  dumbbell: { a: [0, 1.2, 10], b: [0, 0.8, 9.2], look: [0, 0, 0], fov: 38 },
};
function buildPlanet(prm) {
  const W = W3.inkWorld({ look: 'space', fov: 35, bloom: 0.6 }); W.vfov = 1.75; const sp = space3d(W); const s = { stage: W, sp };
  const k = prm.body;
  if (k === 'earthJupiter') { s.body = planet(W, 'jupiter', 4); sp.tilt.scale.setScalar(0.18); sp.tilt.position.set(6.6, 0, 0.5); sp.glow.position.set(6.6, 0, 0.5); sp.glow.scale.setScalar(1.0); }
  else { sp.tilt.visible = false; sp.glow.visible = false; s.body = planet(W, k === 'dumbbell' ? 'dumbbell' : k, 2); }
  return s;
}
function planetDraw(s, t, info) {
  const prm = info, g = info.globalT, dur = info.dur, k = prm.body;
  const C = PC[k === 'earthJupiter' ? 'earthJupiter' : k === 'saturn' ? 'saturn' : k === 'dumbbell' ? 'dumbbell' : prm.cam || 'close'];
  W3.camKeys(s.stage, t, [[0, { pos: C.a, look: C.look, fov: C.fov, roll: -2 }], [dur, { pos: C.b, look: C.look, fov: C.fov, roll: -3 }]]);
  s.stage.lens(9, 0);
  const body = s.body.userData.body; const spin = k === 'haumea' ? 1.6 : k === 'dumbbell' ? 0.3 : 0.9;
  if (body) body.rotation.y = prm.cam === 'front' ? (k === 'haumea' ? 0 : g * 0.1) : g * spin;
  if (k === 'earthJupiter') s.sp.setSpin(g * 0.5);
  if (k === 'dumbbell') { s.body.userData.split(ease.inOut(prog(t, 1.2, dur - 0.8))); s.body.rotation.y = g * 0.2; }
}
function planetOverlay(g, t, info, s) {
  label(g, t, info.label);
  const cam = s.stage.camera, k = info.body;
  if (k === 'earthJupiter') { const e = toScreen(new THREE.Vector3(6.6, 0, 0.5), cam); kText(g, t, 'EARTH', e[0], e[1] + 120, { start: 0.5, mode: 'drop', size: 44, color: CREAM }); kText(g, t, 'JUPITER: 9.9 HOURS', E.W / 2, 200, { start: 0.9, mode: 'drop', size: 58, color: GOLD, glow: 18 }); }
  if (info.outline && k === 'jupiter') {
    const c = toScreen(new THREE.Vector3(0, 0, 0), cam), top = toScreen(new THREE.Vector3(0, 2 * 0.935, 0), cam), eq = toScreen(new THREE.Vector3(2, 0, 0), cam);
    const rp = Math.abs(c[1] - top[1]), a = clamp((t - 0.6) / 0.8);
    g.save(); g.globalAlpha = a; g.strokeStyle = '#7cf2a8'; g.lineWidth = 6; g.setLineDash([22, 16]); g.beginPath(); g.arc(c[0], c[1], rp, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    seg(g, [[c[0] + rp, c[1]], [eq[0], eq[1]]], 8, CORAL); g.restore();
  }
  if (info.axes) { const c = toScreen(new THREE.Vector3(0, 0, 0), cam), xa = toScreen(new THREE.Vector3(2, 0, 0), cam), ya = toScreen(new THREE.Vector3(0, 1, 0), cam), a = clamp((t - 0.5) / 0.6);
    g.save(); g.globalAlpha = a; seg(g, [[2 * c[0] - xa[0], c[1]], [xa[0], c[1]]], 7, GOLD); seg(g, [[c[0], 2 * c[1] - ya[1]], [c[0], ya[1]]], 7, BLUE); g.restore();
    kText(g, t, '2×', E.vertical ? Math.min(E.W - 90, xa[0] + 70) : xa[0] + 70, E.vertical ? c[1] + 140 : c[1] - 10, { start: 1.0, mode: 'slam', size: 110, color: GOLD, glow: 24 }); }
}

// ---------- BOARDS (2D) ----------
function board(g, cam) {
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#14204a', NAVY]); g.fillRect(-50, -50, E.W + 100, E.H + 100);
  g.save(); g.translate(E.W / 2, E.H / 2); g.scale(cam.z, cam.z); g.translate(-E.W / 2 + (cam.x || 0), -E.H / 2 + (cam.y || 0));
  g.strokeStyle = 'rgba(143,184,232,.08)'; g.lineWidth = 2; for (let x = -200; x < E.W + 200; x += 60) { g.beginPath(); g.moveTo(x, -200); g.lineTo(x, E.H + 200); g.stroke(); } for (let y = -200; y < E.H + 200; y += 60) { g.beginPath(); g.moveTo(-200, y); g.lineTo(E.W + 200, y); g.stroke(); }
}
function earth2d(g, x, y, r, rot) {
  circle(g, x, y, r + 6, '#05070f'); circle(g, x, y, r, '#3c8fd0'); g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
  for (const [u, v, rx, ry] of [[0.1, -0.3, 0.3, 0.22], [-0.4, 0.2, 0.22, 0.3], [0.5, 0.35, 0.25, 0.18]]) { const xx = x + ((((u + rot) % 2) + 2) % 2 - 1) * r * 1.3; g.fillStyle = '#6fa64a'; g.beginPath(); g.ellipse(xx, y + v * r, rx * r, ry * r, 0.4, 0, 7); g.fill(); g.strokeStyle = '#1d2f1a'; g.lineWidth = 4; g.stroke(); }
  g.fillStyle = 'rgba(0,0,20,.3)'; g.beginPath(); g.arc(x + r * 0.45, y, r * 1.05, 0, 7); g.fill(); g.restore();
  g.strokeStyle = alpha('#ffffff', 0.5); g.setLineDash([10, 10]); g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, r, r * 0.16, 0, 0, Math.PI); g.stroke(); g.setLineDash([]);
}
function arrow(g, x0, y0, x1, y1, w, col) { const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); if (L < 4) return; g.save(); g.translate(x0, y0); g.rotate(a); g.fillStyle = col; g.strokeStyle = '#05070f'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, -w / 2); g.lineTo(L - w * 1.4, -w / 2); g.lineTo(L - w * 1.4, -w * 1.2); g.lineTo(L, 0); g.lineTo(L - w * 1.4, w * 1.2); g.lineTo(L - w * 1.4, w / 2); g.lineTo(0, w / 2); g.closePath(); g.stroke(); g.fill(); g.restore(); }
function clockFace(g, x, y, r, hRot, mRot) {
  circle(g, x, y, r + 10, '#05070f'); circle(g, x, y, r, CREAM);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; seg(g, [[x + Math.sin(a) * r * 0.82, y - Math.cos(a) * r * 0.82], [x + Math.sin(a) * r * 0.94, y - Math.cos(a) * r * 0.94]], i % 3 ? 5 : 10, '#2a1a0c'); }
  seg(g, [[x, y], [x + Math.sin(hRot) * r * 0.5, y - Math.cos(hRot) * r * 0.5]], 16, '#2a1a0c'); seg(g, [[x, y], [x + Math.sin(mRot) * r * 0.78, y - Math.cos(mRot) * r * 0.78]], 9, '#c0352a'); circle(g, x, y, 14, '#2a1a0c');
}
const sun2d = (g, x, y, r) => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; seg(g, [[x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25], [x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6]], 6, '#ffc94a'); } circle(g, x, y, r, '#ffc94a'); };
const moon2d = (g, x, y, r) => { circle(g, x, y, r, '#e8ecff'); circle(g, x + r * 0.45, y - r * 0.2, r * 0.9, NAVY); };

const BOARDS = {
  title(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.08 }]]); board(g, cam);
    clockFace(g, E.W / 2, 330, 150, t * 9, t * 40);
    kText(g, t, 'WHAT IF A DAY LASTED', E.W / 2, 610, { start: 0.15, mode: 'drop', size: 96, color: CREAM, glow: 12 });
    kText(g, t, 'JUST 1 HOUR?', E.W / 2, 750, { start: 0.55, mode: 'slam', size: 170, color: GOLD, glow: 34 });
    g.restore();
  },
  speed(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.04 }], [info.dur, { z: 1.1, x: -20 }]]); board(g, cam);
    earth2d(g, 400, 560, 250, t * 0.3 * (info.rows.length > 1 ? 3 : 1));
    const bx = 800, bw = 960, max = info.max || 24000;
    info.rows.forEach(([lab, v, col], i) => {
      const y = 330 + i * 230, a = ease.inOut(prog(t, 0.3 + i * 1.1, 1.6 + i * 1.1)), w = Math.max(30, bw * (v / max) * a);
      text(g, lab, bx, y, { size: 44, color: col, align: 'left', font: FONTS.ui, weight: 900, alpha: prog(t, 0.2 + i * 1.1, 0.5 + i * 1.1) });
      rr(g, bx, y + 30, bw, 74, 16); g.fillStyle = alpha(col, 0.12); g.fill(); rr(g, bx, y + 30, w, 74, 16); g.fillStyle = col; g.fill();
      const tx = Math.min(bx + w + 24, bx + bw - 320); text(g, num(v * a) + ' mph', tx, y + 68, { size: 52, color: tx < bx + w ? '#14204a' : '#ffffff', align: 'left', font: FONTS.ui, weight: 900, alpha: prog(t, 0.3 + i * 1.1, 0.6 + i * 1.1) });
    });
    if (info.note) kText(g, t, info.note, bx + bw / 2, 860, { start: 2.6, mode: 'slam', size: 96, color: GOLD, glow: 26 });
    g.restore();
  },
  clock(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.1 }]]); board(g, cam);
    const cx = 620, cy = 540; const fast = info.twoNights ? 2 : 1;
    clockFace(g, cx, cy, 260, t * 1.2 * fast, t * 14 * fast);
    if (info.twoNights) { sun2d(g, cx, cy - 360, 46); moon2d(g, cx + 360, cy, 46); sun2d(g, cx, cy + 360, 46); moon2d(g, cx - 360, cy, 46);
      kText(g, t, '2 NIGHTS = 2 BEDTIMES', 1400, 470, { start: 0.8, mode: 'drop', size: 70, color: GOLD, glow: 18 }); kText(g, t, 'EVERY 24 HOURS', 1400, 590, { start: 1.6, mode: 'drop', size: 50, color: CREAM }); }
    else { kText(g, t, '–2 HOURS', 1400, 430, { start: 0.6, mode: 'slam', size: 130, color: CORAL, glow: 26 }); kText(g, t, 'EVERY SINGLE DAY', 1400, 560, { start: 1.6, mode: 'drop', size: 56, color: CREAM }); kText(g, t, '= PERMANENT JET LAG', 1400, 670, { start: 4.2, mode: 'drop', size: 60, color: GOLD, glow: 16 }); }
    g.restore();
  },
  recap(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.05 }]]); board(g, cam);
    const steps = info.steps, x0 = 330, dx = (E.W - 660) / (steps.length - 1);
    seg(g, [[x0, 520], [x0 + dx * (steps.length - 1), 520]], 8, alpha(BLUE, 0.5));
    steps.forEach((v, i) => { const a = prog(t, 0.1 + i * 0.3, 0.4 + i * 0.3); if (a <= 0) return; const x = x0 + dx * i; circle(g, x, 520, 90 * ease.outBack(a), i === steps.length - 1 ? GOLD : CREAM); text(g, v + ' h', x, 520, { size: 60, color: '#14204a', font: FONTS.ui, weight: 900 });
      if (i) { g.strokeStyle = CORAL; g.lineWidth = 7; g.beginPath(); g.arc(x, 720, 34, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); circle(g, x - 14, 680, 6, CORAL); circle(g, x + 14, 680, 6, CORAL); } });
    g.restore();
  },
  fling(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.1, x: -30, y: 20 }]]); board(g, cam);
    const ex = 620, ey = 600, er = 330; earth2d(g, ex, ey, er, t * 0.4);
    const [s0, s1] = info.speed, [r0, r1] = info.ramp || [0, 1]; const spd = lerp(s0, s1, ease.inOut(prog(t, r0, r1))), k = clamp(spd / 17500);
    const lift = info.scale0 ? 40 + Math.sin(t * 2) * 10 : 0, px = ex + er + 4 + lift, py = ey;
    g.save(); g.translate(px, py); g.rotate(Math.PI / 2); drawFigure(g, { x: 0, y: 0, s: 0.8, outfit: PIP, ink: PIP.ink, inkFar: PIP.inkFar, faceColor: PIP.faceColor, pose: breathe(info.scale0 ? POSES.fall : POSES.stand, t), expr: info.scale0 ? 'awe' : 'neutral', facing: 1, rim: false, shadow: false }); g.restore();
    const gl = 280, fl = 40 + 240 * k;
    arrow(g, px + 130, py - 50, px + 130 + fl * ease.out(prog(t, 0.3, 1.0)), py - 50, 52, CORAL); text(g, 'FLING', px + 140, py - 130, { size: 52, color: CORAL, align: 'left', font: FONTS.ui, weight: 900 });
    arrow(g, px + 130 + gl, py + 70, px + 130 + gl - gl * ease.out(prog(t, 0.6, 1.3)), py + 70, 52, BLUE); text(g, 'GRAVITY', px + 140, py + 170, { size: 52, color: BLUE, align: 'left', font: FONTS.ui, weight: 900 });
    rr(g, E.W - 640, 120, 540, 130, 18); g.fillStyle = 'rgba(10,16,40,.85)'; g.fill(); text(g, 'EQUATOR SPEED', E.W - 610, 162, { size: 30, color: BLUE, align: 'left', font: FONTS.ui, weight: 900 }); text(g, num(spd) + ' mph', E.W - 610, 216, { size: 58, color: k >= 1 ? CORAL : '#ffffff', align: 'left', font: FONTS.ui, weight: 900 });
    if (k >= 1 && !info.scale0) kText(g, t, 'FLING = GRAVITY', E.W - 380, 330, { start: r1, mode: 'slam', size: 64, color: GOLD, glow: 20 });
    if (info.scale0) kText(g, t, 'WEIGHT: 0', E.W - 380, 330, { start: 0.3, mode: 'slam', size: 90, color: GOLD, glow: 24 });
    if (s0 === s1 && !info.scale0) kText(g, t, 'GRAVITY WINS', E.W - 380, 330, { start: 1.6, mode: 'drop', size: 64, color: BLUE, glow: 16 });
    g.restore();
  },
  cannon(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.06 }]]); board(g, cam);
    const cx = E.W / 2, cy = 640, R = 300; earth2d(g, cx, cy, R, 0.2);
    g.fillStyle = '#8a7a6a'; g.beginPath(); g.moveTo(cx - 70, cy - R + 10); g.lineTo(cx, cy - R - 90); g.lineTo(cx + 70, cy - R + 10); g.fill(); g.strokeStyle = '#05070f'; g.lineWidth = 5; g.stroke();
    rr(g, cx - 10, cy - R - 112, 70, 26, 10); g.fillStyle = '#2a2a33'; g.fill();
    const shots = [[0.6, 2.4, 0.35], [2.6, 4.6, 0.9], [4.8, 9.0, 2 * Math.PI]];
    shots.forEach(([a, b, span], i) => { const p = prog(t, a, b); if (p <= 0) return; g.save(); g.strokeStyle = [CORAL, GOLD, '#7cf2a8'][i]; g.lineWidth = 6; g.setLineDash([16, 12]); g.beginPath();
      const rr0 = R + 100; for (let q = 0; q <= 60; q++) { const u = (q / 60) * p, ang = -Math.PI / 2 + span * u, drop = i < 2 ? (u * u) * 100 : 0; const r = rr0 - drop; const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r; q ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore();
      const ang = -Math.PI / 2 + span * p, drop = i < 2 ? p * p * 100 : 0; circle(g, cx + Math.cos(ang) * (R + 100 - drop), cy + Math.sin(ang) * (R + 100 - drop), 16, '#2a2a33'); });
    kText(g, t, "NEWTON'S CANNON", cx, 120, { start: 0.2, mode: 'drop', size: 70, color: CREAM, glow: 10 });
    if (t > 6) kText(g, t, 'FAST ENOUGH = FALLING AROUND EARTH', cx, 1010, { start: 6, mode: 'drop', size: 50, color: '#7cf2a8', glow: 14 });
    g.restore();
  },
  loop(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.08 }]]); board(g, cam);
    const cx = 640, cy = 560, R = 300; earth2d(g, cx, cy, R, t * 0.2);
    const p = (t / Math.min(info.dur, 6)) % 1, a = -Math.PI / 2 + p * Math.PI * 2;
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, R + 40, -Math.PI / 2, a); g.stroke(); g.restore(); circle(g, cx + Math.cos(a) * (R + 40), cy + Math.sin(a) * (R + 40), 22, CORAL);
    kText(g, t, '24,900 MILES', 1420, 380, { start: 0.4, mode: 'slam', size: 96, color: GOLD, glow: 22 }); kText(g, t, 'AROUND', 1420, 480, { start: 0.9, mode: 'drop', size: 56, color: CREAM });
    kText(g, t, '1 TRIP = 1 HOUR', 1420, 640, { start: 2.6, mode: 'drop', size: 70, color: CREAM, glow: 10 }); kText(g, t, '24,900 MPH', 1420, 780, { start: 4.0, mode: 'slam', size: 100, color: CORAL, glow: 24 });
    g.restore();
  },
  timeline(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.06, x: -10 }]]); board(g, cam);
    const items = [['MOON FORMS', '4.5 BILLION YRS AGO', 9.5, 'past'], ['BORING BILLION', '2 – 0.6 BILLION YRS AGO', 19, 'boring'], ['DINOSAURS', '70 MILLION YRS AGO', 23.5, 'dino'], ['TODAY', '', 24, 'today'], ['FUTURE', '+200 MILLION YRS', 25, 'future']];
    const x0 = 260, dx = 340, base = 720, H = 20;
    text(g, 'LENGTH OF A DAY', E.W / 2, 110, { size: 56, color: CREAM, font: FONTS.ui, weight: 900 });
    items.forEach(([n, sub, h, key], i) => { const a = ease.out(prog(t, 0.2 + i * 0.25, 0.9 + i * 0.25)), on = key === info.focus || (info.focus === 'future' && key === 'today'), col = key === info.focus ? GOLD : on ? CREAM : alpha(BLUE, 0.6); const x = x0 + dx * i, bh = h * H * a;
      rr(g, x - 70, base - bh, 140, bh, 14); g.fillStyle = col; g.fill(); text(g, (h === 9.5 ? '<10' : h) + ' h', x, base - bh - 40, { size: 48, color: col, font: FONTS.ui, weight: 900, alpha: a });
      text(g, n, x, base + 50, { size: 32, color: col, font: FONTS.ui, weight: 900 }); if (sub) text(g, sub, x, base + 92, { size: 22, color: alpha(CREAM, 0.7), font: FONTS.ui, weight: 800 }); });
    g.restore();
  },
  summary(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.04 }]]); board(g, cam);
    const rows = [['22 h', 'jet lag + wet islands'], ['12 h', 'two bedtimes + angry hurricanes'], ['10 h', 'Jupiter vibes'], ['4 h', 'egg planet'], ['1 h 24 m', 'free astronaut training'], ['1 h', 'goodbye, Pip']];
    text(g, "PIP'S SURVIVAL GUIDE", E.W / 2, 110, { size: 60, color: GOLD, font: FONTS.ui, weight: 900 });
    rows.forEach(([h, s], i) => { const a = prog(t, 1.6 + i * 2.1, 2.0 + i * 2.1); if (a <= 0) return; const y = 230 + i * 125; g.save(); g.globalAlpha = a; rr(g, 330, y - 48, 1260, 96, 20); g.fillStyle = 'rgba(255,241,220,.08)'; g.fill();
      text(g, h, 380, y, { size: 54, color: GOLD, align: 'left', font: FONTS.ui, weight: 900 }); text(g, s, 700, y, { size: 50, color: CREAM, align: 'left', font: FONTS.ui, weight: 800 }); g.restore(); });
    g.restore();
  },
  endscreen(g, t, info) {
    const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.03 }]]); board(g, cam);
    if (t < 3.0) { kText(g, t, 'SUBSCRIBE', E.W / 2, 380, { start: 0.1, mode: 'slam', size: 170, color: CORAL, glow: 30 }); kText(g, t, 'FOR MORE!', E.W / 2, 540, { start: 0.5, mode: 'drop', size: 110, color: CREAM, glow: 12 }); }
    else { kText(g, t, 'WHAT SHOULD WE DO NEXT?', E.W / 2, 150, { start: 3.0, mode: 'drop', size: 92, color: GOLD, glow: 22 });
      const a = prog(t, 3.6, 4.2); g.save(); g.globalAlpha = a; rr(g, E.W / 2 - 230, 230, 460, 120, 60); g.fillStyle = CREAM; g.fill(); g.beginPath(); g.moveTo(E.W / 2 - 40, 345); g.lineTo(E.W / 2 - 90, 400); g.lineTo(E.W / 2 + 10, 348); g.fill();
      text(g, 'What if...?', E.W / 2, 292, { size: 64, color: '#14204a', font: FONTS.title, weight: 700 }); g.restore(); }
    const gT = info.globalT;
    drawFigure(g, { x: 170, y: E.H - 60, s: 1.15, outfit: PIP, ink: PIP.ink, inkFar: PIP.inkFar, faceColor: PIP.faceColor, pose: breathe(posesAt(t, [[0, POSES.cheer], [3, POSES.wave]]), t), expr: 'joy', talk: talkOf('PIP', gT), facing: 1, rim: { color: GOLD, dir: [0, -1] } });
    drawFigure(g, { x: E.W - 170, y: E.H - 60, s: 1.15, outfit: INK, pose: breathe(posesAt(t, [[0, POSES.crossArms], [3, POSES.point]]), t, 1, 3), expr: 'smile', talk: talkOf('INK', gT), facing: -1, rim: { color: GOLD, dir: [0, -1] } });
    g.restore();
  },
};

// vertical (Shorts): 2D boards are laid out for 1920x1080 — draw them in that space, scaled into the middle of the 9:16 frame
function vbox(fn) { return (g, t, info) => { if (!E.vertical) return fn(g, t, info);
  const W0 = E.W, H0 = E.H, k = W0 / 1920; g.fillStyle = linGrad(g, 0, 0, 0, H0, ['#14204a', NAVY]); g.fillRect(0, 0, W0, H0);
  g.save(); g.translate(W0 / 2 - 960 * k, H0 * 0.47 - 540 * k); g.scale(k, k); E.W = 1920; E.H = 1080; try { fn(g, t, info); } finally { E.W = W0; E.H = H0; g.restore(); } }; }

// ---------- registration ----------
E.shots.forEach((shot, i) => {
  shot._i = i; const p = shot.params || {}, kind = shot.kind;
  if (kind === 'room') registerShot(shot.id, { kind: '3d', init: () => buildRoom(p), draw: (s, t, info) => roomDraw(s, t, info), overlay: (g, t, info) => dayBadge(g, p.day) });
  if (kind === 'dial') registerShot(shot.id, { kind: '3d', init: () => buildRoom({ dialValue: p.from }), draw: (s, t, info) => dialDraw(s, t, info), overlay: (g, t, info) => { dialOverlay(g, t, info); dayBadge(g, t > 0.6 ? p.to : p.from); } });
  if (kind === 'earth') registerShot(shot.id, { kind: '3d', init: () => buildEarth(p), draw: (s, t, info) => earthDraw(s, t, info), overlay: (g, t, info, s) => { earthOverlay(g, t, info, s); dayBadge(g, p.day); } });
  if (kind === 'planet') registerShot(shot.id, { kind: '3d', init: () => buildPlanet(p), draw: (s, t, info) => planetDraw(s, t, info), overlay: (g, t, info, s) => { planetOverlay(g, t, info, s); dayBadge(g, p.day); } });
  if (kind === 'board') registerShot(shot.id, { draw: (g, t, info) => { vbox(BOARDS[p.type])(g, t, info); if (!['title', 'endscreen'].includes(p.type)) dayBadge(g, p.day); } });
});
