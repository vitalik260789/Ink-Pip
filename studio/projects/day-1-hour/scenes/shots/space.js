// Space shots (3D ink world): s01 hook, s04 spin-up x24, s10 Earth squashes + Pip flung off
import { registerShot, E, ease, clamp, lerp, V } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import { kText } from '/engine/motion.js';
import * as W3 from '/engine/world3d.js';
import { space3d } from '../sets/space3d.js';
import { PIP } from '../cast.js';

const build = () => { const W = W3.inkWorld({ look: 'space', fov: 35, bloom: 0.7 }); const sp = space3d(W); return { stage: W, sp }; };

registerShot('s01', { kind: '3d', init: build,
  draw(s, t, info) {
    W3.camKeys(s.stage, t, [[0, { pos: [1.2, 1.0, 9.0], look: [0, 0, 0], fov: 35, roll: -4 }], [info.dur, { pos: [0.9, 0.9, 8.1], look: [0, 0, 0], fov: 35, roll: -5 }]]);
    s.sp.setSpin(info.globalT * 2.6);            // already spinning absurdly fast
    s.stage.lens(8.5, 0);
  } });
registerShot('s04', { kind: '3d', init: build,
  draw(s, t, info) {
    W3.camKeys(s.stage, t, [[0, { pos: [-2.5, 1.6, 9.5], look: [0, 0, 0], fov: 35, roll: 3 }], [info.dur, { pos: [-1.6, 1.2, 7.4], look: [0, 0, 0], fov: 35, roll: 5 }]]);
    const k = ease.in(clamp((t - 1.0) / 3.5)); s.sp.setSpin(t * 0.4 + k * k * 30 + t * k * 6);   // spins up
    W3.kick(s.stage, t, 4.6, 0.04);
  },
  overlay(g, t) { kText(g, t, '×24', E.W * 0.78, E.H * 0.42, { start: 3.0, mode: 'slam', size: V(170, 150), color: '#ffd47e', glow: 30 }); } });
registerShot('s10', { kind: '3d',
  init() { const s = build(); s.pip = W3.card(s.stage, PIP, { s: 0.35, outline: '#241726', rim: false }); s.pip.blob.visible = false; return s; },
  draw(s, t, info) {
    W3.camKeys(s.stage, t, [[0, { pos: [0.4, 0.6, 7.6], look: [0, 0, 0], fov: 38, roll: 0 }], [info.dur, { pos: [0.2, 0.9, 9.6], look: [0.4, 0.3, 0], fov: 38, roll: -3 }]]);
    s.sp.setSpin(info.globalT * 3.0);
    // Pip stands on the equator at the front, then gets flung off along the spin direction
    const f = ease.in(clamp((t - 1.4) / 2.6)), x = lerp(0.9, 4.2, f), y = lerp(-0.05, 1.6, f), z = lerp(1.85, 3.0, f);
    s.pip.place(x, z, y); s.pip.mesh.rotation.z = -f * 2.5;
    s.pip.set({ pose: f > 0.02 ? POSES.fall : POSES.stand, expr: f > 0.02 ? 'shocked' : 'surprised', facing: 1 });
    s.sp.squash(ease.inOut(clamp((t - 4.4) / 2.6)));
  } });
