-- Apply after moderator_team.sql. Restoring does not approve rejected/pending work.
BEGIN;
CREATE OR REPLACE FUNCTION public.restore_hidden_post(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator) THEN
    RAISE EXCEPTION 'moderator access required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.posts SET is_hidden = false WHERE id = p_post_id AND is_hidden = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'hidden post not found'; END IF;
  INSERT INTO public.staff_activity(actor_id, target_id, action)
    VALUES (auth.uid(), p_post_id, 'post_restore');
END;
$$;
REVOKE ALL ON FUNCTION public.restore_hidden_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_hidden_post(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
