/**
 * SYZYGY ORBIT SNAP — procedural deep-space score.
 * Wide pads, slow progressions, crystalline echoes — infinity mood, not 2-note stress.
 * Jam: Web Audio only, no samples. Mute kills master.
 */
export function createSpaceAudio() {
  let ctx, master, musicBus, sfxBus, filter, started = false, muted = false;
  let bassGain, padGain, arpGain, airGain, speedGain, alignGain;
  let padFilter, speedOscA, speedOscB, speedFilter;
  let alignOsc, alignFilter;
  let orbitSpeedNorm = 0.35;
  let waveLayer = 1;
  let loopTimer = null;
  let phraseTimer = null;
  let phraseStep = 0;
  let bpm = 72; // slow cosmic pulse; accelerates gently with orbit
  const baseBpm = 72;

  // Dorian / space-ish degrees from root
  const PROGRESSIONS = [
    [0, 5, 7, 10, 12, 17, 19, 15],      // open void
    [0, 3, 7, 10, 14, 12, 19, 22],      // minor drift
    [0, 7, 12, 15, 19, 24, 17, 12],     // crystalline climb
    [0, 5, 10, 14, 17, 21, 19, 12],     // infinite drift
  ];

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    musicBus = ctx.createGain();
    musicBus.gain.value = 1.0;
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.22;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2800;
    filter.Q.value = 0.4;
    filter.connect(musicBus);
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);

    bassGain = ctx.createGain(); bassGain.gain.value = 0.38; bassGain.connect(filter);
    padGain = ctx.createGain(); padGain.gain.value = 0.28; padGain.connect(filter);
    arpGain = ctx.createGain(); arpGain.gain.value = 0.12; arpGain.connect(filter);
    airGain = ctx.createGain(); airGain.gain.value = 0.08; airGain.connect(musicBus);
    speedGain = ctx.createGain(); speedGain.gain.value = 0.035; speedGain.connect(filter);
    alignGain = ctx.createGain(); alignGain.gain.value = 0.0001; alignGain.connect(sfxBus);

    // Sub drone floor (C1-ish family) — infinity under everything
    for (const [f, g, type] of [[32.7, 0.09, 'sine'], [49, 0.05, 'sine'], [65.4, 0.035, 'triangle']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.value = g;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 140;
      o.connect(lp); lp.connect(gg); gg.connect(bassGain);
      o.start();
    }

    // Wide evolving pads — 5ths + 9ths, long breath
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.Q.value = 0.7;
    padFilter.connect(padGain);
    const padVoices = [
      [65.4, -4, 0.04, 'sawtooth'],
      [98, 5, 0.032, 'sawtooth'],
      [130.8, -6, 0.028, 'triangle'],
      [196, 4, 0.02, 'triangle'],
      [261.6, -3, 0.012, 'sine'],
      [392, 6, 0.008, 'sine'],
    ];
    for (const [f, det, g, type] of padVoices) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f + det;
      const gg = ctx.createGain();
      gg.gain.value = g;
      o.connect(gg); gg.connect(padFilter);
      o.start();
    }
    // slow pad brightness LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.045;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 380;
    lfo.connect(lfoG);
    lfoG.connect(padFilter.frequency);
    lfo.start();

    // Soft space air (filtered noise bed)
    {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = 0.55;
      src.connect(bp); bp.connect(g); g.connect(airGain);
      src.start();
    }

    // Gentle speed shimmer (not alarm)
    speedOscA = ctx.createOscillator();
    speedOscA.type = 'sine';
    speedOscA.frequency.value = 110;
    speedOscB = ctx.createOscillator();
    speedOscB.type = 'triangle';
    speedOscB.frequency.value = 165;
    speedFilter = ctx.createBiquadFilter();
    speedFilter.type = 'lowpass';
    speedFilter.frequency.value = 600;
    const sm = ctx.createGain();
    sm.gain.value = 0.5;
    speedOscA.connect(sm); speedOscB.connect(sm);
    sm.connect(speedFilter); speedFilter.connect(speedGain);
    speedOscA.start(); speedOscB.start();

    // Align cue (soft)
    alignOsc = ctx.createOscillator();
    alignOsc.type = 'sine';
    alignOsc.frequency.value = 420;
    alignFilter = ctx.createBiquadFilter();
    alignFilter.type = 'lowpass';
    alignFilter.frequency.value = 900;
    alignOsc.connect(alignFilter); alignFilter.connect(alignGain);
    alignOsc.start();
  }

  function tone(dest, freq, t, dur, type, gain = 0.08) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.08, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  /** Soft cosmic pulse (not a club kick) */
  function pulse(t) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(55, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + 0.6);
  }

  function echoNote(freq, t, gain = 0.045) {
    // primary + two delayed ghosts = depth / infinity
    tone(arpGain, freq, t, 0.55, 'sine', gain);
    tone(arpGain, freq * 0.997, t + 0.22, 0.7, 'triangle', gain * 0.45);
    tone(arpGain, freq * 1.5, t + 0.48, 0.9, 'sine', gain * 0.22);
  }

  function schedulePhrase() {
    if (!ctx || muted || !started) return;
    const t0 = ctx.currentTime + 0.02;
    const beat = 60 / bpm;
    const prog = PROGRESSIONS[Math.min(3, Math.floor((orbitSpeedNorm - 0.2) * 2.2))];
    const root = 110 * Math.pow(2, Math.min(0.55, (orbitSpeedNorm - 0.25) * 0.25)); // A2-ish, rises gently

    // soft pulse on 1 and 3
    pulse(t0);
    pulse(t0 + beat * 2);

    // chord pad swell every phrase (held fifths)
    const chordDegs = [prog[0], prog[2], prog[4]];
    for (const deg of chordDegs) {
      const f = root * Math.pow(2, deg / 12);
      tone(padGain, f, t0, beat * 3.6, 'triangle', 0.035);
    }

    // melodic constellation — 6–10 notes across the phrase, not a 2-note hammer
    const density = 6 + Math.floor(Math.min(4, orbitSpeedNorm * 2.5));
    for (let i = 0; i < density; i++) {
      const deg = prog[(phraseStep + i * 3) % prog.length];
      const f = root * Math.pow(2, deg / 12);
      const when = t0 + (i / density) * beat * 3.8 + (i % 2) * 0.04;
      const g = 0.028 + (i % 3) * 0.008;
      echoNote(f, when, g);
      // occasional high sparkle
      if (i % 4 === 2 && waveLayer >= 2) {
        echoNote(f * 2, when + 0.12, g * 0.35);
      }
    }
    phraseStep = (phraseStep + 1) % 64;
  }

  function startLoop() {
    stopLoop();
    const tick = () => {
      schedulePhrase();
      const ms = (60 / bpm) * 4 * 1000; // 4-beat phrase
      phraseTimer = setTimeout(tick, ms);
    };
    tick();
  }

  function stopLoop() {
    if (phraseTimer) { clearTimeout(phraseTimer); phraseTimer = null; }
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  }

  async function start() {
    ensure();
    if (ctx.state === 'suspended') await ctx.resume();
    if (started) return;
    started = true;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 0.62, t + 1.2);
    startLoop();
  }

  function setWave(w) {
    waveLayer = Math.max(1, w | 0);
    if (!ctx) return;
    const t = ctx.currentTime;
    // open the sky a bit as waves rise — still ambient
    const open = Math.min(1, (waveLayer - 1) / 8);
    arpGain.gain.setTargetAtTime(0.10 + open * 0.08, t, 0.5);
    airGain.gain.setTargetAtTime(0.07 + open * 0.05, t, 0.5);
    filter.frequency.setTargetAtTime(2400 + open * 1200, t, 0.8);
  }

  function setOrbitSpeed(norm) {
    orbitSpeedNorm = Math.max(0.15, Math.min(2.2, norm));
    bpm = baseBpm + Math.min(36, (orbitSpeedNorm - 0.3) * 28); // 72 → ~108, never frantic
    if (!ctx || !speedOscA) return;
    const t = ctx.currentTime;
    const f = 90 + orbitSpeedNorm * 55;
    speedOscA.frequency.setTargetAtTime(f, t, 0.4);
    speedOscB.frequency.setTargetAtTime(f * 1.5, t, 0.4);
    speedFilter.frequency.setTargetAtTime(400 + orbitSpeedNorm * 500, t, 0.5);
    speedGain.gain.setTargetAtTime(0.02 + Math.min(0.06, orbitSpeedNorm * 0.03), t, 0.4);
  }

  function setAlign(level) {
    if (!ctx || !alignOsc) return;
    const a = Math.max(0, Math.min(1, level));
    const t = ctx.currentTime;
    alignGain.gain.setTargetAtTime(0.0001 + a * a * 0.045, t, 0.08);
    alignOsc.frequency.setTargetAtTime(380 + a * 220, t, 0.1);
  }

  function toggleMute() {
    muted = !muted;
    if (!master) return muted;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(muted ? 0.0001 : 0.62, t, 0.05);
    return muted;
  }

  function stingPerfect() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    echoNote(523.25, t, 0.06);
    echoNote(659.25, t + 0.08, 0.04);
    echoNote(783.99, t + 0.16, 0.03);
  }
  function stingGood() {
    if (!ctx || muted) return;
    echoNote(392, ctx.currentTime, 0.05);
    echoNote(494, ctx.currentTime + 0.1, 0.035);
  }
  function stingOk() {
    if (!ctx || muted) return;
    echoNote(329.6, ctx.currentTime, 0.04);
  }
  function stingMiss() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    tone(sfxBus, 140, t, 0.35, 'sawtooth', 0.06);
    tone(sfxBus, 90, t + 0.05, 0.4, 'sine', 0.05);
  }
  function stingDebris() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    tone(sfxBus, 180, t, 0.25, 'square', 0.05);
    tone(sfxBus, 70, t + 0.04, 0.45, 'sawtooth', 0.07);
  }
  function stingWave() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    echoNote(220, t, 0.05);
    echoNote(330, t + 0.15, 0.04);
    echoNote(440, t + 0.3, 0.035);
    echoNote(660, t + 0.5, 0.025);
  }
  function stingLock() {
    if (!ctx || muted) return;
    echoNote(440, ctx.currentTime, 0.05);
    echoNote(554, ctx.currentTime + 0.12, 0.04);
  }
  function stingBoom() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    tone(sfxBus, 60, t, 0.9, 'sine', 0.14);
    tone(sfxBus, 40, t + 0.05, 1.1, 'triangle', 0.1);
    tone(sfxBus, 120, t + 0.1, 0.5, 'sawtooth', 0.06);
  }

  // aliases used by main
  function setTension(v) {
    // map tension 0..1 into orbit/wave openness
    setOrbitSpeed(0.3 + Math.max(0, Math.min(1, v)) * 1.4);
  }
  function setWaveLayer(w) { setWave(w); }
  function setAlignTone(level) { setAlign(level); }
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
  };
}
