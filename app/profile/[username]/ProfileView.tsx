"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import type { Post } from "@/app/components/card-art";
import { ProjectCard, type Project } from "@/app/components/ProjectCard";
import { CreateProjectModal } from "@/app/components/CreateProjectModal";

const isDev = process.env.NODE_ENV !== 'production';

type PostThumb = { id: string; media_url: string | null; cover_url: string | null; type: string };

type CollectionPost = {
  posts: PostThumb | PostThumb[] | null;
};

type Collection = {
  id: string;
  name: string;
  is_public: boolean;
  collection_posts: CollectionPost[];
};

type Tab = "obras" | "eventos" | "letras" | "colecciones";

export interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  disciplines: string[] | null;
  avatar_color: string | null;
  casa_name?: string | null;
  casa_tone?: string | null;
  casa_welcome?: string | null;
  casa_pinned_post_ids?: string[] | null;
  casa_shelf_items?: string[] | null;
  casa_cartel_post_id?: string | null;
  casa_radio_post_id?: string | null;
}

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const CASA_TONES: Record<string, { accent: string; wash: string }> = {
  terracota: { accent: "#D85A30", wash: "rgba(216,90,48,0.08)" },
  jade: { accent: "#5DCAA5", wash: "rgba(93,202,165,0.08)" },
  noche: { accent: "#4A7FA5", wash: "rgba(74,127,165,0.08)" },
  ciruela: { accent: "#7F77DD", wash: "rgba(127,119,221,0.08)" },
};

const CASA_SHELF_ITEMS: Record<string, { label: string; detail: string }> = {
  radio: { label: "radio", detail: "algo sonando" },
  cartel: { label: "cartel", detail: "algo por pasar" },
};

function ShelfObject({ item, accent, linkedPost }: { item: string; accent: string; linkedPost?: Post | null }) {
  const object = CASA_SHELF_ITEMS[item];
  if (!object) return null;

  const contents = (
    <div style={{ background: "rgba(12,12,11,0.42)", border: "0.5px solid rgba(232,228,220,0.14)", minHeight: "118px", padding: "14px", position: "relative" }}>
      <div aria-hidden="true" style={{ height: "54px", marginBottom: "11px", position: "relative" }}>
        {item === "radio" && <><div style={{ border: `1px solid ${accent}`, height: "33px", left: "3px", position: "absolute", top: "12px", width: "68px" }} /><div style={{ border: `1px solid ${accent}`, borderRadius: "50%", height: "18px", left: "11px", position: "absolute", top: "19px", width: "18px" }} /><div style={{ borderTop: `1px solid ${accent}`, left: "40px", position: "absolute", top: "20px", width: "22px" }} /><div style={{ borderTop: `1px solid ${accent}`, left: "40px", position: "absolute", top: "26px", width: "18px" }} /><div style={{ border: `1px solid ${accent}`, borderBottom: "none", height: "16px", left: "18px", position: "absolute", top: "0", transform: "skewX(-24deg)", width: "1px" }} /></>}
        {item === "cartel" && <><div style={{ background: accent, height: "43px", left: "13px", opacity: 0.18, position: "absolute", top: "4px", transform: "rotate(-6deg)", width: "36px" }} /><div style={{ border: `1px solid ${accent}`, height: "43px", left: "18px", position: "absolute", top: "7px", transform: "rotate(5deg)", width: "36px" }} /><span style={{ color: accent, fontFamily: syne, fontSize: "16px", fontWeight: 800, left: "25px", position: "absolute", top: "18px" }}>+</span></>}
      </div>
      <p style={{ color: "#e8e4dc", fontFamily: mono, fontSize: "10px", textTransform: "uppercase" }}>{object.label}</p>
      <p className="truncate" style={{ color: linkedPost ? accent : "#5F5E5A", fontFamily: mono, fontSize: "9px", marginTop: "3px" }}>{linkedPost ? linkedPost.title ?? `${object.label} fijado` : object.detail}</p>
    </div>
  );

  return linkedPost ? (
    <Link href={`/post/${linkedPost.id}`} style={{ textDecoration: "none" }} title={`abrir: ${linkedPost.title ?? `${object.label} fijado`}`}>{contents}</Link>
  ) : contents;
}

function getInitials(p: ProfileData): string {
  if (p.display_name) {
    return p.display_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  return p.username.slice(0, 2).toUpperCase();
}

function formatStat(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const DISCIPLINE_COLORS: Record<string, string> = {
  "arte visual": "#D85A30",
  "grabado":     "#C4622A",
  "serigrafía":  "#5DCAA5",
  "fotografía":  "#4A7FA5",
  "música":      "#5DCAA5",
  "diseño":      "#4A7FA5",
  "escritura":   "#7F77DD",
  "performance": "#EF9F27",
  "cine":        "#888780",
  "otro":        "#888780",
};

function disciplineColor(tag: string): string {
  return DISCIPLINE_COLORS[tag.toLowerCase()] ?? "#D85A30";
}

// Type-specific accent colours for placeholder cards
const TYPE_ACCENT: Record<string, string> = {
  arte:       "#D85A30",
  fotografía: "#4A7FA5",
  música:     "#5DCAA5",
  evento:     "#EF9F27",
  escrito:    "#7F77DD",
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
          backgroundColor: "#141412",
          border: "0.5px solid #2a2a28",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {/* Media layer */}
        {mediaSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc}
            alt={post.title ?? ""}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
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
          className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[9px] uppercase tracking-widest"
          style={{
            background: "rgba(12,12,11,0.82)",
            color: "#888780",
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
              style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700 }}
            >
              {post.title}
            </p>
          )}
          <span style={{ fontSize: "9px", color: accent, fontFamily: mono, marginTop: "4px" }}>
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
          backgroundColor: "#141412",
          border: "0.5px solid #2a2a28",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <span
          style={{
            fontSize: "9px",
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
            <p style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1.2 }}>
              {post.title}
            </p>
          )}
          {preview && (
            <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, lineHeight: 1.5 }}>
              {preview}{preview.length >= 100 ? "…" : ""}
            </p>
          )}
        </div>
        <span style={{ fontSize: "9px", color: "#444441", fontFamily: mono }}>
          ver →
        </span>
      </div>
    </Link>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function BannerSVG() {
  return (
    <svg width="100%" height="180" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="banner-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e1e1c" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="1200" height="180" fill="url(#banner-grid)" />
      <circle cx="960" cy="90" r="55"  fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="95"  fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="140" fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="190" fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="245" fill="none" stroke="#1e1e1c" strokeWidth="0.6" />
    </svg>
  );
}

const TABS: Tab[] = ["obras", "eventos", "letras", "colecciones"];

function LaTrama({
  shared,
  events,
  comments,
  colectivos,
  isOwnProfile,
}: {
  shared: number;
  events: number;
  comments: number;
  colectivos: number;
  isOwnProfile: boolean;
}) {
  const gestures = shared + events + comments + colectivos;
  const items = [
    { value: shared, label: "obra compartida" },
    { value: events, label: "evento abierto" },
    { value: comments, label: "comentario dejado" },
    { value: colectivos, label: "cuarto colectivo" },
  ];

  if (gestures === 0) {
    return (
      <aside style={{ background: "#141412", border: "0.5px solid #2a2a28", padding: "18px" }}>
        <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.15em", marginBottom: "8px", textTransform: "uppercase" }}>la trama</p>
        <p style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "17px", fontWeight: 800, lineHeight: 1.15, marginBottom: "8px" }}>la casa empieza con un gesto.</p>
        <p style={{ color: "#888780", fontFamily: mono, fontSize: "10px", lineHeight: 1.55 }}>{isOwnProfile ? "cuando compartas, abras un evento o dejes una nota, los hilos aparecerán aquí." : "los hilos que esta persona deja en la casa aparecerán aquí."}</p>
      </aside>
    );
  }

  return (
    <aside style={{ background: "#141412", border: "0.5px solid #2a2a28", padding: "17px 18px" }}>
      <div className="flex items-start justify-between gap-4" style={{ borderBottom: "0.5px solid #2a2a28", paddingBottom: "13px" }}>
        <div>
          <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.15em", marginBottom: "5px", textTransform: "uppercase" }}>la trama</p>
          <p style={{ color: "#888780", fontFamily: mono, fontSize: "10px", lineHeight: 1.5 }}>los hilos que esta persona ha dejado en la casa</p>
        </div>
        <p style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "28px", fontWeight: 800, lineHeight: 1 }}>{formatStat(gestures)}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 pt-4">
        {items.map((item) => (
          <div key={item.label}>
            <p style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "17px", fontWeight: 800, lineHeight: 1 }}>{formatStat(item.value)}</p>
            <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "9px", lineHeight: 1.35, marginTop: "4px", textTransform: "uppercase" }}>{item.label}{item.value === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileView({
  profile,
  posts,
  isOwnProfile,
  currentUserId,
  laTrama = { comments: 0, colectivos: 0 },
  cartelPost,
  radioPost,
}: {
  profile: ProfileData;
  posts: Post[];
  isOwnProfile: boolean;
  currentUserId: string | null;
  laTrama?: { comments: number; colectivos: number };
  cartelPost?: Post | null;
  radioPost?: Post | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("obras");
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [colectivos, setColectivos] = useState<{ id: string; name: string; slug: string; avatar_color: string }[]>([]);
  const [listings, setListings] = useState<{ id: string; title: string; price: number; currency: string; images: string[] }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from("colectivo_members")
      .select("colectivos(id, name, slug, avatar_color)")
      .eq("user_id", profile.id)
      .then(({ data }: { data: { colectivos: { id: string; name: string; slug: string; avatar_color: string } | null }[] | null }) => {
        const cols = (data ?? [])
          .map((m) => m.colectivos)
          .filter((c): c is { id: string; name: string; slug: string; avatar_color: string } => c !== null);
        setColectivos(cols);
      });
  }, [profile.id]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("listings")
      .select("id, title, price, currency, images")
      .eq("user_id", profile.id)
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }: { data: { id: string; title: string; price: number; currency: string; images: string[] }[] | null }) => {
        setListings(data ?? []);
      });
  }, [profile.id]);

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
        setProjects(data ?? []);
      });
  }, [profile.id]);

  useEffect(() => {
    if (activeTab !== "colecciones" || collectionsLoaded) return;
    const supabase = getSupabaseClient();
    supabase
      .from("collections")
      .select("id, name, is_public, collection_posts(posts(id, media_url, cover_url, type))")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Collection[] | null }) => {
        setCollections(data ?? []);
        setCollectionsLoaded(true);
      });
  }, [activeTab, collectionsLoaded, profile.id]);

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
  const obrasPosts       = posts.filter((p) => p.type === "arte" || p.type === "música" || p.type === "fotografía");
  const eventosPosts     = posts.filter((p) => p.type === "evento");
  const letrasPosts       = posts.filter((p) => p.type === "escrito");

  const visiblePosts =
    activeTab === "obras"       ? obrasPosts :
    activeTab === "eventos"     ? eventosPosts :
    letrasPosts;

  const initials    = getInitials(profile);
  const avatarBg    = profile.avatar_color ?? "#D85A30";
  const disciplines = profile.disciplines ?? [];
  const casaTone = CASA_TONES[profile.casa_tone ?? "terracota"] ?? CASA_TONES.terracota;
  const pinnedPosts = (profile.casa_pinned_post_ids ?? [])
    .map((id) => posts.find((post) => post.id === id))
    .filter((post): post is Post => Boolean(post));
  const shelfItems = (profile.casa_shelf_items?.length ? profile.casa_shelf_items : ["radio", "cartel"])
    .filter((item) => item in CASA_SHELF_ITEMS)
    .slice(0, 2);

  const projectsSection = (projects.length > 0 || isOwnProfile) && (
    <section style={{ borderTop: "0.5px solid #2a2a28", marginTop: "24px", paddingTop: "22px" }}>
      <div className="flex items-end justify-between gap-4" style={{ marginBottom: "16px" }}>
        <div>
          <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.15em", marginBottom: "6px", textTransform: "uppercase" }}>proyectos personales</p>
          <p style={{ color: "#888780", fontFamily: mono, fontSize: "10px", lineHeight: 1.5 }}>lo que {isOwnProfile ? "estás" : "esta persona está"} construyendo ahora</p>
        </div>
        {isOwnProfile && (
          <button onClick={() => setShowCreateProject(true)} style={{ background: "none", border: "0.5px solid #D85A30", color: "#D85A30", cursor: "pointer", fontFamily: mono, fontSize: "9px", letterSpacing: "0.12em", padding: "7px 10px", textTransform: "uppercase" }}>
            + nuevo proyecto
          </button>
        )}
      </div>
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      ) : (
        <div style={{ border: "0.5px dashed #2a2a28", color: "#5F5E5A", fontFamily: mono, fontSize: "10px", padding: "28px 16px" }}>
          Este espacio es para ese proyecto que siempre explicas cuando alguien pregunta “¿en qué andas?”.
        </div>
      )}
    </section>
  );

  return (
    <>
      <div style={{ backgroundColor: "#0f0d0b", height: "118px", overflow: "hidden", position: "relative" }}>
        <BannerSVG />
        <p style={{ bottom: "18px", color: "#5F5E5A", fontFamily: mono, fontSize: "9px", left: "max(24px, calc((100% - 1152px) / 2))", letterSpacing: "0.16em", position: "absolute", textTransform: "uppercase" }}>perfil creativo · cdmx</p>
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="py-8">
          {/* Name, house and participation */}
          <div className="grid gap-8 lg:grid-cols-[1fr_330px] lg:items-start">
            <div>
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="flex items-center justify-center text-base font-bold shrink-0"
                    style={{ width: "54px", height: "54px", borderRadius: "3px", backgroundColor: avatarBg, color: "#0c0c0b", fontFamily: syne }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h1 className="leading-tight" style={{ fontSize: "clamp(34px, 4vw, 48px)", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, letterSpacing: "-0.055em" }}>
                      {profile.display_name ?? `@${profile.username}`}
                    </h1>
                    <p className="mt-1 text-xs" style={{ color: "#5F5E5A", fontFamily: mono }}>@{profile.username}{profile.location ? ` · ${profile.location}` : ""}</p>
                  </div>
                </div>
                {isOwnProfile ? (
                  <Link href="/profile/edit" className="px-3 py-2 text-xs tracking-widest uppercase border shrink-0" style={{ borderColor: "#D85A30", color: "#D85A30", backgroundColor: "transparent", fontFamily: mono, fontSize: "9px", textDecoration: "none" }}>editar perfil</Link>
                ) : (
                  <button onClick={handleMessage} disabled={messagingLoading} className="px-3 py-2 text-xs tracking-widest uppercase border cursor-pointer hover:opacity-80 disabled:opacity-50 shrink-0" style={{ borderColor: "#D85A30", color: "#D85A30", backgroundColor: "transparent", fontFamily: mono, fontSize: "9px" }}>{messagingLoading ? "..." : "dejar una nota"}</button>
                )}
              </div>
            {profile.bio && (
              <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "#888780", fontFamily: mono, maxWidth: "560px" }}>
                {profile.bio}
              </p>
            )}

            {disciplines.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {disciplines.map((d) => {
                  const color = disciplineColor(d);
                  return (
                    <span key={d} className="px-2.5 py-0.5 text-[10px] uppercase tracking-widest border" style={{ borderColor: color, color, fontFamily: mono, opacity: 0.85 }}>
                      {d}
                    </span>
                  );
                })}
              </div>
            )}

            {projectsSection}

            <section style={{ background: casaTone.wash, borderLeft: `2px solid ${casaTone.accent}`, marginTop: "24px", maxWidth: "620px", padding: "14px 16px" }}>
              <p style={{ color: casaTone.accent, fontFamily: mono, fontSize: "9px", letterSpacing: "0.15em", marginBottom: "7px", textTransform: "uppercase" }}>casa de @{profile.username}</p>
              <p style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "20px", fontWeight: 800, lineHeight: 1.05, marginBottom: profile.casa_welcome ? "8px" : 0 }}>{profile.casa_name || "una casa en construcción"}</p>
              {profile.casa_welcome && <p style={{ color: "#888780", fontFamily: mono, fontSize: "11px", lineHeight: 1.55 }}>{profile.casa_welcome}</p>}
            </section>

            <section style={{ marginTop: "18px", maxWidth: "620px" }}>
              <div className="flex items-end justify-between gap-4" style={{ marginBottom: "9px" }}>
                <div>
                  <p style={{ color: casaTone.accent, fontFamily: mono, fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase" }}>repisa de la casa</p>
                  <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "9px", marginTop: "4px" }}>pequeñas cosas que hacen este cuarto suyo</p>
                </div>
                {isOwnProfile && <Link href="/profile/edit" style={{ color: "#888780", fontFamily: mono, fontSize: "9px", textDecoration: "underline", textUnderlineOffset: "4px" }}>acomodar</Link>}
              </div>
              <div className="grid grid-cols-2 gap-2" style={{ borderTop: `1px solid ${casaTone.accent}`, paddingTop: "8px" }}>
                {shelfItems.map((item) => <ShelfObject key={item} item={item} accent={casaTone.accent} linkedPost={item === "cartel" ? cartelPost : radioPost} />)}
              </div>
            </section>

            </div>
            <LaTrama shared={posts.length} events={eventosPosts.length} comments={laTrama.comments} colectivos={laTrama.colectivos} isOwnProfile={isOwnProfile} />
          </div>

          {/* Colectivos badges */}
          {colectivos.length > 0 && (
            <div style={{ marginTop: "20px", paddingBottom: "20px" }}>
              <p style={{ fontSize: "9px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "10px" }}>
                colectivos
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {colectivos.map((col) => (
                  <Link
                    key={col.id}
                    href={`/colectivos/${col.slug}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "4px 10px", border: "0.5px solid #2a2a28",
                      textDecoration: "none",
                    }}
                    className="hover:border-[#D85A30] transition-colors"
                  >
                    <div style={{ width: "8px", height: "8px", borderRadius: "1px", backgroundColor: col.avatar_color, flexShrink: 0 }} />
                    <span style={{ fontSize: "10px", color: "#888780", fontFamily: mono }}>{col.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <section style={{ borderTop: "0.5px solid #2a2a28", marginTop: "22px", paddingTop: "22px" }}>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p style={{ color: casaTone.accent, fontFamily: mono, fontSize: "9px", letterSpacing: "0.15em", marginBottom: "6px", textTransform: "uppercase" }}>muro principal</p>
                <p style={{ color: "#888780", fontFamily: mono, fontSize: "10px" }}>las cosas que esta persona quiere dejar a la vista</p>
              </div>
              {isOwnProfile && <Link href="/profile/edit" style={{ color: "#888780", fontFamily: mono, fontSize: "9px", letterSpacing: "0.1em", textDecoration: "underline", textUnderlineOffset: "4px", textTransform: "uppercase" }}>editar mi casa</Link>}
            </div>
            {pinnedPosts.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {pinnedPosts.map((post) => {
                  const src = post.type === "música" ? post.cover_url : post.media_url ?? post.media_base64;
                  return <Link key={post.id} href={`/post/${post.id}`} style={{ background: "#141412", border: "0.5px solid #2a2a28", color: "inherit", minHeight: "132px", overflow: "hidden", position: "relative", textDecoration: "none" }}>
                    {src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={post.title ?? "Obra fijada"} style={{ height: "100%", inset: 0, objectFit: "cover", position: "absolute", width: "100%" }} />
                    )}
                    <span style={{ background: "rgba(12,12,11,0.82)", bottom: 0, color: "#e8e4dc", display: "block", fontFamily: mono, fontSize: "10px", left: 0, padding: "8px 9px", position: "absolute", right: 0 }}>{post.title ?? "sin título"}</span>
                  </Link>;
                })}
              </div>
            ) : (
              <div style={{ border: "0.5px dashed #2a2a28", color: "#5F5E5A", fontFamily: mono, fontSize: "10px", padding: "26px 16px" }}>
                {isOwnProfile ? (
                  <>
                    <p>todavía no hay obras colgadas aquí.</p>
                    <p style={{ marginTop: "8px" }}><Link href="/subir" style={{ color: casaTone.accent, textDecoration: "underline", textUnderlineOffset: "4px" }}>subir primera obra</Link><span> · después podrás elegir hasta tres para este muro.</span></p>
                  </>
                ) : "el muro todavía se está armando"}
              </div>
            )}
          </section>
        </div>

        {/* Works grid */}
        <div className="pt-8 pb-16">
          {/* Tabs */}
          <div className="flex gap-0 border-b mb-6" style={{ borderColor: "#2a2a28" }}>
            {TABS.map((tab) => {
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="min-w-0 flex-1 px-1 py-3 text-[9px] tracking-wide uppercase cursor-pointer sm:px-5 sm:text-xs sm:tracking-widest"
                  style={{
                    fontFamily: mono,
                    color: isActive ? "#e8e4dc" : "#888780",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${isActive ? "#D85A30" : "transparent"}`,
                    marginBottom: "-1px",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {activeTab === "colecciones" ? (
            collections.length === 0 && collectionsLoaded ? (
              <div className="py-24 text-center text-xs tracking-widest uppercase" style={{ color: "#444441", fontFamily: mono }}>
                sin colecciones
              </div>
            ) : !collectionsLoaded ? (
              <div className="py-24 text-center text-xs tracking-widest uppercase" style={{ color: "#444441", fontFamily: mono }}>
                cargando...
              </div>
            ) : (
              <div className="grid grid-cols-2" style={{ gap: "2px" }}>
                {collections.map((col) => {
                  const thumbs = col.collection_posts
                    .map((cp) => Array.isArray(cp.posts) ? cp.posts[0] : cp.posts)
                    .filter(Boolean)
                    .slice(0, 4) as PostThumb[];
                  if (thumbs.length === 0) return null;
                  return (
                    <Link key={col.id} href={`/colecciones/${profile.username}/${col.id}`} style={{ textDecoration: "none", display: "block", border: "0.5px solid #2a2a28" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", aspectRatio: "1", gap: "1px", backgroundColor: "#2a2a28" }}>
                        {Array.from({ length: 4 }).map((_, i) => {
                          const p = thumbs[i];
                          const src = p ? (p.type === "música" ? p.cover_url : p.media_url) ?? null : null;
                          return (
                            <div key={i} style={{ backgroundColor: "#1a1a18", position: "relative", overflow: "hidden" }}>
                              {src && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, marginBottom: "3px" }}>{col.name}</p>
                        <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono }}>
                          {col.collection_posts.length} {col.collection_posts.length === 1 ? "obra" : "obras"}
                          {!col.is_public && <span style={{ marginLeft: "8px", color: "#2a2a28" }}>privada</span>}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          ) : visiblePosts.length === 0 ? (
            <div className="py-24 text-center" style={{ border: "0.5px dashed #2a2a28" }}>
              <p style={{ color: "#888780", fontFamily: syne, fontSize: "21px", fontWeight: 800, marginBottom: "8px" }}>esta habitación está por llenarse</p>
              <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px", lineHeight: 1.6, margin: "0 auto 18px", maxWidth: "350px" }}>Una obra, una nota o un evento es una forma de dejar la puerta abierta.</p>
              {isOwnProfile && <Link href="/upload" style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", textDecoration: "underline", textUnderlineOffset: "4px", textTransform: "uppercase" }}>dejar algo en casa →</Link>}
            </div>
          ) : activeTab === "letras" ? (
            <div className="grid grid-cols-3" style={{ gridAutoRows: "200px", gridAutoFlow: "dense" }}>
              {visiblePosts.map((post) => (
                <ManifiestoCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3" style={{ gridAutoRows: "220px", gridAutoFlow: "dense" }}>
              {visiblePosts.map((post) => (
                <ProfilePostCard key={post.id} post={post} />
              ))}
            </div>
          )}
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

      {/* Tianguis section */}
      {listings.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pb-16" style={{ borderTop: "0.5px solid #2a2a28", paddingTop: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <p style={{ fontSize: "9px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              tianguis
            </p>
            <Link href={`/tianguis?seller=${profile.username}`} style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              ver todo →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1px", backgroundColor: "#2a2a28" }}>
            {listings.map((listing) => {
              const img = listing.images?.[0] ?? null;
              return (
                <Link key={listing.id} href={`/tianguis/${listing.id}`} style={{ textDecoration: "none", display: "block", backgroundColor: "#0c0c0b" }}>
                  <div style={{ backgroundColor: "#0c0c0b" }}>
                    <div style={{ aspectRatio: "1", backgroundColor: "#141412", position: "relative", overflow: "hidden" }}>
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                      )}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <p style={{ fontSize: "12px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1.2, marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {listing.title}
                      </p>
                      <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono }}>
                        ${listing.price} <span style={{ fontSize: "9px", color: "#5F5E5A" }}>{listing.currency}</span>
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
