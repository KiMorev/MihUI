const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
function load(apiJson) {
  const context = vm.createContext({
    apiJson, fetch() {}, window: { location: { protocol: 'http:' } },
    state: { xkeenCommands: { available: true } },
    els: { xkeenCommandConsole: { scrollIntoView() {} } },
    renderXkeenCommands() {}, showMessage() {}, isXkeenCommandActive: () => false,
    polls: 0, startXkeenCommandPolling() { context.polls++; },
  });
  vm.runInContext(source.slice(source.indexOf('async function loadXkeenCommands('),
    source.indexOf('function startXkeenCommandPolling(')), context);
  return context;
}

test('reload recovers active command and resumes polling for input/stop', async () => {
  const job = { id: 'existing', flag: '-pr', status: 'running' };
  const app = load(async () => ({ available: true, groups: [], activeJob: job }));
  await app.loadXkeenCommands();
  assert.equal(app.state.xkeenCommands.job.id, 'existing');
  assert.equal(app.polls, 1);
});

test('conflicting launch recovers server job instead of losing stop controls', async () => {
  const app = load(async (url) => {
    if (url.endsWith('/run')) throw new Error('Already running');
    return { available: true, groups: [], activeJob: { id: 'other-tab', status: 'running' } };
  });
  await app.runXkeenCommand('-pr');
  assert.equal(app.state.xkeenCommands.job.id, 'other-tab');
  assert.equal(app.polls, 1);
});
