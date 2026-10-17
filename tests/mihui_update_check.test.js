const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
const updateCheckFunctions = source.slice(
  source.indexOf('function handleMihuiUpdateHintClick()'),
  source.indexOf('function renderRouterControls()'),
);

function loadUpdateCheck(responses) {
  const hint = { disabled: true, textContent: 'MihUI', title: '' };
  const timers = [];
  let nextTimerId = 1;
  let updateCalls = 0;
  const state = {
    mihuiUpdateCheckTimer: 0,
    mihuiUpdateCheckFailed: false,
    routerApiAvailable: false,
  };
  const context = vm.createContext({
    MIHUI_UPDATE_CHECK_RETRY_DELAYS_MS: [3000, 10000, 30000],
    state,
    els: { updateHint: hint },
    fetch: async () => {
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return {
        ok: response.httpOk ?? true,
        status: response.status ?? 200,
        text: async () => JSON.stringify(response.body),
      };
    },
    window: {
      clearTimeout() {},
      setTimeout(callback, delay) {
        const id = nextTimerId;
        nextTimerId += 1;
        timers.push({ callback, delay, id });
        return id;
      },
    },
    setMihuiUpdateHint(disabled, text) {
      hint.disabled = disabled;
      if (text !== undefined) hint.textContent = text;
      hint.title = disabled || !hint.textContent ? '' : 'Обновить MihUI через локальный сервис';
    },
    updateMihui() {
      updateCalls += 1;
    },
    apiJson: async () => ({}),
    showMihuiUpdateProgress() {},
    pollMihuiUpdateStatus() {},
  });

  vm.runInContext(
    `${updateCheckFunctions}\nglobalThis.__app = { checkMihuiUpdate, fetchMihuiUpdateCheck, handleMihuiUpdateHintClick };`,
    context,
  );
  return { app: context.__app, hint, state, timers, getUpdateCalls: () => updateCalls };
}

function flushAsyncWork() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('MiHUI update check retries an API-level failure and enables the discovered update', async () => {
  const runtime = loadUpdateCheck([
    {
      body: {
        ok: false,
        version: 'v0.2.139',
        latest: '',
        updateAvailable: false,
        message: 'Temporary failure in name resolution',
      },
    },
    {
      body: {
        ok: true,
        version: 'v0.2.139',
        latest: 'v0.2.143',
        updateAvailable: true,
        message: '',
      },
    },
  ]);

  await runtime.app.checkMihuiUpdate();

  assert.equal(runtime.hint.disabled, true);
  assert.equal(runtime.hint.textContent, 'MihUI v0.2.139 · ошибка проверки, повтор через 3 с');
  assert.equal(runtime.hint.title, 'Temporary failure in name resolution');
  assert.equal(runtime.timers.length, 1);
  assert.equal(runtime.timers[0].delay, 3000);

  runtime.timers.shift().callback();
  await flushAsyncWork();

  assert.equal(runtime.hint.disabled, false);
  assert.equal(runtime.hint.textContent, 'MihUI v0.2.139 -> v0.2.143');
  assert.equal(runtime.state.mihuiUpdateCheckTimer, 0);
  assert.equal(runtime.state.mihuiUpdateCheckFailed, false);
});

test('MiHUI update check offers a manual retry after automatic retries are exhausted', async () => {
  const failure = {
    body: {
      ok: false,
      version: 'v0.2.139',
      latest: '',
      updateAvailable: false,
      message: 'Temporary failure in name resolution',
    },
  };
  const runtime = loadUpdateCheck([
    failure,
    failure,
    failure,
    failure,
    {
      body: {
        ok: true,
        version: 'v0.2.139',
        latest: 'v0.2.143',
        updateAvailable: true,
        message: '',
      },
    },
  ]);

  await runtime.app.checkMihuiUpdate();
  for (const expectedDelay of [3000, 10000, 30000]) {
    const timer = runtime.timers.shift();
    assert.equal(timer.delay, expectedDelay);
    timer.callback();
    await flushAsyncWork();
  }

  assert.equal(runtime.state.mihuiUpdateCheckFailed, true);
  assert.equal(runtime.hint.disabled, false);
  assert.equal(runtime.hint.textContent, 'MihUI v0.2.139 · проверить снова');
  assert.match(runtime.hint.title, /Temporary failure in name resolution/);

  runtime.app.handleMihuiUpdateHintClick();
  assert.equal(runtime.getUpdateCalls(), 0);
  assert.equal(runtime.hint.textContent, 'Проверка обновления...');
  await flushAsyncWork();

  assert.equal(runtime.hint.disabled, false);
  assert.equal(runtime.hint.textContent, 'MihUI v0.2.139 -> v0.2.143');
  runtime.app.handleMihuiUpdateHintClick();
  assert.equal(runtime.getUpdateCalls(), 1);
});

test('MiHUI update check rejects an HTTP 200 response with ok false', async () => {
  const runtime = loadUpdateCheck([
    {
      body: {
        ok: false,
        version: 'v0.2.139',
        message: 'Temporary failure in name resolution',
      },
    },
  ]);

  await assert.rejects(runtime.app.fetchMihuiUpdateCheck(), (error) => {
    assert.equal(error.message, 'Temporary failure in name resolution');
    assert.equal(error.status, 200);
    assert.equal(error.data.version, 'v0.2.139');
    return true;
  });
});
