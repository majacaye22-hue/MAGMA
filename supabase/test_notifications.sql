BEGIN;
DO $$
DECLARE p uuid; owner_id uuid; actor uuid; cid uuid := gen_random_uuid(); mid uuid := gen_random_uuid(); conv uuid; n integer;
BEGIN
SELECT id,author_id INTO p,owner_id FROM public.posts WHERE moderation_status='approved' AND NOT is_hidden LIMIT 1;
SELECT id INTO actor FROM public.profiles WHERE id<>owner_id AND NOT is_moderator LIMIT 1;
IF actor IS NULL OR p IS NULL THEN RAISE EXCEPTION 'missing fixtures'; END IF;
INSERT INTO public.comments(id,post_id,author_id,body) VALUES(cid,p,actor,'notification rollback test');
SELECT count(*) INTO n FROM public.notifications WHERE comment_id=cid AND recipient_id=owner_id;
IF n<>1 THEN RAISE EXCEPTION 'comment delivery failed'; END IF;
IF EXISTS(SELECT 1 FROM public.notifications WHERE comment_id=cid AND recipient_id=actor) THEN RAISE EXCEPTION 'self notification'; END IF;
PERFORM set_config('request.jwt.claim.sub',actor::text,true);
SET LOCAL ROLE authenticated;
IF EXISTS(SELECT 1 FROM public.notifications WHERE comment_id=cid) THEN RAISE EXCEPTION 'recipient isolation failed'; END IF;
RESET ROLE;
PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
SET LOCAL ROLE authenticated;
SELECT count(*) INTO n FROM public.notifications WHERE comment_id=cid;
IF n<>1 THEN RAISE EXCEPTION 'owner cannot read'; END IF;
UPDATE public.notifications SET read_at=now() WHERE comment_id=cid;
IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE comment_id=cid AND read_at IS NOT NULL) THEN RAISE EXCEPTION 'read persistence failed'; END IF;
BEGIN
UPDATE public.notifications SET kind='message' WHERE comment_id=cid;
RAISE EXCEPTION 'client altered protected fields';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
RESET ROLE;
SELECT id INTO conv FROM public.conversations WHERE (participant_1=owner_id AND participant_2=actor) OR (participant_2=owner_id AND participant_1=actor) LIMIT 1;
IF conv IS NULL THEN
INSERT INTO public.conversations(participant_1,participant_2) VALUES(owner_id,actor) RETURNING id INTO conv;
END IF;
INSERT INTO public.messages(id,conversation_id,sender_id,body) VALUES(mid,conv,actor,'notification rollback test');
SELECT count(*) INTO n FROM public.notifications WHERE message_id=mid AND recipient_id=owner_id;
IF n<>1 THEN RAISE EXCEPTION 'message delivery failed'; END IF;
DELETE FROM public.comments WHERE id=cid;
IF EXISTS(SELECT 1 FROM public.notifications WHERE comment_id=cid) THEN RAISE EXCEPTION 'delete cleanup failed'; END IF;
END; $$;
ROLLBACK;
SELECT 'notification delivery, no-self, RLS isolation, mark-read, protected columns, direct message and delete cleanup passed; all test data rolled back' AS result;
