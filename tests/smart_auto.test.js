const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
const groupItems = source.slice(source.indexOf('function getNodeGroupSelectionItems('), source.indexOf('function orderNodeGroupSelectionGroups('));
const groupCard = source.slice(source.indexOf('function createNodeGroupSelectionCard('), source.indexOf('function isSelectableNodeGroup('));
const autoAction = source.slice(source.indexOf('async function enableSmartGroupAuto('), source.indexOf('function formatNodeGroupSelectionMeta('));

function createElement() {
  return {
    children: [], events: {}, classList: { toggle() {} },
    append(...children) { this.children.push(...children); },
    addEventListener(name, callback) { this.events[name] = callback; },
  };
}

test('only a native Smart group with an explicit pin offers automatic selection', () => {
  const groups = ['pinned', 'auto', 'legacy', 'selector'].map((name) => ({ name, type: 'smart' }));
  const context = vm.createContext({
    state: {
      groups, nodeGroupSelectingName: '',
      mihomoGroupSelections: [
        { name: 'pinned', type: 'Smart', fixed: 'node-a', now: 'node-a', all: ['node-a'] },
        { name: 'auto', type: 'Smart', fixed: '', now: 'Smart - Select', all: ['node-a'] },
        { name: 'legacy', type: 'Smart', now: 'node-a', all: ['node-a'] },
        { name: 'selector', type: 'Selector', fixed: 'node-a', now: 'node-a', all: ['node-a'] },
      ],
    },
    normalizeLookupName: (name) => name,
    orderNodeGroupSelectionGroups: (items) => items,
    stripNodeFlagEmoji: (name) => name,
    formatNodeProtocol: () => 'VLESS',
    normalizeNodeDelay: () => null,
    getNodeStatusKey: () => 'unknown',
    formatNodeStatus: () => '',
    document: { createElement },
    formatNodeGroupSelectionMeta: () => 'smart',
    formatNodeGroupChoiceType: () => 'VLESS',
    createNodeBadge: createElement,
    isSelectableNodeGroup: () => false,
  });
  vm.runInContext(`${groupItems}\n${groupCard}`, context);
  const items = context.getNodeGroupSelectionItems([]);
  assert.deepEqual(Array.from(items, (item) => item.smartFixed), ['node-a', '', '', '']);
  assert.equal(items[1].selectedDisplayName, 'Автоматический выбор');
  for (const item of items) {
    const card = context.createNodeGroupSelectionCard(item);
    assert.equal(card.children[1].children[0].textContent, item.smartFixed ? 'Закреплено' : 'Сейчас');
    const actions = card.children.find((child) => child.className === 'node-group-selection-actions');
    assert.equal(Boolean(actions), Boolean(item.smartFixed));
    if (actions) assert.equal(actions.children[0].textContent, 'Включить автовыбор');
  }
  context.state.nodeGroupSelectingName = 'pinned';
  const pendingCard = context.createNodeGroupSelectionCard(items[0]);
  const pendingButton = pendingCard.children.at(-1).children[0];
  assert.equal(pendingButton.disabled, true);
  assert.equal(pendingButton.textContent, 'Включение…');
});

function createActionContext(apiJson) {
  const calls = { refreshes: 0, messages: [], requests: [] };
  const state = { nodeGroupSelectingName: '' };
  const context = vm.createContext({
    state,
    apiJson: (url, options) => {
      calls.requests.push([url, options.method, JSON.parse(options.body)]);
      return apiJson();
    },
    renderNodeInventory() {},
    loadNodeInventory: async () => { calls.refreshes += 1; },
    showMessage: (message, options) => calls.messages.push({ message, ...options }),
  });
  vm.runInContext(autoAction, context);
  return { context, state, calls };
}

test('automatic selection uses the native reset endpoint, blocks duplicate clicks and refreshes after confirmation', async () => {
  let finish;
  const { context, state, calls } = createActionContext(() => new Promise((resolve) => { finish = resolve; }));
  const action = context.enableSmartGroupAuto('YOUTUBE');
  assert.equal(state.nodeGroupSelectingName, 'YOUTUBE');
  await context.enableSmartGroupAuto('TELEGRAM');
  assert.equal(calls.requests.length, 1);
  assert.deepEqual(calls.requests[0], ['/api/groups/auto', 'POST', { group: 'YOUTUBE' }]);
  assert.equal(calls.refreshes, 0);
  finish({ ok: true, fixed: '' });
  await action;
  assert.equal(calls.refreshes, 1);
  assert.equal(state.nodeGroupSelectingName, '');
  assert.equal(calls.messages[0].severity, 'success');
});

test('a failed automatic selection refreshes the pin and shows the actual error', async () => {
  const { context, state, calls } = createActionContext(async () => { throw new Error('Ядро не подтвердило снятие фиксации'); });
  await context.enableSmartGroupAuto('YOUTUBE');
  assert.equal(calls.refreshes, 1);
  assert.equal(state.nodeGroupSelectingName, '');
  assert.equal(calls.messages[0].severity, 'error');
  assert.match(calls.messages[0].details, /не подтвердило снятие фиксации/);
});

for (const action of ['saveRouterConfig', 'restoreSelectedBackup']) {
  for (const resetOk of [true, false]) {
    test(`${action} reports applied config with a ${resetOk ? 'confirmed' : 'failed'} Smart reset accurately`, async () => {
      const messages = [];
      const state = {
        outputText: 'config', routerMode: true, routerConfigPath: 'config.yaml', routerConfigRevision: 'old',
        selectedBackupName: 'previous.yaml', whitelistMonitor: {},
      };
      const context = vm.createContext({
        state,
        els: { backupHistoryDialog: { close() {} } },
        apiJson: async () => ({ path: 'config.yaml', revision: 'new', reload: { ok: true, smartReset: { ok: resetOk, groups: [], message: 'Smart остаётся закреплён' } } }),
        hasBlockingLocalErrors: () => false,
        validateWhitelistProposalSnapshot: async () => true,
        isCurrentConfigKernelChecked: () => true,
        confirmHighRiskSave: () => true,
        setRouterBusy() {}, setBackupRestoreBusy() {}, setBackupHistoryStatus() {},
        persistSuccessfulConfigCheck() {}, parseAndRender() {},
        loadBackups: async () => {}, loadProviderStatuses: async () => {}, loadNodeInventory: async () => {},
        loadRouterConfig: async () => {}, applyPendingResourceMonitorSettings: async () => {}, applyPendingWhitelistMonitorSettings: async () => {},
        showMessage: (message, options) => messages.push({ message, ...options }),
      });
      const handler = action === 'saveRouterConfig'
        ? source.slice(source.indexOf('async function saveRouterConfig()'), source.indexOf('async function restoreSelectedBackup()'))
        : source.slice(source.indexOf('async function restoreSelectedBackup()'), source.indexOf('function openBackupHistoryDialog()'));
      vm.runInContext(handler, context);
      await context[action]();
      assert.equal(messages.length, 1);
      assert.equal(messages[0].severity, resetOk ? 'success' : 'warning');
      if (!resetOk) {
        assert.match(messages[0].message, /автовыбор Smart ещё не включён/);
        assert.equal(messages[0].details, 'Smart остаётся закреплён');
      }
      if (action === 'saveRouterConfig') assert.equal(state.routerSavedText, 'config');
    });
  }
}
