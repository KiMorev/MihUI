const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const functions = source.slice(source.indexOf('function renderProtectedDnsProxyGroups('), source.indexOf('function renderProtectedDnsLanSelector('));
const merge = source.slice(source.indexOf('function mergeProtectedDnsResponse('), source.indexOf('async function loadProtectedDns('));

function select(value = '') {
  return {
    value, options: [], disabled: false,
    set textContent(_) { this.options = []; this.value = ''; },
    append(option) { this.options.push(option); if (!this.value) this.value = option.value; },
  };
}

function load(api = async () => ({ ok: true, applied: true, group: 'DNS-SMART', text: 'new config', revision: 'new revision' })) {
  const calls = [];
  const messages = [];
  const state = {
    routerMode: true, routerApiAvailable: true, routerBusy: false,
    routerConfigRevision: 'editor revision', routerSavedText: 'old config', originalText: 'old config', outputText: 'old config',
    resourceMonitor: {}, whitelistMonitor: {},
    protectedDns: { action: '', loading: false, events: [], proxyGroupDraft: '',
      data: { mode: 'system', revision: 'status revision', proxyGroup: 'FASTEST', proxyGroups: ['FASTEST'],
        smartGroup: { available: true, exists: false, sources: ['FASTEST'] } } },
  };
  const els = { dnsProxyGroup: select('FASTEST'), dnsSmartGroupSource: select('FASTEST'), dnsSmartGroupCreate: {}, dnsSmartGroupStatus: {} };
  const context = vm.createContext({
    state, els, Date, document: { createElement: () => ({}) },
    hasUnsavedWorkspaceChanges: () => state.outputText !== state.routerSavedText,
    setRouterBusy: (busy) => { state.routerBusy = busy; },
    renderProtectedDns() {},
    parseAndRender: () => { state.outputText = state.originalText; },
    showMessage: (message, options) => messages.push({ message, ...options }),
    normalizeProtectedDnsLanInterfaces: (value) => value,
    loadProtectedDns: async () => {},
    apiJson: async (url, options) => { calls.push({ url, ...JSON.parse(options.body) }); return api(); },
  });
  vm.runInContext(merge + functions, context);
  return { app: context, state, els, calls, messages };
}

test('Smart creation is unavailable without confirmed Prizrak support and does not send a request', async () => {
  const { app, state, els, calls } = load();
  state.protectedDns.data.smartGroup = { available: false, sources: ['FASTEST'], message: 'Требуется Prizrak-Core' };
  app.renderProtectedDnsSmartGroup();
  assert.equal(els.dnsSmartGroupCreate.disabled, true);
  assert.match(els.dnsSmartGroupStatus.textContent, /Prizrak/);
  await app.createProtectedDnsSmartGroup();
  assert.equal(calls.length, 0);
});

test('creation requires a stable DNS mode, a clean editor and an unused group name', async () => {
  for (const reason of ['test', 'fallback', 'draft', 'exists']) {
    const { app, state, calls } = load();
    if (reason === 'test' || reason === 'fallback') state.protectedDns.data.mode = reason;
    if (reason === 'draft') state.outputText = 'unsaved config';
    if (reason === 'exists') state.protectedDns.data.smartGroup.exists = true;
    assert.equal(app.getProtectedDnsSmartGroupState().disabled, true);
    await app.createProtectedDnsSmartGroup();
    assert.equal(calls.length, 0);
  }
});

test('Smart creation during active DNS keeps the old route until explicit application', async () => {
  const { app, state, els } = load();
  state.protectedDns.data.mode = 'active';
  state.protectedDns.data.runtime = { requestedMode: 'active', proxyGroup: 'FASTEST' };
  await app.createProtectedDnsSmartGroup();
  assert.equal(state.protectedDns.data.mode, 'active');
  assert.equal(state.protectedDns.data.runtime.proxyGroup, 'FASTEST');
  assert.equal(els.dnsProxyGroup.value, 'DNS-SMART');
  assert.equal(app.getProtectedDnsGroupChangeState().disabled, false);
  assert.match(state.protectedDns.notice, /Применить смену группы/);
});

test('lost response during active Smart creation marks the protection state unknown', async () => {
  const { app, state } = load(async () => { throw new Error('offline'); });
  state.protectedDns.data.mode = 'active';
  state.protectedDns.data.runtime = { requestedMode: 'active', proxyGroup: 'FASTEST' };
  await app.createProtectedDnsSmartGroup();
  assert.equal(state.protectedDns.data.mode, 'unknown');
  assert.match(state.protectedDns.error, /состояние защиты неизвестны/);
  assert.equal(state.protectedDns.proxyGroupDraft, '');
});

test('creation uses the editor revision, adopts checked config and retains DNS selection across status refresh', async () => {
  const { app, state, els, calls } = load();
  await app.createProtectedDnsSmartGroup();
  assert.deepEqual(calls, [{ url: '/api/dns/smart-group', sourceGroup: 'FASTEST', expectedRevision: 'editor revision' }]);
  assert.equal(state.outputText, 'new config');
  assert.equal(state.routerSavedText, 'new config');
  assert.equal(state.routerConfigRevision, 'new revision');
  assert.equal(els.dnsProxyGroup.value, 'DNS-SMART');
  app.mergeProtectedDnsResponse({ proxyGroup: 'FASTEST', proxyGroups: ['FASTEST', 'DNS-SMART'] });
  assert.equal(els.dnsProxyGroup.value, 'DNS-SMART');
  app.mergeProtectedDnsResponse({ proxyGroup: 'FASTEST' }, { syncProxyGroup: true });
  assert.equal(els.dnsProxyGroup.value, 'FASTEST');
});

test('a draft edited during creation is preserved', async () => {
  let resolve;
  const { app, state } = load(() => new Promise((done) => { resolve = done; }));
  const pending = app.createProtectedDnsSmartGroup();
  state.outputText = 'new unsaved draft';
  resolve({ ok: true, applied: true, group: 'DNS-SMART', text: 'new config', revision: 'new revision' });
  await pending;
  assert.equal(state.outputText, 'new unsaved draft');
  assert.equal(state.routerSavedText, 'old config');
  assert.match(state.protectedDns.notice, /черновик сохранён/);
});

test('status refresh after group creation preserves DNS options while normal refresh restores saved options', async () => {
  const { app, els } = load();
  els.dnsWhitelistDns = { checked: true };
  els.dnsProfileStrict = { checked: true };
  els.dnsProfileResilient = { checked: false };
  app.fetch = () => {};
  app.apiJson = async () => ({ profile: 'resilient', whitelistDns: false, proxyGroups: ['FASTEST'] });
  vm.runInContext(source.slice(source.indexOf('async function loadProtectedDns('), source.indexOf('function handleProtectedDnsDraftChange()')), app);
  await app.loadProtectedDns({ silent: true, preserveDraft: true });
  assert.equal(els.dnsWhitelistDns.checked, true);
  assert.equal(els.dnsProfileStrict.checked, true);
  await app.loadProtectedDns({ silent: true });
  assert.equal(els.dnsWhitelistDns.checked, false);
  assert.equal(els.dnsProfileResilient.checked, true);
});

test('an unconfirmed apply or server refusal never reports successful creation', async () => {
  for (const response of [{ saved: true, applied: false, message: 'Применение не подтверждено' }, null]) {
    const { app, state, messages } = load(async () => {
      if (response) return response;
      const error = new Error('Конфигурация изменилась');
      error.data = { stage: 'conflict', message: error.message };
      throw error;
    });
    await app.createProtectedDnsSmartGroup();
    assert.equal(state.outputText, 'old config');
    assert.equal(state.protectedDns.proxyGroupDraft, '');
    assert.ok(state.protectedDns.error);
    assert.equal(messages.some((message) => message.severity === 'success'), false);
  }
});
