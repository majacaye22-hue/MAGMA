import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type PostInCollection = {
  id: string;
  title: string | null;
  type: string;
  media_url: string | null;
  media_type: string | null;
  cover_url: string | null;
  body: string | null;
  profiles: { username: string } | null;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const TYPE_COLOR: Record<string, string> = {
  arte: "#D85A30",
  fotografía: "#378ADD",
  música: "#5DCAA5",
  evento: "#888780",
  escrito: "#7F77DD",
};

function PostTile({ post }: { post: PostInCollection }) {
  const isAudio = post.media_type?.startsWith("audio/") || post.type === "música";
  const thumb = isAudio ? post.cover_url : post.media_url;
  const accent = TYPE_COLOR[post.type] ?? "#888780";

  if (post.type === "escrito") {
    return (
      <Link
        href={`/post/${post.id}`}
        style={{ textDecoration: "none" }}
      >
        <div
          style={{
            backgroundColor: "#0e0e0d",
            borderLeft: `2px solid ${accent}`,
            padding: "20px",
            minHeight: "180px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            height: "100%",
          }}
        >
          <span style={{ fontSize: "9px", color: accent, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em" }}>
            manifiesto
          </span>
          {post.title && (
            <p style={{ fontSize: "15px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              {post.title}
            </p>
          )}
          {post.body && (
            <p style={{
              fontSize: "11px",
              color: "#5F5E5A",
              fontFamily: mono,
              lineHeight: 1.7,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {post.body.slice(0, 200)}
            </p>
          )}
          <span style={{ fontSize: "10px", color: "#2a2a28", fontFamily: mono, marginTop: "auto" }}>
            @{post.profiles?.username ?? "anon"}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/post/${post.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{ position: "relative", backgroundColor: "#141412", border: "0.5px solid #2a2a28", overflow: "hidden" }}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={post.title ?? ""}
            style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: "100%", aspectRatio: "1/1", backgroundColor: "#1a1a18", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            {post.title && (
              <p style={{ fontSize: "14px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, textAlign: "center", lineHeight: 1.2 }}>
                {post.title}
              </p>
            )}
          </div>
        )}
        {/* Type badge */}
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <p style={{ fontSize: "11px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1.2 }}>
            {post.title}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "9px", color: accent, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {post.type}
            </span>
            <span style={{ fontSize: "9px", color: "#444441", fontFamily: mono }}>
              @{post.profiles?.username ?? "anon"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ username: string; id: string }>;
}) {
  const { username, id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: { user } }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name").eq("username", username).single(),
    supabase.auth.getUser(),
  ]);

  if (!profile) notFound();

  const { data: collection } = await supabase
    .from("collections")
    .select("id, name, is_public")
    .eq("id", id)
    .eq("user_id", profile.id)
    .single();

  if (!collection) notFound();

  // Private collections only visible to owner
  const isOwner = user?.id === profile.id;
  if (!collection.is_public && !isOwner) notFound();

  const { data: collectionPosts } = await supabase
    .from("collection_posts")
    .select("posts(id, title, type, media_url, media_type, cover_url, body, profiles(username))")
    .eq("collection_id", id)
    .order("created_at", { ascending: false });

  const posts = ((collectionPosts ?? [])
    .map((cp: { posts: PostInCollection | PostInCollection[] | null }) =>
      Array.isArray(cp.posts) ? cp.posts[0] : cp.posts
    )
    .filter(Boolean)) as PostInCollection[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-24">

        {/* Breadcrumb */}
        <div style={{ marginBottom: "8px" }}>
          <Link
            href={`/colecciones/${username}`}
            className="text-xs tracking-widest uppercase"
            style={{ color: "#5F5E5A", fontFamily: mono, textDecoration: "none" }}
          >
            ← @{username} / colecciones
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "40px", display: "flex", alignItems: "baseline", gap: "16px" }}>
          <h1 style={{ fontSize: "24px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800 }}>
            {collection.name}
          </h1>
          <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>
            {posts.length} {posts.length === 1 ? "obra" : "obras"}
          </span>
          {!collection.is_public && (
            <span style={{ fontSize: "9px", color: "#2a2a28", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", border: "0.5px solid #2a2a28", padding: "2px 8px" }}>
              privada
            </span>
          )}
        </div>

        {posts.length === 0 ? (
          <p className="text-xs tracking-widest uppercase" style={{ color: "#444441", fontFamily: mono }}>
            sin obras en esta colección
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", backgroundColor: "#2a2a28" }}>
            {posts.map((post) => (
              <div key={post.id} style={{ backgroundColor: "#0c0c0b" }}>
                <PostTile post={post} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
