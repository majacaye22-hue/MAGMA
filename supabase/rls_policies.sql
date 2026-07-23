-- ============================================================
-- MAGMA — Row Level Security Policies
-- Updated: 2026-07-23
-- Source of truth: schema.sql (which embeds these inline).
-- This file can be pasted into Supabase SQL Editor to re-apply
-- just the RLS layer on an existing schema.
-- All content reads require an authenticated session.
-- Owner policies reference app_config (no hardcoded UUIDs).
-- ============================================================

-- ─── APP CONFIG ──────────────────────────────────────────────
-- Public SELECT so other RLS policies can query it.
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config: public read"
  ON app_config FOR SELECT USING (true);

-- ─── PROFILES ────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Registration inserts the profile row server-side, but the policy
-- is needed for any client path that creates a profile.
CREATE POLICY "profiles: owner insert"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING    (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── POSTS ───────────────────────────────────────────────────

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts: public read"
  ON posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "posts: authenticated insert"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts: owner update"
  ON posts FOR UPDATE
  USING    (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts: owner or moderator delete"
  ON posts FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- ─── COLLECTIONS ─────────────────────────────────────────────

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections: public or owner read"
  ON collections FOR SELECT
  USING (is_public OR auth.uid() = user_id);

CREATE POLICY "collections: authenticated insert"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections: owner update"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "collections: owner delete"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "collection_posts: collection read"
  ON collection_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id AND (c.is_public OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "collection_posts: collection owner insert"
  ON collection_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "collection_posts: collection owner delete"
  ON collection_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

-- ─── COLECTIVOS ──────────────────────────────────────────────

ALTER TABLE colectivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colectivos: public read"
  ON colectivos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "colectivos: authenticated create"
  ON colectivos FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "colectivos: creator update"
  ON colectivos FOR UPDATE
  USING    (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "colectivos: creator delete"
  ON colectivos FOR DELETE
  USING (auth.uid() = created_by);

-- ─── COLECTIVO MEMBERS ───────────────────────────────────────

ALTER TABLE colectivo_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colectivo_members: public read"
  ON colectivo_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "colectivo_members: self insert"
  ON colectivo_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "colectivo_members: admin update"
  ON colectivo_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM colectivo_members cm
      WHERE cm.colectivo_id = colectivo_members.colectivo_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  );

CREATE POLICY "colectivo_members: self or admin delete"
  ON colectivo_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM colectivo_members cm
      WHERE cm.colectivo_id = colectivo_members.colectivo_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  );

-- ─── COLECTIVO POSTS ─────────────────────────────────────────

ALTER TABLE colectivo_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colectivo_posts: public read"
  ON colectivo_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "colectivo_posts: member insert"
  ON colectivo_posts FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    AND EXISTS (
      SELECT 1 FROM colectivo_members
      WHERE colectivo_id = colectivo_posts.colectivo_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "colectivo_posts: adder or admin delete"
  ON colectivo_posts FOR DELETE
  USING (
    auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM colectivo_members
      WHERE colectivo_id = colectivo_posts.colectivo_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ─── COLECTIVO JOIN REQUESTS ─────────────────────────────────

ALTER TABLE colectivo_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "join_requests: requester or admin read"
  ON colectivo_join_requests FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM colectivo_members
      WHERE colectivo_id = colectivo_join_requests.colectivo_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "join_requests: authenticated insert"
  ON colectivo_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "join_requests: admin update"
  ON colectivo_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM colectivo_members
      WHERE colectivo_id = colectivo_join_requests.colectivo_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "join_requests: requester or admin delete"
  ON colectivo_join_requests FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM colectivo_members
      WHERE colectivo_id = colectivo_join_requests.colectivo_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ─── COMMENTS ────────────────────────────────────────────────

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments: public read"
  ON comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "comments: authenticated insert"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments: owner or moderator delete"
  ON comments FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- ─── REPORTS ─────────────────────────────────────────────────

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: reporter or moderator read"
  ON reports FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true
    )
  );

CREATE POLICY "reports: authenticated insert"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports: moderator delete"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- ─── BLOCKED USERS ───────────────────────────────────────────

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_users: owner read"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "blocked_users: owner insert"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocked_users: owner delete"
  ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- ─── MESSAGING ───────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations: participant read"
  ON conversations FOR SELECT
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Block-aware: blocked pairs cannot open new conversations
CREATE POLICY "conversations: participant create"
  ON conversations FOR INSERT
  WITH CHECK (
    (participant_1 = auth.uid() OR participant_2 = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b
      WHERE (b.blocker_id = participant_1 AND b.blocked_id = participant_2)
         OR (b.blocker_id = participant_2 AND b.blocked_id = participant_1)
    )
  );

CREATE POLICY "conversations: participant update"
  ON conversations FOR UPDATE
  USING    (participant_1 = auth.uid() OR participant_2 = auth.uid())
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "messages: participant read"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

-- Block-aware: cannot send into a conversation where either party has blocked the other
CREATE POLICY "messages: sender insert"
  ON messages FOR INSERT
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

CREATE POLICY "messages: participant update read flag"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

-- ─── RADIO ───────────────────────────────────────────────────

ALTER TABLE radio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_slot_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "radio_settings: public read"
  ON radio_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "radio_settings: owner update"
  ON radio_settings FOR UPDATE
  USING    (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1))
  WITH CHECK (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1));

CREATE POLICY "djs: public read"
  ON djs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- No client INSERT policy — DJ rows are created only via the admin API route
-- (service role, which bypasses RLS).
CREATE POLICY "djs: owner update"
  ON djs FOR UPDATE
  USING    (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1))
  WITH CHECK (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1));

CREATE POLICY "djs: owner delete"
  ON djs FOR DELETE
  USING (auth.uid() = (SELECT owner_user_id FROM app_config LIMIT 1));

CREATE POLICY "radio_chat: public read"
  ON radio_chat FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "radio_chat: authenticated insert"
  ON radio_chat FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "radio_chat: sender delete"
  ON radio_chat FOR DELETE
  USING (auth.uid() = user_id);

-- Users see their own requests; admin writes via service role
CREATE POLICY "radio_slot_requests: owner select"
  ON radio_slot_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "radio_slot_requests: authenticated insert"
  ON radio_slot_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

-- ─── TIANGUIS (listings) ─────────────────────────────────────

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings: public read"
  ON listings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "listings: owner insert"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "listings: owner update"
  ON listings FOR UPDATE
  USING    (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "listings: owner delete"
  ON listings FOR DELETE
  USING (auth.uid() = user_id);

-- ─── PROJECTS ────────────────────────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: public read"
  ON projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "projects: authenticated insert"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "projects: owner update"
  ON projects FOR UPDATE
  USING    (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "projects: owner delete"
  ON projects FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "post_projects: public read"
  ON post_projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "post_projects: post author insert"
  ON post_projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_projects.post_id AND author_id = auth.uid()
    )
  );

CREATE POLICY "post_projects: post author delete"
  ON post_projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_projects.post_id AND author_id = auth.uid()
    )
  );
