-- Staging only. All fixtures and mutations roll back.
BEGIN;
DO $$ DECLARE ids uuid[]; BEGIN
 SELECT array_agg(id) INTO ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 3) p;
 IF cardinality(ids)<3 THEN RAISE EXCEPTION 'three profiles required'; END IF;
 PERFORM set_config('test.owner',ids[1]::text,true);
 PERFORM set_config('test.member',ids[2]::text,true);
 PERFORM set_config('test.outsider',ids[3]::text,true);
 PERFORM set_config('test.cid',gen_random_uuid()::text,true);
END $$;
INSERT INTO public.colectivos(id,name,slug,created_by)
VALUES(current_setting('test.cid')::uuid,'Chat rollback test',current_setting('test.cid'),current_setting('test.owner')::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
INSERT INTO public.colectivo_members(colectivo_id,user_id,role)
VALUES(current_setting('test.cid')::uuid,auth.uid(),'admin');
SELECT public.send_colectivo_message(current_setting('test.cid')::uuid,gen_random_uuid(),'before join');
SELECT set_config('request.jwt.claim.sub',current_setting('test.member'),true);
SELECT public.request_colectivo_join(current_setting('test.cid')::uuid);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.list_colectivo_chats() WHERE id=current_setting('test.cid')::uuid) THEN RAISE EXCEPTION 'pending sees chat'; END IF;
 IF EXISTS(SELECT 1 FROM public.colectivo_messages WHERE colectivo_id=current_setting('test.cid')::uuid) THEN RAISE EXCEPTION 'pending sees history'; END IF;
 BEGIN
 PERFORM public.send_colectivo_message(current_setting('test.cid')::uuid,gen_random_uuid(),'denied');
 RAISE EXCEPTION 'nonmember sent';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'membership required' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
SELECT public.review_colectivo_request(id,true) FROM public.colectivo_join_requests WHERE colectivo_id=current_setting('test.cid')::uuid;
SELECT set_config('request.jwt.claim.sub',current_setting('test.member'),true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.colectivo_messages WHERE colectivo_id=current_setting('test.cid')::uuid) THEN RAISE EXCEPTION 'new member sees old messages'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.list_colectivo_chats() WHERE id=current_setting('test.cid')::uuid AND preview IS NULL AND NOT unread) THEN RAISE EXCEPTION 'preview leak or missing auto chat'; END IF;
 BEGIN
 UPDATE public.colectivo_members SET chat_joined_at='2000-01-01' WHERE colectivo_id=current_setting('test.cid')::uuid AND user_id=auth.uid();
 RAISE EXCEPTION 'backdating permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 INSERT INTO public.colectivo_messages(id,colectivo_id,sender_id,body) VALUES(gen_random_uuid(),current_setting('test.cid')::uuid,auth.uid(),'forged');
 RAISE EXCEPTION 'direct insert permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
SELECT public.send_colectivo_message(current_setting('test.cid')::uuid,gen_random_uuid(),'after join');
SELECT set_config('request.jwt.claim.sub',current_setting('test.member'),true);
DO $$ DECLARE mid uuid := gen_random_uuid(); BEGIN
 IF (SELECT count(*) FROM public.colectivo_messages WHERE colectivo_id=current_setting('test.cid')::uuid) <> 1 THEN RAISE EXCEPTION 'history boundary failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.list_colectivo_chats() WHERE id=current_setting('test.cid')::uuid AND unread) THEN RAISE EXCEPTION 'unread missing'; END IF;
 PERFORM public.mute_colectivo_chat(current_setting('test.cid')::uuid,true);
 IF EXISTS(SELECT 1 FROM public.list_colectivo_chats() WHERE id=current_setting('test.cid')::uuid AND unread) THEN RAISE EXCEPTION 'mute failed'; END IF;
 PERFORM public.mute_colectivo_chat(current_setting('test.cid')::uuid,false);
 PERFORM public.read_colectivo_chat(current_setting('test.cid')::uuid,clock_timestamp());
 IF EXISTS(SELECT 1 FROM public.list_colectivo_chats() WHERE id=current_setting('test.cid')::uuid AND unread) THEN RAISE EXCEPTION 'read failed'; END IF;
 PERFORM public.send_colectivo_message(current_setting('test.cid')::uuid,mid,'retry safe');
 PERFORM public.send_colectivo_message(current_setting('test.cid')::uuid,mid,'retry safe');
 IF (SELECT count(*) FROM public.colectivo_messages WHERE id=mid)<>1 THEN RAISE EXCEPTION 'duplicate retry'; END IF;
END $$;
DELETE FROM public.colectivo_members WHERE colectivo_id=current_setting('test.cid')::uuid AND user_id=auth.uid();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.colectivo_messages WHERE colectivo_id=current_setting('test.cid')::uuid) THEN RAISE EXCEPTION 'removed member reads'; END IF;
 BEGIN
 PERFORM public.send_colectivo_message(current_setting('test.cid')::uuid,gen_random_uuid(),'removed');
 RAISE EXCEPTION 'removed member sends'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'membership required' THEN RAISE; END IF; END;
END $$;
SELECT public.request_colectivo_join(current_setting('test.cid')::uuid);
SELECT set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
SELECT public.review_colectivo_request(id,true) FROM public.colectivo_join_requests WHERE colectivo_id=current_setting('test.cid')::uuid;
SELECT set_config('request.jwt.claim.sub',current_setting('test.member'),true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.colectivo_messages WHERE colectivo_id=current_setting('test.cid')::uuid) THEN RAISE EXCEPTION 'rejoin reveals earlier session'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.outsider'),true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.colectivo_messages WHERE colectivo_id=current_setting('test.cid')::uuid) OR EXISTS(SELECT 1 FROM public.list_colectivo_chats() WHERE id=current_setting('test.cid')::uuid) THEN RAISE EXCEPTION 'outsider leak'; END IF;
END $$;
ROLLBACK;
SELECT 'colectivo chat privacy tests passed' AS result;
