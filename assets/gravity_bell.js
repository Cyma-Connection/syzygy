/** SYZYGY stub asset — replace via 404 recipe verify loop. */
export default function (THREE) {
  const g = new THREE.Group();

  const brass = 0xb08d57, bone = 0xe6dcc8;
  const pts = [
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(1.6, 0.3),
    new THREE.Vector2(1.9, 1.5),
    new THREE.Vector2(1.4, 3.5),
    new THREE.Vector2(0.35, 5.2),
    new THREE.Vector2(0.25, 5.5),
  ];
  const bell = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 20),
    new THREE.MeshStandardMaterial({ color: brass, roughness: 0.45, metalness: 0.55, side: THREE.DoubleSide })
  );
  bell.material.name = "metal";
  g.add(bell);
  const axis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 5.8, 8),
    new THREE.MeshStandardMaterial({ color: bone, roughness: 0.5, metalness: 0.4 })
  );
  axis.material.name = "metal";
  axis.position.y = 2.9;
  g.add(axis);

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
