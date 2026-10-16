window.GameGallery = (() => {
  'use strict';
  const memories = GameConfig.memories;
  const refs = {};
  let recentUnlock = -1;
  let lastRenderedUnlocked = -1;
  let recentTimer = 0;
  function init(elements) { Object.assign(refs, elements); }
  function render(unlocked) {
    if (!refs.gallery) return;
    if (lastRenderedUnlocked === unlocked && recentUnlock === -1 && refs.gallery.children.length === memories.length) return;
    lastRenderedUnlocked = unlocked;
    refs.gallery.replaceChildren();
    memories.forEach((memory, index) => {
      const locked = index >= unlocked;
      const card = document.createElement('button');
      card.type = 'button'; card.className = `memory${locked ? ' locked' : ''}${index === recentUnlock ? ' just-unlocked' : ''}`;
      card.disabled = locked;
      card.setAttribute('aria-label', locked ? `Wspomnienie ${index + 1} zablokowane. Ukończ poziom ${index + 1}.` : `Otwórz wspomnienie ${index + 1}: ${memory.title}`);
      const img = document.createElement('img'); img.src = memory.src; img.alt = locked ? '' : memory.title; img.loading = 'lazy'; img.decoding = 'async';
      const number = document.createElement('span'); number.className = 'memory-number'; number.textContent = String(index + 1).padStart(2, '0');
      const caption = document.createElement('span'); caption.className = 'caption';
      const title = document.createElement('b'); title.textContent = locked ? 'Chwila do odkrycia' : memory.title;
      const description = document.createElement('span'); description.textContent = locked ? `Poziom ${index + 1} · ${GameLevels.LEVELS[index]?.short || 'Zagraj i odkryj wspomnienie'}` : memory.caption;
      caption.append(title, description); card.append(img, number, caption);
      if (locked) { const lock = document.createElement('span'); lock.className = 'lock'; lock.textContent = 'JESZCZE CHWILA'; card.appendChild(lock); }
      card.addEventListener('click', () => showMemory(index, false));
      refs.gallery.appendChild(card);
    });
  }
  function markUnlocked(index) {
    recentUnlock = index; lastRenderedUnlocked = -1;
    render(GameUI.getProgress().unlocked);
    clearTimeout(recentTimer);
    recentTimer = setTimeout(() => { recentUnlock = -1; refs.gallery.querySelector('.just-unlocked')?.classList.remove('just-unlocked'); }, 1200);
  }
  function showMemory(index, justUnlocked = true, completionSummary = '') {
    const memory = memories[index];
    if (!memory) return;
    refs.modalMode.value = justUnlocked ? 'unlock' : 'gallery';
    refs.modalImg.src = memory.src;
    refs.modalImg.alt = memory.title;
    refs.modalTitle.textContent = memory.title;
    refs.modalText.textContent = justUnlocked ? `${memory.caption} ${completionSummary}`.trim() : memory.caption;
    refs.memoryIndex.textContent = `${String(index + 1).padStart(2, '0')} / 18`;
    refs.memoryKicker.textContent = justUnlocked ? 'POZIOM UKOŃCZONY · NOWE WSPOMNIENIE' : 'WASZA HISTORIA W KADRZE';
    refs.nextBtn.textContent = justUnlocked ? GameUI.getProgress().unlocked >= memories.length ? 'Finał: Życie po ślubie →' : 'Następny poziom →' : 'Wróć do albumu';
    refs.closeBtn.hidden = !justUnlocked;
    refs.closeBtn.style.display = justUnlocked ? '' : 'none';
    refs.modalImg.classList.remove('unlock-glow');
    if (justUnlocked && !GameUI.isReducedMotion()) requestAnimationFrame(() => refs.modalImg.classList.add('unlock-glow'));
    GameUI.openDialog(refs.unlockOverlay);
  }
  return { init, render, markUnlocked, showMemory };
})();
