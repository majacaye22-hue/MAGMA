# Event people and lifecycle

October 21: applied to magma-staging only; hosted rollback role/notification checks in `test_staging_features.sql` passed and staging-only flags configured. Authenticated browser acceptance remains pending. Production unchanged. No email or payment processing.

## Enable safely

1. Apply the existing notifications migrations (through post mentions), colectivo post privacy, `event_details.sql`, and `event_invitations.sql` first.
2. Review and apply `event_management.sql` once on staging. It adds organizer/participant associations, event status fields, RLS, and transactional notification/RSVP triggers.
3. Enable `NEXT_PUBLIC_EVENT_MANAGEMENT_ENABLED=true` and `NEXT_PUBLIC_EVENT_DETAILS_ENABLED=true`, then rebuild. Management defaults off, avoiding queries to missing columns/tables. Existing invitation UI retains its separate feature flag.
4. Complete the two-account acceptance checks below before release. Do not enable against an unmigrated database.

## Product behavior

- The event detail page has separate **organiza** and **participan** links. The event author searches profiles, publicly listed colectivos, or projects, selects a result, and explicitly adds a link. These are attributed informational associations, not accepted coauthor credits, project invitations, or editing access. The UI states that linked entities have not necessarily confirmed.
- Event authors can remove any association; linked individuals or owners of linked colectivos/projects can withdraw their own. Duplicate links within a role are rejected. Reading follows event/target visibility and bidirectional blocks; unlisted colectivos cannot be linked. Nothing changes post ownership or audience.
- Authors can mark an event cancelled or postponed, with an explanation and confirmation. The status displays on detail pages, event cards and invitations. Closed events lose external ticket/registration actions and attendance/RSVP controls; database triggers also reject new invitations/RSVPs/attendance. Existing attendance records remain; withdrawal is still allowed.
- To reschedule, edit dates first, then return to “programado”; this requires a future start. Each action is saved separately. Date/location edits also notify, so this two-step path can produce two truthful updates (new details while postponed, then reactivation). The existing invitation RPC still requires a future start.
- Status, explanation, start/end, venue and address changes to approved events notify attendees and non-declined invitees **in the notification bell**, linking directly to the event. Delivery is transactional with the post update, deduplicated across attendance and invitations, and excludes the author, blocked users and recipients without current audience access. Read-time checks handle later blocks, membership loss and moderation. No email, refund, or confirmed-attendance reset is implied.
- Status changes use an expected version to catch stale screens; exact no-op writes do not send notifications. Link changes do not notify linked entities or grant them permissions.

## Verification

`npm test` includes management UI, closed invitation controls and existing event regressions. `npx tsc --noEmit` and scoped ESLint check integration.

`PGLITE_MODULE=/path/to/pglite/dist/index.js node tests/event-management-db.mjs`

The local SQL test loads real baseline tables/RLS and privacy/invitation migrations. Its notifications fixture deliberately omits unrelated comment/message triggers; it is not a substitute for the full hosted migration stack.

Hosted acceptance: link each target type, remove own/other links on two accounts, verify private/unlisted and blocked cases; cancel/postpone with attendee + invitee overlap; inspect bell/read state and navigation; attempt stale responses; leave the private colectivo and verify notifications disappear; reprogram, verify future date and status, and confirm original artwork permissions remain unchanged.
