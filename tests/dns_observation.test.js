const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const functions = source.slice(source.indexOf('function dnsObservationSettings()'), source.indexOf('function getWhitelistMonitorStatePresentation('));
function load() {
  const element = () => ({ value: '', checked: false, children: [], append(child) { this.children.push(child); }, replaceChildren() { this.children = []; } });
  const els = Object.fromEntries(['Enabled', 'Interval', 'Timeout', 'Names', 'Notice', 'Summary', 'Results', 'Events', 'Save', 'Check', 'Refresh', 'Download']
    .map((name) => [`dnsObservation${name}`, element()]));
  const state = { routerApiAvailable: true, dnsObservation: { data: null, dirty: false, busy: false, loading: false, error: '' } };
  const app = vm.createContext({ els, state, document: { createElement: element }, apiJson: async () => ({}), Blob, URL });
  vm.runInContext(functions, app);
  return app;
}
const settings = { enabled: true, localObservation: true, intervalSeconds: 300, timeoutMs: 4000,
  localNames: [{ name: 'nas.lan', expectedAddresses: ['192.168.1.10', 'fd00::10'] }] };

test('observation form round-trips names and IPv6 without changing DNS settings', () => {
  const app = load();
  app.mergeDnsObservation({ config: settings });
  assert.deepEqual(JSON.parse(JSON.stringify(app.dnsObservationSettings())), settings);
  assert.doesNotMatch(functions, /\/dns\/action|\/dns\/preview|saveConfig|runProtectedDnsAction/);
});

test('refresh preserves a dirty draft but reflects remote settings otherwise', () => {
  const app = load();
  app.mergeDnsObservation({ config: settings });
  app.state.dnsObservation.dirty = true;
  app.els.dnsObservationNames.value = 'mine.lan';
  app.mergeDnsObservation({ config: { ...settings, enabled: false, localNames: [] } });
  assert.equal(app.els.dnsObservationNames.value, 'mine.lan');
  assert.equal(app.els.dnsObservationEnabled.checked, true);
  app.state.dnsObservation.dirty = false;
  app.mergeDnsObservation({ config: { ...settings, enabled: false, localNames: [] } });
  assert.equal(app.els.dnsObservationNames.value, '');
  assert.equal(app.els.dnsObservationEnabled.checked, false);
});

test('legacy enabled flag does not look like new monitoring is enabled', () => {
  const app = load();
  app.mergeDnsObservation({ config: { enabled: true, intervalSeconds: 120, timeoutMs: 5000 } });
  app.renderDnsObservation();
  assert.equal(app.els.dnsObservationEnabled.checked, false);
  assert.equal(app.els.dnsObservationInterval.value, '300');
  assert.equal(app.els.dnsObservationCheck.disabled, true);
  assert.match(app.els.dnsObservationNotice.textContent, /выключено/);
});

test('one-off check posts only to observation and keeps periodic mode unchanged', async () => {
  const app = load();
  app.mergeDnsObservation({ config: { ...settings, enabled: false } });
  const calls = [];
  app.apiJson = async (url, options) => { calls.push([url, options]); return { job: { running: true } }; };
  await app.runDnsObservationAction('check');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/dns/observation/check');
  assert.equal(calls[0][1].headers['X-Mihui-Action'], 'dns-observation');
  assert.equal(app.state.dnsObservation.data.config.enabled, false);
  assert.equal(app.els.dnsObservationCheck.disabled, true);
});

test('saving fails without losing draft and no test starts automatically', async () => {
  const app = load();
  app.mergeDnsObservation({ config: settings });
  app.state.dnsObservation.dirty = true;
  const calls = [];
  app.apiJson = async (url) => { calls.push(url); throw new Error('Ошибка сохранения'); };
  await app.runDnsObservationAction('settings');
  assert.equal(app.state.dnsObservation.dirty, true);
  assert.deepEqual(calls, ['/api/dns/observation/settings']);
  assert.match(app.els.dnsObservationNotice.textContent, /Ошибка сохранения/);
});

test('missing local names and failed DNS answers are not presented as success', () => {
  const app = load();
  app.mergeDnsObservation({ config: settings, latest: { timestamp: 100, observation: {
    names: [], probes: [], candidatePorts: [], mihomoConfigured: false,
  } } });
  app.renderDnsObservation();
  assert.match(app.els.dnsObservationSummary.textContent, /имена не заданы/);
  assert.match(app.els.dnsObservationSummary.textContent, /Путь LAN-клиента не проверен/);
  const text = app.observationProbeText({ name: 'nas.lan', type: 'A', transport: 'udp', resolver: 'system', port: 53,
    addresses: [], rcode: 3, comparison: 'no_baseline', latencyMs: 5 });
  assert.match(text, /Имя не найдено/);
  assert.match(text, /Нет подтверждённого эталона/);
});

test('observation DOM uses literal text for untrusted names', () => {
  const app = load();
  app.mergeDnsObservation({ config: settings, latest: { timestamp: 100, observation: {
    names: [{ name: '<img src=x>' }], candidatePorts: [], mihomoConfigured: true,
    probes: [{ name: '<img src=x>', addresses: [], comparison: 'incomplete', type: 'A', transport: 'udp', error: { category: 'timeout' } }],
  } } });
  app.renderDnsObservation();
  assert.match(app.els.dnsObservationResults.children[0].textContent, /<img src=x>/);
  assert.doesNotMatch(functions, /innerHTML/);
});
