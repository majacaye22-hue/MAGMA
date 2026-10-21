-- Apply after colectivo_post_privacy.sql. Enable NEXT_PUBLIC_COLLABORATIONS_ENABLED
-- only after applying and verifying this migration. Does not change posts RLS.
BEGIN;
CREATE TABLE public.collaborations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
 post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (num_nonnulls(project_id, post_id) = 1),
 UNIQUE(project_id, user_id), UNIQUE(post_id, user_id)
);
CREATE INDEX collaborations_recipient ON public.collaborations(user_id);
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.collaborations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.collaborations TO authenticated;
-- Post existence is evaluated through the caller's RLS: credits reveal no private
-- post IDs, titles or authors to someone outside its original audience.
CREATE POLICY "collaborations: visible parties and accepted credits" ON public.collaborations
 FOR SELECT TO authenticated USING (
 (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id
   AND (accepted_at IS NOT NULL OR user_id = auth.uid() OR p.author_id = auth.uid())))
 OR (post_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id
   AND (accepted_at IS NOT NULL OR user_id = auth.uid() OR p.author_id = auth.uid())))
 );

-- One locked resource serializes invite/accept/remove and project contributions.
CREATE FUNCTION public.change_collaboration(kind text, target_id uuid, action text, username_input text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; recipient uuid; audience uuid; approved boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'inicia sesión'; END IF;
 IF kind = 'project' THEN
   SELECT author_id INTO owner_id FROM public.projects WHERE id = target_id FOR UPDATE;
 ELSIF kind = 'post' THEN
   SELECT author_id, audience_colectivo_id, moderation_status = 'approved' AND NOT is_hidden
     INTO owner_id, audience, approved FROM public.posts WHERE id = target_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'tipo inválido'; END IF;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'colaboración no disponible'; END IF;
 IF action = 'invite' OR action = 'remove' THEN
   IF owner_id <> auth.uid() THEN RAISE EXCEPTION 'solo la persona creadora puede administrar'; END IF;
   SELECT id INTO recipient FROM public.profiles WHERE lower(username) = lower(ltrim(trim(username_input), '@'));
 ELSE recipient := auth.uid(); END IF;
 IF recipient IS NULL OR recipient = owner_id THEN RAISE EXCEPTION 'elige otro usuario válido'; END IF;
 IF action IN ('invite', 'accept') THEN
   IF EXISTS (SELECT 1 FROM public.blocked_users WHERE
     (blocker_id = owner_id AND blocked_id = recipient) OR (blocker_id = recipient AND blocked_id = owner_id))
   THEN RAISE EXCEPTION 'colaboración no disponible'; END IF;
   IF kind = 'post' THEN
     IF action = 'accept' AND NOT approved THEN RAISE EXCEPTION 'la publicación debe estar aprobada'; END IF;
     IF audience IS NOT NULL AND NOT (
       EXISTS (SELECT 1 FROM public.colectivos WHERE id = audience AND created_by = recipient)
       OR EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id = audience AND user_id = recipient))
     THEN RAISE EXCEPTION 'la persona invitada debe pertenecer al colectivo'; END IF;
   END IF;
 END IF;
 IF action = 'invite' THEN
   INSERT INTO public.collaborations(project_id, post_id, user_id)
   VALUES (CASE WHEN kind = 'project' THEN target_id END, CASE WHEN kind = 'post' THEN target_id END, recipient)
   ON CONFLICT DO NOTHING;
 ELSIF action = 'accept' THEN
   UPDATE public.collaborations SET accepted_at = coalesce(accepted_at, now())
   WHERE user_id = auth.uid() AND ((kind = 'project' AND project_id = target_id) OR (kind = 'post' AND post_id = target_id));
   IF NOT FOUND THEN RAISE EXCEPTION 'invitación retirada o inexistente'; END IF;
 ELSIF action IN ('remove', 'leave', 'decline') THEN
   DELETE FROM public.collaborations WHERE user_id = recipient
     AND ((kind = 'project' AND project_id = target_id) OR (kind = 'post' AND post_id = target_id));
 ELSE RAISE EXCEPTION 'acción inválida'; END IF;
END; $$;

CREATE FUNCTION public.contributable_projects()
RETURNS TABLE(id uuid, title text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 SELECT p.id, p.title FROM public.projects p WHERE p.author_id = auth.uid() OR EXISTS (
   SELECT 1 FROM public.collaborations c WHERE c.project_id = p.id AND c.user_id = auth.uid() AND c.accepted_at IS NOT NULL
 ) ORDER BY p.created_at DESC;
$$;

-- Keep legacy owner clients working; all direct inserts still pass this trigger.
-- Lock before checking membership so revocation and contribution cannot race.
CREATE FUNCTION public.check_project_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; post_owner uuid; audience uuid;
BEGIN
 SELECT author_id INTO owner_id FROM public.projects WHERE id = NEW.project_id FOR UPDATE;
 SELECT author_id, audience_colectivo_id INTO post_owner, audience FROM public.posts WHERE id = NEW.post_id;
 IF auth.uid() IS NULL OR post_owner IS DISTINCT FROM auth.uid() OR audience IS NOT NULL
 OR (owner_id IS DISTINCT FROM auth.uid() AND NOT EXISTS (
   SELECT 1 FROM public.collaborations WHERE project_id = NEW.project_id AND user_id = auth.uid() AND accepted_at IS NOT NULL))
 OR EXISTS (SELECT 1 FROM public.blocked_users WHERE
   (blocker_id = owner_id AND blocked_id = auth.uid()) OR (blocker_id = auth.uid() AND blocked_id = owner_id))
 THEN RAISE EXCEPTION 'solo puedes añadir tus publicaciones públicas a proyectos propios o colaborativos'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER check_project_entry BEFORE INSERT OR UPDATE ON public.post_projects
 FOR EACH ROW EXECUTE FUNCTION public.check_project_entry();
-- No client UPDATE: move means an explicit unlink and link, never ownership changes.
REVOKE UPDATE ON public.post_projects FROM anon, authenticated;
CREATE POLICY "post_projects: visible public posts" ON public.post_projects AS RESTRICTIVE FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.audience_colectivo_id IS NULL));
CREATE POLICY "post_projects: project owner unlink" ON public.post_projects FOR DELETE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.author_id = auth.uid()));

CREATE FUNCTION public.unlink_project_entry(pid uuid, entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; post_owner uuid;
BEGIN
 SELECT author_id INTO owner_id FROM public.projects WHERE id = pid FOR UPDATE;
 SELECT author_id INTO post_owner FROM public.posts WHERE id = entry_id;
 IF auth.uid() IS NULL OR (auth.uid() IS DISTINCT FROM owner_id AND auth.uid() IS DISTINCT FROM post_owner)
 THEN RAISE EXCEPTION 'no puedes retirar esta entrada'; END IF;
 DELETE FROM public.post_projects WHERE project_id = pid AND post_id = entry_id;
END; $$;
REVOKE ALL ON FUNCTION public.change_collaboration(text,uuid,text,text), public.contributable_projects(), public.check_project_entry(), public.unlink_project_entry(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_collaboration(text,uuid,text,text), public.contributable_projects(), public.unlink_project_entry(uuid,uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
