const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const names = [
  'getCurrentConfigurationText', 'getConfigurationCheckError', 'renderConfigurationError',
  'jumpToConfigurationError', 'checkRouterConfig', 'handleConfigurationDraftInput',
  'getReviewPrimaryActionState',
  'getKernelCheckSummary',
];

function loadEditor() {
  const state = {
    outputText: 'proxy-groups: []\n', isEditingConfiguration: false, routerApiAvailable: true,
    hasGroupsSection: true, configurationError: null, kernelCheckBusy: false,
    lastConfigCheckText: '', lastConfigCheckOk: false,
  };
  const rows = Array.from({ length: 4 }, () => ({
    isError: false,
    classList: { toggle(_name, active) { this.row.isError = active; } },
  }));
  rows.forEach((row) => { row.classList.row = row; });
  const els = {
    outputPreview: {
      value: state.outputText,
      setAttribute(name, value) { this[name] = value; },
      focus() { this.focused = true; },
      setSelectionRange(start, end) { this.selection = [start, end]; },
    },
    outputCodeView: { querySelectorAll: () => rows },
    configurationError: {}, configurationErrorMessage: {}, configurationErrorJump: {},
  };
  const context = {
    state, els, messages: [], persisted: [], cleared: [], requests: [],
    window: { getComputedStyle: () => ({ lineHeight: '20' }) },
    beginConfigurationEdit() {
      state.isEditingConfiguration = true;
      els.outputPreview.value = state.outputText;
    },
    syncConfigurationEditorScroll() { context.scrollSynced = true; },
    renderYamlPreview() {}, renderReviewPrimaryActionButton() {}, renderReviewYamlSummary() {}, renderChangesOnly() {},
    setConfigCheckBusy(value) { state.kernelCheckBusy = value; },
    apiJson: async (url, options) => {
      context.requests.push({ url, body: JSON.parse(options.body) });
      return { available: true };
    },
    persistSuccessfulConfigCheck(text) { context.persisted.push(text); },
    clearPersistedConfigCheck(text) { context.cleared.push(text); },
    showMessage(message) { context.messages.push(message); },
    render() { context.api.renderConfigurationError(); },
  };
  vm.createContext(context);
  const functions = names.map((name) => {
    const match = source.match(new RegExp(`^(?:async )?function ${name}\\([^]*?^}`, 'm'));
    assert.ok(match, `${name} exists`);
    return match[0];
  }).join('\n');
  vm.runInContext(`${functions}\nglobalThis.api = { ${names.join(', ')} };`, context);
  return { ...context.api, context, state, els, rows };
}

test('Mihomo YAML diagnostics retain the parser reason and exact known location', () => {
  const app = loadEditor();
  const error = new Error('time="now" level=info msg="Start initial configuration"\n'
    + 'time="now" level=fatal msg="Parse config error: yaml: line 3, column 4: did not find expected key"');
  const parsed = app.getConfigurationCheckError(error, 'proxy-groups:\n  - name: a\n    type: [\n');
  assert.equal(parsed.line, 3);
  assert.equal(parsed.column, 4);
  assert.equal(parsed.message, 'did not find expected key');
  const multiline = app.getConfigurationCheckError(new Error('yaml: unmarshal errors:\n  line 2: cannot unmarshal !!map into string'), 'a:\nb: {}');
  assert.equal(multiline.line, 2);
  assert.equal(multiline.message, 'cannot unmarshal !!map into string');
});

test('non-YAML errors and out-of-range locations do not invent a jump target', () => {
  const app = loadEditor();
  for (const message of ['proxy group line 2 not found', 'Проверка конфигурации истекла', 'yaml: line 99: invalid key']) {
    const parsed = app.getConfigurationCheckError(new Error(message), 'proxy-groups: []');
    assert.equal(parsed.line, 0);
    assert.ok(parsed.message);
  }
});

test('persistent diagnostics highlight the line and jump into editing at its column', () => {
  const app = loadEditor();
  app.state.outputText = 'first:\r\nsecond:\r\n  bad: [\r\nlast: value';
  app.state.configurationError = { text: app.state.outputText, message: 'expected key', line: 3, column: 3 };
  app.renderConfigurationError();
  assert.equal(app.els.configurationError.hidden, false);
  assert.equal(app.els.configurationErrorMessage.textContent, 'Строка 3, столбец 3: expected key');
  assert.equal(app.rows[2].isError, true);
  app.jumpToConfigurationError();
  assert.equal(app.state.isEditingConfiguration, true);
  assert.deepEqual(app.els.outputPreview.selection, [19, 20]);
  assert.equal(app.context.scrollSynced, true);
  app.els.outputPreview.value += '\n';
  app.renderConfigurationError();
  assert.equal(app.els.configurationError.hidden, true);
  assert.equal(app.rows[2].isError, false);
});

test('checking an edited draft sends its current text and keeps a readable error without a line', async () => {
  const app = loadEditor();
  app.state.isEditingConfiguration = true;
  app.els.outputPreview.value = 'proxy-groups:\n  - name: Test\n    type: invalid\n';
  const checkedText = app.els.outputPreview.value;
  app.context.apiJson = async (_url, options) => {
    assert.equal(JSON.parse(options.body).text, checkedText);
    throw new Error('unsupported proxy-group type: invalid');
  };
  assert.equal(app.getReviewPrimaryActionState().disabled, false);
  assert.equal(await app.checkRouterConfig(), false);
  assert.equal(app.state.lastConfigCheckText, checkedText);
  assert.equal(app.state.lastConfigCheckOk, false);
  assert.equal(app.getKernelCheckSummary().value, 'не пройдена');
  assert.equal(app.els.configurationError.hidden, false);
  assert.equal(app.els.configurationErrorJump.hidden, true);
  assert.equal(app.els.configurationErrorMessage.textContent, 'unsupported proxy-group type: invalid');
  app.els.outputPreview.value += '# corrected\n';
  app.handleConfigurationDraftInput();
  assert.equal(app.state.configurationError, null);
  assert.equal(app.els.configurationError.hidden, true);
  assert.equal(app.getKernelCheckSummary().value, 'не проверено');
});

test('a successful check is recorded for the exact draft and clears its previous error', async () => {
  const app = loadEditor();
  app.state.isEditingConfiguration = true;
  app.els.outputPreview.value = 'proxy-groups: []\n# manual draft\n';
  const text = app.els.outputPreview.value;
  app.state.configurationError = { text, message: 'old error', line: 1 };
  assert.equal(await app.checkRouterConfig(), true);
  assert.equal(app.context.requests[0].body.text, text);
  assert.equal(app.state.lastConfigCheckText, text);
  assert.equal(app.state.lastConfigCheckOk, true);
  assert.equal(app.getKernelCheckSummary().value, 'YAML принят');
  assert.deepEqual(app.context.persisted, [text]);
  assert.equal(app.state.configurationError, null);
  assert.equal(app.els.configurationError.hidden, true);
});

test('late check results do not mark a changed draft as accepted or show an obsolete error', async () => {
  for (const fails of [false, true]) {
    const app = loadEditor();
    app.state.isEditingConfiguration = true;
    let finish;
    app.context.apiJson = () => new Promise((resolve, reject) => {
      finish = () => fails ? reject(new Error('yaml: line 1: old error')) : resolve({ available: true });
    });
    const pending = app.checkRouterConfig();
    app.els.outputPreview.value += '# changed while checking\n';
    app.handleConfigurationDraftInput();
    finish();
    assert.equal(await pending, false);
    assert.equal(app.state.lastConfigCheckText, '');
    assert.equal(app.state.lastConfigCheckOk, false);
    assert.equal(app.state.configurationError, null);
    assert.equal(app.context.persisted.length, 0);
    assert.equal(app.context.messages.length, 0);
    assert.equal(app.state.kernelCheckBusy, false);
  }
});
