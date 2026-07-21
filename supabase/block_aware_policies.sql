-- ============================================================
-- Migration: enforce blocked_users in messaging RLS
-- Run in Supabase SQL Editor.
-- ============================================================

-- messages ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "messages: sender insert" ON messages;

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

-- conversations ────────────────────────────────────────────
DROP POLICY IF EXISTS "conversations: participant create" ON conversations;

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
