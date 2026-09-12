/** SYZYGY stub asset — replace via 404 recipe verify loop. */
export default function (THREE) {
  const g = new THREE.Group();

  const brass = 0xb08d57, bone = 0xe6dcc8;
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    pts.push(new THREE.Vector2(0.15 + (1 - t) * 0.9, t * 3.2));
  }
  const nucleus = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 12),
    new THREE.MeshStandardMaterial({ color: brass, roughness: 0.65, metalness: 0.3 })
  );
  nucleus.material.name = "metal";
  nucleus.rotation.x = -Math.PI / 2;
  g.add(nucleus);
  for (let i = 0; i < 6; i++) {
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 1.8 + i * 0.2, 5),
      new THREE.MeshStandardMaterial({ color: bone, roughness: 0.7, transparent: true, opacity: 0.85 })
    );
    tail.material.name = "metal";
    const a = (i / 6) * Math.PI * 2;
    tail.position.set(Math.cos(a) * 0.35, Math.sin(a) * 0.35, -2.2 - i * 0.15);
    tail.rotation.x = Math.PI / 2;
    g.add(tail);
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
