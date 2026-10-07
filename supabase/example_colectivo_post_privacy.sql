-- Only the explicitly seeded, text-only example posts; never infer user-post origin.
UPDATE public.posts p SET audience_colectivo_id = cp.colectivo_id
FROM public.colectivo_posts cp, public.colectivos c, public.profiles a
WHERE cp.post_id=p.id AND c.id=cp.colectivo_id AND a.id=p.author_id
  AND c.created_by=p.author_id AND c.slug LIKE 'ejemplo-%'
  AND a.username ~ '^magma_prueba0[1-5]$'
  AND p.id::text LIKE 'e7a09281-0000-4000-9000-%'
  AND p.tags @> ARRAY['ejemplo-colectivo']::text[]
  AND p.type='escrito' AND p.media_url IS NULL AND p.audience_colectivo_id IS NULL;
