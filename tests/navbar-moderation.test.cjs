const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function menuLinks(profile, queue = null, href = '/mod', collaborations = true) {
  let index = 0;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/navbar.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react') return { useState: () => [[profile, true, true, queue][index++], () => {}], useRef: value => ({ current: value }), useEffect: () => {} };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return { default: 'a' };
    if (name === 'next/navigation') return { useRouter: () => ({}), usePathname: () => '/' };
    if (name === '@/lib/supabase') return { getSupabaseClient: () => ({}) };
    if (name === '@/lib/collaborations') return { COLLABORATIONS_ENABLED: collaborations };
    return { MagmaLogo: () => null, NotificationBell: () => null };
  } });
  function walk(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(walk);
    return [...(node.props?.href && (href === null || node.props.href === href) ? [node] : []), ...walk(node.props?.children)];
  }
  return walk(exports.Navbar());
}
test('moderators get moderation links in both desktop and mobile menus', () => {
  assert.equal(menuLinks({ username: 'mod', is_moderator: true }).length, 2);
});
test('account menus use the short invitations label without saved or draft shortcuts', () => {
  const profile = { username: 'member', is_moderator: false };
  const invitations = menuLinks(profile, null, '/colaboraciones');
  assert.equal(invitations.length, 2);
  assert.ok(invitations.every(link => link.props.children === 'invitaciones'));
  const links = menuLinks(profile, null, null);
  assert.ok(!links.some(link => /guardados|borradores/.test(link.props.href)));
  assert.equal(menuLinks(profile, null, '/colaboraciones', false).length, 0);
  assert.equal(menuLinks(null, null, '/colaboraciones').length, 0);
});
test('ordinary members, missing roles and signed-out visitors get no moderation link', () => {
  for (const profile of [null, { username: 'member', is_moderator: false }, { username: 'unknown' }]) {
    assert.equal(menuLinks(profile).length, 0);
  }
});
test('pending queue badge is scoped to the current moderator and disappears for an empty queue', () => {
  const profile = { username: 'mod', is_moderator: true };
  const pending = JSON.stringify(menuLinks(profile, { username: 'mod', pending: true }));
  assert.match(pending, /DC143C/);
  assert.match(pending, /publicaciones pendientes de revisión/);
  for (const queue of [null, { username: 'mod', pending: false }, { username: 'other', pending: true }]) {
    assert.doesNotMatch(JSON.stringify(menuLinks(profile, queue)), /DC143C/);
  }
});
