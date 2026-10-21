# Collaboration rollout

Implementation has two independent relationships: permission to add your own posts to a project, and accepted credit on an individual post. Neither changes `posts.author_id`, editing rights, moderation or audience. `open_collab` remains an open invitation to talk, not membership.

## Deployment order

1. Review `collaborations.sql` on staging after `colectivo_post_privacy.sql`. It adds `collaborations`, two invitation/contribution RPCs plus unlink RPC, read-only client grants, project-entry validation trigger and restricted public-entry reads. It does not rewrite existing entries or post ownership.
2. Run `test_collaborations.sql` as database administrator **on staging**, not production. It creates fresh random-UUID accounts and content inside one transaction and rolls everything back, including on a failed assertion when the transaction is rolled back. Do not use a SQL runner that commits statements independently. No real-user fixtures are needed.
3. Set `NEXT_PUBLIC_COLLABORATIONS_ENABLED=true` for staging and rebuild/restart Next. It defaults off so an unmigrated backend does not expose broken invitation controls. This is a presentation rollout gate, not authorization.
4. Complete the three-account browser checklist in `LAUNCH_TEST_CHECKLIST.md`, including private content, reload persistence, keyboard/mobile and network failures. Only then schedule production migration and enablement.

October 15 staging rollout: applied `collaborations.sql` through the authenticated SQL Editor to `magma-staging` (`jbzkdzcaqmxsmmyrlwif`). The rollback permission matrix passed on that database. Enabled `NEXT_PUBLIC_COLLABORATIONS_ENABLED=true` in local `.env.local`; verified the upload popup at `http://localhost:3001` displays “invitar colaboradores a esta publicación”. No hosted environment flag or production migration was changed. Full multi-account browser acceptance remains pending. Do not substitute a service-role client or weaken RLS to enable the feature.

## Local checks

`npm test` and `npx tsc --noEmit` cover helpers, mocked UI and integration source invariants.

October 15 verification: 64 tests passed; TypeScript and an optimized webpack build with the feature enabled and staging environment passed. Scoped lint has zero errors and one pre-existing hook-dependency warning. Build warnings about HEIC dynamic require and the middleware convention are unrelated to this feature. No live browser journey has been certified.

For real local PostgreSQL policy execution, install `@electric-sql/pglite` in a disposable temporary directory (not the application dependency tree), then run:

```sh
PGLITE_MODULE=/absolute/temporary/path/node_modules/@electric-sql/pglite/dist/index.js node tests/collaborations-db.mjs
```

The runner extracts real baseline table definitions and RLS from `schema.sql`, applies `colectivo_post_privacy.sql` and `collaborations.sql`, and executes the rollback matrix. It has no remote connection, secrets, email, or persistent test accounts. It cannot certify staging-specific triggers/policies or concurrent sessions; locking behavior also needs staging verification.

## UX and recovery

- October 20: project and post collaboration panels now reuse the upload/event username picker (two-character search, optional `@`, keyboard controls, removable selections, up to 20 accounts). Only owners see it; searching/selecting never sends. These panels send through the existing single-account RPC sequentially. A partial failure keeps failed/unsent accounts selected and reports the successful count; it does not claim atomic batch success. No database or permission changes. Local implementation; multi-account staging acceptance remains pending.
- Upload searches usernames and lets authors select/remove up to 20 recipients for post credit. Selected names use the existing comma-separated draft storage. Invitations are queued only after the post is saved; failures retain a link to that post. Retry invitations on its page, never publish a duplicate. Sensitive/review-held posts can queue invitations but recipients see/accept only after ordinary visibility permits.
- `/colaboraciones` is the signed-in invitation inbox, linked in both account menus and projects. No automatic email or direct message is sent. Open the resource to accept/decline; acceptance is idempotent. Withdrawn invitations cannot be accepted without a new invitation.
- New/existing entries are original-author contributions only. Project owners may remove a link; authors may withdraw a link even after membership removal. All other links and the post survive.
- Post editor project controls save each link immediately, independently of text changes, and say so explicitly. They never delete all links when choosing another project.
- Private colectivo posts cannot attach to projects. Credits on private posts require pre-existing colectivo membership and never add the private work to profile sections. Collaboration rows are hidden when the post itself is not readable; the original audience remains authoritative.
- Rollback of the UI: unset the public flag and rebuild. Leave the migration/data in place; legacy owner-only project inserts still work, with stronger database validation. Do not drop collaboration data to hide the feature.
