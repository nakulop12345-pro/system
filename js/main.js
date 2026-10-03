import { J2000, AU_KM, SUN, PLANETS, MOONS, COMETS } from './data.js';

const $ = id => document.getElementById(id);
const TAG = '[NAKUL SOLAR SYSTEM]';
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const stage = (p, t) => { $('lbar').style.width = p + '%'; $('lstage').textContent = `${t} — ${p}%`; console.log(TAG, t); };
const fail = m => { const e = $('lerr'); e.hidden = false; e.textContent = m; console.error(TAG, m); };

/* ---------- settings (persisted) ---------- */
const DEF = { quality: 'medium', stars: 1, atmo: true, orbits: true, moons: true, glow: true, labels: true, belt: true, bloom: true, kuiper: true, comets: true,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
let S = { ...DEF };
try { Object.assign(S, JSON.parse(localStorage.getItem('nss-settings') || '{}')); } catch { /* ignore corrupt storage */ }
const save = () => { try { localStorage.setItem('nss-settings', JSON.stringify(S)); } catch { /* storage unavailable */ } };

const QUALITY = { // per-tier budgets: pixel ratio, stars, asteroids, Kuiper points, comet tail particles, bloom, atmospheres, anisotropy
  low: { pr: 1, stars: 6000, ast: 1500, kuiper: 1500, tail: 80, bloom: false, atmo: false, aniso: 1 },
  medium: { pr: 1.5, stars: 20000, ast: 5000, kuiper: 4000, tail: 200, bloom: true, atmo: true, aniso: 4 },
  high: { pr: 2, stars: 40000, ast: 9000, kuiper: 7000, tail: 300, bloom: true, atmo: true, aniso: 8 },
  ultra: { pr: 2, stars: 80000, ast: 12000, kuiper: 10000, tail: 400, bloom: true, atmo: true, aniso: 16 }
};
const DEBUG = new URLSearchParams(location.search).has('debug'); // add ?debug to the URL for console diagnostics
/* ---------- deterministic noise & procedural textures ---------- */
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = (x, y, z) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967295; };
const sm = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t, clamp01 = v => Math.min(1, Math.max(0, v));
function noise(x, y, z) { // 3D value noise, 0..1
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = sm(x - xi), fy = sm(y - yi), fz = sm(z - zi);
  const h = (a, b, c) => hash(xi + a, yi + b, zi + c);
  return lerp(lerp(lerp(h(0, 0, 0), h(1, 0, 0), fx), lerp(h(0, 1, 0), h(1, 1, 0), fx), fy),
              lerp(lerp(h(0, 0, 1), h(1, 0, 1), fx), lerp(h(0, 1, 1), h(1, 1, 1), fx), fy), fz);
}
const fbm = (x, y, z, o = 4) => { let s = 0, a = .5; for (let i = 0; i < o; i++) { s += a * noise(x, y, z); x *= 2; y *= 2; z *= 2; a /= 2; } return s; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ramp = (c, t) => { t = clamp01(t) * .999 * (c.length - 1); const i = t | 0; return mix(c[i], c[i + 1], t - i); };

/** Paints an equirectangular texture by sampling fn on the unit sphere (seamless). fn -> [r,g,b,a?] */
function paint(W, H, fn) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
  for (let j = 0; j < H; j++) {
    const lat = (.5 - (j + .5) / H) * Math.PI, cl = Math.cos(lat), y = Math.sin(lat);
    for (let i = 0; i < W; i++) {
      const lon = (i + .5) / W * 2 * Math.PI, p = fn(cl * Math.cos(lon), y, cl * Math.sin(lon), lat, lon), k = (j * W + i) * 4;
      d[k] = p[0]; d[k + 1] = p[1]; d[k + 2] = p[2]; d[k + 3] = p[3] ?? 255;
    }
  }
  g.putImageData(im, 0, 0); return c;
}
const rocky = (c1, c2) => (x, y, z) => {
  const n = fbm(x * 3, y * 3, z * 3, 5), m = fbm(x * 14 + 9, y * 14, z * 14, 3);
  return mix(mix(c1, c2, n * 1.25), [30, 30, 30], Math.max(0, .45 - m) * .8);
};
const bands = (cols, freq, warp, spot) => (x, y, z, lat, lon) => {
  const w = fbm(x * 3, y * 8, z * 3, 4) - .5;
  let c = ramp(cols, .5 + .5 * Math.sin(lat * freq + w * warp * 8));
  if (spot) { const a = (lat + .38) / .09, b = (lon - 1) / .22, d = a * a + b * b; if (d < 1) c = mix(c, [185, 75, 45], (1 - d) * .9); }
  return c;
};
const marsBase = rocky([150, 70, 40], [205, 125, 75]);
const landValue = (x, y, z) => fbm(x * 2.2 + 3, y * 2.2, z * 2.2, 5);
const LOOK = {
  pluto: () => paint(256, 128, rocky([140, 110, 90], [228, 208, 188])),
  mercury: () => paint(256, 128, rocky([115, 108, 100], [175, 165, 155])),
  venus: () => paint(256, 128, (x, y, z) => mix([190, 150, 90], [238, 208, 145], fbm(x * 2 + fbm(x * 5, y * 5, z * 5, 3) * 2, y * 6, z * 2, 4) * 1.3)),
  mars: () => paint(256, 128, (x, y, z, lat) => Math.abs(lat) > 1.36 ? [236, 236, 242] : marsBase(x, y, z)),
  jupiter: () => paint(512, 256, bands([[236, 222, 192], [202, 152, 102], [172, 112, 72], [226, 196, 150], [150, 100, 70]], 22, 1, true)),
  saturn: () => paint(512, 256, bands([[232, 212, 162], [212, 188, 132], [190, 160, 110]], 18, .4)),
  uranus: () => paint(256, 128, bands([[160, 215, 225], [178, 228, 236]], 10, .15)),
  neptune: () => paint(256, 128, bands([[40, 70, 170], [62, 102, 205], [30, 55, 140]], 14, .5))
};
function earthTextures() {
  const W = 512, H = 256;
  const day = paint(W, H, (x, y, z, lat) => {
    const l = landValue(x, y, z) - .5, ice = Math.abs(lat) > 1.25;
    if (ice) return [238, 242, 246];
    if (l < 0) return mix([8, 28, 70], [26, 80, 130], clamp01(l * 5 + 1));
    const dry = fbm(x * 4 + 20, y * 4, z * 4, 3);
    return mix(mix([60, 110, 50], [200, 175, 120], clamp01((dry - .4) * 4)), [120, 100, 80], clamp01(l * 5));
  });
  const night = paint(W, H, (x, y, z, lat) => (landValue(x, y, z) > .5 && Math.abs(lat) < 1.1 && fbm(x * 22, y * 22, z * 22, 3) > .5) ? [255, 190, 110] : [0, 0, 0]);
  const clouds = paint(W, H, (x, y, z) => [255, 255, 255, clamp01((fbm(x * 3.5 + 7, y * 5, z * 3.5, 5) - .45) * 5) * 235]);
  return { day, night, clouds };
}
function ringTexture() {
  const W = 1024, c = document.createElement('canvas'); c.width = W; c.height = 1;
  const g = c.getContext('2d'), im = g.createImageData(W, 1);
  for (let i = 0; i < W; i++) {
    const r = i / W; let a = .35 + .55 * noise(r * 60, 0, 0) * (.6 + .4 * Math.sin(r * 25));
    if (r > .58 && r < .64) a *= .08;           // Cassini Division
    if (r < .22) a *= .45;                       // C ring is fainter
    const k = i * 4, v = 195 + 40 * noise(r * 30, 5, 0);
    im.data[k] = v; im.data[k + 1] = v * .9; im.data[k + 2] = v * .72; im.data[k + 3] = clamp01(a) * 255;
  }
  g.putImageData(im, 0, 0); return c;
}

/* ---------- orbital mechanics ---------- */
const DEG = Math.PI / 180;
const distVis = r => 40 * Math.pow(r, .55);              // visualization scale: AU -> scene units
const radiusVis = km => 1.5 * Math.sqrt(km / 6371);      // visualization scale: exaggerated body radius
function solveKepler(M, e) { // Newton iteration on E - e sin E = M
  M = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 7; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}
/** Heliocentric ecliptic position for eccentric anomaly E -> scene vector (y up, compressed distance). Returns real r (AU). */
function orbitPos(el, E, out, real) {
  const [a, e, I, , vp, Om] = el, w = (vp - Om) * DEG, O = Om * DEG, i = I * DEG;
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(i), si = Math.sin(i);
  const x = (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp;
  const y = (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp;
  const z = sw * si * xp + cw * si * yp, r = Math.hypot(x, y, z), s = distVis(r) / r;
  out.set(x * s, z * s, -y * s); if (real) real.set(x, y, z); return r;
}
const jdToDate = jd => new Date((jd - 2440587.5) * 864e5), dateToJd = d => d.getTime() / 864e5 + 2440587.5;
const fmtDays = d => d > 730 ? (d / 365.25).toFixed(2) + ' years' : d.toFixed(2) + ' days';
const fmtT = s => s < 120 ? s.toFixed(1) + ' s' : s < 7200 ? (s / 60).toFixed(1) + ' min' : (s / 3600).toFixed(2) + ' h';
const fmtRot = h => { const a = Math.abs(h), s = a > 48 ? (a / 24).toFixed(2) + ' days' : a.toFixed(2) + ' hours'; return h < 0 ? s + ' (retrograde)' : s; };

/* ---------- shaders ---------- */
const GLSL_NOISE = `
float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}`;
const SUN_VS = `varying vec3 vP,vN,vV;void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;gl_Position=projectionMatrix*mv;}`;
const SUN_FS = `uniform float t;varying vec3 vP,vN,vV;${GLSL_NOISE}
void main(){vec3 p=normalize(vP)*3.;float g=fbm(p+vec3(0.,t*.05,0.)),c=fbm(p*2.-t*.03),v=g*.7+c*.5;
vec3 col=mix(vec3(.9,.28,.02),vec3(1.,.72,.22),smoothstep(.2,.8,v));col=mix(col,vec3(1.,.95,.78),smoothstep(.78,1.,v));
col*=1.-.55*smoothstep(.62,.7,fbm(p*1.3+7.+t*.01));
float mu=clamp(dot(normalize(vN),normalize(-vV)),0.,1.);col*=(.4+.6*pow(mu,.6))*1.7;
gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>
#include <colorspace_fragment>}`;
const ATMO_VS = `varying vec3 vN,vV,vR;void main(){vR=normalMatrix*normalize(position);vN=normalMatrix*normal;vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;gl_Position=projectionMatrix*mv;}`;
const ATMO_FS = `uniform vec3 col;uniform float k,pw,warm;varying vec3 vN,vV,vR;
void main(){vec3 L=normalize((viewMatrix*vec4(0.,0.,0.,1.)).xyz-vV);float rim=pow(clamp(abs(dot(normalize(vN),normalize(-vV)))*2.4,0.,1.),pw);
float dl=dot(normalize(vR),L),lit=smoothstep(-.35,.5,dl);vec3 c=mix(col,vec3(1.,.5,.25),warm*(1.-smoothstep(0.,.35,dl)));gl_FragColor=vec4(c*rim*lit*k,rim*lit*k);#include <tonemapping_fragment>
#include <colorspace_fragment>}`;
const EARTH_VS = `varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vN=normalMatrix*normal;vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;gl_Position=projectionMatrix*mv;}`;
const EARTH_FS = `uniform sampler2D day,night;varying vec2 vUv;varying vec3 vN,vV;
void main(){vec3 N=normalize(vN),L=normalize((viewMatrix*vec4(0.,0.,0.,1.)).xyz-vV);float d=dot(N,L);
vec3 D=texture2D(day,vUv).rgb,C=texture2D(night,vUv).rgb;float k=smoothstep(-.08,.2,d);
gl_FragColor=vec4(D*max(d,0.)*1.6+D*.015+C*(1.-k)*1.4,1.);#include <tonemapping_fragment>
#include <colorspace_fragment>}`;
const STAR_VS = `attribute float size;attribute vec3 aCol;varying vec3 vC;uniform float pr;void main(){vC=aCol;gl_PointSize=size*pr;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const STAR_FS = `varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,0.,d);a*=a;gl_FragColor=vec4(vC*a,a);}`;
// per planet: [colour, shell scale, strength, rim power (lower = broader haze), warm terminator tint]
const ATMO = { Venus: [[.95, .82, .55], 1.07, 1.1, 1.1, 0], Earth: [[.25, .5, 1], 1.065, 1.4, 2.6, .8], Mars: [[.85, .6, .45], 1.03, .3, 3.2, 0],
  Jupiter: [[.8, .7, .55], 1.025, .45, 1.6, 0], Saturn: [[.85, .78, .6], 1.025, .4, 1.6, 0], Uranus: [[.45, .85, .9], 1.05, .8, 2.2, 0], Neptune: [[.25, .4, .95], 1.05, .9, 2.2, 0] };

/* ---------- boot ---------- */
async function boot() {
  let THREE, OrbitControls;
  try {
    stage(5, 'Loading Three.js');
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timed out after 20 s')), 20000));
    THREE = await Promise.race([import('three'), timeout]);
    ({ OrbitControls } = await Promise.race([import('three/addons/controls/OrbitControls.js'), timeout]));
  } catch (e) { fail(`Could not load Three.js from the CDN (${e.message}). Check your connection and reload.`); return; }

  let FX = null; // optional post-processing modules; the app still runs without them
  try {
    const mods = await Promise.all(['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'OutputPass'].map(n => import(`three/addons/postprocessing/${n}.js`)));
    FX = { EffectComposer: mods[0].EffectComposer, RenderPass: mods[1].RenderPass, UnrealBloomPass: mods[2].UnrealBloomPass, OutputPass: mods[3].OutputPass };
    console.log(TAG, 'Engine initialized (with post-processing modules)');
  } catch (e) { console.warn(TAG, 'Post-processing modules unavailable; rendering without bloom', e); }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { fail('WebGL is not available in this browser or device: ' + e.message); return; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, .1, 6000);
  camera.position.set(0, 250, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .06, minDistance: .1, maxDistance: 1500, autoRotateSpeed: .35 });
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (canvas, srgb = true) => { const t = new THREE.CanvasTexture(canvas); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(maxAniso, QUALITY[S.quality]?.aniso || 4); return t; };

  /* starfield */
  stage(15, 'Initializing star field');
  const STAR_MAX = 80000, rnd = mulberry32(20260);
  const sp = new Float32Array(STAR_MAX * 3), sc = new Float32Array(STAR_MAX * 3), ss = new Float32Array(STAR_MAX);
  const tints = [[.7, .8, 1], [1, 1, 1], [1, .9, .7], [1, .75, .55]];
  for (let i = 0; i < STAR_MAX; i++) {
    const u = rnd() * 2 - 1, th = rnd() * 2 * Math.PI, rr = Math.sqrt(1 - u * u), R = 2000 + rnd() * 300;
    sp.set([R * rr * Math.cos(th), R * u, R * rr * Math.sin(th)], i * 3);
    const b = .35 + .65 * Math.pow(rnd(), 3), t = tints[Math.floor(rnd() * 4)];
    sc.set([t[0] * b, t[1] * b, t[2] * b], i * 3); ss[i] = 1 + Math.pow(rnd(), 8) * 3.2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute('aCol', new THREE.BufferAttribute(sc, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(ss, 1));
  const starMat = new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: STAR_FS, uniforms: { pr: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; scene.add(stars);
  await frame();

  /* sun */
  stage(25, 'Loading astronomical data');
  const bodies = [], byName = {}, pickables = [];
  const pGeo = new THREE.SphereGeometry(1, 64, 48), mGeo = new THREE.SphereGeometry(1, 24, 16);
  const sunMat = new THREE.ShaderMaterial({ vertexShader: SUN_VS, fragmentShader: SUN_FS, uniforms: { t: { value: 0 } } });
  const sunMesh = new THREE.Mesh(pGeo, sunMat); sunMesh.scale.setScalar(9); scene.add(sunMesh);
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
  { const g = glowCanvas.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,230,170,.9)'); gr.addColorStop(.25, 'rgba(255,170,70,.35)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const glowTex = tex(glowCanvas);
  const glows = [[48, 1], [130, .4]].map(([s, o]) => { const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o })); sp2.scale.setScalar(s); scene.add(sp2); return sp2; });
  // Corona streamers: seeded radial rays on a slowly rotating additive sprite
  const streakC = document.createElement('canvas'); streakC.width = streakC.height = 256;
  { const g = streakC.getContext('2d'), r = mulberry32(5); g.translate(128, 128);
    for (let i = 0; i < 110; i++) { const a = r() * 6.2832, l = 50 + r() * 78, gr = g.createLinearGradient(0, 0, l, 0);
      gr.addColorStop(0, 'rgba(255,200,120,.22)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
      g.save(); g.rotate(a); g.fillStyle = gr; g.fillRect(14, -.8 - r(), l, 1.6 + r()); g.restore(); } }
  const streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(streakC), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .9 }));
  streak.scale.setScalar(150); scene.add(streak); glows.push(streak);
  scene.add(new THREE.PointLight(0xfff0dc, 4.2, 0, 0), new THREE.AmbientLight(0x30405a, .55));
  const sunBody = { kind: 'sun', name: 'Sun', data: SUN, mesh: sunMesh, radius: 9, focusLen: 42, wp: new THREE.Vector3() };
  sunMesh.userData.body = sunBody; sunBody.real = new THREE.Vector3(); bodies.push(sunBody); byName.Sun = sunBody; pickables.push(sunMesh);

  /* planets & moons */
  const atmos = [], orbitLines = [], moonBodies = [];
  const makeBodyMaterial = (canvasFn, fallback, bump) => {
    try { const t = tex(canvasFn()); return new THREE.MeshStandardMaterial({ map: t, bumpMap: bump ? t : null, bumpScale: 1.5, roughness: 1, metalness: 0 }); }
    catch (e) { console.warn(TAG, 'Texture generation failed, using flat colour', e); return new THREE.MeshStandardMaterial({ color: fallback, roughness: 1 }); }
  };
  stage(35, 'Loading planetary textures');
  for (const [pi, d] of PLANETS.entries()) {
    const radius = radiusVis(d.diam / 2), pivot = new THREE.Object3D(), tilt = new THREE.Object3D();
    tilt.rotation.z = d.tilt * DEG; pivot.add(tilt); scene.add(pivot);
    let mat, clouds = null;
    if (d.name === 'Earth') {
      try {
        const e = earthTextures();
        mat = new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: EARTH_FS, uniforms: { day: { value: tex(e.day) }, night: { value: tex(e.night) } } });
        clouds = new THREE.Mesh(pGeo, new THREE.MeshStandardMaterial({ map: tex(e.clouds), transparent: true, depthWrite: false, roughness: 1 }));
        clouds.scale.setScalar(radius * 1.012); tilt.add(clouds);
      } catch (err) { console.warn(TAG, 'Earth textures failed', err); mat = new THREE.MeshStandardMaterial({ color: 0x2a5d9a, roughness: 1 }); }
    } else mat = makeBodyMaterial(LOOK[d.look], 0x888888, ['mercury', 'mars'].includes(d.look));
    const mesh = new THREE.Mesh(pGeo, mat); mesh.scale.setScalar(radius); tilt.add(mesh);
    const b = { kind: 'planet', name: d.name, data: d, mesh, pivot, tilt, clouds, radius, focusLen: radius * 8, wp: new THREE.Vector3(), rAU: d.el[0], moons: [], real: new THREE.Vector3(), earthMat: mat.isShaderMaterial ? mat : null };
    mesh.userData.body = b;
    const A = ATMO[d.name];
    if (A) {
      const am = new THREE.ShaderMaterial({ vertexShader: ATMO_VS, fragmentShader: ATMO_FS, uniforms: { col: { value: new THREE.Vector3(...A[0]) }, k: { value: A[2] }, pw: { value: A[3] }, warm: { value: A[4] } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const shell = new THREE.Mesh(pGeo, am); shell.scale.setScalar(radius * A[1]); tilt.add(shell); atmos.push(shell);
    }
    if (d.name === 'Saturn') {
      const rg = new THREE.RingGeometry(1.24, 2.27, 128, 1), pos = rg.attributes.position, uv = rg.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - 1.24) / (2.27 - 1.24), .5); // radial UV
      const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: tex(ringTexture()), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
      ring.rotation.x = -Math.PI / 2; ring.scale.setScalar(radius); tilt.add(ring); b.ringMat = ring.material; b.focusLen = radius * 9;
    }
    const pts = [];
    for (let k = 0; k < 256; k++) { const v = new THREE.Vector3(); orbitPos(d.el, k / 256 * 2 * Math.PI, v); pts.push(v); }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5f7fb5, transparent: true, opacity: .4 }));
    scene.add(line); orbitLines.push(line); b.orbit = line;
    bodies.push(b); byName[d.name] = b; pickables.push(mesh);
    stage(35 + Math.round((pi + 1) / PLANETS.length * 30), 'Loading planetary textures'); await frame();
  }
  stage(70, 'Creating moons');
  for (const [mi, m] of MOONS.entries()) {
    const [name, parentName, aKm, period, rKm, col, fact] = m, parent = byName[parentName], pr = parent.radius;
    const ratio = aKm / (parent.data.diam / 2), A = pr * (1.8 + Math.sqrt(ratio) * .5), radius = Math.max(.09, .75 * Math.sqrt(rKm / 6371));
    const base = col.map(v => v * .8), hi = col.map(v => Math.min(255, v * 1.15));
    const mat = makeBodyMaterial(() => paint(128, 64, rocky(base, hi)), new THREE.Color(col[0] / 255, col[1] / 255, col[2] / 255), true);
    const mesh = new THREE.Mesh(mGeo, mat); mesh.scale.setScalar(radius); parent.tilt.add(mesh);
    const b = { kind: 'moon', name, parent, mesh, radius, focusLen: Math.max(radius * 6, .8), wp: new THREE.Vector3(), real: new THREE.Vector3(), aAU: aKm / AU_KM, A, period, phase: mi * 1.7,
      data: { name, type: `Moon of ${parentName}`, diam: rKm * 2, aKm, period, fact } };
    mesh.userData.body = b; parent.moons.push(b); bodies.push(b); byName[name] = b; pickables.push(mesh); moonBodies.push(b);
  }
  await frame();

  /* asteroid belt, Kuiper belt: seeded Points clouds (one draw call each) */
  stage(72, 'Creating asteroid field');
  const gauss = r => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) * 1.7; }; // ~N(0,1)
  const AST_MAX = 12000, KUI_MAX = 10000, brnd = mulberry32(77), krnd = mulberry32(1930);
  const KIRKWOOD = [2.5, 2.82, 2.95, 3.27]; // main-belt gaps from Jupiter resonances (AU)
  const bp = new Float32Array(AST_MAX * 3);
  for (let i = 0; i < AST_MAX;) {
    const a = 2.7 + gauss(brnd) * .35; if (a < 2.1 || a > 3.3 || KIRKWOOD.some(g => Math.abs(a - g) < .025)) continue;
    const r = distVis(a), th = brnd() * 2 * Math.PI; bp.set([r * Math.cos(th), gauss(brnd) * .03 * r, r * Math.sin(th)], i * 3); i++;
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  const belt = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0x9a8f80, size: .35, transparent: true, opacity: .8, depthWrite: false }));
  scene.add(belt);
  stage(74, 'Creating Kuiper belt');
  const kp = new Float32Array(KUI_MAX * 3); // classical belt ~36-48 AU with a clump near Pluto's 3:2 resonance (~39.4 AU)
  for (let i = 0; i < KUI_MAX; i++) {
    const a = krnd() < .25 ? 39.4 + gauss(krnd) * 1.2 : 36 + krnd() * 12 + gauss(krnd) * 1.5, r = distVis(Math.min(60, Math.max(30, a))), th = krnd() * 2 * Math.PI;
    kp.set([r * Math.cos(th), gauss(krnd) * .12 * r, r * Math.sin(th)], i * 3);
  }
  const kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.BufferAttribute(kp, 3));
  const kuiper = new THREE.Points(kg, new THREE.PointsMaterial({ color: 0x7f93b8, size: .9, transparent: true, opacity: .5, depthWrite: false }));
  scene.add(kuiper);

  /* comets: nucleus + coma sprite + particle tail pointing away from the Sun; orbit from approximate elements */
  stage(76, 'Creating comets');
  const TAIL_MAX = 400, cometBodies = [];
  for (const d of COMETS) {
    const mesh = new THREE.Mesh(mGeo, new THREE.MeshStandardMaterial({ color: 0x6b645c, roughness: 1 })); mesh.scale.setScalar(.35); scene.add(mesh);
    const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9fd8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .7 })); coma.scale.setScalar(9); mesh.add(coma);
    const seeds = Array.from({ length: TAIL_MAX }, (_, i) => [(i + .5) / TAIL_MAX, krnd() - .5, krnd() - .5]);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TAIL_MAX * 3), 3));
    const tail = new THREE.Points(tg, new THREE.PointsMaterial({ color: 0xa8dcff, size: .7, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); tail.frustumCulled = false; scene.add(tail);
    const pts = []; for (let k = 0; k < 256; k++) { const v = new THREE.Vector3(); orbitPos(d.el, k / 256 * 2 * Math.PI, v); pts.push(v); }
    const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7ab8d9, transparent: true, opacity: .4 })); scene.add(orbit);
    const b = { kind: 'comet', name: d.name, data: d, mesh, tail, seeds, orbit, radius: .35, focusLen: 6, wp: new THREE.Vector3(), real: new THREE.Vector3(), rAU: d.el[0] };
    mesh.userData.body = b; bodies.push(b); byName[d.name] = b; pickables.push(mesh); cometBodies.push(b);
  }
  function updateTail(b) { // tail grows as the comet nears the Sun (visual heuristic, not a physical model)
    const p = b.tail.geometry.attributes.position, n = Math.min(TAIL_MAX, Q().tail), active = b.rAU < 4;
    b.tail.visible = active && S.comets; if (!active) return;
    const len = Math.min(70, 45 / Math.max(b.rAU, .3)), m = b.mesh.position, dir = tmp.copy(m).normalize();
    for (let i = 0; i < n; i++) { const [t, j, k] = b.seeds[i], w = t * t * len, s = t * len * .12; p.setXYZ(i, m.x + dir.x * w + j * s, m.y + dir.y * w + k * s, m.z + dir.z * w + j * s * .5); }
    p.needsUpdate = true; b.tail.geometry.setDrawRange(0, n);
  }
  stage(78, 'Loading textures');
  /* optional real textures: files listed in assets/textures/manifest.json (see ATTRIBUTIONS.md) override procedural ones; failures keep the fallback */
  let manifest = []; try { const r = await fetch('assets/textures/manifest.json'); if (r.ok) manifest = await r.json(); } catch (e) { console.warn(TAG, 'Texture manifest unavailable; using procedural textures', e); }
  const texLoader = new THREE.TextureLoader();
  const tryLoad = (name, ext = 'jpg') => new Promise(res => {
    const file = `${name}.${ext}`; if (!manifest.includes(file)) return res(null);
    const to = setTimeout(() => res(null), 8000);
    texLoader.load(`assets/textures/${file}`, t => { clearTimeout(to); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = tex(document.createElement('canvas')).anisotropy; res(t); },
      undefined, () => { clearTimeout(to); console.warn(TAG, 'Texture failed, keeping procedural:', file); res(null); });
  });
  let realCount = 0;
  await Promise.allSettled(bodies.filter(b => b.kind === 'planet' || b.kind === 'moon').map(async b => {
    const key = b.name.toLowerCase();
    if (b.earthMat?.uniforms) {
      const [day, night, cl] = await Promise.all([tryLoad('earth_day'), tryLoad('earth_night'), tryLoad('earth_clouds')]);
      if (day) { b.earthMat.uniforms.day.value = day; realCount++; } if (night) { b.earthMat.uniforms.night.value = night; realCount++; }
      if (cl && b.clouds) { b.clouds.material.map = cl; b.clouds.material.needsUpdate = true; realCount++; }
    } else if (b.mesh.material.map !== undefined) {
      const t = await tryLoad(key); if (t) { b.mesh.material.map = t; b.mesh.material.bumpMap = null; b.mesh.material.needsUpdate = true; realCount++; }
    }
    if (b.ringMat) { const t = await tryLoad('saturn_ring', 'png'); if (t) { b.ringMat.map = t; b.ringMat.needsUpdate = true; realCount++; } }
  }));
  console.log(TAG, `Textures initialized (${realCount} real, rest procedural)`);

  /* selection ring */
  const ring = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 96), new THREE.MeshBasicMaterial({ color: 0x9dbcff, transparent: true, opacity: .7, depthTest: false, side: THREE.DoubleSide }));
  ring.renderOrder = 10; ring.visible = false; scene.add(ring);

  /* ---------- state ---------- */
  stage(80, 'Initializing atmosphere');
  const sim = { jd: dateToJd(new Date()), speed: 1e5, playing: true };
  let meas = null, eclipse = false, sel = null, follow = null, anim = null, hover = false, clock = 0, frames = 0;
  const home = { name: 'Solar System', mesh: new THREE.Object3D(), wp: new THREE.Vector3(), focusLen: 560, dir: new THREE.Vector3(0, .45, .9).normalize() };
  scene.add(home.mesh);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), Z_AXIS = new THREE.Vector3(0, 0, 1);

  function updateBodies() {
    const dd = sim.jd - J2000;
    for (const b of bodies) {
      if (b.kind === 'planet') {
        const d = b.data, E = solveKepler((d.el[3] - d.el[4] + 360 * dd / d.period) * DEG, d.el[1]);
        b.rAU = orbitPos(d.el, E, b.pivot.position, b.real);
        const spin = ((dd * 24 / d.rot) % 1) * 2 * Math.PI; b.mesh.rotation.y = spin;
        if (b.clouds) b.clouds.rotation.y = spin * 1.03;
      } else if (b.kind === 'moon') {
        const th = b.phase + 2 * Math.PI * ((dd / b.period) % 1);
        if (eclipse && b.name === 'Moon') { // educational demo: put the Moon exactly on the Sun-Earth line
          tmp.copy(b.parent.pivot.position).normalize().multiplyScalar(-b.A);
          b.mesh.position.copy(tmp).applyAxisAngle(Z_AXIS, -b.parent.tilt.rotation.z);
        } else b.mesh.position.set(Math.cos(th) * b.A, 0, -Math.sin(th) * b.A);
        b.mesh.rotation.y = th;
        b.real.copy(b.parent.real); b.real.x += Math.cos(th) * b.aAU; b.real.y += Math.sin(th) * b.aAU;
      } else if (b.kind === 'comet') {
        const d = b.data, E = solveKepler(360 * (sim.jd - d.tp) / d.period * DEG, d.el[1]);
        b.rAU = orbitPos(d.el, E, b.mesh.position, b.real); updateTail(b);
      } else b.mesh.rotation.y = ((dd / 25.4) % 1) * 2 * Math.PI;
    }
    belt.rotation.y = ((dd / (365.25 * 4.44)) % 1) * 2 * Math.PI; kuiper.rotation.y = ((dd / (365.25 * 280)) % 1) * 2 * Math.PI;
    scene.updateMatrixWorld();
    for (const b of bodies) b.mesh.getWorldPosition(b.wp);
  }

  /* ---------- camera ---------- */
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function focusOn(b, dirOverride, lenOverride) {
    const off = tmp.copy(camera.position).sub(controls.target);
    anim = { t: 0, b, fromT: controls.target.clone(), dir: (dirOverride || b.dir || off.clone()).normalize(), fromLen: off.length(), toLen: lenOverride || b.focusLen };
    follow = null;
  }
  controls.addEventListener('start', () => { anim = null; });
  function updateCamera(dt) {
    if (anim) {
      anim.t = Math.min(1, anim.t + dt / (S.reduced ? .05 : 1.8));
      const e = ease(anim.t); anim.b.mesh.getWorldPosition(tmp2);
      controls.target.lerpVectors(anim.fromT, tmp2, e);
      camera.position.copy(controls.target).addScaledVector(anim.dir, lerp(anim.fromLen, anim.toLen, e));
      if (anim.t >= 1) { follow = anim.b === home ? null : anim.b; anim = null; }
    } else if (follow) {
      tmp2.copy(follow.wp).sub(controls.target); controls.target.add(tmp2); camera.position.add(tmp2);
    }
    controls.update();
  }

  /* ---------- UI ---------- */
  stage(88, 'Preparing observatory');
  const list = $('objs'), labels = $('labels');
  for (const b of bodies) {
    const li = document.createElement('li'), btn = document.createElement('button');
    if (b.kind === 'moon') li.className = 'm';
    btn.textContent = b.name; btn.addEventListener('click', () => select(b));
    li.appendChild(btn); list.appendChild(li); b.li = li; b.btn = btn;
    const l = document.createElement('div'); l.className = 'lbl' + (b.kind === 'moon' ? ' moon' : '');
    l.innerHTML = `<span></span>`; l.firstChild.textContent = b.name; l.addEventListener('click', () => select(b));
    labels.appendChild(l); b.label = l;
  }
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  function select(b, doFocus = true) {
    sel = b; ring.visible = true;
    bodies.forEach(x => { x.btn.classList.toggle('on', x === b); if (x.orbit) x.orbit.material.opacity = x === b ? .95 : .4; });
    b.btn.scrollIntoView({ block: 'nearest' });
    const d = b.data;
    $('iName').textContent = d.name; $('iType').textContent = d.type;
    let real = row('Diameter', d.diam.toLocaleString() + ' km');
    if (d.mass) real += row('Mass', d.mass); if (d.g) real += row('Surface gravity', d.g + ' m/s²'); if (d.disc) real += row('Discovery', d.disc); if (b.kind === 'comet') real += row('Model', 'Simplified visual model; elements approximate');
    if (b.kind === 'planet' || b.kind === 'comet') {
      real += row('Semi-major axis', `${d.el[0].toFixed(3)} AU`) + row('Distance from Sun now', '<span id="liveDist"></span>') +
        row('Eccentricity', d.el[1].toFixed(4)) + row('Inclination', d.el[2].toFixed(2) + '°') + row('Orbital period', fmtDays(d.period));
    } else if (b.kind === 'moon') {
      real += row('Orbits', b.parent.name) + row('Orbital radius', d.aKm.toLocaleString() + ' km') + row('Orbital period', fmtDays(Math.abs(d.period)) + (d.period < 0 ? ' (retrograde)' : ''));
    }
    if (b.kind !== 'moon') real += row('Rotation period', fmtRot(d.rot)) + row('Axial tilt', typeof d.tilt === 'number' ? d.tilt + '°' : 'Unknown') + row('Temperature', d.temp) + row('Atmosphere', d.atmo);
    else real += row('Rotation', 'Synchronous (assumed)');
    if (d.nMoons != null) real += row('Known moons', String(d.nMoons)); if (b.moons?.length) real += row('Major moons', `${b.moons.length}: ${b.moons.map(m => m.name).join(', ')}`);
    $('iReal').innerHTML = real;
    const exag = b.kind === 'planet' || b.kind === 'moon' ? Math.round(b.radius / (d.diam / 2 * 40 / AU_KM)) : Math.round(9 / (SUN.diam / 2 * 40 / AU_KM));
    $('iVis').innerHTML = row('Size exaggeration', `≈ ${exag.toLocaleString()}× (vs. 1 AU scale)`) + row('Distance scale', 'Compressed (40 × AU^0.55)');
    $('iFact').textContent = d.fact || ''; $('iFact').hidden = !d.fact;
    $('info').hidden = false; if (doFocus) focusOn(b);
  }
  const closeInfo = () => { sel = null; ring.visible = false; $('info').hidden = true; bodies.forEach(x => { x.btn.classList.remove('on'); if (x.orbit) x.orbit.material.opacity = .4; }); };
  $('closeInfo').onclick = closeInfo; $('focusBtn').onclick = () => sel && focusOn(sel);
  $('home').onclick = () => { focusOn(home); closeInfo(); };
  $('search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase(); bodies.forEach(b => { b.li.hidden = !!q && !(b.name + ' ' + (b.data.type || '')).toLowerCase().includes(q); });
  });
  $('search').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = bodies.find(b => !b.li.hidden); if (f) select(f); } });
  $('btnList').onclick = () => document.body.classList.toggle('hidelist-m');
  $('btnSet').onclick = () => $('settings').showModal(); $('btnAbout').onclick = () => $('about').showModal();

  /* time controls */
  const playBtn = $('play'), dt = $('dt');
  const setPlaying = p => { sim.playing = p; playBtn.textContent = p ? 'Pause' : 'Play'; };
  playBtn.onclick = () => setPlaying(!sim.playing);
  $('speed').onchange = e => { sim.speed = +e.target.value; };
  $('now').onclick = () => { sim.jd = dateToJd(new Date()); };
  $('j2000').onclick = () => { sim.jd = J2000; };
  dt.onchange = () => { const d = new Date(dt.value + ':00Z'); if (!isNaN(d)) sim.jd = dateToJd(d); };

  /* observatory mode */
  function setObs(on) {
    if (!on) stopTour();
    document.body.classList.toggle('obs', on); controls.autoRotate = on && !S.reduced;
    if (on) document.documentElement.requestFullscreen?.().catch(() => {}); else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (on) { setPlaying(true); }
  }
  $('btnObs').onclick = () => setObs(true); $('obsExit').onclick = () => setObs(false);
  addEventListener('keydown', e => {
    if (e.target.matches('input,select,textarea')) return;
    if (e.key === 'Escape') setObs(false);
    else if (e.key === ' ') { e.preventDefault(); setPlaying(!sim.playing); }
    else if (e.key.toLowerCase() === 'h') $('home').click();
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { document.body.classList.remove('obs'); controls.autoRotate = false; stopTour(); } });

  /* measurement line + light pulse */
  const hud = $('hud');
  const mLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .6 }));
  mLine.visible = false; mLine.frustumCulled = false; scene.add(mLine);
  const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe6a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); pulse.scale.setScalar(2); pulse.visible = false; scene.add(pulse);

  /* compare, measure and light-travel dialog */
  const cmpSel = [$('cmpA'), $('cmpB')];
  bodies.forEach(b => cmpSel.forEach(s => s.add(new Option(b.name, b.name))));
  cmpSel[0].value = 'Earth'; cmpSel[1].value = 'Mars';
  [['Sun', 'Earth'], ['Earth', 'Mars'], ['Sun', 'Jupiter'], ['Earth', 'Moon'], ['Earth', 'Neptune']].forEach(([x, y]) => {
    const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = `${x} → ${y}`;
    bt.onclick = () => { cmpSel[0].value = x; cmpSel[1].value = y; renderCompare(); }; $('cmpPre').appendChild(bt);
  });
  function pairInfo() {
    const [a, b] = cmpSel.map(s => byName[s.value]), dAU = a.real.distanceTo(b.real), km = dAU * AU_KM;
    return { a, b, dAU, km, lightS: km / 299792.458 };
  }
  function renderCompare() {
    const { a, b, dAU, km, lightS } = pairInfo(), g = x => x.data;
    const rows = [['Diameter', x => g(x).diam.toLocaleString() + ' km'], ['Mass', x => g(x).mass || '—'], ['Surface gravity', x => g(x).g ? g(x).g + ' m/s²' : '—'],
      ['Orbital period', x => g(x).period ? fmtDays(Math.abs(g(x).period)) : '—'], ['Rotation period', x => g(x).rot != null ? fmtRot(g(x).rot) : 'Synchronous'],
      ['Distance from Sun now', x => x.kind === 'sun' ? '—' : x.real.length().toFixed(3) + ' AU'], ['Temperature', x => g(x).temp || '—'], ['Known moons', x => g(x).nMoons ?? '—']];
    $('cmpTab').innerHTML = `<tr><th></th><th>${a.name}</th><th>${b.name}</th></tr>` + rows.map(([k, f]) => `<tr><td>${k}</td><td>${f(a)}</td><td>${f(b)}</td></tr>`).join('');
    const mx = Math.max(g(a).diam, g(b).diam), wd = x => Math.max(5, g(x).diam / mx * 130);
    $('cmpDia').innerHTML = [a, b].map(x => `<div><i style="width:${wd(x)}px;height:${wd(x)}px"></i><small>${x.name}</small></div>`).join('') + '<p class="note">True relative diameters (not the exaggerated 3D sizes).</p>';
    $('cmpDist').textContent = `${dAU >= .01 ? dAU.toFixed(4) + ' AU = ' : ''}${Math.round(km).toLocaleString()} km. Light takes ${fmtT(lightS)}.`;
    $('cmpNote').textContent = `Based on the simplified Keplerian model at ${$('date').textContent}; moons use circular orbits in the ecliptic plane. Not a precise ephemeris.`;
  }
  cmpSel.forEach(s => s.addEventListener('input', renderCompare));
  $('btnCmp').onclick = () => { renderCompare(); $('cmp').showModal(); };
  $('cmpGo').onclick = () => { const p = pairInfo(); meas = { a: p.a, b: p.b, t: 0, lightS: p.lightS }; $('cmp').close(); };
  $('cmpClr').onclick = () => { meas = null; mLine.visible = false; pulse.visible = false; hud.hidden = true; };

  /* educational solar-eclipse demo: Moon forced onto the Sun-Earth line (not a prediction) */
  function setEclipse(on) {
    eclipse = on; $('eclipse').textContent = on ? 'End eclipse demo' : 'Eclipse demo'; $('eclBanner').hidden = !on;
    if (!on) return;
    setPlaying(false); const e = byName.Earth; select(e, false); updateBodies();
    const sd = e.pivot.position.clone().normalize().negate(), side = new THREE.Vector3().crossVectors(sd, new THREE.Vector3(0, 1, 0)).normalize().add(new THREE.Vector3(0, .25, 0));
    focusOn(e, side, e.radius * 9);
  }
  $('eclipse').onclick = () => setEclipse(!eclipse);

  /* cinematic tour: hides the UI and glides between objects */
  let tourTimer = null; const TOUR = ['Earth', 'Jupiter', 'Saturn', 'Mars', 'Sun', 'Neptune', 'Venus', 'Pluto'];
  function stopTour() { clearInterval(tourTimer); tourTimer = null; controls.autoRotateSpeed = .35; }
  function startTour() {
    stopTour(); setObs(true); controls.autoRotate = !S.reduced; controls.autoRotateSpeed = .6; let i = 0;
    const step = () => select(byName[TOUR[i++ % TOUR.length]]); step(); tourTimer = setInterval(step, S.reduced ? 20000 : 14000);
  }
  $('btnCin').onclick = startTour;

  /* settings */
  const Q = () => QUALITY[S.quality] || QUALITY.medium;
  let composer = null, bloomPass = null;
  function apply() {
    const q = Q(), pr = Math.min(devicePixelRatio || 1, q.pr);
    renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); starMat.uniforms.pr.value = pr;
    if (composer) { composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); }
    if (bloomPass) bloomPass.enabled = q.bloom && S.bloom;
    starGeo.setDrawRange(0, Math.floor(Math.min(STAR_MAX, q.stars) * S.stars));
    belt.geometry.setDrawRange(0, q.ast); kuiper.geometry.setDrawRange(0, q.kuiper);
    atmos.forEach(a => { a.visible = S.atmo && q.atmo; }); orbitLines.forEach(l => { l.visible = S.orbits; });
    cometBodies.forEach(c => { c.mesh.visible = S.comets; c.orbit.visible = S.orbits && S.comets; });
    moonBodies.forEach(m => { m.mesh.visible = S.moons; }); glows.forEach(g => { g.visible = S.glow; });
    belt.visible = S.belt; kuiper.visible = S.kuiper; labels.style.display = S.labels ? '' : 'none';
    if (S.reduced) controls.autoRotate = false;
  }
  stage(94, 'Initializing post-processing');
  if (FX) {
    try {
      const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
      composer = new FX.EffectComposer(renderer, rt); composer.addPass(new FX.RenderPass(scene, camera));
      bloomPass = new FX.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .55, .6, 1.1); // strength, radius, threshold: only the Sun and glows exceed it
      composer.addPass(bloomPass); composer.addPass(new FX.OutputPass()); console.log(TAG, 'Post-processing initialized');
    } catch (e) { composer = null; bloomPass = null; console.warn(TAG, 'Post-processing failed; rendering directly', e); }
  }
  document.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k; if (el.type === 'checkbox') el.checked = !!S[k]; else el.value = S[k];
    el.addEventListener('input', () => { S[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value; save(); apply(); });
  });
  addEventListener('resize', apply); apply();

  /* picking */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
  const pick = (cx, cy) => {
    ptr.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, false).find(h => h.object.userData.body.kind !== 'moon' || S.moons);
    return hit ? hit.object.userData.body : null;
  };
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const b = pick(e.clientX, e.clientY); if (b) select(b); } down = null; });
  cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') cv.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : 'grab'; });

  /* labels: hidden when behind the camera, too close, or (for moons) far from their planet */
  const lp = new THREE.Vector3();
  function updateLabels() {
    if (!S.labels) return;
    const w = innerWidth, h = innerHeight, placed = [], order = sel ? [sel, ...bodies] : bodies;
    for (const b of order) {
      if (b._done === frames) continue; b._done = frames;
      lp.copy(b.wp).project(camera);
      const dist = camera.position.distanceTo(b.wp), x = (lp.x * .5 + .5) * w, y = (-lp.y * .5 + .5) * h;
      let show = lp.z < 1 && Math.abs(lp.x) < 1.1 && Math.abs(lp.y) < 1.1 && dist > b.radius * 2.2;
      if (b.kind === 'moon') show = show && S.moons && camera.position.distanceTo(b.parent.wp) < b.parent.radius * 18;
      if (b.kind === 'comet') show = show && S.comets;
      if (show && b !== sel) show = !placed.some(p => Math.abs(p[0] - x) < 70 && Math.abs(p[1] - y) < 16); // avoid overlaps
      if (show) placed.push([x, y]);
      if (show !== b._shown) { b.label.style.display = show ? '' : 'none'; b._shown = show; }
      if (show) b.label.style.transform = `translate(${x}px,${y}px) scale(${Math.min(1.1, Math.max(.75, 1.15 - Math.log10(dist) * .12)).toFixed(2)})`;
    }
  }

  /* ---------- main loop ---------- */
  let last = performance.now();
  const dateEl = $('date'), spdEl = $('spd');
  function loop(now) {
    requestAnimationFrame(loop);
    const dtS = Math.min(.1, (now - last) / 1000); last = now; clock += dtS; frames++;
    if (DEBUG && frames % 120 === 0) console.log(TAG, 'debug: fps', Math.round(1 / Math.max(dtS, 1e-3)), 'draw calls', renderer.info.render.calls, 'objects', bodies.length);
    if (sim.playing) sim.jd += dtS * sim.speed / 86400;
    updateBodies(); updateCamera(dtS);
    sunMat.uniforms.t.value = S.reduced ? 0 : clock;
    if (!S.reduced) stars.rotation.y += dtS * .002;
    if (sel) {
      ring.position.copy(sel.wp); ring.quaternion.copy(camera.quaternion);
      ring.scale.setScalar(sel.radius * 1.4 * (S.reduced ? 1 : 1 + .03 * Math.sin(clock * 3)));
    }
    streak.material.rotation = S.reduced ? 0 : clock * .01;
    if (meas) {
      const p = mLine.geometry.attributes.position; p.setXYZ(0, meas.a.wp.x, meas.a.wp.y, meas.a.wp.z); p.setXYZ(1, meas.b.wp.x, meas.b.wp.y, meas.b.wp.z); p.needsUpdate = true; mLine.visible = true;
      if (meas.t < 1) { meas.t = Math.min(1, meas.t + dtS / (S.reduced ? 3 : 9)); pulse.visible = true; pulse.position.lerpVectors(meas.a.wp, meas.b.wp, meas.t); } else pulse.visible = false;
      if (frames % 4 === 0) { hud.hidden = false; hud.textContent = `${meas.a.name} → ${meas.b.name}: light has travelled ${fmtT(meas.lightS * meas.t)} of ${fmtT(meas.lightS)} (pulse speed in the animation is not to scale)`; }
    }
    if (composer && bloomPass && Q().bloom && S.bloom) composer.render(); else renderer.render(scene, camera);
    updateLabels();
    if (frames % 6 === 0) {
      const d = jdToDate(sim.jd); dateEl.textContent = isNaN(d) ? '—' : d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
      spdEl.textContent = sim.playing ? `${sim.speed.toLocaleString()}× speed` : 'Paused';
      if (document.activeElement !== dt && !isNaN(d)) { try { dt.value = d.toISOString().slice(0, 16); } catch { /* year out of range */ } }
      const ld = $('liveDist'); if (ld && (sel?.kind === 'planet' || sel?.kind === 'comet')) ld.textContent = `${sel.rAU.toFixed(3)} AU (${(sel.rAU * AU_KM / 1e6).toFixed(1)} M km)`;
    }
  }
  updateBodies(); focusOn(home); anim.t = 1; updateCamera(0);
  requestAnimationFrame(loop);
  stage(100, 'Simulation ready');
  const L = $('loader'); L.classList.add('done'); setTimeout(() => L.remove(), 900);
  console.log(TAG, 'Three.js initialized, textures generated, planet system initialized, simulation ready');
}
setTimeout(() => { const l = $('loader'); if (l && !l.classList.contains('done')) fail('Initialization is taking too long. Check the browser console for [NAKUL SOLAR SYSTEM] messages.'); }, 30000);
boot().catch(e => fail('Startup error: ' + e.message));
