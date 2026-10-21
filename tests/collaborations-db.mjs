// Local PostgreSQL runtime, no remote credentials or writes. Install PGlite in a
// temporary directory, then: PGLITE_MODULE=/absolute/path/to/dist/index.js node tests/collaborations-db.mjs
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
if (!process.env.PGLITE_MODULE) throw new Error('Set PGLITE_MODULE to the temporary PGlite module');
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
try {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_app_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
    CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean);`);
  // Extract real baseline tables and policies, not test-only permission lookalikes.
  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
  const tables = ['app_config','profiles','posts','blocked_users','colectivos','colectivo_members','colectivo_posts','projects','post_projects'];
  for (const table of tables) {
    const definition = schema.match(new RegExp(`CREATE TABLE ${table} \\([\\s\\S]*?\\n\\);`));
    if (!definition) throw new Error(`Missing baseline table ${table}`);
    await db.exec(definition[0]);
    await db.exec(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON ${table} TO authenticated;`);
  }
  for (const policy of schema.matchAll(/CREATE POLICY[\s\S]*?;/g)) {
    if (tables.some(table => new RegExp(`ON (?:public\\.)?${table}\\s`, 'i').test(policy[0]))) await db.exec(policy[0]);
  }
  // These two dependent tables are only needed by the privacy migration.
  await db.exec('CREATE TABLE comments(post_id uuid); CREATE TABLE notifications(post_id uuid); ALTER TABLE comments ENABLE ROW LEVEL SECURITY; ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;');
  await db.exec(fs.readFileSync('supabase/colectivo_post_privacy.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/collaborations.sql', 'utf8'));
  const results = await db.exec(fs.readFileSync('supabase/test_collaborations.sql', 'utf8'));
  console.log(results.flatMap(result => result.rows).filter(row => row.result));
  await db.exec(fs.readFileSync('supabase/event_invitations.sql', 'utf8'));
  const invitations = await db.exec(fs.readFileSync('supabase/test_event_invitations.sql', 'utf8'));
  console.log(invitations.flatMap(result => result.rows).filter(row => row.result));
} finally { await db.close(); }
