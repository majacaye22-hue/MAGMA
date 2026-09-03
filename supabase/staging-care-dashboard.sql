-- Staging only: reversible review queue for cuidadorxs de la casa.
-- Hidden items remain visible to their author and to moderators.

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "posts: public read" ON public.posts;
CREATE POLICY "posts: community read, owner and cuidadorx hidden read"
  ON public.posts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_hidden = false
      OR author_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true)
    )
  );

DROP POLICY IF EXISTS "comments: public read" ON public.comments;
CREATE POLICY "comments: community read, owner and cuidadorx hidden read"
  ON public.comments FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_hidden = false
      OR author_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true)
    )
  );

CREATE POLICY "posts: cuidadorx update"
  ON public.posts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true));

CREATE POLICY "comments: cuidadorx update"
  ON public.comments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true));

CREATE POLICY "reports: cuidadorx update"
  ON public.reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true));

DROP POLICY IF EXISTS "posts: owner update" ON public.posts;
CREATE POLICY "posts: owner update"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id AND is_hidden = false)
  WITH CHECK (auth.uid() = author_id AND is_hidden = false);

DROP POLICY IF EXISTS "comments: owner update" ON public.comments;
CREATE POLICY "comments: owner update"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id AND is_hidden = false)
  WITH CHECK (auth.uid() = author_id AND is_hidden = false);
