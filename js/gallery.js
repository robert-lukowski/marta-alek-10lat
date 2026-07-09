window.GameGallery = (() => {
  const memories = GameConfig.memories;
  let recentUnlock = -1;
  const refs = {};
  function init(elements) {
    Object.assign(refs, elements);
  }
  function render(unlocked) {
    refs.gallery.innerHTML = '';
    memories.forEach((memory, index) => {
      const locked = index >= unlocked;
      const goal = GameLevels.LEVELS[index];
      const card = document.createElement('div');
      card.className = 'memory' + (locked ? ' locked' : '');
      if (index === recentUnlock) card.classList.add('just-unlocked');
      card.innerHTML = `
        <img src="${memory.src}" alt="${locked ? 'Zablokowane wspomnienie' : memory.title}" />
        ${locked ? `<div class="lock">🔒 Level ${index + 1}</div>` : ''}
        <div class="caption"><b>${locked ? 'Wspomnienie zablokowane' : memory.title}</b><span>${locked ? 'Cel: ' + goal.short : memory.caption}</span></div>`;
      card.addEventListener('click', () => { if (!locked) showMemory(index, false); });
      refs.gallery.appendChild(card);
    });
  }
  function markUnlocked(index) {
    recentUnlock = index;
    setTimeout(() => { recentUnlock = -1; render(GameUI.getProgress().unlocked); }, 1200);
  }
  function showMemory(index, justUnlocked=true, completionSummary='') {
    const memory = memories[index];
    refs.modalMode.value = justUnlocked ? 'unlock' : 'gallery';
    refs.modalImg.src = memory.src;
    refs.modalTitle.textContent = justUnlocked ? `Odblokowano: ${memory.title}` : memory.title;
    refs.modalText.textContent = justUnlocked ? `${memory.caption} ${completionSummary}`.trim() : memory.caption;
    refs.nextBtn.textContent = justUnlocked ? (GameUI.getProgress().unlocked >= memories.length ? 'Próba dziesięciu lat' : 'Następny level') : 'Zamknij';
    refs.closeBtn.style.display = justUnlocked ? 'inline-block' : 'none';
    refs.modalImg.classList.remove('unlock-glow');
    refs.modalBox.classList.remove('unlock-celebrate');
    if (justUnlocked) requestAnimationFrame(() => refs.modalImg.classList.add('unlock-glow'));
    if (justUnlocked) requestAnimationFrame(() => refs.modalBox.classList.add('unlock-celebrate'));
    refs.unlockOverlay.classList.add('show');
  }
  return { init, render, markUnlocked, showMemory };
})();
