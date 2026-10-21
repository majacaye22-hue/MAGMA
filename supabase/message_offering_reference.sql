-- Optional snapshot travels with the message, not the conversation.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS offering_reference jsonb
  CHECK (offering_reference IS NULL OR
    (jsonb_typeof(offering_reference) = 'object' AND
     offering_reference ?& ARRAY['id','title','username'] AND
     jsonb_typeof(offering_reference->'id') = 'string' AND
     jsonb_typeof(offering_reference->'title') = 'string' AND
     jsonb_typeof(offering_reference->'username') = 'string' AND
     (offering_reference->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
     char_length(offering_reference->>'title') BETWEEN 1 AND 80 AND
     char_length(offering_reference->>'username') BETWEEN 1 AND 100 AND
     octet_length(offering_reference::text) < 2048));
NOTIFY pgrst, 'reload schema';
