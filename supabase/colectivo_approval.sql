-- Apply after in_app_notifications.sql. Existing memberships are preserved.
BEGIN;
ALTER TABLE public.colectivo_join_requests ADD COLUMN IF NOT EXISTS note text
  CHECK (char_length(note) <= 500);

CREATE OR REPLACE FUNCTION public.is_colectivo_admin(cid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.colectivos WHERE id = cid AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id = cid AND user_id = auth.uid() AND role = 'admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_colectivo_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_colectivo_admin(uuid) TO authenticated;

-- Only the creator can bootstrap their own admin membership.
DROP POLICY IF EXISTS "colectivo_members: self insert" ON public.colectivo_members;
CREATE POLICY "colectivo_members: self insert" ON public.colectivo_members FOR INSERT TO authenticated
 WITH CHECK (user_id = auth.uid() AND role = 'admin' AND EXISTS (
 SELECT 1 FROM public.colectivos c WHERE c.id = colectivo_id AND c.created_by = auth.uid()));
DROP POLICY IF EXISTS "colectivo_members: admin update" ON public.colectivo_members;
CREATE POLICY "colectivo_members: admin update" ON public.colectivo_members FOR UPDATE TO authenticated
 USING (public.is_colectivo_admin(colectivo_id)) WITH CHECK (public.is_colectivo_admin(colectivo_id));
REVOKE UPDATE ON public.colectivo_members FROM authenticated;
GRANT UPDATE(role) ON public.colectivo_members TO authenticated;
DROP POLICY IF EXISTS "colectivo_members: self or admin delete" ON public.colectivo_members;
CREATE POLICY "colectivo_members: self or admin delete" ON public.colectivo_members FOR DELETE TO authenticated
 USING (user_id = auth.uid() OR public.is_colectivo_admin(colectivo_id));

-- All request mutations use authenticated RPCs; callers cannot forge approval.
REVOKE INSERT, UPDATE, DELETE ON public.colectivo_join_requests FROM anon, authenticated;
DROP POLICY IF EXISTS "join_requests: requester or admin read" ON public.colectivo_join_requests;
CREATE POLICY "join_requests: requester or admin read" ON public.colectivo_join_requests FOR SELECT TO authenticated
 USING (user_id = auth.uid() OR public.is_colectivo_admin(colectivo_id));

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS colectivo_id uuid REFERENCES public.colectivos(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS join_request_id uuid REFERENCES public.colectivo_join_requests(id) ON DELETE CASCADE;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check CHECK
 (kind IN ('comment','conversation','message','colectivo_request','colectivo_approved','colectivo_rejected'));
CREATE UNIQUE INDEX IF NOT EXISTS notification_request_once ON public.notifications(recipient_id, join_request_id, kind)
 WHERE join_request_id IS NOT NULL;
CREATE POLICY "colectivo notification recipient read" ON public.notifications FOR SELECT TO authenticated USING (
 recipient_id = auth.uid() AND colectivo_id IS NOT NULL AND
 NOT EXISTS (SELECT 1 FROM public.blocked_users b WHERE
 (b.blocker_id = recipient_id AND b.blocked_id = actor_id) OR (b.blocker_id = actor_id AND b.blocked_id = recipient_id))
 AND EXISTS (SELECT 1 FROM public.colectivo_join_requests r WHERE r.id = join_request_id AND r.colectivo_id = notifications.colectivo_id
 AND ((kind = 'colectivo_request' AND r.status = 'pending' AND public.is_colectivo_admin(r.colectivo_id))
 OR (kind IN ('colectivo_approved','colectivo_rejected') AND r.user_id = auth.uid())))
);

CREATE OR REPLACE FUNCTION public.request_colectivo_join(cid uuid, introduction text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.colectivo_join_requests; uid uuid := auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
 IF char_length(introduction) > 500 THEN RAISE EXCEPTION 'note too long'; END IF;
 -- Serialize requests, cancellations and approvals for this collective.
 PERFORM 1 FROM public.colectivos WHERE id = cid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'collective not found'; END IF;
 IF EXISTS (SELECT 1 FROM public.colectivo_members WHERE colectivo_id = cid AND user_id = uid)
 OR public.is_colectivo_admin(cid) THEN RETURN; END IF;
 SELECT * INTO req FROM public.colectivo_join_requests WHERE colectivo_id = cid AND user_id = uid;
 IF FOUND AND req.status = 'pending' THEN RETURN; END IF;
 IF req.id IS NOT NULL THEN DELETE FROM public.colectivo_join_requests WHERE id = req.id; END IF;
 INSERT INTO public.colectivo_join_requests(colectivo_id,user_id,status,note)
 VALUES(cid,uid,'pending',nullif(trim(introduction),'')) RETURNING * INTO req;
 INSERT INTO public.notifications(recipient_id,actor_id,kind,colectivo_id,join_request_id)
 SELECT admins.id,uid,'colectivo_request',cid,req.id FROM (
 SELECT created_by AS id FROM public.colectivos WHERE id = cid
 UNION SELECT user_id FROM public.colectivo_members WHERE colectivo_id = cid AND role = 'admin'
 ) admins WHERE admins.id <> uid ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_colectivo_request(cid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
 PERFORM 1 FROM public.colectivos WHERE id = cid FOR UPDATE;
 DELETE FROM public.colectivo_join_requests WHERE colectivo_id = cid AND user_id = auth.uid() AND status = 'pending';
END; $$;

CREATE OR REPLACE FUNCTION public.review_colectivo_request(request_id uuid, approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.colectivo_join_requests; cid uuid; target_status text;
BEGIN
 SELECT colectivo_id INTO cid FROM public.colectivo_join_requests WHERE id = request_id;
 IF cid IS NULL OR NOT public.is_colectivo_admin(cid) THEN RAISE EXCEPTION 'admin required'; END IF;
 PERFORM 1 FROM public.colectivos WHERE id = cid FOR UPDATE;
 SELECT * INTO req FROM public.colectivo_join_requests WHERE id = request_id FOR UPDATE;
 IF NOT public.is_colectivo_admin(cid) THEN RAISE EXCEPTION 'admin required'; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'request no longer available'; END IF;
 target_status := CASE WHEN approve THEN 'approved' ELSE 'rejected' END;
 IF req.status = target_status THEN RETURN; END IF;
 IF req.status <> 'pending' THEN RAISE EXCEPTION 'request already reviewed'; END IF;
 IF approve THEN
 INSERT INTO public.colectivo_members(colectivo_id,user_id,role) VALUES(req.colectivo_id,req.user_id,'member')
 ON CONFLICT(colectivo_id,user_id) DO NOTHING;
 END IF;
 UPDATE public.colectivo_join_requests SET status = target_status WHERE id = req.id;
 INSERT INTO public.notifications(recipient_id,actor_id,kind,colectivo_id,join_request_id)
 SELECT req.user_id,auth.uid(),CASE WHEN approve THEN 'colectivo_approved' ELSE 'colectivo_rejected' END,req.colectivo_id,req.id
 WHERE req.user_id <> auth.uid() ON CONFLICT DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.request_colectivo_join(uuid,text), public.cancel_colectivo_request(uuid), public.review_colectivo_request(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_colectivo_join(uuid,text), public.cancel_colectivo_request(uuid), public.review_colectivo_request(uuid,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
