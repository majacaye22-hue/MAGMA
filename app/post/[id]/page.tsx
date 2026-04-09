import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Navbar } from "@/app/components/navbar";
import type { Post } from "@/app/components/card-art";

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

const labelStyle = {
  color: "#5F5E5A",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "10px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
};

// ─── Evento view ──────────────────────────────────────────────────────────────

function EventoView({ post }: { post: Post }) {
  return (
    <div className="max-w-2xl mx-auto px-6 pb-24">
      {/* Back */}
      <div className="pt-8 pb-6">
        <Link
          href="/eventos"
          className="text-xs tracking-widest uppercase"
          style={{ color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace" }}
        >
          ← volver
        </Link>
      </div>

      {/* Flyer */}
      {post.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt={post.title}
          style={{
            width: "100%",
            maxWidth: "600px",
            display: "block",
            margin: "0 auto 32px",
            border: "0.5px solid #2a2a28",
          }}
        />
      )}

      {/* Title */}
      <h1
        style={{
          fontSize: "32px",
          color: "#e8e4dc",
          fontFamily: "var(--font-syne), sans-serif",
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: "20px",
        }}
      >
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
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              border: `0.5px solid ${post.is_free ? "#5DCAA5" : "#2a2a28"}`,
              color: post.is_free ? "#5DCAA5" : "#888780",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            {post.is_free ? "entrada libre" : post.price ? `$${post.price}` : "de paga"}
          </span>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "24px" }} />

      {/* Body */}
      {post.body && (
        <p
          style={{
            color: "#888780",
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: "13px",
            lineHeight: 1.8,
            marginBottom: "24px",
            whiteSpace: "pre-wrap",
          }}
        >
          {post.body}
        </p>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 8px",
                border: "0.5px solid #2a2a28",
                color: "#5F5E5A",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Arte / foto / música view ────────────────────────────────────────────────

function WorkView({ post }: { post: Post }) {
  const isAudio = post.media_type?.startsWith("audio/");
  const backHref = "/";

  return (
    <div className="max-w-4xl mx-auto px-6 pb-24">
      {/* Back */}
      <div className="pt-8 pb-6">
        <Link
          href={backHref}
          className="text-xs tracking-widest uppercase"
          style={{ color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace" }}
        >
          ← volver
        </Link>
      </div>

      {/* Media */}
      {post.media_url && (
        <div style={{ marginBottom: "32px", border: "0.5px solid #2a2a28" }}>
          {isAudio ? (
            <div
              style={{
                backgroundColor: "#141412",
                padding: "40px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "18px",
                  color: "#e8e4dc",
                  fontFamily: "var(--font-syne), sans-serif",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
              >
                {post.title}
              </p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                controls
                src={post.media_url}
                style={{
                  width: "100%",
                  accentColor: "#5DCAA5",
                }}
              />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media_url}
              alt={post.title}
              style={{ width: "100%", display: "block" }}
            />
          )}
        </div>
      )}

      {/* Title */}
      <h1
        style={{
          fontSize: "28px",
          color: "#e8e4dc",
          fontFamily: "var(--font-syne), sans-serif",
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: "12px",
        }}
      >
        {post.title}
      </h1>

      {/* Author + type */}
      <div className="flex items-center gap-4" style={{ marginBottom: "20px" }}>
        <span style={{ ...labelStyle, color: "#EF9F27" /* type accent placeholder */ }}>
          {post.type}
        </span>
        {post.profiles && (
          <Link
            href={`/profile/${post.profiles.username}`}
            className="text-xs hover:underline"
            style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}
          >
            @{post.profiles.username}
          </Link>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "20px" }} />

      {/* Body */}
      {post.body && (
        <p
          style={{
            color: "#888780",
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: "13px",
            lineHeight: 1.8,
            marginBottom: "24px",
            whiteSpace: "pre-wrap",
          }}
        >
          {post.body}
        </p>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 8px",
                border: "0.5px solid #2a2a28",
                color: "#5F5E5A",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const post = data as Post;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <Navbar />
      {post.type === "evento" ? (
        <EventoView post={post} />
      ) : (
        <WorkView post={post} />
      )}
    </div>
  );
}
