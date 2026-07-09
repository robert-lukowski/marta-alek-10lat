window.Game = (() => {
  const cfg = GameConfig;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const state = {
    level: 0,
    levelScore: 0,
    totalScore: 0,
    levelStartScore: 0,
    goalProgress: 0,
    lives: cfg.startLives,
    combo: 0,
    multiplier: 1,
    running: false,
    paused: false,
    last: 0,
    spawnTimer: 0,
    elapsed: 0,
    gameClock: 0,
    items: [],
    player: { x: W/2, y: H-74, w: 82, h: 54 },
    hold: 0,
    dragPointerId: null,
    dragStartX: 0,
    playerStartX: 0,
    dragTargetX: W/2,
    popParticles: [],
    floatingTexts: [],
    shieldCharges: 0,
    ringUntil: 0,
    clockUntil: 0,
    playerSlowUntil: 0,
    failTimer: 0,
    failMessage: '',
    lastCompletionSummary: ''
  };

  function rand(a,b) { return a + Math.random()*(b-a); }
  function clamp(v,a,b) { return Math.max(a, Math.min(b, v)); }
  function isRingActive() { return state.gameClock < state.ringUntil; }
  function isClockActive() { return state.gameClock < state.clockUntil; }
  function isPlayerSlowed() { return state.gameClock < state.playerSlowUntil; }
  function currentGoal() { return GameLevels.getLevel(state.level); }
  function currentTarget() { return GameLevels.targetFor(currentGoal()); }
  function currentProgress() { return currentGoal().mode === 'survive' ? Math.min(currentGoal().seconds, state.elapsed) : state.goalProgress; }
  function updateMultiplier() { state.multiplier = Math.min(5, 1 + Math.floor(state.combo / 4)); }
  function choose(list) { return list[Math.floor(Math.random() * list.length)]; }
  function nextPlayableLevel() {
    const progress = GameUI.getProgress();
    return progress.unlocked < cfg.memories.length ? progress.unlocked : cfg.memories.length;
  }

  function init() {
    GameUI.init();
    bindControls();
    document.getElementById('startBtn').addEventListener('click', () => startLevel(nextPlayableLevel()));
    document.getElementById('startScreenBtn').addEventListener('click', () => { GameUI.applyPlayerName(); startLevel(nextPlayableLevel()); });
    document.getElementById('nextBtn').addEventListener('click', nextAction);
    document.getElementById('closeBtn').addEventListener('click', () => { GameUI.hideUnlock(); document.getElementById('gallerySection').scrollIntoView({ behavior:'smooth' }); });
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    requestAnimationFrame(loop);
  }

  function startLevel(index) {
    const progress = GameUI.getProgress();
    if (index >= cfg.memories.length && progress.finalDone) { GameUI.showFinal(progress.currentScore); return; }
    state.level = Math.min(index, cfg.memories.length);
    state.levelStartScore = progress.currentScore || 0;
    state.totalScore = state.levelStartScore;
    state.levelScore = 0;
    state.goalProgress = 0;
    state.lives = cfg.startLives;
    state.combo = 0;
    state.multiplier = 1;
    state.elapsed = 0;
    state.items = [];
    state.popParticles = [];
    state.floatingTexts = [];
    state.spawnTimer = 0;
    state.failTimer = 0;
    state.failMessage = '';
    state.shieldCharges = 0;
    state.ringUntil = 0;
    state.clockUntil = 0;
    state.playerSlowUntil = 0;
    state.player.x = W/2;
    state.dragTargetX = state.player.x;
    state.running = true;
    state.paused = false;
    state.hold = 0;
    GameUI.closeStart();
    GameUI.refs.finalOverlay.classList.remove('show');
    GameUI.hideUnlock();
    document.getElementById('pauseBtn').textContent = 'Pauza';
    GameAudio.ensureReady();
    GameAudio.sfx.start();
    updateHud();
    canvas.scrollIntoView({ behavior:'smooth', block:'center' });
  }
  function failLevel(message='Jeszcze raz, od tego samego levelu') {
    if (!state.running) return;
    state.running = false;
    state.paused = false;
    state.totalScore = state.levelStartScore;
    state.levelScore = 0;
    state.failTimer = 1.45;
    state.failMessage = message;
    state.combo = 0;
    updateMultiplier();
    GameAudio.sfx.fail();
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    updateHud();
  }
  function completeLevel() {
    state.running = false;
    const goal = currentGoal();
    const allLivesBonus = state.lives === cfg.startLives ? 25 + state.level * 2 : 0;
    const paceTarget = goal.seconds || Math.max(26, goal.target * 3);
    const quickBonus = Math.max(0, Math.ceil((paceTarget - state.elapsed) * 1.5));
    const bonus = allLivesBonus + quickBonus;
    addScore(bonus);
    state.lastCompletionSummary = `Bonus: ${bonus} pkt${allLivesBonus ? ' za komplet żyć' : ''}${quickBonus ? ' i szybkie tempo' : ''}.`;
    let progress = GameUI.getProgress();
    progress.currentScore = state.totalScore;
    if (state.level >= cfg.memories.length) {
      progress.finalDone = true;
      progress.unlocked = cfg.memories.length;
      progress = GameUI.setProgress(progress, true);
      GameUI.showFinal(progress.currentScore);
      return;
    }
    if (progress.unlocked < state.level + 1) progress.unlocked = state.level + 1;
    progress = GameUI.setProgress(progress, true);
    GameGallery.markUnlocked(state.level);
    GameAudio.sfx.complete();
    GameEffects.confetti(false);
    if (navigator.vibrate) navigator.vibrate([25, 35, 25]);
    GameGallery.showMemory(state.level, true, state.lastCompletionSummary);
  }
  function nextAction() {
    GameUI.hideUnlock();
    if (GameUI.getModalMode() === 'gallery') return;
    const progress = GameUI.getProgress();
    if (progress.unlocked >= cfg.memories.length) startLevel(cfg.memories.length);
    else startLevel(progress.unlocked);
  }
  function addScore(amount) {
    const value = Math.floor(amount);
    state.levelScore = Math.max(0, state.levelScore + value);
    state.totalScore = Math.max(0, state.totalScore + value);
  }
  function updateHud() {
    const goal = currentGoal();
    GameUI.updateHud({
      title: goal.final ? goal.title : `Level ${state.level + 1} - ${goal.title}`,
      progress: currentProgress(),
      target: currentTarget(),
      timeLeft: goal.seconds ? goal.seconds - state.elapsed : null,
      levelScore: state.levelScore,
      totalScore: state.totalScore,
      multiplier: state.multiplier,
      combo: state.combo,
      lives: state.lives,
      shieldCharges: state.shieldCharges,
      ringActive: isRingActive()
    });
  }
  function spawn() {
    const goal = currentGoal();
    const r = Math.random();
    let family = 'good';
    if (r < goal.powerChance) family = 'power';
    else if (r < goal.powerChance + goal.badChance) family = 'bad';
    let key, def;
    if (family === 'power') {
      key = choose(['shield','ring','clock','camera']);
      def = cfg.powerItems[key];
    } else if (family === 'bad') {
      const badPool = state.level < 2 ? ['broken'] : state.level < 5 ? ['broken','storm','bill'] : ['broken','storm','drama','bill'];
      key = choose(badPool);
      def = cfg.badItems[key];
    } else {
      if (goal.mode === 'golden' && Math.random() < goal.goldenChance) key = 'golden';
      else {
        const roll = Math.random();
        if (roll < goal.goldenChance) key = 'golden'; else if (roll < .72) key = 'heart'; else if (roll < .92) key = 'lock'; else key = 'star';
      }
      def = cfg.goodItems[key];
    }
    state.items.push({ x: rand(30, W-30), y: -34, vy: rand(goal.speedMin, goal.speedMax), wob: rand(-.45, .45), key, family, symbol: def.symbol, value: def.value || 0, radius: def.radius, color: def.color, glow: def.glow, rot: rand(-.25,.25), hit:false });
  }
  function addGoodProgress(item) {
    const goal = currentGoal();
    if (goal.mode === 'hearts' && (item.key === 'heart' || item.key === 'golden')) state.goalProgress += 1;
    else if (goal.mode === 'locks' && item.key === 'lock') state.goalProgress += 1;
    else if (goal.mode === 'golden' && item.key === 'golden') state.goalProgress += 1;
    else if (goal.mode === 'love' || goal.mode === 'final') state.goalProgress += 1;
    else if (goal.mode === 'score') state.goalProgress = state.levelScore;
  }
  function catchGood(item) {
    const goal = currentGoal();
    if (goal.mode === 'golden' && item.key !== 'golden') {
      state.combo = 0; updateMultiplier(); addScore(-2); GameEffects.addFloatingText(state.floatingTexts, 'Tylko złote!', item.x, item.y, '#fff0a8', 18); GameAudio.sfx.bad(); return;
    }
    state.combo += 1;
    updateMultiplier();
    const gained = item.value * state.multiplier * (isRingActive() ? 2 : 1);
    addScore(gained);
    addGoodProgress(item);
    if (goal.mode === 'score') state.goalProgress = state.levelScore;
    GameEffects.addHeartParticles(state.popParticles, item.x, item.y - 8, item.key === 'star' || item.key === 'golden' ? 10 : 7, item.color, item.glow);
    GameEffects.addFloatingText(state.floatingTexts, `+${gained}  x${state.multiplier}`, item.x, item.y - 20, item.key === 'golden' ? '#fff0a8' : '#fff7e8', 18 + Math.min(6, state.multiplier));
    GameAudio.sfx.good(item.key);
  }
  function catchBad(item) {
    if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      GameEffects.addFloatingText(state.floatingTexts, 'Tarcza!', item.x, item.y, '#9ffcf1', 22);
      GameEffects.addHeartParticles(state.popParticles, state.player.x, state.player.y - 42, 12, '#3dd6c8', '#ffffff');
      GameAudio.sfx.power();
      return;
    }
    state.combo = 0;
    updateMultiplier();
    const bad = cfg.badItems[item.key];
    addScore(bad.points || 0);
    if (bad.life) {
      state.lives -= bad.life;
      GameEffects.addFloatingText(state.floatingTexts, '-1 życie', state.player.x, state.player.y - 66, '#ff6b82', 22);
      GameEffects.addHeartParticles(state.popParticles, state.player.x, state.player.y - 45, 10, '#ff4f66', '#5a1430');
      GameAudio.sfx.life();
    }
    if (bad.points) GameEffects.addFloatingText(state.floatingTexts, `${bad.points} pkt`, item.x, item.y, '#ffd0a0', 20);
    if (bad.effect === 'slowPlayer') { state.playerSlowUntil = state.gameClock + 3.6; GameEffects.addFloatingText(state.floatingTexts, 'Wolniej!', item.x, item.y, '#cfe5ff', 20); }
    if (bad.effect === 'combo') GameEffects.addFloatingText(state.floatingTexts, 'Kombo od zera!', item.x, item.y, '#ff93c5', 18);
    if (currentGoal().mode === 'score') state.goalProgress = state.levelScore;
    GameAudio.sfx.bad();
    if (navigator.vibrate) navigator.vibrate(35);
    if (state.lives <= 0) failLevel('Życia się skończyły. Ten level od nowa!');
  }
  function catchPower(item) {
    if (item.key === 'shield') { state.shieldCharges = Math.min(2, state.shieldCharges + 1); GameEffects.addFloatingText(state.floatingTexts, 'Tarcza +1', item.x, item.y, '#9ffcf1', 20); }
    else if (item.key === 'ring') { state.ringUntil = state.gameClock + 10; GameEffects.addFloatingText(state.floatingTexts, 'Punkty x2!', item.x, item.y, '#fff0a8', 20); }
    else if (item.key === 'clock') { state.clockUntil = state.gameClock + 8; GameEffects.addFloatingText(state.floatingTexts, 'Spokojniej', item.x, item.y, '#cfefff', 20); }
    else if (item.key === 'camera') {
      const goal = currentGoal();
      const bonus = goal.mode === 'score' ? 8 : goal.mode === 'survive' ? 3 : 2;
      if (goal.mode === 'score') { addScore(bonus); state.goalProgress = state.levelScore; }
      else if (goal.mode === 'survive') state.elapsed = Math.min(goal.seconds, state.elapsed + bonus);
      else state.goalProgress += bonus;
      GameEffects.addFloatingText(state.floatingTexts, `Wspomnienie +${bonus}`, item.x, item.y, '#e6ddff', 18);
    }
    GameEffects.addHeartParticles(state.popParticles, item.x, item.y - 8, 12, item.color, item.glow);
    GameAudio.sfx.power();
  }
  function checkCompletion() {
    const goal = currentGoal();
    if (goal.mode === 'survive') state.goalProgress = state.elapsed;
    const done = goal.mode === 'score' ? state.levelScore >= goal.target : currentProgress() >= currentTarget();
    if (done) completeLevel();
  }
  function bindControls() {
    function setHold(v) { state.hold = v; }
    for (const [id,v] of [['leftBtn',-1],['rightBtn',1]]) {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', e => { e.preventDefault(); setHold(v); b.setPointerCapture(e.pointerId); });
      b.addEventListener('pointerup', () => setHold(0));
      b.addEventListener('pointercancel', () => setHold(0));
      b.addEventListener('pointerleave', () => setHold(0));
    }
    window.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') state.hold=-1; if (e.key === 'ArrowRight') state.hold=1; if (e.key === ' ') togglePause(); });
    window.addEventListener('keyup', e => { if ((e.key === 'ArrowLeft' && state.hold < 0) || (e.key === 'ArrowRight' && state.hold > 0)) state.hold=0; });
    canvas.addEventListener('pointerdown', e => {
      GameAudio.ensureReady();
      if (!state.running && state.failTimer <= 0 && !GameUI.refs.unlockOverlay.classList.contains('show') && !GameUI.refs.finalOverlay.classList.contains('show')) startLevel(nextPlayableLevel());
      state.dragPointerId = e.pointerId; state.dragStartX = e.clientX; state.playerStartX = state.player.x; state.dragTargetX = state.player.x; canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect(); const touchX = (e.clientX - rect.left) / rect.width * W;
      state.player.x = clamp(touchX, cfg.player.margin, W-cfg.player.margin); state.dragTargetX = state.player.x;
    });
    canvas.addEventListener('pointermove', e => {
      if (state.dragPointerId !== e.pointerId) return;
      const rect = canvas.getBoundingClientRect(); const pxPerUnit = rect.width / W; const dx = (e.clientX - state.dragStartX) / pxPerUnit;
      state.dragTargetX = clamp(state.playerStartX + dx, cfg.player.margin, W-cfg.player.margin);
    });
    canvas.addEventListener('pointerup', e => { if (state.dragPointerId !== e.pointerId) return; state.dragPointerId = null; state.hold = 0; });
    canvas.addEventListener('pointercancel', () => { state.dragPointerId = null; state.hold = 0; });
  }
  function togglePause() {
    state.paused = !state.paused;
    document.getElementById('pauseBtn').textContent = state.paused ? 'Wznów' : 'Pauza';
  }
  function drawBackground(t) {
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, '#54c7ff'); grad.addColorStop(.37, '#87def6'); grad.addColorStop(.38, '#1678ab'); grad.addColorStop(1, '#0b1e3c');
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=.9; ctx.fillStyle='#fff3b0'; ctx.beginPath(); ctx.arc(W-62,58,24,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,255,255,.78)';
    for(let i=0;i<3;i++) { let x=(i*145 + (t*.015)%500)-80; let y=70+i*28; cloud(x,y,.7+i*.08); }
    ctx.fillStyle='#0b78a5'; ctx.fillRect(0,H*.42,W,H*.58);
    ctx.strokeStyle='rgba(255,255,255,.42)'; ctx.lineWidth=2;
    for(let y=H*.47; y<H; y+=22) { ctx.beginPath(); for(let x=0;x<W;x+=18) ctx.lineTo(x,y+Math.sin(x*.08+t*.004+y*.02)*4); ctx.stroke(); }
    ctx.fillStyle='#5b4a3a'; ctx.fillRect(0,H-118,W,118);
    ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=1;
    for(let y=H-110;y<H;y+=18) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y+Math.sin(y)*2); ctx.stroke(); }
    for(let x=8;x<W;x+=34) { ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(x,H-118); ctx.lineTo(x+10,H); ctx.stroke(); }
    ctx.save(); ctx.translate(36, 270); ctx.fillStyle='#2b324b'; ctx.fillRect(0,50,52,118); ctx.fillStyle='#3f4966'; ctx.fillRect(-7,36,66,20); ctx.fillStyle='#f7ead3'; ctx.fillRect(15,0,22,36); ctx.fillStyle='#ff5b73'; ctx.fillRect(10,-8,32,12); ctx.fillStyle='#ffd47a'; ctx.fillRect(18,7,16,12); ctx.restore();
    ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(76,333); ctx.lineTo(W-52,332); ctx.stroke();
    for(let x=92;x<W-60;x+=30) { ctx.fillStyle=['#ff6fae','#ffd47a','#79e0ff','#77df9a'][Math.floor(x/30)%4]; ctx.beginPath(); ctx.arc(x,332,5,0,Math.PI*2); ctx.fill(); }
  }
  function cloud(x,y,s) { ctx.beginPath(); ctx.arc(x,y,20*s,0,Math.PI*2); ctx.arc(x+22*s,y-8*s,24*s,0,Math.PI*2); ctx.arc(x+48*s,y,18*s,0,Math.PI*2); ctx.rect(x-8*s,y,70*s,20*s); ctx.fill(); }
  function drawPlayer(t) {
    const x = state.player.x, y = state.player.y;
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0,46,58,13,0,0,Math.PI*2); ctx.fill();
    if (state.shieldCharges) { ctx.strokeStyle='rgba(92,245,226,.92)'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,-8,64 + Math.sin(t*.008)*3,0,Math.PI*2); ctx.stroke(); }
    if (isRingActive()) { ctx.strokeStyle='rgba(255,228,117,.85)'; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(0,-10,70,38,0,0,Math.PI*2); ctx.stroke(); }
    ctx.fillStyle='rgba(255,255,255,.88)'; roundRect(-52,-17,104,46,18); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#ff4f66'; ctx.font='900 21px system-ui'; ctx.textAlign='center'; ctx.fillText('M + A',0,12);
    drawMini(-27,-35,'#203d59','#1c1714', true); drawMini(27,-35,'#ff8dad','#bb6b21', false);
    ctx.restore();
  }
  function drawMini(x,y,shirt,hair,beard) {
    ctx.save(); ctx.translate(x,y); ctx.fillStyle=shirt; roundRect(-12,15,24,32,8); ctx.fill(); ctx.fillStyle='#ffe0bd'; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill(); ctx.fillStyle=hair; ctx.beginPath(); ctx.arc(0,-7,16,Math.PI,Math.PI*2); ctx.fill();
    if(beard) { ctx.fillStyle='#3b2017'; ctx.beginPath(); ctx.arc(0,5,12,0,Math.PI); ctx.fill(); ctx.fillStyle='#ffe0bd'; ctx.beginPath(); ctx.arc(0,1,10,0,Math.PI); ctx.fill(); }
    ctx.fillStyle='#171717'; ctx.beginPath(); ctx.arc(-5,0,2,0,Math.PI*2); ctx.arc(5,0,2,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#a64b45'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,5,6,0,Math.PI); ctx.stroke(); ctx.restore();
  }
  function roundRect(x,y,w,h,r) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function drawItems() {
    for(const it of state.items) {
      ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(it.rot);
      ctx.shadowColor = it.glow; ctx.shadowBlur = it.family === 'bad' ? 4 : 12;
      ctx.fillStyle=it.color; ctx.globalAlpha=.92;
      if (it.family === 'bad') { ctx.beginPath(); for(let a=0; a<10; a++) { const r = it.radius + (a%2 ? 2 : -3); const ang = -Math.PI/2 + a*Math.PI/5; ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r); } ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0,0,it.radius,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1; ctx.shadowBlur = 0; ctx.strokeStyle = it.family === 'bad' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.65)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font=`${it.radius+12}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(it.symbol,0,1); ctx.restore();
    }
  }
  function drawTextOverlay() {
    const goal = currentGoal();
    ctx.fillStyle='rgba(5,7,14,.42)'; roundRect(12,12,W-24,84,16); ctx.fill();
    ctx.fillStyle='#fff7e8'; ctx.font='900 17px system-ui'; ctx.textAlign='left'; ctx.fillText(goal.final ? goal.title : `Rocznicowy level ${state.level+1}/${cfg.memories.length}`,26,36);
    ctx.fillStyle='#ffd47a'; ctx.font='800 13px system-ui'; wrapText(goal.short,26,58,W-52,17);
    const chips = [];
    if (state.shieldCharges) chips.push(`🛡️ ${state.shieldCharges}`);
    if (isRingActive()) chips.push(`💍 ${Math.ceil(state.ringUntil-state.gameClock)}s`);
    if (isClockActive()) chips.push(`⏰ ${Math.ceil(state.clockUntil-state.gameClock)}s`);
    if (isPlayerSlowed()) chips.push('⛈️ wolniej');
    if (chips.length) { ctx.fillStyle='rgba(255,255,255,.14)'; roundRect(22,102,W-44,28,14); ctx.fill(); ctx.fillStyle='#fff7e8'; ctx.font='800 13px system-ui'; ctx.fillText(chips.join('   '),34,121); }
    if(!state.running || state.paused || state.failTimer > 0) {
      ctx.fillStyle='rgba(5,7,14,.62)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#fff7e8'; ctx.textAlign='center'; ctx.font='900 28px system-ui';
      ctx.fillText(state.failTimer > 0 ? 'Jeszcze raz!' : state.paused ? 'Pauza' : 'Dotknij START', W/2, H/2-18);
      ctx.font='700 15px system-ui'; ctx.fillStyle='#d9d2cb'; wrapText(state.failTimer > 0 ? state.failMessage : goal.hint, W/2, H/2+16, W-60, 19);
    }
  }
  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(' '); let line = ''; let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, yy); line = word; yy += lineHeight; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  }
  function loop(ts) {
    const dt = Math.min(0.033, (ts-state.last)/1000 || 0);
    state.last = ts;
    state.gameClock += dt;
    if (state.failTimer > 0) { state.failTimer -= dt; if (state.failTimer <= 0) startLevel(state.level); }
    if(state.running && !state.paused) {
      const goal = currentGoal();
      state.elapsed += dt;
      const playerSpeed = cfg.player.holdSpeed * (isPlayerSlowed() ? .58 : 1);
      state.player.x += state.hold * playerSpeed * dt;
      state.player.x = clamp(state.player.x, cfg.player.margin, W-cfg.player.margin);
      state.player.x += (state.dragTargetX - state.player.x) * cfg.player.dragSmoothing;
      state.spawnTimer += dt;
      const spawnEvery = goal.spawnEvery * (isClockActive() ? 1.18 : 1);
      if(state.spawnTimer > spawnEvery) { state.spawnTimer = 0; spawn(); }
      const fallFactor = isClockActive() ? .58 : 1;
      for(const it of state.items) { it.y += it.vy * fallFactor * dt; it.x += Math.sin(ts*.004 + it.y*.03)*it.wob*.8; it.rot += it.wob*.02; }
      state.items = state.items.filter(it => it.y < H + 54);
      for(const it of state.items) {
        if(!it.hit && it.y > state.player.y-cfg.player.hitboxTop && it.y < state.player.y+cfg.player.hitboxBottom && Math.abs(it.x-state.player.x) < state.player.w*cfg.player.hitboxXFactor) {
          it.hit = true;
          if (it.family === 'good') catchGood(it); else if (it.family === 'bad') catchBad(it); else catchPower(it);
          updateHud();
          if (state.running) checkCompletion();
        }
      }
      state.items = state.items.filter(it => !it.hit);
      const timedDone = goal.mode === 'score' ? state.levelScore >= goal.target : currentProgress() >= currentTarget();
      if (state.running && goal.seconds && state.elapsed >= goal.seconds && goal.mode !== 'survive' && !timedDone) failLevel('Czas minął. Spróbuj jeszcze raz od tego levelu.');
      if (state.running && goal.mode === 'survive') checkCompletion();
    }
    const updated = GameEffects.update(state.popParticles, state.floatingTexts, dt);
    state.popParticles = updated.popParticles;
    state.floatingTexts = updated.floatingTexts;
    drawBackground(ts); drawItems(); GameEffects.draw(ctx, state.popParticles, state.floatingTexts); drawPlayer(ts); drawTextOverlay();
    requestAnimationFrame(loop);
  }

  return { init, startLevel };
})();

document.addEventListener('DOMContentLoaded', Game.init);
