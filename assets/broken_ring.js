export default function (THREE) {
  const g = new THREE.Group();
  const brass = 0xb08d57, obs = 0x1a1a1e, bone = 0xe6dcc8;
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, 0.2, 10, 56, Math.PI * 1.5),
    (() => { const m = new THREE.MeshStandardMaterial({ color: brass, roughness: 0.35, metalness: 0.7 }); m.name = "metal"; return m; })()
  );
  arc.rotation.x = Math.PI / 2;
  g.add(arc);
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(3.05, 0.08, 8, 48, Math.PI * 1.5),
    (() => { const m = new THREE.MeshStandardMaterial({ color: obs, roughness: 0.6, metalness: 0.2 }); m.name = "stone"; return m; })()
  );
  inner.rotation.x = Math.PI / 2;
  g.add(inner);
  for (let i = 0; i < 4; i++) {
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.07, 1.3),
      (() => { const m = new THREE.MeshStandardMaterial({ color: i % 2 ? bone : obs, roughness: 0.55, metalness: 0.3 }); m.name = "stone"; return m; })()
    );
    const a = 0.15 + i * 0.22;
    shard.position.set(Math.cos(a) * 3.7, 0.15 + i * 0.12, Math.sin(a) * 3.7);
    shard.rotation.y = a + 0.4;
    g.add(shard);
  }

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
