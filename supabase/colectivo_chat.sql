-- Apply after colectivo_approval.sql. Independent of invitation migration.
BEGIN;
ALTER TABLE public.colectivo_members
 ADD COLUMN chat_joined_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 ADD COLUMN chat_read_at timestamptz,
 ADD COLUMN chat_muted boolean NOT NULL DEFAULT false;

-- These are server-owned even for clients allowed to bootstrap their membership.
CREATE FUNCTION public.initialize_colectivo_chat_membership()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.chat_joined_at := clock_timestamp(); NEW.chat_read_at := NULL; NEW.chat_muted := false;
 RETURN NEW;
END; $$;
CREATE TRIGGER colectivo_chat_membership_start BEFORE INSERT ON public.colectivo_members
 FOR EACH ROW EXECUTE FUNCTION public.initialize_colectivo_chat_membership();

CREATE TABLE public.colectivo_messages (
 id uuid PRIMARY KEY,
 colectivo_id uuid NOT NULL REFERENCES public.colectivos(id) ON DELETE CASCADE,
 sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX colectivo_messages_history ON public.colectivo_messages(colectivo_id, created_at DESC, id DESC);
ALTER TABLE public.colectivo_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.colectivo_messages FROM anon, authenticated;
GRANT SELECT ON public.colectivo_messages TO authenticated;

CREATE FUNCTION public.can_read_colectivo_message(cid uuid, sent_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.colectivo_members
 WHERE colectivo_id = cid AND user_id = auth.uid() AND sent_at >= chat_joined_at);
$$;
CREATE POLICY "members read only since latest join" ON public.colectivo_messages FOR SELECT TO authenticated
 USING (public.can_read_colectivo_message(colectivo_id, created_at));

CREATE FUNCTION public.list_colectivo_chats()
RETURNS TABLE(id uuid, name text, slug text, muted boolean, unread boolean, preview text, last_message_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT c.id,c.name,c.slug,m.chat_muted,
 NOT m.chat_muted AND EXISTS(SELECT 1 FROM public.colectivo_messages msg
 WHERE msg.colectivo_id=c.id AND msg.created_at >= m.chat_joined_at
 AND msg.created_at > coalesce(m.chat_read_at,m.chat_joined_at) AND msg.sender_id IS DISTINCT FROM auth.uid()),
 latest.body,latest.created_at
 FROM public.colectivo_members m JOIN public.colectivos c ON c.id=m.colectivo_id
 LEFT JOIN LATERAL (SELECT msg.body,msg.created_at FROM public.colectivo_messages msg
 WHERE msg.colectivo_id=c.id AND msg.created_at >= m.chat_joined_at ORDER BY msg.created_at DESC,msg.id DESC LIMIT 1) latest ON true
 WHERE m.user_id=auth.uid() ORDER BY latest.created_at DESC NULLS LAST,c.name;
$$;

CREATE FUNCTION public.send_colectivo_message(cid uuid, message_id uuid, message_body text)
RETURNS public.colectivo_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.colectivo_messages;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in required'; END IF;
 -- Same collective lock order as approval/invitations; lock membership against removal.
 PERFORM 1 FROM public.colectivos WHERE id=cid FOR UPDATE;
 PERFORM 1 FROM public.colectivo_members WHERE colectivo_id=cid AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'membership required'; END IF;
 SELECT * INTO result FROM public.colectivo_messages WHERE id=message_id;
 IF FOUND THEN
 IF result.colectivo_id=cid AND result.sender_id=auth.uid() AND result.body=trim(message_body)
 AND public.can_read_colectivo_message(cid,result.created_at) THEN RETURN result; END IF;
 RAISE EXCEPTION 'message id unavailable'; END IF;
 INSERT INTO public.colectivo_messages(id,colectivo_id,sender_id,body)
 VALUES(message_id,cid,auth.uid(),trim(message_body)) RETURNING * INTO result;
 RETURN result;
END; $$;

CREATE FUNCTION public.read_colectivo_chat(cid uuid, through_time timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.colectivo_members SET chat_read_at=greatest(chat_read_at,least(through_time,clock_timestamp()))
 WHERE colectivo_id=cid AND user_id=auth.uid();
END; $$;
CREATE FUNCTION public.mute_colectivo_chat(cid uuid, muted boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.colectivo_members SET chat_muted=muted WHERE colectivo_id=cid AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'membership required'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.initialize_colectivo_chat_membership(), public.can_read_colectivo_message(uuid,timestamptz), public.list_colectivo_chats(), public.send_colectivo_message(uuid,uuid,text), public.read_colectivo_chat(uuid,timestamptz), public.mute_colectivo_chat(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_colectivo_message(uuid,timestamptz), public.list_colectivo_chats(), public.send_colectivo_message(uuid,uuid,text), public.read_colectivo_chat(uuid,timestamptz), public.mute_colectivo_chat(uuid,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
