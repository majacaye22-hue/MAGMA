-- Apply before deploying the updated registration endpoint. Existing members are unchanged.
BEGIN;
CREATE TABLE IF NOT EXISTS public.member_onboarding (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivation text NOT NULL CHECK (length(btrim(motivation)) BETWEEN 1 AND 1500),
  contribution text NOT NULL CHECK (length(btrim(contribution)) BETWEEN 1 AND 1500),
  version text NOT NULL,
  content_snapshot jsonb NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS member_onboarding_newest ON public.member_onboarding(accepted_at DESC, user_id);
ALTER TABLE public.member_onboarding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_onboarding FROM anon, authenticated;
GRANT SELECT ON public.member_onboarding TO authenticated;
GRANT ALL ON public.member_onboarding TO service_role;
DROP POLICY IF EXISTS "onboarding: self or owner read" ON public.member_onboarding;
CREATE POLICY "onboarding: self or owner read" ON public.member_onboarding FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR auth.uid() = (SELECT owner_user_id FROM public.app_config LIMIT 1));

-- Profile and private answers are committed together. Never put answers in Auth
-- user metadata, profiles, logs or public search indexes.
CREATE OR REPLACE FUNCTION public.register_member_profile(
  p_id uuid, p_username text, p_display_name text, p_location text,
  p_motivation text, p_contribution text, p_version text, p_snapshot jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_version IS NULL OR p_version <> '2026-10-20.v1' OR p_snapshot IS NULL THEN
    RAISE EXCEPTION 'invalid onboarding version';
  END IF;
  INSERT INTO public.profiles(id, username, display_name, location)
    VALUES (p_id, p_username, p_display_name, p_location);
  INSERT INTO public.member_onboarding(user_id, motivation, contribution, version, content_snapshot)
    VALUES (p_id, p_motivation, p_contribution, p_version, p_snapshot);
END;
$$;
REVOKE ALL ON FUNCTION public.register_member_profile(uuid,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_member_profile(uuid,text,text,text,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.review_member_onboarding(p_user_id uuid, p_reviewed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM (SELECT owner_user_id FROM public.app_config LIMIT 1) THEN
    RAISE EXCEPTION 'owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_reviewed IS NULL THEN RAISE EXCEPTION 'review state required'; END IF;
  UPDATE public.member_onboarding SET
    reviewed_at = CASE WHEN p_reviewed THEN now() ELSE NULL END,
    reviewed_by = CASE WHEN p_reviewed THEN auth.uid() ELSE NULL END
    WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'response not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_member_onboarding(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_member_onboarding(uuid,boolean) TO authenticated;

-- Supabase's public signup endpoint must not bypass the questionnaire. Only
-- the server Admin API can supply app_metadata (not user-editable metadata).
-- Existing users are not retroactively gated. New accounts must use our flow;
-- future OAuth/admin invitation flows must integrate onboarding explicitly.
CREATE OR REPLACE FUNCTION public.guard_new_member_onboarding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (NEW.raw_app_meta_data->>'magma_onboarding_version') IS DISTINCT FROM '2026-10-20.v1'
      OR NEW.email_confirmed_at IS NOT NULL THEN
      RAISE EXCEPTION 'use the Magma registration form' USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL
    AND NEW.raw_app_meta_data ? 'magma_onboarding_version'
    AND NOT EXISTS (SELECT 1 FROM public.member_onboarding WHERE user_id = NEW.id) THEN
    RAISE EXCEPTION 'complete Magma registration before confirming email' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_new_member_onboarding() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_new_member_onboarding ON auth.users;
CREATE TRIGGER guard_new_member_onboarding BEFORE INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.guard_new_member_onboarding();
COMMIT;
