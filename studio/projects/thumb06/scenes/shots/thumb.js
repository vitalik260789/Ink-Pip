import { registerShot, E } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import * as W3 from '/engine/world3d.js';
import { cretaceous3d } from '../sets/dino3d.js';
import { PIP, INK } from '../cast.js';
registerShot('t1', { kind: '3d',
  init() { const W = W3.inkWorld({ look: 'day', fov: 36, fog: [34, 230], bloom: 0.6, exposure: 1.5, sky: ['#3a7ad8', '#f8dcb0'] }); const v = cretaceous3d(W, { mode: 'plain' });
    const pip = W3.card(W, PIP, { outline: '#241726', rimColor: '#fff1dc' }); const ink = W3.card(W, INK, { outline: '#241726', rimColor: '#fff1dc' });
    return { stage: W, v, pip, ink }; },
  draw(s) {
    const P = window.TP || {};
    s.v.update(3.0, { roar: 1 }); const r = s.v.rex; r.position.set(P.rx ?? 3.6, s.v.h(3.6, -4.5), P.rz ?? -4.5); r.rotation.y = P.ry ?? -2.75; r.userData.update(3.0, 0.0001, 1);
    const cam = P.cam || { pos: [-0.6, 1.3, 5.6], look: [1.0, 2.6, -2.5], fov: 50 };
    W3.camKeys(s.stage, 0, [[0, cam]]); s.stage.lens(3.0, 4);
    const [px, pz] = P.pip || [-1.3, 1.6], [ix, iz] = P.ink || [-0.2, 1.0];
    s.pip.place(px, pz); s.pip.group.position.y = s.v.h(px, pz); s.pip.set({ pose: POSES.handsOnHead, expr: 'shocked', facing: 1 });
    s.ink.place(ix, iz); s.ink.group.position.y = s.v.h(ix, iz); s.ink.set({ pose: POSES.stand, expr: 'worried', facing: 1 });
  } });
