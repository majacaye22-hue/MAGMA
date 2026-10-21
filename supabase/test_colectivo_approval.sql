-- Run on staging after colectivo_approval.sql. No test data survives.
BEGIN;
DO $$
DECLARE ids uuid[];
BEGIN
 SELECT array_agg(id) INTO ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 3) p;
 IF cardinality(ids) < 3 THEN RAISE EXCEPTION 'three profiles required'; END IF;
 PERFORM set_config('test.owner',ids[1]::text,true);
 PERFORM set_config('test.applicant',ids[2]::text,true);
 PERFORM set_config('test.outsider',ids[3]::text,true);
END $$;
INSERT INTO public.colectivos(id,name,slug,created_by)
VALUES('bda68bcc-1c19-4d6a-a036-972433773992','Approval rollback test','approval-rollback-test',current_setting('test.owner')::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.applicant'),true);
SELECT public.request_colectivo_join('bda68bcc-1c19-4d6a-a036-972433773992','test note');
SELECT public.request_colectivo_join('bda68bcc-1c19-4d6a-a036-972433773992','duplicate');
DO $$
DECLARE r uuid;
BEGIN
 SELECT id INTO r FROM public.colectivo_join_requests WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992';
 IF r IS NULL THEN RAISE EXCEPTION 'request missing'; END IF;
 PERFORM set_config('test.request',r::text,true);
 IF (SELECT count(*) FROM public.colectivo_join_requests WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992') <> 1 THEN RAISE EXCEPTION 'duplicate request'; END IF;
 IF EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992') THEN RAISE EXCEPTION 'premature membership'; END IF;
 BEGIN
 INSERT INTO public.colectivo_members(colectivo_id,user_id,role) VALUES('bda68bcc-1c19-4d6a-a036-972433773992',auth.uid(),'admin');
 RAISE EXCEPTION 'self admission allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 UPDATE public.colectivo_join_requests SET status='approved' WHERE id=r;
 RAISE EXCEPTION 'direct approval allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.outsider'),true);
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.colectivo_join_requests WHERE id=current_setting('test.request')::uuid) THEN RAISE EXCEPTION 'private request leaked'; END IF;
 IF EXISTS (SELECT 1 FROM public.notifications WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992') THEN RAISE EXCEPTION 'notification leaked'; END IF;
 BEGIN
 PERFORM public.review_colectivo_request(current_setting('test.request')::uuid,true);
 RAISE EXCEPTION 'outsider approval allowed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'admin required' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
-- Creator bootstrapping still works.
INSERT INTO public.colectivo_members(colectivo_id,user_id,role) VALUES('bda68bcc-1c19-4d6a-a036-972433773992',auth.uid(),'admin');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE join_request_id=current_setting('test.request')::uuid AND kind='colectivo_request') THEN RAISE EXCEPTION 'admin notification missing'; END IF;
END $$;
SELECT public.review_colectivo_request(current_setting('test.request')::uuid,true);
SELECT public.review_colectivo_request(current_setting('test.request')::uuid,true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.colectivo_members WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992' AND user_id=current_setting('test.applicant')::uuid) <> 1 THEN RAISE EXCEPTION 'membership missing or duplicated'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.applicant'),true);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE join_request_id=current_setting('test.request')::uuid AND kind='colectivo_approved') THEN RAISE EXCEPTION 'approval notification missing'; END IF;
END $$;
DELETE FROM public.colectivo_members WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992' AND user_id=auth.uid();
SELECT public.request_colectivo_join('bda68bcc-1c19-4d6a-a036-972433773992','again');
SELECT public.cancel_colectivo_request('bda68bcc-1c19-4d6a-a036-972433773992');
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.colectivo_join_requests WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992') THEN RAISE EXCEPTION 'cancel failed'; END IF;
END $$;
SELECT public.request_colectivo_join('bda68bcc-1c19-4d6a-a036-972433773992','review again');
SELECT set_config('test.request',id::text,true) FROM public.colectivo_join_requests WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992';
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
SELECT public.review_colectivo_request(current_setting('test.request')::uuid,false);
SELECT set_config('request.jwt.claim.sub',current_setting('test.applicant'),true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id='bda68bcc-1c19-4d6a-a036-972433773992' AND user_id=auth.uid()) THEN RAISE EXCEPTION 'rejection granted membership'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE join_request_id=current_setting('test.request')::uuid AND kind='colectivo_rejected') THEN RAISE EXCEPTION 'rejection notification missing'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: request, duplicate, RLS, direct bypass, approval, notifications, leave, cancel, rejection' AS result;
