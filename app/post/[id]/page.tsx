import { PhotoCarousel } from "@/app/components/PhotoCarousel";
import { postMediaStyle, postShellStyle } from "@/lib/post-layout";
import { PostImage } from "@/app/components/PostImage";
import { postImages } from "@/lib/post-images";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { CommentsSection, type Comment } from "@/app/components/CommentsSection";
import { CollabProposalButton } from "./CollabProposalButton";
import { ShareToColectivoButton } from "@/app/components/ShareToColectivoButton";
import { EventAttendanceButton } from "./EventAttendanceButton";
import type { Post } from "@/app/components/card-art";
import { MentionText } from "@/app/components/MentionText";
import { sanitizeHtml } from "@/lib/sanitize";
import { SensitiveContentGate } from "@/app/components/SensitiveContentGate";
import { PostInteractionBar } from "@/app/components/PostInteractionBar";
import { SoundCloudEmbed } from "@/app/components/SoundCloudEmbed";
import { Suspense, type ReactNode } from "react";
import archiveStyles from "./archive-preview.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const POST_COLUMNS = "id,author_id,type,title,body,content,media_url,media_type,image_urls,cover_url,soundcloud_url,created_at,event_date,venue,address,is_free,price,open_collab,collab_description,tags,upvotes,comments_enabled,is_sensitive,audience_colectivo_id,moderation_status,moderation_note,profiles!posts_author_id_fkey(username, display_name)";

async function timedRequest<T>(stage: string, request: PromiseLike<T>): Promise<T> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("La publicación tardó demasiado en cargar.")), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (process.env.NODE_ENV === "development") console.info(`[post detail] ${stage}: ${Date.now() - started}ms`);
  }
}

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



const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const labelStyle = {
  color: "var(--magma-muted)",
  fontFamily: mono,
  fontSize: "var(--magma-text-small)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
};



function PostDetailShell({
  post,
  conversation,
  currentUserId,
  backHref,
  backLabel,
  primary,
  children,
}: {
  post: Post;
  conversation: ReactNode;
  currentUserId: string | null;
  backHref: string;
  backLabel: string;
  accent: string;
  primary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={postShellStyle} className={`post-detail-page mx-auto min-w-0 w-full max-w-[800px] px-4 pb-12 sm:px-8 ${archiveStyles.page}`}>
      <div className="mx-auto grid w-full min-w-0">
      <div className="pb-4 pt-4 [contain:inline-size]">
        <Link href={backHref} className="text-xs uppercase tracking-widest" style={{ color: "var(--magma-ash)", fontFamily: mono }}>
          ← {backLabel}
        </Link>
      </div>

      <article
        className="grid min-w-0"
      >
        <header className={archiveStyles.label}>
          <span className={archiveStyles.format}>{post.type === "escrito" ? "letra" : post.type}</span>
          {post.profiles && <Link href={`/profile/${post.profiles.username}`}>@{post.profiles.username}</Link>}
          <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Mexico_City" })}</time>
        </header>
        {post.type === "escrito" && <div className={archiveStyles.caption}>{children}</div>}
        <div className="min-w-0">
          <SensitiveContentGate enabled={post.is_sensitive === true && post.type !== "escrito"} postId={post.id} compact>
            {primary}
          </SensitiveContentGate>
        </div>
        {post.type !== "escrito" && <div className={archiveStyles.caption}>{children}</div>}

          <div data-post-interactions style={{ width: "100%", maxWidth: "600px", marginInline: "auto", paddingTop: "8px" }}>
            <PostInteractionBar
              echoAllowed={post.audience_colectivo_id === null && post.moderation_status === "approved"}
              showDivider={false}
              postId={post.id}
              postAuthorId={post.author_id}
              currentUserId={currentUserId}
              initialAppreciations={post.upvotes}
              commentsEnabled={post.comments_enabled !== false}
              light
              showCommentAction={false}
              extraActions={<ShareToColectivoButton inMenu postId={post.id} currentUserId={currentUserId} />}
            />
          </div>
          <div className="min-w-0 [contain:inline-size]">
          {conversation}
          </div>
      </article>
      </div>
    </div>
  );
}

// ─── Evento view ──────────────────────────────────────────────────────────────

function EventoView({ post, conversation, currentUserId }: {
  post: Post; conversation: ReactNode; currentUserId: string | null;
}) {
  const eventImage = post.media_url ?? post.media_base64;
  const admission = post.is_free ? "entrada libre" : post.price ? `$${post.price}` : "entrada por confirmar";
  // The event page is force-dynamic, so this server-rendered boundary is recalculated per request.
  // eslint-disable-next-line react-hooks/purity
  const eventHasPassed = Boolean(post.event_date && new Date(post.event_date).getTime() < Date.now());

  return (
    <div style={postShellStyle} className={`mx-auto min-w-0 px-4 pb-12 sm:px-8 ${archiveStyles.page} ${archiveStyles.event}`}>
      <nav className="py-4" aria-label="volver a cartelera">
        <Link href="/eventos" className="text-xs" style={{ color: "var(--magma-ash)", fontFamily: mono }}>← cartelera</Link>
      </nav>
      <header className={archiveStyles.label}>
        <span className={archiveStyles.format}>cartelera · cdmx</span>
        {post.profiles && <Link href={`/profile/${post.profiles.username}`}>@{post.profiles.username}</Link>}
        <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Mexico_City" })}</time>
      </header>

      <figure className="event-gallery">
        <SensitiveContentGate enabled={post.is_sensitive === true} postId={post.id} compact>
        {eventImage ? (
          <PostImage src={eventImage} alt={post.title ?? "cartel del evento"} mediaType={post.media_type} />
        ) : (
          <div className="py-20 text-center" style={{ color: "var(--magma-muted)" }}>sin cartel</div>
        )}
        </SensitiveContentGate>
        <figcaption className="event-gallery-caption">
          <h1 className="magma-page-title " style={{ color: "var(--magma-ash)", fontFamily: syne, fontWeight: 800 }}>{post.title}</h1>
          <dl className="event-gallery-facts">
            <div><dt>cuándo</dt><dd>{post.event_date ? formatDate(post.event_date) + " · " + formatTime(post.event_date) : "fecha por anunciar"}</dd></div>
            <div><dt>dónde</dt><dd>{[post.venue, post.address].filter(Boolean).join(" · ") || "lugar por anunciar"}</dd></div>
            <div><dt>acceso</dt><dd>{admission}</dd></div>
            {post.open_collab && <div><dt className="sr-only">colaboración</dt><dd><div className="-ml-3 -mt-2"><CollabProposalButton postId={post.id} postAuthorId={post.author_id ?? ""} currentUserId={currentUserId} description={post.collab_description} /></div></dd></div>}
          </dl>
        </figcaption>
      </figure>

      <div className="event-gallery-story">
        {post.body && <p className="event-gallery-description whitespace-pre-wrap"><MentionText text={post.body} /></p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div data-post-interactions className={archiveStyles.eventActions}>
          <PostInteractionBar echoAllowed={post.audience_colectivo_id === null && post.moderation_status === "approved"} postId={post.id} postAuthorId={post.author_id} currentUserId={currentUserId} initialAppreciations={post.upvotes} commentsEnabled={post.comments_enabled !== false} showDivider={false} showCommentAction={false} />
          </div>
          {!eventHasPassed && <EventAttendanceButton eventId={post.id} currentUserId={currentUserId} />}
        </div>
        <section className="mt-3">
          {conversation}
        </section>
      </div>
    </div>
  );
}

// ─── Escrito view ─────────────────────────────────────────────────────────────

function EscritoView({ post, conversation, currentUserId }: {
  post: Post; conversation: ReactNode; currentUserId: string | null;
}) {
  return (
    <PostDetailShell
      post={post}
      conversation={conversation}
      currentUserId={currentUserId}
      backHref="/"
      backLabel="archivo"
      accent="#7f77dd"
      primary={(
        <article className="magma-reading-paper px-6 py-10 sm:px-10 md:px-14 md:py-14" style={{ backgroundColor: "#e3e7ec", width: "720px", maxWidth: "100%" }}>
          <p style={{ ...labelStyle, color: "#a12620", marginBottom: "28px" }}>letras / archivo vivo</p>
          {post.title && <h1 style={{ fontFamily: syne, color: "#000000", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, lineHeight: 1.15, marginBottom: "32px", overflowWrap: "anywhere" }}>{post.title}</h1>}
          {post.content ? (
            <div className="escrito-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} />
          ) : post.body ? (
            <div className="escrito-body" style={{ whiteSpace: "pre-wrap" }}><MentionText text={post.body} /></div>
          ) : null}
        </article>
      )}
    >
      <p style={{ ...labelStyle, color: "#7f77dd", marginBottom: "14px" }}>letra</p>

      {post.body && post.content && (
        <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-body)", lineHeight: 1.8, marginBottom: "24px", whiteSpace: "pre-wrap" }}><MentionText text={post.body} /></p>
      )}

      {post.open_collab && (
        <CollabProposalButton postId={post.id} postAuthorId={post.author_id ?? ""} currentUserId={currentUserId} description={post.collab_description} />
      )}

      <style>{`
        .escrito-body { font-family: var(--font-space-mono), monospace; font-size: var(--magma-text-body); color: var(--magma-ash); line-height: 1.9; margin-bottom: 40px; word-break: break-word; }
        .escrito-body p { margin: 0 0 16px; }
        .escrito-body p:last-child { margin-bottom: 0; }
        .escrito-body h2 { font-family: var(--font-syne), sans-serif; font-size: 22px; font-weight: 800; color: var(--magma-ash); margin: 32px 0 12px; line-height: 1.2; letter-spacing: -0.01em; }
        .escrito-body h3 { font-family: var(--font-syne), sans-serif; font-size: 17px; font-weight: 700; color: var(--magma-ash); margin: 24px 0 8px; line-height: 1.2; }
        .escrito-body strong { color: var(--magma-ash); font-weight: 700; }
        .escrito-body em { color: var(--magma-ash); }
        .escrito-body blockquote { border-left: 2px solid #7F77DD; padding-left: 16px; margin: 20px 0; color: var(--magma-ash); font-style: italic; }
        .escrito-body ul { padding-left: 20px; list-style-type: disc; margin: 12px 0; color: var(--magma-ash); }
        .escrito-body li { margin: 6px 0; }
        .escrito-body hr { border: none; border-top: 0.5px solid #2a2a28; margin: 32px 0; }
      `}</style>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} style={{ padding: "2px 8px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </PostDetailShell>
  );
}

// ─── Arte / foto / música view ────────────────────────────────────────────────

const TYPE_ACCENT: Record<string, string> = {
  arte: "#E12120",
  fotografía: "#378ADD",
  música: "var(--magma-orange)",
  video: "#EF9F27",
};

function WorkView({ post, conversation, currentUserId }: {
  post: Post; conversation: ReactNode; currentUserId: string | null;
}) {
  const isAudio = post.media_type?.startsWith("audio/") || post.type === "música";
  const isVideo = post.media_type?.startsWith("video/") || post.type === "video";
  const accent = TYPE_ACCENT[post.type] ?? "#888780";
  const mediaUrl = post.media_url ?? post.media_base64;

  let primary: ReactNode = (
    <div className="flex min-h-[420px] items-center justify-center" style={{ color: "var(--magma-muted)", fontFamily: mono }}>
      sin archivo
    </div>
  );

  if (post.type === "música" && post.soundcloud_url) {
    primary = <div className="p-4 sm:p-6"><SoundCloudEmbed url={post.soundcloud_url} /></div>;
  } else if (isAudio && mediaUrl) {
    primary = (
      <div
        className="relative flex min-h-[440px] flex-col justify-end gap-4 p-6 sm:p-10"
        style={post.cover_url ? { backgroundImage: `url(${post.cover_url})`, backgroundPosition: "center", backgroundSize: "cover" } : { backgroundColor: "#111013" }}
      >
        {post.cover_url && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(9,10,13,.15), rgba(9,10,13,.9))" }} />}
        <p className="relative" style={{ color: "var(--magma-ash)", fontFamily: syne, fontSize: "24px", fontWeight: 800 }}>{post.title}</p>
        <audio controls src={mediaUrl} className="relative w-full" style={{ accentColor: "var(--magma-orange)" }} />
      </div>
    );
  } else if (isVideo && mediaUrl) {
    primary = (
      <video controls playsInline preload="metadata" src={mediaUrl} style={{ ...postMediaStyle, accentColor: "var(--magma-red)" }} />
    );
  } else if (postImages(post).length > 1) {
    primary = <PhotoCarousel images={postImages(post)} title={post.title ?? ""} eager fitScreen />;
  } else if (mediaUrl) {
    primary = (
      <PostImage src={mediaUrl} mediaType={post.media_type} alt={post.title ?? ""} />
    );
  }

  return (
    <PostDetailShell
      post={post}
      conversation={conversation}
      currentUserId={currentUserId}
      backHref="/"
      backLabel="archivo"
      accent={accent}
      primary={primary}
    >
      <h1 className="text-2xl leading-tight sm:text-3xl" style={{ color: "var(--magma-ash)", fontFamily: syne, fontWeight: 800, marginBottom: "8px" }}>
        {post.title}
      </h1>

      {post.open_collab && (
        <CollabProposalButton postId={post.id} postAuthorId={post.author_id ?? ""} currentUserId={currentUserId} description={post.collab_description} />
      )}

      {post.body && (
        <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-body)", lineHeight: 1.6, marginBottom: "8px", whiteSpace: "pre-wrap" }}>
          <MentionText text={post.body} />
        </p>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} style={{ padding: "2px 8px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </PostDetailShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

async function Conversation({ post, userId }: { post: Post; userId: string }) {
  const db = await createClient();
  const [comments, profile] = await Promise.all([
    db.from("comments").select("*, profiles(username, display_name)").eq("post_id", post.id).order("created_at", { ascending: true }),
    db.from("profiles").select("username, display_name").eq("id", userId).single(),
  ]);
  if (comments.error) return <p role="status">no se pudo cargar la conversación. intenta recargar la página.</p>;
  return <CommentsSection compact={post.type !== "evento"} tight={post.type === "evento"} showDivider={false}
    postId={post.id} initialComments={(comments.data ?? []) as Comment[]} currentUserId={userId}
    currentProfile={profile.data} commentsEnabled={post.comments_enabled !== false} />;
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await timedRequest("auth", supabase.auth.getUser());
  if (authError && authError.status !== 400 && authError.status !== 401 && authError.status !== 403) {
    throw new Error("No se pudo verificar la sesión. Inténtalo de nuevo.");
  }
  if (authError || !user) redirect(`/auth/login?redirectTo=/post/${id}`);

  const { data: postData, error: postError } = await timedRequest("post", supabase
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", id)
      .abortSignal(AbortSignal.timeout(15000))
      .maybeSingle());

  if (postError) {
    console.error("[post detail] failed to fetch post", { id, code: postError.code, message: postError.message });
    throw new Error("No se pudo cargar la publicación.");
  }
  if (!postData) return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-2xl">publicación no disponible</h1>
      <p className="mt-4">puede haberse eliminado o pertenecer a un colectivo del que todavía no eres miembro.</p>
      <Link href="/colectivos" className="mt-6 inline-block text-[var(--magma-red)]">ver colectivos y solicitar acceso →</Link>
    </main>
  );

  const post = { ...postData, media_base64: null } as unknown as Post;
  // Keep old uploads working without transferring unused base64 data for
  // newer posts. This remains an authenticated, RLS-protected query.
  if (!post.media_url && !post.image_urls?.length && post.type !== "escrito" && !post.soundcloud_url) {
    const legacy = await timedRequest("legacy media", supabase.from("posts")
      .select("media_base64").eq("id", id).abortSignal(AbortSignal.timeout(15000)).maybeSingle());
    if (legacy.error) throw new Error("No se pudo cargar la imagen.");
    post.media_base64 = legacy.data?.media_base64 ?? null;
  }
  const currentUserId = user.id;

  // Stream the artwork first. Discussion/profile requests remain authenticated
  // and cannot delay the primary content or bypass the post's RLS check above.
  const conversation = <Suspense fallback={<p role="status" className="py-6 text-sm text-[var(--magma-muted)]">cargando conversación…</p>}>
    <Conversation post={post} userId={currentUserId} />
  </Suspense>;
  const viewProps = { post, conversation, currentUserId };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      {post.moderation_status && post.moderation_status !== "approved" && post.author_id === currentUserId && (
        <div className="max-w-2xl mx-auto px-6 pt-6">
          <div style={{ border: `0.5px solid ${post.moderation_status === "pending" ? "#EF9F27" : "#E12120"}`, color: post.moderation_status === "pending" ? "#EF9F27" : "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.1em", padding: "12px 14px", textTransform: "uppercase" }}>
            {post.moderation_status === "pending" ? "en revisión · solo tú y el equipo de cuidado pueden ver esta publicación" : "publicación no aprobada"}
            {post.moderation_note && <span style={{ display: "block", letterSpacing: 0, marginTop: "8px", textTransform: "none" }}>{post.moderation_note}</span>}
          </div>
        </div>
      )}

        {post.type === "evento" ? (
          <EventoView {...viewProps} />
        ) : post.type === "escrito" ? (
          <SensitiveContentGate enabled={post.is_sensitive === true} postId={post.id}>
            <EscritoView {...viewProps} />
          </SensitiveContentGate>
        ) : (
          <WorkView {...viewProps} />
        )}
    </div>
  );
}
