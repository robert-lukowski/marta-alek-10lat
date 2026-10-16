const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ChaosDirector = require('../js/chaosDirector.js');
const GameBoss = require('../js/boss.js');

const context = { lives: 3, level: 8, goalMode: 'hearts' };
function seeded(seed = 5) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('director preserves a full warning, one active event and a recovery period', () => {
  const director = ChaosDirector.create({ random: () => 0 });
  assert.deepEqual(director.update(29.9, context), []);
  let actions = director.update(.1, context);
  assert.equal(actions[0].type, 'warning');
  assert.equal(director.snapshot().phase, 'anticipation');
  assert.deepEqual(director.update(2.49, context), []);
  actions = director.update(.01, context);
  assert.equal(actions[0].type, 'start');
  const duration = actions[0].event.duration;
  actions = director.update(duration, context);
  assert.deepEqual(actions.map(action => action.type), ['end', 'recovery']);
  assert.equal(director.snapshot().phase, 'recovery');
  assert.equal(director.snapshot().event, null);
  assert.ok(director.snapshot().remaining >= 6);
  director.update(6, context);
  assert.equal(director.snapshot().phase, 'calm');
  assert.equal(director.snapshot().nextIn, 30);
});

test('classic mode never runs chaos, including the emergency challenge', () => {
  const director = ChaosDirector.create({ mode: 'classic', random: seeded() });
  assert.deepEqual(director.update(1000, { ...context, lives: 1 }), []);
  assert.equal(director.snapshot().event, null);
});

test('one life cancels a hazard and offers a shield without changing caller state', () => {
  const director = ChaosDirector.create({ random: () => 0 });
  director.update(32.5, context);
  assert.equal(director.snapshot().event.key, 'blackout');
  const lowLife = { ...context, lives: 1 };
  let actions = director.update(.05, lowLife);
  assert.equal(actions.find(action => action.type === 'end').cancelled, true);
  assert.equal(actions.find(action => action.opportunity).opportunity, 'shield');
  assert.equal(actions.find(action => action.type === 'warning').event.key, 'lastheart');
  assert.equal(lowLife.lives, 1);
  actions = director.update(10.45, lowLife);
  assert.equal(actions.find(action => action.type === 'recovery').reward, 'shield');
  assert.ok(!director.update(60, lowLife).some(action => action.type === 'warning' && action.event.key === 'lastheart'));
});

test('golden goals exclude misleading fake hearts and obscured obstacle floods', () => {
  const director = ChaosDirector.create({ random: seeded() });
  const actions = director.update(20000, { ...context, level: 18, goalMode: 'golden' });
  const starts = actions.filter(action => action.type === 'start');
  assert.ok(starts.length > 200);
  assert.ok(starts.every(action => !['fake', 'blackout', 'bills'].includes(action.event.key)));
  let active = false;
  for (const action of actions) {
    if (action.type === 'start') { assert.equal(active, false); active = true; }
    if (action.type === 'end') { assert.equal(active, true); active = false; }
  }
});

test('cancellation is idempotent, keeps calm progress, and suspends safely for the boss', () => {
  const director = ChaosDirector.create({ random: () => 0 });
  director.update(10, context);
  director.cancel();
  assert.equal(director.snapshot().remaining, 20);
  director.update(22.5, context);
  const actions = director.update(.05, { ...context, boss: true });
  assert.equal(actions[0].type, 'end');
  assert.equal(actions[0].reason, 'boss');
  assert.equal(director.snapshot().phase, 'recovery');
  director.cancel();
  assert.equal(director.snapshot().remaining, 8);
  assert.deepEqual(director.update(200, { ...context, boss: true }), []);
  assert.equal(director.snapshot().event, null);
});

test('party mode has a reproducible show ending after its eight planned events', () => {
  const director = ChaosDirector.create({ mode: 'party', random: () => .5 });
  const actions = director.update(240, context);
  assert.deepEqual(actions.filter(action => action.type === 'warning').map(action => action.event.key),
    ['magnet', 'jackpot', 'storm', 'love', 'haunted', 'freeze', 'gift', 'love']);
  assert.equal(director.snapshot().event, null);
  assert.equal(director.snapshot().nextIn, Infinity);
});

test('boss announces every hazard at least 1.6 seconds ahead and keeps a safe lane', () => {
  const boss = GameBoss.create({ random: seeded() });
  let warningTime = null;
  let attacks = 0;
  for (let frame = 1; frame <= 2400; frame++) {
    if (frame === 800 || frame === 1600) boss.hit(10);
    const actions = boss.update(.025, { playerX: .5 });
    for (const action of actions) {
      if (action.type === 'telegraph') {
        warningTime = frame * .025;
        assert.ok(action.duration >= 1.6);
        assert.ok(!action.lanes.includes(action.safeLane));
      }
      if (action.type === 'attack' && !action.support) {
        assert.ok(frame * .025 - warningTime >= 1.59);
        assert.ok(action.items.filter(item => item.family === 'bad').length <= 2);
        assert.ok(action.items.filter(item => item.family === 'bad').every(item => Math.abs(item.x - action.safeLane) >= .32));
        assert.ok(action.items.some(item => item.family === 'good' && item.x === action.safeLane));
        attacks++;
      }
    }
  }
  assert.ok(attacks >= 10);
});

test('boss progresses through all phases and cannot attack after defeat', () => {
  const boss = GameBoss.create({ random: () => 0 });
  assert.equal(boss.snapshot().hp, 30);
  assert.equal(boss.hit(10).phase, 2);
  assert.equal(boss.hit(10).phase, 3);
  assert.equal(boss.hit(10).defeated, true);
  const actions = boss.update(100);
  assert.ok(actions.some(action => action.type === 'defeated'));
  assert.ok(actions.every(action => action.type !== 'attack'));
  assert.deepEqual(boss.update(100), []);
  assert.equal(boss.snapshot().hp, 0);
});

test('party boss supplies enough reachable hearts for a short mobile finale', () => {
  const boss = GameBoss.create({ party: true, random: () => .5 });
  const actions = boss.update(45, { playerX: .5 });
  const hearts = actions.flatMap(action => action.items || []).filter(item => item.family === 'good');
  assert.equal(boss.snapshot().maxHp, 18);
  assert.ok(hearts.length >= 36);
  assert.ok(hearts.every(item => item.x >= .12 && item.x <= .9));
});

test('audio initializes only after real interaction, respects volume and never initializes from sfx', () => {
  let contexts = 0;
  const listeners = {};
  const values = new Map();
  const parameter = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ connect() { return this; }, disconnect() {}, gain: parameter() });
  class AudioContextMock {
    constructor() { contexts++; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createGain() { return node(); }
    createDynamicsCompressor() { return { ...node(), threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter() }; }
    createOscillator() { return { ...node(), frequency: parameter(), start() {}, stop() {} }; }
  }
  const window = { addEventListener(type, callback) { listeners[type] = callback; }, navigator: {}, AudioContext: AudioContextMock };
  const sandbox = { window, GameConfig: { keys: { sound: 'sound' } }, localStorage: { getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/audio.js'), 'utf8'), sandbox);
  const audio = window.GameAudio;
  audio.ensureReady();
  audio.sfx.start();
  audio.setEnabled(true);
  assert.equal(contexts, 0);
  listeners.pointerdown({ isTrusted: false });
  audio.ensureReady();
  assert.equal(contexts, 0);
  listeners.pointerdown({ isTrusted: true });
  assert.equal(audio.ensureReady(), true);
  assert.equal(contexts, 1);
  assert.equal(audio.setVolume(2), 1);
  assert.equal(audio.setVolume(-1), 0);
  assert.equal(audio.setVolume(.3), .3);
  assert.equal(audio.getVolume(), .3);
  assert.equal(values.get('marta_alek_10lat_volume_v1'), '0.3');
  assert.equal(audio.toggle(), false);
  audio.sfx.warning();
  assert.equal(contexts, 1);
});
