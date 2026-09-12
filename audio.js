/** SYZYGY SNAP — 118 BPM layered bed, wave density, mute. */
export function createSpaceAudio() {
  let ctx, master, filter, started = false, muted = false;
  let timers = [];
  let step = 0;
  let waveLayer = 1;
  let bassGain, hatGain, arpGain, leadGain;
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
    filter.frequency.value = 1200;
    filter.connect(master);
    master.connect(ctx.destination);

    bassGain = ctx.createGain(); bassGain.gain.value = 0.2; bassGain.connect(filter);
    hatGain = ctx.createGain(); hatGain.gain.value = 0; hatGain.connect(master);
    arpGain = ctx.createGain(); arpGain.gain.value = 0; arpGain.connect(filter);
    leadGain = ctx.createGain(); leadGain.gain.value = 0; leadGain.connect(filter);

    // sustained dark fifth under bass motif
    for (const f of [49, 73.5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(bassGain);
      o.start();
    }
  }

  function tone(dest, freq, t, dur, type, gain = 0.1) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.25);
  }

  function hat(t, g = 0.04) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = g;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(hatGain);
    src.start(t);
  }

  // 4-bar bass motif (16 steps of 8th notes conceptually; we tick every beat/2)
  const bassMotif = [55, 55, 0, 55, 41.2, 0, 55, 82.4, 55, 0, 55, 55, 73.4, 0, 49, 0];

  function scheduleLoop() {
    const tick = () => {
      if (!ctx || muted) {
        step++;
        return;
      }
      const t = ctx.currentTime;
      const n = step % 16;
      // kick on 1 and 3 of each bar (steps 0,4,8,12)
      if (n % 4 === 0) kick(t);
      // bass motif
      const bf = bassMotif[n];
      if (bf) tone(bassGain, bf, t, 0.28, 'square', 0.09);

      // layer by wave
      if (waveLayer >= 2) {
        hat(t, n % 2 ? 0.045 : 0.025);
      }
      if (waveLayer >= 3) {
        const scale = [0, 3, 5, 7, 10, 12, 15, 10];
        const f = 220 * Math.pow(2, scale[n % 8] / 12);
        tone(arpGain, f, t, 0.14, 'triangle', 0.05);
      }
      if (waveLayer >= 4) {
        if (n === 0 || n === 8) tone(leadGain, 330, t, 0.4, 'sawtooth', 0.035);
        if (n === 4 || n === 12) tone(leadGain, 392, t, 0.35, 'sawtooth', 0.03);
      }
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
      }
      muted = false;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(0.42, t + 1.0);
      this.setWaveLayer(1);
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
      filter.frequency.linearRampToValueAtTime(900 + x * 1600, ctx.currentTime + 0.15);
    },
    setWaveLayer(w) {
      waveLayer = Math.max(1, Math.min(4, 1 + Math.floor((w - 1) / 2)));
      if (!ctx) return;
      const t = ctx.currentTime;
      hatGain.gain.linearRampToValueAtTime(waveLayer >= 2 ? 1 : 0, t + 0.3);
      arpGain.gain.linearRampToValueAtTime(waveLayer >= 3 ? 1 : 0, t + 0.3);
      leadGain.gain.linearRampToValueAtTime(waveLayer >= 4 ? 1 : 0, t + 0.3);
    },
    /** Optional: true if next SNAP would land near beat 1 or 3 */
    onDownbeat() {
      const n = step % 8;
      return n === 0 || n === 4;
    },
    stingLock() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      // prefer accent if on downbeat
      const g = this.onDownbeat() ? 0.18 : 0.12;
      [523, 659, 784].forEach((f, i) => tone(master, f, t + i * 0.035, 0.32, 'triangle', g));
    },
    stingMiss() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(master, 140, t, 0.12, 'square', 0.12);
      tone(master, 95, t + 0.08, 0.2, 'sawtooth', 0.1);
    },
    stingTimeout() {
      if (!ctx || !started || muted) return;
      const t = ctx.currentTime;
      tone(master, 70, t, 0.35, 'sine', 0.14);
      tone(master, 55, t + 0.12, 0.4, 'triangle', 0.1);
    },
    stop() {
      timers.forEach(clearInterval);
      timers = [];
      if (ctx) ctx.close();
      ctx = null;
      started = false;
    },
  };
}
