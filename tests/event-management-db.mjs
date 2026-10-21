// Local PostgreSQL only. Uses real baseline RLS and privacy/invitation migrations.
// Notification fixture omits unrelated comment/message delivery triggers.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const host=id(1), guest=id(2), blocked=id(3), declined=id(4), stranger=id(5), event=id(10), privateEvent=id(11), group=id(20), project=id(30);
const run = sql => db.exec(sql);
const as = async user => { await run(`reset role; set request.jwt.claim.sub='${user}'; set role authenticated;`); };
const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];
try {
  await run(`create role authenticated; create role anon; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated,anon;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean);`);
  const schema=fs.readFileSync('supabase/schema.sql','utf8');
  const tables=['app_config','profiles','posts','blocked_users','colectivos','colectivo_members','colectivo_posts','projects','post_projects','event_attendances'];
  for (const table of tables) {
    await run(schema.match(new RegExp(`CREATE TABLE ${table} \\([\\s\\S]*?\\n\\);`))[0]);
    await run(`alter table ${table} enable row level security; grant select,insert,update,delete on ${table} to authenticated;`);
  }
  for(const policy of schema.matchAll(/CREATE POLICY[\s\S]*?;/g)) {
    if(tables.some(table=>new RegExp(`ON (?:public\\.)?${table}\\s`,'i').test(policy[0]))) await run(policy[0]);
  }
  await run(`create table comments(post_id uuid); alter table comments enable row level security;
    create table notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid references profiles,actor_id uuid references profiles,
      kind text constraint notifications_kind_check check(kind in ('mention')),post_id uuid references posts,read_at timestamptz,
      check(recipient_id<>actor_id));
    alter table notifications enable row level security; grant select on notifications to authenticated;`);
  for(const name of ['colectivo_post_privacy','event_details','event_invitations','event_management']) await run(fs.readFileSync(`supabase/${name}.sql`,'utf8'));
  for(const [i,name] of [[1,'host'],[2,'guest'],[3,'blocked'],[4,'declined'],[5,'stranger']]) {
    await run(`insert into auth.users values('${id(i)}','${name}@test.invalid'); insert into profiles(id,username) values('${id(i)}','${name}');`);
  }
  await run(`insert into colectivos(id,name,slug,created_by,is_private) values('${group}','private','private','${host}',true);
    insert into colectivo_members(colectivo_id,user_id) values('${group}','${guest}');
    insert into projects(id,title,author_id) values('${project}','project','${guest}');
    insert into posts(id,author_id,type,title,moderation_status,event_date,audience_colectivo_id) values
    ('${event}','${host}','evento','public','approved',now()+interval '2 days',null),
    ('${privateEvent}','${host}','evento','private','approved',now()+interval '2 days','${group}');`);
  await as(host);
  await run(`select invite_to_event('${event}',array['guest','blocked','declined']); select invite_to_event('${privateEvent}',array['guest']);
    insert into event_people(event_id,role,profile_id) values('${event}','participant','${guest}');
    insert into event_people(event_id,role,project_id) values('${event}','organizer','${project}');`);
  await assert.rejects(run(`insert into event_people(event_id,role,colectivo_id) values('${event}','organizer','${group}')`));
  await assert.rejects(run(`insert into event_people(event_id,role,profile_id) values('${event}','participant','${guest}')`));
  await as(guest);
  await run(`insert into event_attendances(event_id,user_id) values('${event}','${guest}');`);
  await assert.rejects(run(`insert into event_people(event_id,role,profile_id) values('${event}','organizer','${stranger}')`));
  await assert.rejects(run(`select change_event_status('${event}','cancelled','bad',0)`));
  await run(`delete from event_people where profile_id='${guest}';`);
  assert.equal(await scalar('select count(*) from event_people'),1);
  await as(declined); await run(`select respond_to_event_invitation('${event}','declined')`);
  await as(blocked); await run(`insert into blocked_users(blocker_id,blocked_id) values('${blocked}','${host}')`);
  await as(host);
  await assert.rejects(run(`insert into event_people(event_id,role,profile_id) values('${event}','participant','${blocked}')`));
  await assert.rejects(run(`select change_event_status('${event}','cancelled',' ',0)`));
  await run(`select change_event_status('${event}','cancelled','lluvia',0)`);
  await assert.rejects(run(`select change_event_status('${event}','cancelled','lluvia',0)`));
  await run(`select change_event_status('${event}','cancelled','lluvia',1)`); // exact no-op
  await run('reset role');
  assert.equal(await scalar('select count(*) from notifications'),1,'dedupe attendee/invite; exclude blocked/declined');
  await as(guest);
  assert.equal(await scalar('select kind from notifications'),'event_cancelled');
  await assert.rejects(run(`select respond_to_event_invitation('${event}','going')`));
  await as(stranger);
  assert.equal(await scalar('select count(*) from notifications'),0);
  await assert.rejects(run(`insert into event_attendances(event_id,user_id) values('${event}','${stranger}')`));
  await assert.rejects(run(`insert into event_attendances(event_id,user_id) values('${privateEvent}','${stranger}')`));
  await as(host); await run(`select change_event_status('${privateEvent}','postponed','nueva fecha pronto',0)`);
  await as(guest); assert.equal(await scalar('select count(*) from notifications'),2);
  await run(`delete from colectivo_members where colectivo_id='${group}' and user_id='${guest}'`);
  assert.equal(await scalar('select count(*) from notifications'),1,'membership loss hides private notification');
  await as(host); await run(`select change_event_status('${event}','scheduled',null,1)`);
  await run('reset role'); assert.equal(await scalar('select count(*) from notifications'),3);
  // Failed delivery rolls the status change back, rather than silently losing alerts.
  await run(`create function fail_delivery() returns trigger language plpgsql as $$begin raise exception 'delivery failed'; end$$;
    create trigger fail_delivery before insert on notifications for each row execute function fail_delivery();`);
  await as(host); await assert.rejects(run(`select change_event_status('${event}','postponed','test',2)`));
  assert.equal(await scalar(`select event_status from posts where id='${event}'`),'scheduled');
  assert.equal(await scalar(`select event_status_version from posts where id='${event}'`),2);
  await run('reset role; drop trigger fail_delivery on notifications;');
  await as(host); await run(`update posts set venue='new venue' where id='${event}'`);
  await run('reset role'); assert.equal(await scalar('select count(*) from notifications'),4);
  console.log('PASS: event links/RLS, self-removal, blocks, status concurrency, notification dedupe/privacy, closed RSVPs and atomic rollback');
} finally { await db.close(); }
