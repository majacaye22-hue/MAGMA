const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, { exports, require: name => dependencies[name] ?? require(name) });
  return exports;
}
const mentions = load('lib/mentions.ts');
const { sanitizeHtml } = load('lib/sanitize.ts');
test('mention trigger respects caret, punctuation and email boundaries', () => {
  assert.equal(mentions.mentionAtCursor('hola @ana', 9).query, 'ana');
  assert.equal(mentions.mentionAtCursor('@', 1).query, '');
  assert.equal(mentions.mentionAtCursor('(@ana)', 5).query, 'ana');
  assert.equal(mentions.mentionAtCursor('mail@ana', 8), null);
  assert.equal(mentions.mentionAtCursor('@ana ', 5), null);
  assert.equal(mentions.mentionAtCursor('@ana later', 4).from, 0);
});
test('post text links handles, not email addresses or URL path segments', () => {
  const parts = mentions.mentionParts('hola @ana_b y @cctv. mail@cctv.com /@ana_b');
  assert.equal(parts.filter((_, i) => i % 2).join(','), '@ana_b,@cctv');
  assert.equal(mentions.profileMentionHref('ana_b'), '/profile/ana_b');
});
test('rich text preserves only local profile links and formatting', () => {
  assert.equal(sanitizeHtml('<p><a href="/profile/ana_b" onclick="alert(1)">@ana_b</a></p>'), '<p><a href="/profile/ana_b">@ana_b</a></p>');
  for (const href of ['javascript:alert(1)', 'https://evil.example', '//evil.example', '/profile/ana?next=evil']) {
    assert.equal(sanitizeHtml(`<p><a href="${href}">hello</a></p>`), '<p>hello</p>');
  }
  assert.equal(sanitizeHtml('<script>alert(1)</script><p><strong>safe</strong></p>'), '<p><strong>safe</strong></p>');
});
