// Episode 05 — "What If It Never Rained Again?" Same grammar as ep03/ep04 (reference-matched):
// long continuous location shots, camera glides (~0.9 s ease-in-out) on every line + every ~2.5 s, constant slow push-in,
// dissolves between locations, story beats keyed to the voice lines (LN(i) = start of line i), vertical-aware (E.vertical).
import { E, registerShot, ease, clamp, lerp, text, rr, alpha, FONTS } from '/engine/core.js';
import { POSES, posesAt, breathe } from '/engine/rig2d.js';
import { kText } from '/engine/motion.js';
import { THREE } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { room3d } from '../sets/room3d.js';
import { sky3d, valley3d, rainField, glassOfWater } from '../sets/weather3d.js';
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
  0: [['nervous', 'crossArms'], ['neutral', 'stand']], 1: [['nervous', 'crossArms'], ['smile', 'explain']], 2: [['angry', 'crossArms'], ['smirk', 'stand']], 3: [['neutral', 'stand'], ['smirk', 'pointUp']],
  4: [['shocked', 'handsOnHead'], ['smirk', 'crossArms']], 5: [['surprised', 'stand'], ['neutral', 'explain']], 6: [['joy', 'cheer'], ['smirk', 'stand']], 7: [['curious', 'stand'], ['neutral', 'explain']], 8: [['confused', 'shrug'], ['smirk', 'stand']], 9: [['happy', 'stand'], ['smile', 'pointUp']],
  10: [['awe', 'handsOnHead'], ['smile', 'stand']], 12: [['curious', 'think'], ['neutral', 'stand']], 13: [['curious', 'stand'], ['neutral', 'point']], 14: [['surprised', 'point'], ['smile', 'stand']], 16: [['curious', 'think'], ['neutral', 'stand']], 18: [['shocked', 'handsOnHead'], ['smirk', 'stand']],
  20: [['curious', 'shrug'], ['neutral', 'stand']], 22: [['joy', 'cheer'], ['smile', 'stand']], 24: [['surprised', 'stand'], ['smirk', 'stand']], 26: [['curious', 'stand'], ['neutral', 'stand']], 28: [['confused', 'think'], ['neutral', 'stand']], 30: [['worried', 'stand'], ['neutral', 'crossArms']],
  32: [['curious', 'stand'], ['neutral', 'stand']], 34: [['joy', 'cheer'], ['smirk', 'crossArms']], 35: [['curious', 'stand'], ['neutral', 'point']], 36: [['worried', 'point'], ['neutral', 'stand']], 38: [['worried', 'stand'], ['neutral', 'stand']], 40: [['smile', 'stand'], ['smile', 'stand']],
  42: [['sad', 'sad'], ['neutral', 'stand']], 44: [['surprised', 'point'], ['neutral', 'stand']], 46: [['curious', 'think'], ['neutral', 'stand']], 48: [['smirk', 'shrug'], ['smile', 'stand']],
  50: [['smirk', 'crossArms'], ['neutral', 'stand']], 52: [['nervous', 'shrug'], ['smirk', 'stand']], 54: [['shocked', 'stand'], ['neutral', 'stand']], 56: [['shocked', 'handsOnHead'], ['smirk', 'stand']], 58: [['curious', 'point'], ['neutral', 'stand']], 60: [['sad', 'sad'], ['neutral', 'stand']],
  62: [['determined', 'pointUp'], ['neutral', 'stand']], 64: [['sad', 'sad'], ['neutral', 'stand']], 66: [['shocked', 'handsOnHead'], ['neutral', 'stand']], 68: [['worried', 'stand'], ['neutral', 'stand']],
  70: [['happy', 'stand'], ['neutral', 'stand']], 71: [['happy', 'stand'], ['smirk', 'explain']], 72: [['shocked', 'handsOnHead'], ['smirk', 'stand']], 74: [['confused', 'shrug'], ['neutral', 'stand']], 76: [['joy', 'cheer'], ['smile', 'stand']], 78: [['curious', 'think'], ['neutral', 'stand']], 79: [['awe', 'stand'], ['smirk', 'crossArms']],
  80: [['determined', 'pointUp'], ['neutral', 'stand']], 82: [['surprised', 'stand'], ['neutral', 'stand']], 84: [['shocked', 'handsOnHead'], ['smile', 'stand']], 86: [['joy', 'pointUp'], ['smile', 'stand']], 88: [['worried', 'stand'], ['neutral', 'stand']], 90: [['worried', 'stand'], ['neutral', 'stand']], 92: [['sad', 'sad'], ['neutral', 'stand']], 93: [['sad', 'sad'], ['sad', 'stand']],
  94: [['curious', 'think'], ['neutral', 'stand']], 96: [['surprised', 'stand'], ['neutral', 'stand']], 98: [['angry', 'crossArms'], ['smirk', 'stand']], 100: [['angry', 'shrug'], ['smirk', 'crossArms']], 102: [['worried', 'stand'], ['neutral', 'stand']],
  104: [['curious', 'stand'], ['neutral', 'stand']], 106: [['awe', 'stand'], ['smile', 'stand']], 108: [['confused', 'shrug'], ['neutral', 'stand']], 110: [['surprised', 'point'], ['smile', 'stand']], 112: [['curious', 'think'], ['neutral', 'stand']], 114: [['curious', 'shrug'], ['neutral', 'stand']], 116: [['worried', 'stand'], ['neutral', 'stand']],
  118: [['determined', 'pointUp'], ['smile', 'stand']], 120: [['curious', 'stand'], ['neutral', 'stand']], 122: [['surprised', 'stand'], ['smile', 'stand']], 124: [['joy', 'cheer'], ['smile', 'stand']], 126: [['happy', 'stand'], ['smile', 'stand']],
  128: [['happy', 'stand'], ['smile', 'stand']], 130: [['surprised', 'stand'], ['smile', 'stand']], 132: [['joy', 'cheer'], ['smile', 'stand']], 133: [['happy', 'wave'], ['smile', 'explain']], 134: [['joy', 'point'], ['smile', 'wave']],
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

// ================= ROOM (day, rain on the window, glass of water) =================
const RF = {
  wide: { pos: [0.2, 1.45, 3.3], look: [0.25, 1.05, -1.2], fov: 38, lens: [3.6, 6] },
  two: { pos: [0.05, 1.3, 2.8], look: [0.05, 1.0, -0.6], fov: 36, lens: [2.9, 10] },
  window: { pos: [2.0, 1.45, 0.5], look: [1.3, 1.6, -3.0], fov: 38, lens: [3.4, 8] },
  table: { pos: [0.15, 1.5, 1.95], look: [0.05, 0.85, 0.0], fov: 36, lens: [2.1, 12] },
  pip: { pos: [-0.25, 1.3, 2.4], look: [-0.55, 1.2, -0.2], fov: 34, lens: [2.6, 12] },
  pip2: { pos: [-0.05, 1.22, 2.55], look: [-0.5, 1.15, -0.3], fov: 35, lens: [2.8, 11] },
  ink: { pos: [1.1, 1.32, 2.3], look: [0.72, 1.2, -0.45], fov: 34, lens: [2.6, 12] },
  ink2: { pos: [0.55, 1.28, 2.6], look: [0.6, 1.15, -0.5], fov: 35, lens: [3.0, 10] },
};
const roomPick = (g, i, who) => (win(g, LN(0), LN(1)) || win(g, LE(3, -0.6), LN(5, 1.2)) || win(g, LN(128, -0.2), LN(128, 2.0))) ? RF.window : win(g, LN(129), LN(130)) ? RF.table
  : who === 'PIP' ? (i % 2 ? RF.pip2 : RF.pip) : who === 'INK' ? (i % 3 === 2 ? RF.two : i % 2 ? RF.ink2 : RF.ink) : RF.two;
const RAIN_OFF = () => LE(3, 0.05);
function buildRoom(p) {
  const W = W3.inkWorld({ look: 'golden', fov: 38, fog: [14, 60], bloom: 0.5, exposure: 1.62 });
  const room = room3d(W, { foreground: [-0.72, 1.6] }); const fill = new THREE.PointLight('#ffe8d0', 7, 9, 1.2); fill.position.set(-0.4, 2.6, 1.8); W.scene.add(fill);
  const rain = rainField(W, { x: [-1.5, 5], y: [-1, 5], z: [-8.6, -3.4], n: 900, len: 0.4, opacity: 0.8, color: '#e8f2ff' });
  const grey = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ color: '#7a8aa8', transparent: true, opacity: 0.6, fog: false, depthWrite: false })); grey.position.set(1.4, 2.0, -8.85); grey.userData.noink = true; W.scene.add(grey);
  return { stage: W, room, rain, grey, glass: glassOfWater(W), ...castCards(W), part: p.part };
}
function roomFram(p, a, b) {
  const F = framings(a, b, roomPick, []);
  if (p.part === 'start') F[0] = [0, { ...RF.wide }];
  if (p.part === 'end') { F[0] = [0, { ...RF.window }]; const j = F.findIndex(x => x[0] > b - a - 4.6); if (j > 0) F.splice(j); F.push([b - a - 4.2, RF.wide]); }
  return F;
}
function roomDraw(s, t, info) {
  const g = info.globalT; s.F ||= roomFram(info, info.shot.start, info.shot.end); applyCam(s.stage, camState(s.F, t));
  const k = s.part === 'start' ? 1 - clamp((g - RAIN_OFF()) / 0.25) : 1;
  s.rain.userData.set(g, k); s.grey.material.opacity = 0.55 * k; s.room.sunDisc.visible = k < 0.5; s.room.shafts.forEach(m => m.visible = k < 0.5);
  if (s.part === 'end') { const lift = sstep(clamp((g - LN(132, 0.3)) / 0.6)) * (1 - sstep(clamp((g - LN(133, 0.5)) / 0.6))); s.glass.glass.position.y = 0.745 + lift * 0.25; }
  actCast(s, g, t);
  s.winS = toScreen(new THREE.Vector3(1.4, 1.7, -3), s.stage.camera);
}
function roomOverlay(g, t, info, s) {
  const G = info.globalT;
  if (s.part === 'start') { if (s.winS) burst(g, G, RAIN_OFF(), s.winS[0], s.winS[1], '#e8f6ff', 16, 160);
    lab(g, G, 'NO RAIN · NO SNOW · NO DRIZZLE', LN(5, 1.0), LN(6), E.W * 0.5, 150, { size: 58, color: CREAM });
    lab(g, G, 'MORE WATER IN THE SKY', LN(7, 2.2), LN(8, 1.8), E.W * 0.5, 150, { size: 62 }); lab(g, G, '...AND THIRSTY?', LN(7, 4.0), LN(8, 1.8), E.W * 0.5, 225, { size: 56, color: CORAL }); }
  if (s.part === 'end') { lab(g, G, 'BILLIONS OF YEARS OLD', LN(131, 1.2), LN(132), E.W * 0.5, 150, { size: 62, color: WATER }); if (G > LN(133)) endScreen(g, G - LN(133)); }
}
function endScreen(g, t) {
  const k = ease.outBack(clamp(t / 0.5)); g.save(); g.translate(E.W * 0.5, E.vertical ? VY0 : E.H * 0.2); g.scale(k, k);
  rr(g, -230, -60, 460, 120, 60); g.fillStyle = '#e8322e'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#1a0d12'; g.stroke();
  text(g, 'SUBSCRIBE', 0, 18, { size: 64, color: '#ffffff', font: FONTS.ui, weight: 900 }); g.restore();
  if (t > 3.4) kText(g, t - 3.4, 'WHAT SHOULD WE SWITCH OFF NEXT?', E.W / 2, E.vertical ? VY0 + 150 : E.H * 0.36, { start: 0.05, mode: 'drop', size: vSize('WHAT SHOULD WE SWITCH OFF NEXT?', 54), color: GOLD, glow: 20 });
}

// ================= SKY (on a cloud) =================
const SKF = {
  two: { pos: [0.05, 1.45, 4.6], look: [0.0, 0.7, -2.5], fov: 38, lens: [4.4, 6] }, pip: { pos: [-0.3, 1.3, 3.9], look: [-0.8, 1.05, 0.2], fov: 34, lens: [3.2, 10] },
  ink: { pos: [1.2, 1.3, 3.8], look: [0.75, 1.05, 0.0], fov: 34, lens: [3.3, 10] }, two2: { pos: [-1.5, 1.2, 4.1], look: [0.3, 0.9, -1.0], fov: 36, lens: [4.3, 8] },
  wide: { pos: [0.6, 3.2, 10], look: [0.0, -1.5, -10], fov: 42, lens: [10, 0] }, down: { pos: [0.3, 1.9, 8.0], look: [0.5, -7, -40], fov: 44, lens: [30, 0] },
  rain: { pos: [0.6, 2.0, 8.5], look: [9, -7, -40], fov: 42, lens: [30, 0] }, sun: { pos: [-1.6, 1.0, -1.6], look: [-26, 12, -70], fov: 40, lens: [30, 0] },
  drop: { pos: [0.1, 1.6, 0.9], look: [0.0, 1.45, -1.6], fov: 34, lens: [2.5, 12] }, drop2: { pos: [-1.2, 1.5, 0.8], look: [0.0, 1.45, -1.6], fov: 36, lens: [2.6, 12] }, dropW: { pos: [0.05, 1.5, 3.6], look: [0.0, 1.2, -1.6], fov: 38, lens: [4.4, 7] },
};
function skyPick(p) { return (g, i, who) => {
  const cast = who === 'PIP' ? SKF.pip : who === 'INK' ? (i % 2 ? SKF.two2 : SKF.ink) : SKF.two;
  if (p.mode === 'title') { if (g < LN(11)) return SKF.wide; if (win(g, LN(12), LN(13))) return SKF.wide; if (win(g, LN(13, 1.0), LN(16))) return SKF.down; if (win(g, LN(21), LN(22))) return SKF.rain; if (win(g, LN(27), LN(30))) return [SKF.wide, SKF.rain][i % 2]; return cast; }
  if (p.mode === 'drop') { if (win(g, LN(72), LN(78))) return [SKF.drop, SKF.drop2][i % 2]; if (win(g, LN(78), LN(80))) return SKF.dropW; return cast; }
  if (p.mode === 'grey') { if (win(g, LN(95), LN(96))) return SKF.down; if (win(g, LN(97, 1.5), LN(98)) || win(g, LN(99), LN(100))) return SKF.wide; if (win(g, LN(103), LN(104))) return SKF.sun; return cast; }
  return cast; }; }
function buildSky(p) {
  const grey = p.mode === 'grey';
  const W = W3.inkWorld({ look: 'day', fov: 38, fog: [40, 260], bloom: 0.45, exposure: 1.3, sky: grey ? ['#6a7a98', '#e0b8a0'] : ['#3a7ed8', '#cfe4f8'] });
  const sky = sky3d(W, { mode: p.mode }); const s = { stage: W, sky, mode: p.mode, ...castCards(W, { pip: [-0.8, 0.9], ink: [0.75, 0.7], rim: '#fff1dc' }) };
  if (s.sky.drop) s.sky.drop.position.set(0.0, 1.45, -1.6);
  return s;
}
const TITLE_AT = () => LN(12, 0.2);
function skyDraw(s, t, info) {
  const g = info.globalT; s.F ||= framings(info.shot.start, info.shot.end, skyPick(info));
  if (s.mode === 'title' && !s.F.fixed) { s.F[0] = [0, { pos: [0.8, 6, 16], look: [0, -2, -10], fov: 42, lens: [14, 0], creep: false }]; s.F.splice(1, 0, [0.05, { ...SKF.wide, m: 2.4 }]); s.F.fixed = 1; }
  CAM_PUSH = (s.mode === 'title' && g < LN(11)) ? 1.3 : 1; applyCam(s.stage, camState(s.F, t)); CAM_PUSH = 1;
  const k = { vapour: 0.35, rain: 1 };
  if (s.mode === 'grey') Object.assign(k, { vapour: 0.5, rain: 0, swell: ramp(g, LN(97), LN(97, 4)) * 0.6 + 0.15, grey: ramp(g, LN(97), LN(97, 4)) * 0.8 + 0.2, haze: ramp(g, LN(101, 1), LN(102, 2)), red: ramp(g, LN(103, 1.0), LN(103, 3.0)) });
  s.sky.update(g, k);
  if (s.sky.drop) { const d = s.sky.drop, sh = ramp(g, LN(75, 0.5), LN(75, 2.3)) + ramp(g, LN(77, 2.0), LN(77, 3.6)) + ramp(g, LN(77, 4.6), LN(77, 5.0));
    d.userData.shape(sh); d.position.y = 1.45 + Math.sin(g * 1.3) * 0.04; d.rotation.y = Math.sin(g * 0.4) * 0.3; d.visible = g > LN(72, -0.5); d.scale.setScalar(ease.outBack(clamp((g - LN(72, -0.5)) / 0.5)) + 0.001);
    s.dropS = toScreen(d.position.clone(), s.stage.camera); }
  actCast(s, g, t, 0);
}
function skyOverlay(g, t, info, s) {
  const G = info.globalT;
  if (s.mode === 'title') {
    if (win(G, TITLE_AT(), LN(13, 0.4))) { const k = ease.outBack(clamp((G - TITLE_AT()) / 0.5)), sc = k * (E.vertical ? 0.74 : 1); g.save(); g.translate(E.W / 2, E.vertical ? E.H * 0.3 : E.H * 0.4); g.scale(sc, sc); text(g, 'WHAT IF IT NEVER', 0, -40, { size: 104, color: CREAM, font: FONTS.ui, weight: 900 }); text(g, 'RAINED AGAIN?', 0, 72, { size: 128, color: GOLD, font: FONTS.ui, weight: 900 }); g.restore(); }
    lab(g, G, 'SUN + SEA = VAPOR', LN(15, 0.3), LN(16), E.W * 0.5, 150, { size: 64 }); lab(g, G, 'COOL → TINY DROPLETS = CLOUD', LN(15, 3.2), LN(16), E.W * 0.5, 225, { size: 48, color: CREAM });
    lab(g, G, '1 CLOUD ≈ 100 ELEPHANTS', LN(17, 2.4), LN(19), E.W * 0.5, 150, { size: 62, color: CREAM }); lab(g, G, '(OF WATER)', LN(17, 3.4), LN(19), E.W * 0.5, 225, { size: 46, color: WATER });
    lab(g, G, 'THE WATER CYCLE', LN(22, 0.1), LN(23), E.W * 0.5, 150, { size: 72, color: WATER, mode: 'slam' });
    lab(g, G, '~9 DAYS IN THE SKY', LN(23, 2.4), LN(24, 1.6), E.W * 0.5, 150, { size: 66 });
    lab(g, G, '~500,000 KM³ A YEAR', LN(27, 0.8), LN(28, 1.5), E.W * 0.5, 150, { size: 66, color: WATER });
    lab(g, G, '≈ 1 METER DEEP · EVERY YEAR', LN(29, 1.0), LN(30, 0.5), E.W * 0.5, 150, { size: 58 });
  }
  if (s.mode === 'drop') {
    if (win(G, LN(70, 1.2), LN(72, 2.0))) { const k = ease.outBack(clamp((G - LN(70, 1.2)) / 0.4)); const x = E.vertical ? E.W / 2 : E.W * 0.13, y = E.vertical ? VY0 + 240 : E.H * 0.45; teardrop2d(g, x, y, 1.3 * k); if (G > LN(71, 0.3)) { stamp(g, G, LN(71, 0.4), x, y, 'MYTH'); } }
    lab(g, G, 'SMALL DROP = BALL', LN(73, 0.6), LN(74, 0.8), E.W * 0.5, 150, { size: 62, color: WATER });
    lab(g, G, 'BIG DROP = HAMBURGER BUN', LN(75, 2.5), LN(76, 1.5), E.W * 0.5, 150, { size: 60 });
    lab(g, G, 'OVER ~4.5 MM → PARACHUTE → POP!', LN(77, 3.0), LN(78, 0.5), E.W * 0.5, 150, { size: 54, color: CORAL });
    if (s.dropS) burst(g, G, LN(77, 4.7), s.dropS[0], s.dropS[1], '#e8f6ff', 16, 200);
    lab(g, G, 'MYTH BUSTED', LN(79, 0.2), LN(79, 3.0), E.W * 0.5, 160, { size: 76, color: MINT, mode: 'slam' });
  }
  if (s.mode === 'grey') {
    lab(g, G, 'THE OCEAN STILL EVAPORATES', LN(95, 1.0), LN(96, 0.6), E.W * 0.5, 150, { size: 58, color: WATER });
    lab(g, G, 'HOT · STICKY · HEAVY AIR', LN(97, 1.4), LN(98, 0.6), E.W * 0.5, 150, { size: 60, color: CORAL });
    lab(g, G, 'WATER VAPOR = HEAT BLANKET', LN(99, 3.4), LN(100, 0.4), E.W * 0.5, 150, { size: 58 });
    lab(g, G, 'RAIN WASHES THE AIR', LN(101, 1.0), LN(102, 0.5), E.W * 0.5, 150, { size: 62, color: MINT });
    lab(g, G, 'HAZE · DUST · RED SUNSETS', LN(103, 0.6), LN(103, 6), E.W * 0.5, 150, { size: 58, color: CORAL });
  }
}

// ================= VALLEY (dries out) · FOREST · DESERT · GOOD NEWS =================
const OUT = {
  two: { pos: [0.05, 1.4, 4.4], look: [0.0, 0.85, -2.5], fov: 38, lens: [4.2, 7] }, pip: { pos: [-0.3, 1.3, 4.0], look: [-0.8, 1.1, 0.6], fov: 34, lens: [3.0, 10] },
  ink: { pos: [1.2, 1.3, 3.9], look: [0.75, 1.1, 0.5], fov: 34, lens: [3.1, 10] }, two2: { pos: [-1.4, 1.2, 4.0], look: [0.3, 0.95, -1.0], fov: 36, lens: [4.2, 8] },
};
const VF = {
  wide: { pos: [0.5, 3.4, 9.5], look: [0.0, 0.2, -8], fov: 42, lens: [10, 0] }, river: { pos: [-1.6, 1.7, 0.1], look: [0.6, -0.4, -3.6], fov: 40, lens: [3.8, 8] },
  river2: { pos: [3.0, 0.7, -1.6], look: [-1.5, -0.4, -3.8], fov: 40, lens: [4.5, 6] }, lake: { pos: [2.4, 2.0, -4.4], look: [5.5, -0.9, -12.5], fov: 40, lens: [8, 3] },
  boat: { pos: [1.8, 1.0, -6.2], look: [3.4, -0.8, -10.4], fov: 36, lens: [4.6, 8] }, fields: { pos: [-3.0, 1.9, -2.6], look: [-10.5, 0.2, -11], fov: 40, lens: [8, 3] },
  mtn: { pos: [0.2, 1.3, 3.6], look: [0.0, 9, -60], fov: 34, lens: [40, 0] }, mtn2: { pos: [-2.0, 1.6, 2.2], look: [-10, 10, -62], fov: 34, lens: [40, 0] },
};
const FOF = { canopy: { pos: [0.2, 0.9, -1.6], look: [0.6, 6.5, -14], fov: 44, lens: [12, 0] }, mist: { pos: [0.5, 2.6, 7.5], look: [-3.0, 4.5, -16], fov: 40, lens: [16, 0] }, smoke: { pos: [0.8, 1.8, 4.0], look: [15, 4, -20], fov: 38, lens: [20, 0] } };
const DEF = { nets: { pos: [1.1, 1.6, 0.9], look: [3.0, 1.6, -2.1], fov: 38, lens: [3.2, 8] }, nets2: { pos: [3.4, 1.2, 0.4], look: [5.4, 1.5, -3.4], fov: 36, lens: [3.8, 8] },
  rover: { pos: [-0.4, 0.9, -1.2], look: [-1.6, 0.45, -3.4], fov: 36, lens: [2.5, 12] }, fog: { pos: [0.3, 1.7, 5.5], look: [-5, 1.3, -9], fov: 40, lens: [10, 0] }, wide: { pos: [0.5, 2.8, 8.5], look: [0, 0.4, -8], fov: 42, lens: [10, 0] } };
function valleyPick(p) { return (g, i, who) => {
  const cast = who === 'PIP' ? OUT.pip : who === 'INK' ? (i % 2 ? OUT.two2 : OUT.ink) : OUT.two;
  if (p.mode === 'valley' && p.part === 'dry') {
    if (g < LN(32, 0.5)) return VF.wide; if (win(g, LN(35), LN(36)) || win(g, LN(37), LN(38)) || win(g, LN(39), LN(40))) return [VF.river, VF.river2][i % 2];
    if (win(g, LN(43), LN(44))) return VF.lake; if (win(g, LN(44), LN(46))) return [VF.boat, VF.lake][i % 2]; if (win(g, LN(53, 2), LN(54)) || win(g, LN(55), LN(56)) || win(g, LN(57), LN(58))) return VF.fields;
    if (win(g, LN(61), LN(62))) return VF.wide; if (win(g, LN(62, 1.0), LN(63)) || win(g, LN(65, 1.5), LN(66)) || win(g, LN(67), LN(68)) || win(g, LN(69), LN(70))) return [VF.mtn, VF.mtn2][i % 2]; return cast; }
  if (p.mode === 'valley' && p.part === 'good') { if (win(g, LN(119, 1.0), LN(120))) return VF.wide; if (win(g, LN(124), LN(125))) return [VF.wide, VF.river][i % 2]; if (win(g, LN(125, 1.5), LN(126))) return VF.river2; return cast; }
  if (p.mode === 'forest') { if (g < LN(81, 0.5) || win(g, LN(81, 1), LN(82))) return FOF.canopy; if (win(g, LN(83, 1), LN(84)) || win(g, LN(85), LN(86))) return FOF.mist; if (win(g, LN(89, 2), LN(90)) || win(g, LN(92), LN(94))) return [FOF.smoke, FOF.canopy][i % 2]; return cast; }
  if (p.mode === 'desert') { if (g < LN(105, 3)) return DEF.wide; if (win(g, LN(107), LN(108))) return DEF.rover; if (win(g, LN(109), LN(110))) return DEF.fog; if (win(g, LN(111), LN(112))) return [DEF.nets, DEF.nets2][i % 2]; if (win(g, LN(113), LN(114))) return DEF.nets2; return cast; }
  return cast; }; }
const CASTPOS = { valley: { pip: [-0.8, 1.1], ink: [0.75, 0.9] }, forest: { pip: [-0.8, 1.1], ink: [0.75, 0.9] }, desert: { pip: [-0.8, 1.1], ink: [0.75, 0.9] } };
const RIVER = () => [LN(35, 0.5), LE(37, 1.0)], LAKE = () => [LN(43, 0.5), LE(44, 1.0)], GRASS = () => [LN(35), LN(45)], FIELD = () => [LN(57), LE(57)], SNOW = () => [LN(65, 0.5), LE(69)];
const RAIN_ON = () => LN(124, -0.3);
function buildValley(p) {
  const mode = p.mode || 'valley', desert = mode === 'desert';
  const W = W3.inkWorld({ look: 'day', fov: 38, fog: desert ? [30, 200] : [28, 190], bloom: 0.5, exposure: 1.45, sky: desert ? ['#3a8ad8', '#f0dcc0'] : mode === 'forest' ? ['#4a8ad0', '#cfe8e0'] : p.part === 'good' ? ['#5a6a88', '#b8c4d4'] : undefined });
  const v = valley3d(W, { mode }); const s = { stage: W, v, mode, part: p.part, ...castCards(W, { ...CASTPOS[mode], rim: '#fff1dc' }) };
  if (p.part === 'good') s.rain = rainField(W, { x: [-9, 9], y: [-1, 7], z: [-12, 4.5], n: 2200, len: 0.38, opacity: 0.6 });
  return s;
}
function valleyDraw(s, t, info) {
  const g = info.globalT, v = s.v; s.F ||= framings(info.shot.start, info.shot.end, valleyPick(info));
  if (s.part === 'dry' && !s.F.fixed) { s.F[0] = [0, { pos: [0.8, 6.5, 15], look: [0, 0, -8], fov: 42, lens: [14, 0], creep: false }]; s.F.splice(1, 0, [0.05, { ...VF.wide, m: 2.2 }]); s.F.fixed = 1; }
  CAM_PUSH = (s.part === 'dry' && g < LN(32, 0.5)) ? 1.3 : 1; applyCam(s.stage, camState(s.F, t)); CAM_PUSH = 1;
  if (s.mode === 'valley') {
    let riverK, lakeK, dry, snow;
    if (s.part === 'dry') { riverK = 1 - 0.88 * ramp(g, ...RIVER()); lakeK = 1 - 0.95 * ramp(g, ...LAKE()); dry = 0.35 * ramp(g, ...GRASS()) + 0.65 * ramp(g, ...FIELD()); snow = 1 - 0.85 * ramp(g, ...SNOW()); }
    else { const back = ramp(g, RAIN_ON() + 0.5, RAIN_ON() + 7); riverK = lerp(0.12, 1, back); lakeK = lerp(0.05, 0.9, ramp(g, RAIN_ON() + 1, RAIN_ON() + 9)); dry = 1 - back; snow = 0.15 + 0.6 * back; s.rain.userData.set(g, ramp(g, RAIN_ON(), RAIN_ON() + 0.8)); }
    v.setWater(riverK, lakeK); v.setDry(dry); v.setSnow(snow);
    v.fish.forEach((f, i) => { const on = riverK > 0.45; f.visible = on || (riverK > 0.15 && i < 2); const pool = riverK > 0.45 ? 0 : 1; const x = (pool ? -2.2 + (i % 2) * 0.4 : -6 + i * 2.2) + Math.sin(g * 0.8 + i * 2) * (pool ? 0.25 : 1.2); f.position.set(x, v.river.position.y - 0.08, v.RZ + Math.sin(g * 0.6 + i) * 0.3); f.rotation.y = Math.cos(g * 0.8 + i * 2) > 0 ? 0 : Math.PI; });
  }
  if (s.mode === 'forest') v.updateForest(g, ramp(g, LN(89, 1.5), LN(89, 7)), ramp(g, LN(92), LN(92, 2)));
  if (s.mode === 'desert') v.updateDesert(g, 0.35 + 0.65 * ramp(g, LN(109), LN(109, 2.5)), ramp(g, LN(111), LN(111, 1.5)));
  actCast(s, g, t, 0);
}
function stormCard(g, t) {
  const w = 620, h = 300, x = E.vertical ? E.W / 2 - w / 2 : E.W * 0.66 - w / 2, y = E.vertical ? VY0 - 60 : 70; const k = ease.outBack(clamp(t / 0.4));
  g.save(); g.translate(x + w / 2, y + h / 2); g.scale(k, k); g.translate(-x - w / 2, -y - h / 2);
  card2d(g, x, y, w, h, () => { const cx = x + 150, cy = y + h / 2, R = 105; g.fillStyle = '#3a8ad0'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.fillStyle = '#6ab04a';
    for (const [a, b, rx, ry] of [[-40, -30, 40, 28], [20, 10, 30, 44], [-50, 40, 26, 22], [50, -40, 30, 18]]) { g.beginPath(); g.ellipse(cx + a, cy + b, rx, ry, 0.4, 0, 7); g.fill(); }
    g.lineWidth = 6; g.strokeStyle = '#1a0d12'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    for (let i = 0; i < 26; i++) { const a = i * 2.4, r = ((i * 37) % 90), px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.9, on = Math.sin(t * 6 + i * 1.7) > 0.2; if (!on) continue; g.fillStyle = '#ffe85a'; g.beginPath(); g.moveTo(px - 6, py - 10); g.lineTo(px + 4, py - 2); g.lineTo(px - 2, py); g.lineTo(px + 6, py + 10); g.lineTo(px - 4, py + 2); g.lineTo(px + 2, py); g.closePath(); g.fill(); }
    text(g, '~2,000', x + 430, y + 140, { size: 84, color: GOLD, font: FONTS.ui, weight: 900 }); text(g, 'STORMS', x + 430, y + 200, { size: 44, color: CREAM, font: FONTS.ui, weight: 900 }); text(g, 'RIGHT NOW', x + 430, y + 245, { size: 36, color: CREAM, font: FONTS.ui, weight: 800 }); });
  g.restore();
}
function valleyOverlay(g, t, info, s) {
  const G = info.globalT;
  if (s.mode === 'valley' && s.part === 'dry') {
    badge(g, G, [[LN(33), 'DAY 1'], [LN(37, 0.5), 'WEEKS'], [LN(43, 0.5), 'MONTHS'], [LN(65, 0.5), 'YEARS']]);
    lab(g, G, 'STREAMS: DAYS · RIVERS: WEEKS', LN(37, 0.4), LN(38), E.W * 0.5, 150, { size: 56 });
    lab(g, G, 'LAKES: MONTHS TO YEARS', LN(43, 0.5), LN(44), E.W * 0.5, 150, { size: 58 });
    lab(g, G, 'GROUNDWATER', LN(47, 1.2), LN(48), E.W * 0.5, 150, { size: 66, color: WATER }); lab(g, G, 'MORE THAN ALL RIVERS + LAKES', LN(47, 2.4), LN(48), E.W * 0.5, 225, { size: 48, color: CREAM });
    lab(g, G, '~70% OF FRESH WATER → FARMS', LN(53, 2.6), LN(54, 1.2), E.W * 0.5, 150, { size: 58 });
    lab(g, G, '1 KG OF BREAD ≈ 1,600 L', LN(55, 1.0), LN(56, 1.6), E.W * 0.5, 150, { size: 62, color: GOLD }); lab(g, G, '≈ 10 BATHTUBS', LN(56, 0.6), LN(56, 3.5), E.W * 0.5, 225, { size: 50, color: CREAM });
    lab(g, G, '1 COW: 100+ LITERS A DAY', LN(59, 0.3), LN(59, 5), E.W * 0.5, 150, { size: 58, color: CREAM });
    lab(g, G, 'NO BREAD · NO PASTA · NO RICE', LN(61, 0.2), LN(61, 4.5), E.W * 0.5, 150, { size: 56, color: CORAL });
    lab(g, G, 'SNOW = FROZEN RAIN', LN(63, 1.2), LN(64), E.W * 0.5, 150, { size: 62, color: CREAM });
    lab(g, G, '1 IN 6 PEOPLE', LN(65, 1.8), LN(66, 1.0), E.W * 0.5, 150, { size: 66 }); lab(g, G, 'DRINK MELTED SNOW & ICE', LN(65, 3.0), LN(66, 1.0), E.W * 0.5, 225, { size: 50, color: CREAM });
  }
  if (s.mode === 'valley' && s.part === 'good') {
    if (win(G, LN(121, 1.2), LN(123, 0.5))) stormCard(g, G - LN(121, 1.2));
    lab(g, G, 'PETRICHOR', LN(125, 0.8), LN(126), E.W * 0.5, 150, { size: 76, color: MINT, mode: 'slam' }); lab(g, G, 'GEOSMIN · FROM SOIL BACTERIA', LN(125, 3.0), LN(126), E.W * 0.5, 230, { size: 48, color: CREAM });
    lab(g, G, '~5 PARTS PER TRILLION', LN(127, 2.0), LN(127, 7), E.W * 0.5, 150, { size: 62 });
  }
  if (s.mode === 'forest') {
    lab(g, G, 'TREES BREATHE OUT WATER', LN(81, 2.0), LN(82, 0.8), E.W * 0.5, 150, { size: 60, color: MINT });
    lab(g, G, '~20 BILLION TONNES', LN(83, 1.6), LN(84, 1.2), E.W * 0.5, 150, { size: 68, color: WATER }); lab(g, G, 'OF WATER · EVERY DAY', LN(83, 2.6), LN(84, 1.2), E.W * 0.5, 225, { size: 50, color: CREAM });
    lab(g, G, 'THE FLYING RIVER', LN(85, 2.4), LN(86, 1.0), E.W * 0.5, 150, { size: 72, color: SKY, mode: 'slam' }); lab(g, G, '> THE AMAZON RIVER', LN(85, 3.4), LN(86, 1.0), E.W * 0.5, 225, { size: 50, color: CREAM });
  }
  if (s.mode === 'desert') {
    lab(g, G, 'ATACAMA DESERT, CHILE', LN(105, 0.4), LN(106), E.W * 0.5, 130, { size: 60 }); lab(g, G, 'SOME STATIONS: NEVER A DROP', LN(105, 3.0), LN(106), E.W * 0.5, 205, { size: 50, color: CREAM });
    lab(g, G, 'MARS ROVER TEST SITE', LN(107, 0.8), LN(108), E.W * 0.5, 150, { size: 58, color: CORAL });
    lab(g, G, 'FOG NETS', LN(109, 1.6), LN(110, 1.0), E.W * 0.5, 150, { size: 72, color: WATER, mode: 'slam' });
    lab(g, G, 'HUNDREDS OF LITERS A DAY', LN(111, 3.5), LN(112), E.W * 0.5, 150, { size: 58 });
    lab(g, G, 'DESALINATION', LN(113, 1.8), LN(114, 0.4), E.W * 0.5, 150, { size: 66, color: WATER }); lab(g, G, 'SEAWATER → DRINKING WATER', LN(113, 2.6), LN(114, 0.4), E.W * 0.5, 225, { size: 46, color: CREAM });
    lab(g, G, 'LOTS OF ENERGY · SALTY LEFTOVERS', LN(115, 0.8), LN(116), E.W * 0.5, 150, { size: 52, color: CORAL });
  }
}

// ---------- register ----------
for (const shot of E.shots) {
  const p = shot.params || {};
  const reg = (init, draw, overlay) => registerShot(shot.id, { kind: '3d', init: () => init(p), draw, overlay });
  if (shot.kind === 'room') reg(buildRoom, roomDraw, roomOverlay);
  if (shot.kind === 'sky') reg(buildSky, skyDraw, skyOverlay);
  if (shot.kind === 'valley') reg(buildValley, valleyDraw, valleyOverlay);
}
