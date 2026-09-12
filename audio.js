/** SYZYGY ORBIT SNAP — 118 BPM futuristic bed + speed bed + align tone. Procedural only. */
export function createSpaceAudio() {
  let ctx, master, filter, started = false, muted = false;
  let timers = [];
  let step = 0;
  let waveLayer = 1;
  let bassGain, hatGain, arpGain, leadGain, padGain, speedGain, alignGain;
  let speedOscA, speedOscB, speedLfo;
  let alignOsc, alignFilter;
  let orbitSpeedNorm = 0.5;
  let alignLevel = 0;
  let melodyTimer = null;
  let melodyStep = 0;
  let melodyIntervalMs = 220;
  const bpm = 118;
  const beat = 60 / bpm;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.7;
    filter.connect(master);
    master.connect(ctx.destination);

    bassGain = ctx.createGain(); bassGain.gain.value = 0.18; bassGain.connect(filter);
    hatGain = ctx.createGain(); hatGain.gain.value = 0; hatGain.connect(master);
    arpGain = ctx.createGain(); arpGain.gain.value = 0; arpGain.connect(filter);
    leadGain = ctx.createGain(); leadGain.gain.value = 0; leadGain.connect(filter);
    padGain = ctx.createGain(); padGain.gain.value = 0.08; padGain.connect(filter);
    speedGain = ctx.createGain(); speedGain.gain.value = 0.04; speedGain.connect(filter);
    alignGain = ctx.createGain(); alignGain.gain.value = 0.0001; alignGain.connect(master);

    // dark fifth drone
    for (const f of [49, 73.5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.045;
      o.connect(g);
      g.connect(bassGain);
      o.start();
    }

    // soft evolving pad (detuned pair)
    for (const [f, det] of [[110, -4], [165, 3], [220, -2]]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f + det;
      const g = ctx.createGain();
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(padGain);
      o.start();
    }

    // continuous speed bed — rises with orbital speed
    speedOscA = ctx.createOscillator();
    speedOscA.type = 'sawtooth';
    speedOscA.frequency.value = 55;
    speedOscB = ctx.createOscillator();
    speedOscB.type = 'square';
    speedOscB.frequency.value = 82.5;
    const spMix = ctx.createGain();
    spMix.gain.value = 0.5;
    const spFilter = ctx.createBiquadFilter();
    spFilter.type = 'bandpass';
    spFilter.frequency.value = 400;
    spFilter.Q.value = 2.5;
    speedOscA.connect(spMix);
    speedOscB.connect(spMix);
    spMix.connect(spFilter);
    spFilter.connect(speedGain);
    speedOscA.start();
    speedOscB.start();
    speedLfo = { filter: spFilter, a: speedOscA, b: speedOscB };

    // rising align tone (felt before SNAP)
    alignOsc = ctx.createOscillator();
    alignOsc.type = 'sine';
    alignOsc.frequency.value = 320;
    alignFilter = ctx.createBiquadFilter();
    alignFilter.type = 'lowpass';
    alignFilter.frequency.value = 900;
    alignOsc.connect(alignFilter);
    alignFilter.connect(alignGain);
    alignOsc.start();
  }

  function tone(dest, freq, t, dur, type, gain = 0.1) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.28);
  }

  function hat(t, g = 0.04) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.028, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = g;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(hatGain);
    src.start(t);
  }

  function clap(t) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.07;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(t);
  }

  // continuous futuristic melodic line — densifies with orbital speed
  // minor / spacey motifs (procedural only)
  const melodyMotifs = [
    [0, 3, 7, 10, 12, 10, 7, 3],
    [0, 5, 7, 12, 15, 12, 7, 5],
    [0, 3, 8, 12, 10, 8, 5, 3],
    [0, 7, 12, 15, 19, 15, 12, 7],
  ];

  function melodyTick() {
    if (!ctx || muted || !started) {
      melodyStep++;
      return;
    }
    const t = ctx.currentTime;
    const motif = melodyMotifs[Math.min(3, Math.floor(orbitSpeedNorm))];
    const deg = motif[melodyStep % motif.length];
    // base rises with speed: ~185 Hz → ~370+ Hz
    const root = 185 * Math.pow(2, Math.min(1.05, (orbitSpeedNorm - 0.2) * 0.55));
    const f = root * Math.pow(2, deg / 12);
    const dens = Math.min(1, (orbitSpeedNorm - 0.25) / 1.6);
    const g = 0.038 + dens * 0.055;
    const dur = Math.max(0.07, melodyIntervalMs / 1000 * 0.72);
    tone(arpGain, f, t, dur, dens > 0.55 ? 'sawtooth' : 'triangle', g);
    // octave sparkle when fast
    if (dens > 0.45 && melodyStep % 2 === 0) {
      tone(leadGain, f * 2, t + 0.01, dur * 0.55, 'sine', 0.018 + dens * 0.02);
    }
    // densify: occasional fifth harmony at high speed
    if (dens > 0.7 && melodyStep % 4 === 1) {
      tone(arpGain, f * 1.5, t + 0.015, dur * 0.5, 'triangle', 0.022);
    }
    melodyStep++;
  }

  function rescheduleMelody() {
    if (melodyTimer) {
      clearInterval(melodyTimer);
      melodyTimer = null;
    }
    if (!started) return;
    // interval shrinks as orbit speeds up (slower bed → faster arp)
    const n = Math.max(0.2, Math.min(2.5, orbitSpeedNorm));
    melodyIntervalMs = Math.max(70, 280 - n * 95);
    melodyTimer = setInterval(melodyTick, melodyIntervalMs);
  }

  // futuristic 16-step bass motif
  const bassMotif = [55, 0, 55, 82.4, 41.2, 0, 55, 0, 55, 73.4, 0, 55, 110, 0, 49, 55];

  function scheduleLoop() {
    const tick = () => {
      if (!ctx || muted) {
        step++;
        return;
      }
      const t = ctx.currentTime;
      const n = step % 16;
      if (n % 4 === 0) kick(t);
      if (n === 4 || n === 12) clap(t);
      const bf = bassMotif[n];
      if (bf) tone(bassGain, bf, t, 0.26, 'square', 0.085);

      if (waveLayer >= 2) {
        hat(t, n % 2 ? 0.05 : 0.028);
      }
      // wave layers add hats + sparse accents; continuous melody owns melodic line
      if (waveLayer >= 3 && (n === 2 || n === 10)) {
        tone(leadGain, 311, t, 0.18, 'triangle', 0.028);
      }
      if (waveLayer >= 4) {
        if (n === 0 || n === 8) tone(leadGain, 349, t, 0.38, 'sawtooth', 0.026);
        if (n === 4 || n === 12) tone(leadGain, 415, t, 0.32, 'sawtooth', 0.022);
      }
      // ghost offbeat pulse for space rhythm
      if (n % 8 === 6) tone(padGain, 98, t, 0.2, 'sine', 0.04);
      step++;
    };
    tick();
    timers.push(setInterval(tick, (beat / 2) * 1000));
  }

  function applyMute() {
    if (!master || !ctx) return;
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.42, ctx.currentTime + 0.08);
  }

  return {
    async start() {
      ensure();
      if (ctx.state === 'suspended') await ctx.resume();
      if (!started) {
        started = true;
        scheduleLoop();
        rescheduleMelody();
      }
      muted = false;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(0.42, t + 1.0);
      // melody bus always open (mute still kills master)
      arpGain.gain.linearRampToValueAtTime(1, t + 0.2);
      leadGain.gain.linearRampToValueAtTime(0.85, t + 0.2);
      this.setWaveLayer(1);
      rescheduleMelody();
    },
    setMuted(m) {
      muted = !!m;
      applyMute();
      return muted;
    },
    toggleMute() {
      return this.setMuted(!muted);
    },
    isMuted() {
      return muted;
    },
    setTension(x) {
      if (!filter || !ctx) return;
      filter.frequency.linearRampToValueAtTime(1000 + x * 1800, ctx.currentTime + 0.15);
    },
    setWaveLayer(w) {
      waveLayer = Math.max(1, Math.min(4, 1 + Math.floor((w - 1) / 2)));
      if (!ctx) return;
      const t = ctx.currentTime;
      hatGain.gain.linearRampToValueAtTime(waveLayer >= 2 ? 1 : 0, t + 0.3);
      // keep arp/lead open for continuous speed melody
      arpGain.gain.linearRampToValueAtTime(1, t + 0.3);
      leadGain.gain.linearRampToValueAtTime(0.85 + (waveLayer >= 4 ? 0.15 : 0), t + 0.3);
    },
    /** Map orbital rad/s into speed-bed pitch/intensity */
    setOrbitSpeed(radPerSec) {
      if (!ctx || !speedLfo) return;
      const prev = orbitSpeedNorm;
      orbitSpeedNorm = Math.max(0.2, Math.min(2.5, radPerSec));
      const t = ctx.currentTime;
      const base = 48 + orbitSpeedNorm * 55;
      speedLfo.a.frequency.linearRampToValueAtTime(base, t + 0.12);
      speedLfo.b.frequency.linearRampToValueAtTime(base * 1.5, t + 0.12);
      speedLfo.filter.frequency.linearRampToValueAtTime(280 + orbitSpeedNorm * 420, t + 0.12);
      speedGain.gain.linearRampToValueAtTime(0.03 + orbitSpeedNorm * 0.045, t + 0.12);
      // retarget melody density when speed shifts meaningfully
      if (started && Math.abs(orbitSpeedNorm - prev) > 0.08) rescheduleMelody();
    },
    /** 0..1 rising tone as alignment approaches sweet spot */
    setAlignTone(level) {
      if (!ctx || !alignOsc) return;
      alignLevel = Math.max(0, Math.min(1, level));
      const t = ctx.currentTime;
      const freq = 280 + alignLevel * 520;
      alignOsc.frequency.linearRampToValueAtTime(freq, t + 0.05);
      alignFilter.frequency.linearRampToValueAtTime(600 + alignLevel * 2400, t + 0.05);
      const g = muted ? 0.0001 : (alignLevel > 0.35 ? 0.02 + alignLevel * 0.07 : 0.0001);
      alignGain.gain.linearRampToValueAtTime(g, t + 0.06);
    },
    onDownbeat() {
      const n = step % 8;
      return n === 0 || n === 4;
    },
    stingLock() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      const g = this.onDownbeat() ? 0.16 : 0.11;
      [523, 659, 784].forEach((f, i) => tone(master, f, t + i * 0.032, 0.3, 'triangle', g));
    },
    stingPerfect() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => tone(master, f, t + i * 0.028, 0.38, 'sine', 0.14));
      tone(master, 1568, t + 0.12, 0.25, 'triangle', 0.06);
    },
    stingMiss() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(master, 140, t, 0.12, 'square', 0.12);
      tone(master, 95, t + 0.08, 0.2, 'sawtooth', 0.1);
    },
    stingDebris() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(master, 90, t, 0.08, 'square', 0.16);
      tone(master, 60, t + 0.05, 0.25, 'sawtooth', 0.14);
      tone(master, 180, t + 0.1, 0.15, 'square', 0.08);
    },
    stingTimeout() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(master, 70, t, 0.35, 'sine', 0.14);
      tone(master, 55, t + 0.12, 0.4, 'triangle', 0.1);
    },
    stingWave() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      [220, 277, 330, 440].forEach((f, i) => tone(master, f, t + i * 0.06, 0.4, 'triangle', 0.1));
    },
    stingAutoAlign() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      [392, 494, 587].forEach((f, i) => tone(master, f, t + i * 0.04, 0.35, 'sine', 0.12));
    },
    stingExplosion() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(master, 48, t, 0.85, 'sawtooth', 0.28);
      tone(master, 28, t + 0.04, 1.1, 'sine', 0.26);
      tone(master, 72, t + 0.08, 0.55, 'square', 0.16);
      tone(master, 110, t + 0.15, 0.4, 'sawtooth', 0.12);
      tone(master, 36, t + 0.35, 0.9, 'triangle', 0.14);
      // dual noise bursts — boom + crack
      for (const [dur, decay, gain, delay] of [[0.55, 0.14, 0.28, 0], [0.35, 0.06, 0.2, 0.12]]) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = gain;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = delay ? 2800 : 900;
        src.connect(lp);
        lp.connect(g);
        g.connect(master);
        src.start(t + delay);
      }
    },
    stop() {
      timers.forEach(clearInterval);
      timers = [];
      if (melodyTimer) { clearInterval(melodyTimer); melodyTimer = null; }
      if (ctx) ctx.close();
      ctx = null;
      started = false;
    },
  };
}
