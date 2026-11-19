import { registerShot, E } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import * as W3 from '/engine/world3d.js';
import { meadow3d, bee } from '../sets/nature3d.js';
import { PIP, INK } from '../cast.js';
registerShot('t1', { kind: '3d',
  init() { const W = W3.inkWorld({ look: 'day', fov: 36, fog: [25, 160], bloom: 0.6, exposure: 1.5 }); const m = meadow3d(W, { mode: 'meadow' }); m.bees.forEach(b => { b.visible = false; });
    const pip = W3.card(W, PIP, { outline: '#241726', rimColor: '#fff1dc' }); const ink = W3.card(W, INK, { outline: '#241726', rimColor: '#fff1dc' }); const b = bee(W, 2.5);
    return { stage: W, m, pip, ink, b }; },
  draw(s) {
    W3.camKeys(s.stage, 0, [[0, { pos: [0.2, 1.25, 3.9], look: [0.0, 1.05, 0], fov: 36, roll: 2 }]]); s.stage.lens(3.0, 8);
    s.pip.place(-0.95, 1.1); s.pip.set({ pose: POSES.handsOnHead, expr: 'shocked', facing: 1 });
    s.ink.place(-1.95, -0.3); s.ink.set({ pose: POSES.crossArms, expr: 'worried', facing: 1 });
    s.b.position.set(0.75, 0.62, 1.7); s.b.rotation.set(0.15, Math.PI / 2 - 0.75, 0.1); s.b.userData.flap(0.3, 1);
  } });
