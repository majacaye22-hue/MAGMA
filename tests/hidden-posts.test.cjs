const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/mod/HiddenPosts.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exports_, AbortSignal, require(name) {
  if (name === 'react/jsx-runtime') return require(name);
  if (name === 'next/link') return { default: 'a' };
  if (name === './RestoreHiddenPost') return { default: 'button' };
  throw new Error(name);
} });
function database(error = null) {
  const calls = [];
  const query = {};
  for (const name of ['select', 'eq', 'order', 'range']) query[name] = (...args) => { calls.push([name, ...args]); return query; };
  query.abortSignal = async () => ({ data: [], count: 0, error });
  return { calls, from(table) { calls.push(['from', table]); return query; } };
}
test('hidden inventory filters posts directly, without report or approval-state filters', async () => {
  const db = database(); await exports_.default({ db });
  assert.deepEqual(db.calls.filter(c => c[0] === 'from'), [['from', 'posts']]);
  assert.deepEqual(db.calls.filter(c => c[0] === 'eq'), [['eq', 'is_hidden', true]]);
  assert.deepEqual(db.calls.find(c => c[0] === 'range'), ['range', 0, 23]);
  assert.equal(db.calls.filter(c => c[0] === 'order').length, 2);
});
test('hidden inventory paginates and rejects invalid page numbers', async () => {
  for (const [pageValue, start] of [['2', 24], ['-2', 0], ['NaN', 0], ['1.5', 0]]) {
    const db = database(); await exports_.default({ db, pageValue });
    assert.deepEqual(db.calls.find(c => c[0] === 'range'), ['range', start, start + 23]);
  }
});
test('hidden query failures are not rendered as an empty archive', async () => {
  await assert.rejects(exports_.default({ db: database(new Error('offline')) }), /No se pudieron cargar/);
});
test('moderator authorization precedes hidden-tab rendering', () => {
  const source = fs.readFileSync('app/mod/page.tsx', 'utf8');
  assert.ok(source.indexOf('if (!profile?.is_moderator) redirect') < source.indexOf('params.tab === "ocultos"'));
});
