-- Per-post comment controls. Apply to staging first, then production.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "comments: authenticated insert" ON public.comments;

CREATE POLICY "comments: authenticated insert"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1
      FROM public.posts
      WHERE posts.id = comments.post_id
        AND posts.comments_enabled = true
    )
  );

NOTIFY pgrst, 'reload schema';
