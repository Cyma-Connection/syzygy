export default function (THREE) {
  const g = new THREE.Group();
  const brass = 0xb08d57, bone = 0xe6dcc8, obs = 0x1a1a1e, cold = 0x6b8cff;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    pts.push(new THREE.Vector2(0.12 + Math.sin(t * Math.PI) * 0.32, t * 1.9 - 0.95));
  }
  const hull = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 16),
    (() => { const m = new THREE.MeshStandardMaterial({ color: brass, roughness: 0.4, metalness: 0.6 }); m.name = "metal"; return m; })()
  );
  hull.rotation.x = Math.PI / 2;
  g.add(hull);
  const oculus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 0.22, 14),
    (() => { const m = new THREE.MeshStandardMaterial({ color: obs, roughness: 0.25, metalness: 0.3, emissive: cold, emissiveIntensity: 0.55 }); m.name = "stone"; return m; })()
  );
  oculus.rotation.x = Math.PI / 2;
  oculus.position.z = 0.95;
  g.add(oculus);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.03, 8, 20),
    (() => { const m = new THREE.MeshStandardMaterial({ color: bone, roughness: 0.35, metalness: 0.5 }); m.name = "metal"; return m; })()
  );
  ring.position.z = 0.95;
  g.add(ring);
  for (const s of [-1, 1]) {
    const vane = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.55, 0.85),
      (() => { const m = new THREE.MeshStandardMaterial({ color: brass, roughness: 0.45, metalness: 0.55 }); m.name = "metal"; return m; })()
    );
    vane.position.set(s * 0.52, 0, -0.05);
    g.add(vane);
  }
  for (let i = 0; i < 5; i++) {
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.08),
      (() => { const m = new THREE.MeshStandardMaterial({ color: bone, roughness: 0.5 }); m.name = "metal"; return m; })()
    );
    tick.position.set(0, 0.28, -0.3 + i * 0.15);
    g.add(tick);
  }
  for (let i = 0; i < 3; i++) {
    const thr = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.28, 8),
      (() => { const m = new THREE.MeshStandardMaterial({ color: bone, roughness: 0.55, emissive: 0xe8a04a, emissiveIntensity: 0.7 }); m.name = "metal"; return m; })()
    );
    thr.rotation.x = Math.PI / 2;
    thr.position.set((i - 1) * 0.13, 0, -1.0);
    g.add(thr);
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
