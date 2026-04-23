CREATE TABLE profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  display_name text,
  bio text,
  location text,
  disciplines text[],
  avatar_url text,
  created_at timestamp default now()
);

CREATE TABLE posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id),
  title text not null,
  body text,
  type text not null,
  media_url text,
  media_type text,
  tags text[],
  upvotes int default 0,
  created_at timestamp default now()
);

CREATE TABLE collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  is_public boolean default true not null,
  created_at timestamp default now()
);

CREATE TABLE collection_posts (
  collection_id uuid references collections(id) on delete cascade not null,
  post_id uuid references posts(id) on delete cascade not null,
  created_at timestamp default now(),
  primary key (collection_id, post_id)
);

-- RLS
alter table collections enable row level security;
alter table collection_posts enable row level security;

-- collections: owner can do anything; anyone can read public ones
create policy "collections_select" on collections for select using (is_public or auth.uid() = user_id);
create policy "collections_insert" on collections for insert with check (auth.uid() = user_id);
create policy "collections_update" on collections for update using (auth.uid() = user_id);
create policy "collections_delete" on collections for delete using (auth.uid() = user_id);

-- collection_posts: inherit from parent collection
create policy "collection_posts_select" on collection_posts for select
  using (exists (select 1 from collections c where c.id = collection_id and (c.is_public or c.user_id = auth.uid())));
create policy "collection_posts_insert" on collection_posts for insert
  with check (exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid()));
create policy "collection_posts_delete" on collection_posts for delete
  using (exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid()));
