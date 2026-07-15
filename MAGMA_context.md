# MAGMA — Project Context for Claude Agents

## What is MAGMA?

MAGMA is a dark-themed creative community platform for artists in CDMX (Ciudad de México). This is a real product being built by Maja — not a demo. Treat all code as production quality.

---

## Stack

- **Next.js 16** (App Router), React 19, TypeScript
- **Tailwind CSS v4**
- **Supabase**: auth via `@supabase/ssr`, Postgres database, Storage bucket `"media"`
- Working directory: `/Users/maja/magma`

### IMPORTANT: Next.js 16 Breaking Changes

This is NOT standard Next.js 14/15. Read `node_modules/next/dist/docs/` before writing code.
- Route params are a **Promise**: `params: Promise<{ id: string }>` — must `await params`
- Always heed deprecation notices in the codebase

---

## Design System (all inline styles, no Tailwind for layout)

| Token | Value |
|-------|-------|
| Background | `#0c0c0b` |
| Surface | `#141412` |
| Border | `0.5px solid #2a2a28` |
| Text primary | `#e8e4dc` |
| Text muted | `#888780` |
| Text placeholder | `#5F5E5A` |
| Text dim | `#444441` |
| Accent coral | `#D85A30` (primary CTA, arte visual) |
| Teal | `#5DCAA5` (música) |
| Blue | `#378ADD` (fotografía) |
| Amber | `#EF9F27` (evento) |

**Fonts:**
- Heading: `var(--font-syne), sans-serif` — Syne weight 800
- Body/UI: `var(--font-space-mono), monospace` — Space Mono

**Navbar:** sticky, glass blur, `rgba(12,12,11,0.92)`

---

## Supabase Clients

```ts
// lib/supabase.ts — browser client (use in "use client" components)
import { getSupabaseClient } from "@/lib/supabase";
const supabase = getSupabaseClient();

// lib/supabase-server.ts — server client with cookies (server components)
// For public reads, prefer direct anon client to avoid RLS issues:
const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Supabase URL:** `https://avmztbdgyyrqccizmzsh.supabase.co`

---

## Database Schema

### Core tables

```sql
profiles (id uuid references auth.users, username, display_name, bio, location, disciplines[], avatar_url, created_at)

posts (id uuid, author_id references profiles, title, body, type: arte/música/fotografía/evento, media_url, media_type, tags[], upvotes, created_at)
```

### Projects system

```sql
projects (id uuid, author_id references profiles, title, description, cover_image_url, links jsonb {spotify?, instagram?, website?}, created_at)

post_projects (post_id uuid references posts, project_id uuid references projects)
-- join table linking posts to projects, one-to-one enforced by UI
```

**RLS:** `projects` needs a public SELECT policy (`USING (true)`) — add this in Supabase dashboard if project detail pages return 404.

### Radio system

```sql
radio_settings (id uuid, is_live bool, dj_name text, set_description text, stream_url text)
-- single row, owner updates via admin page

radio_chat (id uuid, body text, user_id references profiles, created_at)

djs (id uuid, user_id references profiles, name text, bio text, instagram text, genres text, approved bool, created_at)
```

### Other tables

```sql
bookmarks (user_id, post_id)
colecciones (id, name, user_id, post_ids[])
comments (id, post_id, user_id, body, created_at)
reports (id, post_id, user_id, reason, created_at)
direct_messages (id, sender_id, recipient_id, body, created_at, read bool)
collab_proposals (id, post_id, proposer_id, message, status: pending/accepted/rejected)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Home feed — async server component, fetches posts with profiles join |
| `app/upload/page.tsx` | Upload form — file → Supabase Storage → posts insert, project linking dropdown |
| `app/post/[id]/page.tsx` | Post detail page |
| `app/post/[id]/edit/page.tsx` | Edit post, includes project re-linking |
| `app/post/[id]/PostActions.tsx` | Client component — upvote, bookmark, report, collab |
| `app/proyecto/[id]/page.tsx` | Project detail page — `force-dynamic`, direct anon client, two-step post fetch |
| `app/components/card-art.tsx` | `PostCard` (real data) + `ArtCard` (mock) — main feed cards |
| `app/components/ProjectCard.tsx` | Project card — uses `window.location.href` for nav (no nested `<a>`) |
| `app/components/feed.tsx` | Client-side filter + grid |
| `app/components/navbar.tsx` | Sticky navbar, auth state via `onAuthStateChange` |
| `app/components/CreateProjectModal.tsx` | Modal to create a new project |
| `app/admin/page.tsx` | Owner-only radio settings + DJ approval panel |
| `app/radio/page.tsx` | Public radio page — live stream embed, chat, DJ info |
| `app/radio/dj/page.tsx` | DJ dashboard — auth-gated, realtime chat, live status |
| `lib/supabase.ts` | `getSupabaseClient()` — browser singleton |
| `lib/supabase-server.ts` | `createServerClient` with cookies |
| `middleware.ts` | Session refresh + protects `/upload`, `/profile/edit` |

---

## Important Patterns

### Navigation in cards (avoid nested `<a>`)
Cards use `div[role=button]` + `window.location.href` for the outer click, with `e.stopPropagation()` on inner `<a>` links:
```tsx
function navigate() { window.location.href = "/proyecto/" + project.id; }
<div role="button" tabIndex={0} onClick={navigate} onKeyDown={(e) => { if (e.key === "Enter") navigate(); }}>
  <a onClick={(e) => e.stopPropagation()} href={...}>...</a>
</div>
```

### Server components with dynamic data
```ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

### Two-step fetch (when joins fail silently)
```ts
const { data: ppData } = await supabase.from("post_projects").select("post_id").eq("project_id", id);
if (ppData && ppData.length > 0) {
  const postIds = ppData.map((r) => r.post_id);
  const { data: posts } = await supabase.from("posts").select("*, profiles(username, display_name)").in("id", postIds);
}
```

### Admin guard
```ts
const OWNER_ID = "d546124c-7d0a-4a2b-a668-0e6e491c439a";
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.id !== OWNER_ID) { router.replace("/"); return; }
```

### Optimistic UI toggle
```ts
async function toggleApproval(item) {
  await supabase.from("djs").update({ approved: !item.approved }).eq("id", item.id);
  setItems((prev) => prev.map((d) => d.id === item.id ? { ...d, approved: !d.approved } : d));
}
```

### Realtime chat subscription
```ts
const channel = supabase
  .channel("radio_chat")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "radio_chat" },
    async (payload) => {
      const { data } = await supabase.from("radio_chat")
        .select("*, profiles(username, display_name)")
        .eq("id", payload.new.id).single();
      if (data) setMessages((prev) => [...prev, data]);
    }
  ).subscribe();
```

### Auth state change types
```ts
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => { ... })
```

---

## Recent Features Built (as of 2026-07-15)

1. **Projects system** — create projects, tag posts to projects, `/proyecto/[id]` detail page
2. **Colecciones** — user curated collections
3. **Collab proposals** — propose collaborations on posts
4. **Bookmark system** — save posts
5. **Username login** — log in with username or email
6. **Direct messaging** — retro AIM-style inbox at `app/mensajes/`
7. **Comments + reports** — on post detail pages
8. **Admin panel** (`/admin`) — radio settings (is_live, dj_name, set_description, stream_url), DJ approval
9. **DJ system** — `djs` table, `/radio/dj` dashboard for approved DJs, profiles join for display name

---

## Dev Environment

```bash
cd /Users/maja/magma
npm run dev   # starts on localhost:3000
```

If pages return 404 after file changes: `rm -rf .next && npm run dev`

If a server component page 404s, check:
1. Stale `.next` cache → delete and restart
2. RLS blocking server-side client → add public SELECT policy in Supabase dashboard
3. Silent join failure → use two-step fetch instead of nested join
4. Missing `force-dynamic` export
