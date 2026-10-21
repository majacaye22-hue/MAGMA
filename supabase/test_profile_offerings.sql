-- Run on staging after profile_offerings.sql. All fixtures roll back.
BEGIN;
CREATE TEMP TABLE offering_test_context AS
SELECT id AS owner_id, (SELECT id FROM public.profiles ORDER BY id DESC LIMIT 1) AS other_id
FROM public.profiles ORDER BY id LIMIT 1;
GRANT SELECT ON offering_test_context TO authenticated;
SELECT set_config('request.jwt.claim.sub', owner_id::text, true) FROM offering_test_context;
SET LOCAL ROLE authenticated;
DO $$
DECLARE offer_id uuid; affected integer;
BEGIN
  INSERT INTO public.profile_offerings(profile_id,title,description,modes)
  VALUES(auth.uid(),'__portfolio_test__','test fixture', ARRAY['intercambio']) RETURNING id INTO offer_id;
  UPDATE public.profile_offerings SET title='__portfolio_edited__' WHERE id=offer_id;
  IF NOT EXISTS(SELECT 1 FROM public.profile_offerings WHERE id=offer_id AND title='__portfolio_edited__') THEN RAISE EXCEPTION 'owner edit failed'; END IF;
  BEGIN
    UPDATE public.profile_offerings SET profile_id=(SELECT other_id FROM offering_test_context) WHERE id=offer_id;
    RAISE EXCEPTION 'ownership transfer allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.profile_offerings(profile_id,title,description) VALUES(auth.uid(),'','bad');
    RAISE EXCEPTION 'empty title allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',(SELECT other_id::text FROM offering_test_context),true);
  UPDATE public.profile_offerings SET title='forbidden' WHERE id=offer_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'other member edited entry'; END IF;
  DELETE FROM public.profile_offerings WHERE id=offer_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'other member deleted entry'; END IF;
  BEGIN
    INSERT INTO public.profile_offerings(profile_id,title,description) VALUES((SELECT owner_id FROM offering_test_context),'forbidden','bad');
    RAISE EXCEPTION 'other member inserted entry';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',(SELECT owner_id::text FROM offering_test_context),true);
  DELETE FROM public.profile_offerings WHERE id=offer_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'owner delete failed'; END IF;
END $$;
RESET ROLE;
SELECT 'portfolio ownership and validation checks passed; fixtures rolled back' AS result;
ROLLBACK;
