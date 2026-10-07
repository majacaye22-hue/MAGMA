-- Post review queue. Existing posts remain visible; new and substantively
-- edited posts require moderator approval.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS moderation_status text,
  ADD COLUMN IF NOT EXISTS moderation_note text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.posts SET moderation_status = 'approved' WHERE moderation_status IS NULL;

ALTER TABLE public.posts
  ALTER COLUMN moderation_status SET DEFAULT 'pending',
  ALTER COLUMN moderation_status SET NOT NULL;

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_moderation_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_moderation_status_check
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS posts_moderation_queue_idx
  ON public.posts (moderation_status, created_at)
  WHERE moderation_status = 'pending';

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_actions_post_created_idx
  ON public.moderation_actions (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_actions_moderator_created_idx
  ON public.moderation_actions (moderator_id, created_at DESC);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moderation actions: author or moderator read" ON public.moderation_actions;
CREATE POLICY "moderation actions: author or moderator read"
  ON public.moderation_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = moderation_actions.post_id
        AND posts.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_moderator = true
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_post_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_moderator boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_moderator = true
  ) INTO actor_is_moderator;

  IF actor_is_moderator THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_note := NULL;
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    RETURN NEW;
  END IF;

  IF ROW(NEW.title, NEW.body, NEW.content, NEW.type, NEW.media_url,
         NEW.media_base64, NEW.cover_url, NEW.tags, NEW.event_date,
         NEW.venue, NEW.address, NEW.open_collab, NEW.collab_description,
         NEW.is_sensitive)
     IS DISTINCT FROM
     ROW(OLD.title, OLD.body, OLD.content, OLD.type, OLD.media_url,
         OLD.media_base64, OLD.cover_url, OLD.tags, OLD.event_date,
         OLD.venue, OLD.address, OLD.open_collab, OLD.collab_description,
         OLD.is_sensitive) THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_note := NULL;
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
  ELSE
    NEW.moderation_status := OLD.moderation_status;
    NEW.moderation_note := OLD.moderation_note;
    NEW.moderated_at := OLD.moderated_at;
    NEW.moderated_by := OLD.moderated_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_enforce_moderation ON public.posts;
CREATE TRIGGER posts_enforce_moderation
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_post_moderation();

CREATE OR REPLACE FUNCTION public.review_post(
  p_post_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_moderator = true
  ) THEN
    RAISE EXCEPTION 'moderator access required';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid moderation status';
  END IF;

  UPDATE public.posts
  SET moderation_status = p_status,
      moderation_note = NULLIF(trim(p_note), ''),
      moderated_at = now(),
      moderated_by = auth.uid()
  WHERE id = p_post_id AND moderation_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending post not found';
  END IF;

  INSERT INTO public.moderation_actions (post_id, moderator_id, action, note)
  VALUES (p_post_id, auth.uid(), p_status, NULLIF(trim(p_note), ''));
END;
$$;

REVOKE ALL ON FUNCTION public.review_post(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_post(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS "posts: community read, owner and cuidadorx hidden read" ON public.posts;
DROP POLICY IF EXISTS "posts: public read" ON public.posts;
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
CREATE POLICY "posts: community read, owner and cuidadorx hidden read"
  ON public.posts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      (is_hidden = false AND moderation_status = 'approved')
      OR author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_moderator = true
      )
    )
  );

NOTIFY pgrst, 'reload schema';
