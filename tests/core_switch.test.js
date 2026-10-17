const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
const polling = source.slice(source.indexOf('async function pollComponentJob()'), source.indexOf('async function checkRouterConfig('));

for (const outcome of ['running', 'success', 'rollback']) {
  test(`core switch ${outcome} refreshes runtime data only after completion`, async () => {
    const job = { component: 'mihomo', action: 'core', running: outcome === 'running', ok: outcome === 'success' };
    const calls = [];
    const state = { components: { pollTimer: 0, job: {} }, xkeenFiles: { restartRequested: false } };
    const context = vm.createContext({
      state,
      window: { clearTimeout() {}, setTimeout() { calls.push('poll'); return 1; } },
      apiJson: async () => ({ job }),
      normalizeComponentJob: (value) => value,
      renderComponentManager() {},
      renderXkeenNetworkFiles() {},
      loadServiceHealth: async () => { calls.push('services'); },
      loadComponents: async () => { calls.push('components'); },
      loadProviderStatuses: async () => { calls.push('providers'); },
      loadNodeInventory: async () => { calls.push('nodes'); },
      loadResourceMonitor: async () => { calls.push('resources'); },
    });
    vm.runInContext(`${polling}\nglobalThis.poll = pollComponentJob;`, context);
    await context.poll();
    assert.equal(state.components.job.running, outcome === 'running');
    assert.deepEqual(calls, outcome === 'running' ? ['poll'] : ['services', 'components', 'providers', 'nodes', 'resources']);
  });
}

for (const capability of [undefined, false, true]) {
  test(`core switch requires server capability (${capability})`, async () => {
    const calls = [];
    const state = { components: { mihomoCoreSwitchAvailable: capability, mihomoCoreSelection: 'prizrak', items: { mihomo: { core: 'mihomo' } } } };
    const context = vm.createContext({
      state,
      window: { confirm() { calls.push('confirm'); return true; } },
      getMihomoCoreLabel: (core) => core,
      startComponentAction: async (payload) => { calls.push(payload.action); },
    });
    const handler = source.slice(source.indexOf('async function switchMihomoCore()'), source.indexOf('function prepareSmartCoreReturn('));
    vm.runInContext(handler, context);
    await context.switchMihomoCore();
    assert.deepEqual(calls, capability === true ? ['confirm', 'core'] : []);
  });
}

test('legacy managed server offers service repair after the new UI is installed', async () => {
  const state = { components: { job: {}, items: {} } };
  const responses = [
    { mihuiService: { managed: true, repairRequired: false } },
    { mihuiService: { managed: true, repairRequired: false }, capabilities: { mihomoCoreSwitch: true } },
    { mihuiService: { managed: false, repairRequired: false } },
  ].map((status) => ({ ...status, components: { xkeen: {}, mihomo: { core: 'mihomo' } }, job: {} }));
  const context = vm.createContext({
    state,
    fetch() {},
    window: { location: { protocol: 'https:' } },
    apiJson: async () => responses.shift(),
    normalizeComponentItem: (item) => item,
    normalizeComponentJob: (job) => job,
    normalizeXkeenChannel: () => 'stable',
    renderComponentManager() {}, renderServiceHealth() {}, render() {},
  });
  const load = source.slice(source.indexOf('async function loadComponents('), source.indexOf('function openComponentManager()'));
  vm.runInContext(load, context);
  await context.loadComponents();
  assert.equal(state.components.mihomoCoreSwitchAvailable, false);
  assert.equal(state.components.mihuiServiceRepairRequired, true);
  await context.loadComponents();
  assert.equal(state.components.mihomoCoreSwitchAvailable, true);
  assert.equal(state.components.mihuiServiceRepairRequired, false);
  await context.loadComponents();
  assert.equal(state.components.mihuiServiceRepairRequired, false);
});

function loadComponentAction(apiJson, pollComponentJob = async () => {}) {
  const state = { components: { job: { running: false, ok: null }, jobVisible: false, pendingAction: null, actionError: '' } };
  const errors = [];
  const classes = new Set();
  const els = {
    componentJobPanel: { hidden: true, classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } } },
    componentJobDetails: { open: true, hidden: true },
    dismissComponentJobButton: {},
    componentJobTitle: {},
    componentJobMessage: {},
    componentJobOutput: {},
  };
  const context = vm.createContext({
    state, els, apiJson,
    normalizeComponentJob: (job) => job,
    renderComponentManager() { context.renderComponentJob(); },
    renderXkeenNetworkFiles() {},
    pollComponentJob: () => pollComponentJob(state),
    showMessage: (message) => errors.push(message),
    getComponentActionLabel: () => 'Переключение ядра',
    getComponentActionSuccessLabel: () => 'Ядро переключено',
  });
  const action = source.slice(source.indexOf('async function startComponentAction('), source.indexOf('async function pollComponentJob()'));
  const renderJob = source.slice(source.indexOf('function renderComponentJob()'), source.indexOf('function getComponentActionLabel('));
  vm.runInContext(`${action}\n${renderJob}`, context);
  return { context, state, els, classes, errors };
}

test('pending request is visible, blocks duplicate clicks, and displays rejection in the modal', async () => {
  let rejectRequest;
  let requests = 0;
  const runtime = loadComponentAction(() => {
    requests += 1;
    return new Promise((resolve, reject) => { rejectRequest = reject; });
  });
  const payload = { component: 'mihomo', action: 'core', target: 'prizrak' };
  const first = runtime.context.startComponentAction(payload);
  assert.equal(runtime.els.componentJobPanel.hidden, false);
  assert.equal(runtime.els.componentJobMessage.textContent, 'Подготовка операции');
  assert.equal(await runtime.context.startComponentAction(payload), false);
  assert.equal(requests, 1);
  rejectRequest(new Error('Неподдерживаемая операция Mihomo'));
  assert.equal(await first, false);
  assert.equal(runtime.state.components.pendingAction, null);
  assert.equal(runtime.els.componentJobPanel.hidden, false);
  assert.equal(runtime.classes.has('is-error'), true);
  assert.match(runtime.els.componentJobMessage.textContent, /Неподдерживаемая операция Mihomo/);
  assert.equal(runtime.els.dismissComponentJobButton.hidden, false);
});

test('conflict resumes the real running job instead of replacing it with an error', async () => {
  const job = { running: true, ok: null, component: 'mihomo', action: 'core', message: 'Скачиваем Prizrak-Core' };
  const runtime = loadComponentAction(async () => {
    const error = new Error('Операция с компонентом уже выполняется');
    error.status = 409;
    throw error;
  }, async (state) => { state.components.job = job; });
  assert.equal(await runtime.context.startComponentAction({ component: 'mihomo', action: 'core' }), false);
  assert.equal(runtime.state.components.job, job);
  assert.equal(runtime.els.componentJobMessage.textContent, job.message);
  assert.equal(runtime.classes.has('is-error'), false);
  assert.deepEqual(runtime.errors, []);
});
