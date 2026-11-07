const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
const functions = source.slice(source.indexOf('function renderGithubSettings()'), source.indexOf('function handleMihuiUpdateHintClick()'));

function setup(responses) {
  const calls = [];
  let updateChecks = 0;
  const state = { github: { loaded: true, busy: false, data: { configured: false }, error: '' }, mihuiUpdateCheckTimer: 7 };
  const els = {
    githubToken: { value: 'github_pat_test_only_1234567890' },
    githubTokenSaveButton: {}, githubTokenCheckButton: {}, githubTokenDeleteButton: {},
    githubTokenStatus: { dataset: {} }, updateHint: { textContent: 'MihUI v0.2.173' },
  };
  const context = vm.createContext({
    state, els,
    window: { location: { protocol: 'http:' }, clearTimeout() {} },
    apiJson: async (url, options) => {
      calls.push({ url, options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return await response;
    },
    checkMihuiUpdate: async () => { updateChecks += 1; },
    setMihuiUpdateHint() {},
  });
  vm.runInContext(`${functions}\nglobalThis.app = { loadGithubSettings, updateGithubSettings };`, context);
  return { ...context.app, state, els, calls, checks: () => updateChecks };
}

test('saving a token clears the input and does not initiate a GitHub check', async () => {
  const app = setup([{ ok: true, configured: true }]);
  const token = app.els.githubToken.value;
  await app.updateGithubSettings('save');
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].url, '/api/github/token');
  assert.equal(app.calls[0].options.headers['X-Mihui-Action'], 'github-token');
  assert.equal(JSON.parse(app.calls[0].options.body).token, token);
  assert.equal(app.checks(), 0);
  assert.equal(app.els.githubToken.value, '');
  assert.equal(app.state.mihuiUpdateCheckTimer, 0);
  assert.equal(app.els.githubTokenDeleteButton.disabled, false);
  assert.doesNotMatch(JSON.stringify(app.state), /github_pat_/);
  assert.match(app.els.githubTokenStatus.textContent, /Токен сохранён/);
});

test('checking shows the quota from the response and refreshes the cached version result', async () => {
  const app = setup([{ ok: true, configured: true, lastCheckOk: true, limit: 5000, remaining: 4997, resetAt: 2000000000 }]);
  await app.updateGithubSettings('check');
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].url, '/api/github/check');
  assert.equal(app.calls[0].options.body, '{}');
  assert.equal(app.checks(), 1);
  assert.match(app.els.githubTokenStatus.textContent, /Токен работает.*4997 из 5000.*Сброс квоты/);
});

test('loading settings only reads local status and never asks for the saved secret', async () => {
  const app = setup([{ ok: true, configured: true }]);
  app.els.githubToken.value = '';
  await app.loadGithubSettings();
  assert.deepEqual(app.calls.map((call) => call.url), ['/api/github/status']);
  assert.equal(app.els.githubToken.value, '');
  assert.equal(app.checks(), 0);
});

test('deleting uses an empty token even when an unsaved replacement is in the input', async () => {
  const app = setup([{ ok: true, configured: false }]);
  await app.updateGithubSettings('delete');
  assert.equal(JSON.parse(app.calls[0].options.body).token, '');
  assert.equal(app.els.githubTokenDeleteButton.disabled, true);
  assert.equal(app.els.githubToken.value, '');
});

test('failed validation keeps the saved-token state and clears the input', async () => {
  const error = new Error('GitHub отклонил токен');
  error.data = { ok: false, configured: true, lastCheckOk: false };
  const app = setup([error]);
  await app.updateGithubSettings('check');
  assert.equal(app.els.githubToken.value, '');
  assert.equal(app.els.githubTokenDeleteButton.disabled, false);
  assert.equal(app.els.githubTokenStatus.dataset.error, 'true');
  assert.match(app.els.githubTokenStatus.textContent, /GitHub отклонил токен/);
  assert.equal(app.checks(), 0);
});

test('in-flight actions block duplicate submits', async () => {
  let finish;
  const app = setup([new Promise((resolve) => { finish = resolve; })]);
  const pending = app.updateGithubSettings('save');
  await app.updateGithubSettings('save');
  assert.equal(app.calls.length, 1);
  assert.equal(app.els.githubTokenSaveButton.disabled, true);
  finish({ ok: true, configured: true });
  await pending;
  assert.equal(app.els.githubTokenSaveButton.disabled, false);
});
