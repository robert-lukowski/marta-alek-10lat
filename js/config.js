window.GameConfig = {
  keys: {
    progressPrefix: 'marta_alek_10lat_player_progress_v1_',
    leaderboard: 'marta_alek_10lat_leaderboard_v1',
    currentPlayer: 'marta_alek_10lat_current_player_v1',
    legacyUnlocked: 'marta_alek_10lat_unlocked_v2',
    legacyFinal: 'marta_alek_10lat_final_v1',
    sound: 'marta_alek_10lat_sound_v1'
  },
  coverSrc: 'assets/images/cover.webp',
  finalSrc: 'assets/images/final.webp',
  startLives: 3,
  player: { margin: 44, holdSpeed: 220, dragSmoothing: 0.42, hitboxXFactor: 0.84, hitboxTop: 58, hitboxBottom: 46 },
  memories: [
  {
    "id": 1,
    "title": "Pierwszy kadr",
    "caption": "Od takich wspólnych ujęć zaczyna się każda długa historia.",
    "src": "assets/images/memory-01.webp"
  },
  {
    "id": 2,
    "title": "Konstanz i serca na molo",
    "caption": "Most, woda, kłódki i ta energia: razem idziemy dalej.",
    "src": "assets/images/memory-02.webp"
  },
  {
    "id": 3,
    "title": "Widoki z góry",
    "caption": "Kiedy świat jest szeroki, ale najważniejsze jest obok.",
    "src": "assets/images/memory-03.webp"
  },
  {
    "id": 4,
    "title": "Wakacyjny tryb",
    "caption": "Słońce, plaża i klasyczne: jeszcze jedno zdjęcie!",
    "src": "assets/images/memory-04.webp"
  },
  {
    "id": 5,
    "title": "Nad morzem",
    "caption": "Nieważne czy świeci słońce, czy wieje — razem jest cieplej.",
    "src": "assets/images/memory-05.webp"
  },
  {
    "id": 6,
    "title": "Elegancki rozdział",
    "caption": "Są chwile, w których po prostu widać: to jest drużyna.",
    "src": "assets/images/memory-06.webp"
  },
  {
    "id": 7,
    "title": "Dzień ślubu",
    "caption": "Jeden z tych momentów, które zostają na zawsze.",
    "src": "assets/images/memory-07.webp"
  },
  {
    "id": 8,
    "title": "Kolejny ślubny kadr",
    "caption": "Mały gest, wielkie wspomnienie.",
    "src": "assets/images/memory-08.webp"
  },
  {
    "id": 9,
    "title": "Podróże i przygody",
    "caption": "Czasem najlepsze historie zaczynają się od kasku i uśmiechu.",
    "src": "assets/images/memory-09.webp"
  },
  {
    "id": 10,
    "title": "Wieczór tylko dla Was",
    "caption": "Miasto, światła, rozmowy i ta sama para po latach.",
    "src": "assets/images/memory-10.webp"
  },
  {
    "id": 11,
    "title": "Ponad plażą",
    "caption": "Widok piękny, ale para na pierwszym planie wygrywa.",
    "src": "assets/images/memory-11.webp"
  },
  {
    "id": 12,
    "title": "Ręka w rękę",
    "caption": "Najlepsza mechanika gry: trzymać się razem.",
    "src": "assets/images/memory-12.webp"
  },
  {
    "id": 13,
    "title": "Most po ślubie",
    "caption": "Dwa życia, jedna droga i dużo leveli przed Wami.",
    "src": "assets/images/memory-13.webp"
  },
  {
    "id": 14,
    "title": "Nowy Jork",
    "caption": "Filmowy pocałunek w środku miejskiego levelu.",
    "src": "assets/images/memory-14.webp"
  },
  {
    "id": 15,
    "title": "Mini Me bonus",
    "caption": "Małe wersje, wielka historia i trochę magii.",
    "src": "assets/images/memory-15.webp"
  },
  {
    "id": 16,
    "title": "Harbor Hug Hero",
    "caption": "Level clear — serca zebrane, molo zdobyte.",
    "src": "assets/images/memory-16.webp"
  },
  {
    "id": 17,
    "title": "Alek — kolekcjonerska figurka",
    "caption": "Limitowana edycja zawodnika z numerem 10.",
    "src": "assets/images/memory-17.webp"
  },
  {
    "id": 18,
    "title": "Marta — kolekcjonerska figurka",
    "caption": "Limitowana edycja z klasą, charakterem i akcesoriami.",
    "src": "assets/images/memory-18.webp"
  }
],
  goodItems: {
    heart:  { symbol:'💗', label:'serce', value:1, radius:18, color:'#ff6fae', glow:'#ffd1e5' },
    lock:   { symbol:'🔒', label:'kłódka', value:2, radius:18, color:'#ffd47a', glow:'#fff0b9' },
    star:   { symbol:'✨', label:'iskra', value:3, radius:20, color:'#fff0a8', glow:'#ffffff' },
    golden: { symbol:'💛', label:'złote serce', value:3, radius:20, color:'#ffd447', glow:'#fff4a6' }
  },
  badItems: {
    broken: { symbol:'💔', label:'pęknięte serce', radius:20, color:'#5a1430', glow:'#ff6b82', life:1, points:-8, effect:'life' },
    storm:  { symbol:'⛈️', label:'chmura z poniedziałkiem', radius:22, color:'#2e3b64', glow:'#9fc8ff', life:0, points:-4, effect:'slowPlayer' },
    drama:  { symbol:'💣', label:'bomba dramatu', radius:21, color:'#403044', glow:'#ff93c5', life:0, points:-6, effect:'combo' },
    bill:   { symbol:'🧾', label:'rachunek za dorosłość', radius:20, color:'#47362f', glow:'#ffd0a0', life:0, points:-10, effect:'points' }
  },
  powerItems: {
    shield: { symbol:'🛡️', label:'tarcza', radius:21, color:'#3dd6c8', glow:'#d6fff8' },
    ring:   { symbol:'💍', label:'obrączka', radius:21, color:'#ffe082', glow:'#ffffff' },
    clock:  { symbol:'⏰', label:'czas dla siebie', radius:21, color:'#7bc9ff', glow:'#e6f7ff' },
    camera: { symbol:'📷', label:'aparat wspomnień', radius:21, color:'#b9a7ff', glow:'#f0eaff' }
  }
};
