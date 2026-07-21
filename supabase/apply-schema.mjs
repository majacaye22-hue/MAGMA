#!/usr/bin/env node
// Run: node supabase/apply-schema.mjs <postgres-connection-string>
// Example connection string format (from Supabase Settings → Database → URI):
//   postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
//   or the direct connection:
//   postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const connString = process.argv[2];
if (!connString) {
  console.error('Usage: node supabase/apply-schema.mjs <connection-string>');
  process.exit(1);
}

const sqlFile = process.argv[3] ?? join(__dirname, 'schema.sql');
const sql = readFileSync(sqlFile, 'utf8');

const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false }, family: 4 });

try {
  await client.connect();
  console.log('Connected to database.');
  await client.query(sql);
  console.log(`✓ Applied ${sqlFile}`);

  // Verify tables
  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  console.log(`\nTables created (${rows.length}):`);
  rows.forEach(r => console.log('  •', r.tablename));

  // Verify RLS
  const { rows: rls } = await client.query(`
    SELECT tablename, COUNT(*) AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename;
  `);
  console.log(`\nRLS policies per table:`);
  rls.forEach(r => console.log(`  • ${r.tablename}: ${r.policy_count} policies`));

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
