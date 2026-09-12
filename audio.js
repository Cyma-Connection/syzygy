/** SYZYGY ORBIT SNAP — darker brass-obsidian bed (~118 BPM) + quiet SFX. Procedural only. */
export function createSpaceAudio() {
  let ctx, master, musicBus, sfxBus, filter, started = false, muted = false;
  let timers = [];
  let step = 0;
  let waveLayer = 1;
  let bassGain, hatGain, arpGain, leadGain, padGain, speedGain, alignGain;
  let speedOscA, speedOscB, speedLfo;
  let alignOsc, alignFilter;
  let padFilter, padLfo;
  let orbitSpeedNorm = 0.5;
  let alignLevel = 0;
  let melodyTimer = null;
  let melodyStep = 0;
  let melodyIntervalMs = 320;
  let loopTimer = null;
  let bpm = 118;
  const baseBpm = 118;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.92; // music bed prominent
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.28; // SFX tucked under music
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.55;
    filter.connect(musicBus);
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);

    bassGain = ctx.createGain(); bassGain.gain.value = 0.32; bassGain.connect(filter);
    hatGain = ctx.createGain(); hatGain.gain.value = 0; hatGain.connect(musicBus);
    arpGain = ctx.createGain(); arpGain.gain.value = 0; arpGain.connect(filter);
    leadGain = ctx.createGain(); leadGain.gain.value = 0; leadGain.connect(filter);
    padGain = ctx.createGain(); padGain.gain.value = 0.22; padGain.connect(filter);
    speedGain = ctx.createGain(); speedGain.gain.value = 0.06; speedGain.connect(filter);
    alignGain = ctx.createGain(); alignGain.gain.value = 0.0001; alignGain.connect(sfxBus);

    // Deep sub + fifth — obsidian floor
    for (const [f, g] of [[36.7, 0.07], [55, 0.055], [73.4, 0.035]]) {
      const o = ctx.createOscillator();
      o.type = f < 40 ? 'sine' : 'sawtooth';
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.value = g;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 180;
      o.connect(lp);
      lp.connect(gg);
      gg.connect(bassGain);
      o.start();
    }

    // Slow evolving brass-obsidian pads (detuned saws through warm LP)
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 680;
    padFilter.Q.value = 0.9;
    padFilter.connect(padGain);
    for (const [f, det, g] of [[82.4, -3, 0.045], [123.5, 4, 0.038], [164.8, -2, 0.03], [196, 5, 0.022]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f + det;
      const gg = ctx.createGain();
      gg.gain.value = g;
      o.connect(gg);
      gg.connect(padFilter);
      o.start();
    }
    // soft triangle shimmer layer
    for (const [f, det] of [[246.9, -6], [329.6, 5]]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f + det;
      const gg = ctx.createGain();
      gg.gain.value = 0.018;
      o.connect(gg);
      gg.connect(padFilter);
      o.start();
    }
    // slow LFO on pad brightness
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 220;
    lfo.connect(lfoG);
    lfoG.connect(padFilter.frequency);
    lfo.start();
    padLfo = lfo;

    // continuous speed bed — rises with orbital speed (dark bandpass)
    speedOscA = ctx.createOscillator();
    speedOscA.type = 'sawtooth';
    speedOscA.frequency.value = 48;
    speedOscB = ctx.createOscillator();
    speedOscB.type = 'triangle';
    speedOscB.frequency.value = 72;
    const spMix = ctx.createGain();
    spMix.gain.value = 0.45;
    const spFilter = ctx.createBiquadFilter();
    spFilter.type = 'bandpass';
    spFilter.frequency.value = 320;
    spFilter.Q.value = 1.8;
    speedOscA.connect(spMix);
    speedOscB.connect(spMix);
    spMix.connect(spFilter);
    spFilter.connect(speedGain);
    speedOscA.start();
    speedOscB.start();
    speedLfo = { filter: spFilter, a: speedOscA, b: speedOscB };

    // rising align tone (felt before SNAP) — quieter, under music
    alignOsc = ctx.createOscillator();
    alignOsc.type = 'sine';
    alignOsc.frequency.value = 280;
    alignFilter = ctx.createBiquadFilter();
    alignFilter.type = 'lowpass';
    alignFilter.frequency.value = 700;
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
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + 0.32);
  }

  function hat(t, g = 0.02) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.022, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = g;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8200;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(hatGain);
    src.start(t);
  }

  // sparse crystalline motifs — minor / space intervals (not chippy)
  const melodyMotifs = [
    [0, 7, 3, 10, 12, 7, 15, 10],
    [0, 5, 12, 7, 17, 12, 10, 5],
    [0, 8, 3, 15, 12, 8, 19, 15],
    [0, 7, 12, 19, 15, 12, 10, 7],
  ];

  function melodyTick() {
    if (!ctx || muted || !started) {
      melodyStep++;
      return;
    }
    const t = ctx.currentTime;
    const motif = melodyMotifs[Math.min(3, Math.floor(orbitSpeedNorm))];
    const deg = motif[melodyStep % motif.length];
    // crystalline root ~155–280 Hz — spatial, not toy-bright
    const root = 155 * Math.pow(2, Math.min(0.85, (orbitSpeedNorm - 0.2) * 0.4));
    const f = root * Math.pow(2, deg / 12);
    const dens = Math.min(1, (orbitSpeedNorm - 0.25) / 1.6);
    const g = 0.07 + dens * 0.08; // louder arp so bed is audible
    const dur = Math.max(0.14, melodyIntervalMs / 1000 * 0.95);
    // primary: soft sine / triangle — crystalline
    tone(arpGain, f, t, dur, dens > 0.7 ? 'triangle' : 'sine', g);
    // quiet octave frost
    if (melodyStep % 2 === 0) {
      tone(leadGain, f * 2, t + 0.02, dur * 0.7, 'sine', 0.028 + dens * 0.025);
    }
    // sparse fifth harmony when fast
    if (dens > 0.55 && melodyStep % 4 === 1) {
      tone(arpGain, f * 1.5, t + 0.03, dur * 0.55, 'triangle', 0.03);
    }
    melodyStep++;
  }

  function rescheduleMelody() {
    if (melodyTimer) {
      clearInterval(melodyTimer);
      melodyTimer = null;
    }
    if (!started) return;
    const n = Math.max(0.2, Math.min(2.5, orbitSpeedNorm));
    // slower crystalline pace; subtly accelerates with orbit
    melodyIntervalMs = Math.max(110, 380 - n * 100);
    melodyTimer = setInterval(melodyTick, melodyIntervalMs);
  }

  function rescheduleLoop() {
    if (loopTimer) {
      clearInterval(loopTimer);
      timers = timers.filter((id) => id !== loopTimer);
      loopTimer = null;
    }
    if (!started) return;
    // ~118 BPM, subtle accel with orbit speed
    bpm = baseBpm * (1 + Math.min(0.22, (orbitSpeedNorm - 0.4) * 0.12));
    const beatMs = (60 / bpm / 2) * 1000;
    const tick = () => {
      if (!ctx || muted) {
        step++;
        return;
      }
      const t = ctx.currentTime;
      const n = step % 16;
      // soft pulse — not chippery kick/clap bed
      if (n % 8 === 0) kick(t);
      // slow evolving bass accents (sparse)
      const bassMotif = [55, 0, 0, 0, 41.2, 0, 0, 55, 0, 0, 73.4, 0, 0, 0, 49, 0];
      const bf = bassMotif[n];
      if (bf) tone(bassGain, bf, t, 0.42, 'sine', 0.1);

      if (waveLayer >= 2 && n % 4 === 2) {
        hat(t, 0.018);
      }
      // rare brass swell accents — not Amiga leads
      if (waveLayer >= 3 && (n === 0 || n === 8)) {
        tone(leadGain, 110, t, 0.55, 'sawtooth', 0.035);
      }
      if (waveLayer >= 4 && n === 4) {
        tone(padGain, 82.4, t, 0.7, 'triangle', 0.05);
      }
      // ghost sub pulse
      if (n % 8 === 6) tone(padGain, 55, t, 0.35, 'sine', 0.045);
      step++;
    };
    tick();
    loopTimer = setInterval(tick, beatMs);
    timers.push(loopTimer);
  }

  function applyMute() {
    if (!master || !ctx) return;
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.55, ctx.currentTime + 0.08);
  }

  return {
    async start() {
      ensure();
      if (ctx.state === 'suspended') await ctx.resume();
      if (!started) {
        started = true;
        rescheduleLoop();
        rescheduleMelody();
      }
      muted = false;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(0.55, t + 1.0);
      arpGain.gain.linearRampToValueAtTime(1, t + 0.25);
      leadGain.gain.linearRampToValueAtTime(0.9, t + 0.25);
      padGain.gain.linearRampToValueAtTime(0.22, t + 0.4);
      bassGain.gain.linearRampToValueAtTime(0.32, t + 0.4);
      this.setWaveLayer(1);
      rescheduleMelody();
      rescheduleLoop();
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
      filter.frequency.linearRampToValueAtTime(1400 + x * 1600, ctx.currentTime + 0.2);
      if (padFilter) {
        padFilter.frequency.linearRampToValueAtTime(520 + x * 480, ctx.currentTime + 0.35);
      }
    },
    setWaveLayer(w) {
      waveLayer = Math.max(1, Math.min(4, 1 + Math.floor((w - 1) / 2)));
      if (!ctx) return;
      const t = ctx.currentTime;
      hatGain.gain.linearRampToValueAtTime(waveLayer >= 2 ? 0.55 : 0, t + 0.3);
      arpGain.gain.linearRampToValueAtTime(1, t + 0.3);
      leadGain.gain.linearRampToValueAtTime(0.9 + (waveLayer >= 4 ? 0.1 : 0), t + 0.3);
    },
    /** Map orbital rad/s into speed-bed pitch/intensity + subtle BPM accel */
    setOrbitSpeed(radPerSec) {
      if (!ctx || !speedLfo) return;
      const prev = orbitSpeedNorm;
      orbitSpeedNorm = Math.max(0.2, Math.min(2.5, radPerSec));
      const t = ctx.currentTime;
      const base = 42 + orbitSpeedNorm * 48;
      speedLfo.a.frequency.linearRampToValueAtTime(base, t + 0.12);
      speedLfo.b.frequency.linearRampToValueAtTime(base * 1.5, t + 0.12);
      speedLfo.filter.frequency.linearRampToValueAtTime(240 + orbitSpeedNorm * 380, t + 0.12);
      speedGain.gain.linearRampToValueAtTime(0.045 + orbitSpeedNorm * 0.055, t + 0.12);
      if (started && Math.abs(orbitSpeedNorm - prev) > 0.08) {
        rescheduleMelody();
        rescheduleLoop();
      }
    },
    /** 0..1 rising tone as alignment approaches sweet spot — kept soft under music */
    setAlignTone(level) {
      if (!ctx || !alignOsc) return;
      alignLevel = Math.max(0, Math.min(1, level));
      const t = ctx.currentTime;
      const freq = 240 + alignLevel * 420;
      alignOsc.frequency.linearRampToValueAtTime(freq, t + 0.05);
      alignFilter.frequency.linearRampToValueAtTime(500 + alignLevel * 1600, t + 0.05);
      const g = muted ? 0.0001 : (alignLevel > 0.35 ? 0.01 + alignLevel * 0.035 : 0.0001);
      alignGain.gain.linearRampToValueAtTime(g, t + 0.06);
    },
    onDownbeat() {
      const n = step % 8;
      return n === 0 || n === 4;
    },
    // SFX stings — low gains so music stays audible underneath
    stingLock() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      const g = this.onDownbeat() ? 0.07 : 0.05;
      [392, 494, 587].forEach((f, i) => tone(sfxBus, f, t + i * 0.035, 0.28, 'sine', g));
    },
    stingPerfect() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      [440, 554, 659, 880].forEach((f, i) => tone(sfxBus, f, t + i * 0.03, 0.32, 'sine', 0.055));
      tone(sfxBus, 1108, t + 0.12, 0.22, 'triangle', 0.028);
    },
    stingMiss() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(sfxBus, 120, t, 0.1, 'triangle', 0.05);
      tone(sfxBus, 85, t + 0.07, 0.18, 'sine', 0.04);
    },
    stingDebris() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(sfxBus, 80, t, 0.07, 'square', 0.055);
      tone(sfxBus, 55, t + 0.05, 0.2, 'sawtooth', 0.045);
      tone(sfxBus, 140, t + 0.1, 0.12, 'triangle', 0.03);
    },
    stingTimeout() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(sfxBus, 65, t, 0.3, 'sine', 0.055);
      tone(sfxBus, 49, t + 0.1, 0.35, 'triangle', 0.04);
    },
    stingWave() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      [165, 220, 277, 330].forEach((f, i) => tone(sfxBus, f, t + i * 0.07, 0.45, 'sine', 0.045));
    },
    stingAutoAlign() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      [330, 415, 494].forEach((f, i) => tone(sfxBus, f, t + i * 0.045, 0.3, 'sine', 0.05));
    },
    stingExplosion() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(sfxBus, 48, t, 0.75, 'sawtooth', 0.12);
      tone(sfxBus, 28, t + 0.04, 1.0, 'sine', 0.11);
      tone(sfxBus, 72, t + 0.08, 0.5, 'triangle', 0.07);
      tone(sfxBus, 36, t + 0.3, 0.8, 'sine', 0.06);
      for (const [dur, decay, gain, delay] of [[0.5, 0.14, 0.12, 0], [0.32, 0.06, 0.08, 0.12]]) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = gain;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = delay ? 2200 : 700;
        src.connect(lp);
        lp.connect(g);
        g.connect(sfxBus);
        src.start(t + delay);
      }
    },
    stop() {
      timers.forEach(clearInterval);
      timers = [];
      loopTimer = null;
      if (melodyTimer) { clearInterval(melodyTimer); melodyTimer = null; }
      if (ctx) ctx.close();
      ctx = null;
      started = false;
    },
  };
}
