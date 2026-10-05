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
    });
    vm.runInContext(`${polling}\nglobalThis.poll = pollComponentJob;`, context);
    await context.poll();
    assert.equal(state.components.job.running, outcome === 'running');
    assert.deepEqual(calls, outcome === 'running' ? ['poll'] : ['services', 'components', 'providers', 'nodes']);
  });
}
