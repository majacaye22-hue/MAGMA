import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { PostCard } from "@/app/components/card-art";
import type { Post } from "@/app/components/card-art";
import { JoinButton } from "./JoinButton";
import { CompartirObraButton } from "./CompartirObraButton";
import { projectCoverShape, projectCoverStyle } from "@/lib/project-cover";
import styles from "./colectivo.module.css";
import cardStyles from "@/app/components/archive-card-preview.module.css";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type MemberStatus = "admin" | "member" | "pending" | "none";
type ListedMember = {
  user_id: string;
  role: string;
  profiles: { username: string; display_name: string | null } | null;
};

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

  const { data: coverSettings } = await supabase.from("colectivos")
    .select("cover_shape").eq("id", col.id).single();
  const coverShape = projectCoverShape(coverSettings);

  // Only actual memberships appear here, never pending requests or invitations.
  const { data: memberData, error: memberError } = await supabase
    .from("colectivo_members")
    .select("user_id, role, profiles!colectivo_members_user_id_fkey(username, display_name)")
    .eq("colectivo_id", col.id)
    .order("created_at", { ascending: true });
  const members = ((memberData ?? []) as unknown as ListedMember[]).sort((a, b) => {
    const rank = (member: ListedMember) => member.user_id === col.created_by ? 0 : member.role === "admin" ? 1 : 2;
    return rank(a) - rank(b);
  });

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
      } else {
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
  const { data: cpData, error: feedError } = await supabase
    .from("colectivo_posts")
    .select("posts(*, profiles!posts_author_id_fkey(username, display_name))")
    .eq("colectivo_id", col.id)
    .order("created_at", { ascending: false });

  const posts = ((cpData ?? [])
    .map((cp: { posts: Post | Post[] | null }) => Array.isArray(cp.posts) ? cp.posts[0] : cp.posts)
    .filter(Boolean)) as Post[];

  const colectivo = col as typeof col & {
    colectivo_members: { count: number }[];
    cover_image_url: string | null;
  };
  const memberCount = colectivo.colectivo_members?.[0]?.count ?? 0;
  const isAdmin = memberStatus === "admin";
  const isMember = memberStatus === "admin" || memberStatus === "member";

  return (
    <div className={`${styles.page} min-h-screen`} style={{ backgroundColor: "var(--magma-obsidian)" }}>
      {/* Banner */}
      <div className="mx-auto max-w-6xl px-6 pt-3 pb-4">

        {/* Back link */}
        <div className="mb-3">
          <Link href="/colectivos" style={{ display: "inline-block", padding: "8px 0", fontSize: "var(--magma-text-small)", color: "#fff", fontFamily: mono, textDecoration: "none" }}>
            ← colectivos
          </Link>
        </div>

        {/* Name + meta overlaid at bottom */}
        <div className={`grid items-center gap-4 md:gap-6 ${colectivo.cover_image_url ? (coverShape === "horizontal" ? "md:grid-cols-[260px_minmax(0,1fr)]" : "md:grid-cols-[180px_minmax(0,1fr)]") : ""}`}>
          {colectivo.cover_image_url && <div className="w-full max-w-[260px] overflow-hidden rounded-[2px]" style={projectCoverStyle(coverShape)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={colectivo.cover_image_url} alt={col.name} className="block h-full w-full object-cover" />
          </div>}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "24px" }}>
            <div style={{ minWidth: 0, maxWidth: "100%" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <h1 className="magma-page-title" style={{ overflowWrap: "anywhere", color: "#fff", fontFamily: syne, fontWeight: 800, }}>
                  {col.name}
                </h1>
                {col.is_private && (
                  <span style={{ fontSize: "12px", fontFamily: mono, padding: "4px 8px", border: "1px solid #49463f", borderRadius: "2px", color: "#fff" }}>
                    solo con enlace
                  </span>
                )}
              </div>
              {col.description && (
                <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", overflowWrap: "anywhere", fontFamily: mono, lineHeight: 1.5, maxWidth: "480px", marginBottom: "8px" }}>
                  {col.description}
                </p>
              )}
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                {memberCount} {memberCount === 1 ? "miembro" : "miembros"} · {posts.length} {posts.length === 1 ? "obra" : "obras"}
              </p>
            </div>


          </div>
        </div>
      </div>

      <div className={`${styles.actions} max-w-6xl mx-auto px-6 flex flex-wrap items-start gap-2`} style={{ color: "#fff" }}>
            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {isMember && <Link href={`/mensajes?colectivo=${col.id}`} className="px-4 py-2">abrir chat</Link>}
              {isMember && currentUserId && (
                <CompartirObraButton colectivoId={col.id} colectivoSlug={col.slug} currentUserId={currentUserId} />
              )}
              {isAdmin && (
                <Link
                  href={`/colectivos/${slug}/ajustes`}
                  style={{
                    fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                    padding: "8px 16px", border: "0.5px solid rgba(232,228,220,0.2)", color: "var(--magma-ash)",
                    textDecoration: "none", backgroundColor: "rgba(12,12,11,0.4)",
                  }}
                >
                  ⚙ ajustes
                </Link>
              )}
            </div>
        {!isAdmin && (
          <JoinButton
            colectivoId={col.id}
            colectivoSlug={col.slug}
            initialStatus={memberStatus}
            currentUserId={currentUserId}
          />
        )}
      </div>

      <details className="group/members max-w-6xl mx-auto px-6 pt-4 text-sm text-white">
        <summary className="w-fit cursor-pointer rounded-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 group-open/members:mb-4">miembros ({memberCount})</summary>
        {memberError ? (
          <p role="alert">no se pudieron cargar los miembros. recarga para reintentar.</p>
        ) : members.length === 0 ? (
          <p>sin miembros todavía</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {members.map(member => (
              <li key={member.user_id} className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {member.profiles ? (
                    <Link href={`/profile/${encodeURIComponent(member.profiles.username)}`} className="font-bold break-all hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
                      @{member.profiles.username}
                    </Link>
                  ) : <span>perfil no disponible</span>}
                  {member.user_id === col.created_by ? <span>creador · admin</span> : member.role === "admin" ? <span>admin</span> : null}
                </div>
                {member.profiles?.display_name && <p className="break-words">{member.profiles.display_name}</p>}
              </li>
            ))}
          </ul>
        )}
      </details>

      {/* Feed */}
      <div className="max-w-6xl mx-auto px-6 pb-16 pt-4">
        {!isMember ? (
          <p className="py-10 text-center">las publicaciones son para miembros. solicita acceso con el botón de arriba para entrar al colectivo.</p>
        ) : feedError ? (
          <p role="alert" className="py-10 text-center">no se pudieron cargar las obras. recarga la página para reintentar.</p>
        ) : posts.length === 0 ? (
          <div style={{ paddingTop: "32px", textAlign: "center" }}>
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              sin obras compartidas todavía
            </p>
            {(memberStatus === "member" || memberStatus === "admin") && (
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, marginTop: "8px" }}>
                comparte obras desde su página de detalle
              </p>
            )}
          </div>
        ) : (
          <div
            className="columns-1 sm:columns-2 lg:columns-3"
            style={{
              columnGap: "8px",
            }}
          >
            {posts.map((post, i) => (
              <article key={post.id} className={cardStyles.card} style={{ breakInside: "avoid", marginBottom: "8px" }}>
                <header className={cardStyles.label}>
                  <div className={cardStyles.byline}>
                    {post.profiles && <Link href={`/profile/${post.profiles.username}`}>@{post.profiles.username}</Link>}
                    <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Mexico_City" })}</time>
                  </div>
                </header>
                <PostCard post={post} index={i} total={posts.length} currentUserId={currentUserId} stream editorialSize="archive" />
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
