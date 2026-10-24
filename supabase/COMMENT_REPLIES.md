# Comment replies

## Current status

Implemented behind `NEXT_PUBLIC_COMMENT_REPLIES_ENABLED=true` (default off). On October 22, applied `supabase/comment_replies.sql` to staging project `jbzkdzcaqmxsmmyrlwif` only. Verified the UUID parent column, self-FK with `ON DELETE SET NULL`, enabled validation trigger, parent index and existing RLS. Production is unchanged.

On October 23, the user confirmed both the inline composer and a reply from a second account worked locally against staging. On October 24, the hosted preview rollout was authorized. The flag is scoped only to `codex/magma-preview`; production remains disabled. The additional browser acceptance scenarios below remain a checklist, not a claim that every scenario was manually tested.

### October 22 browser check

- Codex in-app browser, signed in as `@majma`, local frontend against staging; uncommitted working tree on `codex/magma-preview`.
- On post `d83118e1-826d-4d0b-baa8-5612ef53dac0`, clicking “responder” selected the first root and focused the composer.
- Submitted one labeled fixture: `prueba de respuestas · 22 octubre: este mensaje debe quedar dentro del hilo.` It appeared beneath the first root, cleared the composer and raised the detail total from 15 to 16.
- Reload confirmed persistence, nested placement and total 16. The fixture remains; the original 15 comments were not changed. Existing notification behavior was not disabled for this write.
- 117 automated tests and TypeScript passed. A second account, feed count, hosted frontend, mobile layout and the remaining acceptance scenarios below are not yet browser-verified.

One-level threads use `comments.parent_id`. The composer opens directly beneath the clicked comment and labels its author. Replying within a thread still targets its root in storage; this is a thread response, not a separate mention notification. Switching targets and cancelling keep the draft. A failed send keeps both text and target. Deleted parents leave replies as standalone comments. Hidden or inaccessible parents cannot receive new replies. Existing comment notification behavior is unchanged.

## Local verification

- `npm test`: grouping and mocked composer tests, including reply writes, cancellation, failed sends, rollout off, hidden targets and closed comments.
- `npx tsc --noEmit`.
- With a temporary PGlite installation, set `PGLITE_MODULE` to its absolute `dist/index.js` path and run `node tests/comment-replies-db.mjs` and `node tests/comment-replies-rls-db.mjs`.
- The RLS harness uses real baseline policies and `colectivo_post_privacy.sql`, not the full hosted migration stack. It verifies three synthetic users, private visibility and membership loss, foreign author write denial, hidden targets, closed comments, immutable threads, repeated migration and parent deletion. It creates no hosted records.

## Staging rollout and acceptance

1. Confirm project `jbzkdzcaqmxsmmyrlwif` and staging credentials. Apply `supabase/comment_replies.sql` in that project only. Verify the parent foreign key, trigger and index; the migration requests a PostgREST schema reload.
2. Enable `NEXT_PUBLIC_COMMENT_REPLIES_ENABLED=true` locally against staging and on the existing `codex/magma-preview` deployment only. Restart/rebuild; public flags are compiled into client bundles. Do not change production.
3. With approved test accounts A and B, create a disposable comment and reply on a designated staging post. Reload as both users and verify thread placement and total feed comment count.
4. Reply from within the thread, cancel a draft, edit/delete your own reply, and verify another member cannot edit/delete it. Delete a disposable root and confirm the other member's reply remains readable.
5. Verify closed comments, a hidden root, a private colectivo outsider and a removed member. Test keyboard focus and phone-width wrapping. Interrupt a send and verify text is retained without a false success.
6. Record browser, accounts, commit, observed results and fixture cleanup. Existing comment notifications should remain permission-safe; dedicated reply notifications are not implemented.

Disable the flag and rebuild to stop new reply actions if acceptance fails. Keep the additive column and existing replies; do not drop stored conversation data as a rollback.
