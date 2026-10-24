# MAGMA — Roles and Product Map

**Purpose:** Canonical running inventory of Magma's people, permissions, pages, and internal tools.
**Last updated:** October 24, 2026

Update this file whenever a role, route, major workflow, or product area is added, removed, or renamed.

## Staging feature activation — October 21

- Applied `event_details.sql`, `event_management.sql` and `community_questions.sql` to `magma-staging` (`jbzkdzcaqmxsmmyrlwif`) only. Existing collaboration/invitation migrations were already present with RLS enabled.
- `supabase/test_staging_features.sql` passed against the full hosted migration stack, using synthetic accounts in a rollback-only transaction. It covers pending-invite isolation, post credit versus project membership, contribution retention/withdrawal, event roles and participant removal, cancellation deduplication, stale status writes, closed RSVP rejection, private notification removal after membership loss, anonymous author/read isolation, private reply notifications, identity-safe blocking/reset, idempotency and quota after deletion.
- Updated older rollback test fixtures to satisfy the current signup guard; the guard itself is unchanged. No real invitations, notifications or emails were sent.
- Configured all five flags (`COLLABORATIONS`, `EVENT_INVITATIONS`, `EVENT_DETAILS`, `EVENT_MANAGEMENT`, `COMMUNITY_QUESTIONS`, each prefixed `NEXT_PUBLIC_` and suffixed `_ENABLED`) for `codex/magma-preview` only. Production flags, credentials and database remain unchanged. Authenticated browser acceptance still requires a signed-in staging session; SQL checks are not a substitute for that UI journey.

## Hosted staging release — October 20

- All current Magma implementation and research sources are committed and pushed to `codex/magma-preview`; remote `main` and production are unchanged. Unrelated local tool configuration and the résumé script are excluded.
- Vercel's branch-specific Supabase URL was verified as `https://jbzkdzcaqmxsmmyrlwif.supabase.co`. Other preview branches inherit production credentials: do not deploy staging work on a different branch without first configuring isolated credentials.
- Preview deployments are enabled in `vercel.json`, using the verified webpack build. Local checks: 108 tests, TypeScript, staging-configured optimized build, and event-details/event-management/community-question SQL harnesses passed. Existing HEIC bundler and middleware deprecation warnings remain.
- At the initial October 20 release, the five feature flags remained off after safety review blocked activation. The October 21 follow-up above supersedes that activation status.

## Technical readiness checkpoint — October 14

Visual identity development is handled separately; current engineering work prioritizes function, permissions and reliability. See `LAUNCH_TEST_CHECKLIST.md` for the evidence-based journey inventory, P0/P1 gates and acceptance-run format. Baseline: 53 automated tests pass, TypeScript passes, lint has 0 errors/15 warnings. These are partial regression checks, not live end-to-end or deployed-RLS certification. Production build, role-matrix rerun, browser/mobile journeys, migration rehearsal, backup/restore and monitoring verification remain pending. No production changes were made by this audit.

## Product center

- Project `e7a09280-0000-4000-8000-000000000001` uses a vertical journal (640px maximum width, viewport-responsive image frames capped at 680px), retaining the larger project header. The horizontal notebook experiment was removed; multi-photo entries retain their photo carousel. Other projects are unchanged.

- Post-detail loading: middleware refreshes the session, and the page verifies the user before querying posts. Explicit post fields exclude legacy base64 unless needed; all queries still use authenticated RLS. Auth/post stages have 15-second deadlines, development timing logs, and a route-level retry error state. Middleware authentication must not be skipped: Server Components cannot persist refreshed session cookies.

Magma is a CDMX-focused living archive for personal creative projects, unfinished work, observations, events, and conversations happening across the city. Personal projects are the heart of the product. The long-term direction is a physical social club supported by the digital community.

## Global search

- Cartelera (`/eventos`) also has live, accent-insensitive local search over loaded event titles, descriptions, venues, and addresses. It combines with the wall/archive view and day, colonia, and access filters; × clears only the query.

- Global search (`/buscar`) is available from a persistent rounded search bar with a Magma-red magnifier in navigation. It sits inline on wide desktops and on its own full-width row on smaller screens. Searches post titles/body/tags, profile usernames/names/bios, project titles/descriptions, and listed colectivo names/descriptions. Results use the signed-in user's RLS permissions, additionally exclude hidden/unapproved posts and unlisted colectivos, and never query private messages. “todo” previews six per category; individual filters page 20 results with stable ordering. This first version uses case-insensitive text matching and exact tag matches; accent-insensitive/fuzzy ranking and dedicated search indexes are future improvements.

## Profile ecos

- Visual direction: analog nostalgia and “things you kept because they meant something.” Feed cards use fine square-edged frames and creator/format/date labels. Post pages use compact archive labels, captions beneath visual media, aligned controls, and “notas al margen”; writing retains its reading layout and events retain event facts/attendance. Original media and stable sizing are preserved.

- Members can “hacer eco” of another member’s approved, non-hidden community post, optionally adding a 1,000-character note. Ecos live only under `/profile/[username]?tab=ecos`, separate from original publications and the home feed.
- Original creator credit and links remain visible; reactions and conversation stay on the original. One echo per person/original; its owner can undo it. Original deletion cascades to echoes, and hidden/unapproved/inaccessible originals are excluded by RLS.
- Private colectivo posts cannot be echoed, including by colectivo members. This is internal to signed-in Magma, not external sharing.
- Database migration: `supabase/post_echoes.sql` (applied to staging; production pending). No echo notifications or reblog chains in this initial version.

## Status labels

- **Active / navigation:** Built and linked in the primary navigation.
- **Active / secondary:** Built and reachable through another workflow, profile, or direct link.
- **Internal:** Restricted staff or operational tool.
- **Legacy / hidden:** Still exists in code but is no longer part of the current primary experience.
- **Planned:** Agreed direction, not implemented yet.

---

# Roles

## Current community roles

### Logged-out visitor

- Can access only authentication and account-recovery pages.
- All community content requires a Magma account.
- Represented by the absence of a Supabase Auth session.

### Member

- Has a Supabase Auth account and a row in `profiles`.
- Can view the community, create posts and projects, comment when comments are enabled, message, report, block, join colectivos, request radio slots, and manage their own content.
- Ordinary posts publish immediately; sensitive posts enter review. Apply `supabase/ordinary_posts_publish.sql` after the older moderation/SoundCloud migrations.

### Post author

- Profiles have optional free-text origin (`hometown`, max 100 characters), edited as “¿de dónde eres?” and displayed separately from current location (“de … · en …”). This is personal identity, not multi-city product support. Staging migration: `supabase/profile_hometown.sql`.

- Personal identity is username-only across navigation, comments, messages, post headers, sala and marketplace. Initial/avatar boxes and the profile avatar-color picker are paused; stored avatar values and profile covers are preserved.

- Owns a post through `posts.author_id`.
- Can see their own pending or rejected posts.
- Can edit or delete their own eligible posts.
- Ordinary edits remain visible; sensitive edits require review. Rejected posts and pending sensitive posts cannot bypass review through an author edit.

### Project owner

- Owns a project through `projects.author_id`.
- Can edit the project and attach posts through `post_projects`.
- Projects are intended to feel like personal journals, archives, or windows into an ongoing creative process.

### Colectivo member

- Membership is represented in `colectivo_members` with role `member`.
- Can participate in a colectivo according to its membership and posting rules.

### Colectivo administrator

- Membership is represented in `colectivo_members` with role `admin`.
- Can manage colectivo settings, membership requests, member roles, and shared work.
- A colectivo creator is added as its first administrator.
- Public join requests require admin approval, including public colectivos. Visitors submit an optional private introduction, can cancel a pending request, and receive in-app approval/rejection notifications. Admins review in settings. Existing members are retained. Atomic RPCs and database permissions prevent direct self-admission. Apply `supabase/colectivo_approval.sql` after notifications; rollback tests: `supabase/test_colectivo_approval.sql`.
- Account-bound invitations are enabled on staging (migration `supabase/colectivo_invitations.sql`, 2026-09-24). Only admins create/revoke links by @username in settings and copy/send them to the recipient; delivery is manual. Links expire after seven days; only the named account can explicitly accept and join without further approval. Regeneration revokes previous links. Used links cannot re-add removed members. Rollback security tests passed (`supabase/test_colectivo_invitations.sql`), including automatic chat access without earlier history. Anonymous RPC execution is explicitly revoked. Production not migrated.
- Colectivo chat is available in Messages under “colectivos,” named after the group, with an “abrir chat” link on its page. Membership automatically grants access; public applicants must first be approved. Database RLS hides messages and previews from before the latest membership; leaving/removal denies read/send, and rejoining resets history. Existing members start at feature activation. Text messages (4,000 characters), profile links, paginated history, 5-second foreground refresh, retry-safe sends, per-member read state and mute are supported. No push/email notifications. Migration `supabase/colectivo_chat.sql` applied and rollback privacy tests passed on staging; production not migrated.

### Event host

- Normally the author of an event post.
- Controls related event interactions; live sala is deferred to a possible phase two.
- Local, flag-gated event management adds author-managed organizer/participant links and cancellation/postponement notifications; linked people/entity owners can withdraw their own links. See the event lifecycle section below.

### Approved DJ

- Has an approved row in `djs` linked through `user_id`.
- Can access the DJ performance dashboard. Radio live chat and open event salas are deferred to a possible phase two.
- Approval currently comes from the slot-request review workflow.

## Current staff roles

### Moderator / cuidadorx

- October 14 governance change: only the configured owner can permanently delete other people's posts/comments. Moderators retain review, hide, restore and resolve. Authors retain deletion of their own content. `supabase/owner_only_moderation_delete.sql` adds restrictive DELETE policies, guards the report RPC and prevents authenticated authorship reassignment to bypass self-deletion checks; applied to staging only. Moderation UI receives an owner check from the server. Equipo email verification is not required for these account permissions; email invitations remain separate.

- Identified by `profiles.is_moderator = true`.
- Uses an individual Magma account; staff credentials are never shared.
- Can access `/staff`, `/mod`, pending-post review, community reports, content hiding/restoration, and moderator actions allowed by RLS.
- Decisions are recorded in `moderation_actions`.

### Owner / administrator

- Identified by `app_config.owner_user_id` and environment-specific owner configuration.
- Can access `/staff`, moderation tools, and `/admin` operational tools.
- Can appoint moderators, manage radio operations, review DJ slot requests, and handle escalations.
- This is currently a founder role, not a general moderator role.

## Planned staff roles

These should eventually live in a dedicated role/membership model rather than additional booleans on `profiles`.

### Editorial curator — planned

- Shapes featured projects, Explore editions, archive groupings, and editorial context.
- Does not automatically receive moderation or account-administration powers.

### Events producer — planned

- Manages Cartelera quality, event relationships, salas, and future presence-based member access.
- Does not automatically receive moderation powers.

### Radio producer — planned

- Manages radio scheduling, DJ approvals, live status, and stream information.
- Should receive narrower access than the owner dashboard currently provides.

### Community support — planned

- Helps with account access, member questions, and appeals.
- Should only see the minimum personal or moderation information necessary.

### Technical administrator — planned

- Maintains deployments, Supabase, storage, security, and operational infrastructure.
- Technical access should remain separate from editorial and moderation authority.

### Verified in-person member — future direction

- Possible additive status earned through attendance at curated physical events using single-use codes.
- Exact benefits are intentionally undecided.
- Must not become mandatory until Magma has enough events and community density.

---

# Pages and product areas

## Core navigation

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/` | Explorar / El archivo vivo | Active / navigation | General finite community stream. The first recent-feed page includes a compact “¿en qué andas?” entry bar with image and compartir links to the existing `/upload` workflow; moderation and sensitive-content controls remain there. |
| `/explorar` | Explore compatibility route | Active / secondary | Backward-compatible alias for the homepage Explore experience; Explore controls use `/`. |
| `/proyectos` | Proyectos | Active / navigation | Authenticated project directory with database-side title/description search, creator username filter, newest/oldest/title sorting, and stable 18-item pagination. The all/my-projects selector is removed; legacy vista parameters no longer restrict results. URL preserves filters across pages; filter submission resets pagination. Includes loading, empty and retry states. Category/status filters await explicit project metadata. |
| `/colaboraciones` | Invitaciones y colaboraciones | Staging migrated / local preview enabled | Account-bound inbox for separate project-contributor and post-credit invitations. Reachable from project directory, collaboration panels and desktop/mobile account menus when `NEXT_PUBLIC_COLLABORATIONS_ENABLED=true`. Staging SQL permission tests passed; full browser acceptance and production deployment remain pending. |
| `/eventos` | Cartelera | Active / navigation | Events and cultural activity around CDMX. Server-rendered poster data streams behind a loading placeholder using authenticated RLS, selecting preview fields and description for search, without profile payloads or a browser fetch waterfall. Uniform poster frames preserve natural proportions; first poster eager/high priority, others lazy. Shared request-time clock and CDMX dates avoid hydration differences. Live search and muro completo/archivo share a compact row above posters; date, colonia and access filters sit in a desktop sidebar and wrap on mobile. Active options are red without underlines. Search is accent-insensitive and combines with filters over fetched events; database pagination remains future scaling work. |
| `/radio` | Radio | Deferred / hidden from navigation | Deferred beyond first launch while building the first 50 members. Removed from desktop and mobile navigation; code, data, and direct URL remain available. Test interest through a curated listening event before relaunching. |
| `/colectivos` | Colectivos | Active / navigation | Discover listed creative groups with name/description search, created-by-me filter, newest/oldest/name sorting, and server-side pagination (18 per page). URL preserves filters; link-only groups remain excluded. Includes result counts, reset, empty and error states. |
| `/upload` | Subir obra | Active / navigation | Create a post, optionally attach it to a project or colectivo, choose comments, mark sensitive content, and embed a SoundCloud track/set on music posts. Plain upload links open a lazy-loaded native dialog at desktop widths (1024px+), reusing `UploadForm`; mobile, direct URLs, modified clicks and links with project/colectivo parameters retain the full page. Modal locks background scrolling, confirms draft discard, blocks closing during submission and closes on successful publication. Arte/fotografía support 1–3 ordered photos with previews, removal, and carousel display in feed/detail; requires `supabase/post_carousel.sql` (applied to staging 2026-09-24; production pending). |

## Personal projects and profiles

### Community questions — October 20, 2026

Local pilot, disabled by default with `NEXT_PUBLIC_COMMUNITY_QUESTIONS_ENABLED`. General “¿qué traes?” adds pregunta → authenticated `/preguntar`. Public-to-Magma text questions enter Explorar as posts, with signed comments beneath `/post/[id]`. Signed questions link to profiles; anonymous posts have no public author ID and stay out of identity-based profiles/circle feeds. Private ownership supports deletion, rate limits, audited moderation and identity-safe question blocking. Existing report/moderation tools and private reply notifications apply. No drafts, edits or media in this pilot. Requires `supabase/community_questions.sql` and hosted privacy acceptance; see `supabase/COMMUNITY_QUESTIONS.md`. No remote migration/deployment performed.

### Event invitations — October 15, 2026

Implemented behind `NEXT_PUBLIC_EVENT_INVITATIONS_ENABLED=true` (default off). October 15: migration and rollback permission tests passed on `magma-staging`; local staging-backed preview enabled and mailbox section verified in-browser. No production or hosted deployment changes; full multi-account browser journey remains pending. Event creators select usernames on the event detail page; recipients receive invitation cards in a separate `/mensajes` section with event title, safe public artwork, CDMX date/time, venue/address and event link. Private responses are “voy”, “tal vez”, “no puedo”; hosts see them on the event page. Responses do not create public attendance, messages or group chats. Existing blocks, moderation and private-colectivo membership remain authoritative. Duplicate sends preserve the existing response. Only future approved events accept sends/responses. Requires `supabase/event_invitations.sql`; see `supabase/EVENT_INVITATIONS.md` for rollout, verification and initial limits.

### Event people and lifecycle — October 20, 2026

Local implementation behind `NEXT_PUBLIC_EVENT_MANAGEMENT_ENABLED=true` (default off); migration and hosted acceptance pending. `/post/[id]` displays organiza/participan links and author-only management controls; `/eventos` and invitation cards show cancellation/postponement. Associations are informational, not accepted post credits or project membership. The notification bell delivers status/date/location updates to eligible attendees/invitees and opens the event directly. Required schema, recipient eligibility, concurrency and two-account checks: `supabase/EVENT_MANAGEMENT.md`.

### Shared journals and individual post credits — October 15, 2026

Implemented behind `NEXT_PUBLIC_COLLABORATIONS_ENABLED=true` (default off). On October 15, applied `supabase/collaborations.sql` to staging after verifying colectivo privacy, passed the rollback SQL permission matrix, and enabled local `.env.local`. The localhost:3001 upload popup shows the collaborator invitation field. Complete multi-account browser acceptance before enabling for friends. Production and hosted environment flags remain unchanged.

- **Project owner** invites exact usernames, cancels invitations, removes collaborators, edits the project, and unlinks entries. Only acceptance allows a collaborator to contribute their own new/existing public posts. Open collaboration calls do not grant access.
- **Accepted project contributor** can link their own posts through the project page, upload project picker, or post editor. They retain authorship and edit/delete rights only on their own posts. Removing membership prevents future additions without touching existing entries. Authors can withdraw entries after removal; unlinking affects only the selected project, never the original post or its other links.
- **Post author** separately invites shared-credit collaborators from upload, post detail, or edit. Accepted people appear as collaborators on the post and in an explicitly labeled “obras en colaboración” section under their profile’s publicaciones tab; original authorship remains visible. They can withdraw their credit, but gain no post-edit/delete rights and no project membership.
- **Privacy** is unchanged: private colectivo posts cannot enter projects or the profile collaboration section. Private post invitations require existing colectivo membership; invitation acceptance never grants that membership. Hidden/pending posts remain governed by post RLS. Pending credits can be queued by an author, but cannot be accepted before approval.
- **Upload collaborator search**: type at least two username characters (optional `@`), select matching public accounts, and remove selections before publishing. Excludes the current user and already-selected names; supports keyboard navigation, retry and up to 20 recipients. Selected usernames retain the existing draft/invitation flow; searching never sends an invitation.
- **Persistence/security**: account-bound rows with client read-only privileges; owner/recipient RPC controls; per-resource locks serialize invitation changes and contributions; project-entry trigger checks original author, public audience, accepted membership and blocks. No changes to post-edit RLS. Errors are visible; attachment/invite failures after publication preserve the saved-post link and prevent duplicate publication.
- **Verification**: local PostgreSQL/PGlite and the deployed staging database passed the rollback permission matrix. Local upload popup visibility verified in-browser. Full multi-account browser journeys remain pending. See `supabase/COLLABORATIONS.md`.

Latest October 13 adjustment: no separate letras tab or subfilter. Written posts stay in publicaciones alongside other authored formats. The remaining publicaciones filters are todas/ecos; legacy `?tab=letras` opens publicaciones.

October 13 navigation refinement: five primary tabs—publicaciones (default), proyectos, lo que comparto (staging availability rules), colectivos, agenda. Publicaciones contains todas/letras/ecos subfilters. The mixed “todo” view is removed; old `?tab=todo` and unknown filters fall back to publicaciones. Existing letras/ecos links remain valid with publicaciones highlighted. Guardados and owner-only borradores retain their existing profile URLs; their desktop/mobile account-menu shortcuts were removed October 20. Data and access rules are unchanged. This supersedes earlier references to a todo default or no drafts-menu shortcut.

Profile activity-count summary (“huellas en magma”) is removed for now; posts and event data remain unchanged.

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/profile/[username]` | Profile | Active / secondary | Identity and biography followed by Publicaciones (all authored post types together, newest first), Proyectos, Agenda (upcoming attendance), and Guardados. Text filters default to Todo. Letras filters publications to writing. Standalone event reflections are paused: composer and profile display removed; existing notes/photos retained, not migrated to conversations. Event conversations remain the place for notes. Compact editorial previews preserve full event posters. |
| `/profile/edit` | Edit profile | Active / secondary | Manage profile identity, biography, location, and cover image. Discipline labels and selectors are removed; members can describe their practice in their bio. Signup does not collect disciplines. Existing discipline data is retained but not displayed, including in mi círculo. |
| `/proyecto/[id]` | Project detail | Active / secondary | Journal-like home for a personal project and its linked entries. Authors choose horizontal (4:3) or vertical (2:3, default) cover crops in the project editor, with a live preview. Persisted as `links.cover_shape` in the existing JSON payload; applied to the detail header for all viewers. Original images and listing thumbnails remain unchanged. |
| `/post/[id]` | Post detail | Active / secondary | Full presentation of a post, comments, reporting, sensitive-content consent, and moderation status for its author. Standard posts use one editorial column: author and headline, uncropped media, compact actions and disclosure for extra options, then conversation with its composer before comments. Natural page scrolling, no enclosed card or nested scrolling panels. Events retain their gallery-wall layout: centered uncropped viewport-sized poster, caption and attendance/sala actions underneath, then author, description, interactions, and conversation. |
| `/post/[id]/edit` | Edit post | Active / secondary | Ordinary edits publish immediately; sensitive or previously rejected content requires review. Arte/fotografía can add, reorder, and remove gallery photos (up to 3; carousel migration required). |
| `/colecciones/[username]` | Collections | Legacy / hidden | User-created saved groupings of posts. Not in the current primary product direction. |
| `/colecciones/[username]/[id]` | Collection detail | Legacy / hidden | Individual saved collection. |

### Portafolio (formerly “lo que comparto”) — staging pilot

`supabase/portfolio_pdf.sql` applied successfully to staging on October 13, 2026. Production is unchanged.

PDF upload fix (October 13): Next's default 10 MB proxy body buffer truncated otherwise-valid uploads before FormData parsing. `experimental.proxyClientMaxBodySize` is now 16 MB to accommodate the existing 15 MB file limit plus multipart overhead; the API file limit is unchanged. Portfolio upload errors preserve the server's message and appear beside Save as well as above the editor.

October 13 PDF attachments: portfolio entries accept an optional PDF up to 15 MB, uploaded only on save via the authenticated upload endpoint with a staging-only `portfolio-pdf` purpose, MIME/extension/size and PDF-header checks. A separate “PDF ↗” button opens a native dialog and embedded browser PDF reader; closing restores the profile view. The reader fetches only this project's public PDF storage URLs, creates a temporary PDF blob (avoiding attachment-response downloads), and releases it on close. Browser-native zoom/mobile support varies; unsupported viewers show a fallback message, not an automatic download. Public-link visibility is disclosed in the editor. Removal unlinks the file without deleting storage. Requires `supabase/portfolio_pdf.sql`; no new route or permissions. Real-document cross-browser verification remains pending.

October 13 naming update: the public tab, section heading and message reference label now say “portafolio”; the owner action is “+ añadir al portafolio”. Existing `?tab=comparto` URLs, entry IDs and stored data remain unchanged for compatibility. Proyectos remains a separate section for ongoing bodies of work. Multiple examples per portfolio entry remain future work; this update changes labels only.

October 13 messaging context: “platiquemos” opens an empty composer with a removable offering reference. The offering is fetched under the recipient’s profile before attaching it. On send, a title/username/id snapshot is stored in `messages.offering_reference` and shown as a local link above the message for both participants; later replies do not automatically attach it. Links open and expand the original offering. Deleted offerings retain their historical message snapshot. No automatic messages or prewritten text. `supabase/message_offering_reference.sql` applied to staging only; existing message permissions remain in force, and production queries do not request the new field.

Offerings now live exclusively in `/profile/[username]?tab=comparto`, labeled “lo que comparto” immediately after proyectos. The header no longer includes offerings. The tab is always available to the profile owner on staging; visitors see it when entries exist. Switching tabs preserves the offering editor state; deleting the final entry hides the tab from visitors only.

Expanded offering details remain inside the teaser's single outer card border; the title is not repeated and the short preview is hidden while the full description is open.

October 13 layout refinement: offerings use a responsive vertical card grid matching project/colectivo fine borders, dark background, 10px inset and bold titles. A distinct 4:3 visual area uses a white camera and viewfinder corners when no linked image is available; linked project covers or approved, non-hidden, non-sensitive community image posts provide thumbnails through authenticated queries. A two-line excerpt and crimson arrow invite opening details within the same card. Helper text appears only while adding/editing; saved offerings and permissions are unchanged.

Profiles should connect who a person is, what they make, and what they can share with others. This is a personal, living portfolio rather than a résumé or storefront: existing posts and projects provide examples of their practice, while an optional “lo que comparto” section makes skills and offerings visible.

- Examples grounded in CDMX: city walks/tours, photography sessions, and art workshops. Members describe offerings in their own words, with optional imagery and links to relevant existing posts or projects.
- Make room for paid work, exchange, and collaboration without requiring anyone to monetize their practice. Helping people sustain their creative lives is welcome; earning money need not be hidden or become their entire identity.
- A conversational “platiquemos” entry point could use existing messages. The initial direction is profile-based discovery, not a separate marketplace or booking/payment system.
- Avoid ratings, sales rankings, paid visibility, and pressure to buy. Keep the personal work central rather than turning the profile into a catalog of services.
- This can connect naturally to the future physical club through member-led walks, workshops, and gatherings.

Status (October 11, 2026): first version implemented on profiles, enabled only for the staging Supabase project. Owners add/edit/remove text entries (80-character title, 600-character description), optionally choose paid work/exchange/collaboration, and link an existing post or project using a picker or local link. Empty sections are hidden from visitors. “Platiquemos” opens the existing direct-message workflow without sending a message. No new route, payments, booking, ranking, or email notifications.

October 13 cover images: owners can choose an optional JPG/PNG/WEBP/GIF cover (up to 15 MB), preview its 4:3 crop, and upload on save through the authenticated upload endpoint. Custom covers take priority over linked-work thumbnails; removing a cover restores the linked-work/camera fallback. Images use public media storage; removing a cover unlinks it without deleting its stored object. `supabase/profile_offering_covers.sql` applied successfully to staging only; existing ownership RLS is unchanged. File validation has automated tests. Production remains disabled.

`supabase/profile_offerings.sql` applied to staging only: authenticated read access and owner-only insert/update/delete with database validation. Linked work retains its existing access checks; an offering does not grant access to a private project/post. `supabase/test_profile_offerings.sql` passed live owner CRUD, ownership-transfer rejection, other-member write rejection, and validation checks; fixtures rolled back. Production not migrated. Local TypeScript and the 48-test suite passed; profile editor and visitor-empty state checked in the browser.

### Post mentions

Caption creation/editing and the letra editor offer account suggestions after `@`; selections are saved in the existing text/content fields, including browser drafts. Feed/detail mentions link to profiles; rich-text sanitization only preserves local profile links. Mention notifications are implemented by `supabase/post_mentions.sql` (applied to staging 2026-10-02; production pending): on approved visible publication/edit, notify each resolved account once per post, excluding the author and blocked pairs. Drafts never write posts. The bell opens the post directly. No email or private-message delivery. `supabase/test_post_mentions.sql` passed in staging for delivery, duplicates, self exclusion, pending/hidden visibility and recipient isolation; all fixtures rolled back.

### Upload form and drafts

The upload form uses the site's dark background with ash text and red accents. The experimental paper sheet, ruled lines, margin and punch holes have been removed; the simplified layout and controls remain.

The shared upload page/dialog uses a notebook-style layout: compact format choices, media before title and writing, transparent underlined fields, and optional metadata, collaboration, comments, sensitive-content and project controls under “algo más”. Event facts stay visible. “publicar” and the quieter “guardar borrador” remain outside that disclosure. The photo picker retains ordering, removal, validation and previews; other uses of the picker keep their existing presentation.

Drafts live in the owner-only profile tab `?tab=borradores`, excluded from “todo” and never mounted on another person's profile. No desktop/mobile account-menu shortcut; `/borradores` redirects to the profile tab (retaining a fallback index if the account lacks a username). Lists the current account’s browser-local saved drafts newest-first, with title/type/date, resume links to the original upload context, confirmed deletion, and loading/error/empty states. Resume opens the form’s existing draft recovery prompt.

`UploadForm` offers manual browser-local draft save/resume/delete through IndexedDB, including Files, ordered photos, rich text, event fields, and publication settings. Drafts are keyed by account and upload context (type/project/colectivo), one saved draft per context; return via the same upload entry point to resume. No server upload occurs until publishing. Not cross-device; clearing browser data removes drafts. Storage errors are surfaced, existing drafts require resume/discard before replacement, and successful post insertion removes an actively resumed/saved draft even if subsequent attachment linking fails. Modal closure preserves saved drafts and warns about unsaved edits. Browser-level persistence QA remains required.

## Events and salas

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/post/[id]/sala` | Event sala | Deferred / possible Phase 2 | Entry CTA removed; direct visits redirect to the event. Implementation and data preserved. Controlled by `EVENT_SALA_ENABLED` in `lib/features.ts`; restore CTA when re-enabling. |
| `/hoy` | Hoy | Legacy / hidden | Daily-edition experiment. Explore is the current broader discovery direction. |

## Colectivos

Visibility labels are “visible en cartelera de colectivos” and “solo con enlace.” The existing `is_private` field controls directory listing only, not members-only content access. Public join requests require approval for both options; account-bound admin invitations bypass further approval once enabled.

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/colectivos/[slug]` | Colectivo detail | Active / secondary | Group identity, profile-linked member list below cover/actions, and shared work. Creator/admin labels appear first; pending requests/invitations are excluded. Existing membership/profile read permissions apply. |
| `/colectivos/crear` | Create colectivo | Active / secondary | Create a new colectivo and become its administrator. |
| `/colectivos/invitacion/[id]` | Accept invitation | Active / staging | Sign in with the invited account and explicitly accept a single-use admin invitation. |
| `/colectivos/[slug]/ajustes` | Colectivo settings | Active / secondary | Administer membership, requests, and roles. The creator can edit name, description, cover image, background color, and directory visibility; the existing slug/link is preserved. Creator-only database update policy remains in force. Horizontal (4:3) / vertical (2:3) cover preview and saved detail-page crop require `supabase/colectivo_cover_shape.sql`; selector stays disabled until migration is applied. Detail header uses compact cover beside text, stacked on mobile. |

## Radio

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/radio/solicitar` | Request a slot | Deferred / retained | DJ proposal workflow retained with radio, outside first-launch scope; direct URL remains available. |
| `/radio/dj` | DJ dashboard | Deferred / retained | Approved-DJ performance view, live status, and listeners retained for later. Direct URL remains available; live chat also deferred. |

## Communication

Profile filters include “colectivos” alongside publications, writing, projects, agenda and saved collections. It shows linked memberships with loading, empty and retry states. “todo” combines publications, existing projects, colectivos, upcoming event attendance and visible saved collections into one responsive masonry mood board without separate section headings. Individual filter tabs remain available; empty project prompts appear only in the projects tab.

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/circulo` | Mi círculo | Active / secondary | Private, one-sided profile directory chosen by each member. Add/remove on other profiles and remove from the directory. Usernames, practice and biography excerpts, profile links; no avatars, ranking, follower counts, reciprocity or notifications. Owner-only RLS; self-adds and blocked-pair additions forbidden. Desktop/mobile account menu. Staging migration `supabase/private_circle.sql`; apply separately after schema on new environments. |
| `/?feed=circulo` | Mi círculo feed | Active / explorar tab | Alongside “todo” in explorar (also supported on `/explorar`). Chronological, non-event posts from the viewer's chosen people, filtered server-side through an inner join to the private circle using the authenticated viewer's ID and existing RLS. Recent pagination and hoy/archivo date links preserve the circle selection; existing content filters remain available. Empty views offer guidance and an “editar mi círculo” link. No new schema or ranking. |
| `/likes` | Mis likes | Active / secondary | Private editorial mood board of the signed-in member's post appreciations. Variable-height image tiles, paper-style writing excerpts, sound/video typographic tiles; newest appreciations first, 36 per page. Desktop/mobile account menu entry. Uses owner-only appreciation RLS and post visibility; sensitive content remains gated. No new likes storage or public taste profile. |
| `/mensajes` | Messages | Active / navigation | Compact unified activity-sorted inbox with name search and todos/sin leer/directos/colectivos filters; mobile list/thread navigation. Direct messages (`?c=`) and membership-based colectivo chats (`?colectivo=`), grouped sender labels and CDMX date separators. Shared history loader fetches the latest 50, cursor-pages earlier messages with scroll anchoring, and catches up incrementally in 50-message batches (5-second foreground polling plus Realtime where available). Inbox previews/order refresh automatically (direct fallback 10 seconds, colectivos 5); successful reads immediately clear the Magma-red unread dot without marking background/scrolled-up chats read. Sending preserves drafts on failure with an explicit retry state; direct retries reuse the message primary key, colectivo retries retain the existing idempotent RPC. DM blocking remains in the options menu and group history RLS is unchanged. Inbox search/filtering is client-side; server inbox pagination and a single batched DM-summary query remain pending. |
| `/mensajes/[conversationId]` | Conversation | Active / secondary | Direct route to a selected conversation. |

## Authentication and recovery

October 13 navigation refinement: the empty `/circulo` directory’s “explorar la comunidad” link opens `/buscar` to find people; empty later pages still link back to `/circulo`.

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/auth/login` | Member login | Active / secondary | Standard member login; validates email-confirmation callback tokens, clears URL credentials, and displays confirmation or invalid-link guidance. Branded signup email source: `supabase/email-templates/confirm-signup.html` (install in Supabase dashboard). |
| `/auth/register` | Registration | Staging migrated / local preview | Three steps: CDMX introduction with the existing expandable manifesto and community agreements; two private answers and explicit consent; account creation and email confirmation. No membership approval gate. Profile and answers save atomically before confirmation delivery. `supabase/member_onboarding.sql` applied to staging October 20; existing members are unchanged. User confirmed the staging test passed October 20; hosted frontend deployment remains separate. |
| `/auth/forgot-password` | Forgot password | Active / secondary | Request a recovery email without exposing account existence. |
| `/auth/reset-password` | Reset password | Active / secondary | Awaits automatic PKCE exchange without redeeming twice, supports legacy recovery callbacks, validates the user session and clears callback credentials before password update. Fresh-email end-to-end retest pending. |

## Staff and backend

| Route | Name | Status | Access | Purpose |
|---|---|---|---|---|
| `/staff/login` | Staff login | Internal | Public form; individual credentials required | Entry point for Magma staff accounts. |
| `/staff` | Staff workspace | Internal | Moderator or owner | Central launcher for authorized internal tools. |
| `/staff/team` | Moderator team | Active in staging | Owner in `app_config` | Add/remove existing usernames with confirmation; owner cannot revoke their own moderator access. `supabase/moderator_team.sql` applied to staging on 2026-10-07; @majmaj configured as owner with moderator access. Production unchanged. No email invitations or accounts are created. |
| `/staff/ingresos` | Respuestas de ingreso | Staging migrated / local preview | Owner in `app_config` only | Private, newest-first answers with username search, reviewed/unreviewed filters, 20-row pagination, account creation date and timestamped/versioned agreement snapshots. Review markers do not change access. Ordinary moderators cannot read other members' answers. Staging owner is `@majmaj`. |
| `/mod` | Moderation dashboard | Internal | Moderator | Pending-post queue and community reports. |
| `/admin` | Administration | Internal | Owner | Radio settings, DJ records, and slot-request decisions. |

## Editorial and experimental pages

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/manifiesto` | Manifesto | Active / footer | Spanish manifesto, “magma no está terminado,” about creative experimentation, collaboration, CDMX, and the physical-space ambition. Shared component also expands inside the public signup introduction without leaving the form. The standalone page retains its existing member-only access. |
| `/letras` | Letras | Active / secondary | Writing-focused view. |
| `/manifiestos` | Old manifiestos URL | Legacy / hidden | Redirects to `/letras`, preserving old links. |

## Tianguis

| Route | Name | Status | Purpose |
|---|---|---|---|
| `/tianguis` | Marketplace | Legacy / hidden | Marketplace experiment removed from current navigation to simplify Magma. |
| `/tianguis/[id]` | Listing detail | Legacy / hidden | Individual marketplace listing. |
| `/tianguis/crear` | Create listing | Legacy / hidden | Listing creation. |
| `/tianguis/mis-listings` | My listings | Legacy / hidden | Seller listing management. |

---

# Internal API routes

| Route | Purpose |
|---|---|
| `/api/auth/login` | Server-side email/username login with generic errors and rate limiting. |
| `/api/auth/register` | Validates both answers and explicit current-version consent server-side. Creates an unconfirmed Auth account with a server-only onboarding marker, then atomically stores profile and private answers via service-only RPC before confirmation delivery. Missing migration fails closed before account creation. Best-effort per-process limits remain; production distributed limits still required. |
| `/api/upload` | Authenticated, validated media upload. HEIC/HEIF files convert to JPEG before storage (primary still image, 15 MB input/output limit); Mexican Spanish errors. Carousel picker accepts HEIC/HEIF. Actual iPhone end-to-end verification pending. |
| `/api/event-note-image` | Retained backend for paused reflections; no active UI consumer. Session-authenticated image delivery checks note visibility and Storage RLS; private no-store responses. |
| `/api/admin/slot-requests` | Owner-authorized DJ slot approval/rejection. |
| `/api/events` | Event data endpoint. |
| `/api/events/[id]/sala` | Deferred event sala endpoint; returns 404 while `EVENT_SALA_ENABLED` is false. |
| `/api/home` | Homepage data endpoint. |

---

# Major workflows being built

## Post moderation

### In-app notifications

- Navbar bell on desktop/mobile shows unread count and the 30 latest notifications; individual or bulk mark-read persists.
- The bell is the only numeric notification badge in navigation. Removed the separate stale chat counter; unread chat indicators remain inside mensajes. Mobile feed filters are collapsed behind a summary; colectivo posts use one column below the desktop breakpoint.
- New post comments notify the author and previous commenters (flat conversation updates, not threaded replies); direct messages notify their recipient. No self-notifications or historical backfill.
- Database triggers generate notifications; recipient-only RLS, block checks, and target visibility checks protect reads. Clients can update only `read_at`, not create notifications or alter recipients.
- Refreshes every 30 seconds while visible, on tab focus, and when opening the bell. No email/push delivery.
- Staging migration: `supabase/in_app_notifications.sql` (apply after comments, messaging, blocks, and moderation). Production not applied.

### Publishing policy

- [x] Ordinary posts publish immediately; sensitive posts enter `pending` review. Legacy ordinary pending posts without moderation history are released by the migration; hidden/rejected/reviewed content is preserved.
- [x] Existing posts remain approved during migration.
- [x] Authors and moderators can see pending/rejected posts.
- [x] Moderator approve/reject workflow.
- [x] Immutable moderation action history.
- [x] Sensitive-content blur with viewer consent.
- [ ] Appeals interface and second-review workflow.
- [ ] Account warnings and temporary posting restrictions.
- [ ] Queue filters, assignment, pagination, and bulk actions.
- [ ] Risk-based review and trusted publishing when volume requires it.

## Personal projects

- [x] Create, edit, and browse projects.
- [x] Link posts to projects during upload and editing.
- [x] SoundCloud and external project links.
- [x] Safe SoundCloud players on music posts from normal track, playlist, or set URLs; arbitrary iframe HTML is never accepted.
- [x] Journal-like project presentation.
- [ ] Stronger entry ordering and project chapters/sections.
- [ ] Draft entries and private project previews.
- [ ] Better project-following and update notifications.

## Explore / archive

The feed keeps its newest-first data order. Explorar and mi círculo use a natural-height masonry column layout (three columns on desktop, two on tablet, one on mobile), letting posts tuck beneath one another without row gaps. Visual order flows down each column, then across, rather than strictly left to right. A responsive black margin on the right gives the desktop feed breathing room; the composer aligns with the feed's right edge. Both queries sort by created_at descending with id descending as a stable tie-breaker before pagination. Desktop and mobile filters expose todo / mi círculo and content types; the edición selector (reciente / hoy / archivo) and sidebar date picker are removed. Existing date-view URLs remain supported for compatibility.

- [x] Separate Explore route.
- [x] Mix different forms of city activity rather than projects alone.
- [ ] Define the long-term relationship between Explore, daily editions, and the archive.
- [ ] Editorial curation and featured groupings.
- [ ] Pagination or finite editions rather than infinite scroll.

## Community communication

- [x] Direct messages and mutual block enforcement.
- [x] Per-post comments on/off control.
- [x] Consistent post interaction bar for appreciation, comments, private saves, sharing, and reporting.
- [x] Per-user appreciation records with one appreciation per person and post.
- [ ] Sticker responses to posts and comments.
- [ ] Notifications for comments, project updates, messages, and moderation decisions.

## Staff operations

- [x] Individual staff login and staff workspace.
- [x] Moderator and owner authorization.
- [ ] Dedicated staff-role table with narrow permissions.
- [ ] Editorial, events, radio, support, and technical roles.
- [ ] Staff invitation and offboarding workflow.
- [ ] Operational dashboard and audit views.

## Physical membership

- [ ] Define benefits of verified in-person status.
- [ ] Build single-use event code issuance and redemption.
- [ ] Keep physical verification additive during the community's early growth.

---

# Related documents

- [`MODERATION.md`](./MODERATION.md) — Community standards and moderation philosophy.
- [`LAUNCH_ROADMAP.md`](./LAUNCH_ROADMAP.md) — Launch and future-proofing roadmap.
- [`MAGMA_context.md`](./MAGMA_context.md) — Technical and product context for collaborators.
- [`AGENTS.md`](./AGENTS.md) — Product constraints and coding-agent instructions.

# Change log

## October 20, 2026 — Community questions (local, rollout disabled)

- Added question composer with signed default and explicit anonymous opt-in, text cards in Explorar and a question detail view with signed replies. Reused report and moderation workflows.
- Anonymous identities live in a protected mapping, never in public post authorship. Added transactional publication, retry keys, three-per-day limit, own deletion, private reply alerts, account-deletion cleanup and question-scoped blocking/reset. Identity lookup is moderator-only and audited.
- Feature remains disabled pending staging migration and multi-account privacy/UI acceptance; rollout and test scope in `supabase/COMMUNITY_QUESTIONS.md`.

## October 20, 2026 — Post invitations in the options menu

- Post authors open “invitar colaboradores” from the shared three-dot menu (feed and detail), alongside editar. A compact native dialog contains the existing picker and invitation controls, with keyboard dismissal and focus containment. The standalone invitation form is hidden on post detail; existing credits and recipient acceptance/withdrawal actions remain visible. Project controls and invitation permissions are unchanged.

## October 20, 2026 — Event organizers, participants and lifecycle (local, rollout disabled)

- Event details now support separate organiza/participan links to profiles, listed colectivos and projects, managed by the author; linked people/entity owners may withdraw their links. Informational associations do not imply acceptance, coauthorship, project membership or editing rights.
- Added author-only cancellation/postponement with required explanation, confirmation and optimistic version checks. Labels appear on event cards/details/invitations; unavailable events suppress ticket and RSVP controls, with database guards for writes.
- Approved event status/date/location changes create transactional in-app bell notifications for eligible attendees and non-declined invitees, deduplicating overlaps and respecting current blocks, private audience access and moderation. No email or refunds.
- Gated by `NEXT_PUBLIC_EVENT_MANAGEMENT_ENABLED` (default off), pending `supabase/event_management.sql` and hosted two-account acceptance. No remote changes. See `supabase/EVENT_MANAGEMENT.md` for rollout and local database test scope.

## October 20, 2026 — Event details foundation (local, rollout disabled)

- Added shared create/edit fields and draft persistence for category, end time, external tickets/registration, minimum age, registration requirement and accessibility. Detail pages show these facts and address-based directions; category filtering is additive.
- New schema/UI are gated by `NEXT_PUBLIC_EVENT_DETAILS_ENABLED` (default off), pending `supabase/event_details.sql` on staging. No remote migration or deployment performed. See `supabase/EVENT_DETAILS.md`.
- Corrected create/edit CDMX time handling and event completion: known end time, otherwise end of the start date's CDMX calendar day. No historical timestamp backfill.
- Organizer/participant associations and cancellation/postponement notifications are covered by the later local event-management tranche above. Existing invitation future-start rules remain unchanged.

## October 20, 2026 — Compact cartelera filters

- Replaced the event-filter sidebar with an above-grid toolbar: search, icon-and-label date/colonia/access selects, and the existing wall/archive switch.
- Mobile filters collapse under an accessible “filtros” toggle with an active-filter count. “limpiar filtros” resets search, all three filters, and the archive view.
- The event wall now uses the full content width; existing filtering rules and data access are unchanged.

## October 20, 2026 — Feed icon-rail trial

- Explorar's desktop left menu now uses a 64px icon rail instead of 180px text navigation, with binoculars for explorar. Circle links remain separate from format filters; the redundant all-formats button is removed. Clicking an active format again clears it; no selected format means all posts. This toggle behavior also applies to the top filter layout. Icons have accessible names, hover/focus labels and red active indicators. The posting bar and right inset use the matching 88px offset, leaving more space for work.
- Mobile retains visible labels inside its existing filter disclosure. Short desktop viewports let the rail scroll with the page so every control remains reachable. Top navigation is unchanged. Local design trial; no push.

## October 20, 2026 — Invitations page styling

- `/colaboraciones` now uses the “invitaciones” heading, the wider community-page layout, Magma-red accents and thin dividers. Pending and accepted entries are grouped separately, preserving their resource links and newest-first order within each group.
- Added discovery links to the empty state, a retry link for load errors, and a pointer to event invitations in mensajes. Authentication, feature gate, queries and privacy rules are unchanged.

## October 20, 2026 — Simplified account menus

- Desktop and mobile account menus no longer include guardados or borradores. Existing profile URLs, saved content, drafts and their permissions remain unchanged. This supersedes the October 13 shortcut addition.
- The `/colaboraciones` menu label is now “invitaciones”; the destination and feature flag are unchanged. Event invitations remain in mensajes.

## October 20, 2026 — Consistent collaborator search

- Project and individual-post collaboration panels reuse the same username picker as uploads and event invitations: search, select/remove accounts, then explicitly send. Owner-only invitation controls and acceptance/credit/privacy rules are unchanged.
- Multiple selections use the existing single-account RPC sequentially; partial failure retains failed and unsent selections while reporting successful sends. No migration or push. Local tests cover panel wiring, multiple recipients and partial failures; multi-account staging acceptance remains pending.

## October 20, 2026 — Red signup email (staging accepted)

- Signup confirmation and resend emails now use Magma red (`#E12120`), dark backgrounds and white button text. Live-text branding avoids remote image dependencies; both confirmation variables are preserved.
- Updated the local template, added two regression tests, and saved the palette to magma-staging. User confirmed the staging test passed. Production is unchanged; no push performed.

## October 20, 2026 — Intentional onboarding (staging database applied)

- Added the introduction, existing full manifesto, two questions and community agreements before account creation. No personality scoring, long minimum answer length or owner approval requirement.
- Private `member_onboarding` records keep original answers, question/agreement/privacy snapshots, version, acceptance time and optional owner review marker. Account deletion cascades; answers are not public profile fields or Auth metadata. The member can read their own record through RLS; this first version has no member editing screen.
- Added owner-only `/staff/ingresos`, linked from `/staff`. Review changes neither membership nor moderation state.
- New Auth accounts must originate from the server registration flow; a database trigger rejects direct public signup and prevents email confirmation before private answers exist. Existing accounts remain unchanged. Future OAuth or manual invitations must integrate this flow rather than bypass it.
- Applied migration to `magma-staging` (`jbzkdzcaqmxsmmyrlwif`) and passed rollback-only live permission checks in `supabase/test_member_onboarding.sql`. Confirmed zero remaining synthetic accounts/profiles/answers, RLS enabled and signup guard enabled. Local PostgreSQL checks additionally cover cascade deletion. No email was sent, no existing member was modified, and production is unchanged. The local app uses staging; user confirmed staging acceptance October 20; hosted frontend deployment remains separate. See `supabase/MEMBER_ONBOARDING.md`.

## October 9, 2026 — Hidden-post moderation tab

- The moderator account-menu link shows a small crimson dot while any posts await approval. Realtime refresh, focus refresh and a 15-second polling fallback keep it current; successful local reviews refresh it immediately. It represents the outstanding queue, not an unread notification, and does not clear merely by opening the menu.

- Moderator accounts now see a “moderación” link to `/mod` in desktop and mobile account menus. Visibility uses the signed-in profile's `is_moderator` flag; server authorization remains unchanged.

- Added `/mod?tab=ocultos`, a moderator-only paginated inventory of posts with `is_hidden = true`, independent of report status or existence. Includes author, title, publication date, approval state and a link to inspect the post. No permission changes or migration needed.
- Hidden posts have a confirmation-based restore action independent of reports. `supabase/restore_hidden_post.sql` adds a moderator-only atomic restore/audit function; it preserves approval status, audience and open reports. Existing report actions are unchanged.
- Restore migration activated in staging on October 9, 2026; production untouched. Verified function availability; no real post was restored during implementation.

## October 7, 2026 — Moderator team and reliable review actions

- Activated owner-only moderator management at `/staff/team` in staging; @majmaj is the configured owner and can moderate. Production is unchanged.
- Added database protection against self-assigned moderator roles, access-change history, and atomic report actions that target comments independently of parent posts.
- Added explicit queue errors/retry, cancellation-safe rejection, and confirmation for permanent deletion.
- Verified owner self-removal and unauthorized role changes are blocked in rollback-only SQL checks. User confirmed the staging test passed.
- TypeScript, scoped lint, and five moderation interaction tests passed. Invitation links remain out of scope; friends register before the owner adds their username.

## October 7, 2026 — Source backlog checkpoint

- Committed the accumulated shared styling/media, authentication, upload/draft, post-detail, colectivo privacy/invitation, messaging, search, profile and project work by concern.
- Included schema migrations, SQL checks, staging fixture scripts/assets and product planning sources. This checkpoint does not apply any migrations or deploy/push code.
- Updated stale test assumptions for uniform event posters, event body search, click-to-play video and colectivo-only search exclusion. All 34 Node tests and TypeScript pass; full ESLint has zero errors and 14 warnings.
- Local tool settings, generated documents, diagnostic folders and environment credentials are excluded. A fresh production build and full cross-account/browser regression were not performed for this commit-only pass.

## October 5, 2026 — Colectivo post audiences

- Posts created inside a colectivo have an immutable `audience_colectivo_id`; members can read them, with existing moderator oversight preserved. Sharing an existing public post into a colectivo leaves the original public.
- Database row policies protect private posts, their comments, and post notifications. Nonmembers see an access-request prompt on colectivo pages and a generic unavailable message at private post URLs.
- Public feeds, profile post lists, search, letras, projects, and event listings exclude colectivo-only posts, including for members.
- New colectivo uploads use the private `colectivo-media` bucket and authenticated `/api/colectivo-media` endpoint with no-store responses; public uploads retain their existing storage.
- `supabase/colectivo_post_privacy.sql` applied to staging. Rollback-only checks in `supabase/test_colectivo_post_privacy.sql` verify member access, outsider denial, comments, atomic linking, immutable audience, and unchanged public shares. Production migration remains pending.
- The 15 explicitly labeled sample posts were backfilled using `supabase/example_colectivo_post_privacy.sql`. Other historical shares were not reclassified because their original creation context cannot be inferred safely.

## September 17, 2026

- Created the canonical roles and pages inventory.
- Added moderator/owner staff entry points.
- Documented the post-review queue, moderation history, and future risk-based moderation direction.
- Recorded sticker responses as planned rather than active work.
- Consolidated the homepage and Explore into one Reddit-like community stream at `/`, with contextual project and colectivo rails.
- Constrained homepage media to the viewport so complete images and videos remain visible without cropping.
- Added an aspect-aware editorial stream layout: portrait artwork pairs the complete image with its title, context, tags, and author instead of filling unused space artificially.
- Removed event posts from the homepage archive so Cartelera remains their dedicated destination.
- Added captions from the existing post description: portrait posts place them beneath the title in the editorial side panel, while landscape media keeps them below the image.
- Constrained homepage video previews to a smaller viewport-aware frame so the full video remains visible above its caption.
- Added a consistent, low-pressure interaction system across the stream and post pages: appreciate, comment, save, share, and contextual moderation actions.
- Reworked the main archive into a chronological editorial front page: one lead story, two supporting stories, and an alternating multi-column archive that returns to one column on mobile.
- Evolved the archive into a hybrid editorial discovery layout: a continuous natural-height three-column masonry wall on desktop, two columns on tablets, and one column on phones.
# Comment replies — staging rollout (2026-10-24)

- Individual-post conversations support one-level threads through `comments.parent_id`; “responder” opens and focuses the composer directly beneath the clicked comment (including an existing reply). Switching targets preserves the draft; replies remain grouped beneath their root.
- October 23–24: user confirmed inline replies and a second-account reply locally, then authorized hosted staging rollout. Feed icons show the RLS-visible comment total, including replies. Activation is scoped to the existing `codex/magma-preview` branch; production remains unchanged.
- Existing ownership, reporting, private visibility and closed-comment rules remain in force. Deleted parents leave replies readable as standalone comments.
- Apply `supabase/comment_replies.sql` before setting `NEXT_PUBLIC_COMMENT_REPLIES_ENABLED=true`. The migration validates same-post, visible, non-hidden root targets and prevents reparenting. Existing RLS is not replaced.
- Local grouping and mocked UI tests cover thread targeting, cancellation, draft preservation, closed comments, hidden/unavailable parents and the disabled rollout. Two local PostgreSQL harnesses cover trigger behavior and the actual baseline RLS plus colectivo privacy policies, including cross-account writes, private audiences, membership removal and deletion of another user's parent comment without losing replies.
- October 22: hardened the FK-cleanup exception so an RLS-invisible parent cannot be detached through a direct update. Added schema-cache reload and concise send-failure messages; hidden/unavailable parent threads do not offer an invalid reply action. Comment text preserves line breaks and wraps long words.
- October 22: migration applied to staging only (`jbzkdzcaqmxsmmyrlwif`); parent column, deletion-preserving FK, trigger, index and RLS verified. Local staging-backed server has the process-only flag enabled. A labeled reply from `@majma` persisted under its root after reload, with the detail total increasing from 15 to 16. Fixture retained. Hosted preview activation and multi-account browser acceptance remain pending; production is unchanged. Reply-specific notifications are not part of this first pass. Rollout checklist: `supabase/COMMENT_REPLIES.md`.
