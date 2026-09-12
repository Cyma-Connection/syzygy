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
  let alignOsc, alignGain;

  // Audible on tiny speakers: A3 and up
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17]; // minor-ish / space
  const ROOT = 220; // A3

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    music = ctx.createGain();
    music.gain.value = 0.85;
    music.connect(master);

    sfx = ctx.createGain();
    sfx.gain.value = 1.0;
    sfx.connect(master);

    bassGain = ctx.createGain();
    bassGain.gain.value = 0.22;
    bassGain.connect(music);

    padGain = ctx.createGain();
    padGain.gain.value = 0.28;
    padGain.connect(music);

    leadGain = ctx.createGain();
    leadGain.gain.value = 0.32;
    leadGain.connect(music);

    // Continuous pads in MIDRANGE (phone-audible) — sine/triangle only, no noise
    const padSpecs = [
      [ROOT, 'sine', 0.2],
      [ROOT * 1.5, 'sine', 0.14],       // fifth
      [ROOT * 2, 'triangle', 0.1],      // octave
      [ROOT * 2.5, 'sine', 0.07],       // high fifth
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
      gg.gain.value = 0.35;
      o.connect(gg);
      gg.connect(bassGain);
      o.start();
    }

    // Align cue (quiet until alignment rises)
    alignOsc = ctx.createOscillator();
    alignOsc.type = 'sine';
    alignOsc.frequency.value = 660;
    alignGain = ctx.createGain();
    alignGain.gain.value = 0.0001;
    alignOsc.connect(alignGain);
    alignGain.connect(sfx);
    alignOsc.start();
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
    // Clear midrange chord hit
    const deg = [0, 3, 7, 12];
    for (let i = 0; i < deg.length; i++) {
      const f = ROOT * Math.pow(2, deg[i] / 12);
      beep(f, when + i * 0.01, 0.55, i < 2 ? 'sine' : 'triangle', 0.12 - i * 0.02, leadGain);
    }
  }

  function melodyNote(when, deg, gain) {
    const f = ROOT * Math.pow(2, deg / 12);
    beep(f, when, 0.28, 'sine', gain, leadGain);
    // light octave sparkle
    beep(f * 2, when + 0.02, 0.2, 'triangle', gain * 0.35, leadGain);
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
    beep(ROOT / 2, t0 + beat, 0.2, 'sine', 0.1, bassGain);
    beep(ROOT / 2, t0 + beat * 3, 0.2, 'sine', 0.08, bassGain);

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

  /** Call from PLAY / TAP / SNAP — must stay sync (no await before resume). */
  function start() {
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
      beep(523.25, t + 0.05, 0.15, 'sine', 0.35, sfx); // C5
      beep(659.25, t + 0.12, 0.2, 'sine', 0.28, sfx);  // E5
      beep(783.99, t + 0.22, 0.28, 'sine', 0.22, sfx); // G5
    }
    startLoop();
  }

  function setWave(w) {
    waveLayer = Math.max(1, w | 0);
    if (!padGain || !ctx) return;
    const open = Math.min(1, (waveLayer - 1) / 6);
    leadGain.gain.setTargetAtTime(0.32 + open * 0.12, ctx.currentTime, 0.4);
    padGain.gain.setTargetAtTime(0.28 + open * 0.08, ctx.currentTime, 0.4);
  }
  function setWaveLayer(w) { setWave(w); }

  function setOrbitSpeed(norm) {
    speedNorm = Math.max(0.2, Math.min(2.2, norm));
    // gently brighten pads with speed (still midrange)
    if (!ctx || !padOsc.length) return;
    const t = ctx.currentTime;
    const lift = 1 + Math.min(0.35, (speedNorm - 0.3) * 0.2);
    for (const p of padOsc) {
      p.o.frequency.setTargetAtTime(p.base * lift, t, 0.5);
    }
  }
  function setTension(v) {
    setOrbitSpeed(0.35 + Math.max(0, Math.min(1, v)) * 1.2);
  }

  function setAlign(level) {
    if (!ctx || !alignGain) return;
    const a = Math.max(0, Math.min(1, level));
    alignGain.gain.setTargetAtTime(0.0001 + a * a * 0.12, ctx.currentTime, 0.05);
    alignOsc.frequency.setTargetAtTime(550 + a * 400, ctx.currentTime, 0.08);
  }
  function setAlignTone(level) { setAlign(level); }

  function toggleMute() {
    muted = !muted;
    if (!master || !ctx) return muted;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(muted ? 0.0001 : 1.0, t);
    if (muted) stopLoop();
    else if (started) startLoop();
    return muted;
  }

  function stingPerfect() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(523.25, t, 0.2, 'sine', 0.4, sfx);
    beep(659.25, t + 0.06, 0.22, 'sine', 0.32, sfx);
    beep(783.99, t + 0.12, 0.28, 'sine', 0.26, sfx);
    beep(1046.5, t + 0.2, 0.35, 'triangle', 0.18, sfx);
  }
  function stingGood() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(392, t, 0.2, 'sine', 0.35, sfx);
    beep(493.88, t + 0.08, 0.25, 'sine', 0.28, sfx);
  }
  function stingOk() {
    if (!ctx || muted) return;
    beep(349.23, ctx.currentTime, 0.22, 'sine', 0.3, sfx);
  }
  function stingMiss() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(180, t, 0.25, 'triangle', 0.35, sfx);
    beep(120, t + 0.05, 0.35, 'sine', 0.3, sfx);
  }
  function stingDebris() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    beep(220, t, 0.18, 'square', 0.28, sfx);
    beep(90, t + 0.04, 0.4, 'sawtooth', 0.32, sfx);
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

  return {
    start,
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
    get muted() { return muted; },
    get ctxState() { return ctx ? ctx.state : 'none'; },
  };
}
