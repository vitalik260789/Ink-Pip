// Episode 06 — "What If the Dinosaurs Never Went Extinct?" Same grammar as ep03/ep04 (reference-matched):
// long continuous location shots, camera glides (~0.9 s ease-in-out) on every line + every ~2.5 s, constant slow push-in,
// dissolves between locations, story beats keyed to the voice lines (LN(i) = start of line i), vertical-aware (E.vertical).
import { E, registerShot, ease, clamp, lerp, text, rr, alpha, FONTS } from '/engine/core.js';
import { POSES, posesAt, breathe } from '/engine/rig2d.js';
import { kText } from '/engine/motion.js';
import { THREE } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { room3d } from '../sets/room3d.js';
import { cretaceous3d, toyRex, pigeon } from '../sets/dino3d.js';
import { INK, PIP, LINES, talkOf } from '../cast.js';

const GOLD = '#ffd47e', CORAL = '#ff7a4a', MINT = '#7cf2a8', SKY = '#9fd0ff', CREAM = '#fff1dc', WATER = '#6ac8ff';
const LN = (i, d = 0) => LINES[i][1] + d, LE = (i, d = 0) => LINES[i][2] + d;
const sstep = (u) => u * u * u * (u * (u * 6 - 15) + 10);
const toScreen = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * E.W, (1 - p.y) / 2 * E.H, p.z]; };
const win = (g, a, b) => g >= a && g < b;
const ramp = (g, a, b) => sstep(clamp((g - a) / (b - a)));
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
let CAM_PUSH = 1;   // vertical: wide shots pull back a little
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
// time badge (top-left): DAY 1 → WEEKS → MONTHS → YEARS
function badge(g, G, list) { let cur = null; for (const [t, s] of list) if (G >= t) cur = [t, s]; if (!cur) return; const k = ease.outBack(clamp((G - cur[0]) / 0.35)); const x = E.vertical ? E.W / 2 : 190, y = E.vertical ? 318 : 96;
  g.save(); g.translate(x, y); g.scale(k, k); rr(g, -130, -40, 260, 80, 40); g.fillStyle = 'rgba(14,16,40,.78)'; g.fill(); g.lineWidth = 4; g.strokeStyle = alpha(GOLD, 0.8); g.stroke(); text(g, cur[1], 0, 15, { size: 42, color: GOLD, font: FONTS.ui, weight: 900 }); g.restore(); }
function teardrop2d(g, x, y, s, col = WATER) { g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 7; g.strokeStyle = '#1a0d12'; g.fillStyle = col; g.beginPath(); g.moveTo(0, -80); g.bezierCurveTo(30, -30, 52, 0, 52, 26); g.arc(0, 26, 52, 0, Math.PI); g.bezierCurveTo(-52, 0, -30, -30, 0, -80); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-20, 14, 9, 16, 0.4, 0, 7); g.fill(); g.restore(); }

// ---------- characters ----------
function poseOf(spec, t, speaking) { const p = spec?.[1] ?? 'stand'; let pose = POSES[p] || POSES.stand; if (speaking && (p === 'stand' || p === 'relaxed')) pose = posesAt(t, [[0, POSES.stand], [0.3, POSES.talk]]); return pose; }
// per-line acting: [pip [expr, pose], ink [expr, pose]] (default: speaker stand/explain, listener stand)
const A = {
  0: [['joy', 'point'], ['neutral', 'stand']], 1: [['curious', 'stand'], ['smirk', 'pointUp']], 2: [['confused', 'shrug'], ['smirk', 'stand']], 4: [['curious', 'think'], ['neutral', 'stand']], 6: [['joy', 'cheer'], ['smirk', 'crossArms']],
  7: [['joy', 'stand'], ['smirk', 'explain']], 8: [['surprised', 'handsOnHead'], ['smirk', 'stand']], 9: [['nervous', 'stand'], ['smile', 'stand']],
  10: [['awe', 'handsOnHead'], ['smile', 'stand']], 12: [['curious', 'think'], ['neutral', 'stand']], 13: [['curious', 'stand'], ['neutral', 'point']], 14: [['awe', 'point'], ['smile', 'stand']], 16: [['shocked', 'handsOnHead'], ['smirk', 'stand']],
  18: [['curious', 'shrug'], ['neutral', 'stand']], 20: [['angry', 'crossArms'], ['smirk', 'stand']], 21: [['curious', 'stand'], ['neutral', 'point']], 22: [['shocked', 'handsOnHead'], ['smirk', 'stand']], 24: [['nervous', 'stand'], ['neutral', 'stand']],
  26: [['confused', 'shrug'], ['smirk', 'stand']], 28: [['nervous', 'think'], ['smile', 'stand']], 30: [['shocked', 'stand'], ['smirk', 'crossArms']], 31: [['curious', 'pointUp'], ['neutral', 'stand']], 33: [['awe', 'stand'], ['neutral', 'stand']], 35: [['joy', 'cheer'], ['smile', 'stand']],
  37: [['curious', 'think'], ['neutral', 'stand']], 39: [['happy', 'stand'], ['smile', 'stand']], 41: [['joy', 'point'], ['neutral', 'crossArms']], 43: [['surprised', 'stand'], ['neutral', 'stand']], 45: [['confused', 'think'], ['neutral', 'stand']], 47: [['shocked', 'handsOnHead'], ['smirk', 'stand']],
  49: [['worried', 'pointUp'], ['neutral', 'stand']], 51: [['shocked', 'point'], ['neutral', 'stand']], 53: [['shocked', 'handsOnHead'], ['neutral', 'stand']], 55: [['worried', 'stand'], ['neutral', 'stand']], 57: [['sad', 'sad'], ['sad', 'stand']], 59: [['worried', 'stand'], ['sad', 'stand']], 61: [['sad', 'sad'], ['sad', 'stand']], 62: [['curious', 'stand'], ['smirk', 'pointUp']],
  63: [['joy', 'cheer'], ['smile', 'stand']], 65: [['joy', 'cheer'], ['smirk', 'stand']], 66: [['curious', 'stand'], ['neutral', 'explain']],
  67: [['nervous', 'stand'], ['neutral', 'stand']], 69: [['surprised', 'point'], ['smile', 'stand']], 71: [['curious', 'think'], ['neutral', 'stand']], 73: [['nervous', 'crossArms'], ['neutral', 'stand']], 75: [['angry', 'crossArms'], ['smirk', 'stand']], 77: [['joy', 'cheer'], ['smile', 'stand']],
  79: [['surprised', 'handsOnHead'], ['smile', 'stand']], 81: [['curious', 'think'], ['neutral', 'stand']], 83: [['curious', 'stand'], ['neutral', 'stand']], 85: [['worried', 'stand'], ['neutral', 'stand']], 87: [['shocked', 'handsOnHead'], ['smirk', 'stand']],
  89: [['curious', 'stand'], ['neutral', 'stand']], 91: [['nervous', 'crossArms'], ['neutral', 'explain']], 93: [['surprised', 'point'], ['neutral', 'stand']], 95: [['confused', 'shrug'], ['smirk', 'stand']], 97: [['curious', 'think'], ['neutral', 'stand']], 99: [['joy', 'cheer'], ['smirk', 'crossArms']], 101: [['curious', 'shrug'], ['neutral', 'stand']],
  103: [['shocked', 'point'], ['smile', 'stand']], 105: [['curious', 'think'], ['neutral', 'stand']], 107: [['curious', 'stand'], ['neutral', 'stand']], 109: [['joy', 'cheer'], ['smirk', 'stand']], 111: [['happy', 'think'], ['smile', 'stand']], 113: [['happy', 'stand'], ['neutral', 'stand']],
  115: [['happy', 'stand'], ['smile', 'stand']], 117: [['sad', 'sad'], ['neutral', 'stand']], 118: [['sad', 'stand'], ['smirk', 'point']], 119: [['confused', 'shrug'], ['smirk', 'stand']], 121: [['shocked', 'handsOnHead'], ['smirk', 'stand']], 123: [['curious', 'think'], ['neutral', 'stand']],
  127: [['joy', 'cheer'], ['smile', 'stand']], 129: [['joy', 'stand'], ['smirk', 'stand']], 131: [['shocked', 'handsOnHead'], ['smirk', 'crossArms']], 133: [['happy', 'stand'], ['smile', 'stand']], 135: [['happy', 'stand'], ['smile', 'stand']], 136: [['happy', 'wave'], ['smile', 'explain']], 137: [['joy', 'point'], ['smile', 'wave']],
};
const ACT = LINES.map((l, i) => { const a = A[i]; const def = l[0] === 'PIP' ? [['neutral', 'stand'], ['neutral', 'stand']] : [['neutral', 'stand'], ['neutral', 'explain']];
  const p = a ? a[0] : (A[i - 1]?.[0] || def[0]), k = a ? a[1] : def[1]; return [i === 0 ? 0 : LN(i), p, l[0] === 'INK' && !a ? def[1] : k]; });
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

// ================= ROOM (start: night + shooting star + toy T. rex · end: morning + a pigeon on the sill) =================
const RF = {
  wide: { pos: [0.2, 1.45, 3.3], look: [0.25, 1.05, -1.2], fov: 38, lens: [3.6, 6] },
  two: { pos: [0.05, 1.3, 2.8], look: [0.05, 1.0, -0.6], fov: 36, lens: [2.9, 10] },
  window: { pos: [2.0, 1.45, 0.5], look: [1.3, 1.6, -3.0], fov: 38, lens: [3.4, 8] },
  toy: { pos: [0.3, 1.25, 1.55], look: [0.0, 0.85, 0.0], fov: 34, lens: [1.6, 12] },
  sill: { pos: [0.35, 1.25, -1.1], look: [0.8, 1.0, -2.9], fov: 34, lens: [1.9, 12] },
  pip: { pos: [-0.25, 1.3, 2.4], look: [-0.55, 1.2, -0.2], fov: 34, lens: [2.6, 12] },
  pip2: { pos: [-0.05, 1.22, 2.55], look: [-0.5, 1.15, -0.3], fov: 35, lens: [2.8, 11] },
  ink: { pos: [1.1, 1.32, 2.3], look: [0.72, 1.2, -0.45], fov: 34, lens: [2.6, 12] },
  ink2: { pos: [0.55, 1.28, 2.6], look: [0.6, 1.15, -0.5], fov: 35, lens: [3.0, 10] },
};
const roomPick = (g, i, who) => (win(g, LN(0), LN(2)) || win(g, LN(118), LN(119, 0.5)) || win(g, LN(133, 1.5), LN(134))) ? RF.window
  : (win(g, LN(5), LN(6)) || win(g, LN(9), LN(10))) ? RF.toy : (win(g, LN(119), LN(122)) || win(g, LN(124, 2), LN(125)) || win(g, LN(131), LN(132, 0.8))) ? RF.sill
  : who === 'PIP' ? (i % 2 ? RF.pip2 : RF.pip) : who === 'INK' ? (i % 3 === 2 ? RF.two : i % 2 ? RF.ink2 : RF.ink) : RF.two;
const PIGEON_IN = () => LN(118, 0.4), PIGEON_OUT = () => LN(134, 0.5);
function buildRoom(p) {
  const night = p.part === 'start';
  const W = W3.inkWorld({ look: night ? 'night' : 'golden', fov: 38, fog: [14, 60], bloom: 0.5, exposure: night ? 1.6 : 1.62 });
  const room = room3d(W, { night, foreground: [-0.72, 1.6] });
  if (!night) { const fill = new THREE.PointLight('#ffe8d0', 7, 9, 1.2); fill.position.set(-0.4, 2.6, 1.8); W.scene.add(fill); }
  const toy = toyRex(W, 0.02, 0.05);
  const s = { stage: W, room, toy, ...castCards(W), part: p.part };
  if (!night) { s.bird = pigeon(1.0); s.bird.position.set(0.8, 0.92, -2.88); s.bird.rotation.y = 0.5; W.scene.add(s.bird); }
  return s;
}
function roomFram(p, a, b) {
  const F = framings(a, b, roomPick, []);
  if (p.part === 'start') F[0] = [0, { ...RF.wide }];
  if (p.part === 'end') { F[0] = [0, { ...RF.wide }]; const j = F.findIndex(x => x[0] > b - a - 4.6); if (j > 0) F.splice(j); F.push([b - a - 4.2, RF.wide]); }
  return F;
}
function roomDraw(s, t, info) {
  const g = info.globalT; s.F ||= roomFram(info, info.shot.start, info.shot.end); applyCam(s.stage, camState(s.F, t));
  s.toy.rex.userData.update(g, 0.0001, s.part === 'start' && win(g, LN(6), LN(7)) ? 0.6 : 0);
  if (s.bird) { const inK = ramp(g, PIGEON_IN() - 0.6, PIGEON_IN()), outK = ramp(g, PIGEON_OUT(), PIGEON_OUT() + 1.0);
    s.bird.visible = inK > 0.01 && outK < 0.99; s.bird.position.set(0.8 + (1 - inK) * 0.8 + outK * 1.2, 0.92 + (1 - inK) * 0.7 + outK * 1.0, -2.88 - (1 - inK) * 0.4 - outK * 0.8);
    s.bird.userData.update(g); s.bird.rotation.y = 0.5 + Math.sin(g * 0.7) * 0.35; }
  actCast(s, g, t);
  s.winS = toScreen(new THREE.Vector3(1.4, 1.9, -3), s.stage.camera);
}
function star(g, t, x, y) {   // shooting star streak across the window
  if (t < 0 || t > 1.4) return; const u = ease.out(clamp(t / 1.0)), a = 1 - clamp((t - 1.0) / 0.4); const x0 = x - 260 + u * 460, y0 = y - 120 + u * 170;
  g.save(); g.globalAlpha = a; const gr = g.createLinearGradient(x0 - 200, y0 - 74, x0, y0); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, 'rgba(255,248,230,1)'); g.strokeStyle = gr; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0 - 200, y0 - 74); g.lineTo(x0, y0); g.stroke(); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x0, y0, 9, 0, 7); g.fill(); g.restore();
}
function roomOverlay(g, t, info, s) {
  const G = info.globalT;
  if (s.part === 'start') { if (s.winS) star(g, G - 0.4, s.winS[0], s.winS[1]);
    lab(g, G, '66 MILLION YEARS AGO', LN(1, 1.4), LN(2), E.W * 0.5, 150, { size: 66 }); lab(g, G, 'A ROCK FROM SPACE', LN(1, 3.2), LN(2), E.W * 0.5, 225, { size: 52, color: CREAM });
    lab(g, G, 'THE DINOSAUR KILLER', LN(5, 0.4), LN(6), E.W * 0.5, 150, { size: 66, color: CORAL, mode: 'slam' });
    if (G > LN(7, 0.3) && G < LN(8)) stamp(g, G, LN(7, 0.3), E.W * 0.5, E.H * 0.24, 'MISSED?', MINT); }
  if (s.part === 'end') {
    lab(g, G, 'BIRDS = DINOSAURS', LN(122, 1.4), LN(123), E.W * 0.5, 150, { size: 72, color: GOLD, mode: 'slam' }); lab(g, G, 'COUSINS OF T. REX', LN(122, 4.0), LN(123), E.W * 0.5, 230, { size: 52, color: CREAM });
    lab(g, G, 'SMALL · FEATHERS · BEAKS · SEEDS', LN(124, 0.6), LN(125), E.W * 0.5, 150, { size: 54 });
    lab(g, G, 'CROCS · TURTLES · FROGS · MAMMALS', LN(125, 1.4), LN(126, 0.6), E.W * 0.5, 150, { size: 52, color: MINT });
    lab(g, G, '~11,000 BIRD SPECIES', LN(128, 1.6), LN(129, 1.2), E.W * 0.5, 150, { size: 66, color: SKY }); lab(g, G, '~6,500 MAMMAL SPECIES', LN(128, 3.6), LN(129, 1.2), E.W * 0.5, 225, { size: 50, color: CREAM });
    lab(g, G, 'T. REX PROTEIN ≈ CHICKEN · OSTRICH', LN(130, 3.0), LN(131), E.W * 0.5, 150, { size: 52 });
    if (G > LN(131, 0.3) && G < LN(133)) stamp(g, G, LN(131, 0.4), E.W * 0.5, E.H * 0.24, 'DINO NUGGETS', GOLD);
    if (G > LN(136)) endScreen(g, G - LN(136)); }
}
function endScreen(g, t) {
  const k = ease.outBack(clamp(t / 0.5)); g.save(); g.translate(E.W * 0.5, E.vertical ? VY0 : E.H * 0.2); g.scale(k, k);
  rr(g, -230, -60, 460, 120, 60); g.fillStyle = '#e8322e'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#1a0d12'; g.stroke();
  text(g, 'SUBSCRIBE', 0, 18, { size: 64, color: '#ffffff', font: FONTS.ui, weight: 900 }); g.restore();
  if (t > 3.2) kText(g, t - 3.2, 'WHAT SHOULD WE CHANGE NEXT?', E.W / 2, E.vertical ? VY0 + 150 : E.H * 0.36, { start: 0.05, mode: 'drop', size: vSize('WHAT SHOULD WE CHANGE NEXT?', 56), color: GOLD, glow: 20 });
}

// ================= CRETACEOUS valley (plain · impact · miss · night · today) =================
const OUT = {
  two: { pos: [0.05, 1.4, 4.4], look: [0.0, 0.85, -2.5], fov: 38, lens: [4.2, 7] }, pip: { pos: [-0.3, 1.3, 4.0], look: [-0.8, 1.1, 0.6], fov: 34, lens: [3.0, 10] },
  ink: { pos: [1.2, 1.3, 3.9], look: [0.75, 1.1, 0.5], fov: 34, lens: [3.1, 10] }, two2: { pos: [-1.4, 1.2, 4.0], look: [0.3, 0.95, -1.0], fov: 36, lens: [4.2, 8] },
};
const CF = {
  wide: { pos: [0.5, 3.0, 9.5], look: [-1.0, 2.5, -14], fov: 44, lens: [10, 0] }, herd: { pos: [-1.5, 2.0, 5.0], look: [-10, 6.5, -26], fov: 40, lens: [24, 0] },
  neck: { pos: [-2.6, 0.7, 1.0], look: [-11, 10.5, -26], fov: 42, lens: [24, 0] }, rex: { pos: [3.0, 1.7, 2.2], look: [9.0, 3.0, -10.5], fov: 36, lens: [14, 0] },
  rexHead: { pos: [4.6, 3.6, -2.6], look: [7.3, 4.3, -8.3], fov: 36, lens: [6.5, 4] }, trike: { pos: [-2.6, 1.6, -1.0], look: [-4.4, 1.6, -13.6], fov: 34, lens: [12, 2] },
  ptero: { pos: [0.2, 1.1, 3.2], look: [-4, 12, -26], fov: 46, lens: [30, 0] }, sky: { pos: [0.3, 1.3, 4.2], look: [-24, 26, -100], fov: 46, lens: [60, 0] },
  horizon: { pos: [0.3, 1.8, 4.5], look: [12, 4, -100], fov: 40, lens: [60, 0] }, valley: { pos: [0.8, 2.4, 7.5], look: [2.0, 3.5, -40], fov: 44, lens: [30, 0] },
  missSky: { pos: [0.2, 1.2, 4.4], look: [-6, 26, -100], fov: 50, lens: [60, 0] },
  // night
  ferns: { pos: [0.2, 0.9, 4.0], look: [0.0, 0.6, 0.0], fov: 40, lens: [4.0, 6] }, m1: { pos: [-0.6, 0.75, 4.4], look: [-0.9, 0.45, 1.4], fov: 44, lens: [2.6, 8] },
  m2: { pos: [0.7, 0.75, 4.5], look: [0.9, 0.45, 1.5], fov: 44, lens: [2.7, 8] }, giant: { pos: [-2.6, 0.8, 2.6], look: [-14, 6, -24], fov: 42, lens: [26, 0] },
  // today
  flock: { pos: [0.2, 1.0, 3.8], look: [0.0, 1.0, -7], fov: 40, lens: [11, 0] }, big: { pos: [3.0, 1.8, 2.4], look: [11, 4.2, -15.5], fov: 36, lens: [20, 0] },
  statue: { pos: [1.2, 1.55, 1.9], look: [2.5, 1.4, -1.4], fov: 34, lens: [3.6, 10] }, statue2: { pos: [3.6, 1.2, 1.4], look: [2.4, 1.5, -1.4], fov: 36, lens: [3.0, 10] },
  mtn: { pos: [0.2, 1.3, 3.6], look: [0.0, 9, -80], fov: 36, lens: [60, 0] }, grass: { pos: [-0.8, 0.5, 3.4], look: [-3, 0.4, -6], fov: 40, lens: [5, 6] },
};
function cretPick(p) { return (g, i, who) => {
  const cast = who === 'PIP' ? OUT.pip : who === 'INK' ? (i % 2 ? OUT.two2 : OUT.ink) : OUT.two;
  if (p.mode === 'plain') {
    if (g < LN(11)) return CF.wide; if (win(g, LN(12), LN(13))) return CF.wide; if (win(g, LN(14), LN(15, 3))) return [CF.neck, CF.herd][i % 2]; if (win(g, LN(17, 1), LN(18)) || win(g, LN(19), LN(20))) return CF.herd;
    if (win(g, LN(21, 1), LN(22))) return CF.rex; if (win(g, LN(22), LN(23, 3))) return CF.rexHead; if (win(g, LN(25, 2), LN(26)) || win(g, LN(27), LN(28))) return [CF.rexHead, CF.rex][i % 2];
    if (win(g, LN(28, 1.5), LN(30))) return CF.trike; if (win(g, LN(31), LN(32, 2)) || win(g, LN(33), LN(35))) return CF.ptero; if (win(g, LN(36), LN(37))) return CF.wide;
    return cast; }
  if (p.mode === 'impact') { if (win(g, LN(50, 1.5), LN(51)) || win(g, LN(51), LN(52, 3)) || win(g, LN(53), LN(54, 1.0))) return CF.sky; if (win(g, LN(54, 1.0), LN(55))) return CF.horizon;
    if (win(g, LN(56), LN(57)) || win(g, LN(58), LN(59))) return [CF.valley, CF.horizon][i % 2]; if (win(g, LN(62, 2.2), LN(63))) return CF.sky; return cast; }
  if (p.mode === 'miss') { if (g < LN(63, 2.6)) return CF.missSky; if (win(g, LN(64), LN(65))) return [CF.herd, CF.rex][i % 2]; return cast; }
  if (p.mode === 'night') { if (g < LN(68)) return CF.ferns; if (win(g, LN(68), LN(70, 3))) return [CF.m1, CF.m2][i % 2]; if (win(g, LN(72), LN(73))) return CF.giant; if (win(g, LN(74, 3), LN(75))) return [CF.m2, CF.m1][i % 2];
    if (win(g, LN(86, 2), LN(87))) return CF.ferns; return cast; }
  if (p.mode === 'today') { if (g < LN(90, 2)) return CF.wide; if (win(g, LN(92), LN(93))) return [CF.mtn, CF.wide][i % 2]; if (win(g, LN(93), LN(94, 3))) return CF.grass; if (win(g, LN(98, 2), LN(99))) return CF.flock;
    if (win(g, LN(100, 1), LN(101))) return CF.big; if (win(g, LN(102), LN(103))) return CF.flock; if (win(g, LN(103), LN(104, 2.5)) || win(g, LN(106), LN(107)) || win(g, LN(108, 2), LN(109)) || win(g, LN(110, 3), LN(111))) return [CF.statue, CF.statue2][i % 2];
    return cast; }
  return cast; }; }
const CPOS = { pip: [-0.8, 1.1], ink: [0.75, 0.9] };
const SKIES = { plain: ['#4a8ad8', '#f4e2b8'], impact: ['#3a2a5a', '#ff9a5a'], miss: ['#5a7ac8', '#ffd8a8'], night: ['#1a2050', '#4a4a8a'], today: ['#6a90c8', '#e4eaf2'] };
function buildCret(p) {
  const mode = p.mode, night = mode === 'night';
  const W = W3.inkWorld({ look: night ? 'night' : 'day', fov: 38, fog: night ? [16, 120] : mode === 'today' ? [30, 200] : [34, 230], bloom: 0.5, exposure: night ? 1.85 : mode === 'impact' ? 1.35 : 1.45, sky: SKIES[mode],
    lookOverride: mode === 'impact' ? { key: '#ffb07a', fog: '#d8907a' } : night ? { fog: '#3a3a70' } : mode === 'today' ? { fog: '#dfe6ee' } : {} });
  const v = cretaceous3d(W, { mode }); const s = { stage: W, v, mode, ...castCards(W, { ...CPOS, rim: night ? '#c8d0ff' : '#fff1dc' }) };
  if (mode === 'impact') { s.dk = new THREE.Color(); s.sky0 = W.scene.background; }
  return s;
}
const HIT = () => LN(54, 1.6), REW = () => LN(62, 2.0);
function impactK(g) {   // real history: approach → hit → embers → fire → darkness; after REW the clock runs backwards fast
  const tt = g < REW() ? g : Math.max(LN(49), REW() - (g - REW()) * 20);
  return { tt, ball: ramp(tt, LN(49, -0.5), HIT()) * 0.999 + (tt >= HIT() ? 0.001 : 0), hit: clamp((tt - HIT()) / 6), embers: ramp(tt, LN(56, 1.2), LN(56, 3)), fire: ramp(tt, LN(56, 2.5), LN(56, 5)) * (1 - 0.5 * ramp(tt, LN(58, 2), LN(58, 6))), dark: ramp(tt, LN(58, 0.5), LN(58, 5)) };
}
function cretDraw(s, t, info) {
  const g = info.globalT, v = s.v; s.F ||= framings(info.shot.start, info.shot.end, cretPick(info));
  if (s.mode === 'plain' && !s.F.fixed) { s.F[0] = [0, { pos: [1.0, 7, 22], look: [0, 3, -14], fov: 44, lens: [16, 0], creep: false }]; s.F.splice(1, 0, [0.05, { ...CF.wide, m: 2.4 }]); s.F.fixed = 1; }
  CAM_PUSH = (s.mode === 'plain' && g < LN(11)) ? 1.3 : 1; applyCam(s.stage, camState(s.F, t)); CAM_PUSH = 1;
  let k = {};
  if (s.mode === 'plain') k = { roar: Math.max(ramp(g, LN(22, 0.1), LN(22, 0.5)) * (1 - ramp(g, LN(23, 0.5), LN(23, 1.0))), ramp(g, LN(27, 0.4), LN(27, 0.8)) * (1 - ramp(g, LN(27, 2.0), LN(27, 2.5)))) };
  if (s.mode === 'impact') { k = impactK(g); const d = k.dark; s.stage.scene.fog.color.set('#d8907a').lerp(new THREE.Color('#3a2a2a'), d); s.stage.sun.intensity = s.stage.L.keyI * (1 - 0.75 * d); s.stage.hemi.intensity = s.stage.L.hemiI * (1 - 0.6 * d);
    if (k.tt >= HIT() && k.tt < HIT() + 0.4) W3.kick(s.stage, k.tt, HIT(), 0.05); }
  if (s.mode === 'miss') { k = { ball: ramp(g, info.shot.start, LN(63, 2.4)), rexWalk: ramp(g, LN(64, 2), LN(64, 3)) }; if (v.rex) v.rex.userData.x0 = 10 + ramp(g, LN(64, 2), LN(66)) * 0; }
  if (s.mode === 'night') k = { peek: ramp(g, LN(67, 0.3), LN(68, 1.0)) };
  if (s.mode === 'today') k = { statue: ease.outBack(clamp((g - LN(103, -0.4)) / 0.6)) };
  v.update(t + (s.mode === 'today' ? 0 : g * 0), k); s.k = k;
  actCast(s, g, t, 0);
  if (s.mode === 'impact' && v.ball) s.ballS = toScreen(v.ball.dome.position.clone(), s.stage.camera);
}
function timelineCard(g, G, t0) {   // STEGOSAURUS ~150 · T. REX 66 · YOU 0  (million years ago)
  const k = ease.outBack(clamp((G - t0) / 0.4)); if (k <= 0) return; const w = E.vertical ? 900 : 1100, h = 250, x = E.W / 2 - w / 2, y = E.vertical ? E.H * 0.6 : 60;
  g.save(); g.translate(E.W / 2, y + h / 2); g.scale(k, k); g.translate(-E.W / 2, -y - h / 2);
  card2d(g, x, y, w, h, () => { const x0 = x + 90, x1 = x + w - 90, ly = y + 120, X = (mya) => lerp(x0, x1, 1 - mya / 150);
    g.lineWidth = 8; g.strokeStyle = CREAM; g.beginPath(); g.moveTo(x0, ly); g.lineTo(x1, ly); g.stroke();
    const seg = (a, b, col, s2, at) => { const u = clamp((G - at) / 0.6); if (u <= 0) return; g.lineWidth = 14; g.strokeStyle = col; g.beginPath(); g.moveTo(X(a), ly - 34); g.lineTo(lerp(X(a), X(b), u), ly - 34); g.stroke(); if (u > 0.9) text(g, s2, (X(a) + X(b)) / 2, ly - 52, { size: 34, color: col, font: FONTS.ui, weight: 900 }); };
    for (const [m, s1, col] of [[150, 'STEGOSAURUS', MINT], [66, 'T. REX', CORAL], [0, 'YOU', GOLD]]) { g.fillStyle = col; g.beginPath(); g.arc(X(m), ly, 16, 0, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = '#1a0d12'; g.stroke();
      text(g, s1, X(m), ly + 58, { size: 34, color: col, font: FONTS.ui, weight: 900 }); text(g, m ? `${m} MYA` : 'NOW', X(m), ly + 96, { size: 26, color: CREAM, font: FONTS.ui, weight: 800 }); }
    seg(150, 66, MINT, '~80+ MILLION YRS', LN(44, 2.5)); seg(66, 0, GOLD, '66 MILLION YRS', LN(46, 0.4)); });
  g.restore();
}
function flash(g, G, t0, d = 0.9) { const u = (G - t0) / d; if (u < 0 || u > 1) return; g.save(); g.globalAlpha = Math.pow(1 - u, 2); g.fillStyle = '#fff6e0'; g.fillRect(0, 0, E.W, E.H); g.restore(); }
function rewind(g, G, t0) { if (G < t0) return; g.save(); g.globalAlpha = 0.18; g.fillStyle = '#ffffff'; for (let y = (G * 900) % 24; y < E.H; y += 24) g.fillRect(0, y, E.W, 3); g.globalAlpha = 1;
  const x = E.vertical ? E.W / 2 : E.W - 260, y = E.vertical ? VY0 + 120 : 110; text(g, '◀◀ REWIND', x, y, { size: 64, color: '#ffffff', font: FONTS.ui, weight: 900 }); g.restore(); }
function cretOverlay(g, t, info, s) {
  const G = info.globalT;
  if (s.mode === 'plain') {
    lab(g, G, 'THE CRETACEOUS', LN(11, 0.8), LN(11, 4.5), E.W * 0.5, 150, { size: 72, color: MINT, mode: 'slam' }); lab(g, G, '66 MILLION YEARS AGO', LN(11, 2.0), LN(11, 4.5), E.W * 0.5, 230, { size: 52, color: CREAM });
    if (win(G, LN(12, 0.2), LN(13, 0.6))) { const k = ease.outBack(clamp((G - LN(12, 0.2)) / 0.5)), sc = k * (E.vertical ? 0.62 : 1); g.save(); g.translate(E.W / 2, E.vertical ? E.H * 0.3 : E.H * 0.4); g.scale(sc, sc); text(g, 'WHAT IF THE DINOSAURS', 0, -40, { size: 96, color: CREAM, font: FONTS.ui, weight: 900 }); text(g, 'NEVER WENT EXTINCT?', 0, 72, { size: 116, color: GOLD, font: FONTS.ui, weight: 900 }); g.restore(); }
    lab(g, G, 'TITANOSAUR', LN(15, 0.6), LN(16), E.W * 0.5, 150, { size: 72, color: MINT, mode: 'slam' }); lab(g, G, 'ARGENTINOSAURUS ≈ 35 M LONG', LN(15, 3.4), LN(16), E.W * 0.5, 230, { size: 50, color: CREAM });
    lab(g, G, '≈ 70 TONNES = 10 ELEPHANTS', LN(17, 1.2), LN(18), E.W * 0.5, 150, { size: 60 });
    lab(g, G, 'HUNDREDS OF KG OF PLANTS A DAY', LN(19, 0.8), LN(20), E.W * 0.5, 150, { size: 54, color: CREAM });
    lab(g, G, 'T. REX', LN(22, 0.2), LN(23), E.W * 0.5, 150, { size: 96, color: CORAL, mode: 'slam' });
    lab(g, G, '12 M · 8 TONNES', LN(23, 1.4), LN(24), E.W * 0.5, 150, { size: 64 }); lab(g, G, 'STRONGEST BITE ON LAND', LN(23, 3.6), LN(24), E.W * 0.5, 225, { size: 50, color: CORAL });
    lab(g, G, 'UP TO 57,000 N', LN(25, 3.6), LN(26), E.W * 0.5, 150, { size: 72, color: GOLD }); lab(g, G, 'ONE TOOTH = AN ELEPHANT SITTING ON YOU', LN(27, 0.4), LN(28), E.W * 0.5, 150, { size: 50, color: CREAM });
    lab(g, G, 'TRICERATOPS', LN(28, 2.0), LN(30), E.W * 0.5, 150, { size: 72, color: MINT, mode: 'slam' }); lab(g, G, '3 HORNS · PLANT-EATER', LN(29, 1.2), LN(30), E.W * 0.5, 230, { size: 50, color: CREAM });
    lab(g, G, 'PTEROSAURS', LN(32, 0.8), LN(33), E.W * 0.5, 150, { size: 72, color: SKY, mode: 'slam' }); lab(g, G, 'NOT DINOSAURS · NOT BIRDS', LN(32, 2.6), LN(33), E.W * 0.5, 230, { size: 50, color: CREAM });
    lab(g, G, 'QUETZALCOATLUS · WINGS ≈ 10 M', LN(34, 1.2), LN(35), E.W * 0.5, 150, { size: 56 }); lab(g, G, 'AS TALL AS A GIRAFFE', LN(34, 5.0), LN(35), E.W * 0.5, 225, { size: 50, color: CREAM });
    lab(g, G, '≈ 165 MILLION YEARS', LN(36, 1.2), LN(37), E.W * 0.5, 150, { size: 68, color: GOLD });
    lab(g, G, 'US: ≈ 300,000 YEARS', LN(38, 0.4), LN(39), E.W * 0.5, 150, { size: 60, color: CREAM }); lab(g, G, 'DINOSAURS: 500× LONGER', LN(38, 3.0), LN(39), E.W * 0.5, 225, { size: 54, color: GOLD });
    lab(g, G, 'CAVEMEN + DINOSAURS?', LN(41, 1.5), LN(42, 1.6), E.W * 0.5, 150, { size: 64, color: CREAM }); if (win(G, LN(42, 0.5), LN(43))) stamp(g, G, LN(42, 0.6), E.W * 0.5, E.H * 0.42, 'MYTH');
    if (win(G, LN(44, 1.0), LN(48))) timelineCard(g, G, LN(44, 1.0));
    lab(g, G, 'MYTH BUSTED', LN(48, 0.2), LN(48, 3.2), E.W * 0.5, 160, { size: 80, color: MINT, mode: 'slam' });
  }
  if (s.mode === 'impact') {
    lab(g, G, 'ASTEROID ≈ 10 KM WIDE', LN(52, 0.5), LN(52, 3.0), E.W * 0.5, 150, { size: 62 }); lab(g, G, '> MOUNT EVEREST', LN(52, 1.8), LN(52, 3.0), E.W * 0.5, 225, { size: 50, color: CREAM });
    lab(g, G, '≈ 20 KM EVERY SECOND', LN(52, 3.2), LN(53), E.W * 0.5, 150, { size: 64, color: CORAL }); lab(g, G, '≈ 20× A BULLET', LN(54, 0.1), LN(54, 1.6), E.W * 0.5, 150, { size: 62, color: GOLD });
    flash(g, G, HIT(), 1.1);
    lab(g, G, 'CHICXULUB · MEXICO', LN(54, 2.6), LN(55), E.W * 0.5, 150, { size: 64 }); lab(g, G, 'CRATER ≈ 180 KM WIDE', LN(54, 5.0), LN(55), E.W * 0.5, 225, { size: 52, color: CREAM });
    lab(g, G, 'FLASH · WAVE · FIRE', LN(56, 0.6), LN(57), E.W * 0.5, 150, { size: 66, color: CORAL });
    lab(g, G, 'MONTHS OF DARK & COLD', LN(58, 1.4), LN(59), E.W * 0.5, 150, { size: 62, color: CREAM });
    lab(g, G, '3 OUT OF 4 SPECIES: GONE', LN(60, 0.6), LN(62), E.W * 0.5, 150, { size: 64, color: CORAL, mode: 'slam' });
    rewind(g, G, REW());
  }
  if (s.mode === 'miss') { if (G > LN(63, 0.5) && G < LN(64, 1)) stamp(g, G, LN(63, 0.6), E.W * 0.5, E.H * 0.3, 'MISSED!', MINT); lab(g, G, 'THE CRETACEOUS GOES ON', LN(64, 1.2), LN(65), E.W * 0.5, 150, { size: 62, color: GOLD }); }
  if (s.mode === 'night') {
    lab(g, G, 'MAMMALS', LN(68, 0.2), LN(69), E.W * 0.5, 150, { size: 80, color: GOLD, mode: 'slam' });
    lab(g, G, 'MOUSE · SQUIRREL · BADGER', LN(70, 1.6), LN(71), E.W * 0.5, 150, { size: 58, color: CREAM });
    lab(g, G, 'EVERY BIG JOB: TAKEN', LN(72, 2.2), LN(73), E.W * 0.5, 150, { size: 62, color: CORAL });
    lab(g, G, 'OUT AT NIGHT', LN(74, 0.4), LN(74, 4.4), E.W * 0.5, 150, { size: 62, color: SKY }); lab(g, G, '140 MILLION YEARS AS "PESTS"', LN(74, 5.0), LN(75), E.W * 0.5, 150, { size: 54, color: CREAM });
    lab(g, G, 'THE JOBS ARE EMPTY', LN(76, 3.8), LN(77), E.W * 0.5, 150, { size: 62, color: MINT });
    if (win(G, LN(77, 0.2), LN(78))) stamp(g, G, LN(77, 0.3), E.W * 0.5, E.H * 0.3, 'PROMOTED!', GOLD);
    lab(g, G, '≈ 25 MILLION YEARS LATER', LN(78, 0.8), LN(79), E.W * 0.5, 150, { size: 56, color: CREAM }); lab(g, G, 'MAMMALS UP TO 17 TONNES', LN(78, 3.4), LN(79), E.W * 0.5, 225, { size: 56, color: GOLD });
    lab(g, G, 'WHALES · HORSES · MONKEYS · US', LN(80, 1.4), LN(81), E.W * 0.5, 150, { size: 54, color: MINT });
    lab(g, G, 'FIRST PRIMATE RELATIVES', LN(82, 0.6), LN(83), E.W * 0.5, 150, { size: 58 }); lab(g, G, '≈ RAT-SIZED TREE CLIMBERS', LN(82, 3.0), LN(83), E.W * 0.5, 225, { size: 50, color: CREAM });
    lab(g, G, 'NO DOOR = NO US?', LN(84, 2.4), LN(85), E.W * 0.5, 150, { size: 62, color: CORAL });
    lab(g, G, 'PROBABLY NO PEOPLE', LN(86, 0.2), LN(86, 4.4), E.W * 0.5, 150, { size: 62, color: CORAL });
    lab(g, G, 'NO PIZZA · NO PHONES · NO CARTOONS', LN(87, 0.4), LN(88), E.W * 0.5, 150, { size: 52, color: CREAM });
  }
  if (s.mode === 'today') {
    if (!E.vertical) badge(g, G, [[LN(90, 1.0), 'TODAY'], [LN(115), '']]); lab(g, G, '66 MILLION YEARS LATER', LN(90, 2.2), LN(91), E.W * 0.5, 150, { size: 60, color: GOLD });
    lab(g, G, 'COOLER · ICE · GRASSLANDS', LN(92, 1.8), LN(93), E.W * 0.5, 150, { size: 58, color: SKY });
    lab(g, G, 'GRASS IN DINOSAUR POOP', LN(94, 1.0), LN(95), E.W * 0.5, 150, { size: 58 }); lab(g, G, 'FOSSILS FROM INDIA', LN(94, 2.6), LN(95), E.W * 0.5, 225, { size: 48, color: CREAM });
    lab(g, G, 'FLUFFIER · FASTER · SMALLER', LN(98, 3.0), LN(99), E.W * 0.5, 150, { size: 58, color: MINT });
    lab(g, G, 'MANY DINOSAURS HAD FEATHERS', LN(100, 0.6), LN(101), E.W * 0.5, 150, { size: 56, color: GOLD });
    lab(g, G, 'MORE PARROT THAN CROCODILE', LN(102, 2.2), LN(103), E.W * 0.5, 150, { size: 56, color: CREAM });
    lab(g, G, 'THE DINOSAUROID', LN(104, 0.2), LN(105), E.W * 0.5, 150, { size: 72, color: MINT, mode: 'slam' }); lab(g, G, 'DALE RUSSELL · 1982', LN(104, 1.6), LN(105), E.W * 0.5, 230, { size: 50, color: CREAM });
    lab(g, G, 'TROODON', LN(106, 0.8), LN(107), E.W * 0.5, 150, { size: 72, color: GOLD }); lab(g, G, 'BIG EYES · BIG BRAIN (FOR A DINO)', LN(106, 3.0), LN(107), E.W * 0.5, 230, { size: 48, color: CREAM });
    lab(g, G, 'BRAIN ≈ 1,100 CM³ ?', LN(108, 2.0), LN(109), E.W * 0.5, 150, { size: 64 });
    lab(g, G, '"TOO HUMAN"', LN(110, 1.2), LN(111), E.W * 0.5, 150, { size: 72, color: CORAL, mode: 'slam' }); lab(g, G, 'TAIL · FEATHERS · BEAK', LN(110, 5.0), LN(111), E.W * 0.5, 230, { size: 50, color: CREAM });
    lab(g, G, 'CROWS & PARROTS: TOOLS + PUZZLES', LN(112, 1.4), LN(113), E.W * 0.5, 150, { size: 52, color: SKY });
    lab(g, G, 'A THOUGHT EXPERIMENT', LN(114, 0.4), LN(114, 4.5), E.W * 0.5, 150, { size: 62, color: GOLD });
  }
}

// ---------- register ----------
for (const shot of E.shots) {
  const p = shot.params || {};
  const reg = (init, draw, overlay) => registerShot(shot.id, { kind: '3d', init: () => init(p), draw, overlay });
  if (shot.kind === 'room') reg(buildRoom, roomDraw, roomOverlay);
  if (shot.kind === 'cret') reg(buildCret, cretDraw, cretOverlay);
}
