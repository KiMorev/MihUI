const DEFAULT_HEALTH_URL = 'https://www.gstatic.com/generate_204';
const DEFAULT_GENERATED_USER_AGENT = 'ClashMeta/1.19.24; mihomo/1.19.24';
const DEFAULT_BULK_INTERVAL = '86400';
const DEFAULT_BULK_HEALTH_INTERVAL = '300';
const ROUTE_CHILD_LIMIT = 24;
const ROUTE_AUTO_PROXIES_TARGET = '__route_auto_proxies__';
const CONNECTION_SETTING_DEFS = [
  {
    key: 'global-client-fingerprint',
    title: 'Отпечаток клиента',
    recommended: 'chrome',
    explanation: 'Помогает некоторым серверам видеть клиент как обычный браузер при TLS-подключении.',
  },
  {
    key: 'unified-delay',
    title: 'Честная проверка задержки',
    recommended: 'true',
    explanation: 'Проверяет задержку ближе к реальному подключению, а не только быстрый ответ.',
  },
  {
    key: 'tcp-concurrent',
    title: 'Быстрое TCP-подключение',
    recommended: 'true',
    explanation: 'Пробует несколько TCP-подключений параллельно и берет то, которое быстрее ответило.',
  },
];
const CONNECTION_SETTING_KEYS = new Set(CONNECTION_SETTING_DEFS.map((setting) => setting.key));
const EXCLUDE_TYPE_OPTIONS = [
  'ss',
  'ssr',
  'vmess',
  'vless',
  'trojan',
  'hysteria',
  'hysteria2',
  'hy2',
  'tuic',
  'http',
  'socks5',
  'snell',
  'wireguard',
  'wg',
  'ssh',
  'mieru',
  'anytls',
  'socks',
  'direct',
];
const ALLOWED_EXCLUDE_TYPES = new Set(EXCLUDE_TYPE_OPTIONS);
const GENERIC_HOST_LABELS = new Set([
  'www',
  'sub',
  'subs',
  'subscribe',
  'api',
  'raw',
  'cdn',
  'node',
  'nodes',
  'client',
  'clients',
  'link',
  'links',
]);
const COMMON_DOMAIN_SUFFIXES = new Set([
  'com',
  'net',
  'org',
  'ru',
  'su',
  'io',
  'online',
  'site',
  'app',
  'dev',
  'me',
  'info',
  'biz',
  'xyz',
  'top',
  'pro',
  'co',
  'uk',
]);
const PROXY_MODE_TYPES = new Set(['fallback', 'url-test', 'load-balance', 'relay']);
const GROUP_TYPE_OPTIONS = ['select', 'url-test', 'fallback', 'load-balance', 'relay'];
const BUILT_IN_OUTBOUNDS = new Set(['DIRECT', 'PASS', 'PASS-RULE', 'REJECT', 'REJECT-DROP', 'GLOBAL', 'COMPATIBLE']);
const RULE_OPTIONS = new Set(['no-resolve', 'src']);
const PROVIDER_DIFF_FIELDS = [
  { key: 'hasUrl', label: 'ссылка подписки' },
  { key: 'url', label: 'ссылка подписки' },
  { key: 'hasFilter', label: 'фильтр серверов' },
  { key: 'filter', label: 'фильтр серверов' },
  { key: 'hasExcludeFilter', label: 'исключения из фильтра' },
  { key: 'excludeFilter', label: 'исключения из фильтра' },
  { key: 'hasExcludeType', label: 'исключенные типы серверов' },
  { key: 'excludeType', label: 'исключенные типы серверов' },
  { key: 'hasUserAgent', label: 'User-Agent' },
  { key: 'userAgent', label: 'User-Agent' },
  { key: 'hasXHwid', label: 'x-hwid' },
  { key: 'xHwid', label: 'x-hwid' },
  { key: 'hasUdp', label: 'UDP' },
  { key: 'udp', label: 'UDP' },
  { key: 'hasTfo', label: 'быстрое открытие TCP (TFO)' },
  { key: 'tfo', label: 'быстрое открытие TCP (TFO)' },
  { key: 'hasPath', label: 'путь сохранения' },
  { key: 'path', label: 'путь сохранения' },
  { key: 'hasInterval', label: 'интервал обновления подписки' },
  { key: 'interval', label: 'интервал обновления подписки' },
  { key: 'hasHealthUrl', label: 'адрес проверки нод' },
  { key: 'healthUrl', label: 'адрес проверки нод' },
  { key: 'hasHealthInterval', label: 'период проверки нод' },
  { key: 'healthInterval', label: 'период проверки нод' },
];

const state = {
  fileName: '',
  originalText: '',
  providers: [],
  groups: [],
  originalProviders: [],
  originalGroups: [],
  originalConnectionSettings: {},
  connectionSettings: {},
  outputText: '',
  hasProvidersSection: false,
  hasGroupsSection: false,
  intervalToolsOpen: false,
  isEditingConfiguration: false,
  selectedProviderName: '',
  selectedGroupName: '',
  selectedRouteScenarioId: '',
  providerStatuses: {},
  providerStatusLoading: false,
  providerUpdatingName: '',
  saveReviewReady: false,
  lastConfigCheckText: '',
  lastConfigCheckOk: false,
  routerMode: false,
  routerApiAvailable: false,
  routerConfigPath: '',
  routerBusy: false,
  updatePollTimer: 0,
  mihuiUpdateStartedAt: 0,
  mihuiUpdateAccepted: false,
  mihuiUpdateReconnects: 0,
};

const els = {
  routerLoadButton: document.querySelector('#routerLoadButton'),
  routerSaveButton: document.querySelector('#routerSaveButton'),
  routerPanel: document.querySelector('#routerPanel'),
  updateHint: document.querySelector('#updateHint'),
  uiLinks: document.querySelector('#uiLinks'),
  backupSelect: document.querySelector('#backupSelect'),
  restoreBackupButton: document.querySelector('#restoreBackupButton'),
  fileInput: document.querySelector('#fileInput'),
  downloadButton: document.querySelector('#downloadButton'),
  addProviderButton: document.querySelector('#addProviderButton'),
  addGroupButton: document.querySelector('#addGroupButton'),
  providerStatusRefreshButton: document.querySelector('#providerStatusRefreshButton'),
  intervalToolsButton: document.querySelector('#intervalToolsButton'),
  intervalTools: document.querySelector('#intervalTools'),
  bulkIntervalInput: document.querySelector('#bulkIntervalInput'),
  bulkIntervalHint: document.querySelector('#bulkIntervalHint'),
  bulkHealthIntervalInput: document.querySelector('#bulkHealthIntervalInput'),
  bulkHealthIntervalHint: document.querySelector('#bulkHealthIntervalHint'),
  bulkIntervalPending: document.querySelector('#bulkIntervalPending'),
  intervalPresets: document.querySelectorAll('.interval-preset'),
  applyIntervalsButton: document.querySelector('#applyIntervalsButton'),
  editConfigButton: document.querySelector('#editConfigButton'),
  applyConfigButton: document.querySelector('#applyConfigButton'),
  cancelConfigEditButton: document.querySelector('#cancelConfigEditButton'),
  checkConfigButton: document.querySelector('#checkConfigButton'),
  copyButton: document.querySelector('#copyButton'),
  mihomoUiUpdateButton: document.querySelector('#mihomoUiUpdateButton'),
  changesJumpButton: document.querySelector('#changesJumpButton'),
  recommendationsJumpButton: document.querySelector('#recommendationsJumpButton'),
  downloadWarning: document.querySelector('#downloadWarning'),
  fileMeta: document.querySelector('#fileMeta'),
  providerCount: document.querySelector('#providerCount'),
  groupCount: document.querySelector('#groupCount'),
  rulesMetric: document.querySelector('#rulesMetric'),
  rulesStatus: document.querySelector('#rulesStatus'),
  rulesHint: document.querySelector('#rulesHint'),
  messageBox: document.querySelector('#messageBox'),
  diagnosticsPanel: document.querySelector('#diagnosticsPanel'),
  connectionSettingsPanel: document.querySelector('#connectionSettingsPanel'),
  changesPanel: document.querySelector('#changesPanel'),
  workspace: document.querySelector('.workspace'),
  providersList: document.querySelector('#providersList'),
  groupOrderList: document.querySelector('#groupOrderList'),
  groupsMatrix: document.querySelector('#groupsMatrix'),
  outputPreview: document.querySelector('#outputPreview'),
  providerTemplate: document.querySelector('#providerTemplate'),
};

els.routerLoadButton.addEventListener('click', loadRouterConfig);
els.routerSaveButton.addEventListener('click', saveRouterConfig);
els.restoreBackupButton.addEventListener('click', restoreSelectedBackup);
els.fileInput.addEventListener('change', handleFileSelect);
els.downloadButton.addEventListener('click', downloadYaml);
els.addProviderButton.addEventListener('click', addProvider);
els.addGroupButton.addEventListener('click', addGroup);
els.providerStatusRefreshButton.addEventListener('click', () => loadProviderStatuses({ silent: false }));
els.intervalToolsButton.addEventListener('click', toggleIntervalTools);
els.bulkIntervalInput.addEventListener('input', handleBulkIntervalInput);
els.bulkHealthIntervalInput.addEventListener('input', handleBulkIntervalInput);
els.intervalPresets.forEach((button) => button.addEventListener('click', applyIntervalPreset));
els.applyIntervalsButton.addEventListener('click', applyBulkIntervals);
els.editConfigButton.addEventListener('click', beginConfigurationEdit);
els.applyConfigButton.addEventListener('click', applyConfigurationEdit);
els.cancelConfigEditButton.addEventListener('click', cancelConfigurationEdit);
els.checkConfigButton.addEventListener('click', () => checkRouterConfig({ silent: false }));
els.copyButton.addEventListener('click', copyYaml);
els.updateHint.addEventListener('click', updateMihui);
els.changesJumpButton.addEventListener('click', focusChangesPanel);
els.recommendationsJumpButton.addEventListener('click', focusConnectionSettingsPanel);
els.rulesMetric.addEventListener('click', focusDiagnosticsPanel);
els.rulesMetric.addEventListener('keydown', handleRulesMetricKeydown);
els.downloadWarning.addEventListener('click', focusDiagnosticsPanel);
initRouterMode();

function handleFileSelect(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    state.routerMode = false;
    state.routerConfigPath = '';
    state.providerStatuses = {};
    state.saveReviewReady = false;
    state.lastConfigCheckText = '';
    state.lastConfigCheckOk = false;
    state.fileName = file.name;
    state.originalText = String(reader.result || '');
    state.isEditingConfiguration = false;
    parseAndRender();
  };
  reader.readAsText(file);
}

function initRouterMode() {
  if (typeof fetch !== 'function' || window.location?.protocol === 'file:') {
    return;
  }

  loadRouterMetadata();
  loadRouterConfig({ silent: true });
  checkMihuiUpdate();
}

async function loadRouterConfig(options = {}) {
  if (typeof fetch !== 'function') return;
  setRouterBusy(true, 'Открытие...');

  try {
    const data = await apiJson('/api/config');
    state.routerApiAvailable = true;
    state.routerMode = true;
    state.routerConfigPath = data.path || '';
    state.fileName = state.routerConfigPath || 'router config';
    state.originalText = String(data.text || '');
    state.isEditingConfiguration = false;
    state.saveReviewReady = false;
    state.lastConfigCheckText = '';
    state.lastConfigCheckOk = false;
    parseAndRender();
    await loadBackups();
    await loadProviderStatuses({ silent: true });
    if (!options.silent) showMessage(`Открыт конфиг: ${state.routerConfigPath}`);
  } catch (error) {
    if (!options.silent) showMessage(`Не удалось открыть конфиг роутера: ${error?.message || error}`);
    renderRouterControls();
  } finally {
    setRouterBusy(false, 'Открыть конфиг');
  }
}

async function saveRouterConfig() {
  if (!state.outputText) return;
  const changes = collectChanges(state.providers.filter((provider) => !provider.deleted));
  if (state.outputText !== state.originalText && countChanges(changes) > 0 && !state.saveReviewReady) {
    state.saveReviewReady = true;
    renderRouterControls();
    focusChangesPanel();
    showMessage('Проверьте изменения ниже. Повторное нажатие сохранит конфиг в ядро.');
    return;
  }

  setRouterBusy(true, 'Сохранение...');

  try {
    const check = await checkRouterConfig({ silent: true, allowUnavailable: true });
    if (check === false) return;

    const data = await apiJson('/api/config/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.outputText }),
    });
    state.routerMode = true;
    state.routerConfigPath = data.path || state.routerConfigPath;
    state.fileName = state.routerConfigPath;
    state.originalText = state.outputText;
    state.saveReviewReady = false;
    state.lastConfigCheckText = state.outputText;
    state.lastConfigCheckOk = true;
    parseAndRender();
    await loadBackups();
    await loadProviderStatuses({ silent: true });

    if (data.reload?.ok) {
      showMessage('Конфиг сохранен, Mihomo перезагружен.');
    } else {
      showMessage(`Конфиг сохранен, но reload Mihomo не прошел: ${data.reload?.message || 'нет ответа API'}`);
    }
  } catch (error) {
    showMessage(`Не удалось сохранить конфиг: ${error?.message || error}`);
  } finally {
    setRouterBusy(false, 'Открыть конфиг');
  }
}

async function restoreSelectedBackup() {
  const name = els.backupSelect.value;
  if (!name) return;
  setRouterBusy(true, 'Восстановление...');

  try {
    const data = await apiJson('/api/backups/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    await loadRouterConfig({ silent: true });
    showMessage(data.reload?.ok ? 'Бэкап восстановлен, Mihomo перезагружен.' : 'Бэкап восстановлен, reload Mihomo не прошел.');
  } catch (error) {
    showMessage(`Не удалось восстановить бэкап: ${error?.message || error}`);
  } finally {
    setRouterBusy(false, 'Открыть конфиг');
  }
}

async function loadBackups() {
  try {
    const data = await apiJson('/api/backups');
    renderBackups(data.backups || []);
  } catch (error) {
    renderBackups([]);
  }
}

async function loadRouterMetadata() {
  try {
    const data = await apiJson('/api/router/uis');
    state.routerApiAvailable = true;
    renderUiLinks(data.items || []);
  } catch (error) {
    renderUiLinks([]);
  }
}

async function checkMihuiUpdate() {
  try {
    const data = await fetchMihuiUpdateCheck();
    state.routerApiAvailable = true;
    const currentVersion = data.version ? `MihUI ${data.version}` : 'MihUI';
    if (data.updateAvailable) {
      els.updateHint.textContent = data.latest ? `${currentVersion} -> ${data.latest}` : currentVersion;
      setMihuiUpdateHint(false);
    } else if (data.version) {
      setMihuiUpdateHint(true, currentVersion);
    } else {
      setMihuiUpdateHint(true, '');
    }
  } catch (error) {
    setMihuiUpdateHint(true, els.updateHint.textContent || 'MihUI');
  }
}

async function fetchMihuiUpdateCheck() {
  const response = await fetch('/api/update/check', { cache: 'no-store' });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(text);
    }
  }
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
}

function renderRouterControls() {
  const hasActiveProviders = state.providers.some((provider) => !provider.deleted);
  els.routerPanel.classList.toggle('hidden', window.location?.protocol === 'file:');
  els.routerSaveButton.disabled = state.routerBusy || !state.outputText || !state.routerMode;
  const saveLabel = els.routerSaveButton.querySelector('span');
  if (saveLabel) saveLabel.textContent = state.saveReviewReady ? 'Сохранить после просмотра' : 'Сохранить в ядро';
  els.providerStatusRefreshButton.disabled = !state.routerApiAvailable || state.providerStatusLoading || !hasActiveProviders;
  els.providerStatusRefreshButton.title = state.routerApiAvailable
    ? 'Получить статусы подписок из Mihomo API'
    : 'Доступно только в MihUI на роутере рядом с Mihomo';
  const statusLabel = els.providerStatusRefreshButton.querySelector('span');
  if (statusLabel) statusLabel.textContent = state.providerStatusLoading ? 'Загрузка...' : 'Статусы';
}

function renderBackups(backups) {
  els.backupSelect.textContent = '';
  if (!backups.length) {
    els.routerPanel.classList.add('router-panel-empty');
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Бэкапов нет';
    els.backupSelect.append(option);
    els.backupSelect.disabled = true;
    els.restoreBackupButton.disabled = true;
    return;
  }

  els.routerPanel.classList.remove('router-panel-empty');
  backups.forEach((backup) => {
    const option = document.createElement('option');
    option.value = backup.name;
    option.textContent = backup.name;
    els.backupSelect.append(option);
  });
  els.backupSelect.disabled = false;
  els.restoreBackupButton.disabled = false;
}

function renderUiLinks(items) {
  els.uiLinks.textContent = '';
  if (!items.length) return;

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const menu = document.createElement('div');

  details.className = 'ui-links-details';
  summary.textContent = items.length > 1 ? `UI (${items.length})` : 'UI';
  menu.className = 'ui-links-menu';

  items.forEach((item) => {
    const group = document.createElement('span');
    group.className = 'ui-link-item';

    if (item.localUrl) {
      const localLink = document.createElement('a');
      localLink.href = item.localUrl;
      localLink.className = 'ui-link-main';
      localLink.textContent = item.name;
      group.append(localLink);
    } else {
      const name = document.createElement('span');
      name.className = 'ui-link-main';
      name.textContent = item.name;
      group.append(name);
    }

    if (item.githubUrl) {
      const githubLink = document.createElement('a');
      githubLink.href = item.githubUrl;
      githubLink.target = '_blank';
      githubLink.rel = 'noreferrer';
      githubLink.className = 'ui-link-github';
      githubLink.textContent = 'GitHub';
      group.append(githubLink);
    }

    menu.append(group);
  });

  details.append(summary, menu);
  els.uiLinks.append(details);
}

function setRouterBusy(isBusy, text) {
  state.routerBusy = isBusy;
  els.routerLoadButton.disabled = isBusy;
  const loadLabel = els.routerLoadButton.querySelector('span');
  if (loadLabel) loadLabel.textContent = text;
  els.routerSaveButton.disabled = isBusy || !state.outputText || !state.routerMode;
  renderRouterControls();
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(text);
    }
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
}

async function checkRouterConfig(options = {}) {
  if (!state.outputText || !state.routerApiAvailable) return null;
  setConfigCheckBusy(true);

  try {
    const data = await apiJson('/api/config/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.outputText }),
    });
    state.lastConfigCheckText = state.outputText;
    state.lastConfigCheckOk = Boolean(data.available);
    if (!options.silent) {
      showMessage(data.available ? 'Проверка Mihomo пройдена.' : `Проверка недоступна: ${data.message || 'mihomo не найден'}`);
    }
    return true;
  } catch (error) {
    state.lastConfigCheckText = state.outputText;
    state.lastConfigCheckOk = false;
    showMessage(`Проверка Mihomo не прошла: ${error?.message || error}`);
    return false;
  } finally {
    setConfigCheckBusy(false);
  }
}

function setConfigCheckBusy(isBusy) {
  els.checkConfigButton.disabled = isBusy || state.routerBusy || state.isEditingConfiguration || !state.routerApiAvailable || !state.outputText;
  els.checkConfigButton.title = state.routerApiAvailable
    ? 'Проверить текущий текст конфига через mihomo -t'
    : 'Доступно только в MihUI на роутере рядом с Mihomo';
  const label = els.checkConfigButton.querySelector('.button-label');
  if (label) label.textContent = isBusy ? 'Проверка...' : 'Проверить в ядре';
}

async function loadProviderStatuses(options = {}) {
  if (!state.routerApiAvailable || typeof fetch !== 'function') return;
  state.providerStatusLoading = true;
  render();

  try {
    const data = await apiJson('/api/providers/status');
    state.providerStatuses = {};
    (data.providers || []).forEach((provider) => {
      if (provider?.name) state.providerStatuses[provider.name] = provider;
    });
  } catch (error) {
    state.providerStatuses = {};
    if (!options.silent) showMessage(`Не удалось получить статусы подписок: ${error?.message || error}`);
  } finally {
    state.providerStatusLoading = false;
    render();
  }
}

async function updateProviderNow(provider) {
  if (!provider?.name || !state.routerApiAvailable || typeof fetch !== 'function') return;
  state.providerUpdatingName = provider.name;
  render();

  try {
    await apiJson('/api/providers/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: provider.name }),
    });
    showMessage(`Подписка ${provider.name} отправлена на обновление.`);
    await loadProviderStatuses({ silent: true });
  } catch (error) {
    showMessage(`Не удалось обновить подписку ${provider.name}: ${error?.message || error}`);
  } finally {
    state.providerUpdatingName = '';
    render();
  }
}

function parseAndRender() {
  const lines = splitLines(state.originalText);
  const providersSection = findTopSection(lines, 'proxy-providers');
  const groupsSection = findTopSection(lines, 'proxy-groups');
  state.hasProvidersSection = Boolean(providersSection);
  state.hasGroupsSection = Boolean(groupsSection);
  state.originalConnectionSettings = readConnectionSettings(lines);
  state.connectionSettings = cloneConnectionSettings(state.originalConnectionSettings);

  if (!groupsSection) {
    showMessage('Добавьте раздел proxy-groups на верхнем уровне конфигурации.');
    state.providers = [];
    state.groups = [];
    state.originalProviders = [];
    state.originalGroups = [];
    state.originalConnectionSettings = {};
    state.connectionSettings = {};
    state.hasProvidersSection = false;
    state.hasGroupsSection = false;
    state.intervalToolsOpen = false;
    state.selectedGroupName = '';
    state.selectedRouteScenarioId = '';
    setOutputText(state.originalText);
    render();
    return;
  }

  state.providers = providersSection ? parseProviders(lines, providersSection) : [];
  state.groups = parseGroups(lines, groupsSection);
  state.originalProviders = state.providers.map(snapshotProvider);
  state.originalGroups = state.groups.map(snapshotGroup);
  syncBulkIntervalInputs();
  hideMessage();
  generateOutput();
  render();
}

function render() {
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  const groupsWithUse = state.groups.filter((group) => group.useStart !== -1);
  const changes = collectChanges(activeProviders);

  syncSelectedProvider(activeProviders);
  els.fileMeta.textContent = state.fileName || 'Конфигурация не загружена';
  els.providerCount.textContent = String(activeProviders.length);
  renderGroupMetric();
  els.workspace.classList.toggle('workspace-route-focus', Boolean(state.originalText) && activeProviders.length === 0);
  els.downloadButton.disabled = !state.outputText;
  renderRouterControls();
  els.addProviderButton.disabled = !state.originalText;
  els.addProviderButton.title = state.originalText ? 'Добавить подписку' : 'Сначала загрузите конфигурацию';
  els.addGroupButton.disabled = !state.originalText || !state.hasGroupsSection;
  els.addGroupButton.title = state.originalText && state.hasGroupsSection ? 'Добавить группу' : 'Сначала загрузите конфигурацию с proxy-groups';
  els.intervalToolsButton.disabled = !state.originalText;
  renderConfigurationEditorControls();
  if (!state.isEditingConfiguration) {
    els.outputPreview.value = state.outputText;
  }

  renderIntervalTools(activeProviders);
  renderDiagnostics(collectDiagnostics(activeProviders));
  renderConnectionSettings();
  renderChanges(changes);
  renderChangesJumpButton(changes);
  renderProviders(activeProviders);
  renderMainGroup(state.groups, activeProviders);
  renderGroups(activeProviders, groupsWithUse);
}

function renderGroupMetric() {
  const proxyGroups = state.groups.filter((group) => isProxyModeGroup(group)).length;
  const serviceGroups = state.groups.length - proxyGroups;
  const total = document.createElement('span');
  const detail = document.createElement('span');

  els.groupCount.textContent = '';
  els.groupCount.classList.toggle('metric-count-split', Boolean(state.originalText));

  if (!state.originalText) {
    els.groupCount.textContent = '0';
    return;
  }

  total.className = 'metric-main';
  detail.className = 'metric-detail';
  total.textContent = `${state.groups.length} всего`;
  detail.textContent = `${serviceGroups} сервисных / ${proxyGroups} прокси`;
  els.groupCount.append(total, detail);
}

function renderDiagnostics(diagnostics) {
  els.diagnosticsPanel.textContent = '';
  els.rulesStatus.classList.remove('metric-ok', 'metric-warning', 'metric-danger');
  setRulesMetricActionable(false);
  setDownloadWarning('', '');

  if (!state.originalText) {
    els.rulesStatus.textContent = 'нет конфигурации';
    els.diagnosticsPanel.classList.add('hidden');
    return;
  }

  if (!state.hasGroupsSection) {
    els.rulesStatus.textContent = 'нет proxy-groups';
    els.diagnosticsPanel.classList.add('hidden');
    return;
  }

  if (diagnostics.length === 0) {
    els.rulesStatus.textContent = 'OK';
    els.rulesStatus.classList.add('metric-ok');
    els.diagnosticsPanel.classList.add('hidden');
    return;
  }

  const errors = diagnostics.filter((text) => getDiagnosticSeverity(text) === 'error');
  const title = document.createElement('strong');
  const body = document.createElement('div');
  const severity = errors.length > 0 ? 'error' : 'warning';
  const statusText = errors.length > 0 ? formatErrorCount(errors.length) : formatWarningCount(diagnostics.length);

  els.rulesStatus.textContent = statusText;
  els.rulesStatus.classList.add(errors.length > 0 ? 'metric-danger' : 'metric-warning');
  setRulesMetricActionable(true);
  setDownloadWarning(statusText, severity);
  title.textContent = 'Проверка связей';
  body.className = 'diagnostics-sections';
  getDiagnosticGroups(diagnostics).forEach((group) => {
    const section = document.createElement('section');
    const sectionTitle = document.createElement('div');
    const list = document.createElement('ul');

    section.className = `diagnostics-section is-${group.severity}`;
    sectionTitle.className = 'diagnostics-section-title';
    sectionTitle.textContent = group.title;
    list.className = 'diagnostics-list';
    group.items.forEach((text) => {
      const item = document.createElement('li');
      const target = getDiagnosticTarget(text);
      const action = getDiagnosticAction(text);
      item.className = getDiagnosticSeverity(text) === 'error' ? 'is-error' : 'is-warning';
      item.classList.add('diagnostic-item');
      if (target) {
        const button = document.createElement('button');
        button.className = 'diagnostic-link';
        button.type = 'button';
        appendDiagnosticContent(button, text);
        button.addEventListener('click', () => focusDiagnosticTarget(target));
        item.append(button);
      } else {
        appendDiagnosticContent(item, text);
      }
      if (action) {
        const actionButton = document.createElement('button');
        actionButton.className = 'button compact diagnostic-action';
        actionButton.type = 'button';
        actionButton.textContent = action.label;
        actionButton.addEventListener('click', () => applyDiagnosticFix(action));
        item.append(actionButton);
      }
      list.append(item);
    });
    section.append(sectionTitle, list);
    body.append(section);
  });

  els.diagnosticsPanel.append(title, body);
  els.diagnosticsPanel.classList.remove('hidden');
}

function setDownloadWarning(text, severity) {
  els.downloadWarning.hidden = !text;
  els.downloadWarning.textContent = text ? `Проверьте: ${text}` : '';
  els.downloadWarning.classList.remove('is-warning', 'is-error');
  if (text) els.downloadWarning.classList.add(`is-${severity}`);
}

function appendDiagnosticContent(element, text) {
  getDiagnosticContentParts(text).forEach((part) => {
    const span = document.createElement('span');
    span.textContent = part.text;
    if (part.isName) span.className = 'diagnostic-name';
    element.append(span);
  });
}

function getDiagnosticContentParts(text) {
  const value = String(text || '');
  let match = value.match(/^Подписка (.+?): ссылка совпадает с (.+)\.$/);
  if (match) {
    return [
      { text: 'Подписка ' },
      { text: match[1], isName: true },
      { text: ': ссылка совпадает с ' },
      { text: match[2], isName: true },
      { text: '.' },
    ];
  }

  match = value.match(/^Подписка (.+?): (.+)$/);
  if (match) return [{ text: 'Подписка ' }, { text: match[1], isName: true }, { text: `: ${match[2]}` }];

  match = value.match(/^Группа (.+?): provider (.+?) из use не найден\.$/);
  if (match) {
    return [
      { text: 'Группа ' },
      { text: match[1], isName: true },
      { text: ': provider ' },
      { text: match[2], isName: true },
      { text: ' из use не найден.' },
    ];
  }

  match = value.match(/^Группа (.+?): (.+)$/);
  if (match) return [{ text: 'Группа ' }, { text: match[1], isName: true }, { text: `: ${match[2]}` }];

  match = value.match(/^Rules: цель (.+?) не найдена (.+)$/);
  if (match) return [{ text: 'Rules: цель ' }, { text: match[1], isName: true }, { text: ` не найдена ${match[2]}` }];

  return [{ text: value }];
}

function setRulesMetricActionable(isActionable) {
  els.rulesMetric.classList.toggle('metric-actionable', isActionable);
  els.rulesMetric.setAttribute('aria-disabled', String(!isActionable));
  els.rulesMetric.title = isActionable ? 'Открыть список предупреждений и ошибок' : '';
  els.rulesHint.hidden = !isActionable;
  els.rulesHint.textContent = isActionable ? 'Нажмите, чтобы увидеть' : '';
}

function handleRulesMetricKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  focusDiagnosticsPanel();
}

function focusDiagnosticsPanel() {
  if (els.diagnosticsPanel.classList.contains('hidden')) return;

  els.diagnosticsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  els.diagnosticsPanel.classList.remove('target-highlight');
  window.setTimeout(() => {
    els.diagnosticsPanel.classList.add('target-highlight');
    els.diagnosticsPanel.querySelector('.diagnostic-link')?.focus();
  }, 0);
}

function focusChangesPanel() {
  if (els.changesPanel.classList.contains('hidden')) return;

  els.changesPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  els.changesPanel.classList.remove('target-highlight');
  window.setTimeout(() => {
    els.changesPanel.classList.add('target-highlight');
  }, 0);
}

function focusConnectionSettingsPanel() {
  if (els.connectionSettingsPanel.classList.contains('hidden')) return;

  els.connectionSettingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  els.connectionSettingsPanel.classList.remove('target-highlight');
  window.setTimeout(() => {
    els.connectionSettingsPanel.classList.add('target-highlight');
    els.connectionSettingsPanel.querySelector('.connection-settings-toggle')?.focus({ preventScroll: true });
  }, 200);
}

function renderChangesJumpButton(changes) {
  const count = countChanges(changes);

  els.changesJumpButton.hidden = count === 0;
  els.changesJumpButton.disabled = count === 0;
  els.changesJumpButton.textContent = count > 0 ? `Изменения (${count})` : 'Изменения';
}

function renderRecommendationsJumpButton(count) {
  els.recommendationsJumpButton.hidden = count === 0;
  els.recommendationsJumpButton.disabled = count === 0;
  els.recommendationsJumpButton.textContent = count > 0 ? `Рекомендации (${count})` : 'Рекомендации';
}

function getDiagnosticGroups(diagnostics) {
  const groups = new Map();
  diagnostics.forEach((text) => {
    const title = getDiagnosticGroupTitle(text);
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(text);
  });

  return [...groups].map(([title, items]) => ({
    title,
    items,
    severity: items.some((text) => getDiagnosticSeverity(text) === 'error') ? 'error' : 'warning',
  }));
}

function getDiagnosticGroupTitle(text) {
  const target = getDiagnosticTarget(text);
  if (target?.type === 'provider') return 'Подписки';
  if (target?.type === 'group' || target?.type === 'groups') return 'Группы';
  if (target?.type === 'rules') return 'Rules';
  return 'Файл';
}

function getDiagnosticSeverity(text) {
  if (String(text).startsWith('Rules:')) return 'error';
  if (/^Группа .+?: provider .+ из use не найден\./.test(String(text))) return 'error';
  if (String(text).includes('имя дублируется')) return 'error';
  if (String(text).includes('группа без имени')) return 'error';
  if (String(text).startsWith('proxy-groups: нет групп')) return 'error';
  return 'warning';
}

function getDiagnosticTarget(text) {
  const providerMatch = String(text).match(/^Подписка (.+?):/);
  if (providerMatch) return { type: 'provider', name: providerMatch[1] };

  const groupMatch = String(text).match(/^Группа (.+?):/);
  if (groupMatch) return { type: 'group', name: groupMatch[1] };

  if (String(text).startsWith('proxy-groups:')) return { type: 'groups' };
  if (String(text).startsWith('Rules:')) return { type: 'rules' };
  return null;
}

function getDiagnosticAction(text) {
  const value = String(text || '');
  let match = value.match(/^Группа (.+?): provider (.+?) из use не найден\.$/);
  if (match) {
    return {
      type: 'remove-missing-provider-use',
      label: 'Убрать из группы',
      groupName: match[1],
      providerName: match[2],
    };
  }

  match = value.match(/^Подписка (.+?): не подключена ни к одной группе use\.$/);
  if (match && state.groups.some((group) => group.useStart !== -1)) {
    return {
      type: 'connect-provider-to-use-groups',
      label: 'Подключить к группам',
      providerName: match[1],
    };
  }

  return null;
}

function applyDiagnosticFix(action) {
  if (!action) return false;

  if (action.type === 'remove-missing-provider-use') {
    const group = findGroupByName(state.groups, action.groupName);
    if (!group) return false;
    const previousLength = group.use.length;
    group.use = group.use.filter((name) => name !== action.providerName);
    if (group.use.length === previousLength) return false;
    generateOutput();
    render();
    return true;
  }

  if (action.type === 'connect-provider-to-use-groups') {
    const provider = state.providers.find((item) => !item.deleted && item.name === action.providerName);
    if (!provider) return false;
    const previousCount = state.groups.reduce((count, group) => count + (group.use.includes(provider.name) ? 1 : 0), 0);
    connectProviderToUseGroups(provider.name);
    const nextCount = state.groups.reduce((count, group) => count + (group.use.includes(provider.name) ? 1 : 0), 0);
    if (nextCount === previousCount) return false;
    state.selectedProviderName = provider.name;
    generateOutput();
    render();
    return true;
  }

  return false;
}

function focusDiagnosticTarget(target) {
  if (target.type === 'provider') {
    const provider = state.providers.find((item) => !item.deleted && item.name === target.name);
    if (provider && state.selectedProviderName !== provider.name) {
      state.selectedProviderName = provider.name;
      render();
    }
  }

  const element = findDiagnosticTargetElement(target);
  if (!element) return;

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.classList.remove('target-highlight');
  window.setTimeout(() => {
    element.classList.add('target-highlight');
  }, 0);
}

function findDiagnosticTargetElement(target) {
  if (target.type === 'provider') {
    return [...els.providersList.querySelectorAll('.provider-list-item')]
      .find((item) => item.querySelector('strong')?.textContent === target.name) ||
      [...els.providersList.querySelectorAll('.provider-row')]
      .find((row) => row.querySelector('.provider-card-title')?.textContent === target.name);
  }

  if (target.type === 'group') {
    return [...els.groupOrderList.querySelectorAll('.group-order-info')]
      .find((item) => item.querySelector('strong')?.textContent === target.name)
      ?.closest('.route-choice, .route-stage, .route-branch');
  }

  if (target.type === 'rules') return els.groupOrderList;
  if (target.type === 'groups') return els.groupsMatrix;
  return null;
}

function collectDiagnostics(activeProviders) {
  const diagnostics = [];
  if (!state.originalText || !state.hasGroupsSection) return diagnostics;

  const providerNames = new Set(activeProviders.map((provider) => normalizeLookupName(provider.name)));
  const groupNames = new Set();
  const directProxyNames = new Set(getDirectProxyNames().map(normalizeLookupName));
  const usedProviders = new Set();

  if (state.groups.length === 0) {
    diagnostics.push('proxy-groups: нет групп маршрутизации.');
  }

  state.groups.forEach((group) => {
    const groupName = normalizeLookupName(group.name);
    if (!group.name) {
      addUniqueDiagnostic(diagnostics, 'proxy-groups: найдена группа без имени.');
    } else if (groupNames.has(groupName)) {
      addUniqueDiagnostic(diagnostics, `Группа ${group.name}: имя дублируется.`);
    } else {
      groupNames.add(groupName);
    }
  });

  getRuleTargets().forEach((target) => {
    if (!isKnownOutboundName(target, groupNames, directProxyNames)) {
      addUniqueDiagnostic(diagnostics, `Rules: цель ${target} не найдена среди групп, обычных proxies или встроенных выходов.`);
    }
  });

  state.groups.forEach((group) => {
    group.proxies.forEach((proxyName) => {
      if (!isKnownOutboundName(proxyName, groupNames, directProxyNames)) {
        addUniqueDiagnostic(diagnostics, `Группа ${group.name}: вариант ${proxyName} из proxies не найден.`);
      }
    });

    group.use.forEach((providerName) => {
      const normalizedProviderName = normalizeLookupName(providerName);
      if (providerNames.has(normalizedProviderName)) {
        usedProviders.add(normalizedProviderName);
      } else {
        addUniqueDiagnostic(diagnostics, `Группа ${group.name}: provider ${providerName} из use не найден.`);
      }
    });

    if (isProxyModeGroup(group) && getGroupSource(group) === 'none') {
      addUniqueDiagnostic(diagnostics, `Группа ${group.name}: прокси-режим пустой.`);
    }
  });

  const usesAllProviders = state.groups.some((group) => group.includeAll || group.includeAllProviders);
  if (!usesAllProviders) {
    activeProviders.forEach((provider) => {
      const providerName = normalizeLookupName(provider.name);
      if (providerName && !usedProviders.has(providerName)) {
        addUniqueDiagnostic(diagnostics, `Подписка ${provider.name}: не подключена ни к одной группе use.`);
      }
    });
  }

  collectDuplicateProviderUrls(activeProviders).forEach((text) => {
    addUniqueDiagnostic(diagnostics, text);
  });

  return diagnostics;
}

function collectDuplicateProviderUrls(activeProviders) {
  const diagnostics = [];
  const providersByUrl = new Map();

  activeProviders.forEach((provider) => {
    const key = normalizeProviderUrl(provider.url);
    if (!key) return;
    if (!providersByUrl.has(key)) providersByUrl.set(key, []);
    providersByUrl.get(key).push(provider);
  });

  providersByUrl.forEach((providers, url) => {
    if (providers.length < 2) return;
    const reference = getDuplicateUrlReferenceProvider(providers, url);
    providers.forEach((provider) => {
      if (provider !== reference) {
        diagnostics.push(`Подписка ${provider.name}: ссылка совпадает с ${reference.name}.`);
      }
    });
  });

  return diagnostics;
}

function getDuplicateUrlReferenceProvider(providers, url) {
  return providers
    .map((provider, index) => ({ provider, index, score: getDuplicateUrlReferenceScore(provider, url) }))
    .sort((left, right) => left.score - right.score || left.index - right.index)[0].provider;
}

function getDuplicateUrlReferenceScore(provider, url) {
  const original = state.originalProviders.find((item) => item.name === provider.originalName || item.name === provider.name);
  if (!provider.isNew && original && normalizeProviderUrl(original.url) === url) return 0;
  if (!provider.isNew && original) return 1;
  if (!provider.isNew) return 2;
  return 3;
}

function normalizeProviderUrl(url) {
  return String(url || '').trim().toLowerCase();
}

function addUniqueDiagnostic(diagnostics, text) {
  if (!diagnostics.includes(text)) diagnostics.push(text);
}

function formatWarningCount(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return `${count} предупреждение`;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return `${count} предупреждения`;
  return `${count} предупреждений`;
}

function formatErrorCount(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return `${count} ошибка`;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return `${count} ошибки`;
  return `${count} ошибок`;
}

function getDirectProxyNames() {
  const lines = splitLines(state.originalText);
  const proxiesSection = findTopSection(lines, 'proxies');
  const names = [];
  if (!proxiesSection) return names;

  for (let index = proxiesSection.start + 1; index < proxiesSection.end; index += 1) {
    const blockMatch = lines[index].match(/^\s*-\s+name\s*:\s*(.*)$/);
    if (blockMatch) {
      names.push(cleanScalar(stripYamlComment(blockMatch[1])));
      continue;
    }

    const inlineMatch = lines[index].match(/^\s*-\s+(\{.*\})\s*(?:#.*)?$/);
    const inlineMap = inlineMatch ? parseInlineMap(stripYamlComment(inlineMatch[1])) : null;
    if (inlineMap?.has('name')) names.push(cleanScalar(inlineMap.get('name')));
  }

  return names.filter((name, index) => name && names.indexOf(name) === index);
}

function isKnownOutboundName(name, groupNames, directProxyNames) {
  const normalizedName = normalizeLookupName(name);
  if (!normalizedName) return true;
  return BUILT_IN_OUTBOUNDS.has(String(name).toUpperCase()) || groupNames.has(normalizedName) || directProxyNames.has(normalizedName);
}

function normalizeLookupName(value) {
  return String(value || '').trim().toLowerCase();
}

function renderConnectionSettings() {
  els.connectionSettingsPanel.textContent = '';

  if (!state.originalText) {
    renderRecommendationsJumpButton(0);
    els.connectionSettingsPanel.classList.add('hidden');
    return;
  }

  const missing = getMissingConnectionSettings();
  renderRecommendationsJumpButton(missing.length);
  if (missing.length === 0) {
    els.connectionSettingsPanel.classList.add('hidden');
    return;
  }

  const head = document.createElement('div');
  const title = document.createElement('h2');
  const actions = document.createElement('div');
  const summary = document.createElement('span');
  const button = document.createElement('button');
  const toggleButton = document.createElement('button');
  const body = document.createElement('div');
  const grid = document.createElement('div');

  head.className = 'panel-head';
  title.textContent = 'Рекомендации по подключению';
  actions.className = 'panel-actions';
  summary.className = 'connection-settings-summary';
  summary.textContent = `Не включено: ${missing.length}`;
  button.className = 'button compact';
  button.type = 'button';
  button.textContent = 'Включить недостающие';
  button.addEventListener('click', addRecommendedConnectionSettings);
  toggleButton.className = 'button compact connection-settings-toggle';
  toggleButton.type = 'button';
  toggleButton.textContent = 'Подробнее';
  toggleButton.setAttribute('aria-expanded', 'false');
  body.className = 'connection-settings-body';
  body.hidden = true;
  grid.className = 'connection-settings-grid';

  missing.forEach((definition) => {
    const card = document.createElement('article');
    const name = document.createElement('strong');
    const key = document.createElement('span');
    const value = document.createElement('div');
    const explanation = document.createElement('p');
    const recommendation = document.createElement('div');
    const addButton = document.createElement('button');

    card.className = 'connection-setting-card is-missing';
    name.textContent = definition.title;
    key.className = 'connection-setting-key';
    key.textContent = definition.key;
    value.className = 'connection-setting-value';
    value.textContent = 'Не включено';
    explanation.className = 'connection-setting-explanation';
    explanation.textContent = definition.explanation;
    recommendation.className = 'connection-setting-recommendation';
    recommendation.textContent = formatConnectionSettingRecommendation(definition.recommended);

    card.append(name, key, value, explanation, recommendation);
    addButton.className = 'button compact connection-setting-action';
    addButton.type = 'button';
    addButton.textContent = 'Применить рекомендацию';
    addButton.addEventListener('click', () => addConnectionSetting(definition.key));
    card.append(addButton);
    grid.append(card);
  });

  toggleButton.addEventListener('click', () => {
    const expanded = body.hidden;
    body.hidden = !expanded;
    toggleButton.textContent = expanded ? 'Скрыть' : 'Подробнее';
    toggleButton.setAttribute('aria-expanded', String(expanded));
  });

  actions.append(summary, toggleButton, button);
  head.append(title, actions);
  body.append(grid);
  els.connectionSettingsPanel.append(head, body);
  els.connectionSettingsPanel.classList.remove('hidden');
}

function addConnectionSetting(key) {
  const definition = CONNECTION_SETTING_DEFS.find((setting) => setting.key === key);
  if (!definition || state.connectionSettings[definition.key]?.exists) return;

  state.connectionSettings[definition.key] = {
    exists: true,
    value: definition.recommended,
  };

  generateOutput();
  render();
}

function addRecommendedConnectionSettings() {
  getMissingConnectionSettings().forEach((definition) => {
    state.connectionSettings[definition.key] = {
      exists: true,
      value: definition.recommended,
    };
  });

  generateOutput();
  render();
}

function getMissingConnectionSettings() {
  return CONNECTION_SETTING_DEFS.filter((definition) => !state.connectionSettings[definition.key]?.exists);
}

function readConnectionSettings(lines) {
  const result = {};
  lines.forEach((line) => {
    const entry = parseTopLevelKeyValueLine(line);
    if (!entry || !CONNECTION_SETTING_KEYS.has(entry.key)) return;
    result[entry.key] = {
      exists: true,
      value: cleanScalar(entry.value),
    };
  });
  return result;
}

function cloneConnectionSettings(settings) {
  const result = {};
  Object.entries(settings).forEach(([key, setting]) => {
    result[key] = { ...setting };
  });
  return result;
}

function formatConnectionSettingValue(value) {
  const text = String(value ?? '').trim();
  if (text.toLowerCase() === 'true') return 'включено';
  if (text.toLowerCase() === 'false') return 'выключено';
  return text || '(пусто)';
}

function formatConnectionSettingRecommendation(value) {
  const text = String(value ?? '').trim();
  if (text.toLowerCase() === 'true') return 'Рекомендуется включить.';
  if (text.toLowerCase() === 'false') return 'Рекомендуется выключить.';
  return `Рекомендуемое значение: ${formatConnectionSettingValue(value)}.`;
}

function renderChanges(changes) {
  els.changesPanel.textContent = '';

  if (!state.originalText) {
    els.changesPanel.classList.add('hidden');
    return;
  }

  const title = document.createElement('h2');
  const summary = document.createElement('span');
  const head = document.createElement('div');
  const body = document.createElement('div');

  title.textContent = 'Что изменится';
  summary.className = 'changes-summary';
  summary.textContent = formatChangeCount(countChanges(changes));
  head.className = 'panel-head';
  head.append(title, summary);
  body.className = 'changes-body';

  if (changes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'changes-empty';
    empty.textContent = 'Изменений нет.';
    body.append(empty);
  } else {
    changes.forEach((section) => {
      const wrap = document.createElement('div');
      const sectionTitle = document.createElement('div');
      const list = document.createElement('ul');

      wrap.className = 'change-section';
      sectionTitle.className = 'change-section-title';
      sectionTitle.textContent = section.title;
      list.className = 'change-list';
      section.items.forEach((text) => {
        const item = document.createElement('li');
        item.className = getChangeItemClass(text);
        item.textContent = text;
        list.append(item);
      });

      wrap.append(sectionTitle, list);
      body.append(wrap);
    });
  }

  els.changesPanel.append(head, body);
  els.changesPanel.classList.remove('hidden');
}

function getChangeItemClass(text) {
  const value = String(text || '').toLowerCase();
  const classes = ['change-item'];

  if (value.startsWith('удалена ') || value.includes(': отключена ') || value.includes(' отключена подписка ')) {
    classes.push('change-item-remove');
  } else if (
    value.startsWith('добавлена ') ||
    value.startsWith('добавлен ') ||
    value.startsWith('будет добавлен ') ||
    value.includes(': подключена ') ||
    value.includes(' подключена подписка ')
  ) {
    classes.push('change-item-add');
  }

  return classes.join(' ');
}

function collectChanges(activeProviders) {
  if (!state.originalText) return [];

  const sections = [];
  const structuralChanges = [];
  const connectionSettingChanges = collectConnectionSettingChanges();
  const pendingBulkIntervalChanges = collectPendingBulkIntervalChanges(activeProviders);
  const providerChanges = collectProviderChanges(activeProviders);
  const groupUseChanges = collectGroupUseChanges();

  if (!state.hasProvidersSection && activeProviders.length > 0) {
    structuralChanges.push('Будет добавлен раздел подписок.');
  }

  if (structuralChanges.length > 0) sections.push({ title: 'Структура конфигурации', items: structuralChanges });
  if (connectionSettingChanges.length > 0) sections.push({ title: 'Параметры подключения', items: connectionSettingChanges });
  if (pendingBulkIntervalChanges.length > 0) sections.push({ title: 'Ожидает применения', items: pendingBulkIntervalChanges });
  if (providerChanges.length > 0) sections.push({ title: 'Подписки', items: providerChanges });
  if (groupUseChanges.length > 0) sections.push({ title: 'Группы', items: groupUseChanges });

  return sections;
}

function collectPendingBulkIntervalChanges(activeProviders) {
  return getPendingBulkIntervalSummaries(activeProviders).map(formatPendingBulkIntervalSummary);
}

function getPendingBulkIntervalSummaries(activeProviders) {
  if (!state.intervalToolsOpen || activeProviders.length === 0) return [];

  const interval = normalizeIntervalInput(els.bulkIntervalInput.value, 60);
  const healthInterval = normalizeIntervalInput(els.bulkHealthIntervalInput.value, 30);
  if (!interval || !healthInterval) return [];

  return [
    createPendingBulkIntervalSummary(
      'обновление подписок',
      interval,
      activeProviders.filter((provider) => !provider.hasInterval || provider.interval !== interval),
      (provider) => provider.interval,
      (provider) => provider.hasInterval,
    ),
    createPendingBulkIntervalSummary(
      'проверка нод',
      healthInterval,
      activeProviders.filter((provider) => !provider.hasHealthCheck || provider.healthInterval !== healthInterval),
      (provider) => provider.healthInterval,
      (provider) => provider.hasHealthCheck,
    ),
  ].filter(Boolean);
}

function createPendingBulkIntervalSummary(label, nextValue, providers, getCurrentValue, hasCurrentValue) {
  if (providers.length === 0) return null;

  return {
    label,
    current: formatPendingBulkCurrentValue(providers, getCurrentValue, hasCurrentValue),
    next: formatDurationValue(nextValue),
    count: providers.length,
  };
}

function formatPendingBulkCurrentValue(providers, getCurrentValue, hasCurrentValue) {
  const values = providers.map((provider) => (hasCurrentValue(provider) ? getCurrentValue(provider) : ''));
  const uniqueValues = [...new Set(values)];

  if (uniqueValues.length === 1) return uniqueValues[0] ? formatDurationValue(uniqueValues[0]) : 'не задано';
  return 'разные значения';
}

function formatPendingBulkIntervalSummary(summary) {
  return `После «Применить ко всем подпискам»: ${summary.label} ${summary.current} → ${summary.next} для ${formatSubscriptionCount(summary.count)}.`;
}

function formatSubscriptionCount(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return `${count} подписки`;
  return `${count} подписок`;
}

function collectConnectionSettingChanges() {
  const changes = [];

  CONNECTION_SETTING_DEFS.forEach((definition) => {
    const original = state.originalConnectionSettings[definition.key];
    const current = state.connectionSettings[definition.key];
    if (!original?.exists && current?.exists) {
      changes.push(`Добавлена настройка «${definition.title}»: ${formatConnectionSettingValue(current.value)}.`);
    }
  });

  return changes;
}

function collectProviderChanges(activeProviders) {
  const changes = [];
  const originalByName = new Map(state.originalProviders.map((provider) => [provider.name, provider]));
  const activeOriginalNames = new Set();

  activeProviders.forEach((provider) => {
    const original = findOriginalProvider(provider, originalByName);
    if (!original) {
      const groupNames = getProviderUseGroupNames(provider.name);
      const groupText = groupNames.length > 0 ? ` Подключена к группам ${groupNames.join(', ')}.` : '';
      changes.push(`Добавлена подписка ${provider.name}.${groupText}`);
      return;
    }

    activeOriginalNames.add(original.name);

    if (provider.name !== original.name) {
      changes.push(`Подписка ${original.name}: переименована в ${provider.name}.`);
    }

    const current = snapshotProvider(provider, { output: true });
    const changedFields = [
      ...new Set(
        PROVIDER_DIFF_FIELDS
          .filter((field) => current[field.key] !== original[field.key])
          .map((field) => field.label),
      ),
    ];

    if (changedFields.length > 0) {
      changes.push(formatProviderFieldsChange(provider.name, changedFields));
    }
  });

  state.originalProviders.forEach((provider) => {
    if (!activeOriginalNames.has(provider.name)) {
      changes.push(`Удалена подписка ${provider.name}.`);
    }
  });

  return changes;
}

function formatProviderFieldsChange(providerName, changedFields) {
  const verb = changedFields.length === 1 ? 'изменится' : 'изменятся';
  return `У подписки ${providerName} ${verb}: ${changedFields.join(', ')}.`;
}

function findOriginalProvider(provider, originalByName) {
  return originalByName.get(provider.originalName) || originalByName.get(provider.name) || null;
}

function collectGroupUseChanges() {
  const changes = [];
  const originalByName = new Map(state.originalGroups.map((group) => [group.name, group]));
  const originalProviderNames = new Set(state.originalProviders.map((provider) => provider.name));

  state.groups.forEach((group) => {
    const original = originalByName.get(group.originalName || group.name);
    if (!original) {
      changes.push(`Добавлена группа ${group.name}.`);
      return;
    }

    if (group.type !== original.type) {
      changes.push(`Группа ${group.name}: тип изменится с ${original.type || 'не задан'} на ${group.type || 'не задан'}.`);
    }

    collectListDiff(original.proxies, group.proxies).added.forEach((name) => {
      changes.push(`В группе ${group.name} добавлен вариант ${name} в proxies.`);
    });

    collectListDiff(original.proxies, group.proxies).removed.forEach((name) => {
      changes.push(`В группе ${group.name} удален вариант ${name} из proxies.`);
    });

    const originalUse = new Set(original.use);
    const currentUse = new Set(group.use);

    group.use.forEach((providerName) => {
      if (!originalUse.has(providerName)) {
        if (!originalProviderNames.has(providerName)) return;
        changes.push(`В группе ${group.name} подключена подписка ${providerName}.`);
      }
    });

    original.use.forEach((providerName) => {
      if (!currentUse.has(providerName)) {
        changes.push(`В группе ${group.name} отключена подписка ${providerName}.`);
      }
    });
  });

  return changes;
}

function collectListDiff(previous, current) {
  const previousSet = new Set(previous || []);
  const currentSet = new Set(current || []);
  return {
    added: [...currentSet].filter((name) => !previousSet.has(name)),
    removed: [...previousSet].filter((name) => !currentSet.has(name)),
  };
}

function getProviderUseGroupNames(providerName) {
  return state.groups
    .filter((group) => group.useStart !== -1 && group.use.includes(providerName))
    .map((group) => group.name);
}

function snapshotProvider(provider, options = {}) {
  const output = Boolean(options.output);
  const type = String(provider.type || 'http').toLowerCase();
  const writesUrl = output ? (type === 'http' || provider.hasUrl || hasOutputValue(provider.url)) && hasOutputValue(provider.url) : provider.hasUrl;
  const writesFilter = output ? hasOutputValue(provider.filter) : provider.hasFilter;
  const writesExcludeFilter = output ? hasOutputValue(provider.excludeFilter) : provider.hasExcludeFilter;
  const writesExcludeType = output ? hasOutputValue(provider.excludeType) : provider.hasExcludeType;
  const writesUserAgent = output ? hasOutputValue(provider.userAgent) : provider.hasUserAgent;
  const writesXHwid = output ? hasOutputValue(provider.xHwid) : provider.hasXHwid;
  const writesUdp = output ? provider.udp === true : provider.hasUdp;
  const writesTfo = output ? provider.tfo === true : provider.hasTfo;
  const writesPath = output ? (type === 'http' || provider.hasPath || hasOutputValue(provider.path)) && hasOutputValue(provider.path) : provider.hasPath;
  const writesInterval = output ? type === 'http' || provider.hasInterval : provider.hasInterval;
  const writesHealthCheck = output ? type === 'http' || provider.hasHealthCheck : provider.hasHealthCheck;

  return {
    name: provider.name || '',
    hasUrl: Boolean(writesUrl),
    url: provider.url || '',
    hasFilter: Boolean(writesFilter),
    filter: provider.filter || '',
    hasExcludeFilter: Boolean(writesExcludeFilter),
    excludeFilter: provider.excludeFilter || '',
    hasExcludeType: Boolean(writesExcludeType),
    excludeType: provider.excludeType || '',
    hasUserAgent: Boolean(writesUserAgent),
    userAgent: provider.userAgent || '',
    hasXHwid: Boolean(writesXHwid),
    xHwid: provider.xHwid || '',
    hasUdp: Boolean(writesUdp),
    udp: Boolean(provider.udp),
    hasTfo: Boolean(writesTfo),
    tfo: Boolean(provider.tfo),
    hasPath: Boolean(writesPath),
    path: provider.path || '',
    hasInterval: Boolean(writesInterval),
    interval: provider.interval || '',
    hasHealthUrl: Boolean(output ? writesHealthCheck : provider.hasHealthUrl),
    healthUrl: provider.healthUrl || '',
    hasHealthInterval: Boolean(output ? writesHealthCheck : provider.hasHealthInterval),
    healthInterval: provider.healthInterval || '',
  };
}

function hasOutputValue(value) {
  return String(value || '').trim() !== '';
}

function snapshotGroup(group) {
  return {
    name: group.name || '',
    originalName: group.originalName || group.name || '',
    type: group.type || '',
    proxies: group.proxies.slice(),
    use: group.use.slice(),
  };
}

function countChanges(changes) {
  return changes.reduce((total, section) => total + section.items.length, 0);
}

function formatChangeCount(count) {
  if (count === 0) return 'Изменений нет';
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return `${count} изменение`;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return `${count} изменения`;
  return `${count} изменений`;
}

function renderProviders(activeProviders) {
  els.providersList.innerHTML = '';
  els.providersList.classList.toggle('empty-state', activeProviders.length === 0);
  els.providersList.classList.toggle('providers-workbench', activeProviders.length > 0);

  if (!state.originalText) {
    setEmptyState(els.providersList, 'Конфигурация не загружена', 'Загрузите конфигурацию, чтобы увидеть и отредактировать подписки.');
    return;
  }

  if (activeProviders.length === 0) {
    if (state.hasProvidersSection) {
      setEmptyState(els.providersList, 'Нет подписок', 'Добавьте первую подписку.');
    } else {
      setEmptyState(els.providersList, 'Нет раздела proxy-providers', 'Добавьте первую подписку — раздел появится автоматически.');
    }
    return;
  }

  const selectedProvider = getSelectedProvider(activeProviders);
  const sidebar = document.createElement('div');
  const summary = document.createElement('div');
  const detail = document.createElement('div');

  sidebar.className = 'providers-sidebar';
  summary.className = 'providers-summary';
  summary.textContent = `Всего: ${activeProviders.length}`;
  sidebar.append(summary);

  activeProviders.forEach((provider, index) => {
    sidebar.append(createProviderListItem(provider, index, provider === selectedProvider));
  });

  detail.className = 'provider-detail';
  detail.append(createProviderEditor(selectedProvider, activeProviders.indexOf(selectedProvider)));
  els.providersList.append(sidebar, detail);
}

function syncSelectedProvider(activeProviders) {
  const selectedExists = activeProviders.some((provider) => provider.name === state.selectedProviderName);
  state.selectedProviderName = selectedExists ? state.selectedProviderName : activeProviders[0]?.name || '';
}

function getSelectedProvider(activeProviders) {
  return activeProviders.find((provider) => provider.name === state.selectedProviderName) || activeProviders[0] || null;
}

function createProviderListItem(provider, index, isSelected) {
  const button = document.createElement('button');
  const number = document.createElement('span');
  const body = document.createElement('span');
  const title = document.createElement('strong');
  const meta = document.createElement('span');
  const status = document.createElement('span');

  button.className = 'provider-list-item';
  button.classList.toggle('is-selected', isSelected);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(isSelected));
  number.className = 'provider-list-number';
  number.textContent = String(index + 1);
  body.className = 'provider-list-body';
  title.textContent = provider.name || 'Без названия';
  meta.className = 'provider-list-meta';
  meta.textContent = formatProviderListMeta(provider);
  status.className = 'provider-list-status';
  status.classList.toggle('is-live', Boolean(getProviderStatus(provider.name)));
  status.textContent = formatProviderListBadge(provider);

  body.append(title, meta);
  button.append(number, body, status);
  button.addEventListener('click', () => {
    state.selectedProviderName = provider.name;
    render();
  });
  return button;
}

function createProviderEditor(provider, index) {
  const row = els.providerTemplate.content.firstElementChild.cloneNode(true);

  if (!provider) return row;

  row.classList.toggle('is-new', Boolean(provider.highlight));
  row.querySelector('.provider-card-number').textContent = String(index + 1);
  row.querySelector('.provider-card-title').textContent = provider.name || 'Без названия';
  row.querySelector('.provider-card-new').hidden = !provider.isNew;
  renderProviderRuntimeStatus(row, provider);
  bindInput(row, '.provider-url', provider.url, (value) => updateProvider(provider, 'url', value));
  bindProviderName(row, provider);
  bindInput(row, '.provider-filter', provider.filter, (value) => updateProvider(provider, 'filter', value));
  bindInput(row, '.provider-exclude-filter', provider.excludeFilter, (value) => updateProvider(provider, 'excludeFilter', value));
  bindExcludeTypeOptions(row, provider, index);
  markExcludeTypeValidity(row, provider);
  bindInput(row, '.provider-user-agent', provider.userAgent, (value) => updateProvider(provider, 'userAgent', value));
  bindInput(row, '.provider-x-hwid', provider.xHwid, (value) => updateProvider(provider, 'xHwid', value));
  bindHeaderGenerator(row, provider);
  bindCheckbox(row, '.provider-udp', provider.udp, (checked) => updateProvider(provider, 'udp', checked));
  bindCheckbox(row, '.provider-tfo', provider.tfo, (checked) => updateProvider(provider, 'tfo', checked));
  bindInput(row, '.provider-path', provider.path, (value) => updateProvider(provider, 'path', value));
  bindInput(row, '.provider-interval', provider.interval, (value) => updateProvider(provider, 'interval', value));
  bindInput(row, '.provider-health-url', provider.healthUrl, (value) => updateProvider(provider, 'healthUrl', value));
  bindInput(row, '.provider-health-interval', provider.healthInterval, (value) => updateProvider(provider, 'healthInterval', value));
  bindProviderUpdateButton(row, provider);
  row.querySelector('.remove-provider').addEventListener('click', () => removeProvider(provider));
  return row;
}

function getProviderStatus(providerName) {
  return state.providerStatuses?.[providerName] || null;
}

function formatProviderListMeta(provider) {
  const status = getProviderStatus(provider.name);
  if (state.providerStatusLoading) return 'Статусы загружаются';
  if (status?.proxyCount !== null && status?.proxyCount !== undefined) return `${formatProxyCount(status.proxyCount)} · ${formatProviderUpdatedAt(status.updatedAt) || 'время неизвестно'}`;
  if (state.routerApiAvailable) return 'Статус неизвестен';
  return provider.url ? 'URL' : 'Нет ссылки';
}

function formatProviderListBadge(provider) {
  const status = getProviderStatus(provider.name);
  if (state.providerUpdatingName === provider.name) return 'Обновление';
  if (status?.proxyCount !== null && status?.proxyCount !== undefined) return `${status.proxyCount} нод`;
  return provider.isNew ? 'Новая' : provider.type || 'http';
}

function renderProviderRuntimeStatus(root, provider) {
  const box = root.querySelector('.provider-runtime-status');
  const status = getProviderStatus(provider.name);
  const parts = [];

  if (!state.routerApiAvailable) {
    box.hidden = true;
    return;
  }

  box.hidden = false;
  box.className = 'provider-runtime-status';
  if (state.providerStatusLoading) {
    box.textContent = 'Статус подписки загружается.';
    return;
  }
  if (!status) {
    box.classList.add('is-muted');
    box.textContent = 'Mihomo пока не вернул статус этой подписки.';
    return;
  }

  if (status.proxyCount !== null && status.proxyCount !== undefined) parts.push(formatProxyCount(status.proxyCount));
  if (status.vehicleType || status.type) parts.push(status.vehicleType || status.type);
  const updatedAt = formatProviderUpdatedAt(status.updatedAt);
  if (updatedAt) parts.push(`обновлено ${updatedAt}`);
  box.textContent = parts.join(' · ') || 'Статус получен.';
}

function bindProviderUpdateButton(root, provider) {
  const button = root.querySelector('.provider-update-button');
  const label = button.querySelector('.button-label');
  const isUpdating = state.providerUpdatingName === provider.name;

  button.hidden = !state.routerApiAvailable;
  button.disabled = !state.routerApiAvailable || !provider.name || provider.isNew || isUpdating;
  button.title = state.routerApiAvailable
    ? 'Обновить эту подписку через Mihomo API'
    : 'Доступно только в MihUI на роутере рядом с Mihomo';
  if (label) label.textContent = isUpdating ? 'Обновление...' : 'Обновить';
  button.addEventListener('click', () => updateProviderNow(provider));
}

function formatProxyCount(count) {
  const value = Number(count);
  if (!Number.isFinite(value)) return 'нод неизвестно';
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return `${value} нода`;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return `${value} ноды`;
  return `${value} нод`;
}

function formatProviderUpdatedAt(value) {
  if (value === null || value === undefined || value === '') return '';
  const date = typeof value === 'number' ? new Date(value > 100000000000 ? value : value * 1000) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function setEmptyState(element, title, text) {
  const wrap = document.createElement('div');
  const titleEl = document.createElement('strong');
  const textEl = document.createElement('span');

  wrap.className = 'empty-state-content';
  titleEl.textContent = title;
  textEl.textContent = text;
  wrap.append(titleEl, textEl);
  element.textContent = '';
  element.append(wrap);
}

function bindProviderName(root, provider) {
  const input = root.querySelector('.provider-name');
  const manualButton = root.querySelector('.manual-name-button');

  input.value = provider.name ?? '';
  input.disabled = provider.nameLocked !== false;
  manualButton.hidden = !input.disabled;
  manualButton.addEventListener('click', () => {
    provider.nameLocked = false;
    provider.autoName = false;
    render();
    const scheduleFocus = window.requestAnimationFrame || window.setTimeout;
    scheduleFocus(() => {
      const editableInput = els.providersList.querySelector('.provider-detail .provider-name:not(:disabled)');
      if (editableInput) {
        editableInput.focus();
        editableInput.select();
      }
    });
  });
  input.addEventListener('input', () => renameProvider(provider, input.value));
}

function bindHeaderGenerator(root, provider) {
  root.querySelector('.generate-headers-button').addEventListener('click', () => {
    applyGeneratedHeaders(provider);
    root.querySelector('.provider-user-agent').value = provider.userAgent;
    root.querySelector('.provider-x-hwid').value = provider.xHwid;
    generateOutput();
    renderOutputOnly();
  });
}

function applyGeneratedHeaders(provider) {
  provider.userAgent = DEFAULT_GENERATED_USER_AGENT;
  provider.xHwid = generateHwid();
}

function generateHwid() {
  const bytes = new Uint8Array(6);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function bindInput(root, selector, value, onChange) {
  const input = root.querySelector(selector);
  input.value = value ?? '';
  input.addEventListener('input', () => onChange(input.value));
}

function bindExcludeTypeOptions(root, provider, index) {
  const input = root.querySelector('.provider-exclude-type');
  const toggle = root.querySelector('.exclude-type-toggle');
  const popover = root.querySelector('.exclude-type-popover');
  const options = root.querySelector('.exclude-type-options');
  const error = root.querySelector('.provider-exclude-type-error');
  const selected = new Set(parseExcludeTypes(provider.excludeType).map((item) => item.toLowerCase()));
  const popoverId = `exclude-type-options-${index + 1}`;
  const errorId = `exclude-type-error-${index + 1}`;

  input.value = provider.excludeType || '';
  input.setAttribute('aria-describedby', errorId);
  popover.id = popoverId;
  error.id = errorId;
  toggle.setAttribute('aria-controls', popoverId);
  toggle.setAttribute('aria-expanded', 'false');
  options.innerHTML = '';
  input.addEventListener('input', () => {
    updateProvider(provider, 'excludeType', input.value);
    syncExcludeTypeCheckboxes(root, provider);
    markExcludeTypeValidity(root, provider);
  });

  toggle.addEventListener('click', () => {
    const isOpen = popover.hidden;
    popover.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  EXCLUDE_TYPE_OPTIONS.forEach((type) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    const text = document.createElement('span');

    checkbox.type = 'checkbox';
    checkbox.value = type;
    checkbox.checked = selected.has(type);
    checkbox.addEventListener('change', () => {
      const next = new Set(parseExcludeTypes(provider.excludeType).map((item) => item.toLowerCase()));
      if (checkbox.checked) {
        next.add(type);
      } else {
        next.delete(type);
      }
      const nextValue = EXCLUDE_TYPE_OPTIONS.filter((item) => next.has(item)).join('|');
      input.value = nextValue;
      updateProvider(provider, 'excludeType', nextValue);
      markExcludeTypeValidity(root, provider);
    });

    text.textContent = type;
    label.append(checkbox, text);
    options.append(label);
  });
}

function syncExcludeTypeCheckboxes(root, provider) {
  const selected = new Set(parseExcludeTypes(provider.excludeType).map((item) => item.toLowerCase()));
  root.querySelectorAll('.exclude-type-options input').forEach((checkbox) => {
    checkbox.checked = selected.has(checkbox.value);
  });
}

function markExcludeTypeValidity(root, provider) {
  const input = root.querySelector('.provider-exclude-type');
  const error = root.querySelector('.provider-exclude-type-error');
  const invalidTypes = getInvalidExcludeTypes(provider.excludeType);
  const message =
    invalidTypes.length > 0
      ? `Неизвестные типы: ${invalidTypes.join(', ')}. Пример: ss|http|vless`
      : '';
  input.classList.toggle('is-invalid', invalidTypes.length > 0);
  input.setAttribute('aria-invalid', String(invalidTypes.length > 0));
  input.title = message || root.querySelector('.exclude-type-field').title;
  error.textContent = message;
  error.hidden = !message;
}

function bindCheckbox(root, selector, value, onChange) {
  const input = root.querySelector(selector);
  input.checked = Boolean(value);
  input.addEventListener('change', () => onChange(input.checked));
}

function renderMainGroup(groups, activeProviders) {
  els.groupOrderList.innerHTML = '';
  els.groupOrderList.classList.toggle('empty-state', !state.originalText);

  if (!state.originalText) {
    setEmptyState(els.groupOrderList, 'Схема появится после загрузки', 'Она покажет, куда правила отправляют трафик.');
    return;
  }

  const scenarios = getRuleScenarios();
  if (scenarios.length === 0) {
    setEmptyState(els.groupOrderList, 'Нет правил маршрутизации', 'Добавьте rules, чтобы увидеть путь трафика по конфигурации.');
    return;
  }

  const selectedScenario = getSelectedRouteScenario(scenarios);
  els.groupOrderList.classList.remove('empty-state');
  els.groupOrderList.append(createRouteMap(scenarios, selectedScenario, groups, activeProviders));
}

function createRouteMap(scenarios, selectedScenario, groups, activeProviders) {
  const map = document.createElement('div');
  const scenarioPanel = document.createElement('div');
  const scenarioTitle = document.createElement('div');
  const scenarioList = document.createElement('div');
  const flow = document.createElement('div');
  const flowHead = document.createElement('div');
  const flowTitle = document.createElement('strong');
  const flowMeta = document.createElement('span');
  const chain = document.createElement('div');
  const targetNode = buildRouteNodeModel(selectedScenario.target, groups, activeProviders);

  map.className = 'route-map';
  scenarioPanel.className = 'route-scenarios';
  scenarioTitle.className = 'route-map-title';
  scenarioTitle.textContent = 'Сценарии из rules';
  scenarioList.className = 'route-scenario-list';
  scenarios.forEach((scenario) => {
    scenarioList.append(createRouteScenarioButton(scenario, selectedScenario.id));
  });

  flow.className = 'route-flow';
  flowHead.className = 'route-flow-head';
  flowTitle.textContent = selectedScenario.label;
  flowMeta.textContent = `${formatRuleCount(selectedScenario.ruleCount)} · цель: ${selectedScenario.target}`;
  flowHead.append(flowTitle, flowMeta);
  chain.className = 'route-chain';
  chain.append(
    createRouteNodeCard({
      kind: 'rule',
      title: formatRouteRuleTitle(selectedScenario),
      badge: formatRouteRuleBadge(selectedScenario),
      description: formatRouteRuleDescription(selectedScenario),
    }),
    createRouteFlowArrow(),
    createRouteNodeTree(targetNode),
  );

  scenarioPanel.append(scenarioTitle, scenarioList);
  flow.append(flowHead, chain);
  map.append(scenarioPanel, flow);
  return map;
}

function createRouteScenarioButton(scenario, selectedId) {
  const button = document.createElement('button');
  const name = document.createElement('strong');
  const meta = document.createElement('span');
  const selected = scenario.id === selectedId;

  button.className = 'route-scenario';
  button.type = 'button';
  button.setAttribute('aria-pressed', String(selected));
  if (selected) button.classList.add('is-active');
  name.textContent = scenario.label;
  meta.textContent = formatRouteScenarioMeta(scenario);
  button.append(name, meta);
  button.addEventListener('click', () => {
    state.selectedRouteScenarioId = scenario.id;
    renderMainGroup(state.groups, state.providers.filter((provider) => !provider.deleted));
  });

  return button;
}

function getSelectedRouteScenario(scenarios) {
  const selected = scenarios.find((scenario) => scenario.id === state.selectedRouteScenarioId)
    || scenarios.find((scenario) => scenario.isDefault)
    || scenarios[0];
  state.selectedRouteScenarioId = selected?.id || '';
  return selected;
}

function getRuleScenarios() {
  const lines = splitLines(state.originalText);
  const rulesSection = findTopSection(lines, 'rules');
  const scenarios = [];
  const scenarioByKey = new Map();
  if (!rulesSection) return scenarios;

  for (let index = rulesSection.start + 1; index < rulesSection.end; index += 1) {
    const match = lines[index].match(/^\s*-\s*(.+?)\s*(?:#.*)?$/);
    if (!match) continue;

    const parts = splitRuleParts(match[1]).map((part) => cleanScalar(part)).filter(Boolean);
    const target = getRuleTargetFromParts(parts);
    if (!parts.length || !target) continue;

    const type = String(parts[0] || '').toUpperCase();
    const isDefault = type === 'MATCH';
    const key = `${isDefault ? 'match' : 'target'}:${target.toLowerCase()}`;
    const matcher = formatRuleMatcher(parts);
    const existing = scenarioByKey.get(key);

    if (existing) {
      existing.ruleCount += 1;
      if (!existing.examples.includes(matcher) && existing.examples.length < 3) {
        existing.examples.push(matcher);
      }
      continue;
    }

    const scenario = {
      id: key,
      type,
      target,
      matcher,
      examples: [matcher],
      label: isDefault ? 'Остальной трафик' : formatRouteScenarioLabel(target, matcher),
      ruleCount: 1,
      isDefault,
    };

    scenarios.push(scenario);
    scenarioByKey.set(key, scenario);
  }

  return scenarios;
}

function formatRouteScenarioMeta(scenario) {
  const matcher = scenario.ruleCount > 1 ? `первое: ${scenario.matcher}` : scenario.matcher;
  return `${formatRuleCount(scenario.ruleCount)} · ${matcher}`;
}

function formatRouteRuleTitle(scenario) {
  if (scenario.ruleCount === 1) return scenario.matcher;
  return `${formatRuleCount(scenario.ruleCount)} → ${scenario.target}`;
}

function formatRouteRuleBadge(scenario) {
  return scenario.ruleCount === 1 ? scenario.type : 'rules';
}

function formatRouteRuleDescription(scenario) {
  if (scenario.ruleCount === 1) {
    return `Если сработает ${scenario.matcher}, трафик пойдет в ${scenario.target}.`;
  }

  const examples = scenario.examples.join('; ');
  const hiddenCount = scenario.ruleCount - scenario.examples.length;
  const tail = hiddenCount > 0 ? `; и еще ${formatRuleCount(hiddenCount)}` : '';
  return `${formatRuleCount(scenario.ruleCount)} ведут в ${scenario.target}. Примеры: ${examples}${tail}.`;
}

function formatRouteScenarioLabel(target, matcher) {
  if (BUILT_IN_OUTBOUNDS.has(String(target).toUpperCase())) return String(target).toUpperCase();
  return String(target || matcher || 'Правило');
}

function formatRuleMatcher(parts) {
  const type = String(parts[0] || '').toUpperCase();
  const value = parts[1] || '';

  if (type === 'MATCH') return 'MATCH';
  if (type === 'RULE-SET') return value ? `Набор правил ${value}` : 'Набор правил';
  if (type === 'GEOSITE') return value ? `Категория сайтов ${value}` : 'Категория сайтов';
  if (type === 'GEOIP') return value ? `География IP ${value}` : 'География IP';
  if (type === 'DOMAIN') return value ? `Домен ${value}` : 'Домен';
  if (type === 'DOMAIN-SUFFIX') return value ? `Доменная зона ${value}` : 'Доменная зона';
  if (type === 'DOMAIN-KEYWORD') return value ? `Домен содержит ${value}` : 'Домен содержит';
  if (type === 'IP-CIDR' || type === 'IP-CIDR6') return value ? `IP-сеть ${value}` : 'IP-сеть';
  if (type === 'PROCESS-NAME') return value ? `Процесс ${value}` : 'Процесс';
  if (type === 'PROCESS-PATH') return value ? `Путь процесса ${value}` : 'Путь процесса';
  if (type === 'AND' || type === 'OR' || type === 'NOT') return `${type}: составное условие`;
  if (type === 'SUB-RULE') return value ? `Подправило ${value}` : 'Подправило';

  return value ? `${type} ${value}` : type || 'Правило';
}

function formatRuleCount(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return `${count} правило`;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return `${count} правила`;
  return `${count} правил`;
}

function buildRouteNodeModel(target, groups, activeProviders, visited = new Set()) {
  const name = String(target || '').trim();
  const upper = name.toUpperCase();
  if (!name) return createRouteLeaf('unknown', 'Не указано', 'нет цели', 'Правило не указывает конечную цель.');

  if (name === ROUTE_AUTO_PROXIES_TARGET) {
    return createRouteLeaf(
      'external',
      'Обычные proxies',
      'include-all-proxies',
      'Группа берет обычные прокси из раздела proxies. Этот редактор пока не раскрывает их поштучно.',
    );
  }

  if (BUILT_IN_OUTBOUNDS.has(upper)) {
    return createRouteLeaf(getBuiltInRouteKind(upper), upper, getBuiltInRouteBadge(upper), describeBuiltInOutbound(upper));
  }

  const group = findGroupByName(groups, name);
  if (group) {
    const key = `group:${group.name.toLowerCase()}`;
    const source = getGroupSource(group);
    const options = getRouteGroupOptions(group, activeProviders);
    const nextVisited = new Set(visited);

    if (visited.has(key)) {
      return createRouteLeaf('cycle', group.name, 'цикл', 'Эта группа уже встречалась выше по маршруту.');
    }

    nextVisited.add(key);
    return {
      kind: isProxyModeGroup(group) ? 'mode' : 'group',
      title: group.name,
      badge: formatRouteGroupBadge(group, source, options.length),
      description: describeRouteGroup(group, source, options.length),
      children: options.slice(0, ROUTE_CHILD_LIMIT).map((option) => buildRouteNodeModel(option, groups, activeProviders, nextVisited)),
      omittedCount: Math.max(0, options.length - ROUTE_CHILD_LIMIT),
    };
  }

  const provider = activeProviders.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (provider) {
    return createRouteLeaf('provider', provider.name, provider.type || 'подписка', describeRouteProvider(provider));
  }

  return createRouteLeaf('external', name, 'внешний узел', 'Имя есть в маршруте, но не найдено среди групп и подписок редактора.');
}

function createRouteLeaf(kind, title, badge, description) {
  return { kind, title, badge, description, children: [], omittedCount: 0 };
}

function getBuiltInRouteKind(name) {
  if (name === 'DIRECT' || name === 'COMPATIBLE') return 'direct';
  if (name === 'REJECT' || name === 'REJECT-DROP') return 'reject';
  if (name === 'PASS' || name === 'PASS-RULE') return 'pass';
  return 'built-in';
}

function getBuiltInRouteBadge(name) {
  if (name === 'DIRECT') return 'прямой выход';
  if (name === 'COMPATIBLE') return 'как DIRECT';
  if (name === 'REJECT' || name === 'REJECT-DROP') return 'блокировка';
  if (name === 'PASS' || name === 'PASS-RULE') return 'пропустить дальше';
  if (name === 'GLOBAL') return 'глобальный режим';
  return 'встроенный выход';
}

function getRouteGroupOptions(group, activeProviders) {
  const source = getGroupSource(group);
  if (source === 'proxies') return group.proxies;
  if (source === 'use') return group.use;
  if (source === 'include-all') return [ROUTE_AUTO_PROXIES_TARGET, ...activeProviders.map((provider) => provider.name)];
  if (source === 'include-all-providers') return activeProviders.map((provider) => provider.name);
  if (source === 'include-all-proxies') return [ROUTE_AUTO_PROXIES_TARGET];
  return [];
}

function formatRouteGroupBadge(group, source, count) {
  const type = group.type || 'группа';
  if (source === 'proxies') return `${type} · ${formatRouteCount(count, 'вариант', 'варианта', 'вариантов')}`;
  if (source === 'use') return `${type} · ${formatRouteCount(count, 'подписка', 'подписки', 'подписок')}`;
  if (source === 'include-all') return `${type} · все узлы`;
  if (source === 'include-all-providers') return `${type} · все подписки`;
  if (source === 'include-all-proxies') return `${type} · все proxies`;
  return type;
}

function formatRouteCount(count, one, few, many) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return `${count} ${one}`;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

function describeRouteGroup(group, source, count) {
  const type = String(group.type || '').toLowerCase();
  let behavior = `${group.name} передает трафик в варианты ниже.`;

  if (type === 'select') behavior = `${group.name} дает выбрать один из вариантов вручную.`;
  if (type === 'url-test') behavior = `${group.name} выбирает самый быстрый доступный вариант.`;
  if (type === 'fallback') behavior = `${group.name} проверяет варианты по порядку и берет первый доступный.`;
  if (type === 'load-balance') behavior = `${group.name} распределяет трафик между вариантами.`;
  if (type === 'relay') behavior = `${group.name} строит цепочку через варианты по порядку.`;

  return `${behavior} ${describeRouteGroupSource(source, count)}`;
}

function describeRouteGroupSource(source, count) {
  if (source === 'proxies') return `Наполнение: ${formatRouteCount(count, 'вариант', 'варианта', 'вариантов')} из proxies.`;
  if (source === 'use') return `Наполнение: ${formatRouteCount(count, 'подписка', 'подписки', 'подписок')} из proxy-providers.`;
  if (source === 'include-all') return 'Наполнение собирается автоматически из обычных proxies и подписок.';
  if (source === 'include-all-providers') return 'Наполнение собирается автоматически из всех подписок.';
  if (source === 'include-all-proxies') return 'Наполнение собирается автоматически из обычных proxies.';
  return 'Явное наполнение не найдено.';
}

function describeRouteProvider(provider) {
  const parts = [`Подписка поставляет узлы для группы.`];
  if (provider.filter) parts.push(`Фильтр: ${provider.filter}.`);
  if (provider.excludeFilter) parts.push(`Исключения: ${provider.excludeFilter}.`);
  return parts.join(' ');
}

function createRouteFlowArrow() {
  const arrow = document.createElement('div');
  arrow.className = 'route-flow-arrow';
  arrow.textContent = '↓';
  return arrow;
}

function createRouteNodeTree(node) {
  const wrap = document.createElement('div');
  wrap.className = 'route-node-wrap';
  wrap.append(createRouteNodeCard(node));

  if (node.children?.length || node.omittedCount > 0) {
    const children = document.createElement('div');
    children.className = 'route-node-children';
    node.children.forEach((child) => children.append(createRouteNodeTree(child)));
    if (node.omittedCount > 0) {
      children.append(createRouteNodeCard(createRouteLeaf('more', `Еще ${node.omittedCount}`, 'скрыто', 'Остальные варианты есть в конфигурации, но свернуты в схеме.')));
    }
    wrap.append(children);
  }

  return wrap;
}

function createRouteNodeCard(node) {
  const card = document.createElement('div');
  const head = document.createElement('div');
  const title = document.createElement('strong');
  const badge = document.createElement('span');
  const text = document.createElement('p');

  card.className = `route-node is-${node.kind}`;
  head.className = 'route-node-head';
  title.textContent = node.title;
  badge.textContent = node.badge;
  text.textContent = node.description;
  head.append(title, badge);
  card.append(head, text);
  return card;
}

function renderRouteSections(groups, activeProviders, ruleTargets, mainGroup, mainSource, mainItems) {
  const ruleGroupTargets = ruleTargets
    .map((target) => findGroupByName(groups, target))
    .filter(Boolean)
    .filter((group, index, list) => list.findIndex((item) => item.name === group.name) === index);

  const serviceCandidates = [mainGroup, ...ruleGroupTargets].filter(Boolean);
  const serviceGroups = serviceCandidates
    .filter((group, index, list) => list.findIndex((item) => item.name === group.name) === index)
    .filter((group) => !isProxyModeGroup(group));
  const proxyModeGroups = collectProxyModeGroups(groups, serviceGroups, ruleGroupTargets, mainGroup);
  const builtIns = collectBuiltInOutbounds(serviceGroups, mainGroup, mainItems);

  if (serviceGroups.length > 0) {
    renderRouteSection(
      'Сервисные группы',
      'Это категории ресурсов из rules: YouTube, Steam, AI и т.п. Они не являются прокси-узлами.',
      serviceGroups.map((group) => createRouteCard(group.name, describeServiceGroup(group))),
    );
  }

  if (proxyModeGroups.length > 0 || builtIns.length > 0) {
    renderRouteSection(
      'Прокси-режимы и прямые выходы',
      'Сюда сервисные группы передают трафик, когда нужно выбрать конкретный способ выхода.',
      [
        ...proxyModeGroups.map((group) => createRouteCard(group.name, describeMainGroupBehavior(group, getGroupSource(group)), 'mode')),
        ...builtIns.map((name) => createRouteCard(name, describeBuiltInOutbound(name), name === 'DIRECT' ? 'direct' : 'mode')),
      ],
    );
  }

  if (serviceGroups.length === 0 && proxyModeGroups.length === 0 && builtIns.length === 0 && mainGroup) {
    const fallbackText = mainItems.length > 0
      ? mainItems.map((item, index) => `${index + 1}. ${item}`).join(' / ')
      : describeImplicitGroupSource(mainGroup);
    renderRouteSection(
      'Текущая группа',
      'Отдельные сервисные группы не найдены, поэтому показана основная группа.',
      [createRouteCard(mainGroup.name, `${describeMainGroupBehavior(mainGroup, mainSource)} ${fallbackText}`)],
    );
  }
}

function renderRouteSection(titleText, noteText, cards) {
  const title = document.createElement('div');
  const note = document.createElement('p');
  const grid = document.createElement('div');

  title.className = 'route-section-title';
  title.textContent = titleText;
  note.className = 'route-section-note';
  note.textContent = noteText;
  grid.className = 'route-card-grid';
  cards.forEach((card) => grid.append(card));

  els.groupOrderList.append(title, note, grid);
}

function createRouteCard(title, text, variant = '') {
  const item = document.createElement('div');
  item.className = 'route-choice route-card';
  if (variant === 'direct') item.classList.add('is-direct');
  if (variant === 'mode') item.classList.add('is-mode');
  item.append(createRouteItemInfo(title, text));
  return item;
}

function createRouteItemInfo(title, text) {
  const info = document.createElement('div');
  const name = document.createElement('strong');
  const kind = document.createElement('span');

  info.className = 'group-order-info';
  name.textContent = title;
  kind.className = 'group-order-type';
  kind.textContent = text;
  info.append(name, kind);
  return info;
}

function describeServiceGroup(group) {
  const options = getExplicitGroupOptions(group);
  const optionsText = options.length > 0
    ? `Варианты внутри: ${options.slice(0, 5).join(', ')}${options.length > 5 ? ` и еще ${options.length - 5}` : ''}.`
    : describeImplicitGroupSource(group);
  return `${group.name} получает трафик из rules и дает выбрать политику для этого ресурса. ${optionsText}`;
}

function collectProxyModeGroups(groups, serviceGroups, ruleGroupTargets, mainGroup) {
  const referenced = new Set();
  [...serviceGroups, mainGroup].filter(Boolean).forEach((group) => {
    getExplicitGroupOptions(group).forEach((name) => referenced.add(name));
  });

  return groups
    .filter((group) => isProxyModeGroup(group))
    .filter((group) => referenced.has(group.name) || ruleGroupTargets.some((target) => target.name === group.name))
    .filter((group, index, list) => list.findIndex((item) => item.name === group.name) === index);
}

function collectBuiltInOutbounds(serviceGroups, mainGroup, mainItems) {
  const names = new Set();
  [...serviceGroups, mainGroup].filter(Boolean).forEach((group) => {
    getExplicitGroupOptions(group).forEach((name) => {
      if (BUILT_IN_OUTBOUNDS.has(name.toUpperCase())) names.add(name.toUpperCase());
    });
  });
  mainItems.forEach((name) => {
    if (BUILT_IN_OUTBOUNDS.has(String(name).toUpperCase())) names.add(String(name).toUpperCase());
  });
  return [...names];
}

function getExplicitGroupOptions(group) {
  if (!group) return [];
  if (group.proxies?.length) return group.proxies;
  if (group.use?.length) return group.use;
  return [];
}

function isProxyModeGroup(group) {
  return PROXY_MODE_TYPES.has(String(group?.type || '').toLowerCase());
}

function describeBuiltInOutbound(name) {
  const upper = String(name).toUpperCase();
  if (upper === 'DIRECT') return 'Прямое подключение без прокси. Для чувствительных правил это важно проверять отдельно.';
  if (upper === 'PASS') return 'Передать трафик дальше без окончательного выбора на этом уровне.';
  if (upper === 'REJECT') return 'Заблокировать трафик.';
  if (upper === 'GLOBAL') return 'Использовать глобально выбранный режим клиента.';
  return 'Встроенный выход Mihomo.';
}

function createRouteArrow() {
  const arrow = document.createElement('div');
  arrow.className = 'route-arrow';
  arrow.textContent = '↓';
  return arrow;
}

function createRouteStage(title, text) {
  const stage = document.createElement('div');
  const body = document.createElement('div');
  const heading = document.createElement('strong');
  const description = document.createElement('span');

  stage.className = 'route-stage';
  heading.textContent = title;
  description.textContent = text;
  body.append(heading, description);
  stage.append(body);
  return stage;
}

function createRouteBranch(title, text) {
  const branch = document.createElement('div');
  const heading = document.createElement('strong');
  const description = document.createElement('span');

  branch.className = 'route-branch';
  heading.textContent = title;
  description.textContent = text;
  branch.append(heading, description);
  return branch;
}

function findMainGroup(groups) {
  return groups.find((group) => group.name.toLowerCase() === 'proxy') || null;
}

function findGroupByName(groups, name) {
  return groups.find((group) => group.name.toLowerCase() === String(name || '').toLowerCase()) || null;
}

function getGroupSource(group) {
  if (!group) return '';
  if (group.proxies?.length) return 'proxies';
  if (group.use?.length) return 'use';
  if (group.includeAll) return 'include-all';
  if (group.includeAllProviders) return 'include-all-providers';
  if (group.includeAllProxies) return 'include-all-proxies';
  return 'none';
}

function describeMainGroupBehavior(group, source) {
  const type = String(group.type || 'group').toLowerCase();
  if (source === 'include-all') return `${group.name} автоматически берет все доступные узлы через include-all.`;
  if (type === 'fallback') return `${group.name} проверяет ${source} по порядку и берет первый доступный вариант.`;
  if (type === 'url-test') return `${group.name} выбирает самый быстрый вариант из ${source}.`;
  if (type === 'select') return `${group.name} дает выбрать вариант вручную в клиенте.`;
  if (type === 'load-balance') return `${group.name} распределяет трафик между вариантами из ${source}.`;
  if (type === 'relay') return `${group.name} строит цепочку по порядку из ${source}.`;
  return `${group.name} использует список ${source}.`;
}

function describeImplicitGroupSource(group) {
  if (group.includeAll) return 'include-all: все доступные узлы';
  if (group.includeAllProviders) return 'include-all-providers: все proxy-providers';
  if (group.includeAllProxies) return 'include-all-proxies: все обычные proxies';
  return 'нет proxies/use';
}

function getDefaultRuleTarget() {
  const lines = splitLines(state.originalText);
  const rulesSection = findTopSection(lines, 'rules');
  if (!rulesSection) return '';

  for (let index = rulesSection.end - 1; index > rulesSection.start; index -= 1) {
    const match = lines[index].match(/^\s*-\s*(.+?)\s*(?:#.*)?$/);
    if (!match) continue;
    const parts = splitRuleParts(match[1]).map((part) => cleanScalar(part)).filter(Boolean);
    if (parts[0]?.toUpperCase() === 'MATCH') return getRuleTargetFromParts(parts);
  }

  return '';
}

function getRuleTargets() {
  const lines = splitLines(state.originalText);
  const rulesSection = findTopSection(lines, 'rules');
  const targets = [];
  if (!rulesSection) return targets;

  for (let index = rulesSection.start + 1; index < rulesSection.end; index += 1) {
    const match = lines[index].match(/^\s*-\s*(.+?)\s*(?:#.*)?$/);
    if (!match) continue;
    const parts = splitRuleParts(match[1]).map((part) => cleanScalar(part)).filter(Boolean);
    const target = getRuleTargetFromParts(parts);
    if (target) targets.push(target);
  }

  return targets.filter((target, index) => targets.indexOf(target) === index);
}

function getRuleTargetFromParts(parts) {
  for (let index = parts.length - 1; index > 0; index -= 1) {
    const part = parts[index];
    if (!RULE_OPTIONS.has(String(part).toLowerCase())) return part;
  }

  return '';
}

function splitRuleParts(value) {
  const result = [];
  let depth = 0;
  let current = '';

  for (const char of String(value || '')) {
    if (char === '(' || char === '[' || char === '{') depth += 1;
    if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

function renderGroups(activeProviders, groupsWithUse) {
  els.groupsMatrix.innerHTML = '';
  els.groupsMatrix.classList.toggle('empty-state', !state.originalText);

  if (!state.originalText) {
    setEmptyState(els.groupsMatrix, 'Связи появятся после загрузки', 'После загрузки управляйте подключением подписок к группам.');
    return;
  }

  syncSelectedGroup();
  renderGroupEditor(activeProviders);

  if (groupsWithUse.length === 0) {
    renderIncludeAllExplanation(activeProviders);
    return;
  }

  if (activeProviders.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    setEmptyState(empty, 'Нет подписок', 'Добавьте подписку, чтобы подключать ее к группам use.');
    els.groupsMatrix.append(empty);
    return;
  }

  const orderedGroupsWithUse = orderGroupsByProxySequence(groupsWithUse);
  const table = document.createElement('table');
  table.className = 'matrix';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.append(createCell('th', 'Подписка (provider key)'));
  orderedGroupsWithUse.forEach((group) => {
    const cell = createCell('th', group.name);
    const type = document.createElement('span');
    type.className = 'group-type';
    type.textContent = group.type || 'group';
    cell.append(type);
    headRow.append(cell);
  });
  thead.append(headRow);

  const tbody = document.createElement('tbody');
  activeProviders.forEach((provider, index) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const nameWrap = document.createElement('div');
    const number = document.createElement('span');
    const name = document.createElement('span');

    nameWrap.className = 'matrix-provider-name';
    number.className = 'matrix-provider-number';
    number.textContent = String(index + 1);
    name.textContent = provider.name;
    nameWrap.append(number, name);
    nameCell.append(nameWrap);
    row.append(nameCell);

    orderedGroupsWithUse.forEach((group) => {
      const cell = document.createElement('td');
      cell.className = 'check-cell';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = group.use.includes(provider.name);
      checkbox.setAttribute('aria-label', `${provider.name}: ${group.name}`);
      checkbox.addEventListener('change', () => toggleGroupUse(group, provider.name, checkbox.checked));
      cell.append(checkbox);
      row.append(cell);
    });

    tbody.append(row);
  });

  table.append(thead, tbody);
  els.groupsMatrix.append(table);
}

function syncSelectedGroup() {
  const selectedExists = state.groups.some((group) => group.name === state.selectedGroupName);
  state.selectedGroupName = selectedExists ? state.selectedGroupName : state.groups[0]?.name || '';
}

function getSelectedGroup() {
  return state.groups.find((group) => group.name === state.selectedGroupName) || state.groups[0] || null;
}

function renderGroupEditor(activeProviders) {
  const selectedGroup = getSelectedGroup();
  const wrap = document.createElement('div');
  const sidebar = document.createElement('div');
  const detail = document.createElement('div');
  const summary = document.createElement('div');

  wrap.className = 'group-editor';
  sidebar.className = 'group-editor-sidebar';
  detail.className = 'group-editor-detail';
  summary.className = 'group-editor-summary';
  summary.textContent = `Групп: ${state.groups.length}`;
  sidebar.append(summary);

  state.groups.forEach((group, index) => {
    sidebar.append(createGroupListItem(group, index, group === selectedGroup));
  });

  if (selectedGroup) {
    detail.append(createGroupEditorDetail(selectedGroup, activeProviders));
  } else {
    setEmptyState(detail, 'Нет групп', 'Добавьте первую группу маршрутизации.');
  }

  wrap.append(sidebar, detail);
  els.groupsMatrix.append(wrap);
}

function createGroupListItem(group, index, isSelected) {
  const button = document.createElement('button');
  const number = document.createElement('span');
  const body = document.createElement('span');
  const title = document.createElement('strong');
  const meta = document.createElement('span');
  const status = document.createElement('span');

  button.className = 'group-list-item';
  button.classList.toggle('is-selected', isSelected);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(isSelected));
  number.className = 'provider-list-number';
  number.textContent = String(index + 1);
  body.className = 'provider-list-body';
  title.textContent = group.name || 'Без названия';
  meta.className = 'provider-list-meta';
  meta.textContent = formatGroupSources(group);
  status.className = 'provider-list-status';
  status.textContent = group.type || 'group';

  body.append(title, meta);
  button.append(number, body, status);
  button.addEventListener('click', () => {
    state.selectedGroupName = group.name;
    render();
  });
  return button;
}

function createGroupEditorDetail(group, activeProviders) {
  const wrap = document.createElement('div');
  const head = document.createElement('div');
  const number = document.createElement('span');
  const title = document.createElement('strong');
  const fields = document.createElement('div');
  const nameLabel = document.createElement('label');
  const nameText = document.createElement('span');
  const nameInput = document.createElement('input');
  const typeLabel = document.createElement('label');
  const typeText = document.createElement('span');
  const typeSelect = document.createElement('select');

  wrap.className = 'group-editor-card';
  head.className = 'provider-card-heading';
  number.className = 'provider-card-number';
  number.textContent = '#';
  title.className = 'provider-card-title';
  title.textContent = group.name || 'Без названия';
  head.append(number, title);

  fields.className = 'group-editor-fields';
  nameText.textContent = 'Название группы';
  nameInput.value = group.name || '';
  nameInput.disabled = !group.isNew;
  nameInput.title = group.isNew ? 'Имя новой группы' : 'Имя существующей группы не меняется, чтобы не ломать rules.';
  nameInput.addEventListener('input', () => renameGroup(group, nameInput.value));
  nameLabel.append(nameText, nameInput);

  typeText.textContent = 'Тип группы';
  GROUP_TYPE_OPTIONS.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeSelect.append(option);
  });
  typeSelect.value = GROUP_TYPE_OPTIONS.includes(group.type) ? group.type : 'select';
  typeSelect.addEventListener('change', () => updateGroup(group, 'type', typeSelect.value));
  typeLabel.append(typeText, typeSelect);
  fields.append(nameLabel, typeLabel);

  wrap.append(
    head,
    createGroupHelpPanel(group, activeProviders),
    fields,
    createGroupProxyOrderSection(group),
    createGroupOptionSection(
      'Встроенные выходы (proxies)',
      'DIRECT, REJECT, PASS и похожие варианты — это готовые действия Mihomo без выбора нод из подписки.',
      getBuiltInGroupOptions(),
      group.proxies,
      (name, enabled) => toggleGroupProxy(group, name, enabled),
    ),
    createGroupOptionSection(
      'Другие группы (proxies)',
      'Подключают эту группу к уже существующим группам. Для fallback и relay порядок вариантов важен.',
      getOtherGroupOptions(group),
      group.proxies,
      (name, enabled) => toggleGroupProxy(group, name, enabled),
    ),
    createGroupOptionSection(
      'Подписки-источники узлов (use)',
      'Отмеченные proxy-providers дают этой группе свои ноды. Это не правила маршрутизации, а источник вариантов.',
      activeProviders.map((provider) => provider.name),
      group.use,
      (name, enabled) => toggleGroupUse(group, name, enabled),
    ),
  );
  return wrap;
}

function createGroupHelpPanel(group, activeProviders) {
  const panel = document.createElement('section');
  const usage = getGroupUsage(group);

  panel.className = 'group-help-panel';
  panel.append(
    createGroupHelpItem('Как работает группа', describeGroupTypeForEditor(group)),
    createGroupHelpItem('Откуда берутся варианты', describeGroupSourceForEditor(group, activeProviders), getGroupSource(group) === 'none' ? 'is-warning' : ''),
    createGroupHelpItem('Где влияет на трафик', describeGroupUsage(usage), usage.used ? '' : 'is-warning'),
  );

  if (!group.isNew) {
    panel.append(createGroupHelpItem('Имя защищено', 'Существующее имя не редактируется здесь, чтобы случайно не сломать rules и ссылки из других групп.'));
  }

  return panel;
}

function createGroupHelpItem(titleText, text, variant = '') {
  const item = document.createElement('div');
  const title = document.createElement('strong');
  const body = document.createElement('span');

  item.className = 'group-help-item';
  if (variant) item.classList.add(variant);
  title.className = 'group-help-title';
  body.className = 'group-help-text';
  title.textContent = titleText;
  body.textContent = text;
  item.append(title, body);
  return item;
}

function describeGroupTypeForEditor(group) {
  const type = String(group.type || '').toLowerCase();
  if (type === 'select') return 'Ручной выбор: пользователь или клиент выбирает один вариант из списка группы.';
  if (type === 'fallback') return 'Резервирование: Mihomo идет по списку сверху вниз и берет первый доступный вариант.';
  if (type === 'url-test') return 'Автовыбор по скорости: Mihomo проверяет задержку и выбирает самый быстрый доступный вариант.';
  if (type === 'load-balance') return 'Балансировка: трафик распределяется между доступными вариантами группы.';
  if (type === 'relay') return 'Цепочка: трафик проходит через варианты по порядку, поэтому порядок особенно важен.';
  return 'Обычная группа Mihomo: поведение зависит от указанного type.';
}

function describeGroupSourceForEditor(group, activeProviders) {
  const source = getGroupSource(group);
  const count = getRouteGroupOptions(group, activeProviders).length;
  const autoText = describeGroupAutoFill(group);
  const autoSuffix = autoText && (source === 'proxies' || source === 'use') ? ` Дополнительно включено автонаполнение: ${autoText}` : '';

  if (source === 'proxies') return `Варианты заданы явно в proxies: ${formatRouteCount(count, 'вариант', 'варианта', 'вариантов')}. Это могут быть другие группы, встроенные выходы или отдельные ноды.${autoSuffix}`;
  if (source === 'use') return `Варианты берутся из отмеченных proxy-providers: ${formatRouteCount(count, 'подписка', 'подписки', 'подписок')}. Ноды приходят из подписок, а не из списка proxies.${autoSuffix}`;
  if (source === 'include-all') return 'Включено автонаполнение include-all: группа берет обычные proxies и все подписки автоматически.';
  if (source === 'include-all-providers') return 'Включено автонаполнение include-all-providers: группа берет все proxy-providers автоматически.';
  if (source === 'include-all-proxies') return 'Включено автонаполнение include-all-proxies: группа берет обычные proxies автоматически.';
  return 'Явное наполнение не найдено: нет proxies, use или include-all. Такая группа не даст вариантов для выбора.';
}

function describeGroupAutoFill(group) {
  if (group.includeAll) return 'include-all добавляет обычные proxies и все подписки.';
  if (group.includeAllProviders) return 'include-all-providers добавляет все подписки.';
  if (group.includeAllProxies) return 'include-all-proxies добавляет обычные proxies.';
  return '';
}

function getGroupUsage(group) {
  const name = String(group?.name || '').toLowerCase();
  const ruleTargets = getRuleTargets().filter((target) => String(target).toLowerCase() === name);
  const parentGroups = state.groups
    .filter((item) => item !== group)
    .filter((item) => item.proxies.some((proxyName) => String(proxyName).toLowerCase() === name))
    .map((item) => item.name);

  return {
    used: ruleTargets.length > 0 || parentGroups.length > 0,
    ruleCount: ruleTargets.length,
    parentGroups,
  };
}

function describeGroupUsage(usage) {
  const parts = [];
  if (usage.ruleCount > 0) parts.push(`Указана напрямую в ${formatRouteCount(usage.ruleCount, 'правиле', 'правилах', 'правилах')}`);
  if (usage.parentGroups.length > 0) parts.push(`${parts.length > 0 ? 'используется' : 'Используется'} как вариант в группах ${formatNameList(usage.parentGroups)}`);
  if (parts.length > 0) return parts.join('; ') + '.';
  return 'Пока не используется: добавьте группу в proxies другой группы или назначьте ее целью в rules, иначе она не повлияет на трафик.';
}

function formatNameList(names, limit = 4) {
  const visible = names.slice(0, limit);
  const hiddenCount = names.length - visible.length;
  return `${visible.join(', ')}${hiddenCount > 0 ? ` и еще ${hiddenCount}` : ''}`;
}

function createGroupProxyOrderSection(group) {
  const section = document.createElement('section');
  const title = document.createElement('div');
  const description = document.createElement('p');
  const list = document.createElement('div');
  const source = getGroupSource(group);

  section.className = 'group-option-section group-proxy-order';
  title.className = 'group-option-title';
  title.textContent = 'Порядок вариантов (proxies)';
  description.className = 'group-option-description';
  description.textContent = source === 'proxies'
    ? 'Это реальный порядок в YAML. Для fallback первый доступный сверху победит; для relay цепочка строится сверху вниз.'
    : 'В этой группе нет явного списка proxies: порядок ниже появится, если добавить встроенный выход или другую группу.';
  list.className = 'group-proxy-order-list';

  if (group.proxies.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'group-option-empty';
    empty.textContent = source === 'use'
      ? 'Варианты приходят из выбранных подписок use.'
      : 'Варианты наполняются автоматически или пока не заданы.';
    list.append(empty);
  }

  group.proxies.forEach((name, index) => {
    const row = document.createElement('div');
    const number = document.createElement('span');
    const label = document.createElement('span');
    const actions = document.createElement('span');
    const upButton = document.createElement('button');
    const downButton = document.createElement('button');

    row.className = 'group-proxy-order-item';
    number.className = 'provider-list-number';
    number.textContent = String(index + 1);
    label.className = 'group-proxy-order-name';
    label.textContent = name;
    actions.className = 'group-proxy-order-actions';

    upButton.type = 'button';
    upButton.textContent = '↑';
    upButton.title = 'Выше';
    upButton.disabled = index === 0;
    upButton.addEventListener('click', () => moveGroupProxy(group, index, index - 1));

    downButton.type = 'button';
    downButton.textContent = '↓';
    downButton.title = 'Ниже';
    downButton.disabled = index === group.proxies.length - 1;
    downButton.addEventListener('click', () => moveGroupProxy(group, index, index + 1));

    actions.append(upButton, downButton);
    row.append(number, label, actions);
    list.append(row);
  });

  section.append(title, description, list);
  return section;
}

function createGroupOptionSection(titleText, descriptionText, options, selected, onToggle) {
  const section = document.createElement('section');
  const title = document.createElement('div');
  const description = document.createElement('p');
  const list = document.createElement('div');
  const selectedNames = new Set(selected);

  section.className = 'group-option-section';
  title.className = 'group-option-title';
  title.textContent = titleText;
  description.className = 'group-option-description';
  description.textContent = descriptionText;
  list.className = 'group-option-list';

  if (options.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'group-option-empty';
    empty.textContent = 'Нет вариантов';
    list.append(empty);
  }

  options.forEach((name) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    const text = document.createElement('span');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedNames.has(name);
    checkbox.addEventListener('change', () => onToggle(name, checkbox.checked));
    text.textContent = name;
    label.append(checkbox, text);
    list.append(label);
  });

  section.append(title, description, list);
  return section;
}

function getBuiltInGroupOptions() {
  return ['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'GLOBAL', 'COMPATIBLE'];
}

function getOtherGroupOptions(group) {
  return state.groups
    .filter((item) => item !== group)
    .map((item) => item.name)
    .filter(Boolean);
}

function formatGroupSources(group) {
  const parts = [];
  if (group.proxies.length > 0) parts.push(`${group.proxies.length} proxies`);
  if (group.use.length > 0) parts.push(`${group.use.length} use`);
  if (group.includeAll || group.includeAllProviders || group.includeAllProxies) parts.push('auto');
  return parts.join(' · ') || 'пустая';
}

function orderGroupsByProxySequence(groups) {
  const mainGroup = findMainGroup(state.groups);
  const mainItems = getExplicitGroupOptions(mainGroup);
  const order = new Map(mainItems.map((name, index) => [String(name).toLowerCase(), index]));

  if (order.size === 0) return groups;

  return groups
    .map((group, index) => ({ group, index }))
    .sort((left, right) => {
      const leftOrder = order.has(left.group.name.toLowerCase())
        ? order.get(left.group.name.toLowerCase())
        : Number.MAX_SAFE_INTEGER;
      const rightOrder = order.has(right.group.name.toLowerCase())
        ? order.get(right.group.name.toLowerCase())
        : Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.index - right.index;
    })
    .map((item) => item.group);
}

function renderIncludeAllExplanation(activeProviders) {
  els.groupsMatrix.classList.remove('empty-state');

  const autoGroups = state.groups.filter((group) => group.includeAll || group.includeAllProviders);
  const wrap = document.createElement('div');
  const title = document.createElement('strong');
  const text = document.createElement('p');
  const summary = document.createElement('div');
  const autoSummary = document.createElement('div');
  const useSummary = document.createElement('div');
  const hint = document.createElement('p');

  wrap.className = 'include-all-explanation';
  title.textContent = 'Ручные связи use не найдены';
  text.textContent = activeProviders.length > 0
    ? 'Группы подключают подписки автоматически через include-all. Ручная матрица не требуется, пока вы не хотите управлять связями вручную.'
    : 'Группы используют proxies/include-all вместо proxy-providers/use. Ручная матрица подписок для такой конфигурации не нужна.';
  summary.className = 'include-all-summary';
  autoSummary.className = 'include-all-summary-item';
  useSummary.className = 'include-all-summary-item';
  hint.className = 'include-all-hint';

  if (autoGroups.length > 0) {
    autoSummary.append(createRouteItemInfo(
      `${autoGroups.length} групп с автоподключением`,
      'берут доступные узлы через include-all/include-all-providers'
    ));
  } else {
    autoSummary.append(createRouteItemInfo(
      'Автоподключение не найдено',
      'в группах нет include-all/include-all-providers'
    ));
  }

  useSummary.append(createRouteItemInfo(
    '0 групп с явным use',
    'ручное подключение подписок не используется'
  ));
  hint.textContent = 'Схема маршрутизации выше показывает найденные группы.';

  summary.append(autoSummary, useSummary);
  wrap.append(title, text, summary, hint);
  els.groupsMatrix.append(wrap);
}

function createCell(tag, text) {
  const cell = document.createElement(tag);
  cell.textContent = text;
  return cell;
}

function toggleIntervalTools() {
  state.intervalToolsOpen = !state.intervalToolsOpen;
  renderIntervalTools(state.providers.filter((provider) => !provider.deleted));
  renderChangesOnly();
}

function renderIntervalTools(activeProviders) {
  const hasFile = Boolean(state.originalText);
  const disabled = !hasFile || activeProviders.length === 0;

  els.intervalTools.classList.toggle('hidden', !hasFile || !state.intervalToolsOpen);
  els.intervalToolsButton.textContent = state.intervalToolsOpen ? 'Скрыть' : 'Интервалы всем';
  els.applyIntervalsButton.disabled = disabled;
  els.bulkIntervalInput.disabled = disabled;
  els.bulkHealthIntervalInput.disabled = disabled;
  els.intervalPresets.forEach((button) => {
    button.disabled = disabled;
  });
  updateBulkIntervalHints();
  renderBulkIntervalPending(activeProviders);
}

function syncBulkIntervalInputs() {
  const defaults = getProviderIntervalDefaults();
  els.bulkIntervalInput.value = defaults.interval;
  els.bulkHealthIntervalInput.value = defaults.healthInterval;
  updateBulkIntervalHints();
}

function applyIntervalPreset(event) {
  const button = event.currentTarget;
  const input = button.dataset.field === 'health' ? els.bulkHealthIntervalInput : els.bulkIntervalInput;
  input.value = button.dataset.value || input.value;
  handleBulkIntervalInput();
}

function handleBulkIntervalInput() {
  updateBulkIntervalHints();
  renderBulkIntervalPending(state.providers.filter((provider) => !provider.deleted));
  renderChangesOnly();
}

function applyBulkIntervals() {
  const interval = normalizeIntervalInput(els.bulkIntervalInput.value, 60);
  const healthInterval = normalizeIntervalInput(els.bulkHealthIntervalInput.value, 30);

  if (!interval || !healthInterval) {
    showMessage('Интервалы должны быть числами: interval от 60 секунд, health-check.interval от 30 секунд.');
    return;
  }

  state.providers
    .filter((provider) => !provider.deleted)
    .forEach((provider) => {
      provider.interval = interval;
      provider.healthInterval = healthInterval;
      provider.hasInterval = true;
      provider.hasHealthCheck = true;
    });

  generateOutput();
  render();
}

function getProviderIntervalDefaults() {
  const source = state.providers.find((provider) => !provider.deleted);
  return {
    interval: source?.interval || DEFAULT_BULK_INTERVAL,
    healthUrl: source?.healthUrl || DEFAULT_HEALTH_URL,
    healthInterval: source?.healthInterval || DEFAULT_BULK_HEALTH_INTERVAL,
  };
}

function normalizeIntervalInput(value, min) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) return '';
  return String(Math.round(number));
}

function updateBulkIntervalHints() {
  els.bulkIntervalHint.textContent = formatDurationHint(els.bulkIntervalInput.value);
  els.bulkHealthIntervalHint.textContent = formatDurationHint(els.bulkHealthIntervalInput.value);
}

function formatDurationHint(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return '-';
  if (seconds % 3600 === 0) return `${seconds} сек = ${seconds / 3600} ч`;
  if (seconds % 60 === 0) return `${seconds} сек = ${seconds / 60} мин`;
  return `${seconds} сек`;
}

function formatDurationValue(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return String(value || '');
  if (seconds % 3600 === 0) return `${seconds / 3600} ч`;
  if (seconds % 60 === 0) return `${seconds / 60} мин`;
  return `${seconds} сек`;
}

function renderBulkIntervalPending(activeProviders) {
  const changes = collectPendingBulkIntervalChanges(activeProviders);

  els.bulkIntervalPending.hidden = changes.length === 0;
  els.bulkIntervalPending.textContent = changes.join(' ');
}

function updateProvider(provider, key, value) {
  const previousName = provider.name;
  provider[key] = value;
  if (key === 'url' && provider.autoName) {
    const changed = applyGeneratedProviderName(provider, value, previousName);
    if (changed) {
      generateOutput();
      render();
      return;
    }
  }
  generateOutput();
  renderOutputOnly();
}

function applyGeneratedProviderName(provider, rawUrl, previousName) {
  const generatedName = generateProviderName(rawUrl, provider);
  if (!generatedName || generatedName === previousName) return false;

  provider.name = generatedName;
  provider.originalName = provider.isNew ? generatedName : provider.originalName;
  if (state.selectedProviderName === previousName) state.selectedProviderName = generatedName;
  if (!provider.path || provider.path === `./providers/${previousName}.yaml`) {
    provider.path = `./providers/${generatedName}.yaml`;
  }
  replaceProviderUse(previousName, generatedName);
  return true;
}

function renameProvider(provider, nextName) {
  const previousName = provider.name;
  provider.name = nextName.trim();
  provider.autoName = false;
  provider.nameLocked = false;
  if (state.selectedProviderName === previousName) state.selectedProviderName = provider.name;
  replaceProviderUse(previousName, provider.name);
  generateOutput();
  render();
}

function replaceProviderUse(previousName, nextName) {
  state.groups.forEach((group) => {
    group.use = group.use.map((name) => (name === previousName ? nextName : name));
  });
}

function removeProvider(provider) {
  provider.deleted = true;
  if (state.selectedProviderName === provider.name) state.selectedProviderName = '';
  state.groups.forEach((group) => {
    group.use = group.use.filter((name) => name !== provider.name);
  });
  generateOutput();
  render();
}

function addProvider() {
  let index = state.providers.length + 1;
  let name = `subscription-${index}`;
  while (state.providers.some((provider) => provider.name === name && !provider.deleted)) {
    index += 1;
    name = `subscription-${index}`;
  }
  const intervalDefaults = getProviderIntervalDefaults();
  const generatedHeaders = {
    userAgent: DEFAULT_GENERATED_USER_AGENT,
    xHwid: generateHwid(),
  };

  const provider = {
    name,
    originalName: name,
    type: 'http',
    url: '',
    filter: '',
    excludeFilter: '',
    excludeType: '',
    userAgent: generatedHeaders.userAgent,
    xHwid: generatedHeaders.xHwid,
    udp: true,
    tfo: true,
    path: `./providers/${name}.yaml`,
    interval: intervalDefaults.interval,
    healthUrl: intervalDefaults.healthUrl,
    healthInterval: intervalDefaults.healthInterval,
    hasUrl: true,
    hasPath: true,
    hasInterval: true,
    hasHealthCheck: true,
    rawLines: [],
    isNew: true,
    autoName: true,
    nameLocked: true,
    highlight: true,
    deleted: false,
  };

  state.providers.unshift(provider);
  state.selectedProviderName = provider.name;
  connectProviderToUseGroups(provider.name);
  generateOutput();
  render();

  window.setTimeout(() => {
    provider.highlight = false;
    render();
  }, 1800);
}

function addGroup() {
  if (!state.originalText || !state.hasGroupsSection) return;

  const name = uniqueGroupName('Custom');
  const group = {
    name,
    originalName: name,
    type: 'select',
    proxies: ['DIRECT'],
    use: [],
    includeAll: false,
    includeAllProxies: false,
    includeAllProviders: false,
    start: -1,
    end: -1,
    proxiesStart: -1,
    proxiesEnd: -1,
    useStart: -1,
    useEnd: -1,
    isNew: true,
    deleted: false,
  };

  state.groups.push(group);
  state.selectedGroupName = name;
  generateOutput();
  render();
}

function connectProviderToUseGroups(providerName) {
  state.groups
    .filter((group) => group.useStart !== -1 || group.use.length > 0)
    .forEach((group) => {
      if (!group.use.includes(providerName)) {
        group.use.push(providerName);
      }
    });
}

function toggleGroupUse(group, providerName, enabled) {
  if (enabled && !group.use.includes(providerName)) {
    group.use.push(providerName);
  }

  if (!enabled) {
    group.use = group.use.filter((name) => name !== providerName);
  }

  generateOutput();
  render();
}

function toggleGroupProxy(group, proxyName, enabled) {
  if (enabled && !group.proxies.includes(proxyName)) {
    group.proxies.push(proxyName);
  }

  if (!enabled) {
    group.proxies = group.proxies.filter((name) => name !== proxyName);
  }

  generateOutput();
  render();
}

function moveGroupProxy(group, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= group.proxies.length) return;
  const [proxyName] = group.proxies.splice(fromIndex, 1);
  group.proxies.splice(toIndex, 0, proxyName);
  generateOutput();
  render();
}

function updateGroup(group, key, value) {
  group[key] = value;
  generateOutput();
  render();
}

function renameGroup(group, nextName) {
  const previousName = group.name;
  group.name = nextName.trim();
  if (state.selectedGroupName === previousName) state.selectedGroupName = group.name;
  replaceGroupProxyReferences(previousName, group.name);
  generateOutput();
  renderOutputOnly();
}

function replaceGroupProxyReferences(previousName, nextName) {
  if (!previousName || !nextName || previousName === nextName) return;
  state.groups.forEach((group) => {
    group.proxies = group.proxies.map((name) => (name === previousName ? nextName : name));
  });
}

function generateOutput() {
  const errors = validateModel();
  if (errors.length > 0) {
    showMessage(errors[0]);
    setOutputText('');
    renderOutputOnly();
    return;
  }

  hideMessage();
  const lines = splitLines(state.originalText);
  const providersSection = findTopSection(lines, 'proxy-providers');
  const groupsSection = findTopSection(lines, 'proxy-groups');
  if (!groupsSection) return;

  const replacements = [
    {
      start: groupsSection.start,
      end: groupsSection.end,
      lines: serializeGroupsSection(lines, groupsSection),
    },
  ];
  const hasActiveProviders = state.providers.some((provider) => !provider.deleted);

  if (providersSection) {
    replacements.push({
      start: providersSection.start,
      end: providersSection.end,
      lines: serializeProvidersSection(),
    });
  } else if (hasActiveProviders) {
    replacements.push({
      start: groupsSection.start,
      end: groupsSection.start,
      lines: [...serializeProvidersSection(), ''],
    });
  }

  const connectionSettingLines = serializeConnectionSettingsToAdd();
  if (connectionSettingLines.length > 0) {
    const insertAt = getConnectionSettingsInsertIndex(providersSection, groupsSection);
    replacements.push({
      start: insertAt,
      end: insertAt,
      lines: [...connectionSettingLines, ''],
    });
  }

  replacements.sort((a, b) => b.start - a.start);

  const nextLines = lines.slice();
  replacements.forEach((replacement) => {
    nextLines.splice(replacement.start, replacement.end - replacement.start, ...replacement.lines);
  });

  setOutputText(nextLines.join('\n'));
  renderOutputOnly();
}

function setOutputText(text) {
  const nextText = String(text || '');
  if (state.outputText !== nextText) {
    state.saveReviewReady = false;
    state.lastConfigCheckText = '';
    state.lastConfigCheckOk = false;
  }
  state.outputText = nextText;
}

function serializeConnectionSettingsToAdd() {
  return CONNECTION_SETTING_DEFS
    .filter((definition) => !state.originalConnectionSettings[definition.key]?.exists)
    .map((definition) => {
      const setting = state.connectionSettings[definition.key];
      return setting?.exists ? `${definition.key}: ${formatScalar(setting.value)}` : '';
    })
    .filter(Boolean);
}

function getConnectionSettingsInsertIndex(providersSection, groupsSection) {
  return providersSection?.start ?? groupsSection.start;
}

function renderOutputOnly() {
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  const changes = collectChanges(activeProviders);
  if (!state.isEditingConfiguration) {
    els.outputPreview.value = state.outputText;
  }
  renderConfigurationEditorControls();
  renderDiagnostics(collectDiagnostics(activeProviders));
  renderChanges(changes);
  renderChangesJumpButton(changes);
}

function renderChangesOnly() {
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  const changes = collectChanges(activeProviders);
  renderChanges(changes);
  renderChangesJumpButton(changes);
}

function renderConfigurationEditorControls() {
  const isEditing = state.isEditingConfiguration;
  els.outputPreview.readOnly = !isEditing;
  els.outputPreview.classList.toggle('is-editing', isEditing);
  els.editConfigButton.hidden = isEditing;
  els.applyConfigButton.hidden = !isEditing;
  els.cancelConfigEditButton.hidden = !isEditing;
  els.editConfigButton.disabled = false;
  els.checkConfigButton.disabled = isEditing || !state.routerApiAvailable || !state.outputText;
  els.checkConfigButton.title = state.routerApiAvailable
    ? 'Проверить текущий текст конфига через mihomo -t'
    : 'Доступно только в MihUI на роутере рядом с Mihomo';
  els.downloadButton.disabled = isEditing || !state.outputText;
  els.copyButton.disabled = isEditing || !state.outputText;
  els.changesJumpButton.disabled = !state.originalText;
}

function beginConfigurationEdit() {
  state.isEditingConfiguration = true;
  els.outputPreview.value = state.outputText || state.originalText || els.outputPreview.value || '';
  renderConfigurationEditorControls();
  els.outputPreview.focus();
}

function cancelConfigurationEdit() {
  state.isEditingConfiguration = false;
  hideMessage();
  render();
}

function applyConfigurationEdit() {
  const nextText = els.outputPreview.value;
  const error = getConfigurationInputError(nextText);
  if (error) {
    showMessage(error);
    return false;
  }

  state.fileName = state.fileName || 'Вставленная конфигурация';
  state.originalText = nextText;
  state.isEditingConfiguration = false;
  parseAndRender();
  els.outputPreview.scrollTop = 0;
  return true;
}

function getConfigurationInputError(text) {
  if (!String(text || '').trim()) return 'Вставьте или введите конфигурацию.';
  const lines = splitLines(text);
  if (!findTopSection(lines, 'proxy-groups')) return 'Добавьте раздел proxy-groups на верхнем уровне конфигурации.';
  return '';
}

function validateModel() {
  const errors = [];
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  const names = activeProviders.map((provider) => provider.name);
  const duplicate = names.find((name, index) => names.indexOf(name) !== index);
  const groupNames = state.groups.map((group) => group.name);
  const duplicateGroup = groupNames.find((name, index) => groupNames.indexOf(name) !== index);

  if (duplicate) errors.push(`Дублируется имя подписки: ${duplicate}`);
  if (duplicateGroup) errors.push(`Дублируется имя группы: ${duplicateGroup}`);
  activeProviders.forEach((provider) => {
    if (!provider.name || /[\r\n]/.test(provider.name)) {
      errors.push(`Некорректное имя подписки: ${provider.name || '(пусто)'}`);
    }

    const invalidTypes = getInvalidExcludeTypes(provider.excludeType);
    if (invalidTypes.length > 0) {
      errors.push(
        `${provider.name}: в exclude-type неизвестные типы: ${invalidTypes.join(', ')}. ` +
          'Используйте типы протоколов, например ss|http|vless, или оставьте поле пустым.',
      );
    }
  });
  state.groups.forEach((group) => {
    if (!group.name || /[\r\n]/.test(group.name)) {
      errors.push(`Некорректное имя группы: ${group.name || '(пусто)'}`);
    }
  });

  return errors;
}

function getInvalidExcludeTypes(value) {
  return parseExcludeTypes(value)
    .filter((item) => !ALLOWED_EXCLUDE_TYPES.has(item.toLowerCase()));
}

function parseExcludeTypes(value) {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function generateProviderName(rawUrl, currentProvider) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return '';
  }

  const hostParts = parsedUrl.hostname.toLowerCase().split('.').filter(Boolean);
  const meaningful = pickProviderNamePart(hostParts) || pickProviderNamePart(parsedUrl.pathname.split('/')) || hostParts[0] || '';
  const base = slugifyName(meaningful) || 'subscription';
  return uniqueProviderName(base, currentProvider);
}

function pickProviderNamePart(parts) {
  const candidates = parts.map((part) => slugifyName(part)).filter(Boolean);

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const part = candidates[index];
    if (COMMON_DOMAIN_SUFFIXES.has(part)) continue;
    if (isTechnicalNamePart(part)) continue;
    return part;
  }

  return '';
}

function isTechnicalNamePart(part) {
  if (part.length < 3) return true;
  if (GENERIC_HOST_LABELS.has(part)) return true;
  if (/^sub-[a-z0-9-]+$/.test(part)) return true;
  if (/^[a-f0-9]{6,}$/.test(part)) return true;
  if (/^[a-z0-9]{16,}$/.test(part) && /\d/.test(part)) return true;
  if (/^\d+$/.test(part)) return true;
  return false;
}

function uniqueProviderName(baseName, currentProvider) {
  const used = new Set(
    state.providers
      .filter((provider) => provider !== currentProvider && !provider.deleted)
      .map((provider) => provider.name),
  );
  let candidate = baseName;
  let index = 2;

  while (used.has(candidate)) {
    candidate = `${baseName}-${index}`;
    index += 1;
  }

  return candidate;
}

function uniqueGroupName(baseName, currentGroup) {
  const used = new Set(
    state.groups
      .filter((group) => group !== currentGroup)
      .map((group) => group.name),
  );
  let candidate = baseName;
  let index = 2;

  while (used.has(candidate)) {
    candidate = `${baseName}-${index}`;
    index += 1;
  }

  return candidate;
}

function slugifyName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function serializeProvidersSection() {
  const result = ['proxy-providers:'];
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  if (activeProviders.length === 0) return ['proxy-providers: {}'];
  activeProviders.forEach((provider) => result.push(...serializeProvider(provider)));
  return result;
}

function serializeProvider(provider) {
  if (provider.rawLines.length === 0 || provider.isNew) {
    return createProviderBlock(provider);
  }

  const lines = provider.rawLines.slice();
  if (provider.name !== provider.originalName) {
    lines[0] = `  ${formatKey(provider.name)}:`;
  }

  const type = String(provider.type || 'http').toLowerCase();
  const writesUrl = type === 'http' || provider.hasUrl || String(provider.url || '').trim();
  const writesPath = type === 'http' || provider.hasPath || String(provider.path || '').trim();
  const writesInterval = type === 'http' || provider.hasInterval;
  const writesHealthCheck = type === 'http' || provider.hasHealthCheck;

  setNestedScalar(lines, 1, 'type', provider.type || 'http');
  if (writesUrl) setOptionalNestedScalar(lines, 1, 'url', provider.url);
  setOptionalNestedScalar(lines, 1, 'filter', provider.filter);
  setOptionalNestedScalar(lines, 1, 'exclude-filter', provider.excludeFilter);
  setOptionalNestedScalar(lines, 1, 'exclude-type', provider.excludeType);
  if (writesPath) setOptionalNestedScalar(lines, 1, 'path', provider.path);
  if (writesInterval) setNestedScalar(lines, 1, 'interval', provider.interval || '86400');
  setHeader(lines, provider);
  if (writesHealthCheck) setHealthCheck(lines, provider);
  setOverride(lines, provider);
  return lines;
}

function createProviderBlock(provider) {
  const healthUrl = provider.healthUrl || DEFAULT_HEALTH_URL;
  const healthInterval = provider.healthInterval || '300';
  const type = String(provider.type || 'http').toLowerCase();
  const lines = [
    `  ${formatKey(provider.name)}:`,
    `    type: ${formatScalar(provider.type || 'http')}`,
  ];

  if (type === 'http' || provider.hasUrl || provider.url) {
    lines.push(`    url: ${formatScalar(provider.url)}`);
  }
  if (provider.filter) lines.push(`    filter: ${formatScalar(provider.filter)}`);
  if (provider.excludeFilter) lines.push(`    exclude-filter: ${formatScalar(provider.excludeFilter)}`);
  if (provider.excludeType) lines.push(`    exclude-type: ${formatScalar(provider.excludeType)}`);

  if (type === 'http' || provider.hasInterval) {
    lines.push(`    interval: ${formatScalar(provider.interval || '86400')}`);
  }
  if (type === 'http' || provider.hasPath || provider.path) {
    lines.push(`    path: ${formatScalar(provider.path || `./providers/${provider.name}.yaml`)}`);
  }

  appendHeader(lines, provider);
  if (type === 'http' || provider.hasHealthCheck) {
    lines.push(
      '    health-check:',
      '      enable: true',
      `      url: ${formatScalar(healthUrl)}`,
      `      interval: ${formatScalar(healthInterval)}`,
    );
  }
  appendOverride(lines, provider);
  return lines;
}

function serializeGroupsSection(lines, groupsSection) {
  const sectionLines = lines.slice(groupsSection.start, groupsSection.end);
  const replacements = parseGroups(lines, groupsSection)
    .map((parsedGroup) => {
      const currentGroup = state.groups.find((group) => (group.originalName || group.name) === parsedGroup.name);
      if (!currentGroup) return null;
      return {
        start: parsedGroup.start - groupsSection.start,
        end: parsedGroup.end - groupsSection.start,
        lines: serializeGroupBlock(lines, parsedGroup, currentGroup),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.start - a.start);

  replacements.forEach((replacement) => {
    sectionLines.splice(replacement.start, replacement.end - replacement.start, ...replacement.lines);
  });

  state.groups
    .filter((group) => group.isNew)
    .forEach((group) => {
      if (sectionLines.length > 1 && sectionLines[sectionLines.length - 1].trim()) {
        sectionLines.push('');
      }
      sectionLines.push(...createGroupBlock(group));
    });

  return sectionLines;
}

function serializeGroupBlock(lines, parsedGroup, currentGroup) {
  const block = lines.slice(parsedGroup.start, parsedGroup.end);
  const replacements = [
    parsedGroup.proxiesStart === -1
      ? null
      : {
          start: parsedGroup.proxiesStart - parsedGroup.start,
          end: parsedGroup.proxiesEnd - parsedGroup.start,
          lines: serializeListBlock('proxies', currentGroup.proxies, lines[parsedGroup.proxiesStart]),
        },
    parsedGroup.useStart === -1
      ? null
      : {
          start: parsedGroup.useStart - parsedGroup.start,
          end: parsedGroup.useEnd - parsedGroup.start,
          lines: serializeUseBlock(currentGroup, lines[parsedGroup.useStart]),
        },
  ]
    .filter(Boolean);

  replacements
    .sort((a, b) => b.start - a.start)
    .forEach((replacement) => {
      block.splice(replacement.start, replacement.end - replacement.start, ...replacement.lines);
    });

  setGroupName(block, currentGroup);
  setGroupScalar(block, 'type', currentGroup.type || 'select');

  if (parsedGroup.proxiesStart === -1 && currentGroup.proxies.length > 0) {
    insertGroupListBlock(block, 'proxies', currentGroup.proxies);
  }

  if (parsedGroup.useStart === -1) {
    const use = getActiveGroupUse(currentGroup);
    if (use.length > 0) insertGroupListBlock(block, 'use', use);
  }

  return block;
}

function createGroupBlock(group) {
  const lines = [
    `  - name: ${formatScalar(group.name)}`,
    `    type: ${formatScalar(group.type || 'select')}`,
  ];
  if (group.proxies.length > 0) lines.push(...serializeListBlockWithIndent('proxies', group.proxies, '    '));
  const use = getActiveGroupUse(group);
  if (use.length > 0) lines.push(...serializeListBlockWithIndent('use', use, '    '));
  return lines;
}

function setGroupName(block, group) {
  const indent = block[0].match(/^\s*/)?.[0] || '  ';
  block[0] = `${indent}- name: ${formatScalar(group.name)}`;
}

function setGroupScalar(block, key, value) {
  const indent = `${block[0].match(/^\s*/)?.[0] || ''}  `;
  const re = new RegExp(`^${escapeRegExp(indent)}${escapeRegExp(key)}\\s*:`);
  const foundIndex = block.findIndex((line) => re.test(line));

  if (foundIndex !== -1) {
    block[foundIndex] = `${indent}${key}: ${formatScalar(value)}`;
    return;
  }

  block.splice(1, 0, `${indent}${key}: ${formatScalar(value)}`);
}

function insertGroupListBlock(block, key, items) {
  const indent = `${block[0].match(/^\s*/)?.[0] || ''}  `;
  const typeRe = new RegExp(`^${escapeRegExp(indent)}type\\s*:`);
  const typeIndex = block.findIndex((line) => typeRe.test(line));
  block.splice(typeIndex === -1 ? 1 : typeIndex + 1, 0, ...serializeListBlockWithIndent(key, items, indent));
}

function serializeUseBlock(group, originalUseLine) {
  return serializeListBlock('use', getActiveGroupUse(group), originalUseLine);
}

function getActiveGroupUse(group) {
  const activeNames = new Set(state.providers.filter((provider) => !provider.deleted).map((provider) => provider.name));
  return group.use.filter((name) => activeNames.has(name));
}

function serializeListBlock(key, items, originalLine) {
  const indent = originalLine.match(/^\s*/)[0];
  return serializeListBlockWithIndent(key, items, indent);
}

function serializeListBlockWithIndent(key, items, indent) {
  const itemIndent = `${indent}  `;
  if (items.length === 0) return [`${indent}${key}: []`];
  return [`${indent}${key}:`, ...items.map((name) => `${itemIndent}- ${formatScalar(name)}`)];
}

function setNestedScalar(lines, baseIndentLevel, key, value) {
  const indent = '  '.repeat(baseIndentLevel + 1);
  const re = new RegExp(`^${escapeRegExp(indent)}${escapeRegExp(key)}\\s*:`);
  const nextNestedRe = new RegExp(`^${escapeRegExp(indent)}[A-Za-z0-9_-]+\\s*:`);
  const providerHeaderIndex = 0;
  const foundIndex = lines.findIndex((line) => re.test(line));

  if (foundIndex !== -1) {
    lines[foundIndex] = `${indent}${key}: ${formatScalar(value)}`;
    return;
  }

  const insertAfter = lines.findIndex((line, index) => index > providerHeaderIndex && nextNestedRe.test(line));
  lines.splice(insertAfter === -1 ? 1 : insertAfter + 1, 0, `${indent}${key}: ${formatScalar(value)}`);
}

function setOptionalNestedScalar(lines, baseIndentLevel, key, value) {
  const indent = '  '.repeat(baseIndentLevel + 1);
  const re = new RegExp(`^${escapeRegExp(indent)}${escapeRegExp(key)}\\s*:`);
  const foundIndex = lines.findIndex((line) => re.test(line));

  if (String(value || '').trim()) {
    setNestedScalar(lines, baseIndentLevel, key, value);
    return;
  }

  if (foundIndex !== -1) {
    lines.splice(foundIndex, 1);
  }
}

function setHeader(lines, provider) {
  setKeyedBlock(lines, 'header', [
    { key: 'User-Agent', value: provider.userAgent, format: formatHeaderValue },
    { key: 'x-hwid', value: provider.xHwid, format: formatHeaderValue },
  ]);
}

function setOverride(lines, provider) {
  setKeyedBlock(lines, 'override', [
    { key: 'udp', value: provider.udp, format: formatBooleanValue },
    { key: 'tfo', value: provider.tfo, format: formatBooleanValue },
  ]);
}

function setKeyedBlock(lines, blockKey, entries) {
  const block = findNestedBlock(lines, blockKey, 4);
  const activeEntries = entries.filter((entry) => entry.value !== false && String(entry.value || '').trim() !== '');
  const managedKeys = new Set(entries.map((entry) => entry.key));

  if (!block) {
    if (activeEntries.length > 0) {
      lines.push(...serializeKeyedBlock(blockKey, [], activeEntries));
    }
    return;
  }

  const preservedLines = [];
  for (let index = block.start + 1; index < block.end; index += 1) {
    const match = lines[index].match(/^\s{6}([^:\s]+)\s*:/);
    if (!match || !managedKeys.has(match[1])) {
      preservedLines.push(lines[index]);
      continue;
    }

    index += 1;
    while (index < block.end) {
      const line = lines[index];
      if (parseKeyValueLine(line, 6)) {
        index -= 1;
        break;
      }
      if (line.trim() && indentOf(line) < 6) {
        index -= 1;
        break;
      }
      index += 1;
    }
  }
  const hasPreservedContent = preservedLines.some((line) => line.trim());

  if (activeEntries.length === 0 && !hasPreservedContent) {
    lines.splice(block.start, block.end - block.start);
    return;
  }

  lines.splice(block.start, block.end - block.start, ...serializeKeyedBlock(blockKey, preservedLines, activeEntries));
}

function serializeKeyedBlock(blockKey, preservedLines, activeEntries) {
  return [
    `    ${blockKey}:`,
    ...preservedLines,
    ...activeEntries.map((entry) => `      ${entry.key}: ${entry.format(entry.value)}`),
  ];
}

function appendHeader(lines, provider) {
  const entries = [
    { key: 'User-Agent', value: provider.userAgent, format: formatHeaderValue },
    { key: 'x-hwid', value: provider.xHwid, format: formatHeaderValue },
  ].filter((entry) => String(entry.value || '').trim() !== '');

  if (entries.length > 0) {
    lines.push(...serializeKeyedBlock('header', [], entries));
  }
}

function appendOverride(lines, provider) {
  const entries = [
    { key: 'udp', value: provider.udp, format: formatBooleanValue },
    { key: 'tfo', value: provider.tfo, format: formatBooleanValue },
  ].filter((entry) => entry.value === true);

  if (entries.length > 0) {
    lines.push(...serializeKeyedBlock('override', [], entries));
  }
}

function setHealthCheck(lines, provider) {
  const block = findNestedBlock(lines, 'health-check', 4);
  const defaultHealthCheckBlock = [
    '    health-check:',
    '      enable: true',
    `      url: ${formatScalar(provider.healthUrl || DEFAULT_HEALTH_URL)}`,
    `      interval: ${formatScalar(provider.healthInterval || '300')}`,
  ];

  if (!block) {
    lines.push(...defaultHealthCheckBlock);
    return;
  }

  const entry = parseKeyValueLine(lines[block.start], 4);
  const inlineMap = parseInlineMap(entry?.value);
  if (entry?.value && !inlineMap) return;

  if (inlineMap) {
    const managedKeys = new Set(['enable', 'url', 'interval']);
    const preservedEntries = [...inlineMap.entries()].filter(([key]) => !managedKeys.has(key));
    lines.splice(block.start, block.end - block.start, ...[
      '    health-check:',
      `      enable: ${formatScalar(cleanScalar(inlineMap.get('enable') || 'true'))}`,
      `      url: ${formatScalar(provider.healthUrl || cleanScalar(inlineMap.get('url')) || DEFAULT_HEALTH_URL)}`,
      `      interval: ${formatScalar(provider.healthInterval || cleanScalar(inlineMap.get('interval')) || '300')}`,
      ...preservedEntries.map(([key, value]) => `      ${key}: ${formatScalar(cleanScalar(value))}`),
    ]);
    return;
  }

  const healthLines = lines.slice(block.start, block.end);
  setNestedScalar(healthLines, 2, 'url', provider.healthUrl || DEFAULT_HEALTH_URL);
  setNestedScalar(healthLines, 2, 'interval', provider.healthInterval || '300');
  lines.splice(block.start, block.end - block.start, ...healthLines);
}

function parseProviders(lines, section) {
  const providers = [];
  let index = section.start + 1;

  while (index < section.end) {
    const line = lines[index];
    const entry = parseKeyValueLine(line, 2);
    if (!entry || !isNestedMapHeaderValue(entry.value)) {
      index += 1;
      continue;
    }

    const start = index;
    index += 1;
    while (index < section.end && !isProviderHeaderLine(lines[index])) {
      index += 1;
    }

    const rawLines = lines.slice(start, index);
    const type = readScalar(rawLines, 4, 'type') || 'http';
    providers.push({
      name: entry.key,
      originalName: entry.key,
      type,
      url: readScalar(rawLines, 4, 'url') || '',
      filter: readScalar(rawLines, 4, 'filter') || '',
      excludeFilter: readScalar(rawLines, 4, 'exclude-filter') || '',
      excludeType: readScalar(rawLines, 4, 'exclude-type') || '',
      userAgent: readBlockScalar(rawLines, 'header', 'User-Agent', cleanListScalar) || '',
      xHwid: readBlockScalar(rawLines, 'header', 'x-hwid', cleanListScalar) || '',
      udp: readBlockBool(rawLines, 'override', 'udp'),
      tfo: readBlockBool(rawLines, 'override', 'tfo'),
      path: readScalar(rawLines, 4, 'path') || '',
      interval: readScalar(rawLines, 4, 'interval') || '86400',
      healthUrl: readHealthScalar(rawLines, 'url') || DEFAULT_HEALTH_URL,
      healthInterval: readHealthScalar(rawLines, 'interval') || '300',
      hasUrl: hasNestedKey(rawLines, 1, 'url'),
      hasFilter: hasNestedKey(rawLines, 1, 'filter'),
      hasExcludeFilter: hasNestedKey(rawLines, 1, 'exclude-filter'),
      hasExcludeType: hasNestedKey(rawLines, 1, 'exclude-type'),
      hasUserAgent: hasBlockKey(rawLines, 'header', 'User-Agent'),
      hasXHwid: hasBlockKey(rawLines, 'header', 'x-hwid'),
      hasUdp: hasBlockKey(rawLines, 'override', 'udp'),
      hasTfo: hasBlockKey(rawLines, 'override', 'tfo'),
      hasPath: hasNestedKey(rawLines, 1, 'path'),
      hasInterval: hasNestedKey(rawLines, 1, 'interval'),
      hasHealthCheck: Boolean(findNestedBlock(rawLines, 'health-check', 4)),
      hasHealthUrl: hasBlockKey(rawLines, 'health-check', 'url'),
      hasHealthInterval: hasBlockKey(rawLines, 'health-check', 'interval'),
      rawLines,
      isNew: false,
      autoName: false,
      nameLocked: true,
      deleted: false,
    });
  }

  return providers;
}

function parseGroups(lines, section) {
  const groups = [];
  let index = section.start + 1;

  while (index < section.end) {
    const line = lines[index];
    const match = line.match(/^(\s*)-\s+name\s*:\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }

    const start = index;
    const groupIndent = match[1].length;
    index += 1;
    while (index < section.end && !new RegExp(`^\\s{${groupIndent}}-\\s+name\\s*:`).test(lines[index])) {
      index += 1;
    }

    const end = index;
    const block = lines.slice(start, end);
    const keyIndent = groupIndent + 2;
    const proxiesMeta = findListBlock(lines, start, end, keyIndent, 'proxies');
    const useMeta = findUseBlock(lines, start, end, keyIndent);
    const name = cleanScalar(stripYamlComment(match[2]));
    groups.push({
      name,
      originalName: name,
      type: readScalar(block, keyIndent, 'type') || '',
      proxies: proxiesMeta.items,
      use: useMeta.items,
      includeAll: readBoolScalar(block, keyIndent, 'include-all'),
      includeAllProxies: readBoolScalar(block, keyIndent, 'include-all-proxies'),
      includeAllProviders: readBoolScalar(block, keyIndent, 'include-all-providers'),
      start,
      end,
      proxiesStart: proxiesMeta.start,
      proxiesEnd: proxiesMeta.end,
      useStart: useMeta.start,
      useEnd: useMeta.end,
      isNew: false,
      deleted: false,
    });
  }

  return groups;
}

function findUseBlock(lines, start, end, keyIndent) {
  return findListBlock(lines, start, end, keyIndent, 'use');
}

function findListBlock(lines, start, end, keyIndent, key) {
  let listStart = -1;

  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    if (indentOf(line) !== keyIndent) continue;

    const inline = line.match(new RegExp(`^\\s*${escapeRegExp(key)}\\s*:\\s*\\[(.*)\\]\\s*(?:#.*)?$`));
    if (inline) {
      return {
        start: index,
        end: index + 1,
        items: splitInlineItems(inline[1]).map((item) => cleanScalar(item)).filter(Boolean),
      };
    }

    if (new RegExp(`^\\s*${escapeRegExp(key)}\\s*:\\s*(?:#.*)?$`).test(line)) {
      listStart = index;
      break;
    }
  }

  if (listStart === -1) return { start: -1, end: -1, items: [] };

  let listEnd = listStart + 1;
  const itemIndent = keyIndent + 2;
  const items = [];

  while (listEnd < end) {
    const line = lines[listEnd];
    const itemMatch =
      line.match(new RegExp(`^\\s{${itemIndent}}-\\s+(.+?)\\s*(?:#.*)?$`)) ||
      line.match(new RegExp(`^\\s{${keyIndent}}-\\s+(.+?)\\s*(?:#.*)?$`));
    if (itemMatch) items.push(cleanScalar(itemMatch[1]));
    if (line.trim() && indentOf(line) <= keyIndent && !itemMatch) break;
    listEnd += 1;
  }

  return { start: listStart, end: listEnd, items };
}

function findTopSection(lines, name) {
  const start = lines.findIndex((line) => parseTopLevelKeyValueLine(line)?.key === name);
  if (start === -1) return null;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (parseTopLevelKeyValueLine(lines[index])) {
      end = index;
      break;
    }
  }
  return { start, end };
}

function parseTopLevelKeyValueLine(line) {
  if (indentOf(line) !== 0 || line.trimStart().startsWith('- ')) return null;
  return parseKeyValueLine(line, 0);
}

function readScalar(lines, indent, key) {
  const entry = lines.map((line) => parseKeyValueLine(line, indent)).find((item) => item?.key === key);
  return entry ? cleanScalar(entry.value) : '';
}

function readBoolScalar(lines, indent, key) {
  return readScalar(lines, indent, key).toLowerCase() === 'true';
}

function readHealthScalar(lines, key) {
  const start = lines.findIndex((line) => /^    health-check\s*:/.test(line));
  if (start === -1) return '';

  const healthEntry = parseKeyValueLine(lines[start], 4);
  const inlineMap = parseInlineMap(healthEntry?.value);
  if (inlineMap?.has(key)) return cleanScalar(inlineMap.get(key));

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && indentOf(line) <= 4) break;
    const entry = parseKeyValueLine(line, 6);
    if (entry?.key === key) return cleanScalar(entry.value);
  }

  return '';
}

function readBlockScalar(lines, blockKey, key, cleaner = cleanScalar) {
  const block = findNestedBlock(lines, blockKey, 4);
  if (!block) return '';

  for (let index = block.start + 1; index < block.end; index += 1) {
    const entry = parseKeyValueLine(lines[index], 6);
    if (entry?.key === key) {
      const value = cleaner(entry.value);
      if (value) return value;

      for (let itemIndex = index + 1; itemIndex < block.end; itemIndex += 1) {
        const line = lines[itemIndex];
        if (parseKeyValueLine(line, 6)) break;
        if (line.trim() && indentOf(line) < 6) break;
        const itemMatch = line.match(/^\s{6,}-\s+(.+?)\s*(?:#.*)?$/);
        if (itemMatch) return cleaner(itemMatch[1]);
      }
    }
  }

  return '';
}

function hasNestedKey(lines, baseIndentLevel, key) {
  const indent = (baseIndentLevel + 1) * 2;
  return lines.some((line) => parseKeyValueLine(line, indent)?.key === key);
}

function hasBlockKey(lines, blockKey, key) {
  const block = findNestedBlock(lines, blockKey, 4);
  if (!block) return false;

  const blockEntry = parseKeyValueLine(lines[block.start], 4);
  const inlineMap = parseInlineMap(blockEntry?.value);
  if (inlineMap) return inlineMap.has(key);

  for (let index = block.start + 1; index < block.end; index += 1) {
    if (parseKeyValueLine(lines[index], 6)?.key === key) return true;
  }

  return false;
}

function parseInlineMap(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  const result = new Map();
  splitInlineItems(trimmed.slice(1, -1)).forEach((item) => {
    const pair = splitInlineKeyValue(item);
    if (pair) result.set(cleanScalar(pair.key), pair.value.trim());
  });
  return result;
}

function splitInlineKeyValue(value) {
  const text = String(value || '');
  let quote = '';
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quote === '"') {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (quote === "'") {
      if (char === quote) quote = '';
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === ':') {
      return {
        key: text.slice(0, index).trim(),
        value: stripYamlComment(text.slice(index + 1).trimStart()),
      };
    }
  }

  return null;
}

function splitInlineItems(value) {
  const result = [];
  let current = '';
  let quote = '';
  let escaped = false;
  let depth = 0;

  for (const char of String(value || '')) {
    if (quote === '"') {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (quote === "'") {
      current += char;
      if (char === quote) quote = '';
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '[' || char === '{' || char === '(') depth += 1;
    if (char === ']' || char === '}' || char === ')') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

function readBlockBool(lines, blockKey, key) {
  const value = readBlockScalar(lines, blockKey, key);
  return value.toLowerCase() === 'true';
}

function findNestedBlock(lines, blockKey, indent) {
  const start = lines.findIndex((line) => parseKeyValueLine(line, indent)?.key === blockKey);
  if (start === -1) return null;

  let end = start + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (line.trim() && indentOf(line) <= indent) break;
    end += 1;
  }

  return { start, end };
}

function cleanListScalar(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return '';
    return cleanScalar(inner.split(',')[0]);
  }
  return cleanScalar(trimmed);
}

function cleanScalar(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function formatKey(value) {
  const text = String(value ?? '');
  if (/^[A-Za-z0-9_.-]+$/.test(text)) return text;
  return JSON.stringify(text);
}

function formatScalar(value) {
  const text = String(value ?? '');
  if (/^(true|false|null|\d+)$/.test(text)) return text;
  if (/^[A-Za-z0-9_./:-]+$/.test(text)) return text;
  return JSON.stringify(text);
}

function parseKeyValueLine(line, indent) {
  if (indentOf(line) !== indent) return null;

  const content = line.slice(indent);
  let quote = '';
  let escaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (quote === '"') {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (quote === "'") {
      if (char === quote) quote = '';
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === ':') {
      const key = cleanScalar(content.slice(0, index));
      const value = stripYamlComment(content.slice(index + 1).trimStart());
      return key ? { key, value } : null;
    }
  }

  return null;
}

function isProviderHeaderLine(line) {
  const entry = parseKeyValueLine(line, 2);
  return Boolean(entry && isNestedMapHeaderValue(entry.value));
}

function isNestedMapHeaderValue(value) {
  const text = String(value || '').trim();
  return !text || /^&[A-Za-z0-9_.-]+$/.test(text) || /^![^\s]+(?:\s+&[A-Za-z0-9_.-]+)?$/.test(text);
}

function stripYamlComment(value) {
  const text = String(value || '');
  let quote = '';
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quote === '"') {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (quote === "'") {
      if (char === quote) quote = '';
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '#' && (index === 0 || /\s/.test(text[index - 1]))) {
      return text.slice(0, index).trimEnd();
    }
  }

  return text.trimEnd();
}

function formatHeaderValue(value) {
  return `[${JSON.stringify(String(value || ''))}]`;
}

function formatBooleanValue(value) {
  return value ? 'true' : 'false';
}

function splitLines(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function indentOf(line) {
  return line.match(/^\s*/)[0].length;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showMessage(text) {
  els.messageBox.textContent = text;
  els.messageBox.classList.remove('hidden');
}

function hideMessage() {
  els.messageBox.textContent = '';
  els.messageBox.classList.add('hidden');
}

function downloadYaml() {
  if (!state.outputText) return;
  const blob = new Blob([state.outputText], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = state.fileName ? state.fileName.replace(/\.ya?ml$/i, '.subscriptions.yaml') : 'mihomo.subscriptions.yaml';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyYaml() {
  if (!state.outputText) return;
  await navigator.clipboard.writeText(state.outputText);
  els.copyButton.querySelector('.button-label').textContent = 'Скопировано';
  window.setTimeout(() => {
    els.copyButton.querySelector('.button-label').textContent = 'Копировать';
  }, 1200);
}

async function updateMihui() {
  setMihuiUpdateHint(true, 'Запуск...');
  state.mihuiUpdateStartedAt = Date.now();
  state.mihuiUpdateAccepted = false;
  state.mihuiUpdateReconnects = 0;

  try {
    if (window.location?.protocol === 'file:') {
      throw new Error('откройте страницу через MihUI на роутере');
    }

    await apiJson('/api/update/start', { method: 'POST' });
    state.mihuiUpdateAccepted = true;
    pollMihuiUpdateStatus();
  } catch (error) {
    showMessage(`Не удалось обновить UI: ${error?.message || error}`);
    state.mihuiUpdateStartedAt = 0;
    state.mihuiUpdateAccepted = false;
    setMihuiUpdateHint(false, 'Повторить обновление');
  }
}

async function pollMihuiUpdateStatus() {
  let keepButtonBusy = false;
  if (state.updatePollTimer) {
    window.clearTimeout(state.updatePollTimer);
    state.updatePollTimer = 0;
  }

  try {
    const status = await apiJson('/api/update/status');
    state.mihuiUpdateReconnects = 0;

    if (status.running) {
      setMihuiUpdateHint(true, 'Обновление...');
      showMessage('MihUI обновляется: скачивание, распаковка, замена файлов.');
      state.updatePollTimer = window.setTimeout(pollMihuiUpdateStatus, 1000);
      return;
    }

    if (status.ok) {
      keepButtonBusy = true;
      setMihuiUpdateHint(true, 'Готово');
      showMessage('MihUI обновлен. Страница обновится через несколько секунд.');
      window.setTimeout(() => {
        try {
          window.location.reload();
        } catch (error) {
          // Page reload is only a convenience after MihUI finishes updating assets.
        }
      }, 2500);
      return;
    }

    if (state.mihuiUpdateAccepted && status.ok === null && status.message === 'idle') {
      keepButtonBusy = true;
      setMihuiUpdateHint(true, 'Готово');
      showMessage('MihUI перезапущен. Страница обновится через несколько секунд.');
      window.setTimeout(() => {
        try {
          window.location.reload();
        } catch (error) {
          // Page reload is only a convenience after MihUI finishes updating assets.
        }
      }, 1500);
      return;
    }

    throw new Error(status.message || 'обновление не выполнено');
  } catch (error) {
    if (state.mihuiUpdateAccepted && isFetchFailure(error)) {
      if (state.mihuiUpdateReconnects < 120) {
        state.mihuiUpdateReconnects += 1;
        setMihuiUpdateHint(true, 'Перезапуск...');
        showMessage('MihUI обновляется: локальный сервер перезапускается.');
        state.updatePollTimer = window.setTimeout(pollMihuiUpdateStatus, 1500);
        return;
      }

      keepButtonBusy = true;
      setMihuiUpdateHint(true, 'Обновите страницу');
      showMessage('MihUI перезапускается дольше обычного. Страница обновится через несколько секунд.');
      window.setTimeout(() => {
        try {
          window.location.reload();
        } catch (error) {
          // Page reload is only a convenience after MihUI finishes updating assets.
        }
      }, 2500);
      return;
    }

    state.updatePollTimer = 0;
    showMessage(`Не удалось обновить UI: ${error?.message || error}`);
    state.mihuiUpdateStartedAt = 0;
    state.mihuiUpdateAccepted = false;
  } finally {
    if (!state.updatePollTimer && !keepButtonBusy) setMihuiUpdateHint(false, 'Повторить обновление');
  }
}

function isFetchFailure(error) {
  return error instanceof TypeError || String(error?.message || error).toLowerCase().includes('failed to fetch');
}

function setMihuiUpdateHint(disabled, text) {
  els.updateHint.disabled = disabled;
  if (els.mihomoUiUpdateButton) els.mihomoUiUpdateButton.hidden = true;
  if (text !== undefined) els.updateHint.textContent = text;
  els.updateHint.title = disabled || !els.updateHint.textContent ? '' : 'Обновить MihUI через локальный сервис';
}
