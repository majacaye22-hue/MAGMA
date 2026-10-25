-- Apply after post_carousel.sql. No posts, media, or access policies are changed.
BEGIN;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_image_urls_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_image_urls_check CHECK (
  image_urls IS NULL OR (
    type IN ('arte', 'fotografía')
    AND array_ndims(image_urls) = 1
    AND cardinality(image_urls) BETWEEN 1 AND 10
    AND array_position(image_urls, NULL) IS NULL
    AND array_position(image_urls, '') IS NULL
    AND media_url IS NOT NULL AND media_url = image_urls[1]
  )
);
NOTIFY pgrst, 'reload schema';
COMMIT;
