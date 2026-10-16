window.Game = (() => {
  'use strict';
  const cfg = GameConfig;
  const { width: W, height: H } = cfg.world;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const choose = list => list[Math.floor(Math.random() * list.length)];
  const state = {
    status: 'menu', mode: 'chaos', level: 0, clock: 0, elapsed: 0, partyTime: 0,
    totalScore: 0, levelScore: 0, checkpoint: 0, goalProgress: 0,
    lives: 3, combo: 0, multiplier: 1, items: [], particles: [], floatingTexts: [],
    player: { x: W / 2, y: H - 62, velocity: 0, reaction: 'idle' },
    reactionUntil: 0, shieldCharges: 0, ringUntil: 0, clockUntil: 0,
    magnetUntil: 0, slowUntil: 0, invulnerableUntil: 0,
    hold: 0, pointerId: null, dragTarget: null,
    spawnTimer: 0, phaseTimer: 0, shake: 0, bannerUntil: 0,
    season: 'spring', previousSeason: null, transition: 0,
    director: null, boss: null, ghost: null, event: null,
    completion: null, last: null, hudAt: 0, recoveryUntil: 0,
    paused: false, initialized: false
  };
  let canvas;
  const active = key => state.event?.key === key;
  const power = until => state.clock < until;
  const blocked = () => GameUI.getBlockingOverlay?.() || false;
  const reduced = () => GameUI.isReducedMotion?.() || false;
  const goal = () => state.mode === 'party'
    ? { mode: 'party', title: 'Cztery pory miłości', target: 180, seconds: 0, short: 'Zbieraj dobre rzeczy. Bawcie się razem!', speedMin: 88, speedMax: 126, spawnEvery: .72, badChance: .08, powerChance: .09, goldenChance: .18 }
    : GameLevels.getLevel(state.level);
  const isBoss = () => !!state.boss;
  const effectiveProgress = () => isBoss() ? state.boss.snapshot().maxHp - state.boss.snapshot().hp
    : state.mode === 'party' ? Math.min(180, state.partyTime)
    : goal().mode === 'survive' ? state.elapsed : state.goalProgress;
  const target = () => isBoss() ? state.boss.snapshot().maxHp : GameLevels.targetFor(goal());

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    canvas = document.getElementById('game');
    GameUI.init();
    GameRenderer.init(canvas);
    bindControls();
    document.getElementById('nextBtn').addEventListener('click', nextLevel);
    document.getElementById('closeBtn').addEventListener('click', () => {
      GameUI.hideUnlock();
      stop();
      document.getElementById('galleryBtn')?.click();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('blur', () => { clearInput(); if (state.status === 'playing') pause(); });
    requestAnimationFrame(frame);
  }

  function clearInput() {
    state.hold = 0;
    state.pointerId = null;
    state.dragTarget = null;
    state.player.velocity = 0;
  }

  function setSeason(key, animate = true) {
    if (state.season !== key) {
      state.previousSeason = state.season;
      state.transition = animate && !reduced() ? 1 : 0;
      state.season = key;
      if (animate) GameAudio.sfx.season?.();
    }
    GameUI.setSeason(PixelSeasons.list.find(s => s.key === key) || PixelSeasons.list[0]);
  }

  function start(mode = GameUI.getMode?.() || 'chaos') {
    state.mode = ['classic', 'chaos', 'party'].includes(mode) ? mode : 'chaos';
    GameUI.applyPlayerName();
    state.director = ChaosDirector.create({ mode: state.mode });
    state.partyTime = 0;
    state.clock = 0;
    state.hudAt = 0;
    state.boss = null;
    state.completion = null;
    state.totalScore = state.mode === 'party' ? 0 : GameUI.getProgress().currentScore;
    const progress = GameUI.getProgress();
    if (state.mode !== 'party' && progress.finalDone) {
      GameUI.closeStart();
      GameUI.showFinal(progress.currentScore);
      return;
    }
    startLevel(state.mode === 'party' ? 0 : Math.min(18, progress.unlocked));
  }

  function startLevel(index) {
    if (!state.director) state.director = ChaosDirector.create({ mode: state.mode });
    state.director.cancel();
    cleanupEvent();
    state.level = clamp(index, 0, 18);
    state.checkpoint = state.mode === 'party' ? state.totalScore : GameUI.getProgress().currentScore;
    state.totalScore = state.checkpoint;
    state.levelScore = 0;
    state.goalProgress = 0;
    state.elapsed = 0;
    state.hudAt = 0;
    state.spawnTimer = 0;
    state.items.length = 0;
    state.particles.length = 0;
    state.floatingTexts.length = 0;
    state.lives = cfg.startLives;
    state.combo = 0;
    state.multiplier = 1;
    state.shieldCharges = 0;
    state.ringUntil = state.clockUntil = state.magnetUntil = state.slowUntil = 0;
    state.invulnerableUntil = state.recoveryUntil = 0;
    state.player.x = W / 2;
    state.player.reaction = 'idle';
    state.reactionUntil = 0;
    state.phaseTimer = 0;
    state.completion = null;
    state.boss = state.mode !== 'party' && index === 18 ? GameBoss.create({ party: false }) : null;
    clearInput();
    setSeason(state.mode === 'party' ? 'spring' : PixelSeasons.forLevel(index).key);
    state.status = 'playing';
    state.paused = false;
    GameUI.hideUnlock();
    GameUI.closeStart();
    GameUI.refs.finalOverlay.classList.remove('show');
    GameUI.setPlaying(true);
    GameUI.setPaused(false);
    GameAudio.sfx.start();
    updateHud();
  }

  function pause() {
    if (!['playing', 'celebrating', 'failed'].includes(state.status)) return;
    state.paused = true;
    clearInput();
    GameUI.setPaused(true);
  }
  function resume() {
    if (state.status === 'menu') return;
    state.paused = false;
    state.last = null;
    clearInput();
    GameUI.setPaused(false);
  }
  function stop() {
    state.status = 'menu';
    state.paused = false;
    clearInput();
    state.director?.cancel();
    cleanupEvent();
    state.items.length = 0;
    state.boss = null;
    state.completion = null;
    GameUI.setPaused(false);
    GameUI.showMenu();
  }
  function nextLevel() {
    GameUI.hideUnlock();
    if (GameUI.getModalMode() === 'gallery') return;
    startLevel(Math.min(18, GameUI.getProgress().unlocked));
  }

  function score(amount) {
    state.totalScore = Math.max(0, state.totalScore + Math.floor(amount));
    state.levelScore = Math.max(0, state.levelScore + Math.floor(amount));
    if (goal().mode === 'score') state.goalProgress = state.levelScore;
  }
  function text(message, x = state.player.x, y = state.player.y - 48, color = '#fff0c9') {
    if (state.floatingTexts.length >= 14) state.floatingTexts.shift();
    state.floatingTexts.push({ text: message, x, y, color, life: 1.1, maxLife: 1.1 });
  }
  function burst(x, y, color, count = 10) {
    if (reduced()) count = Math.min(4, count);
    for (let i = 0; i < count && state.particles.length < 120; i++) {
      state.particles.push({ x, y, vx: (Math.random() - .5) * 85, vy: -35 - Math.random() * 80,
        size: 2 + i % 3, color, life: .65 + Math.random() * .3, maxLife: 1 });
    }
  }
  function react(reaction, seconds = .6) {
    state.player.reaction = reaction;
    state.reactionUntil = state.clock + seconds;
  }
  function announce(title, message, activeEvent = false, seconds = 2.4) {
    GameUI.showChaos(title, message, activeEvent);
    state.bannerUntil = state.clock + seconds;
  }
  function spawnItem(key, family, x, y = -24, speed) {
    const table = family === 'good' ? cfg.goodItems : family === 'power' ? cfg.powerItems : cfg.badItems;
    const def = table[key];
    if (!def || state.items.length >= 48) return;
    const level = goal();
    state.items.push({ ...def, key, family, x: x ?? 24 + Math.random() * (W - 48), y,
      age: 0, nearMiss: false, vy: speed ?? level.speedMin + Math.random() * (level.speedMax - level.speedMin), vx: 0 });
  }
  function randomSpawn() {
    const level = goal();
    const safe = state.lives <= 1 || power(state.recoveryUntil) || active('lastheart');
    if (isBoss()) {
      if (Math.random() < .08) spawnItem('shield', 'power');
      else spawnItem(Math.random() < .3 ? 'golden' : 'heart', 'good');
      return;
    }
    if (active('jackpot')) {
      spawnItem(Math.random() < .16 ? 'jackpot' : 'golden', 'good');
      return;
    }
    if (active('love')) {
      spawnItem(level.mode === 'golden' ? 'golden' : level.mode === 'locks' ? 'lock' : Math.random() < .4 ? 'golden' : 'heart', 'good');
      return;
    }
    if (active('haunted') && Math.random() < .55) { spawnItem('golden', 'good', undefined, -20, 140); return; }
    if (active('bills') && !safe && Math.random() < .58) { spawnItem(choose(['bill', 'alarm', 'laundry']), 'bad'); return; }
    const roll = Math.random();
    if (roll < level.powerChance) {
      const keys = state.mode === 'classic' ? ['shield', 'ring', 'clock', 'camera'] : ['shield', 'ring', 'clock', 'camera', 'magnet', 'gift'];
      spawnItem(choose(keys), 'power');
    } else if (!safe && roll < level.powerChance + level.badChance) {
      const pool = state.level < 2 ? ['broken'] : ['broken', 'drama', 'bill', 'storm', 'laundry'];
      if (state.mode !== 'classic' && state.level > 5) pool.push('hazard');
      spawnItem(choose(pool), 'bad');
    } else {
      let key;
      if (level.mode === 'golden') key = Math.random() < .6 ? 'golden' : 'heart';
      else if (level.mode === 'locks' && Math.random() < .36) key = 'lock';
      else key = Math.random() < level.goldenChance ? 'golden' : choose(['heart', 'heart', 'heart', 'lock', 'star']);
      if (active('fake') && key === 'heart' && Math.random() < .32) spawnItem('fake', 'bad');
      else spawnItem(key, 'good');
    }
  }

  function catchGood(item) {
    if (!isBoss() && goal().mode === 'golden' && item.key !== 'golden' && item.key !== 'jackpot') {
      state.combo = 0; state.multiplier = 1; score(-2); text('Tylko złote!', item.x, item.y); return;
    }
    state.combo++;
    const before = state.multiplier;
    state.multiplier = Math.min(5, 1 + Math.floor(state.combo / 4));
    const gained = item.value * state.multiplier * (power(state.ringUntil) ? 2 : 1);
    score(gained);
    if (before !== state.multiplier) { GameAudio.sfx.combo?.(state.multiplier); text(`KOMBO ×${state.multiplier}`, W / 2, 280); }
    if (isBoss()) {
      state.boss.hit(1);
      react('boss');
    } else {
      const type = goal().mode;
      if (type === 'hearts' && ['heart', 'golden', 'jackpot'].includes(item.key) || type === 'locks' && item.key === 'lock'
        || type === 'golden' && ['golden', 'jackpot'].includes(item.key) || type === 'love') state.goalProgress++;
      react('collect');
    }
    if (state.ghost && item.key === 'golden') {
      state.ghost.hearts--;
      if (state.ghost.hearts <= 0) {
        score(30); burst(state.ghost.x, state.ghost.y, '#e7cef2', 20);
        text('Duch pokonany! +30', W / 2, 280);
        state.ghost = null;
        state.director.cancel();
        cleanupEvent(true);
        GameHaptics.success();
      }
    }
    burst(item.x, item.y, item.color);
    text(`+${gained}`, item.x, item.y - 18, item.color);
    GameAudio.sfx.good(item.key);
    GameHaptics.good();
  }

  function hurt(item) {
    if (power(state.invulnerableUntil)) return;
    if (state.shieldCharges) {
      state.shieldCharges--;
      state.invulnerableUntil = state.clock + .65;
      burst(state.player.x, state.player.y, '#93d9c5', 16);
      text('Tarcza!'); GameAudio.sfx.power(); GameHaptics.power(); return;
    }
    state.combo = 0; state.multiplier = 1;
    score(item.points || -5);
    state.lives = Math.max(0, state.lives - (item.life || 0));
    state.invulnerableUntil = state.clock + 1.1;
    if (item.effect === 'slowPlayer') state.slowUntil = state.clock + 2;
    if (!reduced()) state.shake = .3;
    react('hit', .8);
    text(item.life ? 'Auuu! −1 życie' : `${item.points || -5} pkt`, item.x, item.y - 20, '#f298a8');
    burst(item.x, item.y, '#dd7e8e');
    GameAudio.sfx.bad(); GameHaptics.bad();
    if (state.lives <= 0) {
      if (state.mode === 'party') {
        state.lives = 2; state.shieldCharges = 1; state.recoveryUntil = state.clock + 6;
        state.items = state.items.filter(it => it.family !== 'bad');
        announce('Gramy dalej!', 'Impreza trwa. Dwa serca i chwila oddechu.', true);
      } else fail();
    }
  }
  function gift() {
    if (Math.random() < .75 || state.lives <= 1) {
      const reward = choose(['shield', 'ring', 'points']);
      if (reward === 'shield') state.shieldCharges = Math.min(2, state.shieldCharges + 1);
      if (reward === 'ring') state.ringUntil = state.clock + 10;
      if (reward === 'points') score(25);
      text(reward === 'points' ? 'Prezent: +25!' : reward === 'ring' ? 'Prezent: punkty ×2!' : 'Prezent: tarcza!');
      GameAudio.sfx.jackpot?.();
    } else {
      score(-8); text('Rachunek w prezencie… −8', W / 2, 300, '#eaa398');
    }
  }
  function catchPower(item) {
    if (item.key === 'shield') state.shieldCharges = Math.min(2, state.shieldCharges + 1);
    if (item.key === 'ring') state.ringUntil = state.clock + 10;
    if (item.key === 'clock') state.clockUntil = state.clock + 8;
    if (item.key === 'magnet') state.magnetUntil = state.clock + 8;
    if (item.key === 'gift') gift();
    if (item.key === 'camera') {
      if (isBoss()) state.boss.hit(2);
      else if (goal().mode === 'score') score(8);
      else if (goal().mode === 'survive') state.elapsed += 3;
      else if (state.mode !== 'party') state.goalProgress += 2;
    }
    text(item.label, item.x, item.y - 20, item.color);
    burst(item.x, item.y, item.color, 15);
    react('collect'); GameAudio.sfx.power(); GameHaptics.power();
  }

  function cleanupEvent(keepInput = false) {
    state.event = null;
    state.ghost = null;
    state.shake = 0;
    state.bannerUntil = 0;
    state.items = state.items.filter(item => item.key !== 'fake');
    for (const item of state.items) item.vx = 0;
    if (!keepInput) clearInput();
    GameUI.hideChaos();
  }
  function directorActions(actions) {
    for (const action of actions) {
      const event = action.event;
      if (action.type === 'warning') {
        announce(event.name, event.text, false, 2.8);
        GameAudio.sfx.warning?.(); GameHaptics.warning();
      } else if (action.type === 'start') {
        state.event = event;
        announce(event.name, event.text, true, 1.8);
        if (event.key === 'haunted') {
          state.ghost = { x: W / 2, y: 160, hearts: 3, cooldown: 2.2 };
          GameAudio.sfx.ghost?.(); react('scared', 2);
        }
        if (event.key === 'gift') spawnItem('gift', 'power', state.player.x, 150);
        if (event.key === 'storm') {
          if (!reduced()) state.shake = .45;
          for (const item of state.items) item.vx = (Math.random() - .5) * 48;
        }
        if (['love', 'jackpot', 'lastheart'].includes(event.key)) state.items = state.items.filter(item => item.family !== 'bad');
        if (event.key === 'lastheart') { state.shieldCharges = Math.max(1, state.shieldCharges); react('scared', 1); }
        if (event.key === 'jackpot') GameAudio.sfx.jackpot?.();
      } else if (action.type === 'end') {
        if (!action.cancelled && (event?.key || state.event?.key) === 'lastheart' && state.lives === 1) {
          state.lives = 2; text('Ostatnie serce uratowane!', W / 2, 280); GameHaptics.success();
        }
        cleanupEvent(true);
      } else if (action.type === 'recovery') {
        state.recoveryUntil = state.clock + (action.duration || 7);
        if (action.opportunity === 'shield' || action.reward === 'shield') {
          state.items = state.items.filter(item => item.family !== 'bad');
          spawnItem('shield', 'power', state.player.x, 250, 85);
        }
      }
    }
  }
  function updateGhost(dt) {
    if (!state.ghost) return;
    const ghost = state.ghost;
    const dx = state.player.x - ghost.x, dy = state.player.y - ghost.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    ghost.x += dx / distance * 48 * dt;
    ghost.y += dy / distance * 48 * dt;
    ghost.cooldown -= dt;
    if (distance < 40 && ghost.cooldown <= 0) {
      hurt({ x: ghost.x, y: ghost.y, points: -5, life: 1 });
      if (state.ghost) { ghost.y -= 105; ghost.cooldown = 2.5; }
    }
  }

  function enterPartyBoss() {
    state.director.cancel(); cleanupEvent();
    state.items.length = 0;
    state.boss = GameBoss.create({ party: true });
    state.elapsed = 0;
    state.lives = Math.max(3, state.lives);
    state.shieldCharges = 1;
    state.spawnTimer = 0;
    announce('Życie po ślubie', 'Wielki finał! Zbieraj serca, uważaj na zapowiedzi.', true, 3);
    GameAudio.sfx.boss?.();
  }
  function updateBoss(dt) {
    for (const action of state.boss.update(dt, { playerX: state.player.x / W })) {
      if (action.type === 'phase') {
        announce(action.name || action.phaseName || 'Nowy etap', 'Razem poradzicie sobie ze wszystkim.', true);
        GameAudio.sfx.boss?.();
      }
      if (action.type === 'telegraph') GameAudio.sfx.warning?.();
      if (action.type === 'attack') {
        for (const item of action.items) spawnItem(item.key, item.family, item.x * W, 165, item.vy);
      }
    }
  }
  function updatePlayer(dt) {
    const previous = state.player.x;
    const inverted = active('inverted') ? -1 : 1;
    const speed = cfg.player.holdSpeed * (power(state.slowUntil) ? .7 : 1);
    if (state.dragTarget !== null && state.pointerId !== null) {
      const destination = active('inverted') ? W - state.dragTarget : state.dragTarget;
      const factor = state.season === 'winter' && state.mode !== 'classic' ? 11 : 18;
      const delta = (destination - state.player.x) * (1 - Math.exp(-factor * dt));
      state.player.x += clamp(delta, -speed * 1.9 * dt, speed * 1.9 * dt);
      state.player.velocity = (state.player.x - previous) / Math.max(dt, .001);
    } else if (state.season === 'winter' && state.mode !== 'classic') {
      state.player.velocity += (state.hold * inverted * speed - state.player.velocity) * (1 - Math.exp(-(state.hold ? 10 : 5) * dt));
      state.player.x += state.player.velocity * dt;
    } else {
      state.player.velocity = state.hold * inverted * speed;
      state.player.x += state.player.velocity * dt;
    }
    state.player.x = clamp(state.player.x, cfg.player.margin, W - cfg.player.margin);
    if (state.clock >= state.reactionUntil) state.player.reaction = state.ghost ? 'scared' : isBoss() ? 'boss' : 'idle';
  }
  function updateItems(dt) {
    let rate = isBoss() ? .52 : goal().spawnEvery;
    if (['love', 'jackpot', 'haunted'].some(active)) rate *= .7;
    if (active('bills')) rate *= .9;
    state.spawnTimer += dt;
    if (state.spawnTimer >= rate) { state.spawnTimer -= rate; randomSpawn(); }
    const factor = (power(state.clockUntil) ? .65 : 1) * (active('freeze') ? .25 : 1) * (active('turbo') ? 2 : 1);
    for (const item of state.items) {
      item.age += dt;
      item.y += item.vy * factor * dt;
      item.x = clamp(item.x + (item.vx || 0) * dt, 18, W - 18);
      item.vx *= Math.exp(-2 * dt);
      const attraction = active('magnet') || power(state.magnetUntil) || isBoss() && state.mode === 'party';
      const unwantedHeart = !isBoss() && goal().mode === 'golden' && item.family === 'good' && !['golden', 'jackpot'].includes(item.key);
      if (attraction && item.family !== 'bad' && !unwantedHeart && item.y > 100) item.x += (state.player.x - item.x) * (1 - Math.exp(-2.4 * dt));
      const dx = Math.abs(item.x - state.player.x);
      const half = cfg.player.hitboxHalfWidth + item.radius * .4;
      if (item.y > state.player.y - cfg.player.hitboxTop && item.y < state.player.y + cfg.player.hitboxBottom && dx < half) {
        item.hit = true;
        if (item.family === 'good') catchGood(item);
        else if (item.family === 'power') catchPower(item);
        else hurt(item);
        if (state.status !== 'playing') break;
        checkCompletion();
        if (state.status !== 'playing') break;
      }
      if (!item.hit && !item.nearMiss && item.family === 'bad' && item.y > state.player.y + cfg.player.hitboxBottom) {
        item.nearMiss = true;
        if (dx >= half && dx < half + 16 && state.mode !== 'classic') {
          score(2); text('O włos! +2', item.x, state.player.y - 50, '#a9ddd0'); GameAudio.sfx.nearMiss?.();
        }
      }
    }
    state.items = state.items.filter(item => !item.hit && item.y < H + 30);
  }

  function fail() {
    state.status = 'failed'; state.phaseTimer = 1.7;
    state.totalScore = state.checkpoint; state.levelScore = 0;
    state.director.cancel(); cleanupEvent();
    announce('Jeszcze raz, razem', 'Wspomnienia są bezpieczne. Powtarzamy ten poziom.', false, 1.7);
    GameAudio.sfx.fail(); GameHaptics.fail();
  }
  function checkCompletion() {
    if (state.status !== 'playing') return;
    if (isBoss()) {
      if (state.boss.snapshot().defeated || state.boss.snapshot().hp <= 0) complete(true);
      return;
    }
    if (state.mode === 'party') return;
    if (effectiveProgress() >= target()) complete(false);
  }
  function complete(final) {
    if (state.status !== 'playing') return;
    state.status = 'celebrating'; state.phaseTimer = 1.15;
    state.director.cancel(); cleanupEvent();
    score((state.lives >= 3 ? 25 : 10) + Math.max(0, Math.round(25 - state.elapsed / 3)));
    react('hug', 3);
    state.completion = { final, totalScore: state.totalScore };
    if (state.mode !== 'party') {
      const saved = { ...GameUI.getProgress(), currentScore: state.totalScore };
      if (final) { saved.finalDone = true; saved.unlocked = 18; }
      else saved.unlocked = Math.max(saved.unlocked, state.level + 1);
      GameUI.setProgress(saved, true);
    } else {
      GameStorage.recordPartyScore?.(GameUI.getProgress().playerName, state.totalScore);
    }
    burst(state.player.x, state.player.y - 30, '#ffe2a2', 32);
    GameAudio.sfx.complete(); GameHaptics.success();
    updateHud();
  }
  function finishCelebration() {
    state.status = 'complete';
    GameUI.setPlaying(false);
    const completion = state.completion;
    if (completion.final || state.mode === 'party') {
      GameUI.showFinal(completion.totalScore, { party: state.mode === 'party', bossDefeated: !!state.boss?.snapshot().defeated, elapsed: state.partyTime });
    } else {
      GameGallery.markUnlocked(state.level);
      GameGallery.showMemory(state.level, true, `Razem zdobyliście ${state.levelScore} pkt. Kolejne wspomnienie czeka!`);
    }
  }
  function updateParticles(dt) {
    for (const p of state.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 130 * dt; }
    for (const p of state.floatingTexts) { p.life -= dt; p.y -= 28 * dt; }
    state.particles = state.particles.filter(p => p.life > 0);
    state.floatingTexts = state.floatingTexts.filter(p => p.life > 0);
  }

  function update(dt) {
    if (state.paused || blocked() || state.status === 'menu' || state.status === 'complete') return;
    state.clock += dt;
    state.transition = Math.max(0, state.transition - dt * 1.1);
    state.shake = Math.max(0, state.shake - dt);
    updateParticles(dt);
    if (state.bannerUntil && state.clock >= state.bannerUntil) { GameUI.hideChaos(); state.bannerUntil = 0; }
    if (state.status === 'failed' || state.status === 'celebrating') {
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) state.status === 'failed' ? startLevel(state.level) : finishCelebration();
      return;
    }
    state.elapsed += dt;
    if (state.mode === 'party') {
      state.partyTime += dt;
      if (!isBoss()) {
        setSeason(PixelSeasons.list[Math.min(3, Math.floor(state.partyTime / cfg.party.seasonSeconds))].key);
        if (state.partyTime >= cfg.party.journeySeconds) enterPartyBoss();
      }
    }
    if (isBoss()) updateBoss(dt);
    else directorActions(state.director.update(dt, { lives: state.lives, level: state.level, goalMode: goal().mode, boss: false, partyTime: state.partyTime }));
    updatePlayer(dt);
    updateItems(dt);
    if (state.status !== 'playing') return;
    updateGhost(dt);
    if (state.status !== 'playing') return;
    checkCompletion();
    if (state.status !== 'playing') return;
    if (isBoss() && state.elapsed >= (state.mode === 'party' ? cfg.party.bossSeconds : 120)) {
      if (state.mode === 'party') complete(true);
      else fail();
    } else if (!isBoss() && state.mode !== 'party' && goal().seconds && state.elapsed >= goal().seconds && goal().mode !== 'survive') fail();
    if (state.clock >= state.hudAt) { updateHud(); state.hudAt = state.clock + .1; }
  }
  function updateHud() {
    const boss = state.boss?.snapshot();
    const seconds = boss ? (state.mode === 'party' ? 60 : 120) - state.elapsed : goal().seconds ? goal().seconds - state.elapsed : null;
    const powers = [];
    if (state.shieldCharges) powers.push(`Tarcza ×${state.shieldCharges}`);
    if (power(state.ringUntil)) powers.push(`Punkty ×2: ${Math.ceil(state.ringUntil - state.clock)}s`);
    if (power(state.clockUntil)) powers.push('Spowolnienie');
    if (power(state.magnetUntil)) powers.push('Magnes');
    GameUI.updateHud({ title: boss ? 'Życie po ślubie' : goal().title,
      objective: boss ? `${boss.phaseName} · zbieraj serca` : goal().short,
      progress: effectiveProgress(), target: target(), timeLeft: seconds,
      levelScore: state.levelScore, totalScore: state.totalScore, multiplier: state.multiplier,
      combo: state.combo, lives: state.lives, shieldCharges: state.shieldCharges,
      ringActive: power(state.ringUntil), mode: state.mode, powers, ghostHearts: state.ghost?.hearts,
      bossPhase: boss?.phaseName, partyTime: state.mode === 'party' ? state.partyTime : null });
    const pace = state.director?.snapshot();
    if (boss) GameUI.setEvent(boss.attackState === 'telegraph' ? 'Uwaga, nadchodzi atak!' : `ETAP ${boss.phase}/3`);
    else if (state.mode === 'classic') GameUI.setEvent('Klasyczna przygoda');
    else if (pace?.phase === 'active') GameUI.setEvent(`${pace.event?.name || 'Chaos'} · ${Math.ceil(pace.remaining)}s`);
    else if (pace?.phase === 'anticipation') GameUI.setEvent('Za chwilę…');
    else if (pace?.phase === 'recovery') GameUI.setEvent('Chwila oddechu');
    else GameUI.setEvent('Spokojnie… na razie');
  }

  function render() {
    if (state.status === 'complete') return;
    if (state.status === 'menu') {
      if (GameUI.refs.menuCanvas) GameRenderer.renderPreview(GameUI.refs.menuCanvas, 'spring');
      return;
    }
    const boss = state.boss?.snapshot();
    GameRenderer.draw({ time: state.clock, season: state.season, previousSeason: state.previousSeason,
      transition: state.transition, player: { ...state.player, shield: state.shieldCharges, ring: power(state.ringUntil), ghost: !!state.ghost, boss: !!boss },
      items: state.items, particles: state.particles, floatingTexts: state.floatingTexts,
      ghost: state.ghost, boss: boss ? { ...boss, attackX: boss.attackX * W, attackLanes: boss.attackLanes?.map(x => x * W), safeLane: boss.safeLane * W } : null,
      event: state.event, shake: reduced() ? 0 : state.shake * 12, reducedMotion: reduced(), status: state.status, celebrate: state.status === 'celebrating' });
  }
  function frame(timestamp) {
    const dt = state.last === null ? 0 : Math.min(.05, Math.max(0, (timestamp - state.last) / 1000));
    state.last = timestamp;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  function bindControls() {
    for (const [id, direction] of [['leftBtn', -1], ['rightBtn', 1]]) {
      const button = document.getElementById(id);
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        if (state.paused) return;
        state.dragTarget = null; state.pointerId = null; state.hold = direction;
        button.setPointerCapture?.(event.pointerId);
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => { state.hold = 0; });
    }
    document.getElementById('pauseBtn').addEventListener('click', () => state.paused ? resume() : pause());
    const keyboard = event => !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName);
    window.addEventListener('keydown', event => {
      if (!keyboard(event) || state.status === 'menu' || blocked()) return;
      if (['ArrowLeft', 'ArrowRight', ' ', 'p', 'P'].includes(event.key)) event.preventDefault();
      if ([' ', 'p', 'P'].includes(event.key) && !event.repeat) { state.paused ? resume() : pause(); return; }
      if (state.paused) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { state.hold = event.key === 'ArrowLeft' ? -1 : 1; state.dragTarget = null; }
    });
    window.addEventListener('keyup', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') state.hold = 0; });
    const pointerTarget = event => {
      const rect = canvas.getBoundingClientRect();
      state.dragTarget = clamp((event.clientX - rect.left) / rect.width * W, cfg.player.margin, W - cfg.player.margin);
    };
    canvas.addEventListener('pointerdown', event => {
      if (state.status !== 'playing' || state.paused || blocked()) return;
      event.preventDefault(); state.pointerId = event.pointerId; state.hold = 0;
      canvas.setPointerCapture?.(event.pointerId); pointerTarget(event);
    });
    canvas.addEventListener('pointermove', event => { if (state.pointerId === event.pointerId) pointerTarget(event); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { state.pointerId = null; state.dragTarget = null; });
  }

  // Read-only diagnostics: useful for accessibility tooling and browser smoke tests.
  function inspect() {
    return JSON.parse(JSON.stringify({ ...state, director: state.director?.snapshot(), boss: state.boss?.snapshot() }));
  }
  return { init, start, startLevel, pause, resume, stop, inspect };
})();

document.addEventListener('DOMContentLoaded', Game.init);
