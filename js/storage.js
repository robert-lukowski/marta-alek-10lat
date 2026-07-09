window.GameStorage = (() => {
  const { keys, memories } = GameConfig;

  function cleanName(name) {
    const value = String(name || '').trim().slice(0, 24);
    return value || 'Gość';
  }
  function playerId(name) {
    return encodeURIComponent(cleanName(name).toLowerCase()).replace(/%/g, '');
  }
  function progressKey(name) {
    return keys.progressPrefix + playerId(name);
  }
  function defaultProgress(name) {
    return { playerName: cleanName(name), unlocked: 0, finalDone: false, currentScore: 0, bestScore: 0, bestRunAt: '' };
  }
  function getCurrentPlayerName() {
    return cleanName(localStorage.getItem(keys.currentPlayer) || 'Gość');
  }
  function setCurrentPlayerName(name) {
    const clean = cleanName(name);
    localStorage.setItem(keys.currentPlayer, clean);
    return clean;
  }
  function getProgress(name = getCurrentPlayerName()) {
    const clean = cleanName(name);
    const stored = localStorage.getItem(progressKey(clean));
    if (stored) {
      try { return { ...defaultProgress(clean), ...JSON.parse(stored), playerName: clean }; } catch {}
    }
    const progress = defaultProgress(clean);
    if (clean === 'Gość') {
      progress.unlocked = Math.max(0, Math.min(memories.length, Number(localStorage.getItem(keys.legacyUnlocked) || 0)));
      progress.finalDone = localStorage.getItem(keys.legacyFinal) === '1';
    }
    return progress;
  }
  function saveProgress(progress) {
    const clean = cleanName(progress.playerName);
    const safe = {
      ...defaultProgress(clean),
      ...progress,
      playerName: clean,
      unlocked: Math.max(0, Math.min(memories.length, Number(progress.unlocked) || 0)),
      currentScore: Math.max(0, Math.floor(Number(progress.currentScore) || 0)),
      bestScore: Math.max(0, Math.floor(Number(progress.bestScore) || 0)),
      finalDone: !!progress.finalDone
    };
    localStorage.setItem(progressKey(clean), JSON.stringify(safe));
    return safe;
  }
  function getLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(keys.leaderboard) || '[]')
        .sort((a, b) => b.bestScore - a.bestScore || String(b.bestRunAt).localeCompare(String(a.bestRunAt)))
        .slice(0, 12);
    } catch {
      return [];
    }
  }
  function saveLeaderboard(rows) {
    localStorage.setItem(keys.leaderboard, JSON.stringify(rows.slice(0, 20)));
  }
  function recordScore(progress) {
    const now = new Date().toISOString();
    let saved = saveProgress(progress);
    if (saved.currentScore >= saved.bestScore) {
      saved.bestScore = saved.currentScore;
      saved.bestRunAt = now;
      saved = saveProgress(saved);
    }
    const id = playerId(saved.playerName);
    const rows = getLeaderboard().filter(row => row.id !== id);
    rows.push({
      id,
      playerName: saved.playerName,
      bestScore: saved.bestScore,
      unlocked: saved.unlocked,
      finalDone: saved.finalDone,
      bestRunAt: saved.bestRunAt || now
    });
    saveLeaderboard(rows.sort((a, b) => b.bestScore - a.bestScore));
    return saved;
  }
  function resetCurrentPlayer(name = getCurrentPlayerName()) {
    const clean = cleanName(name);
    localStorage.removeItem(progressKey(clean));
    return defaultProgress(clean);
  }
  function resetScoresOnly() {
    localStorage.removeItem(keys.leaderboard);
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(keys.progressPrefix)) continue;
      try {
        const progress = JSON.parse(localStorage.getItem(key));
        progress.currentScore = 0;
        progress.bestScore = 0;
        progress.bestRunAt = '';
        localStorage.setItem(key, JSON.stringify(progress));
      } catch {}
    }
    return getProgress(getCurrentPlayerName());
  }

  return { cleanName, getCurrentPlayerName, setCurrentPlayerName, getProgress, saveProgress, recordScore, getLeaderboard, resetCurrentPlayer, resetScoresOnly };
})();
