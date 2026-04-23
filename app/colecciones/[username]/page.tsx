import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";


const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

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

export default async function ColeccionesPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, is_public, collection_posts(posts(id, media_url, cover_url, type))")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cols = (collections ?? []) as unknown as Collection[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      <div className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        <div style={{ marginBottom: "32px" }}>
          <Link
            href={`/profile/${username}`}
            className="text-xs tracking-widest uppercase"
            style={{ color: "#5F5E5A", fontFamily: mono, textDecoration: "none" }}
          >
            ← @{username}
          </Link>
        </div>

        <h1 style={{ fontSize: "24px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, marginBottom: "32px" }}>
          colecciones
        </h1>

        {cols.length === 0 ? (
          <p className="text-xs tracking-widest uppercase" style={{ color: "#444441", fontFamily: mono }}>
            sin colecciones públicas
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", backgroundColor: "#2a2a28" }}>
            {cols.map((col) => {
              const thumbPosts = col.collection_posts
                .map((cp) => Array.isArray(cp.posts) ? cp.posts[0] : cp.posts)
                .filter(Boolean)
                .slice(0, 4) as PostThumb[];
              return (
                <Link
                  key={col.id}
                  href={`/colecciones/${username}/${col.id}`}
                  style={{ textDecoration: "none", display: "block", backgroundColor: "#141412" }}
                >
                  {/* 2×2 thumbnail grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "200px", gap: "1px", backgroundColor: "#2a2a28" }}>
                    {Array.from({ length: 4 }).map((_, i) => {
                      const p = thumbPosts[i];
                      const thumb = p
                        ? (p.type === "música" ? p.cover_url : p.media_url) ?? null
                        : null;
                      return (
                        <div key={i} style={{ backgroundColor: "#1a1a18", position: "relative", overflow: "hidden" }}>
                          {thumb && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Name + count */}
                  <div style={{ padding: "14px 16px" }}>
                    <p style={{ fontSize: "14px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, marginBottom: "4px" }}>
                      {col.name}
                    </p>
                    <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono }}>
                      {col.collection_posts.length}{" "}
                      {col.collection_posts.length === 1 ? "obra" : "obras"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
