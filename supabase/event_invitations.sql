-- Requires colectivo_post_privacy.sql. Apply before enabling the UI flag.
BEGIN;
CREATE TABLE public.event_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 response text NOT NULL DEFAULT 'pending' CHECK (response IN ('pending','going','maybe','declined')),
 created_at timestamptz NOT NULL DEFAULT now(),
 responded_at timestamptz,
 UNIQUE(event_id,recipient_id)
);
CREATE INDEX event_invitations_recipient ON public.event_invitations(recipient_id,created_at DESC);
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_invitations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.event_invitations TO authenticated;

-- Check current access, not a snapshot: leaving a colectivo, moderation or a
-- block makes the invitation unavailable to both parties. No guest-list access.
CREATE FUNCTION public.can_view_event_invitation(eid uuid,rid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.posts p WHERE p.id=eid AND p.type='evento'
 AND p.moderation_status='approved' AND NOT p.is_hidden
 AND auth.uid() IS NOT NULL AND (auth.uid()=rid OR auth.uid()=p.author_id)
 AND NOT EXISTS (SELECT 1 FROM public.blocked_users b WHERE
   (b.blocker_id=p.author_id AND b.blocked_id=rid) OR (b.blocker_id=rid AND b.blocked_id=p.author_id))
 AND (p.audience_colectivo_id IS NULL OR (
   (EXISTS(SELECT 1 FROM public.colectivos c WHERE c.id=p.audience_colectivo_id AND c.created_by=rid)
    OR EXISTS(SELECT 1 FROM public.colectivo_members m WHERE m.colectivo_id=p.audience_colectivo_id AND m.user_id=rid))
   AND public.is_colectivo_member(p.audience_colectivo_id))));
$$;
CREATE POLICY "event invitations: parties only" ON public.event_invitations FOR SELECT TO authenticated
 USING (public.can_view_event_invitation(event_id,recipient_id)
 AND EXISTS(SELECT 1 FROM public.posts p WHERE p.id=event_id));

CREATE FUNCTION public.invite_to_event(eid uuid,usernames text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.posts; rid uuid; name text;
BEGIN
 SELECT * INTO p FROM public.posts WHERE id=eid FOR UPDATE;
 IF auth.uid() IS NULL OR p.author_id IS DISTINCT FROM auth.uid() OR p.type IS DISTINCT FROM 'evento'
 OR p.event_date IS NULL OR p.event_date <= now() OR p.moderation_status IS DISTINCT FROM 'approved' OR p.is_hidden
 THEN RAISE EXCEPTION 'el evento no está disponible para invitaciones'; END IF;
 IF coalesce(cardinality(usernames),0) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'elige entre 1 y 20 cuentas'; END IF;
 FOREACH name IN ARRAY usernames LOOP
   SELECT id INTO rid FROM public.profiles WHERE lower(username)=lower(ltrim(trim(name),'@'));
   IF rid IS NULL OR rid=auth.uid() OR NOT public.can_view_event_invitation(eid,rid)
   THEN RAISE EXCEPTION 'una cuenta no está disponible para este evento; revisa la selección y el colectivo'; END IF;
   INSERT INTO public.event_invitations(event_id,recipient_id) VALUES(eid,rid) ON CONFLICT DO NOTHING;
 END LOOP;
END; $$;

CREATE FUNCTION public.respond_to_event_invitation(eid uuid,answer text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE starts_at timestamptz;
BEGIN
 SELECT event_date INTO starts_at FROM public.posts WHERE id=eid FOR UPDATE;
 IF auth.uid() IS NULL OR answer IS NULL OR answer NOT IN ('going','maybe','declined')
 OR starts_at IS NULL OR starts_at<=now() OR NOT public.can_view_event_invitation(eid,auth.uid())
 THEN RAISE EXCEPTION 'la invitación no está disponible para responder'; END IF;
 UPDATE public.event_invitations SET response=answer,responded_at=now()
 WHERE event_id=eid AND recipient_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'invitación inexistente'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.can_view_event_invitation(uuid,uuid),public.invite_to_event(uuid,text[]),public.respond_to_event_invitation(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_view_event_invitation(uuid,uuid),public.invite_to_event(uuid,text[]),public.respond_to_event_invitation(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
