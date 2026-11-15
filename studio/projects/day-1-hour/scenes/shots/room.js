// Room shots (3D ink world): s02 s03 s05 s07 s09 s11 s12
import { registerShot, ease, clamp, lerp } from '/engine/core.js';
import { POSES, posesAt, breathe } from '/engine/rig2d.js';
import * as W3 from '/engine/world3d.js';
import { room3d } from '../sets/room3d.js';
import { INK, PIP, talkOf } from '../cast.js';
import { THREE } from '/engine/three-kit.js';

const PIP_AT = [-0.75, -0.15], INK_AT = [0.7, -0.35];
function build(o = {}) {
  const W = W3.inkWorld({ look: 'golden', fov: 38, fog: [12, 60], bloom: 0.45 });
  const room = room3d(W, o);
  const pip = W3.card(W, PIP, { x: PIP_AT[0], z: PIP_AT[1], outline: '#241726', rimDir: [0.6, -0.8] });
  const ink = W3.card(W, INK, { x: INK_AT[0], z: INK_AT[1], outline: '#241726', rimDir: [0.6, -0.8], gain: 1.0 });
  return { stage: W, room, pip, ink };
}
const cam = (s, t, keys) => W3.camKeys(s.stage, t, keys);
const P = (s, gT, t, pose, expr, extra = {}) => s.pip.set({ pose: breathe(pose, t), expr, talk: talkOf('PIP', gT), facing: 1, blink: W3.blinkAt(gT, 1), ...extra });
const I = (s, gT, t, pose, expr, extra = {}) => s.ink.set({ pose: breathe(pose, t, 1, 3), expr, talk: talkOf('INK', gT), facing: -1, blink: W3.blinkAt(gT, 2), ...extra });

// day/night cycle: the sun sweeps across the window; below the horizon the room goes blue and the lamp takes over
function dayCycle(s, phase) {
  const W = s.stage, a = phase * Math.PI * 2, el = Math.sin(a), day = clamp(el * 2.2 + 0.25);
  W.sunFrom([Math.cos(a) * 0.9, Math.max(0.08, el * 0.75), -1]); W.sun.intensity = W.L.keyI * day;
  W.hemi.intensity = lerp(0.55, W.L.hemiI, day); W.hemi.color.set(day > 0.5 ? W.L.hemiSky : '#4a56a8');
  const o = lerp(0.18, 0.92, day); s.room.out.material.color.setRGB(o * (0.75 + 0.25 * day), o * (0.8 + 0.1 * day), o + (1 - day) * 0.25);
  s.room.sunDisc.visible = el > -0.05; s.room.sunDisc.position.set(1.4 - Math.cos(a) * 3.2, 0.6 + el * 2.4, -8.9);
  s.room.lamp.intensity = lerp(4.5, 2.2, day); for (const sh of s.room.shafts) sh.material.opacity = 0.07 * day;
}

registerShot('s02', { kind: '3d', init: () => build(),
  draw(s, t, info) { const g = info.globalT;
    cam(s, t, [[0, { pos: [0.3, 1.5, 3.9], look: [0.1, 1.15, -1.0], fov: 40, roll: 0 }], [info.dur, { pos: [0.15, 1.45, 3.45], look: [0.1, 1.12, -1.0], fov: 40, roll: -1.5 }]]);
    s.stage.lens(4.0, 5);
    dayCycle(s, 0.08 + t / 3.1);                     // ~2 full days in the shot
    P(s, g, t, posesAt(t, [[0, POSES.stand], [1.2, POSES.pointUp], [3.5, POSES.handsOnHead]]), t < 3.5 ? 'awe' : 'surprised', { facing: 1, look: [0.6, -0.6] });
    I(s, g, t, posesAt(t, [[0, POSES.talk], [2.4, POSES.explain]]), 'smirk');
  } });
registerShot('s03', { kind: '3d', init: () => build(),
  draw(s, t, info) { const g = info.globalT;
    cam(s, t, [[0, { pos: [0.05, 1.3, 1.75], look: [-0.75, 1.3, -0.15], fov: 32, roll: 2 }], [info.dur, { pos: [-0.02, 1.31, 1.6], look: [-0.75, 1.31, -0.15], fov: 32, roll: 3 }]]);
    s.stage.lens(2.05, 13);
    P(s, g, t, posesAt(t, [[0, POSES.stand], [0.15, POSES.cheer]], 0.2), 'joy');
    I(s, g, t, POSES.crossArms, 'smirk');
    s.pip.group.position.y = Math.max(0, Math.sin(clamp((t - 0.15) / 0.5) * Math.PI)) * 0.12; s.pip.blob.position.y = 0.012 - s.pip.group.position.y;
  } });
registerShot('s05', { kind: '3d', init: () => build(),
  draw(s, t, info) { const g = info.globalT;
    cam(s, t, [[0, { pos: [-0.05, 1.22, 2.95], look: [0, 1.05, -0.3], fov: 36, roll: 1.5 }], [info.dur, { pos: [-0.03, 1.21, 2.75], look: [0, 1.05, -0.3], fov: 36, roll: 2.2 }]]);
    s.stage.lens(3.1, 11);
    P(s, g, t, POSES.talk, 'confused'); I(s, g, t, POSES.think, 'thinking');
  } });
registerShot('s07', { kind: '3d', init: () => build(),
  draw(s, t, info) { const g = info.globalT;
    cam(s, t, [[0, { pos: [-0.1, 1.33, 1.55], look: [-0.75, 1.36, -0.15], fov: 30, roll: -2 }], [info.dur, { pos: [-0.14, 1.33, 1.42], look: [-0.75, 1.37, -0.15], fov: 30, roll: -3 }]]);
    W3.kick(s.stage, t, 0.04, 0.03);
    s.stage.lens(1.8, 14);
    P(s, g, t, POSES.handsOnHead, 'shocked'); I(s, g, t, POSES.stand, 'neutral');
  } });
registerShot('s09', { kind: '3d', init: () => build(),
  draw(s, t, info) { const g = info.globalT;
    cam(s, t, [[0, { pos: [-0.35, 1.25, 2.3], look: [-0.75, 1.15, -0.15], fov: 34, roll: 0 }], [info.dur, { pos: [-0.38, 1.35, 2.1], look: [-0.75, 1.35, -0.15], fov: 34, roll: 2 }]]);
    s.stage.lens(2.5, 10);
    const h = ease.inOut(clamp(t / info.dur)) * 0.35; s.pip.group.position.y = h; s.pip.blob.position.y = 0.012 - h; s.pip.blob.material.opacity = 0.75 * (1 - h * 2);
    P(s, g, t, POSES.fall, 'surprised', { look: [0, 0.6] }); I(s, g, t, POSES.stand, 'neutral');
  } });
registerShot('s11', { kind: '3d', init: () => build(),
  draw(s, t, info) { const g = info.globalT;
    cam(s, t, [[0, { pos: [0.2, 1.42, 3.4], look: [0, 1.08, -0.6], fov: 38, roll: 0 }], [info.dur, { pos: [0.12, 1.4, 3.1], look: [0, 1.08, -0.6], fov: 38, roll: -1.2 }]]);
    s.stage.lens(3.6, 7);
    P(s, g, t, posesAt(t, [[0, POSES.shrug], [1.6, POSES.crossArms]]), 'smile'); I(s, g, t, POSES.relaxed, 'smirk');
  } });
registerShot('s12', { kind: '3d', init: () => build(),
  draw(s, t, info) { const g = info.globalT;
    cam(s, t, [[0, { pos: [1.6, 1.32, 1.45], look: [0.55, 1.25, -0.4], fov: 30, roll: -2 }], [info.dur, { pos: [1.45, 1.31, 1.25], look: [0.55, 1.27, -0.4], fov: 30, roll: -3.5 }]]);
    s.stage.lens(1.95, 14);
    I(s, g, t, posesAt(t, [[0, POSES.explain], [1.7, POSES.crossArms]]), 'smirk', { facing: 1 }); P(s, g, t, POSES.stand, 'smile');
  } });
