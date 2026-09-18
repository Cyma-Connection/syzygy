/**
 * Procedural world objects for ORBIT SNAP — instantly distinct silhouettes.
 * Style-lock: amber / cold / brass / obsidian / bone. No neon magenta.
 */
import * as THREE from 'three';

const AMBER = 0xe8a04a;
const COLD = 0x6b8cff;
const BRASS = 0xb08d57;
const BRASS_DK = 0x7a5c38;
const OBSIDIAN = 0x1a1a1e;
const BONE = 0xe6dcc8;
const EMBER = 0x8b3a1a;
const BAD_GLOW = 0xff6a4a;

function mat(color, { emissive = 0x000000, ei = 0, metal = 0.4, rough = 0.55 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: ei,
    metalness: metal,
    roughness: rough,
  });
}

/** Brass/bone beacon so ASSET relics read at orbit distance. */
export function createRelicMark(scale = 1) {
  const g = new THREE.Group();
  g.name = 'relicMark';
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.6 * scale, 0.18 * scale, 8, 36),
    mat(BRASS, { emissive: AMBER, ei: 0.55, metal: 0.65, rough: 0.35 })
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(4.0 * scale, 4.7 * scale, 40),
    new THREE.MeshBasicMaterial({
      color: BONE,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring2.rotation.x = Math.PI / 2.1;
  g.add(ring2);
  // four bone ticks — instrument silhouette
  for (let i = 0; i < 4; i++) {
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.28 * scale, 1.4 * scale, 0.28 * scale),
      mat(BONE, { emissive: BONE, ei: 0.35, metal: 0.2, rough: 0.5 })
    );
    const a = (i / 4) * Math.PI * 2;
    tick.position.set(Math.cos(a) * 3.6 * scale, 0, Math.sin(a) * 3.6 * scale);
    g.add(tick);
  }
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(2.2 * scale, 12, 10),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(halo);
  return g;
}

/** Banded planet — fat amber ring + stripe body (never a star/debris). */
export function createPlanet(scale = 1) {
  const g = new THREE.Group();
  g.name = 'planet';
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(4.6 * scale, 28, 20),
    mat(BRASS_DK, { emissive: BRASS, ei: 0.22, metal: 0.4, rough: 0.6 })
  );
  g.add(body);
  for (let i = 0; i < 5; i++) {
    const y = (-2.8 + i * 1.4) * scale;
    const latR = Math.max(1.2, 4.55 * scale * Math.cos(y / (4.6 * scale)));
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(latR, 0.28 * scale, 6, 36),
      mat(i % 2 ? BONE : AMBER, { emissive: i % 2 ? BONE : AMBER, ei: 0.2, metal: 0.45, rough: 0.4 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = y * 0.4;
    g.add(band);
  }
  // Wide flat ring — primary planet silhouette cue
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6.0 * scale, 8.4 * scale, 56),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2.35;
  g.add(ring);
  const ringInner = new THREE.Mesh(
    new THREE.TorusGeometry(7.1 * scale, 0.12 * scale, 6, 40),
    mat(BRASS, { emissive: AMBER, ei: 0.45, metal: 0.6, rough: 0.35 })
  );
  ringInner.rotation.x = Math.PI / 2.35;
  g.add(ringInner);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(5.1 * scale, 16, 12),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(glow);
  return g;
}

/** Spiky cold star — cross + long spikes, ice light (never a sphere planet). */
export function createStar(scale = 1) {
  const g = new THREE.Group();
  g.name = 'star';
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.5 * scale, 0),
    mat(COLD, { emissive: COLD, ei: 1.15, metal: 0.15, rough: 0.25 })
  );
  g.add(core);
  const spikeGeo = new THREE.ConeGeometry(0.38 * scale, 7.2 * scale, 5);
  const spikeMat = mat(0xb8c8ff, { emissive: COLD, ei: 0.85, metal: 0.12, rough: 0.3 });
  for (let i = 0; i < 8; i++) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    const a = (i / 8) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15);
    spike.lookAt(Math.cos(a) * 20, 0, Math.sin(a) * 20);
    spike.rotateX(Math.PI / 2);
    g.add(spike);
  }
  for (const sign of [-1, 1]) {
    const v = new THREE.Mesh(spikeGeo, spikeMat);
    v.position.y = sign * 1.4 * scale;
    v.rotation.x = sign > 0 ? 0 : Math.PI;
    g.add(v);
  }
  const beamMat = new THREE.MeshBasicMaterial({
    color: COLD,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22 * scale, 0.22 * scale, 16 * scale), beamMat);
    beam.rotation.y = (i / 4) * Math.PI * 2;
    g.add(beam);
  }
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(3.6 * scale, 12, 10),
    new THREE.MeshBasicMaterial({
      color: COLD,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(halo);
  return g;
}

/** Jagged dangerous debris — ember shards + warning octa (never soft planet). */
export function createDebris(scale = 1) {
  const g = new THREE.Group();
  g.name = 'debris';
  const colors = [EMBER, BRASS_DK, BONE, OBSIDIAN, BAD_GLOW];
  for (let i = 0; i < 9; i++) {
    const jagged = new THREE.Mesh(
      new THREE.TetrahedronGeometry(1.25 * scale * (0.75 + Math.random() * 0.9), 0),
      mat(colors[i % colors.length], {
        metal: 0.55,
        rough: 0.72,
        emissive: i % 2 === 0 ? EMBER : BAD_GLOW,
        ei: i % 2 === 0 ? 0.45 : 0.3,
      })
    );
    const a = (i / 9) * Math.PI * 2;
    const r = 1.0 * scale + Math.random() * 2.6 * scale;
    jagged.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 3.0 * scale, Math.sin(a) * r);
    jagged.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    g.add(jagged);
  }
  // Angular danger silhouette (not a soft glow ball)
  const warn = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.35 * scale, 0),
    new THREE.MeshBasicMaterial({
      color: BAD_GLOW,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(warn);
  const spike = new THREE.Mesh(
    new THREE.ConeGeometry(0.55 * scale, 3.8 * scale, 4),
    mat(EMBER, { emissive: BAD_GLOW, ei: 0.6, metal: 0.4, rough: 0.55 })
  );
  spike.rotation.z = Math.PI / 2;
  g.add(spike);
  return g;
}

/** Small green/teal repair kit toolbox — safe to SNAP (collect, no damage). */
export function createKit(scale = 1) {
  const g = new THREE.Group();
  g.name = 'kit';
  const KIT_TEAL = 0x3a9e8a;
  const KIT_LT = 0x5ec4a8;
  const KIT_DK = 0x1e5a4a;
  // Toolbox body
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(2.4 * scale, 1.55 * scale, 1.7 * scale),
    mat(KIT_TEAL, { metal: 0.45, rough: 0.42, emissive: KIT_DK, ei: 0.35 })
  );
  g.add(box);
  // Lid ridge
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(2.55 * scale, 0.35 * scale, 1.85 * scale),
    mat(KIT_LT, { metal: 0.5, rough: 0.38, emissive: KIT_TEAL, ei: 0.45 })
  );
  lid.position.y = 0.95 * scale;
  g.add(lid);
  // Handle
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.55 * scale, 0.12 * scale, 6, 14, Math.PI),
    mat(BONE, { metal: 0.55, rough: 0.4, emissive: KIT_LT, ei: 0.25 })
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.y = 1.35 * scale;
  g.add(handle);
  // Cross / plus mark (heal cue)
  const barH = new THREE.Mesh(
    new THREE.BoxGeometry(1.1 * scale, 0.22 * scale, 0.18 * scale),
    new THREE.MeshBasicMaterial({
      color: KIT_LT,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  barH.position.set(0, 0.15 * scale, 0.92 * scale);
  g.add(barH);
  const barV = barH.clone();
  barV.scale.set(0.22 / 1.1, 1.1 / 0.22, 1);
  g.add(barV);
  // Soft glow halo
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.9 * scale, 12, 10),
    new THREE.MeshBasicMaterial({
      color: KIT_TEAL,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(halo);
  return g;
}

export const OBJECT_COLORS = { AMBER, COLD, BRASS, BRASS_DK, OBSIDIAN, BONE, EMBER, TEAL: 0x3a9e8a };

const TEAL = 0x3a9e8a;
const TEAL_LT = 0x5ec4a8;
const GREEN_ORB = 0x4aad6e;
const AMBER_DK = 0xc47a2e;
const COLD_DK = 0x3a5ab8;

/** Palette family by bonus tier (amber / cold / teal — no magenta). */
function tierPalette(tier = 1) {
  const t = Math.max(1, tier | 0);
  const variants = [
    { body: TEAL, emissive: 0x1a4a3a, bandA: GREEN_ORB, bandB: TEAL_LT, fog: 0x061418, fogCol: 0x0a2a28, skyA: 0xc49a4a, skyC: TEAL, orb: TEAL_LT, orbEm: GREEN_ORB },
    { body: AMBER_DK, emissive: 0x5a3010, bandA: BRASS, bandB: AMBER, fog: 0x120e08, fogCol: 0x2a1a0a, skyA: AMBER, skyC: 0x8a9ecc, orb: AMBER, orbEm: BRASS },
    { body: COLD_DK, emissive: 0x152848, bandA: COLD, bandB: 0xa8b8ff, fog: 0x060a14, fogCol: 0x0a1830, skyA: 0xb08d57, skyC: COLD, orb: COLD, orbEm: 0x8aa0ff },
    { body: 0x2a7a6a, emissive: 0x0e3a30, bandA: TEAL_LT, bandB: BONE, fog: 0x081210, fogCol: 0x123028, skyA: AMBER, skyC: TEAL_LT, orb: TEAL_LT, orbEm: AMBER },
  ];
  return variants[(t - 1) % variants.length];
}

export function getBonusTierPalette(tier = 1) {
  return tierPalette(tier);
}

/** Amber+cold singularity ring — portal to micro-bonus (no textures). */
export function createPortal(scale = 1) {
  const g = new THREE.Group();
  g.name = 'portal';
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.85 * scale, 18, 14),
    new THREE.MeshStandardMaterial({
      color: TEAL,
      emissive: TEAL_LT,
      emissiveIntensity: 1.05,
      metalness: 0.35,
      roughness: 0.3,
    })
  );
  g.add(core);
  g.userData.portalCore = core;
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(1.2 * scale, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0x050a10,
      transparent: true,
      opacity: 0.9,
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
  const r1 = new THREE.Mesh(new THREE.RingGeometry(2.4 * scale, 3.2 * scale, 52), ringMat(AMBER, 0.8));
  r1.rotation.x = Math.PI / 2.1;
  g.add(r1);
  const r2 = new THREE.Mesh(new THREE.RingGeometry(3.4 * scale, 4.1 * scale, 52), ringMat(COLD, 0.55));
  r2.rotation.x = Math.PI / 2.35;
  r2.rotation.z = 0.4;
  g.add(r2);
  const r3 = new THREE.Mesh(new THREE.TorusGeometry(2.9 * scale, 0.12 * scale, 8, 44), ringMat(TEAL_LT, 0.85));
  r3.rotation.y = 0.45;
  g.add(r3);
  // Diamond tips — portal ≠ planet ring
  for (let i = 0; i < 4; i++) {
    const tip = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55 * scale, 0),
      mat(AMBER, { emissive: AMBER, ei: 0.7, metal: 0.3, rough: 0.35 })
    );
    const a = (i / 4) * Math.PI * 2 + 0.2;
    tip.position.set(Math.cos(a) * 3.6 * scale, 0, Math.sin(a) * 3.6 * scale);
    g.add(tip);
  }
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(4.4 * scale, 14, 12),
    new THREE.MeshBasicMaterial({
      color: TEAL,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(halo);
  g.userData.portalHalo = halo;
  g.userData.portalRings = [r1, r2, r3];
  // Slightly larger default so it reads against wave clutter
  g.scale.setScalar(1.15);
  return g;
}

/** Geometric centrepiece for bonus stage — palette/rings shift by tier. */
export function createBonusPlanet(scale = 1, tier = 1) {
  const pal = tierPalette(tier);
  const g = new THREE.Group();
  g.name = 'bonusPlanet';
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(14 * scale, 28, 20),
    new THREE.MeshStandardMaterial({
      color: pal.body,
      emissive: pal.emissive,
      emissiveIntensity: 0.4,
      metalness: 0.25,
      roughness: 0.55,
    })
  );
  g.add(body);
  for (let i = 0; i < 5; i++) {
    const y = (-8 + i * 4) * scale;
    const latR = Math.max(2, 14 * scale * Math.cos(y / (14 * scale)));
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(latR, 0.38 * scale, 6, 40),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? pal.bandA : pal.bandB,
        emissive: i % 2 ? pal.bandA : pal.body,
        emissiveIntensity: 0.28,
        metalness: 0.4,
        roughness: 0.45,
      })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = y * 0.45;
    g.add(band);
  }
  // Tier > 1: extra equatorial hoop for readable variant
  if (tier >= 2) {
    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(16.5 * scale, 0.45 * scale, 8, 48),
      new THREE.MeshStandardMaterial({
        color: pal.bandB,
        emissive: pal.bandB,
        emissiveIntensity: 0.35,
        metalness: 0.5,
        roughness: 0.4,
      })
    );
    hoop.rotation.x = Math.PI / 2.6;
    g.add(hoop);
  }
  if (tier >= 3) {
    const hoop2 = new THREE.Mesh(
      new THREE.TorusGeometry(17.8 * scale, 0.28 * scale, 6, 40),
      new THREE.MeshBasicMaterial({
        color: pal.orb,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    hoop2.rotation.x = Math.PI / 2.2;
    hoop2.rotation.z = 0.5;
    g.add(hoop2);
  }
  const poles = [-1, 1].map((s) => {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(3.2 * scale, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xc8d8e8,
        emissive: COLD,
        emissiveIntensity: 0.3,
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
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2.3;
  g.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(24 * scale, 26.5 * scale, 64),
    new THREE.MeshBasicMaterial({
      color: pal.skyC,
      transparent: true,
      opacity: 0.32,
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
      color: pal.bandB,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(glow);
  return g;
}

/** Bright bonus snap target orb — tint by tier. */
export function createBonusOrb(scale = 1, tier = 1) {
  const pal = tierPalette(tier);
  const g = new THREE.Group();
  g.name = 'bonusOrb';
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.9 * scale, 16, 12),
    new THREE.MeshStandardMaterial({
      color: pal.orb,
      emissive: pal.orbEm,
      emissiveIntensity: 1.05,
      metalness: 0.2,
      roughness: 0.28,
    })
  );
  g.add(core);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(2.55 * scale, 14, 10),
    new THREE.MeshBasicMaterial({
      color: pal.bandB,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(shell);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.75 * scale, 0.14 * scale, 6, 28),
    new THREE.MeshBasicMaterial({
      color: pal.skyC,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  if (tier >= 2) {
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.15 * scale, 0.08 * scale, 6, 24),
      new THREE.MeshBasicMaterial({
        color: AMBER,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring2.rotation.y = Math.PI / 3;
    g.add(ring2);
  }
  return g;
}

export { TEAL, TEAL_LT, GREEN_ORB };
