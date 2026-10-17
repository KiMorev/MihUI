const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const names = ['getProtectedDnsPayload', 'getProtectedDnsSavedUpstreams', 'getProtectedDnsUpstreamInput',
  'handleProtectedDnsUpstreamsInput', 'mergeProtectedDnsResponse', 'getProtectedDnsProviderServers',
  'getProtectedDnsServerList', 'getProtectedDnsUpstreamLabels', 'protectedDnsUpstreamsNeedTest'];

function load() {
  const state = { protectedDns: { upstreamsDraft: null, events: [], data: {
    revision: 'a'.repeat(64), upstreams: ['https://dns.example/dns-query'],
    runtime: { upstreams: ['https://dns.example/dns-query'] },
  } } };
  const els = { dnsProxyGroup: { value: 'DNS-SMART' }, dnsWhitelistDns: { checked: true },
    dnsUpstreamServers: { value: '' } };
  const context = vm.createContext({
    URL, state, els,
    getProtectedDnsProfile: () => 'resilient', getProtectedDnsConfirmations: () => ({}),
    normalizeProtectedDnsLanInterfaces: (value) => value || [], renderProtectedDnsProxyGroups() {},
    handleProtectedDnsDraftChange() { state.protectedDns.preview = null; state.protectedDns.error = ''; },
  });
  for (const name of names) {
    const match = source.match(new RegExp(`^function ${name}\\([^]*?^}`, 'm'));
    assert.ok(match, name);
    vm.runInContext(match[0], context);
  }
  return { app: context, state, els };
}

test('protected DNS payload uses edited main servers and leaves emergency return independent', () => {
  const { app, state, els } = load();
  els.dnsUpstreamServers.value = 'https://dns.example/query?key=value\ntls://dns.example:853';
  state.protectedDns.preview = { canActivate: true };
  app.handleProtectedDnsUpstreamsInput();
  assert.equal(state.protectedDns.preview, null);
  assert.equal(app.getProtectedDnsUpstreamInput().error, '');
  for (const action of ['', 'test', 'activate']) {
    const payload = app.getProtectedDnsPayload(action);
    assert.deepEqual([...payload.upstreams], ['https://dns.example/query?key=value', 'tls://dns.example:853']);
    assert.equal(payload.proxyGroup, 'DNS-SMART');
    assert.equal(payload.whitelistDns, true);
  }
  state.protectedDns.upstreamsDraft = 'invalid';
  assert.equal('upstreams' in app.getProtectedDnsPayload('system'), false);
  assert.equal('upstreams' in app.getProtectedDnsPayload('switch'), false);
});

test('protected DNS form rejects empty, duplicate, plaintext, direct and insecure addresses', () => {
  const { app, state } = load();
  for (const value of ['', 'https://dns.example\nhttps://dns.example',
    Array.from({ length: 5 }, (_, index) => `https://dns${index}.example/query`).join('\n'),
    'udp://1.1.1.1', 'http://dns.example/query', 'https://user:password@dns.example/query',
    'https://dns.example/query#DIRECT', 'https://dns.example/query#Group&skip-cert-verify=true',
    'tls://dns.example/path', 'tls://dns.example?insecure=true',
    'tls://dns.example/', 'https://dns.example/query?allow-insecure=true',
    'https://dns.example/query?dialer-proxy=DIRECT', 'https://dns.example/query?skip_cert_verify=true',
    'https://dns.example/query?proxy=DIRECT', 'https://dns.example/query?skip-cert-verify=true',
    'https://dns.example/query?interface=br0', 'https://dns.example/query?insecure=true',
    'https://dns.example/bad path']) {
    state.protectedDns.upstreamsDraft = value;
    assert.notEqual(app.getProtectedDnsUpstreamInput().error, '', value);
  }
});

test('loading DNS state preserves unsaved server text, confirmed application resets to saved list', () => {
  const { app, state } = load();
  state.protectedDns.upstreamsDraft = 'tls://edited.example';
  app.mergeProtectedDnsResponse({ upstreams: ['https://old.example/query'] }, { syncProfile: true });
  assert.equal(state.protectedDns.upstreamsDraft, 'tls://edited.example');
  assert.equal(app.protectedDnsUpstreamsNeedTest(), true);
  app.mergeProtectedDnsResponse({ upstreams: ['tls://edited.example'], runtime: { upstreams: ['tls://edited.example'] } }, { syncUpstreams: true });
  assert.equal(state.protectedDns.upstreamsDraft, null);
  assert.deepEqual([...app.getProtectedDnsUpstreamInput().servers], ['tls://edited.example']);
  assert.equal(app.protectedDnsUpstreamsNeedTest(), false);
});

test('provider DNS display distinguishes discovery, known empty and unavailable records', () => {
  const { app } = load();
  assert.equal(app.getProtectedDnsProviderServers({ serversState: 'detected', details: [
    { address: '192.0.2.53', interface: 'GigabitEthernet1', service: 'Dhcp::Client' },
    { address: '2001:db8::53', interface: 'PPPoE0', service: 'Dhcp6::Client' },
  ] }), '192.0.2.53 (GigabitEthernet1), 2001:db8::53 (PPPoE0)');
  assert.equal(app.getProtectedDnsProviderServers({ serversState: 'empty' }), 'Через DHCP не обнаружены');
  assert.equal(app.getProtectedDnsProviderServers({ serversState: 'unknown' }), 'Неизвестно · сведения DHCP недоступны');
  assert.equal(app.getProtectedDnsProviderServers({}), 'Не определены');
});

test('returning to system DNS adopts the confirmed runtime and preserves saved servers', () => {
  const { app, state } = load();
  state.protectedDns.data.runtime.requestedMode = 'active';
  app.mergeProtectedDnsResponse({ mode: 'system', runtime: {
    requestedMode: 'system', upstreams: ['tls://saved.example'],
  } }, { syncProfile: true });
  assert.equal(state.protectedDns.data.runtime.requestedMode, 'system');
  assert.deepEqual([...app.getProtectedDnsSavedUpstreams()], ['tls://saved.example']);
});

test('custom DNS hostnames are shown without guessing a provider from a substring', () => {
  const { app } = load();
  assert.deepEqual([...app.getProtectedDnsUpstreamLabels([
    'https://1.1.1.1/dns-query', 'https://8.8.8.8/dns-query', 'tls://my-google.example',
  ])], ['Cloudflare', 'Google', 'my-google.example']);
});
