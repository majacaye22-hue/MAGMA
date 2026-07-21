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
- **Password reset flow** — no dedicated page found in the codebase. Supabase can generate the reset link, but there's nothing styled to receive/handle it.
- **No automated tests** — zero test files anywhere. Every fix this session was verified by manual read + `tsc`, which doesn't scale past a solo audit pass.
- **No staging environment** — dev and (presumably) production point at the same single Supabase project. This already caused a real incident: an RLS test wrote `"HACKED"` into a live production record mid-session. Harmless that time; won't always be.
- **No rate limiting beyond login** — post creation, uploads, messages, and listings can all be spammed without friction.
- **No terms of service or privacy policy** — needed before real users' data is involved.
- **Event-gating system** (single-use codes from live events → verified member tier, per the `AGENTS.md` product notes) — not built. Fine to leave for post-MVP, but it's the actual differentiator for the physical-club angle, not a nice-to-have forever.

## Business-level, not code-level

- **Revenue model isn't defined yet.** Community platforms are notoriously hard to monetize directly. The physical club angle is a strong differentiator, but it depends on an actual event cadence existing first — that's real-world execution (venue, first events), not something engineering can shortcut.
- **Cold-start problem** — an empty feed kills retention regardless of code quality. Needs a plan for seeding the first wave of real content/users independent of any technical readiness.

## Housekeeping

There's uncommitted work sitting in the working directory again (the XSS fix, the block-user fix, the `AGENTS.md` roadmap note, plus a `package.json`/`package-lock.json` change from the DOMPurify install). Worth committing before it piles up further or gets lost.

## Bottom line

End of year is realistic for a real public launch **if mobile gets prioritized now** and payments/event-gating are accepted as post-launch additions rather than launch blockers. The technical foundation is solid enough to build on. The bigger risk at this point is product and community (revenue model, cold start, physical event cadence) rather than engineering.

**Open question to resolve next:** what's the actual timeline target, and has mobile been worked on separately from what's in this repo?
