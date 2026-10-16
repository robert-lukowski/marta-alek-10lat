window.Game = (() => {
  const cfg = GameConfig;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const SEASONS = [
    { key:'spring', name:'Wiosna', symbol:'🌸' },
    { key:'summer', name:'Lato', symbol:'☀️' },
    { key:'autumn', name:'Jesień', symbol:'🍂' },
    { key:'winter', name:'Zima', symbol:'❄️' }
  ];
  const CHAOS_EVENTS = [
    { key:'blackout', name:'BLACKOUT!', symbol:'🔦', duration:3, text:'Widać tylko to, co znajduje się blisko Was.' },
    { key:'storm', name:'NADCHODZI BURZA!', symbol:'⛈️', duration:7, text:'Plansza drży, a przedmioty zmieniają kierunek.' },
    { key:'inverted', name:'ODWRÓCONE STEROWANIE!', symbol:'↔️', duration:5, text:'Lewo znaczy prawo. Prawo znaczy lewo.' },
    { key:'magnet', name:'MAGNES MIŁOŚCI!', symbol:'🧲', duration:8, text:'Dobre przedmioty lecą prosto do Was.' },
    { key:'turbo', name:'TURBO MODE!', symbol:'🚀', duration:8, text:'Wszystko spada dwa razy szybciej.' },
    { key:'bills', name:'DESZCZ RACHUNKÓW!', symbol:'🧾', duration:8, text:'Obowiązki przejmują niebo. Uważajcie!' },
    { key:'gift', name:'TAJEMNICZY PREZENT!', symbol:'🎁', duration:3, text:'Za chwilę okaże się, czy to bonus, czy kara.' },
    { key:'fake', name:'FAŁSZYWE SERCA!', symbol:'💜', duration:9, text:'Nie każde serce ma dobre zamiary.' },
    { key:'freeze', name:'ZAMROŻENIE CZASU!', symbol:'🧊', duration:6, text:'Świat zwalnia, ale Wy poruszacie się normalnie.' },
    { key:'love', name:'LOVE RUSH!', symbol:'💖', duration:10, text:'Serce za sercem — teraz warto budować kombo!' },
    { key:'haunted', name:'NAWIEDZONY POZIOM!', symbol:'👻', duration:12, text:'Duch ściga gracza. Zbierz 3 złote serca!' }
  ];

  const state = {
    level: 0, levelScore: 0, totalScore: 0, levelStartScore: 0, goalProgress: 0,
    lives: cfg.startLives, combo: 0, multiplier: 1, running: false, paused: false,
    sessionStarted: false, last: 0, spawnTimer: 0, elapsed: 0, gameClock: 0, items: [],
    player: { x: W/2, y: H-74, w: 82, h: 54 }, playerVelocity: 0,
    hold: 0, dragPointerId: null, dragStartX: 0, playerStartX: 0, dragTargetX: W/2,
    popParticles: [], floatingTexts: [], shieldCharges: 0, ringUntil: 0, clockUntil: 0,
    playerSlowUntil: 0, failTimer: 0, failMessage: '', lastCompletionSummary: '',
    season: SEASONS[0], chaosClock: 0, nextChaosAt: 0, chaosWarning: null,
    activeEvent: null, lastEventKey: '', bannerUntil: 0, shakeUntil: 0, shakePower: 0, ghost: null
  };

  function rand(a,b) { return a + Math.random()*(b-a); }
  function clamp(v,a,b) { return Math.max(a, Math.min(b, v)); }
  function choose(list) { return list[Math.floor(Math.random() * list.length)]; }
  function isRingActive() { return state.gameClock < state.ringUntil; }
  function isClockActive() { return state.gameClock < state.clockUntil; }
  function isPlayerSlowed() { return state.gameClock < state.playerSlowUntil; }
  function eventIs(key) { return state.activeEvent?.key === key; }
  function currentGoal() { return GameLevels.getLevel(state.level); }
  function currentTarget() { return GameLevels.targetFor(currentGoal()); }
  function currentProgress() { return currentGoal().mode === 'survive' ? Math.min(currentGoal().seconds, state.elapsed) : state.goalProgress; }
  function updateMultiplier() { state.multiplier = Math.min(5, 1 + Math.floor(state.combo / 4)); }
  function seasonForLevel(index) { return SEASONS[Math.floor(Math.min(index, cfg.memories.length - 1) / 5) % SEASONS.length]; }
  function nextChaosDelay() { return rand(cfg.chaos.minDelay, cfg.chaos.maxDelay); }
  function nextPlayableLevel() {
    const progress = GameUI.getProgress();
    return progress.unlocked < cfg.memories.length ? progress.unlocked : cfg.memories.length;
  }
  function modalIsOpen() {
    return ['leaderboardOverlay','unlockOverlay','finalOverlay','installOverlay','startOverlay']
      .some(id => document.getElementById(id)?.classList.contains('show'));
  }

  function init() {
    GameUI.init();
    bindControls();
    state.season = seasonForLevel(0);
    GameUI.setSeason(state.season);
    state.nextChaosAt = nextChaosDelay();
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
    state.playerVelocity = 0;
    state.dragTargetX = state.player.x;
    state.running = true;
    state.paused = false;
    state.hold = 0;
    state.season = seasonForLevel(state.level);
    clearChaosEvent(true);
    if (!state.sessionStarted) {
      state.sessionStarted = true;
      state.chaosClock = 0;
      state.nextChaosAt = nextChaosDelay();
    }
    GameUI.setSeason(state.season);
    GameUI.setEvent(`Chaos za ~${Math.ceil(state.nextChaosAt - state.chaosClock)}s`);
    GameUI.closeStart();
    GameUI.refs.finalOverlay.classList.remove('show');
    GameUI.hideUnlock();
    document.getElementById('pauseBtn').textContent = 'Pauza';
    GameAudio.ensureReady();
    GameAudio.sfx.start();
    GameHaptics.light();
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
    clearChaosEvent(true);
    GameAudio.sfx.fail();
    GameHaptics.fail();
    updateHud();
  }

  function completeLevel() {
    state.running = false;
    clearChaosEvent(true);
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
    GameHaptics.success();
    GameEffects.confetti(false);
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
      progress: currentProgress(), target: currentTarget(),
      timeLeft: goal.seconds ? goal.seconds - state.elapsed : null,
      levelScore: state.levelScore, totalScore: state.totalScore,
      multiplier: state.multiplier, combo: state.combo, lives: state.lives,
      shieldCharges: state.shieldCharges, ringActive: isRingActive()
    });
  }

  function pickSpawn() {
    const goal = currentGoal();
    if (eventIs('bills') && Math.random() < .82) return { family:'bad', key:choose(['bill','bill','alarm','laundry']) };
    if (eventIs('love') && Math.random() < .88) return { family:'good', key:Math.random() < .42 ? 'golden' : choose(['heart','heart','lock','star']) };
    if (eventIs('haunted') && Math.random() < .48) return { family:'good', key:'golden' };
    const r = Math.random();
    let family = 'good';
    if (r < goal.powerChance) family = 'power';
    else if (r < goal.powerChance + goal.badChance) family = 'bad';
    let key;
    if (family === 'power') key = choose(['shield','ring','clock','camera']);
    else if (family === 'bad') {
      const badPool = state.level < 2 ? ['broken'] : state.level < 5 ? ['broken','storm','bill'] : ['broken','storm','drama','bill'];
      if (goal.final) badPool.push('alarm','laundry','bill');
      key = choose(badPool);
    } else if (goal.mode === 'golden' && Math.random() < goal.goldenChance) key = 'golden';
    else {
      const roll = Math.random();
      if (roll < goal.goldenChance) key = 'golden'; else if (roll < .72) key = 'heart'; else if (roll < .92) key = 'lock'; else key = 'star';
    }
    if (eventIs('fake') && family === 'good' && (key === 'heart' || key === 'golden') && Math.random() < .42) family = 'fake';
    return { family, key };
  }

  function spawn() {
    const goal = currentGoal();
    const picked = pickSpawn();
    const def = picked.family === 'power' ? cfg.powerItems[picked.key] : picked.family === 'bad' ? cfg.badItems[picked.key] : cfg.goodItems[picked.key];
    const bossRamp = goal.final ? 1 + Math.min(.48, state.elapsed / Math.max(1, goal.seconds) * .48) : 1;
    state.items.push({
      x:rand(30,W-30), y:goal.final ? 146 : -34,
      vy:rand(goal.speedMin,goal.speedMax)*bossRamp, vx:0, wob:rand(-.45,.45),
      key:picked.key, family:picked.family, symbol:def.symbol, value:def.value||0,
      radius:def.radius, color:def.color, glow:def.glow, rot:rand(-.25,.25), hit:false
    });
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
      state.combo = 0; updateMultiplier(); addScore(-2);
      GameEffects.addFloatingText(state.floatingTexts,'Tylko złote!',item.x,item.y,'#fff0a8',18);
      GameAudio.sfx.bad(); GameHaptics.bad(); return;
    }
    state.combo += 1; updateMultiplier();
    const gained = item.value * state.multiplier * (isRingActive() ? 2 : 1);
    addScore(gained); addGoodProgress(item);
    if (goal.mode === 'score') state.goalProgress = state.levelScore;
    GameEffects.addHeartParticles(state.popParticles,item.x,item.y-8,item.key==='star'||item.key==='golden'?10:7,item.color,item.glow);
    GameEffects.addFloatingText(state.floatingTexts,`+${gained}  x${state.multiplier}`,item.x,item.y-20,item.key==='golden'?'#fff0a8':'#fff7e8',18+Math.min(6,state.multiplier));
    GameAudio.sfx.good(item.key); GameHaptics.good();
    if (eventIs('haunted') && item.key === 'golden' && state.ghost) {
      state.ghost.hearts -= 1;
      GameEffects.addFloatingText(state.floatingTexts,state.ghost.hearts>0?`Duch: ${state.ghost.hearts} 💛`:'Duch pokonany!',state.ghost.x,state.ghost.y,'#fff0a8',21);
      if (state.ghost.hearts <= 0) {
        addScore(30); GameEffects.confetti(false); GameHaptics.success();
        finishChaosEvent('Duch pokonany! +30 pkt');
      }
    }
  }

  function catchFake(item) {
    state.combo = 0; updateMultiplier();
    if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      GameEffects.addFloatingText(state.floatingTexts,'Tarcza odkryła pułapkę!',item.x,item.y,'#9ffcf1',17);
      GameAudio.sfx.power(); GameHaptics.power(); return;
    }
    addScore(-7);
    GameEffects.addFloatingText(state.floatingTexts,'Fałszywe serce! -7',item.x,item.y,'#ff93c5',18);
    triggerShake(.5,5); GameAudio.sfx.bad(); GameHaptics.bad();
  }

  function catchBad(item) {
    if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      GameEffects.addFloatingText(state.floatingTexts,'Tarcza!',item.x,item.y,'#9ffcf1',22);
      GameEffects.addHeartParticles(state.popParticles,state.player.x,state.player.y-42,12,'#3dd6c8','#ffffff');
      GameAudio.sfx.power(); GameHaptics.power(); return;
    }
    state.combo=0; updateMultiplier();
    const bad=cfg.badItems[item.key]; addScore(bad.points||0);
    if (bad.life) {
      state.lives-=bad.life;
      GameEffects.addFloatingText(state.floatingTexts,'-1 życie',state.player.x,state.player.y-66,'#ff6b82',22);
      GameEffects.addHeartParticles(state.popParticles,state.player.x,state.player.y-45,10,'#ff4f66','#5a1430');
      GameAudio.sfx.life();
    }
    if (bad.points) GameEffects.addFloatingText(state.floatingTexts,`${bad.points} pkt`,item.x,item.y,'#ffd0a0',20);
    if (bad.effect==='slowPlayer') { state.playerSlowUntil=state.gameClock+3.6; GameEffects.addFloatingText(state.floatingTexts,'Wolniej!',item.x,item.y,'#cfe5ff',20); }
    if (bad.effect==='combo') GameEffects.addFloatingText(state.floatingTexts,'Kombo od zera!',item.x,item.y,'#ff93c5',18);
    if (item.key==='drama'||item.key==='storm') { triggerShake(item.key==='drama'?.85:.55,item.key==='drama'?10:6); scrambleItems(); }
    if (currentGoal().mode==='score') state.goalProgress=state.levelScore;
    GameAudio.sfx.bad(); GameHaptics.bad();
    if (state.lives<=0) failLevel('Życia się skończyły. Ten level od nowa!');
  }

  function catchPower(item) {
    if (item.key==='shield') { state.shieldCharges=Math.min(2,state.shieldCharges+1); GameEffects.addFloatingText(state.floatingTexts,'Tarcza +1',item.x,item.y,'#9ffcf1',20); }
    else if (item.key==='ring') { state.ringUntil=state.gameClock+10; GameEffects.addFloatingText(state.floatingTexts,'Punkty x2!',item.x,item.y,'#fff0a8',20); }
    else if (item.key==='clock') { state.clockUntil=state.gameClock+8; GameEffects.addFloatingText(state.floatingTexts,'Spokojniej',item.x,item.y,'#cfefff',20); }
    else if (item.key==='camera') {
      const goal=currentGoal(); const bonus=goal.mode==='score'?8:goal.mode==='survive'?3:2;
      if (goal.mode==='score') { addScore(bonus); state.goalProgress=state.levelScore; }
      else if (goal.mode==='survive') state.elapsed=Math.min(goal.seconds,state.elapsed+bonus);
      else state.goalProgress+=bonus;
      GameEffects.addFloatingText(state.floatingTexts,`Wspomnienie +${bonus}`,item.x,item.y,'#e6ddff',18);
    }
    GameEffects.addHeartParticles(state.popParticles,item.x,item.y-8,12,item.color,item.glow);
    GameAudio.sfx.power(); GameHaptics.power();
  }

  function checkCompletion() {
    const goal=currentGoal();
    if (goal.mode==='survive') state.goalProgress=state.elapsed;
    const done=goal.mode==='score'?state.levelScore>=goal.target:currentProgress()>=currentTarget();
    if(done) completeLevel();
  }

  function queueChaosEvent() {
    const pool=CHAOS_EVENTS.filter(event=>event.key!==state.lastEventKey&&!(currentGoal().mode==='golden'&&event.key==='fake'));
    const event=choose(pool);
    state.chaosWarning={...event,startsAt:state.chaosClock+cfg.chaos.warningSeconds};
    state.lastEventKey=event.key;
    state.bannerUntil=state.chaosWarning.startsAt;
    GameUI.showChaos(event.name,event.text,false);
    GameUI.setEvent(`${event.symbol} zaraz…`);
    GameAudio.sfx.life(); GameHaptics.warning();
  }

  function startChaosEvent(event) {
    state.chaosWarning=null;
    state.activeEvent={...event,endsAt:state.chaosClock+event.duration};
    state.bannerUntil=state.chaosClock+1.8;
    if(event.key==='storm'){triggerShake(event.duration,7);scrambleItems();}
    if(event.key==='haunted')state.ghost={x:W/2,y:188,hearts:3,hitCooldown:0,phase:0};
    if(event.key==='gift')revealGift();
    GameUI.showChaos(event.name,event.text,true);
    GameUI.setEvent(`${event.symbol} ${event.name}`);
    GameAudio.sfx.power(); GameHaptics.warning();
  }

  function revealGift() {
    const gifts=[
      {text:'Tarcza +1!',action:()=>{state.shieldCharges=Math.min(2,state.shieldCharges+1);}},
      {text:'+25 punktów!',action:()=>addScore(25)},
      {text:'Dodatkowe życie!',action:()=>{state.lives=Math.min(5,state.lives+1);}},
      {text:'Obrączka x2!',action:()=>{state.ringUntil=state.gameClock+10;}},
      {text:'Ups… -15 punktów!',bad:true,action:()=>addScore(-15)},
      {text:'Bomba dramatu!',bad:true,action:()=>{addScore(-8);state.combo=0;updateMultiplier();triggerShake(.9,11);}}
    ];
    const gift=choose(gifts); gift.action();
    GameEffects.addFloatingText(state.floatingTexts,gift.text,W/2,H/2,gift.bad?'#ff93c5':'#fff0a8',24);
    if(gift.bad)GameHaptics.bad();else GameHaptics.power();
    updateHud();
  }

  function finishChaosEvent(message='') {
    if(message){GameUI.showChaos('CHAOS OPANOWANY!',message,true);state.bannerUntil=state.chaosClock+1.7;}else GameUI.hideChaos();
    state.activeEvent=null; state.chaosWarning=null; state.ghost=null;
    state.nextChaosAt=state.chaosClock+nextChaosDelay();
  }

  function clearChaosEvent(scheduleNext=true) {
    state.activeEvent=null; state.chaosWarning=null; state.ghost=null; state.shakeUntil=0;
    GameUI.hideChaos();
    if(scheduleNext&&state.nextChaosAt<=state.chaosClock)state.nextChaosAt=state.chaosClock+nextChaosDelay();
  }

  function updateChaos(dt) {
    state.chaosClock+=dt;
    if(!state.activeEvent&&!state.chaosWarning&&state.chaosClock>=state.nextChaosAt)queueChaosEvent();
    if(state.chaosWarning&&state.chaosClock>=state.chaosWarning.startsAt)startChaosEvent(state.chaosWarning);
    if(state.activeEvent&&state.chaosClock>=state.activeEvent.endsAt)finishChaosEvent();
    if(state.bannerUntil&&state.chaosClock>=state.bannerUntil){state.bannerUntil=0;GameUI.hideChaos();}
    if(state.activeEvent){const left=Math.max(0,Math.ceil(state.activeEvent.endsAt-state.chaosClock));const ghostBit=state.ghost?` • ${state.ghost.hearts} 💛`:'';GameUI.setEvent(`${state.activeEvent.symbol} ${left}s${ghostBit}`);}
    else if(state.chaosWarning)GameUI.setEvent(`${state.chaosWarning.symbol} zaraz…`);
    else GameUI.setEvent(`Chaos za ~${Math.max(0,Math.ceil(state.nextChaosAt-state.chaosClock))}s`);
  }

  function triggerShake(duration=.55,power=7){state.shakeUntil=Math.max(state.shakeUntil,state.gameClock+duration);state.shakePower=Math.max(state.shakePower,power);}
  function scrambleItems(){for(const item of state.items)item.vx=rand(-74,74);}

  function updateGhost(dt) {
    if(!state.ghost)return;
    const ghost=state.ghost; ghost.phase+=dt; ghost.hitCooldown=Math.max(0,ghost.hitCooldown-dt);
    const targetY=state.player.y-92;
    ghost.x+=(state.player.x-ghost.x)*Math.min(1,dt*1.05);
    ghost.y+=(targetY-ghost.y)*Math.min(1,dt*.48);
    if(ghost.hitCooldown<=0&&Math.abs(ghost.x-state.player.x)<47&&Math.abs(ghost.y-state.player.y)<78){
      ghost.hitCooldown=2.4; ghost.y-=96;
      const shielded=state.shieldCharges>0;
      if(shielded)state.shieldCharges-=1;else state.lives-=1;
      state.combo=0;updateMultiplier();triggerShake(.7,8);
      GameEffects.addFloatingText(state.floatingTexts,shielded?'Tarcza!':'-1 życie',state.player.x,state.player.y-64,'#d9c2ff',22);
      GameHaptics.bad();
      if(state.lives<=0)failLevel('Duch wygrał tę rundę. Spróbuj ponownie!');
      updateHud();
    }
  }

  function bindControls() {
    function setHold(value){state.hold=value;}
    for(const[id,value]of[['leftBtn',-1],['rightBtn',1]]){
      const button=document.getElementById(id);
      button.addEventListener('pointerdown',event=>{event.preventDefault();setHold(value);button.setPointerCapture(event.pointerId);});
      button.addEventListener('pointerup',()=>setHold(0));button.addEventListener('pointercancel',()=>setHold(0));button.addEventListener('pointerleave',()=>setHold(0));
    }
    window.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')state.hold=-1;if(event.key==='ArrowRight')state.hold=1;if(event.key===' '){event.preventDefault();togglePause();}});
    window.addEventListener('keyup',event=>{if((event.key==='ArrowLeft'&&state.hold<0)||(event.key==='ArrowRight'&&state.hold>0))state.hold=0;});
    canvas.addEventListener('pointerdown',event=>{
      GameAudio.ensureReady();
      if(!state.running&&state.failTimer<=0&&!GameUI.refs.unlockOverlay.classList.contains('show')&&!GameUI.refs.finalOverlay.classList.contains('show'))startLevel(nextPlayableLevel());
      state.dragPointerId=event.pointerId;state.dragStartX=event.clientX;state.playerStartX=state.player.x;state.dragTargetX=state.player.x;canvas.setPointerCapture(event.pointerId);
      const rect=canvas.getBoundingClientRect();let touchX=(event.clientX-rect.left)/rect.width*W;if(eventIs('inverted'))touchX=W-touchX;
      state.player.x=clamp(touchX,cfg.player.margin,W-cfg.player.margin);state.dragTargetX=state.player.x;
    });
    canvas.addEventListener('pointermove',event=>{if(state.dragPointerId!==event.pointerId)return;const rect=canvas.getBoundingClientRect();const pxPerUnit=rect.width/W;let dx=(event.clientX-state.dragStartX)/pxPerUnit;if(eventIs('inverted'))dx*=-1;state.dragTargetX=clamp(state.playerStartX+dx,cfg.player.margin,W-cfg.player.margin);});
    canvas.addEventListener('pointerup',event=>{if(state.dragPointerId!==event.pointerId)return;state.dragPointerId=null;state.hold=0;});
    canvas.addEventListener('pointercancel',()=>{state.dragPointerId=null;state.hold=0;});
  }

  function togglePause(){if(!state.running)return;state.paused=!state.paused;document.getElementById('pauseBtn').textContent=state.paused?'Wznów':'Pauza';}

  function drawBackground(t) {
    const palettes={spring:['#8ad8ff','#b8eff1','#339a84','#163d4b','#6f6750'],summer:['#54c7ff','#87def6','#1678ab','#0b1e3c','#5b4a3a'],autumn:['#e7a256','#f0cf85','#87542f','#2e2740','#60422e'],winter:['#b9d9f4','#edf7ff','#7599ba','#263753','#9bc1d5']};
    const colors=palettes[state.season.key];const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,colors[0]);grad.addColorStop(.37,colors[1]);grad.addColorStop(.38,colors[2]);grad.addColorStop(1,colors[3]);
    ctx.fillStyle=grad;ctx.fillRect(-20,-20,W+40,H+40);
    ctx.globalAlpha=.9;ctx.fillStyle=state.season.key==='winter'?'#eaf7ff':'#fff3b0';ctx.beginPath();ctx.arc(W-62,58,state.season.key==='summer'?31:24,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,255,255,.78)';for(let i=0;i<3;i++){const x=(i*145+(t*.015)%500)-80;const y=70+i*28;cloud(x,y,.7+i*.08);}
    ctx.fillStyle=colors[2];ctx.fillRect(-20,H*.42,W+40,H*.58);
    ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=2;for(let y=H*.47;y<H;y+=22){ctx.beginPath();for(let x=-20;x<W+20;x+=18)ctx.lineTo(x,y+Math.sin(x*.08+t*.004+y*.02)*4);ctx.stroke();}
    ctx.fillStyle=colors[4];ctx.fillRect(-20,H-118,W+40,138);if(state.season.key==='winter'){ctx.fillStyle='rgba(222,245,255,.72)';ctx.fillRect(-20,H-118,W+40,18);}
    ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1;for(let y=H-110;y<H;y+=18){ctx.beginPath();ctx.moveTo(-20,y);ctx.lineTo(W+20,y+Math.sin(y)*2);ctx.stroke();}
    for(let x=8;x<W;x+=34){ctx.strokeStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.moveTo(x,H-118);ctx.lineTo(x+10,H);ctx.stroke();}
    ctx.save();ctx.translate(36,270);ctx.fillStyle='#2b324b';ctx.fillRect(0,50,52,118);ctx.fillStyle='#3f4966';ctx.fillRect(-7,36,66,20);ctx.fillStyle='#f7ead3';ctx.fillRect(15,0,22,36);ctx.fillStyle='#ff5b73';ctx.fillRect(10,-8,32,12);ctx.fillStyle='#ffd47a';ctx.fillRect(18,7,16,12);ctx.restore();
    ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(76,333);ctx.lineTo(W-52,332);ctx.stroke();for(let x=92;x<W-60;x+=30){ctx.fillStyle=['#ff6fae','#ffd47a','#79e0ff','#77df9a'][Math.floor(x/30)%4];ctx.beginPath();ctx.arc(x,332,5,0,Math.PI*2);ctx.fill();}
  }

  function drawSeasonWeather(t,foreground=false) {
    const time=t*.001;const count=state.season.key==='summer'?7:18;
    for(let i=0;i<count;i++){
      const seed=i*71.37;const x=(seed*5+time*(state.season.key==='autumn'?34:15))%(W+50)-25;const y=(seed*3+time*(state.season.key==='winter'?42:29))%(H+60)-30;
      if(state.season.key==='summer'&&foreground)continue;
      if(state.season.key!=='summer'&&(i%2===0)!==foreground)continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(time+seed);
      if(state.season.key==='spring'){ctx.fillStyle=i%2?'#ffd0e3':'#fff4f8';ctx.font='15px system-ui';ctx.fillText('✿',0,0);}
      else if(state.season.key==='autumn'){ctx.globalAlpha=.72;ctx.fillStyle=i%3?'#f49b42':'#a9512b';ctx.beginPath();ctx.ellipse(0,0,9,5,.4,0,Math.PI*2);ctx.fill();}
      else if(state.season.key==='winter'){ctx.globalAlpha=.82;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,2+(i%3),0,Math.PI*2);ctx.fill();}
      else if(!foreground){ctx.globalAlpha=.16;ctx.strokeStyle='#fff7b0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(18,18);ctx.stroke();}
      ctx.restore();
    }
  }

  function cloud(x,y,s){ctx.beginPath();ctx.arc(x,y,20*s,0,Math.PI*2);ctx.arc(x+22*s,y-8*s,24*s,0,Math.PI*2);ctx.arc(x+48*s,y,18*s,0,Math.PI*2);ctx.rect(x-8*s,y,70*s,20*s);ctx.fill();}

  function drawBoss(t) {
    if(!currentGoal().final)return;const x=W/2,y=162+Math.sin(t*.004)*5;
    ctx.save();ctx.translate(x,y);ctx.shadowColor='rgba(20,12,40,.65)';ctx.shadowBlur=24;ctx.fillStyle='#3e405b';ctx.beginPath();ctx.arc(-68,0,38,0,Math.PI*2);ctx.arc(-28,-22,48,0,Math.PI*2);ctx.arc(24,-18,55,0,Math.PI*2);ctx.arc(70,4,38,0,Math.PI*2);ctx.rect(-86,0,170,42);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-27,3,10,0,Math.PI*2);ctx.arc(28,3,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1a1428';ctx.beginPath();ctx.arc(-24,5,4,0,Math.PI*2);ctx.arc(25,5,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ff6b82';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,35,22,Math.PI*1.15,Math.PI*1.85);ctx.stroke();ctx.font='25px system-ui';ctx.fillText('🧾',-80,-38);ctx.fillText('⏰',58,-42);ctx.fillText('🧺',2,-60);ctx.restore();
    const ratio=clamp(state.goalProgress/currentTarget(),0,1);ctx.fillStyle='rgba(10,8,22,.65)';roundRect(58,228,W-116,13,7);ctx.fill();ctx.fillStyle='#ff6fae';roundRect(58,228,(W-116)*ratio,13,7);ctx.fill();ctx.fillStyle='#fff7e8';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(`KRYZYS MAŁŻEŃSKI  ${Math.floor(ratio*100)}%`,W/2,220);
  }

  function drawPlayer(t) {
    const x=state.player.x,y=state.player.y;ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,46,58,13,0,0,Math.PI*2);ctx.fill();
    if(state.shieldCharges){ctx.strokeStyle='rgba(92,245,226,.92)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-8,64+Math.sin(t*.008)*3,0,Math.PI*2);ctx.stroke();}
    if(isRingActive()){ctx.strokeStyle='rgba(255,228,117,.85)';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-10,70,38,0,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='rgba(255,255,255,.88)';roundRect(-52,-17,104,46,18);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ff4f66';ctx.font='900 21px system-ui';ctx.textAlign='center';ctx.fillText('M + A',0,12);drawMini(-27,-35,'#203d59','#1c1714',true);drawMini(27,-35,'#ff8dad','#bb6b21',false);ctx.restore();
  }

  function drawMini(x,y,shirt,hair,beard){ctx.save();ctx.translate(x,y);ctx.fillStyle=shirt;roundRect(-12,15,24,32,8);ctx.fill();ctx.fillStyle='#ffe0bd';ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.fillStyle=hair;ctx.beginPath();ctx.arc(0,-7,16,Math.PI,Math.PI*2);ctx.fill();if(beard){ctx.fillStyle='#3b2017';ctx.beginPath();ctx.arc(0,5,12,0,Math.PI);ctx.fill();ctx.fillStyle='#ffe0bd';ctx.beginPath();ctx.arc(0,1,10,0,Math.PI);ctx.fill();}ctx.fillStyle='#171717';ctx.beginPath();ctx.arc(-5,0,2,0,Math.PI*2);ctx.arc(5,0,2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a64b45';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,5,6,0,Math.PI);ctx.stroke();ctx.restore();}
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

  function drawItems() {
    for(const item of state.items){ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rot);ctx.shadowColor=item.glow;ctx.shadowBlur=item.family==='bad'?4:12;ctx.fillStyle=item.color;ctx.globalAlpha=.92;
      if(item.family==='bad'){ctx.beginPath();for(let a=0;a<10;a++){const radius=item.radius+(a%2?2:-3);const angle=-Math.PI/2+a*Math.PI/5;ctx.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);}ctx.closePath();ctx.fill();}else{ctx.beginPath();ctx.arc(0,0,item.radius,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.strokeStyle=item.family==='bad'?'rgba(255,255,255,.35)':'rgba(255,255,255,.65)';ctx.lineWidth=2;ctx.stroke();ctx.font=`${item.radius+12}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.symbol,0,1);
      if(item.family==='fake'){ctx.globalAlpha=.24+Math.sin(state.gameClock*15)*.08;ctx.strokeStyle='#b06cff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,item.radius+4,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  }

  function drawGhost(t){if(!state.ghost)return;const ghost=state.ghost;ctx.save();ctx.translate(ghost.x,ghost.y+Math.sin(t*.008)*8);ctx.globalAlpha=.86;ctx.shadowColor='#d9c2ff';ctx.shadowBlur=22;ctx.fillStyle='#f5efff';ctx.beginPath();ctx.arc(0,-10,30,Math.PI,0);ctx.lineTo(30,26);ctx.quadraticCurveTo(20,15,10,27);ctx.quadraticCurveTo(0,15,-10,27);ctx.quadraticCurveTo(-20,15,-30,27);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#392c54';ctx.beginPath();ctx.arc(-10,-10,5,0,Math.PI*2);ctx.arc(10,-10,5,0,Math.PI*2);ctx.fill();ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff0a8';ctx.fillText(`💛 ${ghost.hearts}`,0,-48);ctx.restore();}

  function drawBlackout(){if(!eventIs('blackout'))return;const gradient=ctx.createRadialGradient(state.player.x,state.player.y-15,35,state.player.x,state.player.y-15,145);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(.48,'rgba(0,0,0,.14)');gradient.addColorStop(1,'rgba(0,0,0,.94)');ctx.fillStyle=gradient;ctx.fillRect(-20,-20,W+40,H+40);}

  function drawTextOverlay() {
    const goal=currentGoal();ctx.fillStyle='rgba(5,7,14,.42)';roundRect(12,12,W-24,84,16);ctx.fill();ctx.fillStyle='#fff7e8';ctx.font='900 17px system-ui';ctx.textAlign='left';ctx.fillText(goal.final?goal.title:`Rocznicowy level ${state.level+1}/${cfg.memories.length}`,26,36);ctx.fillStyle='#ffd47a';ctx.font='800 13px system-ui';wrapText(goal.short,26,58,W-52,17);
    const chips=[];if(state.shieldCharges)chips.push(`🛡️ ${state.shieldCharges}`);if(isRingActive())chips.push(`💍 ${Math.ceil(state.ringUntil-state.gameClock)}s`);if(isClockActive())chips.push(`⏰ ${Math.ceil(state.clockUntil-state.gameClock)}s`);if(isPlayerSlowed())chips.push('⛈️ wolniej');if(eventIs('inverted'))chips.push('↔️ sterowanie');if(eventIs('magnet'))chips.push('🧲 magnes');
    if(chips.length){ctx.fillStyle='rgba(255,255,255,.14)';roundRect(22,102,W-44,28,14);ctx.fill();ctx.fillStyle='#fff7e8';ctx.font='800 13px system-ui';ctx.fillText(chips.join('   '),34,121);}
    if(!state.running||state.paused||state.failTimer>0){ctx.fillStyle='rgba(5,7,14,.62)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff7e8';ctx.textAlign='center';ctx.font='900 28px system-ui';ctx.fillText(state.failTimer>0?'Jeszcze raz!':state.paused?'Pauza':'Dotknij START',W/2,H/2-18);ctx.font='700 15px system-ui';ctx.fillStyle='#d9d2cb';wrapText(state.failTimer>0?state.failMessage:goal.hint,W/2,H/2+16,W-60,19);}
  }

  function wrapText(text,x,y,maxWidth,lineHeight){const words=String(text).split(' ');let line='',yy=y;for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,yy);line=word;yy+=lineHeight;}else line=test;}if(line)ctx.fillText(line,x,yy);}

  function updatePlayer(dt) {
    const inversion=eventIs('inverted')?-1:1;const playerSpeed=cfg.player.holdSpeed*(isPlayerSlowed()?.58:1);const desiredVelocity=state.hold*inversion*playerSpeed;
    if(state.season.key==='winter'){state.playerVelocity+=(desiredVelocity-state.playerVelocity)*Math.min(1,dt*(state.hold?4.3:1.6));state.player.x+=state.playerVelocity*dt;}else{state.playerVelocity=desiredVelocity;state.player.x+=desiredVelocity*dt;}
    state.player.x=clamp(state.player.x,cfg.player.margin,W-cfg.player.margin);const smoothing=state.season.key==='winter'?.18:cfg.player.dragSmoothing;state.player.x+=(state.dragTargetX-state.player.x)*smoothing;
  }

  function updateItems(dt,ts) {
    const goal=currentGoal();let spawnEvery=goal.spawnEvery*(isClockActive()?1.18:1);if(eventIs('turbo'))spawnEvery*=.5;if(eventIs('bills')||eventIs('love')||eventIs('haunted'))spawnEvery*=.7;if(goal.final)spawnEvery*=Math.max(.58,1-state.elapsed/Math.max(1,goal.seconds)*.35);
    state.spawnTimer+=dt;if(state.spawnTimer>spawnEvery){state.spawnTimer=0;spawn();}
    let fallFactor=isClockActive()?.58:1;if(eventIs('turbo'))fallFactor*=2;if(eventIs('freeze'))fallFactor*=.16;
    for(const item of state.items){if(eventIs('magnet')&&item.family!=='bad'&&item.y>80)item.x+=(state.player.x-item.x)*Math.min(.1,dt*2.4);item.y+=item.vy*fallFactor*dt;item.x+=(item.vx+Math.sin(ts*.004+item.y*.03)*item.wob*24)*dt;item.vx*=Math.pow(.965,dt*60);if(item.x<24||item.x>W-24){item.x=clamp(item.x,24,W-24);item.vx*=-.8;}item.rot+=item.wob*.8*dt;}
    state.items=state.items.filter(item=>item.y<H+54);
    for(const item of state.items){if(!item.hit&&item.y>state.player.y-cfg.player.hitboxTop&&item.y<state.player.y+cfg.player.hitboxBottom&&Math.abs(item.x-state.player.x)<state.player.w*cfg.player.hitboxXFactor){item.hit=true;if(item.family==='good')catchGood(item);else if(item.family==='bad')catchBad(item);else if(item.family==='fake')catchFake(item);else catchPower(item);updateHud();if(state.running)checkCompletion();}}
    state.items=state.items.filter(item=>!item.hit);
  }

  function loop(ts) {
    const dt=Math.min(.033,(ts-state.last)/1000||0);state.last=ts;
    if(state.failTimer>0){state.failTimer-=dt;if(state.failTimer<=0)startLevel(state.level);}
    if(state.running&&!state.paused&&!modalIsOpen()){
      state.gameClock+=dt;state.elapsed+=dt;updateChaos(dt);updatePlayer(dt);updateItems(dt,ts);updateGhost(dt);
      const goal=currentGoal();const timedDone=goal.mode==='score'?state.levelScore>=goal.target:currentProgress()>=currentTarget();
      if(state.running&&goal.seconds&&state.elapsed>=goal.seconds&&goal.mode!=='survive'&&!timedDone)failLevel('Czas minął. Spróbuj jeszcze raz od tego levelu.');
      if(state.running&&goal.mode==='survive')checkCompletion();
    }
    const updated=GameEffects.update(state.popParticles,state.floatingTexts,dt);state.popParticles=updated.popParticles;state.floatingTexts=updated.floatingTexts;
    ctx.clearRect(0,0,W,H);ctx.save();if(state.gameClock<state.shakeUntil)ctx.translate(rand(-state.shakePower,state.shakePower),rand(-state.shakePower,state.shakePower));drawBackground(ts);drawSeasonWeather(ts,false);drawBoss(ts);drawItems();drawGhost(ts);GameEffects.draw(ctx,state.popParticles,state.floatingTexts);drawPlayer(ts);drawSeasonWeather(ts,true);drawTextOverlay();drawBlackout();ctx.restore();requestAnimationFrame(loop);
  }

  return { init, startLevel };
})();

document.addEventListener('DOMContentLoaded', Game.init);
