import { registerShot, E } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import * as W3 from '/engine/world3d.js';
import { valley3d } from '../sets/weather3d.js';
import { PIP, INK } from '../cast.js';
registerShot('t1', { kind: '3d',
  init() { const W = W3.inkWorld({ look: 'day', fov: 36, fog: [28, 190], bloom: 0.6, exposure: 1.5, sky: ['#2f6ec8', '#f0d8b0'] }); const v = valley3d(W, { mode: 'valley' }); v.setWater(0.08, 0.02); v.setDry(1); v.setSnow(0.1);
    v.fish.forEach(f => f.visible = false); v.boat.position.set(5.0, -0.86, -9.6); v.boat.rotation.set(0, -0.4, 0.15); v.reeds.visible = false;
    const pip = W3.card(W, PIP, { outline: '#241726', rimColor: '#fff1dc' }); const ink = W3.card(W, INK, { outline: '#241726', rimColor: '#fff1dc' });
    return { stage: W, v, pip, ink }; },
  draw(s) {
    const P = window.TP || {};
    const cam = P.cam || { pos: [1.2, 1.2, -2.6], look: [3.6, 0.3, -10], fov: 40, roll: 2 };
    W3.camKeys(s.stage, 0, [[0, cam]]); s.stage.lens(2.6, 8);
    const [px, pz] = P.pip || [1.75, -5.0], [ix, iz] = P.ink || [0.75, -5.6];
    s.pip.place(px, pz); s.pip.group.position.y = s.v.h(px, pz); s.pip.set({ pose: POSES.handsOnHead, expr: 'shocked', facing: 1 });
    s.ink.place(ix, iz); s.ink.group.position.y = s.v.h(ix, iz); s.ink.set({ pose: POSES.stand, expr: 'worried', facing: 1 });
  } });
