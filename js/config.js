window.GameConfig = {
  keys: {
    progressPrefix: 'marta_alek_10lat_player_progress_v1_',
    leaderboard: 'marta_alek_10lat_leaderboard_v1',
    currentPlayer: 'marta_alek_10lat_current_player_v1',
    legacyUnlocked: 'marta_alek_10lat_unlocked_v2',
    legacyFinal: 'marta_alek_10lat_final_v1',
    sound: 'marta_alek_10lat_sound_v1',
    haptics: 'marta_alek_10lat_haptics_v1'
  },
  coverSrc: 'assets/images/cover.webp',
  finalSrc: 'assets/images/final.webp',
  startLives: 3,
  chaos: { minDelay: 30, maxDelay: 45, warningSeconds: 2.2 },
  world: { width: 384, height: 576 },
  party: { seasonSeconds: 45, journeySeconds: 180, bossSeconds: 60 },
  player: { margin: 38, holdSpeed: 285, hitboxHalfWidth: 30, hitboxTop: 30, hitboxBottom: 24 },
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
    heart:  { label:'serce', value:1, radius:14, color:'#ed8099' },
    lock:   { label:'kłódka', value:2, radius:14, color:'#e8b96c' },
    star:   { label:'iskra', value:3, radius:14, color:'#ffe8ae' },
    golden: { label:'złote serce', value:3, radius:14, color:'#ffce69' },
    jackpot:{ label:'jackpot', value:12, radius:16, color:'#ffe8ae' }
  },
  badItems: {
    broken: { label:'pęknięte serce', radius:14, color:'#a8526a', life:1, points:-8 },
    storm:  { label:'burza', radius:15, color:'#8689ab', life:0, points:-4, effect:'slowPlayer' },
    drama:  { label:'bomba dramatu', radius:14, color:'#cb7188', life:0, points:-6, effect:'combo' },
    bill:   { label:'rachunek', radius:14, color:'#d0bb98', life:0, points:-10 },
    alarm:  { label:'budzik', radius:14, color:'#e39777', life:0, points:-7, effect:'combo' },
    laundry:{ label:'pranie', radius:15, color:'#b3a8ce', life:0, points:-6, effect:'slowPlayer' },
    fake:   { label:'fałszywe serce', radius:14, color:'#b081c9', life:0, points:-7 },
    hazard: { label:'przeszkoda sezonowa', radius:14, color:'#a1b9c4', life:1, points:-5 }
  },
  powerItems: {
    shield: { label:'tarcza', radius:15, color:'#8bd7c3' },
    ring:   { label:'obrączka', radius:15, color:'#ffe082' },
    clock:  { label:'czas dla siebie', radius:15, color:'#8abedb' },
    camera: { label:'aparat wspomnień', radius:15, color:'#b9a7d5' },
    magnet: { label:'magnes', radius:15, color:'#ef9c9a' },
    gift:   { label:'prezent', radius:15, color:'#d7b0db' }
  }
};
