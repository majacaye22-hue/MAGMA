-- Allow signed-in members to see which events appear on another member's profile.
-- Attendance creation and removal remain restricted to the attendance owner.
DROP POLICY IF EXISTS "event attendances: owner read" ON public.event_attendances;
DROP POLICY IF EXISTS "event attendances: authenticated read" ON public.event_attendances;

CREATE POLICY "event attendances: authenticated read"
  ON public.event_attendances FOR SELECT
  USING (auth.uid() IS NOT NULL);
