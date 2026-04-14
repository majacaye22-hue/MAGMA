import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Navbar } from "@/app/components/navbar";
import type { Post } from "@/app/components/card-art";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

interface EscritoPost extends Post {
  content: string | null;
  comment_count?: number;
}

// ─── Filter pills ─────────────────────────────────────────────────────────────

const FILTERS = [
  { label: "todo", tag: null },
  { label: "poemas", tag: "poema" },
  { label: "ensayos", tag: "ensayo" },
  { label: "debates", tag: "debate" },
  { label: "manifiestos", tag: "manifiesto" },
] as const;

// ─── Post card ────────────────────────────────────────────────────────────────

function ManifiestoCard({ post }: { post: EscritoPost }) {
  const preview = post.content
    ? stripHtml(post.content).slice(0, 150) + (stripHtml(post.content).length > 150 ? "…" : "")
    : post.body?.slice(0, 150) ?? "";

  return (
    <Link href={`/post/${post.id}`} style={{ textDecoration: "none" }}>
      <article
        className="flex flex-col gap-3 transition-colors duration-150"
        style={{
          padding: "24px",
          backgroundColor: "#0e0e0d",
          border: "0.5px solid #2a2a28",
          cursor: "pointer",
        }}
      >
        {/* Type badge + timestamp */}
        <div className="flex items-center justify-between">
          <span style={{
            fontSize: "9px",
            color: "#7F77DD",
            fontFamily: mono,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            border: "0.5px solid #7F77DD",
            padding: "2px 7px",
          }}>
            manifiesto
          </span>
          <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>
            {relativeTime(post.created_at)}
          </span>
        </div>

        {/* Title */}
        {post.title && (
          <h2 style={{ fontSize: "18px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
            {post.title}
          </h2>
        )}

        {/* Preview */}
        {preview && (
          <p style={{ fontSize: "13px", color: "#888780", fontFamily: mono, lineHeight: 1.7, margin: 0 }}>
            {preview}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ marginTop: "4px" }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono }}>
              @{post.profiles?.username ?? "anon"}
            </span>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "9px",
                      color: "#5F5E5A",
                      fontFamily: mono,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      border: "0.5px solid #2a2a28",
                      padding: "1px 6px",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>
              ↑ {post.upvotes}
            </span>
            {(post.comment_count ?? 0) > 0 && (
              <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>
                {post.comment_count} comentarios
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ tag?: string }>;
}

export default async function ManifiestosPage({ searchParams }: PageProps) {
  const { tag } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .eq("type", "escrito")
    .order("created_at", { ascending: false });

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data } = await query;
  const posts = (data ?? []) as EscritoPost[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <Navbar active="manifiestos" />

      <main className="max-w-3xl mx-auto px-6 pb-24">
        {/* Header */}
        <div className="pt-10 pb-6">
          <h1 style={{ fontSize: "32px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1, marginBottom: "6px" }}>
            manifiestos
          </h1>
          <p style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono, letterSpacing: "0.05em" }}>
            palabras, poemas, ensayos, pensamientos
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 pb-8">
          {FILTERS.map((f) => {
            const isActive = (f.tag ?? "") === (tag ?? "");
            const href = f.tag ? `/manifiestos?tag=${f.tag}` : "/manifiestos";
            return (
              <Link
                key={f.label}
                href={href}
                className="px-4 py-1.5 text-xs tracking-widest uppercase border transition-colors duration-150"
                style={{
                  fontFamily: mono,
                  borderColor: isActive ? "#7F77DD" : "#2a2a28",
                  color: isActive ? "#0c0c0b" : "#888780",
                  backgroundColor: isActive ? "#7F77DD" : "transparent",
                  textDecoration: "none",
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
          <div className="py-24 text-center text-xs tracking-widest uppercase" style={{ color: "#888780", fontFamily: mono }}>
            sin manifiestos todavía — sé el primero en publicar
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: "2px" }}>
            {posts.map((post) => (
              <ManifiestoCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
