/** SYZYGY stub asset — replace via 404 recipe verify loop. */
export default function (THREE) {
  const g = new THREE.Group();

  const brass = 0xb08d57, obs = 0x1a1a1e;
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(3.5, 0.22, 8, 48, Math.PI * 1.55),
    new THREE.MeshStandardMaterial({ color: brass, roughness: 0.4, metalness: 0.65 })
  );
  arc.material.name = "metal";
  arc.rotation.x = Math.PI / 2;
  g.add(arc);
  for (let i = 0; i < 3; i++) {
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.08, 1.4),
      new THREE.MeshStandardMaterial({ color: obs, roughness: 0.6, metalness: 0.2 })
    );
    shard.material.name = "stone";
    const a = 0.2 + i * 0.25;
    shard.position.set(Math.cos(a) * 3.8, 0.2 + i * 0.15, Math.sin(a) * 3.8);
    shard.rotation.y = a;
    g.add(shard);
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
