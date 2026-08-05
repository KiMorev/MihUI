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
    dataset: {},
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

function loadApp(source, initialStorage = {}, options = {}) {
  const storage = new Map(Object.entries(initialStorage));
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
      createElementNS: createElement,
      createTextNode: (value) => ({ textContent: String(value) }),
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
      confirm: options.confirm || (() => true),
      open: options.open || (() => null),
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        removeItem: (key) => storage.delete(key),
        setItem: (key, value) => storage.set(key, String(value)),
      },
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
  commitProviderCreateDraft,
  commitProviderEditDraft,
  createProviderCreateDraft,
  createProviderEditDraft,
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
  generateOutput,
  getExportFileName,
  getDisplayFileName,
  getMissingConnectionSettings,
  getNodeGroupSelectionItems,
  getNodeInventoryStatusCounts,
  getNodeInventorySummaryText,
  getNodeNameRuleImpact,
  getNodeProtocolImpact,
  getOutputPreviewText,
  getRouterSaveState,
  getReviewPrimaryActionState,
  getHighRiskSaveSummaries,
  getKernelCheckSummary,
  confirmHighRiskSave,
  hasUnsavedWorkspaceChanges,
  handleBeforeUnload,
  shouldShowRecommendations,
  maskProviderUrlsInYaml,
  maskSensitiveUrl,
  formatNodeInventoryError,
  formatServiceStatusLabel,
  summarizeRoutePattern,
  isSelectableNodeGroup,
  splitRoutePattern,
  matchesRuleFilters,
  ruleRequiresValue,
  getRuleScenarios,
  getRulesOrderState,
  getRuleStatus,
  describeRuleRouting,
  getGroupUsage,
  getProviderIntervalDefaults,
  getProviderOutputUrl,
  parseXrayProviderAdapterUrl,
  formatProviderAdapterStatus,
  getProviderCreateNameError,
  getProviderCreateUrlError,
  getProviderEditNameError,
  getProviderAttentionItem,
  getProviderDisplayState,
  getProviderRuntimeWarnings,
  getStaleProviderInfo,
  persistSuccessfulConfigCheck,
  prepareResourceMonitorConfig,
  resourceMonitorNeedsConfigChanges,
  getResourceMonitorDialogIssue,
  toggleResourceMonitor,
  getResourceMonitorSourceGroups,
  buildResourceMonitorTimeline,
  getResourceMonitorHistoryTooltipContent,
  isRecentResourceMonitorSwitch,
  formatResourceMonitorSwitchAge,
  buildWhitelistMonitorTimeline,
  prepareWhitelistFallbackConfig,
  prepareWhitelistMonitorDisable,
  removeWhitelistFallbackConfig,
  isWhitelistFallbackConfigActive,
  applyNodeProviderRule,
  parseGroups,
  parseRules,
  parseProviders,
  readConnectionSettings,
  renderChangesJumpButton,
  renderConfigurationEditorControls,
  renderOutputOnly,
  renderConnectionSettings,
  renameGroup,
  addRule,
  moveRule,
  removeGroup,
  removeRule,
  removeProvider,
  undoLastRemoval,
  snapshotGroup,
  snapshotRule,
  snapshotProvider,
  setOutputText,
  setProviderUrlMasking,
  showMihuiUpdateProgress,
  createYamlCodeLine,
  splitYamlHttpUrls,
  findYamlHttpUrlAtOffset,
  handleConfigurationUrlClick,
  splitLines,
  moveGroupProxy,
  orderNodeGroupSelectionGroups,
  toggleGroupProxy,
  toggleGroupUse,
  updateGroup,
  updateRule,
  updateProvider,
  updateProviderNameDraft,
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
  const rulesSection = app.findTopSection(lines, 'rules');

  app.state.originalText = yaml;
  app.state.hasProvidersSection = Boolean(providersSection);
  app.state.hasGroupsSection = Boolean(groupsSection);
  app.state.hasRulesSection = Boolean(rulesSection);
  app.state.providers = providersSection ? app.parseProviders(lines, providersSection) : [];
  app.state.groups = groupsSection ? app.parseGroups(lines, groupsSection) : [];
  app.state.rules = rulesSection ? app.parseRules(lines, rulesSection) : [];
  app.state.originalConnectionSettings = app.readConnectionSettings(lines);
  app.state.connectionSettings = Object.fromEntries(
    Object.entries(app.state.originalConnectionSettings).map(([key, setting]) => [key, { ...setting }]),
  );
  app.state.originalProviders = app.state.providers.map(app.snapshotProvider);
  app.state.originalGroups = app.state.groups.map(app.snapshotGroup);
  app.state.originalRules = app.state.rules.map(app.snapshotRule);

  return app.state.providers.filter((provider) => !provider.deleted);
}

function flattenChanges(changes) {
  return changes.flatMap((section) => section.items);
}

for (const source of SOURCES) {
  test(`${source.name}: shows the current MihUI update step and download percentage`, () => {
    const app = loadApp(source);

    app.showMihuiUpdateProgress({ phase: 'extract', progress: 100 });

    const [heading, list] = app.els.messageBox.children;
    assert.equal(heading.textContent, 'MihUI обновляется');
    assert.equal(list.children.length, 3);
    assert.match(list.children[0].className, /is-complete/);
    assert.match(list.children[1].className, /is-current/);
    assert.match(list.children[2].className, /is-pending/);
    assert.equal(list.children[0].children[2].textContent, '100%');
  });

  test(`${source.name}: prepares resource monitoring groups and inserts rules before MATCH`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  main:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: FASTEST
    type: url-test
    use:
      - main
    filter: "(?i)nl|de"
    exclude-filter: "(?i)expired"
  - name: PROXY
    type: select
    proxies:
      - FASTEST
rules:
  - RULE-SET,category-gov-ru@domain,DIRECT
  - RULE-SET,netbios@inline,REJECT
  - MATCH,PROXY
`);

    app.prepareResourceMonitorConfig({
      youtube: 'FASTEST',
      telegram: 'FASTEST',
      whatsapp: 'FASTEST',
      instagram: 'FASTEST',
      ai: 'FASTEST',
    });

    const output = app.state.outputText;
    assert.match(output, /profile:\n  store-selected: true/);
    assert.match(output, /name: YOUTUBE # webmihomo-monitor: group youtube source=FASTEST/);
    assert.match(output, /name: INSTAGRAM # webmihomo-monitor: group instagram source=FASTEST/);
    assert.match(output, /name: AI # webmihomo-monitor: group ai source=FASTEST/);
    assert.match(output, /filter: ["']?\(\?i\)nl\|de/);
    assert.match(output, /exclude-filter: ["']?\(\?i\)expired/);
    assert.match(output, /RULE-SET,category-gov-ru@domain,DIRECT/);
    assert.match(output, /RULE-SET,netbios@inline,REJECT/);
    assert.doesNotMatch(output, /RULE-SET,"[^"]+@[^"]+"/);
    assert.ok(output.indexOf('GEOSITE,youtube,YOUTUBE') < output.indexOf('MATCH,PROXY'));
    assert.match(output, /instagram@domain: \{ type: http, format: mrs, behavior: domain, interval: 86400, url: "https:\/\/raw\.githubusercontent\.com\/MetaCubeX\/meta-rules-dat\/meta\/geo\/geosite\/instagram\.mrs" \} # webmihomo-monitor: provider instagram/);
    assert.match(output, /openai@domain: \{ type: http, format: mrs, behavior: domain, interval: 86400, url: "https:\/\/raw\.githubusercontent\.com\/MetaCubeX\/meta-rules-dat\/meta\/geo\/geosite\/openai\.mrs" \} # webmihomo-monitor: provider ai/);
    assert.match(output, /anthropic@domain: \{ type: http, format: mrs, behavior: domain, interval: 86400, url: "https:\/\/raw\.githubusercontent\.com\/MetaCubeX\/meta-rules-dat\/meta\/geo\/geosite\/anthropic\.mrs" \} # webmihomo-monitor: provider ai/);
    assert.ok(output.indexOf('RULE-SET,instagram@domain,INSTAGRAM') < output.indexOf('MATCH,PROXY'));
    assert.doesNotMatch(output, /GEOSITE,telegram,TELEGRAM/);
    assert.ok(output.indexOf('DOMAIN-SUFFIX,telegram.org,TELEGRAM') < output.indexOf('MATCH,PROXY'));
    assert.ok(output.indexOf('GEOIP,telegram,TELEGRAM,no-resolve') < output.indexOf('MATCH,PROXY'));
    assert.ok(output.indexOf('RULE-SET,openai@domain,AI') < output.indexOf('MATCH,PROXY'));
    assert.ok(output.indexOf('RULE-SET,anthropic@domain,AI') < output.indexOf('MATCH,PROXY'));
    assert.doesNotMatch(output, /GEOSITE,instagram,INSTAGRAM|DOMAIN-SUFFIX,(?:chatgpt\.com|anthropic\.com),AI/);
    assert.equal(app.resourceMonitorNeedsConfigChanges(), false);

    const before = output;
    app.prepareResourceMonitorConfig({
      youtube: 'FASTEST',
      telegram: 'FASTEST',
      whatsapp: 'FASTEST',
      instagram: 'FASTEST',
      ai: 'FASTEST',
    });
    assert.equal(app.state.outputText, before);
  });

  test(`${source.name}: migrates managed AI rules to MetaCubeX rule providers`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: FASTEST
    type: url-test
    proxies:
      - node-a
  - name: INSTAGRAM # webmihomo-monitor: group instagram source=FASTEST
    type: select
    proxies:
      - node-a
  - name: AI # webmihomo-monitor: group ai source=FASTEST
    type: select
    proxies:
      - node-a
rule-providers:
  yandex@domain: { type: http, format: mrs, behavior: domain, interval: 86400, url: https://example.com/yandex.mrs }
rules:
  - DOMAIN-SUFFIX,chatgpt.com,AI # webmihomo-monitor: ai
  - DOMAIN-SUFFIX,openai.com,AI # webmihomo-monitor: ai
  - DOMAIN-SUFFIX,oaistatic.com,AI # webmihomo-monitor: ai
  - DOMAIN-SUFFIX,oaiusercontent.com,AI # webmihomo-monitor: ai
  - DOMAIN-SUFFIX,claude.ai,AI # webmihomo-monitor: ai
  - DOMAIN-SUFFIX,claude.com,AI # webmihomo-monitor: ai
  - DOMAIN-SUFFIX,anthropic.com,AI # webmihomo-monitor: ai
  - GEOSITE,instagram,INSTAGRAM # webmihomo-monitor: instagram
  - DOMAIN-SUFFIX,user-ai.example,AI
  - MATCH,FASTEST
`);
    const sources = {
      youtube: [],
      telegram: [],
      whatsapp: [],
      instagram: ['FASTEST'],
      ai: ['FASTEST'],
    };
    const services = {
      youtube: { enabled: false, group: 'YOUTUBE', sources: [] },
      telegram: { enabled: false, group: 'TELEGRAM', sources: [] },
      whatsapp: { enabled: false, group: 'WHATSAPP', sources: [] },
      instagram: { enabled: true, group: 'INSTAGRAM', sources: sources.instagram },
      ai: { enabled: true, group: 'AI', sources: sources.ai },
    };

    app.prepareResourceMonitorConfig(sources, services);

    const output = app.state.outputText;
    assert.match(output, /RULE-SET,instagram@domain,INSTAGRAM # webmihomo-monitor: instagram/);
    assert.match(output, /RULE-SET,openai@domain,AI # webmihomo-monitor: ai/);
    assert.match(output, /RULE-SET,anthropic@domain,AI # webmihomo-monitor: ai/);
    assert.match(output, /DOMAIN-SUFFIX,user-ai\.example,AI/);
    assert.match(output, /yandex@domain: \{ type: http/);
    assert.doesNotMatch(output, /GEOSITE,instagram,INSTAGRAM|DOMAIN-SUFFIX,(?:chatgpt\.com|openai\.com|oaistatic\.com|oaiusercontent\.com|claude\.ai|claude\.com|anthropic\.com),AI # webmihomo-monitor: ai/);
    assert.equal((output.match(/openai@domain:/g) || []).length, 1);
    assert.equal((output.match(/anthropic@domain:/g) || []).length, 1);
    assert.equal((output.match(/instagram@domain:/g) || []).length, 1);
    assert.equal(app.resourceMonitorNeedsConfigChanges(sources, services), false);

    app.prepareResourceMonitorConfig(sources, services);
    assert.equal(app.state.outputText, output);
  });

  test(`${source.name}: keeps only enabled resource routing in the config`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  main:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: FASTEST
    type: url-test
    use:
      - main
  - name: PROXY
    type: select
    proxies:
      - FASTEST
rules:
  - MATCH,PROXY
`);
    const sources = {
      youtube: 'FASTEST',
      telegram: 'FASTEST',
      whatsapp: 'FASTEST',
      instagram: 'FASTEST',
      ai: 'FASTEST',
    };
    const services = {
      youtube: { enabled: true, group: 'YOUTUBE' },
      telegram: { enabled: false, group: 'TELEGRAM' },
      whatsapp: { enabled: false, group: 'WHATSAPP' },
      instagram: { enabled: false, group: 'INSTAGRAM' },
      ai: { enabled: false, group: 'AI' },
    };

    app.prepareResourceMonitorConfig(sources);
    app.prepareResourceMonitorConfig(sources, services);

    const output = app.state.outputText;
    assert.match(output, /name: YOUTUBE # webmihomo-monitor: group youtube source=FASTEST/);
    assert.match(output, /GEOSITE,youtube,YOUTUBE/);
    assert.doesNotMatch(output, /name: TELEGRAM|name: WHATSAPP|name: INSTAGRAM|name: AI/);
    assert.doesNotMatch(output, /,TELEGRAM(?:,|$)|,WHATSAPP(?:,|$)|,INSTAGRAM(?:,|$)|,AI(?:,|$)/m);
    assert.ok(output.indexOf('GEOSITE,youtube,YOUTUBE') < output.indexOf('MATCH,PROXY'));
    assert.equal(app.resourceMonitorNeedsConfigChanges(sources, services), false);

    const disabledServices = Object.fromEntries(
      Object.entries(services).map(([key, service]) => [
        key,
        { ...service, enabled: false },
      ]),
    );
    app.prepareResourceMonitorConfig(sources, disabledServices);

    const disabledOutput = app.state.outputText;
    assert.doesNotMatch(disabledOutput, /name: YOUTUBE|name: TELEGRAM|name: WHATSAPP|name: INSTAGRAM|name: AI/);
    assert.doesNotMatch(disabledOutput, /webmihomo-monitor/);
    assert.match(disabledOutput, /MATCH,PROXY/);
    assert.equal(app.resourceMonitorNeedsConfigChanges(sources, disabledServices), false);
    assert.equal(app.getResourceMonitorDialogIssue(sources, disabledServices), '');
  });

  test(`${source.name}: preserves user-owned resource routing when monitoring is disabled`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: FASTEST
    type: url-test
    proxies:
      - node-a
  - name: YOUTUBE
    type: select
    proxies:
      - FASTEST
  - name: PROXY
    type: select
    proxies:
      - FASTEST
rules:
  - GEOSITE,youtube,YOUTUBE
  - MATCH,PROXY
`);
    const disabledServices = {
      youtube: { enabled: false, group: 'YOUTUBE' },
      telegram: { enabled: false, group: 'TELEGRAM' },
      whatsapp: { enabled: false, group: 'WHATSAPP' },
      instagram: { enabled: false, group: 'INSTAGRAM' },
      ai: { enabled: false, group: 'AI' },
    };

    app.prepareResourceMonitorConfig({}, disabledServices);

    assert.match(app.state.outputText, /name: YOUTUBE/);
    assert.match(app.state.outputText, /GEOSITE,youtube,YOUTUBE/);
    assert.doesNotMatch(app.state.outputText, /webmihomo-monitor/);
    assert.equal(app.resourceMonitorNeedsConfigChanges({}, disabledServices), false);
  });

  test(`${source.name}: global resource monitor switch prepares full config cleanup`, async () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: FASTEST
    type: url-test
    proxies:
      - node-a
  - name: PROXY
    type: select
    proxies:
      - FASTEST
rules:
  - MATCH,PROXY
`);
    const sources = {
      youtube: ['FASTEST'],
      telegram: ['FASTEST'],
      whatsapp: ['FASTEST'],
      instagram: ['FASTEST'],
      ai: ['FASTEST'],
    };
    const services = Object.fromEntries(
      Object.entries(sources).map(([key, selected]) => [
        key,
        { enabled: true, group: key === 'ai' ? 'AI' : key.toUpperCase(), sources: selected },
      ]),
    );
    app.prepareResourceMonitorConfig(sources, services);
    app.state.resourceMonitor.config = { enabled: true, services };
    app.els.resourceMonitorEnabled.checked = false;

    await app.toggleResourceMonitor();

    assert.equal(app.els.resourceMonitorEnabled.checked, true);
    assert.equal(app.state.resourceMonitor.pendingSettings.enabled, false);
    assert.doesNotMatch(app.state.outputText, /webmihomo-monitor/);
    assert.doesNotMatch(app.state.outputText, /name: YOUTUBE|name: TELEGRAM|name: WHATSAPP|name: INSTAGRAM|name: AI/);
    assert.match(app.state.outputText, /MATCH,PROXY/);
  });

  test(`${source.name}: combines several resource monitoring source groups`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  main:
    type: http
    url: https://example.com/main
  backup:
    type: http
    url: https://example.com/backup
proxy-groups:
  - name: FASTEST
    type: url-test
    use:
      - main
    filter: "(?i)nl|de"
  - name: FALLBACK
    type: fallback
    use:
      - main
      - backup
    filter: "(?i)fi|kz"
  - name: PROXY
    type: select
    proxies:
      - FASTEST
      - FALLBACK
rules:
  - MATCH,PROXY
`);
    const sources = {
      youtube: ['FASTEST', 'FALLBACK'],
      telegram: [],
      whatsapp: [],
      instagram: [],
      ai: [],
    };
    const services = {
      youtube: { enabled: true, group: 'YOUTUBE', sources: sources.youtube },
      telegram: { enabled: false, group: 'TELEGRAM', sources: [] },
      whatsapp: { enabled: false, group: 'WHATSAPP', sources: [] },
      instagram: { enabled: false, group: 'INSTAGRAM', sources: [] },
      ai: { enabled: false, group: 'AI', sources: [] },
    };

    app.prepareResourceMonitorConfig(sources, services);

    const target = app.state.groups.find((group) => group.name === 'YOUTUBE');
    assert.deepEqual(Array.from(target.monitorSourceGroups), ['FASTEST', 'FALLBACK']);
    assert.deepEqual(Array.from(target.use), ['main', 'backup']);
    assert.equal(target.filter, '');
    assert.match(
      app.state.outputText,
      /name: YOUTUBE # webmihomo-monitor: group youtube sources=FASTEST,FALLBACK/,
    );
    assert.equal(app.resourceMonitorNeedsConfigChanges(sources, services), false);

    const reparsed = loadApp(source);
    hydrate(reparsed, app.state.outputText);
    assert.deepEqual(
      Array.from(reparsed.state.groups.find((group) => group.name === 'YOUTUBE').monitorSourceGroups),
      ['FASTEST', 'FALLBACK'],
    );
  });

  test(`${source.name}: expands a parent resource monitoring group`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  main:
    type: http
    url: https://example.com/main
  backup:
    type: http
    url: https://example.com/backup
proxy-groups:
  - name: FASTEST
    type: url-test
    use:
      - main
  - name: FALLBACK
    type: fallback
    use:
      - backup
  - name: WHITE-RU
    type: select
    proxies:
      - white-node
  - name: PROXY
    type: fallback
    proxies:
      - FASTEST
      - FALLBACK
      - WHITE-RU
rules:
  - MATCH,PROXY
`);
    const sources = {
      youtube: ['PROXY'],
      telegram: [],
      whatsapp: [],
      instagram: [],
      ai: [],
    };
    const services = {
      youtube: { enabled: true, group: 'YOUTUBE', sources: sources.youtube },
      telegram: { enabled: false, group: 'TELEGRAM', sources: [] },
      whatsapp: { enabled: false, group: 'WHATSAPP', sources: [] },
      instagram: { enabled: false, group: 'INSTAGRAM', sources: [] },
      ai: { enabled: false, group: 'AI', sources: [] },
    };

    assert.ok(app.getResourceMonitorSourceGroups().some((group) => group.name === 'PROXY'));
    app.prepareResourceMonitorConfig(sources, services);

    const target = app.state.groups.find((group) => group.name === 'YOUTUBE');
    assert.deepEqual(Array.from(target.monitorSourceGroups), ['PROXY']);
    assert.deepEqual(Array.from(target.use), ['main', 'backup']);
    assert.deepEqual(Array.from(target.proxies), ['white-node']);
    assert.match(
      app.state.outputText,
      /name: YOUTUBE # webmihomo-monitor: group youtube source=PROXY/,
    );
  });

  test(`${source.name}: prepares and removes a reversible whitelist fallback`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  main:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: PROXY
    type: select
    use:
      - main
rules:
  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
  - DOMAIN,plex.tv,DIRECT
  - DOMAIN-SUFFIX,plex.direct,DIRECT
  - DOMAIN-SUFFIX,ru,DIRECT
  - RULE-SET,yandex@domain,DIRECT
  - GEOIP,RU,DIRECT
  - MATCH,PROXY
`);
    const settings = {
      proxyGroup: 'PROXY',
      positiveEndpoints: [
        { id: 'allowed-ya', name: 'Яндекс', url: 'https://ya.ru/', enabled: true },
        { id: 'allowed-gosuslugi', name: 'Госуслуги', url: 'https://www.gosuslugi.ru/', enabled: true },
      ],
    };

    app.prepareWhitelistFallbackConfig(settings);

    const output = app.state.outputText;
    const catchAll = output.indexOf('MATCH,PROXY # webmihomo-whitelist: catch-all');
    assert.ok(output.indexOf('IP-CIDR,192.168.0.0/16,DIRECT') < catchAll);
    assert.ok(output.indexOf('DOMAIN,plex.tv,DIRECT') < catchAll);
    assert.ok(output.indexOf('DOMAIN-SUFFIX,plex.direct,DIRECT') < catchAll);
    assert.ok(output.indexOf('DOMAIN-SUFFIX,ya.ru,DIRECT # webmihomo-whitelist: direct ya.ru') < catchAll);
    assert.ok(output.indexOf('DOMAIN-SUFFIX,www.gosuslugi.ru,DIRECT # webmihomo-whitelist: direct www.gosuslugi.ru') < catchAll);
    assert.ok(catchAll < output.indexOf('DOMAIN-SUFFIX,ru,DIRECT'));
    assert.ok(catchAll < output.indexOf('RULE-SET,yandex@domain,DIRECT'));
    assert.ok(catchAll < output.indexOf('GEOIP,RU,DIRECT'));
    assert.equal(app.isWhitelistFallbackConfigActive(), true);

    app.prepareWhitelistMonitorDisable(settings);

    assert.doesNotMatch(app.state.outputText, /webmihomo-whitelist:/);
    assert.equal((app.state.outputText.match(/MATCH,PROXY/g) || []).length, 1);
    assert.match(app.state.outputText, /DOMAIN-SUFFIX,ru,DIRECT/);
    assert.equal(app.isWhitelistFallbackConfigActive(), false);
    assert.equal(app.state.whitelistMonitor.pendingSettings.enabled, false);
  });

  test(`${source.name}: builds a 24-hour whitelist state timeline from state changes`, () => {
    const app = loadApp(source);
    const now = Date.UTC(2026, 6, 25, 12, 0, 0);
    const start = now - 24 * 60 * 60 * 1000;
    const at = (offsetHours) => Math.floor((start + offsetHours * 60 * 60 * 1000) / 1000);
    const timeline = app.buildWhitelistMonitorTimeline([
      { type: 'normal', timestamp: at(-1) },
      { type: 'suspected', timestamp: at(16) },
      { type: 'confirmed', timestamp: at(19) },
      { type: 'normal', timestamp: at(22) },
    ], {
      state: 'normal',
      checkedAt: at(23.9),
    }, now);
    const counts = timeline.reduce((result, item) => {
      result[item.state] = (result[item.state] || 0) + 1;
      return result;
    }, {});

    assert.equal(timeline.length, 24);
    assert.deepEqual(
      JSON.parse(JSON.stringify(counts)),
      { normal: 18, disputed: 3, confirmed: 3 },
    );
    assert.equal(timeline[23].state, 'normal');
  });

  test(`${source.name}: keeps the most serious state seen within an hour`, () => {
    const app = loadApp(source);
    const now = Date.UTC(2026, 6, 25, 12, 0, 0);
    const start = now - 60 * 60 * 1000;
    const timeline = app.buildWhitelistMonitorTimeline([
      { type: 'normal', timestamp: Math.floor((start - 1000) / 1000) },
      { type: 'confirmed', timestamp: Math.floor((start + 10 * 60 * 1000) / 1000) },
      { type: 'normal', timestamp: Math.floor((start + 20 * 60 * 1000) / 1000) },
    ], null, now, 1);

    assert.equal(timeline[0].state, 'confirmed');
  });

  test(`${source.name}: builds resource history and marks node switches`, () => {
    const app = loadApp(source);
    const now = Date.UTC(2026, 6, 25, 12, 0, 0);
    const start = now - 24 * 60 * 60 * 1000;
    const at = (offsetHours) => Math.floor((start + offsetHours * 60 * 60 * 1000) / 1000);
    const timeline = app.buildResourceMonitorTimeline([
      { service: 'youtube', type: 'recovered', timestamp: at(-1) },
      { service: 'youtube', type: 'failure', timestamp: at(10) },
      { service: 'youtube', type: 'switch', timestamp: at(11) },
      { service: 'youtube', type: 'unavailable', timestamp: at(15) },
      { service: 'youtube', type: 'recovered', timestamp: at(17) },
      { service: 'ai', type: 'failure', timestamp: at(12) },
    ], {
      state: 'available',
      checkedAt: at(23.9),
    }, 'youtube', now);
    const counts = timeline.reduce((result, item) => {
      result[item.state] = (result[item.state] || 0) + 1;
      return result;
    }, {});

    assert.equal(timeline.length, 24);
    assert.deepEqual(
      JSON.parse(JSON.stringify(counts)),
      { available: 21, warning: 1, error: 2 },
    );
    assert.equal(timeline[11].hasSwitch, true);
    assert.equal(timeline[11].state, 'available');
    assert.equal(timeline[12].hasSwitch, false);
    assert.equal(timeline[11].events[0].type, 'switch');
  });

  test(`${source.name}: stops carrying a warning after recovery in a new interval`, () => {
    const app = loadApp(source);
    const now = Date.UTC(2026, 6, 25, 12, 0, 0);
    const start = now - 60 * 60 * 1000;
    const at = (offsetMinutes) => Math.floor((start + offsetMinutes * 60 * 1000) / 1000);
    const [item] = app.buildResourceMonitorTimeline([
      { service: 'youtube', type: 'failure', timestamp: at(-10) },
      {
        service: 'youtube',
        type: 'recovered',
        timestamp: at(10),
        message: 'YouTube снова доступен',
      },
    ], null, 'youtube', now, 1);
    const tooltip = app.getResourceMonitorHistoryTooltipContent({ title: 'YouTube' }, item);

    assert.equal(item.state, 'available');
    assert.deepEqual(
      JSON.parse(JSON.stringify(item.events.map((event) => event.type))),
      ['recovered'],
    );
    assert.match(tooltip.eventLines[0], /YouTube снова доступен$/);
  });

  test(`${source.name}: keeps the serious resource state when a switch succeeds in the same hour`, () => {
    const app = loadApp(source);
    const now = Date.UTC(2026, 6, 25, 12, 0, 0);
    const start = now - 60 * 60 * 1000;
    const at = (offsetMinutes) => Math.floor((start + offsetMinutes * 60 * 1000) / 1000);
    const timeline = app.buildResourceMonitorTimeline([
      { service: 'ai', type: 'failure', timestamp: at(10) },
      { service: 'ai', type: 'switch', timestamp: at(15) },
    ], null, 'ai', now, 1);

    assert.equal(timeline[0].state, 'warning');
    assert.equal(timeline[0].hasSwitch, true);
  });

  test(`${source.name}: describes latency and node changes in the resource history tooltip`, () => {
    const app = loadApp(source);
    const now = Date.UTC(2026, 6, 25, 12, 0, 0);
    const start = now - 60 * 60 * 1000;
    const at = (offsetMinutes) => Math.floor((start + offsetMinutes * 60 * 1000) / 1000);
    const [item] = app.buildResourceMonitorTimeline([
      {
        service: 'youtube',
        type: 'high_latency',
        timestamp: at(10),
        message: 'Высокая задержка: 826 мс (2/2)',
        node: 'Амстердам',
        delay: 826,
        threshold: 400,
      },
      {
        service: 'youtube',
        type: 'switch',
        timestamp: at(12),
        message: 'Нода переключена: Амстердам → Финляндия',
        previousNode: 'Амстердам',
        node: 'Финляндия',
        delay: 44,
        previousDelay: 826,
        threshold: 400,
        reason: 'Высокая задержка: 826 мс',
      },
    ], null, 'youtube', now, 1);
    const tooltip = app.getResourceMonitorHistoryTooltipContent({ title: 'YouTube' }, item);

    assert.equal(tooltip.state, 'warning');
    assert.equal(tooltip.node, 'Амстердам → Финляндия');
    assert.equal(tooltip.delay, 'до смены 826 мс · лимит 400 мс · после 44 мс');
    assert.equal(tooltip.reason, 'Высокая задержка: 826 мс');
    assert.equal(tooltip.eventLines.length, 2);
    assert.match(tooltip.eventLines[0], /Высокая задержка: 826 мс \(2\/2\)$/);
    assert.match(tooltip.eventLines[1], /Нода переключена: Амстердам → Финляндия$/);
  });

  test(`${source.name}: expires the compact switch note after two hours`, () => {
    const app = loadApp(source);
    const now = 10_000;

    assert.equal(app.isRecentResourceMonitorSwitch({ lastSwitch: { at: now - 7199 } }, now), true);
    assert.equal(app.isRecentResourceMonitorSwitch({ lastSwitch: { at: now - 7200 } }, now), false);
    assert.equal(app.formatResourceMonitorSwitchAge(now - 60, now), '1 мин назад');
  });

  test(`${source.name}: enables selection persistence without changing profile siblings`, () => {
    const app = loadApp(source);
    hydrate(app, `
profile:
  store-selected: false
  store-fake-ip: true
proxy-providers:
  main:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: FASTEST
    type: url-test
    use:
      - main
rules:
  - MATCH,FASTEST
`);

    app.prepareResourceMonitorConfig({
      youtube: 'FASTEST',
      telegram: 'FASTEST',
      whatsapp: 'FASTEST',
      instagram: 'FASTEST',
      ai: 'FASTEST',
    });

    assert.match(app.state.outputText, /profile:\n  store-selected: true\n  store-fake-ip: true/);
    assert.equal((app.state.outputText.match(/store-selected:/g) || []).length, 1);
  });

  test(`${source.name}: detects providers without a successful update after the configured interval`, () => {
    const app = loadApp(source);
    const providers = hydrate(app, `
proxy-providers:
  stale:
    type: http
    url: https://stale.example/sub
    interval: 3600
  recent:
    type: http
    url: https://recent.example/sub
    interval: 3600
  manual:
    type: http
    url: https://manual.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - stale
      - recent
      - manual
`);
    const now = Date.UTC(2026, 6, 23, 12, 0);
    app.state.providerStatuses = {
      stale: { name: 'stale', updatedAt: new Date(now - (3 * 3600 + 30 * 60) * 1000).toISOString() },
      recent: { name: 'recent', updatedAt: new Date(now - (3600 + 14 * 60) * 1000).toISOString() },
      manual: { name: 'manual', updatedAt: new Date(now - 7 * 86400 * 1000).toISOString() },
    };

    const stale = app.getStaleProviderInfo(providers[0], now);
    assert.equal(stale.intervalCount, 3);
    assert.equal(stale.updatedAt, app.state.providerStatuses.stale.updatedAt);
    assert.equal(app.getStaleProviderInfo(providers[1], now), null);
    assert.equal(app.getStaleProviderInfo(providers[2], now), null);
    const attention = app.getProviderAttentionItem(providers[0], now);
    assert.equal(attention.severity, 'warning');
    assert.match(attention.title, /stale/);
    assert.match(attention.text, /3 интервала/);
  });

  test(`${source.name}: reports expiring, traffic-limited and empty active providers`, () => {
    const app = loadApp(source);
    const providers = hydrate(app, `
proxy-providers:
  limited:
    type: http
    url: https://limited.example/sub
    interval: 3600
  empty:
    type: http
    url: https://empty.example/sub
    interval: 3600
  unused:
    type: http
    url: https://unused.example/sub
    interval: 3600
proxy-groups:
  - name: Proxy
    type: select
    use:
      - limited
      - empty
`);
    const now = Date.UTC(2026, 6, 23, 12, 0);
    const gibibyte = 1024 ** 3;
    app.state.providerStatuses = {
      limited: {
        name: 'limited',
        proxyCount: 2,
        subscriptionInfo: {
          Upload: 20 * gibibyte,
          Download: 72 * gibibyte,
          Total: 100 * gibibyte,
          Expire: Math.floor((now + 2 * 86400 * 1000) / 1000),
        },
      },
      empty: { name: 'empty', proxyCount: 0, subscriptionInfo: {} },
      unused: { name: 'unused', proxyCount: 0, subscriptionInfo: {} },
    };

    const limitedWarnings = app.getProviderRuntimeWarnings(providers[0], now);
    assert.equal(limitedWarnings.length, 2);
    assert.equal(limitedWarnings[0].severity, 'warning');
    assert.match(limitedWarnings[0].title, /скоро закончится/);
    assert.match(limitedWarnings[0].text, /осталось 2 дня/);
    assert.match(limitedWarnings[1].title, /заканчивается трафик/);
    assert.match(limitedWarnings[1].text, /Использовано 92%/);
    const limitedAttention = app.getProviderAttentionItem(providers[0], now);
    assert.equal(limitedAttention.severity, 'warning');
    assert.match(limitedAttention.text, /осталось 2 дня/);
    assert.match(limitedAttention.text, /Использовано 92%/);
    assert.equal(app.getProviderDisplayState(providers[0], now).label, 'Внимание');

    const emptyWarnings = app.getProviderRuntimeWarnings(providers[1], now);
    assert.equal(emptyWarnings.length, 1);
    assert.equal(emptyWarnings[0].severity, 'danger');
    assert.match(emptyWarnings[0].title, /не содержит нод/);
    assert.match(emptyWarnings[0].text, /Proxy/);
    assert.equal(app.getProviderAttentionItem(providers[1], now).severity, 'danger');
    assert.equal(app.getProviderDisplayState(providers[1], now).label, 'Критично');
    assert.equal(app.getProviderRuntimeWarnings(providers[2], now).length, 0);
    assert.equal(app.getProviderDisplayState(providers[2], now).label, 'Нет нод');

    app.state.providerStatuses.limited.subscriptionInfo.Expire = Math.floor((now - 86400 * 1000) / 1000);
    app.state.providerStatuses.limited.subscriptionInfo.Download = 82 * gibibyte;
    const exhaustedWarnings = app.getProviderRuntimeWarnings(providers[0], now);
    assert.equal(exhaustedWarnings[0].severity, 'danger');
    assert.equal(exhaustedWarnings[1].severity, 'danger');
    assert.match(exhaustedWarnings[0].title, /закончилась/);
    assert.match(exhaustedWarnings[1].title, /исчерпан/);
    assert.equal(app.getProviderAttentionItem(providers[0], now).severity, 'danger');
    assert.equal(app.getProviderDisplayState(providers[0], now).label, 'Критично');
  });

  test(`${source.name}: restores only the successful unchanged config check`, () => {
    const app = loadApp(source);
    app.state.routerApiAvailable = true;
    app.persistSuccessfulConfigCheck('current yaml');

    app.setOutputText('current yaml');
    assert.equal(app.state.lastConfigCheckOk, true);
    assert.equal(app.state.lastConfigCheckText, 'current yaml');

    app.setOutputText('changed yaml');
    assert.equal(app.state.lastConfigCheckOk, false);
    assert.equal(app.state.lastConfigCheckText, '');

    app.state.outputText = 'applied yaml';
    app.state.lastConfigCheckText = 'applied yaml';
    app.state.lastConfigCheckOk = true;
    app.setOutputText('applied yaml');
    assert.equal(app.state.lastConfigCheckOk, true);
    assert.equal(app.state.lastConfigCheckText, 'applied yaml');
    assert.deepEqual({ ...app.getKernelCheckSummary() }, {
      value: 'YAML принят',
      note: 'Текущий YAML принят Mihomo',
      variant: 'is-ok',
    });
  });

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

  test(`${source.name}: reports provider urls Mihomo cannot fetch directly`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxy-providers:
  happ:
    type: http
    url: happ://crypt5/demo-token
  incy:
    type: http
    url: incy://import/https%3A%2F%2Fexample.com%2Fsub
  node:
    type: http
    url: vless://user@example.com:443?security=tls#demo
  good:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - happ
      - incy
      - node
      - good
rules:
  - MATCH,Proxy
`);

    const diagnostics = app.collectDiagnostics(activeProviders);

    assert(diagnostics.includes('Подписка happ: happ://crypt* не является прямой подпиской Mihomo; расшифруйте ссылку кнопкой в редакторе.'));
    assert(diagnostics.includes('Подписка incy: incy://import не является прямой подпиской Mihomo; нужен helper или локальный adapter.'));
    assert(diagnostics.includes('Подписка node: vless:// — это ссылка узла, а не URL proxy-provider; нужен локальный adapter или добавление в proxies.'));
    assert.equal(diagnostics.some((item) => item.includes('Подписка good:')), false);
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

  test(`${source.name}: edits rule target and updates diagnostics`, () => {
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
rules:
  - DOMAIN-SUFFIX,example.com,Missing
  - MATCH,DIRECT
`);

    assert(app.collectDiagnostics(app.state.providers).includes('Rules: цель Missing не найдена среди групп, обычных proxies или встроенных выходов.'));

    app.updateRule(app.state.rules[0], 'target', 'Proxy');

    assert.match(app.state.outputText, /DOMAIN-SUFFIX,example\.com,Proxy/);
    assert.equal(app.collectDiagnostics(app.state.providers).some((item) => item.includes('Missing')), false);
  });

  test(`${source.name}: adds rules section when config has no rules`, () => {
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
`);

    app.addRule();
    app.updateRule(app.state.rules[0], 'value', 'example.com');

    assert.match(app.state.outputText, /rules:\n\s+- DOMAIN-SUFFIX,example\.com,Proxy/);
    assert(flattenChanges(app.collectChanges(app.state.providers)).includes('Будет добавлен раздел rules.'));
  });

  test(`${source.name}: moves and removes rules`, () => {
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
rules:
  - DOMAIN-SUFFIX,first.example,Proxy
  - DOMAIN-SUFFIX,second.example,Proxy
  - MATCH,DIRECT
`);

    app.moveRule(app.state.rules[1], -1);
    assert.match(app.state.outputText, /rules:\n\s+- DOMAIN-SUFFIX,second\.example,Proxy\n\s+- DOMAIN-SUFFIX,first\.example,Proxy/);

    app.removeRule(app.state.rules.find((rule) => rule.value === 'first.example'));
    assert.doesNotMatch(app.state.outputText, /first\.example/);
  });

  test(`${source.name}: summarizes rule order and selected rule status`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: Proxy
    type: select
    proxies:
      - DIRECT
rules:
  - IP-CIDR,192.168.0.0/16,DIRECT
  - MATCH,Proxy
`);

    assert.equal(app.getRulesOrderState(app.state.rules).status, 'ok');
    assert.equal(app.getRuleStatus(app.state.rules[1], 1, app.state.rules).status, 'ok');
    assert.match(app.describeRuleRouting(app.state.rules[1]), /не совпал с правилами выше/);

    app.moveRule(app.state.rules[1], -1);

    assert.equal(app.getRulesOrderState(app.state.rules).status, 'warning');
    assert.equal(app.getRuleStatus(app.state.rules[0], 0, app.state.rules).status, 'warning');
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

  test(`${source.name}: updates the topbar change count after an inline edit`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://old.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.state.providers[0].url = 'https://new.example/sub';
    app.generateOutput();
    app.renderOutputOnly();

    assert.equal(app.els.changesJumpButton.textContent, 'Изменения (1)');
  });

  test(`${source.name}: preserves optional http provider defaults until an explicit action`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://example.com/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,Proxy
`);

    assert.equal(app.countChanges(app.collectChanges(activeProviders)), 0);
    app.generateOutput();
    assert.doesNotMatch(app.state.outputText, /\n    interval:/);
    assert.doesNotMatch(app.state.outputText, /\n    health-check:/);
    assert.equal(app.countChanges(app.collectChanges(activeProviders)), 0);
  });

  test(`${source.name}: recognizes and preserves an unchanged selective Xray provider wrapper`, () => {
    const app = loadApp(source);
    const wrapper = 'http://127.0.0.1:9879/mihomo/xray/provider.yaml?provider=wrapped&url=https%3A%2F%2Fexample.com%2Fsub%3Ftoken%3Dabc';
    const providers = hydrate(app, `
proxy-providers:
  wrapped:
    type: http
    url: ${wrapper}
proxy-groups:
  - name: Proxy
    type: select
    use:
      - wrapped
rules:
  - MATCH,Proxy
`);

    assert.equal(providers[0].sourceFormat, 'xray-json');
    assert.equal(providers[0].url, 'https://example.com/sub?token=abc');
    assert.equal(app.getProviderOutputUrl(providers[0]), wrapper);
    app.generateOutput();
    assert.match(app.state.outputText, new RegExp(wrapper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test(`${source.name}: wraps only providers explicitly switched to Xray JSON`, () => {
    const app = loadApp(source);
    const providers = hydrate(app, `
proxy-providers:
  direct:
    type: http
    url: https://direct.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - direct
rules:
  - MATCH,Proxy
`);
    app.state.xrayProviderAdapterUrl = 'http://127.0.0.1:9888/mihomo/xray/provider.yaml';
    const converted = app.addProvider({
      name: 'converted',
      url: 'https://xray.example/config?token=secret',
      sourceFormat: 'xray-json',
      groupNames: ['Proxy'],
    });

    app.generateOutput();
    assert.match(app.state.outputText, /direct:\s*[\s\S]*?url: https:\/\/direct\.example\/sub/);
    assert.match(app.getProviderOutputUrl(converted), /^http:\/\/127\.0\.0\.1:9888\/mihomo\/xray\/provider\.yaml\?/);
    assert.match(app.getProviderOutputUrl(converted), /provider=converted/);
    assert.match(app.getProviderOutputUrl(converted), /url=https%3A%2F%2Fxray\.example%2Fconfig%3Ftoken%3Dsecret/);
    assert.equal(providers[0].sourceFormat, 'direct');
  });

  test(`${source.name}: reports Xray adapter outcomes without exposing technical URLs`, () => {
    const app = loadApp(source);

    assert.equal(
      app.formatProviderAdapterStatus({ mode: 'xray-json', state: 'partial', convertedCount: 2, sourceCount: 3, skippedCount: 1 }),
      '2 из 3 · пропущено 1',
    );
    assert.equal(
      app.formatProviderAdapterStatus({ mode: 'xray-json', state: 'error' }, 4),
      'Используется предыдущая версия',
    );
  });

  test(`${source.name}: preserves explicit empty and false provider fields during other edits`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://example.com/sub
    filter:
    path:
    interval:
    header:
      User-Agent:
    health-check:
      enable: true
      url: https://old.example/check
      interval:
    override:
      udp: false
      tfo: false
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,Proxy
`);
    const existing = activeProviders[0];

    app.generateOutput();
    assert.match(app.state.outputText, /\n    filter:\s*\n/);
    assert.match(app.state.outputText, /\n    path:\s*\n/);
    assert.match(app.state.outputText, /\n    interval:\s*\n/);
    assert.match(app.state.outputText, /\n      User-Agent:\s*\n/);
    assert.match(app.state.outputText, /\n      udp: false\s*\n/);
    assert.match(app.state.outputText, /\n      tfo: false\s*\n/);

    existing.excludeFilter = 'slow';
    existing.hasExcludeFilter = true;
    app.generateOutput();
    assert.match(app.state.outputText, /\n    exclude-filter: slow\s*\n/);
    assert.match(app.state.outputText, /\n    filter:\s*\n/);
    assert.match(app.state.outputText, /\n    path:\s*\n/);
    assert.match(app.state.outputText, /\n    interval:\s*\n/);
    assert.match(app.state.outputText, /\n      User-Agent:\s*\n/);
    assert.match(app.state.outputText, /\n      udp: false\s*\n/);
    assert.match(app.state.outputText, /\n      tfo: false\s*\n/);

    existing.healthUrl = 'https://new.example/check';
    app.generateOutput();
    assert.match(app.state.outputText, /\n      url: https:\/\/new\.example\/check\s*\n/);
    assert.match(app.state.outputText, /\n      interval:\s*\n/);

    existing.udp = true;
    app.generateOutput();
    assert.match(app.state.outputText, /\n      udp: true\s*\n/);
    assert.match(app.state.outputText, /\n      tfo: false\s*\n/);
  });

  test(`${source.name}: restores original field presence when an edit is reverted`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://example.com/sub
    filter:
    override:
      udp: false
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,Proxy
`);
    const existing = activeProviders[0];

    app.updateProvider(existing, 'filter', 'RU');
    app.updateProvider(existing, 'filter', '');
    app.updateProvider(existing, 'udp', true);
    app.updateProvider(existing, 'udp', false);

    assert.equal(app.countChanges(app.collectChanges(activeProviders)), 0);
    assert.match(app.state.outputText, /\n    filter:\s*\n/);
    assert.match(app.state.outputText, /\n      udp: false\s*\n/);
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

  test(`${source.name}: serializes custom provider headers`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://old.example/sub
    header:
      User-Agent: [OldAgent]
      x-hwid: [OLDHWID]
      X-Device: [old]
      X-Trace: trace-old
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    const existing = app.state.providers.find((provider) => provider.name === 'existing');
    assert.equal(existing.customHeaders, 'X-Device: old\nX-Trace: trace-old');

    existing.customHeaders = 'X-Device: new\nAccept-Language: ru-RU';
    app.generateOutput();

    assert.match(app.state.outputText, /      User-Agent: \[OldAgent\]/);
    assert.match(app.state.outputText, /      x-hwid: \[OLDHWID\]/);
    assert.match(app.state.outputText, /      X-Device: \["new"\]/);
    assert.match(app.state.outputText, /      Accept-Language: \["ru-RU"\]/);
    assert.doesNotMatch(app.state.outputText, /X-Trace/);
  });

  test(`${source.name}: preserves siblings in inline provider blocks`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://old.example/sub
    header: {User-Agent: OldAgent, x-hwid: KEEP, X-Custom: custom}
    override: {udp: false, tfo: true}
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);
    const existing = activeProviders[0];
    assert.equal(existing.userAgent, 'OldAgent');
    assert.equal(existing.xHwid, 'KEEP');
    assert.equal(existing.customHeaders, 'X-Custom: custom');
    assert.equal(existing.tfo, true);

    existing.userAgent = 'NewAgent';
    existing.udp = true;
    app.generateOutput();

    assert.match(app.state.outputText, /header: \{x-hwid: KEEP, X-Custom: custom, User-Agent: \["NewAgent"\]\}/);
    assert.match(app.state.outputText, /override: \{tfo: true, udp: true\}/);
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

  test(`${source.name}: keeps bulk interval drafts out of global changes before apply`, () => {
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

    assert.equal(changes.length, 0);
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

  test(`${source.name}: keeps provider creation transactional until commit`, () => {
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

    const providerCount = app.state.providers.length;
    const outputBefore = app.state.outputText;
    const proxy = app.state.groups.find((group) => group.name === 'Proxy');
    const useBefore = [...proxy.use];
    const draft = app.createProviderCreateDraft();

    assert.equal(app.state.providers.length, providerCount);
    assert.equal(app.state.outputText, outputBefore);
    assert.deepEqual([...proxy.use], useBefore);
    assert.equal(draft.groupNames.join('|'), 'Proxy');

    draft.url = 'https://new-provider.example/sub';
    draft.name = 'new-provider';
    draft.groupNames = [];
    const added = app.commitProviderCreateDraft(draft);

    assert.equal(added.name, 'new-provider');
    assert.equal(added.url, 'https://new-provider.example/sub');
    assert.equal(proxy.use.includes('new-provider'), false);
    assert.match(app.state.outputText, /  new-provider:/);
  });

  test(`${source.name}: validates provider creation source and name`, () => {
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

    assert.equal(app.getProviderCreateUrlError(''), 'Введите ссылку подписки.');
    assert.equal(app.getProviderCreateUrlError('ftp://example.com/sub'), 'Используйте http://, https://, happ:// или incy://.');
    assert.equal(app.getProviderCreateUrlError('https://example.com/sub'), '');
    assert.equal(app.getProviderCreateUrlError('happ://crypt-example'), '');
    assert.equal(app.getProviderCreateNameError('existing'), 'Подписка с таким названием уже существует.');
    assert.equal(app.getProviderCreateNameError('new-provider'), '');
  });

  test(`${source.name}: keeps provider editing transactional until save`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  existing:
    type: http
    url: https://existing.example/sub
  reserve:
    type: http
    url: https://reserve.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - existing
rules:
  - MATCH,DIRECT
`);

    app.generateOutput();
    const sourceProvider = app.state.providers.find((provider) => provider.name === 'existing');
    const group = app.state.groups.find((item) => item.name === 'Proxy');
    const outputBefore = app.state.outputText;
    const draft = app.createProviderEditDraft(sourceProvider);

    app.updateProvider(draft.provider, 'url', 'https://changed.example/sub');
    draft.provider.name = 'renamed';

    assert.equal(sourceProvider.name, 'existing');
    assert.equal(sourceProvider.url, 'https://existing.example/sub');
    assert.deepEqual([...group.use], ['existing']);
    assert.equal(app.state.outputText, outputBefore);
    assert.equal(app.getProviderEditNameError({ ...draft, provider: { ...draft.provider, name: 'reserve' } }), 'Подписка с таким названием уже существует.');

    const saved = app.commitProviderEditDraft(draft);

    assert.equal(saved.name, 'renamed');
    assert.equal(saved.url, 'https://changed.example/sub');
    assert.deepEqual([...group.use], ['renamed']);
    assert.match(app.state.outputText, /  renamed:/);
  });

  test(`${source.name}: reuses an empty pending provider instead of adding a duplicate`, () => {
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
    app.addProvider();

    assert.equal(app.state.providers.filter((provider) => provider.isNew && !provider.deleted).length, 1);
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

  test(`${source.name}: drafts provider rename without losing group use`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  old-name:
    type: http
    url: https://existing.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - old-name
rules:
  - MATCH,Proxy
`);

    const provider = app.state.providers.find((item) => item.name === 'old-name');
    const proxy = app.state.groups.find((group) => group.name === 'Proxy');
    app.state.selectedProviderName = provider.name;
    app.updateProviderNameDraft(provider, 'new-name', { querySelector: () => ({ textContent: '' }) });

    assert.equal(provider.name, 'new-name');
    assert.equal(app.state.selectedProviderName, 'new-name');
    assert.deepEqual([...proxy.use], ['new-name']);
    assert.match(app.state.outputText, /  new-name:/);
    assert.match(app.state.outputText, /      - new-name/);
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
    app.moveGroupProxy(proxy, 2, 1);
    app.toggleGroupUse(proxy, 'existing', false);

    assert.match(app.state.outputText, /  - name: Proxy\n    type: fallback\n    proxies:\n      - DIRECT\n      - Other\n      - REJECT\n    use: \[\]/);
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

  test(`${source.name}: reports group route usage`, () => {
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
      - Nested
  - name: Nested
    type: fallback
    use:
      - existing
rules:
  - MATCH,Proxy
`);

    const proxy = app.state.groups.find((group) => group.name === 'Proxy');
    const nested = app.state.groups.find((group) => group.name === 'Nested');

    const proxyUsage = app.getGroupUsage(proxy);
    const nestedUsage = app.getGroupUsage(nested);

    assert.equal(proxyUsage.used, true);
    assert.equal(proxyUsage.ruleCount, 1);
    assert.deepEqual([...proxyUsage.parentGroups], []);
    assert.equal(nestedUsage.used, true);
    assert.equal(nestedUsage.ruleCount, 0);
    assert.deepEqual([...nestedUsage.parentGroups], ['Proxy']);

    app.addGroup();
    const custom = app.state.groups.find((group) => group.isNew);

    assert.equal(app.getGroupUsage(custom).used, false);
  });

  test(`${source.name}: removes an unused group and restores it through undo`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: Proxy
    type: select
    proxies:
      - DIRECT
  - name: Unused
    type: fallback
    proxies:
      - DIRECT
rules:
  - MATCH,Proxy
`);

    const unused = app.state.groups.find((group) => group.name === 'Unused');
    app.removeGroup(unused);

    assert.equal(app.state.groups.some((group) => group.name === 'Unused'), false);
    assert.doesNotMatch(app.state.outputText, /name: Unused/);
    assert(flattenChanges(app.collectChanges(app.state.providers)).includes('Удалена группа Unused.'));

    app.undoLastRemoval();

    assert.equal(app.state.groups[1].name, 'Unused');
    assert.match(app.state.outputText, /  - name: Unused/);
  });

  test(`${source.name}: blocks removal of a referenced group`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: Proxy
    type: select
    proxies:
      - Nested
  - name: Nested
    type: fallback
    proxies:
      - DIRECT
rules:
  - MATCH,Proxy
`);

    const proxy = app.state.groups.find((group) => group.name === 'Proxy');
    const nested = app.state.groups.find((group) => group.name === 'Nested');
    app.generateOutput();
    const outputBefore = app.state.outputText;

    app.removeGroup(proxy);
    app.removeGroup(nested);

    assert.deepEqual([...app.state.groups.map((group) => group.name)], ['Proxy', 'Nested']);
    assert.equal(app.state.outputText, outputBefore);
  });

  test(`${source.name}: orders live group selections by main proxy sequence`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: PROXY
    type: fallback
    proxies:
      - FASTEST
      - FALLBACK
  - name: FALLBACK
    type: fallback
    proxies:
      - node-a
  - name: FASTEST
    type: url-test
    proxies:
      - node-b
`);

    const groups = app.state.groups.map((group) => ({ name: group.name, type: group.type }));
    const orderedNames = [...app.orderNodeGroupSelectionGroups(groups)].map((group) => group.name);
    assert.deepEqual(orderedNames, [
      'PROXY',
      'FASTEST',
      'FALLBACK',
    ]);
  });

  test(`${source.name}: enables runtime selection only for live select groups`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - node-a
      - node-b
  - name: AUTO
    type: url-test
    proxies:
      - node-a
      - node-b
`);
    app.state.mihomoGroupSelections = [
      { name: 'PROXY', type: 'Selector', now: 'node-a', all: ['node-a', 'node-b'] },
      { name: 'AUTO', type: 'URLTest', now: 'node-b', all: ['node-a', 'node-b'] },
    ];

    const items = app.getNodeGroupSelectionItems([]);
    const proxy = items.find((item) => item.groupName === 'PROXY');
    const auto = items.find((item) => item.groupName === 'AUTO');

    assert.deepEqual([...proxy.options], ['node-a', 'node-b']);
    assert.equal(app.isSelectableNodeGroup(proxy), true);
    assert.equal(app.isSelectableNodeGroup(auto), false);
  });

  test(`${source.name}: writes node-derived provider rules into yaml`, () => {
    const app = loadApp(source);
    const [provider] = hydrate(app, `
proxy-providers:
  AlphaNet:
    type: http
    url: https://alpha.example/sub
proxy-groups:
  - name: PROXY
    type: select
    use:
      - AlphaNet
rules:
  - MATCH,PROXY
`);

    app.applyNodeProviderRule(provider, 'filter', 'EU');
    app.applyNodeProviderRule(provider, 'excludeFilter', 'NL');
    app.applyNodeProviderRule(provider, 'excludeType', 'vless');

    assert.equal(provider.hasFilter, true);
    assert.equal(provider.hasExcludeFilter, true);
    assert.equal(provider.hasExcludeType, true);
    assert.match(app.state.outputText, /\n    filter: EU\s*\n/);
    assert.match(app.state.outputText, /\n    exclude-filter: NL\s*\n/);
    assert.match(app.state.outputText, /\n    exclude-type: vless\s*\n/);
  });

  test(`${source.name}: reports node rule impact, status and filtered totals`, () => {
    const app = loadApp(source);
    app.state.mihomoNodes = [
      { name: 'NL Amsterdam 01', provider: 'AlphaNet', type: 'VLESS', alive: true },
      { name: 'NL Amsterdam 02', provider: 'AlphaNet', type: 'TROJAN', alive: true },
      { name: 'DE Berlin', provider: 'AlphaNet', type: 'VLESS', alive: false },
      { name: 'No status', provider: 'BetaMesh', type: 'HTTP' },
    ];

    const nameImpact = app.getNodeNameRuleImpact('AlphaNet', 'NL');
    const protocolImpact = app.getNodeProtocolImpact('AlphaNet', 'vless');
    const invalidImpact = app.getNodeNameRuleImpact('AlphaNet', '[');
    const nodes = [
      { provider: 'AlphaNet', protocol: 'VLESS' },
      { provider: 'AlphaNet', protocol: 'TROJAN' },
      { provider: 'BetaMesh', protocol: 'HTTP' },
    ];

    assert.equal(nameImpact.matches.length, 2);
    assert.equal(nameImpact.total, 3);
    assert.equal(protocolImpact.matches.length, 2);
    assert.equal(invalidImpact.valid, false);
    assert.deepEqual({ ...app.getNodeInventoryStatusCounts(app.state.mihomoNodes) }, {
      availableCount: 2,
      unavailableCount: 1,
      unknownCount: 1,
    });
    assert.equal(
      app.getNodeInventorySummaryText(nodes, [nodes[0]]),
      'Ноды: 1 из 3 · Подписки: 1 из 2 · Протоколы: 1 из 3',
    );
  });

  test(`${source.name}: renames existing group references`, () => {
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
  - name: Service
    type: select
    proxies:
      - Proxy
rules:
  - DOMAIN-SUFFIX,example.com,Proxy
  - MATCH,Service
`);

    const proxy = app.state.groups.find((group) => group.name === 'Proxy');
    const service = app.state.groups.find((group) => group.name === 'Service');

    app.renameGroup(proxy, 'Primary');

    assert.equal(proxy.name, 'Primary');
    assert.deepEqual([...service.proxies], ['Primary']);
    assert.match(app.state.outputText, /  - name: Primary\n    type: select\n    proxies:\n      - DIRECT/);
    assert.match(app.state.outputText, /  - name: Service\n    type: select\n    proxies:\n      - Primary/);
    assert.match(app.state.outputText, /  - DOMAIN-SUFFIX,example.com,Primary/);
    assert.match(app.state.outputText, /  - MATCH,Service/);
    assert(flattenChanges(app.collectChanges(app.state.providers)).includes('Группа Proxy: переименована в Primary.'));
    assert.equal(app.getGroupUsage(proxy).used, true);
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

  test(`${source.name}: keeps the current YAML viewport when editing starts`, () => {
    const app = loadApp(source);
    app.state.outputText = Array.from({ length: 40 }, (_, index) => `line-${index}`).join('\n');
    app.els.outputCodeView.scrollTop = 240;
    app.els.outputCodeView.scrollLeft = 18;
    let selectionOffset = -1;
    app.els.outputPreview.setSelectionRange = (start) => {
      selectionOffset = start;
    };

    app.beginConfigurationEdit();

    assert.equal(app.els.outputPreview.scrollTop, 240);
    assert.equal(app.els.outputPreview.scrollLeft, 18);
    assert.equal(app.els.outputCodeView.scrollTop, 240);
    assert.equal(app.els.outputCodeView.scrollLeft, 18);
    assert.ok(selectionOffset > 0);
  });

  test(`${source.name}: keeps edited router yaml pending until it is saved`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: Proxy
    type: select
    proxies:
      - DIRECT
rules:
  - MATCH,DIRECT
`);
    const savedText = app.state.originalText;
    app.state.routerMode = true;
    app.state.routerSavedText = savedText;
    app.beginConfigurationEdit();
    app.els.outputPreview.value = savedText.replace('MATCH,DIRECT', 'MATCH,Proxy');

    assert.equal(app.applyConfigurationEdit(), true);
    assert.equal(app.state.routerSavedText, savedText);
    assert.equal(app.els.reviewChangeStatus.textContent, 'YAML изменён вручную');
    assert.deepEqual({ ...app.getRouterSaveState() }, {
      disabled: false,
      label: 'Проверить и сохранить',
      tone: 'primary',
    });
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

  test(`${source.name}: prioritizes a recoverable structural error`, () => {
    const app = loadApp(source);
    const activeProviders = hydrate(app, `
proxy-providers:
  broken:
    type: http
    url: https://broken.example/sub
`);

    const diagnostics = app.collectDiagnostics(activeProviders);
    assert.deepEqual([...diagnostics], ['Файл: отсутствует обязательный раздел proxy-groups.']);
    assert.equal(app.getDiagnosticSeverity(diagnostics[0]), 'error');
    assert.deepEqual({ ...app.getDiagnosticAction(diagnostics[0]) }, {
      type: 'open-config-file',
      label: 'Открыть другой файл',
    });
    assert.equal(app.getMissingConnectionSettings().length, 0);
    const providerCount = app.state.providers.length;
    app.addProvider();
    assert.equal(app.state.providers.length, providerCount);
  });

  test(`${source.name}: exports configuration with yaml filename`, () => {
    const app = loadApp(source);

    assert.equal(app.getExportFileName('/opt/etc/mihomo/config.yaml'), 'config.yaml');
    assert.equal(app.getExportFileName('profile.yml'), 'profile.yml');
    assert.equal(app.getExportFileName('router config'), 'router config.yaml');
    assert.equal(app.getExportFileName(''), 'mihomo-config.yaml');
  });

  test(`${source.name}: formats header and save states`, () => {
    const app = loadApp(source);

    assert.equal(app.getDisplayFileName('C:\\Users\\test\\config.yaml'), 'config.yaml');
    assert.equal(app.getDisplayFileName('/opt/etc/mihomo/config.yaml'), 'config.yaml');
    assert.equal(app.shouldShowRecommendations(2, 'overview'), false);
    assert.equal(app.shouldShowRecommendations(2, 'providers'), true);

    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: true, label: 'Нет конфигурации' });
    app.state.originalText = 'same';
    app.state.outputText = 'same';
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: true, label: 'Исправьте структуру' });
    app.state.hasGroupsSection = true;
    app.state.groups = [{ name: 'Proxy', type: 'select', proxies: ['DIRECT'], use: [], includeAll: false, includeAllProviders: false }];
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: false, label: 'Перейти к проверке' });
    app.state.isEditingConfiguration = true;
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: true, label: 'Завершите редактирование' });
    app.state.isEditingConfiguration = false;

    app.state.routerMode = true;
    app.state.routerSavedText = 'same';
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: true, label: 'Нет изменений' });
    app.state.outputText = 'changed';
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: false, label: 'Проверить и сохранить', tone: 'primary' });
    app.state.isEditingConfiguration = true;
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: true, label: 'Завершите редактирование' });
    app.state.isEditingConfiguration = false;
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: false, label: 'Проверить и сохранить', tone: 'primary' });

    app.state.routerApiAvailable = true;
    assert.deepEqual({ ...app.getReviewPrimaryActionState() }, { disabled: false, label: 'Проверить YAML в Mihomo' });
    app.state.lastConfigCheckText = app.state.outputText;
    app.state.lastConfigCheckOk = true;
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: false, label: 'Сохранить и применить', tone: 'primary' });
    assert.deepEqual({ ...app.getReviewPrimaryActionState() }, {
      disabled: false,
      label: 'Проверка пройдена · Проверить повторно',
      tone: 'success',
    });
    app.state.lastConfigCheckOk = false;
    assert.deepEqual({ ...app.getReviewPrimaryActionState() }, {
      disabled: false,
      label: 'Проверка не пройдена · Проверить повторно',
      tone: 'danger',
    });
    app.state.hasGroupsSection = false;
    assert.deepEqual({ ...app.getRouterSaveState() }, { disabled: false, label: 'Исправить ошибки', tone: 'danger' });
    app.renderConfigurationEditorControls();
    assert.equal(app.els.checkConfigButton.disabled, true);
  });

  test(`${source.name}: hides subscription URLs by default and preserves an explicit choice`, () => {
    const app = loadApp(source);

    assert.equal(app.state.hideProviderUrls, true);
    assert.equal(loadApp(source, { 'webmihomo.hideProviderUrls': 'false' }).state.hideProviderUrls, false);
    assert.equal(app.maskSensitiveUrl('https://example.test/sub?token=secret'), 'https://example.test/••••••');
    assert.equal(app.maskSensitiveUrl('https://example.test/sub#secret'), 'https://example.test/••••••');
    assert.equal(app.maskSensitiveUrl('https://example.test/s/private-token'), 'https://example.test/s/••••••');
    const yaml = `external-url: https://outside.example/path?keep=true
proxy-providers:
  secure:
    type: http
    url: "https://example.test/sub?token=secret#fragment"
    health-check:
      url: https://health.example/check?keep=true
  plain:
    type: http
    url: https://plain.example/sub/private-token
  block:
    type: http
    url: >-
      https://block.example/sub?token=block-secret
  escaped:
    type: http
    url: "https://escaped.example/sub\\u003Ftoken=escaped-secret"
  quoted:
    type: http
    "url": "https://quoted.example/sub?token=quoted-secret"
  indented-block:
    type: http
    url: >2-
      https://block-indent.example/sub?token=indent-secret
  flow: {type: http, url: "https://flow.example/sub?token=flow-secret"}
proxy-groups:
  - name: Proxy
    type: select
`;
    const maskedYaml = app.maskProviderUrlsInYaml(yaml);
    assert.match(maskedYaml, /url: "••••"/);
    assert.match(maskedYaml, /external-url: https:\/\/outside\.example\/path\?keep=true/);
    assert.match(maskedYaml, /url: https:\/\/health\.example\/check\?keep=true/);
    assert.doesNotMatch(maskedYaml, /private-token|block-secret|escaped-secret|quoted-secret|indent-secret|flow-secret/);
    assert.match(maskedYaml, /  flow: \{type: http, url: "••••"\}/);
    assert.match(maskedYaml, /    url: "••••"\n      ••••/);
    assert.equal(app.getOutputPreviewText(yaml), maskedYaml);
    app.setProviderUrlMasking(false);
    assert.equal(app.els.hideProviderUrlsSetting.checked, false);
    assert.equal(app.getOutputPreviewText(yaml), yaml);
    app.setProviderUrlMasking(true);
    assert.equal(app.els.hideProviderUrlsSetting.checked, true);
    assert.equal(app.getOutputPreviewText(yaml), maskedYaml);
    const topLevelFlow = 'proxy-providers: {secure: {type: http, url: "https://top.example/sub?token=top-secret"}}\nproxy-groups: []';
    const maskedTopLevelFlow = app.maskProviderUrlsInYaml(topLevelFlow);
    assert.doesNotMatch(maskedTopLevelFlow, /top-secret/);
    assert.match(maskedTopLevelFlow, /secure: \{type: http, url: "••••"\}/);
    const multilineFlow = `proxy-providers: {
  inline: {type: http, url: "https://multi.example/sub?token=multi-secret"},
  nested: {
    type: http,
    url: "https://nested.example/sub?token=nested-secret",
  },
}
proxy-groups: []`;
    const maskedMultilineFlow = app.maskProviderUrlsInYaml(multilineFlow);
    assert.doesNotMatch(maskedMultilineFlow, /multi-secret|nested-secret/);
    assert.match(maskedMultilineFlow, /inline: \{type: http, url: "••••"\},/);
    assert.match(maskedMultilineFlow, /url: "https:\/\/nested\.example\/••••••",/);
    assert.deepEqual([...app.splitRoutePattern('RU\\|EU|NL|DE|FR')], ['RU\\|EU', 'NL', 'DE', 'FR']);
    assert.equal(app.summarizeRoutePattern('RU\\|EU|NL|DE|FR'), 'RU\\|EU · NL · DE · еще 1');
    assert.equal(app.formatNodeInventoryError('HTTP 404'), 'Список нод недоступен в текущем сервисе MihUI.');
    assert.equal(app.formatNodeInventoryError('Failed to fetch'), 'Не удалось связаться с Mihomo.');
    assert.equal(app.formatServiceStatusLabel({ state: 'ok' }), 'Работает');
    assert.equal(app.formatServiceStatusLabel({ state: 'error' }), 'Ошибка');
    assert.equal(app.formatServiceStatusLabel({ state: 'unavailable' }), 'Не найден');
    assert.equal(app.formatServiceStatusLabel({ state: 'ok' }, true), 'Проверка...');
  });

  test(`${source.name}: opens only explicit http links from the YAML editor`, () => {
    const opened = [];
    const app = loadApp(source, {}, {
      open: (...args) => {
        const tab = { opener: 'source' };
        opened.push({ args, tab });
        return tab;
      },
    });
    const yaml = 'url: https://example.test/path\nmasked: https://hidden.test/••••••\nother: ftp://example.test/file';
    const urlOffset = yaml.indexOf('example.test') + 2;

    assert.equal(app.findYamlHttpUrlAtOffset(yaml, urlOffset), 'https://example.test/path');
    assert.equal(app.findYamlHttpUrlAtOffset(yaml, yaml.indexOf('hidden.test') + 2), '');
    assert.equal(app.findYamlHttpUrlAtOffset(yaml, yaml.indexOf('ftp://') + 2), '');

    app.state.isEditingConfiguration = true;
    app.els.outputPreview.value = yaml;
    app.els.outputPreview.selectionStart = urlOffset;
    let prevented = false;
    app.handleConfigurationUrlClick({
      ctrlKey: true,
      metaKey: false,
      preventDefault() {
        prevented = true;
      },
    });

    assert.equal(prevented, true);
    assert.deepEqual(opened[0].args, ['https://example.test/path', '_blank', 'noopener,noreferrer']);
    assert.equal(opened[0].tab.opener, null);

    app.handleConfigurationUrlClick({ ctrlKey: false, metaKey: false, preventDefault() {} });
    assert.equal(opened.length, 1);
  });

  test(`${source.name}: assigns the selected palette to YAML value tokens`, () => {
    const app = loadApp(source);
    app.state.isEditingConfiguration = true;
    const tokens = (line) =>
      app
        .createYamlCodeLine(line)
        .children[0].children.filter((token) => token.className)
        .map((token) => [token.textContent, token.className]);

    assert.deepEqual([...tokens('find-process-mode: off')], [
      ['find-process-mode', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['off', 'yaml-literal'],
    ]);
    assert.deepEqual([...tokens('ports: [80, 8080]')], [
      ['ports', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['[', 'yaml-bracket'],
      ['80', 'yaml-number'],
      [',', 'yaml-punctuation'],
      ['8080', 'yaml-number'],
      [']', 'yaml-bracket'],
    ]);
    assert.deepEqual([...tokens('external-controller: 0.0.0.0:9090')], [
      ['external-controller', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['0.0.0.0', 'yaml-scalar'],
      [':', 'yaml-punctuation'],
      ['9090', 'yaml-number'],
    ]);
    assert.deepEqual([...tokens('external-ui: zashboard')], [
      ['external-ui', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['zashboard', 'yaml-scalar'],
    ]);
    assert.deepEqual([...tokens('external-ui-url: https://example.test/ui.zip')], [
      ['external-ui-url', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['https://example.test/ui.zip', 'yaml-scalar yaml-url'],
    ]);
    assert.deepEqual([...tokens('exclude-filter: "Whitelist|Россия|Киев"')], [
      ['exclude-filter', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['"Whitelist|Россия|Киев"', 'yaml-string'],
    ]);
    assert.deepEqual([...tokens('domain: &domain { type: http, interval: 86400 }')], [
      ['domain', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['&domain', 'yaml-anchor'],
      ['{', 'yaml-bracket'],
      ['type', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['http', 'yaml-scalar'],
      [',', 'yaml-punctuation'],
      ['interval', 'yaml-key'],
      [':', 'yaml-punctuation'],
      ['86400', 'yaml-number'],
      ['}', 'yaml-bracket'],
    ]);
  });

  test(`${source.name}: filters rules without changing yaml`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-groups:
  - name: Proxy
    type: select
    proxies:
      - DIRECT
rules:
  - DOMAIN-SUFFIX,example.com,Proxy
  - IP-CIDR,10.0.0.0/8,DIRECT
  - MATCH,Proxy
`);
    const outputBefore = app.state.outputText;
    app.state.ruleFilters = { search: 'example', type: 'DOMAIN-SUFFIX', target: 'Proxy' };
    const visible = app.state.rules.filter(app.matchesRuleFilters);

    assert.equal(visible.length, 1);
    assert.equal(visible[0].value, 'example.com');
    assert.equal(app.state.outputText, outputBefore);
    assert.equal(app.ruleRequiresValue('DOMAIN'), true);
    assert.equal(app.ruleRequiresValue('RULE-SET'), true);
    assert.equal(app.ruleRequiresValue('MATCH'), false);
  });

  test(`${source.name}: undo restores only the removed provider link`, () => {
    const app = loadApp(source);
    hydrate(app, `
proxy-providers:
  one:
    type: http
    url: https://one.example/sub
  two:
    type: http
    url: https://two.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - one
      - two
rules:
  - MATCH,Proxy
`);
    const provider = app.state.providers.find((item) => item.name === 'one');

    app.removeProvider(provider);
    app.state.groups[0].use.push('later-change');
    app.undoLastRemoval();

    assert.equal(provider.deleted, false);
    assert.deepEqual([...app.state.groups[0].use], ['one', 'two', 'later-change']);
  });

  test(`${source.name}: warns before leaving with generated or raw draft changes`, () => {
    const app = loadApp(source);
    const yaml = `proxy-groups:\n  - name: Proxy\n    type: select\n    proxies:\n      - DIRECT\nrules:\n  - MATCH,Proxy\n`;
    hydrate(app, yaml);
    app.state.outputText = yaml;

    let prevented = false;
    const unchangedEvent = {
      preventDefault() { prevented = true; },
      returnValue: null,
    };
    app.handleBeforeUnload(unchangedEvent);
    assert.equal(prevented, false);

    app.state.outputText = `${yaml}# draft\n`;
    const changedEvent = {
      preventDefault() { prevented = true; },
      returnValue: null,
    };
    app.handleBeforeUnload(changedEvent);
    assert.equal(prevented, true);
    assert.equal(changedEvent.returnValue, '');

    app.state.outputText = yaml;
    app.state.isEditingConfiguration = true;
    app.els.outputPreview.value = `${yaml}# raw draft\n`;
    assert.equal(app.hasUnsavedWorkspaceChanges(), true);
  });

  test(`${source.name}: confirms only high-risk save changes`, () => {
    let confirmation = '';
    const app = loadApp(source, {}, {
      confirm: (message) => {
        confirmation = message;
        return false;
      },
    });
    hydrate(app, `
proxy-providers:
  one:
    type: http
    url: https://one.example/sub
proxy-groups:
  - name: Proxy
    type: select
    proxies:
      - DIRECT
    use:
      - one
rules:
  - MATCH,Proxy
`);

    assert.deepEqual([...app.getHighRiskSaveSummaries()], []);
    app.state.providers[0].deleted = true;
    app.state.groups[0].proxies.push('REJECT');
    app.state.rules[0].target = 'DIRECT';

    const summaries = [...app.getHighRiskSaveSummaries()];
    assert.equal(summaries.length, 3);
    assert.equal(app.confirmHighRiskSave(), false);
    assert.match(confirmation, /Удаляются подписки: one/);
    assert.match(confirmation, /правила маршрутизации/);
    assert.match(confirmation, /группа PROXY/);
  });

  test(`${source.name}: canceled provider and rule deletion leaves the draft unchanged`, () => {
    const app = loadApp(source, {}, { confirm: () => false });
    hydrate(app, `
proxy-providers:
  one:
    type: http
    url: https://one.example/sub
proxy-groups:
  - name: Proxy
    type: select
    use:
      - one
rules:
  - MATCH,Proxy
`);
    const provider = app.state.providers[0];
    const rule = app.state.rules[0];

    app.removeProvider(provider);
    app.removeRule(rule);

    assert.equal(provider.deleted, false);
    assert.equal(rule.deleted, false);
    assert.deepEqual([...app.state.groups[0].use], ['one']);
  });
}
