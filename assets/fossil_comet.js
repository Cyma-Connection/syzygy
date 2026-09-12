export default function (THREE) {
  const g = new THREE.Group();
  const brass = 0xb08d57, bone = 0xe6dcc8, amber = 0xe8a04a;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    pts.push(new THREE.Vector2(0.12 + (1 - t) * (1 - t) * 0.95, t * 3.4));
  }
  const nucleus = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 14),
    (() => { const m = new THREE.MeshStandardMaterial({ color: brass, roughness: 0.6, metalness: 0.35 }); m.name = "metal"; return m; })()
  );
  nucleus.rotation.x = -Math.PI / 2;
  g.add(nucleus);
  for (let i = 0; i < 8; i++) {
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 1.6 + i * 0.18, 5),
      (() => { const m = new THREE.MeshStandardMaterial({ color: bone, roughness: 0.7, transparent: true, opacity: 0.8, emissive: amber, emissiveIntensity: 0.05 }); m.name = "metal"; return m; })()
    );
    const a = (i / 8) * Math.PI * 2;
    tail.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, -2.0 - i * 0.12);
    tail.rotation.x = Math.PI / 2;
    g.add(tail);
  }
  for (let i = 0; i < 6; i++) {
    const pit = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      (() => { const m = new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 0.8 }); m.name = "metal"; return m; })()
    );
    const a = (i / 6) * Math.PI * 2;
    pit.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.4);
    g.add(pit);
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
