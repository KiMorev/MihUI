const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('main and standalone UI expose labels for audited controls', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const html = read(name);
    assert.match(html, /<h1><a class="app-brand-home" href="" aria-label="[^"]+">WebMihomo<\/a><\/h1>/);
    assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,/);
    assert.match(html, /id="backupHistoryButton"[\s\S]+?История конфигурации…/);
    assert.match(html, /id="backupHistoryDialog"[^>]+aria-labelledby="backupHistoryTitle"[^>]+aria-describedby="backupHistoryDescription"/);
    assert.match(html, /id="backupHistoryList"[^>]+role="radiogroup"[^>]+aria-label="Версии конфигурации"/);
    assert.match(html, /id="backupUnsavedWarning"[\s\S]+?Есть несохранённые изменения/);
    assert.doesNotMatch(html, /id="routerPanel"|class="backup-tools"|id="backupSelect"/);
    assert.match(html, /id="bulkIntervalInput"[^>]+aria-label=/);
    assert.match(html, /id="bulkHealthIntervalInput"[^>]+aria-label=/);
    assert.match(html, /id="outputPreview"[^>]+aria-label=/);
    assert.match(html, /id="hideProviderUrlsSetting" type="checkbox"/);
    assert.match(html, /class="button compact provider-url-reveal-button"[\s\S]+?Показать/);
    assert.match(html, /id="nodeInventoryStatus"/);
    assert.match(html, /id="nodeResetFiltersButton"/);
    assert.doesNotMatch(html, /happDecoder|happDecryptor|Интеграция Happ Decoder/);
    assert.match(html, /id="copyButton"[^>]+aria-label="Копировать полный YAML с исходными ссылками"/);
    assert.match(html, /id="reviewDownloadButton"[^>]+aria-label="Скачать полный YAML с исходными ссылками"/);
    assert.match(html, /id="mobileFlowActions"[^>]+aria-label=/);
    assert.match(html, /id="providerListActionHome"/);
    assert.match(html, /id="groupListActionHome"/);
    assert.match(html, /id="intervalToolsButton"[\s\S]+?Настроить обновления/);
    assert.match(html, /id="providerStatusRefreshButton"[\s\S]+?Обновить статусы/);
    assert.match(html, /id="addProviderButton"[^>]+aria-label="Добавить подписку"/);
    assert.match(html, /id="addProviderButton"[^>]+class="[^"]*primary[^"]*"[\s\S]+?\+ Добавить/);
    assert.match(html, /id="providerCreateDialog"[^>]+aria-labelledby="providerCreateTitle"[^>]+aria-describedby="providerCreateDescription"/);
    assert.match(html, /id="providerCreateUrl"[^>]+required/);
    assert.match(html, /id="providerCreateInterval"[^>]+min="60"[^>]+step="1"[^>]+required/);
    assert.match(html, /id="providerCreateHealthInterval"[^>]+min="30"[^>]+step="1"[^>]+required/);
    assert.match(html, /class="provider-interval"[^>]+min="60"[^>]+step="1"/);
    assert.match(html, /class="provider-health-interval"[^>]+min="30"[^>]+step="1"/);
    assert.match(html, /id="providerCreateCancelButton"[^>]*>Отмена<\/button>/);
    assert.match(html, /id="providerCreateSubmitButton"[^>]+disabled>Добавить подписку<\/button>/);
    assert.match(html, /id="providerCreateGroups" class="provider-create-groups"/);
    assert.match(html, /id="providerEditDialog"[^>]+aria-labelledby="providerEditTitle"[^>]+aria-describedby="providerEditDescription"/);
    assert.match(html, /id="providerEditCancelButton"[^>]*>Отмена<\/button>/);
    assert.match(html, /id="providerEditSubmitButton"[^>]*>Сохранить изменения<\/button>/);
    assert.match(html, /id="addGroupButton"[^>]+class="[^"]*primary[^"]*"[^>]+aria-label="Добавить группу"[\s\S]+?\+ Добавить группу/);
    assert.match(html, /id="checkConfigButton"[^>]+class="[^"]*button[^"]*compact[^"]*"[\s\S]+?Проверить YAML в Mihomo/);
    assert.match(html, /id="fileTools"[\s\S]+?summary aria-label="Конфигурация"[\s\S]+?id="routerLoadButton"[\s\S]+?Перезагрузить с роутера/);
    assert.match(html, /id="backupHistoryButton"[^>]+class="file-menu-item"[\s\S]+?file-tools-separator[\s\S]+?Загрузить YAML[\s\S]+?Скачать YAML/);
    assert.doesNotMatch(html, /icon-more|Загрузить файл/);
    assert.doesNotMatch(html, /sidebarStatus|sidebar-status|sidebar-check-button|Итог и сохранение/);
    assert.match(html, /app-brand-title-row[\s\S]+?id="uiLinks" class="brand-ui-links"/);
    assert.match(html, /data-section="providers"[^>]*[\s\S]+?Подписки и группы/);
    assert.match(html, /aria-label="Подписки и группы"[\s\S]+?id="providerRelationsTab"[\s\S]+?Группы/);
    assert.match(html, /Реестр групп[\s\S]+?id="groupSearchInput"[^>]+aria-label="Поиск группы"[\s\S]+?data-group-type-filter="all"/);
    assert.doesNotMatch(html, /Связи с группами|class="top-ui-links"/);
    assert.equal((html.match(/data-service-health="xkeen"/g) || []).length, 2);
    assert.equal((html.match(/data-service-health="mihomo"/g) || []).length, 2);
    assert.match(html, /data-components-open[^>]+aria-label="Открыть состояние сервисов и версии"/);
    assert.match(html, /data-service-update-badge[^>]+hidden>Обновления · 0/);
    assert.match(html, /id="componentManagerDialog"[^>]+aria-labelledby="componentManagerTitle"/);
    assert.match(html, /data-component-update="xkeen"/);
    assert.match(html, /data-component-update="mihomo"/);
    assert.match(html, /data-xkeen-channel="stable"/);
    assert.match(html, /data-xkeen-channel="beta"/);
    assert.equal((html.match(/data-maintenance-component=/g) || []).length, 4);
    assert.equal((html.match(/<button[^>]+data-component-advanced-toggle/g) || []).length, 2);
    assert.match(html, /id="componentMaintenance"[^>]+hidden/);
    assert.match(html, /id="openComponentMaintenanceButton"[^>]*>Обслуживание<\/button>/);
    assert.doesNotMatch(html, /4 действия|Проверить версии|Проверить обновление/);
    assert.match(html, /id="mihomoVersionSelect"/);
    assert.match(html, /id="overviewConfigSource"/);
    assert.match(html, /id="overviewConfigLoadedLabel"/);
    assert.doesNotMatch(html, /Состояние сервисов/);
    assert.match(html, /review-page-head[\s\S]+?Результат проверки[\s\S]+?Итоговый YAML/);
    assert.match(html, /id="reviewChangeStatus"[\s\S]+?id="reviewYamlStatus"[\s\S]+?id="reviewYamlMeta"/);
    assert.doesNotMatch(html, /Финальная проверка|Итоговая конфигурация/);
  }
});

test('main and standalone expose one review-to-save flow', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /'Проверить и сохранить'/);
    assert.match(source, /'Сохранить и применить'/);
    assert.match(source, /label: 'Исправить ошибки'/);
    assert.match(source, /'Проверить YAML в Mihomo'/);
    assert.match(source, /validation = 'Локальная проверка: OK'/);
    assert.doesNotMatch(source, /saveReviewReady|Проверить изменения|Сохранить в ядро|Открыть с роутера/);
  }
});

test('main and standalone use only the browser Happ decryptor', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /decodeHappProviderUrlInBrowser/);
    assert.doesNotMatch(source, /\/api\/happ\/decode|settings\/happ-decoder|Happy Decoder API|server fallback/);
  }

  const server = read('router/mihui_server.py');
  assert.doesNotMatch(server, /HAPP_DECRYPTOR|HAPP_DECODER|happy-decoder|\/api\/happ\/decode|settings\/happ-decoder/);
});

test('main and standalone expose responsive service traffic lights', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.service-health-item\.is-ok \.service-health-dot/);
    assert.match(source, /\.service-health-item\.is-error \.service-health-dot/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.service-health-mobile\s*{[\s\S]+?display: grid;/);
  }
});

test('main and standalone expose preventive and critical resource latency settings', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const html = read(name);
    assert.match(html, /id="resourceMonitorProactiveEnabled"/);
    assert.match(html, /id="resourceMonitorProactiveThreshold"/);
    assert.match(html, /id="resourceMonitorMinimumImprovement"/);
    assert.match(html, /id="resourceMonitorLatencyThreshold"/);
    assert.match(html, /<option value="400">400 мс<\/option>/);
    assert.match(html, /Минимальное улучшение/);
  }
});

test('main and standalone expose compact resource monitoring history', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const html = read(name);
    assert.match(html, /id="resourceMonitorHistory"/);
    assert.match(html, /id="resourceMonitorHistoryRows"/);
    assert.match(html, /id="resourceMonitorHistorySummary"/);
    assert.match(html, /id="resourceMonitorHistoryTooltip"[^>]+role="tooltip"/);
    assert.match(html, /История проверок/);
    assert.match(html, /class="is-idle"[^>]*><\/i>Нет данных/);
  }
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const script = read(name);
    assert.match(script, /buildResourceMonitorTimeline/);
    assert.match(script, /getResourceMonitorHistoryTooltipContent/);
    assert.match(script, /showResourceMonitorHistoryTooltip/);
    assert.match(script, /RESOURCE_MONITOR_SWITCH_NOTE_TTL_SECONDS = 2 \* 60 \* 60/);
    assert.match(script, /Сменена \$\{formatResourceMonitorSwitchAge/);
  }
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.resource-monitor-history-track\s*{/);
    assert.match(source, /grid-template-columns: repeat\(24, minmax\(0, 1fr\)\)/);
    assert.match(source, /\.resource-monitor-history-segment\.has-switch/);
    assert.match(source, /\.resource-monitor-history-tooltip\s*{/);
  }
});

test('main and standalone expose Instagram resource monitoring', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    assert.match(read(name), /id="icon-instagram"/);
  }
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /instagram: \{ title: 'Instagram', group: 'INSTAGRAM', icon: 'instagram' \}/);
    assert.match(source, /\['RULE-SET', 'instagram@domain', 'INSTAGRAM'\]/);
    assert.match(source, /\['RULE-SET', 'openai@domain', 'AI'\]/);
    assert.match(source, /\['RULE-SET', 'anthropic@domain', 'AI'\]/);
  }
});

test('main and standalone expose per-resource monitoring switches', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /dataset\.resourceMonitorEnabled = key/);
    assert.match(source, /dataset\.resourceMonitorSource = key/);
    assert.match(source, /collectResourceMonitorDialogServices/);
    assert.match(source, /normalizeResourceMonitorSourceNames/);
    assert.match(source, /getEnabledResourceMonitorEntries/);
  }
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.resource-monitor-source-picker\s*{/);
    assert.match(source, /\.resource-monitor-source-menu\s*{/);
    assert.match(source, /\.resource-monitor-source-option:has\(input:checked\)/);
  }
});

test('main and standalone expose component update markers and one manager flow', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /title: 'Доступны обновления компонентов'/);
    assert.match(source, /element\.textContent = `Обновления · \$\{updateCount\}`/);
    assert.match(source, /updateMarker\.hidden = !state\.components\.items\[serviceName\]\?\.updateAvailable/);
    assert.match(source, /apiJson\('\/api\/components\/action'/);
    assert.match(source, /'X-Mihui-Action': 'components'/);
    assert.match(source, /action: 'channel'/);
    assert.match(source, /component: 'all', action: 'update'/);
    assert.match(source, /\['restart', 'geo-update'\]/);
    assert.match(source, /latestBuildTimestamp/);
    assert.match(source, /Последняя сборка/);
    assert.doesNotMatch(source, /Через XKeen/);
    assert.match(source, /Понизить Mihomo/);
    assert.match(source, /Переустановить текущую Beta-сборку/);
    assert.match(source, /state\.components\.jobVisible = true/);
    assert.match(source, /state\.components\.jobVisible && job\.ok !== null/);
    assert.match(source, /getComponentActionSuccessLabel\(job\)/);
    assert.doesNotMatch(source, /!state\.components\.job\.running\) els\.componentJobDetails\.open = false/);
    assert.match(source, /componentAdvancedButtons[\s\S]+?aria-controls[\s\S]+?aria-expanded[\s\S]+?panel\.hidden = expanded/);
    assert.doesNotMatch(source, /components\/action[\s\S]{0,300}cmd:/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.service-health-head \.service-update-badge/);
    assert.match(source, /\.service-update-marker\s*{[\s\S]+?background: #fff1c7;[\s\S]+?color: #946200;/);
    assert.match(source, /\.component-manager-dialog::backdrop/);
    assert.match(source, /\.component-manager-state\.is-update/);
    assert.match(source, /body\.component-manager-open\s*{/);
    assert.match(source, /\.component-advanced-toggle\s*{[\s\S]+?justify-self: start;/);
    assert.match(source, /\.component-advanced-body\s*{[\s\S]+?grid-column: 1 \/ -1;[\s\S]+?display: flex;/);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?max-height: calc\(100dvh - 16px\);/);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?\.component-manager-item:not\(\.is-update-available\) \.component-advanced-toggle\s*{[\s\S]+?grid-column: 1 \/ -1;/);
    assert.match(source, /\.component-manager-item:not\(\.is-update-available\) \[data-component-update\][\s\S]+?display: none;/);
    assert.match(source, /\.component-job-panel pre\s*{[\s\S]+?max-width: 100%;[\s\S]+?max-height: min\(180px, 30vh\);/);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?\.component-job-panel pre\s*{[\s\S]+?overflow-wrap: anywhere;/);
    assert.match(source, /@media \(max-width: 560px\) and \(max-height: 600px\)/);
  }

  for (const name of ['index.html', 'mihomo-editor.html']) {
    const source = read(name);
    assert.equal((source.match(/class="button compact component-advanced-toggle"[^>]+data-component-advanced-toggle[^>]+aria-expanded="false"/g) || []).length, 2);
    assert.equal((source.match(/class="component-advanced-body" hidden/g) || []).length, 2);
    assert.equal((source.match(/data-service-update-marker hidden/g) || []).length, 4);
    assert.match(source, /id="dismissComponentJobButton"[^>]*hidden>Скрыть<\/button>/);
    assert.match(source, /<summary>Журнал операции<\/summary>/);
    assert.doesNotMatch(source, /service-update-mobile-badge/);
  }
});

test('main and standalone expose one safe XKeen network-files flow', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /data-section="xkeen-files"[\s\S]+?Порты и исключения/);
    assert.equal((source.match(/data-xkeen-file="/g) || []).length, 4);
    assert.match(source, /id="xkeenRestartButton"[\s\S]+?Перезапустить XKeen/);
    assert.match(source, /id="xkeenFilesRefreshButton"[\s\S]+?Обновить с роутера/);
    assert.match(source, /id="xkeenRestartAfterSave" type="checkbox" checked/);
    assert.match(source, /id="xkeenFilesSaveButton"[\s\S]+?Сохранить и применить/);
  }

  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /apiJson\('\/api\/xkeen\/network-files'/);
    assert.match(source, /startComponentAction\(\{ component: 'xkeen', action: 'restart' \}\)/);
    assert.match(source, /'X-Mihui-Action': 'xkeen-network-files'/);
    assert.match(source, /Порты проксирования имеют приоритет/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.xkeen-file-editor\s*{[\s\S]+?width: auto;[\s\S]+?min-width: 0;/);
  }
});

test('main and standalone expose the native interactive XKeen commands section', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /data-section="commands"[^>]*[\s\S]+?>Команды</);
    assert.match(source, /data-section-panel="commands"/);
    assert.match(source, /id="xkeenCommandsBody"/);
    assert.match(source, /id="xkeenCommandConsole"/);
    assert.match(source, /id="xkeenCommandInputForm"/);
    assert.match(source, /id="xkeenCommandStopButton"/);
  }

  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /apiJson\('\/api\/xkeen\/commands\/run'/);
    assert.match(source, /apiJson\('\/api\/xkeen\/commands\/input'/);
    assert.match(source, /apiJson\('\/api\/xkeen\/commands\/stop'/);
    assert.match(source, /'X-Mihui-Action': 'xkeen-command'/);
    assert.match(source, /function renderXkeenCommands\(\)/);
    assert.match(source, /const row = document\.createElement\('button'\)/);
    assert.match(source, /row\.dataset\.commandFlag =/);
    assert.doesNotMatch(source, /command-run-button/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.commands-grid\s*{/);
    assert.match(source, /\.command-row\s*{/);
    assert.match(source, /\.command-console pre\s*{/);
  }
});

test('main and standalone expose the UI switcher in the brand block', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /summary\.setAttribute\('aria-label', 'Открыть список интерфейсов'\)/);
    assert.match(source, /menuTitle\.textContent = 'Интерфейсы'/);
    assert.match(source, /current\.textContent = 'Текущий'/);
    assert.doesNotMatch(source, /`UI \(\$\{items\.length\}\)`/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.app-brand-title-row\s*{/);
    assert.match(source, /\.ui-link-item\.is-current\s*{/);
  }
});

test('main and standalone keep provider filter text size stable on iOS', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.provider-inspector-list\s*{[\s\S]+?-webkit-text-size-adjust: 100%;[\s\S]+?text-size-adjust: 100%;/);
  }
});

test('main and standalone present provider filters as compact disclosures', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /createProviderFilterInspectorSection\(provider\)/);
    assert.match(source, /section\.open = window\.matchMedia\('\(min-width: 981px\)'\)\.matches/);
    assert.match(source, /show\.textContent = 'Полностью'/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.provider-inspector-filter-head,[\s\S]+?min-height: 44px;/);
    assert.match(source, /\.provider-inspector-filter-preview\s*{[\s\S]+?-webkit-line-clamp: 2;/);
  }
});

test('main and standalone expose a flat configuration menu', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.file-tools-menu\s*{[\s\S]+?min-width: 240px;/);
    assert.match(source, /\.file-menu-item\s*{[\s\S]+?border: 0;[\s\S]+?text-align: left;[\s\S]+?white-space: nowrap;/);
    assert.match(source, /\.file-tools-separator\s*{/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.file-menu-item,[\s\S]+?min-height: 44px;/);
  }
});

test('main and standalone styles adapt backup history dialog on mobile', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.backup-history-dialog::backdrop\s*{/);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?\.backup-history-dialog,[\s\S]+?max-height: calc\(100vh - 20px\);/);
  }
});

test('main and standalone require an explicit backup selection before restore', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /state\.selectedBackupName = '';/);
    assert.match(source, /els\.backupUnsavedWarning\.hidden = !hasUnsavedRouterChanges\(\)/);
    assert.match(source, /els\.restoreBackupButton\.disabled = state\.routerBusy \|\| !state\.selectedBackupName/);
    assert.match(source, /Версия восстановлена, Mihomo перезагружен/);
  }
});

test('main and standalone guard destructive and stale config changes', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /addEventListener\?\.\('beforeunload', handleBeforeUnload\)/);
    assert.match(source, /expectedRevision: state\.routerConfigRevision \|\| undefined/);
    assert.match(source, /result\.stage === 'conflict'/);
    assert.match(source, /Применить рискованные изменения\?/);
    assert.match(source, /Удалить подписку \$\{provider\.name\}\?/);
    assert.match(source, /Удалить правило \$\{formatRuleSummary\(rule\)\}\?/);
    assert.match(source, /Mihomo не применил версию\. Текущий конфиг восстановлен/);
  }
});

test('main and standalone styles expose mobile flow actions and touch targets', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.mobile-flow-actions:not\(\[hidden\]\)/);
    assert.doesNotMatch(source, /\.mobile-flow-actions:not\(\[hidden\]\)\s*{[^}]*position:\s*sticky/);
    assert.match(source, /\.review-workflow\.has-review-side\s*{[\s\S]+?grid-template-columns: minmax\(330px, 0\.72fr\) minmax\(0, 1\.28fr\);/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.review-workflow\.has-review-side\s*{[\s\S]+?grid-template-columns: 1fr;/);
    assert.doesNotMatch(source, /review-support-column/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.section-tab,[\s\S]+?min-height: 44px;/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.download-warning,[\s\S]+?min-height: 44px;/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.check-cell input\s*{[\s\S]+?width: 44px;/);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?#routerSaveButton\s*{\s*display: none;/);
  }
});

test('main and standalone show mobile section tabs only after the primary menu scrolls away', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /id="mobileSectionTabs" class="mobile-section-tabs"[^>]+aria-hidden="true" hidden/);
    assert.match(source, /class="mobile-section-tab[^>]+data-section="settings"/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?\.mobile-topbar-meta\s*{[\s\S]+?position: static;/);
    assert.match(source, /\.mobile-section-tabs:not\(\[hidden\]\)\s*{[\s\S]+?position: fixed;[\s\S]+?top: 0;/);
    assert.match(source, /\.mobile-section-tabs:not\(\[hidden\]\)\s*{[\s\S]+?overflow-y: hidden;[\s\S]+?overscroll-behavior-y: none;[\s\S]+?touch-action: pan-x;/);
  }

  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /MOBILE_SECTION_TABS_MEDIA = '\(max-width: 560px\)'/);
    assert.match(source, /const shouldShow = isMobile && sidebarBottom <= 0/);
    assert.match(source, /window\.addEventListener\?\.\('scroll', updateMobileSectionTabsVisibility, \{ passive: true \}\)/);
    assert.doesNotMatch(source, /mobileSectionTabsForced/);
  }
});

test('main and standalone keep section starts below the sticky topbar', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /return isMobile \? getMobileSectionTabsHeight\(\) : els\.topbar\?\.offsetHeight \|\| 0/);
    assert.match(source, /stickyTopbarMargin = getStickyTopbarHeight\(\) \+ 12/);
    assert.match(source, /panel\.style\.scrollMarginTop = `\$\{Math\.max\(configuredMargin, stickyTopbarMargin\)\}px`/);
  }
});

test('main and standalone keep provider creation transactional and responsive', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /class="provider-url-status" aria-live="polite" hidden/);
    assert.match(source, /id="providerCreateFormat"/);
    assert.match(source, /class="provider-source-format"/);
    assert.match(source, /Конфигурация изменится только после подтверждения/);
  }

  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /Happ-ссылка расшифрована\. Прямой URL подставлен\./);
    assert.match(source, /addProviderButton\.addEventListener\('click', openProviderCreateDialog\)/);
    assert.match(source, /function commitProviderCreateDraft\(draft\)/);
    assert.match(source, /function commitProviderEditDraft\(draft\)/);
    assert.match(source, /state\.providerCreateDraft = createProviderCreateDraft\(\)/);
    assert.match(source, /editButton\.addEventListener\('click', \(\) => openProviderEditDialog\(provider\)\)/);
    assert.match(source, /connectProviderToUseGroups\(provider\.name, options\.groupNames\)/);
    assert.doesNotMatch(source, /providerInspectorEditing \|\| Boolean\(displayedProvider\?\.isNew\)/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.provider-create-dialog::backdrop/);
    assert.match(source, /\.provider-create-body\s*{[\s\S]+?grid-auto-rows: max-content;/);
    assert.match(source, /\.provider-edit-dialog\s*{[\s\S]+?width: min\(920px,/);
    assert.match(source, /\.provider-edit-scroll\s*{[\s\S]+?overflow-y: auto;/);
    assert.match(source, /\.provider-create-actions\s*{[\s\S]+?justify-content: flex-end;/);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?\.provider-create-actions\s*{[\s\S]+?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  }
});

test('main and standalone visually separate the mobile menu from content', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?\.app-sidebar\s*{[\s\S]+?border-bottom-color: var\(--line-strong\);[\s\S]+?box-shadow:/);
  }
});

test('main and standalone consolidate node inventory errors', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /if \(state\.nodeInventoryError\) \{[\s\S]+?panel\.hidden = true;/);
    assert.match(source, /retry\.textContent = 'Повторить загрузку'/);
    assert.match(source, /els\.nodeInventoryControls\.hidden = Boolean\(state\.nodeInventoryError\) \|\| nodes\.length === 0;/);
    assert.match(source, /summary\.hidden = true;/);
  }
});

test('main and standalone allow confirmed runtime selection in select groups', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /apiJson\('\/api\/groups\/select'/);
    assert.match(source, /\['select', 'selector'\]\.includes\(type\)/);
    assert.match(source, /Активный вариант группы/);
    assert.match(source, /Mihomo не подтвердил переключение группы/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.node-group-selection-actions\s*{/);
    assert.match(source, /\.node-group-selection-choice select\s*{/);
  }
});

test('main and standalone distinguish applied, rolled back and uncertain config saves', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /Конфиг сохранен и подтвержден Mihomo/);
    assert.match(source, /result\.saved && result\.uncertain/);
    assert.match(source, /result\.rolledBack/);
    assert.match(source, /Предыдущая версия восстановлена, локальные изменения оставлены/);
  }
});

test('main and standalone expose the editorial shell without a dedicated routing page', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const html = read(name);
    assert.match(html, /class="app-sidebar"/);
    assert.match(html, /id="topbarValidation"/);
    assert.doesNotMatch(html, /data-section="routing"/);
    assert.doesNotMatch(html, /data-section-panel="routing"/);
    assert.doesNotMatch(html, /class="routing-workbench"/);
    assert.match(html, /data-section-target="providers" data-provider-view-target="relations"/);
    assert.match(html, /href="#icon-groups"/);
    assert.match(html, /<strong>Группы<\/strong>/);
    assert.match(html, /id="diagnosticsPanel" class="diagnostics-panel hidden"/);
    assert.match(html, /Interface icons: Tabler Icons, MIT License/);
  }
});

test('main and standalone expose observation and reviewed whitelist proposals', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const html = read(name);
    assert.match(html, /data-section="whitelist"/);
    assert.match(html, /data-section-panel="whitelist"/);
    assert.match(html, /id="whitelistMonitorEnabled"/);
    assert.match(html, /id="whitelistMonitorActionMode"/);
    assert.match(html, /id="whitelistMonitorYandexRelayEnabled"/);
    assert.match(html, /id="whitelistMonitorYandexRecoveries"/);
    assert.match(html, /id="whitelistMonitorProposal"/);
    assert.match(html, /id="whitelistMonitorTimeline"/);
    assert.match(html, /id="whitelistMonitorHistorySummary"/);
    assert.match(html, /id="overviewWhitelistMonitorStatus"[^>]+data-section-target="whitelist"[^>]+hidden/);
    assert.match(html, /id="overviewWhitelistMonitorTitle"/);
    assert.match(html, /id="overviewWhitelistMonitorCheckedAt"/);
    assert.match(html, /Последние 24 часа/);
    assert.match(html, /value="observe"/);
    assert.match(html, /value="suggest"/);
    assert.match(html, /id="whitelistMonitorPositiveEndpoints"/);
    assert.match(html, /id="whitelistMonitorControlEndpoints"/);
    assert.match(html, /Автоматического применения нет/);
  }
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const script = read(name);
    assert.match(script, /\/api\/whitelist-monitor/);
    assert.match(script, /\/api\/whitelist-monitor\/proxy-check/);
    assert.match(script, /не требовалось/);
    assert.match(script, /Проверить PROXY/);
    assert.match(script, /controlFailureThreshold: 2/);
    assert.match(script, /yandexRelayEnabled: false/);
    assert.match(script, /runtime\.controlYandexRecoveries/);
    assert.match(script, /const proxyReady = Number\(runtime\.controlProxyRecoveries/);
    assert.match(script, /PROXY не подтверждён/);
    assert.match(script, /prepareWhitelistFallbackConfig/);
    assert.match(script, /buildWhitelistMonitorTimeline/);
    assert.match(script, /function renderOverviewWhitelistMonitor\(\)/);
    assert.match(script, /state\.whitelistMonitor\.loaded[\s\S]+?Boolean\(config\.enabled\)/);
    assert.match(script, /renderOverviewWhitelistMonitor\(\);[\s\S]+?if \(!els\.whitelistMonitorEnabled\) return/);
    assert.match(script, /prepareWhitelistMonitorDisable/);
    assert.match(script, /applyPendingWhitelistMonitorSettings/);
    assert.match(script, /Отключится после сохранения/);
    assert.match(script, /webmihomo-whitelist:/);
  }
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.whitelist-monitor-timeline\s*{/);
    assert.match(source, /grid-template-columns: repeat\(24, minmax\(0, 1fr\)\)/);
    assert.match(source, /\.whitelist-monitor-timeline-dot\.is-confirmed/);
    assert.match(source, /\.overview-whitelist-status\[hidden\]/);
  }
});

test('standalone editor exactly mirrors the main html, styles and script', () => {
  const expected = read('index.html')
    .replace('    <link rel="stylesheet" href="./styles.css" />', () => `    <style>\n${read('styles.css')}\n    </style>`)
    .replace('    <script src="./app.js"></script>', () => `    <script>\n${read('app.js')}\n    </script>`);

  assert.equal(read('mihomo-editor.html'), expected);
});

test('installer and updater require checksum and path validation before extraction', () => {
  for (const name of ['router/install.sh', 'router/cgi-bin/mihui-update']) {
    const script = read(name);
    assert.match(script, /download_file "\$url\.sha256"/);
    assert.match(script, /verify_archive_checksum "\$DOWNLOADED_ARCHIVE"/);
    assert.match(script, /validate_archive_paths "\$archive"/);
  }
});

test('installer and updater do not use the source archive as a fallback', () => {
  for (const name of ['router/install.sh', 'router/cgi-bin/mihui-update']) {
    const script = read(name);
    assert.match(script, /DOWNLOAD_URLS="\$RELEASE_URL"/);
    assert.doesNotMatch(script, /DOWNLOAD_URLS="\$DOWNLOAD_URLS \$SOURCE_ARCHIVE_URL"/);
  }
});

test('MihUI updater reports download, extract and replacement progress', () => {
  const updater = read('router/cgi-bin/mihui-update');

  assert.match(updater, /update_progress download/);
  assert.match(updater, /update_progress extract/);
  assert.match(updater, /update_progress replace/);
});

test('MihUI updater retries failed downloads', () => {
  const updater = read('router/cgi-bin/mihui-update');

  assert.match(updater, /DOWNLOAD_ATTEMPTS=3/);
  assert.match(updater, /while \[ "\$attempt" -le "\$DOWNLOAD_ATTEMPTS" \]; do[\s\S]+?download_file_once[\s\S]+?sleep "\$DOWNLOAD_RETRY_DELAY"/);
});

test('router service supervises and restarts the MihUI server process', () => {
  const installer = read('router/install.sh');

  assert.match(installer, /supervise\(\) \{/);
  assert.match(installer, /while :; do[\s\S]+?wait "\\\$child_pid"[\s\S]+?sleep "\\\$RESTART_DELAY"/);
  assert.match(installer, /nohup sh "\\\$0" supervise/);
  assert.match(installer, /rm -f "\\\$PID_FILE" "\\\$CHILD_PID_FILE"/);
});
