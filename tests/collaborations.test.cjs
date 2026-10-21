const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}, env = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, process: { env }, window: { confirm: () => true }, require(name) {
    if (name in imports) return imports[name];
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return { default: 'a' };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}
const helpers = load('lib/collaborations.ts');
test('collaboration rollout requires explicit opt-in after migration', () => {
  assert.equal(helpers.COLLABORATIONS_ENABLED, false);
  assert.equal(load('lib/collaborations.ts', {}, { NEXT_PUBLIC_COLLABORATIONS_ENABLED: 'true' }).COLLABORATIONS_ENABLED, true);
});
test('invitation usernames normalize, deduplicate and limit batches', () => {
  assert.deepEqual(Array.from(helpers.inviteUsernames(' @Maja, maja, @Sol ,, ')), ['maja', 'sol']);
  assert.deepEqual(Array.from(helpers.inviteUsernames('')), []);
  assert.throws(() => helpers.inviteUsernames('two names'));
  assert.throws(() => helpers.inviteUsernames(Array.from({ length: 21 }, (_, i) => `user${i}`).join(',')));
});
function walk(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(walk);
  return [node, ...walk(node.props?.children)];
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join('');
  return typeof node === 'object' ? text(node.props?.children) : String(node);
}
function panel({ owner = false, accepted = false, invited = true, fail = false, failName = '', kind = 'project', ownerInviteMode = 'inline' } = {}) {
  const rows = invited ? [{ id: 'invitation', user_id: 'member', accepted_at: accepted ? 'today' : null, profiles: { username: 'member' } }] : [];
  const state = [rows, '', '', '', false, true]; let index = 0, refreshes = 0;
  const calls = [];
  const exports = load('app/components/CollaborationPanel.tsx', {
    react: { useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; }, useCallback: fn => fn, useEffect() {} },
    'next/navigation': { useRouter: () => ({ refresh() { refreshes++; } }) },
    '@/lib/collaborations': helpers,
    './CollaboratorPicker': { CollaboratorPicker: 'collaborator-picker' },
    '@/lib/supabase': { getSupabaseClient: () => ({
      rpc: async (name, args) => { calls.push([name, args]); return { error: fail || args.username_input === failName ? { message: 'permission denied' } : null }; },
      from(table) { calls.push(['read', table]); const q = { select: () => q, eq: () => q, order: async () => ({ data: rows }) }; return q; },
    }) },
  });
  function render() { index = 0; return exports.CollaborationPanel({ kind, targetId: 'target', ownerId: 'owner', userId: owner ? 'owner' : 'member', ownerInviteMode }); }
  const buttons = () => walk(render()).filter(node => node.type === 'button');
  return { state, calls, render, buttons, refreshes: () => refreshes, async click(label) {
    const button = buttons().find(node => text(node) === label); assert.ok(button, label); await button.props.onClick();
  } };
}
test('pending collaborators can accept or decline, but cannot invite others or add entries', () => {
  const h = panel(); const tree = h.render();
  assert.ok(h.buttons().some(button => text(button) === 'aceptar invitación'));
  assert.ok(h.buttons().some(button => text(button) === 'rechazar'));
  assert.ok(!h.buttons().some(button => text(button) === 'enviar invitación'));
  assert.ok(!walk(tree).some(node => node.type?.name === 'ProjectEntryPicker'));
});
test('post owner invitation form starts collapsed; credits and recipient actions remain visible', () => {
  const empty = panel({owner:true, kind:'post', invited:false}).render();
  const disclosure = walk(empty).find(n => n.type === 'details');
  assert.ok(disclosure);
  assert.ok(!disclosure.props.open);
  assert.equal(text(walk(disclosure).find(n => n.type === 'summary')), 'invitar colaboradores');
  assert.ok(walk(disclosure).some(n => n.type === 'collaborator-picker'));
  assert.ok(!walk(empty).some(n => n.type === 'h2'));
  const credited = panel({owner:true, kind:'post', accepted:true}).render();
  assert.ok(credited.props.children.some(n => n?.type === 'ul'));
  assert.ok(!walk(panel({kind:'post'}).render()).some(n => n.type === 'details'));
  assert.ok(!walk(panel({owner:true,kind:'project'}).render()).some(n => n.type === 'details'));
});
test('post detail hides invitation form while modal expands it and existing credits remain',()=>{
  assert.equal(panel({owner:true,kind:'post',invited:false,ownerInviteMode:'hidden'}).render(),null);
  const visible=panel({owner:true,kind:'post',accepted:true,ownerInviteMode:'hidden'}).render();
  assert.ok(walk(visible).some(n=>n.type==='ul'));
  assert.ok(!walk(visible).some(n=>n.type==='collaborator-picker'));
  const modal=panel({owner:true,kind:'post',ownerInviteMode:'expanded'}).render();
  assert.ok(walk(modal).some(n=>n.type==='collaborator-picker'));
  assert.ok(!walk(modal).some(n=>n.type==='details'));
});
test('accepted project collaborators get entry tools, post credits do not', () => {
  assert.ok(walk(panel({ accepted: true }).render()).some(node => node.type?.name === 'ProjectEntryPicker'));
  assert.ok(!walk(panel({ accepted: true, kind: 'post' }).render()).some(node => node.type?.name === 'ProjectEntryPicker'));
});
test('acceptance targets only the selected collaboration kind and resource', async () => {
  const h = panel({ kind: 'post' }); await h.click('aceptar invitación');
  assert.equal(h.calls[0][0], 'change_collaboration');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0][1])), { kind: 'post', target_id: 'target', action: 'accept', username_input: null });
  assert.equal(h.refreshes(), 1);
});
test('failed acceptance surfaces error and never claims success or refreshes', async () => {
  const h = panel({ fail: true }); await h.click('aceptar invitación');
  assert.equal(h.refreshes(), 0); assert.equal(h.state[2], 'permission denied'); assert.equal(h.state[3], ''); assert.equal(h.state[4], false);
});
test('authors invite usernames without accepting on their behalf', async () => {
  const h = panel({ owner: true, invited: false, kind: 'post' });
  walk(h.render()).find(node => node.type === 'collaborator-picker').props.onChange('friend');
  await h.click('enviar invitación');
  assert.equal(h.calls[0][1].action, 'invite'); assert.equal(h.calls[0][1].username_input, 'friend');
});
test('both owner panels use the shared picker and selection alone sends nothing', () => {
  for (const kind of ['project', 'post']) {
    const h = panel({ owner: true, kind });
    const picker = walk(h.render()).find(node => node.type === 'collaborator-picker');
    assert.equal(picker.props.userId, 'owner');
    assert.equal(picker.props.id, `collaborators-${kind}-target`);
    picker.props.onChange('friend, other');
    assert.equal(h.calls.length, 0);
    assert.ok(!walk(panel({ kind }).render()).some(node => node.type === 'collaborator-picker'));
  }
});
test('selected accounts are invited separately with the correct resource and cleared on success', async () => {
  const h = panel({ owner: true });
  h.state[1] = 'friend, other';
  await h.click('enviar invitación');
  const calls = h.calls.filter(([name]) => name === 'change_collaboration');
  assert.deepEqual(calls.map(([, args]) => args.username_input), ['friend', 'other']);
  assert.ok(calls.every(([, args]) => args.kind === 'project' && args.target_id === 'target' && args.action === 'invite'));
  assert.equal(h.state[1], '');
  assert.equal(h.state[4], false);
});
test('partial invitation failure retains only failed and unsent selections for retry', async () => {
  const h = panel({ owner: true, failName: 'blocked' });
  h.state[1] = 'friend, blocked, later';
  await h.click('enviar invitación');
  assert.equal(h.state[1], 'blocked, later');
  assert.equal(h.state[2], 'permission denied');
  assert.match(h.state[3], /1 invitación enviada/);
  assert.equal(h.calls.filter(([name]) => name === 'change_collaboration').length, 2);
  assert.equal(h.refreshes(), 1);
});
test('failed invitation preserves all selections without success feedback', async () => {
  const h = panel({ owner: true, fail: true });
  h.state[1] = 'friend, other';
  await h.click('enviar invitación');
  assert.equal(h.state[1], 'friend, other');
  assert.equal(h.state[3], '');
  assert.equal(h.refreshes(), 0);
});
test('accepted credited people can withdraw their own credit', async () => {
  const h = panel({ accepted: true, kind: 'post' }); await h.click('retirar mi crédito');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls[0][1].action, 'leave');
});
test('private credits cannot leak through profile query and edit links are individually scoped', () => {
  const profile = fs.readFileSync('app/components/CreditedWorks.tsx', 'utf8');
  assert.match(profile, /not\('accepted_at', 'is', null\)/);
  assert.match(profile, /is\('audience_colectivo_id', null\)/);
  const edit = fs.readFileSync('app/post/[id]/edit/page.tsx', 'utf8');
  assert.match(edit, /delete\(\)\.eq\("post_id", id\)\.eq\('project_id', initialProject\)/);
  assert.doesNotMatch(edit, /delete\(\)\.eq\("post_id", id\);/);
});
