const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const operations = source.slice(source.indexOf('async function requestProtectedDnsOperation('), source.indexOf('function downloadProtectedDnsLog('));

function load(api, abortPost = false) {
  let now = 0;
  let nextTimer = 0;
  const timers = new Set();
  const notices = [];
  const state = { routerApiAvailable: true, protectedDns: { action: '', data: {}, events: [] } };
  const app = vm.createContext({
    state, AbortController, Uint8Array,
    crypto: { getRandomValues: (bytes) => bytes.fill(1) },
    Date: { now: () => now },
    window: {
      setTimeout(callback, delay) {
        const id = ++nextTimer;
        timers.add(id);
        if (delay === 3000 || (delay === 20000 && abortPost)) {
          setImmediate(() => {
            if (timers.delete(id)) { now += delay; callback(); }
          });
        }
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
    getProtectedDnsLanSelectionState: () => ({ state: 'ready' }),
    getProtectedDnsPayload: (action) => ({ action, proxyGroup: 'PROXY', expectedRevision: 'a'.repeat(64) }),
    apiJson: api,
    renderProtectedDns() { notices.push(state.protectedDns.notice); },
    mergeProtectedDnsResponse(data) { state.protectedDns.data = data; },
    mergeProtectedDnsErrorResponse(data) { state.protectedDns.data = data; },
    getProtectedDnsErrorMessage: (error) => error?.data?.message || error.message,
    showMessage() {},
  });
  vm.runInContext(operations, app);
  return { app, state, notices };
}

test('a lost POST response recovers only the matching completed operation without repeating POST', async () => {
  const calls = [];
  let id;
  let polls = 0;
  const { app, state, notices } = load(async (url, options) => {
    calls.push(url);
    if (url === '/api/dns/action') {
      id = JSON.parse(options.body).operationId;
      throw new Error('connection lost');
    }
    polls += 1;
    return { operation: polls === 1 ? { id: 'wrong', running: false, body: { ok: true, mode: 'system' } }
      : polls === 2 ? { id, running: true } : { id, running: false, body: { ok: true, mode: 'active' } } };
  });
  await app.runProtectedDnsAction('activate');
  assert.match(id, /^[a-f0-9]{32}$/);
  assert.equal(calls.filter((url) => url === '/api/dns/action').length, 1);
  assert.equal(polls, 3);
  assert.equal(state.protectedDns.data.mode, 'active');
  assert.equal(state.protectedDns.action, '');
  assert.ok(notices.some((notice) => notice?.includes('проверяем её итог')));
});

test('a POST that never returns is aborted and its saved result is recovered', async () => {
  let id;
  const { app, state } = load(async (url, options) => {
    if (url === '/api/dns/action') {
      id = JSON.parse(options.body).operationId;
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    }
    return { operation: { id, running: false, body: { ok: true, mode: 'test' } } };
  }, true);
  await app.runProtectedDnsAction('test');
  assert.equal(state.protectedDns.data.mode, 'test');
  assert.equal(state.protectedDns.error, '');
});

test('a saved refusal is shown as a refusal rather than successful activation', async () => {
  let id;
  const { app, state } = load(async (url, options) => {
    if (url === '/api/dns/action') {
      id = JSON.parse(options.body).operationId;
      throw new Error('offline');
    }
    return { operation: { id, running: false, body: { ok: false, stage: 'conflict', message: 'Конфигурация изменилась' } } };
  });
  await app.runProtectedDnsAction('activate');
  assert.equal(state.protectedDns.error, 'Конфигурация изменилась');
  assert.equal(state.protectedDns.notice, '');
});

test('an unavailable result stays unknown and the UI does not claim DNS was not switched', async () => {
  let posts = 0;
  const { app, state } = load(async (url) => {
    if (url === '/api/dns/action') posts += 1;
    throw new Error('offline');
  });
  await app.runProtectedDnsAction('activate');
  assert.equal(posts, 1);
  assert.match(state.protectedDns.error, /Итог операции DNS неизвестен/);
  assert.doesNotMatch(state.protectedDns.error, /DNS не переключён/);
  assert.equal(state.protectedDns.action, '');
});

test('a definite HTTP refusal does not start recovery polling', async () => {
  const calls = [];
  const { app, state } = load(async (url) => {
    calls.push(url);
    const error = new Error('Нет безопасного прокси-пути');
    error.data = { ok: false, stage: 'preflight', message: error.message };
    throw error;
  });
  await app.runProtectedDnsAction('activate');
  assert.deepEqual(calls, ['/api/dns/action']);
  assert.equal(state.protectedDns.error, 'Нет безопасного прокси-пути');
});
