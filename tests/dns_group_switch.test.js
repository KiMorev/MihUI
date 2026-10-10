const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));

function load(api) {
  let now = 0;
  const timers = new Set();
  const state = {
    routerMode: true, routerApiAvailable: true, routerBusy: false, routerConfigRevision: 'old revision',
    originalText: 'old config', routerSavedText: 'old config', outputText: 'old config',
    resourceMonitor: {}, whitelistMonitor: {},
    protectedDns: { action: '', loading: false, events: [], proxyGroupDraft: 'DNS-SMART',
      data: { mode: 'active', profile: 'resilient', whitelistDns: true, revision: 'a'.repeat(64), proxyGroup: 'FASTEST',
        proxyGroups: ['FASTEST', 'DNS-SMART'], runtime: { requestedMode: 'active', proxyGroup: 'FASTEST', profile: 'resilient', whitelistDns: true, lanInterfaces: ['br0'] } } },
  };
  const select = { value: 'DNS-SMART', set textContent(_) { this.value = ''; }, append(option) { if (!this.value) this.value = option.value; } };
  const els = { dnsProxyGroup: select, dnsWhitelistDns: { checked: false }, dnsProfileStrict: { checked: true }, dnsProfileResilient: { checked: false } };
  const messages = [];
  const app = vm.createContext({
    state, els, document: { createElement: () => ({}) }, apiJson: api,
    Uint8Array, AbortController, crypto: { getRandomValues: (bytes) => bytes.fill(1) }, Date: { now: () => now },
    window: {
      setTimeout(callback, delay) { const timer = {}; timers.add(timer); if (delay === 3000) setImmediate(() => { if (timers.delete(timer)) { now += delay; callback(); } }); return timer; },
      clearTimeout: (timer) => timers.delete(timer),
    },
    hasUnsavedWorkspaceChanges: () => state.outputText !== state.routerSavedText,
    getProtectedDnsLanSelectionState: () => ({ state: 'required' }),
    normalizeProtectedDnsLanInterfaces: (value) => value,
    renderProtectedDns() {}, setRouterBusy: (busy) => { state.routerBusy = busy; },
    parseAndRender: () => { state.outputText = state.originalText; },
    getProtectedDnsErrorMessage: (error) => error.data?.message || error.message,
    showMessage: (message, options) => messages.push({ message, ...options }),
  });
  vm.runInContext([
    between('function getProtectedDnsPayload(', 'async function loadProtectedDns('),
    between('function renderProtectedDnsProxyGroups(', 'function renderProtectedDnsLanSelector('),
    between('async function requestProtectedDnsOperation(', 'function downloadProtectedDnsLog('),
  ].join('\n'), app);
  return { app, state, els, messages };
}

test('active group switch sends only the selected route and synchronizes confirmed config', async () => {
  let request;
  const { app, state, els } = load(async (_, options) => {
    request = JSON.parse(options.body);
    return { ok: true, mode: 'active', proxyGroup: 'DNS-SMART', text: 'new config', revision: 'new revision',
      runtime: { requestedMode: 'active', proxyGroup: 'DNS-SMART' } };
  });
  await app.runProtectedDnsAction('switch');
  assert.deepEqual(Object.keys(request).sort(), ['action', 'expectedRevision', 'operationId', 'proxyGroup']);
  assert.equal(request.action, 'switch');
  assert.equal(request.proxyGroup, 'DNS-SMART');
  assert.equal(state.protectedDns.data.runtime.proxyGroup, 'DNS-SMART');
  assert.equal(els.dnsProxyGroup.value, 'DNS-SMART');
  assert.equal(state.routerSavedText, 'new config');
  assert.equal(state.routerConfigRevision, 'new revision');
});

test('a switch is blocked without a changed group, with editor drafts or without active protection', async () => {
  for (const condition of ['unchanged', 'draft', 'system', 'local-file']) {
    let calls = 0;
    const { app, state, els } = load(async () => { calls++; });
    if (condition === 'unchanged') els.dnsProxyGroup.value = 'FASTEST';
    if (condition === 'draft') state.outputText = 'unsaved config';
    if (condition === 'system') state.protectedDns.data.mode = 'system';
    if (condition === 'local-file') state.routerMode = false;
    await app.runProtectedDnsAction('switch');
    assert.equal(calls, 0);
  }
});

test('editing the config during a switch preserves the draft and reports the confirmed route', async () => {
  let resolve;
  const { app, state } = load(async () => new Promise((done) => { resolve = done; }));
  const pending = app.runProtectedDnsAction('switch');
  state.outputText = 'unsaved draft';
  resolve({ ok: true, mode: 'active', proxyGroup: 'DNS-SMART', text: 'new config', revision: 'new revision', runtime: { requestedMode: 'active', proxyGroup: 'DNS-SMART' } });
  await pending;
  assert.equal(state.outputText, 'unsaved draft');
  assert.equal(state.routerSavedText, 'old config');
  assert.equal(state.protectedDns.data.runtime.proxyGroup, 'DNS-SMART');
  assert.match(state.protectedDns.notice, /черновик сохранён/);
});

test('importing a clean local file during a switch cannot replace it with the router config', async () => {
  let resolve;
  const { app, state } = load(async () => new Promise((done) => { resolve = done; }));
  const pending = app.runProtectedDnsAction('switch');
  state.routerMode = false;
  state.outputText = state.originalText = state.routerSavedText = 'local file';
  resolve({ ok: true, mode: 'active', proxyGroup: 'DNS-SMART', text: 'router config', revision: 'new revision', runtime: { requestedMode: 'active', proxyGroup: 'DNS-SMART' } });
  await pending;
  assert.equal(state.outputText, 'local file');
  assert.equal(state.originalText, 'local file');
  assert.equal(app.getProtectedDnsGroupChangeState().active, false);
});

test('restored state takes priority over the failed target preview', async () => {
  const { app, state, els, messages } = load(async () => {
    const error = new Error('Новая группа не отвечает; прежняя защита восстановлена');
    error.data = { message: error.message, preview: { mode: 'system', proxyGroup: 'DNS-SMART', canActivate: true },
      restoration: { ok: true, mode: 'active', proxyGroup: 'FASTEST', text: 'old config', revision: 'restored revision',
        runtime: { requestedMode: 'active', proxyGroup: 'FASTEST' } } };
    throw error;
  });
  await app.runProtectedDnsAction('switch');
  assert.equal(state.protectedDns.data.mode, 'active');
  assert.equal(state.protectedDns.data.runtime.proxyGroup, 'FASTEST');
  assert.equal(els.dnsProxyGroup.value, 'FASTEST');
  assert.equal(state.protectedDns.preview, null);
  assert.equal(state.routerConfigRevision, 'restored revision');
  assert.equal(messages.some((message) => message.severity === 'success'), false);
});

test('failed restoration leaves the UI in the reported system reserve', async () => {
  const { app, state } = load(async () => {
    const error = new Error('Прежний DNS тоже недоступен');
    error.data = { message: error.message, restoration: { ok: false, mode: 'system', proxyGroup: 'FASTEST', runtime: { requestedMode: 'system' } } };
    throw error;
  });
  await app.runProtectedDnsAction('switch');
  assert.equal(state.protectedDns.data.mode, 'system');
  assert.equal(app.getProtectedDnsGroupChangeState().active, false);
});

test('unconfirmed removal of capture remains visible as pending fallback', async () => {
  const { app, state } = load(async () => {
    const error = new Error('Отключение перехвата не подтверждено');
    error.data = { message: error.message, restoration: { ok: false, mode: 'fallback', runtime: { requestedMode: 'system', fallbackPending: true } } };
    throw error;
  });
  await app.runProtectedDnsAction('switch');
  assert.equal(state.protectedDns.data.mode, 'fallback');
  assert.equal(state.protectedDns.data.fallback.pending, true);
  assert.equal(app.getProtectedDnsGroupChangeState().active, false);
});

test('lost switch response recovers one operation without a duplicate POST', async () => {
  let operationId;
  let posts = 0;
  const { app, state } = load(async (url, options) => {
    if (url === '/api/dns/action') {
      posts++;
      operationId = JSON.parse(options.body).operationId;
      throw new Error('connection lost');
    }
    return { operation: { id: operationId, running: false, body: { ok: true, mode: 'active', proxyGroup: 'DNS-SMART', text: 'new config', revision: 'new revision', runtime: { requestedMode: 'active', proxyGroup: 'DNS-SMART' } } } };
  });
  await app.runProtectedDnsAction('switch');
  assert.equal(posts, 1);
  assert.equal(state.protectedDns.data.proxyGroup, 'DNS-SMART');
});

test('unrecoverable switch result marks protection unknown instead of claiming the old active state', async () => {
  const { app, state } = load(async () => { throw new Error('offline'); });
  await app.runProtectedDnsAction('switch');
  assert.equal(state.protectedDns.data.mode, 'unknown');
  assert.match(state.protectedDns.error, /Итог операции DNS неизвестен/);
});
