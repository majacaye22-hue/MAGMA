// Local PostgreSQL only; real baseline RLS plus colectivo privacy migration.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const as = async n => db.exec(`reset role; set request.jwt.claim.sub='${id(n)}'; set role authenticated;`);
const insert = (n, author, post=10, parent=null) => db.query(
  'insert into comments(id,post_id,author_id,body,parent_id) values($1,$2,$3,$4,$5)',
  [id(n),id(post),id(author),'test reply',parent === null ? null : id(parent)]);
const rows = async sql => (await db.query(sql)).rows;
try {
  await db.exec(`create role authenticated; create role anon; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated,anon;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean);`);
  const schema = fs.readFileSync('supabase/schema.sql','utf8');
  const tables = ['app_config','profiles','posts','colectivos','colectivo_members','colectivo_posts','comments'];
  for (const table of tables) {
    await db.exec(schema.match(new RegExp(`CREATE TABLE ${table} \\([\\s\\S]*?\\n\\);`))[0]);
    await db.exec(`alter table ${table} enable row level security; grant select,insert,update,delete on ${table} to authenticated;`);
  }
  for (const policy of schema.matchAll(/CREATE POLICY[\s\S]*?;/g)) {
    if (tables.some(table => new RegExp(`ON (?:public\\.)?${table}\\s`, 'i').test(policy[0]))) await db.exec(policy[0]);
  }
  await db.exec('create table notifications(post_id uuid); alter table notifications enable row level security;');
  await db.exec(fs.readFileSync('supabase/colectivo_post_privacy.sql','utf8'));
  const migration = fs.readFileSync('supabase/comment_replies.sql','utf8');
  await db.exec(migration);
  await db.exec(migration);
  for (const n of [1,2,3]) {
    await db.exec(`insert into auth.users values('${id(n)}'); insert into profiles(id,username) values('${id(n)}','member${n}');`);
  }
  await db.exec(`insert into colectivos(id,name,slug,created_by,is_private) values('${id(20)}','private','private','${id(1)}',true);
    insert into colectivo_members(colectivo_id,user_id) values('${id(20)}','${id(2)}');
    insert into posts(id,author_id,type,moderation_status,audience_colectivo_id) values
    ('${id(10)}','${id(1)}','escrito','approved',null),
    ('${id(11)}','${id(1)}','escrito','approved',null),
    ('${id(12)}','${id(1)}','escrito','approved','${id(20)}');`);
  await as(1); await insert(100,1); await insert(101,1,12);
  await as(2); await insert(102,2,10,100); await insert(103,2,12,101);
  assert.equal((await rows(`select parent_id from comments where id='${id(102)}'`))[0].parent_id,id(100));
  await assert.rejects(insert(104,2,11,100), /reply target unavailable/);
  await assert.rejects(insert(104,2,10,102), /reply target unavailable/);
  await assert.rejects(insert(104,2,10,104), /reply target unavailable/);
  await assert.rejects(insert(104,1,10,100), /row-level security/);
  assert.equal((await rows(`update comments set body='not mine' where id='${id(100)}' returning id`)).length,0);
  assert.equal((await rows(`delete from comments where id='${id(100)}' returning id`)).length,0);
  await assert.rejects(db.exec(`update comments set post_id='${id(11)}' where id='${id(102)}'`),/cannot change/);
  await assert.rejects(db.exec(`update comments set author_id='${id(1)}' where id='${id(102)}'`),/cannot change/);
  await assert.rejects(db.exec(`update comments set parent_id=null where id='${id(102)}'`),/thread cannot change/);
  await as(3);
  assert.equal((await rows(`select id from comments where post_id='${id(12)}'`)).length,0);
  await assert.rejects(insert(104,3,12,101), /reply target unavailable|row-level security/);
  await db.exec(`reset role; update comments set is_hidden=true where id='${id(100)}';`);
  await as(2);
  await assert.rejects(insert(104,2,10,100), /reply target unavailable/);
  // RLS-invisible is not deleted: a member must not detach a hidden parent.
  await assert.rejects(db.exec(`update comments set parent_id=null where id='${id(102)}'`),/thread cannot change/);
  await db.exec(`reset role; update comments set is_hidden=false where id='${id(100)}'; update posts set comments_enabled=false where id='${id(10)}';`);
  await as(2);
  await assert.rejects(insert(104,2,10,100), /reply target unavailable/);
  await assert.rejects(insert(104,2,10), /row-level security/);
  await as(1); await db.exec(`delete from comments where id='${id(100)}';`);
  await as(2);
  assert.equal((await rows(`select parent_id from comments where id='${id(102)}'`))[0].parent_id,null);
  await db.exec(`update comments set body='edited own reply' where id='${id(102)}';`);
  assert.equal((await rows(`select body from comments where id='${id(102)}'`))[0].body,'edited own reply');
  await db.exec(`delete from comments where id='${id(102)}';`);
  assert.equal((await rows(`select id from comments where id='${id(102)}'`)).length,0);
  await db.exec(`reset role; delete from colectivo_members where user_id='${id(2)}';`);
  await as(2);
  assert.equal((await rows(`select id from comments where post_id='${id(12)}'`)).length,0);
  await assert.rejects(insert(104,2,12,101),/reply target unavailable|row-level security/);
  await db.exec(`reset role; set request.jwt.claim.sub=''; set role anon;`);
  await assert.rejects(insert(104,2,10,100), /permission denied/);
  console.log('PASS: repeatable migration, cross-account replies, ownership, private audiences, membership loss, hidden/closed targets, immutable threads, parent deletion and signed-out denial');
} finally { await db.close(); }
