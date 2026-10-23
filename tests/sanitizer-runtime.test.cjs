const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// Vercel's loader can reject require(ESM) even on a recent Node release.
// Exercise the real dependency graph, not a mocked sanitizer.
test('sanitizer loads and strips unsafe HTML without require(ESM)', () => {
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', `
    const assert = require('node:assert/strict');
    const purifier = require('isomorphic-dompurify');
    assert.equal(purifier.sanitize('<p onclick="alert(1)">safe</p><script>alert(1)</script>'), '<p>safe</p>');
  `], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
