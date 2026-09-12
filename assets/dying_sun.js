export default function (THREE) {
  const g = new THREE.Group();
  const amber = 0xe8a04a, ember = 0xc45a1a, brass = 0xb08d57, coreHot = 0xffc078;

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(16, 36, 28),
    (() => {
      const m = new THREE.MeshStandardMaterial({
        color: amber, roughness: 0.5, metalness: 0.12,
        emissive: amber, emissiveIntensity: 0.75,
      });
      m.name = 'metal';
      return m;
    })()
  );
  g.add(core);

  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(10.5, 24, 18),
    (() => {
      const m = new THREE.MeshStandardMaterial({
        color: coreHot, roughness: 0.3, metalness: 0.05,
        emissive: coreHot, emissiveIntensity: 1.0,
      });
      m.name = 'metal';
      return m;
    })()
  );
  g.add(inner);

  // Flush scars only (no offset spheres / caps)
  for (let i = 0; i < 5; i++) {
    const scar = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 8 + (i % 2), 0.3),
      (() => {
        const m = new THREE.MeshStandardMaterial({
          color: ember, roughness: 0.85, emissive: ember, emissiveIntensity: 0.5,
        });
        m.name = 'metal';
        return m;
      })()
    );
    const a = (i / 5) * Math.PI * 2;
    scar.position.set(Math.cos(a) * 15.7, ((i % 3) - 1) * 3, Math.sin(a) * 15.7);
    scar.lookAt(0, 0, 0);
    g.add(scar);
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(18.2, 0.2, 8, 64),
    (() => {
      const m = new THREE.MeshStandardMaterial({
        color: brass, roughness: 0.4, metalness: 0.7, emissive: amber, emissiveIntensity: 0.12,
      });
      m.name = 'metal';
      return m;
    })()
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  // Center on origin (spherical)
  const box = new THREE.Box3(), v = new THREE.Vector3();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= c.y; o.position.z -= c.z; });
  return g;
}
