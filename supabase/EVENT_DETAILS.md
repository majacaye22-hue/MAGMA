# Event details — first implementation tranche

Local implementation, not deployed or applied to staging/production.

## Rollout

1. Review and apply `event_details.sql` on staging, using existing migration procedures.
2. Set `NEXT_PUBLIC_EVENT_DETAILS_ENABLED=true` on the staging app and rebuild/restart it. Default is off: new columns are not queried/written and the new input controls stay hidden until the schema is ready.
3. Test creation, draft save/resume, editing, listing/filtering and event detail on two accounts. Include an overnight event, a multiday exhibition, an event with no end time, and external tickets/registration.
4. Verify author-only edits still follow existing posts RLS. No grants or privacy changes are included.

This tranche adds external ticket/registration links, category, end date/time, minimum age, registration requirement and free-text accessibility. Map links use the event's existing address. No payment handling or third-party fetching is performed. Links open externally and allow only HTTP(S) without embedded credentials.

Start/end inputs use CDMX time consistently. Known end times govern completion; legacy events without an end remain actionable through their starting calendar day in CDMX. This is a fallback, not an inferred exact closing time. Existing timestamps are not backfilled or reinterpreted. Invitation RPCs retain their existing future-start-only rule pending the lifecycle tranche.

## Follow-up event management tranche

Organizer/participant links and cancellation/postponement notifications are now implemented locally in `event_management.sql`, behind a separate disabled-by-default flag. See `EVENT_MANAGEMENT.md` for ordering, permissions and hosted acceptance requirements. These associations remain distinct from post collaboration credits.

## Local verification

`node --test tests/event-details.test.cjs tests/event-preview.test.cjs tests/event-filters.test.cjs tests/post-detail.test.cjs`

`PGLITE_MODULE=/path/to/pglite/dist/index.js node tests/event-details-db.mjs`

The SQL test checks migration replay and constraints, not the existing production/staging RLS matrix. Hosted acceptance is still required before enabling the flag for users.
