export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from "next/navigation";
import Link from "next/link";

import { PostCard } from "@/app/components/card-art";
import type { Post } from "@/app/components/card-art";
import { createClient } from "@/lib/supabase-server";
import { ProjectEditor } from "./ProjectEditor";
import { projectCoverShape, projectCoverStyle } from "@/lib/project-cover";
import cards from "@/app/components/archive-card-preview.module.css";
import styles from "./project.module.css";
import { COLLABORATIONS_ENABLED } from '@/lib/collaborations';
import { CollaborationPanel, UnlinkProjectEntry } from '@/app/components/CollaborationPanel';

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Project = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  links: { spotify?: string; soundcloud?: string; instagram?: string; website?: string; cover_shape?: string } | null;
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
  const { data: ppData, error: entriesError } = await supabase
    .from("post_projects")
    .select("post_id")
    .eq("project_id", id);
  if (entriesError) throw new Error('no se pudieron cargar las entradas del proyecto');

  let posts: Post[] = [];

  if (ppData && ppData.length > 0) {
    const postIds = ppData.map((r: { post_id: string }) => r.post_id);

    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(username, display_name)")
      .is("audience_colectivo_id", null)
      .in("id", postIds);
    if (postsError) throw new Error('no se pudieron cargar las publicaciones del proyecto');

    posts = (postsData ?? []) as Post[];
  }

  const links = project.links ?? {};
  const isOwner = currentUserId === project.author_id;
  const creator = Array.isArray(project.profiles) ? project.profiles[0] : project.profiles;
  const journalPosts = [...posts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const compactPreview = id === "e7a09280-0000-4000-8000-000000000001";

  return (
    <div className={`${styles.page} ${compactPreview ? styles.compactPreview : ""} min-h-screen`} style={{ backgroundColor: "var(--magma-obsidian)" }}>

      {/* Project title page */}
      <div className="mx-auto max-w-6xl px-6 pt-4 pb-4">
        {/* Back link */}
        <div className="mb-4">
          <Link
            href="/proyectos"
            style={{ fontSize: "var(--magma-text-small)", color: "#fff", fontFamily: mono, textDecoration: "none" }}
          >
            ← proyectos
          </Link>
        </div>

        <div className={`grid items-center gap-4 md:gap-6 ${project.cover_image_url ? (projectCoverShape(project.links) === "horizontal" ? "md:grid-cols-[320px_minmax(0,1fr)]" : "md:grid-cols-[240px_minmax(0,1fr)]") : ""}`}>
        {project.cover_image_url && (
          <div style={projectCoverStyle(projectCoverShape(project.links))} className="w-full max-w-[400px] overflow-hidden rounded-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.cover_image_url}
              alt={project.title}
              className="block h-full w-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="magma-page-title" style={{ color: "#fff", fontFamily: syne, fontWeight: 800, letterSpacing: "-0.055em", maxWidth: "880px", overflowWrap: "anywhere" }}>
            {project.title}
          </h1>
          {creator && <Link href={`/profile/${creator.username}`} style={{ color: "#fff", display: "inline-block", fontFamily: mono, fontSize: "13px", marginTop: "8px", textDecoration: "none" }}>@{creator.username}</Link>}
          {project.description && <p className="mt-3 max-w-[680px] whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ fontFamily: mono }}>{project.description}</p>}
        </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">

        {/* Opening note */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div style={{ maxWidth: "680px" }}>

            {/* Link icons */}
            {(links.spotify || links.soundcloud || links.instagram || links.website) && (
              <div className={`${styles.links} flex flex-wrap gap-4`}>
                {links.spotify && (
                  <a
                    href={links.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <MusicIcon /> música
                  </a>
                )}
                {links.soundcloud && (
                  <a href={links.soundcloud} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }} className="hover:opacity-70 transition-opacity">
                    <SoundCloudIcon /> soundcloud
                  </a>
                )}
                {links.instagram && (
                  <a
                    href={links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }}
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
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em" }}
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
              <div className={`${styles.actions} flex flex-wrap gap-2 md:justify-end`}>
                <ProjectEditor project={project} />
                {!COLLABORATIONS_ENABLED && <Link
                  href={`/upload?proyecto=${id}`}
                  style={{
                    fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                    padding: "8px 14px", border: "0.5px solid #E12120", color: "var(--magma-ash)",
                    textDecoration: "none",
                  }}
                >
                  + nueva entrada
                </Link>}
              </div>
            )}
          </div>
        </div>

        {COLLABORATIONS_ENABLED && <CollaborationPanel kind="project" targetId={id} ownerId={project.author_id} userId={currentUserId} />}
        {/* Journal entries */}
        <div className={`mx-auto ${compactPreview ? "max-w-[640px]" : "max-w-[800px]"} pb-16 pt-2`}>
          <h2 className="mb-3 text-xl" style={{ fontFamily: syne }}>entradas</h2>

          {journalPosts.length === 0 ? (
            <div style={{ paddingTop: "24px", textAlign: "center" }}>
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                la primera página sigue en blanco
              </p>
              {isOwner && !COLLABORATIONS_ENABLED && (
                <Link
                  href={`/upload?proyecto=${id}`}
                  style={{ display: "inline-block", marginTop: "12px", fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textDecoration: "underline" }}
                >
                  escribir la primera entrada →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {journalPosts.map((post, i) => (
                <article key={post.id} className={cards.card}>
                  <header className={cards.label}>
                    <div className={cards.byline}>
                      {post.profiles && <Link href={`/profile/${post.profiles.username}`}>@{post.profiles.username}</Link>}
                      <time dateTime={post.created_at}>{formatEntryDate(post.created_at)}</time>
                    </div>
                  </header>
                  <div style={{ minWidth: 0 }}>
                    <PostCard post={post} index={i} total={journalPosts.length} currentUserId={currentUserId} stream editorialSize="archive" fitMedia />
                  </div>
                  <footer className="pt-3 pb-1 text-center text-xs tabular-nums text-white" style={{ fontFamily: mono }}>
                    {COLLABORATIONS_ENABLED && (isOwner || post.author_id === currentUserId) && <UnlinkProjectEntry projectId={id} postId={post.id} />}
                    <span aria-label={`página ${i + 1}`}>{String(i + 1).padStart(2, "0")}</span>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
