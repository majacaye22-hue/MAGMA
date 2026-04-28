export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from "next/navigation";
import Link from "next/link";

import { PostCard } from "@/app/components/card-art";
import type { Post } from "@/app/components/card-art";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Project = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  links: { spotify?: string; instagram?: string; website?: string } | null;
  author_id: string;
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

export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const currentUserId = null;

  // Fetch project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectData, error: projectError } = await (supabase as any)
    .from("projects")
    .select("id, title, description, cover_image_url, links, author_id")
    .eq("id", id)
    .single();

  if (projectError || !projectData) {
    console.error("Project fetch error:", projectError, "id:", id);
    notFound();
  }
  const project = projectData as Project;

  // Fetch post IDs for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ppData } = await (supabase as any)
    .from("post_projects")
    .select("post_id")
    .eq("project_id", id);

  let posts: Post[] = [];

  if (ppData && ppData.length > 0) {
    const postIds = ppData.map((r: { post_id: string }) => r.post_id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: postsData } = await (supabase as any)
      .from("posts")
      .select("*, profiles(username, display_name)")
      .in("id", postIds);

    posts = (postsData ?? []) as Post[];
  }

  const links = project.links ?? {};
  const isOwner = currentUserId === project.author_id;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      {/* Cover + title overlay */}
      <div style={{ position: "relative", height: "280px", overflow: "hidden", backgroundColor: "#141412" }}>
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
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(12,12,11,0.92) 0%, rgba(12,12,11,0.3) 50%, transparent 100%)" }} />

        {/* Back link */}
        <div style={{ position: "absolute", top: "20px", left: "24px" }}>
          <Link
            href="/"
            style={{ fontSize: "10px", color: "rgba(232,228,220,0.5)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.14em" }}
          >
            ← volver
          </Link>
        </div>

        {/* Title overlaid at bottom */}
        <div className="max-w-6xl mx-auto px-6" style={{ position: "absolute", bottom: "24px", left: 0, right: 0 }}>
          <p style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "6px" }}>
            proyecto
          </p>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 40px)", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.01em" }}>
            {project.title}
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">

        {/* Description + links row */}
        <div style={{ paddingTop: "24px", paddingBottom: "28px", borderBottom: "0.5px solid #2a2a28", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "32px" }}>
          <div style={{ flex: 1 }}>
            {project.description && (
              <p style={{ fontSize: "13px", color: "#888780", fontFamily: mono, lineHeight: 1.8, maxWidth: "600px" }}>
                {project.description}
              </p>
            )}

            {/* Link icons */}
            {(links.spotify || links.instagram || links.website) && (
              <div style={{ display: "flex", gap: "20px", marginTop: project.description ? "16px" : 0 }}>
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

          {/* Right: obra count + owner CTA */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {posts.length} {posts.length === 1 ? "obra" : "obras"}
            </span>
            {isOwner && (
              <Link
                href={`/upload?proyecto=${id}`}
                style={{
                  fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                  padding: "8px 14px", border: "0.5px solid #D85A30", color: "#D85A30",
                  textDecoration: "none",
                }}
              >
                + agregar obra
              </Link>
            )}
          </div>
        </div>

        {/* Obras section */}
        <div style={{ paddingTop: "28px", paddingBottom: "80px" }}>
          <p style={{ fontSize: "9px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "20px" }}>
            obras
          </p>

          {posts.length === 0 ? (
            <div style={{ paddingTop: "48px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                sin obras todavía
              </p>
              {isOwner && (
                <Link
                  href={`/upload?proyecto=${id}`}
                  style={{ display: "inline-block", marginTop: "12px", fontSize: "10px", color: "#D85A30", fontFamily: mono, textDecoration: "underline" }}
                >
                  subir primera obra →
                </Link>
              )}
            </div>
          ) : (
            <div style={{ columns: 3, columnGap: "1px" }}>
              {posts.map((post, i) => (
                <div key={post.id} style={{ breakInside: "avoid", marginBottom: "1px" }}>
                  <PostCard post={post} index={i} total={posts.length} currentUserId={currentUserId} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
