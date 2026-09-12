/** SYZYGY stub asset — replace via 404 recipe verify loop. */
export default function (THREE) {
  const g = new THREE.Group();

  const brass = 0xb08d57, cold = 0x6b8cff;
  const t1 = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, 0.55, 12, 32),
    new THREE.MeshStandardMaterial({ color: brass, roughness: 0.35, metalness: 0.7 })
  );
  t1.material.name = "metal";
  t1.rotation.x = Math.PI / 2;
  g.add(t1);
  const t2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.25, 10, 24),
    new THREE.MeshStandardMaterial({ color: cold, roughness: 0.3, metalness: 0.5, emissive: cold, emissiveIntensity: 0.15 })
  );
  t2.material.name = "metal";
  t2.rotation.x = Math.PI / 2;
  g.add(t2);
  for (let i = 0; i < 12; i++) {
    const fin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: cold, roughness: 0.4, metalness: 0.6 })
    );
    fin.material.name = "metal";
    const a = (i / 12) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
    fin.rotation.z = Math.PI / 2;
    fin.rotation.y = -a;
    g.add(fin);
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
