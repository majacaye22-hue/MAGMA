# Colectivo approval

Apply `colectivo_approval.sql` after `in_app_notifications.sql`. Applied to staging only; production requires separate rollout. Do not reapply older schema/RLS policies afterward: they allow self-admission.

- Existing members stay. Creators can bootstrap only their own admin membership.
- Both public and private colectivos require requests. Notes (max 500 characters) are visible only to the requester and admins.
- Authenticated RPCs serialize request, cancellation, and approval operations. Approval adds membership, updates status, and notifies atomically.
- Repeat pending requests and approvals are idempotent. Cancellation removes pending requests and related alerts. Rejected applicants or former members can request again.
- Direct self-admission and direct request mutation are blocked by database permissions.
- Notifications remain recipient-only; pending alerts disappear once reviewed or when admin access is lost.
- Browsing and content-sharing rules are unchanged. Invitations/email are not implemented.

Run `test_colectivo_approval.sql` as database administrator on staging. It simulates three existing accounts with an isolated colectivo, then rolls back everything.

Manual check: request as a non-member, reload, review via admin settings or bell notification, then open the result notification as the applicant. Also check cancellation and rejection. Test both public and private colectivos.
