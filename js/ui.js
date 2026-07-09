window.GameUI = (() => {
  const refs = {};
  const modalMode = { value: 'unlock' };
  let progress = GameStorage.getProgress();

  function init() {
    Object.assign(refs, {
      cover: document.getElementById('cover'),
      finalImg: document.getElementById('finalImg'),
      levelTitle: document.getElementById('levelTitle'),
      scoreLine: document.getElementById('scoreLine'),
      fill: document.getElementById('fill'),
      unlockPill: document.getElementById('unlockPill'),
      progressText: document.getElementById('progressText'),
      playerText: document.getElementById('playerText'),
      soundToggleBtn: document.getElementById('soundToggleBtn'),
      leaderboardBtn: document.getElementById('leaderboardBtn'),
      startOverlay: document.getElementById('startOverlay'),
      unlockOverlay: document.getElementById('unlockOverlay'),
      leaderboardOverlay: document.getElementById('leaderboardOverlay'),
      finalOverlay: document.getElementById('finalOverlay'),
      modalBox: document.getElementById('modalBox'),
      modalImg: document.getElementById('modalImg'),
      modalTitle: document.getElementById('modalTitle'),
      modalText: document.getElementById('modalText'),
      nextBtn: document.getElementById('nextBtn'),
      closeBtn: document.getElementById('closeBtn'),
      gallery: document.getElementById('gallery'),
      galleryInfo: document.getElementById('galleryInfo'),
      playerNameInput: document.getElementById('playerNameInput'),
      leaderboardList: document.getElementById('leaderboardList'),
      finalText: document.getElementById('finalText')
    });
    refs.cover.src = GameConfig.coverSrc;
    refs.finalImg.src = GameConfig.finalSrc;
    refs.playerNameInput.value = progress.playerName;
    updateSoundButton();
    GameGallery.init({ ...refs, modalMode });
    bindButtons();
    refresh();
  }
  function bindButtons() {
    refs.soundToggleBtn.addEventListener('click', () => { GameAudio.toggle(); updateSoundButton(); GameAudio.sfx.button(); });
    for (const button of document.querySelectorAll('button')) {
      button.addEventListener('pointerdown', () => { GameAudio.ensureReady(); if (button.id !== 'soundToggleBtn') GameAudio.sfx.button(); }, { passive:true });
    }
    document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);
    document.getElementById('startLeaderboardBtn').addEventListener('click', showLeaderboard);
    document.getElementById('closeLeaderboardBtn').addEventListener('click', () => refs.leaderboardOverlay.classList.remove('show'));
    document.getElementById('leaderboardResetBtn').addEventListener('click', resetScores);
    document.getElementById('resetScoresBtn').addEventListener('click', resetScores);
    document.getElementById('resetPlayerBtn').addEventListener('click', resetCurrentPlayer);
    document.getElementById('finalResetBtn').addEventListener('click', resetCurrentPlayer);
    document.getElementById('galleryBtn').addEventListener('click', () => document.getElementById('gallerySection').scrollIntoView({ behavior:'smooth' }));
    document.getElementById('startGalleryBtn').addEventListener('click', () => { refs.startOverlay.classList.remove('show'); document.getElementById('gallerySection').scrollIntoView({ behavior:'smooth' }); });
    document.getElementById('partyBtn').addEventListener('click', partyMode);
    document.getElementById('finalPartyBtn').addEventListener('click', partyMode);
    document.getElementById('finalGalleryBtn').addEventListener('click', () => { refs.finalOverlay.classList.remove('show'); document.getElementById('gallerySection').scrollIntoView({ behavior:'smooth' }); });
    refs.unlockOverlay.addEventListener('click', event => { if (event.target === refs.unlockOverlay) refs.unlockOverlay.classList.remove('show'); });
    refs.leaderboardOverlay.addEventListener('click', event => { if (event.target === refs.leaderboardOverlay) refs.leaderboardOverlay.classList.remove('show'); });
    refs.playerNameInput.addEventListener('change', applyPlayerName);
  }
  function updateSoundButton() {
    refs.soundToggleBtn.textContent = GameAudio.isEnabled() ? 'Dźwięk: ON' : 'Dźwięk: OFF';
    refs.soundToggleBtn.setAttribute('aria-pressed', GameAudio.isEnabled() ? 'true' : 'false');
  }
  function applyPlayerName() {
    const name = GameStorage.setCurrentPlayerName(refs.playerNameInput.value);
    refs.playerNameInput.value = name;
    progress = GameStorage.getProgress(name);
    refresh();
  }
  function getProgress() { return progress; }
  function setProgress(nextProgress, record=false) {
    progress = record ? GameStorage.recordScore(nextProgress) : GameStorage.saveProgress(nextProgress);
    refresh();
    return progress;
  }
  function refresh() {
    const progressLine = `Odblokowano ${progress.unlocked} z ${GameConfig.memories.length} wspomnień`;
    refs.unlockPill.textContent = progress.finalDone ? `${progressLine} + finał ukończony` : progressLine;
    refs.progressText.textContent = `${progressLine}. Najlepszy wynik: ${progress.bestScore} pkt.`;
    refs.playerText.textContent = `Gracz: ${progress.playerName}. Wynik bieżący: ${progress.currentScore} pkt. Dane są lokalne dla tej przeglądarki.`;
    refs.galleryInfo.textContent = progress.unlocked >= GameConfig.memories.length ? (progress.finalDone ? 'Wszystkie wspomnienia i bonus ending odblokowane.' : 'Galeria pełna. Została Próba dziesięciu lat.') : `Jeszcze ${GameConfig.memories.length - progress.unlocked} do odkrycia.`;
    GameGallery.render(progress.unlocked);
  }
  function updateHud(view) {
    refs.levelTitle.textContent = view.title;
    const timeBit = view.timeLeft != null ? ` • ${Math.max(0, Math.ceil(view.timeLeft))}s` : '';
    const shieldBit = view.shieldCharges ? ' 🛡️' : '';
    const ringBit = view.ringActive ? ' 💍' : '';
    refs.scoreLine.textContent = `${Math.floor(view.progress)}/${view.target}${timeBit} • poziom ${view.levelScore} pkt • razem ${view.totalScore} pkt • combo x${view.multiplier} (${view.combo}) • ${'♥'.repeat(view.lives)}${shieldBit}${ringBit}`;
    refs.fill.style.width = `${Math.min(100, Math.max(0, view.progress / view.target * 100))}%`;
  }
  function showLeaderboard() {
    const rows = GameStorage.getLeaderboard();
    refs.leaderboardList.innerHTML = rows.length ? rows.map((row, index) => `
      <div class="leader-row">
        <div class="leader-rank">#${index + 1}</div>
        <div><b>${row.playerName}</b><div class="leader-meta">${row.unlocked}/${GameConfig.memories.length} wspomnień • finał: ${row.finalDone ? 'tak' : 'nie'} • ${row.bestRunAt ? new Date(row.bestRunAt).toLocaleString() : 'brak daty'}</div></div>
        <div><b>${row.bestScore}</b> pkt</div>
      </div>`).join('') : '<p>Jeszcze brak lokalnych wyników. Pierwszy wpis czeka na pierwszy odblokowany level.</p>';
    refs.leaderboardOverlay.classList.add('show');
  }
  function resetCurrentPlayer() {
    if (!confirm(`Zresetować postęp gracza "${progress.playerName}"? Odblokowane wspomnienia tego gracza zostaną usunięte.`)) return;
    progress = GameStorage.resetCurrentPlayer(progress.playerName);
    GameStorage.saveProgress(progress);
    refresh();
    refs.finalOverlay.classList.remove('show');
    refs.startOverlay.classList.add('show');
  }
  function resetScores() {
    if (!confirm('Zresetować lokalną tablicę wyników w tej przeglądarce?')) return;
    progress = GameStorage.resetScoresOnly();
    refresh();
    showLeaderboard();
  }
  function partyMode() {
    GameAudio.ensureReady();
    GameAudio.sfx.finalWin();
    GameEffects.finalCelebration();
  }
  function showFinal(totalScore) {
    refs.finalText.textContent = `Bonus ending odblokowany! Wynik tej historii: ${totalScore} pkt. Marta i Alek - 10 lat razem, a Party Mode może świętować bez końca.`;
    refs.finalOverlay.classList.add('show');
    partyMode();
  }
  function closeStart() { refs.startOverlay.classList.remove('show'); }
  function hideUnlock() { refs.unlockOverlay.classList.remove('show'); }
  function getModalMode() { return modalMode.value; }

  return { init, refs, getProgress, setProgress, refresh, updateHud, showLeaderboard, showFinal, closeStart, hideUnlock, getModalMode, applyPlayerName, partyMode };
})();
