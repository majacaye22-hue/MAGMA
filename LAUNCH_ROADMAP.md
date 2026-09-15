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

## Bottom line

End of year is realistic for a real public launch **if mobile gets prioritized now** and payments/event-gating are accepted as post-launch additions rather than launch blockers. The technical foundation is solid enough to build on. The bigger risk at this point is product and community (revenue model, cold start, physical event cadence) rather than engineering.

**Open question to resolve next:** what's the actual timeline target, and has mobile been worked on separately from what's in this repo?
