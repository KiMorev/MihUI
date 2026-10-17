const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const happFunctions = source.slice(
  source.indexOf('function normalizeHappCryptUrl(value)'),
  source.indexOf('function loadHappBrowserDecryptor()'),
);

function loadHappFunctions(decryptor = {}, available = true) {
  const context = vm.createContext({
    URL,
    canUseBrowserHappDecryptor: () => available,
    loadHappBrowserDecryptor: async () => decryptor,
    normalizeBrowserDecodedHappUrl: (value) => String(value || '').trim(),
  });
  vm.runInContext(happFunctions, context);
  return context;
}

test('Happ reports unavailable browser decoding in Russian', async () => {
  const app = loadHappFunctions({}, false);
  await assert.rejects(app.decodeHappProviderUrl({ url: 'happ://test' }), /Расшифровка Happ в браузере недоступна/);
});

test('Happ reports missing module export in Russian', async () => {
  const app = loadHappFunctions();
  await assert.rejects(app.decodeHappProviderUrlInBrowser('happ://test'), /отсутствует функция decryptLink/);
});

test('Happ reports invalid decoded URL in Russian and still accepts HTTPS', async () => {
  const invalid = loadHappFunctions({ decryptLink: async () => 'not-a-url' });
  await assert.rejects(invalid.decodeHappProviderUrlInBrowser('happ://test'), /не вернул прямую ссылку HTTP\/HTTPS/);
  const valid = loadHappFunctions({ decryptLink: async () => 'https://example.com/sub' });
  const result = await valid.decodeHappProviderUrlInBrowser('happ://test');
  assert.equal(result.ok, true);
  assert.equal(result.decryptedUrl, 'https://example.com/sub');
});

test('Happ extracts the complete crypt link from an HTTPS connector', async () => {
  let decryptedSource = '';
  const app = loadHappFunctions({
    decryptLink: async (sourceUrl) => {
      decryptedSource = sourceUrl;
      return 'https://example.com/sub?key=key01';
    },
  });
  const happUrl = 'happ://crypt4/abc+def/ghi==';
  const wrapper = `https://connector.example/?link=${encodeURIComponent(happUrl)}&cb=c2`;

  const result = await app.decodeHappProviderUrl({ url: wrapper });

  assert.equal(decryptedSource, happUrl);
  assert.equal(result.wrapped, true);
  assert.equal(result.decryptedUrl, 'https://example.com/sub?key=key01');
});

test('Happ normalizes escaped schemes and double-encoded connector values', async () => {
  let decryptedSource = '';
  const app = loadHappFunctions({
    decryptLink: async (sourceUrl) => {
      decryptedSource = sourceUrl;
      return 'https://example.com/sub';
    },
  });
  const escaped = String.raw`happ\:\/\/crypt5/demo-token`;
  const wrapper = `https://connector.example/mobile.html?Import=${encodeURIComponent(encodeURIComponent(escaped))}`;

  assert.equal(app.normalizeHappCryptUrl(String.raw`happ\://crypt4/token`), 'happ://crypt4/token');
  const result = await app.decodeHappProviderUrl({ url: wrapper });

  assert.equal(decryptedSource, 'happ://crypt5/demo-token');
  assert.equal(result.wrapped, true);
});

test('own updater failure messages are Russian without translating shell commands', () => {
  const updater = fs.readFileSync('router/cgi-bin/mihui-update', 'utf8');
  const messages = [...updater.matchAll(/\bfail "([^"]+)"/g)].map((match) => match[1]);
  messages.push(...[...updater.matchAll(/"message":"([^"]+)"/g)].map((match) => match[1]));
  assert.ok(messages.length >= 15);
  messages.forEach((message) => assert.match(message, /[А-Яа-яЁё]/));
  assert.match(updater, /respond_json "200 OK"/);
});

test('updater keeps the idle restart marker compatible with an already open older UI', () => {
  const server = fs.readFileSync('router/mihui_server.py', 'utf8');
  assert.match(server, /update_state = \{[\s\S]*?"message": "idle"/);
  assert.match(source, /state\.mihuiUpdateAccepted && status\.ok === null && status\.message === 'idle'/);
});
