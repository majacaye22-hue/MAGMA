const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function harness({ value = '', rows = ['maja', 'maria'], fail = false } = {}) {
  const state = []; let index = 0; let effect; const calls = [];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/CollaboratorPicker.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, setTimeout(fn) { effect = fn; return 1; }, clearTimeout() {}, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return {
      useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], v => { state[i] = v; }]; },
      useRef: () => ({ current: null }), useEffect(fn) { fn(); },
    };
    if (name === '@/lib/collaborations') return { inviteUsernames(v) { return [...new Set(v.split(',').map(n => n.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))]; } };
    if (name === '@/lib/supabase') return { getSupabaseClient() {
      const query = { select: () => query, ilike(column, pattern) { calls.push([column, pattern]); return query; }, order: () => query,
        limit: () => query, neq(column, id) { calls.push([column, id]); return query; },
        then(resolve) { return Promise.resolve({ data: rows.map(username => ({ username })), error: fail ? new Error('offline') : null }).then(resolve); } };
      return { from: () => query };
    } };
    throw Error(name);
  } });
  function walk(n) { return !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(walk) : [n, ...walk(n.props?.children)]; }
  const render = () => { index = 0; return walk(exports.CollaboratorPicker({ id: 'picker', value, userId: 'self', onChange(v) { value = v; } })); };
  return { render, calls, value: () => value, async search(term) {
    render().find(n => n.type === 'input').props.onChange({ target: { value: term } }); render();
    effect?.(); await new Promise(resolve => setImmediate(resolve)); return render();
  } };
}
test('search is debounced, escapes underscore and excludes current account', async () => {
  const h = harness(); await h.search('@ma_');
  assert.deepEqual(h.calls, [['username', '%ma\\_%'], ['id', 'self']]);
});
test('selecting a search result preserves draft selections; remove affects only that name', async () => {
  const h = harness({ value: 'maja' }); const tree = await h.search('ma');
  const candidates = tree.filter(n => n.type === 'button' && !n.props['aria-label']);
  assert.equal(candidates.length, 1);
  candidates[0].props.onClick(); assert.equal(h.value(), 'maja, maria');
  h.render().find(n => n.props['aria-label'] === 'quitar a @maja').props.onClick();
  assert.equal(h.value(), 'maria');
});
test('search failures offer retry without selecting or inviting anyone', async () => {
  const h = harness({ fail: true }); const tree = await h.search('ma');
  assert.ok(tree.some(n => n.type === 'button' && n.props.children === 'reintentar búsqueda'));
  assert.equal(h.value(), '');
});
test('short queries do not search and Enter never submits the parent form', async () => {
  const h = harness(); const tree = await h.search('m'); assert.equal(h.calls.length, 0);
  let prevented = false;
  tree.find(n => n.type === 'input').props.onKeyDown({ key: 'Enter', preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(h.value(), '');
});
