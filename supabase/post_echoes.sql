-- Ecos reference the original; no duplicated content or independent reactions.
BEGIN;
CREATE TABLE public.post_echoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);
CREATE INDEX post_echoes_profile_date ON public.post_echoes(user_id, created_at DESC);
ALTER TABLE public.post_echoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.post_echoes TO authenticated;
REVOKE UPDATE ON public.post_echoes FROM authenticated;
REVOKE ALL ON public.post_echoes FROM anon;
-- The posts subquery also obeys the viewer's existing RLS policies.
CREATE POLICY "echoes: visible originals" ON public.post_echoes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id
  AND p.audience_colectivo_id IS NULL AND p.moderation_status = 'approved' AND NOT COALESCE(p.is_hidden,false)));
CREATE POLICY "echoes: own public originals" ON public.post_echoes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id
  AND p.author_id <> auth.uid() AND p.audience_colectivo_id IS NULL
  AND p.moderation_status = 'approved' AND NOT COALESCE(p.is_hidden,false)));
CREATE POLICY "echoes: undo own" ON public.post_echoes FOR DELETE TO authenticated USING (user_id = auth.uid());
COMMIT;
