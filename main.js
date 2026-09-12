/**
 * SYZYGY — scaffold stub for 404 Game Jam
 * Orbit drag + telemetry; full syzygy loop deferred (see NOTES.md).
 */
import * as THREE from 'three';
import { ASSET } from './assetlib.js';

const AMBER = 0xe8a04a;
const COLD = 0x6b8cff;
const VOID = 0x0b0b10;

const ORBIT_R = 70;
const STATE = { BOOT: 'BOOT', ORBIT: 'ORBIT', COLLAPSE: 'COLLAPSE', WIN: 'WIN' };

let state = STATE.BOOT;
let renderer, scene, camera, craft, sun;
let orbitTheta = 0.35;
let orbitRadius = ORBIT_R;
let orbitInclination = 0.12;
let dragging = false;
let lastPtr = null;
let score = 0;
let over = false;
let speed = 0;
let lastT = performance.now();
let fps = 60;
let started = false;
let ghost;
let filament;

const keys = { left: false, right: false };

function placeOnOrbit(obj, theta, radius, incl) {
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  const y = Math.sin(theta * 2.0) * radius * incl * 0.35;
  obj.position.set(x, y, z);
  obj.lookAt(0, 0, 0);
}

function craftPos() {
  return craft ? craft.position.clone() : new THREE.Vector3(ORBIT_R, 0, 0);
}

function setHud(msg) {
  const el = document.getElementById('hint');
  if (el) el.textContent = msg;
}

async function boot() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.FogExp2(VOID, 0.0022);

  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 800);
  camera.position.set(0, 45, 130);

  const hemi = new THREE.HemisphereLight(COLD, AMBER, 0.55);
  scene.add(hemi);
  const key = new THREE.PointLight(AMBER, 2.2, 400);
  key.position.set(0, 10, 0);
  scene.add(key);
  const rim = new THREE.DirectionalLight(COLD, 0.65);
  rim.position.set(40, 60, -30);
  scene.add(rim);

  // Ecliptic dust plate (keeps volume above ecliptic readable later)
  const ecliptic = new THREE.Mesh(
    new THREE.RingGeometry(25, 140, 64),
    new THREE.MeshBasicMaterial({
      color: 0x1a2233,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ecliptic.rotation.x = -Math.PI / 2;
  scene.add(ecliptic);

  const dust = new THREE.Points(
    (() => {
      const n = 400;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * 110;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = (Math.random() - 0.3) * 40;
        pos[i * 3 + 2] = Math.sin(a) * r;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return g;
    })(),
    new THREE.PointsMaterial({ color: COLD, size: 0.6, transparent: true, opacity: 0.55, depth: false })
  );
  scene.add(dust);

  sun = await ASSET('./assets/dying_sun.js', { height: 40 });
  sun.position.set(0, 0, 0);
  scene.add(sun);

  craft = await ASSET('./assets/cartographer_craft.js', { height: 0.7 });
  placeOnOrbit(craft, orbitTheta, orbitRadius, orbitInclination);
  scene.add(craft);

  // Placeholder relics (instances of stubs) on broken orbits
  const relicFiles = [
    ['./assets/hollow_moon.js', 6],
    ['./assets/broken_ring.js', 1.2],
    ['./assets/fossil_comet.js', 2.5],
    ['./assets/neutron_heart.js', 2.2],
    ['./assets/gravity_bell.js', 6],
    ['./assets/observatory_oculus.js', 5],
  ];
  for (let i = 0; i < 12; i++) {
    const [file, h] = relicFiles[i % relicFiles.length];
    const relic = await ASSET(file, { height: h });
    const th = (i / 12) * Math.PI * 2 + 0.4;
    const r = 45 + (i % 4) * 18;
    const incl = 0.08 + (i % 3) * 0.06;
    placeOnOrbit(relic, th, r, incl);
    relic.userData.orbit = { th, r, incl, ω: 0.05 + (i % 5) * 0.01 };
    scene.add(relic);
  }

  // Amber ghost hint toward first relic direction
  ghost = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.35, depth: false })
  );
  placeOnOrbit(ghost, orbitTheta + 0.55, orbitRadius, orbitInclination);
  scene.add(ghost);

  const filamentGeo = new THREE.BufferGeometry().setFromPoints([
    craft.position.clone(),
    ghost.position.clone(),
  ]);
  filament = new THREE.Line(
    filamentGeo,
    new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.55 })
  );
  scene.add(filament);

  window.addEventListener('resize', onResize);
  bindInput(canvas);

  window.__READY__ = true;
  window.__START__ = start;
  window.__GAME__ = {
    pos: [craft.position.x, craft.position.z],
    fps: 60,
    speed: 0,
    score: 0,
    over: false,
    draws: 0,
    tris: 0,
    state,
  };

  document.getElementById('load')?.classList.add('gone');
  setHud('Align the relics. Drag to orbit.');
  requestAnimationFrame(frame);
}

function start() {
  if (started) return;
  started = true;
  state = STATE.ORBIT;
  over = false;
  document.getElementById('start')?.classList.remove('on');
  document.getElementById('hud')?.classList.add('on');
  setHud('Drag to push your craft · first metres count');
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

function bindInput(canvas) {
  const down = (e) => {
    if (!started) return;
    dragging = true;
    lastPtr = pointer(e);
    e.preventDefault();
  };
  const move = (e) => {
    if (!dragging || !started || over) return;
    const p = pointer(e);
    const dx = p.x - lastPtr.x;
    const dy = p.y - lastPtr.y;
    lastPtr = p;
    // Tangential push + light radial
    orbitTheta += dx * 0.0045;
    orbitRadius = THREE.MathUtils.clamp(orbitRadius - dy * 0.08, 35, 125);
    orbitInclination = THREE.MathUtils.clamp(orbitInclination + dx * 0.00015, 0.02, 0.35);
    e.preventDefault();
  };
  const up = () => {
    dragging = false;
    lastPtr = null;
  };

  canvas.addEventListener('pointerdown', down, { passive: false });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  });

  document.getElementById('btnStart')?.addEventListener('click', (e) => {
    e.preventDefault();
    start();
  });
  document.getElementById('btnStart')?.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      start();
    },
    { passive: false }
  );
}

function pointer(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function frame(now) {
  const dt = Math.max(0.001, (now - lastT) / 1000);
  // FPS from REAL elapsed time — never clamp the denominator
  fps = 1 / ((now - lastT) / 1000 || 0.016);
  lastT = now;

  if (started && !over) {
    if (keys.left) orbitTheta -= 0.9 * dt;
    if (keys.right) orbitTheta += 0.9 * dt;
    // Slow natural drift
    orbitTheta += 0.08 * dt;
  }

  if (craft) {
    const prev = craft.position.clone();
    placeOnOrbit(craft, orbitTheta, orbitRadius, orbitInclination);
    speed = prev.distanceTo(craft.position) / dt;
  }

  // Drift placeholder relics
  scene.traverse((o) => {
    if (!o.userData.orbit) return;
    const orb = o.userData.orbit;
    orb.th += orb.ω * dt * 0.15;
    placeOnOrbit(o, orb.th, orb.r, orb.incl);
  });

  if (ghost && craft) {
    placeOnOrbit(ghost, orbitTheta + 0.55, orbitRadius, orbitInclination);
    filament.geometry.setFromPoints([craft.position.clone(), ghost.position.clone()]);
    filament.geometry.attributes.position.needsUpdate = true;
  }

  // Camera: soft chase along geodesic feel
  if (craft) {
    const target = craft.position.clone();
    const camGoal = target.clone().add(new THREE.Vector3(0, 28, 55));
    // Stay outside the sun
    if (camGoal.length() < 55) camGoal.setLength(55);
    camera.position.lerp(camGoal, 1 - Math.exp(-2.2 * dt));
    camera.lookAt(target.x * 0.35, target.y * 0.35, target.z * 0.35);
  }

  if (sun && started) {
    sun.rotation.y += dt * 0.05;
  }

  renderer.render(scene, camera);

  const info = renderer.info.render;
  window.__GAME__ = {
    pos: craft ? [craft.position.x, craft.position.z] : [0, 0],
    fps,
    speed,
    score,
    over,
    draws: info.calls,
    tris: info.triangles,
    state,
  };

  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  const msg = document.getElementById('loadmsg');
  if (msg) msg.textContent = String(err.message || err);
});
