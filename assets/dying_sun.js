/** SYZYGY stub asset — replace via 404 recipe verify loop. */
export default function (THREE) {
  const g = new THREE.Group();

  const amber = 0xe8a04a, ember = 0x8b3a1a, brass = 0xb08d57;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(18, 24, 16),
    new THREE.MeshStandardMaterial({ color: amber, roughness: 0.55, emissive: amber, emissiveIntensity: 0.35 })
  );
  core.material.name = "metal";
  g.add(core);
  for (const r of [20, 22.5]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.35, 8, 48),
      new THREE.MeshStandardMaterial({ color: brass, roughness: 0.4, metalness: 0.6 })
    );
    ring.material.name = "metal";
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  for (let i = 0; i < 8; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 4, 6),
      new THREE.MeshStandardMaterial({ color: ember, roughness: 0.7, emissive: ember, emissiveIntensity: 0.2 })
    );
    cone.material.name = "metal";
    const a = (i / 8) * Math.PI * 2;
    cone.position.set(Math.cos(a) * 19, Math.sin(a * 1.7) * 6, Math.sin(a) * 19);
    cone.lookAt(0, 0, 0);
    g.add(cone);
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
