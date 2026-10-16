/* Optional real Chromium check. Node 22+, no npm dependencies.
 * CHROMIUM_PATH=/path/to/chrome node tests/browser-smoke.cjs
 * Runs at the GitHub Pages subpath, in an isolated temporary browser profile.
 */
'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(__dirname, 'artifacts');
const prefix = '/marta-alek-10lat/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // Simulate the previous release: unversioned scripts are stale, navigation is network-first.
  if (url.pathname === prefix + 'legacy-bootstrap.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><title>Migration fixture</title><script>navigator.serviceWorker.register("./legacy-test-worker.js")</script>');
    return;
  }
  if (url.pathname === prefix + 'legacy-test-worker.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(`const CACHE='marta-alek-chaos-v1';
      self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(async c=>{
        for(const name of ['config','storage','audio','haptics','levels','effects','gallery','ui','game','pwa'])
          await c.put('./js/'+name+'.js',new Response('throw new Error("Stale '+name+' loaded")',{headers:{'Content-Type':'text/javascript'}}));
        await caches.open('another-app-cache'); await self.skipWaiting();
      })));
      self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
      self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(e.request.mode==='navigate'?fetch(e.request):caches.open(CACHE).then(async c=>(await c.match(e.request))||fetch(e.request)));});`);
    return;
  }
  if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (!url.pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
  const filename = path.resolve(root, decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html');
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filename, (error, data) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
let chrome, socket, sequence = 0;
const pending = new Map(), errors = [], badResponses = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function until(expression, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (await evaluate(expression)) return; } catch {}
    await sleep(80);
  }
  throw new Error(`Condition timed out: ${expression}`);
}
async function click(selector) {
  const point = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  await sleep(100);
}
async function reloadGame() {
  // Page.reload acknowledges before navigation commits. Do not accidentally
  // assert against the previous document's already-initialized Game instance.
  await evaluate('window.__smokeOldDocument = true');
  await send('Page.reload');
  await until('!window.__smokeOldDocument && window.Game && Game.inspect().initialized');
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from(result.data, 'base64'));
}
async function layout(width, height, mobile = true) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 1 });
  await sleep(150);
}
async function connectTab(tab) {
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id); pending.delete(message.id); clearTimeout(task.timeout);
      message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) badResponses.push(message.params.response.url);
  });
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Log.enable'), send('Network.enable')]);
}

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browserPath = process.env.CHROMIUM_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium');
  assert.ok(fs.existsSync(browserPath), 'Set CHROMIUM_PATH to a Chromium/Chrome executable');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'marta-pixel-browser-'));
  chrome = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  assert.ok(fs.existsSync(portFile), 'Chromium started');
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const tabs = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
  const firstTab = tabs.find(t => t.type === 'page');
  await connectTab(firstTab);
  await layout(1280, 900, false);
  const url = `http://127.0.0.1:${server.address().port}${prefix}`;
  await send('Page.navigate', { url: url + 'legacy-bootstrap.html' });
  await until('navigator.serviceWorker.controller?.scriptURL.includes("legacy-test-worker")');
  await send('Page.navigate', { url });
  await until('window.Game && Game.inspect().initialized');
  await until('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)', 30000);
  assert.ok(await evaluate('navigator.serviceWorker.controller.scriptURL.includes("legacy-test-worker")'), 'Remaster works while old worker remains active');
  // Close the actual old tab, including its BFCache history. Merely navigating
  // away can leave a controlled document alive and correctly delay activation.
  const fresh = await send('Target.createTarget', { url: 'about:blank' });
  const oldSocket = socket;
  const freshTabs = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
  await connectTab(freshTabs.find(tab => tab.id === fresh.targetId));
  oldSocket.close();
  await send('Target.closeTarget', { targetId: firstTab.id });
  await layout(1280, 900, false);
  await send('Page.navigate', { url });
  await until('window.Game && Game.inspect().initialized && navigator.serviceWorker.controller?.scriptURL.endsWith("/service-worker.js")');
  assert.ok(await evaluate('caches.keys().then(k=>k.includes("another-app-cache") && !k.includes("marta-alek-chaos-v1"))'), 'Only game-owned legacy cache removed');
  console.log('PASS: existing PWA migrates without mixing stale scripts');
  await until('document.querySelector("#menuCanvas").width > 0');
  await screenshot('menu-desktop');
  assert.equal(await evaluate('GameConfig.memories.length'), 18);
  assert.equal(await evaluate('document.querySelectorAll("[id]").length === new Set([...document.querySelectorAll("[id]")].map(e=>e.id)).size'), true, 'No duplicate IDs');
  await layout(390, 844);
  await screenshot('menu-mobile');
  await click('[data-mode="classic"]');
  await click('#startScreenBtn');
  await until('Game.inspect().status === "playing"');
  assert.equal(await evaluate('Game.inspect().mode'), 'classic');
  const bounds = await evaluate('(() => {const r=document.querySelector("#game").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};})()');
  assert.ok(bounds.width > 250 && bounds.height > 400 && bounds.bottom <= 844, JSON.stringify(bounds));
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No horizontal overflow');
  const before = await evaluate('Game.inspect().player.x');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await sleep(280);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  assert.ok(await evaluate('Game.inspect().player.x') > before + 30, 'Keyboard movement');
  const touch = { x: Math.round(bounds.x + bounds.width * .2), y: Math.round(bounds.y + bounds.height * .8) };
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch, id: 1, radiusX: 2, radiusY: 2 }] });
  await sleep(450);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(await evaluate('Game.inspect().player.x') < 135, 'Native touch drag');
  await click('#pauseBtn');
  const pausedAt = await evaluate('Game.inspect().clock');
  await sleep(300);
  assert.equal(await evaluate('Game.inspect().clock'), pausedAt, 'Pause freezes simulation');
  await click('#resumeBtn');
  assert.equal(await evaluate('Game.inspect().paused'), false);
  await click('#gameSettingsBtn');
  assert.equal(await evaluate('Game.inspect().paused'), true, 'Settings pauses game');
  const previousMotion = await evaluate('GameUI.isReducedMotion()');
  await click('#motionToggleBtn');
  assert.equal(await evaluate('GameUI.isReducedMotion()'), !previousMotion, 'Reduced-motion setting');
  await click('#motionToggleBtn');
  await screenshot('settings-mobile');
  await click('#closeSettingsBtn');
  assert.equal(await evaluate('Game.inspect().paused'), false, 'Settings resumes prior play state');
  await screenshot('spring-mobile');
  for (const [name, level] of [['summer', 6], ['autumn', 11], ['winter', 16], ['boss', 18]]) {
    await evaluate(`Game.startLevel(${level})`);
    await sleep(1500);
    await screenshot(name + '-mobile');
  }
  await layout(320, 568);
  assert.ok(await evaluate('document.querySelector("#rightBtn").getBoundingClientRect().bottom <= innerHeight + 1'), 'Controls fit small portrait');
  await screenshot('small-phone');
  await layout(844, 390);
  assert.ok(await evaluate('document.querySelector("#rightBtn").getBoundingClientRect().bottom <= innerHeight + 1'), 'Controls fit landscape');
  await screenshot('landscape');
  await layout(390, 844);
  await evaluate('Game.stop();GameStorage.setCurrentPlayerName("Test zapisu");GameStorage.saveProgress({playerName:"Test zapisu",unlocked:5,currentScore:123,bestScore:456,finalDone:false})');
  await reloadGame();
  assert.equal(await evaluate('GameUI.getProgress().unlocked'), 5, 'Legacy save loaded');
  assert.equal(await evaluate('GameUI.getProgress().currentScore'), 123);
  await click('#galleryBtn');
  await until('document.querySelector("#galleryOverlay").classList.contains("show")');
  await screenshot('gallery-mobile');
  assert.equal(await evaluate('document.querySelectorAll("#gallery .memory").length'), 18, 'All memory tiles');
  await click('#closeGalleryBtn');
  await click('[data-mode="party"]');
  await click('#startScreenBtn');
  assert.equal(await evaluate('Game.inspect().mode'), 'party');
  assert.equal(await evaluate('GameUI.getProgress().currentScore'), 123, 'Party does not overwrite campaign');
  await evaluate('Game.stop();GameUI.showFinal(4242,{party:true})');
  await until('document.querySelector("#finalImg").complete');
  await screenshot('party-finale');
  await click('#finalGalleryBtn');
  assert.equal(await evaluate('document.querySelectorAll("#gallery .memory:not(:disabled)").length'), 18, 'Party album opens all memories without unlocking campaign');
  await click('#gallery .memory');
  assert.equal(await evaluate('document.querySelector("#modalText").textContent'), await evaluate('GameConfig.memories[0].caption'));
  await click('#nextBtn');
  assert.equal(await evaluate('document.querySelector("#unlockOverlay").classList.contains("show")'), false, 'Photo returns to album');
  assert.ok(await evaluate('document.activeElement.classList.contains("memory")'), 'Nested photo restores tile focus');
  assert.equal(await evaluate('GameUI.getProgress().unlocked'), 5, 'Party album preserves campaign');
  await click('#closeGalleryBtn');
  await until('!!navigator.serviceWorker.controller', 30000);
  const cached = await evaluate('caches.keys().then(async keys => {const key=keys.find(k=>k.includes("pixel"));return key ? (await (await caches.open(key)).keys()).length : 0;})');
  assert.ok(cached >= 40, `Offline shell, sprites and all photos cached (${cached})`);
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await reloadGame();
  await click('#startScreenBtn');
  assert.equal(await evaluate('Game.inspect().status'), 'playing', 'Game starts offline');
  const images = await evaluate('Promise.all(GameConfig.memories.map(m => fetch(m.src).then(r=>r.ok))).then(results=>results.every(Boolean))');
  assert.equal(images, true, 'All 18 photos available offline');
  await screenshot('offline-mobile');
  assert.deepEqual(badResponses, [], 'No missing assets');
  assert.deepEqual(errors, [], 'No runtime or browser console errors');
  console.log(JSON.stringify({ result: 'PASS', checks: ['desktop/mobile/small-phone/landscape', 'keyboard/native touch', 'pause and settings/reduced motion', 'all seasons/boss render', 'legacy save and 18 memories', 'Party save isolation and finale/gallery', 'nested dialog focus', 'legacy PWA migration', 'subpath service worker and offline reload', 'no runtime errors or missing assets'], cachedAssets: cached, screenshots: artifacts }, null, 2));
})().catch(error => { console.error(error); if (errors.length || badResponses.length) console.error({ errors, badResponses }); process.exitCode = 1; }).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) {
    await Promise.race([send('Browser.close').catch(() => {}), sleep(1500)]);
    socket.close();
  }
  if (chrome && !chrome.killed) chrome.kill();
  for (const task of pending.values()) { clearTimeout(task.timeout); task.reject(new Error('Browser closed')); }
  server.closeAllConnections(); server.close();
});
