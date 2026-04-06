-- ─── Posts table ──────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  username    text        not null,
  type        text        not null check (type in ('arte', 'música', 'fotografía', 'evento')),
  title       text        not null,
  description text,
  file_url    text,
  file_path   text,          -- storage path for signed URL refreshes / deletion
  date        text,          -- evento only (e.g. "12 abr")
  venue       text,          -- evento only
  upvotes     int4        not null default 0,
  created_at  timestamptz not null default now()
);

-- Row Level Security
alter table public.posts enable row level security;

create policy "posts_select_all"
  on public.posts for select
  using (true);

create policy "posts_insert_own"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "posts_update_own"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "posts_delete_own"
  on public.posts for delete
  using (auth.uid() = user_id);

-- Index for profile page queries
create index if not exists posts_username_idx on public.posts (username);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- ─── Storage bucket ────────────────────────────────────────────────────────────
-- Run in Supabase Dashboard > Storage > New Bucket, OR via SQL:

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload to their own folder (user_id/*)
create policy "storage_select_all"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
