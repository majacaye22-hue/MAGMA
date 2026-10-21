# Event invitations

First version: hosts invite selected usernames from their event page. Invitees receive a separate card section in `/mensajes` and can change their private response between “voy”, “tal vez”, and “no puedo” until the event starts. Hosts see responses on the event page. No email, direct message, group chat, public attendance record or public guest list is created.

## Rollout

1. Apply `event_invitations.sql` after `colectivo_post_privacy.sql` on staging.
2. Execute `test_event_invitations.sql` as admin in one transaction; it rolls back all random-account fixtures. Do not use an independently committing SQL runner.
3. Enable `NEXT_PUBLIC_EVENT_INVITATIONS_ENABLED=true` and restart/rebuild the staging application only.
4. Verify with host, invited member and unrelated accounts: send, receive after mailbox refresh, each response, reload, repeat invite, private membership removal, blocks, hidden/deleted events, phone layout and keyboard controls.
5. Production migration and flag require a separate rollout. UI rollback: unset the flag, rebuild, preserve invitation records.

Database clients have SELECT only; mutations use authenticated RPCs. Invitations are unique per event/recipient and resending preserves responses. Batch sends are atomic (maximum 20); one unavailable account rejects the whole batch. Only approved, non-hidden future events accept invitations/responses. RLS checks current party identity, blocks in either direction and existing private-colectivo membership. Event details are fetched through current post RLS rather than copied into messages. Private/sensitive event artwork is not embedded in mailbox previews; opening the event uses its normal access controls.

Mailbox refreshes on focus, reconnect and every 15 seconds while visible. The section shows pending response count, not a global unread badge, and lists the most recent 100 invitations. Pagination, host cancellation, reminders and invitation rate limits beyond the batch cap are follow-up work before broad rollout.

Local verification: TypeScript, 72 tests, scoped lint and the PostgreSQL/PGlite permission matrix passed. Run the latter with `PGLITE_MODULE=/path/to/pglite/dist/index.js node tests/collaborations-db.mjs` (now runs both collaboration and event invitation matrices).

October 15 staging rollout: applied `event_invitations.sql` to `magma-staging` (`jbzkdzcaqmxsmmyrlwif`) through its authenticated SQL Editor after checking prerequisites and table absence. `test_event_invitations.sql` passed against deployed policies; all fixtures rolled back. Enabled `NEXT_PUBLIC_EVENT_INVITATIONS_ENABLED=true` in local `.env.local`, which points to staging. Verified the signed-in localhost:3001 mailbox shows the expandable invitations section, pending count, empty state and privacy copy without errors. No real invitations were sent. Full multi-account browser acceptance remains pending. No hosted deployment, Git push or production changes were made; this rollout is the staging database plus local preview.
