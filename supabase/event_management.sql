-- Requires event_details.sql, event_invitations.sql and all existing notifications migrations.
begin;
alter table public.posts add column if not exists event_status text not null default 'scheduled'
  check (event_status in ('scheduled','postponed','cancelled'));
alter table public.posts add column if not exists event_status_note text check (length(event_status_note)<=1000);
alter table public.posts add column if not exists event_status_version integer not null default 0;

create table public.event_people (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.posts(id) on delete cascade,
  role text not null check (role in ('organizer','participant')),
  profile_id uuid references public.profiles(id) on delete cascade,
  colectivo_id uuid references public.colectivos(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  check (num_nonnulls(profile_id,colectivo_id,project_id)=1),
  unique nulls not distinct(event_id,role,profile_id,colectivo_id,project_id)
);
alter table public.event_people enable row level security;
grant select,insert,delete on public.event_people to authenticated;
revoke all on public.event_people from anon;
create function public.event_link_allowed(eid uuid, target uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and not exists (
 select 1 from public.blocked_users b join public.posts p on p.id=eid
 where (b.blocker_id in (auth.uid(),p.author_id) and b.blocked_id=target)
 or (b.blocked_id in (auth.uid(),p.author_id) and b.blocker_id=target));
$$;
revoke all on function public.event_link_allowed(uuid,uuid) from public,anon;
grant execute on function public.event_link_allowed(uuid,uuid) to authenticated;
create policy "event people respect blocks" on public.event_people as restrictive for all to authenticated
 using (public.event_link_allowed(event_id,coalesce(profile_id,
 (select c.created_by from public.colectivos c where c.id=colectivo_id),
 (select p.author_id from public.projects p where p.id=project_id))))
 with check (public.event_link_allowed(event_id,coalesce(profile_id,
 (select c.created_by from public.colectivos c where c.id=colectivo_id),
 (select p.author_id from public.projects p where p.id=project_id))));
create policy "event people readable" on public.event_people for select to authenticated using (
 exists(select 1 from public.posts p where p.id=event_id and p.type='evento')
 and (profile_id is null or exists(select 1 from public.profiles p where p.id=profile_id))
 and (colectivo_id is null or exists(select 1 from public.colectivos c where c.id=colectivo_id and not c.is_private))
 and (project_id is null or exists(select 1 from public.projects p where p.id=project_id))
);
create policy "event people author inserts" on public.event_people for insert to authenticated with check (
 exists(select 1 from public.posts p where p.id=event_id and p.type='evento' and p.author_id=auth.uid())
 and (profile_id is null or exists(select 1 from public.profiles p where p.id=profile_id))
 and (colectivo_id is null or exists(select 1 from public.colectivos c where c.id=colectivo_id and not c.is_private))
 and (project_id is null or exists(select 1 from public.projects p where p.id=project_id))
);
create policy "event people author removes" on public.event_people for delete to authenticated using (
 exists(select 1 from public.posts p where p.id=event_id and p.author_id=auth.uid())
 or profile_id=auth.uid()
 or exists(select 1 from public.colectivos c where c.id=colectivo_id and c.created_by=auth.uid())
 or exists(select 1 from public.projects p where p.id=project_id and p.author_id=auth.uid())
);

-- Eligibility is evaluated both when sending and when reading a notification.
create function public.event_update_visible(eid uuid, rid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(select 1 from public.posts p
 where p.id=eid and p.type='evento' and p.moderation_status='approved' and not p.is_hidden
 and (auth.uid()=rid or auth.uid()=p.author_id)
 and not exists(select 1 from public.blocked_users b where
 (b.blocker_id=p.author_id and b.blocked_id=rid) or (b.blocker_id=rid and b.blocked_id=p.author_id))
 and (p.audience_colectivo_id is null or exists(select 1 from public.colectivos c where c.id=p.audience_colectivo_id and c.created_by=rid)
 or exists(select 1 from public.colectivo_members m where m.colectivo_id=p.audience_colectivo_id and m.user_id=rid)));
$$;
revoke all on function public.event_update_visible(uuid,uuid) from public,anon;
grant execute on function public.event_update_visible(uuid,uuid) to authenticated;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check
 (kind in ('comment','conversation','message','colectivo_request','colectivo_approved','colectivo_rejected','mention','event_cancelled','event_postponed','event_updated'));
create policy "event update notifications" on public.notifications for select to authenticated using (
 recipient_id=auth.uid() and kind in ('event_cancelled','event_postponed','event_updated')
 and public.event_update_visible(post_id,recipient_id)
 and exists(select 1 from public.posts p where p.id=post_id)
);

create function public.guard_event_status() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='INSERT' then
   if new.event_status<>'scheduled' or new.event_status_version<>0 or new.event_status_note is not null then
     raise exception 'publica primero el evento antes de cambiar su estado';
   end if;
 elsif (new.event_status,new.event_status_note) is distinct from (old.event_status,old.event_status_note) then
   if auth.uid() is null or auth.uid() is distinct from old.author_id or new.type<>'evento' then
     raise exception 'solo quien publicó el evento puede cambiar su estado';
   end if;
   if new.event_status in ('cancelled','postponed') and nullif(trim(new.event_status_note),'') is null then
     raise exception 'explica el cambio para las personas invitadas';
   end if;
   if new.event_status='scheduled' and (new.event_date is null or new.event_date<=now()) then
     raise exception 'indica una nueva fecha futura antes de reactivar el evento';
   end if;
   new.event_status_version := old.event_status_version+1;
 else
   new.event_status_version := old.event_status_version;
 end if;
 return new;
end; $$;
create trigger guard_event_status before insert or update on public.posts for each row execute function public.guard_event_status();

create function public.change_event_status(eid uuid, next_status text, explanation text, expected_version integer)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if next_status is null or next_status not in ('scheduled','postponed','cancelled') then raise exception 'estado inválido'; end if;
 update public.posts set event_status=next_status,event_status_note=nullif(trim(explanation),'')
 where id=eid and type='evento' and author_id=auth.uid() and event_status_version=expected_version;
 if not found then raise exception 'el evento cambió o no tienes acceso; recarga antes de reintentar'; end if;
end; $$;
revoke all on function public.change_event_status(uuid,text,text,integer) from public,anon;
grant execute on function public.change_event_status(uuid,text,text,integer) to authenticated;

create function public.notify_event_change() returns trigger language plpgsql security definer set search_path=public as $$
declare notification_kind text;
begin
 if new.type<>'evento' or auth.uid() is distinct from new.author_id or old.moderation_status<>'approved' then return new; end if;
 if (new.event_status,new.event_status_note,new.event_date,new.event_end_date,new.venue,new.address)
 is not distinct from (old.event_status,old.event_status_note,old.event_date,old.event_end_date,old.venue,old.address) then return new; end if;
 notification_kind := case when new.event_status='cancelled' then 'event_cancelled' when new.event_status='postponed' then 'event_postponed' else 'event_updated' end;
 insert into public.notifications(recipient_id,actor_id,kind,post_id)
 select r.id,new.author_id,notification_kind,new.id from (
   select user_id as id from public.event_attendances where event_id=new.id
   union select recipient_id from public.event_invitations where event_id=new.id and response<>'declined'
 ) r where r.id<>new.author_id and public.event_update_visible(new.id,r.id);
 return new;
end; $$;
create trigger notify_event_change after update on public.posts for each row execute function public.notify_event_change();

create function public.guard_event_response() returns trigger language plpgsql security definer set search_path=public as $$
declare p public.posts; recipient uuid;
begin
 select * into p from public.posts where id=new.event_id for share;
 if tg_table_name='event_attendances' then recipient:=new.user_id; else recipient:=new.recipient_id; end if;
 if p.id is null or p.type<>'evento' or p.event_status<>'scheduled' or p.moderation_status<>'approved' or p.is_hidden
 or not public.event_update_visible(new.event_id,recipient)
 or p.event_date is null or coalesce(p.event_end_date, ((p.event_date at time zone 'America/Mexico_City')::date+1)::timestamp at time zone 'America/Mexico_City')<=now()
 then raise exception 'el evento no está disponible para confirmar asistencia'; end if;
 return new;
end; $$;
create trigger guard_event_attendance before insert on public.event_attendances for each row execute function public.guard_event_response();
create trigger guard_event_invitation before insert or update on public.event_invitations for each row execute function public.guard_event_response();
revoke all on function public.guard_event_status(),public.notify_event_change(),public.guard_event_response() from public;
notify pgrst,'reload schema';
commit;
