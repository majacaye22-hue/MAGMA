-- ============================================================
-- MAGMA — Complete Database Schema
-- Generated: 2026-07-20
-- Source of truth: synthesised from all migration files + app code.
-- Safe to run on a fresh Supabase project.
-- ============================================================

-- ─── APP CONFIG ──────────────────────────────────────────────────────────────
-- Single-row table holding the site owner UUID.
-- Set via: INSERT INTO app_config (owner_user_id) VALUES ('<your-uuid>');
-- Public SELECT so RLS policies on other tables can query it.
-- No INSERT/UPDATE/DELETE policies — write only via service role
-- (Supabase SQL Editor or server-side migrations).

CREATE TABLE app_config (
  owner_user_id uuid NOT NULL
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config: public read"
  ON app_config FOR SELECT USING (true);

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Extends auth.users. Inserted directly by the client at signup.

CREATE TABLE profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         text UNIQUE NOT NULL,
  display_name     text,
  bio              text,
  location         text,
  disciplines      text[],
  avatar_url       text,
  avatar_color     text DEFAULT '#D85A30',
  is_moderator     boolean DEFAULT false NOT NULL,
  created_at       timestamp DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles: owner insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── POSTS ───────────────────────────────────────────────────────────────────

CREATE TABLE posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title          text,
  body           text,           -- plain text or excerpt
  content        text,           -- sanitised rich HTML (type = "escrito" only)
  type           text NOT NULL,  -- arte | fotografía | música | evento | escrito
  media_url      text,
  media_type     text,
  media_base64   text,           -- legacy; new uploads go to storage
  cover_url      text,           -- album art for música
  tags           text[],
  upvotes        int DEFAULT 0,
  created_at     timestamp DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts: public read"
  ON posts FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "posts: authenticated insert"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts: owner update"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts: owner or moderator delete"
  ON posts FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true)
  );

-- ─── COLLECTIONS ─────────────────────────────────────────────────────────────

CREATE TABLE collections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  is_public  boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE collection_posts (
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  post_id       uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at    timestamp DEFAULT now(),
  PRIMARY KEY (collection_id, post_id)
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_select" ON collections FOR SELECT
  USING (is_public OR auth.uid() = user_id);
CREATE POLICY "collections_insert" ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "collections_update" ON collections FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "collections_delete" ON collections FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "collection_posts_select" ON collection_posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND (c.is_public OR c.user_id = auth.uid())));
CREATE POLICY "collection_posts_insert" ON collection_posts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));
CREATE POLICY "collection_posts_delete" ON collection_posts FOR DELETE
  USING (EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));

-- ─── COLECTIVOS ──────────────────────────────────────────────────────────────

CREATE TABLE colectivos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  description      text,
  avatar_color     text DEFAULT '#D85A30',
  cover_image_url  text,
  is_private       boolean DEFAULT false NOT NULL,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamp DEFAULT now()
);

CREATE TABLE colectivo_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colectivo_id uuid REFERENCES colectivos(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role         text DEFAULT 'member' NOT NULL CHECK (role IN ('admin', 'member')),
  created_at   timestamp DEFAULT now(),
  UNIQUE (colectivo_id, user_id)
);

CREATE TABLE colectivo_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colectivo_id uuid REFERENCES colectivos(id) ON DELETE CASCADE NOT NULL,
  post_id      uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  added_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamp DEFAULT now(),
  UNIQUE (colectivo_id, post_id)
);

CREATE TABLE colectivo_join_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colectivo_id uuid REFERENCES colectivos(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status       text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   timestamp DEFAULT now(),
  UNIQUE (colectivo_id, user_id)
);

ALTER TABLE colectivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE colectivo_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE colectivo_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE colectivo_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colectivos: public read" ON colectivos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "colectivos: authenticated create" ON colectivos FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "colectivos: creator update" ON colectivos FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "colectivos: creator delete" ON colectivos FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "colectivo_members: public read" ON colectivo_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "colectivo_members: self insert" ON colectivo_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "colectivo_members: admin update" ON colectivo_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM colectivo_members cm WHERE cm.colectivo_id = colectivo_members.colectivo_id AND cm.user_id = auth.uid() AND cm.role = 'admin'));
CREATE POLICY "colectivo_members: self or admin delete" ON colectivo_members FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM colectivo_members cm WHERE cm.colectivo_id = colectivo_members.colectivo_id AND cm.user_id = auth.uid() AND cm.role = 'admin'));

CREATE POLICY "colectivo_posts: public read" ON colectivo_posts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "colectivo_posts: member insert" ON colectivo_posts FOR INSERT
  WITH CHECK (auth.uid() = added_by AND EXISTS (SELECT 1 FROM colectivo_members WHERE colectivo_id = colectivo_posts.colectivo_id AND user_id = auth.uid()));
CREATE POLICY "colectivo_posts: adder or admin delete" ON colectivo_posts FOR DELETE
  USING (auth.uid() = added_by OR EXISTS (SELECT 1 FROM colectivo_members WHERE colectivo_id = colectivo_posts.colectivo_id AND user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "join_requests: requester or admin read" ON colectivo_join_requests FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM colectivo_members WHERE colectivo_id = colectivo_join_requests.colectivo_id AND user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "join_requests: authenticated insert" ON colectivo_join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "join_requests: admin update" ON colectivo_join_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM colectivo_members WHERE colectivo_id = colectivo_join_requests.colectivo_id AND user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "join_requests: requester or admin delete" ON colectivo_join_requests FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM colectivo_members WHERE colectivo_id = colectivo_join_requests.colectivo_id AND user_id = auth.uid() AND role = 'admin'));

-- ─── COMMENTS ────────────────────────────────────────────────────────────────

CREATE TABLE comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  author_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body       text NOT NULL,
  created_at timestamp DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments: public read" ON comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "comments: authenticated insert" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments: owner or moderator delete" ON comments FOR DELETE
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true));

-- ─── REPORTS ─────────────────────────────────────────────────────────────────

CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  post_id     uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES comments(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  details     text,
  status      text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'resolved')),
  created_at  timestamp DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: reporter or moderator read" ON reports FOR SELECT
  USING (auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true));
CREATE POLICY "reports: authenticated insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports: moderator delete" ON reports FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true));

-- ─── BLOCKED USERS ───────────────────────────────────────────────────────────

CREATE TABLE blocked_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_users: owner read" ON blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "blocked_users: owner insert" ON blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocked_users: owner delete" ON blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- ─── MESSAGING ───────────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  participant_2   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at timestamp DEFAULT now()
);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body            text NOT NULL,
  read            boolean DEFAULT false,
  created_at      timestamp DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations: participant read" ON conversations FOR SELECT
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Block-aware: neither participant may have blocked the other
CREATE POLICY "conversations: participant create" ON conversations FOR INSERT
  WITH CHECK (
    (participant_1 = auth.uid() OR participant_2 = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b
      WHERE (b.blocker_id = participant_1 AND b.blocked_id = participant_2)
         OR (b.blocker_id = participant_2 AND b.blocked_id = participant_1)
    )
  );

CREATE POLICY "conversations: participant update" ON conversations FOR UPDATE
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid())
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "messages: participant read" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND (participant_1 = auth.uid() OR participant_2 = auth.uid())));

-- Block-aware: cannot send into a conversation where either party has blocked the other
CREATE POLICY "messages: sender insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
        AND NOT EXISTS (
          SELECT 1 FROM blocked_users b
          WHERE (b.blocker_id = c.participant_1 AND b.blocked_id = c.participant_2)
             OR (b.blocker_id = c.participant_2 AND b.blocked_id = c.participant_1)
        )
    )
  );

CREATE POLICY "messages: participant update read flag" ON messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND (participant_1 = auth.uid() OR participant_2 = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND (participant_1 = auth.uid() OR participant_2 = auth.uid())));

-- ─── RADIO ───────────────────────────────────────────────────────────────────

-- Single-row table; insert one row manually after creating the project.
CREATE TABLE radio_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_live    boolean DEFAULT false NOT NULL,
  stream_url text
);

CREATE TABLE djs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name       text NOT NULL,
  bio        text,
  instagram  text,
  genres     text,
  approved   boolean DEFAULT false NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE radio_chat (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body       text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE radio_slot_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username       text NOT NULL,
  preferred_date date,
  preferred_time time,
  genre          text NOT NULL,
  platform       text NOT NULL,
  stream_url     text,
  status         text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     timestamp DEFAULT now()
);

ALTER TABLE radio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_slot_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "radio_settings: public read" ON radio_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "radio_settings: owner update" ON radio_settings FOR UPDATE
  USING (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1))
  WITH CHECK (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1));

CREATE POLICY "djs: public read" ON djs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "djs: owner update" ON djs FOR UPDATE
  USING (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1))
  WITH CHECK (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1));
CREATE POLICY "djs: owner delete" ON djs FOR DELETE
  USING (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1));

CREATE POLICY "radio_chat: public read" ON radio_chat FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "radio_chat: authenticated insert" ON radio_chat FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "radio_chat: sender delete" ON radio_chat FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "radio_slot_requests: owner select" ON radio_slot_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "radio_slot_requests: authenticated insert" ON radio_slot_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

-- ─── TIANGUIS (listings) ─────────────────────────────────────────────────────

CREATE TABLE listings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title        text NOT NULL,
  description  text,
  price        numeric NOT NULL,
  currency     text DEFAULT 'MXN' NOT NULL,
  category     text NOT NULL,
  location     text,
  images       text[] DEFAULT '{}',
  is_available boolean DEFAULT true NOT NULL,
  created_at   timestamp DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings: public read" ON listings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "listings: owner insert" ON listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "listings: owner update" ON listings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "listings: owner delete" ON listings FOR DELETE USING (auth.uid() = user_id);

-- ─── PROJECTS ────────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title           text NOT NULL,
  description     text,
  cover_image_url text,
  links           jsonb,
  created_at      timestamp DEFAULT now()
);

CREATE TABLE post_projects (
  post_id    uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp DEFAULT now(),
  PRIMARY KEY (post_id, project_id)
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: public read" ON projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "projects: authenticated insert" ON projects FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "projects: owner update" ON projects FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "projects: owner delete" ON projects FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "post_projects: public read" ON post_projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "post_projects: post author insert" ON post_projects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE id = post_projects.post_id AND author_id = auth.uid()));
CREATE POLICY "post_projects: post author delete" ON post_projects FOR DELETE
  USING (EXISTS (SELECT 1 FROM posts WHERE id = post_projects.post_id AND author_id = auth.uid()));

-- ─── STORAGE ─────────────────────────────────────────────────────────────────
-- Run these in the Supabase dashboard → Storage, or via the API:
--
--   Bucket name: "uploads"
--   Public: true
--   File size limit: 50 MB
--   Allowed MIME types: image/*, audio/*, video/*
--
-- Storage RLS (Dashboard → Storage → uploads → Policies):
--   SELECT: true (public reads)
--   INSERT: auth.role() = 'authenticated'
--   DELETE: auth.uid()::text = (storage.foldername(name))[1]
--
-- ─── INITIAL DATA ────────────────────────────────────────────────────────────
-- After running this schema, seed radio_settings with one row:
--   INSERT INTO radio_settings (is_live, stream_url) VALUES (false, null);
--
-- And update the owner UUID in the radio_settings and djs policies above
-- to match your actual user ID in the staging project.
