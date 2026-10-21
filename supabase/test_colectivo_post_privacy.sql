-- Staging only. No lasting fixtures or membership changes.
BEGIN;
DO $$
DECLARE owner_id uuid; outsider uuid; moderator uuid; cid uuid := gen_random_uuid();
 private_id uuid := gen_random_uuid(); public_id uuid := gen_random_uuid();
BEGIN
 SELECT id INTO owner_id FROM public.profiles WHERE username='magma_prueba01';
 SELECT id INTO outsider FROM public.profiles WHERE username='magma_prueba02';
 SELECT id INTO moderator FROM public.profiles WHERE is_moderator LIMIT 1;
 IF owner_id IS NULL OR outsider IS NULL OR moderator IS NULL THEN RAISE EXCEPTION 'fixtures missing'; END IF;
 PERFORM set_config('request.jwt.claim.sub',moderator::text,true);
 INSERT INTO public.colectivos(id,name,slug,created_by) VALUES(cid,'privacy rollback test','privacy-'||cid,owner_id);
 INSERT INTO public.posts(id,author_id,type,title,audience_colectivo_id,moderation_status)
 VALUES(private_id,owner_id,'escrito','private fixture',cid,'approved'),(public_id,owner_id,'escrito','public fixture',NULL,'approved');
 INSERT INTO public.colectivo_posts(colectivo_id,post_id,added_by) VALUES(cid,public_id,owner_id);
 INSERT INTO public.comments(post_id,author_id,body) VALUES(private_id,owner_id,'private comment');
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 SET LOCAL ROLE authenticated;
 IF NOT EXISTS(SELECT 1 FROM public.posts WHERE id=private_id) THEN RAISE EXCEPTION 'member blocked'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.colectivo_posts WHERE post_id=private_id) THEN RAISE EXCEPTION 'atomic link missing'; END IF;
 BEGIN
   UPDATE public.posts SET audience_colectivo_id=NULL WHERE id=private_id;
   RAISE EXCEPTION 'audience change allowed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Post audience cannot be changed' THEN RAISE; END IF;
 END;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
 SET LOCAL ROLE authenticated;
 IF EXISTS(SELECT 1 FROM public.posts WHERE id=private_id) THEN RAISE EXCEPTION 'private post leaked'; END IF;
 IF EXISTS(SELECT 1 FROM public.comments WHERE post_id=private_id) THEN RAISE EXCEPTION 'comment leaked'; END IF;
 IF EXISTS(SELECT 1 FROM public.colectivo_posts WHERE colectivo_id=cid) THEN RAISE EXCEPTION 'membership links leaked'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.posts WHERE id=public_id) THEN RAISE EXCEPTION 'public share hidden'; END IF;
 BEGIN
   INSERT INTO public.posts(author_id,type,audience_colectivo_id) VALUES(outsider,'escrito',cid);
   RAISE EXCEPTION 'outsider created private post';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 RESET ROLE;
END $$;
ROLLBACK;
SELECT 'PASS: member read, nonmember denial, comments, atomic links, immutable audience, public shares; fixtures rolled back' AS result;
