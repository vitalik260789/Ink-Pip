// Episode 03 — "What If the Moon Disappeared?" (full). Reference-matched grammar:
// long continuous location shots, camera glides (~0.9 s ease-in-out) on every line + every ~2.5 s, constant slow push-in,
// dissolves between locations, blurred foreground props, story beats keyed to global time.
import { E, registerShot, ease, clamp, lerp, text, rr, alpha, FONTS } from '/engine/core.js';
import { POSES, posesAt, breathe } from '/engine/rig2d.js';
import { kText } from '/engine/motion.js';
import { THREE } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { room3d } from '../sets/room3d.js';
import { space3d } from '../sets/space3d.js';
import { planet } from '../sets/props3d.js';
import { dune3d, reef3d, beach3d, sprite } from '../sets/worlds3d.js';
import { INK, PIP, LINES, talkOf } from '../cast.js';

const GOLD = '#ffd47e', CORAL = '#ff7a4a', MINT = '#7cf2a8', SKY = '#9fd0ff', CREAM = '#fff1dc';
const sstep = (u) => u * u * u * (u * (u * 6 - 15) + 10);
const toScreen = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * E.W, (1 - p.y) / 2 * E.H, p.z]; };
const win = (g, a, b) => g >= a && g < b;
const lab = (g, G, s, a, b, x, y, o = {}) => { if (win(G, a, b)) kText(g, G - a, s, x, y, { start: 0.05, mode: o.mode || 'drop', size: o.size || 64, color: o.color || GOLD, glow: 22 }); };

// ---------- camera: framings + glides + creep ----------
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
function applyCam(W, s) { const c = W.camera; c.position.set(...s.pos); c.up.set(0, 1, 0); c.lookAt(...s.look); if (s.roll) c.rotateZ(s.roll * Math.PI / 180); c.fov = s.fov; c.updateProjectionMatrix(); W.lens(s.lens[0], s.lens[1]); }
// move times: every line start inside the shot, plus a reframe if a hold would exceed ~2.6 s
function moveTimes(a, b) {
  const ts = [0]; for (const l of LINES) if (l[1] > a + 0.6 && l[1] < b - 0.8) ts.push(l[1] - a - 0.1);
  ts.push(b - a); const out = [0];
  for (let i = 1; i < ts.length; i++) { let p = out[out.length - 1]; while (ts[i] - p > 2.6 + 0.9) { p += 2.4; out.push(p); } if (ts[i] < b - a - 0.5 && ts[i] - out[out.length - 1] > 1.2) out.push(ts[i]); }
  return out;
}
const speakerAt = (g) => (LINES.find(l => g >= l[1] - 0.15 && g <= l[2]) || [null])[0];
// build framings: pick(gGlobal, index, speaker) -> framing
function framings(a, b, pick, extra = []) {
  const F = moveTimes(a, b).map((t, i) => [t, { ...pick(a + t + 0.2, i, speakerAt(a + t + 0.2)) }]);
  for (const [t, f] of extra) { let j = F.findIndex(x => x[0] > t); if (j < 0) j = F.length; F.splice(j, 0, [t, f]); }
  return F.filter((x, i) => i === 0 || x[0] - F[i - 1][0] > 0.35);
}

// ---------- sparkle burst ----------
function burst(g, t, t0, x, y, col = '#fff6d8', n = 14, R = 120) {
  const u = (t - t0) / 0.6; if (u < 0 || u > 1) return; g.save(); g.globalAlpha = 1 - u;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + i, r = R * ease.out(u) * (0.6 + 0.4 * ((i * 7) % 5) / 5), sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r, s = 14 * (1 - u) + 4;
    g.fillStyle = col; g.beginPath(); for (let k = 0; k < 8; k++) { const aa = k * Math.PI / 4, rr2 = k % 2 ? s * 0.35 : s; g.lineTo(sx + Math.cos(aa) * rr2, sy + Math.sin(aa) * rr2); } g.closePath(); g.fill(); }
  g.restore();
}
function card2d(g, x, y, w, h, fn) { g.save(); rr(g, x, y, w, h, 22); g.fillStyle = 'rgba(14,16,40,.82)'; g.fill(); g.lineWidth = 4; g.strokeStyle = alpha(GOLD, 0.7); g.stroke(); fn(); g.restore(); }

// ---------- characters ----------
const PIP_AT = [-0.75, -0.15], INK_AT = [0.7, -0.35];
function poseOf(spec, t, speaking) { const p = spec?.[1] ?? 'stand'; let pose = POSES[p] || POSES.stand; if (speaking && (p === 'stand' || p === 'relaxed')) pose = posesAt(t, [[0, POSES.stand], [0.3, POSES.talk]]); return pose; }
// acting beats by global time: [t, pipSpec, inkSpec]
const ACT = [
  [0, ['awe', 'pointUp'], ['neutral', 'stand']], [1.8, ['shocked', 'handsOnHead'], ['neutral', 'stand']], [2.5, ['worried', 'stand'], ['smirk', 'explain']], [4.0, ['surprised', 'point'], ['neutral', 'crossArms']],
  [5.7, ['worried', 'think'], ['smirk', 'explain']], [14.4, ['nervous', 'shrug'], ['smirk', 'stand']],
  [55.3, ['thinking', 'think'], ['neutral', 'stand']], [57.0, ['awe', 'stand'], ['smirk', 'explain']], [63.6, ['surprised', 'point'], ['neutral', 'crossArms']], [66.1, ['awe', 'stand'], ['smile', 'explain']],
  [71.9, ['joy', 'cheer'], ['smirk', 'stand']], [74.6, ['happy', 'stand'], ['smirk', 'explain']], [78.3, ['smile', 'shrug'], ['neutral', 'stand']], [79.5, ['curious', 'stand'], ['smirk', 'explain']],
  [82.0, ['confused', 'shrug'], ['smile', 'explain']], [92.1, ['thinking', 'think'], ['smirk', 'crossArms']], [95.0, ['angry', 'crossArms'], ['smirk', 'stand']], [96.7, ['surprised', 'point'], ['smile', 'explain']],
  [154.6, ['curious', 'stand'], ['neutral', 'stand']], [157.0, ['awe', 'stand'], ['smirk', 'explain']], [184.0, ['confused', 'shrug'], ['neutral', 'explain']], [196.2, ['sad', 'sad'], ['neutral', 'stand']],
  [363.5, ['awe', 'pointUp'], ['smile', 'explain']], [378.5, ['awe', 'stand'], ['smile', 'stand']],
  [416.0, ['joy', 'cheer'], ['smile', 'stand']], [418.1, ['happy', 'stand'], ['smile', 'explain']], [419.4, ['joy', 'pointUp'], ['smirk', 'stand']], [422.9, ['awe', 'stand'], ['smirk', 'explain']],
  [433.1, ['surprised', 'stand'], ['smirk', 'crossArms']], [436.0, ['nervous', 'shrug'], ['smile', 'stand']], [438.4, ['happy', 'stand'], ['smile', 'explain']],
  [464.2, ['thinking', 'think'], ['smirk', 'crossArms']], [465.7, ['surprised', 'stand'], ['smirk', 'explain']], [473.0, ['joy', 'cheer'], ['smile', 'relaxed']], [474.2, ['happy', 'wave'], ['smile', 'explain']], [477.7, ['joy', 'point'], ['smile', 'wave']],
];
const actAt = (g) => { let a = ACT[0]; for (const x of ACT) if (g >= x[0] - 0.08) a = x; return a; };
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

// ================= ROOM (night) =================
const RF = {
  wide: { pos: [0.25, 1.32, 3.1], look: [0.35, 1.45, -1.2], fov: 38, lens: [3.6, 6] },
  two: { pos: [0.05, 1.2, 2.8], look: [0.1, 1.25, -0.6], fov: 36, lens: [3.1, 10] },
  pip: { pos: [-0.25, 1.3, 2.4], look: [-0.55, 1.3, -0.2], fov: 34, lens: [2.6, 12] },
  pip2: { pos: [-0.05, 1.22, 2.55], look: [-0.5, 1.28, -0.3], fov: 35, lens: [2.8, 11] },
  ink: { pos: [1.1, 1.32, 2.3], look: [0.72, 1.28, -0.45], fov: 34, lens: [2.6, 12] },
  ink2: { pos: [0.55, 1.28, 2.6], look: [0.6, 1.28, -0.5], fov: 35, lens: [3.0, 10] },
  window: { pos: [0.4, 1.36, 2.7], look: [1.0, 1.62, -2.0], fov: 36, lens: [3.2, 9] },
};
const roomPick = (g, i, who) => who === 'PIP' ? (i % 2 ? RF.pip2 : RF.pip) : who === 'INK' ? (i % 3 === 2 ? RF.window : i % 2 ? RF.ink2 : RF.ink) : RF.two;
function buildRoom(p) {
  const W = W3.inkWorld({ look: 'night', fov: 38, fog: [14, 60], bloom: 0.5, exposure: 1.6 });
  const room = room3d(W, { night: true, foreground: [-0.72, 1.6] });
  const s = { stage: W, room, ...castCards(W) };
  if (p.disco) { s.disco = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshLambertMaterial({ map: W3.paintTex(256, 128, (g, w, h) => { for (let x = 0; x < w; x += 16) for (let y = 0; y < h; y += 16) { const v = 150 + ((x * 7 + y * 13) % 100); g.fillStyle = `rgb(${v},${v},${v + 20})`; g.fillRect(x + 1, y + 1, 14, 14); } }) })); s.disco.position.set(0.0, 1.85, -0.9); W.scene.add(s.disco); }
  return s;
}
function roomFram(p, a, b) {
  const extra = [];
  if (p.part === 'start') { extra.push([0, RF.wide]); extra.push([b - a - 0.55, { pos: [1.65, 1.72, -2.7], look: [1.7, 1.8, -9], fov: 40, m: 0.55, ease: 'in', lens: [8, 0], creep: false }]); }
  if (p.part === 'end') extra.push([0, RF.two], [b - a - 4.2, RF.wide]);
  const F = framings(a, b, roomPick, []); F[0] = [0, { ...(extra.length ? extra[0][1] : F[0][1]) }];
  const rest = extra.slice(1); for (const [t, f] of rest) { const j = F.findIndex(x => x[0] > t - 0.4); if (j >= 0) F.splice(j, F.length - j); F.push([t, f]); }
  return F;
}
function roomDraw(s, t, info) {
  const g = info.globalT, p = info;
  s.F ||= roomFram(p, info.shot.start, info.shot.end); applyCam(s.stage, camState(s.F, t));
  const mo = p.part === 'start' ? 1 - ease.in(clamp((g - 1.55) / 0.25)) : p.part === 'end' ? ease.outBack(clamp((g - 466.3) / 0.35)) : 0;
  s.room.sunDisc.scale.setScalar(Math.max(0.001, mo)); s.room.sunDisc.visible = mo > 0.01;
  actCast(s, g, t);
  if (s.disco) { const k = ease.outBack(clamp((g - 419.6) / 0.5)) * (g > 436.0 ? lerp(1, 0.45, clamp((g - 436) / 0.6)) : 1); s.disco.scale.setScalar(Math.max(0.001, k)); s.disco.rotation.y = g * 0.8; s.disco.position.y = 1.85 + Math.sin(g * 1.5) * 0.05; }
  s.moonScreen = toScreen(s.room.sunDisc.position, s.stage.camera);
}
function roomOverlay(g, t, info, s) {
  const G = info.globalT, [mx, my] = s.moonScreen || [0, 0];
  burst(g, G, 1.6, mx, my, '#fff6d8', 16, 150); burst(g, G, 466.4, mx, my, '#fff6d8', 16, 150);
  lab(g, G, 'FULL MOON = 100× STARLIGHT', 58.5, 66, E.W * 0.5, 150, { size: 60 });
  lab(g, G, 'A GIANT MIRROR', 66.5, 71.8, E.W * 0.72, 150, { color: CREAM });
  lab(g, G, 'WAY MORE STARS', 72.2, 78.2, E.W * 0.74, 150);
  if (win(G, 83.0, 96.7)) monthStrip(g, G - 83.0);
  if (win(G, 99.0, 111.5)) card2d(g, E.W * 0.6, 110, 640, 150, () => { text(g, '12 MOONWALKERS', E.W * 0.6 + 320, 175, { size: 54, color: GOLD, font: FONTS.ui, weight: 900 }); text(g, '1969 – 1972', E.W * 0.6 + 320, 228, { size: 40, color: CREAM, font: FONTS.ui, weight: 800 }); });
  lab(g, G, 'EVERYTHING HUMANS BUILT', 423.5, 433.0, E.W * 0.5, 130, { size: 56, color: CREAM }); lab(g, G, '≈ 1.1 TRILLION TONNES', 425.0, 433.0, E.W * 0.5, 205, { size: 64 });
  lab(g, G, 'MOON: ~70,000,000× HEAVIER', 433.8, 440.5, E.W * 0.5, 160, { size: 70, color: CORAL, mode: 'slam' });
  lab(g, G, 'THE SEATBELT', 466.6, 474.0, E.W * 0.74, 170, { size: 76, color: MINT, mode: 'slam' });
  if (G > 474.3) endScreen(g, G - 474.3);
}
function monthStrip(g, t) {
  const n = 8, x0 = E.W / 2 - 420, y = 170, k = ease.out(clamp(t / 0.4));
  card2d(g, x0 - 40, y - 80, 920, 200, () => {
    for (let i = 0; i < n; i++) { const x = x0 + i * 120, ph = i / (n - 1); g.globalAlpha = clamp(k * 3 - i * 0.25); g.fillStyle = '#2a2a4a'; g.beginPath(); g.arc(x, y, 38, 0, 7); g.fill();
      g.fillStyle = '#fbf4e4'; g.beginPath(); const c = Math.cos(ph * Math.PI * 2); g.arc(x, y, 38, -Math.PI / 2, Math.PI / 2, ph > 0.5); g.ellipse(x, y, Math.abs(c) * 38, 38, 0, Math.PI / 2, -Math.PI / 2, (ph > 0.5) === (c > 0)); g.fill(); g.strokeStyle = '#0d0a14'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 38, 0, 7); g.stroke(); }
    g.globalAlpha = 1; text(g, 'MONTH = "MOON-TH" · 29.5 DAYS', E.W / 2, y + 85, { size: 40, color: GOLD, font: FONTS.ui, weight: 900 });
  });
}
function endScreen(g, t) {
  const k = ease.outBack(clamp(t / 0.5)); g.save(); g.translate(E.W * 0.5, E.H * 0.2); g.scale(k, k);
  rr(g, -230, -60, 460, 120, 60); g.fillStyle = '#e8322e'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#1a0d12'; g.stroke();
  text(g, 'SUBSCRIBE', 0, 18, { size: 64, color: '#ffffff', font: FONTS.ui, weight: 900 }); g.restore();
  if (t > 3.4) kText(g, t - 3.4, 'WHAT SHOULD WE MAKE DISAPPEAR NEXT?', E.W / 2, E.H * 0.36, { start: 0.05, mode: 'drop', size: 52, color: GOLD, glow: 20 });
}

// ================= SPACE =================
const SF = {
  a: { pos: [0.6, 0.5, 7.6], look: [0.6, 0, 0], fov: 35, lens: [7.6, 0] }, b: { pos: [-0.4, 0.9, 7.0], look: [-0.2, 0, 0], fov: 35, lens: [7, 0] },
  c: { pos: [1.4, 0.2, 8.4], look: [1.5, 0, 0], fov: 35, lens: [8.4, 0] }, d: { pos: [0.2, -0.3, 7.2], look: [0.3, 0.1, 0], fov: 34, roll: 3, lens: [7.2, 0] },
  moon: { pos: [2.4, 0.9, 10.6], look: [2.6, 0.1, 0], fov: 36, lens: [10, 0] }, moon2: { pos: [1.6, 0.4, 9.6], look: [2.2, 0.2, 0], fov: 35, lens: [9.6, 0] },
  side: { pos: [-3.4, 1.1, 6.9], look: [0, 0, 0], fov: 35, lens: [7.6, 0] }, side2: { pos: [-2.6, 0.5, 7.4], look: [0.2, 0, 0], fov: 35, roll: -3, lens: [7.6, 0] },
  wide: { pos: [3.0, 2.6, 15], look: [3.0, 0, 0], fov: 38, lens: [15, 0] }, wide2: { pos: [2.4, 1.6, 13.6], look: [2.6, 0.2, 0], fov: 37, lens: [13.6, 0] },
};
const SPACE_SETS = {   // per space shot: which framings to cycle
  title: [SF.moon, SF.moon2], bary: [SF.wide, SF.wide2], mars: [SF.wide, SF.wide2], bulge: [SF.moon, SF.moon2, SF.a], brake: [SF.moon, SF.a, SF.moon2, SF.b],
  tilt: [SF.a, SF.b, SF.c, SF.d], side: [SF.side, SF.side2], myth: [SF.moon, SF.moon2], drift: [SF.wide, SF.wide2],
};
const tiltAt = (g) => g < 319 ? 23.4 + Math.sin(g * 2.1) * 0.5 : g < 349.9 ? lerp(23.4, 85, ease.inOut(clamp((g - 320.5) / 7.5))) : lerp(85, 0, ease.inOut(clamp((g - 352.6) / 3.5)));
// Moon visibility per beat (1 = there, ghost < 1)
function moonState(g) {
  if (g < 46.2) return 1; if (g < 46.7) return 1 - ease.in(clamp((g - 46.2) / 0.5));
  if (g < 98.0) return 0; if (g < 115) return 1;                  // Mars comparison (the real Moon, history)
  if (g < 175.2) return g > 160 ? 1 : 0;                           // tide bulges flashback
  if (g < 261) return 0;
  if (g < 283.4) return 1; if (g < 299.0) return 0.55;             // brake → then "hand" ghost
  if (g < 312.3) return 0.55; if (g < 312.8) return 0.55 * (1 - ease.in(clamp((g - 312.3) / 0.5)));
  if (g < 387) return 0; return 1;                                 // myth, drift: the real Moon
}
function buildSpace(p) {
  const W = W3.inkWorld({ look: 'space', fov: 35, bloom: 0.7, exposure: 1.7, sky: ['#1c1f44', '#45426e'], lookOverride: { hemiI: 0.8, keyI: 3.0, hemiSky: '#6a74c8' } });
  const sp = space3d(W);
  const moon = planet(W, 'moon', 0.62); moon.position.set(5.6, 0.3, -1.2); moon.traverse(m => { if (m.material) m.material.transparent = true; });
  const water = new THREE.Mesh(new THREE.SphereGeometry(2.0, 96, 64), new THREE.MeshLambertMaterial({ color: '#5ab4f0', transparent: true, opacity: 0.4, depthWrite: false })); water.userData.noink = true; W.scene.add(water);
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 6.2, 12), W3.glow('#ffd47e', 1.6)); axis.userData.noink = true; sp.tilt.add(axis);
  const s = { stage: W, sp, moon, water, axis, kind: p.set };
  if (p.set === 'mars') { s.mars = new THREE.Mesh(new THREE.SphereGeometry(0.35, 48, 32), W3.paint('#ffffff', W3.paintTex(512, 256, (g, w, h) => { g.fillStyle = '#c8603a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,50,30,.6)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 97) % w, (i * 53) % h, 8 + (i % 5) * 6, 0, 7); g.fill(); } g.fillStyle = '#f4ece0'; g.fillRect(0, 0, w, 14); }))); s.mars.position.set(26, 1.2, -6); W.scene.add(s.mars); }
  if (p.set === 'myth') { s.rocks = []; for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (i % 3) * 0.05), W3.paint('#8a7a6a', null, { flatShading: true })); W.scene.add(r); s.rocks.push(r); } }
  return s;
}
function spaceFram(p, a, b) { const set = SPACE_SETS[p.set] || SPACE_SETS.tilt; const F = framings(a, b, (g, i) => set[i % set.length]);
  if (p.set === 'title') F[0] = [0, { pos: [2.6, 1.1, 18], look: [2.6, 0.2, 0], fov: 36, lens: [18, 0], creep: false }], F.splice(1, 0, [0.05, { ...SF.moon, m: 1.3 }]);
  if (p.set === 'side' || p.set === 'tilt') { const j = F.findIndex(x => x[0] > 332.4 - a - 0.3); if (p.set === 'tilt' && j > 0) { F.splice(j); const set2 = SPACE_SETS.side; const G = framings(332.4, b, (g, i) => set2[i % 2]).map(([t, f]) => [t + 332.4 - a, f]); F.push(...G); } }
  return F; }
function spaceDraw(s, t, info) {
  const g = info.globalT, p = info;
  s.F ||= spaceFram(p, info.shot.start, info.shot.end); applyCam(s.stage, camState(s.F, t));
  if (win(g, 329.8, 330.3)) W3.kick(s.stage, g, 329.9, 0.03);
  const tilt = tiltAt(g), wob = win(g, 319, 352) ? Math.sin((g - 319) * 1.6) * 0.25 * clamp((g - 319) / 2) : 0;
  s.sp.tilt.rotation.set(wob * 0.6, 0, tilt * Math.PI / 180);
  s.sp.setSpin(g * 0.9 + 2.2);
  // Moon: orbit position per shot
  const m = moonState(g); let mp = [5.6, 0.3, -1.2];
  if (p.set === 'bary') { const a = (g - 28.5) * 0.55, d = 6.2, k = clamp(1 - (g - 46.4) * 2); const off = 1.46 * k; s.sp.tilt.position.set(-Math.cos(a) * off + off, 0, Math.sin(a) * off); s.sp.glow.position.copy(s.sp.tilt.position); mp = [off + Math.cos(a) * d, 0.3, -Math.sin(a) * d]; }
  if (p.set === 'drift') mp = [lerp(5.6, 9.5, ease.inOut(clamp((g - 444) / 18))), 0.3, -1.2];
  if (p.set === 'mars') mp = [4.2, 0.4, -0.6];
  s.moon.position.set(...mp); s.moon.visible = m > 0.01; s.moon.rotation.y = g * 0.05;
  s.moon.traverse(x => { if (x.material) x.material.opacity = m >= 1 ? 1 : m / 0.55 * 0.6; }); if (m < 1 && m > 0.6) s.moon.scale.setScalar(lerp(0.2, 1, m)); else s.moon.scale.setScalar(1);
  // tides
  let k = 0, dir = s.moon.position.clone().normalize();
  if (p.set === 'bulge') k = 0.22 * clamp((g - 161) / 1.2) * (1 - clamp((g - 175.6) / 0.6));
  if (p.set === 'title' || p.set === 'brake') k = 0.12 * m;
  s.water.visible = k > 0.004; s.water.scale.set(1.005 + k, 1.005, 1.005); s.water.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir); s.water.position.copy(s.sp.tilt.position);
  s.axis.visible = g > 290 && g < 364;
  if (s.rocks) s.rocks.forEach((r, i) => { const u = ((g - 388 + i * 2.1) % 7) / 7, side = i % 2 ? 1 : -1; r.position.set(lerp(18, -3, u), lerp(4 + i * 0.6, 0.4 + side * 3.5 * (1 - u * 0.2), u), lerp(-10, 2 + side * 3, u)); r.rotation.set(g * 2 + i, g * 3, 0); r.visible = g > 388.5; });
  s.ear = toScreen(s.sp.tilt.position.clone(), s.stage.camera); s.ms = toScreen(s.moon.position.clone(), s.stage.camera);
  if (s.mars) s.marsS = toScreen(s.mars.position.clone(), s.stage.camera);
}
function spaceOverlay(g, t, info, s) {
  const G = info.globalT, cam = s.stage.camera;
  if (win(G, 16.6, 27.5)) { const k = ease.outBack(clamp((G - 16.7) / 0.5)); g.save(); g.translate(E.W / 2, E.H * 0.42); g.scale(k, k); text(g, 'WHAT IF THE MOON', 0, -40, { size: 104, color: CREAM, font: FONTS.ui, weight: 900 }); text(g, 'DISAPPEARED?', 0, 70, { size: 128, color: GOLD, font: FONTS.ui, weight: 900 }); g.restore(); }
  if (info.set === 'bary' && G < 47.5 && s.ear) { // balance point marker: 73 % of Earth's radius toward the Moon
    const bp = toScreen(new THREE.Vector3(1.46, 0, 0), cam); g.save(); g.strokeStyle = MINT; g.lineWidth = 6; g.globalAlpha = clamp((G - 32) / 0.5) * (1 - clamp((G - 46.5) / 0.8)); g.beginPath(); g.moveTo(bp[0] - 18, bp[1] - 18); g.lineTo(bp[0] + 18, bp[1] + 18); g.moveTo(bp[0] + 18, bp[1] - 18); g.lineTo(bp[0] - 18, bp[1] + 18); g.stroke(); g.restore();
    lab(g, G, 'BALANCE POINT · 4,700 KM FROM CENTRE', 33.5, 46.5, E.W * 0.5, 150, { size: 54, color: MINT }); }
  if (s.ms && (win(G, 46.3, 47.0))) burst(g, G, 46.35, s.ms[0], s.ms[1], '#fff6d8', 16, 150);
  if (info.set === 'mars' && s.marsS) { g.save(); g.setLineDash([16, 14]); g.strokeStyle = alpha(CREAM, 0.7); g.lineWidth = 5; g.beginPath(); g.moveTo(s.ear[0], s.ear[1]); g.lineTo(s.ms[0], s.ms[1]); g.stroke(); g.strokeStyle = alpha(CORAL, 0.8); g.beginPath(); g.moveTo(s.ms[0], s.ms[1]); g.lineTo(s.marsS[0], s.marsS[1]); g.stroke(); g.restore();
    lab(g, G, 'MOON', 99.5, 115, s.ms[0], s.ms[1] - 70, { size: 44, color: CREAM }); lab(g, G, 'MARS: 140× FARTHER', 104.5, 115, Math.min(E.W - 300, s.marsS[0]), s.marsS[1] - 70, { size: 52, color: CORAL }); }
  lab(g, G, 'TWO TIDE BULGES', 162.0, 175.5, E.W * 0.5, 150, { size: 64 });
  lab(g, G, 'TIDAL BRAKE', 262.9, 273.0, E.W * 0.5, 140, { size: 66, color: CORAL }); lab(g, G, '+2 MILLISECONDS PER CENTURY', 266.0, 273.0, E.W * 0.5, 215, { size: 50, color: CREAM });
  lab(g, G, '70 MILLION YEARS AGO: DAY ≈ 23.5 H', 276.5, 283.3, E.W * 0.5, 150, { size: 56 });
  if (win(G, 291.5, 335.5)) { const d = tiltAt(G); kText(g, G - 291.5, `TILT ${d.toFixed(d < 30 ? 1 : 0)}°`, E.W * 0.8, 190, { start: 0.05, mode: 'drop', size: 70, color: d > 40 ? CORAL : GOLD, glow: 22 }); }
  lab(g, G, 'SEASONS', 296.0, 301.3, E.W * 0.2, 190, { size: 60, color: MINT });
  lab(g, G, 'MARS: TILT SWINGS FAR MORE', 314.0, 319.6, E.W * 0.32, 190, { size: 50, color: CORAL });
  if (s.ms && win(G, 312.2, 313.0)) burst(g, G, 312.35, s.ms[0], s.ms[1], '#fff6d8', 12, 110);
  lab(g, G, '6 MONTHS DAY', 336.0, 349.8, E.W * 0.22, 170, { size: 56 }); lab(g, G, '6 MONTHS NIGHT', 337.0, 349.8, E.W * 0.78, 170, { size: 56, color: '#9fb6ff' });
  if (win(G, 352.5, 363.6)) { kText(g, G - 352.5, `TILT ${tiltAt(G).toFixed(0)}°`, E.W * 0.8, 190, { start: 0.05, mode: 'drop', size: 70, color: GOLD, glow: 22 }); lab(g, G, 'NO SEASONS', 355.0, 363.6, E.W * 0.22, 190, { size: 60, color: SKY }); }
  if (win(G, 388.0, 401.0)) { const k = ease.outBack(clamp((G - 388.2) / 0.35)); g.save(); g.translate(E.W * 0.2, 190); g.rotate(-0.12); g.scale(k, k); rr(g, -150, -55, 300, 110, 16); g.lineWidth = 9; g.strokeStyle = CORAL; g.stroke(); text(g, 'MYTH', 0, 24, { size: 78, color: CORAL, font: FONTS.ui, weight: 900 }); g.restore(); }
  lab(g, G, 'MOON SHIELD: BUSTED', 412.9, 416.1, E.W * 0.5, 160, { size: 66, color: MINT, mode: 'slam' });
  lab(g, G, '3.8 CM PER YEAR', 444.0, 452.8, E.W * 0.5, 150, { size: 72 });
  lab(g, G, 'THE LAST TOTAL ECLIPSE: ~600 MILLION YEARS', 454.5, 464.2, E.W * 0.5, 150, { size: 50, color: CREAM });
}

// ================= DUNE (dung beetle) =================
const beetleAt = (g) => { // straight line under the Moon, crooked loops after it's gone
  const t = g - 114.7; if (g < 124.5) return [lerp(-1.2, 1.4, t / 9.8), 0, lerp(0.4, -0.6, t / 9.8), Math.atan2(2.6, -1.0)];
  const u = g - 124.5; const x = 1.4 + Math.sin(u * 0.9) * 0.9 - u * 0.05, z = -0.6 + Math.cos(u * 1.3) * 0.5 - 0.5 + u * 0.02; const dx = Math.cos(u * 0.9) * 0.81 - 0.05, dz = -Math.sin(u * 1.3) * 0.65 + 0.02; return [x, 0, z, Math.atan2(dx, dz)];
};
function buildDune() { const W = W3.inkWorld({ look: 'night', fov: 38, fog: [14, 80], bloom: 0.6, exposure: 1.9, sky: ['#2a3474', '#7a6ab0'], lookOverride: { fog: '#5a5aa0' } }); return { stage: W, d: dune3d(W) }; }
function duneDraw(s, t, info) {
  const g = info.globalT, [x, , z, a] = beetleAt(g), y = s.d.h(x, z);
  s.d.ball.position.set(x + Math.sin(a) * 0.2, y + 0.13, z + Math.cos(a) * 0.2); s.d.ball.rotation.set(g * 4, a, 0);
  s.d.beetle.position.set(x, y + 0.06, z); s.d.beetle.rotation.set(-0.5, a, 0);
  const mo = 1 - clamp((g - 123.6) / 1.2); s.d.moon.material.opacity = mo; s.d.moon.visible = mo > 0.01; s.d.stars.material.opacity = lerp(0.95, 0.5, mo);
  s.stage.hemi.intensity = lerp(0.9, 1.7, mo); s.stage.sun.intensity = lerp(0.6, 2.2, mo);
  // camera follows the beetle (continuous move), side swaps at line starts
  const F = s.F ||= framings(info.shot.start, info.shot.end, (gg, i) => ({ off: [[1.1, 0.42, 1.5], [-1.0, 0.36, 1.3], [0.4, 0.5, 1.8]][i % 3] }));
  let i = 0; while (i < F.length - 1 && t >= F[i + 1][0]) i++; const f0 = F[Math.max(0, i - 1)][1].off, f1 = F[i][1].off, u = i ? sstep(clamp((t - F[i][0]) / 0.9)) : 1;
  const off = f0.map((v, j) => lerp(v, f1[j], u)), c = s.stage.camera; c.position.set(x + off[0], y + off[1], z + off[2]); c.up.set(0, 1, 0); c.lookAt(x, y + 0.32, z - 1.2); c.fov = 38; c.updateProjectionMatrix(); s.stage.lens(Math.hypot(...off), 12);
}
function duneOverlay(g, t, info) { const G = info.globalT; lab(g, G, 'STEERS BY MOONLIGHT', 115.8, 123.0, E.W * 0.5, 150, { size: 62 }); lab(g, G, 'NO MOON = CROOKED PATH', 126.0, 130.6, E.W * 0.5, 150, { size: 62, color: CORAL }); }

// ================= REEF =================
const REF = [{ pos: [0, 1.2, 4.2], look: [0, 0.8, -3], fov: 38, lens: [5, 8] }, { pos: [1.6, 0.6, 2.6], look: [-0.4, 0.7, -3], fov: 36, lens: [4, 10] }, { pos: [-1.2, 0.7, 3.0], look: [0.2, 2.6, -4], fov: 38, lens: [5, 6] }, { pos: [0.6, 0.45, 1.8], look: [0.3, 0.5, -2.5], fov: 34, lens: [3.2, 12] }];
const DEEPF = [{ pos: [0, 3.5, 10], look: [0, 2.5, -10], fov: 40, lens: [12, 0] }, { pos: [-3, 2.2, 8], look: [-1, 2.8, -12], fov: 40, lens: [12, 0] }, { pos: [3, 4.5, 9], look: [1, 2, -12], fov: 40, lens: [12, 0] }];
function buildReef(p) { const deep = !!p.deep; const W = W3.inkWorld({ look: 'day', fov: 38, fog: deep ? [4, 40] : [3, 24], bloom: 0.5, exposure: deep ? 1.5 : 1.4, sky: deep ? ['#14285a', '#2a4a8a'] : ['#2a6ab0', '#5ab0d8'], lookOverride: { fog: deep ? '#2a4a8a' : '#4aa0d0', key: '#cfe8ff', hemiSky: '#9ad0ff', hemiGround: '#3a5a7a' } }); return { stage: W, r: reef3d(W, { deep }), deep }; }
function reefDraw(s, t, info) {
  const g = info.globalT; s.F ||= framings(info.shot.start, info.shot.end, (gg, i) => (s.deep ? DEEPF : REF)[i % (s.deep ? 3 : 4)]); applyCam(s.stage, camState(s.F, t));
  const amt = s.deep ? (g < 218.9 ? 1 : lerp(1, 0.25, clamp((g - 218.9) / 2))) : g < 138 ? 0.05 : g < 146.9 ? lerp(0.05, 1, clamp((g - 138) / 3)) : lerp(1, 0.12, clamp((g - 147) / 2.5));
  s.r.particles(g, amt); s.r.weeds.forEach((w, i) => { w.rotation.z = Math.sin(g * 1.1 + i) * 0.12; });
  s.r.shafts.forEach((sh, i) => { sh.material.opacity = (s.deep ? 0.04 : 0.09) * (0.7 + 0.3 * Math.sin(g * 0.8 + i * 1.7)); });
}
function reefOverlay(g, t, info) { const G = info.globalT;
  lab(g, G, '130+ CORAL SPECIES', 132.0, 137.6, E.W * 0.5, 150, { size: 62 }); lab(g, G, 'SAME FEW NIGHTS', 134.0, 137.6, E.W * 0.5, 225, { size: 50, color: CREAM });
  lab(g, G, 'WATER TEMPERATURE → MONTH', 140.0, 145.8, E.W * 0.5, 140, { size: 50, color: CREAM }); lab(g, G, 'MOONLIGHT → NIGHT', 142.3, 145.8, E.W * 0.5, 210, { size: 58 });
  lab(g, G, 'TIDES STIR THE DEEP OCEAN', 200.0, 209.6, E.W * 0.5, 150, { size: 62 }); lab(g, G, '~½ OF THE MIXING ENERGY', 212.0, 218.6, E.W * 0.5, 150, { size: 64, color: GOLD });
  lab(g, G, 'WARM', 203.0, 226.0, E.W * 0.2, 300, { size: 54, color: '#ff9a5a' }); lab(g, G, 'COLD', 203.6, 226.0, E.W * 0.8, 300, { size: 54, color: '#6ad0ff' }); }

// ================= BEACH =================
const BF = { two: { pos: [0.05, 1.35, 4.3], look: [0.0, 0.7, -2.5], fov: 38, lens: [4.2, 7] }, pip: { pos: [-0.3, 1.3, 4.1], look: [-0.8, 1.05, 0.6], fov: 34, lens: [3.0, 10] },
  ink: { pos: [1.2, 1.3, 4.0], look: [0.75, 1.05, 0.5], fov: 34, lens: [3.1, 10] }, tide: { pos: [2.3, 1.2, 0.4], look: [0.2, 0.0, -3.5], fov: 38, lens: [4.5, 6] },
  crab: { pos: [-0.7, 0.45, -0.5], look: [-1.5, 0.12, -2.1], fov: 36, lens: [1.8, 14] }, crab2: { pos: [2.4, 0.5, -1.2], look: [1.8, 0.15, -2.7], fov: 36, lens: [1.7, 14] },
  up: { pos: [0.0, 0.9, 3.6], look: [0, 6, -12], fov: 44, lens: [12, 0] }, up2: { pos: [0.4, 1.0, 3.2], look: [0, 7, -12], fov: 40, lens: [12, 0] },
  pools: { pos: [0.3, 1.6, 2.6], look: [-0.4, 0.0, -2.0], fov: 40, lens: [4.5, 6] }, pools2: { pos: [-1.6, 1.0, 1.6], look: [-0.2, 0.2, -2.4], fov: 38, lens: [3.8, 8] }, moonsky: { pos: [0, 1.2, 3.2], look: [3, 4, -20], fov: 40, lens: [20, 0] } };
function buildBeach(p) {
  const mode = p.mode || 'day';
  const W = mode === 'ancient' ? W3.inkWorld({ look: 'golden', fov: 38, fog: [20, 120], bloom: 0.6, exposure: 1.5, sky: ['#4a3a7a', '#e89a6a'] }) : W3.inkWorld({ look: 'day', fov: 38, fog: [25, 160], bloom: 0.5, exposure: 1.45 });
  const b = beach3d(W, { mode }); const s = { stage: W, b, mode };
  if (mode !== 'ancient') Object.assign(s, castCards(W, { pip: [-0.8, 1.1], ink: [0.75, 0.9], rim: '#fff1dc' }));
  return s;
}
function beachPick(mode, a) { return (g, i, who) => {
  if (mode === 'sky') return [BF.up, BF.up2][i % 2];
  if (mode === 'ancient') return [BF.pools, BF.moonsky, BF.pools2][i % 3];
  if (g > 186 && g < 197.2) return [BF.crab, BF.crab2][i % 2];
  if (g > 157 && g < 168) return BF.tide;
  return who === 'PIP' ? BF.pip : who === 'INK' ? (i % 2 ? BF.tide : BF.ink) : BF.two; }; }
function beachDraw(s, t, info) {
  const g = info.globalT; s.F ||= framings(info.shot.start, info.shot.end, beachPick(s.mode, info.shot.start)); applyCam(s.stage, camState(s.F, t));
  // tide: big swings with the Moon, shallow (46 %) without it; ancient = huge fast tides
  let amp = 0.4, per = 6; if (s.mode === 'ancient') { amp = 0.6; per = 5; } else if (g > 176) amp = lerp(0.4, 0.18, clamp((g - 177) / 4));
  const y = -0.48 + amp * (0.5 + 0.5 * Math.sin(g / per * Math.PI * 2)); const shore = s.b.setTide(y);
  s.b.crabs.forEach((c, i) => { const [x, z] = c.userData.home; const hop = g > 186 ? Math.abs(Math.sin(g * 6 + i)) * 0.06 : 0; c.position.set(x + Math.sin(g * 1.7 + i * 2) * 0.15, s.b.h(x, z) + 0.17 + hop, z); c.visible = s.mode !== 'ancient' && (z > shore - 0.1 || s.mode === 'sky'); });
  if (s.mode === 'ancient') { s.b.bird.visible = false; s.b.stars.forEach(x => { x.visible = false; }); }
  s.b.bird.position.y = s.b.h(3.2, -1.6) + 0.27 + Math.abs(Math.sin(g * 3)) * 0.03;
  if (s.b.sky?.corona) { const k = clamp((g - 368.5) / 7.5), tot = clamp((g - 376) / 0.6) * (1 - clamp((g - 386.5) / 0.8)); s.b.sky.moon.position.x = lerp(-4.6, 0, ease.inOut(k)); s.b.sky.corona.material.opacity = tot; s.stage.hemi.intensity = lerp(s.stage.L.hemiI, 0.35, tot); s.stage.sun.intensity = lerp(s.stage.L.keyI, 0.3, tot); s.stage.scene.background = tot > 0.5 ? (s.nightBg ||= new THREE.Color('#1a1f4a')) : s.dayBg ||= s.stage.scene.background; }
  if (s.pip) actCast(s, g, t, s.b.h(0, 1));
  if (s.b.pools.length) s.poolsS = s.b.pools.map(p => toScreen(p.position.clone(), s.stage.camera));
}
function beachOverlay(g, t, info, s) {
  const G = info.globalT;
  lab(g, G, 'HIGH TIDE · LOW TIDE · TWICE A DAY', 156.0, 160.4, E.W * 0.5, 150, { size: 54 });
  lab(g, G, 'MOON + SUN', 176.5, 180.0, E.W * 0.25, 160, { size: 56 }); lab(g, G, 'SUN ONLY: LESS THAN HALF', 180.0, 186.0, E.W * 0.6, 160, { size: 60, color: CORAL, mode: 'slam' });
  lab(g, G, 'THE TIDE ZONE = A WHOLE WORLD', 188.0, 196.0, E.W * 0.5, 150, { size: 58 });
  lab(g, G, 'EARLY MOON: MUCH CLOSER', 230.6, 238.0, E.W * 0.5, 150, { size: 60 }); lab(g, G, 'GIANT TIDES', 234.0, 241.0, E.W * 0.5, 225, { size: 52, color: CREAM });
  lab(g, G, 'TIDE POOLS = CHEMISTRY LAB?', 244.4, 254.4, E.W * 0.5, 150, { size: 58, color: MINT });
  if (s.poolsS && win(G, 244, 259)) s.poolsS.forEach((p, i) => burst(g, G, 244 - i * 0.7 + Math.floor((G - 244 + i * 0.7) / 1.4) * 1.4, p[0], p[1] - 30, MINT, 8, 70));
  lab(g, G, 'SUN: 400× WIDER', 368.0, 378.4, E.W * 0.25, 160, { size: 58 }); lab(g, G, '400× FARTHER', 370.0, 378.4, E.W * 0.75, 160, { size: 58 });
  lab(g, G, 'A PERFECT FIT', 377.0, 387.6, E.W * 0.5, 160, { size: 70, color: CREAM, mode: 'slam' });
}

// ---------- register ----------
for (const shot of E.shots) {
  const p = shot.params || {};
  const reg = (init, draw, overlay) => registerShot(shot.id, { kind: '3d', init: () => init(p), draw, overlay });
  if (shot.kind === 'room') reg(buildRoom, roomDraw, roomOverlay);
  if (shot.kind === 'space') reg(buildSpace, spaceDraw, spaceOverlay);
  if (shot.kind === 'dune') reg(buildDune, duneDraw, duneOverlay);
  if (shot.kind === 'reef') reg(buildReef, reefDraw, reefOverlay);
  if (shot.kind === 'beach') reg(buildBeach, beachDraw, beachOverlay);
}
