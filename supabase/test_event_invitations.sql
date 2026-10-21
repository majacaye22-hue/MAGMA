-- Admin connection, one transaction; fixtures and test changes always roll back.
BEGIN;
CREATE TEMP TABLE ei_test AS SELECT gen_random_uuid() host,gen_random_uuid() guest,
 gen_random_uuid() outsider,gen_random_uuid() event,gen_random_uuid() private_event,
 gen_random_uuid() collective;
GRANT SELECT ON ei_test TO authenticated;
CREATE FUNCTION pg_temp.ei_assert(ok boolean) RETURNS void LANGUAGE plpgsql AS $$
 BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'event invitation assertion failed'; END IF; END $$;
CREATE FUNCTION pg_temp.ei_denied(stmt text) RETURNS void LANGUAGE plpgsql AS $$
 BEGIN BEGIN EXECUTE stmt; EXCEPTION WHEN OTHERS THEN RETURN; END; RAISE EXCEPTION 'unexpected success: %',stmt; END $$;
DO $$ DECLARE t record; uid uuid; BEGIN
 SELECT * INTO t FROM ei_test;
 FOREACH uid IN ARRAY ARRAY[t.host,t.guest,t.outsider] LOOP
 INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES(uid,uid::text||'@event-invitation-test.invalid','{"magma_onboarding_version":"2026-10-20.v1"}');
 INSERT INTO public.profiles(id,username) VALUES(uid,'ei_'||replace(uid::text,'-',''))
 ON CONFLICT(id) DO UPDATE SET username=excluded.username;
 END LOOP;
 INSERT INTO public.colectivos(id,created_by,name,slug,is_private) VALUES(t.collective,t.host,'invitation test',t.collective::text,true);
 INSERT INTO public.colectivo_members(colectivo_id,user_id) VALUES(t.collective,t.host),(t.collective,t.guest);
 INSERT INTO public.posts(id,author_id,type,title,event_date,moderation_status,audience_colectivo_id) VALUES
 (t.event,t.host,'evento','invitation test',now()+interval '1 day','approved',NULL),
 (t.private_event,t.host,'evento','private invitation',now()+interval '1 day','approved',t.collective);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE t record; guest_name text; stranger text; BEGIN
 SELECT * INTO t FROM ei_test;
 PERFORM set_config('request.jwt.claim.sub',t.host::text,true);
 SELECT username INTO guest_name FROM profiles WHERE id=t.guest;
 SELECT username INTO stranger FROM profiles WHERE id=t.outsider;
 PERFORM public.invite_to_event(t.event,ARRAY[guest_name]);
 PERFORM public.invite_to_event(t.event,ARRAY[guest_name,guest_name]);
 PERFORM pg_temp.ei_assert((SELECT count(*)=1 FROM event_invitations WHERE event_id=t.event));
 PERFORM public.invite_to_event(t.private_event,ARRAY[guest_name]);
 PERFORM pg_temp.ei_denied(format('SELECT public.invite_to_event(%L,ARRAY[%L])',t.private_event,stranger));
 PERFORM pg_temp.ei_denied(format('SELECT public.respond_to_event_invitation(%L,''going'')',t.event));
 PERFORM set_config('request.jwt.claim.sub',t.outsider::text,true);
 PERFORM pg_temp.ei_assert((SELECT count(*)=0 FROM event_invitations WHERE event_id IN (t.event,t.private_event)));
 PERFORM pg_temp.ei_denied(format('SELECT public.invite_to_event(%L,ARRAY[%L])',t.event,guest_name));
 PERFORM pg_temp.ei_denied(format('SELECT public.respond_to_event_invitation(%L,''going'')',t.event));
 PERFORM pg_temp.ei_denied(format('INSERT INTO event_invitations(event_id,recipient_id) VALUES(%L,%L)',t.event,t.outsider));
 PERFORM set_config('request.jwt.claim.sub',t.guest::text,true);
 PERFORM pg_temp.ei_assert((SELECT count(*)=2 FROM event_invitations WHERE event_id IN (t.event,t.private_event)));
 PERFORM public.respond_to_event_invitation(t.event,'going');
 PERFORM public.respond_to_event_invitation(t.event,'maybe');
 PERFORM pg_temp.ei_assert((SELECT response='maybe' FROM event_invitations WHERE event_id=t.event));
 PERFORM pg_temp.ei_denied(format('SELECT public.respond_to_event_invitation(%L,''invalid'')',t.event));
 PERFORM pg_temp.ei_denied(format('UPDATE event_invitations SET response=''going'' WHERE event_id=%L',t.event));
 PERFORM set_config('request.jwt.claim.sub',t.host::text,true);
 PERFORM public.invite_to_event(t.event,ARRAY[guest_name]);
 PERFORM pg_temp.ei_assert((SELECT response='maybe' FROM event_invitations WHERE event_id=t.event));
END $$;
-- Add block as admin: blocked_users correctly prevents impersonating the guest.
RESET ROLE;
INSERT INTO blocked_users(blocker_id,blocked_id) SELECT guest,host FROM ei_test ON CONFLICT DO NOTHING;
SET LOCAL ROLE authenticated;
DO $$ DECLARE t record; BEGIN
 SELECT * INTO t FROM ei_test;
 PERFORM set_config('request.jwt.claim.sub',t.guest::text,true);
 PERFORM pg_temp.ei_assert((SELECT count(*)=0 FROM event_invitations WHERE event_id=t.event));
 PERFORM pg_temp.ei_denied(format('SELECT public.respond_to_event_invitation(%L,''going'')',t.event));
END $$;
RESET ROLE;
DELETE FROM blocked_users WHERE (blocker_id,blocked_id) IN (SELECT guest,host FROM ei_test);
DELETE FROM colectivo_members WHERE (colectivo_id,user_id) IN (SELECT collective,guest FROM ei_test);
UPDATE posts SET event_date=now()-interval '1 day' WHERE id IN (SELECT event FROM ei_test);
SET LOCAL ROLE authenticated;
DO $$ DECLARE t record; BEGIN
 SELECT * INTO t FROM ei_test;
 PERFORM set_config('request.jwt.claim.sub',t.guest::text,true);
 PERFORM pg_temp.ei_assert((SELECT count(*)=0 FROM event_invitations WHERE event_id=t.private_event));
 PERFORM pg_temp.ei_denied(format('SELECT public.respond_to_event_invitation(%L,''going'')',t.private_event));
 PERFORM pg_temp.ei_denied(format('SELECT public.respond_to_event_invitation(%L,''going'')',t.event));
END $$;
RESET ROLE;
UPDATE posts SET is_hidden=true WHERE id IN (SELECT event FROM ei_test);
SET LOCAL ROLE authenticated;
SELECT pg_temp.ei_assert(NOT EXISTS(SELECT 1 FROM event_invitations WHERE event_id IN (SELECT event FROM ei_test)));
RESET ROLE;
SELECT 'event invitation permission checks passed; fixtures rolled back' AS result;
ROLLBACK;
