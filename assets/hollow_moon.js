/** SYZYGY stub asset — replace via 404 recipe verify loop. */
export default function (THREE) {
  const g = new THREE.Group();

  const brass = 0xb08d57, obs = 0x1a1a1e, bone = 0xe6dcc8;
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.85),
    new THREE.MeshStandardMaterial({ color: brass, roughness: 0.55, metalness: 0.4, side: THREE.DoubleSide })
  );
  shell.material.name = "metal";
  g.add(shell);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.12, 8, 32),
    new THREE.MeshStandardMaterial({ color: bone, roughness: 0.4, metalness: 0.3 })
  );
  rim.material.name = "metal";
  rim.position.y = -1.4;
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.06, 6, 24),
    new THREE.MeshStandardMaterial({ color: obs, roughness: 0.7 })
  );
  inner.material.name = "stone";
  inner.rotation.x = Math.PI / 2;
  g.add(inner);

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
