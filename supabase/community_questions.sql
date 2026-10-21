-- Apply after current moderation, notifications and colectivo privacy migrations.
begin;
-- Never expose this ownership mapping through the public API, including joins.
create table public.question_owners (
 id uuid primary key default gen_random_uuid(),
 post_id uuid unique references public.posts(id) on delete set null,
 user_id uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 created_at timestamptz not null default now(),
 unique(user_id,request_id)
);
alter table public.question_owners enable row level security;
revoke all on public.question_owners from public,anon,authenticated;
create index question_owners_rate on public.question_owners(user_id,created_at);
-- A private block list: returning the blocked account would reveal anonymity.
create table public.question_blocks (
 viewer_id uuid references public.profiles(id) on delete cascade,
 author_id uuid references public.profiles(id) on delete cascade,
 primary key(viewer_id,author_id), check(viewer_id<>author_id)
);
alter table public.question_blocks enable row level security;
revoke all on public.question_blocks from public,anon,authenticated;

create function public.question_visible(pid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and not exists (
 select 1 from question_owners q where q.post_id=pid and (
 exists(select 1 from question_blocks b where (b.viewer_id=auth.uid() and b.author_id=q.user_id) or (b.author_id=auth.uid() and b.viewer_id=q.user_id))
 or exists(select 1 from blocked_users b where (b.blocker_id=auth.uid() and b.blocked_id=q.user_id) or (b.blocked_id=auth.uid() and b.blocker_id=q.user_id))));
$$;
revoke all on function public.question_visible(uuid) from public,anon;
grant execute on function public.question_visible(uuid) to authenticated;
create policy "question block visibility" on public.posts as restrictive for select to authenticated
 using(type<>'pregunta' or public.question_visible(id));
-- Every question must use the bounded, identity-safe publishing RPC.
create policy "question rpc publication" on public.posts as restrictive for insert to authenticated with check(type<>'pregunta');
create policy "question immutable content" on public.posts as restrictive for update to authenticated
 using(type<>'pregunta' or exists(select 1 from profiles where id=auth.uid() and is_moderator))
 with check(type<>'pregunta' or exists(select 1 from profiles where id=auth.uid() and is_moderator));

create function public.publish_question(question text, context text, anonymous boolean, request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); pid uuid;
begin
 if uid is null or request_id is null or anonymous is null then raise exception 'inicia sesión para preguntar'; end if;
 if nullif(trim(question),'') is null or length(question)>280 or length(coalesce(context,''))>2000 then raise exception 'pregunta: 1–280 caracteres; contexto: hasta 2000'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select q.post_id into pid from question_owners q where q.user_id=uid and q.request_id=publish_question.request_id;
 if found then
   if pid is null then raise exception 'esta pregunta ya fue eliminada; abre un formulario nuevo'; end if;
   return pid;
 end if;
 if (select count(*) from question_owners where user_id=uid and created_at>now()-interval '1 day')>=3 then
 raise exception 'puedes publicar hasta 3 preguntas cada 24 horas'; end if;
 insert into posts(type,title,body,author_id,comments_enabled,moderation_status)
 values('pregunta',trim(question),nullif(trim(context),''),case when anonymous then null else uid end,true,'approved') returning id into pid;
 insert into question_owners(post_id,user_id,request_id) values(pid,uid,request_id);
 return pid;
end; $$;
revoke all on function public.publish_question(text,text,boolean,uuid) from public,anon;
grant execute on function public.publish_question(text,text,boolean,uuid) to authenticated;

create function public.owns_question(pid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(select 1 from question_owners where post_id=pid and user_id=auth.uid());
$$;
revoke all on function public.owns_question(uuid) from public,anon;
grant execute on function public.owns_question(uuid) to authenticated;

create function public.delete_my_question(pid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.owns_question(pid) then raise exception 'no tienes permiso'; end if;
 delete from posts where id=pid and type='pregunta';
end; $$;
revoke all on function public.delete_my_question(uuid) from public,anon;
grant execute on function public.delete_my_question(uuid) to authenticated;

create function public.block_question_author(pid uuid) returns void language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
 if auth.uid() is null or not public.question_visible(pid) then raise exception 'pregunta no disponible'; end if;
 select q.user_id into target from question_owners q join posts p on p.id=q.post_id
 where q.post_id=pid and p.type='pregunta' and not p.is_hidden and p.moderation_status='approved' and p.audience_colectivo_id is null;
 if target is null or target=auth.uid() then raise exception 'pregunta no disponible'; end if;
 insert into question_blocks values(auth.uid(),target) on conflict do nothing;
end; $$;
revoke all on function public.block_question_author(uuid) from public,anon;
grant execute on function public.block_question_author(uuid) to authenticated;
-- Dedicated, audited moderation access; ordinary users never receive this ID.
create function public.question_author_for_moderation(pid uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
 if not exists(select 1 from profiles where id=auth.uid() and is_moderator) then raise exception 'no tienes permiso'; end if;
 select user_id into uid from question_owners where post_id=pid;
 insert into staff_activity(actor_id,target_id,action) values(auth.uid(),pid,'question_identity_review');
 return uid;
end; $$;
revoke all on function public.question_author_for_moderation(uuid) from public,anon;
grant execute on function public.question_author_for_moderation(uuid) to authenticated;
create function public.notify_anonymous_question_reply() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.is_hidden then return new; end if;
 insert into notifications(recipient_id,actor_id,kind,post_id,comment_id)
 select q.user_id,new.author_id,'comment',p.id,new.id from question_owners q join posts p on p.id=q.post_id
 where p.id=new.post_id and p.author_id is null and p.type='pregunta' and not p.is_hidden and p.moderation_status='approved'
 and q.user_id<>new.author_id
 and not exists(select 1 from blocked_users b where (b.blocker_id=q.user_id and b.blocked_id=new.author_id) or (b.blocked_id=q.user_id and b.blocker_id=new.author_id))
 and not exists(select 1 from question_blocks b where (b.viewer_id=q.user_id and b.author_id=new.author_id) or (b.author_id=q.user_id and b.viewer_id=new.author_id))
 on conflict do nothing;
 return new;
end; $$;
create trigger notify_anonymous_question_reply after insert on public.comments for each row execute function public.notify_anonymous_question_reply();
create function public.remove_questions_on_account_deletion() returns trigger language plpgsql security definer set search_path=public as $$
begin
 delete from posts where id in(select post_id from question_owners where user_id=old.id);
 return old;
end; $$;
create trigger remove_questions_on_account_deletion before delete on public.profiles for each row execute function public.remove_questions_on_account_deletion();
revoke all on function public.notify_anonymous_question_reply(), public.remove_questions_on_account_deletion() from public,anon,authenticated;
create function public.clear_question_blocks() returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'inicia sesión'; end if;
 delete from question_blocks where viewer_id=auth.uid();
end; $$;
revoke all on function public.clear_question_blocks() from public,anon;
grant execute on function public.clear_question_blocks() to authenticated;
notify pgrst,'reload schema';
commit;
