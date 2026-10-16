/* Boss simulation: positions are normalized to the playfield, not CSS pixels. */
(function (root) {
  'use strict';
  const PHASES = ['Domowy chaos', 'Rachunki i obowiązki', 'Miłość zwycięża wszystko'];
  const LANES = [.17, .5, .83];
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function create({ party = false, random = Math.random } = {}) {
    const maxHp = party ? 18 : 30;
    let hp = maxHp, phase = 1, elapsed = 0, attackState = 'idle', timer = 1.2;
    let safeLane = .5, attackLanes = [], attackX = .5, supportTimer = .8, attackNumber = 0;
    let defeated = false;
    const queued = [{ type: 'phase', phase: 1, name: PHASES[0] }];
    const rand = () => clamp(Number(random()) || 0, 0, .999999);

    function snapshot() {
      return {
        name: 'Życie po ślubie', phase, hp, maxHp, phaseName: PHASES[phase - 1],
        attackState, attackX, attackLanes: [...attackLanes], safeLane,
        telegraph: attackState === 'telegraph' ? timer : 0,
        elapsed, defeated, party
      };
    }

    function hit(amount = 1) {
      const damage = Math.max(0, Number(amount) || 0);
      if (defeated || damage === 0) return { defeated, phaseChanged: false, phase, hp };
      hp = Math.max(0, hp - damage);
      const nextPhase = hp > maxHp * 2 / 3 ? 1 : hp > maxHp / 3 ? 2 : 3;
      const phaseChanged = nextPhase !== phase;
      phase = nextPhase;
      if (hp === 0) {
        defeated = true;
        attackState = 'recovery';
        attackLanes = [];
        queued.push({ type: 'defeated' });
      } else if (phaseChanged) {
        attackState = 'recovery';
        attackLanes = [];
        timer = 1.8;
        queued.push({ type: 'phase', phase, name: PHASES[phase - 1] });
      }
      return { defeated, phaseChanged, phase, hp };
    }

    function prepare(playerX, actions) {
      const nearest = LANES.reduce((best, lane) => Math.abs(lane - playerX) < Math.abs(best - playerX) ? lane : best, LANES[0]);
      // Keep the current lane safe most of the time. Other waves move the safe
      // lane by only one step, with a long visual warning before anything falls.
      const nearIndex = LANES.indexOf(nearest);
      const safeIndex = attackNumber % 3 === 2
        ? clamp(nearIndex + (nearIndex === 2 ? -1 : 1), 0, 2) : nearIndex;
      safeLane = LANES[safeIndex];
      const available = LANES.filter(lane => lane !== safeLane);
      attackLanes = phase === 1 ? [available[Math.floor(rand() * available.length)]] : available;
      attackX = attackLanes[0];
      attackState = 'telegraph';
      timer = party ? 1.7 : 1.6;
      actions.push({ type: 'telegraph', phase, duration: timer, lanes: [...attackLanes], safeLane });
    }

    function attack(actions) {
      const keys = phase === 1 ? ['laundry', 'alarm'] : phase === 2 ? ['bill', 'alarm'] : ['broken', 'bill'];
      const velocity = (party ? 94 : 102) + phase * 14;
      const items = attackLanes.map((x, index) => ({ key: keys[(attackNumber + index) % keys.length], family: 'bad', x, vy: velocity }));
      items.push({ key: phase === 3 ? 'golden' : 'heart', family: 'good', x: safeLane, vy: velocity * .88 });
      if (party || phase >= 2) items.push({ key: 'heart', family: 'good', x: clamp(safeLane + .07, .12, .88), vy: velocity * .69 });
      actions.push({ type: 'attack', phase, items, safeLane });
      attackState = 'attack';
      timer = .45;
      attackNumber++;
    }

    function update(dt, { playerX = .5 } = {}) {
      const actions = queued.splice(0);
      let delta = Number(dt);
      if (defeated || !Number.isFinite(delta) || delta <= 0) return actions;
      const player = clamp(Number(playerX) || .5, .12, .88);
      // Break at support and attack boundaries, making behavior independent of
      // display refresh rate and preserving the full telegraph time.
      while (delta > .000001) {
        const step = Math.min(delta, timer, supportTimer);
        elapsed += step;
        timer -= step;
        supportTimer -= step;
        delta -= step;
        if (supportTimer <= .000001) {
          const target = attackState === 'telegraph' || attackState === 'attack' ? safeLane : player;
          actions.push({ type: 'attack', support: true, items: [{ key: attackNumber % 5 === 4 ? 'golden' : 'heart', family: 'good', x: clamp(target + (rand() - .5) * .08, .12, .88), vy: 108 + phase * 4 }] });
          supportTimer = party ? 1.35 : 1.7;
        }
        if (timer <= .000001) {
          if (attackState === 'idle' || attackState === 'recovery') prepare(player, actions);
          else if (attackState === 'telegraph') attack(actions);
          else {
            attackState = 'recovery';
            attackLanes = [];
            timer = (party ? 1.65 : 2.25) - phase * .15;
            actions.push({ type: 'recovery', duration: timer });
          }
        }
      }
      return actions;
    }

    return { update, hit, snapshot };
  }

  const api = { create, phases: PHASES };
  root.GameBoss = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
