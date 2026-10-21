const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness({ confirm = true, fail = false } = {}) {
  const state = [], calls = []; let index = 0, refreshes = 0;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/mod/RestoreHiddenPost.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, AbortSignal, Event, window: { confirm: () => confirm, dispatchEvent() {} }, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useRef: () => ({ current: false }), useTransition: () => [false, fn => fn()], useState: initial => { const i = index++; state[i] = initial; return [initial, v => { state[i] = v; }]; } };
    if (name === 'next/navigation') return { useRouter: () => ({ refresh() { refreshes++; } }) };
    if (name === '@/lib/supabase') return { getSupabaseClient: () => ({ rpc(name, args) { calls.push([name, args]); return { abortSignal: async () => ({ error: fail ? new Error('offline') : null }) }; } }) };
    throw new Error(name);
  } });
  const tree = exports.default({ postId: 'hidden-id', title: 'test', status: 'pending' });
  return { state, calls, async click() { tree.props.children[0].props.onClick(); await new Promise(resolve => setImmediate(resolve)); }, refreshes: () => refreshes };
}
test('cancelled restoration does not mutate or refresh', async () => {
  const h = harness({ confirm: false }); await h.click(); assert.equal(h.calls.length, 0); assert.equal(h.refreshes(), 0);
});
test('confirmed restore uses audited RPC then refreshes hidden inventory', async () => {
  const h = harness(); await h.click(); assert.equal(h.calls[0][0], 'restore_hidden_post'); assert.equal(h.calls[0][1].p_post_id, 'hidden-id'); assert.equal(h.state[1], true); assert.equal(h.refreshes(), 1);
});
test('failed restore leaves the item available and shows an explicit error', async () => {
  const h = harness({ fail: true }); await h.click(); assert.equal(h.state[1], false); assert.match(h.state[2], /No se confirmó/); assert.equal(h.state[0], false); assert.equal(h.refreshes(), 0);
});
