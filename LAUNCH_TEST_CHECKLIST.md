# Magma technical readiness — 2026-10-14

Scope: functionality, access control, reliability and launch operations. Visual identity is being developed separately. This is a code/test baseline, not a completed staging security audit or launch sign-off. No production mutations, new accounts, messages or test content were created during this audit.

## Baseline verified October 14

### October 15 addition: event invitations (staging migrated, local preview enabled)

- [x] Local PostgreSQL permission matrix: only host invites, only recipient responds, no direct table writes, duplicates preserve responses, outsiders cannot read, blocks/private membership/hidden events respected, past events cannot receive responses.
- [x] Component checks: host invitation submission, recipient RSVP, failure feedback, private image suppression, closed responses after start. TypeScript passed.
- [x] Applied `supabase/event_invitations.sql` to staging `jbzkdzcaqmxsmmyrlwif`; rollback permission tests passed on deployed policies. Enabled `NEXT_PUBLIC_EVENT_INVITATIONS_ENABLED=true` in local staging-backed preview and verified mailbox section/empty state in-browser. No hosted deployment or production changes.
- [ ] Verify host → mailbox → response → host with separate accounts, mobile/keyboard, reload and network recovery. Confirm public attendance/profile and existing chats stay unchanged.
- [ ] Production rollout separately reviewed; see `supabase/EVENT_INVITATIONS.md`.

### October 15 addition: collaboration rollout (staging migrated, local preview enabled)

- [x] Implement separate project-contributor and individual-post credit invitations, with acceptance, rejection, owner removal and self-withdrawal.
- [x] Local PostgreSQL/PGlite: apply actual collaboration migration against baseline policies plus colectivo privacy migration; execute rollback permission matrix (including direct-table bypass attempts, private audience, blocks, post ownership and retained contributions).
- [x] Unit/mocked UI and source checks: full suite **64 passed**, TypeScript passed; scoped ESLint has no errors (one existing post-editor hook warning).
- [x] Optimized webpack build with collaboration flag enabled and staging environment passed after allowing the existing Google Font download. Existing HEIC dynamic-require and middleware-deprecation warnings remain. No deployment was performed.
- [x] Applied `supabase/collaborations.sql` to staging `jbzkdzcaqmxsmmyrlwif` through SQL Editor; rollback permission matrix passed against deployed policies. Test fixtures rolled back.
- [x] Enabled local `.env.local` flag; verified localhost:3001 “subir obra” popup contains “invitar colaboradores a esta publicación”. Hosted environment flags and production unchanged.
- [ ] Enable `NEXT_PUBLIC_COLLABORATIONS_ENABLED=true` on staging, rebuild/restart, test desktop/mobile and keyboard flows with owner, collaborator and unrelated accounts.
- [ ] Verify upload invitation failures preserve the saved post and retry from its collaboration panel; drafts retain invite usernames.
- [ ] Accept project invite, add new/existing posts, reload and verify both authors' profiles. Remove collaborator, deny a new entry, retain previous entries, withdraw an entry without deleting its post or other project links.
- [ ] Accept post credit, verify byline/credited profile section; deny editing/deleting someone else's post; withdraw credit; verify that project permissions remain independent.
- [ ] Verify private colectivo credit invitations with members/nonmembers, membership removal, hidden/pending posts, blocks and signed-out access. Private content must never appear in projects or credited profile sections.
- [ ] Deployment/build smoke check and production migration/enablement separately approved before inviting friends. See `supabase/COLLABORATIONS.md`.

- `npm test`: **53 passed, 0 failed** across 15 test files. Includes helper assertions, source checks and mocked component/query behavior; not 53 live end-to-end journeys.
- `npx tsc --noEmit`: **passed**.
- `npm run lint`: **0 errors, 15 warnings**; hook dependencies, unused code/directives and image optimization. Also emits a JSX lint-tool diagnostic for a non-null expression.
- Production build: **not run in this audit**. A controlled staging-backed build and deployed smoke test remain required; local development success is insufficient.
- No browser E2E runner/configuration or `.github` CI workflow found in the inspected repository. SQL rollback tests exist but are not invoked by `npm test`.
- Working tree contains substantial uncommitted feature work and unrelated local files. No commit/push performed. Separate concerns and exclude personal/local files before handoff.

Status language: **Built** means code exists; **automated partial** means limited regression checks passed; **live pending** means no fresh recorded acceptance run. Historical test reports in the project map are not fresh verification.

## Journey inventory

| Area | Evidence now | Acceptance still needed |
| --- | --- | --- |
| Signup, login, confirmation, reset | Built; no dedicated auth test suite found | Fresh signup/confirmation/recovery email, expired links, session expiry and delivery failure |
| Posts, editing, drafts, comments, collections | Built; partial media/detail tests | Full create/edit/reload journeys for each format; interrupted uploads; non-owner denial; no duplicate publish |
| Portfolio, covers, PDFs | Built; validation/URL/config checks pass; PDF workflow verified working by user October 14 | Broader browser/device coverage, replace/remove/reload, keyboard focus, size boundaries and failed-save regression remain unrecorded; do not repeat the basic PDF acceptance test |
| Projects | Built; no dedicated full journey test found | Create/edit/attach/detach, ownership, inaccessible linked posts, persistence |
| Colectivos | Built; SQL test scripts and historical staging results | Two-account approval/invitation/revocation; private media and prior-history denial; removed/rejoined member |
| Direct/group messages | Built; mocked history/idempotency checks pass | Two-account delivery, inbox updates, reconnect, blocked pairs, reference persistence/removal and scrolling |
| Moderation/staff | Built; mocked UI/source checks pass | Real role matrix, direct API/RPC denial, audit entries, hide/restore across every surface, revoke moderator access |
| Search/círculo/ecos | Built; partial search/circle tests plus echo SQL script | Private/hidden exclusion, persistence, deleted originals and blocked accounts |
| Events/agenda/notifications | Built; partial date/preview tests plus notification SQL script | Attendance persistence; recipient isolation; permission-safe notification links; read state |

## P0 — establish trustworthy launch gates

### Moderation source review — October 14

15 targeted moderation/hidden-post/navbar/restore tests passed. Source checks show `/mod` requires `is_moderator`; team management requires the configured owner; role-change trigger/RPC prevent member self-promotion; hide/report and restore RPCs check moderator role and insert audit records. Restore only clears `is_hidden`, leaving approval state unchanged. These are source/mocked results, not a fresh deployed policy test.

Two findings require follow-up before sign-off:

October 14 follow-up: user chose owner-only permanent moderation deletion. Implemented server-gated UI and staging migration `owner_only_moderation_delete.sql` (restrictive DELETE policies, RPC owner check, immutable authenticated authorship). Authors' own-content deletion remains. Source/UI regression tests pass; full cross-account destructive fixture tests remain pending. No real content deleted. The direct UPDATE/audit-trail finding below remains open.

- **Governance decision:** `moderator_team.sql` permits any moderator to permanently delete reported posts/comments through `moderate_report`. Base post DELETE policy also permits moderators. Confirm whether permanent moderation deletion should instead be owner-only; preserve authors' separate rights to their own content.
- **Audit bypass risk in source:** base schema grants moderators direct post UPDATE/DELETE and the moderation trigger returns immediately for moderators. Audit inserts live in the review/report/restore RPCs. Inspect effective deployed policies/triggers and test direct API writes with disposable fixtures; do not assume use of the dashboard enforces an audit trail. No such writes were attempted on real content.

No live posts, reports or roles were changed during this review.

- [ ] **Create a reproducible staging test setup.** Identify approved disposable member A/member B/moderator/owner accounts and fixtures. Record exact environment, commit and browser for every run. No real-content deletion or unsolicited messages.
- [ ] **Run role/access matrix against deployed RLS**, not only visible buttons: signed out, owner, other member, blocked member, colectivo member/outsider, moderator and site owner. Cover SELECT/INSERT/UPDATE/DELETE and RPC access. Existing SQL scripts are a starting point; inspect rollback boundaries before running.
- [ ] **Verify authentication end to end.** Confirmation enforcement, SMTP delivery, redirect allowlist, reset links and refresh/logout. Registration uses a per-process in-memory limiter (`app/api/auth/register/route.ts`); verify/configure distributed limits before public launch. Do not assume infrastructure limits are configured.
- [ ] **Create ordered migration/environment manifest.** SQL files are applied individually; the map records multiple staging-only changes. Rehearse on an isolated database; define prerequisites, verification and recovery. Explicitly handle portfolio's staging-project feature gate before production enablement.
- [ ] **Check environment isolation.** `middleware.ts` has a production fallback when Supabase configuration is missing. Review fail-closed configuration so tests/dev cannot silently select production. No credentials in audit logs.
- [ ] **Controlled production-mode build and smoke test with staging configuration.** Do not deploy or change production as part of verification. Record build output and route failures.
- [ ] **Verify backup and restore capability** for database AND media, operational ownership, and recovery procedure. Provider settings were not inspected in this audit.

## P1 — complete regression coverage and reliability

- [ ] Add browser E2E coverage for the core journeys above; start with signup/login, publish, portfolio/PDF/message, moderator hide/restore.
- [x] Basic PDF workflow: user confirmed it is working on October 14. Accepted as user-verified; exact browser/device and individual steps were not specified. This does not certify every browser, boundary/error case or automated E2E coverage. The 10 MB proxy truncation fix remains covered by a configuration regression test.
- [ ] Exercise offline/timeout/403/500 cases and rapid double-clicks. Preserve drafts; show errors at the relevant action; prove retries do not duplicate writes.
- [ ] Audit uploads beyond filename/MIME: authorization, byte validation, storage constraints, public/private URL behavior, allowed sizes and cleanup of orphaned uploads. PDF magic-header checks are not full document validation or malware scanning. Public portfolio files remain accessible by URL; document that boundary explicitly.
- [ ] Measure warm/cold auth/post timings and inbox query counts with realistic fixtures. `app/mensajes/page.tsx` currently fetches latest message and unread existence per conversation: two extra queries per conversation; batching/pagination need evaluation before growth.
- [ ] Check native dialog keyboard focus/Escape, phone back navigation, long text, empty states and browser console errors. No identity redesign.
- [ ] Triage all 15 lint warnings; prioritize hook dependencies before cosmetic cleanup.
- [ ] Add CI gates for tests, typecheck, lint and a safely configured build. Add staging-only browser/RLS gates without exposing privileged credentials.
- [ ] Verify runtime error reporting, upload/auth failure visibility, uptime alerts and provider quota monitoring. No monitoring/backup status was verified live today; earlier dashboard quota notices require a current check.
- [ ] Update operational README with environment setup, test commands, migration order and recovery instructions; current README is generic framework boilerplate.

## Explicit product decisions / deferred work

- Moderator access management exists for existing usernames; moderator email invitations are not evidenced in the inspected staff code. Decide whether required before launch; do not label them complete because Resend exists.
- Keep radio/live salas and future presence-based membership outside the initial acceptance scope unless explicitly promoted from deferred status.
- Do not treat new visual identity or additional portfolio galleries as technical launch blockers.

## Recording a completed acceptance run

For each checklist item record: date, environment, commit, tester/browser, fixture/account roles (no credentials), actions, expected result, observed result, evidence, cleanup and remaining defect. Mark complete only after the observed result matches.

Next execution batch: approved staging accounts -> moderation permissions/hide/restore -> auth email/recovery. Basic PDF workflow is already user-verified and is not a blocker for this batch. The account/fixture setup precedes mutation tests.

---

## Earlier core journey checklist — 2026-09-22 (retained)

Implementation changes are not evidence of a successful live journey. Use a dedicated test account and an agreed non-production dataset. Do not delete existing user data.

## Configuration gates

- Confirm Supabase requires email confirmation and has working SMTP.
- Allowlist the actual login redirect URL for confirmation emails.
- Configure distributed/edge signup limits; the route's in-memory limit is only supplemental.
- Verify deployed RLS for comments, collections, collection_posts, event_attendances, post_projects and colectivo_posts using owner and non-owner accounts.

## Live acceptance tests (pending)

- Signup: valid account receives email, cannot sign in before confirmation, can sign in after confirmation. Resend delivery failures are visible. Existing accounts remain accessible.
- Save: add/remove a post in a collection; reload both post and collection; confirm persisted state. Deny a write and confirm no false success. Double-click must not create duplicate requests.
- Comments: create, immediately edit, immediately delete, then reload. Failed writes retain text/content and display an error. Non-owner cannot edit/delete.
- Publish: image, music, video, writing and event. Confirm author profile and individual page. Force project/colectivo attachment failure: existing post link remains available and publish cannot duplicate it.
- Profile: failed collections/projects/agenda reads show an error and retry works.
- Attendance: toggle, reload, verify agenda; failed initial read does not masquerade as not attending.
- Check keyboard and mobile layouts, menu positions, empty states and browser console on all above routes.

No live test data has been created by the implementation work.
