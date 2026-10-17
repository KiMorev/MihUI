const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');

function load(apiJson) {
  const element = () => ({ textContent: '', value: '', disabled: false, hidden: false, children: [],
    append(child) { this.children.push(child); },
    classList: { toggle() {} }, setAttribute() {}, showModal() { this.open = true; } });
  const els = Object.fromEntries(['ruleSetSelect', 'ruleSetOpen', 'ruleSetDialog', 'ruleSetTitle', 'ruleSetQuery', 'ruleSetSearch',
    'ruleSetStatus', 'ruleSetEntries', 'ruleSetPage', 'ruleSetPrevious', 'ruleSetNext'].map((name) => [name, element()]));
  const state = { rules: [], routerApiAvailable: true, ruleSetInspector: { name: '', query: '', offset: 0, requestId: 0 } };
  const context = vm.createContext({ els, state, apiJson, document: { createElement: element },
    getActiveRules: () => state.rules.filter((rule) => !rule.deleted), normalizeRuleType: (type) => type.toUpperCase() });
  for (const name of ['renderRuleSetSelector', 'openRuleSetInspector', 'closeRuleSetInspector', 'loadRuleSetPage', 'renderRuleSetInspector']) {
    const match = source.match(new RegExp(`^(?:async )?function ${name}\\([^]*?^}`, 'm'));
    assert.ok(match, name);
    vm.runInContext(match[0], context);
  }
  return { app: context, els, state, inspector: state.ruleSetInspector };
}

function page(entries, extra = {}) {
  return { ok: true, format: 'text', behavior: 'domain', offset: 0,
    total: entries.length, matched: entries.length, entries, ...extra };
}

test('RULE-SET opens a saved router set with an encoded name and renders text safely', async () => {
  let request;
  const { app, els } = load(async (url) => { request = url; return page(['<script>alert(1)</script>', '+.example.com']); });
  await app.openRuleSetInspector('rules@domain & EU');
  assert.equal(request, '/api/rule-providers/inspect?name=rules%40domain%20%26%20EU&query=&offset=0&limit=50');
  assert.equal(els.ruleSetDialog.open, true);
  assert.match(els.ruleSetTitle.textContent, /rules@domain & EU/);
  assert.equal(els.ruleSetEntries.textContent, '<script>alert(1)</script>\n+.example.com');
  assert.equal(els.ruleSetPage.textContent, '1–2 из 2');
  assert.equal(els.ruleSetPrevious.disabled, true);
  assert.equal(els.ruleSetNext.disabled, true);
});

test('search and pagination keep the query and use the number of matches', async () => {
  let request;
  const { app, els, inspector } = load(async (url) => {
    request = url;
    return page(['example.org'], { offset: 50, total: 1000, matched: 51 });
  });
  inspector.name = 'domains';
  inspector.query = 'EXAMPLE&';
  await app.loadRuleSetPage(50);
  assert.match(request, /query=EXAMPLE%26&offset=50&limit=50$/);
  assert.equal(els.ruleSetPage.textContent, '51–51 из 51');
  assert.equal(els.ruleSetPrevious.disabled, false);
  assert.equal(els.ruleSetNext.disabled, true);
  assert.match(els.ruleSetStatus.textContent, /Всего: 1000 · Найдено: 51/);
});

test('empty results and read failures remove old entries and leave search available', async () => {
  let fail = false;
  const { app, els } = load(async () => {
    if (fail) throw new Error('Файл набора ещё не загружен.');
    return page([]);
  });
  await app.openRuleSetInspector('empty');
  assert.equal(els.ruleSetPage.textContent, 'Совпадений нет');
  assert.equal(els.ruleSetEntries.hidden, true);
  fail = true;
  await app.loadRuleSetPage();
  assert.equal(els.ruleSetStatus.textContent, 'Файл набора ещё не загружен.');
  assert.equal(els.ruleSetEntries.textContent, '');
  assert.equal(els.ruleSetSearch.disabled, false);
  assert.equal(els.ruleSetNext.disabled, true);
});

test('a late response from an older set cannot replace the current set', async () => {
  let resolveOld;
  const { app, els, inspector } = load((url) => url.includes('name=old&')
    ? new Promise((resolve) => { resolveOld = resolve; }) : Promise.resolve(page(['new.example'])));
  const first = app.openRuleSetInspector('old');
  await app.openRuleSetInspector('new');
  resolveOld(page(['old.example']));
  await first;
  assert.equal(inspector.name, 'new');
  assert.equal(els.ruleSetEntries.textContent, 'new.example');
  assert.equal(inspector.loading, false);
});

test('closing the dialog invalidates an unfinished read', async () => {
  let resolve;
  const { app, inspector, els } = load(() => new Promise((done) => { resolve = done; }));
  const pending = app.openRuleSetInspector('slow');
  app.closeRuleSetInspector();
  resolve(page(['late.example']));
  await pending;
  assert.equal(inspector.data, null);
  assert.equal(inspector.loading, false);
  assert.equal(els.ruleSetEntries.textContent, '');
});

test('selector lists unique referenced sets and blocks reads without a router connection', () => {
  const { app, els, state } = load(async () => ({}));
  state.rules = [{ type: 'RULE-SET', value: 'sites' }, { type: 'RULE-SET', value: 'sites' },
    { type: 'RULE-SET', value: 'removed', deleted: true }, { type: 'DOMAIN', value: 'example.com' },
    { type: 'RULE-SET', value: 'IPs' }];
  els.ruleSetSelect.value = 'IPs';
  app.renderRuleSetSelector();
  assert.deepEqual(els.ruleSetSelect.children.map((option) => option.value), ['sites', 'IPs']);
  assert.equal(els.ruleSetSelect.value, 'IPs');
  assert.equal(els.ruleSetOpen.disabled, false);
  state.routerApiAvailable = false;
  app.renderRuleSetSelector();
  assert.equal(els.ruleSetOpen.disabled, true);
});

test('partial sets clearly limit search results to the inspected part', async () => {
  const { app, els } = load(async () => page(['+.example.com'], { truncated: true }));
  await app.openRuleSetInspector('large');
  assert.match(els.ruleSetStatus.textContent, /Набор показан частично; поиск выполнен только в показанной части/);
});
