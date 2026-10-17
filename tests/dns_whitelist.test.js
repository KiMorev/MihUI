const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));

function load() {
  const els = { dnsWhitelistDns: { checked: false }, dnsProxyGroup: { value: 'PROXY' },
    dnsProfileStrict: { checked: false }, dnsProfileResilient: { checked: true } };
  const state = { protectedDns: { data: {}, events: [], lanInterfaces: ['br0'], preview: null } };
  const app = vm.createContext({ els, state, renderProtectedDnsProxyGroups() {}, renderProtectedDns() {} });
  vm.runInContext([
    between('function getProtectedDnsProfile()', 'function getProtectedDnsLanSelectionState('),
    between('function getProtectedDnsPayload(', 'async function loadProtectedDns('),
    between('function handleProtectedDnsDraftChange()', 'function handleProtectedDnsLanChange('),
    between('function normalizeProtectedDnsTextList(', 'function renderProtectedDnsPlan('),
  ].join('\n'), app);
  return app;
}

test('Yandex DoT is opt-in in both preview and apply payloads', () => {
  const app = load();
  assert.equal(app.getProtectedDnsPayload().whitelistDns, false);
  app.els.dnsWhitelistDns.checked = true;
  app.state.protectedDns.data.revision = 'a'.repeat(64);
  assert.equal(app.getProtectedDnsPayload().whitelistDns, true);
  const payload = app.getProtectedDnsPayload('test');
  assert.equal(payload.whitelistDns, true);
  assert.equal(payload.action, 'test');
  assert.equal(payload.expectedRevision, 'a'.repeat(64));
  assert.deepEqual(Array.from(payload.lanInterfaces), ['br0']);
});

test('saved Yandex option reloads and legacy/system status defaults to off', () => {
  const app = load();
  app.mergeProtectedDnsResponse({ profile: 'resilient', runtime: { whitelistDns: true } }, { syncProfile: true });
  assert.equal(app.els.dnsWhitelistDns.checked, true);
  app.mergeProtectedDnsResponse({ mode: 'system' }, { syncProfile: true });
  assert.equal(app.els.dnsWhitelistDns.checked, false);
});

test('editing the option invalidates the old plan; preview/errors do not reset the checkbox', () => {
  const app = load();
  app.state.protectedDns.preview = { canActivate: true };
  app.els.dnsWhitelistDns.checked = true;
  app.handleProtectedDnsDraftChange();
  assert.equal(app.state.protectedDns.preview, null);
  app.mergeProtectedDnsResponse({ whitelistDns: false, ok: false });
  assert.equal(app.els.dnsWhitelistDns.checked, true);
});

test('plan explains scope and leaves other DNS paths visible', () => {
  const app = load();
  const lines = app.normalizeProtectedDnsTextList({ listener: ':1053', upstreamRoute: 'PROXY',
    localNames: ['+.lan'], whitelistDns: { enabled: true, count: 123 } });
  assert.ok(lines.some((line) => line.includes('123 доменов') && line.includes('TCP/853')));
  assert.ok(lines.some((line) => line.includes('127.0.0.1:41100')));
  assert.ok(lines.some((line) => line.includes('через группу PROXY')));
});
