const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function pageFor(post, user = { id: 'viewer' }) {
  const calls = [];
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      calls.push(table);
      const query = {
        select() { return query; }, eq() { return query; }, abortSignal() { return query; },
        maybeSingle: async () => ({ data: post }),
        order: async () => ({ data: [] }),
        single: async () => ({ data: { username: 'viewer' } }),
      };
      return query;
    },
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../app/post/[id]/page.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } }).outputText, { exports, console, setTimeout, clearTimeout, AbortSignal, process, require(id) {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    if (id === '@/lib/supabase-server') return { createClient: async () => db };
    if (id === 'next/navigation') return { redirect: () => { throw new Error('redirect'); } };
    return new Proxy({}, { get: (_, name) => name });
  } });
  return { render: () => exports.default({ params: Promise.resolve({ id: 'post' }) }), calls };
}

test('post renders before discussion/profile requests; conversation stays behind Suspense', async () => {
  const { render, calls } = pageFor({ id: 'post', type: 'fotografía', media_url: '/photo.jpg' });
  const result = await render();
  assert.deepEqual(calls, ['posts']);
  const view = result.props.children.find(child => child?.props?.conversation);
  const boundary = view.props.conversation;
  assert.equal(boundary.type, require('react').Suspense);
  const discussion = boundary.props.children;
  await discussion.type(discussion.props);
  assert.deepEqual(calls, ['posts', 'comments', 'profiles']);
});

test('unavailable private posts never start discussion queries', async () => {
  const { render, calls } = pageFor(null);
  const result = await render();
  assert.equal(result.type, 'main');
  assert.deepEqual(calls, ['posts']);
});

test('signed-out requests still redirect before reading posts', async () => {
  const { render, calls } = pageFor({}, null);
  await assert.rejects(render, /redirect/);
  assert.deepEqual(calls, []);
});

test('legacy media is fetched only when a media URL is absent', async () => {
  const { render, calls } = pageFor({ id: 'post', type: 'fotografía', media_base64: 'data:image/png;base64,legacy' });
  const result = await render();
  assert.deepEqual(calls, ['posts', 'posts']);
  assert.equal(result.props.children.find(child => child?.props?.post)?.props.post.media_base64, 'data:image/png;base64,legacy');
});

test('written posts do not fetch legacy image data', async () => {
  const { render, calls } = pageFor({ id: 'post', type: 'escrito', body: 'texto' });
  await render();
  assert.deepEqual(calls, ['posts']);
});
