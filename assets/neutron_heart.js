export default function (THREE) {
  const g = new THREE.Group();
  const brass = 0xb08d57, cold = 0x6b8cff;
  const t1 = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.5, 14, 36),
    (() => { const m = new THREE.MeshStandardMaterial({ color: brass, roughness: 0.3, metalness: 0.75 }); m.name = "metal"; return m; })()
  );
  t1.rotation.x = Math.PI / 2;
  g.add(t1);
  const t2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.22, 12, 28),
    (() => { const m = new THREE.MeshStandardMaterial({ color: cold, roughness: 0.25, metalness: 0.55, emissive: cold, emissiveIntensity: 0.25 }); m.name = "metal"; return m; })()
  );
  t2.rotation.x = Math.PI / 2;
  g.add(t2);
  for (let i = 0; i < 16; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.75),
      (() => { const m = new THREE.MeshStandardMaterial({ color: cold, roughness: 0.35, metalness: 0.6, emissive: cold, emissiveIntensity: 0.1 }); m.name = "metal"; return m; })()
    );
    const a = (i / 16) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 2.15, 0, Math.sin(a) * 2.15);
    fin.rotation.y = -a;
    g.add(fin);
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
