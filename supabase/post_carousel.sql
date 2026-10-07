-- Additive migration: existing posts keep their original media_url.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls text[];
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_image_urls_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_image_urls_check CHECK (
  image_urls IS NULL OR (
    type IN ('arte', 'fotografía')
    AND array_ndims(image_urls) = 1
    AND cardinality(image_urls) BETWEEN 1 AND 3
    AND array_position(image_urls, NULL) IS NULL
    AND array_position(image_urls, '') IS NULL
    AND media_url IS NOT NULL AND media_url = image_urls[1]
  )
);
NOTIFY pgrst, 'reload schema';
