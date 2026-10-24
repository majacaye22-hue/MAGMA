const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/comment-threads.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject, process: { env: {} } });
const group = rows => JSON.parse(JSON.stringify(exportsObject.commentThreads(rows)));
test('replies stay beneath their parent in chronological order', () => {
  const rows = [{id:'a'}, {id:'b'}, {id:'c',parent_id:'a'}, {id:'d',parent_id:'a'}];
  assert.deepEqual(group(rows), [{root:rows[0],replies:rows.slice(2)}, {root:rows[1],replies:[]}]);
});
test('a deleted or unreadable parent does not hide readable replies', () => {
  assert.deepEqual(group([{id:'b',parent_id:'missing'}]), [{root:{id:'b',parent_id:'missing'},replies:[]}]);
});
test('empty conversations and rollout gate are safe before migration', () => {
  assert.deepEqual(group([]), []);
  assert.equal(exportsObject.COMMENT_REPLIES_ENABLED, false);
});
