// Local only: PGLITE_MODULE=/path/to/pglite/dist/index.js node tests/event-details-db.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
try {
  await db.exec('create table public.posts(id integer primary key, event_date timestamptz); insert into public.posts values (1, null);');
  const migration = fs.readFileSync('supabase/event_details.sql', 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  await db.exec("update posts set event_date='2026-10-25T05:30Z', event_end_date='2026-10-25T09:00Z', event_category='fiesta', event_link='https://example.com/tickets', event_link_kind='tickets', minimum_age=18 where id=1");
  for (const sql of [
    "update posts set event_end_date='2026-10-25T04:00Z'",
    "update posts set event_date=null",
    "update posts set event_category='invalid'",
    "update posts set event_link='javascript:alert(1)'",
    "update posts set event_link='https://user:secret@example.com'",
    "update posts set event_link_kind=null",
    "update posts set minimum_age=-1",
    "update posts set accessibility_info=repeat('a',1501)",
  ]) await assert.rejects(db.exec(sql), undefined, sql);
  assert.equal((await db.query('select minimum_age from posts')).rows[0].minimum_age, 18);
  console.log('PASS: additive/idempotent event-details migration and database constraints');
} finally { await db.close(); }
