-- Apply after colectivo_approval.sql. No existing membership is changed.
BEGIN;
CREATE TABLE public.colectivo_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 colectivo_id uuid NOT NULL REFERENCES public.colectivos(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
 accepted_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.colectivo_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.colectivo_invitations FROM anon, authenticated;
GRANT SELECT ON public.colectivo_invitations TO authenticated;
CREATE POLICY "invitation parties read" ON public.colectivo_invitations FOR SELECT TO authenticated
 USING (recipient_id = auth.uid() OR public.is_colectivo_admin(colectivo_id));

CREATE FUNCTION public.invite_colectivo_member(cid uuid, username_input text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; invitation uuid;
BEGIN
 PERFORM 1 FROM public.colectivos WHERE id = cid FOR UPDATE;
 IF NOT public.is_colectivo_admin(cid) THEN RAISE EXCEPTION 'admin required'; END IF;
 SELECT id INTO recipient FROM public.profiles WHERE lower(username) = lower(ltrim(trim(username_input), '@'));
 IF recipient IS NULL THEN RAISE EXCEPTION 'username not found'; END IF;
 IF recipient = auth.uid() OR EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id = cid AND user_id = recipient)
 THEN RAISE EXCEPTION 'already a member'; END IF;
 IF EXISTS (SELECT 1 FROM public.blocked_users WHERE (blocker_id = auth.uid() AND blocked_id = recipient) OR (blocker_id = recipient AND blocked_id = auth.uid()))
 THEN RAISE EXCEPTION 'invitation unavailable'; END IF;
 -- Regenerating an invitation invalidates all older links for this account.
 UPDATE public.colectivo_invitations SET revoked_at = now()
 WHERE colectivo_id = cid AND recipient_id = recipient AND accepted_at IS NULL AND revoked_at IS NULL;
 INSERT INTO public.colectivo_invitations(colectivo_id,recipient_id,invited_by)
 VALUES(cid,recipient,auth.uid()) RETURNING id INTO invitation;
 RETURN invitation;
END; $$;

CREATE FUNCTION public.revoke_colectivo_invitation(invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
 SELECT colectivo_id INTO cid FROM public.colectivo_invitations WHERE id = invitation_id;
 PERFORM 1 FROM public.colectivos WHERE id = cid FOR UPDATE;
 IF cid IS NULL OR NOT public.is_colectivo_admin(cid) THEN RAISE EXCEPTION 'admin required'; END IF;
 UPDATE public.colectivo_invitations SET revoked_at = now() WHERE id = invitation_id AND accepted_at IS NULL;
END; $$;

CREATE FUNCTION public.accept_colectivo_invitation(invitation_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; invitation public.colectivo_invitations; destination text;
BEGIN
 SELECT colectivo_id INTO cid FROM public.colectivo_invitations WHERE id = invitation_id;
 SELECT slug INTO destination FROM public.colectivos WHERE id = cid FOR UPDATE;
 SELECT * INTO invitation FROM public.colectivo_invitations WHERE id = invitation_id FOR UPDATE;
 IF auth.uid() IS NULL OR invitation.recipient_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'invitation unavailable for this account'; END IF;
 -- Never re-add someone who left or was removed after accepting.
 IF invitation.accepted_at IS NOT NULL THEN
   IF EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id = cid AND user_id = auth.uid()) THEN RETURN destination; END IF;
   RAISE EXCEPTION 'invitation already used';
 END IF;
 IF invitation.revoked_at IS NOT NULL OR invitation.expires_at <= now() THEN RAISE EXCEPTION 'invitation expired or revoked'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.colectivos WHERE id = cid AND created_by = invitation.invited_by)
 AND NOT EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id = cid AND user_id = invitation.invited_by AND role = 'admin')
 THEN RAISE EXCEPTION 'inviter no longer admin'; END IF;
 INSERT INTO public.colectivo_members(colectivo_id,user_id,role) VALUES(cid,auth.uid(),'member')
 ON CONFLICT(colectivo_id,user_id) DO NOTHING;
 UPDATE public.colectivo_invitations SET accepted_at = now() WHERE id = invitation_id;
 DELETE FROM public.colectivo_join_requests WHERE colectivo_id = cid AND user_id = auth.uid() AND status = 'pending';
 RETURN destination;
END; $$;
REVOKE ALL ON FUNCTION public.invite_colectivo_member(uuid,text), public.revoke_colectivo_invitation(uuid), public.accept_colectivo_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_colectivo_member(uuid,text), public.revoke_colectivo_invitation(uuid), public.accept_colectivo_invitation(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
