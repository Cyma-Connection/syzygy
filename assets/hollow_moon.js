export default function (THREE) {
  const g = new THREE.Group();
  const brass = 0xb08d57, obs = 0x1a1a1e, bone = 0xe6dcc8, cold = 0x6b8cff;
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(2.7, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.82),
    (() => { const m = new THREE.MeshStandardMaterial({ color: brass, roughness: 0.5, metalness: 0.45, side: THREE.DoubleSide }); m.name = "metal"; return m; })()
  );
  g.add(shell);
  const liner = new THREE.Mesh(
    new THREE.SphereGeometry(2.35, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.75),
    (() => { const m = new THREE.MeshStandardMaterial({ color: obs, roughness: 0.8, side: THREE.DoubleSide }); m.name = "stone"; return m; })()
  );
  g.add(liner);
  for (const r of [1.4, 1.9]) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.05, 6, 28),
      (() => { const m = new THREE.MeshStandardMaterial({ color: bone, roughness: 0.4, metalness: 0.4 }); m.name = "metal"; return m; })()
    );
    rib.rotation.x = Math.PI / 2;
    g.add(rib);
  }
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.14, 8, 32),
    (() => { const m = new THREE.MeshStandardMaterial({ color: brass, roughness: 0.35, metalness: 0.65, emissive: cold, emissiveIntensity: 0.08 }); m.name = "metal"; return m; })()
  );
  collar.position.y = -1.55;
  collar.rotation.x = Math.PI / 2;
  g.add(collar);

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
