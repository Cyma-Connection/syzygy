/**
 * SYZYGY — 404 Game Jam
 * Orbit · tether · syzygy locks · space bed · coach
 */
import * as THREE from 'three';
import { ASSET } from './assetlib.js';
import { createSpaceAudio } from './audio.js';
import { createSpaceBackdrop, createSunGlow } from './spacefx.js';
import { createVfx } from './vfx.js';

const AMBER = 0xe8a04a;
const COLD = 0x6b8cff;
const VOID = 0x05060c;

const MATCH_COS = Math.cos((4 * Math.PI) / 180);
const GAME_SECS = 6 * 60;
const WIN_LOCKS = 5;
const TRAVEL_SECS = 2;
const HOLD_SUN = 0.6;

const STATE = {
  BOOT: 'BOOT',
  ORBIT: 'ORBIT',
  TETHER: 'TETHER',
  LOCK: 'LOCK',
  COLLAPSE: 'COLLAPSE',
  WIN: 'WIN',
};

const SPECTRAL = [0xff3355, 0xff8a3a, 0xffe066, 0x5ad67a, 0x6b8cff];

const COACH = [
  'Drag on the void to push your craft along its orbit.',
  'Tap the amber‑marked relic to fire a filament.',
  'Tap its twin (the other frozen relic) to tether both.',
  'Drag until the two filaments lock through the sun (≤ 4°).',
  'Light 5 stars before the sun dies. Hold the sun after 2 locks for a ghost hint.',
];

let state = STATE.BOOT;
let renderer, scene, camera, craft, sun, sunLight;
let raycaster, pointerNdc;
let orbitTheta = 0.2;
let orbitRadius = 72;
let orbitInclination = 0.1;
let dragging = false;
let dragMoved = false;
let lastPtr = null;
let ptrDownAt = 0;
let score = 0;
let over = false;
let speed = 0;
let lastT = performance.now();
let fps = 60;
let started = false;
let playElapsed = 0;
let relics = [];
let tethered = [];
let filaments = [];
let ghost;
let stars = [];
let tunnels = [];
let travel = null;
let holdSunT = 0;
let holdingSun = false;
let spectralSeq = [];
let secretFound = false;
let tutorialDone = false;
let sunScale = 1;
let coachStep = 0;
let movedOnce = false;
let spacefx = null;
let sunGlow = null;
let vfx = null;
let alignHeat = 0;
let audio = createSpaceAudio();
let clockT = 0;

const keys = { left: false, right: false };

function placeOnOrbit(obj, theta, radius, incl) {
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  const y = Math.sin(theta * 1.7) * radius * incl * 0.4;
  obj.position.set(x, y, z);
  obj.lookAt(0, 0, 0);
}

function setHud(msg) {
  const el = document.getElementById('hint');
  if (el) el.textContent = msg;
}

function setCoach(step) {
  coachStep = Math.max(coachStep, step);
  const stepEl = document.getElementById('coachStep');
  if (stepEl) stepEl.textContent = COACH[Math.min(coachStep, COACH.length - 1)];
  document.querySelectorAll('#coachList li').forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.toggle('done', s < coachStep);
    li.classList.toggle('on', s === coachStep);
  });
  const coach = document.getElementById('coach');
  if (coach && score >= WIN_LOCKS) coach.classList.add('hidden');
}

function setTimer(secLeft) {
  const el = document.getElementById('timer');
  if (!el) return;
  const m = Math.floor(Math.max(0, secLeft) / 60);
  const s = Math.floor(Math.max(0, secLeft) % 60);
  el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  el.classList.toggle('low', secLeft < 60);
}

function setStarsHud() {
  const el = document.getElementById('stars');
  if (el) el.textContent = `${score} / ${WIN_LOCKS}`;
}

function clearFilaments() {
  for (const f of filaments) scene.remove(f);
  filaments.length = 0;
}

function makeFilament(a, b, color = AMBER) {
  const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 })
  );
  scene.add(line);
  filaments.push(line);
  return line;
}

function refreshFilaments() {
  clearFilaments();
  if (!craft) return;
  for (const r of tethered) {
    makeFilament(craft.position, r.position, AMBER);
    makeFilament(new THREE.Vector3(0, 0, 0), r.position, COLD);
  }
  if (ghost && ghost.visible && tethered.length < 2) {
    makeFilament(craft.position, ghost.position, 0xc4893a);
  }
}

function unitFromSun(p) {
  const v = p.clone();
  if (v.lengthSq() < 1e-6) return new THREE.Vector3(1, 0, 0);
  return v.normalize();
}

function angleBetweenFromSun(a, b) {
  return unitFromSun(a).angleTo(unitFromSun(b));
}

function alignedPair(a, b) {
  return unitFromSun(a.position).dot(unitFromSun(b.position)) >= MATCH_COS;
}

function findAligningPair() {
  if (tethered.length < 2) return null;
  if (alignedPair(tethered[0], tethered[1])) return [tethered[0], tethered[1]];
  return null;
}

function bestNearAlign() {
  let best = null;
  let bestAng = Infinity;
  for (let i = 0; i < relics.length; i++) {
    for (let j = i + 1; j < relics.length; j++) {
      const a = relics[i];
      const b = relics[j];
      if (a.userData.lockedWith && a.userData.lockedWith === b) continue;
      const ang = angleBetweenFromSun(a.position, b.position);
      if (ang < bestAng) {
        bestAng = ang;
        best = [a, b];
      }
    }
  }
  return best;
}

function lightStar(color) {
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 10, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
  );
  const th = (score / WIN_LOCKS) * Math.PI * 1.4 - 0.4;
  const ph = 0.55 + score * 0.08;
  star.position.set(
    Math.sin(ph) * Math.cos(th) * 220,
    Math.cos(ph) * 220,
    Math.sin(ph) * Math.sin(th) * 220
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 10, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  star.add(halo);
  scene.add(star);
  stars.push(star);
}

function spawnTunnel(dir) {
  const len = 160;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 3.5, len, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: COLD,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  mesh.position.copy(dir.clone().multiplyScalar(len * 0.45));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  scene.add(mesh);
  tunnels.push(mesh);
  return mesh;
}

function beginTravel(dir) {
  const from = camera.position.clone();
  const to = dir.clone().multiplyScalar(95).add(new THREE.Vector3(0, 12, 0));
  travel = { t: 0, from, to, look: dir.clone().multiplyScalar(40) };
  state = STATE.LOCK;
}

function triggerSyzygy(a, b) {
  if (over || state === STATE.LOCK || state === STATE.WIN || state === STATE.COLLAPSE) return;

  const mid = a.position.clone().add(b.position).multiplyScalar(0.5);
  const dir = unitFromSun(mid);
  spawnTunnel(dir);
  lightStar(SPECTRAL[score % SPECTRAL.length]);
  audio.stingLock();
  if (vfx) {
    vfx.lockBurst(mid, SPECTRAL[(score) % SPECTRAL.length]);
    vfx.startWarp(dir);
  }
  const fx = document.getElementById('fx');
  if (fx) { fx.classList.remove('flash'); void fx.offsetWidth; fx.classList.add('flash'); }

  spectralSeq.push(a.userData.spectral);
  score += 1;
  setStarsHud();
  tutorialDone = true;
  setCoach(4);
  a.userData.lockedWith = b;
  b.userData.lockedWith = a;

  for (const r of [a, b]) {
    r.traverse((n) => {
      if (n.isMesh && n.material && n.material.emissive) {
        n.material.emissive = new THREE.Color(COLD);
        n.material.emissiveIntensity = 0.4;
      }
    });
  }

  tethered.length = 0;
  clearFilaments();
  if (ghost) ghost.visible = false;

  beginTravel(dir);
  setHud(score >= WIN_LOCKS ? 'Constellation complete' : `Syzygy ${score} · star ignited`);

  if (score >= WIN_LOCKS) travel.winAfter = true;

  if (!secretFound && spectralSeq.length >= 5) {
    const last5 = spectralSeq.slice(-5);
    if (last5.every((v, i) => v === i)) {
      secretFound = true;
      setHud('The true name returns: 404‑AURIGA');
    }
  }
}

function checkSyzygy() {
  if (state === STATE.LOCK || over || !started) return;
  const pair = findAligningPair();
  if (!pair) {
    if (tethered.length === 2) {
      setHud('Hold the line — drag until beams lock through the sun');
      setCoach(3);
    }
    return;
  }
  triggerSyzygy(pair[0], pair[1]);
}

function toggleTether(relic) {
  if (over || state === STATE.LOCK) return;
  const idx = tethered.indexOf(relic);
  if (idx >= 0) {
    tethered.splice(idx, 1);
    state = tethered.length ? STATE.TETHER : STATE.ORBIT;
    refreshFilaments();
    setHud(tethered.length ? 'One filament live · tap another relic' : 'Filament released');
    return;
  }
  if (tethered.length >= 2) tethered.shift();
  tethered.push(relic);
  state = STATE.TETHER;
  refreshFilaments();
  if (tethered.length === 1) {
    setHud('Filament locked · tap a second relic');
    setCoach(2);
  } else {
    setHud('Two filaments · drag to align through the sun');
    setCoach(3);
  }
  checkSyzygy();
}

function pickObject(clientX, clientY) {
  if (!camera || !raycaster) return null;
  pointerNdc.x = (clientX / innerWidth) * 2 - 1;
  pointerNdc.y = -(clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(relics, true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.isRelic) o = o.parent;
    if (o && o.userData.isRelic) return o;
  }
  if (sun) {
    const sunHits = raycaster.intersectObject(sun, true);
    if (sunHits.length) return sun;
  }
  return null;
}

async function boot() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.FogExp2(0x070914, 0.00135);

  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 1000);
  camera.position.set(0, 48, 135);

  raycaster = new THREE.Raycaster();
  pointerNdc = new THREE.Vector2();

  spacefx = createSpaceBackdrop(scene, { amber: AMBER, cold: COLD });

  scene.add(new THREE.HemisphereLight(COLD, AMBER, 0.45));
  sunLight = new THREE.PointLight(AMBER, 3.2, 520);
  sunLight.position.set(0, 8, 0);
  scene.add(sunLight);
  const rim = new THREE.DirectionalLight(COLD, 0.85);
  rim.position.set(50, 70, -40);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(AMBER, 0.25);
  fill.position.set(-40, 20, 60);
  scene.add(fill);

  const ecliptic = new THREE.Mesh(
    new THREE.RingGeometry(32, 150, 96),
    new THREE.MeshBasicMaterial({
      color: 0x1a2744,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ecliptic.rotation.x = -Math.PI / 2;
  scene.add(ecliptic);

  sun = await ASSET('./assets/dying_sun.js', { height: 40 });
  sun.position.set(0, 0, 0);
  sun.userData.isSun = true;
  scene.add(sun);

  sunGlow = createSunGlow(AMBER);
  scene.add(sunGlow);

  vfx = createVfx(scene, { amber: AMBER, cold: COLD });

  craft = await ASSET('./assets/cartographer_craft.js', { height: 0.7 });
  placeOnOrbit(craft, orbitTheta, orbitRadius, orbitInclination);
  scene.add(craft);

  const relicFiles = [
    ['./assets/hollow_moon.js', 6],
    ['./assets/broken_ring.js', 1.2],
    ['./assets/fossil_comet.js', 2.5],
    ['./assets/neutron_heart.js', 2.2],
    ['./assets/gravity_bell.js', 6],
    ['./assets/observatory_oculus.js', 5],
  ];

  const tutorialBase = 0.85;
  for (let i = 0; i < 12; i++) {
    const [file, h] = relicFiles[i % relicFiles.length];
    const relic = await ASSET(file, { height: h });
    let th, r, incl, ω;
    if (i === 0) {
      th = tutorialBase; r = 58; incl = 0.05; ω = 0;
    } else if (i === 1) {
      th = tutorialBase + 0.035; r = 92; incl = 0.06; ω = 0;
    } else {
      th = (i / 12) * Math.PI * 2 + 1.2;
      r = 48 + (i % 4) * 16;
      incl = 0.07 + (i % 3) * 0.05;
      ω = 0.04 + (i % 5) * 0.012;
    }
    placeOnOrbit(relic, th, r, incl);
    relic.userData.isRelic = true;
    relic.userData.orbit = { th, r, incl, ω, frozen: i < 2 };
    relic.userData.spectral = i % 5;
    relic.userData.tutorial = i < 2;
    relics.push(relic);
    scene.add(relic);
  }

  ghost = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 12, 10),
    new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  ghost.position.copy(relics[0].position);
  scene.add(ghost);

  window.addEventListener('resize', onResize);
  bindInput(canvas);

  window.__READY__ = true;
  window.__START__ = start;
  publishGame();

  document.getElementById('load')?.classList.add('gone');
  setHud('Follow the HOWTO panel');
  setCoach(0);
  setStarsHud();
  setTimer(GAME_SECS);
  requestAnimationFrame(frame);
}

function start() {
  if (started) return;
  started = true;
  state = STATE.ORBIT;
  over = false;
  playElapsed = 0;
  document.getElementById('start')?.classList.remove('on');
  document.getElementById('hud')?.classList.add('on');
  setHud('Drag to move · then tap the amber relic');
  setCoach(0);
  refreshFilaments();
  audio.start();
}

function endWin() {
  over = true;
  state = STATE.WIN;
  document.getElementById('win')?.classList.add('on');
  document.getElementById('winSub').textContent = secretFound
    ? 'The constellation speaks its true name: 404‑AURIGA'
    : 'Five stars burn. The orrery remembers.';
  document.getElementById('coach')?.classList.add('hidden');
  setHud('Victory');
}

function endCollapse() {
  over = true;
  state = STATE.COLLAPSE;
  document.getElementById('lose')?.classList.add('on');
  document.getElementById('coach')?.classList.add('hidden');
  setHud('The sun folds inward');
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

function pointer(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches[0])
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function bindInput(canvas) {
  const down = (e) => {
    if (!started || over) return;
    dragging = true;
    dragMoved = false;
    lastPtr = pointer(e);
    ptrDownAt = performance.now();
    holdingSun = false;
    holdSunT = 0;
    const hit = pickObject(lastPtr.x, lastPtr.y);
    if (hit && hit.userData && hit.userData.isSun && score >= 2) holdingSun = true;
    e.preventDefault();
  };

  const move = (e) => {
    if (!dragging || !started || over || state === STATE.LOCK) return;
    const p = pointer(e);
    const dx = p.x - lastPtr.x;
    const dy = p.y - lastPtr.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      dragMoved = true;
      holdingSun = false;
      if (!movedOnce) {
        movedOnce = true;
        setCoach(1);
        setHud('Good — now tap the amber‑marked relic');
      }
    }
    lastPtr = p;
    orbitTheta += dx * 0.0045;
    orbitRadius = THREE.MathUtils.clamp(orbitRadius - dy * 0.085, 38, 128);
    orbitInclination = THREE.MathUtils.clamp(orbitInclination + dx * 0.00012, 0.02, 0.38);
    e.preventDefault();
  };

  const up = (e) => {
    if (!started) return;
    const p = pointer(e);
    const wasHold = holdingSun;
    const held = (performance.now() - ptrDownAt) / 1000;
    dragging = false;
    holdingSun = false;

    if (!dragMoved && !over && state !== STATE.LOCK) {
      const hit = pickObject(p.x, p.y);
      if (hit && hit.userData && hit.userData.isRelic) {
        if (coachStep < 1) setCoach(1);
        toggleTether(hit);
      } else if (wasHold && held >= HOLD_SUN && score >= 2) {
        const pair = bestNearAlign();
        if (pair && ghost) {
          ghost.visible = true;
          ghost.position.copy(pair[0].position);
          setHud('Ghost path — tether these two');
          refreshFilaments();
        }
      }
    }
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
  document.getElementById('btnAgain')?.addEventListener('click', () => location.reload());
  document.getElementById('btnAgainLose')?.addEventListener('click', () => location.reload());
}

function publishGame() {
  const info = renderer ? renderer.info.render : { calls: 0, triangles: 0 };
  window.__GAME__ = {
    pos: craft ? [craft.position.x, craft.position.z] : [0, 0],
    fps,
    speed,
    score,
    over,
    draws: info.calls,
    tris: info.triangles,
    state,
    timeLeft: Math.max(0, GAME_SECS - playElapsed),
  };
}

function frame(now) {
  const rawDt = (now - lastT) / 1000;
  fps = 1 / (rawDt || 0.016);
  const dt = Math.min(0.05, Math.max(0.001, rawDt));
  lastT = now;
  clockT += dt;

  if (spacefx) spacefx.update(dt, clockT);

  // alignment heat 0..1 when two tethered
  if (tethered.length === 2) {
    const a = tethered[0].position;
    const b = tethered[1].position;
    const ang = unitFromSun(a).angleTo(unitFromSun(b));
    const maxAng = (12 * Math.PI) / 180;
    alignHeat = Math.max(0, 1 - ang / maxAng);
    if (alignHeat > 0.75 && vfx && Math.random() < dt * 2) {
      vfx.pulseAt(a.clone().add(b).multiplyScalar(0.5), COLD);
    }
  } else {
    alignHeat = 0;
  }

  if (vfx) {
    vfx.update(dt, {
      craftPos: craft ? craft.position : null,
      speed,
      alignT: alignHeat,
      sunScale,
    });
  }

  if (started && !over) {
    playElapsed += dt;
    const left = GAME_SECS - playElapsed;
    setTimer(left);
    const life = Math.max(0, left / GAME_SECS);
    sunScale = 0.55 + life * 0.45;
    if (sun) sun.scale.setScalar(sunScale);
    if (sunGlow) sunGlow.scale.setScalar(sunScale);
    if (sunLight) {
      sunLight.intensity = 0.8 + life * 2.6;
      sunLight.color.setHex(life > 0.35 ? AMBER : 0x8b3a1a);
    }
    audio.setTension(1 - life);
    if (left <= 0 && state !== STATE.LOCK) endCollapse();
  }

  if (holdingSun && score >= 2) holdSunT += dt;

  if (started && !over && state !== STATE.LOCK) {
    if (keys.left) orbitTheta -= 0.95 * dt;
    if (keys.right) orbitTheta += 0.95 * dt;
    orbitTheta += 0.05 * dt;
  }

  if (craft) {
    const prev = craft.position.clone();
    placeOnOrbit(craft, orbitTheta, orbitRadius, orbitInclination);
    speed = prev.distanceTo(craft.position) / dt;
  }

  for (const r of relics) {
    const orb = r.userData.orbit;
    if (!orb) continue;
    if (!(orb.frozen && !tutorialDone) && state !== STATE.LOCK && started && !over) {
      orb.th += orb.ω * dt * 0.16;
    }
    placeOnOrbit(r, orb.th, orb.r, orb.incl);
  }

  if (ghost && ghost.visible && !tutorialDone && relics[0]) {
    ghost.position.copy(relics[0].position);
  }

  if (filaments.length && craft) {
    let fi = 0;
    for (const r of tethered) {
      if (fi < filaments.length) {
        const pos = filaments[fi].geometry.attributes.position;
        pos.setXYZ(0, craft.position.x, craft.position.y, craft.position.z);
        pos.setXYZ(1, r.position.x, r.position.y, r.position.z);
        pos.needsUpdate = true;
        fi++;
      }
      if (fi < filaments.length) {
        const pos = filaments[fi].geometry.attributes.position;
        pos.setXYZ(0, 0, 0, 0);
        pos.setXYZ(1, r.position.x, r.position.y, r.position.z);
        pos.needsUpdate = true;
        fi++;
      }
    }
    if (ghost && ghost.visible && tethered.length < 2 && fi < filaments.length) {
      const pos = filaments[fi].geometry.attributes.position;
      pos.setXYZ(0, craft.position.x, craft.position.y, craft.position.z);
      pos.setXYZ(1, ghost.position.x, ghost.position.y, ghost.position.z);
      pos.needsUpdate = true;
    }
  }

  if (tethered.length === 2 && state !== STATE.LOCK) checkSyzygy();

  if (travel) {
    travel.t += dt / TRAVEL_SECS;
    const u = Math.min(1, travel.t);
    const e = u * u * (3 - 2 * u);
    camera.position.lerpVectors(travel.from, travel.to, e);
    camera.lookAt(travel.look);
    if (u >= 1) {
      const winAfter = travel.winAfter;
      travel = null;
      if (vfx) vfx.stopWarp();
      if (winAfter) endWin();
      else if (!over) {
        state = tethered.length ? STATE.TETHER : STATE.ORBIT;
        if (score < WIN_LOCKS) setHud('Find the next alignment · tap two relics');
        for (const r of relics) {
          if (r.userData.orbit && r.userData.orbit.frozen) {
            r.userData.orbit.frozen = false;
            r.userData.orbit.ω = 0.03;
          }
        }
      }
    }
  } else if (craft && state === STATE.COLLAPSE) {
    camera.position.lerp(new THREE.Vector3(0, 20, 60), 1 - Math.exp(-1.5 * dt));
    camera.lookAt(0, 0, 0);
    if (sun) sun.scale.multiplyScalar(Math.max(0.92, 1 - dt * 0.8));
    if (sunGlow) sunGlow.scale.copy(sun.scale);
  } else if (craft) {
    const target = craft.position.clone();
    const back = target.clone().normalize().multiplyScalar(42);
    const camGoal = target.clone().add(new THREE.Vector3(0, 26, 0)).add(back);
    if (camGoal.length() < 58) camGoal.setLength(58);
    camera.position.lerp(camGoal, 1 - Math.exp(-2.0 * dt));
    camera.lookAt(target.x * 0.4, target.y * 0.4 + 2, target.z * 0.4);
  }

  if (sun && started) sun.rotation.y += dt * 0.04;

  renderer.render(scene, camera);
  publishGame();
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  const msg = document.getElementById('loadmsg');
  if (msg) msg.textContent = String(err.message || err);
});
