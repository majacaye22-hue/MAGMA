-- Run after member_onboarding.sql. All synthetic accounts/answers roll back.
-- No email is sent and no existing member is modified.
BEGIN;
DO $$
DECLARE
  owner_id uuid;
  member_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  bypass_id uuid := gen_random_uuid();
  n integer;
BEGIN
  SELECT owner_user_id INTO STRICT owner_id FROM public.app_config;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.member_onboarding'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'RLS must be enabled';
  END IF;
  IF has_table_privilege('anon','public.member_onboarding','SELECT')
    OR has_table_privilege('authenticated','public.member_onboarding','UPDATE')
    OR has_function_privilege('authenticated','public.register_member_profile(uuid,text,text,text,text,text,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'excessive client privileges';
  END IF;
  BEGIN
    INSERT INTO auth.users(id,email) VALUES(bypass_id,bypass_id::text || '@example.invalid');
    RAISE EXCEPTION 'direct signup was not blocked';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
    (member_id,member_id::text || '@example.invalid','{"magma_onboarding_version":"2026-10-20.v1"}'),
    (other_id,other_id::text || '@example.invalid','{"magma_onboarding_version":"2026-10-20.v1"}');
  BEGIN
    UPDATE auth.users SET email_confirmed_at=now() WHERE id=member_id;
    RAISE EXCEPTION 'confirmation before answers was not blocked';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  EXECUTE 'SET LOCAL ROLE service_role';
  PERFORM public.register_member_profile(member_id,'onboard_' || replace(member_id::text,'-',''),NULL,NULL,
    'Synthetic rollback test','Create together','2026-10-20.v1','{"questions":["q1","q2"],"agreements":["care"],"privacy":"private"}');
  BEGIN
    PERFORM public.register_member_profile(other_id,'onboard_' || replace(other_id::text,'-',''),NULL,NULL,
      ' ','Create together','2026-10-20.v1','{}');
    RAISE EXCEPTION 'empty response accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=other_id) THEN RAISE EXCEPTION 'profile did not roll back'; END IF;
  UPDATE auth.users SET email_confirmed_at=now() WHERE id=member_id;
  PERFORM set_config('request.jwt.claim.sub',member_id::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.member_onboarding WHERE user_id=member_id;
  IF n<>1 THEN RAISE EXCEPTION 'member cannot read own answer'; END IF;
  BEGIN
    PERFORM public.review_member_onboarding(member_id,true);
    RAISE EXCEPTION 'member could review';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.member_onboarding SET motivation='tamper' WHERE user_id=member_id;
    RAISE EXCEPTION 'member could modify answer';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub',other_id::text,true);
  SELECT count(*) INTO n FROM public.member_onboarding WHERE user_id=member_id;
  IF n<>0 THEN RAISE EXCEPTION 'answer leaked to other user'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  SELECT count(*) INTO n FROM public.member_onboarding WHERE user_id=member_id;
  IF n<>1 THEN RAISE EXCEPTION 'owner cannot read answer'; END IF;
  PERFORM public.review_member_onboarding(member_id,true);
  IF NOT EXISTS(SELECT 1 FROM public.member_onboarding WHERE user_id=member_id AND reviewed_at IS NOT NULL AND reviewed_by=owner_id) THEN
    RAISE EXCEPTION 'owner review not saved';
  END IF;
  PERFORM public.review_member_onboarding(member_id,false);
  IF NOT EXISTS(SELECT 1 FROM public.member_onboarding WHERE user_id=member_id AND reviewed_at IS NULL AND motivation='Synthetic rollback test') THEN
    RAISE EXCEPTION 'unreview modified answer';
  END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM 1 FROM public.member_onboarding;
    RAISE EXCEPTION 'anonymous read allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
END;
$$;
SELECT 'onboarding staging permission checks passed; fixtures rolled back' AS result;
ROLLBACK;
