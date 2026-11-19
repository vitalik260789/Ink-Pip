// Episode 04 — "What If All the Bees Disappeared?" Same grammar as ep03 (reference-matched):
// long continuous location shots, camera glides (~0.9 s ease-in-out) on every line + every ~2.5 s, constant slow push-in,
// dissolves between locations, story beats keyed to the voice lines (LN(i) = start of line i), vertical-aware (E.vertical).
import { E, registerShot, ease, clamp, lerp, text, rr, alpha, FONTS } from '/engine/core.js';
import { POSES, posesAt, breathe } from '/engine/rig2d.js';
import { kText } from '/engine/motion.js';
import { THREE } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { room3d } from '../sets/room3d.js';
import { meadow3d, flower3d, market3d, breakfast, bee } from '../sets/nature3d.js';
import { INK, PIP, LINES, talkOf } from '../cast.js';

const GOLD = '#ffd47e', CORAL = '#ff7a4a', MINT = '#7cf2a8', SKY = '#9fd0ff', CREAM = '#fff1dc', HONEY = '#ffc832';
const LN = (i, d = 0) => LINES[i][1] + d, LE = (i, d = 0) => LINES[i][2] + d;
const sstep = (u) => u * u * u * (u * (u * 6 - 15) + 10);
const toScreen = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * E.W, (1 - p.y) / 2 * E.H, p.z]; };
const win = (g, a, b) => g >= a && g < b;
// vertical (Shorts) layout: labels stack in the centre column under the Short's question
const VY0 = 400;
function vPos(x, y, o) { if (!E.vertical || o.anchor) return [E.vertical ? Math.max(220, Math.min(E.W - 220, x)) : x, y]; const side = x < E.W * 0.35 ? 0 : x > E.W * 0.65 ? 1 : 0; return [E.W / 2, VY0 + (y - 150) + side * 92]; }
const vSize = (s, size) => E.vertical ? Math.min(size * 0.9, 980 / (0.6 * s.length)) : size;
const lab = (g, G, s, a, b, x, y, o = {}) => { if (win(G, a, b)) { const [px, py] = vPos(x, y, o); kText(g, G - a, s, px, py, { start: 0.05, mode: o.mode || 'drop', size: vSize(s, o.size || 64), color: o.color || GOLD, glow: 22 }); } };

// ---------- camera: framings + glides + creep (same as ep03) ----------
const CREEP = 0.035, CREEP_MAX = 0.2;
function camState(F, t) {
  let i = 0; while (i < F.length - 1 && t >= F[i + 1][0]) i++;
  const [t0, f] = F[i], m = f.m ?? 0.9;
  const prev = i ? camState(F, t0 - 1e-4) : { ...f };
  const u = i ? (f.ease === 'in' ? ease.in(clamp((t - t0) / m)) : sstep(clamp((t - t0) / m))) : 1;
  const L = (a, b) => a.map((v, j) => lerp(v, b[j], u));
  const st = { pos: L(prev.pos, f.pos), look: L(prev.look, f.look), fov: lerp(prev.fov, f.fov ?? prev.fov, u), roll: lerp(prev.roll || 0, f.roll ?? 0, u),
    lens: [lerp(prev.lens?.[0] ?? 3, f.lens?.[0] ?? prev.lens?.[0] ?? 3, u), lerp(prev.lens?.[1] ?? 0, f.lens?.[1] ?? prev.lens?.[1] ?? 0, u)] };
  const hold = Math.max(0, t - t0 - (i ? m : 0)), k = f.creep === false ? 0 : Math.min(CREEP_MAX, hold * CREEP);
  st.pos = st.pos.map((v, j) => st.look[j] + (v - st.look[j]) * (1 - k));
  return st;
}
let CAM_PUSH = 1;   // vertical: wide/macro shots pull back a little
function applyCam(W, s) { const c = W.camera; if (E.vertical) { const k = CAM_PUSH, sp = CAM_PUSH > 1; const look = [s.look[0] * (sp ? 0.4 : 1), s.look[1] - (sp ? 0 : 0.08), s.look[2]];
    s = { ...s, look, pos: s.pos.map((v, j) => look[j] + (v - s.look[j]) * k), fov: Math.min(72, s.fov * (sp ? 1.35 : 1.25)) }; }
  c.position.set(...s.pos); c.up.set(0, 1, 0); c.lookAt(...s.look); if (s.roll) c.rotateZ(s.roll * Math.PI / 180); c.fov = s.fov; c.updateProjectionMatrix(); W.lens(s.lens[0], s.lens[1]); }
function moveTimes(a, b) {
  const ts = [0]; for (const l of LINES) if (l[1] > a + 0.6 && l[1] < b - 0.8) ts.push(l[1] - a - 0.1);
  ts.push(b - a); const out = [0];
  for (let i = 1; i < ts.length; i++) { let p = out[out.length - 1]; while (ts[i] - p > 2.6 + 0.9) { p += 2.4; out.push(p); } if (ts[i] < b - a - 0.5 && ts[i] - out[out.length - 1] > 1.2) out.push(ts[i]); }
  return out;
}
const speakerAt = (g) => (LINES.find(l => g >= l[1] - 0.15 && g <= l[2]) || [null])[0];
function framings(a, b, pick, extra = []) {
  const F = moveTimes(a, b).map((t, i) => [t, { ...pick(a + t + 0.2, i, speakerAt(a + t + 0.2)) }]);
  for (const [t, f] of extra) { let j = F.findIndex(x => x[0] > t); if (j < 0) j = F.length; F.splice(j, 0, [t, f]); }
  return F.filter((x, i) => i === 0 || x[0] - F[i - 1][0] > 0.35);
}

// ---------- 2D helpers ----------
function burst(g, t, t0, x, y, col = '#fff6d8', n = 14, R = 120) {
  const u = (t - t0) / 0.6; if (u < 0 || u > 1) return; g.save(); g.globalAlpha = 1 - u;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + i, r = R * ease.out(u) * (0.6 + 0.4 * ((i * 7) % 5) / 5), sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r, s = 14 * (1 - u) + 4;
    g.fillStyle = col; g.beginPath(); for (let k = 0; k < 8; k++) { const aa = k * Math.PI / 4, rr2 = k % 2 ? s * 0.35 : s; g.lineTo(sx + Math.cos(aa) * rr2, sy + Math.sin(aa) * rr2); } g.closePath(); g.fill(); }
  g.restore();
}
function card2d(g, x, y, w, h, fn) { g.save(); rr(g, x, y, w, h, 22); g.fillStyle = 'rgba(14,16,40,.82)'; g.fill(); g.lineWidth = 4; g.strokeStyle = alpha(GOLD, 0.7); g.stroke(); fn(); g.restore(); }
function stamp(g, G, t0, x, y, str, col = CORAL) { const k = ease.outBack(clamp((G - t0) / 0.35)); if (k <= 0) return; g.save(); g.translate(...(E.vertical ? [E.W / 2, VY0] : [x, y])); g.rotate(-0.12); g.scale(k, k); rr(g, -160, -55, 320, 110, 16); g.lineWidth = 9; g.strokeStyle = col; g.stroke(); text(g, str, 0, 24, { size: 78, color: col, font: FONTS.ui, weight: 900 }); g.restore(); }
// bee icon (2D) for cards
function bee2d(g, x, y, s, t = 0) { g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 6; g.strokeStyle = '#1a0d12';
  g.fillStyle = 'rgba(230,245,255,.85)'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 14 - 4, -34 - Math.abs(Math.sin(t * 40)) * 6, 26, 16, sd * 0.6, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = HONEY; g.beginPath(); g.ellipse(0, 0, 46, 30, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#1e1612'; for (const sx of [-6, 14]) g.fillRect(sx, -27, 10, 54); g.beginPath(); g.arc(-44, -4, 20, 0, 7); g.fill(); g.restore(); }

// ---------- characters ----------
function poseOf(spec, t, speaking) { const p = spec?.[1] ?? 'stand'; let pose = POSES[p] || POSES.stand; if (speaking && (p === 'stand' || p === 'relaxed')) pose = posesAt(t, [[0, POSES.stand], [0.3, POSES.talk]]); return pose; }
const ACT = [
  // hook (room)
  [0, ['awe', 'point'], ['neutral', 'stand']], [LE(1, -0.1), ['shocked', 'handsOnHead'], ['smirk', 'stand']], [LN(3), ['worried', 'stand'], ['neutral', 'explain']], [LN(4), ['joy', 'cheer'], ['smirk', 'crossArms']], [LN(5), ['happy', 'stand'], ['smirk', 'explain']],
  // meadow (morning)
  [LN(9), ['curious', 'stand'], ['neutral', 'stand']], [LN(10), ['worried', 'stand'], ['neutral', 'explain']], [LN(11), ['surprised', 'point'], ['neutral', 'stand']], [LN(12), ['awe', 'stand'], ['smirk', 'explain']],
  [LN(13), ['shocked', 'handsOnHead'], ['smile', 'stand']], [LN(14), ['curious', 'think'], ['neutral', 'explain']], [LN(15), ['happy', 'point'], ['smirk', 'crossArms']], [LN(16), ['joy', 'stand'], ['smile', 'explain']],
  // orchard (crops)
  [LN(40), ['curious', 'stand'], ['neutral', 'stand']], [LN(41), ['awe', 'stand'], ['neutral', 'explain']], [LN(42), ['shocked', 'handsOnHead'], ['smirk', 'stand']], [LN(43), ['worried', 'stand'], ['neutral', 'explain']],
  [LN(44), ['surprised', 'point'], ['smile', 'stand']], [LN(45), ['curious', 'stand'], ['smirk', 'explain']], [LN(46), ['joy', 'cheer'], ['smile', 'stand']], [LN(47), ['happy', 'stand'], ['neutral', 'explain']],
  // market
  [LN(48), ['joy', 'point'], ['neutral', 'stand']], [LN(49), ['curious', 'stand'], ['neutral', 'explain']], [LN(50), ['surprised', 'stand'], ['neutral', 'stand']], [LN(51), ['worried', 'stand'], ['neutral', 'explain']],
  [LN(52), ['shocked', 'handsOnHead'], ['neutral', 'stand']], [LN(53), ['sad', 'sad'], ['neutral', 'explain']], [LN(54), ['curious', 'think'], ['neutral', 'stand']], [LN(55), ['neutral', 'stand'], ['neutral', 'explain']], [LN(56), ['nervous', 'shrug'], ['smirk', 'stand']], [LN(57), ['smirk', 'shrug'], ['neutral', 'crossArms']], [LN(58), ['curious', 'stand'], ['smirk', 'explain']],
  [LN(59), ['joy', 'pointUp'], ['neutral', 'crossArms']], [LN(60), ['surprised', 'stand'], ['smirk', 'explain']], [LN(61), ['happy', 'shrug'], ['smile', 'stand']], [LN(62), ['curious', 'stand'], ['neutral', 'explain']],
  [LN(63), ['happy', 'stand'], ['neutral', 'stand']], [LN(64), ['surprised', 'stand'], ['smirk', 'explain']],
  // farm
  [LN(65), ['confused', 'shrug'], ['neutral', 'stand']], [LN(66), ['curious', 'stand'], ['neutral', 'point']], [LN(67), ['thinking', 'think'], ['neutral', 'stand']], [LN(68), ['worried', 'stand'], ['neutral', 'explain']],
  [LN(69), ['shocked', 'handsOnHead'], ['smirk', 'stand']], [LN(70), ['curious', 'stand'], ['neutral', 'explain']], [LN(71), ['surprised', 'point'], ['smile', 'stand']], [LN(72), ['worried', 'stand'], ['neutral', 'explain']],
  [LN(73), ['awe', 'stand'], ['neutral', 'stand']], [LN(74), ['smile', 'stand'], ['smile', 'explain']],
  // cacao
  [LN(75), ['determined', 'pointUp'], ['neutral', 'stand']], [LN(76), ['surprised', 'stand'], ['smile', 'explain']], [LN(77), ['joy', 'cheer'], ['smile', 'stand']], [LN(78), ['curious', 'stand'], ['neutral', 'explain']],
  [LN(79), ['awe', 'point'], ['smirk', 'stand']], [LN(80), ['curious', 'stand'], ['smirk', 'explain']], [LN(81), ['angry', 'crossArms'], ['smile', 'stand']], [LN(82), ['happy', 'stand'], ['smile', 'explain']],
  // orchard (human bees)
  [LN(83), ['determined', 'stand'], ['neutral', 'stand']], [LN(84), ['curious', 'stand'], ['neutral', 'explain']], [LN(85), ['shocked', 'handsOnHead'], ['neutral', 'stand']], [LN(86), ['worried', 'stand'], ['neutral', 'point']],
  [LN(87), ['curious', 'think'], ['neutral', 'stand']], [LN(88), ['awe', 'stand'], ['smirk', 'explain']], [LN(89), ['smirk', 'shrug'], ['smile', 'stand']], [LN(90), ['curious', 'stand'], ['smile', 'explain']],
  [LN(91), ['joy', 'cheer'], ['smile', 'stand']], [LN(92), ['happy', 'stand'], ['neutral', 'explain']], [LN(93), ['joy', 'pointUp'], ['neutral', 'stand']], [LN(94), ['curious', 'stand'], ['neutral', 'explain']],
  [LN(95), ['joy', 'cheer'], ['smirk', 'crossArms']], [LN(96), ['confused', 'shrug'], ['neutral', 'explain']], [LN(97), ['smile', 'stand'], ['smile', 'stand']],
  // meadow (good news)
  [LN(98), ['worried', 'stand'], ['neutral', 'stand']], [LN(99), ['curious', 'stand'], ['neutral', 'explain']], [LN(100), ['thinking', 'think'], ['smile', 'stand']], [LN(101), ['awe', 'stand'], ['smile', 'explain']],
  [LN(104), ['joy', 'cheer'], ['smirk', 'stand']], [LN(105), ['happy', 'stand'], ['smirk', 'crossArms']],
  // outro (room)
  [LN(106), ['happy', 'stand'], ['neutral', 'stand']], [LN(107), ['awe', 'stand'], ['smile', 'explain']], [LN(108), ['joy', 'cheer'], ['smile', 'stand']], [LN(109), ['happy', 'wave'], ['smile', 'explain']], [LN(110), ['joy', 'point'], ['smile', 'wave']],
];
const actAt = (g) => { let a = ACT[0]; for (const x of ACT) if (g >= x[0] - 0.08) a = x; return a; };
const PIP_AT = [-0.75, -0.15], INK_AT = [0.7, -0.35];
function castCards(W, o = {}) {
  const pip = W3.card(W, PIP, { x: o.pip?.[0] ?? PIP_AT[0], z: o.pip?.[1] ?? PIP_AT[1], outline: '#241726', rimDir: [0.6, -0.8], rimColor: o.rim || '#ffd2a0' });
  const ink = W3.card(W, INK, { x: o.ink?.[0] ?? INK_AT[0], z: o.ink?.[1] ?? INK_AT[1], outline: '#241726', rimDir: [0.6, -0.8], rimColor: o.rim || '#ffd2a0', gain: 1.0 });
  return { pip, ink };
}
function actCast(s, g, t, y0 = 0) {
  const pt = talkOf('PIP', g), it = talkOf('INK', g), [ta, pa, ia] = actAt(g);
  s.pip.set({ pose: breathe(poseOf(pa, t, pt > 0), t), expr: pa[0], talk: pt, facing: 1, blink: W3.blinkAt(g, 1) });
  s.ink.set({ pose: breathe(poseOf(ia, t, it > 0), t, 1, 3), expr: ia[0], talk: it, facing: -1, blink: W3.blinkAt(g, 2) });
  const hop = pa[1] === 'cheer' ? Math.max(0, Math.sin(clamp((g - ta - 0.05) / 0.45) * Math.PI)) * 0.12 : 0;
  s.pip.group.position.y = y0 + hop; s.ink.group.position.y = y0; s.pip.blob.material.opacity = 0.75 * clamp(1 - hop * 2.2);
}
// flying bee: wander around a centre, facing its direction of travel
function flyBee(b, g, i, c, R = 1.2) {
  const a = g * (0.6 + (i % 5) * 0.13) + i * 1.7, p = [c[0] + Math.cos(a) * R * (0.7 + 0.3 * Math.sin(i)), c[1] + Math.sin(a * 2.3 + i) * 0.18, c[2] + Math.sin(a) * R * 0.6];
  const a2 = a + 0.05, q = [c[0] + Math.cos(a2) * R * (0.7 + 0.3 * Math.sin(i)), c[1] + Math.sin(a2 * 2.3 + i) * 0.18, c[2] + Math.sin(a2) * R * 0.6];
  b.position.set(...p); b.rotation.set(0, Math.atan2(-(q[2] - p[2]), -(q[0] - p[0])) + Math.PI, 0); b.rotation.y = Math.atan2(q[2] - p[2], -(q[0] - p[0])); b.userData.flap(g + i);
}

// ================= ROOM (day, breakfast) =================
const RF = {
  wide: { pos: [0.2, 1.45, 3.3], look: [0.25, 1.05, -1.2], fov: 38, lens: [3.6, 6] },
  two: { pos: [0.05, 1.3, 2.8], look: [0.05, 1.0, -0.6], fov: 36, lens: [2.9, 10] },
  table: { pos: [0.15, 1.5, 1.95], look: [0.05, 0.85, 0.0], fov: 36, lens: [2.1, 12] },
  pip: { pos: [-0.25, 1.3, 2.4], look: [-0.55, 1.2, -0.2], fov: 34, lens: [2.6, 12] },
  pip2: { pos: [-0.05, 1.22, 2.55], look: [-0.5, 1.15, -0.3], fov: 35, lens: [2.8, 11] },
  ink: { pos: [1.1, 1.32, 2.3], look: [0.72, 1.2, -0.45], fov: 34, lens: [2.6, 12] },
  ink2: { pos: [0.55, 1.28, 2.6], look: [0.6, 1.15, -0.5], fov: 35, lens: [3.0, 10] },
};
const roomPick = (g, i, who) => (win(g, LE(1, -0.3), LN(3, 1.5)) || win(g, LN(106, -0.2), LN(106, 2.2))) ? RF.table : who === 'PIP' ? (i % 2 ? RF.pip2 : RF.pip) : who === 'INK' ? (i % 3 === 2 ? RF.two : i % 2 ? RF.ink2 : RF.ink) : RF.two;
function buildRoom(p) {
  const W = W3.inkWorld({ look: 'golden', fov: 38, fog: [14, 60], bloom: 0.5, exposure: 1.72 });
  const room = room3d(W, { foreground: [-0.72, 1.6] }); const fill = new THREE.PointLight('#ffe2c0', 7, 9, 1.2); fill.position.set(-0.4, 2.6, 1.8); W.scene.add(fill);
  const s = { stage: W, room, bf: breakfast(W), ...castCards(W), part: p.part };
  if (p.part === 'start') s.bee = bee(W, 0.45);
  return s;
}
function roomFram(p, a, b) {
  const F = framings(a, b, roomPick, []);
  if (p.part === 'start') F[0] = [0, { ...RF.wide }];
  if (p.part === 'end') { F[0] = [0, { ...RF.two }]; const j = F.findIndex(x => x[0] > b - a - 4.6); if (j > 0) F.splice(j); F.push([b - a - 4.2, RF.wide]); }
  return F;
}
const FOOD_OFF = () => LE(1, 0.05), FOOD_ON = () => LN(106, 0.4);
function roomDraw(s, t, info) {
  const g = info.globalT; s.F ||= roomFram(info, info.shot.start, info.shot.end); applyCam(s.stage, camState(s.F, t));
  const items = [s.bf.apple, s.bf.honey, s.bf.bowl];
  items.forEach((m, i) => { const off = FOOD_OFF() + i * 0.35, on = FOOD_ON() + i * 0.35; let k = 1;
    if (s.part === 'start') k = 1 - ease.in(clamp((g - off) / 0.22)); else k = ease.outBack(clamp((g - on) / 0.35));
    m.scale.setScalar(Math.max(0.001, k)); m.visible = k > 0.01; });
  if (s.bee) { const vis = g < LN(1); s.bee.visible = vis; if (vis) { const a = g * 1.3; s.bee.position.set(0.05 + Math.cos(a) * 0.35, 1.05 + Math.sin(a * 2.1) * 0.08, 0.05 + Math.sin(a) * 0.3); s.bee.rotation.y = -a; s.bee.userData.flap(g); } }
  actCast(s, g, t);
  s.itemS = items.map(m => toScreen(m.getWorldPosition(new THREE.Vector3()), s.stage.camera)); if (s.bee) s.beeS = toScreen(s.bee.position.clone(), s.stage.camera);
}
function roomOverlay(g, t, info, s) {
  const G = info.globalT;
  if (s.part === 'start') { if (s.beeS) burst(g, G, LN(1), s.beeS[0], s.beeS[1], HONEY, 12, 90); s.itemS?.forEach((p, i) => burst(g, G, FOOD_OFF() + i * 0.35, p[0], p[1], '#fff6d8', 12, 100)); }
  if (s.part === 'end') s.itemS?.forEach((p, i) => burst(g, G, FOOD_ON() + i * 0.35, p[0], p[1], '#fff6d8', 12, 100));
  lab(g, G, 'THE TOAST STAYS', LN(4, 0.3), LN(5, 0.5), E.W * 0.5, 150, { size: 62, color: CREAM });
  lab(g, G, 'THE DELIVERY SERVICE OF THE PLANET', LN(107, 0.3), LN(108), E.W * 0.5, 150, { size: 56 });
  if (G > LN(109)) endScreen(g, G - LN(109));
}
function endScreen(g, t) {
  const k = ease.outBack(clamp(t / 0.5)); g.save(); g.translate(E.W * 0.5, E.vertical ? VY0 : E.H * 0.2); g.scale(k, k);
  rr(g, -230, -60, 460, 120, 60); g.fillStyle = '#e8322e'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#1a0d12'; g.stroke();
  text(g, 'SUBSCRIBE', 0, 18, { size: 64, color: '#ffffff', font: FONTS.ui, weight: 900 }); g.restore();
  if (t > 3.4) kText(g, t - 3.4, 'WHICH ANIMAL SHOULD DISAPPEAR NEXT?', E.W / 2, E.vertical ? VY0 + 150 : E.H * 0.36, { start: 0.05, mode: 'drop', size: vSize('WHICH ANIMAL SHOULD DISAPPEAR NEXT?', 52), color: GOLD, glow: 20 });
}

// ================= MEADOW (meadow · orchard · farm · cacao) =================
const OUT = {   // outdoor framings around the cast (Pip x -0.8, Ink x 0.75, z ~ 1)
  two: { pos: [0.05, 1.4, 4.4], look: [0.0, 0.85, -2.5], fov: 38, lens: [4.2, 7] }, pip: { pos: [-0.3, 1.3, 4.0], look: [-0.8, 1.1, 0.6], fov: 34, lens: [3.0, 10] },
  ink: { pos: [1.2, 1.3, 3.9], look: [0.75, 1.1, 0.5], fov: 34, lens: [3.1, 10] }, two2: { pos: [-1.4, 1.2, 4.0], look: [0.3, 0.95, -1.0], fov: 36, lens: [4.2, 8] },
};
const MF = {
  wide: { pos: [0.4, 2.6, 8.5], look: [0.2, 0.6, -5], fov: 40, lens: [10, 0] }, wide2: { pos: [-1.5, 1.8, 7.0], look: [0.4, 0.7, -5], fov: 38, lens: [8, 3] },
  low: { pos: [-2.4, 0.45, 2.6], look: [-0.6, 0.45, -3.5], fov: 38, lens: [2.5, 12] }, hive: { pos: [1.4, 1.1, 1.2], look: [2.6, 0.8, -1.6], fov: 36, lens: [3.0, 10] },
  sky: { pos: [0.4, 0.6, 3.6], look: [0.0, 2.4, -8], fov: 42, lens: [10, 0] },
};
const ORF = { ladder: { pos: [-0.8, 1.9, 0.45], look: [-1.9, 1.75, -1.6], fov: 38, lens: [2.3, 10] }, ladder2: { pos: [1.4, 1.9, 0.4], look: [2.3, 1.75, -1.6], fov: 38, lens: [2.3, 10] },
  rows: { pos: [0.3, 2.2, 6.5], look: [0.0, 1.3, -6], fov: 40, lens: [8, 3] }, blossom: { pos: [0.3, 1.8, 1.4], look: [-1.5, 2.2, -1.8], fov: 34, lens: [3.6, 10] } };
const FAF = { cows: { pos: [0.4, 1.4, 3.6], look: [0.2, 0.7, -5.0], fov: 38, lens: [7, 4] }, cotton: { pos: [1.9, 1.0, 2.9], look: [2.7, 0.55, 0.6], fov: 34, lens: [2.5, 12] }, clover: { pos: [-2.2, 0.55, 3.2], look: [-1.2, 0.35, -2.0], fov: 38, lens: [3, 10] } };
const CAF = { tree: { pos: [-0.2, 1.4, 2.5], look: [1.2, 1.2, -1.2], fov: 36, lens: [3.8, 8] }, pods: { pos: [0.85, 1.15, 0.25], look: [1.3, 1.05, -1.2], fov: 34, lens: [1.5, 14] }, midge: { pos: [0.55, 1.05, -0.2], look: [0.8, 1.0, -0.75], fov: 30, lens: [0.6, 16] } };
function meadowPick(p) { return (g, i, who) => {
  const cast = who === 'PIP' ? OUT.pip : who === 'INK' ? (i % 2 ? OUT.two2 : OUT.ink) : OUT.two;
  if (p.mode === 'meadow') { if (p.part === 'title') { if (g < LN(9)) return [MF.wide, MF.wide2, MF.low][i % 3]; if (win(g, LN(10), LN(11))) return MF.low; if (win(g, LN(14), LN(15))) return MF.hive; }
    if (p.part === 'good' && win(g, LN(99), LN(100))) return MF.wide2; if (p.part === 'good' && win(g, LN(101), LN(104))) return [MF.low, MF.hive][i % 2]; return cast; }
  if (p.mode === 'orchard') { if (p.part === 'crops') { if (win(g, LN(41), LN(42)) || win(g, LN(43), LN(44))) return [ORF.rows, ORF.blossom][i % 2]; if (win(g, LN(45), LN(46)) || g > LN(47, 2)) return ORF.blossom; return cast; }
    if (win(g, LN(84), LN(85)) || win(g, LN(86), LN(87))) return [ORF.ladder, ORF.ladder2, ORF.rows][i % 3]; return cast; }
  if (p.mode === 'farm') { if (win(g, LN(66), LN(67)) || win(g, LN(68), LN(69))) return FAF.cows; if (win(g, LN(70), LN(71))) return FAF.cotton; if (win(g, LN(72), LN(73))) return [FAF.clover, OUT.two][i % 2]; return cast; }
  if (p.mode === 'cacao') { if (win(g, LN(78), LN(79))) return [CAF.pods, CAF.midge][i % 2]; if (win(g, LN(80), LN(81))) return CAF.pods; if (win(g, LN(76), LN(77))) return CAF.tree; return who === 'INK' ? { ...OUT.ink, pos: [0.4, 1.3, 3.6], look: [0.0, 1.1, 0.4] } : cast; }
  return cast; }; }
const CASTPOS = { meadow: { pip: [-0.8, 1.1], ink: [0.75, 0.9] }, orchard: { pip: [-0.8, 1.2], ink: [0.75, 1.0] }, farm: { pip: [-0.8, 1.1], ink: [0.75, 0.9] }, cacao: { pip: [-1.0, 1.0], ink: [0.0, 0.8] } };
const FARMER1 = { top: 'tshirt', color: '#d8a040', head: 'cap', headColor: '#3a6a9a' }, FARMER2 = { top: 'dress', color: '#6aa0d8', head: 'bun', headColor: '#2a1a1a' };
const BEES_OFF = () => LE(8, 0.2), BEES_ON = () => LN(99, 0.6);
function buildMeadow(p) {
  const mode = p.mode || 'meadow';
  const W = W3.inkWorld({ look: 'day', fov: 38, fog: [25, 160], bloom: 0.5, exposure: 1.45, sky: mode === 'cacao' ? ['#4a8ad0', '#b8e0d0'] : undefined });
  const m = meadow3d(W, { mode }); const s = { stage: W, m, mode, part: p.part, ...castCards(W, { ...CASTPOS[mode], rim: '#fff1dc' }) };
  if (mode === 'orchard' && p.part === 'human') { s.farmers = [[FARMER1, -1.9, -1.35, 1.0], [FARMER2, 2.3, -1.35, 0.85]].map(([o, x, z, y]) => { const c = W3.card(W, o, { x, z: z - 0.08, outline: '#241726', rimColor: '#fff1dc', s: 0.9 }); c.group.position.y = m.h(x, z) + y; return c; }); }
  return s;
}
function meadowDraw(s, t, info) {
  const g = info.globalT, m = s.m; s.F ||= framings(info.shot.start, info.shot.end, meadowPick(info));
  if (s.mode === 'meadow' && s.part === 'title' && !s.F.fixed) { s.F[0] = [0, { pos: [0.6, 4.2, 12], look: [0.2, 0.6, -5], fov: 40, lens: [12, 0], creep: false }]; s.F.splice(1, 0, [0.05, { ...MF.wide, m: 2.2 }]); s.F.fixed = 1; }
  CAM_PUSH = s.mode === 'meadow' && g < LN(9) ? 1.3 : 1; applyCam(s.stage, camState(s.F, t)); CAM_PUSH = 1;
  // bees: present in the title meadow until they vanish, gone in the "no bees" world, back for the good news
  const beesOn = s.mode === 'meadow' ? (s.part === 'title' ? g < BEES_OFF() : g > BEES_ON()) : s.mode === 'farm' ? false : s.mode === 'orchard' ? s.part === 'crops' && g < LN(47, 4) : false;
  const centre = s.mode === 'meadow' ? [[-2.5, 0.75, -1.5], [2.5, 0.75, -1.2], [0, 0.85, -3.5], [2.6, 1.3, -1.6]] : [[-1.9, 2.1, -1.9], [2.3, 2.1, -1.9]];
  m.bees.forEach((b, i) => { b.visible = beesOn; if (beesOn) flyBee(b, g, i, centre[i % centre.length], 0.9 + (i % 3) * 0.4); });
  if (s.mode === 'meadow') s.beeS = m.bees.map(b => toScreen(b.position.clone(), s.stage.camera));
  if (m.petals) m.petals(g, s.part === 'crops' ? clamp((g - LN(47, 1)) / 2) * 0.9 + 0.1 : 0.15);
  if (m.cows.length) m.cows.forEach((c, i) => { const [x, z] = c.userData.base; const gone = i >= 2 && g > LN(68, 0.4 + (i - 2) * 0.4); const k = gone ? 1 - ease.in(clamp((g - LN(68, 0.4 + (i - 2) * 0.4)) / 0.25)) : 1; c.scale.set(2.0 * k + 0.001, 1.25 * k + 0.001, 1); c.position.y = m.h(x, z) + 0.6 + Math.abs(Math.sin(g * 1.3 + i)) * 0.02; });
  if (s.mode === 'farm') s.cowS = m.cows.map(c => toScreen(c.position.clone(), s.stage.camera));
  if (m.midge) { m.midge.position.set(0.8 + Math.sin(g * 2.3) * 0.04, 1.0 + Math.sin(g * 3.1) * 0.03, -0.75); s.midgeS = toScreen(m.midge.position.clone(), s.stage.camera); }
  if (s.farmers) s.farmers.forEach((c, i) => { const ph = g * 1.4 + i * 2; c.set({ pose: breathe(posesAt(ph % 2, [[0, POSES.reach], [1, POSES.pointUp]]), g, 1, 5 + i), expr: 'determined', talk: 0, facing: i ? -1 : 1, blink: W3.blinkAt(g, 7 + i) }); });
  if (s.farmers) s.handS = s.farmers.map(c => toScreen(c.group.position.clone().add(new THREE.Vector3(0, 1.45, 0)), s.stage.camera));
  actCast(s, g, t, 0);
}
function meadowOverlay(g, t, info, s) {
  const G = info.globalT;
  if (s.mode === 'meadow') {
    if (s.part === 'title') { if (win(G, LN(6, 0.2), LN(7, 0.3))) { const k = ease.outBack(clamp((G - LN(6, 0.3)) / 0.5)), sc = k * (E.vertical ? 0.78 : 1); g.save(); g.translate(E.W / 2, E.vertical ? E.H * 0.3 : E.H * 0.42); g.scale(sc, sc); text(g, 'WHAT IF ALL THE BEES', 0, -40, { size: 104, color: CREAM, font: FONTS.ui, weight: 900 }); text(g, 'DISAPPEARED?', 0, 70, { size: 128, color: GOLD, font: FONTS.ui, weight: 900 }); g.restore(); }
      s.beeS?.forEach((p, i) => burst(g, G, BEES_OFF() + (i % 5) * 0.06, p[0], p[1], HONEY, 10, 70));
      lab(g, G, 'SILENCE', LN(10, 0.2), LN(11), E.W * 0.5, 150, { size: 72, color: CREAM });
      lab(g, G, '20,000+ KINDS OF BEES', LN(12, 0.5), LN(13, 1.5), E.W * 0.5, 150, { size: 64 }); lab(g, G, 'HONEYBEE = JUST ONE', LN(12, 3.0), LN(13, 1.5), E.W * 0.5, 225, { size: 50, color: CREAM });
      lab(g, G, 'MOST LIVE ALONE', LN(14, 0.3), LN(15), E.W * 0.5, 150, { size: 64 }); lab(g, G, 'NO HIVE · NO HONEY', LN(14, 2.5), LN(15), E.W * 0.5, 225, { size: 50, color: CREAM }); }
    if (s.part === 'good') { s.beeS?.forEach((p, i) => burst(g, G, BEES_ON() + (i % 5) * 0.06, p[0], p[1], HONEY, 10, 70));
      lab(g, G, 'MANY KINDS ARE IN TROUBLE', LN(99, 1.5), LN(100), E.W * 0.5, 150, { size: 58, color: CORAL });
      lab(g, G, 'PLANT FLOWERS', LN(101, 0.6), LN(102), E.W * 0.5, 130, { size: 58, color: MINT }); lab(g, G, 'LEAVE A WILD CORNER', LN(101, 1.6), LN(102), E.W * 0.5, 200, { size: 54, color: MINT }); lab(g, G, 'LET DANDELIONS GROW', LN(101, 2.8), LN(102), E.W * 0.5, 270, { size: 50, color: MINT });
      lab(g, G, 'ONE FLOWER POT HELPS', LN(103, 0.2), LN(104), E.W * 0.5, 150, { size: 60, color: MINT }); }
  }
  if (s.mode === 'orchard' && s.part === 'crops') {
    lab(g, G, '87 OF THE 115 TOP CROPS', LN(41, 2.2), LN(42, 1.2), E.W * 0.5, 150, { size: 64 }); lab(g, G, 'NEED ANIMAL POLLINATORS', LN(41, 3.0), LN(42, 1.2), E.W * 0.5, 225, { size: 50, color: CREAM });
    if (win(G, LN(43), LN(43, 4.6))) cropRow(g, G - LN(43));
    lab(g, G, '61% OF RENTED US HIVES → ALMONDS', LN(43, 5.0), LN(44, 1.5), E.W * 0.5, 150, { size: 54 });
    lab(g, G, 'BUZZ POLLINATION', LN(45, 3.5), LN(46, 1.2), E.W * 0.5, 150, { size: 66, color: HONEY });
    lab(g, G, 'GREENHOUSE TOMATOES: BUMBLEBEES', LN(47, 1.0), LN(47, 6), E.W * 0.5, 150, { size: 52, color: CREAM });
  }
  if (s.mode === 'orchard' && s.part === 'human') {
    s.handS?.forEach((p, i) => { const per = 1.43, t0 = G - ((G + i * 0.7) % per); burst(g, G, t0, p[0], p[1], HONEY, 8, 50); });
    lab(g, G, 'SICHUAN, CHINA', LN(84, 1.5), LN(85), E.W * 0.5, 130, { size: 62 }); lab(g, G, 'POLLINATED BY HAND', LN(84, 2.6), LN(85), E.W * 0.5, 205, { size: 56, color: CREAM });
    lab(g, G, 'ONE PERSON: A FEW TREES A DAY', LN(86, 3.5), LN(87), E.W * 0.5, 150, { size: 56, color: CORAL });
    lab(g, G, 'ONE HIVE: 1,000,000+ FLOWERS A DAY', LN(88, 0.4), LN(89), E.W * 0.5, 150, { size: 56, color: HONEY });
    if (win(G, LN(90, 1.2), LN(91, 0.4))) infoCard(g, G - LN(90, 1.2), ['VANILLA', '1841 · RÉUNION', 'EDMOND ALBIUS, AGE 12'], 'vanilla');
    if (win(G, LN(94, 0.2), LN(96, 0.3))) infoCard(g, G - LN(94, 0.2), ['ROBOT BEE', 'UNDER 0.1 GRAM', 'NEEDS A POWER WIRE'], 'robot');
    lab(g, G, 'WE WOULD NEED BILLIONS', LN(96, 1.5), LN(97, 0.4), E.W * 0.5, 150, { size: 58, color: CORAL });
  }
  if (s.mode === 'farm') {
    lab(g, G, 'CLOVER + ALFALFA = COW FOOD', LN(66, 0.6), LN(67), E.W * 0.5, 150, { size: 58 }); lab(g, G, 'THEIR SEEDS NEED BEES', LN(66, 3.0), LN(67), E.W * 0.5, 225, { size: 50, color: CREAM });
    s.cowS?.forEach((p, i) => { if (i >= 2) burst(g, G, LN(68, 0.4 + (i - 2) * 0.4), p[0], p[1], '#fff6d8', 12, 110); });
    lab(g, G, 'LESS MILK · CHEESE · ICE CREAM', LN(68, 0.2), LN(69, 1.0), E.W * 0.5, 150, { size: 58, color: CORAL });
    lab(g, G, 'MORE BEES = MORE COTTON', LN(70, 0.5), LN(71, 1.2), E.W * 0.5, 150, { size: 60 });
    lab(g, G, 'NO POLLINATORS:', LN(72, 4.0), LN(73, 0.4), E.W * 0.5, 130, { size: 52, color: CREAM }); lab(g, G, '~1.4 MILLION EXTRA DEATHS A YEAR', LN(72, 5.0), LN(73, 0.4), E.W * 0.5, 205, { size: 54, color: CORAL }); lab(g, G, '(MODEL · WORSE DIETS)', LN(72, 5.6), LN(73, 0.4), E.W * 0.5, 270, { size: 38, color: CREAM });
    lab(g, G, 'BREAD = FULL · FRUIT = STRONG', LN(74, 0.6), LN(74, 5), E.W * 0.5, 150, { size: 56, color: MINT });
  }
  if (s.mode === 'cacao') {
    lab(g, G, 'CHOCOLATE: NO BEES NEEDED', LN(76, 0.2), LN(77, 1.0), E.W * 0.5, 150, { size: 62, color: MINT, mode: 'slam' });
    if (s.midgeS && win(G, LN(78, 2), LN(80)) && s.stage.camera.position.distanceTo(s.m.midge.position) < 1.2) { lab(g, G, 'MIDGE · ~1 MM', LN(78, 3.0), LN(80), Math.min(E.W - 260, s.midgeS[0] + 40), s.midgeS[1] - 120, { size: 52, color: CREAM, anchor: E.vertical ? 0 : 1 }); }
    lab(g, G, '3 IN 1,000 FLOWERS → POD', LN(80, 1.2), LN(81, 1.5), E.W * 0.5, 150, { size: 60, color: HONEY });
  }
}
function cropRow(g, t) {
  const names = ['APPLES', 'CHERRIES', 'ALMONDS', 'BLUEBERRIES', 'PUMPKINS', 'MELONS', 'AVOCADOS'], cols = ['#e0403a', '#b0182a', '#b07a4a', '#4a5ac8', '#f08a2a', '#c8d860', '#4a7a2a'];
  const n = names.length, vert = E.vertical, cw = vert ? 300 : 240, x0 = vert ? E.W / 2 - cw : E.W / 2 - (n - 1) * cw / 2, y = vert ? VY0 - 40 : 150;
  for (let i = 0; i < n; i++) { const k = ease.outBack(clamp((t - i * 0.55) / 0.35)); if (k <= 0) continue; const x = vert ? x0 + (i % 2) * cw * 2 : x0 + i * cw, yy = vert ? y + Math.floor(i / 2) * 130 : y; g.save(); g.translate(x, yy); g.scale(k, k);
    g.fillStyle = cols[i]; g.strokeStyle = '#1a0d12'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fill(); g.stroke(); text(g, names[i], 0, 76, { size: 34, color: CREAM, font: FONTS.ui, weight: 900 }); g.restore(); }
}
function infoCard(g, t, lines, icon) {
  const k = ease.outBack(clamp(t / 0.4)), w = 720, h = 250, x = E.vertical ? E.W / 2 - w / 2 : E.W * 0.62 - w / 2, y = E.vertical ? VY0 - 80 : 90;
  g.save(); g.translate(x + w / 2, y + h / 2); g.scale(k, k); g.translate(-x - w / 2, -y - h / 2);
  card2d(g, x, y, w, h, () => {
    text(g, lines[0], x + w / 2 + 70, y + 80, { size: 64, color: GOLD, font: FONTS.ui, weight: 900 }); text(g, lines[1], x + w / 2 + 70, y + 145, { size: 40, color: CREAM, font: FONTS.ui, weight: 800 }); text(g, lines[2], x + w / 2 + 70, y + 200, { size: 36, color: CREAM, font: FONTS.ui, weight: 800 });
    if (icon === 'vanilla') { g.save(); g.translate(x + 110, y + h / 2); g.strokeStyle = '#1a0d12'; g.lineWidth = 6; g.fillStyle = '#f6f0c8'; for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.ellipse(0, -38, 18, 36, 0, 0, 7); g.fill(); g.stroke(); g.restore(); } g.fillStyle = '#ffd040'; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill(); g.stroke(); g.restore(); }
    else { bee2d(g, x + 110, y + h / 2, 1.2, t); g.save(); g.strokeStyle = '#9aa4b8'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 150, y + h / 2 + 10); g.bezierCurveTo(x + 190, y + h - 20, x + 120, y + h - 10, x + 170, y + h); g.stroke(); g.restore(); }
  }); g.restore();
}

// ================= FLOWER (macro) + COMB =================
const FLF = { a: { pos: [0.0, 2.0, 2.7], look: [0, 1.3, 0], fov: 36, lens: [2.8, 10] }, b: { pos: [1.9, 1.7, 1.9], look: [0, 1.3, 0], fov: 36, lens: [2.7, 10] }, c: { pos: [0.5, 1.75, 1.3], look: [0.05, 1.4, 0], fov: 34, lens: [1.4, 14] }, d: { pos: [-1.8, 1.5, 2.1], look: [0, 1.35, 0], fov: 36, lens: [2.8, 10] } };
const CBF = [{ pos: [0, 1.6, 3.3], look: [0, 1.6, -0.2], fov: 38, lens: [3.5, 6] }, { pos: [0.7, 1.4, 1.7], look: [0.4, 1.6, -0.2], fov: 36, lens: [1.9, 12] }, { pos: [-0.9, 1.9, 2.1], look: [-0.2, 1.5, -0.2], fov: 36, lens: [2.3, 10] }];
function buildFlower(p) {
  const comb = p.mode === 'comb';
  const W = W3.inkWorld({ look: comb ? 'golden' : 'day', fov: 36, fog: comb ? [8, 40] : [12, 80], bloom: 0.55, exposure: comb ? 1.5 : 1.45, sky: comb ? ['#5a3a1a', '#a8702a'] : ['#5a9ae0', '#d8ecf8'] });
  const f = flower3d(W, { mode: comb ? 'comb' : 'flower' }); const s = { stage: W, f, comb };
  if (comb) s.walk = f.bees.map(b => { const w = new THREE.Group(); W.scene.remove(b); b.rotation.x = Math.PI / 2; w.add(b); W.scene.add(w); return w; });
  return s;
}
// bee path on the giant flower: in from the left, land, sit, fly off to the right
function flowerBee(g) {
  const a = LN(18, 2.5), land = LN(20, 0.5), off = LN(26, 1.2);
  if (g < a) return null;
  if (g < land) { const u = ease.inOut(clamp((g - a) / (land - a))); return { p: [lerp(-3.5, 0.02, u), lerp(2.6, 1.52, u) + Math.sin(u * 9) * 0.08 * (1 - u), lerp(1.2, 0.05, u)], yaw: 0, fly: 1 }; }
  if (g < off) { const w = g - land; return { p: [0.02 + Math.sin(w * 0.9) * 0.06, 1.52, 0.05 + Math.cos(w * 0.9) * 0.05], yaw: -w * 0.9, fly: 0.15 }; }
  const u = ease.in(clamp((g - off) / 1.8)); return { p: [lerp(0.02, 4.5, u), lerp(1.52, 2.8, u), lerp(0.05, -0.5, u)], yaw: Math.PI, fly: 1 };
}
function flowerDraw(s, t, info) {
  const g = info.globalT; s.F ||= framings(info.shot.start, info.shot.end, (gg, i) => s.comb ? CBF[i % 3] : (win(gg, LN(20), LN(24)) ? [FLF.c, FLF.b][i % 2] : [FLF.a, FLF.b, FLF.d][i % 3]));
  CAM_PUSH = 1.25; applyCam(s.stage, camState(s.F, t)); CAM_PUSH = 1;
  if (s.comb) { combDraw(s, g); return; }
  const f = s.f, st = flowerBee(g); f.bee.visible = !!st;
  if (st) { f.bee.position.set(...st.p); f.bee.rotation.set(0, st.yaw, 0); f.bee.userData.flap(g, st.fly); }
  const stick = clamp((g - LN(20, 1.2)) / 4);
  f.pollen(st ? f.bee : null, g > LN(26, 1.2) ? stick : stick, g);
  const uv = clamp((g - LN(24, 2.2)) / 0.5) * (1 - clamp((g - LN(26, 0.5)) / 0.6));
  f.petalMats.forEach(m => { m.map = uv > 0.5 ? f.uvTex[1] : f.uvTex[0]; m.needsUpdate = true; }); f.glow.material.opacity = uv;
  f.F.rotation.z = Math.sin(g * 0.7) * 0.03;
  s.beeS = st ? toScreen(f.bee.position.clone(), s.stage.camera) : null;
}
// waggle dance: straight wiggle run, then a half-loop back (alternating sides)
function waggle(g) { const P = 3.2, t = ((g % P) + P) % P, n = Math.floor(g / P), A = [-0.25, 1.15], ang = 1.25, L = 0.75, B = [A[0] + Math.cos(ang) * L, A[1] + Math.sin(ang) * L];
  if (t < 1.4) { const u = t / 1.4, w = Math.sin(t * 80) * 0.035; return [lerp(A[0], B[0], u) - Math.sin(ang) * w, lerp(A[1], B[1], u) + Math.cos(ang) * w, ang, true]; }
  const u = (t - 1.4) / 1.8, side = n % 2 ? 1 : -1, cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2, a0 = ang, th = a0 + side * Math.PI * u; return [cx + Math.cos(th) * L / 2, cy + Math.sin(th) * L / 2, th + side * Math.PI / 2, false]; }
function combDraw(s, g) {
  s.walk.forEach((w, i) => { const b = w.children[0]; let x, y, a;
    if (i === 0) { const [wx, wy, wa] = waggle(g); x = wx; y = wy; a = wa; }
    else { const r = 0.25 + (i % 4) * 0.12, c = [((i * 0.73) % 1 - 0.5) * 5.5, 0.4 + ((i * 0.41) % 1) * 2.4], ph = g * (0.25 + (i % 3) * 0.08) * (i % 2 ? 1 : -1) + i; x = c[0] + Math.cos(ph) * r; y = c[1] + Math.sin(ph) * r * 0.7; a = ph + (i % 2 ? Math.PI / 2 : -Math.PI / 2); if (Math.hypot(x + 0.0, y - 1.5) < 0.75) x += 1.6 * Math.sign(x || 1); }
    w.position.set(x, y, -0.12); w.rotation.set(0, 0, a + Math.PI); b.userData.flap(g + i, i === 0 && waggle(g)[3] ? 0.5 : 0.05); });
  const d = s.walk[0].position; s.dancerS = toScreen(d.clone(), s.stage.camera);
}
function flowerOverlay(g, t, info, s) {
  const G = info.globalT;
  if (!s.comb) {
    lab(g, G, 'POLLEN → ANOTHER FLOWER', LN(18, 2.6), LN(19), E.W * 0.5, 150, { size: 62 });
    lab(g, G, 'NECTAR = PAYMENT', LN(20, 0.6), LN(20, 4.5), E.W * 0.5, 150, { size: 60, color: HONEY }); lab(g, G, 'POLLINATION', LN(20, 5.0), LN(21, 0.8), E.W * 0.5, 150, { size: 72, color: MINT, mode: 'slam' });
    lab(g, G, 'STATIC ELECTRICITY', LN(22, 1.8), LN(23, 1.2), E.W * 0.5, 150, { size: 64, color: SKY });
    if (s.beeS && win(G, LN(22, 2), LN(23, 1))) { g.save(); g.strokeStyle = SKY; g.lineWidth = 5; for (let k = 0; k < 5; k++) { const a = k * 1.3 + G * 3, r1 = 70, r2 = 110 + Math.sin(G * 9 + k) * 12; g.beginPath(); g.moveTo(s.beeS[0] + Math.cos(a) * r1, s.beeS[1] + Math.sin(a) * r1); g.lineTo(s.beeS[0] + Math.cos(a + 0.2) * (r1 + r2) / 2, s.beeS[1] + Math.sin(a + 0.2) * (r1 + r2) / 2); g.lineTo(s.beeS[0] + Math.cos(a) * r2, s.beeS[1] + Math.sin(a) * r2); g.stroke(); } g.restore(); }
    lab(g, G, 'BEE VISION: ULTRAVIOLET', LN(24, 2.3), LN(25, 1.2), E.W * 0.5, 150, { size: 62, color: '#c8a0ff' }); lab(g, G, 'HIDDEN LANDING LIGHTS', LN(24, 4.0), LN(25, 1.2), E.W * 0.5, 225, { size: 50, color: CREAM });
  } else {
    lab(g, G, '1/12 TEASPOON', LN(28, 2.6), LN(29, 1.2), E.W * 0.5, 150, { size: 68, color: HONEY }); lab(g, G, 'PER BEE, PER LIFETIME', LN(28, 3.4), LN(29, 1.2), E.W * 0.5, 225, { size: 50, color: CREAM });
    lab(g, G, 'A JAR = HUNDREDS OF BEES', LN(30, 0.6), LN(31), E.W * 0.5, 150, { size: 60 });
    lab(g, G, 'HONEY FROM EGYPTIAN TOMBS', LN(32, 3.0), LN(33, 1.0), E.W * 0.5, 150, { size: 58 }); lab(g, G, 'THOUSANDS OF YEARS OLD', LN(32, 4.0), LN(33, 1.0), E.W * 0.5, 225, { size: 50, color: CREAM });
    if (s.dancerS && win(G, LN(36, 1.5), LN(38))) { lab(g, G, 'THE WAGGLE DANCE', LN(36, 1.5), LN(38), E.W * 0.5, 130, { size: 62, color: HONEY }); lab(g, G, 'ANGLE = DIRECTION · WIGGLE = DISTANCE', LN(36, 5.0), LN(38), E.W * 0.5, 205, { size: 44, color: CREAM }); }
    if (win(G, LN(38, 1.0), LN(39, 2.2))) infoCardSimple(g, G - LN(38, 1.0), 'NOBEL PRIZE 1973', 'KARL VON FRISCH');
  }
}
function infoCardSimple(g, t, a, b) { const w = 660, h = 160, x = E.W / 2 - w / 2, y = E.vertical ? VY0 + 200 : E.H - 300; const k = ease.outBack(clamp(t / 0.4)); g.save(); g.translate(E.W / 2, y + h / 2); g.scale(k, k); g.translate(-E.W / 2, -y - h / 2);
  card2d(g, x, y, w, h, () => { text(g, a, E.W / 2, y + 70, { size: 56, color: GOLD, font: FONTS.ui, weight: 900 }); text(g, b, E.W / 2, y + 125, { size: 40, color: CREAM, font: FONTS.ui, weight: 800 }); }); g.restore(); }

// ================= MARKET =================
const MKF = { two: { pos: [0.0, 1.5, 3.6], look: [0.0, 1.1, -2.6], fov: 38, lens: [3.8, 7] }, pip: { pos: [-0.4, 1.35, 2.7], look: [-0.9, 1.15, -0.6], fov: 34, lens: [3.0, 10] },
  ink: { pos: [1.3, 1.35, 2.6], look: [0.9, 1.15, -0.7], fov: 34, lens: [3.0, 10] }, crates: { pos: [-0.7, 1.85, -1.05], look: [-0.8, 0.85, -2.7], fov: 40, lens: [1.9, 10] }, crates2: { pos: [0.8, 1.8, -1.1], look: [0.6, 0.85, -2.7], fov: 40, lens: [1.9, 10] },
  poster: { pos: [-1.5, 2.0, -1.2], look: [-2.4, 2.25, -4.0], fov: 36, lens: [2.9, 8] }, wide: { pos: [0.6, 1.9, 5.0], look: [0.0, 1.3, -3.0], fov: 40, lens: [5, 4] } };
const mkPick = (g, i, who) => { if (win(g, LN(49, 1.5), LN(50)) || win(g, LN(51), LN(52)) || win(g, LN(53), LN(57))) return [MKF.crates, MKF.crates2][i % 2]; if (win(g, LN(59, 1.5), LN(61)) ) return MKF.poster; if (win(g, LN(62), LN(63))) return MKF.wide;
  return who === 'PIP' ? MKF.pip : who === 'INK' ? (i % 2 ? MKF.two : MKF.ink) : MKF.two; };
const EMPTY_AT = () => LN(49, 4.5);
function buildMarket() { const W = W3.inkWorld({ look: 'day', fov: 38, fog: [20, 120], bloom: 0.5, exposure: 1.45 }); const mk = market3d(W); return { stage: W, mk, ...castCards(W, { pip: [-0.95, -0.55], ink: [0.95, -0.7], rim: '#fff1dc' }) }; }
function marketDraw(s, t, info) {
  const g = info.globalT; s.F ||= framings(info.shot.start, info.shot.end, mkPick); applyCam(s.stage, camState(s.F, t));
  s.mk.crates.forEach((c, i) => { if (!c.beeDep) { c.set(1); return; } const t0 = EMPTY_AT() + i * 0.45; c.set(lerp(1, 0.38, ease.inOut(clamp((g - t0) / 1.2)))); });
  s.crateS = s.mk.crates.map(c => toScreen(c.group.position.clone().add(new THREE.Vector3(0, 0.3, 0)), s.stage.camera));
  s.posterS = toScreen(s.mk.poster.position.clone(), s.stage.camera);
  actCast(s, g, t);
}
function marketOverlay(g, t, info, s) {
  const G = info.globalT;
  s.crateS?.forEach((p, i) => { if (s.mk.crates[i].beeDep) burst(g, G, EMPTY_AT() + i * 0.45, p[0], p[1], '#fff6d8', 10, 80); });
  lab(g, G, 'ABOUT 1/5 OF THE FRUIT', LN(49, 5.0), LN(50, 1.5), E.W * 0.5, 150, { size: 64, color: CORAL });
  if (win(G, LN(51, 0.6), LN(52, 1.6))) statCard(g, G - LN(51, 0.6));
  lab(g, G, 'COFFEE: BEES = MORE BEANS', LN(55, 1.8), LN(56, 1.0), E.W * 0.5, 150, { size: 58, color: CREAM });
  lab(g, G, 'SHELVES: NOT EMPTY · PRICES: UP', LN(53, 1.8), LN(57), E.W * 0.5, 150, { size: 54 });
  if (win(G, LN(60, 0.2), LN(61, 2))) stamp(g, G, LN(60, 0.3), E.W * 0.2, 190, 'MYTH');
  lab(g, G, 'FIRST SEEN: 1965', LN(60, 3.4), LN(61, 1.5), E.W * 0.68, 150, { size: 58, color: CREAM }); lab(g, G, 'EINSTEIN DIED: 1955', LN(60, 5.0), LN(61, 1.5), E.W * 0.68, 225, { size: 58 });
  lab(g, G, 'WHEAT · RICE · CORN', LN(62, 3.2), LN(63, 1.0), E.W * 0.5, 150, { size: 66 }); lab(g, G, '= POLLINATED BY THE WIND', LN(62, 4.0), LN(63, 1.0), E.W * 0.5, 225, { size: 52, color: SKY });
  lab(g, G, 'MYTH BUSTED', LN(64, 0.2), LN(64, 2.0), E.W * 0.5, 160, { size: 76, color: MINT, mode: 'slam' });
}
function statCard(g, t) { const rows = [['FRUIT', '−23%'], ['VEGETABLES', '−16%'], ['NUTS & SEEDS', '−22%']], w = 640, h = 260, x = E.vertical ? E.W / 2 - w / 2 : E.W * 0.64 - w / 2, y = E.vertical ? VY0 - 60 : 80;
  const k = ease.outBack(clamp(t / 0.4)); g.save(); g.translate(x + w / 2, y + h / 2); g.scale(k, k); g.translate(-x - w / 2, -y - h / 2);
  card2d(g, x, y, w, h, () => rows.forEach(([a, b], i) => { const yy = y + 70 + i * 72; g.globalAlpha = clamp((t - i * 0.6) / 0.3); text(g, a, x + 40, yy, { size: 46, color: CREAM, font: FONTS.ui, weight: 900, align: 'left' }); text(g, b, x + w - 40, yy, { size: 54, color: CORAL, font: FONTS.ui, weight: 900, align: 'right' }); g.globalAlpha = 1; })); g.restore(); }

// ---------- register ----------
for (const shot of E.shots) {
  const p = shot.params || {};
  const reg = (init, draw, overlay) => registerShot(shot.id, { kind: '3d', init: () => init(p), draw, overlay });
  if (shot.kind === 'room') reg(buildRoom, roomDraw, roomOverlay);
  if (shot.kind === 'meadow') reg(buildMeadow, meadowDraw, meadowOverlay);
  if (shot.kind === 'flower') reg(buildFlower, flowerDraw, flowerOverlay);
  if (shot.kind === 'market') reg(buildMarket, marketDraw, marketOverlay);
}
