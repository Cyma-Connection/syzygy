/**
 * SYZYGY — procedural deep-space audio.
 * CRITICAL: resume AudioContext SYNCHRONOUSLY on the PLAY click (no await),
 * or mobile browsers stay silent forever.
 */
export function createSpaceAudio() {
  let ctx, master, musicBus, sfxBus, filter;
  let started = false, muted = false;
  let bassGain, padGain, arpGain, airGain, speedGain, alignGain;
  let padFilter, speedOscA, speedOscB, speedFilter, alignOsc;
  let orbitSpeedNorm = 0.35;
  let waveLayer = 1;
  let phraseTimer = null;
  let phraseStep = 0;
  let bpm = 78;
  const baseBpm = 78;

  const PROGRESSIONS = [
    [0, 5, 7, 10, 12, 17, 19, 15],
    [0, 3, 7, 10, 14, 12, 19, 22],
    [0, 7, 12, 15, 19, 24, 17, 12],
    [0, 5, 10, 14, 17, 21, 19, 12],
  ];

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    musicBus = ctx.createGain();
    musicBus.gain.value = 1;
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55; // audible FX
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.35;
    filter.connect(musicBus);
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);

    bassGain = ctx.createGain(); bassGain.gain.value = 0.45; bassGain.connect(filter);
    padGain = ctx.createGain(); padGain.gain.value = 0.34; padGain.connect(filter);
    arpGain = ctx.createGain(); arpGain.gain.value = 0.2; arpGain.connect(filter);
    airGain = ctx.createGain(); airGain.gain.value = 0.12; airGain.connect(musicBus);
    speedGain = ctx.createGain(); speedGain.gain.value = 0.05; speedGain.connect(filter);
    alignGain = ctx.createGain(); alignGain.gain.value = 0.0001; alignGain.connect(sfxBus);

    for (const [f, g, type] of [[32.7, 0.12, 'sine'], [49, 0.07, 'sine'], [65.4, 0.05, 'triangle']]) {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f;
      const gg = ctx.createGain(); gg.gain.value = g;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
      o.connect(lp); lp.connect(gg); gg.connect(bassGain); o.start();
    }

    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = 1100; padFilter.Q.value = 0.65;
    padFilter.connect(padGain);
    for (const [f, det, g, type] of [
      [65.4, -4, 0.05, 'sawtooth'], [98, 5, 0.04, 'sawtooth'], [130.8, -6, 0.035, 'triangle'],
      [196, 4, 0.028, 'triangle'], [261.6, -3, 0.018, 'sine'], [392, 6, 0.012, 'sine'],
    ]) {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f + det;
      const gg = ctx.createGain(); gg.gain.value = g;
      o.connect(gg); gg.connect(padFilter); o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain(); lfoG.gain.value = 420;
    lfo.connect(lfoG); lfoG.connect(padFilter.frequency); lfo.start();

    {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.45;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.55;
      const g = ctx.createGain(); g.gain.value = 0.7;
      src.connect(bp); bp.connect(g); g.connect(airGain); src.start();
    }

    speedOscA = ctx.createOscillator(); speedOscA.type = 'sine'; speedOscA.frequency.value = 110;
    speedOscB = ctx.createOscillator(); speedOscB.type = 'triangle'; speedOscB.frequency.value = 165;
    speedFilter = ctx.createBiquadFilter(); speedFilter.type = 'lowpass'; speedFilter.frequency.value = 700;
    const sm = ctx.createGain(); sm.gain.value = 0.55;
    speedOscA.connect(sm); speedOscB.connect(sm); sm.connect(speedFilter); speedFilter.connect(speedGain);
    speedOscA.start(); speedOscB.start();

    alignOsc = ctx.createOscillator(); alignOsc.type = 'sine'; alignOsc.frequency.value = 420;
    const af = ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 1100;
    alignOsc.connect(af); af.connect(alignGain); alignOsc.start();
  }

  function tone(dest, freq, t, dur, type, gain = 0.1) {
    try {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(0.06, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (_) {}
  }

  function pulse(t) {
    tone(musicBus, 55, t, 0.5, 'sine', 0.11);
    tone(musicBus, 28, t + 0.02, 0.55, 'sine', 0.06);
  }

  function echoNote(freq, t, gain = 0.06) {
    tone(arpGain, freq, t, 0.5, 'sine', gain);
    tone(arpGain, freq * 0.997, t + 0.2, 0.65, 'triangle', gain * 0.5);
    tone(arpGain, freq * 1.5, t + 0.42, 0.8, 'sine', gain * 0.28);
  }

  function schedulePhrase() {
    if (!ctx || muted || !started) return;
    const t0 = ctx.currentTime + 0.01;
    const beat = 60 / bpm;
    const prog = PROGRESSIONS[Math.min(3, Math.floor((orbitSpeedNorm - 0.2) * 2.2))];
    const root = 110 * Math.pow(2, Math.min(0.5, (orbitSpeedNorm - 0.25) * 0.22));
    pulse(t0);
    pulse(t0 + beat * 2);
    for (const deg of [prog[0], prog[2], prog[4]]) {
      echoNote(root * Math.pow(2, deg / 12), t0, 0.04);
    }
    const density = 7 + Math.floor(Math.min(4, orbitSpeedNorm * 2.2));
    for (let i = 0; i < density; i++) {
      const deg = prog[(phraseStep + i * 3) % prog.length];
      const f = root * Math.pow(2, deg / 12);
      const when = t0 + (i / density) * beat * 3.6;
      echoNote(f, when, 0.035 + (i % 3) * 0.01);
      if (i % 4 === 2 && waveLayer >= 2) echoNote(f * 2, when + 0.1, 0.02);
    }
    phraseStep = (phraseStep + 1) % 64;
  }

  function startLoop() {
    stopLoop();
    const tick = () => {
      schedulePhrase();
      phraseTimer = setTimeout(tick, (60 / bpm) * 4 * 1000);
    };
    tick();
  }
  function stopLoop() {
    if (phraseTimer) { clearTimeout(phraseTimer); phraseTimer = null; }
  }

  /** Must run inside a user gesture — NO await before resume. */
  function start() {
    ensure();
    // Sync resume — keeps the click unlock on iOS/Android Chrome
    if (ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
    if (started) {
      // re-assert audible gain (retry after mute / bfcache)
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(muted ? 0.0001 : 0.75, t);
      return;
    }
    started = true;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.75, t + 0.35);
    // unlock beep so player hears audio is alive
    if (!muted) {
      tone(sfxBus, 440, t + 0.05, 0.12, 'sine', 0.12);
      tone(sfxBus, 660, t + 0.12, 0.18, 'sine', 0.08);
    }
    startLoop();
  }

  function setWave(w) {
    waveLayer = Math.max(1, w | 0);
    if (!ctx) return;
    const t = ctx.currentTime;
    const open = Math.min(1, (waveLayer - 1) / 8);
    arpGain.gain.setTargetAtTime(0.16 + open * 0.1, t, 0.4);
    airGain.gain.setTargetAtTime(0.1 + open * 0.06, t, 0.4);
    filter.frequency.setTargetAtTime(2600 + open * 1400, t, 0.6);
  }
  function setWaveLayer(w) { setWave(w); }

  function setOrbitSpeed(norm) {
    orbitSpeedNorm = Math.max(0.15, Math.min(2.2, norm));
    bpm = baseBpm + Math.min(32, (orbitSpeedNorm - 0.3) * 26);
    if (!ctx || !speedOscA) return;
    const t = ctx.currentTime;
    const f = 95 + orbitSpeedNorm * 50;
    speedOscA.frequency.setTargetAtTime(f, t, 0.35);
    speedOscB.frequency.setTargetAtTime(f * 1.5, t, 0.35);
    speedFilter.frequency.setTargetAtTime(450 + orbitSpeedNorm * 450, t, 0.4);
    speedGain.gain.setTargetAtTime(0.03 + Math.min(0.07, orbitSpeedNorm * 0.035), t, 0.35);
  }
  function setTension(v) { setOrbitSpeed(0.3 + Math.max(0, Math.min(1, v)) * 1.4); }

  function setAlign(level) {
    if (!ctx || !alignOsc) return;
    const a = Math.max(0, Math.min(1, level));
    const t = ctx.currentTime;
    alignGain.gain.setTargetAtTime(0.0001 + a * a * 0.08, t, 0.06);
    alignOsc.frequency.setTargetAtTime(400 + a * 260, t, 0.08);
  }
  function setAlignTone(level) { setAlign(level); }

  function toggleMute() {
    muted = !muted;
    if (!master || !ctx) return muted;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(muted ? 0.0001 : 0.75, t, 0.04);
    return muted;
  }

  function stingPerfect() {
    if (!ctx || muted) return; const t = ctx.currentTime;
    echoNote(523.25, t, 0.1); echoNote(659.25, t + 0.07, 0.07); echoNote(783.99, t + 0.14, 0.05);
  }
  function stingGood() {
    if (!ctx || muted) return; echoNote(392, ctx.currentTime, 0.09); echoNote(494, ctx.currentTime + 0.09, 0.06);
  }
  function stingOk() {
    if (!ctx || muted) return; echoNote(329.6, ctx.currentTime, 0.07);
  }
  function stingMiss() {
    if (!ctx || muted) return; const t = ctx.currentTime;
    tone(sfxBus, 150, t, 0.3, 'sawtooth', 0.12); tone(sfxBus, 80, t + 0.04, 0.35, 'sine', 0.1);
  }
  function stingDebris() {
    if (!ctx || muted) return; const t = ctx.currentTime;
    tone(sfxBus, 200, t, 0.22, 'square', 0.11); tone(sfxBus, 70, t + 0.03, 0.4, 'sawtooth', 0.14);
  }
  function stingWave() {
    if (!ctx || muted) return; const t = ctx.currentTime;
    echoNote(220, t, 0.08); echoNote(330, t + 0.12, 0.07); echoNote(440, t + 0.24, 0.06); echoNote(660, t + 0.4, 0.04);
  }
  function stingLock() {
    if (!ctx || muted) return; echoNote(440, ctx.currentTime, 0.09); echoNote(554, ctx.currentTime + 0.1, 0.07);
  }
  function stingBoom() {
    if (!ctx || muted) return; const t = ctx.currentTime;
    tone(sfxBus, 55, t, 1.0, 'sine', 0.22); tone(sfxBus, 35, t + 0.04, 1.2, 'triangle', 0.16); tone(sfxBus, 110, t + 0.08, 0.5, 'sawtooth', 0.1);
  }
  function stingAutoAlign() { stingLock(); }
  function stingExplosion() { stingBoom(); }

  return {
    start, setWave, setWaveLayer, setOrbitSpeed, setAlign, setAlignTone, setTension, toggleMute,
    stingPerfect, stingGood, stingOk, stingMiss, stingDebris, stingWave, stingLock, stingBoom,
    stingAutoAlign, stingExplosion,
    get muted() { return muted; },
    get ctxState() { return ctx ? ctx.state : 'none'; },
  };
}
