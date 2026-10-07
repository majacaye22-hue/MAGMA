-- Run on staging first. Additive; preserves existing cover images and RLS.
ALTER TABLE public.colectivos
  ADD COLUMN IF NOT EXISTS cover_shape text NOT NULL DEFAULT 'vertical'
  CHECK (cover_shape IN ('horizontal', 'vertical'));
NOTIFY pgrst, 'reload schema';
