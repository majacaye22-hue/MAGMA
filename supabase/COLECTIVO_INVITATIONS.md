# Account-bound colectivo invitations

Apply `colectivo_invitations.sql` after `colectivo_approval.sql` in staging first.
Applied on 2026-09-24 to staging `jbzkdzcaqmxsmmyrlwif`. The rollback suite in `test_colectivo_invitations.sql` passed, including chat-history privacy after invitation acceptance. Test fixtures and mutations were rolled back; no production data was changed.

The tests caught Supabase's default anonymous function grants. The migration now explicitly revokes execution from both PUBLIC and anon before granting authenticated access. The same correction was applied to staging.

Admins use colectivo settings to enter an exact @username, generate a link, and copy/send it manually. Creating another link revokes older unaccepted links for that recipient. Invitations expire in seven days. Acceptance requires a signed-in matching account and a button click (GET requests never create membership). Removing the inviting admin invalidates their outstanding invitations.

Staging verification with an admin, recipient, and unrelated account:

- Non-admin create/revoke calls fail; direct table mutations fail.
- Forwarded link cannot be accepted by the unrelated account; invitation rows remain private.
- Recipient accepts and gets exactly one member row; pending public request is cleared.
- Retry after acceptance does not duplicate membership.
- After leaving/removal, the used link cannot re-add the member.
- Revoked, expired, and regenerated old links fail.
- Signed-out acceptance returns through login to the invitation.
- Existing public request/approval flow still works.

Invited members automatically receive their colectivo chat through the existing membership trigger; earlier messages and previews remain hidden. TypeScript and targeted ESLint passed. A local HTTP check confirmed the signed-out invitation route redirects to login with its return URL intact. Signed-in browser click-through remains a manual check; database role/acceptance tests passed.
