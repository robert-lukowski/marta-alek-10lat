window.GameAudio = (() => {
  const key = GameConfig.keys.sound;
  let enabled = (localStorage.getItem(key) || '1') !== '0';
  let ctx = null;
  let ready = false;

  function ensureReady() {
    if (!enabled) return;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') ctx.resume();
    ready = ctx.state === 'running';
  }
  function tone(freq=440, duration=.08, type='sine', gain=.04, glide=1) {
    if (!enabled) return;
    ensureReady();
    if (!ready || !ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(70, freq * glide), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }
  function setEnabled(value) {
    enabled = !!value;
    localStorage.setItem(key, enabled ? '1' : '0');
    if (enabled) ensureReady();
    return enabled;
  }
  function toggle() { return setEnabled(!enabled); }
  function isEnabled() { return enabled; }
  const sfx = {
    button() { tone(540, .035, 'triangle', .03, .95); },
    start() { tone(320, .08, 'sine', .05, 1.55); setTimeout(() => tone(520, .07, 'triangle', .04, 1.18), 70); },
    good(kind) {
      if (kind === 'golden' || kind === 'star') { tone(860, .06, 'triangle', .042, 1.2); setTimeout(() => tone(1080, .05, 'triangle', .034, 1.06), 45); }
      else if (kind === 'heart') tone(720, .06, 'sine', .04, 1.18);
      else tone(610, .055, 'triangle', .034, 1.03);
    },
    bad() { tone(190, .13, 'sawtooth', .035, .74); },
    life() { tone(150, .16, 'square', .03, .62); },
    power() { tone(520, .07, 'triangle', .04, 1.4); setTimeout(() => tone(790, .08, 'sine', .035, 1.18), 55); },
    fail() { tone(230, .13, 'triangle', .04, .75); setTimeout(() => tone(170, .16, 'sine', .035, .7), 115); },
    complete() { tone(500, .08, 'triangle', .052, 1.32); setTimeout(() => tone(760, .1, 'sine', .05, 1.18), 80); },
    finalWin() { tone(392, .1, 'triangle', .05, 1.33); setTimeout(() => tone(523, .12, 'triangle', .052, 1.25), 100); setTimeout(() => tone(659, .16, 'sine', .048, 1.1), 215); }
  };
  return { ensureReady, setEnabled, toggle, isEnabled, sfx };
})();
