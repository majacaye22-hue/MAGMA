-- Optional personal origin; does not change CDMX product scope.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hometown text
  CHECK (char_length(hometown) <= 100);
NOTIFY pgrst, 'reload schema';
