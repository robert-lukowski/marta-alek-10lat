window.GameLevels = (() => {
  const memories = GameConfig.memories;
  const LEVELS = memories.map((memory, i) => makeLevelGoal(i, memory));
  const FINAL_LEVEL = {
    final:true,
    title:'Próba dziesięciu lat',
    mode:'final',
    target:30,
    seconds:78,
    short:'Zbierz 30 miłosnych rzeczy i omijaj życiowe przeszkody',
    hint:'Finał: łap serca, kłódki, iskry i złote serca. Kombo bardzo pomaga.',
    spawnEvery:.58,
    speedMin:118,
    speedMax:172,
    badChance:.24,
    powerChance:.07,
    goldenChance:.13
  };

  function makeLevelGoal(i, memory) {
    const d = i / Math.max(1, memories.length - 1);
    const mode = ['hearts','locks','score','survive','golden','love'][i % 6];
    const base = {
      title: memory.title,
      mode,
      target: 8,
      seconds: 0,
      short: '',
      hint: '',
      spawnEvery: Math.max(.62, 1.02 - d * .34),
      speedMin: 88 + d * 30,
      speedMax: 136 + d * 48,
      badChance: .035 + d * .16,
      powerChance: .035 + d * .025,
      goldenChance: .06 + d * .05
    };
    if (mode === 'hearts') {
      base.target = 7 + Math.floor(d * 8);
      base.short = `Zbierz ${base.target} serc`;
      base.hint = 'Serca liczą się do celu, a reszta dobrych rzeczy buduje wynik i kombo.';
    } else if (mode === 'locks') {
      base.target = 5 + Math.floor(d * 7);
      base.short = `Zbierz ${base.target} kłódek miłości`;
      base.hint = 'Kłódki są trochę rzadsze, więc łap też power-upy i trzymaj kombo.';
    } else if (mode === 'score') {
      base.target = 22 + Math.floor(d * 34);
      base.seconds = 42 + Math.floor(d * 14);
      base.short = `Zdobądź ${base.target} punktów przed końcem czasu`;
      base.hint = 'Kombo mnoży punkty. Obrączka podwaja wynik przez chwilę.';
    } else if (mode === 'survive') {
      base.target = 22 + Math.floor(d * 16);
      base.seconds = base.target;
      base.short = `Przetrwaj ${base.target} sekund z 3 życiami`;
      base.hint = 'Nie trzeba ryzykować każdego przedmiotu. Najważniejsze są spokój i trzy życia.';
    } else if (mode === 'golden') {
      base.target = 5 + Math.floor(d * 7);
      base.goldenChance = .28 + d * .14;
      base.short = `Zbierz tylko ${base.target} złotych serc`;
      base.hint = 'W tym levelu do celu liczą się tylko złote serca. Inne dobre rzeczy nie ranią, ale zrywają rytm.';
    } else {
      base.target = 10 + Math.floor(d * 12);
      base.short = `Zbierz ${base.target} miłosnych przedmiotów`;
      base.hint = 'Serca, kłódki, iskry i złote serca liczą się do celu.';
    }
    return base;
  }
  function getLevel(index) {
    return index >= memories.length ? FINAL_LEVEL : LEVELS[index];
  }
  function targetFor(goal) {
    return goal.mode === 'survive' ? goal.seconds : goal.target;
  }
  return { LEVELS, FINAL_LEVEL, getLevel, targetFor };
})();
