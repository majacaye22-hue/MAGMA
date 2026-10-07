-- Run on staging after colectivo_invitations.sql and colectivo_chat.sql.
-- Fixtures, memberships, and notifications are all rolled back.
BEGIN;
DO $$ DECLARE ids uuid[]; BEGIN
 SELECT array_agg(id) INTO ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 3) p;
 IF cardinality(ids)<3 THEN RAISE EXCEPTION 'three profiles required'; END IF;
 PERFORM set_config('test.owner',ids[1]::text,true);
 PERFORM set_config('test.recipient',ids[2]::text,true);
 PERFORM set_config('test.outsider',ids[3]::text,true);
 PERFORM set_config('test.username',(SELECT username FROM public.profiles WHERE id=ids[2]),true);
 PERFORM set_config('test.cid',gen_random_uuid()::text,true);
END $$;
INSERT INTO public.colectivos(id,name,slug,created_by)
VALUES(current_setting('test.cid')::uuid,'Invitation rollback test',current_setting('test.cid'),current_setting('test.owner')::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
INSERT INTO public.colectivo_members(colectivo_id,user_id,role) VALUES(current_setting('test.cid')::uuid,auth.uid(),'admin');
SELECT public.send_colectivo_message(current_setting('test.cid')::uuid,gen_random_uuid(),'before invitation');
SELECT set_config('test.invite',public.invite_colectivo_member(current_setting('test.cid')::uuid,'@'||current_setting('test.username'))::text,true);
SELECT set_config('request.jwt.claim.sub',current_setting('test.outsider'),true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.colectivo_invitations WHERE id=current_setting('test.invite')::uuid) THEN RAISE EXCEPTION 'outsider sees invitation'; END IF;
 BEGIN
 PERFORM public.invite_colectivo_member(current_setting('test.cid')::uuid,current_setting('test.username'));
 RAISE EXCEPTION 'outsider invited'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'admin required' THEN RAISE; END IF; END;
 BEGIN
 PERFORM public.revoke_colectivo_invitation(current_setting('test.invite')::uuid);
 RAISE EXCEPTION 'outsider revoked'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'admin required' THEN RAISE; END IF; END;
 BEGIN
 PERFORM public.accept_colectivo_invitation(current_setting('test.invite')::uuid);
 RAISE EXCEPTION 'forwarded link accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invitation unavailable for this account' THEN RAISE; END IF; END;
 BEGIN
 INSERT INTO public.colectivo_invitations(colectivo_id,recipient_id,invited_by) VALUES(current_setting('test.cid')::uuid,auth.uid(),auth.uid());
 RAISE EXCEPTION 'direct insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 UPDATE public.colectivo_invitations SET recipient_id=auth.uid() WHERE id=current_setting('test.invite')::uuid;
 RAISE EXCEPTION 'direct update allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.recipient'),true);
SELECT public.request_colectivo_join(current_setting('test.cid')::uuid,'pending before invitation');
SELECT public.accept_colectivo_invitation(current_setting('test.invite')::uuid);
SELECT public.accept_colectivo_invitation(current_setting('test.invite')::uuid);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.colectivo_members WHERE colectivo_id=current_setting('test.cid')::uuid AND user_id=auth.uid() AND role='member')<>1 THEN RAISE EXCEPTION 'membership missing or duplicate'; END IF;
 IF EXISTS(SELECT 1 FROM public.colectivo_join_requests WHERE colectivo_id=current_setting('test.cid')::uuid AND user_id=auth.uid() AND status='pending') THEN RAISE EXCEPTION 'pending request remains'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.list_colectivo_chats() WHERE id=current_setting('test.cid')::uuid AND preview IS NULL) THEN RAISE EXCEPTION 'chat missing or preview leaked'; END IF;
 IF EXISTS(SELECT 1 FROM public.colectivo_messages WHERE colectivo_id=current_setting('test.cid')::uuid) THEN RAISE EXCEPTION 'old chat history leaked'; END IF;
END $$;
DELETE FROM public.colectivo_members WHERE colectivo_id=current_setting('test.cid')::uuid AND user_id=auth.uid();
DO $$ BEGIN
 BEGIN PERFORM public.accept_colectivo_invitation(current_setting('test.invite')::uuid);
 RAISE EXCEPTION 'used link rejoined'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invitation already used' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
SELECT set_config('test.old',public.invite_colectivo_member(current_setting('test.cid')::uuid,current_setting('test.username'))::text,true);
SELECT set_config('test.invite',public.invite_colectivo_member(current_setting('test.cid')::uuid,current_setting('test.username'))::text,true);
SELECT public.revoke_colectivo_invitation(current_setting('test.invite')::uuid);
SELECT set_config('request.jwt.claim.sub',current_setting('test.recipient'),true);
DO $$ BEGIN
 BEGIN PERFORM public.accept_colectivo_invitation(current_setting('test.old')::uuid);
 RAISE EXCEPTION 'regenerated link accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invitation expired or revoked' THEN RAISE; END IF; END;
 BEGIN PERFORM public.accept_colectivo_invitation(current_setting('test.invite')::uuid);
 RAISE EXCEPTION 'revoked link accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invitation expired or revoked' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
SELECT set_config('test.invite',public.invite_colectivo_member(current_setting('test.cid')::uuid,current_setting('test.username'))::text,true);
RESET ROLE;
UPDATE public.colectivo_invitations SET expires_at=clock_timestamp()-interval '1 day' WHERE id=current_setting('test.invite')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.recipient'),true);
DO $$ BEGIN
 BEGIN PERFORM public.accept_colectivo_invitation(current_setting('test.invite')::uuid);
 RAISE EXCEPTION 'expired link accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invitation expired or revoked' THEN RAISE; END IF; END;
END $$;
-- An invited admin who loses their role cannot leave usable outstanding links.
RESET ROLE;
INSERT INTO public.colectivo_members(colectivo_id,user_id,role) VALUES(current_setting('test.cid')::uuid,current_setting('test.outsider')::uuid,'admin');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.outsider'),true);
SELECT set_config('test.invite',public.invite_colectivo_member(current_setting('test.cid')::uuid,current_setting('test.username'))::text,true);
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
UPDATE public.colectivo_members SET role='member' WHERE colectivo_id=current_setting('test.cid')::uuid AND user_id=current_setting('test.outsider')::uuid;
SELECT set_config('request.jwt.claim.sub',current_setting('test.recipient'),true);
DO $$ BEGIN
 BEGIN PERFORM public.accept_colectivo_invitation(current_setting('test.invite')::uuid);
 RAISE EXCEPTION 'former admin invite accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'inviter no longer admin' THEN RAISE; END IF; END;
END $$;
-- Ordinary public request/approval remains available.
SELECT public.request_colectivo_join(current_setting('test.cid')::uuid);
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
SELECT public.review_colectivo_request(id,true) FROM public.colectivo_join_requests WHERE colectivo_id=current_setting('test.cid')::uuid AND user_id=current_setting('test.recipient')::uuid;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.colectivo_members WHERE colectivo_id=current_setting('test.cid')::uuid AND user_id=current_setting('test.recipient')::uuid) THEN RAISE EXCEPTION 'public approval broken'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.accept_colectivo_invitation(current_setting('test.invite')::uuid);
 RAISE EXCEPTION 'anonymous acceptance permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
SELECT 'invitation security tests passed' AS result;
