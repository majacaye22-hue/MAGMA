-- Apply after profile_offerings.sql. Existing owner-only RLS remains unchanged.
ALTER TABLE public.profile_offerings ADD COLUMN IF NOT EXISTS cover_image_url text
  CHECK (cover_image_url IS NULL OR (char_length(cover_image_url) <= 2048 AND cover_image_url ~ '^https://[^/]+/storage/v1/object/public/media/'));
NOTIFY pgrst, 'reload schema';
