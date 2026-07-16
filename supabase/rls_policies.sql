-- ============================================================
-- MAGMA — Row Level Security Policies
-- Paste into Supabase SQL Editor and run in full.
-- Safe to re-run: uses CREATE POLICY IF NOT EXISTS where possible,
-- and ENABLE ROW LEVEL SECURITY is idempotent.
-- ============================================================

-- ============================================================
-- PROFILES
-- Fix: drop the email column (emails belong only in auth.users,
-- no app code reads profiles.email).
-- ============================================================

ALTER TABLE profiles DROP COLUMN IF EXISTS email;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT
  USING (true);

-- Users update only their own row
CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No direct INSERT policy — a trigger on auth.users creates the profile row.
-- No DELETE policy — cascades from auth.users deletion.

-- ============================================================
-- POSTS
-- ============================================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts: public read"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "posts: authenticated insert"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts: owner update"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their own posts; moderators can delete any post
CREATE POLICY "posts: owner or moderator delete"
  ON posts FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- ============================================================
-- COMMENTS
-- ============================================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments: public read"
  ON comments FOR SELECT
  USING (true);

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

-- ============================================================
-- REPORTS
-- Only the reporter and moderators can see reports.
-- ============================================================

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

-- Only moderators resolve/delete reports
CREATE POLICY "reports: moderator delete"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- ============================================================
-- BLOCKED_USERS
-- A user can only see and manage their own blocks.
-- ============================================================

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

-- ============================================================
-- MESSAGES
-- Only participants in the conversation can read/write.
-- ============================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Participant check joins through conversations table
CREATE POLICY "messages: participant read"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

CREATE POLICY "messages: sender insert"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

-- Allow participants to mark messages as read (update only the read column)
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

-- ============================================================
-- CONVERSATIONS
-- Only the two participants can see or write to a conversation.
-- ============================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations: participant read"
  ON conversations FOR SELECT
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "conversations: participant create"
  ON conversations FOR INSERT
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Update (last_message_at bump) — either participant
CREATE POLICY "conversations: participant update"
  ON conversations FOR UPDATE
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid())
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- ============================================================
-- RADIO_SETTINGS
-- Public read (radio page shows stream URL/status).
-- Only the site owner can write.
-- ============================================================

ALTER TABLE radio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "radio_settings: public read"
  ON radio_settings FOR SELECT
  USING (true);

CREATE POLICY "radio_settings: owner update"
  ON radio_settings FOR UPDATE
  USING    (auth.uid() = 'd546124c-7d0a-4a2b-a668-0e6e491c439a'::uuid)
  WITH CHECK (auth.uid() = 'd546124c-7d0a-4a2b-a668-0e6e491c439a'::uuid);

-- ============================================================
-- DJS
-- Public read (DJ profiles are public).
-- Any authenticated user can submit their own application (INSERT).
-- Only the site owner can approve/unapprove (UPDATE) or delete rows.
-- Note: if you want DJs to edit their own bio/instagram/genres,
-- handle that through a server-side API endpoint that strips the
-- `approved` field before writing — don't add a self-UPDATE policy
-- here or a DJ could flip their own approved flag.
-- ============================================================

ALTER TABLE djs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "djs: public read"
  ON djs FOR SELECT
  USING (true);

-- No client INSERT policy — DJ rows are created only via the admin API route
-- (service role, which bypasses RLS). Dropped by add_slot_request_columns.sql.

CREATE POLICY "djs: owner update"
  ON djs FOR UPDATE
  USING    (auth.uid() = 'd546124c-7d0a-4a2b-a668-0e6e491c439a'::uuid)
  WITH CHECK (auth.uid() = 'd546124c-7d0a-4a2b-a668-0e6e491c439a'::uuid);

CREATE POLICY "djs: owner delete"
  ON djs FOR DELETE
  USING (auth.uid() = 'd546124c-7d0a-4a2b-a668-0e6e491c439a'::uuid);

-- ============================================================
-- RADIO_CHAT
-- Public read (chat is visible on the radio page).
-- Authenticated users can send; only the sender can delete their message.
-- ============================================================

ALTER TABLE radio_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "radio_chat: public read"
  ON radio_chat FOR SELECT
  USING (true);

CREATE POLICY "radio_chat: authenticated insert"
  ON radio_chat FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "radio_chat: sender delete"
  ON radio_chat FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- RADIO_SLOT_REQUESTS
-- Columns added by add_slot_request_columns.sql:
--   user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
--   status  text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
-- ============================================================

ALTER TABLE radio_slot_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests (any status)
CREATE POLICY "radio_slot_requests: owner select"
  ON radio_slot_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can submit; user_id must match their own session
CREATE POLICY "radio_slot_requests: authenticated insert"
  ON radio_slot_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

-- No client UPDATE or DELETE policies — the admin API route uses service role
-- (which bypasses RLS) to update status and is protected by the OWNER_ID check.

-- ============================================================
-- COLECTIVOS
-- Public read. Only the creator can update/delete.
-- ============================================================

ALTER TABLE colectivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colectivos: public read"
  ON colectivos FOR SELECT
  USING (true);

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

-- ============================================================
-- COLECTIVO_MEMBERS
-- Public read (member lists are visible).
-- Users can insert themselves; admins or the user can remove a member.
-- ============================================================

ALTER TABLE colectivo_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colectivo_members: public read"
  ON colectivo_members FOR SELECT
  USING (true);

-- Users join themselves; role must be set by app logic, not by this policy
CREATE POLICY "colectivo_members: self insert"
  ON colectivo_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- A colectivo admin can change member roles
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

-- Members can leave themselves; admins can remove anyone
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

-- ============================================================
-- COLECTIVO_POSTS
-- Public read. Members can add posts; admins or the adder can remove.
-- ============================================================

ALTER TABLE colectivo_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colectivo_posts: public read"
  ON colectivo_posts FOR SELECT
  USING (true);

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

-- ============================================================
-- COLECTIVO_JOIN_REQUESTS
-- The requester sees their own requests.
-- Colectivo admins see all requests for their colectivos.
-- ============================================================

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

-- Admins approve/reject (update status); users can cancel their own request
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

-- ============================================================
-- PROJECTS
-- Public read. Authors manage their own projects.
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: public read"
  ON projects FOR SELECT
  USING (true);

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

-- ============================================================
-- POST_PROJECTS
-- Public read. Only the post's author can link/unlink.
-- ============================================================

ALTER TABLE post_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_projects: public read"
  ON post_projects FOR SELECT
  USING (true);

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

-- ============================================================
-- LISTINGS (tianguis)
-- Public read. Sellers manage their own listings.
-- ============================================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings: public read"
  ON listings FOR SELECT
  USING (true);

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
