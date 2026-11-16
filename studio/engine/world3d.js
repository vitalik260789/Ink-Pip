// engine/world3d.js — "ink world": 2D characters standing in a painted, ink-outlined 3D world.
// Ported ideas from the cartoon-3d-short skill (bridge short), rewritten for plain three.js inside Razgon:
//   • ink pass: near-black lines on depth jumps (near side only) + normal creases, width shrinks with distance;
//     character cards and the sky never get world lines;
//   • lens blur (DOF) from the depth buffer, focus distance + cInf px per shot;
//   • sky gradient, fog = horizon colour, golden / day light presets, Neutral tone mapping, bloom on HDR only;
//   • character cards: drawFigure() rendered to a canvas each frame, plum outline, inner rim, lit tint,
//     real shadow (alpha-tested) + soft contact shadow;
//   • painted canvas textures (planks, plaster, books, rugs) with seams painted in.
// Units: metres. 1 rig unit = 1/140 m (same as three-kit figure3D).
import { THREE, getRenderer } from './three-kit.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { E, rng, clamp, lerp, ease } from './core.js';
import { drawFigure } from './rig2d.js';

const C = (c) => new THREE.Color(c);

// ---------------- light presets (bridge values, adapted for interiors) ----------------
export const LOOKS = {
  golden: { skyTop: '#ffb878', skyHor: '#ffd9a0', fog: '#e8b48e', key: '#ffb36b', keyI: 4.2, hemiSky: '#8f88d0', hemiGround: '#5a4560', hemiI: 1.5,
            cardTint: '#f6eef2', cardShade: '#b8b0e0', contact: '#3a2a55', ink: '#030303' },
  space:  { skyTop: '#060a22', skyHor: '#18224e', fog: '#18224e', key: '#fff1dc', keyI: 2.4, hemiSky: '#4a5aa0', hemiGround: '#120a20', hemiI: 0.45,
            cardTint: '#ffffff', cardShade: '#c0c8e8', contact: '#000000', ink: '#030303' },
  night:  { skyTop: '#2a3474', skyHor: '#5a5aa6', fog: '#4a4a8a', key: '#b8c4ff', keyI: 2.2, hemiSky: '#9a98e0', hemiGround: '#5a4058', hemiI: 1.7,
            cardTint: '#fff4ee', cardShade: '#b8b0e0', contact: '#2a2050', ink: '#030303' },
  day:    { skyTop: '#3e7fd2', skyHor: '#b8d0ec', fog: '#b8d0ec', key: '#fff1dc', keyI: 3.6, hemiSky: '#a8c0f0', hemiGround: '#5a5048', hemiI: 1.1,
            cardTint: '#fff6ea', cardShade: '#c0c8e8', contact: '#33354f', ink: '#030303' },
};

// ---------------- shaders ----------------
const FSV = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const INK = {
  uniforms: { tDiffuse: { value: null }, tN: { value: null }, tD: { value: null }, texel: { value: new THREE.Vector2() },
    cNear: { value: 0.1 }, cFar: { value: 400 }, wNear: { value: 5.0 }, wFar: { value: 3.0 }, dNear: { value: 2 }, dFar: { value: 40 },
    pxS: { value: 1 }, depthLo: { value: 0.012 }, cosLo: { value: Math.cos(35 * Math.PI / 180) }, cosHi: { value: Math.cos(55 * Math.PI / 180) },
    creaseK: { value: 0.8 }, inkCol: { value: C('#030303') }, strength: { value: 1 }, fadeNear: { value: 60 }, fadeFar: { value: 200 } },
  vertexShader: FSV,
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tDiffuse, tN, tD; uniform vec2 texel;
    uniform float cNear, cFar, wNear, wFar, dNear, dFar, pxS, depthLo, cosLo, cosHi, creaseK, strength, fadeNear, fadeFar;
    uniform vec3 inkCol; varying vec2 vUv;
    float vz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tD, uv).x, cNear, cFar); }
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      vec4 nc = texture2D(tN, vUv);
      if (nc.a < 0.75) { gl_FragColor = base; return; }            // sky or character card: no world ink
      float zc = vz(vUv), ic = 1.0 / zc;
      float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
      float w = mix(wNear, wFar, t) * pxS, hc = 0.5 * w * creaseK;
      vec3 n0 = normalize(nc.rgb * 2.0 - 1.0);
      float ink = 0.0;
      for (int d = 0; d < 4; d++) {                                  // 4 axis directions (8 cost 2x, same look)
        vec2 dir = d == 0 ? vec2(1,0) : d == 1 ? vec2(-1,0) : d == 2 ? vec2(0,1) : vec2(0,-1);
        vec2 dv = dir * texel;
        vec4 nb = texture2D(tN, vUv - dv);
        float ib = nb.a > 0.75 ? 1.0 / vz(vUv - dv) : ic;
        float slope = ic - ib;                                       // 1/z is linear in screen space on a plane
        for (int k = 1; k <= 9; k++) {
          float fk = float(k);
          if (fk > w + 1.0 && fk > hc + 1.0) break;
          vec2 uq = vUv + dv * fk; vec4 nq = texture2D(tN, uq);
          float cov = clamp(w - fk + 1.0, 0.0, 1.0);
          if (nq.a < 0.25) { ink = max(ink, cov); break; }           // sky beyond -> silhouette
          if (nq.a < 0.75) break;                                    // a character card is in front: leave it
          float iq = 1.0 / vz(uq), pred = ic + slope * fk;
          float jump = 1.0 - iq / max(pred, 1e-6);
          if (jump > depthLo) { ink = max(ink, cov * smoothstep(depthLo, depthLo * 3.0, jump)); break; }   // we are the near side
          if (fk <= hc + 1.0) {
            vec3 n1 = normalize(nq.rgb * 2.0 - 1.0);
            float kk = 1.0 - smoothstep(cosHi, cosLo, dot(n0, n1));
            ink = max(ink, kk * clamp(hc - fk + 1.0, 0.0, 1.0) * 0.9);
          }
        }
      }
      ink *= strength * (1.0 - smoothstep(fadeNear, fadeFar, zc));
      gl_FragColor = vec4(mix(base.rgb, inkCol, ink), base.a);
    }` };
const DOF = {
  uniforms: { tDiffuse: { value: null }, tN: { value: null }, tD: { value: null }, texel: { value: new THREE.Vector2() },
    cNear: { value: 0.1 }, cFar: { value: 400 }, focus: { value: 3 }, cInf: { value: 0 }, maxR: { value: 18 } },
  vertexShader: FSV,
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tDiffuse, tN, tD; uniform vec2 texel; uniform float cNear, cFar, focus, cInf, maxR; varying vec2 vUv;
    float vz(vec2 uv){ return texture2D(tN, uv).a < 0.25 ? 1000.0 : -perspectiveDepthToViewZ(texture2D(tD, uv).x, cNear, cFar); }
    float coc(float z){ return min(cInf * abs(1.0 - focus / z), maxR); }
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      if (cInf < 0.3) { gl_FragColor = base; return; }
      float zc = vz(vUv), cc = coc(zc);
      float w0 = 1.0 / max(cc * cc, 1.0); vec3 acc = base.rgb * w0; float ws = w0;
      const int N = 32; float GA = 2.39996;
      for (int i = 0; i < N; i++) {
        float r = sqrt((float(i) + 0.5) / float(N)) * maxR, a = float(i) * GA;
        vec2 uq = vUv + vec2(cos(a), sin(a)) * r * texel;
        float zq = vz(uq), cq = coc(zq);
        float reach = zq > zc ? min(cq, cc) : cq;                   // background can't bleed over a sharp foreground
        float wq = clamp(reach - r + 1.0, 0.0, 1.0) / max(reach * reach, 1.0);
        acc += texture2D(tDiffuse, uq).rgb * wq; ws += wq;
      }
      vec3 blurred = acc / ws;
      gl_FragColor = vec4(blurred, base.a);
    }` };

// ---------------- the stage ----------------
// inkWorld({ look:'golden', fov, fog:[near,far], sky:[top,hor], bloom, shadowSize })
export function inkWorld(o = {}) {
  const R = getRenderer(), L = { ...LOOKS[o.look || 'golden'], ...(o.lookOverride || {}) };
  const w = Math.round(E.W * E.PX), h = Math.round(E.H * E.PX), pxS = h / 1080;
  const scene = new THREE.Scene();
  const skyTex = gradTex([o.sky?.[0] || L.skyTop, o.sky?.[1] || L.skyHor]);
  scene.background = skyTex;
  scene.fog = new THREE.Fog(C(L.fog), ...(o.fog || [25, 300]));
  const camera = new THREE.PerspectiveCamera(o.fov || 38, E.W / E.H, 0.1, 400);
  const hemi = new THREE.HemisphereLight(C(L.hemiSky), C(L.hemiGround), L.hemiI); scene.add(hemi);
  const sun = new THREE.DirectionalLight(C(L.key), L.keyI); sun.castShadow = true;
  const ss = o.shadowSize || 9; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -ss, right: ss, top: ss, bottom: -ss, near: 0.5, far: 80 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3; scene.add(sun, sun.target);

  // normal + depth of the world (and character cards as a flag) for ink and DOF
  const nRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
  nRT.depthTexture = new THREE.DepthTexture(w, h); nRT.depthTexture.type = THREE.UnsignedIntType;   // 24-bit depth: works on every GPU (float depth failed on some Intel/ANGLE drivers)
  const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  const composer = new EffectComposer(R, new THREE.WebGLRenderTarget(w, h, { samples: 2, type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  const ink = new ShaderPass(INK); const dof = new ShaderPass(DOF);
  for (const p of [ink, dof]) { p.uniforms.tN.value = nRT.texture; p.uniforms.tD.value = nRT.depthTexture; p.uniforms.texel.value.set(1 / w, 1 / h); p.uniforms.cNear.value = camera.near; p.uniforms.cFar.value = camera.far; }
  ink.uniforms.pxS.value = pxS; ink.uniforms.inkCol.value = C(L.ink); dof.uniforms.maxR.value = 18 * pxS;
  composer.addPass(ink); composer.addPass(dof);
  const bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), o.bloom ?? 0.5, 0.6, 1.0); const bs = bloom.setSize.bind(bloom); bloom.setSize = (a, b) => bs(Math.round(a / 2), Math.round(b / 2)); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const cards = [];
  const api = {
    scene, camera, sun, hemi, L, ink, dof, bloom, cards, pxS,
    add: (...objs) => { objs.forEach(ob => scene.add(ob)); return objs[0]; },
    // lens: focus distance (m) + blur at infinity in px @1080 high (bridge: CU 12-16, MS 10-12, wide 0)
    lens(focus, cInf) { dof.uniforms.focus.value = focus; dof.uniforms.cInf.value = cInf * pxS; },
    sunFrom(dir, dist = 30) { const d = new THREE.Vector3(...dir).normalize(); sun.target.position.set(0, 0, 0); sun.position.copy(d.multiplyScalar(dist)); },
    render() {
      for (const c of cards) c.face(camera);
      // pass 1: normals/depth (world = normal material, cards = flag 0.5, sky/fx = hidden)
      const saved = [], cc = new THREE.Color(); R.getClearColor(cc); const ca = R.getClearAlpha();
      scene.traverse(m => { if (!m.isMesh) return; saved.push([m, m.material, m.visible]);
        if (m.userData.noink) m.visible = false; else m.material = m.userData.flagMat || normalMat; });
      const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null;
      const se = R.shadowMap.enabled; R.shadowMap.enabled = false; R.setRenderTarget(nRT); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, camera); R.shadowMap.enabled = se;
      for (const [m, mat, v] of saved) { m.material = mat; m.visible = v; }
      scene.background = bg; scene.fog = fog; R.setRenderTarget(null); R.setClearColor(cc, ca);
      // pass 2: colour + ink + lens + bloom, Neutral tone map (bridge look), restore the shared renderer after
      const tm = R.toneMapping, te = R.toneMappingExposure; R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = o.exposure ?? 1.45;
      composer.render(); R.toneMapping = tm; R.toneMappingExposure = te;
    },
    dispose() { scene.traverse(x => { x.geometry?.dispose(); [].concat(x.material || []).forEach(m => { m.map?.dispose(); m.dispose?.(); }); }); nRT.dispose(); composer.renderTarget1?.dispose(); composer.renderTarget2?.dispose(); },
  };
  return api;
}
function gradTex(cols) { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); cols.forEach((x, i) => gr.addColorStop(i / (cols.length - 1), x)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// ---------------- painted textures ----------------
export function paintTex(w, h, draw, repeat = null) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const tone = (c, k) => { const [r, g, b] = hex(c); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
// soft brush mottling: many low-alpha blobs
function mottle(g, w, h, base, seed, n = 220, amp = 0.08, size = [0.04, 0.14]) {
  const r = rng(seed); for (let i = 0; i < n; i++) { const k = 1 + (r() * 2 - 1) * amp; g.fillStyle = tone(base, k); g.globalAlpha = 0.18 + r() * 0.2; const s = (size[0] + r() * (size[1] - size[0])) * w; g.beginPath(); g.ellipse(r() * w, r() * h, s, s * (0.4 + r() * 0.5), r() * 3, 0, 7); g.fill(); } g.globalAlpha = 1;
}
export const planksTex = (base = '#b07a48', n = 6, rep = [2, 2], seed = 3) => paintTex(1024, 1024, (g, w, h) => {
  const r = rng(seed); const pw = w / n;
  for (let i = 0; i < n; i++) { let y = 0; while (y < h) { const len = h * (0.35 + r() * 0.5); const k = 0.86 + r() * 0.26; g.fillStyle = tone(base, k); g.fillRect(i * pw, y, pw, len);
      g.globalAlpha = 0.22; for (let s = 0; s < 7; s++) { g.strokeStyle = tone(base, k * (0.78 + r() * 0.12)); g.lineWidth = 2 + r() * 3; g.beginPath(); const x0 = i * pw + r() * pw; g.moveTo(x0, y); g.bezierCurveTo(x0 + (r() - 0.5) * 30, y + len * 0.3, x0 + (r() - 0.5) * 30, y + len * 0.7, x0 + (r() - 0.5) * 14, y + len); g.stroke(); } g.globalAlpha = 1;
      g.fillStyle = tone(base, 0.42); g.fillRect(i * pw, y + len - 3, pw, 5); y += len; } }
  g.fillStyle = tone(base, 0.36); for (let i = 0; i <= n; i++) g.fillRect(i * pw - 3, 0, 6, h);
  mottle(g, w, h, base, seed + 9, 120, 0.06);
}, rep);
export const plasterTex = (base = '#d8c3a0', rep = [2, 1], seed = 5) => paintTex(1024, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); mottle(g, w, h, base, seed, 260, 0.07, [0.03, 0.12]); }, rep);
export const wainscotTex = (base = '#6a8f7a', panels = 6, rep = [1, 1]) => paintTex(1024, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); mottle(g, w, h, base, 11, 120, 0.05);
  const pw = w / panels; for (let i = 0; i < panels; i++) { g.strokeStyle = tone(base, 0.62); g.lineWidth = 6; g.strokeRect(i * pw + 18, 34, pw - 36, h - 68); g.strokeStyle = tone(base, 1.25); g.lineWidth = 3; g.strokeRect(i * pw + 24, 40, pw - 48, h - 80); }
  g.fillStyle = tone(base, 0.55); g.fillRect(0, 0, w, 10); g.fillRect(0, h - 14, w, 14);
}, rep);
export const rugTex = (a = '#b0443c', b = '#e8c27a', c = '#2f4f6a') => paintTex(1024, 1024, (g, w, h) => {
  g.fillStyle = a; g.fillRect(0, 0, w, h); mottle(g, w, h, a, 21, 160, 0.07);
  g.strokeStyle = b; g.lineWidth = 26; g.strokeRect(60, 60, w - 120, h - 120); g.strokeStyle = c; g.lineWidth = 14; g.strokeRect(110, 110, w - 220, h - 220);
  g.fillStyle = b; for (let i = 0; i < 8; i++) { const a2 = (i / 8) * Math.PI * 2; g.save(); g.translate(w / 2 + Math.cos(a2) * 240, h / 2 + Math.sin(a2) * 240); g.rotate(a2); g.fillRect(-40, -14, 80, 28); g.restore(); }
  g.fillStyle = c; g.beginPath(); g.arc(w / 2, h / 2, 120, 0, 7); g.fill(); g.fillStyle = b; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.fill();
});

// painted view outside a window: sky, sun disc (HDR via color > 1), clouds, distant town with its own ink lines
export function outsideTex(o = {}) {
  const { top = '#ee7e58', hor = '#ffcf86', town = '#6a4a78', seed = 7, sun = [0.56, 0.5] } = o;
  return paintTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h * 0.8); gr.addColorStop(0, top); gr.addColorStop(1, hor); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sx = w * sun[0], sy = h * sun[1]; const sg = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.45); sg.addColorStop(0, 'rgba(255,250,225,1)'); sg.addColorStop(0.12, 'rgba(255,240,200,.95)'); sg.addColorStop(0.4, 'rgba(255,215,160,.35)'); sg.addColorStop(1, 'rgba(255,200,150,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < 9; i++) { const cx = r() * w, cy = h * (0.1 + r() * 0.35), cw = w * (0.08 + r() * 0.12); g.fillStyle = 'rgba(255,236,214,.75)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(cx + (k - 3) * cw * 0.22, cy + Math.sin(k * 1.7) * 8, cw * 0.22, cw * 0.11, 0, 0, 7); g.fill(); } g.fillStyle = 'rgba(214,140,150,.45)'; g.fillRect(cx - cw * 0.7, cy + cw * 0.06, cw * 1.4, 6); }
    // two rows of rooftops: far (hazy) and near (inked)
    for (const [row, col, base, inkA] of [[0, '#c98a90', 0.8, 0.35], [1, town, 0.88, 1]]) {
      let x = -20; g.lineWidth = 5; g.strokeStyle = `rgba(20,10,20,${inkA})`;
      while (x < w) { const bw = 90 + r() * 150, bh = h * (0.06 + r() * 0.1) * (row ? 1 : 0.8), y = h * base - bh;
        g.fillStyle = col; g.beginPath(); g.moveTo(x, h); g.lineTo(x, y); if (r() < 0.6) { g.lineTo(x + bw / 2, y - bw * 0.35); } g.lineTo(x + bw, y); g.lineTo(x + bw, h); g.closePath(); g.fill(); g.stroke();
        if (row) { g.fillStyle = 'rgba(255,214,140,.85)'; for (let k = 0; k < 4; k++) if (r() < 0.5) g.fillRect(x + 14 + k * (bw - 28) / 4, y + 24 + (k % 2) * 40, 16, 22); }
        x += bw - 2; }
    }
  });
}
// book spines for a shelf box face
export const booksTex = (seed = 2) => paintTex(1024, 256, (g, w, h) => {
  const r = rng(seed), cols = ['#b0443c', '#2f6f8a', '#e0a83a', '#4f7a4a', '#7a4a8a', '#d8cfb8', '#2a3a5a', '#c8643a'];
  let x = 0; while (x < w) { const bw = 26 + r() * 34, bh = h * (0.7 + r() * 0.3), c = cols[Math.floor(r() * cols.length)]; g.fillStyle = c; g.fillRect(x, h - bh, bw, bh); g.fillStyle = tone(c, 0.6); g.fillRect(x, h - bh + 18, bw, 6); g.fillRect(x, h - 24, bw, 5); g.fillStyle = 'rgba(10,6,12,.9)'; g.fillRect(x + bw - 3, h - bh, 3, bh); x += bw; }
});
export const posterTex = () => paintTex(768, 512, (g, w, h) => {
  g.fillStyle = '#1d2448'; g.fillRect(0, 0, w, h); const r = rng(4); g.fillStyle = '#fff8e0'; for (let i = 0; i < 90; i++) { g.globalAlpha = 0.4 + r() * 0.6; g.fillRect(r() * w, r() * h, 2.5, 2.5); } g.globalAlpha = 1;
  const pl = [[90, 300, 60, '#ffcf5a'], [220, 260, 18, '#c98a6a'], [320, 240, 26, '#e0b080'], [440, 280, 30, '#5a9ad8'], [560, 250, 22, '#d8643a'], [680, 300, 46, '#e8c890']];
  g.strokeStyle = 'rgba(255,240,210,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 280); g.lineTo(w, 280); g.stroke();
  for (const [x, y, rr, c] of pl) { g.fillStyle = c; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); g.strokeStyle = '#0a0a14'; g.lineWidth = 4; g.stroke(); }
  g.strokeStyle = '#e8c890'; g.lineWidth = 5; g.beginPath(); g.ellipse(680, 300, 74, 16, -0.2, 0, 7); g.stroke();
  g.fillStyle = '#ffe9b8'; g.font = '700 54px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText('PLANETS', w / 2, 90);
});

// ---------------- materials ----------------
export const paint = (color, map = null, o = {}) => new THREE.MeshLambertMaterial({ color: C(color), map, ...o });
export const glow = (color, k = 1.6) => new THREE.MeshBasicMaterial({ color: C(color).multiplyScalar(k), toneMapped: true });

// ---------------- character cards ----------------
// card(stage, outfit, {x, z, s, outline:'#241726', rimDir:[x,y], rimColor}) → { mesh, set({pose, expr, talk, blink, look, facing}), place(x,z) }
const U = 1 / 140;
export function card(W, outfit, o = {}) {
  const CW = 512, CH = 768, k = CH / 330, ox = CW / 2 / k, oy = (CH - 40) / k;   // canvas px per rig unit; feet 40 px above bottom
  const can = document.createElement('canvas'); can.width = CW; can.height = CH; const g = can.getContext('2d');
  const A = document.createElement('canvas'); A.width = CW; A.height = CH; const ga = A.getContext('2d');
  const B = document.createElement('canvas'); B.width = CW; B.height = CH; const gb = B.getContext('2d');
  const tex = new THREE.CanvasTexture(can); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = o.s || 1, hM = (CH / k) * U * s, wM = (CW / k) * U * s;
  const geo = new THREE.PlaneGeometry(wM, hM); geo.translate(0, hM / 2 - (40 / k) * U * s, 0);
  const L = W.L, tint = C(o.tint || L.cardTint).multiplyScalar(o.gain ?? 1.08);
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, color: tint, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  mesh.userData.flagMat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(0.0,0.0,0.0,0.5); }' });
  // soft contact shadow
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * s, 0.32 * s), new THREE.MeshBasicMaterial({ map: blobTex(), color: C(L.contact), transparent: true, opacity: 0.75, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.userData.noink = true;
  const grp = new THREE.Group(); grp.add(mesh, blob); W.scene.add(grp);
  const st = { pose: undefined, expr: 'neutral', talk: 0, blink: 0, look: null, facing: 1 };
  const outline = o.outline ?? '#241726', ow = o.outlineW ?? 5, rimC = o.rimColor || L.key, rimDir = o.rimDir || [-0.7, -0.7];
  function redraw() {
    ga.setTransform(1, 0, 0, 1, 0, 0); ga.clearRect(0, 0, CW, CH); ga.setTransform(k, 0, 0, k, 0, 0);
    drawFigure(ga, { x: ox, y: oy, s: 1, outfit, pose: st.pose, expr: st.expr, talk: st.talk, blink: st.blink, look: st.look, facing: st.facing, rim: false, shadow: false });
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH);
    if (outline) { gb.globalCompositeOperation = 'source-over'; gb.clearRect(0, 0, CW, CH); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, sh = (Math.sin(a + 2.2) * 0.35 + 1) * ow; gb.drawImage(A, Math.cos(a) * sh, Math.sin(a) * sh); }
      gb.globalCompositeOperation = 'source-in'; gb.fillStyle = outline; gb.fillRect(0, 0, CW, CH); gb.globalCompositeOperation = 'source-over'; g.drawImage(B, 0, 0); }
    g.drawImage(A, 0, 0);
    if (o.rim !== false) {   // inner rim: crescent on the lit edge, inside the silhouette (never an offset outer copy)
      gb.clearRect(0, 0, CW, CH); gb.globalCompositeOperation = 'source-over'; gb.drawImage(A, 0, 0); gb.globalCompositeOperation = 'destination-out';
      const rw = o.rimW ?? 6; gb.drawImage(A, -rimDir[0] * rw * st.facing, -rimDir[1] * rw); gb.globalCompositeOperation = 'source-in'; gb.fillStyle = rimC; gb.fillRect(0, 0, CW, CH); gb.globalCompositeOperation = 'source-over';
      g.globalAlpha = o.rimA ?? 0.9; g.drawImage(B, 0, 0); g.globalAlpha = 1; }
    tex.needsUpdate = true;
  }
  const api = { mesh, blob, group: grp,
    place(x, z, y = 0) { grp.position.set(x, y, z); return api; },
    set(p) { Object.assign(st, p); redraw(); return api; },
    face(cam) { const dx = cam.position.x - grp.position.x, dz = cam.position.z - grp.position.z; mesh.rotation.y = Math.atan2(dx, dz); },
  };
  W.cards.push(api); api.place(o.x || 0, o.z || 0);
  return api;
}
let _blob = null;
function blobTex() { if (_blob) return _blob; _blob = paintTex(256, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.setTransform(1, 0, 0, h / w, 0, h / 2 * (1 - h / w) * 0); g.fillStyle = gr; g.fillRect(0, 0, w, w); }); return _blob; }

// blink every 0.5-2.3 s for ~4 frames (bridge cast.ts)
export function blinkAt(t, seed = 0) { const r = rng(seed + 1); let tt = 0.3 + r() * 1.2; while (tt < t + 1) { if (t >= tt && t < tt + 4 / E.fps) return 1; tt += 0.5 + r() * 1.8; } return 0; }
// creeping camera: smootherstep glide between keys, hold creep, roll in degrees
export function camKeys(W, t, keys) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[Math.min(i + 1, keys.length - 1)]; const u = t1 > t0 ? clamp((t - t0) / (t1 - t0)) : 1, k = u * u * u * (u * (u * 6 - 15) + 10);
  const L3 = (p, q) => p.map((v, j) => lerp(v, q[j], k));
  const pos = L3(a.pos, b.pos), look = L3(a.look, b.look), fov = lerp(a.fov || 38, b.fov || a.fov || 38, k), roll = lerp(a.roll || 0, b.roll ?? a.roll ?? 0, k);
  const c = W.camera; c.position.set(...pos); c.up.set(0, 1, 0); c.lookAt(...look); if (roll) c.rotateZ(roll * Math.PI / 180); c.fov = fov; c.updateProjectionMatrix();
}

// flip-kick shake on impacts (bridge): sign flips every frame, decays over ~7 frames
export function kick(W, t, tHit, amp = 0.025) { const f = Math.round((t - tHit) * E.fps); if (f < 0 || f > 7) return; const k = amp * (1 - f / 8) * (f % 2 ? -1 : 1); W.camera.position.y += k; W.camera.rotateZ(k * 0.8); }
