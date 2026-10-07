"use client";
import { CircleButton } from "@/app/components/CircleButton";
import { Echoes } from "./Echoes";
import projectStyles from "@/app/proyectos/proyectos.module.css";

import { useState, useEffect, type ReactNode } from "react";
import { FeedImage } from "@/app/components/FeedImage";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftList } from "@/app/borradores/DraftList";
import { getSupabaseClient } from "@/lib/supabase";
import type { Post } from "@/app/components/card-art";
import { SensitiveContentGate } from "@/app/components/SensitiveContentGate";
import { ProjectCard, type Project } from "@/app/components/ProjectCard";
import { CreateProjectModal } from "@/app/components/CreateProjectModal";

const isDev = process.env.NODE_ENV !== 'production';
const PROFILE_FILTERS = ["todo", "publicaciones", "ecos", "letras", "proyectos", "colectivos", "agenda", "guardados", "borradores"] as const;

type ProfileColectivo = {
  id: string;
  name: string;
  slug: string;
  avatar_color: string;
  cover_image_url: string | null;
  description: string | null;
};

function ProfileColectivoCard({ col }: { col: ProfileColectivo }) {
  return <Link href={`/colectivos/${col.slug}`} className="block min-w-0 rounded-[2px] border border-[#49463f] bg-[#10100f] p-[10px] text-white hover:border-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--magma-red)]">
    <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden" style={{ backgroundColor: col.avatar_color || "#090909" }}>
      {col.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={col.cover_image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : <span className="text-5xl font-bold text-white" style={{ fontFamily: syne }}>{col.name.slice(0, 1).toUpperCase()}</span>}
    </div>
    <div className="px-0.5 pt-3 pb-0.5">
      <h3 className="break-words text-base font-bold leading-tight" style={{ fontFamily: syne }}>{col.name}</h3>
      {col.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white" style={{ fontFamily: mono }}>{col.description}</p>}
    </div>
  </Link>;
}

function PublicationPreview({ post, moodboard = false }: { post: Post; moodboard?: boolean }) {
  const playable = post.type === "video" || post.type === "música" || /^(audio|video)\//.test(post.media_type ?? "");
  const image = playable ? post.cover_url : post.media_url ?? post.media_base64;
  const excerpt = (post.body || post.content || "").replace(/<[^>]*>/g, " ").trim();
  return (
    <article className="min-w-0">
      <SensitiveContentGate enabled={post.is_sensitive === true} postId={post.id} compact>
        <Link href={`/post/${post.id}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4" style={{ color: "var(--magma-ash)", textDecoration: "none" }}>
          <div className={`relative flex ${image || moodboard ? "" : "aspect-[4/5]"} items-center justify-center overflow-hidden`} style={{ background: "var(--magma-rock)" }}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={post.title ?? "publicación"} loading="lazy" className="block h-auto w-full" />
            ) : (
              <div className="w-full p-5">
                <span className="text-xs" style={{ color: "var(--magma-ash)" }}>{post.type === "escrito" ? "letra" : post.type}</span>
                <p className="mt-4 text-lg leading-snug line-clamp-3">{post.title || "sin título"}</p>
                {excerpt && <p className="mt-4 text-xs leading-relaxed line-clamp-5">{excerpt}</p>}
                {playable && <span className="mt-6 block text-xs">{post.type === "música" ? "escuchar" : "reproducir"} ↗</span>}
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span style={{ color: "var(--magma-ash)" }}>{post.type === "escrito" ? "letra" : post.type}</span>
            <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" })}</time>
          </div>
          <h3 className="mt-2 text-[14px] leading-snug group-hover:underline" style={{ overflowWrap: "anywhere" }}>{post.title || "sin título"}</h3>
        </Link>
      </SensitiveContentGate>
    </article>
  );
}

type PostThumb = { id: string; title: string | null; body: string | null; media_type: string | null; media_url: string | null; cover_url: string | null; type: string };

type CollectionPost = {
  posts: PostThumb | PostThumb[] | null;
};

type Collection = {
  id: string;
  name: string;
  is_public: boolean;
  collection_posts: CollectionPost[];
};


type AttendingEvent = {
  id: string;
  title: string;
  event_date: string | null;
  venue: string | null;
  address: string | null;
  media_url: string | null;
  media_base64: string | null;
};

type AttendanceRow = {
  posts: AttendingEvent | AttendingEvent[] | null;
};

export interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  hometown?: string | null;
  avatar_color: string | null;
  cover_image_url: string | null;
}

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

// Type-specific accent colours for placeholder cards
const TYPE_ACCENT: Record<string, string> = {
  arte:       "var(--magma-red)",
  fotografía: "#4675D1",
  música:     "var(--magma-orange)",
  evento:     "var(--magma-hot)",
  escrito:    "var(--magma-ash)",
};

// ─── Profile grid card ────────────────────────────────────────────────────────
// Always shows media_url / media_base64 as a cover image when available.
// Falls back to a minimal type-branded placeholder.

function ProfilePostCard({ post }: { post: Post }) {
  const mediaSrc = post.type === "música"
    ? (post.cover_url ?? null)
    : (post.media_url ?? post.media_base64 ?? null);
  const accent   = TYPE_ACCENT[post.type] ?? "#888780";
  const typeLabel = post.type === "fotografía" ? "foto" : post.type;

  return (
    <Link
      href={`/post/${post.id}`}
      style={{ display: "contents", textDecoration: "none" }}
    >
      <div
        className="group relative overflow-hidden cursor-pointer"
        style={{
          backgroundColor: "var(--magma-rock)",
          border: "0.5px solid var(--magma-border)",
          borderRadius: "12px",
          boxShadow: "0 12px 30px rgba(16,43,102,0.14)",
          minWidth: 0,
          minHeight: post.type === "evento" && !mediaSrc ? "260px" : 0,
        }}
      >
        {/* Media layer */}
        {mediaSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc}
            alt={post.title ?? ""}
            style={{
              position: post.type === "evento" ? "relative" : "absolute",
              inset: 0,
              width: "100%",
              height: post.type === "evento" ? "auto" : "100%",
              objectFit: post.type === "evento" ? "contain" : "cover",
              display: "block",
            }}
            loading="lazy"
          />
        ) : (
          /* Placeholder — subtle accent mark in the corner */
          <div
            className="absolute inset-0 flex items-end p-3"
            style={{ backgroundColor: "#141412" }}
          >
            <div style={{ width: "20px", height: "20px", backgroundColor: accent, opacity: 0.15 }} />
          </div>
        )}

        {/* Type badge */}
        <span
          className="absolute top-2 left-2 z-10 px-2 py-0.5 text-xs uppercase tracking-widest"
          style={{
            background: "rgba(12,12,11,0.82)",
            color: "var(--magma-muted)",
            border: "0.5px solid #2a2a28",
            fontFamily: mono,
          }}
        >
          {typeLabel}
        </span>

        {/* Hover overlay */}
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "linear-gradient(to top, rgba(12,12,11,0.92) 0%, rgba(12,12,11,0.4) 60%, transparent 100%)" }}
        >
          {post.title && (
            <p
              className="leading-snug line-clamp-2"
              style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700 }}
            >
              {post.title}
            </p>
          )}
          <span style={{ fontSize: "var(--magma-text-small)", color: accent, fontFamily: mono, marginTop: "4px" }}>
            ↑ {post.upvotes.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Escrito card for letras tab ──────────────────────────────────────────────

function ManifiestoCard({ post }: { post: Post }) {
  const preview = post.content
    ? post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)
    : (post.body?.slice(0, 100) ?? "");

  return (
    <Link href={`/post/${post.id}`} style={{ display: "contents", textDecoration: "none" }}>
      <div
        className="group relative overflow-hidden cursor-pointer flex flex-col justify-between p-4"
        style={{
          backgroundColor: "var(--magma-rock)",
          border: "0.5px solid var(--magma-border)",
          borderRadius: "12px",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <span
          style={{
            fontSize: "var(--magma-text-small)",
            color: "#7F77DD",
            fontFamily: mono,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            border: "0.5px solid #7F77DD",
            padding: "2px 7px",
            alignSelf: "flex-start",
          }}
        >
          letra
        </span>
        <div className="flex flex-col gap-1 flex-1 py-3">
          {post.title && (
            <p style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700, lineHeight: 1.2 }}>
              {post.title}
            </p>
          )}
          {preview && (
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.5 }}>
              {preview}{preview.length >= 100 ? "…" : ""}
            </p>
          )}
        </div>
        <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
          ver →
        </span>
      </div>
    </Link>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function BannerSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="banner-atmosphere" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#090A0D" />
          <stop offset="62%" stopColor="#102B66" />
          <stop offset="100%" stopColor="#17171C" />
        </linearGradient>
        <radialGradient id="banner-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB21C" stopOpacity="0.95" />
          <stop offset="24%" stopColor="#FF641F" stopOpacity="0.88" />
          <stop offset="64%" stopColor="#E83B20" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#E83B20" stopOpacity="0" />
        </radialGradient>
        <pattern id="banner-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D7D4CD" strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="1200" height="180" fill="url(#banner-atmosphere)" />
      <rect width="1200" height="180" fill="url(#banner-grid)" />
      <circle cx="920" cy="66" r="150" fill="url(#banner-core)" />
      <circle cx="920" cy="66" r="55"  fill="none" stroke="#D7D4CD" strokeOpacity="0.12" strokeWidth="0.8" />
      <circle cx="920" cy="66" r="95"  fill="none" stroke="#D7D4CD" strokeOpacity="0.1" strokeWidth="0.8" />
      <circle cx="920" cy="66" r="140" fill="none" stroke="#D7D4CD" strokeOpacity="0.08" strokeWidth="0.8" />
      <path d="M0 148 C180 112 310 174 480 138 S760 88 1200 135" fill="none" stroke="#FF641F" strokeOpacity="0.34" strokeWidth="2" />
      <path d="M0 158 C210 128 350 184 540 150 S860 112 1200 148" fill="none" stroke="#E83B20" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileView({
  profile,
  posts,
  isOwnProfile,
  currentUserId,
}: {
  profile: ProfileData;
  posts: Post[];
  isOwnProfile: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const profileParams = useSearchParams();
  const requestedFilter = profileParams.get("tab");
  const profileFilter = PROFILE_FILTERS.find(filter => filter === requestedFilter && (filter !== "borradores" || (isOwnProfile && currentUserId === profile.id))) ?? "todo";
  const showSection = (section: typeof PROFILE_FILTERS[number]) => profileFilter === section;
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [colectivosLoaded, setColectivosLoaded] = useState(false);
  const [colectivos, setColectivos] = useState<ProfileColectivo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<AttendingEvent[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [retryLoad, setRetryLoad] = useState(0);
  function loadFailed(section: string) {
    setLoadErrors((prev) => ({ ...prev, [section]: `no se pudo cargar ${section}` }));
  }

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from("colectivo_members")
      .select("colectivos(id, name, slug, avatar_color, cover_image_url, description)")
      .eq("user_id", profile.id)
      .then(({ data, error }: { data: { colectivos: ProfileColectivo | null }[] | null; error: unknown }) => {
        if (error) { loadFailed("colectivos"); return; }
        const cols = (data ?? [])
          .map((m) => m.colectivos)
          .filter((c): c is ProfileColectivo => c !== null);
        setColectivos(cols);
        setColectivosLoaded(true);
      });
  }, [profile.id, retryLoad]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from("event_attendances")
      .select("posts(id, title, event_date, venue, address, media_url, media_base64)")
      .eq("user_id", profile.id)
      .then(({ data, error }: { data: AttendanceRow[] | null; error: unknown }) => {
        if (error) { loadFailed("agenda"); return; }
        const now = Date.now();
        const events = (data ?? [])
          .map((row) => Array.isArray(row.posts) ? row.posts[0] : row.posts)
          .filter((event): event is AttendingEvent => Boolean(event))
          .filter((event) => !event.event_date || new Date(event.event_date).getTime() >= now)
          .sort((a, b) => {
            if (!a.event_date) return 1;
            if (!b.event_date) return -1;
            return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
          });
        setAttendingEvents(events);
      }, () => loadFailed("agenda"));
  }, [profile.id, retryLoad]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("projects")
      .select("id, title, description, cover_image_url, links")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }: { data: Project[] | null; error: unknown }) => {
        if (isDev) console.log("[ProfileView] projects query →", { data, error });
        if (error) { loadFailed("proyectos"); return; }
        setProjects(data ?? []);
      }, () => loadFailed("proyectos"));
  }, [profile.id, retryLoad]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from("collections")
      .select("id, name, is_public, collection_posts(posts(id, title, body, media_type, media_url, cover_url, type))")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }: { data: Collection[] | null; error: unknown }) => {
        if (error) { loadFailed("guardados"); setCollectionsLoaded(true); return; }
        setCollections(data ?? []);
        setCollectionsLoaded(true);
      }, () => { loadFailed("guardados"); setCollectionsLoaded(true); });
  }, [profile.id, retryLoad]);

  async function handleMessage() {
    if (!currentUserId) { router.push("/auth/login"); return; }
    setMessagingLoading(true);
    const supabase = getSupabaseClient();

    // Canonical order: smaller uuid is participant_1
    const [p1, p2] = [currentUserId, profile.id].sort();

    // Find existing conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_1", p1)
      .eq("participant_2", p2)
      .single();

    if (existing) {
      router.push(`/mensajes?c=${existing.id}`);
      return;
    }

    // Create new conversation
    const { data: created } = await supabase
      .from("conversations")
      .insert({ participant_1: p1, participant_2: p2 })
      .select("id")
      .single();

    setMessagingLoading(false);
    if (created) router.push(`/mensajes?c=${created.id}`);
  }

  // Tab filtering — covers all post types

  // Letters are publications too; the server supplies all posts newest first.
  const visiblePosts = profileFilter === "letras"
    ? posts.filter((post) => post.type === "escrito")
    : posts;

  const projectsSection = (projects.length > 0 || isOwnProfile) && (
    <section aria-label="proyectos personales" className="text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl" style={{ fontFamily: syne, fontWeight: 700 }}>proyectos personales</h2>
        {isOwnProfile && (
          <button type="button" onClick={() => setShowCreateProject(true)} className="min-h-11 cursor-pointer rounded-[2px] border border-[var(--magma-red)] bg-transparent px-4 py-2 text-sm text-white hover:bg-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--magma-red)]" style={{ fontFamily: mono }}>
            + nuevo proyecto
          </button>
        )}
      </div>
      {projects.length > 0 ? (
        <div className={`${projectStyles.cards} grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}>
          {projects.map((project) => <ProjectCard key={project.id} project={project} portrait />)}
        </div>
      ) : (
        <div className="py-6 text-sm text-white" style={{ fontFamily: mono }}>
          todavía no hay proyectos · empieza con lo que estás construyendo
        </div>
      )}
    </section>
  );
  const attendingSection = attendingEvents.length > 0 && (
    <section style={{ marginTop: "24px", paddingTop: "4px" }}>
      <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.15em", marginBottom: "8px", textTransform: "uppercase" }}>próximos encuentros</p>
      <h2 style={{ color: "var(--magma-ash)", fontFamily: syne, fontSize: "clamp(25px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "16px" }}>
        {isOwnProfile ? "voy a ir" : `${profile.display_name ?? `@${profile.username}`} va a ir`}
      </h2>
      <div className="grid grid-cols-2 items-start gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
        {attendingEvents.map((event) => {
          const image = event.media_url ?? event.media_base64;
          return (
            <Link key={event.id} href={`/post/${event.id}`} className="group block min-w-0 self-start" style={{ textDecoration: "none" }}>
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden" style={{ backgroundColor: "var(--magma-rock)" }}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={event.title ?? "cartel del evento"} loading="lazy" className="block h-full w-full object-contain" />
              ) : <span className="p-5 text-sm" style={{ color: "var(--magma-ash)" }}>{event.title}</span>}
              </div>
              <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--magma-border)" }}>
                <p className="text-base leading-snug group-hover:underline" style={{ color: "var(--magma-ash)", fontFamily: syne, overflowWrap: "anywhere" }}>{event.title}</p>
                <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.6, marginTop: "8px", textTransform: "uppercase" }}>
                  {event.event_date ? new Date(event.event_date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "fecha por anunciar"}
                  {(event.venue || event.address) && ` · ${event.venue ?? event.address}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );

  const boardGroups: { key: string; content: ReactNode }[][] = [
    posts.map(post => ({ key: `post-${post.id}`, content: <PublicationPreview post={post} moodboard /> })),
    projects.map(project => ({ key: `project-${project.id}`, content: <ProjectCard project={project} /> })),
    colectivos.map(col => ({ key: `colectivo-${col.id}`, content: <ProfileColectivoCard col={col} /> })),
    attendingEvents.filter(event => !posts.some(post => post.id === event.id)).map(event => ({ key: `event-${event.id}`, content: <Link href={`/post/${event.id}`} className="block text-white">{(event.media_url || event.media_base64) && <FeedImage src={(event.media_url || event.media_base64)!} alt={event.title} className="h-auto w-full rounded-lg" />}<p className="mt-2 text-xs text-white/60">{isOwnProfile ? "voy a ir" : "agenda"}</p><p className="mt-1 text-sm">{event.title}</p></Link> })),
    collections.filter(col => isOwnProfile || col.is_public).map(col => ({ key: `collection-${col.id}`, content: <Link href={`/colecciones/${profile.username}/${col.id}`} className="block rounded-lg bg-white/5 p-5 text-white hover:bg-white/10"><span className="text-xs text-white/60">colección{!col.is_public ? " · privada" : ""}</span><p className="mt-4 break-words text-xl">{col.name}</p><p className="mt-3 text-xs">{col.collection_posts.length} obras ↗</p></Link> })),
  ];
  const boardItems = Array.from({ length: Math.max(...boardGroups.map(group => group.length)) }, (_, index) => boardGroups.flatMap(group => group[index] ? [group[index]] : [])).flat();

  return (
    <div style={{ backgroundColor: "var(--magma-obsidian)", color: "#fff", minHeight: "100vh" }}>
      <div className="h-[72px] sm:h-[96px]" style={{ backgroundColor: "var(--magma-rock)", overflow: "hidden", position: "relative" }}>
        {profile.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.cover_image_url} alt={`Portada de @${profile.username}`} style={{ display: "block", height: "100%", objectFit: "cover", width: "100%" }} />
        ) : (
          <div style={{ height: "100%" }}><BannerSVG /></div>
        )}
        <div style={{ background: "linear-gradient(to top, var(--magma-obsidian) 0%, rgba(9,10,13,0.22) 72%, transparent 100%)", inset: 0, position: "absolute" }} />
        <p style={{ bottom: "24px", color: profile.cover_image_url ? "var(--magma-ash)" : "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", left: "max(24px, calc((100% - 1152px) / 2))", letterSpacing: "0.18em", position: "absolute", textShadow: profile.cover_image_url ? "0 1px 12px rgba(0,0,0,0.75)" : "none", textTransform: "uppercase" }}>archivo personal · cdmx</p>
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="py-3">
          {/* Identity and personal projects */}
          <div>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-5 min-w-0">
                  <div className="min-w-0">
                    <p style={{ color: "#fff", fontFamily: mono, fontSize: "13px", marginBottom: "4px" }}>@{profile.username}</p>
                    <h1 className="magma-page-title " style={{ color: "var(--magma-ash)", fontFamily: syne, fontWeight: 800, letterSpacing: "-0.06em" }}>
                      {profile.display_name ?? `@${profile.username}`}
                    </h1>
                    <p className="mt-1 text-[13px] break-words" style={{ color: "#fff", fontFamily: mono }}>
                      {profile.hometown?.trim() && <>de {profile.hometown.trim()} · </>}
                      en {profile.location?.trim() || "Ciudad de México"}
                    </p>
                  </div>
                </div>
                {isOwnProfile ? (
                  <Link href="/profile/edit" className="min-h-11 px-4 py-3 border shrink-0 hover:bg-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--magma-red)]" style={{ borderColor: "var(--magma-red)", borderRadius: "2px", color: "#fff", fontFamily: mono, fontSize: "var(--magma-text-small)", textDecoration: "none" }}>editar perfil</Link>
                ) : (
                  <button onClick={handleMessage} disabled={messagingLoading} className="min-h-11 px-4 py-3 border cursor-pointer hover:bg-[var(--magma-red)] disabled:opacity-50 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--magma-red)]" style={{ borderColor: "var(--magma-red)", borderRadius: "2px", color: "#fff", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>{messagingLoading ? "..." : "dejar una nota"}</button>
                )}
              </div>
            {!isOwnProfile && <div className="mt-3 [&_p]:text-white [&_button]:rounded-[2px]"><CircleButton key={profile.id} memberId={profile.id} userId={currentUserId} accent /></div>}
            {profile.bio && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#fff", fontFamily: mono, maxWidth: "720px" }}>
                {profile.bio}
              </p>
            )}



            </div>
          </div>


        </div>

        {/* Works grid */}
        {Object.keys(loadErrors).length > 0 && <div role="alert" className="py-4">
          <p>{Object.values(loadErrors).join(" · ")}</p>
          <button type="button" className="underline" onClick={() => { setLoadErrors({}); setCollectionsLoaded(false); setRetryLoad((n) => n + 1); }}>reintentar</button>
        </div>}
        <div className="pt-1 pb-16">
          <nav aria-label="filtrar perfil" className="mb-3 flex gap-6 overflow-x-auto" style={{ fontFamily: mono }}>
            {PROFILE_FILTERS.filter(filter => filter !== "borradores" || (isOwnProfile && currentUserId === profile.id)).map((filter) => (
              <button key={filter} type="button" aria-pressed={profileFilter === filter}
                onClick={() => router.replace(`/profile/${encodeURIComponent(profile.username)}?tab=${filter}`, { scroll: false })}
                className="min-h-11 shrink-0 cursor-pointer border-0 px-0 py-2 text-sm hover:!text-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--magma-red)]"
                style={{ background: "transparent", color: profileFilter === filter ? "var(--magma-red)" : "#fff", fontWeight: 400 }}>
                {filter}
              </button>
            ))}
          </nav>
          {profileFilter === "borradores" && isOwnProfile && currentUserId === profile.id && <section aria-label="borradores privados">
            <p className="mb-5 text-sm text-[var(--magma-muted)]">privado · guardados en este navegador. no se sincronizan entre dispositivos.</p>
            <DraftList key={currentUserId} userId={currentUserId} />
          </section>}
          {profileFilter === "ecos" && <Echoes profileId={profile.id} currentUserId={currentUserId} />}
          {profileFilter === "todo" && <section aria-label="mood board del perfil">
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {boardItems.map(item => <div key={item.key} className="mb-5 break-inside-avoid">{item.content}</div>)}
            </div>
            {!boardItems.length && <p className="py-6 text-sm">{collectionsLoaded && colectivosLoaded ? "este archivo todavía está en blanco" : "cargando archivo…"}</p>}
          </section>}
          <section hidden={!showSection("publicaciones") && profileFilter !== "letras"} aria-label="publicaciones">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl">publicaciones</h2>
              {isOwnProfile && <Link href="/upload" className="ml-auto text-xs" style={{ color: "var(--magma-ash)" }}>+ publicar</Link>}
            </div>
            <div className="grid grid-cols-2 items-start gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
              {visiblePosts.map((post) => <PublicationPreview key={post.id} post={post} />)}
            </div>
            {visiblePosts.length === 0 && <p className="py-6 text-sm">{profileFilter === "letras" ? "todavía no hay letras" : "todavía no hay publicaciones"}</p>}
          </section>
          <div hidden={profileFilter !== "proyectos"}>
          {loadErrors.proyectos ? <p role="alert">no se pudieron cargar los proyectos</p> : projectsSection || <section><h2 className="text-xl mb-3">proyectos personales</h2><p className="py-6 text-sm text-white">todavía no hay proyectos</p></section>}
          </div>
          <section hidden={!showSection("colectivos")} aria-label="colectivos">
            <h2 className="mb-3 text-xl">colectivos</h2>
            {loadErrors.colectivos ? <p role="alert">no se pudieron cargar los colectivos; usa reintentar arriba</p> : !colectivosLoaded ? <p role="status">cargando colectivos…</p> : colectivos.length === 0 ? <p className="text-sm">todavía no hay colectivos en este perfil</p> : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {colectivos.map(col => <ProfileColectivoCard key={col.id} col={col} />)}
              </div>
            )}
          </section>
          <div hidden={!showSection("agenda")}>
          {loadErrors.agenda ? <p role="alert">no se pudo cargar la agenda</p> : attendingSection || <section className="mt-6 pt-1"><h2 className="text-2xl mb-6">agenda · voy a ir</h2><p className="text-sm">sin próximos encuentros</p></section>}
          </div>
          <section hidden={!showSection("guardados")} className="mt-6 pt-1" aria-label="guardados">
          <h2 className="mb-6 text-2xl">guardados</h2>
          {
            loadErrors.guardados ? <p role="alert">no se pudieron cargar tus guardados; usa reintentar arriba</p> : collections.length === 0 && collectionsLoaded ? (
              <div className="py-24 text-center text-xs tracking-widest uppercase" style={{ color: "var(--magma-muted)", fontFamily: mono }}>
                sin colecciones
              </div>
            ) : !collectionsLoaded ? (
              <div className="py-24 text-center text-xs tracking-widest uppercase" style={{ color: "var(--magma-muted)", fontFamily: mono }}>
                cargando...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                {collections.map((col) => {
                  const thumbs = col.collection_posts
                    .map((cp) => Array.isArray(cp.posts) ? cp.posts[0] : cp.posts)
                    .filter(Boolean)
                    .slice(0, 4) as PostThumb[];
                  if (thumbs.length === 0) return null;
                  return (
                    <Link key={col.id} href={`/colecciones/${profile.username}/${col.id}`} style={{ textDecoration: "none", display: "block", border: "0.5px solid var(--magma-border)", borderRadius: "12px", overflow: "hidden", backgroundColor: "var(--magma-rock)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", aspectRatio: "1", gap: "1px", backgroundColor: "#2a2a28" }}>
                        {Array.from({ length: 4 }).map((_, i) => {
                          const p = thumbs[i];
                          const isPlayable = p && (p.type === "música" || p.type === "video" || p.media_type?.startsWith("audio/") || p.media_type?.startsWith("video/"));
                          const src = p ? (isPlayable ? p.cover_url : p.media_url) ?? null : null;
                          return (
                            <div key={i} style={{ backgroundColor: "#1a1a18", position: "relative", overflow: "hidden" }}>
                              {src && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                              )}
                              {p && !src && (
                                <div style={{ position: "absolute", inset: 0, padding: "14px", display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden", background: "linear-gradient(145deg, #30201d, var(--magma-rock))", color: "var(--magma-ash)" }}>
                                  <span style={{ fontFamily: mono, fontSize: "var(--magma-text-small)", color: "var(--magma-ash)" }}>{p.type === "escrito" ? "letra" : p.type}</span>
                                  <p style={{ fontFamily: syne, fontSize: "var(--magma-text-body)", lineHeight: 1.3, overflowWrap: "anywhere" }}>{p.title || "sin título"}</p>
                                  {p.body && <p style={{ fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.body.replace(/<[^>]*>/g, " ").slice(0, 180)}</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700, marginBottom: "3px" }}>{col.name}</p>
                        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                          {col.collection_posts.length} {col.collection_posts.length === 1 ? "obra" : "obras"}
                          {!col.is_public && <span style={{ marginLeft: "8px", color: "#2a2a28" }}>privada</span>}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          }
          </section>
        </div>
      </div>

      {showCreateProject && currentUserId && (
        <CreateProjectModal
          userId={currentUserId}
          onClose={() => setShowCreateProject(false)}
          onCreated={(project) => {
            setProjects((prev) => [project, ...prev]);
            setShowCreateProject(false);
          }}
        />
      )}

    </div>
  );
}
