ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS soundcloud_url text;

CREATE OR REPLACE FUNCTION public.enforce_post_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_moderator boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_moderator = true
  ) INTO actor_is_moderator;

  IF actor_is_moderator THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_note := NULL;
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    RETURN NEW;
  END IF;

  IF ROW(NEW.title, NEW.body, NEW.content, NEW.type, NEW.media_url,
         NEW.soundcloud_url, NEW.media_base64, NEW.cover_url, NEW.tags,
         NEW.event_date, NEW.venue, NEW.address, NEW.open_collab,
         NEW.collab_description, NEW.is_sensitive)
     IS DISTINCT FROM
     ROW(OLD.title, OLD.body, OLD.content, OLD.type, OLD.media_url,
         OLD.soundcloud_url, OLD.media_base64, OLD.cover_url, OLD.tags,
         OLD.event_date, OLD.venue, OLD.address, OLD.open_collab,
         OLD.collab_description, OLD.is_sensitive) THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_note := NULL;
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
  ELSE
    NEW.moderation_status := OLD.moderation_status;
    NEW.moderation_note := OLD.moderation_note;
    NEW.moderated_at := OLD.moderated_at;
    NEW.moderated_by := OLD.moderated_by;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
