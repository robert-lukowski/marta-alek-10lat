const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Keep the production API read-only: this test runner instruments its private
// copy of the source, never the shipped game or its files.
function createGame(saved = {}, { seed } = {}) {
  const effects = { saves: [], partyScores: [], finals: [], memories: [], unlocked: [], sounds: [], hud: [] };
  let progress = { playerName: 'Tester', unlocked: 0, currentScore: 0, finalDone: false, ...saved };
  let overlay = false;
  const noop = () => {};
  function eventTarget(extra = {}) {
    const handlers = new Map();
    return {
      ...extra,
      addEventListener(name, callback) {
        if (!handlers.has(name)) handlers.set(name, []);
        handlers.get(name).push(callback);
      },
      emit(name, event = {}) {
        const input = { preventDefault: noop, target: { tagName: 'CANVAS' }, pointerId: 1, ...event };
        for (const callback of handlers.get(name) || []) callback(input);
      }
    };
  }
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, eventTarget({
      classList: { add: noop, remove: noop, contains: () => false },
      setPointerCapture: noop,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 540 }),
      click: noop
    }));
    return elements.get(id);
  }
  const document = eventTarget({ hidden: false, getElementById: element });
  const audio = new Proxy({}, { get: (_, name) => (...args) => effects.sounds.push([name, ...args]) });
  const sandbox = eventTarget({
    document, console, requestAnimationFrame: noop,
    GameAudio: { sfx: audio },
    GameHaptics: new Proxy({}, { get: () => noop }),
    GameRenderer: { init: noop, draw: noop, renderPreview: noop },
    PixelSeasons: {
      list: ['spring', 'summer', 'autumn', 'winter'].map(key => ({ key })),
      forLevel: index => ({ key: ['spring', 'summer', 'autumn', 'winter'][Math.min(3, Math.floor(index / 5))] })
    },
    GameGallery: {
      markUnlocked: index => effects.unlocked.push(index),
      showMemory: (...args) => effects.memories.push(args)
    },
    GameStorage: { recordPartyScore: (...args) => effects.partyScores.push(args) },
    GameUI: {
      refs: { finalOverlay: element('finalOverlay'), menuCanvas: null },
      init: noop, applyPlayerName: noop, closeStart: noop, hideUnlock: noop, setPlaying: noop,
      setPaused: noop, showMenu: noop, setSeason: noop, showChaos: noop, hideChaos: noop,
      getMode: () => 'chaos', getModalMode: () => 'unlock', isReducedMotion: () => false,
      getBlockingOverlay: () => overlay,
      getProgress: () => ({ ...progress }),
      setProgress: value => { progress = { ...value }; effects.saves.push({ ...value }); },
      showFinal: (...args) => effects.finals.push(args),
      updateHud: value => effects.hud.push(value), setEvent: noop
    }
  });
  if (seed !== undefined) {
    let randomState = seed >>> 0;
    sandbox.Math = Object.create(Math);
    sandbox.Math.random = () => {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return randomState / 4294967296;
    };
  }
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const filename of ['config.js', 'levels.js', 'chaosDirector.js', 'boss.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', filename), 'utf8'), context, { filename });
  }
  const original = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8');
  const exported = 'return { init, start, startLevel, pause, resume, stop, inspect };';
  assert.ok(original.includes(exported), 'Update the private test instrumentation when the public API changes.');
  const instrumented = original.replace(exported,
    'return { init, start, startLevel, pause, resume, stop, inspect, __test: { state, update, frame, updatePlayer, updateItems, catchGood, catchPower, hurt, cleanupEvent, directorActions, checkCompletion, complete, enterPartyBoss, render } };');
  vm.runInContext(instrumented, context, { filename: 'game.js' });
  sandbox.Game.init();
  const engine = sandbox.Game.__test;
  const item = (key, family = 'good', overrides = {}) => ({
    ...(family === 'good' ? sandbox.GameConfig.goodItems : family === 'power' ? sandbox.GameConfig.powerItems : sandbox.GameConfig.badItems)[key],
    key, family, x: engine.state.player.x, y: engine.state.player.y,
    vx: 0, vy: 0, age: 0, nearMiss: false, ...overrides
  });
  return {
    game: sandbox.Game, engine, state: engine.state, effects, sandbox, document, element, item,
    progress: () => ({ ...progress }), block: value => { overlay = value; }
  };
}

test('pause freezes elapsed time, effects, falling items and director; resume discards background frame gaps', () => {
  const { game, engine, state, item } = createGame();
  game.start('chaos');
  state.items.push(item('heart', 'good', { y: 100, vy: 90 }));
  state.ringUntil = 9;
  engine.frame(1000);
  engine.frame(1016);
  game.pause();
  const paused = JSON.stringify(game.inspect());
  engine.update(30);
  assert.equal(JSON.stringify(game.inspect()), paused);
  engine.frame(50000);
  const elapsed = state.elapsed;
  game.resume();
  engine.frame(100000);
  assert.equal(state.elapsed, elapsed);
  engine.frame(100016);
  assert.ok(state.elapsed > elapsed && state.elapsed < elapsed + .02);
});

test('blocking overlays suspend the game and browser hide/blur clear input and pause', () => {
  const fixture = createGame();
  const { game, engine, state, block, document, sandbox } = fixture;
  game.start('chaos');
  block(true);
  engine.update(20);
  assert.equal(state.elapsed, 0);
  block(false);
  state.hold = 1;
  document.hidden = true;
  document.emit('visibilitychange');
  assert.equal(state.paused, true);
  assert.equal(state.hold, 0);
  game.resume();
  state.pointerId = 7;
  state.dragTarget = 200;
  sandbox.emit('blur');
  assert.equal(state.paused, true);
  assert.equal(state.pointerId, null);
  assert.equal(state.dragTarget, null);
});

test('restarting a run resets HUD throttling so score and timer update immediately', () => {
  const { game, engine, state, effects } = createGame();
  game.start('chaos');
  state.clock = 200;
  state.hudAt = 200.1;
  game.stop();
  game.start('chaos');
  const atRestart = effects.hud.length;
  engine.update(.05);
  assert.equal(effects.hud.length, atRestart + 1);
  assert.ok(state.hudAt < 1);
  state.hudAt = 100;
  game.startLevel(1);
  const atNextLevel = effects.hud.length;
  engine.update(.05);
  assert.equal(effects.hud.length, atNextLevel + 1);
});

test('new levels remove all temporary event effects and preserve the saved checkpoint', () => {
  const { game, state, item } = createGame({ currentScore: 123 });
  game.start('chaos');
  state.director.update(50, { lives: 3, level: 8 });
  state.event = { key: 'inverted' };
  state.ghost = { x: 90, y: 100 };
  state.items.push(item('fake', 'bad'));
  state.hold = -1;
  state.pointerId = 2;
  state.dragTarget = 80;
  state.ringUntil = state.clockUntil = state.magnetUntil = state.slowUntil = 99;
  state.lives = 1;
  state.shake = 5;
  game.startLevel(1);
  assert.equal(state.totalScore, 123);
  assert.equal(state.checkpoint, 123);
  assert.equal(state.levelScore, 0);
  assert.equal(state.lives, 3);
  assert.equal(state.event, null);
  assert.equal(state.ghost, null);
  assert.equal(state.items.length, 0);
  assert.equal(state.hold, 0);
  assert.equal(state.pointerId, null);
  assert.equal(state.dragTarget, null);
  assert.equal(state.shake, 0);
  assert.equal(state.ringUntil + state.clockUntil + state.magnetUntil + state.slowUntil, 0);
});

test('event cleanup removes fake hearts, motion drift, ghosts and reverse-control input', () => {
  const { game, engine, state, item } = createGame();
  game.start();
  state.event = { key: 'inverted' };
  state.ghost = {};
  state.hold = 1;
  state.items.push(item('fake', 'bad'), item('heart', 'good', { vx: 40 }));
  engine.cleanupEvent();
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].key, 'heart');
  assert.equal(state.items[0].vx, 0);
  assert.equal(state.event, null);
  assert.equal(state.ghost, null);
  assert.equal(state.hold, 0);
});

test('boss defeat commits campaign victory once and presents the finale once', () => {
  const { game, engine, state, effects, item, progress } = createGame({ unlocked: 18, currentScore: 400 });
  game.start('chaos');
  state.boss.hit(29);
  state.items.push(item('heart'));
  engine.update(.016);
  assert.equal(state.status, 'celebrating');
  assert.equal(state.boss.snapshot().defeated, true);
  assert.equal(effects.saves.length, 1);
  assert.equal(progress().finalDone, true);
  assert.equal(progress().unlocked, 18);
  const finalScore = state.totalScore;
  engine.checkCompletion();
  engine.complete(true);
  engine.update(1.2);
  engine.update(10);
  assert.equal(state.totalScore, finalScore);
  assert.equal(effects.saves.length, 1);
  assert.equal(effects.finals.length, 1);
  assert.equal(effects.finals[0][1].bossDefeated, true);
});

test('ordinary completion unlocks the next original memory after the hug transition', () => {
  const { game, engine, state, effects, item, sandbox, progress } = createGame();
  game.start('classic');
  for (let index = 0; index < sandbox.GameLevels.getLevel(0).target; index++) engine.catchGood(item('heart'));
  engine.checkCompletion();
  assert.equal(state.status, 'celebrating');
  assert.equal(state.player.reaction, 'hug');
  assert.equal(progress().unlocked, 1);
  assert.equal(effects.memories.length, 0);
  engine.update(1.2);
  assert.deepEqual(effects.unlocked, [0]);
  assert.equal(effects.memories[0][0], 0);
  assert.equal(sandbox.GameConfig.memories.length, 18);
  assert.ok(sandbox.GameConfig.memories.every(memory => memory.src && memory.caption));
});

test('Party scores never overwrite campaign progress or unlock campaign memories', () => {
  const saved = { playerName: 'Marta', unlocked: 7, currentScore: 246, finalDone: false };
  const { game, engine, state, effects, progress } = createGame(saved);
  game.start('party');
  assert.equal(state.totalScore, 0);
  state.partyTime = 180;
  engine.enterPartyBoss();
  state.boss.hit(18);
  engine.checkCompletion();
  engine.update(1.2);
  assert.deepEqual(progress(), saved);
  assert.equal(effects.saves.length, 0);
  assert.equal(effects.unlocked.length, 0);
  assert.equal(effects.partyScores.length, 1);
  assert.equal(effects.partyScores[0][0], 'Marta');
  assert.equal(effects.finals.length, 1);
  assert.equal(effects.finals[0][1].party, true);
});

test('Party visits all seasons and offers a finale within four active minutes', () => {
  const { game, engine, state, effects } = createGame();
  game.start('party');
  for (const [time, season] of [[44.99, 'summer'], [89.99, 'autumn'], [134.99, 'winter']]) {
    state.partyTime = time;
    engine.update(.02);
    assert.equal(state.season, season);
  }
  state.partyTime = 179.99;
  engine.update(.02);
  assert.equal(state.boss.snapshot().maxHp, 18);
  assert.equal(state.elapsed, 0);
  state.elapsed = 59.99;
  engine.update(.02);
  assert.equal(state.status, 'celebrating');
  engine.update(1.2);
  assert.equal(effects.finals.length, 1);
  assert.equal(effects.finals[0][1].party, true);
  assert.equal(effects.finals[0][1].bossDefeated, false);
});

test('golden goals count golden hearts and jackpots but ordinary hearts never cost a life', () => {
  const { game, engine, state, item } = createGame({ unlocked: 4, currentScore: 30 });
  game.start('chaos');
  state.combo = 7;
  state.multiplier = 2;
  engine.catchGood(item('heart'));
  assert.equal(state.lives, 3);
  assert.equal(state.goalProgress, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.multiplier, 1);
  assert.equal(state.totalScore, 28);
  engine.catchGood(item('golden'));
  engine.catchGood(item('jackpot'));
  assert.equal(state.goalProgress, 2);
});

test('golden-only objectives remain fair during Love Rush and magnetic attraction', () => {
  const { game, engine, state, item } = createGame({ unlocked: 4 });
  game.start('chaos');
  state.event = { key: 'love' };
  for (let index = 0; index < 20; index++) {
    state.items = [];
    state.spawnTimer = 2;
    engine.updateItems(.016);
    assert.equal(state.items.length, 1);
    assert.equal(state.items[0].key, 'golden');
  }
  state.items = [];
  state.spawnTimer = 0;
  state.event = { key: 'magnet' };
  const ordinary = item('heart', 'good', { x: 70, y: 150 });
  const golden = item('golden', 'good', { x: 70, y: 170 });
  const shield = item('shield', 'power', { x: 70, y: 190 });
  state.items.push(ordinary, golden, shield);
  engine.updateItems(.05);
  assert.equal(ordinary.x, 70);
  assert.ok(golden.x > 70);
  assert.ok(shield.x > 70);
});

test('inverse controls reverse both keyboard movement and scaled mobile pointer input', () => {
  const { game, engine, state, sandbox, element } = createGame();
  game.start('chaos');
  const middle = sandbox.GameConfig.world.width / 2;
  sandbox.emit('keydown', { key: 'ArrowRight' });
  engine.updatePlayer(.05);
  assert.ok(state.player.x > middle);
  state.player.x = middle;
  state.event = { key: 'inverted' };
  sandbox.emit('keydown', { key: 'ArrowRight' });
  engine.updatePlayer(.05);
  assert.ok(state.player.x < middle);
  engine.cleanupEvent();
  state.player.x = middle;
  element('game').emit('pointerdown', { clientX: 300 });
  engine.updatePlayer(.05);
  assert.ok(state.player.x > middle);
  element('game').emit('pointerup');
  state.event = { key: 'inverted' };
  state.player.x = middle;
  element('game').emit('pointerdown', { clientX: 300 });
  engine.updatePlayer(.05);
  assert.ok(state.player.x < middle);
  element('game').emit('pointercancel');
  assert.equal(state.pointerId, null);
  assert.equal(state.dragTarget, null);
});

test('chaos transitions preserve a held finger and restore normal pointer movement after inversion', () => {
  const { game, engine, state, sandbox, element } = createGame();
  game.start('chaos');
  const middle = sandbox.GameConfig.world.width / 2;
  element('game').emit('pointerdown', { clientX: 300 });
  const target = state.dragTarget;
  const event = { key: 'inverted', name: 'Na opak!', text: 'Test' };
  engine.directorActions([{ type: 'start', event }]);
  assert.equal(state.pointerId, 1);
  assert.equal(state.dragTarget, target);
  state.player.x = middle;
  element('game').emit('pointermove', { clientX: 310 });
  engine.updatePlayer(.05);
  assert.ok(state.player.x < middle);
  engine.directorActions([{ type: 'end', event, cancelled: false }]);
  assert.equal(state.pointerId, 1);
  state.player.x = middle;
  element('game').emit('pointermove', { clientX: 320 });
  engine.updatePlayer(.05);
  assert.ok(state.player.x > middle);
  // Keyboard users likewise should not have to release and press again.
  element('game').emit('pointerup');
  sandbox.emit('keydown', { key: 'ArrowRight' });
  const magnet = { key: 'magnet', name: 'Magnes', text: 'Test' };
  engine.directorActions([{ type: 'start', event: magnet }]);
  assert.equal(state.hold, 1);
  engine.directorActions([{ type: 'end', event: magnet, cancelled: false }]);
  assert.equal(state.hold, 1);
  game.pause();
  assert.equal(state.hold, 0);
  assert.equal(state.pointerId, null);
});

test('near-miss rewards apply at most once per obstacle and are absent from Classic', () => {
  for (const mode of ['classic', 'chaos']) {
    const { game, engine, state, sandbox, item } = createGame();
    game.start(mode);
    const obstacle = item('broken', 'bad');
    obstacle.x += sandbox.GameConfig.player.hitboxHalfWidth + obstacle.radius * .4 + 8;
    obstacle.y += sandbox.GameConfig.player.hitboxBottom + 1;
    state.items.push(obstacle);
    engine.updateItems(.016);
    const expected = mode === 'chaos' ? 2 : 0;
    assert.equal(state.totalScore, expected);
    engine.updateItems(.016);
    assert.equal(state.totalScore, expected);
  }
});

test('a shield absorbs damage and its grace period prevents same-frame stacked hits', () => {
  const { game, engine, state, item } = createGame();
  game.start();
  state.shieldCharges = 1;
  engine.hurt(item('broken', 'bad'));
  assert.equal(state.shieldCharges, 0);
  assert.equal(state.lives, 3);
  engine.hurt(item('broken', 'bad'));
  assert.equal(state.lives, 3);
  state.clock += 1;
  engine.hurt(item('broken', 'bad'));
  assert.equal(state.lives, 2);
});

test('time freeze slows collectibles while retaining responsive player movement', () => {
  const { game, engine, state, item } = createGame();
  game.start();
  state.event = { key: 'freeze' };
  const collectible = item('heart', 'good', { y: 100, vy: 100 });
  state.items.push(collectible);
  state.hold = 1;
  const previousX = state.player.x;
  engine.updatePlayer(.05);
  engine.updateItems(.05);
  assert.equal(collectible.y, 101.25);
  assert.ok(state.player.x - previousX > 10);
});

test('cancelled Last Heart does not grant survival reward and recovery uses its requested duration', () => {
  const { game, engine, state } = createGame();
  game.start();
  state.lives = 1;
  state.event = { key: 'lastheart' };
  engine.directorActions([{ type: 'end', event: { key: 'lastheart' }, cancelled: true }]);
  assert.equal(state.lives, 1);
  engine.directorActions([{ type: 'recovery', duration: 9 }]);
  assert.equal(state.recoveryUntil, state.clock + 9);
  engine.directorActions([{ type: 'end', event: { key: 'lastheart' }, cancelled: false }]);
  assert.equal(state.lives, 2);
});

test('stopping removes active simulation and cannot grant progress afterwards', () => {
  const { game, engine, state, effects } = createGame();
  game.start('party');
  engine.enterPartyBoss();
  state.event = { key: 'blackout' };
  game.stop();
  engine.update(500);
  assert.equal(state.status, 'menu');
  assert.equal(state.boss, null);
  assert.equal(state.event, null);
  assert.equal(state.items.length, 0);
  assert.equal(effects.saves.length + effects.partyScores.length + effects.finals.length, 0);
});

// This pilot sends only ordinary pointer coordinates. It neither teleports the
// player nor changes collectibles, objectives, scores, lives, boss HP or clocks.
function pilotPointer(fixture) {
  const { state, sandbox, element } = fixture;
  const cfg = sandbox.GameConfig;
  const width = cfg.world.width;
  const player = state.player;
  const goal = sandbox.GameLevels.getLevel(state.level);
  const goldenOnly = state.mode !== 'party' && !state.boss && goal.mode === 'golden';
  const wanted = state.items.filter(item => item.family !== 'bad'
    && (!goldenOnly || item.family === 'power' || ['golden', 'jackpot'].includes(item.key))
    && item.y < player.y + cfg.player.hitboxBottom && item.y > 0);
  wanted.sort((a, b) => b.y - a.y);
  let desired = wanted[0]?.x ?? width / 2;
  const hazards = state.items.filter(item => (item.family === 'bad'
    || goldenOnly && item.family === 'good' && !['golden', 'jackpot'].includes(item.key))
    && item.y > player.y - 90 && item.y < player.y + cfg.player.hitboxBottom + 8);
  const danger = x => hazards.reduce((sum, item) => {
    const padding = cfg.player.hitboxHalfWidth + item.radius * .4 + 8;
    return sum + (Math.abs(x - item.x) < padding ? 1 : 0);
  }, 0) + (state.ghost && Math.hypot(x - state.ghost.x, player.y - state.ghost.y) < 70 ? 2 : 0);
  if (danger(desired)) {
    const candidates = [cfg.player.margin, width - cfg.player.margin, player.x, width / 2];
    for (const hazard of hazards) candidates.push(hazard.x - 60, hazard.x + 60);
    const safe = candidates.filter(x => x >= cfg.player.margin && x <= width - cfg.player.margin);
    safe.sort((a, b) => danger(a) * 1000 + Math.abs(a - desired) - danger(b) * 1000 - Math.abs(b - desired));
    desired = safe[0] ?? desired;
  }
  if (state.event?.key === 'inverted') desired = width - desired;
  // The fixture renders 384 logical pixels into 360 CSS pixels, like a phone.
  const input = { pointerId: 1, clientX: desired / width * 360 };
  element('game').emit(state.pointerId === 1 ? 'pointermove' : 'pointerdown', input);
}

function autoplay(fixture, mode, limitSeconds) {
  const { game, state, engine, element, effects } = fixture;
  const events = new Set(), seasons = new Set(), bossPhases = new Set();
  let failures = 0, wasFailed = false, maxItems = 0, maxParticles = 0;
  game.start(mode);
  const step = .05;
  for (let frame = 0; frame < limitSeconds / step; frame++) {
    if (state.status === 'complete') {
      if (effects.finals.length) return { seconds: frame * step, failures, events, seasons, bossPhases, maxItems, maxParticles };
      element('nextBtn').emit('click');
    }
    if (state.status === 'playing') pilotPointer(fixture);
    engine.update(step);
    if (state.status === 'failed' && !wasFailed) failures++;
    wasFailed = state.status === 'failed';
    if (state.event) events.add(state.event.key);
    seasons.add(state.season);
    if (state.boss) bossPhases.add(state.boss.snapshot().phase);
    maxItems = Math.max(maxItems, state.items.length);
    maxParticles = Math.max(maxParticles, state.particles.length);
    assert.ok(Number.isFinite(state.totalScore) && Number.isFinite(state.levelScore));
    assert.ok(state.items.length <= 48 && state.particles.length <= 120 && state.floatingTexts.length <= 14);
  }
  assert.fail(`Pilot did not finish ${mode} in ${limitSeconds}s: level ${state.level + 1}, objective ${state.goalProgress}, status ${state.status}, failures ${failures}`);
}

test('seeded pointer-only pilot completes all 18 campaign memories and every boss phase', t => {
  const fixture = createGame({}, { seed: 20261016 });
  const run = autoplay(fixture, 'chaos', 1200);
  assert.equal(fixture.progress().unlocked, 18);
  assert.equal(fixture.progress().finalDone, true);
  assert.deepEqual(fixture.effects.unlocked, Array.from({ length: 18 }, (_, index) => index));
  assert.equal(fixture.effects.memories.length, 18);
  assert.equal(fixture.effects.finals.length, 1);
  assert.equal(fixture.state.boss.snapshot().defeated, true);
  assert.deepEqual([...run.bossPhases].sort(), [1, 2, 3]);
  assert.deepEqual([...run.seasons], ['spring', 'summer', 'autumn', 'winter']);
  assert.ok(run.events.size > 0);
  t.diagnostic(`Campaign completed in ${run.seconds.toFixed(1)} simulated seconds; retries ${run.failures}; max items ${run.maxItems}; max particles ${run.maxParticles}.`);
});

test('seeded pointer-only Party pilot defeats its boss within the four-minute show', t => {
  const original = { playerName: 'Alek', unlocked: 9, currentScore: 880, finalDone: false };
  const fixture = createGame(original, { seed: 10 });
  const run = autoplay(fixture, 'party', 242);
  assert.deepEqual(fixture.progress(), original);
  assert.equal(fixture.effects.saves.length, 0);
  assert.equal(fixture.effects.partyScores.length, 1);
  assert.equal(fixture.effects.finals.length, 1);
  assert.equal(fixture.state.boss.snapshot().defeated, true);
  assert.deepEqual([...run.seasons], ['spring', 'summer', 'autumn', 'winter']);
  assert.deepEqual([...run.bossPhases].sort(), [1, 2, 3]);
  assert.ok(run.events.has('jackpot') && run.events.has('haunted'));
  assert.ok(run.seconds >= 180 && run.seconds <= 241.2);
  t.diagnostic(`Party completed with boss defeated in ${run.seconds.toFixed(1)} simulated seconds; max items ${run.maxItems}; max particles ${run.maxParticles}.`);
});
