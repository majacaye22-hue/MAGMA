-- Run after collaborations.sql using an admin SQL connection. All fixtures roll back.
BEGIN;
CREATE TEMP TABLE collaboration_test_ids AS SELECT gen_random_uuid() AS owner_id,
 gen_random_uuid() AS member_id, gen_random_uuid() AS stranger_id,
 gen_random_uuid() AS project_id, gen_random_uuid() AS second_project_id,
 gen_random_uuid() AS owner_post, gen_random_uuid() AS member_post,
 gen_random_uuid() AS private_post, gen_random_uuid() AS colectivo_id;
GRANT SELECT ON collaboration_test_ids TO authenticated;
CREATE FUNCTION pg_temp.check_true(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF; END; $$;
CREATE FUNCTION pg_temp.must_fail(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN RETURN; END;
 RAISE EXCEPTION 'unexpected success: %', statement;
END; $$;
DO $$ DECLARE t record; uid uuid; BEGIN
 SELECT * INTO t FROM collaboration_test_ids;
 FOREACH uid IN ARRAY ARRAY[t.owner_id,t.member_id,t.stranger_id] LOOP
   INSERT INTO auth.users(id,email) VALUES(uid,uid::text || '@collaboration-test.invalid');
   INSERT INTO public.profiles(id,username) VALUES(uid,'collab_' || replace(uid::text,'-',''))
     ON CONFLICT(id) DO UPDATE SET username=excluded.username;
 END LOOP;
 INSERT INTO public.projects(id,author_id,title) VALUES(t.project_id,t.owner_id,'test journal'),(t.second_project_id,t.owner_id,'second journal');
 INSERT INTO public.colectivos(id,created_by,name,slug,is_private) VALUES(t.colectivo_id,t.owner_id,'private test',t.colectivo_id::text,true);
 INSERT INTO public.colectivo_members(colectivo_id,user_id) VALUES(t.colectivo_id,t.owner_id),(t.colectivo_id,t.member_id);
 INSERT INTO public.posts(id,author_id,type,title,moderation_status,audience_colectivo_id) VALUES
 (t.owner_post,t.owner_id,'arte','owner post','approved',NULL),
 (t.member_post,t.member_id,'arte','member post','approved',NULL),
 (t.private_post,t.owner_id,'arte','private post','approved',t.colectivo_id);
END; $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE t record; owner_name text; member_name text; stranger_name text; affected integer;
BEGIN
 SELECT * INTO t FROM collaboration_test_ids;
 PERFORM set_config('request.jwt.claim.sub',t.owner_id::text,true);
 SELECT username INTO owner_name FROM public.profiles WHERE id=t.owner_id;
 SELECT username INTO member_name FROM public.profiles WHERE id=t.member_id;
 SELECT username INTO stranger_name FROM public.profiles WHERE id=t.stranger_id;
 PERFORM public.change_collaboration('project',t.project_id,'invite',member_name);
 PERFORM public.change_collaboration('post',t.owner_post,'invite',member_name);
 PERFORM public.change_collaboration('post',t.private_post,'invite',member_name);
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''post'',%L,''invite'',%L)',t.private_post,stranger_name));
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''invite'',%L)',t.project_id,owner_name));

 PERFORM set_config('request.jwt.claim.sub',t.stranger_id::text,true);
 PERFORM pg_temp.check_true((SELECT count(*)=0 FROM public.collaborations),'pending invitations exposed to strangers');
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''accept'')',t.project_id));
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''post'',%L,''accept'')',t.owner_post));
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''invite'',%L)',t.project_id,stranger_name));
 PERFORM pg_temp.must_fail(format('INSERT INTO public.collaborations(project_id,user_id,accepted_at) VALUES(%L,%L,now())',t.project_id,t.stranger_id));
 PERFORM pg_temp.must_fail(format('UPDATE public.collaborations SET accepted_at=now() WHERE project_id=%L',t.project_id));

 PERFORM set_config('request.jwt.claim.sub',t.member_id::text,true);
 PERFORM pg_temp.check_true((SELECT count(*)=0 FROM public.contributable_projects()),'pending member can contribute');
 PERFORM pg_temp.must_fail(format('INSERT INTO public.post_projects(post_id,project_id) VALUES(%L,%L)',t.member_post,t.project_id));
 -- Post credit alone must not grant project membership.
 PERFORM public.change_collaboration('post',t.owner_post,'accept');
 PERFORM pg_temp.must_fail(format('INSERT INTO public.post_projects(post_id,project_id) VALUES(%L,%L)',t.member_post,t.project_id));
 UPDATE public.posts SET title='forbidden' WHERE id=t.owner_post;
 GET DIAGNOSTICS affected = ROW_COUNT;
 PERFORM pg_temp.check_true(affected=0,'credited collaborator edited original');
 DELETE FROM public.posts WHERE id=t.owner_post;
 GET DIAGNOSTICS affected = ROW_COUNT;
 PERFORM pg_temp.check_true(affected=0,'credited collaborator deleted original');
 PERFORM public.change_collaboration('project',t.project_id,'accept');
 PERFORM public.change_collaboration('project',t.project_id,'accept'); -- idempotent
 PERFORM pg_temp.check_true((SELECT count(*)=1 FROM public.contributable_projects()),'accepted project missing');
 INSERT INTO public.post_projects(post_id,project_id) VALUES(t.member_post,t.project_id);
 UPDATE public.projects SET title='forbidden' WHERE id=t.project_id;
 GET DIAGNOSTICS affected = ROW_COUNT;
 PERFORM pg_temp.check_true(affected=0,'project contributor edited project metadata');
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''remove'',%L)',t.project_id,stranger_name));
 PERFORM pg_temp.must_fail(format('UPDATE public.post_projects SET project_id=%L WHERE post_id=%L',t.second_project_id,t.member_post));
 PERFORM pg_temp.must_fail(format('INSERT INTO public.post_projects(post_id,project_id) VALUES(%L,%L)',t.owner_post,t.project_id));
 PERFORM public.change_collaboration('post',t.private_post,'accept');
 PERFORM public.change_collaboration('post',t.owner_post,'leave');
 PERFORM pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.collaborations WHERE post_id=t.owner_post),'credit withdrawal failed');

 PERFORM set_config('request.jwt.claim.sub',t.stranger_id::text,true);
 PERFORM pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.collaborations WHERE post_id=t.private_post),'private credit exposed');
 PERFORM pg_temp.must_fail(format('SELECT public.unlink_project_entry(%L,%L)',t.project_id,t.member_post));

 PERFORM set_config('request.jwt.claim.sub',t.owner_id::text,true);
 PERFORM pg_temp.must_fail(format('INSERT INTO public.post_projects(post_id,project_id) VALUES(%L,%L)',t.private_post,t.project_id));
 INSERT INTO public.post_projects(post_id,project_id) VALUES(t.owner_post,t.project_id),(t.owner_post,t.second_project_id);
 PERFORM public.unlink_project_entry(t.project_id,t.owner_post);
 PERFORM pg_temp.check_true(EXISTS(SELECT 1 FROM public.post_projects WHERE project_id=t.second_project_id AND post_id=t.owner_post),'unlink removed unrelated project');
 UPDATE public.posts SET title='forbidden' WHERE id=t.member_post;
 GET DIAGNOSTICS affected = ROW_COUNT;
 PERFORM pg_temp.check_true(affected=0,'project owner edited member post');
 PERFORM public.unlink_project_entry(t.project_id,t.member_post);
 PERFORM pg_temp.check_true(EXISTS(SELECT 1 FROM public.posts WHERE id=t.member_post),'owner unlink deleted member post');
 PERFORM set_config('request.jwt.claim.sub',t.member_id::text,true);
 INSERT INTO public.post_projects(post_id,project_id) VALUES(t.member_post,t.project_id);
 PERFORM set_config('request.jwt.claim.sub',t.owner_id::text,true);
 PERFORM public.change_collaboration('project',t.project_id,'remove',member_name);
 PERFORM pg_temp.check_true(EXISTS(SELECT 1 FROM public.post_projects WHERE project_id=t.project_id AND post_id=t.member_post),'removal erased existing entry');
 PERFORM pg_temp.check_true((SELECT author_id=t.member_id FROM public.posts WHERE id=t.member_post),'contribution reassigned');

 PERFORM set_config('request.jwt.claim.sub',t.member_id::text,true);
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''accept'')',t.project_id));
 PERFORM pg_temp.must_fail(format('INSERT INTO public.post_projects(post_id,project_id) VALUES(%L,%L)',t.member_post,t.project_id));
 PERFORM public.unlink_project_entry(t.project_id,t.member_post);
 PERFORM pg_temp.check_true(EXISTS(SELECT 1 FROM public.posts WHERE id=t.member_post),'withdrawal deleted original');

 PERFORM set_config('request.jwt.claim.sub',t.owner_id::text,true);
 PERFORM public.change_collaboration('project',t.project_id,'invite',member_name);
 PERFORM public.change_collaboration('project',t.project_id,'remove',member_name);
 PERFORM set_config('request.jwt.claim.sub',t.member_id::text,true);
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''accept'')',t.project_id));
 PERFORM set_config('request.jwt.claim.sub',t.owner_id::text,true);
 PERFORM public.change_collaboration('project',t.project_id,'invite',member_name);
 PERFORM set_config('request.jwt.claim.sub',t.member_id::text,true);
 PERFORM public.change_collaboration('project',t.project_id,'decline');
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''accept'')',t.project_id));
 PERFORM set_config('request.jwt.claim.sub',t.owner_id::text,true);
 PERFORM public.change_collaboration('project',t.project_id,'invite',member_name);
 INSERT INTO public.blocked_users(blocker_id,blocked_id) VALUES(t.owner_id,t.member_id);
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''post'',%L,''invite'',%L)',t.owner_post,member_name));
 PERFORM set_config('request.jwt.claim.sub',t.member_id::text,true);
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''accept'')',t.project_id));
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM pg_temp.must_fail(format('SELECT public.change_collaboration(''project'',%L,''accept'')',t.project_id));
END; $$;
RESET ROLE;
SELECT 'collaboration permission checks passed; fixtures rolled back' AS result;
ROLLBACK;
