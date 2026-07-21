const DEFAULT_HEALTH_URL = 'https://www.gstatic.com/generate_204';
const DEFAULT_GENERATED_USER_AGENT = 'ClashMeta/1.19.24; mihomo/1.19.24';
const DEFAULT_BULK_INTERVAL = '86400';
const DEFAULT_BULK_HEALTH_INTERVAL = '300';
const ROUTE_CHILD_LIMIT = 24;
const ROUTE_AUTO_PROXIES_TARGET = '__route_auto_proxies__';
const HAPP_BROWSER_DECRYPTOR_MODULE = './happ-decryptor/happ-decryptor.js';
const HAPP_BROWSER_DECRYPTOR_VERSION = '20260709-1';
const APP_SECTIONS = new Set(['overview', 'providers', 'routing', 'xkeen-files', 'nodes', 'review', 'settings']);
const MOBILE_SECTION_TABS_MEDIA = '(max-width: 560px)';
const XKEEN_NETWORK_FILE_KEYS = ['portProxying', 'portExclude', 'ipExclude', 'xkeenConfig'];
const MISSING_GROUPS_DIAGNOSTIC = 'Файл: отсутствует обязательный раздел proxy-groups.';
const PROVIDER_URL_MASKING_STORAGE_KEY = 'webmihomo.hideProviderUrls';
const CONFIG_CHECK_STORAGE_KEY = 'webmihomo.lastSuccessfulConfigCheck';
const SERVICE_HEALTH_REFRESH_MS = 30000;
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
const PROXY_SHARE_SCHEMES = new Set([
  'ss',
  'shadowsocks',
  'ssr',
  'vmess',
  'vless',
  'trojan',
  'hysteria',
  'hysteria2',
  'hy2',
  'tuic',
  'wireguard',
  'wg',
]);
const FIXED_HEADER_KEYS = new Set(['User-Agent', 'x-hwid']);
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
const NODE_COUNTRY_CODES = new Map([
  ['ae', 'AE'],
  ['argentina', 'AR'],
  ['australia', 'AU'],
  ['brazil', 'BR'],
  ['canada', 'CA'],
  ['china', 'CN'],
  ['croatia', 'HR'],
  ['de', 'DE'],
  ['deutschland', 'DE'],
  ['ee', 'EE'],
  ['estonia', 'EE'],
  ['fr', 'FR'],
  ['france', 'FR'],
  ['germany', 'DE'],
  ['hk', 'HK'],
  ['hongkong', 'HK'],
  ['india', 'IN'],
  ['ireland', 'IE'],
  ['italy', 'IT'],
  ['japan', 'JP'],
  ['jp', 'JP'],
  ['kazakhstan', 'KZ'],
  ['korea', 'KR'],
  ['kr', 'KR'],
  ['malaysia', 'MY'],
  ['mexico', 'MX'],
  ['moldova', 'MD'],
  ['nigeria', 'NG'],
  ['norway', 'NO'],
  ['nl', 'NL'],
  ['netherlands', 'NL'],
  ['peru', 'PE'],
  ['poland', 'PL'],
  ['portugal', 'PT'],
  ['russia', 'RU'],
  ['ru', 'RU'],
  ['singapore', 'SG'],
  ['slovakia', 'SK'],
  ['southafrica', 'ZA'],
  ['spain', 'ES'],
  ['sweden', 'SE'],
  ['turkey', 'TR'],
  ['ukraine', 'UA'],
  ['uae', 'AE'],
  ['uk', 'GB'],
  ['unitedkingdom', 'GB'],
  ['unitedstates', 'US'],
  ['us', 'US'],
  ['usa', 'US'],
  ['vietnam', 'VN'],
  ['аргентина', 'AR'],
  ['австралия', 'AU'],
  ['бразилия', 'BR'],
  ['венгрия', 'HU'],
  ['эстония', 'EE'],
  ['израиль', 'IL'],
  ['ирландия', 'IE'],
  ['казахстан', 'KZ'],
  ['литва', 'LT'],
  ['малайзия', 'MY'],
  ['мексика', 'MX'],
  ['молдова', 'MD'],
  ['нигерия', 'NG'],
  ['норвегия', 'NO'],
  ['португалия', 'PT'],
  ['перу', 'PE'],
  ['словакия', 'SK'],
  ['украина', 'UA'],
  ['финляндия', 'FI'],
  ['хорватия', 'HR'],
  ['швейцария', 'CH'],
  ['юар', 'ZA'],
  ['южнаяафрика', 'ZA'],
  ['южнаякорея', 'KR'],
  ['великобритания', 'GB'],
  ['германия', 'DE'],
  ['гонконг', 'HK'],
  ['индия', 'IN'],
  ['испания', 'ES'],
  ['италия', 'IT'],
  ['канада', 'CA'],
  ['китай', 'CN'],
  ['нидерланды', 'NL'],
  ['оаэ', 'AE'],
  ['польша', 'PL'],
  ['россия', 'RU'],
  ['сингапур', 'SG'],
  ['сша', 'US'],
  ['турция', 'TR'],
  ['франция', 'FR'],
  ['швеция', 'SE'],
  ['япония', 'JP'],
]);
const FLAG_EMOJI_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
const NATIVE_FLAG_TEST_EMOJI = String.fromCodePoint(0x1F1F3, 0x1F1F4);
const NODE_FLAG_PATTERNS = {
  AE: { type: 'ae' },
  AR: { type: 'h', colors: ['#74acdf', '#fff', '#74acdf'] },
  AT: { type: 'h', colors: ['#ed2939', '#fff', '#ed2939'] },
  AU: { type: 'au' },
  BE: { type: 'v', colors: ['#000', '#fae042', '#ed2939'] },
  BG: { type: 'h', colors: ['#fff', '#00966e', '#d62612'] },
  BR: { type: 'br' },
  CA: { type: 'v', colors: ['#d80621', '#fff', '#d80621'] },
  CH: { type: 'swiss' },
  CN: { type: 'cn' },
  CO: { type: 'h', colors: ['#fcd116', '#fcd116', '#003893', '#ce1126'] },
  CZ: { type: 'h', colors: ['#fff', '#d7141a'] },
  DE: { type: 'h', colors: ['#000', '#dd0000', '#ffce00'] },
  DK: { type: 'nordic', background: '#c60c30', cross: '#fff' },
  EE: { type: 'h', colors: ['#0072ce', '#000', '#fff'] },
  ES: { type: 'h', colors: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] },
  FI: { type: 'nordic', background: '#fff', cross: '#002f6c' },
  FR: { type: 'v', colors: ['#0055a4', '#fff', '#ef4135'] },
  GB: { type: 'gb' },
  GR: { type: 'h', colors: ['#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf'] },
  HK: { type: 'hk' },
  HR: { type: 'hr' },
  HU: { type: 'h', colors: ['#ce2939', '#fff', '#477050'] },
  IE: { type: 'v', colors: ['#169b62', '#fff', '#ff883e'] },
  IL: { type: 'il' },
  IN: { type: 'h', colors: ['#ff9933', '#fff', '#138808'] },
  IT: { type: 'v', colors: ['#009246', '#fff', '#ce2b37'] },
  JP: { type: 'circle', background: '#fff', circle: '#bc002d' },
  KR: { type: 'kr' },
  KZ: { type: 'kz' },
  LT: { type: 'h', colors: ['#fdb913', '#006a44', '#c1272d'] },
  LV: { type: 'h', colors: ['#9e3039', '#fff', '#9e3039'] },
  MD: { type: 'md' },
  MX: { type: 'mx' },
  MY: { type: 'my' },
  NG: { type: 'v', colors: ['#008751', '#fff', '#008751'] },
  NL: { type: 'h', colors: ['#ae1c28', '#fff', '#21468b'] },
  NO: { type: 'no' },
  PE: { type: 'v', colors: ['#d91023', '#fff', '#d91023'] },
  PL: { type: 'h', colors: ['#fff', '#dc143c'] },
  PT: { type: 'pt' },
  RO: { type: 'v', colors: ['#002b7f', '#fcd116', '#ce1126'] },
  RU: { type: 'h', colors: ['#fff', '#0039a6', '#d52b1e'] },
  SE: { type: 'nordic', background: '#006aa7', cross: '#fecc00' },
  SG: { type: 'h', colors: ['#ef3340', '#fff'] },
  SK: { type: 'sk' },
  TR: { type: 'tr' },
  UA: { type: 'h', colors: ['#0057b7', '#ffd700'] },
  US: { type: 'us' },
  VN: { type: 'vn' },
  ZA: { type: 'za' },
};
const PROXY_MODE_TYPES = new Set(['fallback', 'url-test', 'load-balance', 'relay']);
const GROUP_TYPE_OPTIONS = ['select', 'url-test', 'fallback', 'load-balance', 'relay'];
const RULE_TYPE_OPTIONS = ['DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'GEOSITE', 'GEOIP', 'IP-CIDR', 'MATCH'];
const BUILT_IN_OUTBOUNDS = new Set(['DIRECT', 'PASS', 'PASS-RULE', 'REJECT', 'REJECT-DROP', 'GLOBAL', 'COMPATIBLE']);
const RULE_OPTIONS = new Set(['no-resolve', 'src']);
let ruleIdCounter = 1;
let flagEmojiSupportCache = null;
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
  { key: 'customHeaders', label: 'headers' },
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
  configLoadedAt: 0,
  originalText: '',
  providers: [],
  groups: [],
  rules: [],
  originalProviders: [],
  originalGroups: [],
  originalRules: [],
  originalConnectionSettings: {},
  connectionSettings: {},
  outputText: '',
  hasProvidersSection: false,
  hasGroupsSection: false,
  hasRulesSection: false,
  intervalToolsOpen: false,
  isEditingConfiguration: false,
  selectedProviderName: '',
  providerInspectorEditing: false,
  providerSearch: '',
  selectedGroupName: '',
  groupInspectorEditing: false,
  groupSearch: '',
  groupTypeFilter: 'all',
  selectedRouteScenarioId: '',
  providerStatuses: {},
  providerStatusLoading: false,
  providerUpdatingName: '',
  happDecodeProviderName: '',
  happDecodeFeedback: null,
  mihomoNodes: [],
  mihomoGroupSelections: [],
  nodeInventoryLoading: false,
  nodeInventoryError: '',
  nodeInventoryErrorDetail: '',
  nodeGroupSelectionsError: '',
  nodeGroupSelectingName: '',
  nodeInventoryUpdatedAt: 0,
  nodeFilters: {
    search: '',
    provider: '',
    group: '',
    protocol: '',
    status: '',
  },
  lastConfigCheckText: '',
  lastConfigCheckOk: false,
  kernelCheckBusy: false,
  routerMode: false,
  routerApiAvailable: false,
  routerConfigPath: '',
  routerConfigRevision: '',
  routerSavedText: '',
  routerBusy: false,
  xkeenFiles: {
    loaded: false,
    loading: false,
    saving: false,
    restartRequested: false,
    available: false,
    directory: '/opt/etc/xkeen',
    files: {},
    originals: {},
    paths: {},
    errors: [],
  },
  backups: [],
  selectedBackupName: '',
  updatePollTimer: 0,
  mihuiUpdateStartedAt: 0,
  mihuiUpdateAccepted: false,
  mihuiUpdateReconnects: 0,
  activeSection: 'overview',
  providerView: 'editor',
  routingView: 'map',
  selectedRuleId: '',
  ruleInspectorEditing: false,
  ruleFilters: {
    search: '',
    type: '',
    target: '',
  },
  recommendationCount: 0,
  changeCount: 0,
  hideProviderUrls: readProviderUrlMaskingPreference(),
  serviceHealth: {
    loading: false,
    checkedAt: 0,
    services: {
      xkeen: { state: 'unavailable', message: 'Доступно только в MihUI', detail: '' },
      mihomo: { state: 'unavailable', message: 'Доступно только в MihUI', detail: '' },
    },
  },
  components: {
    loading: false,
    loaded: false,
    checkedAt: 0,
    updateCount: 0,
    items: {
      xkeen: { installed: false, current: '', channel: '', latest: '', versions: [], updateAvailable: false, error: '' },
      mihomo: { installed: false, current: '', channel: '', latest: '', versions: [], updateAvailable: false, error: '' },
    },
    job: { running: false, ok: null, component: '', action: '', target: '', phase: 'idle', message: '', output: '' },
    jobVisible: false,
    pollTimer: 0,
    xkeenChannelCurrent: '',
    xkeenChannelSelection: '',
    view: 'updates',
  },
  overviewDiagnostics: [],
  lastUndo: null,
};

let happBrowserDecryptorPromise = null;

const els = {
  routerLoadButton: document.querySelector('#routerLoadButton'),
  routerSaveButton: document.querySelector('#routerSaveButton'),
  fileTools: document.querySelector('#fileTools'),
  backupHistoryButton: document.querySelector('#backupHistoryButton'),
  backupHistoryDialog: document.querySelector('#backupHistoryDialog'),
  backupHistoryList: document.querySelector('#backupHistoryList'),
  backupHistoryEmpty: document.querySelector('#backupHistoryEmpty'),
  backupHistoryStatus: document.querySelector('#backupHistoryStatus'),
  backupUnsavedWarning: document.querySelector('#backupUnsavedWarning'),
  updateHint: document.querySelector('#updateHint'),
  uiLinks: document.querySelector('#uiLinks'),
  restoreBackupButton: document.querySelector('#restoreBackupButton'),
  fileInput: document.querySelector('#fileInput'),
  downloadButton: document.querySelector('#downloadButton'),
  reviewDownloadButton: document.querySelector('#reviewDownloadButton'),
  addProviderButton: document.querySelector('#addProviderButton'),
  providersPageSummary: document.querySelector('#providersPageSummary'),
  addGroupButton: document.querySelector('#addGroupButton'),
  groupSearchInput: document.querySelector('#groupSearchInput'),
  groupTypeFilters: document.querySelectorAll('[data-group-type-filter]'),
  addRuleButton: document.querySelector('#addRuleButton'),
  providerListActionHome: document.querySelector('#providerListActionHome'),
  groupListActionHome: document.querySelector('#groupListActionHome'),
  providerStatusRefreshButton: document.querySelector('#providerStatusRefreshButton'),
  providerSearchInput: document.querySelector('#providerSearchInput'),
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
  appSidebar: document.querySelector('.app-sidebar'),
  primarySectionTabs: document.querySelector('.section-tabs'),
  topbar: document.querySelector('.topbar'),
  mobileSectionTabs: document.querySelector('#mobileSectionTabs'),
  topbarValidation: document.querySelector('#topbarValidation'),
  componentOpenButtons: document.querySelectorAll('[data-components-open]'),
  serviceHealthItems: document.querySelectorAll('[data-service-health]'),
  serviceHealthChecked: document.querySelectorAll('[data-service-health-checked]'),
  serviceUpdateBadges: document.querySelectorAll('[data-service-update-badge]'),
  componentManagerDialog: document.querySelector('#componentManagerDialog'),
  componentManagerTitle: document.querySelector('#componentManagerTitle'),
  componentManagerDescription: document.querySelector('#componentManagerDescription'),
  closeComponentManagerButton: document.querySelector('#closeComponentManagerButton'),
  componentManagerNotice: document.querySelector('#componentManagerNotice'),
  componentUpdatesViews: document.querySelectorAll('[data-component-updates-view]'),
  componentCards: document.querySelectorAll('[data-component-card]'),
  componentStates: document.querySelectorAll('[data-component-state]'),
  componentCurrentVersions: document.querySelectorAll('[data-component-current]'),
  componentLatestVersions: document.querySelectorAll('[data-component-latest]'),
  componentLatestLabels: document.querySelectorAll('[data-component-latest-label]'),
  componentChannels: document.querySelectorAll('[data-component-channel]'),
  componentUpdateButtons: document.querySelectorAll('[data-component-update]'),
  componentAdvancedButtons: document.querySelectorAll('[data-component-advanced-toggle]'),
  componentRollbackButtons: document.querySelectorAll('[data-component-rollback]'),
  xkeenChannelOptions: document.querySelectorAll('[data-xkeen-channel]'),
  xkeenChannelApplyButton: document.querySelector('#xkeenChannelApplyButton'),
  xkeenChannelHint: document.querySelector('#xkeenChannelHint'),
  reinstallXkeenButton: document.querySelector('#reinstallXkeenButton'),
  componentMaintenanceButtons: document.querySelectorAll('[data-maintenance-component][data-maintenance-action]'),
  componentMaintenance: document.querySelector('#componentMaintenance'),
  openComponentMaintenanceButton: document.querySelector('#openComponentMaintenanceButton'),
  backToComponentUpdatesButton: document.querySelector('#backToComponentUpdatesButton'),
  componentUpdateFooter: document.querySelector('#componentUpdateFooter'),
  mihomoVersionSelect: document.querySelector('#mihomoVersionSelect'),
  installMihomoVersionButton: document.querySelector('#installMihomoVersionButton'),
  checkComponentUpdatesButton: document.querySelector('#checkComponentUpdatesButton'),
  componentVersionsChecked: document.querySelector('#componentVersionsChecked'),
  componentJobPanel: document.querySelector('#componentJobPanel'),
  componentJobTitle: document.querySelector('#componentJobTitle'),
  componentJobMessage: document.querySelector('#componentJobMessage'),
  dismissComponentJobButton: document.querySelector('#dismissComponentJobButton'),
  componentJobDetails: document.querySelector('#componentJobDetails'),
  componentJobOutput: document.querySelector('#componentJobOutput'),
  providerCount: document.querySelector('#providerCount'),
  groupCount: document.querySelector('#groupCount'),
  rulesMetric: document.querySelector('#rulesMetric'),
  rulesStatus: document.querySelector('#rulesStatus'),
  rulesHint: document.querySelector('#rulesHint'),
  messageBox: document.querySelector('#messageBox'),
  sectionTabs: document.querySelectorAll('.section-tab, .mobile-section-tab'),
  sectionTargets: document.querySelectorAll('[data-section-target]'),
  sectionPanels: document.querySelectorAll('[data-section-panel]'),
  xkeenFileEditors: document.querySelectorAll('[data-xkeen-file]'),
  xkeenFileCards: document.querySelectorAll('[data-xkeen-file-card]'),
  xkeenFileCounts: document.querySelectorAll('[data-xkeen-file-count]'),
  xkeenFilePaths: document.querySelectorAll('[data-xkeen-file-path]'),
  xkeenFileErrors: document.querySelectorAll('[data-xkeen-file-error]'),
  xkeenFilesDirectory: document.querySelector('#xkeenFilesDirectory'),
  xkeenFilesNotice: document.querySelector('#xkeenFilesNotice'),
  xkeenRestartButton: document.querySelector('#xkeenRestartButton'),
  xkeenFilesRefreshButton: document.querySelector('#xkeenFilesRefreshButton'),
  xkeenFilesSaveButton: document.querySelector('#xkeenFilesSaveButton'),
  xkeenRestartAfterSave: document.querySelector('#xkeenRestartAfterSave'),
  xkeenFilesChangeStatus: document.querySelector('#xkeenFilesChangeStatus'),
  xkeenFilesStatus: document.querySelector('#xkeenFilesStatus'),
  overviewProvidersSummary: document.querySelector('#overviewProvidersSummary'),
  overviewRoutingSummary: document.querySelector('#overviewRoutingSummary'),
  overviewNodesStatus: document.querySelector('#overviewNodesStatus'),
  overviewNodesSummary: document.querySelector('#overviewNodesSummary'),
  overviewReviewSummary: document.querySelector('#overviewReviewSummary'),
  overviewAttentionList: document.querySelector('#overviewAttentionList'),
  overviewHealth: document.querySelector('.overview-health'),
  overviewHealthTitle: document.querySelector('#overviewHealthTitle'),
  overviewHealthSummary: document.querySelector('#overviewHealthSummary'),
  overviewConfigSource: document.querySelector('#overviewConfigSource'),
  overviewConfigPath: document.querySelector('#overviewConfigPath'),
  overviewConfigChanges: document.querySelector('#overviewConfigChanges'),
  overviewConfigLoadedLabel: document.querySelector('#overviewConfigLoadedLabel'),
  overviewConfigLoadedAt: document.querySelector('#overviewConfigLoadedAt'),
  mobileFlowActions: document.querySelector('#mobileFlowActions'),
  mobileChangesButton: document.querySelector('#mobileChangesButton'),
  mobileReviewButton: document.querySelector('#mobileReviewButton'),
  mobileDownloadButton: document.querySelector('#mobileDownloadButton'),
  reviewWorkflow: document.querySelector('#reviewWorkflow'),
  reviewSummaryPanel: document.querySelector('.review-summary-panel'),
  reviewSummaryStatus: document.querySelector('#reviewSummaryStatus'),
  reviewChecklist: document.querySelector('#reviewChecklist'),
  reviewChangeStatus: document.querySelector('#reviewChangeStatus'),
  reviewYamlStatus: document.querySelector('#reviewYamlStatus'),
  reviewYamlMeta: document.querySelector('#reviewYamlMeta'),
  diagnosticsPanel: document.querySelector('#diagnosticsPanel'),
  connectionSettingsPanel: document.querySelector('#connectionSettingsPanel'),
  changesPanel: document.querySelector('#changesPanel'),
  nodeInventoryPanel: document.querySelector('#nodeInventoryPanel'),
  nodeInventoryControls: document.querySelector('.node-inventory-controls'),
  nodeInventoryStatus: document.querySelector('#nodeInventoryStatus'),
  nodeInventoryRefreshButton: document.querySelector('#nodeInventoryRefreshButton'),
  nodeResetFiltersButton: document.querySelector('#nodeResetFiltersButton'),
  nodeGroupSelections: document.querySelector('#nodeGroupSelections'),
  nodeInventorySummary: document.querySelector('#nodeInventorySummary'),
  nodeInventoryList: document.querySelector('#nodeInventoryList'),
  nodeSearchInput: document.querySelector('#nodeSearchInput'),
  nodeProviderFilter: document.querySelector('#nodeProviderFilter'),
  nodeGroupFilter: document.querySelector('#nodeGroupFilter'),
  nodeProtocolFilter: document.querySelector('#nodeProtocolFilter'),
  nodeStatusFilter: document.querySelector('#nodeStatusFilter'),
  hideProviderUrlsSetting: document.querySelector('#hideProviderUrlsSetting'),
  providersList: document.querySelector('#providersList'),
  providerViewTabs: document.querySelectorAll('[data-provider-view]'),
  providerViewPanels: document.querySelectorAll('[data-provider-view-panel]'),
  routingViewTabs: document.querySelectorAll('[data-routing-view]'),
  routingViewPanels: document.querySelectorAll('[data-routing-view-panel]'),
  rulesViewCount: document.querySelector('#rulesViewCount'),
  ruleSearchInput: document.querySelector('#ruleSearchInput'),
  ruleTypeFilter: document.querySelector('#ruleTypeFilter'),
  ruleTargetFilter: document.querySelector('#ruleTargetFilter'),
  rulesFilterSummary: document.querySelector('#rulesFilterSummary'),
  rulesOrderSummary: document.querySelector('#rulesOrderSummary'),
  rulesTargetSummary: document.querySelector('#rulesTargetSummary'),
  groupOrderList: document.querySelector('#groupOrderList'),
  rulesEditorList: document.querySelector('#rulesEditorList'),
  ruleInspector: document.querySelector('#ruleInspector'),
  groupsMatrix: document.querySelector('#groupsMatrix'),
  outputViewer: document.querySelector('#outputViewer'),
  outputCodeView: document.querySelector('#outputCodeView'),
  outputPreview: document.querySelector('#outputPreview'),
  providerTemplate: document.querySelector('#providerTemplate'),
};

els.routerLoadButton.addEventListener('click', reloadRouterConfig);
els.routerSaveButton.addEventListener('click', handleTopbarSaveAction);
els.backupHistoryButton.addEventListener('click', openBackupHistoryDialog);
els.backupHistoryList.addEventListener('change', handleBackupSelection);
els.restoreBackupButton.addEventListener('click', restoreSelectedBackup);
els.fileInput.addEventListener('change', handleFileSelect);
els.downloadButton.addEventListener('click', downloadYaml);
els.reviewDownloadButton.addEventListener('click', downloadYaml);
els.addProviderButton.addEventListener('click', addProvider);
els.addGroupButton.addEventListener('click', addGroup);
els.addRuleButton.addEventListener('click', addRule);
els.providerStatusRefreshButton.addEventListener('click', () => loadProviderStatuses({ silent: false }));
els.providerSearchInput.addEventListener('input', () => {
  state.providerSearch = els.providerSearchInput.value || '';
  render();
});
els.groupSearchInput.addEventListener('input', () => {
  state.groupSearch = els.groupSearchInput.value || '';
  render();
});
els.groupTypeFilters.forEach((button) => button.addEventListener('click', () => {
  state.groupTypeFilter = button.dataset.groupTypeFilter || 'all';
  state.groupInspectorEditing = false;
  render();
}));
els.intervalToolsButton.addEventListener('click', toggleIntervalTools);
els.bulkIntervalInput.addEventListener('input', handleBulkIntervalInput);
els.bulkHealthIntervalInput.addEventListener('input', handleBulkIntervalInput);
els.intervalPresets.forEach((button) => button.addEventListener('click', applyIntervalPreset));
els.applyIntervalsButton.addEventListener('click', applyBulkIntervals);
els.editConfigButton.addEventListener('click', beginConfigurationEdit);
els.applyConfigButton.addEventListener('click', applyConfigurationEdit);
els.cancelConfigEditButton.addEventListener('click', cancelConfigurationEdit);
els.outputPreview.addEventListener('input', handleConfigurationDraftInput);
els.outputPreview.addEventListener('scroll', syncConfigurationEditorScroll, { passive: true });
els.checkConfigButton.addEventListener('click', () => checkRouterConfig({ silent: false }));
els.copyButton.addEventListener('click', copyYaml);
els.hideProviderUrlsSetting.addEventListener('change', () => setProviderUrlMasking(els.hideProviderUrlsSetting.checked));
els.updateHint.addEventListener('click', updateMihui);
els.changesJumpButton.addEventListener('click', focusChangesPanel);
els.recommendationsJumpButton.addEventListener('click', focusConnectionSettingsPanel);
els.mobileChangesButton.addEventListener('click', focusChangesPanel);
els.mobileReviewButton.addEventListener('click', handleTopbarSaveAction);
els.mobileDownloadButton.addEventListener('click', downloadYaml);
els.nodeInventoryRefreshButton.addEventListener('click', () => loadNodeInventory({ silent: false }));
els.nodeResetFiltersButton.addEventListener('click', resetNodeFilters);
els.nodeSearchInput.addEventListener('input', handleNodeFilterChange);
els.nodeProviderFilter.addEventListener('change', handleNodeFilterChange);
els.nodeGroupFilter.addEventListener('change', handleNodeFilterChange);
els.nodeProtocolFilter.addEventListener('change', handleNodeFilterChange);
els.nodeStatusFilter.addEventListener('change', handleNodeFilterChange);
els.rulesMetric.addEventListener('click', openOverviewCheck);
els.downloadWarning.addEventListener('click', focusDiagnosticsPanel);
els.sectionTabs.forEach((button) => button.addEventListener('click', () => setActiveSection(button.dataset.section)));
els.sectionTargets.forEach((button) => button.addEventListener('click', () => setActiveSection(button.dataset.sectionTarget)));
window.addEventListener?.('scroll', updateMobileSectionTabsVisibility, { passive: true });
window.addEventListener?.('resize', updateMobileSectionTabsVisibility);
window.addEventListener?.('beforeunload', handleBeforeUnload);
els.xkeenFileEditors.forEach((editor) => editor.addEventListener('input', handleXkeenNetworkFileInput));
els.xkeenRestartButton.addEventListener('click', restartXkeenFromFiles);
els.xkeenFilesRefreshButton.addEventListener('click', reloadXkeenNetworkFiles);
els.xkeenFilesSaveButton.addEventListener('click', saveXkeenNetworkFiles);
els.xkeenRestartAfterSave.addEventListener('change', renderXkeenNetworkFiles);
els.providerViewTabs.forEach((button) => {
  button.addEventListener('click', () => setProviderView(button.dataset.providerView));
  button.addEventListener('keydown', (event) => handleSubsectionTabKeydown(event, els.providerViewTabs, 'providerView', setProviderView));
});
els.routingViewTabs.forEach((button) => {
  button.addEventListener('click', () => setRoutingView(button.dataset.routingView));
  button.addEventListener('keydown', (event) => handleSubsectionTabKeydown(event, els.routingViewTabs, 'routingView', setRoutingView));
});
els.ruleSearchInput.addEventListener('input', handleRuleFilterChange);
els.ruleTypeFilter.addEventListener('change', handleRuleFilterChange);
els.ruleTargetFilter.addEventListener('change', handleRuleFilterChange);
els.componentOpenButtons.forEach((button) => button.addEventListener('click', openComponentManager));
els.closeComponentManagerButton.addEventListener('click', closeComponentManager);
els.componentManagerDialog.addEventListener('close', handleComponentManagerClosed);
els.dismissComponentJobButton.addEventListener('click', dismissComponentJob);
els.checkComponentUpdatesButton.addEventListener('click', handleComponentPrimaryAction);
els.componentUpdateButtons.forEach((button) => button.addEventListener('click', () => updateComponent(button.dataset.componentUpdate)));
els.componentAdvancedButtons.forEach((button) => button.addEventListener('click', () => {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  if (panel) panel.hidden = expanded;
}));
els.componentRollbackButtons.forEach((button) => button.addEventListener('click', () => rollbackComponent(button.dataset.componentRollback)));
els.xkeenChannelOptions.forEach((button) => button.addEventListener('click', () => selectXkeenChannel(button.dataset.xkeenChannel)));
els.xkeenChannelApplyButton.addEventListener('click', applyXkeenChannel);
els.reinstallXkeenButton.addEventListener('click', reinstallXkeen);
els.openComponentMaintenanceButton.addEventListener('click', openComponentMaintenance);
els.backToComponentUpdatesButton.addEventListener('click', openComponentUpdates);
els.componentMaintenanceButtons.forEach((button) => button.addEventListener('click', () => startMaintenanceAction(button.dataset.maintenanceComponent, button.dataset.maintenanceAction)));
els.installMihomoVersionButton.addEventListener('click', installSelectedMihomoVersion);
renderInterfaceSettings();
renderServiceHealth();
renderComponentManager();
renderXkeenNetworkFiles();
updateMobileSectionTabsVisibility();
initRouterMode();

function readProviderUrlMaskingPreference() {
  try {
    const stored = window.localStorage?.getItem(PROVIDER_URL_MASKING_STORAGE_KEY);
    return stored === null || stored === undefined ? true : stored === 'true';
  } catch {
    return true;
  }
}

function renderInterfaceSettings() {
  els.hideProviderUrlsSetting.checked = state.hideProviderUrls;
}

function setProviderUrlMasking(enabled) {
  state.hideProviderUrls = Boolean(enabled);
  try {
    window.localStorage?.setItem(PROVIDER_URL_MASKING_STORAGE_KEY, String(state.hideProviderUrls));
  } catch {
    // Настройка работает и без доступного localStorage.
  }
  render();
}

function getMobileSectionTabsHeight() {
  if (typeof window.getComputedStyle !== 'function') return 44;
  return Number.parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--mobile-section-tabs-height')) || 44;
}

function getStickyTopbarHeight() {
  const isMobile = Boolean(window.matchMedia?.(MOBILE_SECTION_TABS_MEDIA).matches);
  return isMobile ? getMobileSectionTabsHeight() : els.topbar?.offsetHeight || 0;
}

function setActiveSection(section, options = {}) {
  if (!APP_SECTIONS.has(section)) return;

  const shouldScroll = options.scroll !== false;
  const isNewSection = section !== state.activeSection;
  const switchSection = () => {
    state.activeSection = section;
    renderSectionTabs();
    updateMobileSectionTabsVisibility();
    centerActiveMobileSectionTab();
  };
  const scrollToSection = () => {
    if (!shouldScroll) return;

    const panel = document.querySelector(`[data-section-panel="${section}"]`);
    if (!panel?.scrollIntoView) return;

    panel.style.removeProperty('scroll-margin-top');
    const configuredMargin = Number.parseFloat(window.getComputedStyle(panel).scrollMarginTop) || 0;
    const stickyTopbarMargin = getStickyTopbarHeight() + 12;
    panel.style.scrollMarginTop = `${Math.max(configuredMargin, stickyTopbarMargin)}px`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const reduceMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  if (isNewSection && !reduceMotion && typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(switchSection);
    transition.updateCallbackDone.then(scrollToSection, scrollToSection);
    return;
  }

  switchSection();
  if (isNewSection && !reduceMotion) {
    const panel = document.querySelector(`[data-section-panel="${section}"]`);
    panel?.classList.add('is-entering');
    panel?.addEventListener('animationend', () => panel.classList.remove('is-entering'), { once: true });
  }
  scrollToSection();
}

function updateMobileSectionTabsVisibility() {
  if (!els.mobileSectionTabs || !els.appSidebar) return;
  const isMobile = Boolean(window.matchMedia?.(MOBILE_SECTION_TABS_MEDIA).matches);
  const sidebarBottom = els.appSidebar.getBoundingClientRect?.().bottom ?? Number.POSITIVE_INFINITY;
  const shouldShow = isMobile && sidebarBottom <= 0;
  const visibilityChanged = els.mobileSectionTabs.hidden === shouldShow;

  els.mobileSectionTabs.hidden = !shouldShow;
  els.mobileSectionTabs.setAttribute('aria-hidden', String(!shouldShow));

  if (els.primarySectionTabs) {
    els.primarySectionTabs.inert = shouldShow;
    els.primarySectionTabs.setAttribute('aria-hidden', String(shouldShow));
  }

  if (shouldShow && visibilityChanged) centerActiveMobileSectionTab();
}

function centerActiveMobileSectionTab() {
  if (!els.mobileSectionTabs || els.mobileSectionTabs.hidden) return;
  const activeTab = els.mobileSectionTabs.querySelector(`[data-section="${state.activeSection}"]`);
  if (!activeTab) return;
  const left = activeTab.offsetLeft - (els.mobileSectionTabs.clientWidth - activeTab.offsetWidth) / 2;
  els.mobileSectionTabs.scrollTo?.({ left: Math.max(0, left), behavior: 'smooth' });
}

function renderSectionTabs() {
  els.sectionTabs.forEach((button) => {
    const isActive = button.dataset.section === state.activeSection;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  els.sectionPanels.forEach((panel) => {
    const isActive = panel.dataset.sectionPanel === state.activeSection;
    panel.hidden = !isActive;
    panel.classList.toggle('is-active', isActive);
  });

  renderProviderView();
  renderRoutingView();
  renderXkeenNetworkFiles();
  els.recommendationsJumpButton.hidden = !shouldShowRecommendations(state.recommendationCount, state.activeSection);
}

function setProviderView(view) {
  if (!['editor', 'relations'].includes(view)) return;
  state.providerView = view;
  renderProviderView();
}

function renderProviderView() {
  els.providerViewTabs.forEach((button) => {
    const isActive = button.dataset.providerView === state.providerView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
  els.providerViewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.providerViewPanel !== state.providerView;
  });
  renderProviderPageSummary();
}

function renderProviderPageSummary() {
  if (!els.providersPageSummary) return;
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  if (state.providerView === 'relations') {
    els.providersPageSummary.textContent = `${formatRouteCount(activeProviders.length, 'подписка', 'подписки', 'подписок')} · ${formatRouteCount(state.groups.length, 'группа', 'группы', 'групп')}`;
    return;
  }
  const connectedCount = activeProviders.filter((provider) => getProviderUseGroupNames(provider.name).length > 0).length;
  els.providersPageSummary.textContent = `${activeProviders.length} подписок · ${connectedCount} используются в группах`;
}

function setRoutingView(view) {
  if (!['map', 'rules'].includes(view)) return;
  state.routingView = view;
  renderRoutingView();
}

function renderRoutingView() {
  els.routingViewTabs.forEach((button) => {
    const isActive = button.dataset.routingView === state.routingView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
  els.routingViewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.routingViewPanel !== state.routingView;
  });
}

function handleSubsectionTabKeydown(event, tabs, dataKey, setView) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const items = [...tabs];
  const currentIndex = items.indexOf(event.currentTarget);
  if (currentIndex === -1) return;
  event.preventDefault();
  let nextIndex = currentIndex;
  if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + items.length) % items.length;
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % items.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = items.length - 1;
  const next = items[nextIndex];
  setView(next.dataset[dataKey]);
  next.focus();
}

function handleFileSelect(event) {
  const [file] = event.target.files;
  if (!file) return;
  els.fileTools.open = false;

  const reader = new FileReader();
  reader.onload = () => {
    state.routerMode = false;
    state.routerConfigPath = '';
    state.routerSavedText = '';
    state.providerStatuses = {};
    state.mihomoNodes = [];
    state.mihomoGroupSelections = [];
    state.nodeInventoryError = '';
    state.nodeInventoryErrorDetail = '';
    state.nodeGroupSelectionsError = '';
    state.lastConfigCheckText = '';
    state.lastConfigCheckOk = false;
    resetWorkspaceViewState();
    state.fileName = file.name;
    state.configLoadedAt = Date.now();
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
  loadXkeenNetworkFiles({ silent: true });
  loadServiceHealth({ silent: true });
  loadComponents({ silent: true });
  startServiceHealthPolling();
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
    state.routerConfigRevision = String(data.revision || '');
    state.fileName = state.routerConfigPath || 'router config';
    state.configLoadedAt = Date.now();
    state.originalText = String(data.text || '');
    state.routerSavedText = state.originalText;
    state.isEditingConfiguration = false;
    state.lastConfigCheckText = '';
    state.lastConfigCheckOk = false;
    resetWorkspaceViewState();
    parseAndRender();
    await loadBackups();
    await loadProviderStatuses({ silent: true });
    await loadNodeInventory({ silent: true });
    if (!options.silent) showMessage(`Открыт конфиг: ${getDisplayFileName(state.routerConfigPath)}`, { severity: 'success' });
  } catch (error) {
    if (!options.silent) {
      const detail = error?.message || String(error);
      showMessage('Не удалось получить конфигурацию с роутера.', {
        severity: 'error',
        details: detail,
        actions: [
          { label: 'Повторить', onClick: () => loadRouterConfig({ silent: false }) },
          { label: 'Открыть файл', onClick: () => els.fileInput.click() },
        ],
      });
    }
    renderBackups([]);
    render();
  } finally {
    setRouterBusy(false, 'Перезагрузить с роутера');
  }
}

async function reloadRouterConfig() {
  if (hasUnsavedRouterChanges()) {
    const confirmed = window.confirm('Несохраненные изменения будут заменены конфигурацией с роутера. Продолжить?');
    if (!confirmed) return;
  }
  els.fileTools?.removeAttribute('open');
  await loadRouterConfig({ silent: false });
}

function resetWorkspaceViewState() {
  state.providerView = 'editor';
  state.providerInspectorEditing = false;
  state.providerSearch = '';
  state.groupInspectorEditing = false;
  state.groupSearch = '';
  state.groupTypeFilter = 'all';
  state.routingView = 'map';
  state.ruleFilters = { search: '', type: '', target: '' };
  state.selectedRuleId = '';
  state.ruleInspectorEditing = false;
  state.lastUndo = null;
}

async function saveRouterConfig() {
  if (!state.outputText) return;
  if (!state.routerMode) {
    if (state.changeCount > 0) {
      focusChangesPanel();
    } else {
      setActiveSection('review');
    }
    return;
  }

  if (hasBlockingLocalErrors()) {
    showMessage('Сначала исправьте ошибки структуры и связей.', { severity: 'error' });
    focusReviewSummary();
    return;
  }

  if (!isCurrentConfigKernelChecked()) {
    const check = await checkRouterConfig({ silent: true, allowUnavailable: true });
    if (check === false) {
      focusReviewSummary();
      return;
    }
  }

  if (!confirmHighRiskSave()) return;

  setRouterBusy(true, 'Сохранение...');

  try {
    const data = await apiJson('/api/config/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: state.outputText,
        expectedRevision: state.routerConfigRevision || undefined,
      }),
    });
    state.routerMode = true;
    state.routerConfigPath = data.path || state.routerConfigPath;
    state.routerConfigRevision = String(data.revision || state.routerConfigRevision);
    state.fileName = state.routerConfigPath;
    state.configLoadedAt = Date.now();
    state.originalText = state.outputText;
    state.routerSavedText = state.outputText;
    state.lastConfigCheckText = state.outputText;
    state.lastConfigCheckOk = true;
    persistSuccessfulConfigCheck(state.outputText);
    parseAndRender();
    await loadBackups();
    await loadProviderStatuses({ silent: true });
    await loadNodeInventory({ silent: true });

    const appliedAt = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    showMessage(`Конфиг сохранен и подтвержден Mihomo. Применено в ${appliedAt}.`, { severity: 'success' });
  } catch (error) {
    const result = error?.data || {};
    if (result.stage === 'conflict') {
      showMessage('Конфиг на роутере изменился после открытия этой вкладки. Черновик не записан.', {
        severity: 'warning',
        actions: [
          { label: 'Скачать черновик', onClick: downloadYaml },
          { label: 'Перезагрузить с роутера', onClick: reloadRouterConfig },
        ],
      });
      focusReviewSummary();
      return;
    }
    if (result.saved && result.uncertain) {
      state.routerMode = true;
      state.routerConfigPath = result.path || state.routerConfigPath;
      state.routerConfigRevision = String(result.revision || state.routerConfigRevision);
      state.fileName = state.routerConfigPath;
      state.configLoadedAt = Date.now();
      state.originalText = state.outputText;
      state.routerSavedText = state.outputText;
      state.lastConfigCheckText = state.outputText;
      state.lastConfigCheckOk = true;
      parseAndRender();
      await loadBackups();
      await loadProviderStatuses({ silent: true });
      await loadNodeInventory({ silent: true });
      showMessage('Конфиг сохранен, но Mihomo не подтвердил применение. Проверьте состояние сервиса перед следующим изменением.', {
        severity: 'warning',
        details: result.reload?.message || error?.message || String(error),
      });
      return;
    }
    if (result.rolledBack) {
      state.routerConfigRevision = String(result.revision || state.routerConfigRevision);
      await loadBackups();
      showMessage('Mihomo не применил конфиг. Предыдущая версия восстановлена, локальные изменения оставлены для повторной попытки.', {
        severity: 'warning',
        details: result.reload?.message || error?.message || String(error),
      });
      focusReviewSummary();
      return;
    }
    showMessage('Не удалось сохранить конфиг.', { severity: 'error', details: error?.message || String(error) });
    focusReviewSummary();
  } finally {
    setRouterBusy(false, 'Перезагрузить с роутера');
  }
}

async function restoreSelectedBackup() {
  const name = state.selectedBackupName;
  if (!name) return;
  setBackupRestoreBusy(true);
  setBackupHistoryStatus('Проверяем выбранную версию и восстанавливаем конфигурацию…');
  setRouterBusy(true, 'Восстановление...');

  try {
    const data = await apiJson('/api/backups/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        expectedRevision: state.routerConfigRevision || undefined,
      }),
    });
    await loadRouterConfig({ silent: true });
    els.backupHistoryDialog.close();
    showMessage(data.reload?.ok ? 'Версия восстановлена, Mihomo перезагружен.' : 'Версия восстановлена, но Mihomo не удалось перезагрузить.', {
      severity: data.reload?.ok ? 'success' : 'warning',
    });
  } catch (error) {
    const result = error?.data || {};
    if (result.stage === 'conflict') {
      setBackupHistoryStatus('Конфиг на роутере изменился. Закройте историю и перезагрузите конфиг с роутера.', 'error');
      return;
    }
    if (result.restored && result.uncertain) {
      await loadRouterConfig({ silent: true });
      els.backupHistoryDialog.close();
      showMessage('Версия записана, но Mihomo не подтвердил применение.', {
        severity: 'warning',
        details: result.reload?.message || error?.message || String(error),
      });
      return;
    }
    if (result.rolledBack) {
      state.routerConfigRevision = String(result.revision || state.routerConfigRevision);
      await loadBackups();
      setBackupHistoryStatus('Mihomo не применил версию. Текущий конфиг восстановлен.', 'error');
      return;
    }
    setBackupHistoryStatus(`Не удалось восстановить версию: ${error?.message || error}`, 'error');
  } finally {
    setRouterBusy(false, 'Перезагрузить с роутера');
    setBackupRestoreBusy(false);
  }
}

function openBackupHistoryDialog() {
  els.fileTools.removeAttribute('open');
  state.selectedBackupName = '';
  renderBackupHistoryList();
  setBackupHistoryStatus('');
  els.backupUnsavedWarning.hidden = !hasUnsavedRouterChanges();
  els.backupHistoryDialog.showModal();
}

function handleBackupSelection(event) {
  const target = event.target;
  if (target?.name !== 'backupHistoryVersion') return;
  state.selectedBackupName = String(target.value || '');
  syncBackupSelection();
}

function syncBackupSelection() {
  els.backupHistoryList.querySelectorAll('.backup-history-item').forEach((item) => {
    const selected = item.dataset.backupName === state.selectedBackupName;
    item.classList.toggle('is-selected', selected);
    const input = item.querySelector('input');
    if (input) input.checked = selected;
  });
  els.restoreBackupButton.disabled = state.routerBusy || !state.selectedBackupName;
}

function setBackupRestoreBusy(isBusy) {
  els.backupHistoryList.setAttribute('aria-busy', String(isBusy));
  els.backupHistoryList.querySelectorAll('input').forEach((input) => {
    input.disabled = isBusy;
  });
  els.backupHistoryDialog.querySelectorAll('[value="cancel"]').forEach((button) => {
    button.disabled = isBusy;
  });
  const label = els.restoreBackupButton.querySelector('span');
  if (label) label.textContent = isBusy ? 'Восстановление…' : 'Восстановить эту версию';
  els.restoreBackupButton.disabled = isBusy || !state.selectedBackupName;
}

function setBackupHistoryStatus(text, severity = '') {
  els.backupHistoryStatus.textContent = text;
  els.backupHistoryStatus.hidden = !text;
  els.backupHistoryStatus.className = `backup-history-status${severity ? ` is-${severity}` : ''}`;
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
  const saveState = getRouterSaveState();
  els.backupHistoryButton.hidden = window.location?.protocol === 'file:';
  els.backupHistoryButton.disabled = !state.routerApiAvailable || state.routerBusy;
  els.routerSaveButton.disabled = saveState.disabled;
  els.routerSaveButton.classList.toggle('primary', saveState.tone === 'primary');
  els.routerSaveButton.classList.toggle('danger', saveState.tone === 'danger');
  els.routerSaveButton.classList.toggle('is-attention', saveState.tone === 'primary');
  els.routerSaveButton.setAttribute('aria-busy', String(state.routerBusy || state.kernelCheckBusy));
  const saveLabel = els.routerSaveButton.querySelector('span');
  if (saveLabel) saveLabel.textContent = saveState.label;
  els.providerStatusRefreshButton.disabled = !state.routerApiAvailable || state.providerStatusLoading || !hasActiveProviders;
  els.providerStatusRefreshButton.title = state.routerApiAvailable
    ? 'Получить статусы подписок из Mihomo API'
    : 'Доступно только в MihUI на роутере рядом с Mihomo';
  const statusLabel = els.providerStatusRefreshButton.querySelector('span');
  if (statusLabel) statusLabel.textContent = state.providerStatusLoading ? 'Обновляем...' : 'Обновить статусы';
  renderMobileFlowActions();
}

function getRouterSaveState() {
  if (!state.routerMode) {
    if (!state.outputText) return { disabled: true, label: 'Нет конфигурации' };
    if (!state.hasGroupsSection) return { disabled: true, label: 'Исправьте структуру' };
    return {
      disabled: state.routerBusy || state.isEditingConfiguration,
      label: state.isEditingConfiguration ? 'Завершите редактирование' : 'Перейти к проверке',
    };
  }

  const hasUnsavedChanges = hasUnsavedRouterChanges();
  if (state.isEditingConfiguration) return { disabled: true, label: 'Завершите редактирование' };
  if (!state.outputText) return { disabled: true, label: 'Нет конфигурации' };
  if (!hasUnsavedChanges) return { disabled: true, label: 'Нет изменений' };
  if (state.kernelCheckBusy) return { disabled: true, label: 'Проверка...' };
  if (state.routerBusy) return { disabled: true, label: 'Сохранение...' };
  if (hasBlockingLocalErrors()) return { disabled: false, label: 'Исправить ошибки', tone: 'danger' };
  return {
    disabled: false,
    label: isCurrentConfigKernelChecked() ? 'Сохранить и применить' : 'Проверить и сохранить',
    tone: 'primary',
  };
}

function hasUnsavedRouterChanges() {
  const savedText = state.routerMode ? state.routerSavedText : state.originalText;
  return Boolean(state.outputText && savedText && state.outputText !== savedText);
}

function hasUnsavedWorkspaceChanges() {
  const rawDraftChanged = state.isEditingConfiguration
    && String(els.outputPreview?.value || '') !== String(state.outputText || '');
  return hasUnsavedRouterChanges() || rawDraftChanged;
}

function handleBeforeUnload(event) {
  if (!hasUnsavedWorkspaceChanges()) return;
  event.preventDefault();
  event.returnValue = '';
}

function getHighRiskSaveSummaries() {
  const summaries = [];
  const deletedProviders = state.providers.filter((provider) => provider.deleted).map((provider) => provider.name);
  if (deletedProviders.length > 0) {
    summaries.push(`Удаляются подписки: ${deletedProviders.join(', ')}.`);
  }

  const ruleChanges = collectRuleChanges();
  if (ruleChanges.length > 0) {
    summaries.push(`Изменены правила маршрутизации (${ruleChanges.length}).`);
  }

  const originalMain = state.originalGroups.find((group) => normalizeLookupName(group.name) === 'proxy');
  const currentMain = state.groups.find((group) => normalizeLookupName(group.originalName || group.name) === 'proxy');
  if (originalMain && (!currentMain || !groupSnapshotsAreEqual(snapshotGroup(currentMain), originalMain))) {
    summaries.push('Изменена основная группа PROXY.');
  }

  return summaries;
}

function groupSnapshotsAreEqual(left, right) {
  return left.name === right.name
    && left.type === right.type
    && left.proxies.join('\n') === right.proxies.join('\n')
    && left.use.join('\n') === right.use.join('\n');
}

function confirmHighRiskSave() {
  const summaries = getHighRiskSaveSummaries();
  if (summaries.length === 0) return true;
  const details = summaries.map((summary) => `• ${summary}`).join('\n');
  return window.confirm(`Применить рискованные изменения?\n\n${details}\n\nMihomo проверит YAML, но не может проверить намерение пользователя.`);
}

function isCurrentConfigKernelChecked() {
  return Boolean(state.lastConfigCheckText === state.outputText && state.lastConfigCheckOk);
}

function hasBlockingLocalErrors() {
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  return collectDiagnostics(activeProviders).some((text) => getDiagnosticSeverity(text) === 'error');
}

async function handleTopbarSaveAction() {
  const action = getRouterSaveState();
  if (action.disabled) return;
  if (!state.routerMode || action.tone === 'danger') {
    if (action.tone === 'danger') {
      showMessage('Сначала исправьте ошибки структуры и связей.', { severity: 'error' });
    }
    focusReviewSummary();
    return;
  }
  await saveRouterConfig();
}

function getReviewPrimaryActionState() {
  if (state.isEditingConfiguration) return { disabled: true, label: 'Завершите редактирование' };
  if (!state.outputText) return { disabled: true, label: 'Нет конфигурации' };
  if (!state.hasGroupsSection) return { disabled: true, label: 'Исправьте структуру' };
  if (!state.routerApiAvailable) return { disabled: true, label: 'Проверка недоступна' };
  if (state.routerBusy) return { disabled: true, label: 'Сохранение...' };
  if (state.kernelCheckBusy) return { disabled: true, label: 'Проверка...' };
  if (isCurrentConfigKernelChecked()) {
    return { disabled: false, label: 'Проверка пройдена · Проверить повторно', tone: 'success' };
  }
  if (state.lastConfigCheckText === state.outputText) {
    return { disabled: false, label: 'Проверка не пройдена · Проверить повторно', tone: 'danger' };
  }
  return { disabled: false, label: 'Проверить YAML в Mihomo' };
}

function renderReviewPrimaryActionButton() {
  const action = getReviewPrimaryActionState();
  els.checkConfigButton.disabled = action.disabled;
  els.checkConfigButton.title = action.label;
  els.checkConfigButton.classList.toggle('is-ok', action.tone === 'success');
  els.checkConfigButton.classList.toggle('danger', action.tone === 'danger');
  const label = els.checkConfigButton.querySelector('.button-label');
  if (label) label.textContent = action.label;
}

function renderBackups(backups) {
  state.backups = backups;
  if (!backups.some((backup) => backup.name === state.selectedBackupName)) state.selectedBackupName = '';
  renderBackupHistoryList();
}

function renderBackupHistoryList() {
  els.backupHistoryList.textContent = '';
  els.backupHistoryEmpty.hidden = state.backups.length > 0;

  state.backups.forEach((backup, index) => {
    const item = document.createElement('label');
    const input = document.createElement('input');
    const copy = document.createElement('span');
    const heading = document.createElement('span');
    const title = document.createElement('strong');
    const details = document.createElement('span');

    item.className = 'backup-history-item';
    item.dataset.backupName = backup.name;
    input.type = 'radio';
    input.name = 'backupHistoryVersion';
    input.value = backup.name;
    copy.className = 'backup-history-item-copy';
    heading.className = 'backup-history-item-heading';
    title.textContent = formatBackupVersionTitle(backup);
    details.className = 'backup-history-item-meta';
    details.textContent = [backup.name, formatBackupSize(backup.size)].filter(Boolean).join(' · ');
    heading.append(title);

    if (index === 0) {
      const latest = document.createElement('span');
      latest.className = 'backup-history-latest';
      latest.textContent = 'Последняя';
      heading.append(latest);
    }

    copy.append(heading, details);
    item.append(input, copy);
    els.backupHistoryList.append(item);
  });

  syncBackupSelection();
}

function formatBackupVersionTitle(backup) {
  const parsed = parseBackupName(backup.name);
  if (parsed) return `${parsed.date} · ${parsed.time}`;

  const mtime = formatBackupMtime(backup.mtime);
  return mtime || backup.name;
}

function parseBackupName(name) {
  const match = String(name || '').match(/^(.+)-(\d{8})-(\d{6})(?:-(\d+))?\.ya?ml$/i);
  if (!match) return null;
  const [, prefix, dateRaw, timeRaw, suffix = ''] = match;
  return {
    prefix,
    date: `${dateRaw.slice(6, 8)}.${dateRaw.slice(4, 6)}.${dateRaw.slice(0, 4)}`,
    time: `${timeRaw.slice(0, 2)}:${timeRaw.slice(2, 4)}:${timeRaw.slice(4, 6)}`,
    suffix,
  };
}

function formatBackupMtime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatBackupSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
  if (size >= 1024) return `${Math.ceil(size / 1024)} КБ`;
  return `${size} Б`;
}

function renderUiLinks(items) {
  els.uiLinks.textContent = '';
  if (!items.length) return;

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const menu = document.createElement('div');
  const menuTitle = document.createElement('strong');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const iconUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');

  details.className = 'ui-links-details';
  summary.setAttribute('aria-label', 'Открыть список интерфейсов');
  summary.title = 'Другие интерфейсы';
  icon.classList.add('ui-switcher-icon');
  icon.setAttribute('aria-hidden', 'true');
  iconUse.setAttribute('href', '#icon-chevron-down');
  icon.append(iconUse);
  summary.append(icon);
  menu.className = 'ui-links-menu';
  menuTitle.className = 'ui-links-menu-title';
  menuTitle.textContent = 'Интерфейсы';
  menu.append(menuTitle);

  items.forEach((item) => {
    const group = document.createElement('span');
    const identity = document.createElement('span');
    const isCurrent = item.name === 'MihUI';
    group.className = 'ui-link-item';
    identity.className = 'ui-link-identity';
    group.classList.toggle('is-current', isCurrent);

    if (item.localUrl) {
      const localLink = document.createElement('a');
      localLink.href = item.localUrl;
      localLink.className = 'ui-link-main';
      localLink.textContent = item.name;
      if (isCurrent) localLink.setAttribute('aria-current', 'page');
      identity.append(localLink);
    } else {
      const name = document.createElement('span');
      name.className = 'ui-link-main';
      name.textContent = item.name;
      identity.append(name);
    }

    if (isCurrent) {
      const current = document.createElement('span');
      current.className = 'ui-link-current';
      current.textContent = 'Текущий';
      identity.append(current);
    }

    group.append(identity);

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
  renderReviewPrimaryActionButton();
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
    const error = new Error(data.message || `HTTP ${response.status}`);
    error.data = data;
    error.status = response.status;
    throw error;
  }
  return data;
}

function getChangedXkeenNetworkFileKeys() {
  return XKEEN_NETWORK_FILE_KEYS.filter((key) => String(state.xkeenFiles.files[key] ?? '') !== String(state.xkeenFiles.originals[key] ?? ''));
}

function getActiveXkeenNetworkFileLines(key) {
  return String(state.xkeenFiles.files[key] || '')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trimStart().startsWith('#'));
}

function formatXkeenEntryCount(count) {
  const value = Number(count) || 0;
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value} запись`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${value} записи`;
  return `${value} записей`;
}

function handleXkeenNetworkFileInput(event) {
  const key = event.currentTarget.dataset.xkeenFile;
  if (!XKEEN_NETWORK_FILE_KEYS.includes(key)) return;
  state.xkeenFiles.files[key] = event.currentTarget.value;
  state.xkeenFiles.errors = state.xkeenFiles.errors.filter((error) => error.file !== key);
  renderXkeenNetworkFiles();
}

function renderXkeenNetworkFiles() {
  const editorState = state.xkeenFiles;
  const changedKeys = getChangedXkeenNetworkFileKeys();
  const componentBusy = state.components.job.running;
  const restartBusy = componentBusy
    && state.components.job.component === 'xkeen'
    && state.components.job.action === 'restart';
  const disabled = !editorState.loaded || !editorState.available || editorState.loading || editorState.saving;
  const errorsByFile = new Map();
  editorState.errors.forEach((error) => {
    const items = errorsByFile.get(error.file) || [];
    items.push(error);
    errorsByFile.set(error.file, items);
  });

  els.xkeenFilesDirectory.textContent = editorState.directory || '/opt/etc/xkeen';
  els.xkeenFileEditors.forEach((editor) => {
    const key = editor.dataset.xkeenFile;
    const value = String(editorState.files[key] ?? '');
    if (editor.value !== value) editor.value = value;
    editor.disabled = disabled;
    editor.classList.toggle('is-invalid', errorsByFile.has(key));
  });
  els.xkeenFileCards.forEach((card) => {
    const key = card.dataset.xkeenFileCard;
    card.classList.toggle('is-changed', changedKeys.includes(key));
    card.classList.toggle('has-error', errorsByFile.has(key));
  });
  els.xkeenFileCounts.forEach((element) => {
    const key = element.dataset.xkeenFileCount;
    element.textContent = key === 'xkeenConfig' ? 'JSONC' : formatXkeenEntryCount(getActiveXkeenNetworkFileLines(key).length);
  });
  els.xkeenFilePaths.forEach((element) => {
    const key = element.dataset.xkeenFilePath;
    element.textContent = editorState.paths[key] || element.textContent;
    element.title = editorState.paths[key] || '';
  });
  els.xkeenFileErrors.forEach((element) => {
    const items = errorsByFile.get(element.dataset.xkeenFileError) || [];
    element.hidden = items.length === 0;
    if (items.length) {
      const first = items[0];
      element.textContent = `${first.line ? `Строка ${first.line}: ` : ''}${first.message}${items.length > 1 ? ` · ещё ${items.length - 1}` : ''}`;
    } else {
      element.textContent = '';
    }
  });

  const hasPortConflict = getActiveXkeenNetworkFileLines('portProxying').length > 0
    && getActiveXkeenNetworkFileLines('portExclude').length > 0;
  const hasErrors = editorState.errors.length > 0;
  els.xkeenFilesNotice.hidden = !hasPortConflict && !hasErrors;
  els.xkeenFilesNotice.classList.toggle('is-error', hasErrors);
  if (hasErrors) {
    els.xkeenFilesNotice.textContent = 'Исправьте отмеченные ошибки: файлы не были сохранены.';
  } else if (hasPortConflict) {
    els.xkeenFilesNotice.textContent = 'Порты проксирования имеют приоритет: список исключений не будет применён.';
  }

  const canRequest = typeof fetch === 'function' && window.location?.protocol !== 'file:';
  els.xkeenRestartButton.disabled = disabled || componentBusy || !canRequest;
  els.xkeenRestartButton.setAttribute('aria-busy', String(restartBusy));
  els.xkeenRestartButton.querySelector('span').textContent = restartBusy ? 'Перезапускаем...' : 'Перезапустить XKeen';
  els.xkeenFilesRefreshButton.hidden = !editorState.loaded || !editorState.available;
  els.xkeenFilesRefreshButton.disabled = editorState.loading || editorState.saving || componentBusy || !canRequest;
  els.xkeenRestartAfterSave.disabled = disabled || changedKeys.length === 0;
  els.xkeenFilesSaveButton.disabled = disabled || changedKeys.length === 0 || hasErrors;
  els.xkeenFilesSaveButton.classList.toggle('is-loading', editorState.saving);
  els.xkeenFilesSaveButton.querySelector('span').textContent = editorState.saving
    ? 'Сохранение...'
    : els.xkeenRestartAfterSave.checked
      ? 'Сохранить и применить'
      : 'Сохранить';
  els.xkeenFilesChangeStatus.textContent = changedKeys.length ? `Изменено файлов: ${changedKeys.length}` : 'Изменений нет';
  if (restartBusy) {
    els.xkeenFilesStatus.textContent = 'XKeen и активное прокси-ядро перезапускаются...';
  } else if (editorState.loading) {
    els.xkeenFilesStatus.textContent = 'Загрузка файлов с роутера...';
  } else if (editorState.saving) {
    els.xkeenFilesStatus.textContent = els.xkeenRestartAfterSave.checked ? 'Сохранение и перезапуск XKeen...' : 'Сохранение файлов...';
  } else if (!editorState.loaded) {
    els.xkeenFilesStatus.textContent = 'Доступно только в MihUI на роутере';
  } else if (!editorState.available) {
    els.xkeenFilesStatus.textContent = 'XKeen не найден — редактирование недоступно';
  } else if (changedKeys.length) {
    els.xkeenFilesStatus.textContent = 'Все изменённые файлы будут сохранены одной операцией';
  } else {
    els.xkeenFilesStatus.textContent = 'Файлы загружены с роутера';
  }
}

async function loadXkeenNetworkFiles(options = {}) {
  if (typeof fetch !== 'function' || window.location?.protocol === 'file:') {
    renderXkeenNetworkFiles();
    return;
  }
  state.xkeenFiles.loading = true;
  renderXkeenNetworkFiles();
  try {
    const data = await apiJson('/api/xkeen/network-files');
    const files = {};
    const paths = {};
    XKEEN_NETWORK_FILE_KEYS.forEach((key) => {
      files[key] = String(data.files?.[key]?.text ?? '');
      paths[key] = String(data.files?.[key]?.path || data.files?.[key]?.name || '');
    });
    state.xkeenFiles.loaded = true;
    state.xkeenFiles.available = Boolean(data.available);
    state.xkeenFiles.directory = String(data.directory || '/opt/etc/xkeen');
    state.xkeenFiles.files = files;
    state.xkeenFiles.originals = { ...files };
    state.xkeenFiles.paths = paths;
    state.xkeenFiles.errors = Array.isArray(data.validation?.errors) ? data.validation.errors : [];
  } catch (error) {
    state.xkeenFiles.loaded = false;
    state.xkeenFiles.available = false;
    if (!options.silent) showMessage(`Не удалось загрузить файлы XKeen: ${error?.message || error}`, { severity: 'error' });
  } finally {
    state.xkeenFiles.loading = false;
    renderXkeenNetworkFiles();
  }
}

async function reloadXkeenNetworkFiles() {
  if (getChangedXkeenNetworkFileKeys().length > 0) {
    const confirmed = window.confirm('Несохранённые изменения файлов XKeen будут потеряны. Продолжить?');
    if (!confirmed) return;
  }
  await loadXkeenNetworkFiles({ silent: false });
}

async function restartXkeenFromFiles() {
  if (state.components.job.running || !state.xkeenFiles.available) return;
  const hasUnsavedChanges = getChangedXkeenNetworkFileKeys().length > 0;
  const warning = hasUnsavedChanges
    ? 'Есть несохранённые изменения. Они останутся в редакторе, но перезапуск применит только файлы, уже сохранённые на роутере. Продолжить?'
    : 'Перезапустить XKeen и активное прокси-ядро? Соединения могут кратковременно прерваться.';
  if (!window.confirm(warning)) return;
  const started = await startComponentAction({ component: 'xkeen', action: 'restart' });
  state.xkeenFiles.restartRequested = started;
  renderXkeenNetworkFiles();
}

async function saveXkeenNetworkFiles() {
  const changedKeys = getChangedXkeenNetworkFileKeys();
  if (!changedKeys.length || state.xkeenFiles.saving) return;
  const files = Object.fromEntries(changedKeys.map((key) => [key, state.xkeenFiles.files[key]]));
  state.xkeenFiles.saving = true;
  state.xkeenFiles.errors = [];
  renderXkeenNetworkFiles();
  try {
    const data = await apiJson('/api/xkeen/network-files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mihui-Action': 'xkeen-network-files',
      },
      body: JSON.stringify({ files, restart: els.xkeenRestartAfterSave.checked }),
    });
    changedKeys.forEach((key) => {
      state.xkeenFiles.originals[key] = state.xkeenFiles.files[key];
    });
    showMessage(data.restarted ? 'Файлы сохранены, XKeen перезапущен.' : 'Файлы сохранены. Изменения применятся при следующем запуске XKeen.', { severity: 'success' });
    if (data.restarted) await loadServiceHealth({ silent: true });
  } catch (error) {
    state.xkeenFiles.errors = Array.isArray(error?.data?.errors) ? error.data.errors : [];
    showMessage(`Не удалось сохранить файлы XKeen: ${error?.message || error}`, { severity: 'error' });
  } finally {
    state.xkeenFiles.saving = false;
    renderXkeenNetworkFiles();
  }
}

async function loadServiceHealth(options = {}) {
  if (typeof fetch !== 'function' || window.location?.protocol === 'file:') {
    renderServiceHealth();
    return;
  }

  state.serviceHealth.loading = true;
  renderServiceHealth();
  try {
    const data = await apiJson('/api/services/status');
    state.serviceHealth.services = {
      xkeen: normalizeServiceStatus(data.services?.xkeen),
      mihomo: normalizeServiceStatus(data.services?.mihomo),
    };
    state.serviceHealth.checkedAt = Number(data.checkedAt) || Math.floor(Date.now() / 1000);
  } catch (error) {
    const detail = error?.message || String(error);
    if (!state.serviceHealth.checkedAt) {
      state.serviceHealth.services = {
        xkeen: { state: 'unavailable', message: 'Статус недоступен', detail },
        mihomo: { state: 'unavailable', message: 'Статус недоступен', detail },
      };
      state.serviceHealth.checkedAt = Math.floor(Date.now() / 1000);
    }
    if (!options.silent) showMessage('Не удалось обновить статусы сервисов.', { severity: 'warning', details: detail });
  } finally {
    state.serviceHealth.loading = false;
    renderServiceHealth();
  }
}

function normalizeServiceStatus(service) {
  const stateValue = ['ok', 'error', 'unavailable'].includes(service?.state) ? service.state : 'unavailable';
  return {
    state: stateValue,
    message: String(service?.message || ''),
    detail: String(service?.detail || ''),
  };
}

function formatServiceStatusLabel(service, loading = false) {
  if (loading) return 'Проверка...';
  if (service?.state === 'ok') return 'Работает';
  if (service?.state === 'error') return 'Ошибка';
  return 'Не найден';
}

function renderServiceHealth() {
  const { loading, checkedAt, services } = state.serviceHealth;
  const initialLoading = loading && !checkedAt;
  els.serviceHealthItems.forEach((item) => {
    const serviceName = item.dataset.serviceHealth;
    const service = services[serviceName] || normalizeServiceStatus(null);
    const componentBusy = state.components.job.running && state.components.job.component === serviceName;
    item.classList.remove('is-loading', 'is-refreshing', 'is-ok', 'is-error', 'is-unavailable');
    item.classList.add(initialLoading || componentBusy ? 'is-loading' : `is-${service.state}`);
    item.classList.toggle('is-refreshing', loading && !initialLoading && !componentBusy);
    const status = item.querySelector('.service-health-status');
    if (status) {
      status.textContent = componentBusy
        ? state.components.job.action === 'restart' ? 'Перезапуск...' : 'Обновление...'
        : formatServiceStatusLabel(service, initialLoading);
    }
    const updateMarker = item.querySelector('[data-service-update-marker]');
    if (updateMarker) updateMarker.hidden = !state.components.items[serviceName]?.updateAvailable;
    const details = [service.message, service.detail].filter(Boolean).join(' · ');
    item.title = details;
  });

  const updateCount = Number(state.components.updateCount) || 0;
  const checkedLabel = loading
    ? checkedAt ? 'Обновляем...' : 'Проверка...'
    : checkedAt
      ? `Проверено ${formatServiceHealthTime(checkedAt)}`
      : 'Нажмите для проверки';
  els.serviceHealthChecked.forEach((element) => {
    element.textContent = checkedLabel;
    element.hidden = updateCount > 0;
  });
  els.serviceUpdateBadges.forEach((element) => {
    element.hidden = updateCount === 0;
    element.textContent = `Обновления · ${updateCount}`;
  });
  els.componentOpenButtons.forEach((button) => {
    button.setAttribute('aria-busy', String(loading || state.components.loading));
    button.classList.toggle('has-updates', updateCount > 0);
  });
  renderOverviewHealth();
}

function formatServiceHealthTime(value) {
  const date = new Date(Number(value) * 1000);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function startServiceHealthPolling() {
  if (typeof window.setInterval !== 'function') return;
  window.setInterval(() => {
    if (!document.hidden) loadServiceHealth({ silent: true });
  }, SERVICE_HEALTH_REFRESH_MS);
  if (typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadServiceHealth({ silent: true });
    });
  }
}

function normalizeComponentItem(item) {
  return {
    installed: Boolean(item?.installed),
    current: String(item?.current || ''),
    channel: String(item?.channel || ''),
    latest: String(item?.latest || ''),
    buildTimestamp: String(item?.buildTimestamp || ''),
    latestBuildTimestamp: String(item?.latestBuildTimestamp || ''),
    versions: Array.isArray(item?.versions) ? item.versions.map((value) => String(value || '')).filter(Boolean) : [],
    updateAvailable: Boolean(item?.updateAvailable),
    error: String(item?.error || ''),
  };
}

function normalizeXkeenChannel(value) {
  const channel = String(value || '').trim().toLowerCase();
  if (channel === 'stable') return 'stable';
  if (channel === 'beta' || channel === 'dev') return 'beta';
  return '';
}

function normalizeComponentJob(job) {
  return {
    running: Boolean(job?.running),
    ok: job?.ok === true ? true : job?.ok === false ? false : null,
    component: String(job?.component || ''),
    action: String(job?.action || ''),
    target: String(job?.target || ''),
    phase: String(job?.phase || 'idle'),
    message: String(job?.message || ''),
    output: String(job?.output || ''),
  };
}

async function loadComponents(options = {}) {
  if (typeof fetch !== 'function' || window.location?.protocol === 'file:') {
    renderComponentManager();
    return;
  }

  state.components.loading = true;
  renderComponentManager();
  renderServiceHealth();
  try {
    const suffix = options.force ? '?force=1' : '';
    const data = await apiJson(`/api/components/status${suffix}`);
    state.components.loaded = true;
    state.components.checkedAt = Number(data.checkedAt) || Math.floor(Date.now() / 1000);
    state.components.items = {
      xkeen: normalizeComponentItem(data.components?.xkeen),
      mihomo: normalizeComponentItem(data.components?.mihomo),
    };
    const xkeenChannel = normalizeXkeenChannel(state.components.items.xkeen.channel);
    if (!state.components.xkeenChannelSelection || state.components.xkeenChannelCurrent !== xkeenChannel) {
      state.components.xkeenChannelSelection = xkeenChannel;
    }
    state.components.xkeenChannelCurrent = xkeenChannel;
    state.components.updateCount = Number(data.updateCount) || 0;
    state.components.job = normalizeComponentJob(data.job);
    if (state.components.job.running) state.components.jobVisible = true;
    if (state.components.job.running) pollComponentJob();
  } catch (error) {
    if (!options.silent) showMessage('Не удалось проверить версии компонентов.', { severity: 'warning', details: error?.message || String(error) });
  } finally {
    state.components.loading = false;
    renderComponentManager();
    renderServiceHealth();
    render();
  }
}

function openComponentManager() {
  state.components.view = 'updates';
  document.body.classList.add('component-manager-open');
  if (typeof els.componentManagerDialog.showModal === 'function') els.componentManagerDialog.showModal();
  else els.componentManagerDialog.setAttribute('open', '');
  renderComponentManager();
  loadServiceHealth({ silent: true });
  if (!state.components.loaded) loadComponents({ silent: true });
}

function closeComponentManager() {
  if (typeof els.componentManagerDialog.close === 'function') els.componentManagerDialog.close();
  else els.componentManagerDialog.removeAttribute('open');
  document.body.classList.remove('component-manager-open');
}

function handleComponentManagerClosed() {
  document.body.classList.remove('component-manager-open');
  if (!state.components.job.running) dismissComponentJob();
}

function dismissComponentJob() {
  if (state.components.job.running) return;
  state.components.jobVisible = false;
  els.componentJobDetails.open = false;
  renderComponentJob();
}

function setComponentManagerView(view) {
  state.components.view = view === 'maintenance' ? 'maintenance' : 'updates';
  renderComponentManager();
  const body = els.componentManagerDialog.querySelector('.component-manager-body');
  if (body) body.scrollTop = 0;
}

function openComponentMaintenance() {
  setComponentManagerView('maintenance');
}

function openComponentUpdates() {
  setComponentManagerView('updates');
}

async function checkComponentVersions() {
  await Promise.all([
    loadServiceHealth({ silent: true }),
    loadComponents({ force: true, silent: false }),
  ]);
}

function formatComponentVersion(value) {
  const version = String(value || '').trim();
  if (!version) return '—';
  return version.startsWith('v') ? version : `v${version}`;
}

function formatXkeenBuildTimestamp(value) {
  const match = String(value || '').match(/^(20\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):\d{2}\s+MSK$/i);
  return match ? `${match[3]}.${match[2]}.${match[1]}, ${match[4]}:${match[5]}` : '';
}

function formatXkeenBuild(version, timestamp) {
  const date = formatXkeenBuildTimestamp(timestamp);
  return date ? `${formatComponentVersion(version)} · ${date}` : formatComponentVersion(version);
}

function componentVersionKey(value) {
  const match = String(value || '').match(/v?(\d+(?:\.\d+){1,3})/i);
  if (!match) return [];
  const parts = match[1].split('.').map(Number);
  while (parts.length < 4) parts.push(0);
  return parts;
}

function compareComponentVersions(left, right) {
  const a = componentVersionKey(left);
  const b = componentVersionKey(right);
  if (!a.length || !b.length) return 0;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) > (b[index] || 0) ? 1 : -1;
  }
  return 0;
}

function getComponentServiceState(name) {
  return state.serviceHealth.services?.[name] || normalizeServiceStatus(null);
}

function renderComponentManager() {
  const busy = state.components.loading || state.components.job.running;
  const updateCount = Number(state.components.updateCount) || 0;
  const errors = Object.values(state.components.items).filter((item) => item.error).length;
  const xkeen = state.components.items.xkeen || normalizeComponentItem(null);
  const xkeenChannel = normalizeXkeenChannel(xkeen.channel);
  const maintenanceView = state.components.view === 'maintenance';

  els.componentManagerTitle.textContent = maintenanceView ? 'Сервисные действия' : 'Сервисы и версии';
  els.componentManagerDescription.textContent = maintenanceView
    ? 'Перезапуск компонентов и ручное обновление геоданных.'
    : 'Проверка и обновление компонентов.';
  els.componentUpdatesViews.forEach((element) => { element.hidden = maintenanceView; });
  els.componentMaintenance.hidden = !maintenanceView;
  els.openComponentMaintenanceButton.hidden = maintenanceView;
  els.backToComponentUpdatesButton.hidden = !maintenanceView;
  els.componentUpdateFooter.hidden = maintenanceView;
  els.openComponentMaintenanceButton.disabled = busy;

  if (state.components.loading) {
    els.componentManagerNotice.textContent = 'Проверяем версии...';
  } else if (!state.components.loaded) {
    els.componentManagerNotice.textContent = 'Проверка версий доступна в MihUI на роутере.';
  } else if (updateCount > 0) {
    els.componentManagerNotice.textContent = `Доступно обновлений: ${updateCount}.`;
  } else if (errors > 0) {
    els.componentManagerNotice.textContent = 'Установленные версии получены, но GitHub не ответил на проверку обновлений.';
  } else {
    els.componentManagerNotice.textContent = 'Установлены актуальные версии.';
  }

  els.componentCards.forEach((card) => {
    const name = card.dataset.componentCard;
    const item = state.components.items[name] || normalizeComponentItem(null);
    card.classList.toggle('is-update-available', item.updateAvailable);
  });
  els.componentStates.forEach((element) => {
    const name = element.dataset.componentState;
    const item = state.components.items[name] || normalizeComponentItem(null);
    const service = getComponentServiceState(name);
    element.className = 'component-manager-state';
    if (!item.installed) {
      element.textContent = 'Не найден';
      element.classList.add('is-error');
    } else if (item.updateAvailable) {
      element.textContent = 'Есть обновление';
      element.classList.add('is-update');
    } else if (service.state === 'error') {
      element.textContent = 'Ошибка запуска';
      element.classList.add('is-error');
    } else if (item.error || !item.latest) {
      element.textContent = 'Проверка недоступна';
      element.classList.add('is-error');
    } else if (name === 'xkeen' && xkeenChannel === 'beta') {
      element.textContent = service.state === 'ok' ? 'Работает · Beta' : 'Канал Beta';
      if (service.state === 'ok') element.classList.add('is-ok');
    } else {
      element.textContent = service.state === 'ok' ? 'Работает · актуально' : 'Актуально';
      element.classList.add('is-ok');
    }
  });
  els.componentCurrentVersions.forEach((element) => {
    const name = element.dataset.componentCurrent;
    const item = state.components.items[name] || normalizeComponentItem(null);
    element.textContent = name === 'xkeen' && xkeenChannel === 'beta'
      ? formatXkeenBuild(item.current, item.buildTimestamp)
      : formatComponentVersion(item.current);
  });
  els.componentLatestVersions.forEach((element) => {
    const name = element.dataset.componentLatest;
    const item = state.components.items[name] || normalizeComponentItem(null);
    element.textContent = name === 'xkeen' && xkeenChannel === 'beta'
      ? formatXkeenBuild(item.latest, item.latestBuildTimestamp)
      : formatComponentVersion(item.latest);
  });
  els.componentLatestLabels.forEach((element) => {
    element.textContent = element.dataset.componentLatestLabel === 'xkeen' && xkeenChannel === 'beta'
      ? 'Последняя сборка'
      : 'Доступна';
  });
  els.componentChannels.forEach((element) => {
    const item = state.components.items[element.dataset.componentChannel] || normalizeComponentItem(null);
    element.textContent = item.channel || '';
  });
  els.componentUpdateButtons.forEach((button) => {
    const name = button.dataset.componentUpdate;
    const item = state.components.items[name] || normalizeComponentItem(null);
    const betaUpdate = name === 'xkeen' && xkeenChannel === 'beta';
    button.disabled = busy || !item.installed || !item.updateAvailable;
    button.textContent = item.updateAvailable && betaUpdate
      ? 'Обновить сборку'
      : item.updateAvailable && item.latest
      ? `Обновить до ${formatComponentVersion(item.latest)}`
      : item.error || !item.latest
        ? 'Недоступно'
        : 'Актуально';
  });
  els.componentRollbackButtons.forEach((button) => {
    const item = state.components.items[button.dataset.componentRollback] || normalizeComponentItem(null);
    button.disabled = busy || !item.installed;
  });

  const selectedChannel = state.components.xkeenChannelSelection || xkeenChannel;
  els.xkeenChannelOptions.forEach((button) => {
    const selected = button.dataset.xkeenChannel === selectedChannel;
    button.setAttribute('aria-pressed', String(selected));
    button.disabled = busy || !xkeen.installed;
  });
  els.xkeenChannelApplyButton.disabled = busy || !xkeen.installed || !selectedChannel || selectedChannel === xkeenChannel;
  els.xkeenChannelApplyButton.textContent = selectedChannel && selectedChannel !== xkeenChannel
    ? `Переключить на ${selectedChannel === 'stable' ? 'Stable' : 'Beta'}`
    : 'Канал выбран';
  els.xkeenChannelHint.textContent = selectedChannel && selectedChannel !== xkeenChannel
    ? 'Будет создана копия, затем установлена версия выбранного канала'
    : xkeenChannel === 'beta'
      ? 'Beta — свежие сборки из разработки'
      : 'Stable — проверенные релизы XKeen';
  els.reinstallXkeenButton.disabled = busy || !xkeen.installed;
  els.reinstallXkeenButton.textContent = xkeenChannel === 'beta'
    ? 'Переустановить текущую Beta-сборку'
    : 'Переустановить XKeen';

  els.componentMaintenanceButtons.forEach((button) => {
    const item = state.components.items[button.dataset.maintenanceComponent] || normalizeComponentItem(null);
    button.disabled = busy || !item.installed;
  });

  const mihomo = state.components.items.mihomo;
  const selectedVersion = els.mihomoVersionSelect.value;
  els.mihomoVersionSelect.textContent = '';
  mihomo.versions.forEach((version) => {
    const option = document.createElement('option');
    option.value = version;
    option.textContent = `${formatComponentVersion(version)}${compareComponentVersions(version, mihomo.current) < 0 ? ' · понижение' : compareComponentVersions(version, mihomo.current) === 0 ? ' · текущая' : ''}`;
    els.mihomoVersionSelect.append(option);
  });
  if (mihomo.versions.includes(selectedVersion)) els.mihomoVersionSelect.value = selectedVersion;
  els.mihomoVersionSelect.disabled = busy || mihomo.versions.length === 0;
  els.installMihomoVersionButton.disabled = busy || !els.mihomoVersionSelect.value;
  els.checkComponentUpdatesButton.disabled = busy;
  els.checkComponentUpdatesButton.textContent = updateCount > 0
    ? `Обновить всё (${updateCount})`
    : state.components.loading
      ? 'Проверяем обновления...'
      : 'Проверить обновления';
  els.componentVersionsChecked.textContent = state.components.checkedAt
    ? `Проверено ${formatServiceHealthTime(state.components.checkedAt)}`
    : '';

  renderComponentJob();
}

function renderComponentJob() {
  const job = state.components.job;
  const visible = job.running || (state.components.jobVisible && job.ok !== null);
  els.componentJobPanel.hidden = !visible;
  if (!visible) return;
  els.componentJobPanel.classList.toggle('is-error', job.ok === false);
  els.dismissComponentJobButton.hidden = job.running;
  els.componentJobTitle.textContent = job.running
    ? getComponentActionLabel(job)
    : job.ok
      ? getComponentActionSuccessLabel(job)
      : 'Операция не выполнена';
  const message = job.ok === true && job.message === 'Операция завершена' ? '' : job.message;
  els.componentJobMessage.textContent = message || '';
  els.componentJobMessage.hidden = !message;
  els.componentJobOutput.textContent = job.output || '';
  els.componentJobDetails.hidden = !job.output;
}

function getComponentActionLabel(job) {
  if (job.component === 'all') return 'Обновление компонентов';
  const component = job.component === 'xkeen' ? 'XKeen' : 'Mihomo';
  if (job.action === 'restart') return `Перезапуск ${component}`;
  if (job.action === 'geo-update') return `Обновление GEO · ${component}`;
  if (job.action === 'channel') return `Переключение канала XKeen`;
  if (job.action === 'rollback') return 'Восстановление XKeen';
  return `Обновление ${component}`;
}

function getComponentActionSuccessLabel(job) {
  if (job.component === 'all') return 'Компоненты обновлены';
  const component = job.component === 'xkeen' ? 'XKeen' : 'Mihomo';
  if (job.action === 'restart') return `${component} перезапущен`;
  if (job.action === 'geo-update') return `Геоданные ${component} обновлены`;
  if (job.action === 'channel') return 'Канал XKeen переключён';
  if (job.action === 'rollback') return 'XKeen восстановлен';
  return `${component} обновлён`;
}

function getComponentUpdateSummary() {
  return Object.entries(state.components.items)
    .filter(([, item]) => item.updateAvailable)
    .map(([name, item]) => name === 'xkeen' && normalizeXkeenChannel(item.channel) === 'beta'
      ? `XKeen Beta → ${formatXkeenBuild(item.latest, item.latestBuildTimestamp)}`
      : `${name === 'xkeen' ? 'XKeen' : 'Mihomo'} ${formatComponentVersion(item.current)} → ${formatComponentVersion(item.latest)}`)
    .join(' · ');
}

async function updateComponent(component) {
  const item = state.components.items[component];
  if (!item?.updateAvailable) return;
  await startComponentAction({ component, action: 'update', target: component === 'mihomo' ? item.latest : '' });
}

async function handleComponentPrimaryAction() {
  if (state.components.updateCount > 0) {
    await updateAllComponents();
    return;
  }
  await checkComponentVersions();
}

async function updateAllComponents() {
  const count = Number(state.components.updateCount) || 0;
  if (!count || state.components.job.running) return;
  if (!window.confirm(`Обновить все доступные компоненты (${count})? Соединения могут кратковременно прерваться.`)) return;
  await startComponentAction({ component: 'all', action: 'update' });
}

async function reinstallXkeen() {
  const xkeen = state.components.items.xkeen;
  if (!xkeen?.installed || state.components.job.running) return;
  const label = normalizeXkeenChannel(xkeen.channel) === 'beta' ? 'текущую Beta-сборку' : 'текущую версию';
  if (!window.confirm(`Переустановить ${label} XKeen? Перед установкой будет создана резервная копия.`)) return;
  await startComponentAction({ component: 'xkeen', action: 'update' });
}

function selectXkeenChannel(channel) {
  if (!['stable', 'beta'].includes(channel)) return;
  state.components.xkeenChannelSelection = channel;
  renderComponentManager();
}

async function applyXkeenChannel() {
  const target = state.components.xkeenChannelSelection;
  const current = normalizeXkeenChannel(state.components.items.xkeen?.channel);
  if (!target || target === current) return;
  const label = target === 'stable' ? 'Stable' : 'Beta';
  const warning = target === 'beta'
    ? 'Переключить XKeen на Beta и установить последнюю тестовую сборку?'
    : 'Переключить XKeen на Stable и установить версию стабильного канала?';
  if (!window.confirm(warning)) return;
  await startComponentAction({ component: 'xkeen', action: 'channel', target });
  state.components.xkeenChannelSelection = target;
  els.xkeenChannelApplyButton.textContent = `Переключение на ${label}...`;
}

async function startMaintenanceAction(component, action) {
  if (!['xkeen', 'mihomo'].includes(component) || !['restart', 'geo-update'].includes(action)) return;
  if (action === 'restart') {
    const label = component === 'xkeen' ? 'XKeen и активное прокси-ядро' : 'ядро Mihomo';
    if (!window.confirm(`Перезапустить ${label}? Соединения могут кратковременно прерваться.`)) return;
  } else {
    const label = component === 'xkeen' ? 'XKeen' : 'Mihomo';
    if (!window.confirm(`Обновить геоданные ${label}?`)) return;
  }
  await startComponentAction({ component, action });
}

async function rollbackComponent(component) {
  if (component !== 'xkeen') return;
  if (!window.confirm('Восстановить последнюю резервную копию XKeen?')) return;
  await startComponentAction({ component, action: 'rollback' });
}

async function installSelectedMihomoVersion() {
  const target = els.mihomoVersionSelect.value;
  if (!target) return;
  const current = state.components.items.mihomo.current;
  if (compareComponentVersions(target, current) < 0) {
    if (!window.confirm(`Понизить Mihomo ${formatComponentVersion(current)} → ${formatComponentVersion(target)}?`)) return;
  } else if (compareComponentVersions(target, current) === 0) {
    if (!window.confirm(`Переустановить Mihomo ${formatComponentVersion(current)}?`)) return;
  }
  await startComponentAction({ component: 'mihomo', action: 'update', target });
}

async function startComponentAction(payload) {
  try {
    const data = await apiJson('/api/components/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mihui-Action': 'components' },
      body: JSON.stringify(payload),
    });
    state.components.job = normalizeComponentJob(data.job);
    state.components.jobVisible = true;
    els.componentJobDetails.open = false;
    renderComponentManager();
    renderXkeenNetworkFiles();
    pollComponentJob();
    return true;
  } catch (error) {
    showMessage(`Не удалось запустить операцию: ${error?.message || error}`, { severity: 'warning' });
    return false;
  }
}

async function pollComponentJob() {
  if (state.components.pollTimer) {
    window.clearTimeout(state.components.pollTimer);
    state.components.pollTimer = 0;
  }
  try {
    const wasRunning = state.components.job.running;
    const data = await apiJson('/api/components/job');
    state.components.job = normalizeComponentJob(data.job);
    if (state.components.job.running) state.components.jobVisible = true;
    if (wasRunning && !state.components.job.running) els.componentJobDetails.open = false;
    renderComponentManager();
    renderXkeenNetworkFiles();
    if (state.components.job.running) {
      state.components.pollTimer = window.setTimeout(pollComponentJob, 1500);
      return;
    }
    if (state.xkeenFiles.restartRequested
      && state.components.job.component === 'xkeen'
      && state.components.job.action === 'restart') {
      showMessage(
        state.components.job.ok ? 'XKeen успешно перезапущен.' : `Не удалось перезапустить XKeen: ${state.components.job.message || 'операция не выполнена'}`,
        { severity: state.components.job.ok ? 'success' : 'error' },
      );
      state.xkeenFiles.restartRequested = false;
    }
    await Promise.all([
      loadServiceHealth({ silent: true }),
      loadComponents({ force: true, silent: true }),
    ]);
    renderXkeenNetworkFiles();
  } catch (error) {
    state.components.pollTimer = window.setTimeout(pollComponentJob, 2000);
  }
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
    if (state.lastConfigCheckOk) persistSuccessfulConfigCheck(state.outputText);
    if (!options.silent) {
      showMessage(data.available ? 'Проверка Mihomo пройдена.' : `Проверка недоступна: ${data.message || 'mihomo не найден'}`);
    }
    return true;
  } catch (error) {
    state.lastConfigCheckText = state.outputText;
    state.lastConfigCheckOk = false;
    clearPersistedConfigCheck(state.outputText);
    showMessage(`Проверка Mihomo не прошла: ${error?.message || error}`, { severity: 'error' });
    return false;
  } finally {
    setConfigCheckBusy(false);
    render();
  }
}

function getConfigFingerprint(text) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${text.length}:${first >>> 0}:${second >>> 0}`;
}

function getPersistedConfigCheck() {
  try {
    return window.localStorage?.getItem(CONFIG_CHECK_STORAGE_KEY) || '';
  } catch (error) {
    return '';
  }
}

function persistSuccessfulConfigCheck(text) {
  try {
    window.localStorage?.setItem(CONFIG_CHECK_STORAGE_KEY, getConfigFingerprint(text));
  } catch (error) {
    // Проверка работает и без доступного localStorage.
  }
}

function clearPersistedConfigCheck(text) {
  try {
    if (getPersistedConfigCheck() === getConfigFingerprint(text)) {
      window.localStorage?.removeItem(CONFIG_CHECK_STORAGE_KEY);
    }
  } catch (error) {
    // Проверка работает и без доступного localStorage.
  }
}

function restorePersistedConfigCheck() {
  const isPersisted = Boolean(
    state.lastConfigCheckOk && state.lastConfigCheckText === state.outputText
      || state.routerApiAvailable
        && state.outputText
        && getPersistedConfigCheck() === getConfigFingerprint(state.outputText),
  );
  state.lastConfigCheckText = isPersisted ? state.outputText : '';
  state.lastConfigCheckOk = isPersisted;
}

function setConfigCheckBusy(isBusy) {
  state.kernelCheckBusy = isBusy;
  renderReviewPrimaryActionButton();
  renderRouterControls();
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

async function loadNodeInventory(options = {}) {
  if (!state.routerApiAvailable || typeof fetch !== 'function') return;
  state.nodeInventoryLoading = true;
  state.nodeInventoryError = '';
  state.nodeInventoryErrorDetail = '';
  state.nodeGroupSelectionsError = '';
  renderNodeInventory();

  try {
    const data = await apiJson('/api/nodes');
    state.mihomoNodes = Array.isArray(data.nodes) ? data.nodes : [];
    state.mihomoGroupSelections = Array.isArray(data.groups) ? data.groups : [];
    state.nodeGroupSelectionsError = data.groupsError || '';
    state.nodeInventoryUpdatedAt = Math.floor(Date.now() / 1000);
  } catch (error) {
    state.mihomoNodes = [];
    state.mihomoGroupSelections = [];
    state.nodeInventoryErrorDetail = error?.message || String(error);
    state.nodeInventoryError = formatNodeInventoryError(state.nodeInventoryErrorDetail);
    state.nodeGroupSelectionsError = state.nodeInventoryError;
  } finally {
    state.nodeInventoryLoading = false;
    render();
  }
}

function formatNodeInventoryError(detail) {
  const text = String(detail || '');
  if (/HTTP\s+404/i.test(text)) return 'Список нод недоступен в текущем сервисе MihUI.';
  if (/failed to fetch|network|connection|ECONN/i.test(text)) return 'Не удалось связаться с Mihomo.';
  return 'Mihomo не ответил на запрос списка нод.';
}

function handleNodeFilterChange() {
  state.nodeFilters.search = els.nodeSearchInput.value || '';
  state.nodeFilters.provider = els.nodeProviderFilter.value || '';
  state.nodeFilters.group = els.nodeGroupFilter.value || '';
  state.nodeFilters.protocol = els.nodeProtocolFilter.value || '';
  state.nodeFilters.status = els.nodeStatusFilter.value || '';
  renderNodeInventory();
}

function resetNodeFilters() {
  state.nodeFilters = {
    search: '',
    provider: '',
    group: '',
    protocol: '',
    status: '',
  };
  renderNodeInventory();
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
    await loadNodeInventory({ silent: true });
  } catch (error) {
    showMessage(`Не удалось обновить подписку ${provider.name}: ${error?.message || error}`);
  } finally {
    state.providerUpdatingName = '';
    render();
  }
}

async function decodeHappProvider(provider) {
  if (!provider?.url || typeof fetch !== 'function') return;
  state.happDecodeProviderName = provider.name;
  state.happDecodeFeedback = null;
  render();

  try {
    const data = await decodeHappProviderUrl(provider);
    const previousName = provider.name;
    provider.url = data.decryptedUrl || provider.url;
    provider.hasUrl = true;
    if (provider.autoName) applyGeneratedProviderName(provider, provider.url, previousName);
    state.happDecodeFeedback = {
      provider,
      severity: 'success',
      message: 'Happ-ссылка расшифрована. Прямой URL подставлен.',
    };
    generateOutput();
    render();
  } catch (error) {
    state.happDecodeFeedback = {
      provider,
      severity: 'error',
      message: `Не удалось расшифровать Happ-ссылку: ${error?.message || error}`,
    };
    showMessage(
      `Не удалось расшифровать Happ ссылку ${provider.name}: ${error?.message || error}. Можно вручную расшифровать на ресурсе`,
      { href: 'https://leeeet.dev/happ-decryptor/', label: 'Happ decryptor' },
    );
  } finally {
    state.happDecodeProviderName = '';
    render();
  }
}

async function decodeHappProviderUrl(provider) {
  if (!canUseBrowserHappDecryptor()) throw new Error('browser Happ decryptor is unavailable');
  return decodeHappProviderUrlInBrowser(provider.url);
}

async function decodeHappProviderUrlInBrowser(sourceUrl) {
  const decryptor = await loadHappBrowserDecryptor();
  if (typeof decryptor.decryptLink !== 'function') {
    throw new Error('browser module does not export decryptLink');
  }
  const decryptedUrl = normalizeBrowserDecodedHappUrl(await decryptor.decryptLink(sourceUrl));
  if (!/^https?:\/\//i.test(decryptedUrl)) {
    throw new Error('browser decryptor did not return a direct http/https URL');
  }
  return {
    ok: true,
    decryptedUrl,
    source: 'browser-decryptor',
  };
}

function loadHappBrowserDecryptor() {
  if (!happBrowserDecryptorPromise) {
    happBrowserDecryptorPromise = import(`${HAPP_BROWSER_DECRYPTOR_MODULE}?v=${HAPP_BROWSER_DECRYPTOR_VERSION}`);
  }
  return happBrowserDecryptorPromise;
}

function canUseBrowserHappDecryptor() {
  return typeof fetch === 'function' && window.location?.protocol !== 'file:';
}

function normalizeBrowserDecodedHappUrl(value) {
  const text = String(value || '').trim();
  const addPrefix = 'happ://add/';
  if (text.toLowerCase().startsWith(addPrefix)) {
    return decodeURIComponent(text.slice(addPrefix.length)).trim();
  }
  return text;
}

function parseAndRender() {
  const lines = splitLines(state.originalText);
  const providersSection = findTopSection(lines, 'proxy-providers');
  const groupsSection = findTopSection(lines, 'proxy-groups');
  const rulesSection = findTopSection(lines, 'rules');
  state.hasProvidersSection = Boolean(providersSection);
  state.hasGroupsSection = Boolean(groupsSection);
  state.hasRulesSection = Boolean(rulesSection);
  state.originalConnectionSettings = readConnectionSettings(lines);
  state.connectionSettings = cloneConnectionSettings(state.originalConnectionSettings);

  if (!groupsSection) {
    showMessage('Добавьте раздел proxy-groups на верхнем уровне конфигурации.', {
      severity: 'error',
      actions: [{ label: 'Открыть другой файл', onClick: () => els.fileInput.click() }],
    });
    state.providers = [];
    state.groups = [];
    state.rules = [];
    state.originalProviders = [];
    state.originalGroups = [];
    state.originalRules = [];
    state.originalConnectionSettings = {};
    state.connectionSettings = {};
    state.hasProvidersSection = false;
    state.hasGroupsSection = false;
    state.hasRulesSection = false;
    state.intervalToolsOpen = false;
    state.selectedGroupName = '';
    state.selectedRouteScenarioId = '';
    setOutputText(state.originalText);
    render();
    return;
  }

  state.providers = providersSection ? parseProviders(lines, providersSection) : [];
  state.groups = parseGroups(lines, groupsSection);
  state.rules = rulesSection ? parseRules(lines, rulesSection) : [];
  state.originalProviders = state.providers.map(snapshotProvider);
  state.originalGroups = state.groups.map(snapshotGroup);
  state.originalRules = state.rules.map(snapshotRule);
  syncBulkIntervalInputs();
  hideMessage();
  setOutputText(state.originalText);
  render();
}

function render() {
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  const groupsWithUse = state.groups.filter((group) => group.useStart !== -1);
  const changes = collectChanges(activeProviders);
  const diagnostics = collectDiagnostics(activeProviders);
  state.changeCount = countChanges(changes);

  syncSelectedProvider(activeProviders);
  const fileLabel = getDisplayFileName(state.fileName);
  els.fileMeta.textContent = fileLabel || 'Конфигурация не загружена';
  els.fileMeta.title = state.fileName || '';
  els.providerCount.textContent = String(activeProviders.length);
  renderGroupMetric();
  renderSectionTabs();
  renderInterfaceSettings();
  els.downloadButton.disabled = !state.outputText;
  renderRouterControls();
  els.addProviderButton.disabled = !state.originalText || !state.hasGroupsSection;
  els.addProviderButton.title = state.originalText && state.hasGroupsSection ? 'Добавить подписку' : 'Сначала загрузите конфигурацию с proxy-groups';
  els.addGroupButton.disabled = !state.originalText || !state.hasGroupsSection;
  els.addGroupButton.title = state.originalText && state.hasGroupsSection ? 'Добавить группу' : 'Сначала загрузите конфигурацию с proxy-groups';
  els.addRuleButton.disabled = !state.originalText || !state.hasGroupsSection;
  els.addRuleButton.title = state.originalText && state.hasGroupsSection ? 'Добавить правило' : 'Сначала загрузите конфигурацию с proxy-groups';
  els.intervalToolsButton.disabled = !state.originalText || !state.hasGroupsSection;
  els.intervalToolsButton.title = state.originalText && state.hasGroupsSection
    ? 'Массово изменить интервалы подписок'
    : 'Сначала загрузите конфигурацию с proxy-groups';
  renderConfigurationEditorControls();
  renderOutputPreview();

  renderIntervalTools(activeProviders);
  renderOverview(activeProviders, groupsWithUse, changes, diagnostics);
  renderShellStatus(diagnostics);
  renderDiagnostics(diagnostics);
  renderReviewSummary(changes, diagnostics);
  renderConnectionSettings();
  renderChanges(changes);
  renderChangesJumpButton(changes);
  renderProviders(activeProviders);
  renderRulesEditor();
  renderMainGroup(state.groups, activeProviders);
  renderGroups(activeProviders, groupsWithUse);
  renderNodeInventory();
}

function renderShellStatus(diagnostics) {
  const errorCount = diagnostics.filter((text) => getDiagnosticSeverity(text) === 'error').length;
  const warningCount = diagnostics.length - errorCount;
  const hasStructuralError = Boolean(state.originalText && !state.hasGroupsSection);
  let validation = 'Проверка недоступна';
  let variant = '';
  let shortLabel = '—';

  if (state.originalText) {
    if (hasStructuralError || errorCount > 0) {
      validation = hasStructuralError ? 'Локальная проверка: ошибка структуры' : `Локальная проверка: ${formatErrorCount(errorCount)}`;
      variant = 'is-danger';
      shortLabel = 'Ошибка';
    } else if (warningCount > 0) {
      validation = `Локальная проверка: ${formatWarningCount(warningCount)}`;
      variant = 'is-warning';
      shortLabel = String(warningCount);
    } else {
      validation = 'Локальная проверка: OK';
      variant = 'is-ok';
      shortLabel = 'OK';
    }
  }

  els.topbarValidation.textContent = validation;
  els.topbarValidation.dataset.shortLabel = shortLabel;
  els.topbarValidation.className = `topbar-validation ${variant}`.trim();
}

function renderOverview(activeProviders, groupsWithUse, changes, diagnostics) {
  const missingConnectionCount = state.originalText ? getMissingConnectionSettings().length : 0;
  const changeCount = countChanges(changes);
  const errors = diagnostics.filter((text) => getDiagnosticSeverity(text) === 'error');
  const warnings = diagnostics.length - errors.length;
  const nodeCount = state.mihomoNodes.length;
  const availableNodeCount = state.mihomoNodes.filter((node) => node.alive === true).length;
  const hasStructuralError = Boolean(state.originalText && !state.hasGroupsSection);
  const attentionItems = [];
  const knownProviderStatuses = activeProviders
    .map((provider) => getProviderStatus(provider.name))
    .filter((status) => status?.proxyCount !== null && status?.proxyCount !== undefined);
  const workingProviderCount = knownProviderStatuses.filter((status) => Number(status.proxyCount) > 0).length;

  state.overviewDiagnostics = diagnostics;
  renderOverviewHealth();

  els.providerCount.textContent = !state.originalText
    ? 'Нет данных'
    : state.providerStatusLoading
      ? 'Обновляем статусы'
      : knownProviderStatuses.length > 0
        ? `${workingProviderCount} из ${activeProviders.length} ${workingProviderCount === 1 ? 'работает' : 'работают'}`
        : formatConfiguredProviderCount(activeProviders.length);

  els.overviewProvidersSummary.textContent = state.originalText
    ? knownProviderStatuses.length > 0
      ? `${formatProxyCount(knownProviderStatuses.reduce((total, status) => total + (Number(status.proxyCount) || 0), 0))} получено от Mihomo`
      : formatProviderFilterSummary(activeProviders)
    : 'Источники нод';
  els.groupCount.textContent = state.originalText
    ? formatRouteCount(state.groups.length, 'группа', 'группы', 'групп')
    : 'Нет данных';
  els.overviewRoutingSummary.textContent = state.originalText
    ? `${formatRouteCount(groupsWithUse.length, 'группа использует', 'группы используют', 'групп используют')} подписки`
    : 'Распределение трафика';
  els.overviewNodesStatus.textContent = state.routerApiAvailable
    ? state.nodeInventoryLoading
      ? 'Загружаем список'
      : state.nodeInventoryError
        ? 'Статус недоступен'
        : nodeCount > 0
          ? availableNodeCount > 0
            ? `${availableNodeCount} из ${nodeCount} доступны`
            : `${formatProxyCount(nodeCount)} получено`
          : 'Ноды не получены'
    : 'Доступно в MihUI';
  els.overviewNodesStatus.classList.remove('metric-warning', 'metric-danger');
  if (state.routerApiAvailable && state.nodeInventoryError) {
    els.overviewNodesStatus.classList.add('metric-danger');
  } else if (state.routerApiAvailable && !state.nodeInventoryLoading && nodeCount === 0) {
    els.overviewNodesStatus.classList.add('metric-warning');
  }
  els.overviewNodesSummary.textContent = state.routerApiAvailable
    ? state.nodeInventoryLoading
      ? 'Mihomo обновляет данные'
      : state.nodeInventoryError
        ? state.nodeInventoryError
        : nodeCount > 0
          ? 'Список получен от Mihomo'
          : 'Mihomo не вернул ноды'
    : 'Доступно при работе через локальный сервис';
  els.overviewReviewSummary.textContent = hasStructuralError
    ? 'Сначала исправьте структуру конфигурации'
    : errors.length > 0
      ? 'Исправьте ошибки перед сохранением'
      : warnings > 0
        ? `${formatWarningCount(warnings)} перед сохранением`
        : changeCount > 0
          ? `${formatChangeCount(changeCount)} · можно проверять`
          : 'Изменений нет';

  els.overviewConfigSource.textContent = state.originalText ? (state.routerMode ? 'Роутер' : 'Локальный YAML') : '—';
  els.overviewConfigPath.textContent = state.fileName || 'Не открыт';
  els.overviewConfigPath.title = state.fileName || '';
  els.overviewConfigChanges.textContent = state.originalText
    ? changeCount > 0
      ? formatChangeCount(changeCount)
      : 'Без локальных изменений'
    : '—';
  els.overviewConfigChanges.classList.toggle('metric-warning', changeCount > 0);
  els.overviewConfigLoadedLabel.textContent = state.routerMode ? 'Получена с роутера' : 'Открыта в редакторе';
  els.overviewConfigLoadedAt.textContent = state.configLoadedAt ? formatOverviewLoadedAt(state.configLoadedAt) : '—';

  if (state.components.updateCount > 0) {
    attentionItems.push({
      title: 'Доступны обновления компонентов',
      text: getComponentUpdateSummary(),
      onClick: openComponentManager,
    });
  }

  if (!state.originalText) {
    attentionItems.push({ section: 'overview', title: 'Конфигурация не загружена', text: 'Откройте файл или конфиг из ядра, чтобы начать.' });
  } else if (hasStructuralError) {
    attentionItems.push({
      title: 'Ошибка структуры конфигурации',
      text: 'Добавьте proxy-groups или откройте другой файл.',
      onClick: () => els.fileInput.click(),
    });
  } else {
    if (errors.length > 0) {
      attentionItems.push({ section: 'routing', title: formatErrorCount(errors.length), text: 'Проверьте маршрутизацию и отсутствующие связи.' });
    } else if (warnings > 0) {
      attentionItems.push({ section: 'routing', title: formatWarningCount(warnings), text: 'Есть предупреждения по группам или подпискам.' });
    }
    if (missingConnectionCount > 0) {
      attentionItems.push({ section: 'review', title: `Рекомендаций: ${missingConnectionCount}`, text: 'Можно включить недостающие настройки подключения.' });
    }
    if (changeCount > 0) {
      attentionItems.push({ section: 'review', title: formatChangeCount(changeCount), text: 'Перед сохранением проверьте итоговый diff.' });
    }
    if (state.routerApiAvailable && state.nodeInventoryError) {
      attentionItems.push({ section: 'nodes', title: 'Ноды недоступны', text: state.nodeInventoryError });
    }
  }

  els.overviewAttentionList.textContent = '';
  if (attentionItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'overview-attention-empty';
    empty.textContent = 'Сейчас нет срочных действий.';
    els.overviewAttentionList.append(empty);
    return;
  }

  attentionItems.forEach((item) => {
    const button = document.createElement('button');
    const title = document.createElement('strong');
    const text = document.createElement('span');
    const action = document.createElement('span');
    button.className = 'overview-attention-item';
    button.type = 'button';
    if (item.section) button.setAttribute('data-section-target', item.section);
    button.addEventListener('click', item.onClick || (() => setActiveSection(item.section)));
    title.textContent = item.title;
    text.textContent = item.text;
    action.className = 'overview-attention-action';
    action.textContent = 'Посмотреть →';
    button.append(title, text, action);
    els.overviewAttentionList.append(button);
  });
}

function formatConfiguredProviderCount(count) {
  const value = Number(count) || 0;
  const noun = formatRouteCount(value, 'подписка', 'подписки', 'подписок');
  return `${noun} ${value === 1 ? 'настроена' : 'настроены'}`;
}

function renderOverviewHealth() {
  if (!els.overviewHealth) return;
  const diagnostics = state.overviewDiagnostics || [];
  const errorCount = diagnostics.filter((text) => getDiagnosticSeverity(text) === 'error').length;
  const warningCount = diagnostics.length - errorCount;
  const hasStructuralError = Boolean(state.originalText && !state.hasGroupsSection);
  const services = Object.values(state.serviceHealth.services || {});
  const serviceProblem = state.routerApiAvailable && state.serviceHealth.checkedAt > 0
    && services.some((service) => service.state === 'error' || service.state === 'unavailable');
  const nodesProblem = state.routerApiAvailable && !state.nodeInventoryLoading
    && (Boolean(state.nodeInventoryError) || state.mihomoNodes.length === 0);
  const recommendationCount = state.originalText ? getMissingConnectionSettings().length : 0;
  const summaryParts = [];
  let title = 'Конфигурация готова к работе';
  let variant = '';

  if (!state.originalText) {
    title = 'Конфигурация не загружена';
    variant = 'is-muted';
    summaryParts.push('Откройте конфигурацию, чтобы проверить её состояние');
  } else if (hasStructuralError || errorCount > 0) {
    title = 'Конфигурацию нужно исправить';
    variant = 'is-danger';
    summaryParts.push(hasStructuralError ? 'Ошибка структуры' : formatErrorCount(errorCount));
  } else {
    if (state.routerApiAvailable) {
      summaryParts.push(state.serviceHealth.loading && !state.serviceHealth.checkedAt
        ? 'Проверяем сервисы'
        : serviceProblem ? 'Не все сервисы доступны' : 'Сервисы доступны');
    } else {
      summaryParts.push('Структура проверена');
    }
    summaryParts.push(warningCount > 0 ? formatWarningCount(warningCount) : 'ошибок нет');
    summaryParts.push(state.changeCount > 0
      ? formatChangeCount(state.changeCount)
      : hasUnsavedRouterChanges() ? 'YAML изменён вручную' : 'изменений нет');
    if (nodesProblem) summaryParts.push(state.nodeInventoryError ? 'ноды недоступны' : 'ноды не получены');
    if (recommendationCount > 0) summaryParts.push(formatRouteCount(recommendationCount, 'рекомендация', 'рекомендации', 'рекомендаций'));
    if (serviceProblem || nodesProblem) {
      title = serviceProblem ? 'Проверьте состояние сервисов' : 'Система работает, но требуется внимание';
      variant = 'is-warning';
    }
  }

  els.overviewHealth.classList.remove('is-muted', 'is-warning', 'is-danger');
  if (variant) els.overviewHealth.classList.add(variant);
  els.overviewHealthTitle.textContent = title;
  els.overviewHealthSummary.textContent = summaryParts.join(' · ');
}

function formatOverviewLoadedAt(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderReviewSummary(changes, diagnostics) {
  const changeCount = countChanges(changes);
  const missingConnectionCount = state.originalText ? getMissingConnectionSettings().length : 0;
  const errorCount = diagnostics.filter((text) => getDiagnosticSeverity(text) === 'error').length;
  const warningCount = diagnostics.length - errorCount;
  const kernelCheck = getKernelCheckSummary();
  const hasStructuralError = Boolean(state.originalText && !state.hasGroupsSection);

  els.reviewWorkflow.classList.toggle('has-review-side', Boolean(state.originalText));
  els.reviewChecklist.textContent = '';
  els.reviewSummaryStatus.textContent = getReviewSummaryStatus(changeCount, missingConnectionCount, errorCount, warningCount);
  renderReviewYamlSummary(changeCount);

  [
    {
      title: 'Локальная проверка',
      value: !state.originalText
        ? 'Нет конфигурации'
        : errorCount > 0
          ? formatErrorCount(errorCount)
          : warningCount > 0
            ? formatWarningCount(warningCount)
            : 'Без ошибок',
      note: !state.originalText
        ? 'Откройте YAML, чтобы запустить проверку.'
        : errorCount > 0
          ? 'Исправьте блокирующие ошибки перед сохранением.'
          : warningCount > 0
            ? 'Проверьте предупреждения перед сохранением.'
            : 'Синтаксис и обязательные поля корректны.',
      variant: !state.originalText ? 'is-muted' : errorCount > 0 ? 'is-danger' : warningCount > 0 ? 'is-warning' : 'is-ok',
      icon: 'review',
    },
    {
      title: 'Структура и связи',
      value: !state.originalText ? 'Не проверены' : hasStructuralError ? 'Ошибка структуры' : errorCount > 0 ? 'Требуют внимания' : 'Корректны',
      note: !state.originalText
        ? 'Связи появятся после загрузки конфигурации.'
        : hasStructuralError
          ? 'Отсутствует обязательный раздел proxy-groups.'
          : errorCount > 0
            ? 'Проверьте ссылки между подписками, группами и правилами.'
            : 'Подписки, группы и правила связаны корректно.',
      variant: !state.originalText ? 'is-muted' : hasStructuralError || errorCount > 0 ? 'is-danger' : 'is-ok',
      icon: 'routing',
    },
    {
      title: 'Проверка Mihomo',
      value: kernelCheck.value,
      note: kernelCheck.note,
      variant: kernelCheck.variant,
      icon: 'nodes',
    },
    {
      title: 'Рекомендации',
      value: missingConnectionCount > 0 ? formatRouteCount(missingConnectionCount, 'настройка', 'настройки', 'настроек') : 'Нет',
      note: missingConnectionCount > 0 ? 'Можно улучшить параметры подключения.' : 'Дополнительных настроек не требуется.',
      variant: missingConnectionCount > 0 ? 'is-warning' : 'is-ok',
      action: missingConnectionCount > 0 ? focusConnectionSettingsPanel : null,
      icon: 'warning',
    },
  ].forEach((item) => {
    els.reviewChecklist.append(createReviewChecklistItem(item));
  });
}

function getReviewSummaryStatus(changeCount, missingConnectionCount, errorCount, warningCount) {
  if (!state.originalText) return 'Конфигурация не загружена';
  const diagnosticsSummary = errorCount > 0 ? formatErrorCount(errorCount) : warningCount > 0 ? formatWarningCount(warningCount) : 'Ошибок нет';
  const recommendationsSummary = missingConnectionCount > 0
    ? formatRouteCount(missingConnectionCount, 'рекомендация', 'рекомендации', 'рекомендаций')
    : 'рекомендаций нет';
  const changesSummary = changeCount > 0
    ? formatChangeCount(changeCount)
    : hasUnsavedRouterChanges() ? 'YAML изменён вручную' : 'изменений нет';
  return `${diagnosticsSummary} · ${recommendationsSummary} · ${changesSummary}`;
}

function renderReviewYamlSummary(changeCount) {
  const text = state.outputText || '';
  const lineCount = text ? text.split(/\r?\n/).length : 0;
  const size = getUtf8ByteLength(text);
  const hasUnsavedChanges = changeCount > 0 || hasUnsavedRouterChanges();

  els.reviewChangeStatus.textContent = !state.originalText
    ? 'Нет конфигурации'
    : changeCount > 0
      ? formatChangeCount(changeCount)
      : hasUnsavedChanges ? 'YAML изменён вручную' : 'Без локальных изменений';
  els.reviewChangeStatus.classList.toggle('is-warning', hasUnsavedChanges);

  els.reviewYamlStatus.classList.remove('is-ok', 'is-warning', 'is-danger');
  if (!text) {
    els.reviewYamlStatus.textContent = 'Нет YAML для проверки';
  } else if (state.lastConfigCheckText === text && state.lastConfigCheckOk) {
    els.reviewYamlStatus.textContent = 'YAML проверен в Mihomo';
    els.reviewYamlStatus.classList.add('is-ok');
  } else if (state.lastConfigCheckText === text) {
    els.reviewYamlStatus.textContent = 'Mihomo отклонил текущий YAML';
    els.reviewYamlStatus.classList.add('is-danger');
  } else if (!state.routerApiAvailable) {
    els.reviewYamlStatus.textContent = 'Проверка Mihomo недоступна';
  } else {
    els.reviewYamlStatus.textContent = 'YAML ещё не проверен в Mihomo';
    els.reviewYamlStatus.classList.add('is-warning');
  }

  els.reviewYamlMeta.textContent = `Строк: ${lineCount} · Размер: ${formatBackupSize(size) || '0 Б'}`;
}

function getUtf8ByteLength(value) {
  let length = 0;
  for (const char of String(value || '')) {
    const code = char.codePointAt(0);
    length += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return length;
}

function getKernelCheckSummary() {
  if (!state.outputText) {
    return { value: 'нет данных', note: 'Итоговый YAML пустой', variant: 'is-muted' };
  }
  if (state.originalText && !state.hasGroupsSection) {
    return { value: 'заблокирована', note: 'Исправьте proxy-groups', variant: 'is-danger' };
  }
  if (!state.routerApiAvailable) {
    return { value: 'недоступна', note: 'Только рядом с Mihomo', variant: 'is-muted' };
  }
  if (state.lastConfigCheckText === state.outputText && state.lastConfigCheckOk) {
    return { value: 'YAML принят', note: 'Текущий YAML принят Mihomo', variant: 'is-ok' };
  }
  if (state.lastConfigCheckText === state.outputText) {
    return { value: 'не пройдена', note: 'Проверьте сообщение выше', variant: 'is-danger' };
  }
  return { value: 'не проверено', note: 'Нажмите основную кнопку ниже', variant: 'is-warning' };
}

function createReviewChecklistItem(item) {
  const card = document.createElement(item.action ? 'button' : 'div');
  const icon = document.createElement('span');
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const iconUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  const copy = document.createElement('span');
  const title = document.createElement('span');
  const value = document.createElement('strong');
  const note = document.createElement('span');

  card.className = `review-check-card review-check-row ${item.variant || ''}`.trim();
  icon.className = 'review-check-icon';
  iconSvg.setAttribute('aria-hidden', 'true');
  iconUse.setAttribute('href', `#icon-${item.icon || 'check'}`);
  iconSvg.append(iconUse);
  icon.append(iconSvg);
  copy.className = 'review-check-copy';
  title.className = 'review-check-title';
  value.className = 'review-check-value';
  note.className = 'review-check-note';
  title.textContent = item.title;
  value.textContent = item.value;
  note.textContent = item.note;
  copy.append(title, value, note);
  card.append(icon, copy);

  if (item.action) {
    card.type = 'button';
    card.addEventListener('click', item.action);
  }

  return card;
}

function formatProviderFilterSummary(providers) {
  const withFilter = providers.filter((provider) => hasOutputValue(provider.filter)).length;
  const withExclude = providers.filter((provider) => hasOutputValue(provider.excludeFilter) || hasOutputValue(provider.excludeType)).length;
  if (withFilter === 0 && withExclude === 0) return 'без фильтров';
  const parts = [];
  if (withFilter > 0) parts.push(`фильтруются: ${withFilter}`);
  if (withExclude > 0) parts.push(`исключения: ${withExclude}`);
  return parts.join(' · ');
}

function renderGroupMetric() {
  els.groupCount.textContent = state.originalText
    ? formatRouteCount(state.groups.length, 'группа', 'группы', 'групп')
    : 'Нет данных';
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
  title.textContent = state.hasGroupsSection ? 'Проверка связей' : 'Проверка структуры';
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
  els.rulesMetric.setAttribute('data-diagnostics-action', String(isActionable));
  els.rulesMetric.setAttribute('aria-disabled', 'false');
  els.rulesMetric.title = isActionable ? 'Открыть список предупреждений и ошибок' : 'Открыть итоговую проверку';
  els.rulesHint.hidden = false;
  els.rulesHint.textContent = isActionable ? 'Открыть замечания →' : 'Открыть →';
}

function handleRulesMetricKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  focusDiagnosticsPanel();
}

function openOverviewCheck() {
  if (els.rulesMetric.getAttribute('data-diagnostics-action') === 'true') {
    focusDiagnosticsPanel();
    return;
  }
  setActiveSection('review');
}

function focusDiagnosticsPanel() {
  setActiveSection('routing', { scroll: false });
  setRoutingView('rules');
  if (els.diagnosticsPanel.classList.contains('hidden')) return;

  els.diagnosticsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  els.diagnosticsPanel.classList.remove('target-highlight');
  window.setTimeout(() => {
    els.diagnosticsPanel.classList.add('target-highlight');
    els.diagnosticsPanel.querySelector('.diagnostic-link')?.focus();
  }, 0);
}

function focusChangesPanel() {
  setActiveSection('review', { scroll: false });
  if (els.changesPanel.classList.contains('hidden')) return;

  els.changesPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  els.changesPanel.classList.remove('target-highlight');
  window.setTimeout(() => {
    els.changesPanel.classList.add('target-highlight');
  }, 0);
}

function focusReviewSummary() {
  setActiveSection('review', { scroll: false });
  els.reviewSummaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  els.reviewSummaryPanel.classList.remove('target-highlight');
  window.setTimeout(() => {
    els.reviewSummaryPanel.classList.add('target-highlight');
    els.reviewSummaryPanel.focus({ preventScroll: true });
  }, 0);
}

function focusConnectionSettingsPanel() {
  setActiveSection('review', { scroll: false });
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
  state.changeCount = count;

  els.changesJumpButton.hidden = count === 0;
  els.changesJumpButton.disabled = count === 0;
  els.changesJumpButton.textContent = count > 0 ? `Изменения (${count})` : 'Изменения';
  renderMobileFlowActions();
}

function renderMobileFlowActions() {
  const hasValidConfig = Boolean(state.originalText && state.hasGroupsSection);
  const isEditing = state.isEditingConfiguration;
  const saveState = getRouterSaveState();
  els.mobileFlowActions.hidden = !hasValidConfig;
  els.mobileChangesButton.disabled = !hasValidConfig || isEditing || state.changeCount === 0;
  els.mobileChangesButton.querySelector('span').textContent = formatChangeCount(state.changeCount);
  els.mobileReviewButton.disabled = !hasValidConfig || saveState.disabled;
  els.mobileReviewButton.querySelector('span').textContent = saveState.label;
  els.mobileReviewButton.classList.toggle('danger', saveState.tone === 'danger');
  els.mobileDownloadButton.disabled = !hasValidConfig || isEditing || !state.outputText;
  els.mobileReviewButton.title = saveState.label;
}

function renderRecommendationsJumpButton(count) {
  state.recommendationCount = count;
  els.recommendationsJumpButton.hidden = !shouldShowRecommendations(count, state.activeSection);
  els.recommendationsJumpButton.disabled = count === 0;
  els.recommendationsJumpButton.textContent = count > 0 ? `Рекомендации (${count})` : 'Рекомендации';
}

function shouldShowRecommendations(count, activeSection) {
  return count > 0 && activeSection !== 'overview';
}

function getDisplayFileName(fileName) {
  return String(fileName || '').split(/[\\/]/).filter(Boolean).pop() || '';
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
  if (String(text) === MISSING_GROUPS_DIAGNOSTIC) return 'error';
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
  if (value === MISSING_GROUPS_DIAGNOSTIC) {
    return { type: 'open-config-file', label: 'Открыть другой файл' };
  }
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

  if (action.type === 'open-config-file') {
    els.fileInput.click();
    return true;
  }

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
    setActiveSection('providers', { scroll: false });
    setProviderView('editor');
    const provider = state.providers.find((item) => !item.deleted && item.name === target.name);
    if (provider && state.selectedProviderName !== provider.name) {
      state.selectedProviderName = provider.name;
      render();
    }
  }

  if (target.type === 'groups') {
    setActiveSection('providers', { scroll: false });
    setProviderView('relations');
  }

  if (target.type === 'group') {
    setActiveSection('routing', { scroll: false });
    setRoutingView('map');
  }

  if (target.type === 'rules') {
    setActiveSection('routing', { scroll: false });
    setRoutingView('rules');
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
  if (!state.originalText) return diagnostics;
  if (!state.hasGroupsSection) return [MISSING_GROUPS_DIAGNOSTIC];

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
  collectProviderUrlDiagnostics(activeProviders).forEach((text) => {
    addUniqueDiagnostic(diagnostics, text);
  });

  return diagnostics;
}

function collectProviderUrlDiagnostics(activeProviders) {
  const diagnostics = [];

  activeProviders.forEach((provider) => {
    const url = String(provider.url || '').trim();
    if (!url) return;

    const scheme = getUrlScheme(url);
    if (isHappDeepLink(url)) {
      diagnostics.push(`Подписка ${provider.name}: happ://crypt* не является прямой подпиской Mihomo; расшифруйте ссылку кнопкой в редакторе.`);
      return;
    }

    if (scheme === 'incy') {
      diagnostics.push(`Подписка ${provider.name}: incy://import не является прямой подпиской Mihomo; нужен helper или локальный adapter.`);
      return;
    }

    if (PROXY_SHARE_SCHEMES.has(scheme)) {
      diagnostics.push(`Подписка ${provider.name}: ${scheme}:// — это ссылка узла, а не URL proxy-provider; нужен локальный adapter или добавление в proxies.`);
      return;
    }

    const type = String(provider.type || 'http').toLowerCase();
    if (type === 'http' && scheme && scheme !== 'http' && scheme !== 'https') {
      diagnostics.push(`Подписка ${provider.name}: type http требует http/https URL; Mihomo не скачает схему ${scheme}://.`);
    }
  });

  return diagnostics;
}

function getUrlScheme(value) {
  const match = String(value || '').trim().match(/^([A-Za-z][A-Za-z0-9+.-]*):\/\//);
  return match ? match[1].toLowerCase() : '';
}

function isHappDeepLink(value) {
  return String(value || '').trim().toLowerCase().startsWith('happ://crypt');
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
  title.textContent = 'Рекомендации';
  actions.className = 'panel-actions';
  summary.className = 'connection-settings-summary';
  summary.textContent = String(missing.length);
  button.className = 'button primary compact connection-settings-primary';
  button.type = 'button';
  button.textContent = missing.length === 1 ? 'Включить настройку' : 'Включить настройки';
  button.addEventListener('click', addRecommendedConnectionSettings);
  toggleButton.className = 'button compact connection-settings-toggle';
  toggleButton.type = 'button';
  toggleButton.textContent = 'Скрыть';
  toggleButton.hidden = missing.length === 1;
  toggleButton.setAttribute('aria-expanded', 'true');
  body.className = 'connection-settings-body';
  body.hidden = false;
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
    if (missing.length > 1) {
      addButton.className = 'button compact connection-setting-action';
      addButton.type = 'button';
      addButton.textContent = 'Включить';
      addButton.addEventListener('click', () => addConnectionSetting(definition.key));
      card.append(addButton);
    }
    grid.append(card);
  });

  toggleButton.addEventListener('click', () => {
    const expanded = body.hidden;
    body.hidden = !expanded;
    toggleButton.textContent = expanded ? 'Скрыть' : 'Подробнее';
    toggleButton.setAttribute('aria-expanded', String(expanded));
  });

  actions.append(summary, toggleButton);
  head.append(title, actions);
  body.append(grid, button);
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
  if (!state.originalText || !state.hasGroupsSection) return [];
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

  if (!state.originalText || changes.length === 0) {
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
  const providerChanges = collectProviderChanges(activeProviders);
  const ruleChanges = collectRuleChanges();
  const groupUseChanges = collectGroupUseChanges();

  if (!state.hasProvidersSection && activeProviders.length > 0) {
    structuralChanges.push('Будет добавлен раздел подписок.');
  }
  if (!state.hasRulesSection && getActiveRules().length > 0) {
    structuralChanges.push('Будет добавлен раздел rules.');
  }

  if (structuralChanges.length > 0) sections.push({ title: 'Структура конфигурации', items: structuralChanges });
  if (connectionSettingChanges.length > 0) sections.push({ title: 'Параметры подключения', items: connectionSettingChanges });
  if (providerChanges.length > 0) sections.push({ title: 'Подписки', items: providerChanges });
  if (ruleChanges.length > 0) sections.push({ title: 'Правила', items: ruleChanges });
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
  const activeOriginalNames = new Set();

  state.groups.forEach((group) => {
    const original = originalByName.get(group.originalName || group.name);
    if (!original) {
      changes.push(`Добавлена группа ${group.name}.`);
      return;
    }
    activeOriginalNames.add(original.name);

    if (group.name !== original.name) {
      changes.push(`Группа ${original.name}: переименована в ${group.name}.`);
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

  state.originalGroups.forEach((group) => {
    if (!activeOriginalNames.has(group.name)) {
      changes.push(`Удалена группа ${group.name}.`);
    }
  });

  return changes;
}

function collectRuleChanges() {
  const changes = [];
  const activeRules = getActiveRules();
  const originalByIndex = new Map(state.originalRules.map((rule) => [rule.originalIndex, rule]));
  const activeOriginalIndexes = new Set();

  activeRules.forEach((rule) => {
    if (rule.isNew || rule.originalIndex === -1) {
      changes.push(`Добавлено правило ${formatRuleSummary(rule)}.`);
      return;
    }

    const original = originalByIndex.get(rule.originalIndex);
    if (!original) return;
    activeOriginalIndexes.add(original.originalIndex);

    const current = snapshotRule(rule);
    if (!rulesAreEqual(current, original)) {
      changes.push(`Правило ${original.originalIndex + 1}: ${formatRuleSummary(original)} → ${formatRuleSummary(current)}.`);
    }
  });

  state.originalRules.forEach((rule) => {
    if (!activeOriginalIndexes.has(rule.originalIndex)) {
      changes.push(`Удалено правило ${rule.originalIndex + 1}: ${formatRuleSummary(rule)}.`);
    }
  });

  if (haveRuleOrderChanged() && !changes.includes('Изменен порядок правил.')) {
    changes.push('Изменен порядок правил.');
  }

  return changes;
}

function haveRulesChanged() {
  return collectRuleChanges().length > 0;
}

function haveRuleOrderChanged() {
  const originalOrder = state.originalRules.map((rule) => rule.originalIndex).filter((index) => index !== -1);
  const currentOrder = getActiveRules().map((rule) => rule.originalIndex).filter((index) => index !== -1);
  if (originalOrder.length !== currentOrder.length) return false;
  return currentOrder.some((value, index) => value !== originalOrder[index]);
}

function rulesAreEqual(left, right) {
  return left.type === right.type
    && left.value === right.value
    && left.target === right.target
    && left.options.join('|') === right.options.join('|');
}

function formatRuleSummary(rule) {
  const type = normalizeRuleType(rule.type);
  const target = rule.target || 'без цели';
  if (type === 'MATCH') return `MATCH → ${target}`;
  return `${type || 'RULE'} ${rule.value || 'без условия'} → ${target}`;
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
  const writesUrl = output
    ? provider.isNew
      ? (type === 'http' || provider.hasUrl) && hasOutputValue(provider.url)
      : provider.hasUrl
    : provider.hasUrl;
  const writesFilter = output && provider.isNew ? hasOutputValue(provider.filter) : provider.hasFilter;
  const writesExcludeFilter = output && provider.isNew ? hasOutputValue(provider.excludeFilter) : provider.hasExcludeFilter;
  const writesExcludeType = output && provider.isNew ? hasOutputValue(provider.excludeType) : provider.hasExcludeType;
  const writesUserAgent = output && provider.isNew ? hasOutputValue(provider.userAgent) : provider.hasUserAgent;
  const writesXHwid = output && provider.isNew ? hasOutputValue(provider.xHwid) : provider.hasXHwid;
  const writesUdp = output && provider.isNew ? provider.udp === true : provider.hasUdp;
  const writesTfo = output && provider.isNew ? provider.tfo === true : provider.hasTfo;
  const writesPath = output
    ? provider.isNew
      ? (type === 'http' || provider.hasPath) && hasOutputValue(provider.path)
      : provider.hasPath
    : provider.hasPath;
  const writesInterval = output ? provider.isNew || provider.hasInterval : provider.hasInterval;

  return {
    name: provider.name || '',
    hasType: Boolean(provider.isNew || provider.hasType),
    type: provider.type || '',
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
    customHeaders: normalizeCustomHeaderText(provider.customHeaders),
    hasUdp: Boolean(writesUdp),
    udp: Boolean(provider.udp),
    hasTfo: Boolean(writesTfo),
    tfo: Boolean(provider.tfo),
    hasPath: Boolean(writesPath),
    path: provider.path || '',
    hasInterval: Boolean(writesInterval),
    interval: provider.interval || '',
    hasHealthCheck: Boolean(provider.isNew || provider.hasHealthCheck),
    hasHealthUrl: Boolean(output ? provider.isNew || provider.hasHealthUrl : provider.hasHealthUrl),
    healthUrl: provider.healthUrl || '',
    hasHealthInterval: Boolean(output ? provider.isNew || provider.hasHealthInterval : provider.hasHealthInterval),
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

function snapshotRule(rule) {
  return {
    originalIndex: rule.originalIndex ?? -1,
    type: normalizeRuleType(rule.type),
    value: rule.value || '',
    target: rule.target || '',
    options: (rule.options || []).slice(),
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
  els.providerListActionHome.append(els.addProviderButton, els.providerStatusRefreshButton);
  els.providerSearchInput.value = state.providerSearch;
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
  const providerSearch = state.providerSearch.trim().toLocaleLowerCase('ru-RU');
  const visibleProviders = providerSearch
    ? activeProviders.filter((provider) => {
      const groupNames = getProviderUseGroupNames(provider.name).join(' ');
      return `${provider.name} ${provider.type || ''} ${groupNames}`.toLocaleLowerCase('ru-RU').includes(providerSearch);
    })
    : activeProviders;
  const displayedProvider = visibleProviders.includes(selectedProvider) ? selectedProvider : visibleProviders[0] || selectedProvider;
  els.providersList.classList.toggle('providers-editing', state.providerInspectorEditing || Boolean(displayedProvider?.isNew));
  const registry = document.createElement('div');
  const tableWrap = document.createElement('div');
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const detail = document.createElement('div');

  registry.className = 'providers-registry';
  tableWrap.className = 'providers-table-wrap';
  table.className = 'providers-table';
  thead.innerHTML = '<tr><th>Подписка</th><th>Состояние</th><th>Ноды</th><th>Используется в группах</th><th>Обновлена</th></tr>';

  visibleProviders.forEach((provider) => {
    const index = activeProviders.indexOf(provider);
    tbody.append(createProviderListItem(provider, index, provider === displayedProvider));
  });
  if (visibleProviders.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.className = 'providers-table-empty';
    emptyCell.textContent = 'Подписки по этому запросу не найдены.';
    emptyRow.append(emptyCell);
    tbody.append(emptyRow);
  }
  table.append(thead, tbody);
  tableWrap.append(table);
  registry.append(tableWrap);

  detail.className = 'provider-detail';
  if (state.providerInspectorEditing || displayedProvider?.isNew) {
    detail.classList.add('is-editing');
    detail.append(createProviderEditorHeader(displayedProvider), createProviderEditor(displayedProvider, activeProviders.indexOf(displayedProvider)));
  } else {
    detail.append(createProviderInspector(displayedProvider));
  }
  els.providersList.append(registry, detail);
}

function syncSelectedProvider(activeProviders) {
  const selectedExists = activeProviders.some((provider) => provider.name === state.selectedProviderName);
  state.selectedProviderName = selectedExists ? state.selectedProviderName : activeProviders[0]?.name || '';
}

function getSelectedProvider(activeProviders) {
  return activeProviders.find((provider) => provider.name === state.selectedProviderName) || activeProviders[0] || null;
}

function createProviderListItem(provider, index, isSelected) {
  const row = document.createElement('tr');
  const nameCell = document.createElement('td');
  const nameButton = document.createElement('button');
  const statusCell = document.createElement('td');
  const nodeCell = document.createElement('td');
  const groupsCell = document.createElement('td');
  const updatedCell = document.createElement('td');
  const status = getProviderStatus(provider.name);
  const groups = getProviderUseGroupNames(provider.name);

  row.className = 'provider-list-item';
  row.classList.toggle('is-selected', isSelected);
  row.setAttribute('aria-selected', String(isSelected));
  nameButton.type = 'button';
  nameButton.className = 'provider-name-button';
  nameButton.innerHTML = `<strong></strong><span>${provider.type || 'http'}</span>`;
  nameButton.querySelector('strong').textContent = provider.name || 'Без названия';
  nameButton.setAttribute('aria-label', `Открыть подписку ${index + 1}: ${provider.name || 'Без названия'}`);
  nameCell.append(nameButton);
  statusCell.append(createProviderStatusPill(provider));
  nodeCell.textContent = status?.proxyCount ?? '—';
  groupsCell.textContent = groups.length > 0 ? groups.join(', ') : 'Не используется';
  groupsCell.title = groups.join(', ');
  updatedCell.textContent = formatProviderUpdatedAt(status?.updatedAt) || '—';

  row.append(nameCell, statusCell, nodeCell, groupsCell, updatedCell);
  row.addEventListener('click', () => {
    state.selectedProviderName = provider.name;
    state.providerInspectorEditing = false;
    render();
  });
  return row;
}

function createProviderStatusPill(provider) {
  const pill = document.createElement('span');
  const status = getProviderStatus(provider.name);
  const isUpdating = state.providerUpdatingName === provider.name;
  const hasNodeCount = status?.proxyCount !== null && status?.proxyCount !== undefined;
  const isLive = hasNodeCount && Number(status.proxyCount) > 0;
  pill.className = 'provider-status-pill';
  pill.classList.toggle('is-live', isLive && !isUpdating);
  pill.classList.toggle('is-empty', hasNodeCount && !isLive && !isUpdating);
  pill.classList.toggle('is-loading', isUpdating || state.providerStatusLoading);
  pill.textContent = isUpdating
    ? 'Обновляется'
    : state.providerStatusLoading
      ? 'Проверяется'
      : isLive
        ? 'Работает'
        : hasNodeCount
          ? 'Нет нод'
          : 'Нет данных';
  return pill;
}

function createProviderEditorHeader(provider) {
  const header = document.createElement('div');
  const title = document.createElement('div');
  const close = document.createElement('button');
  header.className = 'provider-editor-mode-head';
  title.innerHTML = '<span>Редактирование подписки</span><strong></strong>';
  title.querySelector('strong').textContent = provider?.name || 'Без названия';
  close.className = 'button compact';
  close.type = 'button';
  close.textContent = 'Закрыть редактор';
  close.hidden = Boolean(provider?.isNew);
  close.addEventListener('click', () => {
    state.providerInspectorEditing = false;
    render();
  });
  header.append(title, close);
  return header;
}

function createProviderInspector(provider) {
  const inspector = document.createElement('article');
  if (!provider) return inspector;

  const status = getProviderStatus(provider.name);
  const groups = getProviderUseGroupNames(provider.name);
  const head = document.createElement('div');
  const title = document.createElement('div');
  const content = document.createElement('div');
  const actions = document.createElement('div');
  const editButton = document.createElement('button');
  const updateButton = document.createElement('button');
  const removeButton = document.createElement('button');

  inspector.className = 'provider-inspector';
  head.className = 'provider-inspector-head';
  title.className = 'provider-inspector-title';
  title.innerHTML = '<strong></strong><span></span>';
  title.querySelector('strong').textContent = provider.name || 'Без названия';
  title.querySelector('span').textContent = provider.type || 'http';
  head.append(title, createProviderStatusPill(provider));

  content.className = 'provider-inspector-content';
  content.append(
    createProviderInspectorSection('Используется в группах', groups.length ? groups : ['Не используется'], 'chips'),
    createProviderInspectorSection('Источник подписки', [state.hideProviderUrls ? maskSensitiveUrl(provider.url) || 'Не указан' : provider.url || 'Не указан'], 'value'),
    createProviderFilterInspectorSection(provider),
    createProviderInspectorSection('Обновление', [
      provider.interval ? `Каждые ${formatDuration(provider.interval)}` : 'Интервал не задан',
      status?.updatedAt ? `Последнее: ${formatProviderUpdatedAt(status.updatedAt)}` : 'Время обновления неизвестно',
    ], 'list'),
  );

  actions.className = 'provider-inspector-actions';
  editButton.className = 'button primary compact';
  editButton.type = 'button';
  editButton.textContent = 'Редактировать';
  editButton.addEventListener('click', () => {
    state.providerInspectorEditing = true;
    render();
  });
  updateButton.className = 'button compact';
  updateButton.type = 'button';
  updateButton.textContent = state.providerUpdatingName === provider.name ? 'Обновление...' : 'Обновить';
  updateButton.hidden = !state.routerApiAvailable;
  updateButton.disabled = !state.routerApiAvailable || provider.isNew || state.providerUpdatingName === provider.name;
  updateButton.addEventListener('click', () => updateProviderNow(provider));
  removeButton.className = 'button compact danger';
  removeButton.type = 'button';
  removeButton.textContent = 'Удалить';
  removeButton.addEventListener('click', () => removeProvider(provider));
  actions.append(editButton, updateButton, removeButton);
  inspector.append(head, content, actions);
  return inspector;
}

function createProviderInspectorSection(label, values, variant) {
  const section = document.createElement('section');
  const title = document.createElement('span');
  const body = document.createElement('div');
  section.className = 'provider-inspector-section';
  title.textContent = label;
  body.className = `provider-inspector-${variant}`;
  values.forEach((value) => {
    const item = document.createElement(variant === 'list' ? 'span' : variant === 'chips' ? 'span' : 'p');
    item.textContent = value;
    body.append(item);
  });
  section.append(title, body);
  return section;
}

function createProviderFilterInspectorSection(provider) {
  const rules = [
    { label: 'Включать', value: String(provider.filter || '').trim() },
    { label: 'Исключать', value: String(provider.excludeFilter || '').trim() },
  ].filter((rule) => rule.value);

  if (!rules.length) {
    return createProviderInspectorSection('Фильтрация нод', ['Не настроено'], 'list');
  }

  const section = document.createElement('details');
  const summary = document.createElement('summary');
  const title = document.createElement('strong');
  const meta = document.createElement('span');
  const count = document.createElement('span');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const iconUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  const body = document.createElement('div');

  section.className = 'provider-inspector-section provider-inspector-filters';
  section.open = window.matchMedia('(min-width: 981px)').matches;
  summary.className = 'provider-inspector-filter-head';
  title.textContent = 'Фильтрация нод';
  count.textContent = `${rules.length} ${rules.length === 1 ? 'правило' : 'правила'}`;
  icon.classList.add('provider-disclosure-icon');
  icon.setAttribute('aria-hidden', 'true');
  iconUse.setAttribute('href', '#icon-chevron-down');
  icon.append(iconUse);
  meta.append(count, icon);
  summary.append(title, meta);
  body.className = 'provider-inspector-filter-rules';
  rules.forEach((rule) => body.append(createProviderFilterRule(rule)));
  section.append(summary, body);
  return section;
}

function createProviderFilterRule(rule) {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const label = document.createElement('span');
  const preview = document.createElement('code');
  const toggle = document.createElement('span');
  const show = document.createElement('span');
  const hide = document.createElement('span');
  const full = document.createElement('code');

  details.className = 'provider-inspector-filter-rule';
  summary.className = 'provider-inspector-filter-rule-head';
  label.className = 'provider-inspector-filter-label';
  label.textContent = rule.label;
  preview.className = 'provider-inspector-filter-preview';
  preview.textContent = rule.value;
  toggle.className = 'provider-inspector-filter-toggle';
  show.className = 'provider-inspector-filter-toggle-show';
  show.textContent = 'Полностью';
  hide.className = 'provider-inspector-filter-toggle-hide';
  hide.textContent = 'Свернуть';
  toggle.append(show, hide);
  summary.append(label, preview, toggle);
  full.className = 'provider-inspector-filter-full';
  full.textContent = rule.value;
  details.append(summary, full);
  return details;
}

function formatDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return `${value} сек`;
  if (seconds % 86400 === 0) return `${seconds / 86400} дн.`;
  if (seconds % 3600 === 0) return `${seconds / 3600} ч`;
  if (seconds % 60 === 0) return `${seconds / 60} мин`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} ч ${Math.floor((seconds % 3600) / 60)} мин`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} мин ${seconds % 60} сек`;
  return `${seconds} сек`;
}

function createProviderEditor(provider, index) {
  const row = els.providerTemplate.content.firstElementChild.cloneNode(true);

  if (!provider) return row;

  row.classList.toggle('is-new', Boolean(provider.highlight));
  row.querySelector('.provider-card-number').textContent = String(index + 1);
  row.querySelector('.provider-card-title').textContent = provider.name || 'Без названия';
  row.querySelector('.provider-card-new').hidden = !provider.isNew;
  renderProviderRuntimeStatus(row, provider);
  bindProviderUrl(row, provider);
  bindHappDecodeButton(row, provider);
  bindProviderName(row, provider);
  bindInput(row, '.provider-filter', provider.filter, (value) => updateProvider(provider, 'filter', value));
  bindInput(row, '.provider-exclude-filter', provider.excludeFilter, (value) => updateProvider(provider, 'excludeFilter', value));
  bindExcludeTypeOptions(row, provider, index);
  markExcludeTypeValidity(row, provider);
  bindInput(row, '.provider-user-agent', provider.userAgent, (value) => updateProvider(provider, 'userAgent', value));
  bindInput(row, '.provider-x-hwid', provider.xHwid, (value) => updateProvider(provider, 'xHwid', value));
  bindInput(row, '.provider-custom-headers', provider.customHeaders, (value) => updateProvider(provider, 'customHeaders', value));
  bindHeaderGenerator(row, provider);
  bindCheckbox(row, '.provider-udp', provider.udp, (checked) => updateProvider(provider, 'udp', checked));
  bindCheckbox(row, '.provider-tfo', provider.tfo, (checked) => updateProvider(provider, 'tfo', checked));
  bindInput(row, '.provider-path', provider.path, (value) => updateProvider(provider, 'path', value));
  bindInput(row, '.provider-interval', provider.interval, (value) => updateProvider(provider, 'interval', value));
  bindInput(row, '.provider-health-url', provider.healthUrl, (value) => updateProvider(provider, 'healthUrl', value));
  bindInput(row, '.provider-health-interval', provider.healthInterval, (value) => updateProvider(provider, 'healthInterval', value));
  bindProviderUpdateButton(row, provider);
  const removeButton = row.querySelector('.remove-provider');
  removeButton.setAttribute('aria-label', `Удалить подписку ${provider.name || 'без названия'}`);
  removeButton.addEventListener('click', () => removeProvider(provider));
  return row;
}

function getProviderStatus(providerName) {
  return state.providerStatuses?.[providerName] || null;
}

function formatProviderListMeta(provider) {
  const status = getProviderStatus(provider.name);
  if (state.providerStatusLoading) return 'Статусы загружаются';
  if (status?.proxyCount !== null && status?.proxyCount !== undefined) return `${formatProxyCount(status.proxyCount)} · ${formatProviderUpdatedAt(status.updatedAt) || 'время неизвестно'}`;
  if (state.routerApiAvailable) return 'Статус не получен';
  return provider.url ? 'URL' : 'Нет ссылки';
}

function bindProviderUrl(root, provider) {
  const input = root.querySelector('.provider-url');
  const revealButton = root.querySelector('.provider-url-reveal-button');
  const decodeStatus = root.querySelector('.provider-url-status');
  let revealed = !state.hideProviderUrls || !provider.url || provider.isNew;
  const renderValue = () => {
    const shouldMask = state.hideProviderUrls && Boolean(provider.url) && !revealed;
    input.type = shouldMask ? 'text' : 'url';
    input.value = shouldMask ? maskSensitiveUrl(provider.url) : provider.url || '';
    input.readOnly = shouldMask;
    input.classList.toggle('is-masked', shouldMask);
    revealButton.hidden = !state.hideProviderUrls || !provider.url;
    revealButton.setAttribute('aria-pressed', String(revealed));
    revealButton.querySelector('span').textContent = revealed ? 'Скрыть' : 'Показать';
  };

  renderValue();
  input.addEventListener('input', () => {
    if (state.happDecodeFeedback?.provider === provider) {
      state.happDecodeFeedback = null;
      decodeStatus.hidden = true;
    }
    updateProvider(provider, 'url', input.value);
  });
  revealButton.addEventListener('click', () => {
    revealed = !revealed;
    renderValue();
    if (revealed) input.focus();
  });
}

function maskSensitiveUrl(value) {
  const source = String(value || '').trim();
  if (!source) return '';
  try {
    const url = new URL(source);
    const segments = url.pathname.split('/').filter(Boolean);
    const visiblePrefix = segments.length > 1 && segments[0].length <= 3 ? `/${segments[0]}` : '';
    return `${url.protocol}//${url.host}${visiblePrefix}/••••••`;
  } catch {
    return '••••••';
  }
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
  if (label) label.textContent = isUpdating ? 'Обновление...' : 'Обновить подписку';
  button.addEventListener('click', () => updateProviderNow(provider));
}

function bindHappDecodeButton(root, provider) {
  const button = root.querySelector('.happ-decode-button');
  const label = button.querySelector('span');
  const status = root.querySelector('.provider-url-status');
  const isVisible = isHappDeepLink(provider.url);
  const isDecoding = state.happDecodeProviderName === provider.name;
  const canDecode = canUseBrowserHappDecryptor();
  const feedback = state.happDecodeFeedback?.provider === provider ? state.happDecodeFeedback : null;

  button.hidden = !isVisible;
  button.disabled = !isVisible || !canDecode || isDecoding;
  button.classList.toggle('is-loading', isDecoding);
  button.setAttribute('aria-busy', isDecoding ? 'true' : 'false');
  button.title = canUseBrowserHappDecryptor()
    ? 'Расшифровать локально в браузере и заменить URL провайдера'
    : 'Браузерный decryptor недоступен';
  if (label) label.textContent = isDecoding ? 'Расшифровка...' : 'Расшифровать Happ';
  status.hidden = !feedback;
  status.className = `provider-url-status${feedback ? ` is-${feedback.severity}` : ''}`;
  status.textContent = feedback?.message || '';
  status.setAttribute('role', feedback?.severity === 'error' ? 'alert' : 'status');
  button.addEventListener('click', () => decodeHappProvider(provider));
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

function renderNodeInventory() {
  const isVisible = state.routerMode && state.routerApiAvailable;
  els.nodeInventoryPanel.classList.toggle('hidden', !isVisible);
  if (!isVisible) {
    if (els.nodeGroupSelections) els.nodeGroupSelections.hidden = true;
    return;
  }

  const nodes = state.mihomoNodes.map(enrichNodeInventoryItem);
  const filtered = nodes.filter(matchesNodeFilters);
  const providerOptions = [...new Set(nodes.map((node) => node.provider).filter(Boolean))].sort(compareText);
  const groupOptions = [...new Set(nodes.flatMap((node) => node.groups).filter(Boolean))].sort(compareText);
  const protocolOptions = [...new Set(nodes.map((node) => node.protocol).filter(Boolean))].sort(compareText);

  replaceFilterOptions(els.nodeProviderFilter, 'Все подписки', providerOptions, state.nodeFilters.provider);
  replaceFilterOptions(els.nodeGroupFilter, 'Все группы', groupOptions, state.nodeFilters.group);
  replaceFilterOptions(els.nodeProtocolFilter, 'Все протоколы', protocolOptions, state.nodeFilters.protocol);
  els.nodeSearchInput.value = state.nodeFilters.search;
  els.nodeStatusFilter.value = state.nodeFilters.status;
  const controlsDisabled = state.nodeInventoryLoading || Boolean(state.nodeInventoryError) || nodes.length === 0;
  const activeFilterCount = Object.values(state.nodeFilters).filter(Boolean).length;
  els.nodeInventoryControls.hidden = Boolean(state.nodeInventoryError) || nodes.length === 0;
  [els.nodeSearchInput, els.nodeProviderFilter, els.nodeGroupFilter, els.nodeProtocolFilter, els.nodeStatusFilter]
    .forEach((control) => { control.disabled = controlsDisabled; });
  els.nodeResetFiltersButton.hidden = controlsDisabled || activeFilterCount === 0;
  els.nodeResetFiltersButton.querySelector('span').textContent = `Сбросить (${activeFilterCount})`;
  els.nodeInventoryRefreshButton.hidden = false;
  els.nodeInventoryRefreshButton.disabled = state.nodeInventoryLoading;
  els.nodeInventoryRefreshButton.querySelector('span').textContent = state.nodeInventoryLoading
    ? 'Загрузка...'
    : state.nodeInventoryError
      ? 'Повторить'
      : 'Обновить';

  renderNodeInventoryStatus(nodes);

  renderNodeGroupSelections(nodes);
  renderNodeInventorySummary(nodes, filtered);
  els.nodeInventoryList.innerHTML = '';

  if (state.nodeInventoryLoading) {
    els.nodeInventoryList.classList.add('empty-state');
    setEmptyState(els.nodeInventoryList, 'Загрузка нод', 'Mihomo отдает текущий список подписок и нод.');
    return;
  }

  if (state.nodeInventoryError) {
    els.nodeInventoryList.classList.add('empty-state');
    setEmptyState(els.nodeInventoryList, 'Ноды недоступны', state.nodeInventoryError);
    const retry = document.createElement('button');
    retry.className = 'button compact';
    retry.type = 'button';
    retry.textContent = 'Повторить загрузку';
    retry.addEventListener('click', () => loadNodeInventory({ silent: false }));
    els.nodeInventoryList.querySelector('.empty-state-content')?.append(retry);
    return;
  }

  if (nodes.length === 0) {
    els.nodeInventoryList.classList.add('empty-state');
    setEmptyState(els.nodeInventoryList, 'Ноды не найдены', 'Mihomo не вернул текущий список нод.');
    return;
  }

  if (filtered.length === 0) {
    els.nodeInventoryList.classList.add('empty-state');
    setEmptyState(els.nodeInventoryList, 'Ничего не найдено', 'Измените поиск или фильтры.');
    return;
  }

  els.nodeInventoryList.classList.remove('empty-state');
  filtered.forEach((node) => {
    els.nodeInventoryList.append(createNodeInventoryCard(node));
  });
}

function renderNodeGroupSelections(nodes) {
  const panel = els.nodeGroupSelections;
  if (!panel) return;

  if (state.nodeInventoryError || state.nodeInventoryLoading || nodes.length === 0) {
    panel.hidden = true;
    panel.textContent = '';
    return;
  }

  panel.hidden = false;
  panel.textContent = '';

  if (state.nodeGroupSelectionsError) {
    panel.classList.add('empty-state');
    setEmptyState(panel, 'Выбор групп недоступен', state.nodeGroupSelectionsError);
    return;
  }

  const items = getNodeGroupSelectionItems(nodes);
  if (items.length === 0) {
    panel.classList.add('empty-state');
    setEmptyState(panel, 'Выбор в группах', 'Группы появятся после загрузки конфига и ответа Mihomo.');
    return;
  }

  const head = document.createElement('div');
  const title = document.createElement('strong');
  const meta = document.createElement('span');
  const list = document.createElement('div');
  const knownCount = items.filter((item) => item.isKnown).length;

  panel.classList.remove('empty-state');
  head.className = 'node-group-selection-head';
  title.textContent = 'Текущий выбор в группах';
  meta.textContent = `${knownCount} из ${items.length}`;
  list.className = 'node-group-selection-list';
  items.forEach((item) => list.append(createNodeGroupSelectionCard(item)));
  head.append(title, meta);
  panel.append(head, list);
}

function getNodeGroupSelectionItems(nodes) {
  const selectionByName = new Map(
    state.mihomoGroupSelections
      .filter((item) => item?.name)
      .map((item) => [normalizeLookupName(item.name), item]),
  );
  const nodeByName = new Map(nodes.map((node) => [normalizeLookupName(node.name), node]));
  const configGroups = state.groups.filter((group) => group.name);
  const groups = configGroups.length > 0
    ? configGroups.map((group) => ({ name: group.name, type: group.type }))
    : state.mihomoGroupSelections.map((group) => ({ name: group.name, type: group.type }));

  return orderNodeGroupSelectionGroups(groups).map((group) => {
    const selection = selectionByName.get(normalizeLookupName(group.name));
    const selectedName = String(selection?.now || '');
    const selectedNode = nodeByName.get(normalizeLookupName(selectedName));
    const selected = selection?.selected || {};
    const selectedType = selectedNode?.protocol || formatNodeProtocol(selected.type);
    const selectedStatusSource = selectedNode || selected;
    const selectedDelay = selectedNode?.delay ?? normalizeNodeDelay(selected.delay);

    return {
      groupName: group.name,
      groupType: group.type || selection?.type || 'group',
      selectedName,
      selectedDisplayName: selectedNode?.displayName || stripNodeFlagEmoji(selectedName) || 'не выбрано',
      selectedType,
      statusKey: getNodeStatusKey(selectedStatusSource),
      statusText: formatNodeStatus(selectedStatusSource),
      delay: selectedDelay,
      optionCount: Array.isArray(selection?.all) ? selection.all.length : null,
      options: Array.isArray(selection?.all) ? selection.all.map((name) => String(name || '')).filter(Boolean) : [],
      isKnown: Boolean(selection),
    };
  });
}

function orderNodeGroupSelectionGroups(groups) {
  const mainGroup = findMainGroup(state.groups);
  if (!mainGroup?.name) return groups;

  const mainName = normalizeLookupName(mainGroup.name);
  const childOrder = new Map(
    getExplicitGroupOptions(mainGroup).map((name, index) => [normalizeLookupName(name), index + 1]),
  );

  return groups
    .map((group, index) => ({ group, index }))
    .sort((left, right) => {
      const leftName = normalizeLookupName(left.group.name);
      const rightName = normalizeLookupName(right.group.name);
      const leftOrder = leftName === mainName ? 0 : childOrder.get(leftName) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = rightName === mainName ? 0 : childOrder.get(rightName) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.index - right.index;
    })
    .map((item) => item.group);
}

function createNodeGroupSelectionCard(item) {
  const card = document.createElement('article');
  const titleRow = document.createElement('div');
  const title = document.createElement('strong');
  const meta = document.createElement('span');
  const current = document.createElement('div');
  const label = document.createElement('span');
  const name = document.createElement('span');
  const badges = document.createElement('div');

  card.className = 'node-group-selection-card';
  card.classList.toggle('is-missing', !item.isKnown);
  titleRow.className = 'node-group-selection-title';
  title.textContent = item.groupName || 'Без названия';
  meta.textContent = formatNodeGroupSelectionMeta(item);
  current.className = 'node-group-selection-current';
  label.className = 'node-group-selection-label';
  label.textContent = 'Сейчас';
  name.className = 'node-group-selection-name';
  name.textContent = item.isKnown ? item.selectedDisplayName : 'нет данных Mihomo';
  badges.className = 'node-badges';

  if (item.isKnown && item.selectedName) {
    badges.append(createNodeBadge(formatNodeGroupChoiceType(item), 'is-protocol'));
    if (item.statusKey !== 'unknown') badges.append(createNodeBadge(item.statusText, `is-${item.statusKey}`));
    if (item.delay !== null) badges.append(createNodeBadge(`${item.delay} ms`, ''));
  } else {
    badges.append(createNodeBadge(item.isKnown ? 'не выбрано' : 'нет в API', item.isKnown ? '' : 'is-dead'));
  }

  titleRow.append(title, meta);
  current.append(label, name);
  card.append(titleRow, current, badges);
  if (isSelectableNodeGroup(item)) {
    const actions = document.createElement('div');
    const choiceLabel = document.createElement('label');
    const choiceText = document.createElement('span');
    const select = document.createElement('select');
    const button = document.createElement('button');
    const isBusy = state.nodeGroupSelectingName === item.groupName;

    actions.className = 'node-group-selection-actions';
    choiceLabel.className = 'node-group-selection-choice';
    choiceText.textContent = 'Активный вариант';
    select.setAttribute('aria-label', `Активный вариант группы ${item.groupName}`);
    item.options.forEach((optionName) => {
      const option = document.createElement('option');
      option.value = optionName;
      option.textContent = stripNodeFlagEmoji(optionName) || optionName;
      select.append(option);
    });
    select.value = item.selectedName;
    select.disabled = isBusy;
    button.className = 'button compact';
    button.type = 'button';
    button.textContent = isBusy ? 'Переключение…' : 'Сменить';
    const syncButton = () => {
      button.disabled = isBusy || !select.value || select.value === item.selectedName;
    };
    select.addEventListener('change', syncButton);
    button.addEventListener('click', () => selectNodeGroup(item.groupName, select.value));
    syncButton();
    choiceLabel.append(choiceText, select);
    actions.append(choiceLabel, button);
    card.append(actions);
  }
  return card;
}

function isSelectableNodeGroup(item) {
  const type = String(item?.groupType || '').trim().toLowerCase();
  return item?.isKnown && ['select', 'selector'].includes(type) && Array.isArray(item.options) && item.options.length > 0;
}

async function selectNodeGroup(groupName, proxyName) {
  if (!groupName || !proxyName || state.nodeGroupSelectingName) return;
  state.nodeGroupSelectingName = groupName;
  renderNodeInventory();
  try {
    const data = await apiJson('/api/groups/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: groupName, name: proxyName }),
    });
    await loadNodeInventory({ silent: true });
    showMessage(`Группа ${groupName}: активен ${data.now || proxyName}.`, { severity: 'success' });
  } catch (error) {
    await loadNodeInventory({ silent: true });
    showMessage(
      error?.data?.uncertain
        ? `Mihomo не подтвердил переключение группы ${groupName}.`
        : `Не удалось переключить группу ${groupName}.`,
      { severity: 'error', details: error?.message || String(error) },
    );
  } finally {
    state.nodeGroupSelectingName = '';
    renderNodeInventory();
  }
}

function formatNodeGroupSelectionMeta(item) {
  const parts = [item.groupType || 'group'];
  if (item.optionCount !== null) parts.push(formatRouteCount(item.optionCount, 'вариант', 'варианта', 'вариантов'));
  return parts.join(' · ');
}

function formatNodeGroupChoiceType(item) {
  if (BUILT_IN_OUTBOUNDS.has(String(item.selectedName || '').toUpperCase())) return 'встроенный выход';
  return item.selectedType && item.selectedType !== 'UNKNOWN' ? item.selectedType : 'вариант';
}

function enrichNodeInventoryItem(node) {
  const name = String(node.name || '');
  const provider = String(node.provider || '');
  const protocol = formatNodeProtocol(node.type);
  const flagCode = getNodeFlagCode(name);
  const flagEmoji = getNodeFlagEmoji(name);
  const useNativeFlagEmoji = Boolean(flagEmoji && shouldUseNativeFlagEmoji());
  return {
    name,
    displayName: flagCode ? stripNodeFlagEmoji(name) : name,
    provider,
    protocol,
    groups: getProviderUseGroupNames(provider),
    alive: node.alive,
    udp: node.udp,
    delay: normalizeNodeDelay(node.delay),
    flagCode,
    flagEmoji: useNativeFlagEmoji ? flagEmoji : '',
    flagImage: !useNativeFlagEmoji && flagCode ? getNodeFlagDataUri(flagCode) : '',
  };
}

function matchesNodeFilters(node) {
  const query = normalizeNodeSearch(state.nodeFilters.search);
  if (state.nodeFilters.provider && node.provider !== state.nodeFilters.provider) return false;
  if (state.nodeFilters.group && !node.groups.includes(state.nodeFilters.group)) return false;
  if (state.nodeFilters.protocol && node.protocol !== state.nodeFilters.protocol) return false;
  if (state.nodeFilters.status && getNodeStatusKey(node) !== state.nodeFilters.status) return false;
  if (!query) return true;

  return normalizeNodeSearch([node.name, node.provider, node.protocol, node.groups.join(' ')].join(' ')).includes(query);
}

function renderNodeInventorySummary(nodes, filtered) {
  const providerCount = new Set(nodes.map((node) => node.provider).filter(Boolean)).size;
  const protocolCount = new Set(nodes.map((node) => node.protocol).filter(Boolean)).size;
  const summary = els.nodeInventorySummary.closest('.node-inventory-summary');

  if (state.nodeInventoryLoading || state.nodeInventoryError || nodes.length === 0) {
    summary.hidden = true;
    return;
  }

  summary.hidden = false;
  els.nodeInventorySummary.textContent = `${formatProxyCount(filtered.length)} из ${formatProxyCount(nodes.length)} · ${providerCount} подписок · ${protocolCount} протоколов`;
}

function renderNodeInventoryStatus(nodes) {
  const availableCount = nodes.filter((node) => node.alive === true).length;
  const updatedAt = state.nodeInventoryUpdatedAt ? formatServiceHealthTime(state.nodeInventoryUpdatedAt) : '';
  els.nodeInventoryStatus.classList.remove('is-success', 'is-warning', 'is-danger');

  if (state.nodeInventoryLoading) {
    els.nodeInventoryStatus.textContent = 'Получаем актуальный список из Mihomo...';
    return;
  }

  if (state.nodeInventoryError) {
    els.nodeInventoryStatus.textContent = state.nodeInventoryError;
    els.nodeInventoryStatus.classList.add('is-danger');
    return;
  }

  if (nodes.length === 0) {
    els.nodeInventoryStatus.textContent = 'Mihomo не вернул текущий список нод';
    els.nodeInventoryStatus.classList.add('is-warning');
    return;
  }

  const unavailableCount = nodes.length - availableCount;
  const parts = [`${availableCount} из ${nodes.length} доступны`];
  if (unavailableCount > 0) parts.push(`${unavailableCount} без ответа`);
  if (updatedAt) parts.push(`обновлено ${updatedAt}`);
  els.nodeInventoryStatus.textContent = parts.join(' · ');
  els.nodeInventoryStatus.classList.add(unavailableCount > 0 ? 'is-warning' : 'is-success');
}

function replaceFilterOptions(select, allLabel, values, selected) {
  select.textContent = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = allLabel;
  select.append(allOption);

  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });

  select.value = values.includes(selected) ? selected : '';
  if (select.value !== selected) {
    if (select === els.nodeProviderFilter) state.nodeFilters.provider = '';
    if (select === els.nodeGroupFilter) state.nodeFilters.group = '';
    if (select === els.nodeProtocolFilter) state.nodeFilters.protocol = '';
  }
}

function createNodeInventoryCard(node) {
  const card = document.createElement('article');
  const flag = document.createElement('button');
  const body = document.createElement('div');
  const titleRow = document.createElement('div');
  const title = document.createElement('button');
  const badges = document.createElement('div');
  const meta = document.createElement('div');
  const groups = document.createElement('div');
  const protocolBadge = createNodeProtocolBadge(node);
  const hasFlag = Boolean(node.flagEmoji || node.flagImage);

  card.className = 'node-card';
  card.classList.toggle('has-inline-flag', !hasFlag);
  body.className = 'node-card-body';
  titleRow.className = 'node-card-title';
  title.type = 'button';
  title.className = 'node-name-button';
  title.textContent = node.displayName || 'Без названия';
  title.addEventListener('click', () => showNodeNameAction(card, node));
  badges.className = 'node-badges';
  badges.append(
    protocolBadge,
    createNodeBadge(formatNodeStatus(node), `is-${getNodeStatusKey(node)}`),
  );
  if (node.delay !== null) badges.append(createNodeBadge(`${node.delay} ms`, ''));
  if (node.udp === true) badges.append(createNodeBadge('UDP', ''));
  meta.className = 'node-card-meta';
  meta.textContent = node.provider || 'Без подписки';
  groups.className = 'node-card-groups';
  groups.textContent = node.groups.length ? `Группы: ${node.groups.join(', ')}` : 'Не подключена к use-группе';

  titleRow.append(title, badges);
  body.append(titleRow, meta, groups);
  if (hasFlag) {
    flag.className = node.flagEmoji ? 'node-flag is-emoji' : 'node-flag';
    flag.type = 'button';
    flag.title = node.flagCode || node.flagEmoji;
    flag.setAttribute('aria-label', node.flagCode || node.flagEmoji);
    if (node.flagEmoji) {
      flag.textContent = node.flagEmoji;
    } else if (flag.style) {
      flag.style.backgroundImage = `url("${node.flagImage}")`;
    }
    flag.addEventListener('click', () => showNodeNameAction(card, node));
    card.append(flag, body);
  } else {
    card.append(body);
  }
  return card;
}

function createNodeProtocolBadge(node) {
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'node-badge node-badge-button is-protocol';
  badge.textContent = node.protocol || 'UNKNOWN';
  badge.addEventListener('click', () => showNodeProtocolAction(badge.closest('.node-card'), node));
  return badge;
}

function createNodeBadge(text, className) {
  const badge = document.createElement('span');
  badge.className = className ? `node-badge ${className}` : 'node-badge';
  badge.textContent = text;
  return badge;
}

function showNodeNameAction(card, node) {
  if (!card) return;
  closeNodeActionForms();

  const provider = getNodeActionProvider(node);
  if (!provider) {
    showMessage(`Подписка ${node.provider || 'без имени'} не найдена в текущем конфиге.`);
    return;
  }

  const panel = createNodeActionPanel('Настройка по названию', provider.name);
  const label = document.createElement('label');
  const labelText = document.createElement('span');
  const input = document.createElement('input');
  const actions = document.createElement('div');
  const keepButton = document.createElement('button');
  const excludeButton = document.createElement('button');
  const cancelButton = document.createElement('button');

  label.className = 'node-action-field';
  labelText.textContent = 'Текст для правила';
  input.type = 'text';
  input.value = suggestNodeNameFilter(node);
  input.autocomplete = 'off';
  actions.className = 'node-action-buttons';
  keepButton.type = 'button';
  keepButton.className = 'button compact';
  keepButton.textContent = 'Фильтровать';
  excludeButton.type = 'button';
  excludeButton.className = 'button compact';
  excludeButton.textContent = 'Исключить';
  cancelButton.type = 'button';
  cancelButton.className = 'button compact ghost';
  cancelButton.textContent = 'Отмена';

  keepButton.addEventListener('click', () => applyNodeNameFilter(provider, 'filter', input.value));
  excludeButton.addEventListener('click', () => applyNodeNameFilter(provider, 'excludeFilter', input.value));
  cancelButton.addEventListener('click', closeNodeActionForms);
  label.append(labelText, input);
  actions.append(keepButton, excludeButton, cancelButton);
  panel.append(label, actions);
  card.append(panel);
  input.focus();
  input.select();
}

function showNodeProtocolAction(card, node) {
  if (!card) return;
  closeNodeActionForms();

  const provider = getNodeActionProvider(node);
  if (!provider) {
    showMessage(`Подписка ${node.provider || 'без имени'} не найдена в текущем конфиге.`);
    return;
  }

  const protocol = String(node.protocol || '').trim();
  const excludeType = protocol.toLowerCase();
  const panel = createNodeActionPanel(`Протокол ${protocol || 'UNKNOWN'}`, provider.name);
  const actions = document.createElement('div');
  const filterButton = document.createElement('button');
  const excludeButton = document.createElement('button');
  const cancelButton = document.createElement('button');

  actions.className = 'node-action-buttons';
  filterButton.type = 'button';
  filterButton.className = 'button compact';
  filterButton.textContent = `Фильтровать список по ${protocol || 'UNKNOWN'}`;
  excludeButton.type = 'button';
  excludeButton.className = 'button compact';
  excludeButton.textContent = `Исключить ${protocol || 'UNKNOWN'} из подписки`;
  cancelButton.type = 'button';
  cancelButton.className = 'button compact ghost';
  cancelButton.textContent = 'Отмена';

  filterButton.addEventListener('click', () => applyNodeProtocolScreenFilter(protocol));
  excludeButton.addEventListener('click', () => applyNodeProtocolExclude(provider, excludeType));
  cancelButton.addEventListener('click', closeNodeActionForms);
  actions.append(filterButton, excludeButton, cancelButton);
  panel.append(actions);
  card.append(panel);
}

function createNodeActionPanel(title, providerName) {
  const panel = document.createElement('form');
  const head = document.createElement('div');
  const titleEl = document.createElement('strong');
  const providerEl = document.createElement('span');

  panel.className = 'node-card-action';
  panel.addEventListener('submit', (event) => event.preventDefault());
  head.className = 'node-action-head';
  titleEl.textContent = title;
  providerEl.textContent = `Подписка: ${providerName}`;
  head.append(titleEl, providerEl);
  panel.append(head);
  return panel;
}

function closeNodeActionForms() {
  els.nodeInventoryList.querySelectorAll('.node-card-action').forEach((panel) => panel.remove());
}

function getNodeActionProvider(node) {
  return state.providers.find((provider) => !provider.deleted && provider.name === node.provider) || null;
}

function applyNodeNameFilter(provider, key, rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) {
    showMessage('Введите текст для правила.');
    return;
  }

  provider[key] = appendPipeValue(provider[key], value);
  state.selectedProviderName = provider.name;
  generateOutput();
  render();
  showMessage(`Подписка ${provider.name}: ${key === 'filter' ? 'фильтрация' : 'исключение'} по названию обновлено.`);
}

function applyNodeProtocolScreenFilter(protocol) {
  state.nodeFilters.protocol = protocol;
  renderNodeInventory();
  showMessage(`Список нод отфильтрован по протоколу ${protocol}. Конфиг не изменён.`);
}

function applyNodeProtocolExclude(provider, protocol) {
  if (!ALLOWED_EXCLUDE_TYPES.has(protocol)) {
    showMessage(`Протокол ${protocol || 'unknown'} нельзя добавить в исключения.`);
    return;
  }

  provider.excludeType = appendPipeValue(provider.excludeType, protocol);
  state.selectedProviderName = provider.name;
  generateOutput();
  render();
  showMessage(`Подписка ${provider.name}: протокол добавлен в исключения.`);
}

function appendPipeValue(current, value) {
  const parts = String(current || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const exists = parts.some((part) => part.toLowerCase() === value.toLowerCase());
  return exists ? parts.join('|') : [...parts, value].join('|');
}

function suggestNodeNameFilter(node) {
  const value = stripNodeVisualPrefix(node.displayName || node.name);
  const firstPart = value.split(/[-–—|,;/()[\]{}]+/u)[0]?.trim() || value;
  const word = firstPart.match(/[a-zа-яё]+/iu)?.[0] || firstPart;
  return word.trim() || value.trim();
}

function stripNodeVisualPrefix(value) {
  return stripNodeFlagEmoji(value).replace(/^[^a-zа-яё0-9]+/iu, '').trim();
}

function formatNodeProtocol(type) {
  return String(type || 'unknown').trim().toUpperCase();
}

function getNodeStatusKey(node) {
  if (node.alive === true) return 'alive';
  if (node.alive === false) return 'dead';
  return 'unknown';
}

function formatNodeStatus(node) {
  const status = getNodeStatusKey(node);
  if (status === 'alive') return 'доступна';
  if (status === 'dead') return 'нет ответа';
  return 'без статуса';
}

function normalizeNodeDelay(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeNodeSearch(value) {
  return String(value || '').trim().toLowerCase();
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'ru');
}

function getNodeFlagCode(name) {
  return getFlagEmojiCountryCode(name) || getNodeCountryCode(name);
}

function getNodeFlagEmoji(value) {
  const match = String(value || '').match(FLAG_EMOJI_PATTERN);
  return match ? match[0] : '';
}

function getFlagEmojiCountryCode(value) {
  const match = String(value || '').match(FLAG_EMOJI_PATTERN);
  if (!match) return '';

  const code = Array.from(match[0])
    .map((letter) => String.fromCharCode(letter.codePointAt(0) - 127397))
    .join('');
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

function stripNodeFlagEmoji(value) {
  return String(value || '').replace(FLAG_EMOJI_PATTERN, '').replace(/\s+/g, ' ').trim();
}

function shouldUseNativeFlagEmoji() {
  if (flagEmojiSupportCache !== null) return flagEmojiSupportCache;
  flagEmojiSupportCache = detectNativeFlagEmojiSupport();
  return flagEmojiSupportCache;
}

function detectNativeFlagEmojiSupport() {
  if (typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  const context = canvas?.getContext?.('2d');
  if (!context) return false;

  canvas.width = 32;
  canvas.height = 32;
  context.clearRect(0, 0, 32, 32);
  context.font = '24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  context.fillText(NATIVE_FLAG_TEST_EMOJI, 0, 24);

  let data;
  try {
    data = context.getImageData(0, 0, 32, 32).data;
  } catch (error) {
    return false;
  }

  const colors = new Set();
  for (let index = 0; index < data.length; index += 16) {
    if (data[index + 3] < 16) continue;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    if (Math.max(red, green, blue) - Math.min(red, green, blue) < 8) continue;
    colors.add(`${red >> 4}-${green >> 4}-${blue >> 4}`);
    if (colors.size >= 3) return true;
  }

  return false;
}

function getNodeCountryCode(value) {
  const normalized = String(value || '').toLowerCase().replace(/[^a-zа-я0-9]+/giu, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const code = NODE_COUNTRY_CODES.get(token);
    if (code) return code;
  }

  const compact = tokens.join('');
  for (const [key, code] of NODE_COUNTRY_CODES) {
    if (key.length > 2 && compact.includes(key)) return code;
  }

  return '';
}

function getNodeFlagDataUri(code) {
  return `data:image/svg+xml,${encodeURIComponent(createNodeFlagSvg(code))}`;
}

function createNodeFlagSvg(code) {
  const flagCode = String(code || '').toUpperCase().slice(0, 2);
  const pattern = NODE_FLAG_PATTERNS[flagCode] || { type: 'code', colors: ['#f8fafc', '#dbeafe'] };
  const content = renderNodeFlagPattern(flagCode, pattern);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 26">${content}<rect x=".5" y=".5" width="35" height="25" rx="3" fill="none" stroke="rgba(15,23,42,.16)"/></svg>`;
}

function renderNodeFlagPattern(code, pattern) {
  if (pattern.type === 'h') return renderFlagStripes(pattern.colors, false);
  if (pattern.type === 'v') return renderFlagStripes(pattern.colors, true);
  if (pattern.type === 'nordic') {
    return `<rect width="36" height="26" fill="${pattern.background}"/><rect x="10" width="5" height="26" fill="${pattern.cross}"/><rect y="10" width="36" height="5" fill="${pattern.cross}"/>`;
  }
  if (pattern.type === 'swiss') {
    return '<rect width="36" height="26" fill="#d52b1e"/><rect x="15" y="6" width="6" height="14" fill="#fff"/><rect x="11" y="10" width="14" height="6" fill="#fff"/>';
  }
  if (pattern.type === 'circle') {
    return `<rect width="36" height="26" fill="${pattern.background}"/><circle cx="18" cy="13" r="6.5" fill="${pattern.circle}"/>`;
  }
  if (pattern.type === 'gb') return renderGbFlag();
  if (pattern.type === 'us') return renderUsFlag();
  if (pattern.type === 'au') return renderAuFlag();
  if (pattern.type === 'br') return renderBrFlag();
  if (pattern.type === 'cn') return renderCnFlag();
  if (pattern.type === 'hk') return renderHkFlag();
  if (pattern.type === 'hr') return renderHrFlag();
  if (pattern.type === 'il') return renderIlFlag();
  if (pattern.type === 'kr') return renderKrFlag();
  if (pattern.type === 'kz') return renderKzFlag();
  if (pattern.type === 'md') return renderMdFlag();
  if (pattern.type === 'mx') return renderMxFlag();
  if (pattern.type === 'my') return renderMyFlag();
  if (pattern.type === 'no') return renderNoFlag();
  if (pattern.type === 'pt') return renderPtFlag();
  if (pattern.type === 'sk') return renderSkFlag();
  if (pattern.type === 'tr') return renderTrFlag();
  if (pattern.type === 'vn') return renderVnFlag();
  if (pattern.type === 'za') return renderZaFlag();
  if (pattern.type === 'ae') {
    return '<rect width="36" height="26" fill="#fff"/><rect y="0" width="36" height="8.667" fill="#009a44"/><rect y="17.333" width="36" height="8.667" fill="#000"/><rect width="10" height="26" fill="#ce1126"/>';
  }
  if (pattern.type === 'plain') return `<rect width="36" height="26" fill="${pattern.color}"/>`;
  return `<rect width="36" height="26" fill="${pattern.colors[0]}"/><path d="M0 0H36V26H0Z" fill="${pattern.colors[1]}" opacity=".55"/><text x="18" y="17" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#0f172a">${code}</text>`;
}

function renderFlagStripes(colors, vertical) {
  return colors.map((color, index) => {
    const size = 100 / colors.length;
    const x = vertical ? `${index * size}%` : '0';
    const y = vertical ? '0' : `${index * size}%`;
    const width = vertical ? `${size}%` : '36';
    const height = vertical ? '26' : `${size}%`;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}"/>`;
  }).join('');
}

function renderGbFlag() {
  return '<rect width="36" height="26" fill="#012169"/><path d="M0 0L36 26M36 0L0 26" stroke="#fff" stroke-width="6"/><path d="M0 0L36 26M36 0L0 26" stroke="#c8102e" stroke-width="3"/><path d="M18 0V26M0 13H36" stroke="#fff" stroke-width="9"/><path d="M18 0V26M0 13H36" stroke="#c8102e" stroke-width="5"/>';
}

function renderUsFlag() {
  const stripes = Array.from({ length: 13 }, (_, index) => `<rect y="${index * 2}" width="36" height="2" fill="${index % 2 === 0 ? '#b22234' : '#fff'}"/>`).join('');
  return `${stripes}<rect width="16" height="14" fill="#3c3b6e"/>`;
}

function renderAuFlag() {
  return `<rect width="36" height="26" fill="#012169"/><g transform="scale(.46 .5)">${renderGbFlag()}</g>${renderStar(27, 7, 3.2, 1.3, '#fff')}${renderStar(23, 16, 2.4, 1, '#fff')}${renderStar(30, 14, 2.1, .9, '#fff')}${renderStar(27, 21, 2.1, .9, '#fff')}`;
}

function renderBrFlag() {
  return '<rect width="36" height="26" fill="#009c3b"/><path d="M18 3L33 13L18 23L3 13Z" fill="#ffdf00"/><circle cx="18" cy="13" r="5.7" fill="#002776"/><path d="M12.7 11.5c3.8-1.2 7.6-.8 11 1.3" fill="none" stroke="#fff" stroke-width="1.1"/>';
}

function renderCnFlag() {
  return `<rect width="36" height="26" fill="#de2910"/>${renderStar(8, 7, 4, 1.7, '#ffde00')}${renderStar(15, 4, 1.6, 0.7, '#ffde00')}${renderStar(18, 8, 1.6, 0.7, '#ffde00')}`;
}

function renderHkFlag() {
  const petals = Array.from({ length: 5 }, (_, index) => {
    const angle = (index * 72 - 90) * Math.PI / 180;
    const x = 18 + Math.cos(angle) * 4.2;
    const y = 13 + Math.sin(angle) * 4.2;
    return `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="2" ry="4" fill="#fff" transform="rotate(${index * 72} ${x.toFixed(2)} ${y.toFixed(2)})"/>`;
  }).join('');
  return `<rect width="36" height="26" fill="#de2910"/>${petals}`;
}

function renderHrFlag() {
  return '<rect width="36" height="8.667" fill="#f00"/><rect y="8.667" width="36" height="8.667" fill="#fff"/><rect y="17.333" width="36" height="8.667" fill="#171796"/><rect x="14" y="7" width="8" height="10" fill="#fff"/><rect x="14" y="7" width="2.67" height="2.5" fill="#f00"/><rect x="19.33" y="7" width="2.67" height="2.5" fill="#f00"/><rect x="16.67" y="9.5" width="2.67" height="2.5" fill="#f00"/><rect x="14" y="12" width="2.67" height="2.5" fill="#f00"/><rect x="19.33" y="12" width="2.67" height="2.5" fill="#f00"/><rect x="16.67" y="14.5" width="2.67" height="2.5" fill="#f00"/>';
}

function renderIlFlag() {
  return '<rect width="36" height="26" fill="#fff"/><rect y="4" width="36" height="3" fill="#0038b8"/><rect y="19" width="36" height="3" fill="#0038b8"/><path d="M18 8L23 17H13Z" fill="none" stroke="#0038b8" stroke-width="1.4"/><path d="M18 18L13 9H23Z" fill="none" stroke="#0038b8" stroke-width="1.4"/>';
}

function renderKrFlag() {
  return '<rect width="36" height="26" fill="#fff"/><circle cx="18" cy="13" r="6" fill="#c60c30"/><path d="M12 13a6 6 0 0 0 12 0a3 3 0 0 0-6 0a3 3 0 0 1-6 0Z" fill="#003478"/><path d="M7 6l5 2M6 9l5 2M25 6l5-2M24 9l5-2M7 20l5-2M6 17l5-2M25 20l5 2M24 17l5 2" stroke="#111" stroke-width="1.5"/>';
}

function renderKzFlag() {
  return `<rect width="36" height="26" fill="#00afca"/><rect x="3" y="3" width="2" height="20" fill="#f6c344"/><circle cx="20" cy="12" r="4" fill="#f6c344"/>${renderStar(20, 18, 4, 1.8, '#f6c344')}`;
}

function renderMdFlag() {
  return '<rect width="12" height="26" fill="#0033a0"/><rect x="12" width="12" height="26" fill="#ffd200"/><rect x="24" width="12" height="26" fill="#cc092f"/><rect x="16" y="9" width="4" height="7" fill="#8b4513"/>';
}

function renderMxFlag() {
  return '<rect width="12" height="26" fill="#006847"/><rect x="12" width="12" height="26" fill="#fff"/><rect x="24" width="12" height="26" fill="#ce1126"/><circle cx="18" cy="13" r="2.7" fill="#8c6b2f"/>';
}

function renderMyFlag() {
  const stripes = Array.from({ length: 7 }, (_, index) => `<rect y="${index * 4}" width="36" height="2" fill="#cc0001"/>`).join('');
  return `<rect width="36" height="26" fill="#fff"/>${stripes}<rect width="18" height="14" fill="#010066"/><circle cx="8" cy="7" r="5" fill="#ffcc00"/><circle cx="10" cy="7" r="4" fill="#010066"/>${renderStar(14, 7, 3, 1.2, '#ffcc00')}`;
}

function renderNoFlag() {
  return '<rect width="36" height="26" fill="#ba0c2f"/><rect x="10" width="7" height="26" fill="#fff"/><rect y="9" width="36" height="8" fill="#fff"/><rect x="12" width="3" height="26" fill="#00205b"/><rect y="11" width="36" height="4" fill="#00205b"/>';
}

function renderPtFlag() {
  return '<rect width="14" height="26" fill="#006600"/><rect x="14" width="22" height="26" fill="#ff0000"/><circle cx="14" cy="13" r="4" fill="#ffcc00"/><circle cx="14" cy="13" r="2.4" fill="#fff"/>';
}

function renderSkFlag() {
  return '<rect width="36" height="8.667" fill="#fff"/><rect y="8.667" width="36" height="8.667" fill="#0b4ea2"/><rect y="17.333" width="36" height="8.667" fill="#ee1c25"/><path d="M10 8h8v7c0 4-4 6-4 6s-4-2-4-6Z" fill="#ee1c25" stroke="#fff" stroke-width="1"/><path d="M12 12h4M14 10v7" stroke="#fff" stroke-width="1.2"/>';
}

function renderTrFlag() {
  return `<rect width="36" height="26" fill="#e30a17"/><circle cx="15" cy="13" r="6" fill="#fff"/><circle cx="17.5" cy="13" r="4.8" fill="#e30a17"/>${renderStar(24, 13, 3.3, 1.4, '#fff')}`;
}

function renderVnFlag() {
  return `<rect width="36" height="26" fill="#da251d"/>${renderStar(18, 13, 7, 3, '#ffde00')}`;
}

function renderZaFlag() {
  return '<rect width="36" height="13" fill="#de3831"/><rect y="13" width="36" height="13" fill="#002395"/><path d="M0 0L18 13L0 26Z" fill="#000"/><path d="M0 0L19 13L0 26" fill="none" stroke="#ffb612" stroke-width="8"/><path d="M0 0L19 13L0 26" fill="none" stroke="#fff" stroke-width="5"/><path d="M0 0L19 13L36 13M19 13L0 26" fill="none" stroke="#007a4d" stroke-width="4"/>';
}

function renderStar(cx, cy, outerRadius, innerRadius, fill) {
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = (-90 + index * 36) * Math.PI / 180;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
  return `<polygon points="${points}" fill="${fill}"/>`;
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
  input.addEventListener('input', () => updateProviderNameDraft(provider, input.value, root));
  input.addEventListener('blur', () => render());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur();
  });
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

function renderRulesEditor() {
  if (!els.rulesEditorList) return;

  const activeRules = getActiveRules();
  const visibleRules = activeRules.filter(matchesRuleFilters);
  const typeOptions = [...new Set(activeRules.map((rule) => normalizeRuleType(rule.type)).filter(Boolean))].sort(compareText);
  const targetOptions = [...new Set(activeRules.map((rule) => String(rule.target || '').trim()).filter(Boolean))].sort(compareText);

  replaceRuleFilterOptions(els.ruleTypeFilter, 'Все типы', typeOptions, state.ruleFilters.type);
  replaceRuleFilterOptions(els.ruleTargetFilter, 'Все цели', targetOptions, state.ruleFilters.target);
  els.ruleSearchInput.value = state.ruleFilters.search;
  els.rulesViewCount.textContent = String(activeRules.length);
  const rulesViewTab = [...els.routingViewTabs].find((button) => button.dataset.routingView === 'rules');
  if (rulesViewTab) rulesViewTab.setAttribute('aria-label', `Правила, ${activeRules.length}`);
  els.rulesFilterSummary.textContent = `Показано ${visibleRules.length} из ${activeRules.length}`;
  renderRulesSummary(activeRules);
  els.rulesEditorList.innerHTML = '';
  els.rulesEditorList.classList.toggle('empty-state', !state.originalText || activeRules.length === 0);

  if (!state.originalText) {
    setEmptyState(els.rulesEditorList, 'Правила появятся после загрузки', 'Загрузите конфигурацию, чтобы редактировать rules.');
    setEmptyState(els.ruleInspector, 'Выберите правило', 'Справа появится его роль в маршрутизации.');
    return;
  }

  if (activeRules.length === 0) {
    setEmptyState(els.rulesEditorList, 'Нет правил маршрутизации', 'Добавьте правило, чтобы направить трафик в группу или встроенный выход.');
    setEmptyState(els.ruleInspector, 'Нет выбранного правила', 'Добавьте первое правило маршрутизации.');
    return;
  }

  if (visibleRules.length === 0) {
    els.rulesEditorList.classList.add('empty-state');
    setEmptyState(els.rulesEditorList, 'Правила не найдены', 'Измените поиск или фильтры. Порядок YAML не изменен.');
    setEmptyState(els.ruleInspector, 'Правила не найдены', 'Измените поиск или фильтры, чтобы выбрать правило.');
    return;
  }

  els.rulesEditorList.classList.remove('empty-state');
  const selectedRule = ensureSelectedRule(visibleRules);
  visibleRules.forEach((rule) => {
    const index = activeRules.indexOf(rule);
    els.rulesEditorList.append(createRuleRegistryRow(rule, index, activeRules));
  });
  renderRuleInspector(selectedRule, activeRules);
}

function ensureSelectedRule(visibleRules) {
  const selected = visibleRules.find((rule) => rule.id === state.selectedRuleId) || visibleRules[0] || null;
  state.selectedRuleId = selected?.id || '';
  return selected;
}

function renderRulesSummary(activeRules) {
  if (!els.rulesOrderSummary || !els.rulesTargetSummary) return;
  const orderState = getRulesOrderState(activeRules);
  els.rulesOrderSummary.textContent = activeRules.length > 0
    ? `${formatRouteCount(activeRules.length, 'правило', 'правила', 'правил')} · ${orderState.label}`
    : 'Правила не настроены';
  els.rulesOrderSummary.className = `rules-order-summary is-${orderState.status}`;

  const targetCounts = new Map();
  activeRules.forEach((rule) => {
    const target = String(rule.target || 'Без цели').trim() || 'Без цели';
    targetCounts.set(target, (targetCounts.get(target) || 0) + 1);
  });
  els.rulesTargetSummary.textContent = '';
  [...targetCounts.entries()]
    .sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))
    .slice(0, 4)
    .forEach(([target, count]) => {
      const item = document.createElement('span');
      const dot = document.createElement('span');
      const text = document.createElement('span');
      item.className = `rules-target-summary-item ${getRuleTargetTone(target)}`;
      dot.className = 'rules-target-summary-dot';
      text.textContent = `${count} ${target}`;
      item.append(dot, text);
      els.rulesTargetSummary.append(item);
    });
}

function getRulesOrderState(rules) {
  if (rules.length === 0) return { status: 'neutral', label: 'порядок не задан' };
  const matchIndexes = rules
    .map((rule, index) => (normalizeRuleType(rule.type) === 'MATCH' ? index : -1))
    .filter((index) => index !== -1);
  if (matchIndexes.length === 0) return { status: 'warning', label: 'MATCH отсутствует' };
  if (matchIndexes.length > 1) return { status: 'warning', label: 'несколько правил MATCH' };
  if (matchIndexes[0] !== rules.length - 1) return { status: 'warning', label: 'MATCH должен быть последним' };
  return { status: 'ok', label: 'порядок корректен · MATCH на последнем месте' };
}

function handleRuleFilterChange() {
  state.ruleFilters.search = els.ruleSearchInput.value || '';
  state.ruleFilters.type = els.ruleTypeFilter.value || '';
  state.ruleFilters.target = els.ruleTargetFilter.value || '';
  renderRulesEditor();
}

function matchesRuleFilters(rule) {
  const query = String(state.ruleFilters.search || '').trim().toLocaleLowerCase('ru-RU');
  const type = normalizeRuleType(rule.type);
  const target = String(rule.target || '').trim();

  if (state.ruleFilters.type && type !== state.ruleFilters.type) return false;
  if (state.ruleFilters.target && target !== state.ruleFilters.target) return false;
  if (!query) return true;
  return [type, rule.value, target].join(' ').toLocaleLowerCase('ru-RU').includes(query);
}

function replaceRuleFilterOptions(select, allLabel, values, selected) {
  select.textContent = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = allLabel;
  select.append(allOption);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = values.includes(selected) ? selected : '';
  if (select.value !== selected) {
    if (select === els.ruleTypeFilter) state.ruleFilters.type = '';
    if (select === els.ruleTargetFilter) state.ruleFilters.target = '';
  }
}

function createRuleRegistryRow(rule, index, activeRules) {
  const row = document.createElement('button');
  const number = document.createElement('span');
  const identity = document.createElement('span');
  const condition = document.createElement('strong');
  const type = document.createElement('span');
  const target = document.createElement('span');
  const status = getRuleStatus(rule, index, activeRules);
  const statusMarker = createRuleStatusMarker(status);

  row.className = 'rule-registry-row';
  row.type = 'button';
  row.setAttribute('data-rule-id', rule.id);
  row.classList.toggle('is-selected', rule.id === state.selectedRuleId);
  row.classList.toggle('is-new', Boolean(rule.isNew));
  row.setAttribute('aria-pressed', String(rule.id === state.selectedRuleId));
  row.setAttribute('aria-label', `Правило ${index + 1}: ${formatRuleCondition(rule)}, цель ${rule.target || 'не задана'}, ${status.label}`);
  row.addEventListener('click', () => {
    state.selectedRuleId = rule.id;
    state.ruleInspectorEditing = false;
    renderRulesEditor();
  });

  number.className = 'rule-registry-number';
  number.textContent = String(index + 1);
  identity.className = 'rule-registry-identity';
  condition.textContent = formatRuleCondition(rule);
  type.textContent = normalizeRuleType(rule.type) || 'Тип не задан';
  identity.append(condition, type);
  target.className = `rule-target-pill ${getRuleTargetTone(rule.target)}`;
  target.textContent = rule.target || 'Без цели';
  row.append(number, identity, target, statusMarker);
  return row;
}

function renderRuleInspector(rule, activeRules) {
  if (!els.ruleInspector) return;
  els.ruleInspector.textContent = '';
  els.ruleInspector.classList.toggle('empty-state', !rule);
  if (!rule) {
    setEmptyState(els.ruleInspector, 'Выберите правило', 'Справа появится его роль в маршрутизации.');
    return;
  }
  const index = activeRules.indexOf(rule);
  els.ruleInspector.append(
    state.ruleInspectorEditing
      ? createRuleInspectorEditor(rule, index, activeRules.length)
      : createRuleInspectorSummary(rule, index, activeRules),
  );
}

function createRuleInspectorSummary(rule, index, activeRules) {
  const wrap = document.createElement('div');
  const head = document.createElement('div');
  const title = document.createElement('h3');
  const type = document.createElement('span');
  const status = getRuleStatus(rule, index, activeRules);
  const statusLine = document.createElement('div');
  const explanation = document.createElement('p');
  const actions = document.createElement('div');
  const editButton = document.createElement('button');
  const removeButton = document.createElement('button');

  wrap.className = 'rule-inspector-summary';
  head.className = 'rule-inspector-head';
  title.textContent = `Правило ${index + 1}`;
  type.className = 'rule-type-pill';
  type.textContent = normalizeRuleType(rule.type) || 'RULE';
  head.append(title, type);

  statusLine.className = `rule-inspector-status is-${status.status}`;
  statusLine.append(createRuleStatusMarker(status), document.createTextNode(formatRuleInspectorStatus(rule, index, activeRules, status)));
  explanation.className = 'rule-inspector-explanation';
  explanation.textContent = describeRuleRouting(rule);

  wrap.append(
    head,
    statusLine,
    explanation,
    createRuleInspectorSection('Позиция в маршрутизации', `${index + 1} из ${activeRules.length}${index === activeRules.length - 1 ? ' (последнее)' : ''}`, [
      createRuleOrderButton(rule, index, activeRules.length, -1),
      createRuleOrderButton(rule, index, activeRules.length, 1),
    ]),
    createRuleInspectorSection('Условие', formatRuleCondition(rule), [], getRuleConditionDescription(rule)),
    createRuleInspectorSection('Цель', rule.target || 'Не задана', [], describeRuleTarget(rule.target), getRuleTargetTone(rule.target)),
  );

  actions.className = 'rule-inspector-actions';
  editButton.className = 'button primary compact';
  editButton.type = 'button';
  editButton.innerHTML = '<svg class="button-icon" aria-hidden="true"><use href="#icon-edit"></use></svg><span>Редактировать</span>';
  editButton.addEventListener('click', () => {
    state.ruleInspectorEditing = true;
    renderRulesEditor();
  });
  removeButton.className = 'button danger compact';
  removeButton.type = 'button';
  removeButton.textContent = 'Удалить';
  removeButton.addEventListener('click', () => removeRule(rule));
  actions.append(editButton, removeButton);
  wrap.append(actions);
  return wrap;
}

function createRuleInspectorEditor(rule, index, count) {
  const wrap = document.createElement('div');
  const head = document.createElement('div');
  const title = document.createElement('h3');
  const number = document.createElement('span');
  const fields = document.createElement('div');
  const typeLabel = document.createElement('label');
  const typeTitle = document.createElement('span');
  const typeSelect = document.createElement('select');
  const valueLabel = document.createElement('label');
  const valueTitle = document.createElement('span');
  const valueInput = document.createElement('input');
  const targetLabel = document.createElement('label');
  const targetTitle = document.createElement('span');
  const targetInput = document.createElement('input');
  const targetOptions = document.createElement('datalist');
  const order = document.createElement('div');
  const doneButton = document.createElement('button');
  const removeButton = document.createElement('button');
  const type = normalizeRuleType(rule.type);

  wrap.className = 'rule-inspector-editor';
  head.className = 'rule-inspector-head';
  title.textContent = 'Редактирование правила';
  number.className = 'rule-number-pill';
  number.textContent = String(index + 1);
  head.append(title, number);

  fields.className = 'rule-inspector-fields';
  typeLabel.className = 'rule-field';
  typeTitle.textContent = 'Тип правила';
  getRuleTypeOptions(type).forEach((optionValue) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    typeSelect.append(option);
  });
  typeSelect.value = type;
  typeSelect.addEventListener('change', () => updateRule(rule, 'type', typeSelect.value));
  typeLabel.append(typeTitle, typeSelect);

  valueLabel.className = 'rule-field';
  valueTitle.textContent = 'Условие';
  valueInput.type = 'text';
  valueInput.value = rule.value || '';
  valueInput.placeholder = getRuleValuePlaceholder(type);
  valueInput.addEventListener('input', () => updateRule(rule, 'value', valueInput.value, { partial: true }));
  valueInput.addEventListener('change', () => updateRule(rule, 'value', valueInput.value));
  valueLabel.hidden = !ruleRequiresValue(type);
  valueLabel.append(valueTitle, valueInput);

  targetLabel.className = 'rule-field';
  targetTitle.textContent = 'Цель';
  targetInput.type = 'text';
  targetInput.value = rule.target || '';
  targetInput.placeholder = 'Proxy или DIRECT';
  targetOptions.id = `rule-target-options-${rule.id}`;
  getRuleTargetOptions().forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    targetOptions.append(option);
  });
  targetInput.setAttribute('list', targetOptions.id);
  targetInput.addEventListener('input', () => updateRule(rule, 'target', targetInput.value, { partial: true }));
  targetInput.addEventListener('change', () => updateRule(rule, 'target', targetInput.value));
  targetLabel.append(targetTitle, targetInput, targetOptions);
  fields.append(typeLabel, valueLabel, targetLabel);

  order.className = 'rule-inspector-order';
  order.append(
    createRuleOrderButton(rule, index, count, -1),
    createRuleOrderButton(rule, index, count, 1),
    document.createTextNode(`Позиция: ${index + 1} из ${count}`),
  );

  doneButton.className = 'button primary compact';
  doneButton.type = 'button';
  doneButton.textContent = 'Готово';
  doneButton.addEventListener('click', () => {
    state.ruleInspectorEditing = false;
    renderRulesEditor();
  });
  removeButton.className = 'button danger compact';
  removeButton.type = 'button';
  removeButton.textContent = 'Удалить';
  removeButton.addEventListener('click', () => removeRule(rule));

  const actions = document.createElement('div');
  actions.className = 'rule-inspector-actions';
  actions.append(doneButton, removeButton);
  wrap.append(head, fields, order, actions);
  return wrap;
}

function createRuleInspectorSection(label, value, controls = [], description = '', tone = '') {
  const section = document.createElement('section');
  const title = document.createElement('span');
  const row = document.createElement('div');
  const strong = document.createElement('strong');
  section.className = 'rule-inspector-section';
  title.textContent = label;
  row.className = 'rule-inspector-section-row';
  strong.textContent = value;
  if (tone) strong.className = `rule-target-pill ${tone}`;
  row.append(strong, ...controls);
  section.append(title, row);
  if (description) {
    const text = document.createElement('p');
    text.textContent = description;
    section.append(text);
  }
  return section;
}

function createRuleOrderButton(rule, index, count, direction) {
  const button = document.createElement('button');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  button.className = `rule-order-button${direction < 0 ? ' is-up' : ''}`;
  button.type = 'button';
  button.disabled = direction < 0 ? index === 0 : index === count - 1;
  button.setAttribute('aria-label', `${direction < 0 ? 'Поднять' : 'Опустить'} правило ${index + 1}`);
  use.setAttribute('href', '#icon-chevron-down');
  icon.setAttribute('aria-hidden', 'true');
  icon.append(use);
  button.append(icon);
  button.addEventListener('click', () => moveRule(rule, direction));
  return button;
}

function createRuleStatusMarker(status) {
  const marker = document.createElement('span');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  marker.className = `rule-status-marker is-${status.status}`;
  marker.title = status.label;
  marker.setAttribute('aria-label', status.label);
  use.setAttribute('href', status.status === 'ok' ? '#icon-check' : '#icon-warning');
  icon.setAttribute('aria-hidden', 'true');
  icon.append(use);
  marker.append(icon);
  return marker;
}

function getRuleStatus(rule, index, activeRules) {
  const type = normalizeRuleType(rule.type);
  const target = String(rule.target || '').trim();
  if (!type) return { status: 'error', label: 'Тип правила не задан' };
  if (ruleRequiresValue(type) && !String(rule.value || '').trim()) return { status: 'error', label: 'Условие правила не задано' };
  if (!target) return { status: 'error', label: 'Цель правила не задана' };
  if (!getRuleTargetOptions().includes(target)) return { status: 'error', label: `Цель ${target} не найдена` };
  if (type === 'MATCH' && index !== activeRules.length - 1) return { status: 'warning', label: 'MATCH должен быть последним правилом' };
  return { status: 'ok', label: 'Структура правила корректна' };
}

function formatRuleCondition(rule) {
  return normalizeRuleType(rule.type) === 'MATCH' ? 'Остальной трафик' : String(rule.value || 'Условие не задано');
}

function describeRuleRouting(rule) {
  const type = normalizeRuleType(rule.type);
  const target = rule.target || 'не заданную цель';
  if (type === 'MATCH') return `Весь трафик, который не совпал с правилами выше, будет направлен в ${formatRuleTargetName(target)}.`;
  if (type === 'IP-CIDR') return `Трафик к адресам сети ${rule.value || 'без адреса'} будет направлен в ${formatRuleTargetName(target)}.`;
  if (type === 'GEOIP') return `Трафик к IP-адресам региона ${rule.value || 'без региона'} будет направлен в ${formatRuleTargetName(target)}.`;
  if (type === 'RULE-SET') return `Набор правил ${rule.value || 'без имени'} направляет совпавший трафик в ${formatRuleTargetName(target)}.`;
  return `Если сработает ${type || 'это правило'} для ${rule.value || 'заданного условия'}, трафик будет направлен в ${formatRuleTargetName(target)}.`;
}

function formatRuleTargetName(target) {
  return ['DIRECT', 'REJECT', 'GLOBAL', 'PASS'].includes(String(target || '').toUpperCase())
    ? String(target || '').toUpperCase()
    : `группу ${target}`;
}

function getRuleConditionDescription(rule) {
  const type = normalizeRuleType(rule.type);
  if (type === 'MATCH') return 'Совпадает с любым оставшимся трафиком.';
  return `Тип правила: ${type || 'не задан'}.`;
}

function describeRuleTarget(target) {
  const value = String(target || '').trim();
  if (value === 'DIRECT') return 'Соединение выполняется напрямую.';
  if (value === 'REJECT') return 'Соединение будет заблокировано.';
  return value ? `Маршрутизация через группу ${value}.` : 'Цель маршрутизации не задана.';
}

function getRuleTargetTone(target) {
  const value = String(target || '').trim().toUpperCase();
  if (value === 'DIRECT') return 'is-direct';
  if (value === 'REJECT') return 'is-reject';
  if (value === 'PROXY') return 'is-proxy';
  return 'is-group';
}

function formatRuleInspectorStatus(rule, index, activeRules, status) {
  if (status.status !== 'ok') return status.label;
  if (normalizeRuleType(rule.type) === 'MATCH' && index === activeRules.length - 1) return 'Последнее правило · корректно';
  return 'Структура правила корректна';
}

function getRuleTypeOptions(currentType) {
  return RULE_TYPE_OPTIONS.includes(currentType)
    ? RULE_TYPE_OPTIONS
    : [currentType || 'RULE', ...RULE_TYPE_OPTIONS];
}

function getRuleValuePlaceholder(type) {
  if (type === 'DOMAIN-SUFFIX') return 'example.com';
  if (type === 'DOMAIN-KEYWORD') return 'youtube';
  if (type === 'GEOSITE') return 'youtube';
  if (type === 'GEOIP') return 'RU';
  if (type === 'IP-CIDR') return '1.1.1.0/24';
  return 'значение правила';
}

function getRuleTargetOptions() {
  const names = [
    ...state.groups.map((group) => group.name),
    'DIRECT',
    'REJECT',
    'GLOBAL',
    'PASS',
    ...getDirectProxyNames(),
  ];
  return names.filter((name, index) => name && names.indexOf(name) === index);
}

function updateRule(rule, key, value, options = {}) {
  if (key === 'type') {
    rule.type = normalizeRuleType(value);
    if (!ruleRequiresValue(rule.type)) rule.value = '';
    generateOutput();
    render();
    return;
  }

  rule[key] = String(value || '').trim();
  generateOutput();
  if (options.partial) {
    renderOutputOnly();
    renderMainGroup(state.groups, state.providers.filter((provider) => !provider.deleted));
    return;
  }
  render();
}

function addRule() {
  if (!state.originalText || !state.hasGroupsSection) return;

  const target = state.groups[0]?.name || 'DIRECT';
  const rule = {
    id: createRuleId(),
    originalIndex: -1,
    type: 'DOMAIN-SUFFIX',
    value: '',
    target,
    options: [],
    rawParts: [],
    rawLine: '',
    comment: '',
    indent: '  ',
    start: -1,
    isNew: true,
    deleted: false,
  };

  state.rules.push(rule);
  state.selectedRuleId = rule.id;
  state.ruleInspectorEditing = true;
  generateOutput();
  render();
}

function removeRule(rule) {
  const confirmed = window.confirm(`Удалить правило ${formatRuleSummary(rule)}? Изменение попадет в итоговый YAML.`);
  if (!confirmed) return;

  state.lastUndo = {
    type: 'rule',
    rule,
    selectedRuleId: state.selectedRuleId,
  };
  rule.deleted = true;
  if (state.selectedRuleId === rule.id) state.selectedRuleId = '';
  state.ruleInspectorEditing = false;
  generateOutput();
  render();
  showUndoMessage(`Правило ${formatRuleSummary(rule)} будет удалено.`);
}

function moveRule(rule, direction) {
  const activeRules = getActiveRules();
  const activeIndex = activeRules.indexOf(rule);
  const nextActiveIndex = activeIndex + direction;
  if (activeIndex === -1 || nextActiveIndex < 0 || nextActiveIndex >= activeRules.length) return;

  const currentIndex = state.rules.indexOf(rule);
  const nextIndex = state.rules.indexOf(activeRules[nextActiveIndex]);
  state.rules.splice(currentIndex, 1);
  state.rules.splice(nextIndex, 0, rule);
  generateOutput();
  render();
}

function getActiveRules() {
  return state.rules.filter((rule) => !rule.deleted);
}

function normalizeRuleType(value) {
  return String(value || '').trim().toUpperCase();
}

function ruleRequiresValue(type) {
  const normalized = normalizeRuleType(type);
  return normalized !== 'MATCH';
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
  const scenarioControls = document.createElement('div');
  const scenarioSearch = document.createElement('input');
  const scenarioTarget = document.createElement('select');
  const scenarioList = document.createElement('div');
  const flow = document.createElement('div');
  const flowHead = document.createElement('div');
  const flowTitle = document.createElement('strong');
  const flowMeta = document.createElement('span');
  const chain = document.createElement('div');
  const targetNode = buildRouteNodeModel(selectedScenario.target, groups, activeProviders);
  const inspector = createRouteInspector(selectedScenario, targetNode, scenarios.indexOf(selectedScenario) + 1);

  map.className = 'route-map';
  scenarioPanel.className = 'route-scenarios';
  scenarioTitle.className = 'route-map-title';
  scenarioTitle.textContent = 'Сценарии';
  scenarioControls.className = 'route-scenario-controls';
  scenarioSearch.type = 'search';
  scenarioSearch.placeholder = 'Поиск сценария';
  scenarioSearch.setAttribute('aria-label', 'Поиск сценария маршрутизации');
  scenarioTarget.setAttribute('aria-label', 'Фильтр по цели маршрутизации');
  const allTargets = document.createElement('option');
  allTargets.value = '';
  allTargets.textContent = 'Все цели';
  scenarioTarget.append(allTargets);
  [...new Set(scenarios.map((scenario) => scenario.target))]
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .forEach((target) => {
      const option = document.createElement('option');
      option.value = target;
      option.textContent = target;
      scenarioTarget.append(option);
    });
  scenarioControls.append(scenarioSearch, scenarioTarget);
  scenarioList.className = 'route-scenario-list';
  scenarios.forEach((scenario, index) => {
    const button = createRouteScenarioButton(scenario, selectedScenario.id, index + 1);
    button.setAttribute('data-search', `${scenario.label} ${scenario.matcher} ${scenario.target}`.toLowerCase());
    button.setAttribute('data-target', scenario.target);
    scenarioList.append(button);
  });
  const filterScenarios = () => {
    const query = scenarioSearch.value.trim().toLowerCase();
    const target = scenarioTarget.value;
    scenarioList.querySelectorAll('.route-scenario').forEach((button) => {
      const searchText = button.getAttribute('data-search') || '';
      const buttonTarget = button.getAttribute('data-target') || '';
      button.hidden = Boolean((query && !searchText.includes(query)) || (target && buttonTarget !== target));
    });
  };
  scenarioSearch.addEventListener('input', filterScenarios);
  scenarioTarget.addEventListener('change', filterScenarios);

  flow.className = 'route-flow';
  flowHead.className = 'route-flow-head';
  flowTitle.textContent = 'Маршрутизация';
  flowMeta.textContent = 'сверху вниз';
  flowHead.append(flowTitle, flowMeta);
  chain.className = 'route-visualization';
  chain.append(createRouteVisualization(selectedScenario, targetNode, scenarios.indexOf(selectedScenario) + 1));

  scenarioPanel.append(scenarioTitle, scenarioControls, scenarioList);
  flow.append(flowHead, chain);
  map.append(scenarioPanel, flow, inspector);
  return map;
}

function createRouteScenarioButton(scenario, selectedId, index) {
  const button = document.createElement('button');
  const number = document.createElement('span');
  const copy = document.createElement('span');
  const name = document.createElement('strong');
  const meta = document.createElement('span');
  const selected = scenario.id === selectedId;

  button.className = 'route-scenario';
  button.type = 'button';
  button.setAttribute('aria-pressed', String(selected));
  if (selected) button.classList.add('is-active');
  number.className = 'route-scenario-index';
  number.textContent = String(index);
  copy.className = 'route-scenario-copy';
  name.textContent = scenario.label;
  meta.textContent = formatRouteScenarioMeta(scenario);
  copy.append(name, meta);
  button.append(number, copy);
  button.addEventListener('click', () => {
    state.selectedRouteScenarioId = scenario.id;
    renderMainGroup(state.groups, state.providers.filter((provider) => !provider.deleted));
  });

  return button;
}

function createRouteVisualization(scenario, targetNode, index) {
  const diagram = document.createElement('div');
  const entry = createRouteVisualNode('entry', 'Входящий трафик', 'Все запросы');
  const rule = createRouteVisualNode(
    'rule',
    scenario.label,
    scenario.isDefault ? 'Правило по умолчанию' : formatRouteRuleDescription(scenario),
    String(index),
    formatRouteRuleBadge(scenario),
  );
  const target = createRouteVisualNode(
    targetNode.kind,
    targetNode.title,
    targetNode.description,
    '',
    targetNode.badge,
  );

  diagram.className = 'route-visual-stack';
  diagram.append(
    entry,
    createRouteVisualConnector(''),
    rule,
    createRouteVisualConnector(scenario.matcher),
    target,
  );
  return diagram;
}

function createRouteVisualNode(kind, titleText, descriptionText, numberText = '', badgeText = '') {
  const node = document.createElement('div');
  const head = document.createElement('div');
  const titleWrap = document.createElement('div');
  const title = document.createElement('strong');
  const description = document.createElement('span');

  node.className = `route-visual-node is-${kind}`;
  head.className = 'route-visual-node-head';
  titleWrap.className = 'route-visual-node-title';
  const iconId = kind === 'entry' ? 'icon-nodes' : ['direct', 'built-in'].includes(kind) ? 'icon-direct' : '';
  if (iconId) {
    const icon = typeof document.createElementNS === 'function'
      ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      : document.createElement('svg');
    const use = typeof document.createElementNS === 'function'
      ? document.createElementNS('http://www.w3.org/2000/svg', 'use')
      : document.createElement('use');
    icon.classList.add('route-visual-node-icon');
    icon.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', `#${iconId}`);
    icon.append(use);
    titleWrap.append(icon);
  }
  if (numberText) {
    const number = document.createElement('span');
    number.className = 'route-visual-number';
    number.textContent = numberText;
    titleWrap.append(number);
  }
  title.textContent = titleText;
  titleWrap.append(title);
  head.append(titleWrap);
  if (badgeText) {
    const badge = document.createElement('span');
    badge.className = 'route-visual-badge';
    badge.textContent = badgeText;
    head.append(badge);
  }
  description.textContent = descriptionText;
  node.append(head, description);
  return node;
}

function createRouteVisualConnector(labelText) {
  const connector = document.createElement('div');
  const line = document.createElement('span');
  connector.className = 'route-visual-connector';
  line.className = 'route-visual-line';
  connector.append(line);
  if (labelText) {
    const label = document.createElement('span');
    label.className = 'route-visual-label';
    label.textContent = labelText;
    connector.append(label);
  }
  return connector;
}

function createRouteInspector(scenario, targetNode, index) {
  const inspector = document.createElement('aside');
  const heading = document.createElement('div');
  const title = document.createElement('strong');
  const identity = document.createElement('div');
  const number = document.createElement('span');
  const name = document.createElement('strong');
  const badge = document.createElement('span');
  const main = document.createElement('section');
  const mainTitle = document.createElement('strong');
  const description = document.createElement('p');

  inspector.className = 'route-inspector';
  heading.className = 'route-inspector-heading';
  title.textContent = 'Подробности сценария';
  heading.append(title);
  identity.className = 'route-inspector-identity';
  number.className = 'route-inspector-number';
  number.textContent = String(index);
  name.textContent = scenario.label;
  badge.className = 'route-inspector-badge';
  badge.textContent = formatRouteRuleBadge(scenario);
  identity.append(number, name, badge);
  main.className = 'route-inspector-main';
  mainTitle.textContent = 'Основные';
  description.textContent = formatRouteRuleDescription(scenario);
  main.append(
    mainTitle,
    createRouteInspectorField('Условие', scenario.matcher),
    createRouteInspectorField('Цель', `${scenario.target} (${targetNode.badge})`),
    createRouteInspectorField('Описание', description.textContent, true),
  );
  inspector.append(
    heading,
    identity,
    main,
    createRouteInspectorSection(`Правила сценария (${scenario.ruleCount})`, scenario.examples.join(' · ')),
    createRouteInspectorSection('Фильтрация узлов', getRouteInspectorFilterSummary(targetNode)),
    createRouteInspectorSection('Протоколы', 'Наследуются от выбранной цели'),
    createRouteInspectorSection('Дополнительно', 'Редактирование доступно во вкладке «Правила»'),
  );
  return inspector;
}

function createRouteInspectorField(labelText, valueText, multiline = false) {
  const field = document.createElement('div');
  const label = document.createElement('span');
  const value = document.createElement(multiline ? 'p' : 'strong');
  field.className = `route-inspector-field${multiline ? ' is-multiline' : ''}`;
  label.textContent = labelText;
  value.textContent = valueText;
  field.append(label, value);
  return field;
}

function createRouteInspectorSection(titleText, metaText) {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const title = document.createElement('strong');
  const meta = document.createElement('span');
  details.className = 'route-inspector-section';
  title.textContent = titleText;
  meta.textContent = metaText;
  summary.append(title, meta);
  details.append(summary);
  return details;
}

function getRouteInspectorFilterSummary(targetNode) {
  if (targetNode.kind === 'provider') return 'Фильтры берутся из подписки';
  if (targetNode.kind === 'group' || targetNode.kind === 'mode') return 'Определяется составом группы';
  return 'Не применяется';
}

function getSelectedRouteScenario(scenarios) {
  const selected = scenarios.find((scenario) => scenario.id === state.selectedRouteScenarioId)
    || scenarios.find((scenario) => scenario.isDefault)
    || scenarios[0];
  state.selectedRouteScenarioId = selected?.id || '';
  return selected;
}

function getRuleScenarios() {
  const rules = getRulesForAnalysis();
  const scenarios = [];
  const scenarioByKey = new Map();
  if (rules.length === 0) return scenarios;

  rules.forEach((rule) => {
    const parts = getRulePartsForAnalysis(rule);
    const target = getRuleTargetFromParts(parts);
    if (!parts.length || !target) return;

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
      return;
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
  });

  return scenarios;
}

function formatRouteScenarioMeta(scenario) {
  return `${formatRuleCount(scenario.ruleCount)} · цель: ${scenario.target}`;
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
    return createRouteLeaf(
      'provider',
      provider.name,
      provider.type || 'подписка',
      describeRouteProvider(provider),
      describeRouteProviderDetails(provider),
    );
  }

  return createRouteLeaf('external', name, 'внешний узел', 'Имя есть в маршруте, но не найдено среди групп и подписок редактора.');
}

function createRouteLeaf(kind, title, badge, description, details = '') {
  return { kind, title, badge, description, details, children: [], omittedCount: 0 };
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
  if (provider.filter) parts.push(`Фильтр: ${summarizeRoutePattern(provider.filter)}.`);
  if (provider.excludeFilter) parts.push(`Исключения: ${summarizeRoutePattern(provider.excludeFilter)}.`);
  return parts.join(' ');
}

function describeRouteProviderDetails(provider) {
  const hasTruncatedPattern = [provider.filter, provider.excludeFilter]
    .some((value) => splitRoutePattern(value).length > 3);
  if (!hasTruncatedPattern) return '';
  const parts = [];
  if (provider.filter) parts.push(`Полный фильтр: ${provider.filter}.`);
  if (provider.excludeFilter) parts.push(`Полные исключения: ${provider.excludeFilter}.`);
  return parts.join(' ');
}

function summarizeRoutePattern(value, limit = 3) {
  const items = splitRoutePattern(value);
  if (items.length <= limit) return items.join(' · ');
  return `${items.slice(0, limit).join(' · ')} · еще ${items.length - limit}`;
}

function splitRoutePattern(value) {
  const items = [];
  let current = '';
  let escaped = false;

  for (const char of String(value || '')) {
    if (char === '|' && !escaped) {
      if (current.trim()) items.push(current.trim());
      current = '';
      continue;
    }
    current += char;
    escaped = char === '\\' && !escaped;
    if (char !== '\\') escaped = false;
  }

  if (current.trim()) items.push(current.trim());
  return items;
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
  title.title = node.title;
  badge.textContent = node.badge;
  text.textContent = node.description;
  head.append(title, badge);
  card.append(head, text);
  if (node.details && node.details !== node.description) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const fullText = document.createElement('p');
    details.className = 'route-node-details';
    summary.textContent = 'Подробнее';
    fullText.textContent = node.details;
    details.append(summary, fullText);
    card.append(details);
  }
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
  const rules = getRulesForAnalysis();
  if (rules.length === 0) return '';

  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const parts = getRulePartsForAnalysis(rules[index]);
    if (parts[0]?.toUpperCase() === 'MATCH') return getRuleTargetFromParts(parts);
  }

  return '';
}

function getRuleTargets() {
  const targets = [];
  const rules = getRulesForAnalysis();
  if (rules.length === 0) return targets;

  rules.forEach((rule) => {
    const parts = getRulePartsForAnalysis(rule);
    const target = getRuleTargetFromParts(parts);
    if (target) targets.push(target);
  });

  return targets.filter((target, index) => targets.indexOf(target) === index);
}

function getRulesForAnalysis() {
  if (state.rules.length > 0 || state.hasRulesSection) return getActiveRules();

  const lines = splitLines(state.originalText);
  const rulesSection = findTopSection(lines, 'rules');
  return rulesSection ? parseRules(lines, rulesSection).filter((rule) => !rule.deleted) : [];
}

function getRulePartsForAnalysis(rule) {
  return buildRuleParts(rule).map((part) => cleanScalar(part)).filter(Boolean);
}

function getRuleTargetFromParts(parts) {
  const index = getRuleTargetIndexFromParts(parts);
  return index === -1 ? '' : parts[index];
}

function getRuleTargetIndexFromParts(parts) {
  for (let index = parts.length - 1; index > 0; index -= 1) {
    const part = cleanScalar(parts[index]);
    if (!RULE_OPTIONS.has(String(part).toLowerCase())) return index;
  }

  return -1;
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
  els.groupListActionHome.append(els.addGroupButton);
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
      cell.setAttribute('data-label', group.name);
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
  els.groupSearchInput.value = state.groupSearch;
  els.groupTypeFilters.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.groupTypeFilter === state.groupTypeFilter);
  });
  const search = state.groupSearch.trim().toLocaleLowerCase('ru-RU');
  const visibleGroups = state.groups.filter((group) => {
    const isProxy = isProxyModeGroup(group);
    if (state.groupTypeFilter === 'service') return !isProxy;
    if (state.groupTypeFilter === 'proxy') return isProxy;
    return true;
  }).filter((group) => {
    if (!search) return true;
    return `${group.name} ${group.type}`
      .toLocaleLowerCase('ru-RU')
      .includes(search);
  });
  const selectedGroup = visibleGroups.find((group) => group.name === state.selectedGroupName) || visibleGroups[0] || null;
  const wrap = document.createElement('div');
  const registry = document.createElement('div');
  const tableWrap = document.createElement('div');
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const detail = document.createElement('div');

  wrap.className = 'group-registry-workbench';
  wrap.classList.toggle('is-editing', state.groupInspectorEditing || Boolean(selectedGroup?.isNew));
  registry.className = 'group-registry';
  tableWrap.className = 'group-registry-table-wrap';
  table.className = 'group-registry-table';
  thead.innerHTML = '<tr><th>Группа</th><th>Тип</th><th>Источники</th><th>Варианты</th><th>Используется в правилах</th></tr>';

  state.groups.forEach((group, index) => {
    if (!visibleGroups.includes(group)) return;
    tbody.append(createGroupListItem(group, index, group === selectedGroup));
  });
  if (visibleGroups.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.className = 'group-registry-empty';
    emptyCell.textContent = 'Группы по этому запросу не найдены.';
    emptyRow.append(emptyCell);
    tbody.append(emptyRow);
  }
  table.append(thead, tbody);
  tableWrap.append(table);
  registry.append(tableWrap);

  if (selectedGroup) {
    if (state.groupInspectorEditing || selectedGroup.isNew) {
      detail.className = 'group-registry-detail is-editing';
      detail.append(createGroupEditorModeHeader(selectedGroup), createGroupEditorDetail(selectedGroup, activeProviders));
    } else {
      detail.className = 'group-registry-detail';
      detail.append(createGroupInspector(selectedGroup));
    }
  } else {
    detail.className = 'group-registry-detail';
    setEmptyState(detail, 'Нет групп', 'Добавьте первую группу маршрутизации.');
  }

  wrap.append(registry, detail);
  els.groupsMatrix.append(wrap);
}

function createGroupListItem(group, index, isSelected) {
  const row = document.createElement('tr');
  const nameCell = document.createElement('td');
  const nameButton = document.createElement('button');
  const typeCell = document.createElement('td');
  const sourceCell = document.createElement('td');
  const variantCell = document.createElement('td');
  const ruleCell = document.createElement('td');
  const usage = getGroupUsage(group);

  row.className = 'group-registry-row';
  row.classList.toggle('is-selected', isSelected);
  row.setAttribute('aria-selected', String(isSelected));
  nameButton.type = 'button';
  nameButton.className = 'group-registry-name';
  nameButton.innerHTML = '<span></span><strong></strong>';
  nameButton.querySelector('span').textContent = String(index + 1);
  nameButton.querySelector('strong').textContent = group.name || 'Без названия';
  nameButton.setAttribute('aria-label', `Открыть группу ${index + 1}: ${group.name || 'Без названия'}`);
  nameCell.append(nameButton);
  typeCell.textContent = group.type || 'group';
  sourceCell.textContent = formatGroupRegistrySources(group);
  variantCell.textContent = formatGroupRegistryVariants(group);
  ruleCell.textContent = formatRouteCount(usage.ruleCount, 'правило', 'правила', 'правил');
  row.append(nameCell, typeCell, sourceCell, variantCell, ruleCell);
  row.addEventListener('click', () => {
    state.selectedGroupName = group.name;
    state.groupInspectorEditing = false;
    render();
  });
  return row;
}

function formatGroupRegistrySources(group) {
  if (group.includeAll || group.includeAllProviders) return 'Все подписки';
  return formatRouteCount(group.use.length, 'подписка', 'подписки', 'подписок');
}

function formatGroupRegistryVariants(group) {
  const live = state.mihomoGroupSelections.find((item) => normalizeLookupName(item?.name) === normalizeLookupName(group.name));
  const optionCount = Array.isArray(live?.all) ? live.all.length : null;
  if (optionCount !== null) return formatProxyCount(optionCount);
  if (group.proxies.length > 0) return formatRouteCount(group.proxies.length, 'вариант', 'варианта', 'вариантов');
  return '—';
}

function createGroupEditorModeHeader(group) {
  const header = document.createElement('div');
  const title = document.createElement('div');
  const close = document.createElement('button');
  header.className = 'group-editor-mode-head';
  title.innerHTML = '<span>Редактирование группы</span><strong></strong>';
  title.querySelector('strong').textContent = group?.name || 'Без названия';
  close.className = 'button compact';
  close.type = 'button';
  close.textContent = 'Закрыть редактор';
  close.hidden = Boolean(group?.isNew);
  close.addEventListener('click', () => {
    state.groupInspectorEditing = false;
    render();
  });
  header.append(title, close);
  return header;
}

function createGroupInspector(group) {
  const inspector = document.createElement('article');
  const head = document.createElement('div');
  const title = document.createElement('div');
  const type = document.createElement('span');
  const content = document.createElement('div');
  const actions = document.createElement('div');
  const editButton = document.createElement('button');
  const removeButton = document.createElement('button');
  const usage = getGroupUsage(group);
  const orderedOptions = group.proxies.length > 0 ? group.proxies : group.use;

  inspector.className = 'group-inspector';
  head.className = 'group-inspector-head';
  title.className = 'group-inspector-title';
  title.innerHTML = '<strong></strong><span></span>';
  title.querySelector('strong').textContent = group.name || 'Без названия';
  title.querySelector('span').textContent = isProxyModeGroup(group) ? 'Прокси-группа' : 'Сервисная группа';
  type.className = 'group-type-pill';
  type.textContent = group.type || 'group';
  head.append(title, type);

  content.className = 'group-inspector-content';
  content.append(
    createGroupInspectorSection('Роль группы', [describeGroupTypeForEditor(group)], 'text'),
    createGroupInspectorSection(
      group.proxies.length > 0 ? 'Порядок маршрутизации' : 'Подписки-источники',
      orderedOptions.length > 0 ? orderedOptions : ['Варианты не заданы'],
      group.proxies.length > 0 ? 'ordered' : 'chips',
    ),
    createGroupInspectorSection('Используется в правилах', [
      formatRouteCount(usage.ruleCount, 'правило', 'правила', 'правил'),
      usage.parentGroups.length > 0 ? `Также входит в: ${usage.parentGroups.join(', ')}` : 'В другие группы не входит',
    ], 'list'),
    createGroupInspectorSection('Источники', [formatGroupRegistrySources(group)], 'list'),
  );

  actions.className = 'group-inspector-actions';
  editButton.className = 'button primary compact';
  editButton.type = 'button';
  editButton.textContent = 'Редактировать';
  editButton.addEventListener('click', () => {
    state.groupInspectorEditing = true;
    render();
  });
  removeButton.className = 'button danger compact';
  removeButton.type = 'button';
  removeButton.textContent = 'Удалить';
  removeButton.addEventListener('click', () => removeGroup(group));
  actions.append(editButton, removeButton);
  inspector.append(head, content, actions);
  return inspector;
}

function createGroupInspectorSection(label, values, variant) {
  const section = document.createElement('section');
  const title = document.createElement('span');
  const body = document.createElement('div');
  section.className = 'group-inspector-section';
  title.textContent = label;
  body.className = `group-inspector-${variant}`;
  values.forEach((value, index) => {
    const item = document.createElement(variant === 'text' ? 'p' : variant === 'ordered' ? 'div' : 'span');
    if (variant === 'ordered') {
      const number = document.createElement('span');
      const label = document.createElement('span');
      number.className = 'group-inspector-order-number';
      number.textContent = String(index + 1);
      label.textContent = value;
      item.append(number, label);
    } else {
      item.textContent = value;
    }
    body.append(item);
  });
  section.append(title, body);
  return section;
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
  nameInput.title = group.isNew ? 'Имя новой группы' : 'Переименование обновит ссылки в rules и proxies других групп.';
  nameInput.addEventListener('input', () => renameGroup(group, nameInput.value));
  nameInput.addEventListener('change', render);
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
    createGroupEditorSection(
      'Сводка',
      'Роль группы',
      createGroupHelpPanel(group, activeProviders),
    ),
    createGroupEditorSection(
      'Настройки группы',
      'Имя и тип',
      fields,
    ),
    createGroupEditorSection(
      'Варианты маршрута',
      'Список выбора',
      createGroupProxyOrderSection(group),
      createGroupOptionSection(
        'Встроенные выходы',
        'DIRECT, REJECT, PASS и похожие варианты — это готовые действия Mihomo без выбора нод из подписки.',
        getBuiltInGroupOptions(),
        group.proxies,
        (name, enabled) => toggleGroupProxy(group, name, enabled),
        'proxies',
      ),
      createGroupOptionSection(
        'Другие группы',
        'Подключают эту группу к уже существующим группам. Для fallback и relay порядок вариантов важен.',
        getOtherGroupOptions(group),
        group.proxies,
        (name, enabled) => toggleGroupProxy(group, name, enabled),
        'proxies',
      ),
    ),
    createGroupEditorSection(
      'Подписки-источники',
      'use',
      createGroupOptionSection(
        'Подписки-источники нод',
        'Отмеченные proxy-providers дают этой группе свои ноды. Это не правила маршрутизации, а источник вариантов.',
        activeProviders.map((provider) => provider.name),
        group.use,
        (name, enabled) => toggleGroupUse(group, name, enabled),
        'use',
      ),
    ),
  );
  return wrap;
}

function createGroupEditorSection(titleText, metaText, ...children) {
  const section = document.createElement('section');
  const head = document.createElement('div');
  const title = document.createElement('strong');
  const meta = document.createElement('span');

  section.className = 'group-editor-section';
  head.className = 'group-editor-section-head';
  title.textContent = titleText;
  meta.textContent = metaText;
  head.append(title, meta);
  section.append(head, ...children);
  return section;
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
    panel.append(createGroupHelpItem('Переименование', 'Если изменить имя, редактор обновит ссылки на эту группу в rules и в proxies других групп.'));
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
  const names = new Set([group?.name, group?.originalName].filter(Boolean).map((name) => String(name).toLowerCase()));
  const ruleTargets = getRuleTargets().filter((target) => names.has(String(target).toLowerCase()));
  const parentGroups = state.groups
    .filter((item) => item !== group)
    .filter((item) => item.proxies.some((proxyName) => names.has(String(proxyName).toLowerCase())))
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
  title.textContent = 'Порядок вариантов';
  title.title = 'proxies';
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
    upButton.setAttribute('aria-label', `Переместить ${name} выше`);
    upButton.disabled = index === 0;
    upButton.addEventListener('click', () => moveGroupProxy(group, index, index - 1));

    downButton.type = 'button';
    downButton.textContent = '↓';
    downButton.title = 'Ниже';
    downButton.setAttribute('aria-label', `Переместить ${name} ниже`);
    downButton.disabled = index === group.proxies.length - 1;
    downButton.addEventListener('click', () => moveGroupProxy(group, index, index + 1));

    actions.append(upButton, downButton);
    row.append(number, label, actions);
    list.append(row);
  });

  section.append(title, description, list);
  return section;
}

function createGroupOptionSection(titleText, descriptionText, options, selected, onToggle, technicalTitle = '') {
  const section = document.createElement('section');
  const title = document.createElement('div');
  const description = document.createElement('p');
  const list = document.createElement('div');
  const selectedNames = new Set(selected);

  section.className = 'group-option-section';
  title.className = 'group-option-title';
  title.textContent = titleText;
  if (technicalTitle) title.title = technicalTitle;
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
  const hasFile = Boolean(state.originalText && state.hasGroupsSection);
  const disabled = !hasFile || activeProviders.length === 0;

  els.intervalTools.classList.toggle('hidden', !hasFile || !state.intervalToolsOpen);
  els.intervalToolsButton.textContent = state.intervalToolsOpen ? 'Скрыть настройки' : 'Настроить обновления';
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
      provider.hasHealthUrl = true;
      provider.hasHealthInterval = true;
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
  const original = state.originalProviders.find(
    (item) => item.name === provider.originalName || item.name === provider.name,
  );
  provider[key] = value;
  const presenceKey = {
    url: 'hasUrl',
    filter: 'hasFilter',
    excludeFilter: 'hasExcludeFilter',
    excludeType: 'hasExcludeType',
    userAgent: 'hasUserAgent',
    xHwid: 'hasXHwid',
    udp: 'hasUdp',
    tfo: 'hasTfo',
    path: 'hasPath',
    interval: 'hasInterval',
  }[key];
  if (presenceKey) {
    const matchesOriginalValue = original && (
      key === 'udp' || key === 'tfo'
        ? Boolean(value) === Boolean(original[key])
        : String(value ?? '') === String(original[key] ?? '')
    );
    provider[presenceKey] = matchesOriginalValue
      ? Boolean(original[presenceKey])
      : key === 'udp' || key === 'tfo'
        ? Boolean(value)
        : key === 'interval'
          ? true
          : hasOutputValue(value);
  }
  if (key === 'healthUrl') {
    const matchesOriginalValue = original && String(value ?? '') === String(original.healthUrl ?? '');
    provider.hasHealthUrl = matchesOriginalValue ? Boolean(original.hasHealthUrl) : hasOutputValue(value);
  }
  if (key === 'healthInterval') {
    const matchesOriginalValue = original && String(value ?? '') === String(original.healthInterval ?? '');
    provider.hasHealthInterval = matchesOriginalValue ? Boolean(original.hasHealthInterval) : hasOutputValue(value);
  }
  if (key === 'healthUrl' || key === 'healthInterval') {
    const matchesOriginalHealth = original
      && Boolean(provider.hasHealthUrl) === Boolean(original.hasHealthUrl)
      && String(provider.healthUrl ?? '') === String(original.healthUrl ?? '')
      && Boolean(provider.hasHealthInterval) === Boolean(original.hasHealthInterval)
      && String(provider.healthInterval ?? '') === String(original.healthInterval ?? '');
    provider.hasHealthCheck = matchesOriginalHealth ? Boolean(original.hasHealthCheck) : true;
  }
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

function updateProviderNameDraft(provider, nextName, root) {
  const previousName = provider.name;
  provider.name = nextName.trim();
  provider.autoName = false;
  provider.nameLocked = false;
  if (state.selectedProviderName === previousName) state.selectedProviderName = provider.name;
  replaceProviderUse(previousName, provider.name);

  const title = root.querySelector('.provider-card-title');
  if (title) title.textContent = provider.name || 'Без названия';
  generateOutput();
  renderOutputOnly();
}

function replaceProviderUse(previousName, nextName) {
  state.groups.forEach((group) => {
    group.use = group.use.map((name) => (name === previousName ? nextName : name));
  });
}

function removeProvider(provider) {
  const usedBy = state.groups.filter((group) => group.use.includes(provider.name)).map((group) => group.name);
  const usageDetail = usedBy.length > 0 ? ` Она будет отключена от групп: ${usedBy.join(', ')}.` : '';
  const confirmed = window.confirm(`Удалить подписку ${provider.name}?${usageDetail} Изменение попадет в итоговый YAML.`);
  if (!confirmed) return;

  state.lastUndo = {
    type: 'provider',
    provider,
    selectedProviderName: state.selectedProviderName,
    groupUses: state.groups
      .map((group) => ({ group, index: group.use.indexOf(provider.name) }))
      .filter((entry) => entry.index !== -1),
  };
  provider.deleted = true;
  if (state.selectedProviderName === provider.name) state.selectedProviderName = '';
  state.providerInspectorEditing = false;
  state.groups.forEach((group) => {
    group.use = group.use.filter((name) => name !== provider.name);
  });
  generateOutput();
  render();
  showUndoMessage(`Подписка ${provider.name} будет удалена.`);
}

function showUndoMessage(text) {
  showMessage(text, {
    actions: [{ label: 'Отменить', onClick: undoLastRemoval }],
  });
}

function undoLastRemoval() {
  const undo = state.lastUndo;
  if (!undo) return;

  if (undo.type === 'provider') {
    const hasNameCollision = state.providers.some(
      (provider) => provider !== undo.provider && !provider.deleted && provider.name === undo.provider.name,
    );
    if (hasNameCollision) {
      showMessage(`Нельзя восстановить подписку ${undo.provider.name}: имя уже занято.`, { severity: 'error' });
      return;
    }
    undo.provider.deleted = false;
    undo.groupUses.forEach(({ group, index }) => {
      if (group.use.includes(undo.provider.name)) return;
      group.use.splice(Math.min(index, group.use.length), 0, undo.provider.name);
    });
    state.selectedProviderName = undo.selectedProviderName || undo.provider.name;
  }

  if (undo.type === 'rule') {
    undo.rule.deleted = false;
    state.selectedRuleId = undo.selectedRuleId || undo.rule.id;
  }

  if (undo.type === 'group') {
    const hasNameCollision = state.groups.some((group) => group.name === undo.group.name);
    if (hasNameCollision) {
      showMessage(`Нельзя восстановить группу ${undo.group.name}: имя уже занято.`, { severity: 'error' });
      return;
    }
    state.groups.splice(Math.min(undo.index, state.groups.length), 0, undo.group);
    state.selectedGroupName = undo.selectedGroupName || undo.group.name;
  }

  state.lastUndo = null;
  generateOutput();
  render();
  showMessage('Удаление отменено.', { severity: 'success' });
}

function addProvider() {
  if (!state.originalText || !state.hasGroupsSection) return;

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
    customHeaders: '',
    customHeaderKeys: [],
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
    hasHealthUrl: true,
    hasHealthInterval: true,
    rawLines: [],
    isNew: true,
    autoName: true,
    nameLocked: true,
    highlight: true,
    deleted: false,
  };

  state.providers.unshift(provider);
  state.selectedProviderName = provider.name;
  state.providerInspectorEditing = true;
  connectProviderToUseGroups(provider.name);
  generateOutput();
  render();

  window.setTimeout(() => {
    const editor = els.providersList.querySelector('.provider-detail.is-editing');
    if (editor?.style) editor.style.scrollMarginTop = `${getStickyTopbarHeight() + 12}px`;
    editor?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, 0);

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
  state.groupInspectorEditing = true;
  generateOutput();
  render();
}

function removeGroup(group) {
  const usage = getGroupUsage(group);
  if (usage.used) {
    const dependencies = [];
    if (usage.ruleCount > 0) {
      dependencies.push(formatRouteCount(usage.ruleCount, 'правило ссылается', 'правила ссылаются', 'правил ссылаются'));
    }
    if (usage.parentGroups.length > 0) {
      dependencies.push(`используется в группах ${formatNameList(usage.parentGroups)}`);
    }
    showMessage(`Нельзя удалить группу ${group.name}: ${dependencies.join('; ')}. Сначала замените эти ссылки.`, {
      severity: 'error',
    });
    return;
  }

  const confirmed = window.confirm(`Удалить группу ${group.name}? Изменение попадет в итоговый YAML.`);
  if (!confirmed) return;

  const index = state.groups.indexOf(group);
  if (index === -1) return;
  state.lastUndo = {
    type: 'group',
    group,
    index,
    selectedGroupName: state.selectedGroupName,
  };
  state.groups.splice(index, 1);
  if (state.selectedGroupName === group.name) state.selectedGroupName = '';
  state.groupInspectorEditing = false;
  generateOutput();
  render();
  showUndoMessage(`Группа ${group.name} будет удалена.`);
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
  syncRenamedGroupLabels(group);
  generateOutput();
  renderOutputOnly();
}

function syncRenamedGroupLabels(group) {
  const text = group.name || 'Без названия';
  const sidebarTitle = els.groupsMatrix.querySelector('.group-registry-row.is-selected .group-registry-name strong');
  const detailTitle = els.groupsMatrix.querySelector('.group-registry-detail .provider-card-title');
  if (sidebarTitle) sidebarTitle.textContent = text;
  if (detailTitle) detailTitle.textContent = text;
}

function replaceGroupProxyReferences(previousName, nextName) {
  if (!previousName || !nextName || previousName === nextName) return;
  state.groups.forEach((group) => {
    group.proxies = group.proxies.map((name) => (name === previousName ? nextName : name));
  });
  state.rules.forEach((rule) => {
    if (rule.target === previousName) rule.target = nextName;
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
  const rulesSection = findTopSection(lines, 'rules');
  const renamedGroups = getRenamedGroupMap();
  if (!groupsSection) return;

  const replacements = [
    {
      start: groupsSection.start,
      end: groupsSection.end,
      lines: serializeGroupsSection(lines, groupsSection),
    },
  ];
  const hasActiveProviders = state.providers.some((provider) => !provider.deleted);
  const hasActiveRules = getActiveRules().length > 0;

  if (rulesSection && (renamedGroups.size > 0 || haveRulesChanged())) {
    replacements.push({
      start: rulesSection.start,
      end: rulesSection.end,
      lines: serializeRulesSection(lines, rulesSection, renamedGroups),
    });
  } else if (!rulesSection && hasActiveRules) {
    replacements.push({
      start: groupsSection.end,
      end: groupsSection.end,
      lines: ['', ...createRulesSectionLines(renamedGroups)],
    });
  }

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
    state.lastConfigCheckText = '';
    state.lastConfigCheckOk = false;
  }
  state.outputText = nextText;
  restorePersistedConfigCheck();
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
  state.changeCount = countChanges(changes);
  renderOutputPreview();
  renderConfigurationEditorControls();
  renderRouterControls();
  const diagnostics = collectDiagnostics(activeProviders);
  renderShellStatus(diagnostics);
  renderDiagnostics(diagnostics);
  renderReviewSummary(changes, diagnostics);
  renderChanges(changes);
  renderChangesJumpButton(changes);
}

function renderOutputPreview() {
  if (!state.isEditingConfiguration) {
    els.outputPreview.value = state.outputText;
    renderYamlPreview(getOutputPreviewText(state.outputText));
  }
}

function getOutputPreviewText(text) {
  const value = String(text || '');
  return state.hideProviderUrls ? maskProviderUrlsInYaml(value) : value;
}

function maskProviderUrlsInYaml(text) {
  let inProvidersSection = false;
  let inProvidersFlowMap = false;
  let providerUrlBlockIndent = -1;
  return splitLines(text)
    .map((line) => {
      const topLevelEntry = parseTopLevelKeyValueLine(line);
      if (topLevelEntry) {
        inProvidersSection = topLevelEntry.key === 'proxy-providers';
        const sectionValue = String(topLevelEntry.value || '').trim();
        inProvidersFlowMap = inProvidersSection && sectionValue.startsWith('{') && !sectionValue.endsWith('}');
        providerUrlBlockIndent = -1;
        const inlineProviders = inProvidersSection ? parseInlineMap(topLevelEntry.value) : null;
        const hasInlineProviderUrl = inlineProviders && [...inlineProviders.values()]
          .some((value) => parseInlineMap(value)?.has('url'));
        if (hasInlineProviderUrl) {
          const providers = [...inlineProviders.entries()].map(([name, value]) => {
            const provider = parseInlineMap(value);
            return `${formatKey(name)}: ${provider?.has('url') ? formatMaskedInlineProvider(provider) : value}`;
          });
          return `proxy-providers: {${providers.join(', ')}}`;
        }
      }
      if (!inProvidersSection) return line;
      if (inProvidersFlowMap && indentOf(line) === 0 && /^}\s*,?\s*$/.test(line.trim())) {
        inProvidersFlowMap = false;
        return line;
      }

      if (providerUrlBlockIndent !== -1) {
        if (!line.trim()) return line;
        if (indentOf(line) > providerUrlBlockIndent) {
          const indent = line.match(/^\s*/)?.[0] || '';
          return `${indent}••••`;
        }
        providerUrlBlockIndent = -1;
      }

      const providerEntry = parseKeyValueLine(line, 2);
      const providerValue = String(providerEntry?.value || '').trim();
      const hasFlowComma = providerValue.endsWith(',');
      const inlineProvider = parseInlineMap(hasFlowComma ? providerValue.slice(0, -1).trimEnd() : providerValue);
      if (providerEntry && inlineProvider?.has('url')) {
        return `  ${formatKey(providerEntry.key)}: ${formatMaskedInlineProvider(inlineProvider)}${hasFlowComma ? ',' : ''}`;
      }

      const urlEntry = parseKeyValueLine(line, 4);
      if (urlEntry?.key !== 'url') return line;
      if (/^[>|](?:(?:[+-][1-9]?)|(?:[1-9][+-]?))?\s*(?:#.*)?$/.test(urlEntry.value)) {
        providerUrlBlockIndent = 4;
        return '    url: "••••"';
      }
      return maskProviderUrlLine(line);
    })
    .join('\n');
}

function formatMaskedInlineProvider(provider) {
  const entries = [...provider.entries()].map(([key, value]) => (
    `${formatKey(key)}: ${key === 'url' ? '"••••"' : value}`
  ));
  return `{${entries.join(', ')}}`;
}

function maskProviderUrlLine(line) {
  const match = String(line || '').match(/^( {4}(?:url|"url"|'url')\s*:\s*)(.*)$/);
  if (!match) return line;

  const split = splitYamlHighlightComment(match[2]);
  const leading = (split.body.match(/^\s*/) || [''])[0];
  const bodyWithoutLeading = split.body.slice(leading.length);
  const hasFlowComma = /,\s*$/.test(bodyWithoutLeading);
  const bodyWithoutComma = hasFlowComma ? bodyWithoutLeading.replace(/,\s*$/, '') : bodyWithoutLeading;
  const trailing = (bodyWithoutComma.match(/\s*$/) || [''])[0];
  const scalar = bodyWithoutComma.trim();
  if (!scalar) return line;

  const quote = scalar.length > 1 && scalar[0] === scalar[scalar.length - 1] && /['"]/.test(scalar[0]) ? scalar[0] : '';
  const rawValue = quote ? scalar.slice(1, -1) : scalar;
  const hasEscapedSensitiveDelimiter = /\\(?:u003f|u0023|x3f|x23)|%(?:3f|23)/i.test(rawValue);
  const maskedValue = hasEscapedSensitiveDelimiter ? '••••' : maskSensitiveUrl(rawValue);
  if (maskedValue === rawValue) return line;

  const nextScalar = quote ? `${quote}${maskedValue}${quote}` : maskedValue;
  return `${match[1]}${leading}${nextScalar}${trailing}${hasFlowComma ? ',' : ''}${split.comment}`;
}

function renderYamlPreview(text) {
  if (!els.outputCodeView) return;

  const value = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  els.outputCodeView.innerHTML = '';
  els.outputCodeView.classList.toggle('is-empty', !value.trim());

  if (!value.trim()) return;

  value.split('\n').forEach((line) => {
    els.outputCodeView.append(createYamlCodeLine(line));
  });
}

function createYamlCodeLine(line) {
  const row = document.createElement('div');
  const guides = document.createElement('span');
  const code = document.createElement('code');
  const depth = getYamlIndentDepth(line);
  const leadingWhitespace = (line.match(/^\s*/) || [''])[0];

  row.className = 'yaml-line';
  guides.className = 'yaml-guides';
  guides.setAttribute('aria-hidden', 'true');
  code.className = 'yaml-line-code';

  if (!line.trim()) row.classList.add('is-empty');

  if (state.isEditingConfiguration) {
    if (leadingWhitespace) appendYamlSpan(code, '', leadingWhitespace);
    appendYamlHighlightedText(code, line.slice(leadingWhitespace.length));
    row.append(code);
    return row;
  }

  for (let index = 0; index < depth; index += 1) {
    const guide = document.createElement('span');
    guide.className = 'yaml-guide';
    guides.append(guide);
  }

  appendYamlHighlightedText(code, line.trimStart());
  row.append(guides, code);
  return row;
}

function getYamlIndentDepth(line) {
  const indent = (line.match(/^[ \t]*/) || [''])[0].replace(/\t/g, '  ').length;
  return Math.min(12, Math.floor(indent / 2));
}

function appendYamlHighlightedText(target, text) {
  const split = splitYamlHighlightComment(text);

  if (split.body) appendYamlBody(target, split.body);
  if (split.comment) appendYamlSpan(target, 'yaml-comment', split.comment);
}

function appendYamlBody(target, text) {
  let rest = text;
  const listMatch = rest.match(/^(-)(\s*)/);

  if (listMatch) {
    appendYamlSpan(target, 'yaml-list-marker', listMatch[1]);
    if (listMatch[2]) appendYamlSpan(target, '', listMatch[2]);
    rest = rest.slice(listMatch[0].length);
  }

  if (!rest) return;

  const keyMatch = rest.match(/^([^:#{}\[\],][^:{}\[\],#]*?)(:)(\s*)(.*)$/);
  if (keyMatch && !rest.startsWith('{') && !rest.startsWith('[')) {
    appendYamlSpan(target, 'yaml-key', keyMatch[1]);
    appendYamlSpan(target, 'yaml-punctuation', keyMatch[2]);
    if (keyMatch[3]) appendYamlSpan(target, '', keyMatch[3]);
    if (keyMatch[4]) appendYamlValue(target, keyMatch[4]);
    return;
  }

  appendYamlValue(target, rest);
}

function appendYamlValue(target, text) {
  const trimmed = text.trimStart();
  let className = 'yaml-scalar';

  if (/^['"]/.test(trimmed)) className = 'yaml-string';
  else if (/^(true|false|null|~)\b/i.test(trimmed)) className = 'yaml-literal';
  else if (/^[+-]?\d+(\.\d+)?\b/.test(trimmed)) className = 'yaml-number';
  else if (/^[{[]/.test(trimmed)) className = 'yaml-collection';

  appendYamlSpan(target, className, text);
}

function appendYamlSpan(target, className, text) {
  const span = document.createElement('span');
  if (className) span.className = className;
  span.textContent = text;
  target.append(span);
}

function splitYamlHighlightComment(text) {
  let quote = '';

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const previous = text[index - 1];

    if (quote) {
      if (char === quote && !(quote === '"' && previous === '\\')) quote = '';
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '#' && (index === 0 || /\s/.test(previous))) {
      return {
        body: text.slice(0, index),
        comment: text.slice(index),
      };
    }
  }

  return { body: text, comment: '' };
}

function renderChangesOnly() {
  const activeProviders = state.providers.filter((provider) => !provider.deleted);
  const changes = collectChanges(activeProviders);
  renderReviewSummary(changes, collectDiagnostics(activeProviders));
  renderChanges(changes);
  renderChangesJumpButton(changes);
}

function renderConfigurationEditorControls() {
  const isEditing = state.isEditingConfiguration;
  els.outputPreview.readOnly = !isEditing;
  els.outputPreview.classList.toggle('is-editing', isEditing);
  if (els.outputViewer) els.outputViewer.classList.toggle('is-editing', isEditing);
  els.editConfigButton.hidden = isEditing;
  els.applyConfigButton.hidden = !isEditing;
  els.cancelConfigEditButton.hidden = !isEditing;
  els.editConfigButton.disabled = false;
  renderReviewPrimaryActionButton();
  els.downloadButton.disabled = isEditing || !state.outputText;
  els.reviewDownloadButton.disabled = isEditing || !state.outputText;
  els.copyButton.disabled = isEditing || !state.outputText;
  els.changesJumpButton.disabled = !state.originalText;
  renderMobileFlowActions();
  renderRouterControls();
}

function beginConfigurationEdit() {
  const scrollTop = els.outputCodeView?.scrollTop || 0;
  const scrollLeft = els.outputCodeView?.scrollLeft || 0;
  state.isEditingConfiguration = true;
  els.outputPreview.value = state.outputText || state.originalText || els.outputPreview.value || '';
  renderYamlPreview(els.outputPreview.value);
  renderConfigurationEditorControls();
  const selectionOffset = getConfigurationEditorOffset(els.outputPreview.value, scrollTop);
  els.outputPreview.setSelectionRange?.(selectionOffset, selectionOffset);
  els.outputPreview.focus({ preventScroll: true });
  els.outputPreview.scrollTop = scrollTop;
  els.outputPreview.scrollLeft = scrollLeft;
  syncConfigurationEditorScroll();
}

function handleConfigurationDraftInput() {
  if (!state.isEditingConfiguration) return;
  renderYamlPreview(els.outputPreview.value);
  syncConfigurationEditorScroll();
}

function syncConfigurationEditorScroll() {
  if (!state.isEditingConfiguration || !els.outputCodeView) return;
  els.outputCodeView.scrollTop = els.outputPreview.scrollTop;
  els.outputCodeView.scrollLeft = els.outputPreview.scrollLeft;
}

function getConfigurationEditorOffset(text, scrollTop) {
  const styles = window.getComputedStyle?.(els.outputCodeView);
  const lineHeight = Number.parseFloat(styles?.lineHeight) || 20.15;
  const paddingTop = Number.parseFloat(styles?.paddingTop) || 10;
  const lines = String(text || '').split('\n');
  const targetLine = Math.min(lines.length - 1, Math.max(0, Math.floor((scrollTop - paddingTop) / lineHeight)));
  let offset = 0;

  for (let index = 0; index < targetLine; index += 1) {
    offset += lines[index].length + 1;
  }

  return offset;
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
  if (els.outputCodeView) els.outputCodeView.scrollTop = 0;
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
  getActiveRules().forEach((rule, index) => {
    const title = `Правило ${index + 1}`;
    if (!rule.type || /[\r\n]/.test(rule.type)) {
      errors.push(`${title}: укажите тип правила.`);
    }
    if (ruleRequiresValue(rule.type) && (!rule.value || /[\r\n]/.test(rule.value))) {
      errors.push(`${title}: укажите условие правила.`);
    }
    if (!rule.target || /[\r\n]/.test(rule.target)) {
      errors.push(`${title}: укажите цель правила.`);
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

function getRenamedGroupMap() {
  const renamed = new Map();
  state.groups.forEach((group) => {
    const originalName = group.originalName || group.name;
    if (originalName && group.name && originalName !== group.name) {
      renamed.set(originalName, group.name);
    }
  });
  return renamed;
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
  const original = state.originalProviders.find(
    (item) => item.name === provider.originalName || item.name === provider.name,
  );
  const current = snapshotProvider(provider, { output: true });
  const changed = (...keys) => !original || keys.some((key) => current[key] !== original[key]);
  if (provider.name !== provider.originalName) {
    lines[0] = `  ${formatKey(provider.name)}:`;
  }

  if (changed('hasType', 'type')) {
    setOptionalNestedScalar(lines, 1, 'type', current.hasType ? provider.type || 'http' : '');
  }
  if (changed('hasUrl', 'url')) {
    setOptionalNestedScalar(lines, 1, 'url', current.hasUrl ? provider.url : '');
  }
  if (changed('hasFilter', 'filter')) {
    setOptionalNestedScalar(lines, 1, 'filter', current.hasFilter ? provider.filter : '');
  }
  if (changed('hasExcludeFilter', 'excludeFilter')) {
    setOptionalNestedScalar(lines, 1, 'exclude-filter', current.hasExcludeFilter ? provider.excludeFilter : '');
  }
  if (changed('hasExcludeType', 'excludeType')) {
    setOptionalNestedScalar(lines, 1, 'exclude-type', current.hasExcludeType ? provider.excludeType : '');
  }
  if (changed('hasPath', 'path')) {
    setOptionalNestedScalar(lines, 1, 'path', current.hasPath ? provider.path : '');
  }
  if (changed('hasInterval', 'interval')) {
    setOptionalNestedScalar(lines, 1, 'interval', current.hasInterval ? provider.interval || '86400' : '');
  }

  const headerKeys = [];
  if (changed('hasUserAgent', 'userAgent')) headerKeys.push('User-Agent');
  if (changed('hasXHwid', 'xHwid')) headerKeys.push('x-hwid');
  if (changed('customHeaders')) {
    headerKeys.push(
      ...(provider.customHeaderKeys || []),
      ...parseCustomHeaderText(provider.customHeaders).map((entry) => entry.key),
    );
  }
  if (headerKeys.length > 0) setHeader(lines, provider, [...new Set(headerKeys)]);

  const healthKeys = [];
  if (changed('hasHealthUrl', 'healthUrl')) healthKeys.push('url');
  if (changed('hasHealthInterval', 'healthInterval')) healthKeys.push('interval');
  if (changed('hasHealthCheck')) {
    if (!current.hasHealthCheck) {
      const block = findNestedBlock(lines, 'health-check', 4);
      if (block) lines.splice(block.start, block.end - block.start);
    } else {
      healthKeys.push('url', 'interval');
    }
  }
  if (current.hasHealthCheck && healthKeys.length > 0) {
    setHealthCheck(lines, provider, [...new Set(healthKeys)]);
  }

  const overrideKeys = [];
  if (changed('hasUdp', 'udp')) overrideKeys.push('udp');
  if (changed('hasTfo', 'tfo')) overrideKeys.push('tfo');
  if (overrideKeys.length > 0) setOverride(lines, provider, overrideKeys);
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

function serializeRulesSection(lines, rulesSection, renamedGroups) {
  const activeRules = getActiveRules();
  if (activeRules.length === 0) return ['rules: []'];
  if (haveRuleOrderChanged()) return createRulesSectionLines(renamedGroups);

  const sectionLines = lines.slice(rulesSection.start, rulesSection.end);
  const existingRules = state.rules
    .filter((rule) => !rule.isNew && rule.start >= rulesSection.start)
    .map((rule) => {
      const replacement = rule.deleted ? [] : [serializeRule(rule, renamedGroups)];
      return {
        start: rule.start - rulesSection.start,
        end: rule.start - rulesSection.start + 1,
        lines: replacement,
      };
    })
    .sort((a, b) => b.start - a.start);

  existingRules.forEach((replacement) => {
    sectionLines.splice(replacement.start, replacement.end - replacement.start, ...replacement.lines);
  });

  const newRules = state.rules.filter((rule) => rule.isNew && !rule.deleted);
  if (newRules.length > 0) {
    let insertAt = sectionLines.length;
    while (insertAt > 1 && !sectionLines[insertAt - 1].trim()) insertAt -= 1;
    sectionLines.splice(insertAt, 0, ...newRules.map((rule) => serializeRule(rule, renamedGroups)));
  }

  return sectionLines;
}

function createRulesSectionLines(renamedGroups = new Map()) {
  const activeRules = getActiveRules();
  if (activeRules.length === 0) return ['rules: []'];
  return ['rules:', ...activeRules.map((rule) => serializeRule(rule, renamedGroups))];
}

function serializeRule(rule, renamedGroups = new Map()) {
  const target = renamedGroups.get(rule.target) || rule.target;
  const nextRule = { ...rule, target };
  const body = buildRuleParts(nextRule).map((part) => formatScalar(part)).join(',');
  const comment = rule.comment ? ` ${rule.comment}` : '';
  return `${rule.indent || '  '}- ${body}${comment}`;
}

function buildRuleParts(rule) {
  const type = normalizeRuleType(rule.type);
  const target = String(rule.target || '').trim();
  const value = String(rule.value || '').trim();
  const options = (rule.options || []).filter(Boolean);

  if (type === 'MATCH') return [type, target, ...options];
  if (ruleRequiresValue(type)) return [type, value, target, ...options];
  if (value) return [type, value, target, ...options];
  return [type, target, ...options];
}

function serializeGroupsSection(lines, groupsSection) {
  const sectionLines = lines.slice(groupsSection.start, groupsSection.end);
  const replacements = parseGroups(lines, groupsSection)
    .map((parsedGroup) => {
      const currentGroup = state.groups.find((group) => (group.originalName || group.name) === parsedGroup.name);
      if (!currentGroup) {
        return {
          start: parsedGroup.start - groupsSection.start,
          end: parsedGroup.end - groupsSection.start,
          lines: [],
        };
      }
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

function setHeader(lines, provider, managedKeys = getManagedHeaderKeys(provider)) {
  const keys = new Set(managedKeys);
  setKeyedBlock(
    lines,
    'header',
    getHeaderEntries(provider).filter((entry) => keys.has(entry.key)),
    managedKeys,
  );
}

function setOverride(lines, provider, managedKeys = ['udp', 'tfo']) {
  const keys = new Set(managedKeys);
  setKeyedBlock(
    lines,
    'override',
    [
      { key: 'udp', value: provider.udp, format: formatBooleanValue },
      { key: 'tfo', value: provider.tfo, format: formatBooleanValue },
    ].filter((entry) => keys.has(entry.key)),
    managedKeys,
  );
}

function setKeyedBlock(lines, blockKey, entries, managedKeysOverride) {
  const block = findNestedBlock(lines, blockKey, 4);
  const activeEntries = entries.filter((entry) => entry.value !== false && String(entry.value || '').trim() !== '');
  const managedKeys = new Set(managedKeysOverride || entries.map((entry) => entry.key));

  if (!block) {
    if (activeEntries.length > 0) {
      lines.push(...serializeKeyedBlock(blockKey, [], activeEntries));
    }
    return;
  }

  const blockEntry = parseKeyValueLine(lines[block.start], 4);
  const inlineMap = parseInlineMap(blockEntry?.value);
  if (inlineMap) {
    const nextEntries = [...inlineMap.entries()].filter(([key]) => !managedKeys.has(key));
    activeEntries.forEach((entry) => nextEntries.push([entry.key, entry.format(entry.value)]));
    if (nextEntries.length === 0) {
      lines.splice(block.start, block.end - block.start);
    } else {
      lines.splice(
        block.start,
        block.end - block.start,
        `    ${blockKey}: {${nextEntries.map(([key, value]) => `${formatKey(key)}: ${value}`).join(', ')}}`,
      );
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
  const entries = getHeaderEntries(provider).filter((entry) => String(entry.value || '').trim() !== '');

  if (entries.length > 0) {
    lines.push(...serializeKeyedBlock('header', [], entries));
  }
}

function getHeaderEntries(provider) {
  return [
    { key: 'User-Agent', value: provider.userAgent, format: formatHeaderValue },
    { key: 'x-hwid', value: provider.xHwid, format: formatHeaderValue },
    ...parseCustomHeaderText(provider.customHeaders).map((entry) => ({
      key: entry.key,
      value: entry.value,
      format: formatHeaderValue,
    })),
  ];
}

function getManagedHeaderKeys(provider) {
  return [
    'User-Agent',
    'x-hwid',
    ...(provider.customHeaderKeys || []),
    ...parseCustomHeaderText(provider.customHeaders).map((entry) => entry.key),
  ];
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

function setHealthCheck(lines, provider, managedKeys = ['url', 'interval']) {
  const keys = new Set(managedKeys);
  const block = findNestedBlock(lines, 'health-check', 4);
  const defaultHealthCheckBlock = [
    '    health-check:',
    '      enable: true',
  ];
  if (keys.has('url') && provider.hasHealthUrl) {
    defaultHealthCheckBlock.push(`      url: ${formatScalar(provider.healthUrl || DEFAULT_HEALTH_URL)}`);
  }
  if (keys.has('interval') && provider.hasHealthInterval) {
    defaultHealthCheckBlock.push(`      interval: ${formatScalar(provider.healthInterval || '300')}`);
  }

  if (!block) {
    lines.push(...defaultHealthCheckBlock);
    return;
  }

  const entry = parseKeyValueLine(lines[block.start], 4);
  const inlineMap = parseInlineMap(entry?.value);
  if (entry?.value && !inlineMap) return;

  if (inlineMap) {
    const preservedEntries = [...inlineMap.entries()].filter(([key]) => !keys.has(key));
    lines.splice(block.start, block.end - block.start, ...[
      '    health-check:',
      ...preservedEntries.map(([key, value]) => `      ${key}: ${value}`),
      ...(keys.has('url') && provider.hasHealthUrl
        ? [`      url: ${formatScalar(provider.healthUrl || DEFAULT_HEALTH_URL)}`]
        : []),
      ...(keys.has('interval') && provider.hasHealthInterval
        ? [`      interval: ${formatScalar(provider.healthInterval || '300')}`]
        : []),
    ]);
    return;
  }

  const healthLines = lines.slice(block.start, block.end);
  if (keys.has('url')) {
    setOptionalNestedScalar(healthLines, 2, 'url', provider.hasHealthUrl ? provider.healthUrl || DEFAULT_HEALTH_URL : '');
  }
  if (keys.has('interval')) {
    setOptionalNestedScalar(healthLines, 2, 'interval', provider.hasHealthInterval ? provider.healthInterval || '300' : '');
  }
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
    const customHeaderEntries = readCustomHeaderEntries(rawLines);
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
      customHeaders: formatCustomHeaderText(customHeaderEntries),
      customHeaderKeys: customHeaderEntries.map((item) => item.key),
      udp: readBlockBool(rawLines, 'override', 'udp'),
      tfo: readBlockBool(rawLines, 'override', 'tfo'),
      path: readScalar(rawLines, 4, 'path') || '',
      interval: readScalar(rawLines, 4, 'interval') || '86400',
      healthUrl: readHealthScalar(rawLines, 'url') || DEFAULT_HEALTH_URL,
      healthInterval: readHealthScalar(rawLines, 'interval') || '300',
      hasType: hasNestedKey(rawLines, 1, 'type'),
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

function parseRules(lines, section) {
  const rules = [];

  for (let index = section.start + 1; index < section.end; index += 1) {
    const rule = parseRuleLine(lines[index], index, rules.length);
    if (rule) rules.push(rule);
  }

  return rules;
}

function parseRuleLine(line, lineIndex, originalIndex) {
  const match = String(line || '').match(/^(\s*)-\s*(.*)$/);
  if (!match) return null;

  const split = splitYamlHighlightComment(match[2]);
  const rawRuleText = split.body.trim();
  if (!rawRuleText) return null;

  const rawParts = splitRuleParts(rawRuleText);
  const parts = rawParts.map((part) => cleanScalar(part));
  const type = normalizeRuleType(parts[0]);
  const targetIndex = getRuleTargetIndexFromParts(parts);
  const target = targetIndex === -1 ? '' : cleanScalar(parts[targetIndex]);
  const value = type === 'MATCH' || targetIndex <= 1 ? '' : cleanScalar(parts[1]);
  const options = targetIndex === -1 ? [] : parts.slice(targetIndex + 1).map((part) => cleanScalar(part)).filter(Boolean);

  return {
    id: createRuleId(),
    originalIndex,
    type,
    value,
    target,
    options,
    rawParts,
    rawLine: line,
    comment: split.comment.trim(),
    indent: match[1] || '  ',
    start: lineIndex,
    isNew: false,
    deleted: false,
  };
}

function createRuleId() {
  const id = `rule-${ruleIdCounter}`;
  ruleIdCounter += 1;
  return id;
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

  const blockEntry = parseKeyValueLine(lines[block.start], 4);
  const inlineMap = parseInlineMap(blockEntry?.value);
  if (inlineMap?.has(key)) return cleaner(inlineMap.get(key));

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

function readCustomHeaderEntries(lines) {
  const block = findNestedBlock(lines, 'header', 4);
  if (!block) return [];

  const blockEntry = parseKeyValueLine(lines[block.start], 4);
  const inlineMap = parseInlineMap(blockEntry?.value);
  if (inlineMap) {
    return [...inlineMap.entries()]
      .filter(([key]) => !FIXED_HEADER_KEYS.has(key))
      .map(([key, value]) => ({ key, value: cleanListScalar(value) }));
  }

  const entries = [];
  for (let index = block.start + 1; index < block.end; index += 1) {
    const entry = parseKeyValueLine(lines[index], 6);
    if (!entry || FIXED_HEADER_KEYS.has(entry.key)) continue;

    const value = readBlockScalar(lines, 'header', entry.key, cleanListScalar) || cleanListScalar(entry.value);
    entries.push({ key: entry.key, value });
  }
  return entries;
}

function parseCustomHeaderText(text) {
  return splitLines(text)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(':');
      if (separator === -1) return null;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      return key ? { key, value } : null;
    })
    .filter(Boolean);
}

function normalizeCustomHeaderText(text) {
  return parseCustomHeaderText(text)
    .map((entry) => `${entry.key}: ${entry.value}`)
    .join('\n');
}

function formatCustomHeaderText(entries) {
  return entries.map((entry) => `${entry.key}: ${entry.value}`).join('\n');
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

function showMessage(text, options = {}) {
  const normalized = options?.href ? { link: options } : options || {};
  const severity = normalized.severity || 'warning';

  els.messageBox.textContent = text;
  els.messageBox.className = `message is-${severity}`;
  els.messageBox.setAttribute('role', severity === 'error' ? 'alert' : 'status');

  const link = normalized.link;
  if (link?.href && link?.label) {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label;
    els.messageBox.append(' ', anchor);
  }

  if (Array.isArray(normalized.actions) && normalized.actions.length > 0) {
    const actions = document.createElement('span');
    actions.className = 'message-actions';
    normalized.actions.forEach((action) => {
      const button = document.createElement('button');
      button.className = 'message-action';
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      actions.append(button);
    });
    els.messageBox.append(actions);
  }

  if (normalized.details) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const body = document.createElement('div');
    details.className = 'message-details';
    summary.textContent = 'Технические подробности';
    body.textContent = normalized.details;
    details.append(summary, body);
    els.messageBox.append(details);
  }
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
  link.download = getExportFileName(state.fileName);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getExportFileName(fileName) {
  const rawName = String(fileName || '').trim();
  const baseName = rawName.split(/[\\/]/).filter(Boolean).pop() || 'mihomo-config';
  const safeName = baseName.replace(/[<>:"|?*\x00-\x1F]/g, '-').trim() || 'mihomo-config';
  return /\.ya?ml$/i.test(safeName) ? safeName : `${safeName}.yaml`;
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
