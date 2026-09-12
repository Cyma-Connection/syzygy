/**
 * SYZYGY SNAP — arcade alignment for 404 Game Jam
 */
import * as THREE from 'three';
import { ASSET } from './assetlib.js';
import { createSpaceAudio } from './audio.js';
import { createSpaceBackdrop, createSunGlow } from './spacefx.js';
import { createVfx } from './vfx.js';
import { loadLocal, saveLocal, fetchGlobal, submitGlobal } from './leaderboard.js';

const AMBER = 0xe8a04a;
const COLD = 0x6b8cff;
const VOID = 0x04050a;
const GOOD = 0x5ad67a;

const STATE = { BOOT:'BOOT', PLAY:'PLAY', OVER:'OVER' };

let renderer, scene, camera, craft, sun, sunLight, sunGlow, spacefx, vfx;
let raycaster;
let audio = createSpaceAudio();
let state = STATE.BOOT;
let started = false;
let over = false;

let score = 0;
let wave = 1;
let lives = 3;
let combo = 0;
let bestCombo = 0;
let snapsInWave = 0;
let playElapsed = 0;
let lastT = performance.now();
let fps = 60;
let clockT = 0;

let aimTheta = 0.4;
let targetTheta = 0.4;
let targetSpeed = 0.55;
let targetObj = null;
let targetAlive = false;
let targetLife = 0;
let targetMaxLife = 4;
let failing = false;
let freezeFrames = 0;
let camPunch = 0; // seconds remaining of punch-back
let camShake = 0;
let perfectStreak = 0;
let heatOn = false;
let isBoss = false;
let bossPhase = 0; // 0..2 for boss
let bossHits = 0;

let align = 0; // 0..1
let zoom = 1; // pinch
let camDist = 120;

let dragging = false;
let lastPtr = null;
let pointers = new Map(); // pinch
let pinchStartDist = 0;
let pinchStartZoom = 1;

const relicFiles = [
  ['./assets/hollow_moon.js', 6],
  ['./assets/broken_ring.js', 1.2],
  ['./assets/fossil_comet.js', 2.5],
  ['./assets/neutron_heart.js', 2.2],
  ['./assets/gravity_bell.js', 6],
  ['./assets/observatory_oculus.js', 5],
];
let relicPool = [];

function $(id){ return document.getElementById(id); }
function setText(id, t){ const el=$(id); if(el) el.textContent=t; }

function place(obj, theta, r=78, y=0){
  obj.position.set(Math.cos(theta)*r, y, Math.sin(theta)*r);
  obj.lookAt(0,0,0);
}

function waveParams(w){
  return {
    speed: 0.45 + w * 0.08,
    window: Math.max(0.08, 0.28 - w * 0.015), // align threshold softness
    perWave: 5,
    decoyChance: Math.min(0.45, 0.05 * w),
  };
}

function perfectBand(w){
  return Math.max(0.92, 0.985 - w * 0.004);
}
function goodBand(w){
  return Math.max(0.78, 0.92 - w * 0.008);
}

function updateHud(){
  const need = waveParams(wave).perWave;
  const left = Math.max(0, need - snapsInWave);
  setText('scoreBox', String(score));
  setText('waveBox', `WAVE ${wave}`);
  setText('waveNext', left ? `NEXT ${left}` : 'BOSS?' );
  const wn = $('waveNext');
  if (wn) wn.textContent = `→ ${left} SNAP${left===1?'':'S'}`;
  setText('lives', '● '.repeat(lives).trim() || '○');
  const fill = $('meterFill');
  if (fill) fill.style.width = `${Math.floor(align * 100)}%`;
  const btn = $('snapBtn');
  if (btn) {
    const hot = align >= goodBand(wave);
    const near = align >= 0.55 && !hot;
    btn.classList.toggle('hot', hot);
    btn.classList.toggle('near', near);
    // pulse faster as we approach sweet spot
    const t = Math.max(0, Math.min(1, (align - 0.4) / 0.6));
    const sec = 0.85 - t * 0.55; // 0.85s → 0.3s
    btn.style.setProperty('--snap-pulse', `${sec.toFixed(2)}s`);
  }
  const heatEl = $('heatBadge');
  if (heatEl) heatEl.classList.toggle('on', heatOn);
}

function flash(kind){
  const fx = $('fx');
  if (!fx) return;
  fx.classList.remove('flash','miss','flashPerfect');
  void fx.offsetWidth;
  fx.classList.add(kind === 'miss' ? 'miss' : kind === 'flashPerfect' ? 'flashPerfect' : 'flash');
}

function showCombo(label){
  const el = $('combo');
  if (!el) return;
  el.textContent = label;
  el.classList.add('show');
  clearTimeout(showCombo._t);
  showCombo._t = setTimeout(() => el.classList.remove('show'), 650);
}

function setHint(t){ setText('hint', t); }

async function boot(){
  const canvas = $('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.FogExp2(0x060814, 0.0014);

  camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.5, 1000);
  camera.position.set(0, 40, camDist);

  raycaster = new THREE.Raycaster();
  spacefx = createSpaceBackdrop(scene, { amber:AMBER, cold:COLD });
  scene.add(new THREE.HemisphereLight(COLD, AMBER, 0.5));
  sunLight = new THREE.PointLight(AMBER, 3.4, 560);
  scene.add(sunLight);
  scene.add(new THREE.DirectionalLight(COLD, 0.8));

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(40, 160, 96),
    new THREE.MeshBasicMaterial({ color:0x152238, transparent:true, opacity:0.2, side:THREE.DoubleSide, depthWrite:false })
  );
  ring.rotation.x = -Math.PI/2;
  scene.add(ring);

  // Aim guide line (sun → aim)
  const aimGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(80,0,0)]);
  const aimLine = new THREE.Line(aimGeo, new THREE.LineBasicMaterial({ color:AMBER, transparent:true, opacity:0.35 }));
  aimLine.name = 'aimLine';
  scene.add(aimLine);
  window.__aimLine = aimLine;

  sun = await ASSET('./assets/dying_sun.js', { height:40 });
  sun.userData.isSun = true;
  scene.add(sun);
  sunGlow = createSunGlow(AMBER);
  scene.add(sunGlow);
  vfx = createVfx(scene, { amber:AMBER, cold:COLD });

  craft = await ASSET('./assets/cartographer_craft.js', { height:0.7 });
  place(craft, aimTheta, 95);
  scene.add(craft);

  for (const [file,h] of relicFiles) {
    const r = await ASSET(file, { height:h });
    r.visible = false;
    scene.add(r);
    relicPool.push(r);
  }

  bindInput(canvas);
  window.addEventListener('resize', onResize);

  window.__READY__ = true;
  window.__START__ = startRun;
  publishGame();

  $('load')?.classList.add('gone');
  requestAnimationFrame(frame);
}

function spawnTarget(){
  const p = waveParams(wave);
  // Boss every 5 waves, as first snap of that wave
  isBoss = (wave > 0 && wave % 5 === 0 && snapsInWave === 0);
  bossHits = 0;
  bossPhase = 0;
  targetObj = relicPool[Math.floor(Math.random()*relicPool.length)];
  targetObj.visible = true;
  targetObj.scale.setScalar(isBoss ? 3 : 1);
  const side = Math.random() < 0.5 ? 1 : -1;
  targetTheta = aimTheta + side * (0.9 + Math.random()*0.7);
  targetSpeed = (isBoss ? p.speed * 0.35 : p.speed) * side * -1;
  failing = false;
  targetAlive = true;
  targetMaxLife = isBoss
    ? Math.max(3.5, 6.5 - wave * 0.1)
    : Math.max(1.6, 4.2 - wave * 0.18);
  targetLife = targetMaxLife;
  place(targetObj, targetTheta, 70 + Math.random()*25, (Math.random()-0.5)*8);
  if (isBoss) {
    setHint('BOSS RELIC — 3 SNAPS');
    showCombo('BOSS');
    audio.setTension?.(1);
  } else {
    setHint(wave === 1 && snapsInWave === 0 ? 'Drag to aim · SNAP in the sweet spot' : 'ALIGN & SNAP');
  }
}

function failLife(reason){
  if (failing || over || !targetAlive) return;
  failing = true;
  lives -= 1;
  combo = 0;
  perfectStreak = 0;
  heatOn = false;
  const isTimeout = reason === 'TOO LATE';
  if (isTimeout && audio.stingTimeout) audio.stingTimeout();
  else audio.stingMiss();
  flash('miss');
  camShake = isTimeout ? 0.28 : 0.4;
  setHint(reason || 'MISS');
  updateHud();
  if (targetObj) { targetObj.visible = false; targetObj.scale.set(1,1,1); }
  targetAlive = false;
  isBoss = false;
  if (lives <= 0) endRun();
  else setTimeout(() => { failing = false; spawnTarget(); }, 500);
}

function doSnap(){
  if (!started || over || state !== STATE.PLAY || !targetAlive) return;
  if (freezeFrames > 0) return;
  const perf = perfectBand(wave);
  const good = goodBand(wave);
  let grade = 'MISS';
  let pts = 0;

  // Boss: only the sweet-spot phase scores full; others partial
  if (isBoss) {
    bossHits += 1;
    if (align >= good) {
      grade = align >= perf ? 'PERFECT' : 'GOOD';
      pts = align >= perf ? 1000 : 500;
      if (align >= perf) { combo += 1; perfectStreak += 1; }
      else { perfectStreak = 0; }
    } else {
      grade = 'PARTIAL';
      pts = 100;
      perfectStreak = 0;
    }
    const heatMult = heatOn ? 2 : 1;
    const gained = Math.floor(pts * Math.max(1, combo) * (1 + (wave-1)*0.08) * heatMult);
    score += gained;
    bestCombo = Math.max(bestCombo, combo);
    audio.stingLock();
    if (vfx && targetObj) {
      vfx.shatterAt(targetObj.position.clone(), grade === 'PERFECT' ? GOOD : AMBER, grade === 'PARTIAL' ? 8 : 14, isBoss ? 0.65 : 1);
      vfx.lockBurst(targetObj.position.clone(), AMBER);
    }
    flash(grade === 'PERFECT' ? 'flashPerfect' : 'flash');
    camPunch = 0.3;
    showCombo(`${grade} +${gained}`);
    setHint(`BOSS ${bossHits}/3`);
    if (bossHits >= 3) {
      snapsInWave += 1;
      targetObj.visible = false;
      targetObj.scale.set(1,1,1);
      targetAlive = false;
      isBoss = false;
      maybeAdvanceWave();
      setTimeout(spawnTarget, 550);
    } else {
      // next boss phase: nudge angle and refresh life
      targetTheta += (Math.random() < 0.5 ? 1 : -1) * 0.55;
      targetLife = targetMaxLife;
      bossPhase = bossHits;
    }
    updateHud();
    updateHeat();
    return;
  }

  if (align >= perf) { grade = 'PERFECT'; pts = 1000; combo += 1; perfectStreak += 1; }
  else if (align >= good) { grade = 'GOOD'; pts = 500; combo += 1; perfectStreak = 0; }
  else if (align >= 0.55) { grade = 'OK'; pts = 200; combo = 0; perfectStreak = 0; }
  else {
    failLife('TOO EARLY / OFF');
    return;
  }

  updateHeat();
  const heatMult = heatOn ? 2 : 1;
  const mult = Math.max(1, combo);
  const gained = Math.floor(pts * mult * (1 + (wave-1)*0.08) * heatMult);
  score += gained;
  bestCombo = Math.max(bestCombo, combo);
  snapsInWave += 1;

  audio.stingLock();
  const pos = targetObj.position.clone();
  if (grade === 'PERFECT') {
    freezeFrames = 3;
    flash('flashPerfect');
    camPunch = 0.3;
    if (vfx) vfx.shatterAt(pos, GOOD, 22, 1.15);
  } else {
    flash('flash');
    camPunch = 0.18;
    if (vfx) vfx.shatterAt(pos, AMBER, 12, 0.9);
  }
  if (vfx) {
    vfx.lockBurst(pos, grade === 'PERFECT' ? GOOD : AMBER);
    vfx.pulseAt(new THREE.Vector3(), COLD);
  }
  showCombo(`${grade}${combo>1?` x${combo}`:''}${heatOn?' HEAT':''}`);
  setHint(`+${gained}`);

  targetObj.visible = false;
  targetObj.scale.set(1,1,1);
  targetAlive = false;
  updateHud();
  maybeAdvanceWave();
  setTimeout(spawnTarget, grade === 'PERFECT' ? 480 : 400);
}

function updateHeat(){
  if (perfectStreak >= 3) {
    if (!heatOn) showCombo('HEAT x2');
    heatOn = true;
  } else {
    heatOn = false;
  }
  if (craft) {
    craft.traverse((n) => {
      if (n.isMesh && n.material && n.material.emissive) {
        n.material.emissive = new THREE.Color(heatOn ? AMBER : 0x000000);
        n.material.emissiveIntensity = heatOn ? 0.55 : 0;
      }
    });
  }
}

function maybeAdvanceWave(){
  const need = waveParams(wave).perWave;
  if (snapsInWave >= need) {
    wave += 1;
    snapsInWave = 0;
    setHint(`WAVE ${wave}`);
    showCombo(`WAVE ${wave}`);
  }
}

function startRun(){
  if (started && !over && state === STATE.PLAY) return;
  score = 0; wave = 1; lives = 3; combo = 0; bestCombo = 0; snapsInWave = 0; perfectStreak = 0; heatOn = false;
  playElapsed = 0; over = false; started = true; state = STATE.PLAY;
  zoom = 1; camDist = 120;
  $('start')?.classList.remove('on');
  $('board')?.classList.remove('on');
  $('over')?.classList.remove('on');
  $('hud')?.classList.add('on');
  updateHud();
  audio.start();
  spawnTarget();
}

function endRun(){
  over = true;
  state = STATE.OVER;
  $('hud')?.classList.remove('on');
  $('over')?.classList.add('on');
  setText('overSub', `Score ${score} · Wave ${wave} · Best combo x${bestCombo}`);
  const nameIn = $('nameIn');
  if (nameIn && !nameIn.value) nameIn.value = (localStorage.getItem('syzygy_tag') || '').slice(0,12);
  publishGame();
}

function onResize(){
  if (!renderer||!camera) return;
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

function ptrPos(e, id){
  if (e.touches) {
    for (const t of e.touches) if (t.identifier === id) return {x:t.clientX,y:t.clientY};
  }
  return {x:e.clientX, y:e.clientY};
}

function bindInput(canvas){
  const down = (e) => {
    e.preventDefault();
    if (e.pointerId != null) {
      pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
      try { canvas.setPointerCapture(e.pointerId); } catch(_){}
    }
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinchStartDist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
      pinchStartZoom = zoom;
      dragging = false;
      return;
    }
    if (!started || over) return;
    dragging = true;
    lastPtr = {x:e.clientX,y:e.clientY};
  };
  const move = (e) => {
    e.preventDefault();
    if (e.pointerId != null && pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
    }
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const d = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
      if (pinchStartDist > 0) {
        zoom = THREE.MathUtils.clamp(pinchStartZoom * (pinchStartDist / d), 0.55, 1.85);
        camDist = 70 + zoom * 70;
      }
      return;
    }
    if (!dragging || !started || over) return;
    const dx = e.clientX - lastPtr.x;
    lastPtr = {x:e.clientX,y:e.clientY};
    aimTheta += dx * 0.0055;
  };
  const up = (e) => {
    if (e.pointerId != null) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStartDist = 0;
    dragging = false;
  };

  canvas.addEventListener('pointerdown', down, {passive:false});
  window.addEventListener('pointermove', move, {passive:false});
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  // touch fallback pinch via touches
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); }, {passive:false});

  $('snapBtn')?.addEventListener('pointerdown', (e)=>{ e.preventDefault(); e.stopPropagation(); doSnap(); });
  $('btnStart')?.addEventListener('click', ()=> startRun());
  $('btnRetry')?.addEventListener('click', ()=> startRun());
  $('btnLb')?.addEventListener('click', ()=> openBoard('local'));
  $('btnBack')?.addEventListener('click', ()=>{
    $('board')?.classList.remove('on');
    $('start')?.classList.add('on');
  });
  $('tabLocal')?.addEventListener('click', ()=> renderBoard(loadLocal(), 'LOCAL'));
  $('tabGlobal')?.addEventListener('click', async ()=>{
    $('lb').innerHTML = '<em>loading global…</em>';
    try { renderBoard(await fetchGlobal(), 'GLOBAL'); }
    catch { $('lb').innerHTML = '<em>Global unreachable — try later</em>'; }
  });
  $('btnSubmit')?.addEventListener('click', async ()=>{
    const name = ($('nameIn')?.value || 'ANON').trim().slice(0,12) || 'ANON';
    localStorage.setItem('syzygy_tag', name);
    saveLocal(name, score, wave);
    $('btnSubmit').textContent = 'SAVING…';
    try {
      await submitGlobal(name, score, playElapsed);
      $('btnSubmit').textContent = 'SAVED ✓';
    } catch (err) {
      console.warn(err);
      $('btnSubmit').textContent = 'LOCAL SAVED';
    }
  });
}

function openBoard(which){
  $('start')?.classList.remove('on');
  $('board')?.classList.add('on');
  if (which==='global') $('tabGlobal')?.click();
  else renderBoard(loadLocal(), 'LOCAL');
}

function renderBoard(rows, title){
  const lb = $('lb');
  if (!lb) return;
  if (!rows.length) { lb.innerHTML = `<em>No ${title.toLowerCase()} scores yet</em>`; return; }
  lb.innerHTML = `<table>${rows.slice(0,15).map((r,i)=>
    `<tr><td>${i+1}. ${escapeHtml(r.name)}</td><td>${r.score}</td></tr>`
  ).join('')}</table>`;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function publishGame(){
  const info = renderer ? renderer.info.render : {calls:0,triangles:0};
  window.__GAME__ = {
    pos: craft ? [craft.position.x, craft.position.z] : [0,0],
    fps, speed: Math.abs(targetSpeed)*40, score, over,
    draws: info.calls, tris: info.triangles, state, wave, lives,
  };
}

function frame(now){
  const raw = (now-lastT)/1000;
  fps = 1/(raw||0.016);
  let dt = Math.min(0.05, Math.max(0.001, raw));
  lastT = now;
  clockT += dt;

  // Perfect SNAP freeze: hold 3 frames
  if (freezeFrames > 0) {
    freezeFrames -= 1;
    renderer.render(scene, camera);
    publishGame();
    requestAnimationFrame(frame);
    return;
  }

  if (spacefx) spacefx.update(dt, clockT);

  if (started && !over) {
    playElapsed += dt;
    audio.setTension(Math.min(1, wave/12));
    audio.setWaveLayer?.(wave);

    if (targetAlive && targetObj) {
      targetTheta += targetSpeed * dt;
      const r = isBoss ? 88 : 78;
      place(targetObj, targetTheta, r, targetObj.position.y);
      if (isBoss) targetObj.scale.setScalar(3);
      targetLife -= dt;
      if (targetLife <= 0) failLife('TOO LATE');
    }

    if (targetAlive) {
      let d = Math.abs(Math.atan2(Math.sin(targetTheta-aimTheta), Math.cos(targetTheta-aimTheta)));
      const soft = waveParams(wave).window + 0.25;
      align = Math.max(0, 1 - d / soft);
      // near-miss sparks band
      if (align >= 0.45 && align < 0.55 && vfx && targetObj && Math.random() < dt * 14) {
        vfx.nearMissBurst(targetObj.position);
      }
    } else {
      align = 0;
    }
    updateHud();
  }

  place(craft, aimTheta, 95);

  const aimLine = window.__aimLine;
  if (aimLine) {
    const end = new THREE.Vector3(Math.cos(aimTheta)*160, 0, Math.sin(aimTheta)*160);
    aimLine.geometry.setFromPoints([new THREE.Vector3(0,0,0), end]);
  }

  if (vfx) vfx.update(dt, { craftPos: craft?.position, speed: Math.abs(targetSpeed)*50, alignT: align, sunScale:1 });

  if (camera) {
    const target = new THREE.Vector3(Math.cos(aimTheta)*40, 18, Math.sin(aimTheta)*40);
    let dist = camDist;
    // punch: breathe out then back in 0.3s
    if (camPunch > 0) {
      camPunch = Math.max(0, camPunch - dt);
      const u = 1 - camPunch / 0.3;
      const punch = Math.sin(u * Math.PI) * 14;
      dist += punch;
    }
    const camGoal = new THREE.Vector3(
      Math.cos(aimTheta+0.9)*dist,
      28 + (1.2-zoom)*10,
      Math.sin(aimTheta+0.9)*dist
    );
    if (camShake > 0) {
      camShake = Math.max(0, camShake - dt);
      camGoal.x += (Math.random()-0.5) * 3.5 * camShake;
      camGoal.y += (Math.random()-0.5) * 3.5 * camShake;
    }
    camera.position.lerp(camGoal, 1-Math.exp(-3*dt));
    camera.lookAt(target.x*0.2, 4, target.z*0.2);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 48 + zoom*10, 0.1);
    camera.updateProjectionMatrix();
  }

  if (sun) sun.rotation.y += dt*0.05;
  if (sunLight) sunLight.intensity = 2.6 + Math.sin(clockT*2)*0.3;

  renderer.render(scene, camera);
  publishGame();
  requestAnimationFrame(frame);
}

boot().catch((err)=>{
  console.error(err);
  setText('loadmsg', String(err.message||err));
});
