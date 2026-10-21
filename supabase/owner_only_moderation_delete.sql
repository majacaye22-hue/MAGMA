-- Apply after moderator_team.sql. Limits moderation deletion; authors retain self-deletion.
BEGIN;
-- Prevent moderators from reassigning someone else's work to themselves to
-- bypass the author self-deletion exception. No app workflow transfers authorship.
CREATE OR REPLACE FUNCTION public.guard_content_authorship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'content authorship cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_content_authorship ON public.posts;
CREATE TRIGGER guard_content_authorship BEFORE UPDATE OF author_id ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.guard_content_authorship();
DROP TRIGGER IF EXISTS guard_content_authorship ON public.comments;
CREATE TRIGGER guard_content_authorship BEFORE UPDATE OF author_id ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.guard_content_authorship();
DROP POLICY IF EXISTS owner_only_moderation_delete ON public.posts;
CREATE POLICY owner_only_moderation_delete ON public.posts AS RESTRICTIVE FOR DELETE TO authenticated
USING (author_id = auth.uid() OR auth.uid() = (SELECT owner_user_id FROM public.app_config LIMIT 1));
DROP POLICY IF EXISTS owner_only_moderation_delete ON public.comments;
CREATE POLICY owner_only_moderation_delete ON public.comments AS RESTRICTIVE FOR DELETE TO authenticated
USING (author_id = auth.uid() OR auth.uid() = (SELECT owner_user_id FROM public.app_config LIMIT 1));
CREATE OR REPLACE FUNCTION public.moderate_report(p_report_id uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reports%ROWTYPE; target uuid; affected integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator) THEN
    RAISE EXCEPTION 'moderator access required' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('hide', 'restore', 'resolve', 'delete') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;
  IF p_action = 'delete' AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM (SELECT owner_user_id FROM public.app_config LIMIT 1)) THEN
    RAISE EXCEPTION 'only the owner can permanently delete reported content' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.reports WHERE id = p_report_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pending report not found'; END IF;
  target := coalesce(r.comment_id, r.post_id);
  IF p_action <> 'resolve' THEN
    IF r.comment_id IS NOT NULL THEN
      IF p_action = 'delete' THEN DELETE FROM public.comments WHERE id = target;
      ELSE UPDATE public.comments SET is_hidden = (p_action = 'hide') WHERE id = target;
      END IF;
    ELSIF r.post_id IS NOT NULL THEN
      IF p_action = 'delete' THEN DELETE FROM public.posts WHERE id = target;
      ELSE UPDATE public.posts SET is_hidden = (p_action = 'hide') WHERE id = target;
      END IF;
    ELSE RAISE EXCEPTION 'report target missing';
    END IF;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected = 0 THEN RAISE EXCEPTION 'report target missing'; END IF;
  END IF;
  IF p_action = 'resolve' THEN
    UPDATE public.reports SET status = 'resolved' WHERE id = p_report_id;
  ELSIF p_action IN ('restore', 'delete') THEN
    UPDATE public.reports SET status = 'resolved'
    WHERE (r.comment_id IS NOT NULL AND comment_id = r.comment_id)
       OR (r.comment_id IS NULL AND comment_id IS NULL AND post_id = r.post_id);
  END IF;
  INSERT INTO public.staff_activity(actor_id, target_id, action)
  VALUES (auth.uid(), coalesce(target, p_report_id),
    CASE WHEN r.comment_id IS NOT NULL THEN 'comment_' ELSE 'post_' END || p_action);
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_report(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_report(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
