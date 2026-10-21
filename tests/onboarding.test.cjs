const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function load(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, process: { env: {} }, require(name) {
    if (name in deps) return deps[name];
    throw Error(name);
  } });
  return exports;
}
const onboarding = load('lib/onboarding.ts');
const answers = { motivation: '  Hacer música  ', contribution: 'Escuchar y compartir', accepted: true, version: onboarding.ONBOARDING_VERSION };
test('onboarding accepts a short response, trims it and requires explicit current consent', () => {
  assert.equal(onboarding.validateOnboarding(answers).motivation, 'Hacer música');
  for (const invalid of [null, {}, { ...answers, accepted: 'true' }, { ...answers, accepted: false }, { ...answers, version: 'old' }, { ...answers, motivation: ' \n ' }, { ...answers, contribution: 'x'.repeat(1501) }]) {
    assert.equal(onboarding.validateOnboarding(invalid), null);
  }
});

function api({ storageFail = false, saveFail = false, cleanupFail = false, deliveryFail = false } = {}) {
  const calls = [];
  const db = {
    from: name => ({ select: () => ({ limit: async () => { calls.push(name); return { error: storageFail ? {} : null }; } }) }),
    rpc: async (name, args) => { calls.push([name, args]); return { error: saveFail ? { message: 'private database error' } : null }; },
    auth: {
      admin: {
        createUser: async args => { calls.push(['createUser', args]); return { data: { user: { id: 'new-user' } }, error: null }; },
        deleteUser: async id => { calls.push(['deleteUser', id]); return { error: cleanupFail ? {} : null }; },
      },
      resend: async () => { calls.push('resend'); return { error: deliveryFail ? {} : null }; },
    },
  };
  const route = load('app/api/auth/register/route.ts', {
    '@supabase/supabase-js': { createClient: () => db },
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    '@/lib/onboarding': onboarding,
  });
  return { calls, submit: body => route.POST({ headers: { get: () => 'test' }, nextUrl: { origin: 'http://localhost:3001' }, json: async () => body }) };
}
const signup = { email: 'test@example.com', password: 'password-for-test', username: 'new_user', onboarding: answers };
test('missing answers and invalid JSON shapes never create an account', async () => {
  for (const body of [null, [], { ...signup, onboarding: undefined }]) {
    const h = api(); assert.equal((await h.submit(body)).status, 400); assert.equal(h.calls.length, 0);
  }
});
test('missing migration fails before creating an account', async () => {
  const h = api({ storageFail: true }); assert.equal((await h.submit(signup)).status, 503);
  assert.equal(h.calls.length, 1);
});
test('answers and server-owned agreement snapshot save before confirmation; no public Auth metadata', async () => {
  const h = api(); const result = await h.submit(signup);
  assert.equal(result.status, 200); assert.equal(result.body.requires_confirmation, true);
  assert.equal(h.calls[2][0], 'register_member_profile'); assert.equal(h.calls[3], 'resend');
  assert.equal(h.calls[2][1].p_motivation, 'Hacer música');
  assert.deepEqual(h.calls[2][1].p_snapshot.agreements, onboarding.COMMUNITY_AGREEMENTS);
  assert.equal(h.calls[1][1].email_confirm, false);
  assert.equal(h.calls[1][1].user_metadata, undefined);
});
test('failed save rolls back the newly created Auth user and never sends confirmation', async () => {
  const h = api({ saveFail: true }); const result = await h.submit(signup);
  assert.equal(result.status, 400); assert.equal(h.calls[3][0], 'deleteUser');
  assert.ok(!h.calls.includes('resend')); assert.ok(!result.body.error.includes('private database error'));
});
test('cleanup failure asks for help; mail failure keeps saved registration retryable', async () => {
  const h = api({ saveFail: true, cleanupFail: true });
  assert.match((await h.submit(signup)).body.error, /contacta/);
  const mail = api({ deliveryFail: true }); const result = await mail.submit(signup);
  assert.equal(result.status, 200); assert.equal(result.body.delivery_failed, true);
  assert.ok(!mail.calls.some(c => c[0] === 'deleteUser'));
});

test('review page verifies owner before fetching any private answers', async () => {
  for (const viewer of [null, 'ordinary-member', 'moderator']) {
    const calls = [];
    const page = load('app/staff/ingresos/page.tsx', {
      'react/jsx-runtime': require('react/jsx-runtime'),
      'next/link': { default: 'a' },
      'next/navigation': { redirect: path => { throw Error(`redirect:${path}`); } },
      './ReviewButton': { default: 'review-button' },
      '@/lib/supabase-server': { createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: viewer ? { id: viewer } : null } }) },
        from: table => { calls.push(table); return { select: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { owner_user_id: 'owner' } }) }) }) }; },
      }) },
    });
    await assert.rejects(page.default({ searchParams: Promise.resolve({}) }), /redirect:/);
    assert.ok(!calls.includes('member_onboarding'));
  }
});

test('review marker uses the private RPC and reports failures without refreshing', async () => {
  for (const failed of [false, true]) {
    const state = []; let idx = 0; const calls = [];
    const component = load('app/staff/ingresos/ReviewButton.tsx', {
      'react/jsx-runtime': require('react/jsx-runtime'),
      react: { useState: initial => { const i=idx++; state[i]=initial; return [initial, value => { state[i]=value; }]; } },
      'next/navigation': { useRouter: () => ({ refresh: () => calls.push('refresh') }) },
      '@/lib/supabase': { getSupabaseClient: () => ({ rpc: async (name,args) => { calls.push([name,args]); return { error: failed ? {} : null }; } }) },
    });
    const element = component.default({ userId: 'member', reviewed: false });
    await element.props.children[0].props.onClick();
    assert.equal(calls[0][0], 'review_member_onboarding');
    assert.equal(calls[0][1].p_reviewed, true);
    assert.equal(calls.includes('refresh'), !failed);
    assert.equal(Boolean(state[1]), failed); assert.equal(state[0], false);
  }
});
