/**
 * Procedural space bed — ambient pad + soft pulse (no audio files).
 * Starts on first user gesture (BEGIN).
 */
export function createSpaceAudio() {
  let ctx = null;
  let master = null;
  let started = false;
  let pulseGain = null;
  let timer = null;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    // Dark pad (two detuned saws through lowpass)
    const padGain = ctx.createGain();
    padGain.gain.value = 0.22;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    padGain.connect(filter);
    filter.connect(master);

    for (const [freq, det] of [
      [55, 0],
      [82.5, 3],
      [110, -2],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.value = 0.18;
      o.connect(g);
      g.connect(padGain);
      o.start();
    }

    // High shimmer
    const shim = ctx.createOscillator();
    shim.type = 'sine';
    shim.frequency.value = 440;
    const shimG = ctx.createGain();
    shimG.gain.value = 0.03;
    const shimF = ctx.createBiquadFilter();
    shimF.type = 'highpass';
    shimF.frequency.value = 600;
    shim.connect(shimG);
    shimG.connect(shimF);
    shimF.connect(master);
    shim.start();
    // slow LFO on shimmer amp
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.025;
    lfo.connect(lfoG);
    lfoG.connect(shimG.gain);
    lfo.start();

    // Soft kick/pulse for rhythm
    pulseGain = ctx.createGain();
    pulseGain.gain.value = 0;
    pulseGain.connect(master);

    function beat() {
      if (!ctx || ctx.state === 'closed') return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g);
      g.connect(pulseGain);
      o.start(t);
      o.stop(t + 0.4);

      // soft click/hat
      const nbuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = nbuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = nbuf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.05, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      const nf = ctx.createBiquadFilter();
      nf.type = 'highpass';
      nf.frequency.value = 4000;
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(master);
      noise.start(t);
    }

    // ~72 BPM soft pulse
    timer = setInterval(beat, 833);
    beat();
  }

  return {
    async start() {
      ensure();
      if (ctx.state === 'suspended') await ctx.resume();
      if (started) return;
      started = true;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.55, t + 2.5);
      if (pulseGain) pulseGain.gain.linearRampToValueAtTime(0.35, t + 4);
    },
    setTension(amount) {
      // 0..1 — brighten filter when aligning / late game
      if (!ctx) return;
      // no direct filter ref exported; tension via master slight bump
      const t = ctx.currentTime;
      const target = 0.45 + amount * 0.25;
      master.gain.linearRampToValueAtTime(Math.min(0.75, target), t + 0.4);
    },
    stingLock() {
      if (!ctx || !started) return;
      const t = ctx.currentTime;
      const freqs = [220, 277, 330];
      for (const f of freqs) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 1.3);
      }
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      if (ctx) ctx.close();
      ctx = null;
      started = false;
    },
  };
}
