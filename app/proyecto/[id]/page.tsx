export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from "next/navigation";
import Link from "next/link";

import { PostCard } from "@/app/components/card-art";
import type { Post } from "@/app/components/card-art";
import { createClient } from "@/lib/supabase-server";
import { ProjectEditor } from "./ProjectEditor";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Project = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  links: { spotify?: string; soundcloud?: string; instagram?: string; website?: string } | null;
  author_id: string;
  profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  );
}

function SoundCloudIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 28 18" fill="currentColor" aria-hidden="true">
      <path d="M1 10h1v5H1zm3-3h1v8H4zm3-2h1v10H7zm3-3h1v13h-1zm3 2.2A7 7 0 0 1 25.8 9H26a3 3 0 0 1 0 6H13z" />
    </svg>
  );
}

function formatEntryDate(date: string) {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const currentUserId = user.id;

  // Fetch project
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("id, title, description, cover_image_url, links, author_id, profiles!projects_author_id_fkey(username, display_name)")
    .eq("id", id)
    .maybeSingle();

  if (projectError || !projectData) {
    console.error("Project fetch error:", projectError, "id:", id);
    notFound();
  }
  const project = projectData as Project;

  // Fetch post IDs for this project
  const { data: ppData } = await supabase
    .from("post_projects")
    .select("post_id")
    .eq("project_id", id);

  let posts: Post[] = [];

  if (ppData && ppData.length > 0) {
    const postIds = ppData.map((r: { post_id: string }) => r.post_id);

    const { data: postsData } = await supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(username, display_name)")
      .in("id", postIds);

    posts = (postsData ?? []) as Post[];
  }

  const links = project.links ?? {};
  const isOwner = currentUserId === project.author_id;
  const creator = Array.isArray(project.profiles) ? project.profiles[0] : project.profiles;
  const journalPosts = [...posts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      {/* Project title page */}
      <div className="min-h-[420px] md:min-h-[520px]" style={{ position: "relative", overflow: "hidden", backgroundColor: "#141412" }}>
        {project.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover_image_url}
            alt={project.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1e1e1c 0%, #0c0c0b 100%)" }} />
        )}

        {/* Scrim */}
        <div style={{ position: "absolute", inset: 0, background: project.cover_image_url ? "linear-gradient(to top, rgba(12,12,11,0.96) 0%, rgba(12,12,11,0.38) 58%, rgba(12,12,11,0.1) 100%)" : "repeating-linear-gradient(0deg, transparent 0, transparent 31px, rgba(232,228,220,0.035) 32px), linear-gradient(135deg, #1e1e1c 0%, #0c0c0b 100%)" }} />

        {/* Back link */}
        <div style={{ position: "absolute", top: "20px", left: "24px" }}>
          <Link
            href="/proyectos"
            style={{ fontSize: "10px", color: "rgba(232,228,220,0.5)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.14em" }}
          >
            ← proyectos
          </Link>
        </div>

        {/* Title overlaid at bottom */}
        <div className="max-w-6xl mx-auto px-6" style={{ position: "absolute", bottom: "38px", left: 0, right: 0 }}>
          <p style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "6px" }}>
            cuaderno de proyecto · {String(journalPosts.length).padStart(2, "0")} entradas
          </p>
          <h1 style={{ fontSize: "clamp(42px, 8vw, 88px)", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.055em", maxWidth: "880px" }}>
            {project.title}
          </h1>
          {creator && <Link href={`/profile/${creator.username}`} style={{ color: "rgba(232,228,220,0.7)", display: "inline-block", fontFamily: mono, fontSize: "10px", marginTop: "16px", textDecoration: "none" }}>una mirada dentro de @{creator.username} →</Link>}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">

        {/* Opening note */}
        <div className="grid gap-8 py-10 md:grid-cols-[150px_1fr_auto] md:items-start" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <div>
            <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" }}>nota de apertura</p>
            <p style={{ color: "#444441", fontFamily: mono, fontSize: "9px", lineHeight: 1.5, marginTop: "7px" }}>esto puede cambiar<br />mientras se hace</p>
          </div>
          <div style={{ maxWidth: "680px" }}>
            {project.description && (
              <p style={{ fontSize: "clamp(17px, 2.5vw, 24px)", color: "#e8e4dc", fontFamily: syne, fontStyle: "italic", fontWeight: 600, lineHeight: 1.45 }}>
                {project.description}
              </p>
            )}
            {!project.description && <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "11px" }}>este proyecto todavía está encontrando las palabras para presentarse.</p>}

            {/* Link icons */}
            {(links.spotify || links.soundcloud || links.instagram || links.website) && (
              <div className="flex flex-wrap" style={{ gap: "20px", marginTop: "20px" }}>
                {links.spotify && (
                  <a
                    href={links.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#5DCAA5", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <MusicIcon /> música
                  </a>
                )}
                {links.soundcloud && (
                  <a href={links.soundcloud} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#D85A30", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }} className="hover:opacity-70 transition-opacity">
                    <SoundCloudIcon /> soundcloud
                  </a>
                )}
                {links.instagram && (
                  <a
                    href={links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#888780", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <InstagramIcon /> instagram
                  </a>
                )}
                {links.website && (
                  <a
                    href={links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#888780", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <GlobeIcon /> web
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Owner tools */}
          <div className="items-start md:items-end" style={{ display: "flex", flexDirection: "column", gap: "10px", flexShrink: 0 }}>
            {isOwner && (
              <div className="flex flex-wrap gap-2 md:justify-end">
                <ProjectEditor project={project} />
                <Link
                  href={`/upload?proyecto=${id}`}
                  style={{
                    fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                    padding: "8px 14px", border: "0.5px solid #D85A30", color: "#D85A30",
                    textDecoration: "none",
                  }}
                >
                  + nueva entrada
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Journal entries */}
        <div style={{ paddingTop: "44px", paddingBottom: "100px" }}>
          <div className="flex items-end justify-between gap-4" style={{ marginBottom: "38px" }}>
            <div>
              <p style={{ fontSize: "9px", color: "#D85A30", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" }}>proceso abierto</p>
              <h2 style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "32px", fontWeight: 800, letterSpacing: "-0.04em" }}>entradas del proceso</h2>
            </div>
            <span style={{ color: "#444441", fontFamily: mono, fontSize: "10px" }}>{journalPosts.length} total</span>
          </div>

          {journalPosts.length === 0 ? (
            <div style={{ paddingTop: "48px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                la primera página sigue en blanco
              </p>
              {isOwner && (
                <Link
                  href={`/upload?proyecto=${id}`}
                  style={{ display: "inline-block", marginTop: "12px", fontSize: "10px", color: "#D85A30", fontFamily: mono, textDecoration: "underline" }}
                >
                  escribir la primera entrada →
                </Link>
              )}
            </div>
          ) : (
            <div>
              {journalPosts.map((post, i) => (
                <article key={post.id} className="grid gap-5 py-8 md:grid-cols-[150px_minmax(0,680px)] md:gap-8" style={{ borderTop: "0.5px solid #2a2a28" }}>
                  <aside>
                    <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" }}>entrada {String(i + 1).padStart(2, "0")}</p>
                    <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "9px", lineHeight: 1.5, marginTop: "7px" }}>{formatEntryDate(post.created_at)}</p>
                    <p style={{ color: "#444441", fontFamily: mono, fontSize: "9px", marginTop: "4px", textTransform: "uppercase" }}>{post.type}</p>
                  </aside>
                  <div style={{ minWidth: 0 }}>
                    <PostCard post={post} index={i} total={journalPosts.length} currentUserId={currentUserId} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
