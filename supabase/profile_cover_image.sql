-- User-uploaded profile cover images. Apply to staging first, then production.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_image_url text;

NOTIFY pgrst, 'reload schema';
