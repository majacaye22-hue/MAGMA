"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const TYPE_COLOR: Record<string, string> = {
  arte: "#D85A30", fotografía: "#378ADD", música: "#5DCAA5",
  evento: "#EF9F27", escrito: "#7F77DD",
};

type OwnPost = {
  id: string;
  title: string | null;
  type: string;
  media_url: string | null;
  cover_url: string | null;
  media_type: string | null;
  already_shared: boolean;
};

export function CompartirObraButton({
  colectivoId,
  colectivoSlug,
  currentUserId,
}: {
  colectivoId: string;
  colectivoSlug: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<OwnPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sharing, setSharing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    if (posts.length > 0) return;
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadPosts() {
    setLoading(true);
    const supabase = getSupabaseClient();

    const [{ data: ownPosts }, { data: sharedPosts }] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, type, media_url, cover_url, media_type")
        .eq("author_id", currentUserId)
        .order("created_at", { ascending: false }),
      supabase
        .from("colectivo_posts")
        .select("post_id")
        .eq("colectivo_id", colectivoId),
    ]);

    const sharedIds = new Set((sharedPosts ?? []).map((p: { post_id: string }) => p.post_id));
    setPosts(
      (ownPosts ?? []).map((p) => ({ ...p, already_shared: sharedIds.has(p.id) }))
    );
    setLoading(false);
  }

  async function handleShare(post: OwnPost) {
    if (post.already_shared) return;
    setSharing(post.id);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("colectivo_posts")
      .insert({ colectivo_id: colectivoId, post_id: post.id, added_by: currentUserId });
    if (!error) {
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, already_shared: true } : p));
      router.refresh();
    }
    setSharing(null);
  }

  const filtered = posts.filter((p) =>
    !query.trim() || (p.title ?? "").toLowerCase().includes(query.toLowerCase()) || p.type.includes(query.toLowerCase())
  );

  function thumb(p: OwnPost): string | null {
    if (p.media_type?.startsWith("audio/") || p.type === "música") return p.cover_url;
    return p.media_url;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
          padding: "8px 16px", border: "0.5px solid #D85A30", color: "#D85A30",
          backgroundColor: "transparent", cursor: "pointer",
        }}
      >
        + compartir obra
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            backgroundColor: "rgba(12,12,11,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#141412",
              border: "0.5px solid #2a2a28",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "0.5px solid #2a2a28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700 }}>
                compartir obra al colectivo
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{ fontSize: "14px", color: "#5F5E5A", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: "12px 20px", borderBottom: "0.5px solid #2a2a28" }}>
              <input
                ref={inputRef}
                type="text"
                placeholder="buscar por título o tipo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: "100%", backgroundColor: "transparent", border: "0.5px solid #2a2a28",
                  color: "#e8e4dc", fontFamily: mono, fontSize: "12px", padding: "8px 10px", outline: "none",
                }}
              />
            </div>

            {/* Post list */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loading ? (
                <p style={{ padding: "24px", fontSize: "11px", color: "#444441", fontFamily: mono, textAlign: "center" }}>cargando...</p>
              ) : filtered.length === 0 ? (
                <p style={{ padding: "24px", fontSize: "11px", color: "#444441", fontFamily: mono, textAlign: "center" }}>
                  {posts.length === 0 ? "no tienes obras publicadas" : "sin resultados"}
                </p>
              ) : (
                filtered.map((post) => {
                  const src = thumb(post);
                  const accent = TYPE_COLOR[post.type] ?? "#888780";
                  return (
                    <button
                      key={post.id}
                      onClick={() => handleShare(post)}
                      disabled={post.already_shared || sharing === post.id}
                      style={{
                        display: "flex", alignItems: "center", gap: "14px", width: "100%",
                        padding: "12px 20px", background: "none", border: "none",
                        borderBottom: "0.5px solid #1e1e1c", cursor: post.already_shared ? "default" : "pointer",
                        opacity: post.already_shared ? 0.5 : 1,
                        textAlign: "left",
                      }}
                      className={post.already_shared ? "" : "hover:bg-[#1e1e1c] transition-colors"}
                    >
                      {/* Thumbnail */}
                      <div style={{ width: "44px", height: "44px", flexShrink: 0, backgroundColor: "#1a1a18", position: "relative", overflow: "hidden", borderRadius: "2px" }}>
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: "16px", height: "16px", backgroundColor: accent, opacity: 0.3 }} />
                          </div>
                        )}
                      </div>

                      {/* Title + type */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {post.title ?? "(sin título)"}
                        </p>
                        <p style={{ fontSize: "9px", color: accent, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: "3px" }}>
                          {post.type}
                        </p>
                      </div>

                      {/* Status */}
                      <span style={{ fontSize: "9px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em", color: post.already_shared ? "#5DCAA5" : "#444441", flexShrink: 0 }}>
                        {sharing === post.id ? "..." : post.already_shared ? "✓ compartido" : "compartir"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "0.5px solid #2a2a28", display: "flex", justifyContent: "flex-end" }}>
              <Link
                href={`/upload?colectivo=${colectivoSlug}`}
                onClick={() => setOpen(false)}
                style={{
                  fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                  color: "#5F5E5A", textDecoration: "none",
                }}
                className="hover:text-[#e8e4dc] transition-colors"
              >
                + subir obra nueva →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
