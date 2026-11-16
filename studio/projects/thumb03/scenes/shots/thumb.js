import { registerShot, E } from '/engine/core.js';
import { POSES } from '/engine/rig2d.js';
import * as W3 from '/engine/world3d.js';
import { space3d } from '../sets/space3d.js';
import { THREE } from '/engine/three-kit.js';
import { PIP, INK } from '../cast.js';
registerShot('t1', { kind: '3d',
  init() { const W = W3.inkWorld({ look: 'space', fov: 35, bloom: 0.8, exposure: 1.75, sky: ['#1c1f44', '#45426e'], lookOverride: { hemiI: 0.8, keyI: 3.0, hemiSky: '#6a74c8' } }); const sp = space3d(W);
    const pip = W3.card(W, PIP, { s: 0.85, outline: '#241726', rim: false }); pip.blob.visible = false; const ink = W3.card(W, INK, { s: 0.85, outline: '#241726', rimDir: [-0.6, -0.8] }); ink.blob.visible = false;
    return { stage: W, sp, pip, ink }; },
  draw(s) {
    W3.camKeys(s.stage, 0, [[0, { pos: [-0.6, 0.4, 8.6], look: [-1.0, 0.2, 0], fov: 35, roll: -3 }]]); s.stage.lens(9, 0);
    s.sp.setSpin(4.4); s.sp.tilt.position.set(1.6, -0.5, 0); s.sp.glow.position.set(1.6, -0.5, 0);
    s.pip.place(-1.75, 4.6, -1.05); s.pip.mesh.rotation.z = 0.18; s.pip.set({ pose: POSES.handsOnHead, expr: 'shocked', facing: 1 });
    s.ink.place(-3.3, 2.6, -1.6); s.ink.set({ pose: POSES.crossArms, expr: 'smirk', facing: 1 });
    s.mS = new THREE.Vector3(-0.6, 1.4, 2.0).project(s.stage.camera);
  },
  overlayOFF(g, t, info, s) { const x = (s.mS.x + 1) / 2 * E.W, y = (1 - s.mS.y) / 2 * E.H; g.save(); g.setLineDash([26, 18]); g.lineWidth = 11; g.strokeStyle = '#fff1dc'; g.beginPath(); g.arc(x, y, 120, 0, 7); g.stroke(); g.setLineDash([]);
    g.font = '700 190px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 16; g.strokeStyle = '#1a0d12'; g.strokeText('?', x, y + 8); g.fillStyle = '#ffd47e'; g.fillText('?', x, y + 8); g.restore(); } });
