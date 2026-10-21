const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const helpers = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/search.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: helpers, URLSearchParams });

test('normalizes handles, Spanish text and tags without accepting filter syntax', () => {
  assert.equal(helpers.normalizeSearch(' @magma_prueba01 '), 'magma_prueba01');
  assert.equal(helpers.normalizeSearch('#fotografía'), 'fotografía');
  assert.equal(helpers.normalizeSearch('  ciudad   de méxico '), 'ciudad de méxico');
  assert.ok(!/[(),%*"\\]/.test(helpers.normalizeSearch('x),is_private.eq.true,%*"\\')));
  assert.equal(helpers.normalizeSearch('a'.repeat(200)).length, 80);
  assert.match(helpers.searchFilter(['username'], 'test_user'), /\\\\_/);
  assert.match(helpers.searchFilter(['title'], 'arte', true), /tags.ov/);
});

test('URLs preserve query and filter; malformed pages and repeated parameters are safe', () => {
  assert.equal(helpers.searchParamsFrom({ q: ['a', 'b'], tipo: 'invalid', pagina: '-1' }).q, '');
  assert.equal(helpers.searchParamsFrom({ q: 'arte', tipo: 'personas', pagina: '2' }).page, 2);
  assert.equal(helpers.searchParamsFrom({ q: 'arte', tipo: 'todo', pagina: '2' }).page, 1);
  assert.equal(helpers.searchParamsFrom({ q: 'arte', tipo: 'personas', pagina: 'Infinity' }).page, 1);
  assert.equal(new URL(helpers.searchHref('méxico', 'personas', 3), 'https://example.test').searchParams.get('q'), 'méxico');
});

function fakeDb(failTable) {
  const calls = [];
  return { calls, from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const query = {
      select(value) { call.select = value; return query; },
      eq(key, value) { call.filters.push([key, value]); return query; },
      is(key, value) { call.filters.push([key, value]); return query; },
      or(value) { call.or = value; return query; }, order() { return query; },
      async range(start, end) {
        call.range = [start, end];
        if (table === failTable) return { data: null, error: new Error('unavailable') };
        return { error: null, data: Array.from({ length: end - start + 1 }, (_, i) => ({
          id: String(i), title: 'obra', body: '<p>prueba</p>', type: 'arte', username: 'prueba', name: 'colectivo', slug: 'colectivo', is_sensitive: table === 'posts',
        })) };
      },
    }; return query;
  } };
}

test('search excludes hidden/pending posts and unlisted groups, never queries messages', async () => {
  const db = fakeDb();
  const groups = await helpers.searchMagma(db, 'arte', 'todo', 1);
  assert.equal(db.calls.length, 4);
  assert.equal(db.calls.find(c => c.table === 'posts').filters.map(f => f.join('=')).join(','), 'is_hidden=false,moderation_status=approved,audience_colectivo_id=');
  assert.equal(db.calls.find(c => c.table === 'posts').filters[2][1], null);
  assert.equal(db.calls.find(c => c.table === 'colectivos').filters[0].join('='), 'is_private=false');
  assert.ok(db.calls.every(c => !c.table.includes('messages') && c.range[1] === 6));
  assert.ok(groups.every(g => g.rows.length === 6 && g.hasMore));
  assert.equal(groups[0].rows[0].title, 'publicación con contenido sensible');
});

test('category pagination is bounded; empty queries do not hit the database; failures remain explicit', async () => {
  const db = fakeDb();
  await helpers.searchMagma(db, 'a', 'todo', 1); assert.equal(db.calls.length, 0);
  const groups = await helpers.searchMagma(db, 'arte', 'personas', 2);
  assert.equal(db.calls.length, 1); assert.equal(db.calls[0].range.join(','), '20,40');
  assert.equal(groups[0].rows.length, 20);
  const failed = await helpers.searchMagma(fakeDb('projects'), 'arte', 'todo', 1);
  assert.equal(failed.find(g => g.type === 'proyectos').error, true);
  assert.equal(failed.find(g => g.type === 'personas').error, false);
});
