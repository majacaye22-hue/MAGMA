-- Apply after moderation and messaging migrations. New activity only.
BEGIN;
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('comment', 'conversation', 'message')),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (recipient_id <> actor_id),
  UNIQUE(recipient_id, comment_id),
  UNIQUE(recipient_id, message_id)
);
CREATE INDEX notifications_recipient_recent ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX notifications_unread ON public.notifications(recipient_id) WHERE read_at IS NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE(read_at) ON public.notifications TO authenticated;
CREATE POLICY "notification recipient read" ON public.notifications FOR SELECT TO authenticated USING (
  recipient_id = auth.uid()
  AND NOT EXISTS (SELECT 1 FROM public.blocked_users b WHERE
    (b.blocker_id = recipient_id AND b.blocked_id = actor_id) OR
    (b.blocker_id = actor_id AND b.blocked_id = recipient_id))
  AND ((comment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.comments c JOIN public.posts p ON p.id = c.post_id
    WHERE c.id = comment_id AND NOT c.is_hidden AND NOT p.is_hidden AND p.moderation_status = 'approved'
  )) OR (message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND auth.uid() IN (c.participant_1, c.participant_2)
  )))
);
CREATE POLICY "notification recipient mark read" ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE FUNCTION public.notify_post_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_hidden THEN RETURN NEW; END IF;
  INSERT INTO public.notifications(recipient_id, actor_id, kind, post_id, comment_id)
  SELECT recipients.id, NEW.author_id,
    CASE WHEN recipients.id = p.author_id THEN 'comment' ELSE 'conversation' END,
    p.id, NEW.id
  FROM public.posts p CROSS JOIN LATERAL (
    SELECT p.author_id AS id UNION
    SELECT c.author_id FROM public.comments c WHERE c.post_id = p.id AND NOT c.is_hidden
  ) recipients
  WHERE p.id = NEW.post_id AND NOT p.is_hidden AND p.moderation_status = 'approved'
    AND recipients.id <> NEW.author_id
    AND NOT EXISTS (SELECT 1 FROM public.blocked_users b WHERE
      (b.blocker_id = recipients.id AND b.blocked_id = NEW.author_id) OR
      (b.blocker_id = NEW.author_id AND b.blocked_id = recipients.id))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_post_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();

CREATE FUNCTION public.notify_direct_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(recipient_id, actor_id, kind, message_id, conversation_id)
  SELECT CASE WHEN c.participant_1 = NEW.sender_id THEN c.participant_2 ELSE c.participant_1 END,
    NEW.sender_id, 'message', NEW.id, c.id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id AND NEW.sender_id IN (c.participant_1, c.participant_2)
    AND c.participant_1 <> c.participant_2
    AND NOT EXISTS (SELECT 1 FROM public.blocked_users b WHERE
      (b.blocker_id = c.participant_1 AND b.blocked_id = c.participant_2) OR
      (b.blocker_id = c.participant_2 AND b.blocked_id = c.participant_1))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_direct_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_direct_message();
REVOKE ALL ON FUNCTION public.notify_post_comment(), public.notify_direct_message() FROM PUBLIC;
NOTIFY pgrst, 'reload schema';
COMMIT;
