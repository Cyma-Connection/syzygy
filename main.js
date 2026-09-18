/**
 * SYZYGY — ORBIT SNAP (404 Game Jam)
 * Auto-orbit craft; feel alignment; SNAP through the dying sun.
 */
import * as THREE from 'three';
import { ASSET } from './assetlib.js';
import { createSpaceAudio } from './audio.js';
import { createSpaceBackdrop, createSunGlow, growSun } from './spacefx.js';
import { createVfx } from './vfx.js';
import { createPlanet, createStar, createDebris } from './objects.js';
import { loadLocal, saveLocal, submitGlobal } from './leaderboard.js';
import { t, applyDom, toggleLang, setLang, coachScreens, getLang } from './i18n.js';

const AMBER = 0xe8a04a;
const COLD = 0x6b8cff;
const VOID = 0x04050a;
const GOOD = 0x5ad67a;
const BAD = 0xff4d6a;

const STATE = { BOOT: 'BOOT', PLAY: 'PLAY', OVER: 'OVER' };
const KIND = { RELIC: 'relic', PLANET: 'planet', STAR: 'star', DEBRIS: 'debris' };
/** Craft orbit radius — SNAP targets must sit BETWEEN sun (0) and craft (true syzygy). */
const CRAFT_R = 95;
/** LOCK reverse arc (~16°) — clutch, not full undo. */
const LOCK_REVERSE_RAD = 0.28;
const LOCK_STREAK_NEED = 5;
const INNER_MIN = 42;
const INNER_MAX = 82; // always < CRAFT_R so object is on sun→craft segment


let renderer, scene, camera, craft, sun, sunLight, sunGlow, spacefx, vfx;
let audio = createSpaceAudio();
let state = STATE.BOOT;
let started = false;
let over = false;

let score = 0;
let wave = 1;
let lives = 5;
let combo = 0;
let bestCombo = 0;
let snapsInWave = 0;
let playElapsed = 0;
let lastT = performance.now();
let fps = 60;
let clockT = 0;

/** Craft continuously orbits — primary angle driven by orbital speed */
let craftTheta = 0;
let orbitSpeed = 0.55; // rad/s — exposed via __GAME__.speed
let orbitDir = 1;

let world = []; // active objects on rings
let align = 0;
let bestTarget = null;
let alignTone = 0;

let zoom = 1;
let camDist = 120;
let freezeFrames = 0;
let slowMo = 0;
let camPunch = 0;
let camShake = 0;
let perfectStreak = 0;
let overScoreSaved = false; // one SAVE per run-over screen
let heatOn = false;
let isBossWave = false;
let sunScale = 1;
let sunBaseScale = 1;
let syzygyGuide = null;

let autoAlignReady = false;
let autoAlignActive = false;
let autoAlignUnlocked = false;
let lockStreak = 0; // "Perfect"s toward one LOCK charge
let lockReverseLeft = 0; // radians of reverse remaining

let pointers = new Map();
let pinchStartDist = 0;
let pinchStartZoom = 1;
let endingCinematic = false;

const relicFiles = [
  ['./assets/hollow_moon.js', 6],
  ['./assets/broken_ring.js', 1.2],
  ['./assets/fossil_comet.js', 2.5],
  ['./assets/neutron_heart.js', 2.2],
  ['./assets/gravity_bell.js', 6],
  ['./assets/observatory_oculus.js', 5],
];
let relicPool = [];

function $(id) { return document.getElementById(id); }
function setText(id, t) { const el = $(id); if (el) el.textContent = t; }

/** Hide corner #btnLang/#btnMute/#btnHelp while menus steal the screen (mobile). */
function syncMenuChrome() {
  const load = $('load');
  const loadUp = load && !load.classList.contains('gone');
  const menuUp = ['start', 'coachFlow', 'board', 'over'].some((id) => $(id)?.classList.contains('on'));
  const open = !!(loadUp || menuUp);
  document.body.classList.toggle('menu-open', open);
}

function paintMuteBtn(muted) {
  const b = $('btnMute');
  if (!b) return;
  b.classList.toggle('off', !!muted);
  b.textContent = muted ? '🔇' : '♪';
  b.title = t('mute');
  b.setAttribute('aria-label', t('mute'));
}

function angDiff(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function place(obj, theta, r = 78, y = 0) {
  obj.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
  obj.lookAt(0, 0, 0);
}

function placeCraft() {
  if (!craft) return;
  place(craft, craftTheta, CRAFT_R);
  updateSyzygyGuide();
}

function waveParams(w) {
  return {
    // gentler early waves; still ramps for later tension
    baseSpeed: 0.40 + w * 0.065,
    soft: Math.max(0.12, 0.34 - w * 0.011),
    perWave: 5,
    maxObjects: Math.min(12, 5 + Math.floor(w / 2)),
    debrisChance: Math.min(0.18, 0.04 + w * 0.015),
  };
}

function perfectBand(w) { return Math.max(0.88, 0.96 - w * 0.005); }
function goodBand(w) { return Math.max(0.70, 0.88 - w * 0.01); }

function updateHud() {
  const need = waveParams(wave).perWave;
  const left = Math.max(0, need - snapsInWave);
  setText('scoreBox', String(score));
  setText('waveBox', t('wave', wave));
  setText('waveNext', t('snapsLeft', left));
  const maxL = 5;
  setText('lives', '● '.repeat(lives).trim() || '○');
  const hp = $('hpFill');
  const hpWrap = $('hpWrap');
  if (hp) hp.style.width = `${Math.max(0, Math.min(100, (lives / maxL) * 100))}%`;
  if (hpWrap) {
    hpWrap.classList.toggle('hurt', lives <= 3 && lives > 1);
    hpWrap.classList.toggle('critical', lives <= 1);
  }
  const fill = $('meterFill');
  if (fill) fill.style.width = `${Math.floor(align * 100)}%`;
  const btn = $('snapBtn');
  if (btn) {
    const hot = align >= goodBand(wave) && bestTarget && bestTarget.kind !== KIND.DEBRIS;
    const danger = align >= 0.55 && bestTarget && bestTarget.kind === KIND.DEBRIS;
    const near = align >= 0.5 && !hot && !danger;
    btn.classList.toggle('hot', hot);
    btn.classList.toggle('near', near);
    btn.classList.toggle('danger', danger);
    const t = Math.max(0, Math.min(1, (align - 0.35) / 0.65));
    btn.style.setProperty('--snap-pulse', `${(0.9 - t * 0.6).toFixed(2)}s`);
  }
  const heatEl = $('heatBadge');
  if (heatEl) heatEl.classList.toggle('on', heatOn);

  const aa = $('btnAutoAlign');
  if (aa) {
    const charged = autoAlignUnlocked && autoAlignReady && !autoAlignActive;
    aa.classList.toggle('locked', !autoAlignUnlocked || (!autoAlignReady && !autoAlignActive));
    aa.classList.toggle('ready', charged);
    aa.classList.toggle('active', autoAlignActive);
    aa.classList.toggle('cd', false);
    if (autoAlignActive) aa.textContent = t('sync');
    else aa.textContent = t('lock');
    const charge = $('autoCharge');
    if (charge) {
      let pct = 0;
      if (autoAlignActive) pct = Math.max(0, Math.min(100, (lockReverseLeft / LOCK_REVERSE_RAD) * 100));
      else if (autoAlignReady) pct = 100;
      else pct = Math.min(100, (lockStreak / LOCK_STREAK_NEED) * 100);
      charge.style.width = `${pct}%`;
    }
  }
}

function flash(kind) {
  const fx = $('fx');
  if (!fx) return;
  fx.classList.remove('flash', 'miss', 'flashPerfect');
  void fx.offsetWidth;
  fx.classList.add(kind === 'miss' ? 'miss' : kind === 'flashPerfect' ? 'flashPerfect' : 'flash');
}

function showCombo(label) {
  const el = $('combo');
  if (!el) return;
  el.textContent = label;
  el.classList.add('show');
  clearTimeout(showCombo._t);
  showCombo._t = setTimeout(() => el.classList.remove('show'), 700);
}

function setHint(t) { setText('hint', t); }

let coachIdx = 0;

function showStartOrCoach() {
  const seen = localStorage.getItem('syzygy_coach_v2') === '1';
  if (seen) {
    $('coachFlow')?.classList.remove('on');
    $('start')?.classList.add('on');
    syncMenuChrome();
    return;
  }
  $('start')?.classList.remove('on');
  coachIdx = 0;
  paintCoach();
  $('coachFlow')?.classList.add('on');
  syncMenuChrome();
}

function paintCoach() {
  const screens = coachScreens();
  const s = screens[coachIdx];
  if (!s) return;
  setText('coachTitle', s.title);
  setText('coachBody', s.body);
  setText('coachVisual', s.visual);
}
window.__syzygyPaintCoach = paintCoach;


let helpReturnTo = null; // 'start' | 'hud'

function openHelpCoach() {
  // Pause play presentation: keep state but hide hud / start under coach
  if (started && !over && state === STATE.PLAY) {
    helpReturnTo = 'hud';
    $('hud')?.classList.remove('on');
  } else {
    helpReturnTo = 'start';
    $('start')?.classList.remove('on');
    $('board')?.classList.remove('on');
    $('over')?.classList.remove('on');
  }
  coachIdx = 0;
  paintCoach();
  $('coachFlow')?.classList.add('on');
  syncMenuChrome();
}

function closeHelpCoach() {
  $('coachFlow')?.classList.remove('on');
  if (helpReturnTo === 'hud') {
    $('hud')?.classList.add('on');
  } else {
    $('start')?.classList.add('on');
  }
  helpReturnTo = null;
  syncMenuChrome();
}

function advanceCoach() {
  audio.start();
  coachIdx += 1;
  if (coachIdx >= coachScreens().length) {
    localStorage.setItem('syzygy_coach_v2', '1');
    $('coachFlow')?.classList.remove('on');
    if (helpReturnTo === 'hud') {
      $('hud')?.classList.add('on');
      helpReturnTo = null;
    } else if (helpReturnTo === 'start') {
      $('start')?.classList.add('on');
      helpReturnTo = null;
    } else {
      $('start')?.classList.add('on');
    }
    syncMenuChrome();
    return;
  }
  paintCoach();
  syncMenuChrome();
}

function clearWorld() {
  for (const o of world) {
    scene.remove(o.mesh);
    if (o.owned) {
      o.mesh.traverse?.((n) => {
        if (n.geometry) n.geometry.dispose?.();
      });
    } else {
      o.mesh.visible = false;
      o.mesh.scale.set(1, 1, 1);
    }
  }
  world = [];
}

function countScoring() {
  return world.filter((o) => o.kind !== KIND.DEBRIS).length;
}

function pickKind(boss) {
  if (boss) return KIND.RELIC;
  const p = waveParams(wave);
  // Soft-lock guard: always keep scoring targets available
  if (countScoring() < 4) {
    const r = Math.random();
    if (r < 0.55) return KIND.RELIC;
    if (r < 0.8) return KIND.PLANET;
    return KIND.STAR;
  }
  const r = Math.random();
  if (r < p.debrisChance) return KIND.DEBRIS;
  if (r < p.debrisChance + 0.2) return KIND.PLANET;
  if (r < p.debrisChance + 0.38) return KIND.STAR;
  return KIND.RELIC;
}

function ensureProgressTargets() {
  let guard = 0;
  while (countScoring() < 4 && world.length < 14 && guard++ < 10) {
    const kind = Math.random() < 0.55 ? KIND.RELIC : (Math.random() < 0.5 ? KIND.PLANET : KIND.STAR);
    const o = makeObject(kind, false);
    o.theta = craftTheta + Math.PI * (0.55 + Math.random() * 0.9) * (Math.random() < 0.5 ? 1 : -1);
    o.radius = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);
    o.mesh.visible = true;
    place(o.mesh, o.theta, o.radius, o.y);
    if (o.owned && o.mesh.parent !== scene) scene.add(o.mesh);
    world.push(o);
  }
}

function makeObject(kind, boss) {
  let mesh;
  let owned = true;
  if (kind === KIND.RELIC) {
    // Prefer an unused pool mesh; clone if all busy so multiple relics can coexist
    const free = relicPool.filter((r) => !r.visible);
    if (free.length) {
      mesh = free[Math.floor(Math.random() * free.length)];
      mesh.visible = true;
      mesh.scale.setScalar(boss ? 2.6 : 1);
      owned = false;
    } else {
      const src = relicPool[Math.floor(Math.random() * relicPool.length)];
      mesh = src.clone(true);
      mesh.visible = true;
      mesh.scale.setScalar(boss ? 2.6 : 1);
      owned = true;
    }
  } else if (kind === KIND.PLANET) {
    mesh = createPlanet(boss ? 1.4 : 0.85 + Math.random() * 0.3);
  } else if (kind === KIND.STAR) {
    mesh = createStar(boss ? 1.3 : 0.75 + Math.random() * 0.25);
  } else {
    mesh = createDebris(0.9 + Math.random() * 0.4);
  }
  if (owned) scene.add(mesh);
  return { kind, mesh, owned, theta: 0, radius: 70, y: 0, spin: 0.4 + Math.random() * 0.8 };
}

function spawnWaveField() {
  clearWorld();
  const p = waveParams(wave);
  isBossWave = wave > 0 && wave % 5 === 0;
  const count = isBossWave ? Math.min(10, p.maxObjects + 3) : p.maxObjects;
  const usedAngles = [];

  // Boss: one big relic + denser debris
  if (isBossWave) {
    const boss = makeObject(KIND.RELIC, true);
    boss.theta = craftTheta + Math.PI * 0.85;
    boss.radius = 68; // between sun and craft
    boss.y = 0;
    place(boss.mesh, boss.theta, boss.radius, boss.y);
    world.push(boss);
    usedAngles.push(boss.theta);
    setHint('BOSS — dense debris · big relic');
    showCombo('BOSS');
    audio.setTension?.(1);
  }

  for (let i = world.length; i < count; i++) {
    const kind = (isBossWave && countScoring() >= 4 && Math.random() < 0.32) ? KIND.DEBRIS : pickKind(false);
    const o = makeObject(kind, false);
    let theta;
    let tries = 0;
    do {
      theta = craftTheta + (0.4 + Math.random() * (Math.PI * 1.6)) * (Math.random() < 0.5 ? 1 : -1);
      tries++;
    } while (tries < 12 && usedAngles.some((a) => angDiff(a, theta) < 0.35));
    usedAngles.push(theta);
    o.theta = theta;
    o.radius = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);
    o.y = (Math.random() - 0.5) * 10;
    place(o.mesh, o.theta, o.radius, o.y);
    world.push(o);
  }
  if (!isBossWave) setHint(wave === 1 ? t('hintFeel') : t('hintAlign'));
  ensureProgressTargets();
}

function refillObject() {
  if (world.length >= waveParams(wave).maxObjects + (isBossWave ? 3 : 0)) return;
  const kind = (countScoring() >= 4 && isBossWave && Math.random() < 0.28) ? KIND.DEBRIS : pickKind(false);
  const o = makeObject(kind, false);
  o.theta = craftTheta + Math.PI * (0.7 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1);
  o.radius = INNER_MIN + Math.random() * (INNER_MAX - INNER_MIN);
  o.y = (Math.random() - 0.5) * 10;
  place(o.mesh, o.theta, o.radius, o.y);
  world.push(o);
  ensureProgressTargets();
}

function removeObject(o) {
  const i = world.indexOf(o);
  if (i >= 0) world.splice(i, 1);
  if (o.owned) {
    scene.remove(o.mesh);
  } else {
    o.mesh.visible = false;
    o.mesh.scale.set(1, 1, 1);
  }
}


function updateSyzygyGuide() {
  if (!syzygyGuide || !craft) return;
  const pos = craft.position;
  const a = align;
  const mat = syzygyGuide.material;
  const arr = syzygyGuide.geometry.attributes.position.array;
  // Always 3 verts: sun → mid → craft. Mid = object when near syzygy, else halfway (reads as thin ray).
  const near = a >= 0.42 && bestTarget && bestTarget.mesh;
  arr[0] = 0; arr[1] = 0.2; arr[2] = 0;
  if (near) {
    const op = bestTarget.mesh.position;
    arr[3] = op.x; arr[4] = op.y; arr[5] = op.z;
  } else {
    arr[3] = pos.x * 0.5; arr[4] = pos.y * 0.5 + 0.1; arr[5] = pos.z * 0.5;
  }
  arr[6] = pos.x; arr[7] = pos.y; arr[8] = pos.z;
  syzygyGuide.geometry.attributes.position.needsUpdate = true;
  if (bestTarget && bestTarget.kind === KIND.DEBRIS && a > 0.5) {
    mat.color.setHex(BAD);
    mat.opacity = 0.18 + a * 0.5;
  } else if (a > 0.45) {
    mat.color.setHex(a >= goodBand(wave) ? AMBER : COLD);
    mat.opacity = 0.14 + (a - 0.45) * 0.85;
  } else {
    mat.opacity = Math.max(0.03, a * 0.1);
    mat.color.setHex(COLD);
  }
}

function isBetweenSunAndCraft(o) {
  // True syzygy segment: sun (origin) → object → craft
  return o.radius > INNER_MIN * 0.5 && o.radius < CRAFT_R - 2;
}

function computeAlignment() {
  bestTarget = null;
  let best = 0;
  const soft = waveParams(wave).soft + 0.22;
  for (const o of world) {
    if (!isBetweenSunAndCraft(o)) continue;
    const d = angDiff(craftTheta, o.theta);
    const q = Math.max(0, 1 - d / soft);
    if (q > best) {
      best = q;
      bestTarget = o;
    }
  }
  align = best;
  return best;
}

/** Stack bonus: other non-debris near the same sun→craft ray */
function stackBonus(primary) {
  let bonus = 1;
  const tags = [];
  for (const o of world) {
    if (o === primary || o.kind === KIND.DEBRIS) continue;
    if (!isBetweenSunAndCraft(o)) continue;
    if (angDiff(craftTheta, o.theta) < 0.18) {
      if (o.kind === KIND.PLANET) { bonus += 0.5; tags.push('PLANET'); }
      if (o.kind === KIND.STAR) { bonus += 0.75; tags.push('STAR'); }
      if (o.kind === KIND.RELIC) { bonus += 0.35; tags.push('RELIC'); }
    }
  }
  return { bonus, tags };
}


function flashHp() {
  const w = $('hpWrap');
  if (!w) return;
  w.classList.add('hurt');
  clearTimeout(flashHp._t);
  flashHp._t = setTimeout(() => {
    if (lives > 3) w.classList.remove('hurt');
  }, 500);
}

function failLife(reason) {
  if (over || endingCinematic) return;
  lives -= 1;
  flashHp();
  combo = 0;
  perfectStreak = 0;
  lockStreak = 0;
  heatOn = false;
  updateHeatVisual();
  audio.stingMiss();
  flash('miss');
  camShake = 0.4;
  setHint(reason || 'MISS');
  updateHud();
  if (lives <= 0) endRun();
}

function doSnap() {
  audio.start();
  if (!started || over || state !== STATE.PLAY || endingCinematic) return;
  if (freezeFrames > 0) return;

  computeAlignment();
  const perf = perfectBand(wave);
  const good = goodBand(wave);
  const target = bestTarget;

  if (!target || align < 0.45) {
    failLife(align < 0.2 ? 'NO SYZYGY' : 'WEAK ALIGN');
    return;
  }

  if (target.kind === KIND.DEBRIS) {
    if (audio.stingDebris) audio.stingDebris(); else audio.stingMiss();
    // distinct bad FX
        flash('miss');
    camShake = 0.55;
    if (vfx) {
      vfx.shatterAt(target.mesh.position.clone(), BAD, 16, 1.1);
      vfx.lockBurst(target.mesh.position.clone(), BAD);
    }
    removeObject(target);
    refillObject();
    failLife('DÉBRIS!');
    return;
  }

  let grade = 'OK';
  let pts = 200;
  if (align >= perf) {
    grade = 'PERFECT'; pts = 1000; combo += 1; perfectStreak += 1;
    lockStreak += 1;
  } else if (align >= good) {
    grade = 'GOOD'; pts = 500; combo += 1; perfectStreak = 0; lockStreak = 0;
  } else {
    grade = 'OK'; pts = 200; combo = 0; perfectStreak = 0; lockStreak = 0;
  }

  updateHeat();
  const { bonus, tags } = stackBonus(target);
  const heatMult = heatOn ? 2 : 1;
  const gained = Math.floor(pts * Math.max(1, combo) * (1 + (wave - 1) * 0.08) * heatMult * bonus);
  score += gained;
  bestCombo = Math.max(bestCombo, combo);
  snapsInWave += 1;

  if (grade === 'PERFECT') audio.stingPerfect();
  else if (grade === 'GOOD') audio.stingGood();
  else audio.stingOk();

  const pos = target.mesh.position.clone();
  if (grade === 'PERFECT') {
    freezeFrames = 2;
    slowMo = 0.35;
    flash('flashPerfect');
    camPunch = 0.32;
    if (vfx) vfx.shatterAt(pos, GOOD, 24, 1.2);
  } else {
    flash('flash');
    camPunch = 0.18;
    if (vfx) vfx.shatterAt(pos, AMBER, 12, 0.9);
  }
  if (vfx) {
    vfx.lockBurst(pos, grade === 'PERFECT' ? GOOD : AMBER);
    vfx.pulseAt(new THREE.Vector3(), COLD);
  }

  const stackLabel = tags.length ? ` +${tags.join('+')}` : '';
  const gradeLabel = grade === 'PERFECT' ? t('gradePerfect') : grade;
  showCombo(`${gradeLabel}${combo > 1 ? ` x${combo}` : ''}${heatOn ? ' HEAT' : ''}${stackLabel}`);
  setHint(`+${gained}`);

  // Consume primary; also consume stacked allies on the ray for juice
  const toRemove = [target];
  for (const o of world) {
    if (o === target || o.kind === KIND.DEBRIS) continue;
    if (!isBetweenSunAndCraft(o)) continue;
    if (angDiff(craftTheta, o.theta) < 0.18) toRemove.push(o);
  }
  for (const o of toRemove) removeObject(o);
  for (let i = 0; i < toRemove.length; i++) refillObject();
  ensureProgressTargets();

  updateHud();
  maybeAdvanceWave();
}

function updateHeat() {
  if (perfectStreak >= 3) {
    if (!heatOn) showCombo('HEAT x2');
    heatOn = true;
  } else {
    heatOn = false;
  }
  // LOCK: one charge after LOCK_STREAK_NEED "Perfect"s (separate from heat)
  if (lockStreak >= LOCK_STREAK_NEED && !autoAlignReady && !autoAlignActive) {
    autoAlignUnlocked = true;
    autoAlignReady = true;
    lockStreak = 0;
    showCombo(t('lockUnlocked'));
    setHint(t('lockReady'));
  }
  updateHeatVisual();
}

function updateHeatVisual() {
  if (!craft) return;
  craft.traverse((n) => {
    if (!n.isMesh || !n.material || !n.material.emissive) return;
    if (n.userData?.craftHalo) {
      // halo stays cold/amber readable; heat only boosts intensity
      n.material.emissive = new THREE.Color(heatOn ? AMBER : COLD);
      n.material.emissiveIntensity = heatOn ? 1.1 : (n.userData.haloBase ?? 0.65);
      return;
    }
    n.material.emissive = new THREE.Color(heatOn ? AMBER : 0x1a2240);
    n.material.emissiveIntensity = heatOn ? 0.6 : 0.18;
  });
}

function maybeAdvanceWave() {
  const need = waveParams(wave).perWave;
  if (snapsInWave >= need) {
    wave += 1;
    snapsInWave = 0;
    // sun grows + brightens for the run
    sunScale = Math.min(2.4, sunScale + 0.12);
    applySunGrowth();
    orbitSpeed = waveParams(wave).baseSpeed;
    audio.stingWave?.();
    audio.setWaveLayer?.(wave);
    setHint(t('wave', wave));
    showCombo(t('wave', wave));
    spawnWaveField();
  }
}

function applySunGrowth() {
  const s = sunBaseScale * sunScale;
  if (sun) {
    sun.scale.setScalar(s);
    // Whole star brighter — emissive on every sun mesh (uniform, no odd shell blob)
    sun.traverse((n) => {
      if (!n.isMesh || !n.material) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of mats) {
        if (m.emissiveIntensity == null) continue;
        if (m.userData.baseEmissive == null) m.userData.baseEmissive = m.emissiveIntensity;
        m.emissiveIntensity = m.userData.baseEmissive * (0.85 + sunScale * 0.55);
      }
    });
  }
  if (sunGlow) {
    sunGlow.scale.setScalar(s);
    growSun?.(sunGlow, sunScale);
  }
  if (sunLight) {
    sunLight.intensity = 2.6 + (sunScale - 1) * 2.8;
    sunLight.distance = 560 + (sunScale - 1) * 160;
  }
}


function activateAutoAlign() {
  if (!started || over || state !== STATE.PLAY || endingCinematic) return;
  if (!autoAlignUnlocked || !autoAlignReady || autoAlignActive) return;
  autoAlignActive = true;
  autoAlignReady = false;
  lockReverseLeft = LOCK_REVERSE_RAD;
  audio.stingAutoAlign?.();
  showCombo(t('lock'));
  setHint(t('lockReady'));
  camPunch = Math.max(camPunch, 0.12);
  updateHud();
}

/** Short reverse along orbit — distance-gated (radians), not a timed auto-snap. */
function tickAutoAlign(dt) {
  if (!autoAlignActive) return;
  // Motion applied in frame loop via lockReverseLeft; here we only finish + FX budget.
  if (lockReverseLeft <= 0) {
    autoAlignActive = false;
    setHint(t('lockDone'));
    updateHud();
  }
}

function goToMenu() {
  over = true;
  started = false;
  endingCinematic = false;
  state = STATE.BOOT;
  $('hud')?.classList.remove('on');
  $('over')?.classList.remove('on');
  $('board')?.classList.remove('on');
  $('coachFlow')?.classList.remove('on');
  $('start')?.classList.add('on');
  clearWorld?.();
  if (craft) craft.visible = true;
  if (sun) sun.visible = true;
  if (sunGlow) sunGlow.visible = true;
  sunScale = 1;
  applySunGrowth?.();
  syncMenuChrome();
  publishGame();
}

function startRun() {
  if (started && !over && state === STATE.PLAY) return;
  score = 0; wave = 1; lives = 5; combo = 0; bestCombo = 0; snapsInWave = 0;
  perfectStreak = 0; heatOn = false;
  playElapsed = 0; over = false; started = true; state = STATE.PLAY;
  endingCinematic = false;
  zoom = 1; camDist = 110;
  craftTheta = 0.4;
  orbitSpeed = waveParams(1).baseSpeed;
  orbitDir = 1;
  sunScale = 1;
  if (sun) sun.visible = true;
  if (sunGlow) sunGlow.visible = true;
  if (craft) craft.visible = true;
  applySunGrowth();
  autoAlignUnlocked = false;
  autoAlignReady = false;
  autoAlignActive = false;
  lockStreak = 0;
  lockReverseLeft = 0;
  slowMo = 0;
  updateHeatVisual();
  $('start')?.classList.remove('on');
  $('board')?.classList.remove('on');
  $('over')?.classList.remove('on');
  $('coachFlow')?.classList.remove('on');
  $('hud')?.classList.add('on');
  syncMenuChrome();
  updateHud();
  paintMuteBtn(!!audio.muted);
  audio.start();
  spawnWaveField();
}

function endRun() {
  if (endingCinematic) return;
  endingCinematic = true;
  over = true;
  state = STATE.OVER;
  $('hud')?.classList.remove('on');
  // BIG cinematic KO — sun + system shatter, flash, camera punch
  audio.stingExplosion?.();
  camShake = 1.6;
  camPunch = 1.1;
  flash('miss');
  if (vfx) {
    vfx.systemBoom?.(new THREE.Vector3(0, 0, 0));
    if (craft) {
      vfx.shatterAt(craft.position.clone(), AMBER, 36, 1.8);
      vfx.lockBurst(craft.position.clone(), BAD);
    }
  }
  for (const o of [...world]) {
    if (vfx) vfx.shatterAt(o.mesh.position.clone(), o.kind === KIND.DEBRIS ? BAD : COLD, 14, 1.25);
    removeObject(o);
  }
  if (sun) {
    // hide sun body so shatter reads as the star dying
    sun.visible = false;
    if (sunGlow) sunGlow.visible = false;
    if (vfx) {
      vfx.shatterAt(new THREE.Vector3(0, 0, 0), AMBER, 42, 2.0);
      vfx.pulseAt(new THREE.Vector3(), AMBER);
      vfx.lockBurst(new THREE.Vector3(0, 0, 0), AMBER);
    }
  }
  if (craft) craft.visible = false;
  // longer beat before OVER UI so boom lands
  setTimeout(() => {
    $('over')?.classList.add('on');
    syncMenuChrome();
    overScoreSaved = false;
    const submitBtn = $('btnSubmit');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t('save');
      submitBtn.style.opacity = '';
      submitBtn.style.pointerEvents = '';
    }
    const nameInReset = $('nameIn');
    if (nameInReset) nameInReset.readOnly = false;
    setText('overSub', t('overSub', score, wave, bestCombo));
    renderOverRanks();
    const nameIn = $('nameIn');
    if (nameIn) {
      if (!nameIn.value) nameIn.value = (localStorage.getItem('syzygy_tag') || '').slice(0, 12);
      setTimeout(() => nameIn.focus(), 50);
    }
    // Machine playtest: claim the board as Bot 404 when beating local top
    if (botOn) {
      const top = loadLocal()[0];
      const beat = !top || score >= (top.score || 0);
      if (beat) {
        if (nameIn) nameIn.value = 'Bot 404';
        localStorage.setItem('syzygy_tag', 'Bot 404');
        saveLocal('Bot 404', score, wave);
        overScoreSaved = true;
        renderOverRanks({ saved: true });
        const btn = $('btnSubmit');
        if (btn) {
          btn.textContent = t('saved');
          btn.disabled = true;
          btn.style.opacity = '0.55';
          btn.style.pointerEvents = 'none';
        }
        const ni = $('nameIn');
        if (ni) ni.readOnly = true;
        console.info('[SYZYGY] bot saved record as Bot 404', score, 'wave', wave);
      } else {
        console.info('[SYZYGY] bot score', score, 'did not beat', top?.score);
      }
    }
    publishGame();
  }, 1100);
}

async function boot() {
  const canvas = $('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.FogExp2(0x060814, 0.0014);

  camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.5, 1000);
  camDist = 110;
  camera.position.set(0, 48, 95 + 50); // outside craft orbit, elevated rail

  spacefx = createSpaceBackdrop(scene, { amber: AMBER, cold: COLD });
  scene.add(new THREE.HemisphereLight(COLD, AMBER, 0.5));
  sunLight = new THREE.PointLight(AMBER, 3.4, 560);
  scene.add(sunLight);
  scene.add(new THREE.DirectionalLight(COLD, 0.8));

  // orbit guide rings
  for (const [r, op] of [[55, 0.12], [80, 0.18], [110, 0.1]]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.4, r + 0.4, 96),
      new THREE.MeshBasicMaterial({ color: 0x152238, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
  }

  const aimGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(80, 0, 0)]);
  const aimLine = new THREE.Line(aimGeo, new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.4 }));
  aimLine.name = 'aimLine';
  scene.add(aimLine);
  window.__aimLine = aimLine;

  {
    // ASSET floors models (pivot at bottom). Wrap so scale grows around TRUE center — whole star, no upward blob.
    const raw = await ASSET('./assets/dying_sun.js', { height: 36 });
    const box = new THREE.Box3().setFromObject(raw);
    const c = box.getCenter(new THREE.Vector3());
    raw.position.sub(c);
    sun = new THREE.Group();
    sun.add(raw);
    sun.position.set(0, 0, 0);
  }
  sun.userData.isSun = true;
  sunBaseScale = 1;
  scene.add(sun);
  sunGlow = createSunGlow(AMBER, COLD);
  sunGlow.position.set(0, 0, 0);
  scene.add(sunGlow);
  vfx = createVfx(scene, { amber: AMBER, cold: COLD });

  // Style-lock length ~2 m; load taller for readable silhouette at orbit distance
  craft = await ASSET('./assets/cartographer_craft.js', { height: 2.4 });
  // Cold/amber halo + silhouette boost so craft is anticipatable vs sun/targets
  const haloMat = (color, opacity, intensity) => {
    const m = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return m;
  };
  const haloShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 16, 12),
    haloMat(COLD, 0.22, 0.7)
  );
  haloShell.userData.craftHalo = true;
  haloShell.userData.haloBase = 0.7;
  // fake emissive fields for updateHeatVisual path (BasicMaterial has no emissive — tag shell only)
  const haloRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.08, 8, 32),
    haloMat(AMBER, 0.55, 0.8)
  );
  haloRing.rotation.x = Math.PI / 2;
  haloRing.userData.craftHalo = true;
  const haloRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.05, 6, 28),
    haloMat(COLD, 0.45, 0.7)
  );
  haloRing2.rotation.y = Math.PI / 2;
  const craftLight = new THREE.PointLight(COLD, 1.4, 28);
  craftLight.position.set(0, 1.2, 0);
  // emissive outline proxy: thin bright boxes along hull length
  const keel = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 3.2),
    new THREE.MeshStandardMaterial({
      color: 0xe6dcc8,
      emissive: COLD,
      emissiveIntensity: 0.85,
      roughness: 0.35,
      metalness: 0.5,
    })
  );
  keel.position.y = 0.9;
  keel.userData.craftHalo = true;
  keel.userData.haloBase = 0.85;
  craft.add(haloShell);
  craft.add(haloRing);
  craft.add(haloRing2);
  craft.add(keel);
  craft.add(craftLight);
  // slight baseline emissive on hull materials for silhouette
  craft.traverse((n) => {
    if (n.isMesh && n.material && n.material.emissive && !n.userData.craftHalo) {
      n.material.emissive = new THREE.Color(0x1a2240);
      n.material.emissiveIntensity = 0.18;
    }
  });
  placeCraft();
  scene.add(craft);

  // Thin sun→craft ray so players can read true syzygy
  {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(CRAFT_R * 0.5, 0.1, 0),
      new THREE.Vector3(CRAFT_R, 0, 0),
    ]);
    syzygyGuide = new THREE.Line(g, new THREE.LineBasicMaterial({
      color: COLD, transparent: true, opacity: 0.0, depthWrite: false,
    }));
    syzygyGuide.frustumCulled = false;
    scene.add(syzygyGuide);
  }


  for (const [file, h] of relicFiles) {
    const r = await ASSET(file, { height: h });
    r.visible = false;
    scene.add(r);
    relicPool.push(r);
  }

  bindInput(canvas);
  window.addEventListener('resize', onResize);

  window.__READY__ = true;
  window.__START__ = startRun;
  botOn = /(?:\?|&)bot=1(?:&|$)/.test(location.search) || location.hash === '#bot';
  if (botOn) {
    console.info('[SYZYGY] bot playtest ON');
    localStorage.setItem('syzygy_coach_v2', '1');
  }
  publishGame();

  applyDom();
  paintMuteBtn(!!audio.muted);
  $('load')?.classList.add('gone');
  showStartOrCoach();
  syncMenuChrome();
  $('btnCoachNext')?.addEventListener('click', (e) => { e.preventDefault(); advanceCoach(); });
  requestAnimationFrame(frame);
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

function bindInput(canvas) {
  const down = (e) => {
    e.preventDefault();
    if (e.pointerId != null) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoom = zoom;
    }
  };
  const move = (e) => {
    e.preventDefault();
    if (e.pointerId != null && pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDist > 0) {
        zoom = THREE.MathUtils.clamp(pinchStartZoom * (pinchStartDist / d), 0.55, 1.85);
        camDist = 70 + zoom * 70;
      }
    }
  };
  const up = (e) => {
    if (e.pointerId != null) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStartDist = 0;
  };

  canvas.addEventListener('pointerdown', down, { passive: false });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
  // Desktop: wheel zoom (same range as pinch) to scout the orbit ahead
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + Math.sign(e.deltaY) * 0.08, 0.55, 1.85);
    camDist = 70 + zoom * 70;
  }, { passive: false });

  $('snapBtn')?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doSnap(); });
  $('btnAutoAlign')?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); activateAutoAlign(); });
  $('btnHelp')?.addEventListener('click', (e) => {
    e.preventDefault();
    openHelpCoach();
  });
  // Debounce dual pointerdown+click on iOS so toggleMute / toggleLang do not fire twice
  const tapGuard = (fn, gap = 320) => {
    let last = 0;
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      const now = performance.now();
      if (now - last < gap) return;
      last = now;
      fn(e);
    };
  };

  const cornerLangTap = tapGuard(() => {
    toggleLang();
    updateHud();
    paintCoach();
    paintMuteBtn(!!audio.muted);
  });
  $('btnLang')?.addEventListener('pointerdown', cornerLangTap);
  $('btnLang')?.addEventListener('click', cornerLangTap);

  for (const code of ['en', 'fr', 'es']) {
    const el = $(`lang_${code}`);
    if (!el) continue;
    const apply = tapGuard(() => {
      setLang(code);
      updateHud();
      paintCoach();
      paintMuteBtn(!!audio.muted);
    });
    // iOS/Android: pointerdown + touchend + click; stopPropagation so chrome cannot steal taps
    el.addEventListener('pointerdown', apply);
    el.addEventListener('touchend', apply, { passive: false });
    el.addEventListener('click', apply);
  }

  const muteTap = tapGuard(() => {
    audio.start(); // ensure ctx unlocked even if PLAY was skipped
    paintMuteBtn(audio.toggleMute());
  });
  $('btnMute')?.addEventListener('pointerdown', muteTap);
  $('btnMute')?.addEventListener('click', muteTap);

  $('btnStart')?.addEventListener('click', () => startRun());
  $('btnRetry')?.addEventListener('click', () => startRun());
  $('btnMenu')?.addEventListener('click', () => goToMenu());
  $('btnLb')?.addEventListener('click', () => openBoard());
  $('btnBack')?.addEventListener('click', () => {
    $('board')?.classList.remove('on');
    $('start')?.classList.add('on');
    syncMenuChrome();
  });
  $('btnSubmit')?.addEventListener('click', async () => {
    if (overScoreSaved) return;
    const btn = $('btnSubmit');
    const name = ($('nameIn')?.value || 'ANON').trim().slice(0, 12) || 'ANON';
    localStorage.setItem('syzygy_tag', name);
    overScoreSaved = true; // lock immediately so double-clicks / rewrites cannot spawn extra rows
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('saving');
      btn.style.pointerEvents = 'none';
    }
    const nameIn = $('nameIn');
    if (nameIn) nameIn.readOnly = true;
    try {
      // submitGlobal → saveLocal once
      await submitGlobal(name, score, playElapsed, wave);
      if (btn) btn.textContent = t('saved');
    } catch (err) {
      console.warn(err);
      saveLocal(name, score, wave);
      if (btn) btn.textContent = t('localSaved');
    }
    if (btn) btn.style.opacity = '0.55';
    renderOverRanks({ saved: true });
  });
}

function renderOverRanks(opts = {}) {
  const el = $('overLb');
  if (!el) return;
  const note = $('overRankNote');
  if (note) note.textContent = t('overRankNote');
  const rows = loadLocal();
  const saved = !!opts.saved;
  const tag = (($('nameIn')?.value || localStorage.getItem('syzygy_tag') || 'YOU')).trim().slice(0, 12).toUpperCase() || 'YOU';
  // Preview current run unless already saved into local list this over-screen
  let preview = rows.map((r) => ({ ...r }));
  if (!saved) {
    preview.push({ name: tag || 'YOU', score, wave, _you: true });
  } else {
    // highlight matching top score with this tag
    let marked = false;
    for (const r of preview) {
      if (!marked && r.name === tag && r.score === Math.floor(score)) {
        r._you = true;
        marked = true;
      }
    }
  }
  preview.sort((a, b) => b.score - a.score);
  const top = preview.slice(0, 12);
  if (!top.length) {
    el.innerHTML = `<em>${t('lbEmpty')}</em>`;
    return;
  }
  el.innerHTML = `<table>${top.map((r, i) => {
    const you = r._you || r.name === 'YOU';
    return `<tr class="${you ? 'you' : ''}"><td>${i + 1}. ${escapeHtml(r.name)}</td><td>${r.score}</td></tr>`;
  }).join('')}</table>`;
}

function openBoard() {
  $('start')?.classList.remove('on');
  $('board')?.classList.add('on');
  syncMenuChrome();
  const note = $('lbNote');
  if (note) note.textContent = t('lbNote');
  renderBoard(loadLocal());
}

function renderBoard(rows) {
  const lb = $('lb');
  if (!lb) return;
  if (!rows.length) { lb.innerHTML = `<em>${t('lbEmpty')}</em>`; return; }
  lb.innerHTML = `<table>${rows.slice(0, 15).map((r, i) =>
    `<tr><td>${i + 1}. ${escapeHtml(r.name)}</td><td>${r.score}</td></tr>`
  ).join('')}</table>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}


/** Machine playtest: ?bot=1 auto-SNAP on safe alignments (skips debris). */
let botOn = false;
function tickBot() {
  if (!botOn || !started || over || endingCinematic) return;
  if (freezeFrames > 0) return;
  computeAlignment();
  if (!bestTarget) return;
  if (bestTarget.kind === KIND.DEBRIS) return;
  if (align >= goodBand(wave)) doSnap();
  // Bot: spend LOCK reverse when charged and slightly off a good line
  if (autoAlignUnlocked && autoAlignReady && !autoAlignActive && align >= 0.5 && align < goodBand(wave)) {
    activateAutoAlign();
  }
}

function publishGame() {
  const info = renderer ? renderer.info.render : { calls: 0, triangles: 0 };
  if (botOn) {
    try {
      const tr = (typeof audio.getTransposeSemis === 'function')
        ? audio.getTransposeSemis()
        : (audio.transposeSemis ?? '?');
      document.title = `BOT w${wave} sc${score} lv${lives} spd${(Math.abs(orbitSpeed)*40)|0} ${over?'OVER':'PLAY'} tr${tr}`;
    } catch (_) {}
  }
  window.__GAME__ = {
    pos: craft ? [craft.position.x, craft.position.z] : [0, 0],
    fps,
    speed: Math.abs(orbitSpeed) * 40,
    score,
    over,
    draws: info.calls,
    tris: info.triangles,
    state,
    wave,
    lives,
  };
}

function frame(now) {
  const raw = (now - lastT) / 1000;
  fps = 1 / (raw || 0.016);
  let dt = Math.min(0.05, Math.max(0.001, raw));
  lastT = now;
  clockT += dt;

  if (freezeFrames > 0) {
    freezeFrames -= 1;
    renderer.render(scene, camera);
    publishGame();
    requestAnimationFrame(frame);
    return;
  }

  // brief slow-mo on Perfect
  if (slowMo > 0) {
    slowMo = Math.max(0, slowMo - raw);
    dt *= 0.35;
  }

  if (spacefx) {
    spacefx.update(dt, clockT, {
      zoom,
      camX: camera?.position.x || 0,
      camY: camera?.position.y || 0,
      camZ: camera?.position.z || 0,
    });
  }
  // Soft corona pulse (respects grow-from-center scale)
  if (sunGlow && sunGlow.visible) {
    const base = (sunBaseScale || 1) * sunScale;
    const pulse = 1 + Math.sin(clockT * 1.35) * 0.028;
    sunGlow.scale.setScalar(base * pulse);
    if (typeof spacefx?.pulseSun === 'function') spacefx.pulseSun(sunGlow, clockT);
  }

  if (started && !over) {
    playElapsed += raw;
    audio.setTension(Math.min(1, wave / 12));
    audio.setWaveLayer?.(wave);
    // Auto-orbit — speed rises slightly within wave
    const within = snapsInWave / Math.max(1, waveParams(wave).perWave);
    const spd = orbitSpeed * (1 + within * 0.12);
    audio.setOrbitSpeed?.(spd);
    if (autoAlignActive && lockReverseLeft > 0) {
      const step = Math.min(lockReverseLeft, spd * dt);
      craftTheta -= orbitDir * step; // reverse along current orbit
      lockReverseLeft -= step;
      if (vfx && craft && Math.random() < dt * 28) {
        vfx.nearMissBurst?.(craft.position.clone());
      }
    } else {
      craftTheta += orbitDir * spd * dt;
    }

    tickAutoAlign(dt);
    computeAlignment();
    tickBot();

    // Rising align tone feedback
    if (audio.setAlignTone) {
      const want = (align >= 0.45 && bestTarget && bestTarget.kind !== KIND.DEBRIS) ? align : 0;
      audio.setAlignTone(want);
    }

    // Near-miss sparks for relics approaching sweet spot
    if (bestTarget && bestTarget.kind !== KIND.DEBRIS && align >= 0.42 && align < 0.55 && vfx && Math.random() < dt * 16) {
      vfx.nearMissBurst(bestTarget.mesh.position);
    }

    // Spin decorative objects
    for (const o of world) {
      o.mesh.rotation.y += o.spin * dt;
      if (o.kind === KIND.STAR) o.mesh.rotation.z += o.spin * 0.7 * dt;
      if (o.kind === KIND.DEBRIS) o.mesh.rotation.x += o.spin * 1.2 * dt;
    }

    updateHud();
  }

  placeCraft();

  const aimLine = window.__aimLine;
  if (aimLine) {
    const end = new THREE.Vector3(Math.cos(craftTheta) * 160, 0, Math.sin(craftTheta) * 160);
    aimLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), end]);
    // glow stronger when hot
    aimLine.material.opacity = 0.28 + align * 0.45;
    aimLine.material.color.setHex(
      bestTarget?.kind === KIND.DEBRIS && align > 0.5 ? BAD : align > 0.7 ? GOOD : AMBER
    );
  }

  if (vfx) {
    vfx.update(dt, {
      craftPos: craft?.position,
      speed: Math.abs(orbitSpeed) * 70,
      alignT: align,
      sunScale,
      heat: heatOn,
    });
  }

  if (camera) {
    // Rail / cockpit framing: craft stays bottom-center; world sweeps past.
    // Camera sits outside the craft orbit looking inward (+ slight look-ahead).
    const craftR = CRAFT_R;
    const z = THREE.MathUtils.clamp(zoom, 0.55, 1.85);
    // zoom↑ = pull back + wider FOV to anticipate orbit ahead
    const out = 18 + z * 48;          // radial distance beyond craft
    const height = 26 + z * 28;       // elevated for bottom-third craft
    let punch = 0;
    if (camPunch > 0) {
      const punchMax = endingCinematic ? 1.1 : 0.35;
      camPunch = Math.max(0, camPunch - dt);
      const u = 1 - camPunch / Math.max(0.2, punchMax);
      punch = Math.sin(u * Math.PI) * (endingCinematic ? 22 : 10);
    }
    const camR = craftR + out + punch;
    const camGoal = new THREE.Vector3(
      Math.cos(craftTheta) * camR,
      height,
      Math.sin(craftTheta) * camR
    );
    if (camShake > 0) {
      camShake = Math.max(0, camShake - dt);
      const amp = endingCinematic ? 7 : 3.5;
      camGoal.x += (Math.random() - 0.5) * amp * camShake;
      camGoal.y += (Math.random() - 0.5) * amp * camShake;
    }
    // Look toward sun, slightly ahead on the orbit — craft projects bottom-center
    const lookAhead = orbitDir * (0.12 + (z - 0.55) * 0.1);
    const lookR = 28 + (1.85 - z) * 22; // farther look when zoomed out
    const lookAt = new THREE.Vector3(
      Math.cos(craftTheta + lookAhead) * lookR,
      5 + (1.2 - Math.min(z, 1.2)) * 4,
      Math.sin(craftTheta + lookAhead) * lookR
    );
    camera.position.lerp(camGoal, 1 - Math.exp(-4.2 * dt));
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 42 + z * 14, 0.12);
    camera.updateProjectionMatrix();
  }

  if (sun) sun.rotation.y += dt * 0.05;
  if (sunLight) sunLight.intensity = (2.6 + (sunScale - 1) * 2) + Math.sin(clockT * 2) * 0.3;

  renderer.render(scene, camera);
  publishGame();
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  setText('loadmsg', String(err.message || err));
});
