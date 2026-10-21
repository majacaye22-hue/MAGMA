# Moderator team rollout

Applied `moderator_team.sql` to **magma-staging** on 2026-10-07 through Supabase
SQL Editor. With explicit user approval, configured @majmaj as the owner in
`app_config` and granted that account moderator access. Verified both functions
exist and that owner self-removal and unauthenticated role changes are rejected
in a rolled-back transaction. Production is unchanged; test before rollout there.

The user confirmed the staging test passed on 2026-10-07.

For an older database, the existing prerequisite migration order is
`add_post_content_warnings.sql`, `add_post_moderation_queue.sql`,
`add_soundcloud_embeds.sql`, `ordinary_posts_publish.sql`, then
`moderator_team.sql`. Do not reapply historical migrations to staging merely
because they are now committed; they have already been used there.

The in-app browser was signed in as @majma (a different, existing moderator),
so the owner-only team page correctly redirected to `/staff`. Sign in as @majmaj
to use team management. Do not transfer ownership to the browser's current account.

Prerequisites: profiles, reports, comments, posts and app_config from the existing
schema. `app_config` must contain the one intended owner UUID. The owner's profile
must already have moderator access to use `/mod`; ownership alone does not bypass
moderation RLS. No roles are assigned by the migration.

The migration protects moderator flags on profile insert/update, adds owner-only
`set_moderator`, and adds `moderate_report` for transactional hide, restore,
resolve and permanent delete actions. New report/access decisions are recorded in
`staff_activity`; approval/rejection records remain in `moderation_actions`.
Activity survives deletion of target content. Ordinary profile edits still work.
The role trigger intentionally rejects service-role role changes without an
authenticated owner; administrative repairs must be deliberate SQL maintenance.

Smoke test with disposable staging accounts/content:

1. Owner opens `/staff/team`, adds a test username and sees its audit entry.
2. New moderator signs in using their own account and opens `/mod`.
3. Ordinary member and moderator cannot use `set_moderator` or directly change
   `profiles.is_moderator`, including inserting a profile with that flag true.
4. Owner cannot revoke their own access; can revoke the test moderator. Revoked
   account cannot call either `review_post` or `moderate_report` even from an old tab.
5. Cancel rejection: no action. Approve/reject a pending post: one decision.
6. Report a comment with a parent post ID. Hide it: only comment is hidden.
   Restore: comment visible, reports resolved. Cancel delete: content retained.
7. Disconnect network: failed load is not shown as an empty queue; failed actions
   keep rows and show a retry/refresh message. Refresh after an ambiguous timeout.

No invitation emails/links are implemented. Friends must register first. No
password sharing is needed. Report mutations should use the RPC; legacy table
RLS still exists and not every possible direct API write is audited by this change.
