-- Run against staging before testing the content-warning UI.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
