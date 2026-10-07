const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  let index = 0, failure = false, promptResult = '', confirmed = true;
  const state = [], calls = [];
  const react = {
    useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
    useRef(initial) { const i = index++; return state[i] ??= { current: initial }; },
  };
  const runtime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/mod/ModDashboard.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, AbortSignal,
    window: { prompt: () => promptResult, confirm: () => confirmed },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return runtime;
      if (name === '@/lib/supabase') return { getSupabaseClient: () => ({ rpc(name, args) { calls.push({ name, args }); return { abortSignal: async () => ({ error: failure ? new Error('failed') : null }) }; } }) };
      throw new Error(name);
    },
  });
  const post = { id: 'p1', title: 'test', created_at: new Date().toISOString(), type: 'arte' };
  const report = { id: 'r1', post_id: 'p1', comment_id: 'c1', comments: { id: 'c1', body: 'comment', is_hidden: false }, posts: { id: 'p1', title: 'test', is_hidden: false }, created_at: post.created_at };
  function render() { index = 0; return exports.ModDashboard({ initialPendingPosts: [post], initialReports: [report] }); }
  function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
  return {
    calls, state, render,
    button(label) { return nodes(render()).find(n => n.type === 'button' && n.props.children === label); },
    fail() { failure = true; }, cancelPrompt() { promptResult = null; }, cancelConfirm() { confirmed = false; },
  };
}

test('canceling rejection sends no decision', async () => {
  const h = harness(); h.cancelPrompt(); await h.button('rechazar').props.onClick();
  assert.equal(h.calls.length, 0); assert.equal(h.state[0].length, 1);
});
test('failed approval preserves queue and displays an error', async () => {
  const h = harness(); h.fail(); await h.button('aprobar').props.onClick();
  assert.equal(h.state[0].length, 1); assert.match(h.state[4], /No se confirmó/); assert.equal(h.state[2], null);
});
test('successful approval removes only confirmed post', async () => {
  const h = harness(); await h.button('aprobar').props.onClick();
  assert.equal(h.state[0].length, 0); assert.equal(h.calls[0].name, 'review_post');
});
test('hide targets report atomically and updates only comment preview', async () => {
  const h = harness(); await h.button('ocultar y revisar').props.onClick();
  assert.equal(h.calls[0].name, 'moderate_report'); assert.equal(h.calls[0].args.p_action, 'hide');
  assert.equal(h.state[1][0].comments.is_hidden, true); assert.equal(h.state[1][0].posts.is_hidden, false);
  assert.ok(h.button('restaurar'));
});
test('failed report action stays in queue; delete cancellation sends nothing', async () => {
  const h = harness(); h.cancelConfirm(); await h.button('eliminar comentario').props.onClick();
  assert.equal(h.calls.length, 0);
  h.fail(); await h.button('ignorar').props.onClick();
  assert.equal(h.state[1].length, 1); assert.match(h.state[4], /No se confirmó/);
});
