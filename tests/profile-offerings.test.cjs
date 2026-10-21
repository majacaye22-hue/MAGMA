const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(url) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/profile-offerings.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, process: { env: { NEXT_PUBLIC_SUPABASE_URL: url } } });
  return exports;
}
const api = load('https://jbzkdzcaqmxsmmyrlwif.supabase.co');
test('cover uploads accept supported images and enforce size limits', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
    assert.equal(api.offeringCoverError({ type, size: 1024 }), null);
  }
  for (const type of ['image/svg+xml', 'audio/mpeg', 'text/html', '']) {
    assert.ok(api.offeringCoverError({ type, size: 1024 }));
  }
  assert.ok(api.offeringCoverError({ type: 'image/png', size: 0 }));
  assert.equal(api.offeringCoverError({ type: 'image/png', size: 15 * 1024 * 1024 }), null);
  assert.ok(api.offeringCoverError({ type: 'image/png', size: 15 * 1024 * 1024 + 1 }));
});
test('portfolio pilot is enabled only for staging', () => {
  assert.equal(api.PROFILE_OFFERINGS_ENABLED, true);
  assert.equal(load('https://avmztbdgyyrqccizmzsh.supabase.co').PROFILE_OFFERINGS_ENABLED, false);
  assert.equal(load(undefined).PROFILE_OFFERINGS_ENABLED, false);
});
test('offerings allow unpaid or unspecified participation, enforce text bounds', () => {
  const value = { title: 'fotografía', description: 'retratos por la ciudad', modes: [], work_path: null };
  assert.equal(api.offeringError(value), null);
  for (const patch of [{ title: ' ' }, { title: 'a'.repeat(81) }, { description: '' }, { description: 'a'.repeat(601) }, { modes: ['ranking'] }]) assert.ok(api.offeringError({ ...value, ...patch }));
  assert.equal(api.offeringError({ ...value, modes: ['trabajo pagado', 'intercambio', 'colaboración'] }), null);
});
test('work links cannot navigate to external sites, scripts, or unrelated routes', () => {
  assert.equal(api.validWorkPath('/proyecto/e7a09280-0000-4000-8000-000000000001'), true);
  for (const path of ['javascript:alert(1)', '//evil.com', 'https://evil.com', '/staff', '/post/../staff', '/post/abc']) assert.equal(api.validWorkPath(path), false);
});
test('database enforces authenticated reads and ownership for all writes', () => {
  const sql = fs.readFileSync('supabase/profile_offerings.sql', 'utf8');
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL .* FROM anon/);
  assert.match(sql, /FOR INSERT TO authenticated WITH CHECK \(profile_id = auth.uid\(\)\)/);
  assert.match(sql, /FOR UPDATE TO authenticated USING \(profile_id = auth.uid\(\)\) WITH CHECK \(profile_id = auth.uid\(\)\)/);
  assert.match(sql, /FOR DELETE TO authenticated USING \(profile_id = auth.uid\(\)\)/);
});
