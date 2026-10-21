-- Apply before deploying the matching application changes.
-- Existing public shares stay public. Do not infer origin from colectivo_posts.
BEGIN;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS audience_colectivo_id uuid
  REFERENCES public.colectivos(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS posts_audience_colectivo_idx ON public.posts(audience_colectivo_id);

CREATE OR REPLACE FUNCTION public.is_colectivo_member(cid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.colectivos WHERE id = cid AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id = cid AND user_id = auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.is_colectivo_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_colectivo_member(uuid) TO authenticated;

CREATE POLICY "posts: colectivo audience" ON public.posts AS RESTRICTIVE FOR SELECT TO authenticated
  USING (audience_colectivo_id IS NULL OR public.is_colectivo_member(audience_colectivo_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator));
CREATE POLICY "posts: colectivo insert" ON public.posts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (audience_colectivo_id IS NULL OR public.is_colectivo_member(audience_colectivo_id));
CREATE POLICY "posts: colectivo update" ON public.posts AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (audience_colectivo_id IS NULL OR public.is_colectivo_member(audience_colectivo_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator))
  WITH CHECK (audience_colectivo_id IS NULL OR public.is_colectivo_member(audience_colectivo_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator));
CREATE POLICY "comments: visible post" ON public.comments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
CREATE POLICY "comments: visible post insert" ON public.comments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
CREATE POLICY "notifications: visible post" ON public.notifications AS RESTRICTIVE FOR SELECT TO authenticated
  USING (post_id IS NULL OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
CREATE POLICY "colectivo_posts: members read" ON public.colectivo_posts AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.is_colectivo_member(colectivo_id));

CREATE OR REPLACE FUNCTION public.protect_post_audience()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.audience_colectivo_id IS DISTINCT FROM OLD.audience_colectivo_id
    AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Post audience cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_post_audience BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_post_audience();

-- The post and its colectivo link are committed together, never briefly public.
CREATE OR REPLACE FUNCTION public.attach_private_colectivo_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.audience_colectivo_id IS NOT NULL THEN
    INSERT INTO public.colectivo_posts(colectivo_id, post_id, added_by)
      VALUES (NEW.audience_colectivo_id, NEW.id, NEW.author_id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.attach_private_colectivo_post() FROM PUBLIC;
CREATE TRIGGER attach_private_colectivo_post AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.attach_private_colectivo_post();

-- A private post cannot be re-shared into a different audience.
CREATE POLICY "colectivo_posts: same audience" ON public.colectivo_posts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id
    AND (p.audience_colectivo_id IS NULL OR p.audience_colectivo_id = colectivo_id)));

-- New protected files use a separate bucket; existing public media stays untouched.
INSERT INTO storage.buckets(id, name, public) VALUES ('colectivo-media', 'colectivo-media', false)
  ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'colectivo-media' AND public) THEN
    RAISE EXCEPTION 'colectivo-media must be private';
  END IF;
END $$;
COMMIT;
