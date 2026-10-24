"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { BookmarkButton } from "./BookmarkButton";
import { ReportModal } from "./ReportModal";
import { EchoButton } from "./EchoButton";
import { COLLABORATIONS_ENABLED } from '@/lib/collaborations';
import { PostCollaboratorsDialog } from './PostCollaboratorsDialog';

const mono = "var(--font-space-mono), monospace";

function AnatomicalHeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Asymmetric ventricles taper into the apex; vessels remain open outlines. */}
      <path d="M9.2 8.5C7.3 7.3 5 8.4 4.5 10.7c-.8 3.7 1.6 6.8 4.3 8.8 2.2 1.6 4.8 2.8 6 1.7 2.4-2.1 4.7-5.5 4.2-8.9-.3-2.6-2.3-4.4-4.6-4.1-1.2.1-2.2.7-3 1.8" fill={filled ? "currentColor" : "none"} />
      <path d="M9.2 8.5V5.8c0-2 1.2-3.3 3-3.3s3 1.3 3 3.3v2.4M11.5 8.9V6c0-.6.2-1 .7-1s.7.4.7 1v2.6M10 3.2l-.6-1.5m3 .8V1m2.1 2.4 1-1.3M6.4 8.4 5.6 4.8l2.2-.5.8 3.7M15.7 8.4l3.4-2 1.1 1.9-2.9 1.8" />
      {!filled && <path d="M11.4 10c-.4 2.7 1.6 4.9 2.3 7.2l1.1 4M12.1 13.4l3.1-1.5m-2.2 3.6-3.2-.2" />}
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 2.5h12v8H7l-3.5 3v-3H2v-8Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

export function PostInteractionBar({
  postId,
  postAuthorId,
  currentUserId,
  initialAppreciations,
  commentsEnabled,
  commentCount,
  compact = false,
  light = false,
  showCommentAction = true,
  showDivider = true,
  extraActions,
  echoAllowed = false,
  question = false,
}: {
  postId: string;
  postAuthorId: string | null;
  currentUserId: string | null;
  initialAppreciations: number;
  commentsEnabled: boolean;
  commentCount?: number;
  compact?: boolean;
  light?: boolean;
  showCommentAction?: boolean;
  showDivider?: boolean;
  extraActions?: ReactNode;
  echoAllowed?: boolean;
  question?: boolean;
}) {
  const [appreciated, setAppreciated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [deleting, setDeleting] = useState(false);
  const [count, setCount] = useState(initialAppreciations);
  const [saving, setSaving] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = getSupabaseClient();
    void supabase
      .from("post_appreciations")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }: { data: { post_id: string } | null }) => setAppreciated(!!data));
  }, [currentUserId, postId]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node) && !popupRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event?: Event) => {
      if (event?.target instanceof Node && popupRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        menuRef.current?.querySelector("button")?.focus();
      }
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", escape);
    popupRef.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  async function toggleAppreciation(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!currentUserId || saving) return;

    const next = !appreciated;
    setInteractionError(null);
    setAppreciated(next);
    setCount((value) => Math.max(0, value + (next ? 1 : -1)));
    setSaving(true);

    const supabase = getSupabaseClient();
    const { error } = next
      ? await supabase.from("post_appreciations").insert({ post_id: postId, user_id: currentUserId })
      : await supabase.from("post_appreciations").delete().eq("post_id", postId).eq("user_id", currentUserId);

    if (error) {
      setAppreciated(!next);
      setCount((value) => Math.max(0, value + (next ? -1 : 1)));
      setInteractionError("no se pudo guardar tu aprecio");
    }
    setSaving(false);
  }

  async function deletePost() {
    if (!currentUserId || currentUserId !== postAuthorId || deleting) return;
    if (!window.confirm("¿eliminar esta publicación? Se eliminarán también sus comentarios. Esta acción no se puede deshacer.")) return;
    setMenuOpen(false);
    setDeleting(true);
    setInteractionError(null);
    try {
      const { data, error } = await getSupabaseClient().from("posts").delete()
        .eq("id", postId).eq("author_id", currentUserId).select("id");
      if (error || !data?.length) throw new Error("Delete failed");
      if (pathname === `/post/${postId}`) router.replace("/");
      router.refresh();
    } catch {
      setInteractionError("no se pudo eliminar la publicación; intenta de nuevo");
    } finally {
      setDeleting(false);
    }
  }

  const actionStyle = {
    alignItems: "center",
    background: "none",
    border: "none",
    color: light ? "var(--magma-muted)" : "var(--magma-muted)",
    display: "inline-flex",
    fontFamily: mono,
    fontSize: "var(--magma-text-small)",
    gap: "6px",
    letterSpacing: "0.08em",
    padding: "4px",
    textDecoration: "none",
    textTransform: "uppercase" as const,
  };

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-2"
        style={{ borderTop: showDivider ? `0.5px solid ${light ? "#493d44" : "#2a2a28"}` : "none", padding: compact ? "9px 0 16px" : "12px 0 20px", position: "relative", zIndex: 30 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAppreciation}
            disabled={!currentUserId || saving}
            aria-pressed={appreciated}
            className="magma-appreciation-heart"
            aria-label={appreciated ? "quitar aprecio" : "apreciar"}
            title={appreciated ? "quitar aprecio" : "apreciar"}
            style={{
              ...actionStyle,
              color: appreciated ? "var(--magma-ash)" : light ? "var(--magma-muted)" : "var(--magma-muted)",
              cursor: currentUserId ? "pointer" : "default",
              flexShrink: 0,
              justifyContent: "flex-start",
              minWidth: "32px",
              opacity: saving ? 0.6 : 1,
            }}
          >
            <AnatomicalHeartIcon filled={appreciated} />
            {count > 0 && <span>{count}</span>}
          </button>

          {showCommentAction && (
            commentsEnabled ? (
              <Link href={`/post/${postId}#comments`} style={actionStyle} title="ver conversación" aria-label={commentCount === undefined ? "ver conversación" : `${commentCount} comentarios · ver conversación`}>
                <CommentIcon />
                {commentCount !== undefined && commentCount > 0 && <span>{commentCount}</span>}
                {!compact && <span>comentar</span>}
              </Link>
            ) : (
              <span style={{ ...actionStyle, color: "var(--magma-muted)" }} title="comentarios cerrados">
                <CommentIcon />
                {!compact && <span>cerrados</span>}
              </span>
            )
          )}

        </div>

        <div className="flex items-center gap-1">
          {echoAllowed && currentUserId && currentUserId !== postAuthorId && <EchoButton postId={postId} userId={currentUserId} />}
          <BookmarkButton postId={postId} currentUserId={currentUserId} size={16} />
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault(); event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                const width = extraActions ? 260 : 190;
                const height = (extraActions ? 180 : 110) + (COLLABORATIONS_ENABLED && currentUserId === postAuthorId ? 44 : 0);
                setMenuPosition({ left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top: rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom + 6 });
                setMenuOpen((open) => !open);
              }}
              aria-label="Más opciones"
              aria-expanded={menuOpen}
              style={{ ...actionStyle, cursor: "pointer", fontSize: "16px", letterSpacing: "0.14em", lineHeight: 1 }}
            >
              ···
            </button>
            {menuOpen && createPortal(
              <div ref={popupRef} onClick={(event) => event.stopPropagation()} style={{ position: "fixed", ...menuPosition, width: extraActions ? "260px" : "190px", maxWidth: "calc(100vw - 16px)", maxHeight: `calc(100dvh - ${menuPosition.top + 8}px)`, overflowY: "auto", borderRadius: "8px", backgroundColor: "#181819", border: "1px solid #454549", boxShadow: "0 8px 24px rgba(0,0,0,.55)", zIndex: 1000 }}>
                {currentUserId && currentUserId === postAuthorId ? (
                  <>
                    {!question && <Link href={`/post/${postId}/edit`} style={{ ...actionStyle, display: "flex", padding: "10px 12px" }}>editar</Link>}
                    {!question && COLLABORATIONS_ENABLED && <button type="button" onClick={() => { setMenuOpen(false); setInviting(true); }} style={{ ...actionStyle, display: 'flex', padding: '10px 12px', width: '100%', textAlign: 'left', cursor: 'pointer' }}>invitar colaboradores</button>}
                    <button type="button" disabled={deleting} onClick={deletePost} style={{ ...actionStyle, color: "var(--magma-red)", cursor: "pointer", width: "100%", padding: "10px 12px", textAlign: "left" }}>{deleting ? "eliminando…" : "eliminar publicación"}</button>
                  </>
                ) : currentUserId ? (
                  <button
                    type="button"
                    onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); setReporting(true); }}
                    style={{ ...actionStyle, cursor: "pointer", display: "flex", padding: "10px 12px", width: "100%" }}
                  >
                    reportar
                  </button>
                ) : <Link href="/auth/login" style={{ ...actionStyle, display: "flex", padding: "10px 12px" }}>iniciar sesión</Link>}
                {extraActions && <div style={{ padding: "8px 12px", borderTop: "1px solid #343434" }}>{extraActions}</div>}
              </div>, document.body
            )}
          </div>
        </div>
      </div>

      {interactionError && (
        <p role="status" style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", margin: "3px 4px 0", position: "relative", zIndex: 30 }}>
          {interactionError}
        </p>
      )}

      {reporting && currentUserId && (
        <ReportModal postId={postId} currentUserId={currentUserId} onClose={() => setReporting(false)} />
      )}
      {inviting && COLLABORATIONS_ENABLED && currentUserId && currentUserId === postAuthorId && (
        <PostCollaboratorsDialog postId={postId} userId={currentUserId} onClose={() => {
          setInviting(false);
          menuRef.current?.querySelector('button')?.focus();
        }} />
      )}
    </>
  );
}
