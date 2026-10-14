const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
const functions = source.slice(source.indexOf('function setInterfaceMode('), source.indexOf('function getMobileSectionTabsHeight('));

function element(tag) {
  return {
    tag, children: [], dataset: {}, attributes: {}, events: {}, classList: { toggle() {} },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    contains() { return false; },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(event, callback) { this.events[event] = callback; },
  };
}

function setup(api) {
  const requests = [];
  const state = {
    interfaceMode: 'advanced', outputText: 'unsaved draft', groups: [{ name: 'DRAFT ONLY', type: 'smart' }],
    simpleGroups: { items: [], loading: false, error: '', replacing: '', feedback: Object.create(null), pollTimer: 0 },
  };
  const buttons = ['simple', 'advanced'].map((mode) => ({ ...element('button'), dataset: { interfaceMode: mode } }));
  const els = { interfaceModeButtons: buttons, simpleModePanel: element('section'), simpleGroupsStatus: element('p'), simpleGroupsGrid: element('div') };
  const context = vm.createContext({
    state, els, RESOURCE_MONITOR_DEFINITIONS: {}, stripNodeFlagEmoji: (value) => value,
    document: { body: element('body'), activeElement: null, createElement: element, createElementNS: (_, tag) => element(tag) },
    window: { setInterval: () => 1, clearInterval() {} }, updateMobileSectionTabsVisibility() {},
    loadNodeInventory() { requests.push({ url: '/api/nodes' }); },
    loadResourceMonitor() { requests.push({ url: '/api/resource-monitor' }); },
    apiJson: async (url, options) => { requests.push({ url, options }); return api(url, options); },
  });
  vm.runInContext(functions, context);
  return { context, state, els, requests };
}

test('advanced is the initial mode; switching views preserves the draft and fetches live groups only', async () => {
  assert.match(source, /interfaceMode: 'advanced'/);
  const { context, state, els, requests } = setup(() => ({ groups: [{ name: 'LIVE', type: 'Smart' }, { name: 'AUTO', type: 'URLTest' }] }));
  context.setInterfaceMode('advanced');
  assert.equal(els.simpleModePanel.hidden, true);
  assert.equal(requests.length, 0);
  context.setInterfaceMode('simple');
  await new Promise(setImmediate);
  assert.equal(els.simpleModePanel.hidden, false);
  assert.deepEqual(Array.from(state.simpleGroups.items, (group) => group.name), ['LIVE']);
  assert.equal(requests[0].url, '/api/groups');
  state.routerApiAvailable = true;
  context.setInterfaceMode('advanced');
  assert.equal(state.outputText, 'unsaved draft');
  assert.equal(state.groups[0].name, 'DRAFT ONLY');
  assert.equal(state.simpleGroups.pollTimer, 0);
  assert.deepEqual(requests.slice(1).map((request) => request.url), ['/api/nodes', '/api/resource-monitor']);
});

test('each live group exposes one identical replacement action and no engine or node selector', () => {
  const { context } = setup(() => ({}));
  for (const type of ['Smart', 'Selector']) {
    const card = context.createSimpleGroupCard({ name: '<custom group>', type, now: 'SECRET NODE', all: ['a', 'b'] });
    assert.equal(card.children[0].children[1].textContent, '<custom group>');
    assert.equal(card.children.filter((child) => child.tag === 'button').length, 1);
    assert.equal(card.children[1].children[1].textContent, 'Сменить сервер');
    assert.equal(card.children[1].attributes['aria-label'], 'Сменить сервер в группе <custom group>');
    assert.equal(card.children[2].hidden, true);
    assert.doesNotMatch(JSON.stringify(card), /SECRET NODE|Smart|Selector/);
  }
});

test('replacement submits the exact group once and blocks duplicate clicks while pending', async () => {
  let finish;
  const { context, state, requests } = setup((url) => url === '/api/groups/replace'
    ? new Promise((resolve) => { finish = resolve; }) : { groups: [] });
  state.interfaceMode = 'simple';
  const action = context.replaceSimpleGroupServer(' group with spaces ');
  assert.equal(state.simpleGroups.replacing, ' group with spaces ');
  await context.replaceSimpleGroupServer('OTHER');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.headers['X-Mihui-Action'], 'group-replace');
  assert.deepEqual(JSON.parse(requests[0].options.body), { group: ' group with spaces ' });
  finish({ ok: true, changed: true, message: 'Сервер сменён.' });
  await action;
  assert.equal(state.simpleGroups.replacing, '');
  assert.equal(state.simpleGroups.feedback[' group with spaces '].message, 'Сервер сменён.');
  assert.equal(requests[1].url, '/api/groups');
});

test('accepted Smart feedback does not claim a confirmed new server', async () => {
  const { context, state } = setup(() => ({ ok: true, changed: false, requestAccepted: true }));
  await context.replaceSimpleGroupServer('SMART');
  assert.equal(state.simpleGroups.feedback.SMART.message, 'Готово. Попробуйте открыть сервис снова.');
});

test('lost POST response and uncertain API result show unknown outcome without prompting another replacement', async () => {
  for (const error of [new TypeError('network failed'), { status: 502, data: { uncertain: true } }]) {
    const { context, state } = setup(() => { throw error; });
    await context.replaceSimpleGroupServer('SMART');
    assert.equal(state.simpleGroups.feedback.SMART.message, 'Результат смены неизвестен. Проверьте работу сервиса.');
    assert.equal(state.simpleGroups.feedback.SMART.error, true);
  }
});

test('failed refresh discards stale cards; a confirmed rejection stays a clear failure', async () => {
  const { context, state } = setup(() => { throw { status: 422, data: { message: 'Другой сервер не найден.' } }; });
  state.interfaceMode = 'simple';
  await context.replaceSimpleGroupServer('GROUP');
  assert.equal(state.simpleGroups.feedback.GROUP.message, 'Другой сервер не найден.');
  state.simpleGroups.items = [{ name: 'STALE', type: 'Selector' }];
  await context.loadSimpleGroups();
  assert.equal(state.simpleGroups.items.length, 0);
  assert.match(state.simpleGroups.error, /Не удалось получить группы/);
});
