export default function (THREE) {
  const g = new THREE.Group();
  const brass = 0xb08d57, obs = 0x1a1a1e, bone = 0xe6dcc8, cold = 0x6b8cff;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.2, 4.2, 22, 1, true),
    (() => { const m = new THREE.MeshStandardMaterial({{ color: brass, roughness: 0.38, metalness: 0.65, side: THREE.DoubleSide }}); m.name = "metal"; return m; })()
  );
  tube.position.y = 2.1;
  g.add(tube);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 4.0, 18),
    (() => { const m = new THREE.MeshStandardMaterial({{ color: obs, roughness: 0.75, emissive: cold, emissiveIntensity: 0.06 }}); m.name = "stone"; return m; })()
  );
  inner.position.y = 2.1;
  g.add(inner);
  for (const y of [0.2, 4.0]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.11, 8, 28),
      (() => { const m = new THREE.MeshStandardMaterial({{ color: bone, roughness: 0.35, metalness: 0.55 }}); m.name = "metal"; return m; })()
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 2.2, 0.5),
    (() => { const m = new THREE.MeshStandardMaterial({{ color: brass, roughness: 0.45, metalness: 0.5 }}); m.name = "metal"; return m; })()
  );
  bracket.position.set(1.4, 2.0, 0);
  g.add(bracket);
  const h = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.05), (() => { const m = new THREE.MeshStandardMaterial({{ color: bone, roughness: 0.4 }}); m.name = "metal"; return m; })());
  h.position.y = 2.1;
  g.add(h);
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.05), (() => { const m = new THREE.MeshStandardMaterial({{ color: bone, roughness: 0.4 }}); m.name = "metal"; return m; })());
  v.position.y = 2.1;
  g.add(v);

  const box = new THREE.Box3(), v = new THREE.Vector3();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  return g;
}
