const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const helpers = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/chat-display.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: helpers });
test('groups only nearby messages from the same sender and same CDMX day', () => {
  const message = { sender_id: 'a', created_at: '2026-09-28T18:00:00Z' };
  assert.equal(helpers.continuesMessage(undefined, message), false);
  assert.equal(helpers.continuesMessage(message, { ...message, created_at: '2026-09-28T18:02:00Z' }), true);
  assert.equal(helpers.continuesMessage(message, { ...message, sender_id: 'b' }), false);
  assert.equal(helpers.continuesMessage(message, { ...message, created_at: '2026-09-28T18:06:00Z' }), false);
  assert.equal(helpers.continuesMessage({ ...message, created_at: '2026-09-28T05:59:00Z' }, { ...message, created_at: '2026-09-28T06:01:00Z' }), false);
});
