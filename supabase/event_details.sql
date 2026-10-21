-- Apply after reviewing on staging. Additive; existing events remain valid.
begin;
alter table public.posts
  add column if not exists event_end_date timestamptz,
  add column if not exists event_category text,
  add column if not exists event_link text,
  add column if not exists event_link_kind text,
  add column if not exists registration_required boolean,
  add column if not exists minimum_age integer,
  add column if not exists accessibility_info text;
alter table public.posts drop constraint if exists posts_event_details_valid;
alter table public.posts add constraint posts_event_details_valid check (
  (event_end_date is null or (event_date is not null and event_end_date > event_date))
  and (event_category is null or event_category in ('fiesta','exposición','concierto','taller','lectura','screening','mercado','otro'))
  and (event_link is null or (length(event_link) <= 2048 and event_link ~* '^https?://[^/@?#[:space:]]+([/?#][^[:space:]]*)?$'))
  and ((event_link is null and event_link_kind is null) or (event_link is not null and event_link_kind is not null and event_link_kind in ('tickets','registration')))
  and (minimum_age is null or minimum_age between 0 and 99)
  and (accessibility_info is null or length(accessibility_info) <= 1500)
);
-- Existing posts author/moderation RLS governs these fields; no new grants.
notify pgrst, 'reload schema';
commit;
