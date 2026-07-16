-- ============================================================
-- Migration: wire up the approve/reject flow for radio slot requests
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Add user_id (nullable — existing rows have no owner)
ALTER TABLE radio_slot_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add status with check constraint
ALTER TABLE radio_slot_requests
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. Replace old radio_slot_requests policies (from initial RLS pass)
DROP POLICY IF EXISTS "radio_slot_requests: owner read"          ON radio_slot_requests;
DROP POLICY IF EXISTS "radio_slot_requests: authenticated insert" ON radio_slot_requests;
DROP POLICY IF EXISTS "radio_slot_requests: owner update"         ON radio_slot_requests;
DROP POLICY IF EXISTS "radio_slot_requests: owner delete"         ON radio_slot_requests;

-- Users can see their own requests (pending / approved / rejected)
CREATE POLICY "radio_slot_requests: owner select"
  ON radio_slot_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can submit; user_id must be their own (or null for legacy)
CREATE POLICY "radio_slot_requests: authenticated insert"
  ON radio_slot_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

-- No client UPDATE / DELETE policies — the admin API route uses service role
-- which bypasses RLS, so no policy is needed there.

-- 4. Remove the permissive djs client-insert policy.
--    DJ rows are now created only via the admin API route (service role).
DROP POLICY IF EXISTS "djs: authenticated insert" ON djs;
