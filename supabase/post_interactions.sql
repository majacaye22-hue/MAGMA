-- Per-user post appreciation. Run once in each Supabase environment.

CREATE TABLE IF NOT EXISTS public.post_appreciations (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_appreciations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_appreciations: owner read" ON public.post_appreciations;
DROP POLICY IF EXISTS "post_appreciations: owner insert" ON public.post_appreciations;
DROP POLICY IF EXISTS "post_appreciations: owner delete" ON public.post_appreciations;

CREATE POLICY "post_appreciations: owner read"
  ON public.post_appreciations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "post_appreciations: owner insert"
  ON public.post_appreciations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_appreciations: owner delete"
  ON public.post_appreciations FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_post_appreciation_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE posts SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS post_appreciations_count_insert ON public.post_appreciations;
DROP TRIGGER IF EXISTS post_appreciations_count_delete ON public.post_appreciations;

CREATE TRIGGER post_appreciations_count_insert
  AFTER INSERT ON public.post_appreciations
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_appreciation_count();

CREATE TRIGGER post_appreciations_count_delete
  AFTER DELETE ON public.post_appreciations
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_appreciation_count();
