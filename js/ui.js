window.GameUI = (() => {
  'use strict';
  const refs = {};
  const modalMode = { value: 'unlock' };
  const motionKey = 'marta_alek_10lat_reduced_motion_v1';
  const modeKey = 'marta_alek_10lat_mode_v1';
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let progress = GameStorage.getProgress();
  let selectedMode = localStorage.getItem(modeKey) || 'chaos';
  let reducedMotion = localStorage.getItem(motionKey) === null ? motionPreference.matches : localStorage.getItem(motionKey) === '1';
  let initialized = false;
  let finalSlideTimer = 0;
  let finalFadeTimer = 0;
  let finalWasParty = false;
  let partyGallery = false;
  let playing = false;
  let livesDrawn = -1;
  let resumeAfterDialogs = false;
  const dialogStack = [];
  const dialogFocus = new WeakMap();
  const focusableSelector = 'button:not([disabled]):not([hidden]), a[href], input:not([disabled]), [tabindex="0"]';
  const modeDescriptions = {
    classic: 'Wasza historia w spokojnym rytmie. 18 wspomnień, cztery pory roku i wspólny finał. Bez losowych zmian zasad.',
    chaos: '18 wspomnień, 4 pory roku i niespodzianki. Spokojnie — przed większym chaosem dostaniesz ostrzeżenie.',
    party: 'Cztery minuty dla całej rodziny. Wszystkie pory roku, mały boss i wielki pokaz zdjęć. Postęp historii zostaje bez zmian.'
  };

  function init() {
    if (initialized) return;
    initialized = true;
    document.querySelectorAll('[id]').forEach(element => { refs[element.id] = element; });
    refs.canvas = refs.game;
    refs.startBtn = refs.startScreenBtn;
    refs.playerNameInput.value = progress.playerName;
    refs.finalImg.src = GameConfig.finalSrc;
    GameGallery.init({ ...refs, modalMode });
    setMode(selectedMode);
    updateSoundButton();
    updateHapticsButton();
    updateMotionButton();
    updateVolume();
    bindButtons();
    refresh();
    const observer = new MutationObserver(syncDialogs);
    document.querySelectorAll('.overlay').forEach(overlay => {
      observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
      overlay.addEventListener('click', event => {
        if (event.target === overlay && overlay.id !== 'unlockOverlay' && overlay.id !== 'finalOverlay') closeDialog(overlay);
      });
    });
    document.addEventListener('keydown', handleDialogKeys, true);
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    motionPreference.addEventListener?.('change', event => {
      if (localStorage.getItem(motionKey) === null) { reducedMotion = event.matches; updateMotionButton(); }
    });
    updateFullscreenButton();
    syncDialogs();
  }

  function on(id, callback) { refs[id]?.addEventListener('click', callback); }
  function bindButtons() {
    document.addEventListener('pointerdown', event => {
      const button = event.target.closest?.('button');
      if (!button || button.disabled) return;
      GameAudio.ensureReady();
      if (!['leftBtn', 'rightBtn', 'soundToggleBtn'].includes(button.id)) GameAudio.sfx.button();
      if (button.id !== 'hapticsToggleBtn') GameHaptics.light();
    }, { passive: true });
    document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    on('startScreenBtn', startSelected);
    refs.playerNameInput.addEventListener('change', applyPlayerName);
    refs.playerNameInput.addEventListener('keydown', event => { if (event.key === 'Enter') startSelected(); });
    on('galleryBtn', () => showGallery());
    on('startGalleryBtn', () => showGallery());
    on('closeGalleryBtn', () => closeDialog(refs.galleryOverlay));
    on('leaderboardBtn', showLeaderboard);
    on('closeLeaderboardBtn', () => closeDialog(refs.leaderboardOverlay));
    on('leaderboardResetBtn', resetScores);
    on('resetScoresBtn', resetScores);
    on('resetPlayerBtn', resetCurrentPlayer);
    on('finalResetBtn', resetCurrentPlayer);
    on('settingsBtn', () => openDialog(refs.settingsOverlay));
    on('gameSettingsBtn', () => openDialog(refs.settingsOverlay));
    on('closeSettingsBtn', () => closeDialog(refs.settingsOverlay));
    on('soundToggleBtn', () => { GameAudio.toggle(); updateSoundButton(); });
    on('hapticsToggleBtn', () => { GameHaptics.toggle(); updateHapticsButton(); GameHaptics.light(); });
    on('motionToggleBtn', () => {
      reducedMotion = !reducedMotion;
      localStorage.setItem(motionKey, reducedMotion ? '1' : '0');
      updateMotionButton();
    });
    refs.volumeSlider.addEventListener('input', () => {
      GameAudio.setVolume?.(Number(refs.volumeSlider.value) / 100);
      refs.volumeValue.textContent = `${refs.volumeSlider.value}%`;
    });
    on('fullscreenBtn', toggleFullscreen);
    on('menuBtn', returnToMenu);
    on('pauseMenuBtn', returnToMenu);
    on('finalMenuBtn', returnToMenu);
    on('resumeBtn', () => window.Game?.resume());
    on('finalPartyBtn', () => { setMode('party'); startSelected(); });
    on('finalGalleryBtn', () => {
      const showAll = finalWasParty;
      returnToMenu();
      showGallery(showAll);
    });
  }

  function setMode(mode) {
    selectedMode = Object.hasOwn(modeDescriptions, mode) ? mode : 'chaos';
    localStorage.setItem(modeKey, selectedMode);
    document.querySelectorAll('[data-mode]').forEach(button => {
      const selected = button.dataset.mode === selectedMode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    refs.modeDescription.textContent = modeDescriptions[selectedMode];
    refs.modeChip.textContent = selectedMode.toUpperCase();
    updateStartLabel();
  }
  function updateStartLabel() {
    refs.startLabel.textContent = selectedMode === 'party' ? 'Czas na Party!' : progress.unlocked > 0 ? (progress.finalDone ? 'Obejrzyj finał' : 'Gramy dalej!') : 'Zagrajmy!';
  }
  function startSelected() {
    applyPlayerName();
    GameAudio.ensureReady();
    resumeAfterDialogs = false;
    stopFinalSlideshow();
    closeAllDialogs();
    partyGallery = false;
    window.Game?.start(selectedMode);
  }
  function partyMode() { setMode('party'); startSelected(); }
  function applyPlayerName() {
    const name = GameStorage.setCurrentPlayerName(refs.playerNameInput.value);
    refs.playerNameInput.value = name;
    progress = GameStorage.getProgress(name);
    refresh();
    return name;
  }
  function getProgress() { return progress; }
  function setProgress(nextProgress, record = false) {
    progress = record ? GameStorage.recordScore(nextProgress) : GameStorage.saveProgress(nextProgress);
    refresh();
    return progress;
  }
  function refresh() {
    if (!initialized) return;
    refs.unlockPill.textContent = `${progress.unlocked}/${GameConfig.memories.length}`;
    refs.unlockPill.setAttribute('aria-label', `${progress.unlocked} z ${GameConfig.memories.length} wspomnień`);
    refs.progressText.textContent = `${progress.unlocked} z ${GameConfig.memories.length} wspomnień · rekord ${progress.bestScore.toLocaleString('pl-PL')} pkt${progress.finalDone ? ' · finał ukończony' : ''}`;
    refs.playerText.textContent = `${progress.playerName} · ${progress.unlocked} wspomnień · rekord ${progress.bestScore.toLocaleString('pl-PL')} pkt`;
    refs.galleryInfo.textContent = partyGallery ? 'Wszystkie chwile z pokazu Party. W głównej historii odkrywasz je dalej po kolei.' : progress.unlocked >= GameConfig.memories.length ? 'Cała historia w jednym miejscu. Wybierz zdjęcie i wróć do wspomnienia.' : `${progress.unlocked} z 18 odkrytych chwil. Każdy ukończony poziom odsłania kolejną.`;
    GameGallery.render(partyGallery ? GameConfig.memories.length : progress.unlocked);
    updateStartLabel();
  }
  function updateHud(view) {
    refs.levelTitle.textContent = view.title || 'Wasza przygoda';
    refs.levelTitle.title = view.title || '';
    refs.scoreValue.textContent = Math.max(0, Math.floor(view.totalScore || 0)).toLocaleString('pl-PL');
    refs.scoreLine.title = `Ten poziom: ${view.levelScore || 0} pkt`;
    refs.comboDisplay.textContent = `×${view.multiplier || 1}`;
    refs.comboDisplay.title = `Kombo: ${view.combo || 0} przedmiotów`;
    const remaining = view.timeLeft;
    refs.timerDisplay.textContent = view.partyTime != null ? `${Math.floor(view.partyTime / 60)}:${String(Math.floor(view.partyTime % 60)).padStart(2, '0')}` : remaining != null ? `${Math.max(0, Math.ceil(remaining))}s` : '∞';
    refs.timerDisplay.style.color = remaining != null && remaining <= 10 ? 'var(--pink)' : '';
    const objective = `${Math.floor(view.progress || 0)}/${view.target || 0}${view.objective ? ` · ${view.objective}` : ''}`;
    refs.objectiveDisplay.textContent = objective;
    refs.objectiveDisplay.title = objective;
    const powers = view.powers || [view.shieldCharges ? `Tarcza ×${view.shieldCharges}` : '', view.ringActive ? 'Obrączka' : ''].filter(Boolean);
    refs.powerDisplay.textContent = powers.length ? powers.map(power => power.replace('Tarcza', 'T').replace('Obrączka', '×2')).join(' · ') : '';
    refs.powerDisplay.title = powers.join(', ');
    const lives = Math.max(0, Math.min(9, Math.ceil(view.lives || 0)));
    if (livesDrawn !== lives) {
      livesDrawn = lives;
      refs.livesDisplay.replaceChildren();
      for (let i = 0; i < Math.max(3, lives); i++) {
        const heart = document.createElement('i');
        heart.className = `pixel-heart${i >= lives ? ' empty' : ''}`;
        heart.setAttribute('aria-hidden', 'true');
        refs.livesDisplay.appendChild(heart);
      }
      refs.livesDisplay.setAttribute('aria-label', `Życia: ${lives}`);
    }
    const completion = Math.min(100, Math.max(0, (view.progress || 0) / Math.max(1, view.target || 1) * 100));
    refs.fill.style.width = `${completion}%`;
    refs.progressBar.setAttribute('aria-valuenow', String(Math.round(completion)));
    if (view.mode) refs.modeChip.textContent = view.mode.toUpperCase();
  }

  function setSeason(season) {
    refs.seasonChip.textContent = season.name || season.key;
    refs.gameCard.dataset.season = season.key || '';
  }
  function setEvent(label = 'Łap dobre chwile') { refs.eventChip.textContent = label || 'Łap dobre chwile'; }
  function showChaos(title, text, active = false) {
    refs.chaosTitle.textContent = title;
    refs.chaosText.textContent = text;
    refs.chaosKicker.textContent = active ? 'TERAZ NA PLANSZY' : 'ZA CHWILĘ';
    refs.chaosBanner.classList.toggle('active', active);
    refs.chaosBanner.classList.add('show');
  }
  function hideChaos() { refs.chaosBanner.classList.remove('show', 'active'); }
  function setPlaying(value) {
    playing = !!value;
    document.body.classList.toggle('playing', playing);
    if (playing) {
      closeStart();
      window.scrollTo(0, 0);
      requestAnimationFrame(() => { if (!getBlockingOverlay()) refs.game.focus({ preventScroll: true }); });
    }
  }
  function setPaused(value) {
    refs.pausePanel.classList.toggle('show', !!value);
    refs.pauseBtn.setAttribute('aria-label', value ? 'Wznów grę' : 'Zatrzymaj grę');
    refs.pauseBtn.innerHTML = value ? '▷ <span>Wznów</span>' : 'Ⅱ <span>Pauza</span>';
    if (value && !getBlockingOverlay()) refs.resumeBtn.focus({ preventScroll: true });
  }
  function showMenu() {
    resumeAfterDialogs = false;
    stopFinalSlideshow();
    closeAllDialogs();
    setPlaying(false);
    setPaused(false);
    hideChaos();
    refs.startOverlay.classList.add('show');
    partyGallery = false;
    refresh();
  }
  function returnToMenu() { window.Game?.stop(); showMenu(); }
  function closeStart() { refs.startOverlay.classList.remove('show'); }
  function hideUnlock() { closeDialog(refs.unlockOverlay); }
  function getModalMode() { return modalMode.value; }
  function getMode() { return selectedMode; }
  function isReducedMotion() { return reducedMotion; }
  function getBlockingOverlay() { return !!document.querySelector('.overlay.show'); }

  function showGallery(all = false) {
    partyGallery = all;
    refresh();
    openDialog(refs.galleryOverlay);
  }
  function showLeaderboard() {
    const rows = GameStorage.getLeaderboard();
    const partyRows = GameStorage.getPartyLeaderboard?.() || [];
    refs.leaderboardList.replaceChildren();
    function addRows(entries, party) {
      if (party) {
        const label = document.createElement('div'); label.className = 'eyebrow'; label.textContent = 'PARTY · OSOBNY RANKING';
        label.style.marginTop = '18px'; refs.leaderboardList.appendChild(label);
      }
      entries.forEach((entry, index) => {
        const row = document.createElement('div'); row.className = 'leader-row';
        const rank = document.createElement('span'); rank.className = 'leader-rank'; rank.textContent = String(index + 1).padStart(2, '0');
        const details = document.createElement('div');
        const name = document.createElement('b'); name.textContent = entry.playerName || 'Gość';
        const meta = document.createElement('div'); meta.className = 'leader-meta';
        meta.textContent = party ? 'Cztery minuty, jedna drużyna' : `${entry.unlocked || 0}/18 wspomnień${entry.finalDone ? ' · finał ukończony' : ''}`;
        details.append(name, meta);
        const score = document.createElement('span'); score.className = 'leader-score'; score.textContent = Math.max(0, Number(entry.bestScore ?? entry.score ?? 0)).toLocaleString('pl-PL');
        row.append(rank, details, score); refs.leaderboardList.appendChild(row);
      });
    }
    addRows(rows, false); addRows(partyRows, true);
    if (!rows.length && !partyRows.length) {
      const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Pierwsze miejsce czeka na Ciebie. Ukończ poziom albo zagraj w Party!'; refs.leaderboardList.appendChild(empty);
    }
    openDialog(refs.leaderboardOverlay);
  }
  function resetCurrentPlayer() {
    if (!confirm(`Zresetować postęp gracza „${progress.playerName}”? Odblokowane wspomnienia tego gracza zostaną usunięte.`)) return;
    window.Game?.stop();
    progress = GameStorage.saveProgress(GameStorage.resetCurrentPlayer(progress.playerName));
    showMenu();
  }
  function resetScores() {
    if (!confirm('Wyczyścić lokalne wyniki graczy? Odblokowane wspomnienia zostaną zachowane.')) return;
    window.Game?.stop();
    progress = GameStorage.resetScoresOnly();
    refresh();
    closeDialog(refs.settingsOverlay);
    showLeaderboard();
  }

  function updateSoundButton() {
    const enabled = GameAudio.isEnabled();
    refs.soundToggleBtn.textContent = enabled ? 'Włączone' : 'Wyłączone';
    refs.soundToggleBtn.setAttribute('aria-pressed', String(enabled));
  }
  function updateHapticsButton() {
    const available = GameHaptics.supported();
    refs.hapticsToggleBtn.textContent = available ? GameHaptics.isEnabled() ? 'Włączone' : 'Wyłączone' : 'Niedostępne';
    refs.hapticsToggleBtn.disabled = !available;
    refs.hapticsToggleBtn.setAttribute('aria-pressed', String(available && GameHaptics.isEnabled()));
  }
  function updateMotionButton() {
    refs.motionToggleBtn.textContent = reducedMotion ? 'Włączone' : 'Wyłączone';
    refs.motionToggleBtn.setAttribute('aria-pressed', String(reducedMotion));
    document.body.classList.toggle('reduced-motion', reducedMotion);
  }
  function updateVolume() {
    const volume = Math.round((GameAudio.getVolume?.() ?? .6) * 100);
    refs.volumeSlider.value = volume;
    refs.volumeValue.textContent = `${volume}%`;
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else refs.fullscreenStatus.textContent = 'Ta przeglądarka nie obsługuje pełnego ekranu. Uruchom grę z ekranu głównego telefonu.';
    } catch { refs.fullscreenStatus.textContent = 'Pełny ekran jest teraz niedostępny. Możesz grać dalej w tym oknie.'; }
    updateFullscreenButton();
  }
  function updateFullscreenButton() {
    refs.fullscreenBtn.textContent = document.fullscreenElement ? 'Wyłącz' : 'Włącz';
    if (!document.documentElement.requestFullscreen) {
      refs.fullscreenBtn.textContent = 'Brak obsługi'; refs.fullscreenBtn.disabled = true;
      refs.fullscreenStatus.textContent = 'Na iPhonie dodaj grę do ekranu początkowego, aby grać bez paska adresu.';
    }
  }

  function showFinal(totalScore, options = {}) {
    finalWasParty = !!options.party;
    refs.finalTitle.textContent = '10 LAT RAZEM – MISJA WYKONANA!';
    refs.finalText.textContent = options.party
      ? `${Math.floor(totalScore).toLocaleString('pl-PL')} punktów wspólnej zabawy! Cztery pory roku za Wami — teraz czas na Wasze najlepsze chwile.`
      : `Życie po ślubie? Razem dacie radę! ${Math.floor(totalScore).toLocaleString('pl-PL')} punktów, 18 wspomnień i historia, która trwa dalej.`;
    openDialog(refs.finalOverlay);
    startFinalSlideshow();
    GameAudio.sfx.finalWin();
    if (!isReducedMotion()) GameEffects.finalCelebration();
    GameHaptics.final();
  }
  function startFinalSlideshow() {
    stopFinalSlideshow();
    const slides = [{ src: GameConfig.finalSrc, title: 'Marta i Alek — 10 lat razem' }, ...GameConfig.memories];
    let index = 0;
    function show() {
      const slide = slides[index];
      refs.finalImg.src = slide.src;
      refs.finalImg.alt = slide.title;
      refs.slideCounter.textContent = index === 0 ? '10 LAT RAZEM' : `${index} / 18 · ${slide.title}`;
      refs.finalImg.classList.remove('changing');
      index = (index + 1) % slides.length;
    }
    show();
    finalSlideTimer = window.setInterval(() => {
      if (document.hidden || !refs.finalOverlay.classList.contains('show')) return;
      if (isReducedMotion()) show();
      else { refs.finalImg.classList.add('changing'); finalFadeTimer = window.setTimeout(show, 220); }
    }, 3200);
  }
  function stopFinalSlideshow() {
    clearInterval(finalSlideTimer); clearTimeout(finalFadeTimer);
    finalSlideTimer = 0; finalFadeTimer = 0;
  }

  function openDialog(element) { element.classList.add('show'); syncDialogs(); }
  function closeDialog(element) { element.classList.remove('show'); syncDialogs(); }
  function closeAllDialogs() {
    document.querySelectorAll('.overlay.show').forEach(overlay => overlay.classList.remove('show'));
    syncDialogs();
  }
  function syncDialogs() {
    if (!initialized) return;
    const visible = [...document.querySelectorAll('.overlay.show')];
    const previousTop = dialogStack.at(-1);
    const wasOpen = dialogStack.length > 0;
    for (let i = dialogStack.length - 1; i >= 0; i--) if (!visible.includes(dialogStack[i])) dialogStack.splice(i, 1);
    visible.forEach(overlay => {
      if (dialogStack.includes(overlay)) return;
      dialogFocus.set(overlay, document.activeElement);
      dialogStack.push(overlay);
    });
    const top = dialogStack.at(-1);
    refs.app.inert = !!top;
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.inert = !!top && overlay !== top;
      overlay.setAttribute('aria-hidden', String(overlay !== top));
    });
    if (top && !wasOpen) {
      const state = window.Game?.inspect?.();
      resumeAfterDialogs = playing && state?.status === 'playing' && !state.paused;
      if (resumeAfterDialogs) window.Game?.pause();
    }
    if (top !== previousTop) {
      if (top) {
        const previousFocus = previousTop && dialogFocus.get(previousTop);
        const target = previousFocus && top.contains(previousFocus) && previousFocus.getClientRects().length ? previousFocus : visibleControls(top)[0] || top;
        target.focus({ preventScroll: true });
      } else {
        const focus = previousTop && dialogFocus.get(previousTop);
        if (focus?.isConnected && !focus.closest('.overlay:not(.show)')) focus.focus({ preventScroll: true });
        if (resumeAfterDialogs) { resumeAfterDialogs = false; window.Game?.resume(); }
      }
    }
    if (!refs.finalOverlay.classList.contains('show')) stopFinalSlideshow();
    document.body.classList.toggle('dialog-open', !!top);
  }
  function visibleControls(element) { return [...element.querySelectorAll(focusableSelector)].filter(control => control.getClientRects().length && !control.closest('[inert]')); }
  function handleDialogKeys(event) {
    const top = dialogStack.at(-1);
    if (!top) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (top === refs.unlockOverlay && modalMode.value === 'unlock') refs.closeBtn.click();
      else if (top === refs.finalOverlay) returnToMenu();
      else closeDialog(top);
    } else if (event.key === 'Tab') {
      const controls = visibleControls(top);
      const first = controls[0] || top;
      const last = controls.at(-1) || top;
      if (!top.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      }
    }
  }
  return { init, refs, getProgress, setProgress, refresh, updateHud, showLeaderboard, showGallery, showFinal, closeStart, hideUnlock, getModalMode, applyPlayerName, partyMode, setSeason, setEvent, showChaos, hideChaos, setPlaying, showMenu, getMode, isReducedMotion, getBlockingOverlay, setPaused, openDialog, closeDialog };
})();
