-- Staging pilot: optional living-portfolio entries; no payments or bookings.
BEGIN;
CREATE TABLE IF NOT EXISTS public.profile_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 600),
  modes text[] NOT NULL DEFAULT '{}' CHECK (modes <@ ARRAY['trabajo pagado', 'intercambio', 'colaboración']::text[] AND cardinality(modes) <= 3),
  work_path text CHECK (work_path IS NULL OR work_path ~* '^/(post|proyecto)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_offerings_profile_idx ON public.profile_offerings(profile_id, created_at);
ALTER TABLE public.profile_offerings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_offerings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_offerings TO authenticated;
CREATE POLICY offerings_read ON public.profile_offerings FOR SELECT TO authenticated USING (true);
CREATE POLICY offerings_insert ON public.profile_offerings FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY offerings_update ON public.profile_offerings FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY offerings_delete ON public.profile_offerings FOR DELETE TO authenticated USING (profile_id = auth.uid());
NOTIFY pgrst, 'reload schema';
COMMIT;
