-- Staging only: an attendance record and optional post-event reflection.
-- Notes are private by default; authors can explicitly share them with the house.

CREATE TABLE IF NOT EXISTS public.event_attendances (
  event_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.event_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_notes_user_created_at_idx
  ON public.event_notes (user_id, created_at DESC);

ALTER TABLE public.event_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event attendances: owner read"
  ON public.event_attendances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "event attendances: owner insert"
  ON public.event_attendances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event attendances: owner delete"
  ON public.event_attendances FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "event notes: owner or public read"
  ON public.event_notes FOR SELECT
  USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR is_public = true));

CREATE POLICY "event notes: owner insert"
  ON public.event_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event notes: owner update"
  ON public.event_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event notes: owner delete"
  ON public.event_notes FOR DELETE
  USING (auth.uid() = user_id);
