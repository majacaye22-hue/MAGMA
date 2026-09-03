-- Staging only: first personal Casa customization layer.
-- Additive and safe to re-run.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casa_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casa_tone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casa_welcome text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casa_pinned_post_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casa_shelf_items text[] NOT NULL DEFAULT ARRAY['radio', 'cartel', 'objeto']::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casa_cartel_post_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casa_radio_post_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casa_objeto_post_id uuid;
