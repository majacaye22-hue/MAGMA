-- Ordinary posts publish immediately; sensitive content requires review.
BEGIN;
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
    NEW.moderation_status := CASE WHEN COALESCE(NEW.is_sensitive, false) THEN 'pending' ELSE 'approved' END;
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
    NEW.moderation_status := CASE
      WHEN COALESCE(NEW.is_sensitive, false) OR OLD.moderation_status = 'rejected'
        OR OLD.is_hidden OR (OLD.is_sensitive AND OLD.moderation_status = 'pending')
      THEN 'pending' ELSE 'approved' END;
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


-- Release ordinary posts held only by the previous blanket review rule.
ALTER TABLE public.posts DISABLE TRIGGER posts_enforce_moderation;
UPDATE public.posts p SET moderation_status = 'approved'
WHERE moderation_status = 'pending' AND NOT COALESCE(is_sensitive, false)
  AND NOT is_hidden AND moderated_by IS NULL AND moderation_note IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.moderation_actions a WHERE a.post_id = p.id);
ALTER TABLE public.posts ENABLE TRIGGER posts_enforce_moderation;
NOTIFY pgrst, 'reload schema';
COMMIT;
