import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { PostCard } from "@/app/components/card-art";
import type { Post } from "@/app/components/card-art";
import { JoinButton } from "./JoinButton";
import { CompartirObraButton } from "./CompartirObraButton";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type MemberStatus = "admin" | "member" | "pending" | "none";

export default async function ColectivoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const { data: col } = await supabase
    .from("colectivos")
    .select("id, name, slug, description, avatar_color, cover_image_url, is_private, created_by, colectivo_members(count)")
    .eq("slug", slug)
    .single();

  if (!col) notFound();

  // Determine membership status
  let memberStatus: MemberStatus = "none";
  if (currentUserId) {
    if (col.created_by === currentUserId) {
      memberStatus = "admin";
    } else {
      const { data: mem } = await supabase
        .from("colectivo_members")
        .select("role")
        .eq("colectivo_id", col.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (mem) {
        memberStatus = mem.role as MemberStatus;
      } else if (col.is_private) {
        const { data: req } = await supabase
          .from("colectivo_join_requests")
          .select("status")
          .eq("colectivo_id", col.id)
          .eq("user_id", currentUserId)
          .eq("status", "pending")
          .maybeSingle();
        if (req) memberStatus = "pending";
      }
    }
  }

  // Fetch posts in this colectivo
  const { data: cpData } = await supabase
    .from("colectivo_posts")
    .select("posts(*, profiles(username, display_name))")
    .eq("colectivo_id", col.id)
    .order("created_at", { ascending: false });

  const posts = ((cpData ?? [])
    .map((cp: { posts: Post | Post[] | null }) => Array.isArray(cp.posts) ? cp.posts[0] : cp.posts)
    .filter(Boolean)) as Post[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberCount = (col as any).colectivo_members?.[0]?.count ?? 0;
  const isAdmin = memberStatus === "admin";
  const isMember = memberStatus === "admin" || memberStatus === "member";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      {/* Banner */}
      <div style={{ position: "relative", height: "240px", overflow: "hidden", background: `linear-gradient(135deg, ${col.avatar_color}44 0%, #0c0c0b 100%)` }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(col as any).cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(col as any).cover_image_url}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {/* Gradient overlay so text is legible */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(12,12,11,0.85) 0%, rgba(12,12,11,0.2) 60%, transparent 100%)" }} />

        {/* Back link */}
        <div style={{ position: "absolute", top: "20px", left: "24px" }}>
          <Link href="/colectivos" style={{ fontSize: "10px", color: "rgba(232,228,220,0.7)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ← colectivos
          </Link>
        </div>

        {/* Name + meta overlaid at bottom */}
        <div className="max-w-6xl mx-auto px-6" style={{ position: "absolute", bottom: "24px", left: 0, right: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "32px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
                  {col.name}
                </h1>
                {col.is_private && (
                  <span style={{ fontSize: "8px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "2px 8px", border: "0.5px solid rgba(232,228,220,0.2)", color: "rgba(232,228,220,0.4)" }}>
                    privado
                  </span>
                )}
              </div>
              {col.description && (
                <p style={{ fontSize: "12px", color: "rgba(232,228,220,0.65)", fontFamily: mono, lineHeight: 1.5, maxWidth: "480px", marginBottom: "4px" }}>
                  {col.description}
                </p>
              )}
              <p style={{ fontSize: "10px", color: "rgba(232,228,220,0.35)", fontFamily: mono }}>
                {memberCount} {memberCount === 1 ? "miembro" : "miembros"} · {posts.length} {posts.length === 1 ? "obra" : "obras"}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              {isMember && currentUserId && (
                <CompartirObraButton colectivoId={col.id} colectivoSlug={col.slug} currentUserId={currentUserId} />
              )}
              {isAdmin && (
                <Link
                  href={`/colectivos/${slug}/ajustes`}
                  style={{
                    fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                    padding: "8px 16px", border: "0.5px solid rgba(232,228,220,0.2)", color: "rgba(232,228,220,0.6)",
                    textDecoration: "none", backgroundColor: "rgba(12,12,11,0.4)",
                  }}
                >
                  ⚙ ajustes
                </Link>
              )}
              <JoinButton
                colectivoId={col.id}
                colectivoSlug={col.slug}
                isPrivate={col.is_private}
                initialStatus={memberStatus}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-6xl mx-auto px-6 pb-24" style={{ paddingTop: "32px" }}>
        {posts.length === 0 ? (
          <div style={{ paddingTop: "80px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              sin obras compartidas todavía
            </p>
            {(memberStatus === "member" || memberStatus === "admin") && (
              <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, marginTop: "8px" }}>
                comparte obras desde su página de detalle
              </p>
            )}
          </div>
        ) : (
          <div
            style={{
              columns: "3",
              columnGap: "1px",
            }}
          >
            {posts.map((post, i) => (
              <div key={post.id} style={{ breakInside: "avoid", marginBottom: "1px" }}>
                <PostCard post={post} index={i} total={posts.length} currentUserId={currentUserId} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
