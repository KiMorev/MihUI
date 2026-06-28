const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const SOURCES = [
  { name: 'app.js', path: 'app.js', type: 'js' },
  { name: 'mihomo-editor.html', path: 'mihomo-editor.html', type: 'html' },
];

function createElement() {
  const classes = new Set();
  return {
    children: [],
    classList: {
      add(...items) {
        items.forEach((item) => classes.add(item));
      },
      remove(...items) {
        items.forEach((item) => classes.delete(item));
      },
      toggle(item, force) {
        if (force === undefined ? !classes.has(item) : force) {
          classes.add(item);
          return true;
        }
        classes.delete(item);
        return false;
      },
      contains(item) {
        return classes.has(item);
      },
    },
    hidden: false,
    addEventListener() {},
    append(...children) {
      this.children.push(...children);
    },
    querySelector() {
      return createElement();
    },
    querySelectorAll() {
      return [];
    },
    remove() {},
    setAttribute() {},
    select() {},
    focus() {},
    content: {
      firstElementChild: {
        cloneNode: () => createElement(),
      },
    },
  };
}

function readSource(source) {
  const text = fs.readFileSync(source.path, 'utf8');
  if (source.type === 'js') return text;

  const scripts = [...text.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1, `${source.name}: expected one inline script`);
  return scripts[0][1];
}

function loadApp(source) {
  const runTimer = (callback) => {
    callback();
    return 0;
  };
  const context = {
    Blob,
    URL,
    console,
    document: {
      body: createElement(),
      createElement,
      querySelector: createElement,
      querySelectorAll: () => [],
    },
    navigator: {
      clipboard: {
        writeText: async () => {},
      },
    },
    setTimeout: runTimer,
    window: {
      requestAnimationFrame: (callback) => callback(),
      setTimeout: runTimer,
    },
  };

  vm.createContext(context);
  vm.runInContext(
    `${readSource(source)}
globalThis.__app = {
  els,
  state,
  addConnectionSetting,
  addGroup,
  addProvider,
  addRecommendedConnectionSettings,
  applyDiagnosticFix,
  applyConfigurationEdit,
  beginConfigurationEdit,
  applyBulkIntervals,
  buildRouteNodeModel,
  collectChanges,
  collectDiagnostics,
  countChanges,
  findTopSection,
  getDiagnosticSeverity,
  getDiagnosticAction,
  getRuleScenarios,
  getProviderIntervalDefaults,
  parseGroups,
  parseProviders,
  readConnectionSettings,
  renderChangesJumpButton,
  renderConnectionSettings,
  snapshotGroup,
  snapshotProvider,
  splitLines,
  toggleGroupProxy,
  toggleGroupUse,
  updateGroup,
};`,
    context,
    { filename: source.name },
  );

  return context.__app;
}

function hydrate(app, yaml) {
  const lines = app.splitLines(yaml);
  const providersSection = app.findTopSection(lines, 'proxy-providers');
  const groupsSection = app.findTopSection(lines, 'proxy-groups');

  app.state.originalText = yaml;
  app.state.hasProvidersSection = Boolean(providersSection);
  app.state.hasGroupsSection = Boolean(groupsSection);
  app.state.providers = providersSection ? app.parseProviders(lines, providersSection) : [];
  app.state.groups = groupsSection ? app.parseGroups(lines, groupsSection) : [];
  app.state.originalConnectionSettings = app.readConnectionSettings(lines);
  app.state.connectionSettings = Object.fromEntries(
    Object.entries(app.state.originalConnectionSettings).map(([key, setting]) => [key, { ...setting }]),
  );
  app.state.originalProviders = app.state.providers.map(app.snapshotProvider);
  app.state.originalGroups = app.state.groups.map(app.snapshotGroup);

  return app.state.providers.filter((provider) => !provider.deleted);
}

function flattenChanges(changes) {
  return changes.flatMap((section) => section.items);
}

for (const source of SOURCES) {
  test(`${source.name}: reports broken route links`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxy-providers:
  good:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - good
      - missing-provider
  - name: EmptyAuto
    type: url-test
rules:
  - DOMAIN-SUFFIX,example.com,MissingGroup
  - IP-CIDR,1.1.1.0/24,Proxy,no-resolve
  - MATCH,DIRECT
`);

    const diagnostics = app.collectDiagnostics(activeProviders);

    assert(diagnostics.includes('Rules: цель MissingGroup не найдена среди групп, обычных proxies или встроенных выходов.'));
    assert(diagnostics.includes('Группа Proxy: provider missing-provider из use не найден.'));
    assert(diagnostics.includes('Группа EmptyAuto: прокси-режим пустой.'));
    assert.equal(diagnostics.some((item) => item.includes('no-resolve')), false);
    assert.equal(diagnostics.some((item) => item.includes('Подписка good')), false);
    assert.equal(app.getDiagnosticSeverity('Rules: цель MissingGroup не найдена среди групп, обычных proxies или встроенных выходов.'), 'error');
    assert.equal(app.getDiagnosticSeverity('Группа Proxy: provider missing-provider из use не найден.'), 'error');
    assert.equal(app.getDiagnosticSeverity('Группа EmptyAuto: прокси-режим пустой.'), 'warning');
  });

  test(`${source.name}: removes missing provider from group use`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  good:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - good
      - missing-provider
rules:
  - MATCH,Proxy
`);

    const message = 'Группа Proxy: provider missing-provider из use не найден.';
    const action = app.getDiagnosticAction(message);

    assert.equal(action.label, 'Убрать из группы');
    assert.equal(app.applyDiagnosticFix(action), true);
    assert.deepEqual([...app.state.groups[0].use], ['good']);
    assert.doesNotMatch(app.state.outputText, /missing-provider/);
    assert.equal(app.collectDiagnostics(app.state.providers).includes(message), false);
  });

  test(`${source.name}: connects unlinked provider to explicit use groups`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  first:
    type: http
    url: https://first.example/sub
  second:
    type: http
    url: https://second.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - first
rules:
  - MATCH,Proxy
`);

    const message = 'Подписка second: не подключена ни к одной группе use.';
    const action = app.getDiagnosticAction(message);

    assert.equal(action.label, 'Подключить к группам');
    assert.equal(app.applyDiagnosticFix(action), true);
    assert.deepEqual([...app.state.groups[0].use], ['first', 'second']);
    assert.match(app.state.outputText, /- second/);
    assert.equal(app.collectDiagnostics(app.state.providers).includes(message), false);
  });

  test(`${source.name}: accepts linked providers, groups and direct proxies`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxies:
  - {name: Local, type: direct}
proxy-providers:
  good:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - good
rules:
  - DOMAIN,local.example,Local
  - DOMAIN-SUFFIX,example.com,Proxy
  - MATCH,DIRECT
`);

    assert.equal(app.collectDiagnostics(activeProviders).length, 0);
  });

  test(`${source.name}: reports duplicated provider urls`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxy-providers:
  first:
    type: http
    url: https://same.example/sub
  second:
    type: http
    url: https://same.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - first
      - second
rules:
  - MATCH,DIRECT
`);

    const diagnostics = app.collectDiagnostics(activeProviders);
    const message = 'Подписка second: ссылка совпадает с first.';

    assert(diagnostics.includes(message));
    assert.equal(app.getDiagnosticSeverity(message), 'warning');
  });

  test(`${source.name}: reports duplicated url on new provider`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  blanc:
    type: http
    url: https://same.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - blanc
rules:
  - MATCH,DIRECT
`);

    const added = {
      name: 'withblancvpn',
      originalName: 'withblancvpn',
      url: 'https://same.example/sub',
      deleted: false,
      isNew: true,
    };
    app.state.providers.unshift(added);
    app.state.groups[0].use.unshift(added.name);

    const diagnostics = app.collectDiagnostics(app.state.providers.filter((provider) => !provider.deleted));

    assert(diagnostics.includes('Подписка withblancvpn: ссылка совпадает с blanc.'));
    assert.equal(diagnostics.includes('Подписка blanc: ссылка совпадает с withblancvpn.'), false);
  });

  test(`${source.name}: reports semantic changes`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://old.example/sub
    interval: 86400
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 300
  removed:
    type: http
    url: https://removed.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
      - removed
rules:
  - MATCH,DIRECT
`);

    const existing = app.state.providers.find((provider) => provider.name === 'existing');
    const removed = app.state.providers.find((provider) => provider.name === 'removed');
    const proxy = app.state.groups.find((group) => group.name === 'Proxy');

    existing.url = 'https://new.example/sub';
    removed.deleted = true;
    app.state.providers.push({ name: 'added', originalName: 'added', deleted: false });
    proxy.use = ['added'];

    const activeProviders = app.state.providers.filter((provider) => !provider.deleted);
    const changes = flattenChanges(app.collectChanges(activeProviders));

    assert(changes.includes('У подписки existing изменится: ссылка подписки.'));
    assert(changes.includes('Удалена подписка removed.'));
    assert(changes.includes('Добавлена подписка added. Подключена к группам Proxy.'));
    assert.equal(changes.includes('Proxy: подключена added.'), false);
    assert(changes.includes('В группе Proxy отключена подписка existing.'));
    assert(changes.includes('В группе Proxy отключена подписка removed.'));
  });

  test(`${source.name}: reports all editable provider field changes`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://old.example/sub
    filter: RU
    exclude-filter: test
    exclude-type: ss
    path: ./providers/old.yaml
    interval: 86400
    header:
      User-Agent: OldAgent
      x-hwid: OLDHWID
    health-check:
      enable: true
      url: https://old.example/check
      interval: 300
    override:
      udp: true
      tfo: true
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    const existing = app.state.providers.find((provider) => provider.name === 'existing');
    Object.assign(existing, {
      url: 'https://new.example/sub',
      filter: 'NL',
      excludeFilter: 'expired',
      excludeType: 'vless',
      userAgent: 'NewAgent',
      xHwid: 'NEWHWID',
      udp: false,
      tfo: false,
      path: './providers/new.yaml',
      interval: '43200',
      healthUrl: 'https://new.example/check',
      healthInterval: '600',
    });

    const changes = flattenChanges(app.collectChanges(app.state.providers));

    assert(changes.includes(
      'У подписки existing изменятся: ссылка подписки, фильтр серверов, исключения из фильтра, исключенные типы серверов, User-Agent, x-hwid, UDP, быстрое открытие TCP (TFO), путь сохранения, интервал обновления подписки, адрес проверки нод, период проверки нод.',
    ));
  });

  test(`${source.name}: does not report unchanged provider as added`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  original:
    type: http
    url: https://same.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - original
rules:
  - MATCH,DIRECT
`);

    const original = app.state.providers.find((provider) => provider.name === 'original');
    original.originalName = 'original-copy';

    const activeProviders = app.state.providers.filter((provider) => !provider.deleted);
    const changes = flattenChanges(app.collectChanges(activeProviders));

    assert.equal(changes.some((change) => change.includes('Добавлена подписка original')), false);
    assert.equal(changes.some((change) => change.includes('Удалена подписка original')), false);
  });

  test(`${source.name}: applies intervals to all active providers`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  first:
    type: http
    url: https://first.example/sub
    interval: 86400
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 300
  second:
    type: http
    url: https://second.example/sub
    interval: 86400
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 300
proxy-groups:
  - name: Proxy
    type: select
    use:
      - first
      - second
rules:
  - MATCH,DIRECT
`);

    app.els.bulkIntervalInput.value = '43200';
    app.els.bulkHealthIntervalInput.value = '600';
    app.applyBulkIntervals();

    app.state.providers.forEach((provider) => {
      assert.equal(provider.interval, '43200');
      assert.equal(provider.healthInterval, '600');
      assert.equal(provider.hasInterval, true);
      assert.equal(provider.hasHealthCheck, true);
    });
  });

  test(`${source.name}: reports bulk interval drafts as pending before apply`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
    interval: 86400
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 300
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.state.intervalToolsOpen = true;
    app.els.bulkIntervalInput.value = '172800';
    app.els.bulkHealthIntervalInput.value = '60';

    const changes = flattenChanges(app.collectChanges(app.state.providers));

    assert(changes.includes('После «Применить ко всем подпискам»: обновление подписок 24 ч → 48 ч для 1 подписки.'));
    assert(changes.includes('После «Применить ко всем подпискам»: проверка нод 5 мин → 1 мин для 1 подписки.'));
    assert.equal(app.state.providers[0].interval, '86400');
    assert.equal(app.state.providers[0].healthInterval, '300');
  });

  test(`${source.name}: reports added interval keys after bulk defaults`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.els.bulkIntervalInput.value = '86400';
    app.els.bulkHealthIntervalInput.value = '300';
    app.applyBulkIntervals();

    const changes = flattenChanges(app.collectChanges(app.state.providers));

    assert(changes.includes('У подписки existing изменятся: интервал обновления подписки, адрес проверки нод, период проверки нод.'));
  });

  test(`${source.name}: builds route scenarios for different config variants`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  blanc:
    type: http
    url: https://blanc.example/sub
  accessbyme:
    type: http
    url: https://access.example/sub
proxy-groups:
  - name: Media
    type: select
    proxies:
      - PROXY
      - DIRECT
  - name: PROXY
    type: fallback
    use:
      - blanc
      - accessbyme
  - name: Auto
    type: url-test
    include-all-providers: true
rules:
  - RULE-SET,youtube,Media
  - GEOIP,CN,DIRECT,no-resolve
  - IP-CIDR,10.0.0.0/8,DIRECT
  - DOMAIN-SUFFIX,blocked.example,REJECT-DROP
  - PROCESS-NAME,steam.exe,Auto
  - MATCH,COMPATIBLE
`);

    const scenarios = app.getRuleScenarios();
    const mediaScenario = scenarios.find((scenario) => scenario.target === 'Media');
    const autoScenario = scenarios.find((scenario) => scenario.target === 'Auto');
    const directScenario = scenarios.find((scenario) => scenario.target === 'DIRECT');
    const defaultScenario = scenarios.find((scenario) => scenario.isDefault);

    assert.equal(mediaScenario.matcher, 'Набор правил youtube');
    assert.equal(directScenario.ruleCount, 2);
    assert.equal(directScenario.examples.join('|'), 'География IP CN|IP-сеть 10.0.0.0/8');
    assert.equal(scenarios.some((scenario) => scenario.target === 'REJECT-DROP'), true);
    assert.equal(defaultScenario.label, 'Остальной трафик');
    assert.equal(defaultScenario.target, 'COMPATIBLE');

    const mediaNode = app.buildRouteNodeModel(mediaScenario.target, app.state.groups, app.state.providers);
    const proxyNode = mediaNode.children.find((node) => node.title === 'PROXY');
    const directNode = mediaNode.children.find((node) => node.title === 'DIRECT');
    const autoNode = app.buildRouteNodeModel(autoScenario.target, app.state.groups, app.state.providers);
    const rejectNode = app.buildRouteNodeModel('REJECT-DROP', app.state.groups, app.state.providers);

    assert.equal(mediaNode.kind, 'group');
    assert.equal(proxyNode.kind, 'mode');
    assert.equal(directNode.kind, 'direct');
    assert.equal(proxyNode.children.map((node) => node.title).join('|'), 'blanc|accessbyme');
    assert.equal(autoNode.children.map((node) => node.title).join('|'), 'blanc|accessbyme');
    assert.equal(rejectNode.kind, 'reject');
  });

  test(`${source.name}: inherits intervals when adding provider`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
    interval: 43200
    health-check:
      enable: true
      url: https://health.example/check
      interval: 600
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.addProvider();
    const added = app.state.providers.find((provider) => provider.isNew);

    assert.equal(added.interval, '43200');
    assert.equal(added.healthUrl, 'https://health.example/check');
    assert.equal(added.healthInterval, '600');
    assert.equal(added.userAgent, 'ClashMeta/1.19.24; mihomo/1.19.24');
    assert.match(added.xHwid, /^[A-F0-9]{12}$/);
  });

  test(`${source.name}: connects added provider to explicit use groups`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.addProvider();
    const added = app.state.providers.find((provider) => provider.isNew);
    const proxy = app.state.groups.find((group) => group.name === 'Proxy');

    assert(proxy.use.includes(added.name));
    assert.equal(app.collectDiagnostics(app.state.providers.filter((provider) => !provider.deleted)).some((item) => item.includes(added.name)), false);
  });

  test(`${source.name}: edits existing group proxies and use`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    proxies:
      - DIRECT
    use:
      - existing
  - name: Other
    type: select
    proxies:
      - DIRECT
rules:
  - MATCH,Proxy
`);

    const proxy = app.state.groups.find((group) => group.name === 'Proxy');

    app.updateGroup(proxy, 'type', 'fallback');
    app.toggleGroupProxy(proxy, 'REJECT', true);
    app.toggleGroupProxy(proxy, 'Other', true);
    app.toggleGroupUse(proxy, 'existing', false);

    assert.match(app.state.outputText, /  - name: Proxy\n    type: fallback\n    proxies:\n      - DIRECT\n      - REJECT\n      - Other\n    use: \[\]/);
  });

  test(`${source.name}: adds new group with proxies and use`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,Proxy
`);

    app.addGroup();
    const group = app.state.groups.find((item) => item.isNew);

    app.updateGroup(group, 'type', 'fallback');
    app.toggleGroupProxy(group, 'Proxy', true);
    app.toggleGroupUse(group, 'existing', true);

    assert.equal(group.name, 'Custom');
    assert.match(app.state.outputText, /  - name: Custom\n    type: fallback\n    proxies:\n      - DIRECT\n      - Proxy\n    use:\n      - existing/);
  });

  test(`${source.name}: adds missing recommended connection settings only`, () => {
    const app = loadApp(source);
    hydrate(app, `
global-client-fingerprint: firefox
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.addRecommendedConnectionSettings();

    assert.equal(app.state.connectionSettings['global-client-fingerprint'].value, 'firefox');
    assert.equal(app.state.connectionSettings['unified-delay'].value, 'true');
    assert.equal(app.state.connectionSettings['tcp-concurrent'].value, 'true');
    assert.match(app.state.outputText, /global-client-fingerprint: firefox/);
    assert.match(app.state.outputText, /unified-delay: true/);
    assert.match(app.state.outputText, /tcp-concurrent: true/);

    const changes = flattenChanges(app.collectChanges(app.state.providers));
    assert.equal(changes.some((item) => item.includes('global-client-fingerprint')), false);
    assert(changes.includes('Добавлена настройка «Честная проверка задержки»: включено.'));
    assert(changes.includes('Добавлена настройка «Быстрое TCP-подключение»: включено.'));
  });

  test(`${source.name}: hides complete connection recommendations`, () => {
    const app = loadApp(source);
    hydrate(app, `
global-client-fingerprint: chrome
unified-delay: true
tcp-concurrent: true
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.renderConnectionSettings();

    assert.equal(app.els.connectionSettingsPanel.classList.contains('hidden'), true);
  });

  test(`${source.name}: shows only missing connection recommendations`, () => {
    const app = loadApp(source);
    hydrate(app, `
global-client-fingerprint: chrome
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.renderConnectionSettings();

    const [, body] = app.els.connectionSettingsPanel.children;
    const [grid] = body.children;
    assert.equal(app.els.connectionSettingsPanel.classList.contains('hidden'), false);
    assert.equal(grid.children.length, 2);
  });

  test(`${source.name}: shows changes jump only with a count`, () => {
    const app = loadApp(source);

    app.renderChangesJumpButton([]);
    assert.equal(app.els.changesJumpButton.hidden, true);

    const changes = [{ title: 'Подписки', items: ['one', 'two'] }];
    app.renderChangesJumpButton(changes);

    assert.equal(app.els.changesJumpButton.hidden, false);
    assert.equal(app.els.changesJumpButton.disabled, false);
    assert.equal(app.els.changesJumpButton.textContent, `Изменения (${app.countChanges(changes)})`);
  });

  test(`${source.name}: adds one connection setting`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.addConnectionSetting('tcp-concurrent');

    assert.equal(app.state.connectionSettings['tcp-concurrent'].value, 'true');
    assert.notEqual(app.state.connectionSettings['global-client-fingerprint']?.exists, true);
    assert.notEqual(app.state.connectionSettings['unified-delay']?.exists, true);
    assert.match(app.state.outputText, /tcp-concurrent: true/);
    assert.doesNotMatch(app.state.outputText, /global-client-fingerprint:/);
    assert.doesNotMatch(app.state.outputText, /unified-delay:/);
  });

  test(`${source.name}: applies edited configuration text`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  original:
    type: http
    url: https://original.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - original
rules:
  - MATCH,DIRECT
`);

    app.state.outputText = app.state.originalText;
    app.beginConfigurationEdit();
    app.els.outputPreview.value = `
proxy-providers:
  next:
    type: http
    url: https://next.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - next
rules:
  - MATCH,DIRECT
`;

    assert.equal(app.applyConfigurationEdit(), true);
    assert.equal(app.state.providers[0].name, 'next');
    assert.equal(app.state.providers[0].url, 'https://next.example/sub');
    assert.equal(app.state.isEditingConfiguration, false);
  });

  test(`${source.name}: applies pasted configuration without loading a file`, () => {
    const app = loadApp(source);

    app.beginConfigurationEdit();
    app.els.outputPreview.value = `
proxy-providers:
  pasted:
    type: http
    url: https://pasted.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - pasted
rules:
  - MATCH,DIRECT
`;

    assert.equal(app.applyConfigurationEdit(), true);
    assert.equal(app.state.fileName, 'Вставленная конфигурация');
    assert.equal(app.state.providers[0].name, 'pasted');
    assert.equal(app.state.groups[0].use[0], 'pasted');
  });

  test(`${source.name}: keeps current model when edited configuration cannot be applied`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  original:
    type: http
    url: https://original.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - original
rules:
  - MATCH,DIRECT
`);

    app.state.outputText = app.state.originalText;
    app.beginConfigurationEdit();
    app.els.outputPreview.value = `
proxy-providers:
  broken:
    type: http
    url: https://broken.example/sub
`;

    assert.equal(app.applyConfigurationEdit(), false);
    assert.equal(app.state.providers[0].name, 'original');
    assert.equal(app.state.isEditingConfiguration, true);
    assert.match(app.els.messageBox.textContent, /proxy-groups/);
  });
}
