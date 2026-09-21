/**
 * SYZYGY audio — rebuilt for phone speakers.
 *
 * Why previous builds failed:
 * - Looping noise buffer = the "grésillement"
 * - Energy stuck in 32–130 Hz (inaudible on phones) → "no music"
 * - Too many stacked oscillators → hash / mask
 *
 * This version: NO noise. Midrange pads + clear arpeggio (220–880 Hz).
 * Loud SFX. Sync AudioContext.resume() on user gesture.
 */
export function createSpaceAudio() {
  let ctx = null;
  let master, music, sfx;
  let started = false;
  let muted = false;
  let padGain, bassGain, leadGain;
  let padOsc = [];
  let tickTimer = null;
  let step = 0;
  let waveLayer = 1;
  let speedNorm = 0.4;
  let bonusMode = false;
  let alignOsc, alignGain;
  let menuGain;
  let menuOsc = [];
  let menuWanted = false;

  // Audible on tiny speakers: A3 and up
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17]; // minor-ish / space
  const ROOT = 220; // A3 — transposed down as waves deepen (same intervals)
  let bassOsc = null;

  /** Same notes, lower register as the run gets intense. */
  function transposeSemis() {
    // Bonus: same motif, deeper (perfect fourth down), warmer — not brighter synth
    return bonusMode ? -5 : 0;
  }

  function rootHz() {
    return ROOT * Math.pow(2, transposeSemis() / 12);
  }

  function applyPadTranspose() {
    if (!ctx || !padOsc.length) return;
    const t = ctx.currentTime;
    const mul = Math.pow(2, transposeSemis() / 12);
    for (const p of padOsc) {
      p.o.frequency.setTargetAtTime(p.base * mul, t, bonusMode ? 0.08 : 0.35);
    }
    if (bassOsc) {
      bassOsc.frequency.setTargetAtTime((ROOT / 2) * mul, t, bonusMode ? 0.08 : 0.35);
    }
  }

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    music = ctx.createGain();
    music.gain.value = 0.95;
    music.connect(master);

    sfx = ctx.createGain();
    sfx.gain.value = 0.55; // quieter FX under music
    sfx.connect(master);

    bassGain = ctx.createGain();
    bassGain.gain.value = 0.08; // quiet continuous bed
    bassGain.connect(music);

    padGain = ctx.createGain();
    padGain.gain.value = 0.10; // quiet continuous pads
    padGain.connect(music);

    leadGain = ctx.createGain();
    leadGain.gain.value = 0.42; // melodic phrases louder than bed
    leadGain.connect(music);

    // Continuous pads in MIDRANGE (phone-audible) — sine/triangle only, no noise
    const padSpecs = [
      [ROOT, 'sine', 0.08],
      [ROOT * 1.5, 'sine', 0.05],       // fifth
      [ROOT * 2, 'triangle', 0.04],      // octave
      [ROOT * 2.5, 'sine', 0.025],       // high fifth
    ];
    for (const [f, type, g] of padSpecs) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.value = g;
      // gentle lowpass to soften, but keep cutoff high enough for phones
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      o.connect(lp);
      lp.connect(gg);
      gg.connect(padGain);
      o.start();
      padOsc.push({ o, gg, base: f });
    }

    // Soft bass at A2 (110) — supportive, not the only content
    {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = ROOT / 2;
      const gg = ctx.createGain();
      gg.gain.value = 0.18;
      o.connect(gg);
      gg.connect(bassGain);
      o.start();
      bassOsc = o;
    }

    // Soft align breath (gentle low sine + heavy LP — not a rising alarm)
    alignOsc = ctx.createOscillator();
    alignOsc.type = 'sine';
    alignOsc.frequency.value = 196; // G3 — warm, not piercing
    const alignLp = ctx.createBiquadFilter();
    alignLp.type = 'lowpass';
    alignLp.frequency.value = 480;
    alignLp.Q.value = 0.4;
    alignGain = ctx.createGain();
    alignGain.gain.value = 0.0001;
    alignOsc.connect(alignLp);
    alignLp.connect(alignGain);
    alignGain.connect(sfx);
    alignOsc.start();
    alignOsc._lp = alignLp;

    // Menu ambient bus — separate from game music; very soft lonely drone
    menuGain = ctx.createGain();
    menuGain.gain.value = 0.0001;
    menuGain.connect(master);

    // Phone-audible midrange (220–660 Hz) — bass alone was inaudible on mobile
    const menuSpecs = [
      [220, 'sine', 0.11],        // A3 bed
      [329.63, 'sine', 0.07],     // E4 soft fifth
      [440, 'triangle', 0.045],   // A4 air
      [554.37, 'sine', 0.02],     // C#5 sparse shimmer
    ];
    for (const [f, type, g] of menuSpecs) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.value = g;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2800;
      lp.Q.value = 0.3;
      o.connect(lp);
      lp.connect(gg);
      gg.connect(menuGain);
      o.start();
      menuOsc.push({ o, gg, base: f });
    }
    // Slow beat for lonely drift
    if (menuOsc.length >= 2) {
      menuOsc[1].o.frequency.value = menuSpecs[1][0] * 1.0025;
    }
  }

  function beep(freq, when, dur, type, gain, dest) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, when);
    const g = ctx.createGain();
    const peak = Math.max(0.001, gain);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.02);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest || sfx);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function chord(when) {
    const root = rootHz();
    const deg = [0, 3, 7, 12];
    for (let i = 0; i < deg.length; i++) {
      const f = root * Math.pow(2, deg[i] / 12);
      // Bonus: sine bed + soft saw on top voices (grave + a bit synth)
      const typ = bonusMode ? (i < 2 ? 'sine' : 'sawtooth') : (i < 2 ? 'sine' : 'triangle');
      const g = bonusMode ? (0.13 - i * 0.018) : (0.12 - i * 0.02);
      beep(f, when + i * 0.01, bonusMode ? 0.6 : 0.55, typ, g, leadGain);
    }
  }

  function melodyNote(when, deg, gain) {
    const root = rootHz();
    const f = root * Math.pow(2, deg / 12);
    // Normal: sine. Bonus: keep grave root + light saw edge (still deep, a bit more synth)
    const lead = bonusMode ? 'triangle' : 'sine';
    const spark = bonusMode ? 'sawtooth' : 'triangle';
    const g = bonusMode ? gain * 0.85 : gain;
    beep(f, when, bonusMode ? 0.32 : 0.28, lead, g, leadGain);
    beep(f * 2, when + 0.02, bonusMode ? 0.12 : 0.2, spark, gain * (bonusMode ? 0.16 : 0.35), leadGain);
  }

  function scheduleBar() {
    if (!ctx || !started || muted) return;
    const t0 = ctx.currentTime + 0.03;
    const beat = 60 / (88 + Math.min(28, speedNorm * 20)); // ~88–116 BPM

    // Downbeat chord — unmistakable music
    chord(t0);

    // Arpeggio across the bar (many notes, midrange)
    const motif = SCALE;
    const notes = 6 + Math.min(4, Math.floor(waveLayer));
    for (let i = 0; i < notes; i++) {
      const deg = motif[(step + i * 2) % motif.length];
      const when = t0 + (i + 1) * (beat * 0.45);
      melodyNote(when, deg, 0.14);
    }

    // Soft pulse on 2 and 4 (audible thump via mid sine, not sub)
    const pulse = rootHz() / 2;
    beep(pulse, t0 + beat, 0.2, 'sine', 0.1, bassGain);
    beep(pulse, t0 + beat * 3, 0.2, 'sine', 0.08, bassGain);

    step = (step + 1) % 32;
  }

  function startLoop() {
    stopLoop();
    const run = () => {
      scheduleBar();
      const ms = (60 / (88 + Math.min(28, speedNorm * 20))) * 4 * 1000;
      tickTimer = setTimeout(run, ms);
    };
    run();
  }

  function stopLoop() {
    if (tickTimer) {
      clearTimeout(tickTimer);
      tickTimer = null;
    }
  }

  function applyMenuLevels() {
    if (!ctx || started) return;
    const t = ctx.currentTime;
    // Duck game music bus so continuous pads stay silent until PLAY
    if (music) {
      music.gain.cancelScheduledValues(t);
      music.gain.setValueAtTime(Math.max(music.gain.value, 0.0001), t);
      music.gain.linearRampToValueAtTime(0.0001, t + 0.2);
    }
    if (master && !muted) {
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
      master.gain.linearRampToValueAtTime(1.0, t + 0.08);
    }
    if (menuGain) {
      const target = muted ? 0.0001 : 0.85;
      menuGain.gain.cancelScheduledValues(t);
      menuGain.gain.setValueAtTime(Math.max(menuGain.gain.value, 0.0001), t);
      menuGain.gain.linearRampToValueAtTime(target, t + 0.6);
    }
  }

  function startMenuAmbient() {
    ensure();
    if (started) return;
    menuWanted = true;
    // Sync levels inside the user-gesture stack (iOS), then again after resume
    applyMenuLevels();
    if (ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (started || !menuWanted) return;
          applyMenuLevels();
        }).catch(() => {});
      }
    }
  }

  function stopMenuAmbient() {
    menuWanted = false;
    if (!ctx || !menuGain) return;
    const t = ctx.currentTime;
    menuGain.gain.cancelScheduledValues(t);
    menuGain.gain.setValueAtTime(Math.max(menuGain.gain.value, 0.0001), t);
    menuGain.gain.linearRampToValueAtTime(0.0001, t + 0.75);
    // Restore game music bus for PLAY handoff
    if (music) {
      music.gain.cancelScheduledValues(t);
      music.gain.setValueAtTime(Math.max(music.gain.value, 0.0001), t);
      music.gain.linearRampToValueAtTime(0.95, t + 0.4);
    }
  }

  /** Call from PLAY / TAP / SNAP — must stay sync (no await before resume). */
  function start() {
    stopMenuAmbient();
    ensure();
    if (ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    const t = ctx.currentTime;
    if (started) {
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(muted ? 0.0001 : 1.0, t);
      return;
    }
    started = true;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : 1.0, t + 0.15);

    // Loud unlock cue — if you don't hear this, audio is still blocked
    if (!muted) {
      beep(523.25, t + 0.05, 0.15, 'sine', 0.22, sfx); // C5
      beep(659.25, t + 0.12, 0.2, 'sine', 0.18, sfx);  // E5
      beep(783.99, t + 0.22, 0.28, 'sine', 0.14, sfx); // G5
    }
    startLoop();
  }

  function setWave(w) {
    waveLayer = Math.max(1, w | 0);
    if (!padGain || !ctx) return;
    const open = Math.min(1, (waveLayer - 1) / 6);
    leadGain.gain.setTargetAtTime(0.42 + open * 0.1, ctx.currentTime, 0.4);
    padGain.gain.setTargetAtTime(0.10 + open * 0.04, ctx.currentTime, 0.4);
    applyPadTranspose();
  }
  function setWaveLayer(w) { setWave(w); }

  function setOrbitSpeed(norm) {
    speedNorm = Math.max(0.2, Math.min(2.2, norm));
    // Same melody, darker with speed/waves (no upward lift)
    applyPadTranspose();
  }
  function setTension(v) {
    setOrbitSpeed(0.35 + Math.max(0, Math.min(1, v)) * 1.2);
  }

  function setAlign(level) {
    if (!ctx || !alignGain) return;
    const a = Math.max(0, Math.min(1, level));
    const t = ctx.currentTime;
    // Soft swell only — tiny pitch lift, never a scream
    alignGain.gain.setTargetAtTime(0.0001 + a * a * 0.028, t, 0.18);
    alignOsc.frequency.setTargetAtTime(180 + a * 90, t, 0.25); // ~180–270 Hz
    if (alignOsc._lp) {
      alignOsc._lp.frequency.setTargetAtTime(360 + a * 200, t, 0.2);
    }
  }
  function setAlignTone(level) { setAlign(level); }

  function toggleMute() {
    muted = !muted;
    if (!master || !ctx) return muted;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(muted ? 0.0001 : 1.0, t);
    if (menuGain) {
      menuGain.gain.cancelScheduledValues(t);
      if (muted) {
        menuGain.gain.setValueAtTime(0.0001, t);
      } else if (!started && menuWanted) {
        menuGain.gain.setValueAtTime(0.0001, t);
        menuGain.gain.linearRampToValueAtTime(0.85, t + 0.6);
      }
    }
    if (muted) stopLoop();
    else if (started) startLoop();
    return muted;
  }

  function stingPerfect() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(523.25, t, 0.2, 'sine', 0.26, sfx);
    beep(659.25, t + 0.06, 0.22, 'sine', 0.2, sfx);
    beep(783.99, t + 0.12, 0.28, 'sine', 0.16, sfx);
    beep(1046.5, t + 0.2, 0.35, 'triangle', 0.1, sfx);
  }
  function stingGood() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(392, t, 0.2, 'sine', 0.22, sfx);
    beep(493.88, t + 0.08, 0.25, 'sine', 0.18, sfx);
  }
  function stingOk() {
    if (!ctx || muted) return;
    beep(349.23, ctx.currentTime, 0.22, 'sine', 0.18, sfx);
  }
  function stingMiss() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(180, t, 0.25, 'triangle', 0.2, sfx);
    beep(120, t + 0.05, 0.35, 'sine', 0.18, sfx);
  }
  function stingDebris() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(220, t, 0.18, 'square', 0.16, sfx);
    beep(90, t + 0.04, 0.4, 'sawtooth', 0.18, sfx);
  }
  function stingWave() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    [261.63, 329.63, 392, 523.25].forEach((f, i) => beep(f, t + i * 0.1, 0.3, 'sine', 0.28 - i * 0.04, sfx));
  }
  function stingLock() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(440, t, 0.2, 'sine', 0.32, sfx);
    beep(554.37, t + 0.1, 0.28, 'sine', 0.28, sfx);
  }
  function stingBoom() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(80, t, 0.8, 'sine', 0.45, sfx);
    beep(55, t + 0.05, 1.0, 'triangle', 0.35, sfx);
    beep(160, t + 0.1, 0.45, 'sawtooth', 0.22, sfx);
  }
  function stingAutoAlign() { stingLock(); }
  function stingExplosion() { stingBoom(); }

  /** Same song, deeper/warmer tonality during bonus — restart bar immediately. */
  function setBonusMode(on) {
    bonusMode = !!on;
    ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    const t = ctx.currentTime;
    applyPadTranspose();
    if (leadGain) leadGain.gain.setTargetAtTime(bonusMode ? 0.38 : 0.42, t, 0.05);
    if (padGain) padGain.gain.setTargetAtTime(bonusMode ? 0.16 : 0.10, t, 0.05);
    if (bassGain) bassGain.gain.setTargetAtTime(bonusMode ? 0.14 : 0.08, t, 0.05);
    if (bassOsc) bassOsc.type = 'sine';
    // Hear the new tonality NOW — don't wait for the next scheduled bar
    if (started && !muted) {
      stopLoop();
      startLoop();
    }
  }

  return {
    start,
    startMenuAmbient,
    stopMenuAmbient,
    setWave,
    setWaveLayer,
    setOrbitSpeed,
    setAlign,
    setAlignTone,
    setTension,
    toggleMute,
    stingPerfect,
    stingGood,
    stingOk,
    stingMiss,
    stingDebris,
    stingWave,
    stingLock,
    stingBoom,
    stingAutoAlign,
    stingExplosion,
    setBonusMode,
    get muted() { return muted; },
    get ctxState() { return ctx ? ctx.state : 'none'; },
    transposeSemis,
    rootHz,
    getTransposeSemis: transposeSemis,
    getRootHz: rootHz,
  };
}
