/** SYZYGY stub asset — replace via 404 recipe verify loop. */
export default function (THREE) {
  const g = new THREE.Group();

  const brass = 0xb08d57, bone = 0xe6dcc8, obs = 0x1a1a1e;
  const hull = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1.1, 4, 8),
    new THREE.MeshStandardMaterial({ color: brass, roughness: 0.45, metalness: 0.55 })
  );
  hull.material.name = "metal";
  hull.rotation.x = Math.PI / 2;
  g.add(hull);
  const oculus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: obs, roughness: 0.3, metalness: 0.2 })
  );
  oculus.material.name = "stone";
  oculus.rotation.x = Math.PI / 2;
  oculus.position.z = 0.85;
  g.add(oculus);
  for (const s of [-1, 1]) {
    const vane = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, 0.7),
      new THREE.MeshStandardMaterial({ color: brass, roughness: 0.5, metalness: 0.5 })
    );
    vane.material.name = "metal";
    vane.position.set(s * 0.55, 0, -0.1);
    g.add(vane);
  }
  for (let i = 0; i < 3; i++) {
    const thr = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: bone, roughness: 0.6 })
    );
    thr.material.name = "metal";
    thr.rotation.x = Math.PI / 2;
    thr.position.set((i - 1) * 0.14, 0, -0.95);
    g.add(thr);
  }

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
