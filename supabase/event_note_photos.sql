-- Reflections: private images, visible only to the author or when shared.
BEGIN;
ALTER TABLE public.event_notes ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE public.event_notes ADD CONSTRAINT event_notes_image_owner
  CHECK (image_path IS NULL OR split_part(image_path, '/', 1) = user_id::text);
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-notes', 'event-notes', false, 8388608, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 8388608,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
CREATE POLICY "reflection photo owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "reflection photo read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-notes' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR EXISTS (
      SELECT 1 FROM public.event_notes n WHERE n.image_path = name AND n.is_public
    )
  ));
CREATE POLICY "reflection photo owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
NOTIFY pgrst, 'reload schema';
COMMIT;
