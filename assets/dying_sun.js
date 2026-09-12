export default function (THREE) {
  const g = new THREE.Group();
  const amber = 0xe8a04a, ember = 0x8b3a1a, brass = 0xb08d57, cold = 0x6b8cff;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(16, 28, 20),
    (() => { const m = new THREE.MeshStandardMaterial({ color: amber, roughness: 0.45, metalness: 0.2, emissive: amber, emissiveIntensity: 0.45 }); m.name = "metal"; return m; })()
  );
  g.add(core);
  const crack = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 14, 0.6),
    (() => { const m = new THREE.MeshStandardMaterial({ color: ember, roughness: 0.7, emissive: ember, emissiveIntensity: 0.5 }); m.name = "metal"; return m; })()
  );
  crack.rotation.z = 0.25;
  g.add(crack);
  for (const r of [18.5, 20.5, 22.5]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.28, 8, 56),
      (() => { const m = new THREE.MeshStandardMaterial({ color: brass, roughness: 0.35, metalness: 0.7 }); m.name = "metal"; return m; })()
    );
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  for (let i = 0; i < 10; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, 3.6, 6),
      (() => { const m = new THREE.MeshStandardMaterial({ color: ember, roughness: 0.65, emissive: ember, emissiveIntensity: 0.25 }); m.name = "metal"; return m; })()
    );
    const a = (i / 10) * Math.PI * 2;
    cone.position.set(Math.cos(a) * 17.5, Math.sin(a * 1.3) * 5, Math.sin(a) * 17.5);
    cone.lookAt(0, 0, 0);
    g.add(cone);
  }
  const coldCap = new THREE.Mesh(
    new THREE.SphereGeometry(4, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
    (() => { const m = new THREE.MeshStandardMaterial({ color: cold, roughness: 0.3, metalness: 0.4, emissive: cold, emissiveIntensity: 0.2 }); m.name = "metal"; return m; })()
  );
  coldCap.position.y = 14;
  g.add(coldCap);

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
