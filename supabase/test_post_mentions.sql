-- Run after post_mentions.sql in staging. All fixtures roll back.
BEGIN;
DO $$
DECLARE actor uuid; recipient uuid; actor_name text; recipient_name text;
 p uuid := gen_random_uuid(); n integer;
BEGIN
 SELECT id, username INTO actor, actor_name FROM public.profiles WHERE is_moderator AND username IS NOT NULL LIMIT 1;
 SELECT id, username INTO recipient, recipient_name FROM public.profiles
 WHERE id <> actor AND username IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.blocked_users b WHERE
   (b.blocker_id=actor AND b.blocked_id=profiles.id) OR (b.blocker_id=profiles.id AND b.blocked_id=actor)) LIMIT 1;
 IF actor IS NULL OR recipient IS NULL THEN RAISE EXCEPTION 'need moderator and unblocked recipient fixtures'; END IF;
 PERFORM set_config('request.jwt.claim.sub', actor::text, true);
 INSERT INTO public.posts(id, author_id, type, title, body, moderation_status, is_hidden)
 VALUES(p,actor,'escrito','mention rollback test','@' || recipient_name || ' @' || recipient_name || ' @' || actor_name,'pending',false);
 IF EXISTS(SELECT 1 FROM public.notifications WHERE post_id=p) THEN RAISE EXCEPTION 'pending post notified'; END IF;
 UPDATE public.posts SET moderation_status='approved' WHERE id=p;
 SELECT count(*) INTO n FROM public.notifications WHERE post_id=p AND kind='mention';
 IF n<>1 THEN RAISE EXCEPTION 'delivery/deduplication/self exclusion failed: %', n; END IF;
 UPDATE public.posts SET body=body || ' edit' WHERE id=p;
 UPDATE public.posts SET body='' WHERE id=p;
 UPDATE public.posts SET content='<p><a href="/profile/' || recipient_name || '">@' || recipient_name || '</a></p>' WHERE id=p;
 IF (SELECT count(*) FROM public.notifications WHERE post_id=p AND kind='mention')<>1 THEN RAISE EXCEPTION 'edit repeated notification'; END IF;
 SET LOCAL ROLE authenticated;
 IF EXISTS(SELECT 1 FROM public.notifications WHERE post_id=p) THEN RAISE EXCEPTION 'actor read recipient notification'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub', recipient::text, true);
 SET LOCAL ROLE authenticated;
 IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE post_id=p AND kind='mention') THEN RAISE EXCEPTION 'recipient cannot read'; END IF;
 UPDATE public.notifications SET read_at=now() WHERE post_id=p;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub', actor::text, true);
 UPDATE public.posts SET is_hidden=true WHERE id=p;
 PERFORM set_config('request.jwt.claim.sub', recipient::text, true);
 SET LOCAL ROLE authenticated;
 IF EXISTS(SELECT 1 FROM public.notifications WHERE post_id=p) THEN RAISE EXCEPTION 'hidden post leaked'; END IF;
 RESET ROLE;
END; $$;
ROLLBACK;
SELECT 'PASS: delivery, duplicates, self exclusion, pending/hidden visibility, recipient isolation; all fixtures rolled back' AS result;
