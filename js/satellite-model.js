// Procedural ISS (about 25 meshes, shared geometries/materials). Local axes: x = truss, y = zenith, z = flight direction.
// Unit size: truss length = 1; the caller scales the group.
export function buildISSModel(THREE) {
  const white = new THREE.MeshStandardMaterial({ color: 0xe9e9ee, metalness: .55, roughness: .42 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8d9097, metalness: .7, roughness: .45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb8923c, metalness: .85, roughness: .35 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x142a63, emissive: 0x0a1f52, emissiveIntensity: .7, metalness: .75, roughness: .3, side: THREE.DoubleSide });
  const g = new THREE.Group(), box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(1, 1, 1, 14);
  const add = (geo, mat, sx, sy, sz, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  add(box, grey, 1, .028, .028, 0, 0, 0);                                    // integrated truss
  for (const sx of [-1, 1]) {
    for (const [x, w] of [[.46, .085], [.25, .085]]) {                         // four solar-array pairs (two blankets each)
      for (const sz of [-1, 1]) add(box, panel, w, .004, .30, sx * x, 0, sz * .18);
      add(box, grey, .012, .012, .08, sx * x, 0, 0);                           // mast
    }
    add(box, white, .1, .003, .07, sx * .11, -.03, .05);                       // radiators
  }
  // pressurised modules along the flight axis (cylinders default to y-axis, so rotate 90° about x)
  [[.075, .04, .13, .0], [.05, .036, .09, .15], [.04, .032, .08, -.12], [.065, .035, .12, -.24], [.05, .03, .08, .26]]
    .forEach(([len, r, , z]) => add(cyl, white, r, len * 2.2, r, 0, 0, z, Math.PI / 2));
  add(cyl, white, .028, .1, .028, .075, .0, .02, 0).rotation.z = Math.PI / 2;  // Columbus/Kibo-style lateral lab
  add(cyl, white, .028, .1, .028, -.075, .0, .02, 0).rotation.z = Math.PI / 2;
  add(cyl, gold, .02, .05, .02, 0, 0, .31, Math.PI / 2);                       // docking adapter
  add(box, grey, .004, .06, .004, .03, .04, -.02);                              // antenna mast
  add(box, white, .004, .004, .14, -.04, .02, .08);                             // robotic arm
  return g;
}
