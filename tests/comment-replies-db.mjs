import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(`create table posts(id uuid primary key, comments_enabled boolean default true);
create table comments(id uuid primary key, post_id uuid references posts(id), author_id uuid, body text, is_hidden boolean default false);
insert into posts(id) values ('${id(1)}'), ('${id(2)}');`);
await db.exec(await readFile('supabase/comment_replies.sql', 'utf8'));
const insert = (n, post=1, parent=null, hidden=false) => db.query(
  'insert into comments(id,post_id,author_id,parent_id,is_hidden) values($1,$2,$3,$4,$5)',
  [id(n), id(post), id(99), parent ? id(parent) : null, hidden]);
await insert(10);
await insert(11, 1, 10);
await assert.rejects(() => insert(12, 2, 10), /reply target unavailable/);
await assert.rejects(() => insert(12, 1, 11), /reply target unavailable/);
await insert(20, 1, null, true);
await assert.rejects(() => insert(12, 1, 20), /reply target unavailable/);
await assert.rejects(() => db.query('update comments set post_id=$1 where id=$2', [id(2),id(11)]), /cannot change/);
await assert.rejects(() => db.query('update comments set author_id=$1 where id=$2', [id(98),id(11)]), /cannot change/);
await assert.rejects(() => db.query('update comments set parent_id=$1 where id=$2', [id(20),id(11)]), /thread cannot change/);
await db.exec('update posts set comments_enabled=false');
await assert.rejects(() => insert(12, 1, 10), /reply target unavailable/);
await db.query('delete from comments where id=$1', [id(10)]);
assert.equal((await db.query('select parent_id from comments where id=$1',[id(11)])).rows[0].parent_id, null);
await db.close();
console.log('PASS: replies validate post, nesting, hidden/closed targets, immutable threads and parent deletion');
