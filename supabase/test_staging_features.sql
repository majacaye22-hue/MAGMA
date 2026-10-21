-- Rollback-only integration checks against the complete deployed migration stack.
-- Synthetic accounts only; no email or persistent content is created.
BEGIN;
CREATE TEMP TABLE staging_feature_ids AS SELECT gen_random_uuid() host,gen_random_uuid() guest,
 gen_random_uuid() outsider,gen_random_uuid() event,gen_random_uuid() private_event,
 gen_random_uuid() collective,gen_random_uuid() project,gen_random_uuid() work,
 gen_random_uuid() request, null::uuid question;
GRANT SELECT,UPDATE ON staging_feature_ids TO authenticated;
CREATE FUNCTION pg_temp.assert_feature(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%',message; END IF; END $$;
CREATE FUNCTION pg_temp.deny_feature(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN RETURN; END;
 RAISE EXCEPTION 'unexpected success: %',statement; END $$;
DO $$ DECLARE t record; uid uuid; BEGIN
 SELECT * INTO t FROM staging_feature_ids;
 FOREACH uid IN ARRAY ARRAY[t.host,t.guest,t.outsider] LOOP
 INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES(uid,uid::text||'@staging-feature-test.invalid','{"magma_onboarding_version":"2026-10-20.v1"}');
 INSERT INTO profiles(id,username) VALUES(uid,'sf_'||replace(uid::text,'-','')) ON CONFLICT(id) DO UPDATE SET username=excluded.username;
 END LOOP;
 INSERT INTO colectivos(id,created_by,name,slug,is_private) VALUES(t.collective,t.host,'rollback test',t.collective::text,true);
 INSERT INTO colectivo_members(colectivo_id,user_id) VALUES(t.collective,t.host),(t.collective,t.guest);
 INSERT INTO projects(id,author_id,title) VALUES(t.project,t.host,'rollback journal');
 INSERT INTO posts(id,author_id,type,title,moderation_status,event_date,audience_colectivo_id) VALUES
 (t.event,t.host,'evento','rollback event','approved',now()+interval '2 days',null),
 (t.private_event,t.host,'evento','rollback private event','approved',now()+interval '2 days',t.collective),
 (t.work,t.guest,'arte','rollback work','approved',null,null);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE t record; guest_name text; outsider_name text; q uuid; n integer; BEGIN
 SELECT * INTO t FROM staging_feature_ids;
 PERFORM set_config('request.jwt.claim.sub',t.host::text,true);
 SELECT username INTO guest_name FROM profiles WHERE id=t.guest;
 SELECT username INTO outsider_name FROM profiles WHERE id=t.outsider;
 PERFORM change_collaboration('project',t.project,'invite',guest_name);
 PERFORM change_collaboration('post',t.event,'invite',guest_name);
 PERFORM invite_to_event(t.event,ARRAY[guest_name]);
 PERFORM invite_to_event(t.private_event,ARRAY[guest_name]);
 PERFORM pg_temp.deny_feature(format('select invite_to_event(%L,ARRAY[%L])',t.private_event,outsider_name));
 INSERT INTO event_people(event_id,role,profile_id) VALUES(t.event,'participant',t.guest);
 INSERT INTO event_people(event_id,role,project_id) VALUES(t.event,'organizer',t.project);
 PERFORM pg_temp.deny_feature(format('insert into event_people(event_id,role,colectivo_id) values(%L,''organizer'',%L)',t.event,t.collective));
 PERFORM set_config('request.jwt.claim.sub',t.outsider::text,true);
 PERFORM pg_temp.assert_feature(NOT EXISTS(SELECT 1 FROM event_invitations WHERE event_id IN(t.event,t.private_event)),'outsider invitation leak');
 PERFORM pg_temp.assert_feature(NOT EXISTS(SELECT 1 FROM collaborations WHERE project_id=t.project OR post_id=t.event),'pending collaboration leak');
 PERFORM pg_temp.deny_feature(format('select change_event_status(%L,''cancelled'',''no'',0)',t.event));
 PERFORM pg_temp.deny_feature(format('select respond_to_event_invitation(%L,''going'')',t.event));
 PERFORM set_config('request.jwt.claim.sub',t.guest::text,true);
 PERFORM pg_temp.deny_feature(format('insert into post_projects(post_id,project_id) values(%L,%L)',t.work,t.project));
 PERFORM change_collaboration('post',t.event,'accept');
 PERFORM pg_temp.deny_feature(format('insert into post_projects(post_id,project_id) values(%L,%L)',t.work,t.project));
 UPDATE posts SET title='forbidden' WHERE id=t.event; GET DIAGNOSTICS n=ROW_COUNT;
 PERFORM pg_temp.assert_feature(n=0,'credit grants edit permissions');
 PERFORM change_collaboration('project',t.project,'accept');
 INSERT INTO post_projects(post_id,project_id) VALUES(t.work,t.project);
 PERFORM respond_to_event_invitation(t.event,'going');
 INSERT INTO event_attendances(event_id,user_id) VALUES(t.event,t.guest);
 DELETE FROM event_people WHERE event_id=t.event AND profile_id=t.guest;
 PERFORM pg_temp.assert_feature(NOT EXISTS(SELECT 1 FROM event_people WHERE event_id=t.event AND profile_id=t.guest),'participant cannot withdraw');
 PERFORM set_config('request.jwt.claim.sub',t.host::text,true);
 PERFORM change_event_status(t.event,'cancelled','rollback test',0);
 PERFORM pg_temp.deny_feature(format('select change_event_status(%L,''postponed'',''stale'',0)',t.event));
 PERFORM change_event_status(t.private_event,'postponed','rollback test',0);
 PERFORM change_collaboration('project',t.project,'remove',guest_name);
 PERFORM pg_temp.assert_feature(EXISTS(SELECT 1 FROM post_projects WHERE post_id=t.work AND project_id=t.project),'removal erases contribution');
 PERFORM set_config('request.jwt.claim.sub',t.guest::text,true);
 PERFORM pg_temp.assert_feature((SELECT count(*)=1 FROM notifications WHERE post_id=t.event AND kind='event_cancelled'),'missing/duplicate cancellation notification');
 PERFORM pg_temp.assert_feature(EXISTS(SELECT 1 FROM notifications WHERE post_id=t.private_event AND kind='event_postponed'),'missing private notification');
 PERFORM pg_temp.deny_feature(format('select respond_to_event_invitation(%L,''going'')',t.event));
 DELETE FROM colectivo_members WHERE colectivo_id=t.collective AND user_id=t.guest;
 PERFORM pg_temp.assert_feature(NOT EXISTS(SELECT 1 FROM notifications WHERE post_id=t.private_event),'notification survives audience removal');
 PERFORM unlink_project_entry(t.project,t.work);
 PERFORM pg_temp.assert_feature(EXISTS(SELECT 1 FROM posts WHERE id=t.work),'withdrawal deletes original');
 PERFORM set_config('request.jwt.claim.sub',t.host::text,true);
 q:=publish_question('rollback anonymous question',null,true,t.request);
 UPDATE staging_feature_ids SET question=q;
 PERFORM pg_temp.assert_feature(q=publish_question('rollback anonymous question',null,true,t.request),'question retry duplicates');
 PERFORM pg_temp.assert_feature(owns_question(q),'author ownership missing');
 PERFORM pg_temp.deny_feature('select * from question_owners');
 PERFORM pg_temp.deny_feature('select * from question_blocks');
 PERFORM set_config('request.jwt.claim.sub',t.guest::text,true);
 PERFORM pg_temp.assert_feature((SELECT author_id IS NULL FROM posts WHERE id=q),'anonymous author leaked or question not readable');
 PERFORM pg_temp.assert_feature(NOT owns_question(q),'outsider ownership leak');
 PERFORM pg_temp.deny_feature(format('select delete_my_question(%L)',q));
 PERFORM pg_temp.deny_feature(format('select question_author_for_moderation(%L)',q));
 INSERT INTO comments(post_id,author_id,body) VALUES(q,t.guest,'signed rollback reply');
 PERFORM pg_temp.assert_feature(NOT EXISTS(SELECT 1 FROM notifications WHERE post_id=q),'reply reveals private recipient');
 PERFORM set_config('request.jwt.claim.sub',t.host::text,true);
 PERFORM pg_temp.assert_feature((SELECT count(*)=1 FROM notifications WHERE post_id=q AND kind='comment'),'anonymous reply notification missing');
 PERFORM set_config('request.jwt.claim.sub',t.guest::text,true);
 PERFORM block_question_author(q);
 PERFORM pg_temp.assert_feature(NOT EXISTS(SELECT 1 FROM posts WHERE id=q),'question block ignored');
 PERFORM clear_question_blocks();
 PERFORM pg_temp.assert_feature(EXISTS(SELECT 1 FROM posts WHERE id=q),'question block reset failed');
 PERFORM set_config('request.jwt.claim.sub',t.host::text,true);
 PERFORM delete_my_question(q);
 PERFORM pg_temp.deny_feature(format('select publish_question(''retry'',null,true,%L)',t.request));
 PERFORM publish_question('second rollback question',null,false,gen_random_uuid());
 PERFORM publish_question('third rollback question',null,true,gen_random_uuid());
 PERFORM pg_temp.deny_feature('select publish_question(''quota'',null,true,gen_random_uuid())');
END $$;
RESET ROLE;
SELECT 'PASS: staging role isolation, collaboration, event notifications and anonymous question privacy; fixtures rolled back' AS result;
ROLLBACK;
