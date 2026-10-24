"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { ReportModal } from "./ReportModal";
import { COMMENT_REPLIES_ENABLED, commentThreads } from "@/lib/comment-threads";

export interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  parent_id?: string | null;
  is_hidden?: boolean;
  profiles: { username: string; display_name: string | null } | null;
}

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

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


// ─── Single comment row ───────────────────────────────────────────────────────

function CommentRow({
  comment,
  isOwn,
  currentUserId,
  postId,
  onSave,
  onDelete,
  onReply,
}: {
  comment: Comment;
  isOwn: boolean;
  currentUserId: string | null;
  postId: string;
  onSave: (id: string, newBody: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReply?: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [editBody, setEditBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);

  async function handleSave() {
    const trimmed = editBody.trim();
    if (!trimmed || trimmed === comment.body) { setMode("view"); return; }
    setSaving(true);
    const saved = await onSave(comment.id, trimmed);
    setSaving(false);
    if (saved) setMode("view");
  }

  async function handleDelete() {
    setSaving(true);
    await onDelete(comment.id);
    setSaving(false);
  }

  return (
    <>
    <div className="group flex gap-3">


      {/* Content */}
      <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <Link
              href={comment.profiles ? `/profile/${comment.profiles.username}` : "#"}
              className="text-xs hover:underline"
              style={{ color: "var(--magma-muted)", fontFamily: mono }}
            >
              @{comment.profiles?.username ?? "anon"}
            </Link>
            <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
              {relativeTime(comment.created_at)}
            </span>
          </div>

          {/* Action buttons — visible on group hover */}
          {mode === "view" && (
            <div className="flex gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              {isOwn ? (
                <>
                  <button
                    onClick={() => { setEditBody(comment.body); setMode("edit"); }}
                    className="cursor-pointer hover:opacity-70"
                    style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, background: "none", border: "none", padding: 0 }}
                  >
                    editar
                  </button>
                  <button
                    onClick={() => setMode("confirm-delete")}
                    className="cursor-pointer hover:opacity-70"
                    style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, background: "none", border: "none", padding: 0 }}
                  >
                    eliminar
                  </button>
                </>
              ) : (
                currentUserId && (
                  <button
                    onClick={() => setReporting(true)}
                    className="cursor-pointer hover:opacity-70"
                    style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, background: "none", border: "none", padding: 0 }}
                  >
                    reportar
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Body — view, edit, or delete confirmation */}
        {mode === "view" && (
          <p style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: mono, lineHeight: 1.7, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {comment.body}
          </p>
        )}

        {mode === "view" && onReply && <button type="button" onClick={onReply} className="self-start min-h-11 text-xs cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">responder</button>}

        {mode === "edit" && (
          <div className="flex flex-col gap-2">
            <textarea
              rows={3}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              autoFocus
              style={{
                backgroundColor: "#141412",
                border: "0.5px solid #2a2a28",
                color: "#F2F4F8",
                fontFamily: mono,
                fontSize: "var(--magma-text-body)",
                outline: "none",
                width: "100%",
                padding: "8px 10px",
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
            <div className="flex gap-3">
              <button data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-red)"))}
                onClick={handleSave}
                disabled={saving || !editBody.trim()}
                className="px-3 py-1 text-xs tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: "var(--magma-red)", color: "var(--magma-ash)", fontFamily: mono }}
              >
                {saving ? "guardando..." : "guardar"}
              </button>
              <button
                onClick={() => setMode("view")}
                disabled={saving}
                className="px-3 py-1 text-xs tracking-widest uppercase cursor-pointer hover:opacity-70"
                style={{ backgroundColor: "transparent", border: "0.5px solid #2a2a28", color: "var(--magma-muted)", fontFamily: mono }}
              >
                cancelar
              </button>
            </div>
          </div>
        )}

        {mode === "confirm-delete" && (
          <div className="flex items-center gap-4" style={{ paddingTop: "2px" }}>
            <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
              ¿eliminar este comentario?
            </span>
            <button data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-red)"))}
              onClick={handleDelete}
              disabled={saving}
              className="cursor-pointer hover:opacity-70 disabled:opacity-40"
              style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, background: "none", border: "none", padding: 0 }}
            >
              {saving ? "..." : "sí"}
            </button>
            <button
              onClick={() => setMode("view")}
              disabled={saving}
              className="cursor-pointer hover:opacity-70"
              style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, background: "none", border: "none", padding: 0 }}
            >
              no
            </button>
          </div>
        )}
      </div>
    </div>

    {reporting && currentUserId && (
      <ReportModal
        commentId={comment.id}
        postId={postId}
        currentUserId={currentUserId}
        onClose={() => setReporting(false)}
      />
    )}
    </>
  );
}

// ─── Comments section ─────────────────────────────────────────────────────────

export function CommentsSection({
  compact = false,
  showDivider = true,
  tight = false,
  postId,
  initialComments,
  currentUserId,
  currentProfile,
  commentsEnabled,
}: {
  compact?: boolean;
  showDivider?: boolean;
  tight?: boolean;
  postId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  currentProfile: { username: string; display_name: string | null } | null;
  commentsEnabled: boolean;
}) {
  const supabase = getSupabaseClient();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyAnchor, setReplyAnchor] = useState<Comment | null>(null);
  const threads = commentThreads(comments);

  function beginReply(comment: Comment, anchor = comment) {
    if (submitting) return;
    setReplyTo(comment);
    setReplyAnchor(anchor);
  }

  // Focus after React has mounted the composer beneath the selected comment.
  useEffect(() => {
    if (replyTo) inputRef.current?.focus({ preventScroll: true });
  }, [replyTo, replyAnchor]);

  // The discussion streams after the post, so Next's initial hash scroll may
  // run before #comments exists. Retry when this specific discussion mounts.
  useEffect(() => {
    const revealConversation = () => {
      if (window.location.hash !== "#comments") return;
      sectionRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const frame = requestAnimationFrame(revealConversation);
    window.addEventListener("hashchange", revealConversation);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", revealConversation);
    };
  }, [postId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentsEnabled) return;
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {

    // Get the client-side user to ensure the auth token is sent with the request
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? currentUserId;
    if (!uid) {
      setError("debes iniciar sesión");
      setSubmitting(false);
      return;
    }

    const commentId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from("comments")
      .insert({ id: commentId, post_id: postId, author_id: uid, body: trimmed,
        ...(COMMENT_REPLIES_ENABLED ? { parent_id: replyTo?.id ?? null } : {}) });

    if (insertError) {
      setError(insertError.message.includes("reply target unavailable")
        ? "este comentario ya no está disponible para responder. tu texto sigue aquí; puedes cancelar la respuesta y comentar por separado."
        : "no se pudo enviar el comentario; tu texto sigue aquí para reintentar");
      setSubmitting(false);
      return;
    }

    setComments((prev) => [
      ...prev,
      {
        id: commentId,
        body: trimmed,
        created_at: new Date().toISOString(),
        author_id: uid,
        parent_id: replyTo?.id ?? null,
        profiles: currentProfile,
      },
    ]);
    setBody("");
    setReplyTo(null);
    } catch { setError("no se pudo enviar el comentario; tu texto sigue aquí para reintentar"); }
    finally { setSubmitting(false); }
  }

  async function handleSave(id: string, newBody: string) {
    setError(null);
    try {
    const { data, error } = await supabase
      .from("comments")
      .update({ body: newBody })
      .eq("id", id).eq("author_id", currentUserId ?? "").select("id");

    if (!error && data?.length) {
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, body: newBody } : c));
      return true;
    }
    } catch { /* Preserve the draft on transport failure. */ }
    setError("no se pudo editar el comentario; intenta de nuevo");
    return false;
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id).eq("author_id", currentUserId ?? "").select("id");

    if (!error && data?.length) {
      setComments((prev) => prev.filter((c) => c.id !== id).map(c => c.parent_id === id ? { ...c, parent_id: null } : c));
      if (replyTo?.id === id || replyAnchor?.id === id) setReplyTo(null);
      return true;
    }
    } catch { /* Keep the comment visible when deletion fails. */ }
    setError("no se pudo eliminar el comentario; intenta de nuevo");
    return false;
  }

  const composer = commentsEnabled && currentUserId ? (
        <form data-reply-to={replyTo ? replyAnchor?.id : undefined} onSubmit={handleSubmit} className="flex shrink-0 flex-col gap-3 rounded-2xl bg-white/[0.04] p-4 mt-2">
          {replyTo && <div className="flex flex-wrap items-center justify-between gap-2 text-xs" role="status">
            <span>respondiendo a @{replyAnchor?.profiles?.username ?? "anon"}</span>
            <button type="button" disabled={submitting} onClick={() => setReplyTo(null)} className="min-h-11 underline">cancelar respuesta</button>
          </div>}
          <label htmlFor={`note-${postId}`} style={{ fontFamily: mono, color: "var(--magma-muted)", fontSize: "var(--magma-text-small)" }}>
            {currentProfile ? `@${currentProfile.username}` : "tu nota"}
          </label>
          <textarea
            ref={inputRef}
            disabled={submitting}
            id={`note-${postId}`}
            aria-label="deja una nota"
            rows={2}
            placeholder="¿qué te hizo pensar?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              backgroundColor: "transparent",
              color: "#F2F4F8",
              fontFamily: mono,
              fontSize: "var(--magma-text-body)",
              width: "100%",
              padding: "12px",
              resize: "vertical",
              lineHeight: 1.6,
            }}
            className="note-input"
          />
          {error && (
            <div role="alert" style={{ padding: "10px 12px", backgroundColor: "#1a0a08", border: "0.5px solid #E12120" }}>
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, wordBreak: "break-all" }}>
                {error}
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="magma-soft-action text-sm"
              style={{ fontFamily: mono }}
            >
              {submitting ? "enviando…" : <>{replyTo ? "responder" : "comentar"} <span aria-hidden="true">→</span></>}
            </button>
          </div>
        </form>
  ) : null;

  return (
    <section ref={sectionRef} id="comments" className="magma-notes flex min-w-0 flex-col" style={{ maxWidth: "600px", width: "100%", marginInline: "auto", marginTop: compact || tight ? "12px" : "48px", scrollMarginTop: "80px", borderTop: showDivider ? "1px solid #2a2a28" : undefined, paddingTop: "24px" }}>
      <h2 className="shrink-0" style={{ fontSize: "24px", color: "var(--magma-ash)", fontFamily: syne, fontWeight: 700, marginBottom: "8px" }}>
        conversación{comments.length > 0 ? ` · ${comments.length}` : ""}
      </h2>

      <div className="order-2 min-w-0" style={{ marginTop: comments.length ? "24px" : 0 }}>
      {comments.length > 0 && (
        <div className="flex flex-col" style={{ gap: "24px", marginBottom: "32px" }}>
          {threads.map(({ root: c, replies }) => (
            <div key={c.id}>
            <CommentRow
              key={c.id}
              comment={c}
              isOwn={c.author_id === currentUserId}
              currentUserId={currentUserId}
              postId={postId}
              onSave={handleSave}
              onDelete={handleDelete}
              onReply={COMMENT_REPLIES_ENABLED && !c.is_hidden && !c.parent_id && commentsEnabled && currentUserId ? () => beginReply(c) : undefined}
            />
            {replyTo && replyAnchor?.id === c.id && composer}
            {replies.length > 0 && <div className="ml-3 mt-3 space-y-5 border-l border-white/10 pl-4 sm:ml-5" aria-label="respuestas">
              {replies.map(reply => <div key={reply.id}>
                <CommentRow comment={reply} isOwn={reply.author_id === currentUserId} currentUserId={currentUserId} postId={postId} onSave={handleSave} onDelete={handleDelete}
                onReply={COMMENT_REPLIES_ENABLED && !c.is_hidden && !reply.is_hidden && commentsEnabled && currentUserId ? () => beginReply(c, reply) : undefined} />
                {replyTo && replyAnchor?.id === reply.id && composer}
              </div>)}
            </div>}
            </div>
          ))}
        </div>
      )}
      </div>

      {!commentsEnabled ? (
        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.6 }}>
          comentarios cerrados por la persona que publicó
        </p>
      ) : currentUserId ? (
        !replyTo && composer
      ) : (
        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
          <Link href="/auth/login" style={{ color: "var(--magma-muted)", textDecoration: "underline" }}>
            entra
          </Link>
          {" "}para dejar una nota
        </p>
      )}
      <style jsx>{`
        .note-input { border: 0; border-radius: 10px; outline: none; min-height: 80px; }
        .note-input::placeholder { color: var(--magma-muted); opacity: .8; }
        .note-input:focus { border-color: var(--magma-red); outline: 1px solid var(--magma-red); outline-offset: 2px; }
      `}</style>
    </section>
  );
}
