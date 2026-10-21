-- Apply after in_app_notifications.sql and colectivo_approval.sql.
-- New publications / edits only. No historical backfill.
BEGIN;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check CHECK
 (kind IN ('comment','conversation','message','colectivo_request','colectivo_approved','colectivo_rejected','mention'));
CREATE UNIQUE INDEX IF NOT EXISTS notification_mention_once
 ON public.notifications(recipient_id, post_id) WHERE kind = 'mention';

CREATE POLICY "mention recipient read" ON public.notifications FOR SELECT TO authenticated USING (
 kind = 'mention' AND recipient_id = auth.uid()
 AND NOT EXISTS (SELECT 1 FROM public.blocked_users b WHERE
   (b.blocker_id = recipient_id AND b.blocked_id = actor_id) OR
   (b.blocker_id = actor_id AND b.blocked_id = recipient_id))
 AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id
   AND NOT p.is_hidden AND p.moderation_status = 'approved')
);

CREATE FUNCTION public.notify_post_mentions() RETURNS trigger LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = public AS $$
DECLARE visible_text text;
BEGIN
 IF NEW.is_hidden OR NEW.moderation_status <> 'approved' OR NEW.author_id IS NULL THEN RETURN NEW; END IF;
 -- Strip markup before matching, so attributes/URLs cannot create notifications.
 visible_text := coalesce(NEW.body, '') || ' ' ||
   regexp_replace(coalesce(NEW.content, ''), '<[^>]*>', ' ', 'g');
 INSERT INTO public.notifications(recipient_id, actor_id, kind, post_id)
 SELECT DISTINCT p.id, NEW.author_id, 'mention', NEW.id
 FROM regexp_matches(visible_text, '(^|[^[:alnum:]_@/])@([a-zA-Z0-9_]{3,30})(?![[:alnum:]_@])', 'g') AS m(parts)
 JOIN public.profiles p ON lower(p.username) = lower(m.parts[2])
 WHERE p.id <> NEW.author_id
 AND NOT EXISTS (SELECT 1 FROM public.blocked_users b WHERE
   (b.blocker_id = p.id AND b.blocked_id = NEW.author_id) OR
   (b.blocker_id = NEW.author_id AND b.blocked_id = p.id))
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;
CREATE TRIGGER notify_post_mentions AFTER INSERT OR UPDATE OF body, content, moderation_status, is_hidden
 ON public.posts FOR EACH ROW EXECUTE FUNCTION public.notify_post_mentions();
REVOKE ALL ON FUNCTION public.notify_post_mentions() FROM PUBLIC;
NOTIFY pgrst, 'reload schema';
COMMIT;
