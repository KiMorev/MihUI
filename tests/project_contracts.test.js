const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('main and standalone UI expose labels for audited controls', () => {
  for (const name of ['index.html', 'mihomo-editor.html']) {
    const html = read(name);
    assert.match(html, /id="backupSelect"[^>]+aria-label=/);
    assert.match(html, /id="bulkIntervalInput"[^>]+aria-label=/);
    assert.match(html, /id="bulkHealthIntervalInput"[^>]+aria-label=/);
    assert.match(html, /id="outputPreview"[^>]+aria-label=/);
    assert.match(html, /id="hideProviderUrlsSetting" type="checkbox"/);
    assert.match(html, /id="copyButton"[^>]+aria-label="Копировать полный YAML с исходными ссылками"/);
    assert.match(html, /id="reviewDownloadButton"[^>]+aria-label="Скачать полный YAML с исходными ссылками"/);
    assert.match(html, /id="mobileFlowActions"[^>]+aria-label=/);
    assert.match(html, /id="addProviderButton"[^>]+aria-label="Добавить подписку"/);
    assert.match(html, /id="addGroupButton"[^>]+aria-label="Добавить группу"/);
    assert.match(html, /id="addRuleButton"[^>]+aria-label="Добавить правило"/);
  }
});

test('main and standalone styles stack backup controls on mobile', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?\.backup-tools\s*{\s*display: grid;/);
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
