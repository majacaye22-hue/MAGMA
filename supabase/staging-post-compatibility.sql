-- Staging only: align the older posts table with Magma's current event model.
-- This is additive and safe to re-run.

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS event_date timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS venue text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_free boolean;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS price text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS open_collab boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS collab_description text;
