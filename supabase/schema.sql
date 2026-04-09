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
