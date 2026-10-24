-- Apply before enabling NEXT_PUBLIC_COMMENT_REPLIES_ENABLED.
begin;
alter table public.comments add column if not exists parent_id uuid
  references public.comments(id) on delete set null;
create index if not exists comments_parent_id_idx on public.comments(parent_id);

-- Invoker rights deliberately preserve the caller's existing comment/post RLS.
create or replace function public.validate_comment_reply()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'UPDATE' then
    if new.post_id is distinct from old.post_id or new.author_id is distinct from old.author_id then
      raise exception 'comment ownership and post cannot change';
    end if;
    if new.parent_id is not distinct from old.parent_id then return new; end if;
    -- Allow FK cleanup when a parent has been deleted; keep its replies.
    if pg_trigger_depth() > 1 and new.parent_id is null
      and not exists(select 1 from public.comments where id = old.parent_id) then
      return new;
    end if;
    raise exception 'reply thread cannot change';
  end if;
  if new.parent_id is not null then
    if new.parent_id = new.id or not exists (
      select 1 from public.comments p join public.posts post on post.id = p.post_id
      where p.id = new.parent_id and p.post_id = new.post_id
        and p.parent_id is null and not p.is_hidden and post.comments_enabled
    ) then
      raise exception 'reply target unavailable';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists validate_comment_reply on public.comments;
create trigger validate_comment_reply before insert or update on public.comments
for each row execute function public.validate_comment_reply();
notify pgrst, 'reload schema';
commit;
