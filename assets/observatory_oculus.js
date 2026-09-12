/** SYZYGY stub asset — replace via 404 recipe verify loop. */
export default function (THREE) {
  const g = new THREE.Group();

  const brass = 0xb08d57, obs = 0x1a1a1e, bone = 0xe6dcc8;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.15, 4.2, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: brass, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide })
  );
  tube.material.name = "metal";
  tube.position.y = 2.1;
  g.add(tube);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 4.0, 16),
    new THREE.MeshStandardMaterial({ color: obs, roughness: 0.8 })
  );
  inner.material.name = "stone";
  inner.position.y = 2.1;
  g.add(inner);
  for (const y of [0.15, 4.0]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.1, 8, 24),
      new THREE.MeshStandardMaterial({ color: bone, roughness: 0.35, metalness: 0.5 })
    );
    ring.material.name = "metal";
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  const h = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: bone }));
  h.material.name = "metal";
  h.position.y = 2.1;
  g.add(h);
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), new THREE.MeshStandardMaterial({ color: bone }));
  v.material.name = "metal";
  v.position.y = 2.1;
  g.add(v);

  // Contract: base y=0, centred xz, measure vertices
  const box = new THREE.Box3(), v = new THREE.Vector3();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    for (let i = 0; i < p.count; i++) {
      box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
    }
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => {
    o.position.x -= c.x;
    o.position.y -= box.min.y;
    o.position.z -= c.z;
  });
  return g;
}
