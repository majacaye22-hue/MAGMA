-- Apply to staging first. No accounts are promoted by this migration.
BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_activity FROM anon, authenticated;
GRANT SELECT ON public.staff_activity TO authenticated;
DROP POLICY IF EXISTS "staff activity: owner read" ON public.staff_activity;
CREATE POLICY "staff activity: owner read" ON public.staff_activity FOR SELECT TO authenticated
  USING (auth.uid() = (SELECT owner_user_id FROM public.app_config LIMIT 1));

-- Existing profile-edit RLS is row-level, not column-level. Protect role changes
-- even when someone calls the profiles API directly instead of using our UI.
CREATE OR REPLACE FUNCTION public.guard_moderator_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN changed := NEW.is_moderator;
  ELSE changed := NEW.is_moderator IS DISTINCT FROM OLD.is_moderator;
  END IF;
  IF NOT changed THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM (SELECT owner_user_id FROM public.app_config LIMIT 1) THEN
    RAISE EXCEPTION 'owner access required' USING ERRCODE = '42501';
  END IF;
  IF NEW.id = auth.uid() AND NOT NEW.is_moderator THEN
    RAISE EXCEPTION 'cannot remove owner access';
  END IF;
  INSERT INTO public.staff_activity(actor_id, target_id, action)
  VALUES (auth.uid(), NEW.id, CASE WHEN NEW.is_moderator THEN 'moderator_added' ELSE 'moderator_removed' END);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_moderator_role ON public.profiles;
CREATE TRIGGER guard_moderator_role BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_moderator_role();

CREATE OR REPLACE FUNCTION public.set_moderator(p_username text, p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM (SELECT owner_user_id FROM public.app_config LIMIT 1) THEN
    RAISE EXCEPTION 'owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_enabled IS NULL OR p_username IS NULL OR length(trim(p_username)) = 0 THEN
    RAISE EXCEPTION 'invalid parameters';
  END IF;
  SELECT id INTO STRICT target FROM public.profiles
    WHERE lower(username) = lower(trim(leading '@' FROM trim(p_username))) FOR UPDATE;
  UPDATE public.profiles SET is_moderator = p_enabled WHERE id = target;
END;
$$;
REVOKE ALL ON FUNCTION public.set_moderator(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_moderator(text, boolean) TO authenticated;

-- A report decision and its audit entry commit together. Comment reports only
-- affect the comment, even when post_id is also populated.
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
COMMIT;
