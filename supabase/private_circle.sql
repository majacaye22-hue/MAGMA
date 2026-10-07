BEGIN;
CREATE TABLE public.profile_circle (
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, member_id),
  CHECK(owner_id <> member_id)
);
ALTER TABLE public.profile_circle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_circle FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.profile_circle TO authenticated;
CREATE POLICY "circle owner read" ON public.profile_circle FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE POLICY "circle owner add" ON public.profile_circle FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid() AND member_id<>auth.uid() AND NOT EXISTS (
  SELECT 1 FROM public.blocked_users b WHERE (b.blocker_id=owner_id AND b.blocked_id=member_id) OR (b.blocker_id=member_id AND b.blocked_id=owner_id)
));
CREATE POLICY "circle owner remove" ON public.profile_circle FOR DELETE TO authenticated USING(owner_id=auth.uid());
NOTIFY pgrst, 'reload schema';
COMMIT;
