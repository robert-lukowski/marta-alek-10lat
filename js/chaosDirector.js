/* The director only keeps time. Gameplay owns all effects and their cleanup. */
(function (root) {
  'use strict';

  const EVENTS = Object.freeze([
    { key: 'blackout', name: 'Zgasło światło!', text: 'Trzymajcie się blisko. Wasze serce rozświetla mrok.', duration: 3, harmful: true, minLevel: 2, weight: 1 },
    { key: 'storm', name: 'Nadchodzi burza!', text: 'Krótki podmuch zmieni lot przedmiotów. Znajdźcie bezpieczne miejsce.', duration: 6, harmful: true, minLevel: 1, weight: 1.2 },
    { key: 'inverted', name: 'Na opak!', text: 'Przez 5 sekund lewo znaczy prawo. Spokojnie, razem dacie radę.', duration: 5, harmful: true, minLevel: 4, weight: .7 },
    { key: 'magnet', name: 'Magnes miłości', text: 'Dobre rzeczy same do Was przyciągają.', duration: 8, beneficial: true, minLevel: 0, weight: 1.4 },
    { key: 'turbo', name: 'Szybkie randki!', text: 'Tempo na chwilę wzrośnie. Ostrzeżeń już wypatrujcie teraz.', duration: 6, harmful: true, minLevel: 3, weight: .9 },
    { key: 'bills', name: 'Deszcz rachunków!', text: 'Obowiązki nadciągają falą. Między nimi jest miejsce dla Was.', duration: 7, harmful: true, minLevel: 3, weight: .8 },
    { key: 'gift', name: 'Prezent niespodzianka', text: 'Złapcie prezent: nagroda albo mały psikus. Bez utraty życia.', duration: 7, beneficial: true, minLevel: 0, weight: 1.1 },
    { key: 'fake', name: 'Podejrzane serca', text: 'Fioletowe serca z pęknięciem są pułapką. Łapcie różowe!', duration: 8, harmful: true, minLevel: 5, weight: .7 },
    { key: 'freeze', name: 'Chwila tylko dla Was', text: 'Świat zwalnia. Wy nadal poruszacie się normalnie.', duration: 7, beneficial: true, minLevel: 0, weight: 1.1 },
    { key: 'love', name: 'Love Rush!', text: 'Dziesięć sekund samych dobrych okazji. Budujcie kombo!', duration: 10, beneficial: true, minLevel: 0, weight: 1.3 },
    { key: 'haunted', name: 'Duch dawnych sprzeczek', text: 'Trzy złote serca przepędzą ducha. Na razie omijajcie jego ślady.', duration: 12, harmful: true, minLevel: 2, weight: 1 },
    { key: 'jackpot', name: 'Złota rocznica!', text: 'Nadchodzi deszcz złotych serc. Każde jest na wagę wspomnień.', duration: 8, beneficial: true, minLevel: 0, weight: .8 },
    { key: 'lastheart', name: 'Ostatnie serce', text: 'Przetrwajcie 8 spokojniejszych sekund. Na końcu czeka tarcza!', duration: 8, beneficial: true, challenge: true, minLevel: 0, weight: 0 }
  ].map(event => Object.freeze(event)));
  const PARTY_BEATS = Object.freeze([
    [14, 'magnet'], [34, 'jackpot'], [54, 'storm'], [78, 'love'],
    [102, 'haunted'], [128, 'freeze'], [150, 'gift'], [169, 'love']
  ]);
  const byKey = key => EVENTS.find(event => event.key === key);
  const copy = event => event ? { ...event } : null;

  function create(options = {}) {
    const random = typeof options.random === 'function' ? options.random : Math.random;
    let mode, phase, event, remaining, elapsed, lastKey, partyIndex, lowLifeHandled, emergencyAt;
    const between = (low, high) => low + Math.max(0, Math.min(.999999, random())) * (high - low);
    const delay = () => between(30, 45);

    function reset(next = {}) {
      mode = ['classic', 'chaos', 'party'].includes(next.mode) ? next.mode : (mode || 'chaos');
      phase = 'calm';
      event = null;
      remaining = delay();
      elapsed = 0;
      lastKey = '';
      partyIndex = 0;
      lowLifeHandled = false;
      emergencyAt = -Infinity;
      return snapshot();
    }

    function snapshot() {
      const nextIn = mode === 'classic' ? Infinity : mode === 'party' && phase === 'calm'
        ? Math.max(0, (PARTY_BEATS[partyIndex]?.[0] ?? Infinity) - elapsed) : phase === 'calm' ? remaining : 0;
      return { mode, phase, event: copy(event), remaining, nextIn, elapsed };
    }

    function cancel() {
      const cancelled = copy(event);
      event = null;
      if (cancelled) {
        phase = 'recovery';
        remaining = 8;
      }
      return cancelled;
    }

    function choose(context) {
      const level = Math.max(0, Number(context.level) || 0);
      const goldenGoal = ['golden', 'gold', 'goldOnly'].includes(context.goalMode);
      let candidates = EVENTS.filter(item => item.weight > 0 && item.key !== lastKey && item.minLevel <= level);
      if (context.lives <= 1) candidates = candidates.filter(item => !item.harmful);
      if (goldenGoal) candidates = candidates.filter(item => !['fake', 'blackout', 'bills'].includes(item.key));
      // Low levels spend more time enjoying bonuses than avoiding surprises.
      const weight = item => item.weight * (item.harmful ? Math.min(1.2, .45 + level * .055) : 1);
      const total = candidates.reduce((sum, item) => sum + weight(item), 0);
      let roll = between(0, total);
      for (const item of candidates) {
        roll -= weight(item);
        if (roll < 0) return item;
      }
      return byKey('love');
    }

    function anticipate(nextEvent, actions) {
      event = nextEvent;
      phase = 'anticipation';
      remaining = 2.5;
      actions.push({ type: 'warning', event: copy(event) });
    }

    function update(dt, context = {}) {
      const actions = [];
      let delta = Number(dt);
      if (!Number.isFinite(delta) || delta <= 0) return actions;
      if (mode === 'classic' || context.boss) {
        if (event) actions.push({ type: 'end', event: copy(event), cancelled: true, reason: context.boss ? 'boss' : 'classic' });
        if (event || phase !== 'calm') cancel();
        return actions;
      }
      if (context.lives > 1 && elapsed - emergencyAt > 40) lowLifeHandled = false;
      if (context.lives === 1 && !lowLifeHandled && elapsed - emergencyAt >= 40) {
        lowLifeHandled = true;
        emergencyAt = elapsed;
        if (event) actions.push({ type: 'end', event: copy(event), cancelled: true, reason: 'emergency' });
        actions.push({ type: 'recovery', emergency: true, opportunity: 'shield', duration: 8 });
        anticipate(byKey('lastheart'), actions);
      }
      // Each transition consumes its own portion of dt, so a slow frame cannot
      // shorten the warning or silently skip event cleanup.
      while (delta > 0) {
        if (mode === 'party' && phase === 'calm') {
          remaining = Math.max(0, (PARTY_BEATS[partyIndex]?.[0] ?? Infinity) - elapsed);
        }
        const step = Math.min(delta, remaining);
        elapsed += step;
        remaining -= step;
        delta -= step;
        if (remaining > .000001) break;
        if (phase === 'calm') {
          let selected;
          if (mode === 'party') {
            selected = byKey(PARTY_BEATS[partyIndex++][1]);
            if (context.lives === 1 && selected.harmful) selected = byKey('love');
          } else selected = choose(context);
          anticipate(selected, actions);
        } else if (phase === 'anticipation') {
          phase = 'active';
          remaining = event.duration;
          lastKey = event.key;
          actions.push({ type: 'start', event: copy(event) });
        } else if (phase === 'active') {
          const completed = copy(event);
          actions.push({ type: 'end', event: completed, cancelled: false });
          phase = 'recovery';
          remaining = between(6, 10);
          event = null;
          actions.push({ type: 'recovery', event: completed, duration: remaining, reward: completed.key === 'lastheart' ? 'shield' : null });
        } else {
          phase = 'calm';
          remaining = delay();
        }
      }
      return actions;
    }

    reset(options);
    return { update, snapshot, reset, cancel };
  }

  const api = { create, events: EVENTS };
  root.ChaosDirector = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
