export default function (THREE) {
  const g = new THREE.Group();
  const brass = 0xb08d57, bone = 0xe6dcc8, obs = 0x1a1a1e;
  const pts = [
    new THREE.Vector2(0.15, 0),
    new THREE.Vector2(1.7, 0.25),
    new THREE.Vector2(2.0, 1.4),
    new THREE.Vector2(1.5, 3.4),
    new THREE.Vector2(0.4, 5.1),
    new THREE.Vector2(0.22, 5.5),
  ];
  const bell = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 24),
    (() => { const m = new THREE.MeshStandardMaterial({{ color: brass, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }}); m.name = "metal"; return m; })()
  );
  g.add(bell);
  const axis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 5.7, 8),
    (() => { const m = new THREE.MeshStandardMaterial({{ color: bone, roughness: 0.45, metalness: 0.45 }}); m.name = "metal"; return m; })()
  );
  axis.position.y = 2.85;
  g.add(axis);
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.08, 8, 32),
    (() => { const m = new THREE.MeshStandardMaterial({{ color: bone, roughness: 0.4, metalness: 0.5 }}); m.name = "metal"; return m; })()
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.2;
  g.add(lip);
  const clapper = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 10),
    (() => { const m = new THREE.MeshStandardMaterial({{ color: obs, roughness: 0.5, metalness: 0.3 }}); m.name = "stone"; return m; })()
  );
  clapper.position.y = 1.2;
  g.add(clapper);

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
