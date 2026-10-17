const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
const restartSource = source.slice(source.indexOf('async function restartMihui()'), source.indexOf('async function rollbackComponent('));

function createRestartContext(statuses, apiJson = async () => ({})) {
  const calls = { polls: 0, reloads: 0, messages: [] };
  const context = vm.createContext({
    window: {
      confirm: () => true,
      setTimeout: (callback) => callback(),
      location: { reload() { calls.reloads += 1; } },
    },
    fetch: async () => {
      const status = statuses[Math.min(calls.polls, statuses.length - 1)];
      calls.polls += 1;
      if (status instanceof Error) throw status;
      return { ok: true, json: async () => status };
    },
    apiJson,
    els: { restartMihuiButton: {}, repairMihuiButton: {} },
    closeComponentManager() {},
    showMessage(message) { calls.messages.push(message); },
  });
  vm.runInContext(restartSource, context);
  return { context, calls };
}

test('restart reloads after a new server instance is observed', async () => {
  const { context, calls } = createRestartContext([
    new Error('connection interrupted'), { instanceId: 'old' }, { instanceId: 'new' },
  ]);
  await context.waitForMihuiRestart('old');
  assert.equal(calls.polls, 3);
  assert.equal(calls.reloads, 1);
});

for (const [name, previousId, status] of [
  ['unchanged instance', 'old', { instanceId: 'old' }],
  ['legacy server', '', {}],
  ['missing instance after restart', 'old', {}],
]) {
  test(`restart does not treat HTTP 200 from ${name} as completion`, async () => {
    const { context, calls } = createRestartContext([status]);
    await assert.rejects(context.waitForMihuiRestart(previousId), /подтвердить запуск нового сервера/);
    assert.equal(calls.polls, 60);
    assert.equal(calls.reloads, 0);
  });
}
test('a legacy server can restart into a server that publishes its identity', async () => {
  const { context, calls } = createRestartContext([{}, { instanceId: 'new' }]);
  await context.waitForMihuiRestart('');
  assert.equal(calls.polls, 2);
  assert.equal(calls.reloads, 1);
});

for (const [action, endpoint] of [['restartMihui', '/api/mihui/restart'], ['repairMihui', '/api/mihui/repair']]) {
  test(`${action} captures the live instance before requesting the operation`, async () => {
    const requests = [];
    const { context, calls } = createRestartContext([{ instanceId: 'live' }, { instanceId: 'new' }], async (url, options) => {
      requests.push([url, options?.method || 'GET']);
      return { instanceId: 'live' };
    });
    await context[action]();
    assert.deepEqual(requests, [['/api/services/status', 'GET'], [endpoint, 'POST']]);
    assert.equal(calls.polls, 2);
    assert.equal(calls.reloads, 1);
  });
}
