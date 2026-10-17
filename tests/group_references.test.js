const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const names = ['rewriteRenamedGroupReferences', 'stripYamlComment', 'splitInlineKeyValue',
  'splitInlineItems', 'cleanScalar', 'indentOf', 'splitRuleParts', 'getRuleTargetIndexFromParts'];
const context = vm.createContext({ RULE_OPTIONS: new Set(['no-resolve', 'src']) });
for (const name of names) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end < 0 ? undefined : end), context);
}
const rewrite = (text, entries = [['PROXY', 'Primary']]) => context.rewriteRenamedGroupReferences(text, new Map(entries));

test('group rename updates external references without changing unrelated fields', () => {
  const yaml = `proxies:
  - name: Node
    dialer-proxy: "PROXY" # relay
proxy-providers:
  subscription:
    proxy: PROXY
    filter: PROXY
    override:
      dialer-proxy: PROXY
rule-providers:
  sites:
    proxy: 'PROXY'
listeners:
  - name: entry
    proxy: PROXY
ntp:
  dialer-proxy: PROXY
dns:
  nameserver:
    - https://dns.example/dns-query#PROXY&h3=true
    - 'https://dns.example/dns-query#PROXY' # DNS
  nameserver-policy:
    PROXY: https://dns.example/#PROXY
  fake-ip-filter: [PROXY, '*.lan']
unrelated:
  proxy: PROXY
  description: |
    proxy: PROXY
    dns: https://example/#PROXY
`;
  const output = rewrite(yaml);
  assert.match(output, /dialer-proxy: "Primary" # relay/);
  assert.match(output, /proxy: 'Primary'/);
  assert.match(output, /override:\n      dialer-proxy: Primary/);
  assert.match(output, /https:\/\/dns.example\/dns-query#Primary&h3=true/);
  assert.match(output, /PROXY: https:\/\/dns.example\/#Primary/);
  assert.match(output, /filter: PROXY/);
  assert.match(output, /fake-ip-filter: \[PROXY, '\*\.lan'\]/);
  assert.match(output, /unrelated:\n  proxy: PROXY\n  description: \|\n    proxy: PROXY\n    dns: https:\/\/example\/#PROXY/);
});

test('group rename handles flow mappings, lists and collections spanning lines', () => {
  const yaml = `proxies: [{name: Node, dialer-proxy: PROXY}]
proxy-providers:
  subscription: {proxy: PROXY, override: {dialer-proxy: PROXY}, url: 'https://example/#PROXY'}
rule-providers: {
  # Download using the group
  sites: {proxy: PROXY, path: 'PROXY'}
}
dns: {nameserver: ["https://dns.example/#PROXY", https://backup.example/#PROXY&h3=true]}
listeners: [{name: http, proxy: PROXY}]
`;
  const output = rewrite(yaml);
  assert.match(output, /dialer-proxy: Primary/);
  assert.match(output, /subscription: \{proxy: Primary, override: \{dialer-proxy: Primary\}, url: 'https:\/\/example\/#PROXY'\}/);
  assert.match(output, /# Download using the group\n  sites: \{proxy: Primary, path: 'PROXY'\}/);
  assert.match(output, /nameserver: \["https:\/\/dns.example\/#Primary", https:\/\/backup.example\/#Primary&h3=true\]/);
  assert.match(output, /listeners: \[\{name: http, proxy: Primary\}\]/);
});

test('group rename changes only rule targets and tunnel destinations', () => {
  const yaml = `sub-rules:
  ruleset:
    - DOMAIN,PROXY,PROXY
    - AND,((DOMAIN,a.example),(NETWORK,TCP)),PROXY
    - IP-CIDR,10.0.0.0/8,PROXY,no-resolve
tunnels:
  - tcp,example.com:443,PROXY
  - {network: tcp, address: 'PROXY:443', proxy: PROXY}
`;
  const output = rewrite(yaml);
  assert.match(output, /DOMAIN,PROXY,Primary/);
  assert.match(output, /AND,\(\(DOMAIN,a.example\),\(NETWORK,TCP\)\),Primary/);
  assert.match(output, /IP-CIDR,10.0.0.0\/8,Primary,no-resolve/);
  assert.match(output, /tcp,example.com:443,Primary/);
  assert.match(output, /address: 'PROXY:443', proxy: Primary/);
});

test('renaming quotes names safely and replaces original names once', () => {
  assert.equal(rewrite('ntp: {dialer-proxy: PROXY}', [['PROXY', 'A, B']]), 'ntp: {dialer-proxy: "A, B"}');
  assert.equal(rewrite("ntp:\n  dialer-proxy: 'PROXY'", [['PROXY', "O'Brien"]]), "ntp:\n  dialer-proxy: 'O''Brien'");
  assert.equal(rewrite('listeners: [{proxy: A}, {proxy: B}]', [['A', 'B'], ['B', 'A']]), 'listeners: [{proxy: B}, {proxy: A}]');
  assert.equal(rewrite('ntp: {dialer-proxy: PROXY}', [['PROXY', 'PROXY2']]), 'ntp: {dialer-proxy: PROXY2}');
});

test('scalar reference anchors are preserved and inherited aliases are left intact', () => {
  const yaml = `ntp:
  dialer-proxy: &route PROXY # anchor
listeners:
  - proxy: *route
`;
  assert.equal(rewrite(yaml), yaml.replace('&route PROXY', '&route Primary'));
  assert.throws(() => rewrite('x-route: &route PROXY\nntp:\n  dialer-proxy: *route'), /YAML-алиасом \*route/);
  assert.throws(() => rewrite('x-route: &route {proxy: PROXY}\nlisteners:\n  - *route'), /YAML-алиасом \*route/);
  assert.throws(() => rewrite('x-route: &route {proxy: PROXY}\nlisteners:\n  - name: http\n    <<: *route'), /YAML-алиасом \*route/);
  assert.throws(() => rewrite('x-route: &route\n  proxy: PROXY\nlisteners:\n  - <<: *route'), /YAML-алиасом \*route/);
  assert.throws(() => rewrite('x-route: &route {proxy: PROXY}\nlisteners:\n  - <<: [*route]'), /YAML-алиасом \*route/);
  assert.throws(() => rewrite('listeners:\n  - &route\n    proxy: PROXY\nx-description: *route'), /YAML-алиасом \*route/);
  assert.throws(() => rewrite('ntp:\n  dialer-proxy: &route PROXY\nx-description: *route'), /YAML-алиасом \*route/);
  const flow = 'listeners:\n  - &route {proxy: PROXY}\n  - *route';
  assert.equal(rewrite(flow), flow.replace('proxy: PROXY', 'proxy: Primary'));
  const block = 'ntp: &route\n  dialer-proxy: PROXY\nx-description: *route';
  assert.throws(() => rewrite(block), /YAML-алиасом \*route/);
});

test('indentless sequences retain the reference context', () => {
  const yaml = `proxies:
- name: Node
  dialer-proxy: PROXY
dns:
  nameserver:
  - https://dns.example/#PROXY
listeners:
- proxy: PROXY
- proxy: PROXY
`;
  assert.equal(rewrite(yaml), yaml.replaceAll('PROXY', 'Primary'));
});

test('YAML primitive group names remain strings and DNS filters remain unchanged', () => {
  for (const name of ['true', 'false', 'null', '123', '~', 'A: B', 'A, B', 'A:']) {
    assert.equal(rewrite('ntp: {dialer-proxy: PROXY}', [['PROXY', name]]), `ntp: {dialer-proxy: ${JSON.stringify(name)}}`);
  }
  const filters = 'dns:\n  fake-ip-filter: ["foo#PROXY"]\n  nameserver: [https://dns/#PROXY]';
  assert.equal(rewrite(filters), filters.replace('https://dns/#PROXY', 'https://dns/#Primary'));
});

test('no rename leaves text byte-for-byte unchanged', () => {
  const yaml = '# PROXY\r\nntp: {dialer-proxy: OTHER}\r\n';
  assert.equal(rewrite(yaml, []), yaml);
  assert.equal(rewrite(yaml), yaml);
});
