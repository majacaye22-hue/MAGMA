ALTER TABLE public.profile_offerings ADD COLUMN IF NOT EXISTS pdf_url text
  CHECK (pdf_url IS NULL OR (char_length(pdf_url) <= 2048 AND pdf_url ~ '^https://[^/]+/storage/v1/object/public/media/[0-9a-f-]+\.pdf$'));
-- Preserve all existing media types. NULL already permits all MIME types.
UPDATE storage.buckets SET allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
WHERE id = 'media' AND allowed_mime_types IS NOT NULL AND NOT ('application/pdf' = ANY(allowed_mime_types));
NOTIFY pgrst, 'reload schema';
