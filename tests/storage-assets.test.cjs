const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const profilePrefix = 'marta_alek_10lat_player_progress_v1_';
const currentPlayerKey = 'marta_alek_10lat_current_player_v1';
const leaderboardKey = 'marta_alek_10lat_leaderboard_v1';
const partyKey = 'marta_alek_10lat_party_leaderboard_v1';
const plain = value => JSON.parse(JSON.stringify(value));

function storageFixture(seed = {}) {
  const values = new Map(Object.entries(seed));
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  };
  const sandbox = { localStorage };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('js/config.js'), sandbox);
  vm.runInContext(read('js/storage.js'), sandbox);
  return { storage: sandbox.GameStorage, config: sandbox.GameConfig, values };
}

function workerFixture(overrides = {}) {
  const handlers = {};
  const installed = [], deleted = [], requests = [];
  let claimed = false;
  const cache = {
    addAll: async paths => { installed.push(...paths); },
    match: async () => undefined,
    ...overrides.cache
  };
  const sandbox = {
    URL, Response,
    self: {
      location: { origin: 'https://example.github.io' },
      registration: { scope: 'https://example.github.io/marta-alek-10lat/' },
      clients: { claim: async () => { claimed = true; } },
      addEventListener: (name, handler) => { handlers[name] = handler; }
    },
    caches: {
      open: async () => cache,
      keys: async () => ['unrelated-app-v7', 'marta-alek-chaos-v1', 'marta-alek-pixel-v1', 'another-project-offline'],
      delete: async key => { deleted.push(key); return true; }
    },
    fetch: overrides.fetch || (async request => { requests.push(request); return new Response('network'); })
  };
  vm.runInNewContext(read('service-worker.js'), sandbox);
  const run = async (name, request) => {
    let waiting;
    handlers[name]({ request, waitUntil: promise => { waiting = promise; }, respondWith: promise => { waiting = promise; } });
    return waiting === undefined ? undefined : await waiting;
  };
  return { run, installed, deleted, requests, cache, claimed: () => claimed };
}

test('existing profile storage keys and named-player progress remain compatible', () => {
  const original = { playerName: 'Marta', unlocked: 11, finalDone: false, currentScore: 540, bestScore: 690, bestRunAt: '2026-09-05T10:00:00.000Z' };
  const { storage, config, values } = storageFixture({
    [currentPlayerKey]: 'Marta',
    [profilePrefix + 'marta']: JSON.stringify(original),
    unrelatedSetting: 'keep'
  });
  assert.equal(config.keys.progressPrefix, profilePrefix);
  assert.equal(config.keys.currentPlayer, currentPlayerKey);
  assert.equal(config.keys.leaderboard, leaderboardKey);
  assert.deepEqual(plain(storage.getProgress()), original);
  storage.saveProgress({ ...storage.getProgress(), unlocked: 12 });
  assert.equal(JSON.parse(values.get(profilePrefix + 'marta')).unlocked, 12);
  assert.equal(values.get('unrelatedSetting'), 'keep');
});

test('legacy guest progress is recovered without leaking into a new named profile', () => {
  const { storage, config } = storageFixture({
    marta_alek_10lat_unlocked_v2: '9',
    marta_alek_10lat_final_v1: '1'
  });
  assert.equal(config.keys.legacyUnlocked, 'marta_alek_10lat_unlocked_v2');
  assert.equal(config.keys.legacyFinal, 'marta_alek_10lat_final_v1');
  assert.equal(storage.getProgress().playerName, 'Gość');
  assert.equal(storage.getProgress().unlocked, 9);
  assert.equal(storage.getProgress().finalDone, true);
  storage.setCurrentPlayerName('Alek');
  assert.equal(storage.getProgress().unlocked, 0);
  assert.equal(storage.getProgress().finalDone, false);
});

test('existing leaderboard entries survive a new campaign best score', () => {
  const rows = [
    { id: 'alek', playerName: 'Alek', bestScore: 500, unlocked: 10, finalDone: false, bestRunAt: '2026-09-01' },
    { id: 'marta', playerName: 'Marta', bestScore: 600, unlocked: 11, finalDone: false, bestRunAt: '2026-09-02' }
  ];
  const { storage } = storageFixture({ [leaderboardKey]: JSON.stringify(rows) });
  assert.deepEqual(plain(storage.getLeaderboard()).map(row => row.playerName), ['Marta', 'Alek']);
  storage.recordScore({ ...storage.getProgress('Alek'), unlocked: 12, currentScore: 700, bestScore: 500 });
  const updated = plain(storage.getLeaderboard());
  assert.equal(updated.length, 2);
  assert.equal(updated[0].playerName, 'Alek');
  assert.equal(updated[0].bestScore, 700);
  assert.equal(updated[1].bestScore, 600);
});

test('Party leaderboard updates best scores independently from campaign data', () => {
  const campaign = JSON.stringify({ playerName: 'Marta', unlocked: 8, currentScore: 440, bestScore: 440, finalDone: false });
  const leaderboard = JSON.stringify([{ id: 'marta', playerName: 'Marta', bestScore: 440 }]);
  const { storage, values } = storageFixture({ [profilePrefix + 'marta']: campaign, [leaderboardKey]: leaderboard });
  storage.recordPartyScore('Marta', 50);
  storage.recordPartyScore('Marta', 30);
  assert.equal(storage.getPartyLeaderboard()[0].bestScore, 50);
  storage.recordPartyScore('Marta', 75);
  assert.equal(storage.getPartyLeaderboard().length, 1);
  assert.equal(storage.getPartyLeaderboard()[0].bestScore, 75);
  assert.equal(values.get(profilePrefix + 'marta'), campaign);
  assert.equal(values.get(leaderboardKey), leaderboard);
  assert.ok(values.has(partyKey));
});

test('score reset preserves unlocked photos and final completion for every profile', () => {
  const { storage, values } = storageFixture({
    [currentPlayerKey]: 'Marta',
    [profilePrefix + 'marta']: JSON.stringify({ playerName: 'Marta', unlocked: 18, finalDone: true, currentScore: 500, bestScore: 700 }),
    [profilePrefix + 'alek']: JSON.stringify({ playerName: 'Alek', unlocked: 6, finalDone: false, currentScore: 200, bestScore: 300 }),
    [leaderboardKey]: '[]', [partyKey]: '[]', foreignKey: 'preserve'
  });
  storage.resetScoresOnly();
  assert.equal(storage.getProgress('Marta').unlocked, 18);
  assert.equal(storage.getProgress('Marta').finalDone, true);
  assert.equal(storage.getProgress('Marta').currentScore, 0);
  assert.equal(storage.getProgress('Alek').unlocked, 6);
  assert.equal(storage.getProgress('Alek').bestScore, 0);
  assert.equal(values.has(leaderboardKey), false);
  assert.equal(values.has(partyKey), false);
  assert.equal(values.get('foreignKey'), 'preserve');
});

test('damaged profile JSON and impossible stored progress recover to usable bounds', () => {
  const { storage } = storageFixture({
    [profilePrefix + 'marta']: '{broken',
    [profilePrefix + 'alek']: JSON.stringify({ unlocked: 400, currentScore: -100, bestScore: 'bad' }),
    [leaderboardKey]: 'not json', [partyKey]: '{}'
  });
  assert.equal(storage.getProgress('Marta').unlocked, 0);
  assert.equal(storage.getProgress('Alek').unlocked, 18);
  assert.equal(storage.getProgress('Alek').currentScore, 0);
  assert.equal(storage.getProgress('Alek').bestScore, 0);
  assert.equal(storage.getLeaderboard().length, 0);
  assert.equal(storage.getPartyLeaderboard().length, 0);
});

test('all 18 original memories retain their exact content and valid local WebP assets', () => {
  const { config } = storageFixture();
  assert.equal(config.memories.length, 18);
  // Captured from the deployed pre-remaster config (202d2d1). No Git access is
  // needed in CI; changing a title/caption/photo must be an intentional edit.
  const originalHash = 'f80b5b3309988b5a26b0647a8942ff9492ba5412c5ac080705babde978a44a45';
  const hash = crypto.createHash('sha256').update(JSON.stringify(config.memories)).digest('hex');
  assert.equal(hash, originalHash);
  for (const [index, memory] of config.memories.entries()) {
    assert.equal(memory.id, index + 1);
    assert.ok(memory.title.length > 0 && memory.caption.length > 0);
    const bytes = fs.readFileSync(path.join(root, memory.src));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('manifest remains GitHub Pages relative and its raster icon dimensions are correct', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith('/'));
    const bytes = fs.readFileSync(path.join(root, icon.src));
    if (icon.type === 'image/png') {
      assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
      assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
    } else assert.ok(bytes.toString('utf8').includes('<svg'));
  }
});

test('offline install caches every referenced script, stylesheet, icon and memory using existing paths', async () => {
  const worker = workerFixture();
  await worker.run('install');
  assert.ok(worker.installed.length >= 40);
  for (const asset of worker.installed) {
    const target = path.resolve(root, asset === './' ? 'index.html' : asset);
    assert.ok(target.startsWith(path.resolve(root) + path.sep));
    assert.ok(fs.statSync(target).isFile(), `${asset} is a cached file`);
  }
  const html = read('index.html');
  for (const match of html.matchAll(/(?:src|href)="((?:js\/|css\/|assets\/|manifest\.)[^\"]+)"/g)) {
    const pathname = match[1].split('?')[0];
    assert.ok(worker.installed.includes('./' + pathname), `${match[1]} is included offline (worker ignores release query)`);
  }
  const { config } = storageFixture();
  for (const memory of config.memories) assert.ok(worker.installed.includes('./' + memory.src));
});

test('worker activation deletes only obsolete caches belonging to this game', async () => {
  const worker = workerFixture();
  await worker.run('activate');
  assert.deepEqual(worker.deleted, ['marta-alek-chaos-v1']);
  assert.equal(worker.claimed(), true);
});

test('worker ignores unrelated origins, other repository scopes and non-GET requests', async () => {
  const worker = workerFixture();
  for (const request of [
    { method: 'GET', url: 'https://foreign.example/game.js' },
    { method: 'GET', url: 'https://example.github.io/another-repo/index.html' },
    { method: 'POST', url: 'https://example.github.io/marta-alek-10lat/index.html' }
  ]) assert.equal(await worker.run('fetch', request), undefined);
  assert.equal(worker.requests.length, 0);
});

test('offline navigation uses the cached coherent shell and missing resources fail gracefully', async () => {
  let cacheKey;
  const worker = workerFixture({
    cache: { match: async key => { cacheKey = key; return new Response('cached game'); } },
    fetch: async () => { throw new Error('offline'); }
  });
  const request = { method: 'GET', mode: 'navigate', url: 'https://example.github.io/marta-alek-10lat/?installed=1' };
  const page = await worker.run('fetch', request);
  assert.equal(cacheKey, './index.html');
  assert.equal(await page.text(), 'cached game');
  const missing = workerFixture({ fetch: async () => { throw new Error('offline'); } });
  const response = await missing.run('fetch', { ...request, mode: 'cors', url: 'https://example.github.io/marta-alek-10lat/missing.png' });
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Brak połączenia/);
});

test('a failed full-shell install rejects without activating an incomplete offline game', async () => {
  const worker = workerFixture({ cache: { addAll: async () => { throw new Error('photo download failed'); } } });
  await assert.rejects(worker.run('install'), /photo download failed/);
  assert.equal(worker.claimed(), false);
  assert.deepEqual(worker.deleted, []);
});

test('release-tagged scripts bypass legacy caches but resolve to the new coherent offline shell', async () => {
  const html = read('index.html');
  for (const match of html.matchAll(/(?:src|href)="((?:js\/|css\/)[^\"]+)"/g)) {
    assert.match(match[1], /\?v=pixel\d+$/, 'Every code/style URL bypasses legacy unversioned cache');
  }
  let options;
  const worker = workerFixture({ cache: { match: async (_key, opts) => { options = opts; return new Response('cached script'); } } });
  const response = await worker.run('fetch', { method: 'GET', mode: 'cors', url: 'https://example.github.io/marta-alek-10lat/js/game.js?v=pixel1' });
  assert.equal(options.ignoreSearch, true);
  assert.equal(await response.text(), 'cached script');
});
