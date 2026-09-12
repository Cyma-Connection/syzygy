/** Catchy discreet futuristic pulse — arcade bed. */
export function createSpaceAudio() {
  let ctx, master, filter, started = false, timers = [];

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.connect(master);
    master.connect(ctx.destination);

    // bass drone
    for (const f of [55, 82.4]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.07;
      o.connect(g);
      g.connect(filter);
      o.start();
    }
  }

  function tone(freq, t, dur, type, gain = 0.12) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(filter);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function scheduleLoop() {
    const bpm = 112;
    const beat = 60 / bpm;
    let step = 0;
    const tick = () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const n = step % 8;
      // kick
      if (n % 2 === 0) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.22);
      }
      // hat
      {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = n % 2 ? 0.04 : 0.02;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6000;
        src.connect(hp);
        hp.connect(g);
        g.connect(master);
        src.start(t);
      }
      // arp
      const scale = [0, 3, 5, 7, 10, 12, 15, 19];
      const root = 220;
      const f = root * Math.pow(2, scale[n] / 12);
      tone(f, t, 0.18, 'square', 0.045);
      if (n === 0 || n === 4) tone(f * 2, t, 0.12, 'triangle', 0.03);
      step++;
    };
    tick();
    timers.push(setInterval(tick, beat * 1000));
  }

  return {
    async start() {
      ensure();
      if (ctx.state === 'suspended') await ctx.resume();
      if (!started) {
        started = true;
        scheduleLoop();
      }
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(0.42, t + 1.2);
    },
    setTension(x) {
      if (!filter) return;
      filter.frequency.linearRampToValueAtTime(700 + x * 1400, ctx.currentTime + 0.2);
    },
    stingLock() {
      if (!ctx || !started) return;
      const t = ctx.currentTime;
      [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.04, 0.35, 'triangle', 0.14));
    },
    stingMiss() {
      if (!ctx || !started) return;
      const t = ctx.currentTime;
      tone(110, t, 0.25, 'sawtooth', 0.1);
      tone(90, t + 0.05, 0.3, 'sawtooth', 0.08);
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
