const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('main and standalone UI expose labels for audited controls', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const html = read(name);
    assert.match(html, /id="backupHistoryButton"[\s\S]+?История конфигурации…/);
    assert.match(html, /id="backupHistoryDialog"[^>]+aria-labelledby="backupHistoryTitle"[^>]+aria-describedby="backupHistoryDescription"/);
    assert.match(html, /id="backupHistoryList"[^>]+role="radiogroup"[^>]+aria-label="Версии конфигурации"/);
    assert.match(html, /id="backupUnsavedWarning"[\s\S]+?Есть несохранённые изменения/);
    assert.doesNotMatch(html, /id="routerPanel"|class="backup-tools"|id="backupSelect"/);
    assert.match(html, /id="bulkIntervalInput"[^>]+aria-label=/);
    assert.match(html, /id="bulkHealthIntervalInput"[^>]+aria-label=/);
    assert.match(html, /id="outputPreview"[^>]+aria-label=/);
    assert.match(html, /id="hideProviderUrlsSetting" type="checkbox"/);
    assert.match(html, /id="copyButton"[^>]+aria-label="Копировать полный YAML с исходными ссылками"/);
    assert.match(html, /id="reviewDownloadButton"[^>]+aria-label="Скачать полный YAML с исходными ссылками"/);
    assert.match(html, /id="mobileFlowActions"[^>]+aria-label=/);
    assert.match(html, /id="providerListActionHome"/);
    assert.match(html, /id="groupListActionHome"/);
    assert.match(html, /id="intervalToolsButton"[\s\S]+?Настроить обновления/);
    assert.match(html, /id="providerStatusRefreshButton"[\s\S]+?Обновить статусы/);
    assert.match(html, /id="addProviderButton"[^>]+aria-label="Добавить подписку"/);
    assert.match(html, /id="addProviderButton"[^>]+class="[^"]*primary[^"]*"[\s\S]+?\+ Добавить/);
    assert.match(html, /id="addGroupButton"[^>]+class="[^"]*primary[^"]*"[^>]+aria-label="Добавить группу"[\s\S]+?\+ Добавить группу/);
    assert.match(html, /id="addRuleButton"[^>]+class="[^"]*primary[^"]*"[^>]+aria-label="Добавить правило"[\s\S]+?\+ Добавить правило/);
    assert.match(html, /id="checkConfigButton"[^>]+class="button compact"[\s\S]+?Проверить YAML в Mihomo/);
    assert.match(html, /id="fileTools"[\s\S]+?summary aria-label="Конфигурация"[\s\S]+?id="routerLoadButton"[\s\S]+?Перезагрузить с роутера/);
    assert.match(html, /id="backupHistoryButton"[^>]+class="file-menu-item"[\s\S]+?file-tools-separator[\s\S]+?Загрузить YAML[\s\S]+?Скачать YAML/);
    assert.doesNotMatch(html, /icon-more|Загрузить файл/);
    assert.doesNotMatch(html, /sidebarStatus|sidebar-status|sidebar-check-button|Итог и сохранение/);
    assert.match(html, /app-brand-title-row[\s\S]+?id="uiLinks" class="brand-ui-links"/);
    assert.match(html, /data-section="providers"[^>]*[\s\S]+?Подписки и группы/);
    assert.match(html, /aria-label="Подписки и группы"[\s\S]+?id="providerRelationsTab"[\s\S]+?Группы/);
    assert.match(html, /groups-panel-title[\s\S]+?Прокси-группы[\s\S]+?Управление группами, их составом и подключёнными подписками/);
    assert.doesNotMatch(html, /Связи с группами|class="top-ui-links"/);
    assert.equal((html.match(/data-service-health="xkeen"/g) || []).length, 2);
    assert.equal((html.match(/data-service-health="mihomo"/g) || []).length, 2);
    assert.match(html, /data-service-health-refresh[^>]+aria-label="Обновить статусы сервисов"/);
    assert.match(html, /id="overviewConfigSource"/);
    assert.match(html, /id="overviewConfigLoadedLabel"/);
    assert.doesNotMatch(html, /Состояние сервисов/);
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

test('main and standalone expose responsive service traffic lights', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.service-health-item\.is-ok \.service-health-dot/);
    assert.match(source, /\.service-health-item\.is-error \.service-health-dot/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.service-health-mobile\s*{[\s\S]+?display: grid;/);
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

test('main and standalone styles expose mobile flow actions and touch targets', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.mobile-flow-actions:not\(\[hidden\]\)/);
    assert.match(source, /\.review-support-column \.changes-panel\s*{\s*order: 1;/);
    assert.match(source, /\.review-support-column \.connection-settings-panel\s*{\s*order: 2;/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.section-tab,[\s\S]+?min-height: 44px;/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.download-warning,[\s\S]+?min-height: 44px;/);
    assert.match(source, /@media \(max-width: 980px\)[\s\S]+?\.check-cell input\s*{[\s\S]+?width: 44px;/);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?#routerSaveButton\s*{\s*display: none;/);
  }
});

test('main and standalone consolidate node inventory errors', () => {
  for (const name of ['app.js', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /if \(state\.nodeInventoryError\) \{[\s\S]+?panel\.hidden = true;/);
    assert.match(source, /retry\.textContent = 'Повторить загрузку'/);
    assert.match(source, /els\.nodeInventoryControls\.hidden = Boolean\(state\.nodeInventoryError\)/);
    assert.match(source, /els\.nodeInventorySummary\.hidden = true;/);
  }
});

test('main and standalone expose the editorial shell and routing workbench', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const html = read(name);
    assert.match(html, /class="app-sidebar"/);
    assert.match(html, /id="topbarValidation"/);
    assert.match(html, /class="routing-workbench"/);
    assert.match(html, /Interface icons: Tabler Icons, MIT License/);
  }

  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /\.route-map\s*{[\s\S]+?grid-template-columns: 244px minmax\(380px, 1fr\) 300px;/);
    assert.match(source, /\.route-inspector\s*{/);
    assert.match(source, /\.route-visual-stack\s*{/);
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
