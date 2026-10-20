// Local-only real PostgreSQL permission checks. No remote writes or credentials.
// PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/onboarding-db.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const owner = '10000000-0000-4000-8000-000000000001';
const member = '10000000-0000-4000-8000-000000000002';
const stranger = '10000000-0000-4000-8000-000000000003';
const moderator = '10000000-0000-4000-8000-000000000004';
const pending = '10000000-0000-4000-8000-000000000005';
async function as(role, id = '') {
  await db.exec(`RESET ROLE; SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
}
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_app_meta_data jsonb DEFAULT '{}', raw_user_meta_data jsonb DEFAULT '{}', email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
  for (const table of ['app_config', 'profiles']) {
    await db.exec(schema.match(new RegExp(`CREATE TABLE ${table} \\([\\s\\S]*?\\n\\);`))[0]);
    await db.exec(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; GRANT SELECT ON ${table} TO authenticated;`);
  }
  for (const match of schema.matchAll(/CREATE POLICY[\s\S]*?;/g)) {
    if (/ON (app_config|profiles)\s/.test(match[0])) await db.exec(match[0]);
  }
  for (const [id, username] of [[owner,'owner'],[member,'member'],[stranger,'stranger'],[moderator,'moderator'],[pending,'pending']]) {
    await db.query('INSERT INTO auth.users(id) VALUES ($1)', [id]);
    if (id !== member && id !== pending) await db.query('INSERT INTO profiles(id,username,is_moderator) VALUES ($1,$2,$3)', [id,username,id === moderator]);
  }
  await db.query('INSERT INTO app_config VALUES ($1)', [owner]);
  await db.exec(fs.readFileSync('supabase/member_onboarding.sql', 'utf8'));
  // Migration is safely repeatable.
  await db.exec(fs.readFileSync('supabase/member_onboarding.sql', 'utf8'));
  const fresh = '10000000-0000-4000-8000-000000000006';
  await assert.rejects(db.query('INSERT INTO auth.users(id) VALUES ($1)', [fresh]));
  await assert.rejects(db.query('INSERT INTO auth.users(id,raw_user_meta_data) VALUES ($1,$2)', [fresh, { magma_onboarding_version: '2026-10-20.v1' }]));
  await db.query('INSERT INTO auth.users(id,raw_app_meta_data) VALUES ($1,$2)', [fresh, { magma_onboarding_version: '2026-10-20.v1' }]);
  await assert.rejects(db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [fresh]));
  // Existing unconfirmed members still confirm without retroactive questions.
  await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [owner]);
  const register = (id, username, answer = 'A thoughtful sentence') => db.query("SELECT register_member_profile($1,$2,NULL,NULL,$3,'Together','2026-10-20.v1',$4)", [id, username, answer, { questions: ['q1','q2'], agreements: ['care'], privacy: 'private' }]);
  await as('service_role');
  await register(member, 'member');
  await register(fresh, 'fresh');
  await assert.rejects(register(pending, 'pending', ' '));
  await as('postgres');
  await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [fresh]);
  await db.query('DELETE FROM auth.users WHERE id=$1', [fresh]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM profiles WHERE id=$1', [pending])).rows[0].n, 0, 'profile rolled back with invalid answers');
  await as('authenticated', member);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM member_onboarding')).rows[0].n, 1);
  await assert.rejects(db.query('UPDATE member_onboarding SET motivation=$1', ['tamper']));
  await assert.rejects(db.query('DELETE FROM member_onboarding'));
  await assert.rejects(db.query('SELECT review_member_onboarding($1,true)', [member]));
  await assert.rejects(register(pending, 'bypass'));
  for (const id of [stranger, moderator]) {
    await as('authenticated', id);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM member_onboarding')).rows[0].n, 0);
    await assert.rejects(db.query('SELECT review_member_onboarding($1,true)', [member]));
  }
  await as('anon');
  await assert.rejects(db.query('SELECT * FROM member_onboarding'));
  await assert.rejects(db.query('SELECT review_member_onboarding($1,true)', [member]));
  await as('authenticated', owner);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM member_onboarding')).rows[0].n, 1);
  await db.query('SELECT review_member_onboarding($1,true)', [member]);
  let record = (await db.query('SELECT * FROM member_onboarding')).rows[0];
  assert.ok(record.reviewed_at); assert.equal(record.reviewed_by, owner); assert.equal(record.motivation, 'A thoughtful sentence');
  await db.query('SELECT review_member_onboarding($1,false)', [member]);
  record = (await db.query('SELECT * FROM member_onboarding')).rows[0];
  assert.equal(record.reviewed_at, null); assert.equal(record.reviewed_by, null);
  await as('postgres');
  await db.query('DELETE FROM auth.users WHERE id=$1', [member]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM member_onboarding')).rows[0].n, 0, 'account deletion cascades');
  console.log('PASS: atomic registration, repeatable migration, private read matrix, owner-only review, immutable answers, cascade deletion');
} finally { await db.close(); }
