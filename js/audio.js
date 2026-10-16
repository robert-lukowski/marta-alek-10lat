/* Small original arcade phrases. Creating audio is always an explicit gesture. */
window.GameAudio = (() => {
  'use strict';
  const key = GameConfig.keys.sound;
  const volumeKey = 'marta_alek_10lat_volume_v1';
  function read(keyName, fallback) {
    try { return localStorage.getItem(keyName) ?? fallback; } catch (_) { return fallback; }
  }
  function save(keyName, value) {
    try { localStorage.setItem(keyName, String(value)); } catch (_) { /* Private browsing can disable storage. */ }
  }
  let enabled = read(key, '1') !== '0';
  let volume = Math.max(0, Math.min(1, Number(read(volumeKey, '.55')) || 0));
  let ctx = null, master = null, compressor = null, interacted = false;
  let voices = 0;
  const recent = new Map();

  function rememberGesture(event) {
    if (event.isTrusted) interacted = true;
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(type => {
    window.addEventListener(type, rememberGesture, { capture: true, passive: true });
  });

  function ensureReady() {
    if (!enabled) return false;
    const activation = window.navigator?.userActivation;
    if (!(interacted || activation?.isActive || activation?.hasBeenActive)) return false;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = volume * .42;
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 12;
        compressor.ratio.value = 5;
        compressor.attack.value = .004;
        compressor.release.value = .18;
        master.connect(compressor).connect(ctx.destination);
      }
      if (ctx.state === 'suspended') {
        const resumed = ctx.resume();
        if (resumed?.catch) resumed.catch(() => {});
      }
      return ctx.state === 'running';
    } catch (_) {
      return false;
    }
  }

  function setVolume(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) return volume;
    volume = Math.max(0, Math.min(1, next));
    save(volumeKey, volume);
    if (master && ctx) master.gain.setTargetAtTime(enabled ? volume * .42 : 0, ctx.currentTime, .025);
    return volume;
  }

  function setEnabled(value) {
    enabled = !!value;
    save(key, enabled ? '1' : '0');
    if (master && ctx) master.gain.setTargetAtTime(enabled ? volume * .42 : 0, ctx.currentTime, .025);
    if (enabled) ensureReady();
    return enabled;
  }

  function tone(freq, duration = .09, type = 'triangle', gain = .075, glide = 1, delay = 0) {
    // Sound effects never initialize or resume audio on their own.
    if (!enabled || !ctx || ctx.state !== 'running' || volume === 0 || voices >= 14) return;
    const time = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * glide), time + duration);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.min(.1, gain), time + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(envelope).connect(master);
    voices++;
    osc.onended = () => { voices--; osc.disconnect(); envelope.disconnect(); };
    osc.start(time);
    osc.stop(time + duration + .015);
  }

  function phrase(notes, pace = .09, type = 'triangle', gain = .075) {
    notes.forEach((note, index) => {
      if (note) tone(note, pace * 1.25, type, gain, 1, index * pace);
    });
  }

  function gated(name, cooldown, play) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const last = recent.get(name) ?? -Infinity;
    if (ctx.currentTime - last < cooldown) return;
    recent.set(name, ctx.currentTime);
    play();
  }

  const sfx = {
    button() { gated('button', .06, () => tone(660, .035, 'triangle', .045, .91)); },
    start() { phrase([392, 523.25, 659.25], .075); },
    good(kind) {
      gated('good', .035, () => {
        if (kind === 'golden' || kind === 'star' || kind === 'jackpot') phrase([880, 1174.66], .055, 'triangle', .07);
        else if (kind === 'heart') tone(783.99, .075, 'sine', .09, 1.12);
        else tone(659.25, .07, 'triangle', .065, 1.1);
      });
    },
    bad() { gated('bad', .13, () => tone(196, .12, 'triangle', .08, .7)); },
    life() { gated('life', .25, () => phrase([220, 164.81, 130.81], .06, 'triangle', .08)); },
    power() { phrase([523.25, 659.25, 1046.5], .06, 'triangle', .07); },
    fail() { phrase([392, 329.63, 261.63, 196], .12, 'sine', .085); },
    complete() { phrase([523.25, 659.25, 783.99, 1046.5], .085); },
    finalWin() { phrase([392, 523.25, 659.25, 783.99, 0, 659.25, 783.99, 1046.5], .12, 'triangle', .08); },
    warning() { gated('warning', .8, () => phrase([440, 0, 440], .1, 'triangle', .065)); },
    combo(multiplier = 2) { gated('combo', .25, () => phrase([523.25, 659.25, 783.99 + Math.min(5, multiplier) * 35], .05, 'triangle', .065)); },
    boss(phase = 1) { gated('boss', 1, () => phrase([146.83, 196, 220 + phase * 15, 293.66], .12, 'triangle', .08)); },
    nearMiss() { gated('nearMiss', .3, () => tone(1046.5, .05, 'sine', .04, 1.35)); },
    ghost() { gated('ghost', .8, () => tone(523.25, .36, 'sine', .055, .65)); },
    jackpot() { gated('jackpot', 1, () => phrase([659.25, 783.99, 1046.5, 1318.5, 1567.98], .065, 'triangle', .07)); },
    season() { gated('season', 1, () => phrase([523.25, 587.33, 783.99], .14, 'sine', .06)); }
  };

  return {
    ensureReady, setEnabled, toggle: () => setEnabled(!enabled), isEnabled: () => enabled,
    setVolume, getVolume: () => volume, sfx
  };
})();
