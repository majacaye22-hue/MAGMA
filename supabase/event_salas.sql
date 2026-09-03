-- Event Salas — apply in the Supabase SQL editor before deploying the UI.
-- Every event post gets a room automatically. Messages are writable from
-- 48 hours before the event until 72 hours after it begins, then remain readable
-- as a small archive of the gathering.

CREATE TABLE IF NOT EXISTS event_sala_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 600),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_sala_messages_event_created_at_idx
  ON event_sala_messages (event_id, created_at);

-- A small, database-enforced anti-flood limit. Client-side cooldowns are only
-- a courtesy; this is the actual protection.
CREATE OR REPLACE FUNCTION public.can_send_event_sala_message(target_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) < 12
  FROM public.event_sala_messages
  WHERE event_id = target_event_id
    AND user_id = auth.uid()
    AND created_at > now() - interval '1 minute';
$$;

-- blocked_users is private, so this helper deliberately runs as the database
-- owner while still reading the currently authenticated user from the JWT.
CREATE OR REPLACE FUNCTION public.event_sala_users_are_blocked(other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_users b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = other_user_id)
       OR (b.blocker_id = other_user_id AND b.blocked_id = auth.uid())
  );
$$;

ALTER TABLE event_sala_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_sala_messages: authenticated read, block aware"
  ON event_sala_messages FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND NOT public.event_sala_users_are_blocked(event_sala_messages.user_id)
  );

CREATE POLICY "event_sala_messages: active window insert, block aware"
  ON event_sala_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_send_event_sala_message(event_id)
    AND EXISTS (
      SELECT 1
      FROM posts p
      WHERE p.id = event_sala_messages.event_id
        AND p.type = 'evento'
        AND p.event_date IS NOT NULL
        AND now() >= p.event_date - interval '48 hours'
        AND now() <= p.event_date + interval '72 hours'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'event_sala_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE event_sala_messages;
  END IF;
END;
$$;

CREATE POLICY "event_sala_messages: sender, host, or moderator delete"
  ON event_sala_messages FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = event_sala_messages.event_id
        AND p.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_moderator = true
    )
  );
