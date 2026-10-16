window.GameStorage = (() => {
  const { keys, memories } = GameConfig;
  const partyKey = 'marta_alek_10lat_party_leaderboard_v1';

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
      try {
        const loaded = { ...defaultProgress(clean), ...JSON.parse(stored), playerName: clean };
        loaded.unlocked = Math.max(0, Math.min(memories.length, Math.floor(Number(loaded.unlocked) || 0)));
        loaded.currentScore = Math.max(0, Math.floor(Number(loaded.currentScore) || 0));
        loaded.bestScore = Math.max(0, Math.floor(Number(loaded.bestScore) || 0));
        loaded.finalDone = !!loaded.finalDone;
        return loaded;
      } catch {}
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
      unlocked: Math.max(0, Math.min(memories.length, Math.floor(Number(progress.unlocked) || 0))),
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
    localStorage.removeItem(partyKey);
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

  function getPartyLeaderboard() {
    try {
      const rows = JSON.parse(localStorage.getItem(partyKey) || '[]');
      return Array.isArray(rows) ? rows.filter(row => row && typeof row.playerName === 'string')
        .sort((a, b) => b.bestScore - a.bestScore).slice(0, 12) : [];
    } catch { return []; }
  }
  function recordPartyScore(name, score) {
    const playerName = cleanName(name);
    const id = playerId(playerName);
    const rows = getPartyLeaderboard();
    const previous = rows.find(row => row.id === id);
    const value = Math.max(0, Math.floor(Number(score) || 0));
    if (!previous || value > previous.bestScore) {
      const remaining = rows.filter(row => row.id !== id);
      remaining.push({ id, playerName, bestScore: value, bestRunAt: new Date().toISOString(), mode: 'party' });
      localStorage.setItem(partyKey, JSON.stringify(remaining.sort((a, b) => b.bestScore - a.bestScore).slice(0, 12)));
    }
    return getPartyLeaderboard();
  }

  return { cleanName, getCurrentPlayerName, setCurrentPlayerName, getProgress, saveProgress, recordScore, getLeaderboard, resetCurrentPlayer, resetScoresOnly, getPartyLeaderboard, recordPartyScore };
})();
