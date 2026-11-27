// Sound, synthesized live with WebAudio: no audio files, nothing fetched.
// A gobble, a wing flap, pickup chimes, a thud, the farmer's yell, the
// oven's whoosh and a little escape fanfare. Mute with M; the context is
// created on the first user gesture, so a silent page never complains.

export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (context !== null) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      context = new AC();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted || !ensure()) return;
    const t0 = context.currentTime + (delay || 0);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, freq, delay) {
    if (muted || !ensure()) return;
    const t0 = context.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, len, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = context.createBufferSource();
    src.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 1200;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol || 0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); if (context !== null && context.state === 'suspended') context.resume(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    gobble() {
      // Three descending clucks, the turkey announcing itself.
      tone(420, 0.09, 'square', 0.35, 300);
      tone(360, 0.09, 'square', 0.35, 260, 0.11);
      tone(300, 0.14, 'square', 0.4, 210, 0.22);
    },
    flap() { noise(0.12, 0.3, 900); tone(300, 0.1, 'sine', 0.2, 520); },
    pickup() { tone(880, 0.09, 'sine', 0.4); tone(1320, 0.12, 'sine', 0.35, null, 0.07); },
    pumpkin() { tone(660, 0.1, 'triangle', 0.45); tone(990, 0.1, 'triangle', 0.4, null, 0.08); tone(1320, 0.16, 'triangle', 0.4, null, 0.16); },
    feather() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'sine', 0.4, null, i * 0.07)); },
    hit() { noise(0.18, 0.6, 500); tone(160, 0.22, 'sawtooth', 0.5, 60); },
    yell() { tone(220, 0.3, 'sawtooth', 0.4, 440); tone(330, 0.25, 'sawtooth', 0.35, 180, 0.18); },
    whoosh() { noise(0.35, 0.35, 2400); },
    nearMiss() { tone(1568, 0.08, 'sine', 0.3); },
    stage() { tone(392, 0.12, 'triangle', 0.4); tone(523, 0.18, 'triangle', 0.4, null, 0.1); },
    caught() { tone(392, 0.2, 'sawtooth', 0.4, 370); tone(370, 0.2, 'sawtooth', 0.4, 349, 0.2); tone(349, 0.45, 'sawtooth', 0.45, 311, 0.4); },
    escaped() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.45, null, i * 0.11)); },
  };
}
