const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

async function render({ rows = [], error = null, user = { id: 'member' }, enabled = true } = {}) {
  const exports = {};
  const calls = [];
  const query = { select() { return query; }, eq(key, value) { calls.push([key, value]); return query; }, order: async () => ({ data: rows, error }) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/colaboraciones/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return { default: 'a' };
    if (name === 'next/navigation') return { notFound() { throw Error('not found'); }, redirect(url) { throw Error(url); } };
    if (name === '@/lib/collaborations') return { COLLABORATIONS_ENABLED: enabled };
    if (name === '@/lib/supabase-server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => query }) };
    throw Error(name);
  } });
  const tree = await exports.default();
  function walk(n) { return !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(walk) : [n, ...walk(n.props?.children)]; }
  return { nodes: walk(tree), calls };
}
test('empty invitations page matches menu label and provides discovery links', async () => {
  const { nodes, calls } = await render();
  assert.equal(nodes.find(n => n.type === 'h1').props.children, 'invitaciones');
  for (const href of ['/proyectos', '/buscar', '/mensajes']) assert.ok(nodes.some(n => n.props.href === href));
  assert.deepEqual(calls, [['user_id', 'member']]);
});
test('pending and accepted entries retain their correct destinations', async () => {
  const { nodes } = await render({ rows: [
    { id: 'one', project_id: 'project', accepted_at: null, projects: { title: 'shared project' } },
    { id: 'two', post_id: 'post', accepted_at: 'today', posts: { title: 'shared credit' } },
  ] });
  for (const label of ['por responder', 'colaboraciones aceptadas']) assert.ok(nodes.some(n => n.props['aria-label'] === label));
  for (const href of ['/proyecto/project', '/post/post']) assert.ok(nodes.some(n => n.props.href === href));
});
test('load failures show a retry rather than an empty inbox', async () => {
  const { nodes } = await render({ error: { message: 'offline' } });
  assert.ok(nodes.some(n => n.props.role === 'alert'));
  assert.ok(nodes.some(n => n.props.href === '/colaboraciones'));
  assert.ok(!nodes.some(n => n.props.href === '/buscar'));
});
test('authentication and rollout gate are preserved', async () => {
  await assert.rejects(render({ user: null }), /auth\/login/);
  await assert.rejects(render({ enabled: false }), /not found/);
});
