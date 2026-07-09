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
  }
});

test('main and standalone styles stack backup controls on mobile', () => {
  for (const name of ['styles.css', 'mihomo-editor.html']) {
    const source = read(name);
    assert.match(source, /@media \(max-width: 560px\)[\s\S]+?\.backup-tools\s*{\s*display: grid;/);
  }
});

test('installer and updater require checksum and path validation before extraction', () => {
  for (const name of ['router/install.sh', 'router/cgi-bin/mihui-update']) {
    const script = read(name);
    assert.match(script, /download_file "\$url\.sha256"/);
    assert.match(script, /verify_archive_checksum "\$DOWNLOADED_ARCHIVE"/);
    assert.match(script, /validate_archive_paths "\$archive"/);
  }
});
