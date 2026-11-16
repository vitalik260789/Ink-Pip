// sets/room3d.js — Ink & Pip's room (reusable 3D location): wooden floor, plaster walls with a green wainscot,
// a big window onto a golden-hour town, desk with globe and lamp, bookshelf, telescope, rug, planet poster, plant.
// Back wall z = -3, floor y = 0, room x -4..4. Characters stand around x -1..1, z -0.5..0.5.
import { THREE, box, cyl, sphere } from '/engine/three-kit.js';
import * as W3 from '/engine/world3d.js';

const P = W3.paint;
let TX = null;  // painted textures are shared by every shot that uses the room
const tex = () => TX ||= {
  floor: W3.planksTex('#b5794a', 7, [3, 3], 3), wall: W3.plasterTex('#e4c9a2', [3, 1.2], 5), wains: W3.wainscotTex('#5f8c78', 7, [1, 1]),
  rug: W3.rugTex('#3f6f8a', '#e8c27a', '#b0443c'), books: [W3.booksTex(2), W3.booksTex(5), W3.booksTex(9)], poster: W3.posterTex(), out: W3.outsideTex(), night: nightTex(),
};


// night view: violet-blue sky, stars, rooftops with warm windows (the Moon is a separate disc so it can vanish)
function nightTex() {
  return W3.paintTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h * 0.85); gr.addColorStop(0, '#2a3474'); gr.addColorStop(0.6, '#5a5aa6'); gr.addColorStop(1, '#a07ab0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h * 0.62, rr = 1.2 + r() * 2.6; g.fillStyle = `rgba(255,248,230,${0.5 + r() * 0.5})`; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    for (const [row, col, base, inkA] of [[0, '#5a4a8a', 0.8, 0.35], [1, '#2e2850', 0.88, 1]]) {
      let x = -20; g.lineWidth = 5; g.strokeStyle = `rgba(10,6,20,${inkA})`;
      while (x < w) { const bw = 90 + r() * 150, bh = h * (0.06 + r() * 0.1) * (row ? 1 : 0.8), y = h * base - bh;
        g.fillStyle = col; g.beginPath(); g.moveTo(x, h); g.lineTo(x, y); if (r() < 0.6) g.lineTo(x + bw / 2, y - bw * 0.35); g.lineTo(x + bw, y); g.lineTo(x + bw, h); g.closePath(); g.fill(); g.stroke();
        if (row) { g.fillStyle = 'rgba(255,200,110,.95)'; for (let k = 0; k < 4; k++) if (r() < 0.55) g.fillRect(x + 14 + k * (bw - 28) / 4, y + 24 + (k % 2) * 40, 16, 22); }
        x += bw - 2; } }
  });
}

export function room3d(W, o = {}) {
  const T = tex(), add = (m) => { W.scene.add(m); return m; };
  const wallM = P('#ffffff', T.wall), trim = P('#f2e6cf'), wood = P('#8a5a3a'), dark = P('#5a3a2a');
  // floor + rug
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 7), P('#ffffff', T.floor))); floor.rotation.x = -Math.PI / 2; floor.position.z = -0.2; floor.receiveShadow = true;
  const rug = add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.02, 48), P('#ffffff', T.rug))); rug.scale.z = 0.62; rug.position.set(0, 0.01, -0.2); rug.receiveShadow = true;
  // back wall with a window opening (x 0.2..2.6, y 0.9..2.5)
  const H = 3.2, wx0 = 0.2, wx1 = 2.6, wy0 = 0.9, wy1 = 2.5, z = -3;
  const wallBox = (x0, x1, y0, y1) => add(box(x1 - x0, y1 - y0, 0.2, wallM, (x0 + x1) / 2, (y0 + y1) / 2, z - 0.1));
  wallBox(-4.5, wx0, 0, H); wallBox(wx1, 4.5, 0, H); wallBox(wx0, wx1, 0, wy0); wallBox(wx0, wx1, wy1, H);
  // wainscot + skirting + cornice
  const wains = add(box(9, 0.85, 0.04, P('#ffffff', T.wains), 0, 0.45, z + 0.02)); wains.material.map.repeat.set(1.3, 1);
  add(box(9, 0.07, 0.07, trim, 0, 0.9, z + 0.04)); add(box(9, 0.14, 0.1, trim, 0, H - 0.07, z + 0.03));
  // side walls
  const side = (x, ry) => { const m = add(box(7, H, 0.2, wallM, x, H / 2, -0.2)); m.rotation.y = ry; return m; }; side(-4.2, Math.PI / 2); side(4.2, Math.PI / 2);
  // window frame, mullions, sill
  const fr = P('#f6ead2'); const wm = (wx0 + wx1) / 2, wc = (wy0 + wy1) / 2;
  add(box(wx1 - wx0 + 0.16, 0.08, 0.16, fr, wm, wy1 + 0.04, z)); add(box(wx1 - wx0 + 0.3, 0.07, 0.3, fr, wm, wy0 - 0.02, z + 0.08));
  add(box(0.08, wy1 - wy0, 0.16, fr, wx0 - 0.04, wc, z)); add(box(0.08, wy1 - wy0, 0.16, fr, wx1 + 0.04, wc, z));
  add(box(0.05, wy1 - wy0, 0.06, fr, wm, wc, z)); add(box(wx1 - wx0, 0.05, 0.06, fr, wm, wc + 0.2, z));
  // the painted outside view (no world ink: it carries its own lines) — HDR so the sun blooms
  const out = add(new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: o.night ? T.night : T.out, color: new THREE.Color(0.92, 0.9, 0.88), fog: false })));
  out.position.set(1.4, 2.0, -9); out.userData.noink = true;
  const sunDisc = add(new THREE.Mesh(new THREE.CircleGeometry(o.night ? 0.62 : 0.42, 48), new THREE.MeshBasicMaterial({ map: o.night ? W3.paintTex(256, 256, (g, w, h) => { g.fillStyle = '#fbf4e4'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = 'rgba(190,180,200,.55)'; for (const [x, y, r] of [[90, 80, 26], [160, 110, 18], [110, 170, 30], [175, 175, 14]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }) : null, color: o.night ? new THREE.Color(2.2, 2.15, 2.05) : new THREE.Color(3.2, 2.7, 2.0), fog: false }))); sunDisc.position.set(3.3, 2.45, -8.9); sunDisc.userData.noink = true;
  if (!o.night) sunDisc.position.set(2.24, 1.85, -8.9);
  // sun shaft through the window (additive, no ink)
  const shaftTex = W3.paintTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  for (const dx of [-0.5, 0.1, 0.6]) { const sh = add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5), new THREE.MeshBasicMaterial({ map: shaftTex, color: o.night ? '#9fb0ff' : '#ffb36b', transparent: true, opacity: o.night ? 0.05 : 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    sh.position.set(wm + dx * 1.4, 1.2, -1.2); sh.rotation.set(-1.05, 0, 0.12); sh.userData.noink = true; }
  // desk + globe + lamp (left)
  const dx = -2.5, dz = -2.35;
  add(box(1.7, 0.07, 0.8, wood, dx, 0.78, dz)); for (const [lx, lz] of [[-0.78, -0.33], [0.78, -0.33], [-0.78, 0.33], [0.78, 0.33]]) add(box(0.07, 0.78, 0.07, dark, dx + lx, 0.39, dz + lz));
  add(box(0.5, 0.45, 0.7, wood, dx + 0.55, 0.5, dz));  // drawers
  add(cyl(0.11, 0.14, 0.05, dark, dx - 0.35, 0.84, dz)); add(cyl(0.015, 0.015, 0.18, dark, dx - 0.35, 0.93, dz));
  const globe = add(sphere(0.2, P('#ffffff', W3.paintTex(512, 256, (g, w, h) => { g.fillStyle = '#4f8fc8'; g.fillRect(0, 0, w, h); g.fillStyle = '#8fbf5a'; for (const [x, y, rx, ry] of [[90, 90, 60, 40], [130, 160, 30, 50], [270, 80, 70, 45], [300, 170, 40, 40], [420, 100, 50, 35]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.4, 0, 7); g.fill(); } })), dx - 0.35, 1.22, dz));
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.012, 8, 40), P('#d8a84a'))); ring.position.copy(globe.position); ring.rotation.y = Math.PI / 2; ring.rotation.x = 0.4;
  add(cyl(0.08, 0.1, 0.03, dark, dx + 0.45, 0.83, dz - 0.1)); add(cyl(0.012, 0.012, 0.4, dark, dx + 0.45, 1.02, dz - 0.1));
  const shade = add(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 20, 1, true), P('#2f8a7a', null, { side: THREE.DoubleSide }))); shade.position.set(dx + 0.45, 1.25, dz - 0.1);
  const bulb = add(sphere(0.05, W3.glow('#ffd59a', 3.0), dx + 0.45, 1.19, dz - 0.1)); bulb.castShadow = false;
  const lamp = new THREE.PointLight('#ffc68a', o.night ? 5 : 2.2, o.night ? 7 : 4, 1.4); lamp.position.set(dx + 0.45, 1.15, dz - 0.1); W.scene.add(lamp);
  // bookshelf (right wall, back)
  const bx = 3.3, bz = -2.65;
  add(box(1.3, 2.2, 0.36, wood, bx, 1.1, bz - 0.05).translateZ(0));
  for (let i = 0; i < 4; i++) { const y = 0.25 + i * 0.5; add(box(1.22, 0.04, 0.34, dark, bx, y, bz + 0.03)); add(box(1.12, 0.38, 0.2, P('#ffffff', T.books[i % 3]), bx, y + 0.21, bz + 0.05)); }
  // telescope on a tripod by the window
  const tx = 1.9, tz = -1.9; for (const a of [0, 2.1, 4.2]) { const leg = add(cyl(0.018, 0.018, 1.2, dark, tx + Math.sin(a) * 0.22, 0.56, tz + Math.cos(a) * 0.22)); leg.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); }
  const tube = add(cyl(0.07, 0.09, 0.9, P('#e8e0d0'), tx, 1.22, tz)); tube.rotation.set(-0.9, 0, 0.25); add(cyl(0.1, 0.1, 0.08, P('#b0443c'), tx + 0.1, 1.5, tz - 0.32)).rotation.set(-0.9, 0, 0.25);
  // poster on the left wall
  const poster = add(new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.87), P('#ffffff', T.poster))); poster.position.set(-1.3, 1.85, z + 0.03);
  add(box(1.38, 0.95, 0.03, P('#3a2a2a'), -1.3, 1.85, z + 0.01));
  // plant (front left) and a beanbag
  add(cyl(0.18, 0.14, 0.34, P('#c8643a'), -3.2, 0.17, -0.9)); for (const [x, y, zz, r] of [[0, 0.55, 0, 0.26], [-0.16, 0.48, 0.1, 0.2], [0.15, 0.62, -0.06, 0.2], [0.04, 0.78, 0.04, 0.17]]) { const l = add(sphere(r, P('#4f8a4a', null, { flatShading: true }), -3.2 + x, y, -0.9 + zz)); l.scale.y = 1.2; }
  const bean = add(sphere(0.45, P('#e0a83a'), -2.2, 0.3, -0.6)); bean.scale.set(1.15, 0.65, 1.1);
  // optional near foreground prop: a stack of books on a stool (for close-ups)
  if (o.foreground) { const [fx, fz] = o.foreground; add(cyl(0.22, 0.22, 0.05, wood, fx, 0.5, fz)); for (let i = 0; i < 4; i++) add(cyl(0.025, 0.025, 0.5, dark, fx + Math.sin(i * 1.57) * 0.16, 0.25, fz + Math.cos(i * 1.57) * 0.16));
    add(cyl(0.17, 0.13, 0.3, P('#c8643a'), fx, 0.67, fz)); for (const [x, y, zz, r] of [[0, 1.0, 0, 0.2], [-0.14, 0.92, 0.08, 0.16], [0.13, 1.08, -0.05, 0.16], [0.03, 1.2, 0.03, 0.13]]) { const l = add(sphere(r, P('#4f8a4a', null, { flatShading: true }), fx + x, y, fz + zz)); l.scale.y = 1.25; } }
  // golden hour: low sun behind the window, slightly from the right
  if (o.night) { W.sunFrom([0.45, 0.8, -1], 30); const fill = new THREE.PointLight('#ffd2a0', 6, 9, 1.2); fill.position.set(-0.6, 2.6, 1.6); W.scene.add(fill); }  // moonlight key + warm ceiling-lamp fill
  else W.sunFrom([0.3, 0.6, -1], 30);
  return { window: [wm, wc, z], out, sunDisc, lamp, shafts: W.scene.children.filter(m => m.material?.blending === THREE.AdditiveBlending) };
}
