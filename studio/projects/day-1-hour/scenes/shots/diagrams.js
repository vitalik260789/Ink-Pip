// 2D explainer shots: s06 equator speed today vs 1-hour day, s08 gravity vs fling.
import { E, V, registerShot, ease, prog, clamp, lerp, text, rr, circle, seg, linGrad, alpha, FONTS, S } from '/engine/core.js';
import { drawFigure, POSES, breathe } from '/engine/rig2d.js';
import { camPath, kText } from '/engine/motion.js';
import { PIP } from '../cast.js';

const NAVY = '#0d1630', GRID = 'rgba(143,184,232,.08)', BLUE = '#8fb8e8', GOLD = '#ffd47e', CORAL = '#ff7a4a';
function board(g, cam) {
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#14204a', NAVY]); g.fillRect(-50, -50, E.W + 100, E.H + 100);
  g.save(); g.translate(E.W / 2, E.H / 2); g.scale(cam.z, cam.z); g.translate(-E.W / 2 + (cam.x || 0), -E.H / 2 + (cam.y || 0));
  g.strokeStyle = GRID; g.lineWidth = 2; for (let x = -200; x < E.W + 200; x += 60) { g.beginPath(); g.moveTo(x, -200); g.lineTo(x, E.H + 200); g.stroke(); } for (let y = -200; y < E.H + 200; y += 60) { g.beginPath(); g.moveTo(-200, y); g.lineTo(E.W + 200, y); g.stroke(); }
}
function earth2d(g, x, y, r, rot) {
  circle(g, x, y, r + 6, '#05070f'); circle(g, x, y, r, '#3c8fd0');
  g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
  for (const [u, v, rx, ry] of [[0.1, -0.3, 0.3, 0.22], [-0.4, 0.2, 0.22, 0.3], [0.5, 0.35, 0.25, 0.18]]) { const xx = x + (((u + rot) % 2 + 2) % 2 - 1) * r * 1.3; g.fillStyle = '#6fa64a'; g.beginPath(); g.ellipse(xx, y + v * r, rx * r, ry * r, 0.4, 0, 7); g.fill(); g.strokeStyle = '#1d2f1a'; g.lineWidth = 4; g.stroke(); }
  g.fillStyle = 'rgba(0,0,20,.35)'; g.beginPath(); g.arc(x + r * 0.45, y, r * 1.05, 0, 7); g.fill(); g.restore();
  g.strokeStyle = alpha('#ffffff', 0.5); g.setLineDash([10, 10]); g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, r, r * 0.16, 0, 0, Math.PI); g.stroke(); g.setLineDash([]);
}
function arrow(g, x0, y0, x1, y1, w, col) { const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); if (L < 4) return; g.save(); g.translate(x0, y0); g.rotate(a); g.fillStyle = col; g.strokeStyle = '#05070f'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, -w / 2); g.lineTo(L - w * 1.4, -w / 2); g.lineTo(L - w * 1.4, -w * 1.2); g.lineTo(L, 0); g.lineTo(L - w * 1.4, w * 1.2); g.lineTo(L - w * 1.4, w / 2); g.lineTo(0, w / 2); g.closePath(); g.stroke(); g.fill(); g.restore(); }
const num = (v) => Math.round(v).toLocaleString('en-US');

// s06 — "Today the equator spins at about a thousand miles per hour. Times twenty-four... twenty-four thousand miles per hour."
registerShot('s06', { draw(g, t, info) {
  const cam = camPath(t, [[0, { z: 1.04 }], [info.dur, { z: 1.1, x: -20 }]]); board(g, cam);
  earth2d(g, 420, 560, 250, t * (t < 3.6 ? 0.15 : 0.15 + (t - 3.6) * 0.9));
  const bx = 820, bw = 900;
  // today
  const a = ease.out(prog(t, 0.3, 1.3)); text(g, 'TODAY', bx, 330, { size: 44, color: BLUE, align: 'left', font: FONTS.ui, weight: 900 });
  rr(g, bx, 360, bw, 70, 14); g.fillStyle = 'rgba(143,184,232,.12)'; g.fill(); rr(g, bx, 360, Math.max(28, bw * 0.042 * a), 70, 14); g.fillStyle = BLUE; g.fill();
  text(g, num(1000 * a) + ' mph', bx + 60 + bw * 0.042, 395, { size: 48, color: '#ffffff', align: 'left', font: FONTS.ui, weight: 900, alpha: a });
  // one-hour day
  const b = ease.inOut(prog(t, 3.8, 6.6)); if (t > 3.5) { text(g, '1-HOUR DAY', bx, 560, { size: 44, color: GOLD, align: 'left', font: FONTS.ui, weight: 900, alpha: prog(t, 3.5, 3.8) });
    rr(g, bx, 590, bw, 70, 14); g.fillStyle = 'rgba(255,212,126,.12)'; g.fill(); rr(g, bx, 590, Math.max(28, bw * b), 70, 14); g.fillStyle = GOLD; g.fill();
    text(g, num(1000 + 23000 * b) + ' mph', bx + Math.min(bw * b, bw - 330) + 30, 625, { size: 52, color: b > 0.4 ? '#14204a' : '#ffffff', align: 'left', font: FONTS.ui, weight: 900 }); }
  kText(g, t, '×24', 640, 820, { start: 3.6, mode: 'slam', size: 110, color: GOLD, glow: 24 });
  g.restore();
} });

// s08 — "You see, spinning tries to fling everything outward. Gravity holds us down. At around seventeen thousand miles per hour, the fling wins."
registerShot('s08', { draw(g, t, info) {
  const cam = camPath(t, [[0, { z: 1.0 }], [info.dur, { z: 1.12, x: -40, y: 20 }]]); board(g, cam);
  const ex = 640, ey = 600, er = 330; earth2d(g, ex, ey, er, t * 0.4);
  const spd = lerp(1000, 24000, ease.inOut(prog(t, 5.0, 8.3))), over = spd > 17600;
  const lift = over ? ease.out(prog(t, 7.9, 9.0)) * 120 : 0;
  // person on the equator (right edge of the disc)
  const px = ex + er + 4 + lift, py = ey;
  g.save(); g.translate(px, py); g.rotate(Math.PI / 2); drawFigure(g, { x: 0, y: 0, s: 0.8, outfit: PIP, ink: PIP.ink, inkFar: PIP.inkFar, faceColor: PIP.faceColor, pose: breathe(over ? POSES.fall : POSES.stand, t), expr: over ? 'shocked' : 'neutral', facing: 1, rim: false, shadow: false }); g.restore();
  // fling arrow (outward) grows with speed; gravity arrow (inward) appears at "Gravity holds us down"
  const fl = (0.3 + 0.7 * ease.out(prog(t, 0.6, 1.6))) * (90 + (spd / 17600) * 260);
  if (t > 0.6) { arrow(g, px + 130, py - 50, px + 130 + fl, py - 50, 52, CORAL); text(g, 'FLING', px + 140, py - 130, { size: 52, color: CORAL, align: 'left', font: FONTS.ui, weight: 900, alpha: prog(t, 0.6, 1.0) }); }
  if (t > 3.6) { const ga = ease.out(prog(t, 3.6, 4.4)); arrow(g, px + 130 + 280, py + 70, px + 130 + 280 - 280 * ga, py + 70, 52, BLUE); text(g, 'GRAVITY', px + 140, py + 170, { size: 52, color: BLUE, align: 'left', font: FONTS.ui, weight: 900, alpha: ga }); }
  // speedometer
  if (t > 4.6) { const a = prog(t, 4.6, 5.0); rr(g, E.W - 640, 120, 520, 120, 18); g.fillStyle = 'rgba(10,16,40,.85)'; g.fill(); text(g, 'EQUATOR SPEED', E.W - 610, 160, { size: 30, color: BLUE, align: 'left', font: FONTS.ui, weight: 900, alpha: a }); text(g, num(spd) + ' mph', E.W - 610, 212, { size: 54, color: over ? CORAL : '#ffffff', align: 'left', font: FONTS.ui, weight: 900, alpha: a }); }
  if (over) kText(g, t, 'FLING WINS!', ex, 170 + 0, { start: 7.9, mode: 'slam', size: 96, color: CORAL, glow: 26 });
  g.restore();
} });
