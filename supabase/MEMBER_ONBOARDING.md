# Intentional member onboarding

Status: migration applied to **magma-staging** (`jbzkdzcaqmxsmmyrlwif`) on October 20, 2026. The matching local app uses this backend. Production is unchanged; no hosted frontend deployment was performed.

Staging verification: rollback-only `test_member_onboarding.sql` passed against the deployed functions and policies. Verified atomic profile/answer rollback, member self-read, outsider/anonymous denial, owner review/unreview, direct-signup denial and confirmation prerequisites. Final read-only checks found zero leftover test accounts/profiles/answers, with RLS and the signup trigger enabled. No emails were sent. The configured owner is `@majmaj`; a different signed-in account does not receive owner review access.

## Flow and storage

`/auth/register` introduces Magma, embeds the existing full manifesto, shows five community agreements, asks two questions, collects explicit consent and then asks for account credentials. Answers remain in component memory while moving between steps (not browser storage); reload before submission clears the unsaved draft. No answers or credentials are put in URLs.

`/api/auth/register` validates trimmed nonempty answers (maximum 1500 characters each) and the current agreement version. It creates an unconfirmed Auth user, then calls service-only `register_member_profile` to insert the profile and answers in one transaction. On persistence failure it attempts to remove only that newly created Auth account and does not send confirmation. On cleanup failure the response directs the person to contact Magma rather than claiming success. On email delivery failure, saved answers remain and the existing resend UI can retry.

Answers live in `public.member_onboarding`, separate from public profiles and Auth metadata. Only the member themself and the configured `app_config.owner_user_id` can SELECT a record. Ordinary moderators and other members cannot read it. Authenticated users cannot insert, edit or delete answers. Owner-only `review_member_onboarding` changes only the review timestamp and reviewer; it never changes membership or moderation permissions. Deleting the Auth account cascades through its profile to the answers. There is no new self-service account deletion or answer-editing UI in this version.

The record includes the actual question, agreement and privacy text shown, version and server acceptance time. Update both `lib/onboarding.ts` and the SQL version validation when this content changes. Existing records preserve their snapshots; existing members do not need to complete onboarding retroactively.

## Auth bypass prevention

`guard_new_member_onboarding` on `auth.users` requires a version marker in server-controlled `raw_app_meta_data` for every new account and rejects preconfirmed creation. The application Admin API sets the marker; public signup can only set user metadata, so cannot forge it. Newly marked users cannot confirm their email until their answers exist. Existing unmarked users can confirm as before.

This intentionally means **new users must use Magma registration**. Future OAuth, phone signup, Supabase dashboard account creation and admin invitation flows need an explicit integration. Never disable the guard as an unreviewed workaround. The only current account creation path found in the app is `/api/auth/register`.

## Staging acceptance

The user confirmed that the staging test passed on October 20, 2026, after testing the onboarding and red signup-email changes. This is user-reported acceptance; the individual checks below remain the reference for broader regression testing, not a claim that every failure scenario was exercised. Production remains unchanged. Local commits are authorized; pushing is not.

## Rollout and remaining acceptance checks

1. Confirm staging project identity and owner in `app_config`. Do not run against production unintentionally.
2. Staging database migration is complete and local app code matches it. Any separately hosted staging frontend must also use the matching code before offering registration: the old endpoint lacks the Auth marker. Future environment rollouts must coordinate migration and app deployment.
3. Use a disposable account and an inbox controlled by the tester. Confirm the real Supabase Admin creation + resend flow, answers surviving verification, and login after confirmation. Do not auto-confirm users or send mail to arbitrary addresses.
4. Open `/staff` → `respuestas de ingreso` as owner; test username search, empty state, pagination and review/unreview persistence. Confirm a separate ordinary member and moderator cannot read the new record through the REST API or change its review status.
5. Check direct public Auth signup is denied; verify existing users still log in/reset passwords/confirm outstanding emails. Test a mail-delivery failure without deleting the saved answers.
6. Only then consider a separately authorized production rollout. No push, hosted frontend deployment or production migration was performed by this work.

If rolling the application back, do so in a maintenance window and explicitly review/remove the new Auth trigger as part of rollback; do not delete the answers table. Keep collected private records protected.

## Local checks

- `supabase/test_member_onboarding.sql`: rollback-only integration checks, passed against staging on October 20. Creates synthetic fixtures inside one transaction and rolls all of them back; no mail or changes to existing members.

- `node --test tests/onboarding.test.cjs`: validation, consent/version, missing migration, successful save ordering, rollback and mail/cleanup failures using mocked Auth/database clients.
- `PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/onboarding-db.mjs`: runs real migration against local PostgreSQL, checks repeated apply, service-only registration, atomic rollback, read permissions, immutable answers, owner review/unreview, direct Auth bypass rejection, confirmation prerequisite and deletion cascade. No remote data is used.
- Browser preview can exercise steps, validation, manifesto and back-navigation without submitting an account. Full live email verification is a separate staging acceptance check, not established by these local tests.
