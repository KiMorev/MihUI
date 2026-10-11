const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
const maintenanceSource = source.slice(source.indexOf('async function startMaintenanceAction('), source.indexOf('async function restartMihui('));
const labelsSource = source.slice(source.indexOf('function getComponentActionLabel('), source.indexOf('function getComponentUpdateSummary('));

function createContext(item = { installed: true }, confirmed = true) {
  const calls = { confirmations: [], actions: [] };
  const context = vm.createContext({
    state: { components: { items: { 'xkeen-ui': item } } },
    window: { confirm(message) { calls.confirmations.push(message); return confirmed; } },
    async startComponentAction(payload) { calls.actions.push(JSON.parse(JSON.stringify(payload))); },
  });
  vm.runInContext(maintenanceSource + labelsSource, context);
  return { context, calls };
}

test('installed Xkeen-UI restart confirms the panel interruption and requests its component action', async () => {
  const { context, calls } = createContext();
  await context.startMaintenanceAction('xkeen-ui', 'restart');
  assert.deepEqual(calls.actions, [{ component: 'xkeen-ui', action: 'restart' }]);
  assert.equal(calls.confirmations.length, 1);
  assert.match(calls.confirmations[0], /Перезапустить Xkeen-UI/);
  assert.match(calls.confirmations[0], /веб-интерфейс будет недоступен/);
});

for (const item of [{ installed: false }, null]) {
  test(`Xkeen-UI restart is unavailable when the component is ${item ? 'not installed' : 'missing'}`, async () => {
    const { context, calls } = createContext(item);
    await context.startMaintenanceAction('xkeen-ui', 'restart');
    assert.deepEqual(calls, { confirmations: [], actions: [] });
  });
}

for (const action of ['geo-update', 'update']) {
  test(`Xkeen-UI does not offer ${action} through maintenance`, async () => {
    const { context, calls } = createContext();
    await context.startMaintenanceAction('xkeen-ui', action);
    assert.deepEqual(calls, { confirmations: [], actions: [] });
  });
}

test('cancelled Xkeen-UI restart does not request a component action', async () => {
  const { context, calls } = createContext({ installed: true }, false);
  await context.startMaintenanceAction('xkeen-ui', 'restart');
  assert.equal(calls.confirmations.length, 1);
  assert.deepEqual(calls.actions, []);
});

test('Xkeen-UI restart job labels name the panel without requiring Mihomo metadata', () => {
  const { context } = createContext();
  const job = { component: 'xkeen-ui', action: 'restart' };
  assert.equal(context.getComponentActionLabel(job), 'Перезапуск Xkeen-UI');
  assert.equal(context.getComponentActionSuccessLabel(job), 'Xkeen-UI перезапущен');
});
