// ISS tracking: SGP4 (satellite.js) when a TLE valid for the simulated date exists, otherwise a clearly labelled
// simplified circular orbit. Everything is Earth-centred and attached to Earth's existing tilt group, so the
// Solar System coordinate system is untouched.
//
// FRAMES
//  ECI  (TEME, km): x toward the vernal equinox, z toward the north pole. SGP4 output.
//  ECEF (km): ECI rotated by Greenwich sidereal angle (GMST): x -> lon 0, y -> lon 90°E, z -> north.
//  Scene (Earth-fixed, in the Earth mesh frame): (x, y, z)_scene = (x, z, -y)_ECEF. This matches how the Earth sphere
//  geometry maps longitude, so the ISS appears above the right place on the Earth texture. The group is rotated
//  with the Earth mesh each frame, so it also moves correctly in the inertial scene frame.
import { ISS_DATA, FALLBACK_ORBIT, TLE_URL, STORED_TLE, MAX_TLE_AGE_DAYS, SATELLITE_JS_URL } from './satellite-data.js';
import { buildISSModel } from './satellite-model.js';

const RE = 6378.137, E2 = 0.00669437999, DEG = Math.PI / 180, MODEL_SIZE = 0.12, TRACK_N = 96;
const gmst = jd => (((280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360) + 360) % 360 * DEG;
const toDate = jd => new Date((jd - 2440587.5) * 864e5);

/** ECEF (km) -> geodetic latitude/longitude (rad) and height (km) on the WGS84 ellipsoid (3 fixed-point iterations). */
function geodetic([x, y, z]) {
  const p = Math.hypot(x, y); let lat = Math.atan2(z, p * (1 - E2)), h = 0;
  for (let i = 0; i < 3; i++) { const s = Math.sin(lat), n = RE / Math.sqrt(1 - E2 * s * s); h = p / Math.cos(lat) - n; lat = Math.atan2(z, p * (1 - E2 * n / (n + h))); }
  return { lat, lon: Math.atan2(y, x), h };
}

export function createIssTracker(THREE, earth, glowTex) {
  const V = THREE.Vector3, k = earth.radius / RE;                     // km -> scene units (Earth's displayed radius)
  const frame = new THREE.Object3D(), inert = new THREE.Object3D();    // frame spins with Earth; inert does not (orbit ring)
  earth.tilt.add(frame, inert);
  const group = new THREE.Group(); frame.add(group);
  const model = buildISSModel(THREE); model.scale.setScalar(MODEL_SIZE); group.add(model);
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xbfe6ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, sizeAttenuation: false }));
  marker.scale.setScalar(.03); group.add(marker);                      // screen-constant dot so the ISS stays findable when zoomed out
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); group.add(proxy); // click target

  const lineMat = o => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const mkLine = (n, parent, o) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const l = new THREE.Line(g, lineMat(o)); l.frustumCulled = false; parent.add(l); return l;
  };
  const track = mkLine(TRACK_N, frame, .9), orbitRing = mkLine(121, inert, .5); orbitRing.visible = false;
  const tc = track.geometry.attributes.color, TN = Math.round(TRACK_N * 20 / 90); // 20 min of past, 70 min of future
  for (let i = 0; i < TRACK_N; i++) { const f = i <= TN ? .12 + .5 * i / TN : .62 - .5 * (i - TN) / (TRACK_N - TN); tc.setXYZ(i, .35 * f, .8 * f, 1 * f); }
  const oc = orbitRing.geometry.attributes.color; for (let i = 0; i < 121; i++) oc.setXYZ(i, .25, .6, .8);

  // Visibility footprint: spherical cap of angular radius lambda = acos(RE / (RE + h)) (geometric horizon, 0° elevation).
  // Built from concentric rings so the flat triangles stay above the curved surface.
  const RINGS = 5, SEG = 48, capR = earth.radius * 1.009, capGeo = new THREE.BufferGeometry(), capPos = new Float32Array((1 + RINGS * SEG) * 3), idx = [];
  for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEG; s++) {
    const a = r === 0 ? 0 : 1 + (r - 1) * SEG + s, b = r === 0 ? 0 : 1 + (r - 1) * SEG + (s + 1) % SEG, c = 1 + r * SEG + s, d = 1 + r * SEG + (s + 1) % SEG;
    if (r === 0) idx.push(0, c, d); else idx.push(a, c, b, b, c, d);
  }
  capGeo.setAttribute('position', new THREE.BufferAttribute(capPos, 3)); capGeo.setIndex(idx);
  const cap = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ color: 0x5fd0ff, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const rim = mkLine(SEG + 1, frame, .8); rim.material.vertexColors = false; rim.material.color.set(0x7fdcff);
  cap.visible = rim.visible = false; frame.add(cap);
  let capLambda = -1;
  function shapeCap(lambda) {
    capLambda = lambda; let n = 0; capPos.set([0, capR, 0], 0); const rp = rim.geometry.attributes.position;
    for (let r = 1; r <= RINGS; r++) for (let s = 0; s < SEG; s++) {
      const th = s / SEG * 2 * Math.PI, la = lambda * r / RINGS, x = capR * Math.sin(la) * Math.cos(th), y = capR * Math.cos(la), z = capR * Math.sin(la) * Math.sin(th);
      capPos.set([x, y, z], (1 + (r - 1) * SEG + s) * 3); if (r === RINGS) rp.setXYZ(s, x, y, z);
    }
    rp.setXYZ(SEG, rp.getX(0), rp.getY(0), rp.getZ(0)); capGeo.attributes.position.needsUpdate = rp.needsUpdate = true;
  }

  // ---- propagation ----
  let sat = null, tles = [], live = { lat: 0, lon: 0, h: FALLBACK_ORBIT.altitudeKm, v: 7.66, ascending: true, lambda: 0, mode: 'fallback', note: 'Starting…' };
  const body = { kind: 'sat', name: 'ISS', data: ISS_DATA, mesh: group, radius: .09, focusLen: .7, wp: new V(), real: new V(), parent: earth };
  function pickTle(jd) { return tles.find(t => Math.abs(jd - t.epoch) <= MAX_TLE_AGE_DAYS); }
  function eci(jd, t) { // km, km/s in ECI
    if (t && sat) { const pv = sat.propagate(t.rec, toDate(jd)); if (pv.position) return [[pv.position.x, pv.position.y, pv.position.z], [pv.velocity.x, pv.velocity.y, pv.velocity.z]]; }
    const a = RE + FALLBACK_ORBIT.altitudeKm, n = 2 * Math.PI / (FALLBACK_ORBIT.periodMin * 60), u = n * (jd - 2451545) * 86400, i = FALLBACK_ORBIT.inclinationDeg * DEG;
    return [[a * Math.cos(u), a * Math.sin(u) * Math.cos(i), a * Math.sin(u) * Math.sin(i)], [-a * n * Math.sin(u), a * n * Math.cos(u) * Math.cos(i), a * n * Math.cos(u) * Math.sin(i)]];
  }
  const toEcef = (p, g) => [Math.cos(g) * p[0] + Math.sin(g) * p[1], -Math.sin(g) * p[0] + Math.cos(g) * p[1], p[2]];
  const toScene = (e, s = k) => [e[0] * s, e[2] * s, -e[1] * s];

  let trackJd = -1e9, ringJd = -1e9, lastSel = false, trackLL = [], curTle = null;
  function rebuildTrack(jd, t) { // ground track = sub-satellite points (ECEF at each sample time) pushed onto the surface
    const p = track.geometry.attributes.position, r = earth.radius * 1.011; trackLL = [];
    for (let i = 0; i < TRACK_N; i++) {
      const j = jd + (i - TN) * (90 / (TRACK_N - 1)) * 60 / 86400, e = toEcef(eci(j, t)[0], gmst(j)), g = geodetic(e), c = Math.cos(g.lat);
      p.setXYZ(i, r * c * Math.cos(g.lon), r * Math.sin(g.lat), -r * c * Math.sin(g.lon)); trackLL.push([g.lat, g.lon]);
    }
    p.needsUpdate = true; trackJd = jd;
  }
  function rebuildRing(jd, t) { // one inertial orbit, expressed with GMST frozen at jd; lives in the non-spinning frame
    const p = orbitRing.geometry.attributes.position, g0 = gmst(jd), P = (t ? 2 * Math.PI / t.rec.no : FALLBACK_ORBIT.periodMin) * 60 / 86400; // rec.no is rad/min
    for (let i = 0; i < 121; i++) { const s = toScene(toEcef(eci(jd + P * i / 120, t)[0], g0)); p.setXYZ(i, s[0], s[1], s[2]); }
    p.needsUpdate = true; inert.rotation.y = earth.mesh.rotation.y; ringJd = jd;
  }

  const Y = new V(0, 1, 0), vA = new V(), vB = new V(), vX = new V(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  function update(jd, camera) {
    frame.rotation.y = earth.mesh.rotation.y; body.real.copy(earth.real);
    const t = curTle = pickTle(jd), [pI, vI] = eci(jd, t), g = gmst(jd), e = toEcef(pI, g), gd = geodetic(e), e2 = toEcef(eci(jd + 5 / 86400, t)[0], g);
    live = { lat: gd.lat, lon: gd.lon, h: gd.h, v: Math.hypot(...vI), ascending: geodetic(e2).lat > gd.lat, lambda: Math.acos(RE / (RE + gd.h)),
      mode: t ? 'tle' : 'fallback', note: t ? `${t.label}; epoch ${toDate(t.epoch).toISOString().slice(0, 10)}, SGP4 prediction` : (tles.length ? 'FALLBACK SIMULATED: simulation date is outside the TLE validity window (±' + MAX_TLE_AGE_DAYS + ' d); simplified circular orbit' : 'FALLBACK SIMULATED: no TLE loaded; simplified circular orbit') };
    const s = toScene(e); group.position.set(s[0], s[1], s[2]);
    // orientation: y = zenith, z = flight direction (finite difference of the ECEF path), x = y × z (truss across the orbit plane)
    vA.set(...s).normalize(); vB.set(...toScene(e2)).sub(group.position); vB.addScaledVector(vA, -vB.dot(vA)).normalize(); vX.crossVectors(vA, vB);
    m4.makeBasis(vX, vA, vB); group.quaternion.setFromRotationMatrix(m4);
    const dist = camera.position.distanceTo(body.wp);
    marker.material.opacity = Math.min(.9, Math.max(0, (dist - .6) / 3)); proxy.scale.setScalar(Math.max(.05, dist * .012));
    if (track.visible && Math.abs(jd - trackJd) > 60 / 86400) rebuildTrack(jd, t);
    if (lastSel) {
      if (Math.abs(jd - ringJd) > 120 / 86400) rebuildRing(jd, t);
      if (Math.abs(live.lambda - capLambda) > .001) shapeCap(live.lambda);
      cap.quaternion.setFromUnitVectors(Y, vA); rim.quaternion.copy(cap.quaternion);
    }
  }
  function setSelected(on) { lastSel = on; orbitRing.visible = cap.visible = rim.visible = on; ringJd = -1e9; capLambda = -1; }
  function setVisible(show, showTrack) { group.visible = show; track.visible = show && showTrack; if (!track.visible) trackJd = -1e9; if (!show) setSelected(false); }

  const f1 = (v, d = 2) => v.toFixed(d), dm = (r, pos, neg) => `${Math.abs(r / DEG).toFixed(2)}° ${r >= 0 ? pos : neg}`, dLat = r => dm(r, 'N', 'S'), dLon = r => dm(r, 'E', 'W');
  function infoHtml(row) {
    const rec = live.mode === 'tle' ? curTle : null, per = rec ? 2 * Math.PI / rec.rec.no : FALLBACK_ORBIT.periodMin, incl = rec ? rec.rec.inclo / DEG : FALLBACK_ORBIT.inclinationDeg;
    const radius = RE * live.lambda, exag = Math.round(MODEL_SIZE * RE / earth.radius / 0.109);
    return {
      real: row('Type', ISS_DATA.type) + row('Altitude', `${f1(live.h, 0)} km (≈ 400–420 km)`) + row('Inclination', `${f1(incl)}°`) + row('Orbital period', `${f1(per, 1)} min`) +
        row('Velocity', `${Math.round(live.v * 3600).toLocaleString()} km/h`) + row('Current latitude', dLat(live.lat)) + row('Current longitude', dLon(live.lon)) + row('Size', '109 m × 73 m') + row('Mass', ISS_DATA.mass),
      vis: row('Model size', `≈ ${exag.toLocaleString()}× real`) + row('Orbit height', 'True ratio to Earth radius') + row('Position source', live.mode === 'tle' ? 'TLE + SGP4' : 'Simulated (not live)'),
      live: row('Latitude / longitude', `${dLat(live.lat)} / ${dLon(live.lon)}`) + row('Altitude', `${f1(live.h, 0)} km`) + row('Orbital position', live.ascending ? 'Ascending (northbound)' : 'Descending (southbound)') +
        row('Visibility footprint', `radius ≈ ${Math.round(radius).toLocaleString()} km (${f1(live.lambda / DEG, 1)}°)`) + row('Share of Earth in view', `${f1((1 - Math.cos(live.lambda)) / 2 * 100, 1)}% (geometric)`) + row('Data', live.note)
    };
  }

  // 2-D live-coverage map (equirectangular): ground track, footprint outline and ISS position
  const img = new Image(); let imgOk = false; img.onload = () => { imgOk = true; }; img.src = 'assets/textures/earth_day_2k.jpg';
  function drawMap(cv) {
    if (!cv || !cv.getContext) return; const c = cv.getContext('2d'), W = cv.width, H = cv.height, X = lon => (lon / Math.PI + 1) / 2 * W, Yy = lat => (.5 - lat / Math.PI) * H;
    c.clearRect(0, 0, W, H); if (imgOk) { c.globalAlpha = .75; c.drawImage(img, 0, 0, W, H); c.globalAlpha = 1; } else { c.fillStyle = '#0a1422'; c.fillRect(0, 0, W, H); }
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
    c.strokeStyle = 'rgba(120,210,255,.85)'; c.lineWidth = 1.5; c.beginPath();
    trackLL.forEach(([la, lo], i) => { const x = X(lo), y = Yy(la); if (i && Math.abs(x - X(trackLL[i - 1][1])) < W / 2) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke();
    const pts = []; for (let a = 0; a <= 64; a++) { const th = a / 64 * 2 * Math.PI, la = Math.asin(Math.sin(live.lat) * Math.cos(live.lambda) + Math.cos(live.lat) * Math.sin(live.lambda) * Math.cos(th)); pts.push([la, live.lon + Math.atan2(Math.sin(th) * Math.sin(live.lambda) * Math.cos(live.lat), Math.cos(live.lambda) - Math.sin(live.lat) * Math.sin(la))]); }
    for (const off of [-W, 0, W]) { c.beginPath(); pts.forEach(([la, lo], i) => { const x = X(lo) + off, y = Yy(la); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.fillStyle = 'rgba(95,208,255,.18)'; c.fill(); c.strokeStyle = 'rgba(160,230,255,.9)'; c.lineWidth = 1; c.stroke(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(X(live.lon), Yy(live.lat), 3.5, 0, 7); c.fill();
  }

  /** Loads satellite.js and a live TLE in the background; the app keeps running on the fallback if either fails. */
  async function init() {
    try { sat = await import(SATELLITE_JS_URL); } catch (e) { console.warn('[NAKUL SOLAR SYSTEM] satellite.js failed to load; ISS uses simplified orbit', e); return; }
    const add = (l1, l2, label) => { try { const rec = sat.twoline2satrec(l1, l2); if (!rec.error) tles.push({ rec, epoch: rec.jdsatepoch + (rec.jdsatepochF || 0), label }); } catch (e) { console.warn('[NAKUL SOLAR SYSTEM] bad TLE', e); } };
    add(STORED_TLE.line1, STORED_TLE.line2, 'Stored TLE');
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 6000), r = await fetch(TLE_URL, { signal: ctl.signal }); clearTimeout(to);
      const ls = (await r.text()).split('\n').map(s => s.trim()), l1 = ls.find(s => s.startsWith('1 25544')), l2 = ls.find(s => s.startsWith('2 25544'));
      if (r.ok && l1 && l2) { add(l1, l2, 'Live TLE (CelesTrak)'); tles.reverse(); console.log('[NAKUL SOLAR SYSTEM] Live ISS TLE loaded'); } // live first
    } catch (e) { console.warn('[NAKUL SOLAR SYSTEM] Live ISS TLE unavailable; using stored/fallback orbit', e); }
  }
  return { body, proxy, update, setSelected, setVisible, infoHtml, drawMap, init };
}
