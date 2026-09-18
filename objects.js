/**
 * Procedural world objects for ORBIT SNAP — instantly distinct silhouettes.
 * Style-lock: amber / cold / brass / obsidian / bone. No neon.
 */
import * as THREE from 'three';

const AMBER = 0xe8a04a;
const COLD = 0x6b8cff;
const BRASS = 0xb08d57;
const BRASS_DK = 0x7a5c38;
const OBSIDIAN = 0x1a1a1e;
const BONE = 0xe6dcc8;
const EMBER = 0x8b3a1a;

function mat(color, { emissive = 0x000000, ei = 0, metal = 0.4, rough = 0.55 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: ei,
    metalness: metal,
    roughness: rough,
  });
}

/** Banded planet — readable sphere with rings / stripes */
export function createPlanet(scale = 1) {
  const g = new THREE.Group();
  g.name = 'planet';
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(4.2 * scale, 24, 18),
    mat(BRASS_DK, { metal: 0.35, rough: 0.65 })
  );
  g.add(body);
  // latitude bands
  for (let i = 0; i < 4; i++) {
    const y = (-2.4 + i * 1.5) * scale;
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(4.15 * scale * Math.cos(y / (4.2 * scale)), 0.22 * scale, 6, 32),
      mat(i % 2 ? BONE : BRASS, { metal: 0.5, rough: 0.4 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = y * 0.35;
    g.add(band);
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(5.5 * scale, 7.2 * scale, 48),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2.4;
  g.add(ring);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(4.6 * scale, 16, 12),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(glow);
  return g;
}

/** Spiky / cross cold star — ice light, not a sphere */
export function createStar(scale = 1) {
  const g = new THREE.Group();
  g.name = 'star';
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.2 * scale, 0),
    mat(COLD, { emissive: COLD, ei: 0.85, metal: 0.2, rough: 0.3 })
  );
  g.add(core);
  const spikeGeo = new THREE.ConeGeometry(0.35 * scale, 5.5 * scale, 5);
  const spikeMat = mat(0xa8b8ff, { emissive: COLD, ei: 0.6, metal: 0.15, rough: 0.35 });
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    const a = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
    spike.rotation.z = Math.PI / 2;
    spike.rotation.y = a;
    // point outward in equatorial plane
    spike.lookAt(Math.cos(a) * 20, 0, Math.sin(a) * 20);
    spike.rotateX(Math.PI / 2);
    g.add(spike);
  }
  // vertical spikes
  for (const sign of [-1, 1]) {
    const v = new THREE.Mesh(spikeGeo, spikeMat);
    v.position.y = sign * 1.2 * scale;
    v.rotation.x = sign > 0 ? 0 : Math.PI;
    g.add(v);
  }
  // cross beams (thin boxes)
  const beamMat = new THREE.MeshBasicMaterial({
    color: COLD,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 14 * scale), beamMat);
    beam.rotation.y = (i / 4) * Math.PI * 2;
    g.add(beam);
  }
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(3.2 * scale, 12, 10),
    new THREE.MeshBasicMaterial({
      color: COLD,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(halo);
  return g;
}

/** Jagged dangerous debris — amber-dark / bone shards */
export function createDebris(scale = 1) {
  const g = new THREE.Group();
  g.name = 'debris';
  const colors = [EMBER, BRASS_DK, BONE, OBSIDIAN, AMBER];
  for (let i = 0; i < 7; i++) {
    const jagged = new THREE.Mesh(
      new THREE.TetrahedronGeometry(1.1 * scale * (0.7 + Math.random() * 0.8), 0),
      mat(colors[i % colors.length], { metal: 0.55, rough: 0.7, emissive: i % 3 === 0 ? EMBER : 0, ei: i % 3 === 0 ? 0.25 : 0 })
    );
    const a = (i / 7) * Math.PI * 2;
    const r = 1.2 * scale + Math.random() * 2.2 * scale;
    jagged.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 2.5 * scale, Math.sin(a) * r);
    jagged.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    g.add(jagged);
  }
  // warning glint
  const warn = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9 * scale, 0),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(warn);
  return g;
}

export const OBJECT_COLORS = { AMBER, COLD, BRASS, BRASS_DK, OBSIDIAN, BONE, EMBER, TEAL: 0x3a9e8a };

const TEAL = 0x3a9e8a;
const TEAL_LT = 0x5ec4a8;
const GREEN_ORB = 0x4aad6e;

/** Amber+cold singularity ring — portal to micro-bonus (no textures). */
export function createPortal(scale = 1) {
  const g = new THREE.Group();
  g.name = 'portal';
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.6 * scale, 16, 12),
    new THREE.MeshStandardMaterial({
      color: TEAL,
      emissive: TEAL_LT,
      emissiveIntensity: 0.75,
      metalness: 0.35,
      roughness: 0.35,
    })
  );
  g.add(core);
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(1.15 * scale, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0x0a1218,
      transparent: true,
      opacity: 0.85,
    })
  );
  g.add(inner);
  const ringMat = (color, opacity) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  const r1 = new THREE.Mesh(new THREE.RingGeometry(2.1 * scale, 2.7 * scale, 48), ringMat(AMBER, 0.65));
  r1.rotation.x = Math.PI / 2.15;
  g.add(r1);
  const r2 = new THREE.Mesh(new THREE.RingGeometry(2.9 * scale, 3.45 * scale, 48), ringMat(COLD, 0.45));
  r2.rotation.x = Math.PI / 2.4;
  r2.rotation.z = 0.35;
  g.add(r2);
  const r3 = new THREE.Mesh(new THREE.TorusGeometry(2.5 * scale, 0.08 * scale, 8, 40), ringMat(TEAL_LT, 0.7));
  r3.rotation.y = 0.4;
  g.add(r3);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(3.8 * scale, 14, 12),
    new THREE.MeshBasicMaterial({
      color: TEAL,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(halo);
  g.userData.portalRings = [r1, r2, r3];
  return g;
}

/** Geometric Earth-like centrepiece for bonus stage (spheres + rings only). */
export function createBonusPlanet(scale = 1) {
  const g = new THREE.Group();
  g.name = 'bonusPlanet';
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(14 * scale, 28, 20),
    new THREE.MeshStandardMaterial({
      color: TEAL,
      emissive: 0x1a4a3a,
      emissiveIntensity: 0.35,
      metalness: 0.25,
      roughness: 0.55,
    })
  );
  g.add(body);
  for (let i = 0; i < 5; i++) {
    const y = (-8 + i * 4) * scale;
    const latR = Math.max(2, 14 * scale * Math.cos(y / (14 * scale)));
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(latR, 0.35 * scale, 6, 40),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? GREEN_ORB : TEAL_LT,
        emissive: i % 2 ? GREEN_ORB : TEAL,
        emissiveIntensity: 0.2,
        metalness: 0.4,
        roughness: 0.45,
      })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = y * 0.45;
    g.add(band);
  }
  const poles = [-1, 1].map((s) => {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(3.2 * scale, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xc8d8e8,
        emissive: COLD,
        emissiveIntensity: 0.25,
        metalness: 0.2,
        roughness: 0.6,
      })
    );
    cap.position.y = s * 12.5 * scale;
    cap.scale.set(1, 0.45, 1);
    g.add(cap);
    return cap;
  });
  void poles;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(18 * scale, 23 * scale, 64),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2.3;
  g.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(24 * scale, 26.5 * scale, 64),
    new THREE.MeshBasicMaterial({
      color: COLD,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  ring2.rotation.x = Math.PI / 2.55;
  g.add(ring2);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(15.5 * scale, 16, 12),
    new THREE.MeshBasicMaterial({
      color: TEAL_LT,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(glow);
  return g;
}

/** Bright bonus snap target orb. */
export function createBonusOrb(scale = 1) {
  const g = new THREE.Group();
  g.name = 'bonusOrb';
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.8 * scale, 16, 12),
    new THREE.MeshStandardMaterial({
      color: TEAL_LT,
      emissive: GREEN_ORB,
      emissiveIntensity: 0.95,
      metalness: 0.2,
      roughness: 0.3,
    })
  );
  g.add(core);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(2.4 * scale, 14, 10),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(shell);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6 * scale, 0.12 * scale, 6, 28),
    new THREE.MeshBasicMaterial({
      color: COLD,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

export { TEAL, TEAL_LT, GREEN_ORB };
