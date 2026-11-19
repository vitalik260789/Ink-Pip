// sets/space3d.js — reusable space location: painted Earth (ink outline on its silhouette), cloud shell, stars, sun.
// Earth radius 2 m at the origin, axis tilted 23.4°. setSpin(angle), squash(k 0..1) flattens it and grows an ocean bulge.
import { THREE } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';
import { rng } from '/engine/core.js';

let TX = null;
const tex = () => TX ||= {
  earth: W3.paintTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a6fb0'); gr.addColorStop(0.5, '#3c8fd0'); gr.addColorStop(1, '#2a6fb0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(11); g.lineJoin = 'round';
    const land = [[0.18, 0.32, 0.09, 0.12], [0.25, 0.62, 0.05, 0.14], [0.5, 0.3, 0.06, 0.07], [0.52, 0.55, 0.07, 0.14], [0.68, 0.3, 0.14, 0.12], [0.82, 0.68, 0.06, 0.06], [0.33, 0.12, 0.04, 0.04]];
    for (const [cx, cy, rx, ry] of land) { g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, k = 0.75 + 0.35 * Math.sin(a * 3 + cx * 20) * r() + 0.15 * r(); g.lineTo((cx + Math.cos(a) * rx * k) * w, (cy + Math.sin(a) * ry * k) * h); } g.closePath();
      g.fillStyle = '#6fa64a'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#1d2f1a'; g.stroke();
      g.fillStyle = '#c8a860'; g.globalAlpha = 0.6; g.beginPath(); g.ellipse((cx + rx * 0.2) * w, (cy + ry * 0.1) * h, rx * 0.35 * w, ry * 0.3 * h, 0.3, 0, 7); g.fill(); g.globalAlpha = 1; }
    g.fillStyle = '#f2f6ff'; g.fillRect(0, 0, w, h * 0.06); g.fillRect(0, h * 0.95, w, h * 0.05);
  }),
  clouds: W3.paintTex(1024, 512, (g, w, h) => { const r = rng(5); g.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 45; i++) { const x = r() * w, y = h * (0.12 + r() * 0.76); for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 14, y + Math.sin(k) * 5, 22 + r() * 30, 8 + r() * 6, 0, 0, 7); g.fill(); } } }),
  glow: W3.paintTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, w * 0.36, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(140,200,255,.9)'); gr.addColorStop(1, 'rgba(140,200,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
};

export function space3d(W) {
  const T = tex();
  const tilt = new THREE.Group(); tilt.rotation.z = 23.4 * Math.PI / 180; W.scene.add(tilt);
  const spin = new THREE.Group(); tilt.add(spin);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 64), W3.paint('#ffffff', T.earth)); earth.castShadow = earth.receiveShadow = true; spin.add(earth);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(2.04, 64, 48), new THREE.MeshLambertMaterial({ map: T.clouds, transparent: true, depthWrite: false })); clouds.userData.noink = true; spin.add(clouds);
  // ocean bulge (hidden until squash)
  const bulge = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.5, 24, 96), W3.paint('#3c8fd0')); bulge.rotation.x = Math.PI / 2; bulge.scale.setScalar(0.001); tilt.add(bulge);
  // atmosphere glow (camera-facing sprite)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#9fd0ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 })); glow.scale.setScalar(5.0); glow.userData.noink = true; W.scene.add(glow);
  // stars
  const r = rng(3), pts = []; for (let i = 0; i < 1400; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, rr = Math.sqrt(1 - u * u); pts.push(rr * Math.cos(a) * 150, u * 150, rr * Math.sin(a) * 150); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff6e0', size: 1.6 * W.pxS, sizeAttenuation: false, fog: false })); stars.userData.noink = true; W.scene.add(stars);
  // sun far away to the left (HDR disc for bloom)
  const sun = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.2, 4), fog: false })); sun.position.set(-75, 14, -30); sun.lookAt(0, 0, 0); sun.userData.noink = true; W.scene.add(sun);
  W.sunFrom([-50, 14, 38], 30); W.scene.fog.near = 500; W.scene.fog.far = 1000;
  return {
    tilt, spin, earth, clouds, bulge, glow,
    setSpin(a) { spin.rotation.y = a; clouds.rotation.y = a * 0.08; },
    shape(sq = 0, b = 0, st = 0) { spin.scale.set((1 + 0.14 * sq) * (1 + 0.5 * st), 1 - 0.2 * sq, (1 + 0.14 * sq) * (1 - 0.22 * st)); bulge.scale.set(0.97 + 0.06 * b + 0.14 * sq, 0.97 + 0.06 * b + 0.14 * sq, Math.max(0.001, 0.5 + 0.9 * b)); bulge.visible = b > 0.01; },
    squash(k) { spin.scale.set(1 + 0.14 * k, 1 - 0.2 * k, 1 + 0.14 * k); bulge.scale.set(1 + 0.2 * k, 1 + 0.2 * k, Math.max(0.001, 0.55 * k)); bulge.visible = k > 0.01; glow.scale.set(5.0 * (1 + 0.12 * k), 5.0 * (1 - 0.1 * k), 1); },
  };
}
