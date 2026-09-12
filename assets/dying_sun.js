export default function (THREE) {
  const g = new THREE.Group();
  const amber = 0xe8a04a, ember = 0xc45a1a, brass = 0xb08d57, bone = 0xe6dcc8, coreHot = 0xffc078;

  // Spherical star body — reads as a sun, not a gadget
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(16, 32, 24),
    (() => {
      const m = new THREE.MeshStandardMaterial({
        color: amber, roughness: 0.55, metalness: 0.15,
        emissive: amber, emissiveIntensity: 0.7,
      });
      m.name = 'metal';
      return m;
    })()
  );
  g.add(core);

  // Inner hot core (slightly smaller, brighter)
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(11, 20, 16),
    (() => {
      const m = new THREE.MeshStandardMaterial({
        color: coreHot, roughness: 0.35, metalness: 0.05,
        emissive: coreHot, emissiveIntensity: 0.95,
      });
      m.name = 'metal';
      return m;
    })()
  );
  g.add(inner);

  // Subtle surface scars (flush, not tall spikes)
  for (let i = 0; i < 6; i++) {
    const scar = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 9 + (i % 3), 0.35),
      (() => {
        const m = new THREE.MeshStandardMaterial({
          color: ember, roughness: 0.8, emissive: ember, emissiveIntensity: 0.55,
        });
        m.name = 'metal';
        return m;
      })()
    );
    const a = (i / 6) * Math.PI * 2;
    const elev = (i % 3) * 0.35 - 0.35;
    scar.position.set(Math.cos(a) * 15.6, Math.sin(elev) * 8, Math.sin(a) * 15.6);
    scar.lookAt(0, 0, 0);
    g.add(scar);
  }

  // Thin equatorial brass rings (corona suggestion, not a hat)
  for (const [r, tub] of [[17.8, 0.22], [19.6, 0.16]]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, tub, 8, 64),
      (() => {
        const m = new THREE.MeshStandardMaterial({
          color: brass, roughness: 0.4, metalness: 0.65, emissive: amber, emissiveIntensity: 0.15,
        });
        m.name = 'metal';
        return m;
      })()
    );
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = (r - 18) * 0.04;
    g.add(ring);
  }

  // Tiny bone flecks on surface (dying star ash) — low profile
  for (let i = 0; i < 8; i++) {
    const fleck = new THREE.Mesh(
      new THREE.SphereGeometry(0.55 + (i % 3) * 0.15, 6, 5),
      (() => {
        const m = new THREE.MeshStandardMaterial({
          color: bone, roughness: 0.9, metalness: 0.1, emissive: ember, emissiveIntensity: 0.08,
        });
        m.name = 'metal';
        return m;
      })()
    );
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const y = ((i % 5) - 2) * 2.4;
    const rr = Math.sqrt(Math.max(0.1, 16 * 16 - y * y));
    fleck.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    g.add(fleck);
  }

  // Center on origin (keep spherical silhouette — do NOT floor-align to min.y)
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
