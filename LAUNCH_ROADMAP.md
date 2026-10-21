# Magma — Path to Launch

Combined read from this session's audit (Cowork) + VS Code Claude Code's assessment, merged and cross-checked against the actual codebase. Goal: functional business launch by end of 2026.

## What's already shipped and solid

- Auth (email + username login, server-side, rate-limited)
- Profiles, 5 content types for posts
- Colectivos (private/public groups, join requests, member roles)
- Direct messages, with a **now-functional** block system (RLS-enforced both directions, not just a UI toggle)
- Radio: live stream, DJ approval, chat, slot-request review flow
- Tianguis (marketplace) listings
- Comments, bookmarks/collections
- Admin panel (radio settings, DJ approval, slot requests)
- Moderation dashboard (reports → resolve / delete post / delete comment)
- Security: RLS enabled and enforced across every table, stored XSS fixed, upload endpoint authenticated and validated, no PII leaks in logs, zero `tsc` errors

That's real, working functionality — not scaffolding. The technical foundation is in reasonable shape after this session's hardening pass.

## Gaps before a real public launch

- ~~**Mobile**~~ — **Done.** Viewport meta confirmed/set explicitly, navbar converted to a hamburger drawer below md, the two structurally-broken two-pane layouts (`/mensajes`, `/radio/dj`) now switch to single-panel on mobile, fixed-column forms (date/time pairs, category/type pickers, image thumbnails) reflow to fewer columns below md, and the remaining content grids (radio schedule/chat, tianguis listing, mod dashboard, collection thumbnails) all stack or resize appropriately. Verified at 375px throughout, `tsc` clean.
- **Notifications** — nothing emails or pushes when someone messages you, comments on your post, or approves you into a colectivo. Users will quietly churn without this.
- ~~**Payments**~~ — **Out of scope by decision.** Tianguis stays a listings/classifieds board; buyers and sellers arrange payment themselves off-platform. No in-app transaction layer or commission revenue planned. (Revenue is expected to come from the physical club, not the marketplace.)
- ~~**Password reset flow**~~ — **Built.** `/auth/forgot-password` and `/auth/reset-password` handle the full loop (request → email link → set new password → auto-logged-in redirect to `/`). **New launch blocker surfaced by this work:** Supabase's built-in email sender (used on staging) caps out around 2 emails/hour and isn't meant for production traffic. Before real users rely on this, production needs a real SMTP provider (Resend, Postmark, etc.) configured in Supabase → Project Settings → Auth → SMTP Settings — without it, password reset (and any other auth email) will silently fail to deliver past a couple of uses per hour.
- **No automated tests** — zero test files anywhere. Every fix has been verified by manual read + `tsc`, which doesn't scale past a solo audit pass.
- ~~**No staging environment**~~ — **Done.** Separate `magma-staging` Supabase project exists, `.env.local` points at it for local dev, production keys backed up in `.env.production.local`. Workflow established: build/test against staging first, push code (Vercel auto-deploys), then apply matching SQL changes to production manually.
- **No rate limiting beyond login** — post creation, uploads, messages, and listings can all be spammed without friction. Registration also has no rate limiting, worth pairing with the login limiter.
- **No terms of service or privacy policy** — needed before real users' data is involved.
- **Moderation structure and posting rules** — define what belongs on Magma, what is prohibited, how warnings/removals/appeals work, who can moderate, and how reports are reviewed consistently. The report dashboard exists technically, but the human policy and governance around it still need to be designed before launch.
- **Event-gating system** (single-use codes from live events → verified member tier, per the `AGENTS.md` product notes) — not built. Fine to leave for post-MVP, but it's the actual differentiator for the physical-club angle, not a nice-to-have forever.

### Since this was first written
- **All content now requires login.** Every route except `/auth/login` and `/auth/register` redirects logged-out visitors — no public browsing at all, by deliberate decision (protecting user posts from anonymous access). RLS enforces this at the data layer too, not just middleware.
- **RLS audit process.** A legacy "anyone can read posts" policy was found surviving underneath the formal RLS work — predated it, wasn't in any tracked SQL file. Led to a full audit of both databases against `pg_policies`; ~30 orphaned/legacy policies and 13 real auth-bypass gaps were found and cleaned up on production and staging. Worth re-running this kind of audit periodically, not just once, since it's how this one was found — by accident.

## Business-level, not code-level

- **Revenue model isn't defined yet.** Community platforms are notoriously hard to monetize directly. The physical club angle is a strong differentiator, but it depends on an actual event cadence existing first — that's real-world execution (venue, first events), not something engineering can shortcut.
- **Cold-start problem** — an empty feed kills retention regardless of code quality. Needs a plan for seeding the first wave of real content/users independent of any technical readiness.

## The 12-part future-proofing plan

This is the operating checklist for taking Magma from a working product to a durable CDMX community platform. New features should strengthen the central promise: **one place to discover the personal projects being made across CDMX.**

### 1. Keep personal projects at the center

- [ ] Make projects the clearest primary path from the homepage, navigation, and profiles.
- [ ] Let project entries document process, changes, references, failures, and finished work.
- [ ] Connect posts, events, radio appearances, and collaborations back to projects where relevant.
- [ ] Avoid turning Magma into a generic engagement feed.

**Complete when:** a new member can create a project, add different kinds of entries, and understand another person's project as an evolving body of work.

### 2. Maintain a flexible content model

- [ ] Support image, writing, audio, video, events, and process notes consistently.
- [x] Allow project association and comments on/off.
- [x] Add creator-controlled sensitive-content warnings with viewer consent to reveal.
- [ ] Establish draft, published, hidden, and archived states without destructive deletion.
- [ ] Keep schema changes in migrations instead of dashboard-only SQL.

**Complete when:** new creative formats and moderation states can be introduced without rebuilding the post system.

### 3. Move policy and configuration out of hardcoded application logic

- [x] Remove hardcoded owner UUIDs.
- [ ] Store roles and permissions in database-backed configuration.
- [ ] Add feature flags for unfinished or environment-specific features.
- [ ] Define sensitive-content categories and posting restrictions as configuration where practical.

**Complete when:** staging and production can have different administrators and feature availability without code edits.

### 4. Establish moderation before growth

- [x] Adopt the principle: **Magma moderates harm, not discomfort.**
- [x] Let creators label sensitive work and obscure it until viewers consent.
- [ ] Route reports into a consistent moderator workflow.
- [ ] Record moderation actions, reasons, and appeals.
- [ ] Add warnings and temporary posting restrictions for repeat violations.
- [ ] Review the rules with the initial moderator/community group.

Magma does **not** pre-approve every post. Work publishes immediately by default. Reports, severe-risk signals, and repeat abuse trigger review.

**Complete when:** two moderators can independently reach consistent decisions, explain them to members, and leave a private audit record.

### 5. Protect the staging-to-production workflow

- [x] Maintain separate Supabase staging and production projects.
- [x] Keep local development pointed at staging.
- [ ] Add a repeatable pre-deployment checklist.
- [ ] Back up production before schema or RLS changes.
- [ ] Verify every database change in staging before production.
- [ ] Document rollback procedures.

**Complete when:** another trusted maintainer can safely test, deploy, verify, and roll back a release.

### 6. Use proper database migrations

- [ ] Create timestamped migrations for every future schema, trigger, and RLS change.
- [ ] Reconcile the consolidated schema with the complete migration history.
- [ ] Add an automated check that a fresh database can be recreated from the repository.
- [ ] Stop relying on unrecorded SQL pasted into dashboards.

**Complete when:** staging can be rebuilt from zero and match production's structure and policies.

### 7. Design permissions for multiple roles

- [ ] Formalize member, project owner, colectivo member/admin, moderator, DJ, event collaborator, and platform administrator roles.
- [ ] Enforce every important permission through RLS or server-side APIs—not hidden buttons alone.
- [ ] Separate technical administration from community moderation.
- [ ] Test unauthorized actions directly against the API.

**Complete when:** every privileged action has an explicit role, server-side enforcement, and a tested denial path.

### 8. Make Magma operable by more than one person

- [ ] Document deployment, database restoration, credential rotation, and incident response.
- [ ] Document member support and moderation escalation.
- [ ] Give at least one trusted person emergency administrative access.
- [ ] Keep ownership of infrastructure in organization-controlled accounts where possible.

**Complete when:** Magma can continue operating safely if its founder is unavailable for a week.

### 9. Preserve creator ownership and portability

- [ ] Provide project/post export and media download.
- [ ] Provide a reliable account-deletion process.
- [ ] Preserve attribution when work is shared into colectivos or projects.
- [ ] Explain clearly how Magma stores, displays, and moderates creative work.

**Complete when:** a creator can understand, retrieve, and remove their contribution without contacting engineering.

### 10. Add privacy-respecting observability

- [ ] Capture registration, login, upload, media, and API failures.
- [ ] Monitor database and deployment health.
- [ ] Measure project creation, meaningful participation, and retention without invasive tracking.
- [ ] Track moderation response times and unresolved reports.
- [ ] Define alerts for urgent failures.

**Complete when:** failures are visible before members have to report them, without building surveillance profiles of creative behavior.

### 11. Resist premature expansion

- [x] Keep Magma CDMX-first.
- [x] Keep payments and multi-city infrastructure out of the launch scope.
- [ ] Evaluate new features against the personal-project discovery mission.
- [ ] Treat event codes, membership tiers, stickers, and broader city expansion as later phases unless real use demonstrates an immediate need.

**Complete when:** the launch scope is stable and new ideas are documented without automatically becoming blockers.

### 12. Meet a clear launch threshold

- [x] Authentication and password recovery work.
- [x] Upload, edit, project, and comment-control workflows work.
- [x] Core pages are mobile responsive.
- [ ] Moderation, reporting, appeals, and account restrictions are operational.
- [ ] Privacy policy, terms, and community rules are published.
- [ ] Backups, recovery, error monitoring, and deployment checks are documented and tested.
- [ ] A seeded first community of projects is ready before the public announcement.
- [ ] A final security and accessibility review passes.

**Complete when:** every unchecked launch requirement above is either finished or consciously removed from scope with a recorded reason.

## Feasible schedule: September–December 2026

An end-of-year launch remains realistic, but the practical target should be a **controlled public beta**, not a claim that every long-term system is finished.

### Phase 1 — Product core and moderation foundation

**September 15–October 11**

- Finish the sensitive-content experience and moderation workflow.
- Make personal projects and their journal entries the clearest product center.
- Introduce timestamped migrations and a deployment checklist.
- Resolve remaining broken or confusing core flows.

**Milestone:** feature-complete internal alpha on staging.

### Phase 2 — Operational safety

**October 12–November 8**

- Add role enforcement, moderation history, warnings, and appeals.
- Configure production email delivery and error monitoring.
- Add automated tests for auth, publishing, projects, comments, blocking, and permissions.
- Draft terms, privacy policy, and final community standards.

**Milestone:** invite-only beta with trusted CDMX creators.

### Phase 3 — Community seeding and hardening

**November 9–December 6**

- Onboard an initial group of creators and real projects.
- Observe where people get confused and repair those flows.
- Run security, accessibility, mobile, backup, and restore checks.
- Train the initial moderators and test report/appeal scenarios.

**Milestone:** launch candidate with real content and operating procedures.

### Phase 4 — Controlled public launch

**December 7–December 18**

- Freeze nonessential features.
- Resolve launch-blocking bugs only.
- Verify production configuration, backups, monitoring, and moderator coverage.
- Open registration gradually and watch system/community health closely.

**Target:** controlled public beta by **December 18, 2026**, leaving the rest of December for stabilization.

## What does not need to be finished before launch

- Multi-city support.
- In-app payments.
- Event-code membership gating.
- Full creator data export automation, if a documented manual export process exists temporarily.
- Stickers as comment responses.
- A sophisticated recommendation algorithm.

These remain valuable future work, but none should delay a safe, useful CDMX launch.

## Weekly operating rhythm

Every week:

1. Choose no more than three outcomes from this document.
2. Build and test them against staging.
3. Run type-checking, linting, and the relevant workflow tests.
4. Record every database change as a migration.
5. Review open safety, moderation, and privacy risks.
6. Move to production only after staging verification.
7. Update this checklist so it remains the source of truth.

## Bottom line

Magma can reach a controlled public beta by **December 18, 2026** if the work stays focused on projects, moderation, operational safety, and community seeding. The largest risk is no longer whether the product can be built; it is allowing new features to distract from making the core experience trustworthy, understandable, and populated with meaningful CDMX projects.
