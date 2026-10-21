-- Staging regression checks. All changes are rolled back.
BEGIN;
DO $$
DECLARE source uuid; creator uuid; viewer uuid;
BEGIN
  SELECT id,author_id INTO source,creator FROM public.posts
  WHERE audience_colectivo_id IS NULL AND moderation_status='approved'
    AND NOT COALESCE(is_hidden,false) LIMIT 1;
  SELECT id INTO viewer FROM public.profiles WHERE id<>creator LIMIT 1;
  IF source IS NULL OR viewer IS NULL THEN RAISE EXCEPTION 'Need a public post and two profiles'; END IF;
  PERFORM set_config('test.echo_post',source::text,true);
  PERFORM set_config('test.echo_viewer',viewer::text,true);
  PERFORM set_config('test.echo_creator',creator::text,true);
  PERFORM set_config('request.jwt.claim.sub',viewer::text,true);
END $$;
SET LOCAL ROLE authenticated;
INSERT INTO public.post_echoes(user_id,post_id,note)
VALUES(auth.uid(),current_setting('test.echo_post')::uuid,'rollback-only echo test');
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.post_echoes WHERE user_id=auth.uid() AND post_id=current_setting('test.echo_post')::uuid) THEN
    RAISE EXCEPTION 'Created echo not visible'; END IF;
  BEGIN
    INSERT INTO public.post_echoes(user_id,post_id) VALUES(auth.uid(),current_setting('test.echo_post')::uuid);
    RAISE EXCEPTION 'Duplicate allowed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;
-- Even a member/author of a private colectivo post cannot echo it.
DO $$ DECLARE private_id uuid; private_author uuid;
BEGIN
 SELECT id,author_id INTO private_id,private_author FROM public.posts WHERE audience_colectivo_id IS NOT NULL LIMIT 1;
 IF private_id IS NULL THEN RAISE EXCEPTION 'Need private fixture'; END IF;
 PERFORM set_config('test.private_post',private_id::text,true);
 PERFORM set_config('request.jwt.claim.sub',private_author::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.post_echoes(user_id,post_id) VALUES(auth.uid(),current_setting('test.private_post')::uuid);
  RAISE EXCEPTION 'Private echo allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('test.echo_creator'),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE removed integer;
BEGIN
 DELETE FROM public.post_echoes WHERE post_id=current_setting('test.echo_post')::uuid;
 GET DIAGNOSTICS removed=ROW_COUNT;
 IF removed<>0 THEN RAISE EXCEPTION 'Non-owner deleted echo'; END IF;
 BEGIN
  INSERT INTO public.post_echoes(user_id,post_id) VALUES(auth.uid(),current_setting('test.echo_post')::uuid);
  RAISE EXCEPTION 'Own post echo allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('test.echo_viewer'),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE removed integer;
BEGIN
 DELETE FROM public.post_echoes WHERE user_id=auth.uid() AND post_id=current_setting('test.echo_post')::uuid;
 GET DIAGNOSTICS removed=ROW_COUNT;
 IF removed<>1 THEN RAISE EXCEPTION 'Owner undo failed'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'echo permission and undo checks passed; no data persisted' AS result;
