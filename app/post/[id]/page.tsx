import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Navbar } from "@/app/components/navbar";
import { CommentsSection, type Comment } from "@/app/components/CommentsSection";
import type { Post } from "@/app/components/card-art";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days !== 1 ? "s" : ""}`;
}

function initials(p: Post["profiles"]): string {
  if (!p) return "?";
  if (p.display_name) return p.display_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return p.username.slice(0, 2).toUpperCase();
}

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const labelStyle = {
  color: "#5F5E5A",
  fontFamily: mono,
  fontSize: "10px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
};

// ─── Author header (shared by both views) ─────────────────────────────────────

function AuthorHeader({ post }: { post: Post }) {
  if (!post.profiles) return null;
  const { username, display_name } = post.profiles;
  const name = display_name ?? `@${username}`;

  return (
    <div className="flex items-center gap-3" style={{ marginBottom: "24px" }}>
      {/* Initials avatar */}
      <Link href={`/profile/${username}`}>
        <div
          className="flex items-center justify-center shrink-0 text-xs font-bold"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "2px",
            backgroundColor: "#D85A30",
            color: "#0c0c0b",
            fontFamily: syne,
          }}
        >
          {initials(post.profiles)}
        </div>
      </Link>

      {/* Name + timestamp */}
      <div className="flex flex-col gap-0.5">
        <Link
          href={`/profile/${username}`}
          className="hover:underline"
          style={{ fontSize: "12px", color: "#888780", fontFamily: mono }}
        >
          @{username}
        </Link>
        <span style={{ fontSize: "11px", color: "#444441", fontFamily: mono }}>
          {relativeTime(post.created_at)}
        </span>
      </div>
    </div>
  );
}

// ─── Evento view ──────────────────────────────────────────────────────────────

type CurrentProfile = { username: string; display_name: string | null } | null;

function EventoView({ post, comments, currentUserId, currentProfile }: { post: Post; comments: Comment[]; currentUserId: string | null; currentProfile: CurrentProfile }) {
  return (
    <div className="max-w-2xl mx-auto px-6 pb-24">
      {/* Back */}
      <div className="pt-8 pb-6">
        <Link href="/eventos" className="text-xs tracking-widest uppercase" style={{ color: "#5F5E5A", fontFamily: mono }}>
          ← volver
        </Link>
      </div>

      {/* Author */}
      <AuthorHeader post={post} />

      {/* Flyer */}
      {post.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt={post.title}
          style={{ width: "100%", maxWidth: "600px", display: "block", margin: "0 auto 32px", border: "0.5px solid #2a2a28" }}
        />
      )}

      {/* Title */}
      <h1 style={{ fontSize: "32px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1.1, marginBottom: "20px" }}>
        {post.title}
      </h1>

      {/* Date + time */}
      {post.event_date && (
        <p style={{ ...labelStyle, color: "#D85A30", marginBottom: "8px", fontSize: "11px" }}>
          {formatDate(post.event_date)} · {formatTime(post.event_date)}
        </p>
      )}

      {/* Venue + address */}
      {(post.venue || post.address) && (
        <p style={{ ...labelStyle, marginBottom: "16px", fontSize: "11px" }}>
          {[post.venue, post.address].filter(Boolean).join(" — ")}
        </p>
      )}

      {/* Entrada badge */}
      {post.is_free != null && (
        <div style={{ marginBottom: "24px" }}>
          <span style={{
            display: "inline-block",
            padding: "4px 10px",
            border: `0.5px solid ${post.is_free ? "#5DCAA5" : "#2a2a28"}`,
            color: post.is_free ? "#5DCAA5" : "#888780",
            fontFamily: mono,
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}>
            {post.is_free ? "entrada libre" : post.price ? `$${post.price}` : "de paga"}
          </span>
        </div>
      )}

      <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "24px" }} />

      {post.body && (
        <p style={{ color: "#888780", fontFamily: mono, fontSize: "13px", lineHeight: 1.8, marginBottom: "24px", whiteSpace: "pre-wrap" }}>
          {post.body}
        </p>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2" style={{ marginBottom: "0" }}>
          {post.tags.map((tag) => (
            <span key={tag} style={{ padding: "2px 8px", border: "0.5px solid #2a2a28", color: "#5F5E5A", fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <CommentsSection postId={post.id} initialComments={comments} currentUserId={currentUserId} currentProfile={currentProfile} />
    </div>
  );
}

// ─── Arte / foto / música view ────────────────────────────────────────────────

const TYPE_ACCENT: Record<string, string> = {
  arte: "#D85A30",
  fotografía: "#378ADD",
  música: "#5DCAA5",
};

function WorkView({ post, comments, currentUserId, currentProfile }: { post: Post; comments: Comment[]; currentUserId: string | null; currentProfile: CurrentProfile }) {
  const isAudio = post.media_type?.startsWith("audio/");
  const accent = TYPE_ACCENT[post.type] ?? "#888780";

  return (
    <div className="max-w-4xl mx-auto px-6 pb-24">
      {/* Back */}
      <div className="pt-8 pb-6">
        <Link href="/" className="text-xs tracking-widest uppercase" style={{ color: "#5F5E5A", fontFamily: mono }}>
          ← volver
        </Link>
      </div>

      {/* Author */}
      <AuthorHeader post={post} />

      {/* Media */}
      {post.media_url && (
        <div style={{ marginBottom: "32px", border: "0.5px solid #2a2a28" }}>
          {isAudio ? (
            <div style={{ backgroundColor: "#141412", padding: "40px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "18px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800 }}>
                {post.title}
              </p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={post.media_url} style={{ width: "100%", accentColor: "#5DCAA5" }} />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media_url} alt={post.title} style={{ width: "100%", display: "block" }} />
          )}
        </div>
      )}

      {/* Title */}
      <h1 style={{ fontSize: "28px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1.1, marginBottom: "12px" }}>
        {post.title}
      </h1>

      {/* Type badge */}
      <div className="flex items-center gap-4" style={{ marginBottom: "20px" }}>
        <span style={{ ...labelStyle, color: accent }}>{post.type}</span>
      </div>

      <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "20px" }} />

      {post.body && (
        <p style={{ color: "#888780", fontFamily: mono, fontSize: "13px", lineHeight: 1.8, marginBottom: "24px", whiteSpace: "pre-wrap" }}>
          {post.body}
        </p>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2" style={{ marginBottom: "0" }}>
          {post.tags.map((tag) => (
            <span key={tag} style={{ padding: "2px 8px", border: "0.5px solid #2a2a28", color: "#5F5E5A", fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <CommentsSection postId={post.id} initialComments={comments} currentUserId={currentUserId} currentProfile={currentProfile} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: postData }, { data: commentsData }, { data: { user } }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, profiles(username, display_name)")
      .eq("id", id)
      .single(),
    supabase
      .from("comments")
      .select("*, profiles(username, display_name)")
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (!postData) notFound();

  const post = postData as Post;
  const comments = (commentsData ?? []) as Comment[];
  const currentUserId = user?.id ?? null;

  // Fetch current user's profile for optimistic comment rendering
  let currentProfile: { username: string; display_name: string | null } | null = null;
  if (currentUserId) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", currentUserId)
      .single();
    currentProfile = profileData;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <Navbar />
      {post.type === "evento" ? (
        <EventoView post={post} comments={comments} currentUserId={currentUserId} currentProfile={currentProfile} />
      ) : (
        <WorkView post={post} comments={comments} currentUserId={currentUserId} currentProfile={currentProfile} />
      )}
    </div>
  );
}
