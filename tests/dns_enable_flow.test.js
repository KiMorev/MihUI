const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');

function functions(context, names) {
  const app = vm.createContext(context);
  for (const name of names) {
    const match = source.match(new RegExp(`^(?:async )?function ${name}\\([^]*?^}`, 'm'));
    assert.ok(match, name);
    vm.runInContext(match[0], app);
  }
  return app;
}

for (const failure of ['', 'preflight', 'test', 'activate']) {
  test(`one-click DNS enable respects each stage: ${failure || 'success'}`, async () => {
    const calls = [];
    const state = { routerApiAvailable: true, protectedDns: { action: '', data: {} } };
    const app = functions({ state, renderProtectedDns() {},
      async previewProtectedDns() {
        calls.push('preview');
        state.protectedDns.preview = { canTest: true, capabilities: { activationReady: failure !== 'preflight' } };
      },
      async runProtectedDnsAction(action) {
        calls.push(action);
        if (failure === action) state.protectedDns.error = 'failed';
        else state.protectedDns.data.mode = action === 'test' ? 'test' : 'active';
      },
    }, ['enableProtectedDns']);
    await app.enableProtectedDns();
    assert.deepEqual(calls, failure === 'preflight' ? ['preview'] : failure === 'test' ? ['preview', 'test'] : ['preview', 'test', 'activate']);
    assert.equal(state.protectedDns.enabling, false);
    assert.equal(state.protectedDns.data.mode === 'active', failure === '');
  });
}

test('the block summary identifies the failed address and never treats a pending upstream test as a failure', () => {
  const app = functions({ getProtectedDnsCapabilityLabel: (id) => id }, ['getProtectedDnsBlockers']);
  const blockers = app.getProtectedDnsBlockers({ configCheck: { ok: true },
    warnings: [{ code: 'upstreams-test-required' }], capabilities: {
      checks: [{ id: 'proxy-route', ok: true, required: true },
        { id: 'system-fallback', ok: false, required: true, message: 'DNS failed' }],
      systemFallback: { probes: [{ address: '192.168.1.1', port: 53, transport: 'udp', ok: false, error: { category: 'timeout' } }] },
    } });
  assert.equal(blockers.length, 1);
  assert.match(blockers[0].message, /192\.168\.1\.1:53.*тайм-аут/);
});

test('a second click cannot run a parallel DNS enable operation', async () => {
  let release;
  let previews = 0;
  const state = { routerApiAvailable: true, protectedDns: { action: '' } };
  const app = functions({ state, renderProtectedDns() {},
    previewProtectedDns: async () => { previews++; await new Promise((resolve) => { release = resolve; }); },
  }, ['enableProtectedDns']);
  const pending = app.enableProtectedDns();
  await app.enableProtectedDns();
  assert.equal(previews, 1);
  release();
  await pending;
  assert.equal(state.protectedDns.enabling, false);
});

test('first setup chooses a compatible group while a configured preference is preserved', () => {
  for (const configured of [false, true]) {
    const options = [];
    const select = { value: 'PROXY', set textContent(_) { this.value = ''; }, append(option) { options.push(option); } };
    const state = { protectedDns: {} };
    const app = functions({ state, els: { dnsProxyGroup: select }, document: { createElement: () => ({}) } }, ['renderProtectedDnsProxyGroups']);
    app.renderProtectedDnsProxyGroups({ proxyGroup: 'PROXY', proxyGroups: ['PROXY', 'FASTEST'],
      runtime: { managedBlockRevision: configured ? 'owned' : '' }, capabilities: { proxyGroupOptions: [
        { name: 'PROXY', ok: false, message: 'PROXY → DIRECT' }, { name: 'FASTEST', ok: true }] } });
    assert.equal(select.value, configured ? 'PROXY' : 'FASTEST');
    assert.equal(options.find((item) => item.value === 'PROXY').disabled, true);
  }
});
