"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase"
const supabase = getSupabaseClient();
import { ReportModal } from "./ReportModal";

export interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
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

function initials(p: Comment["profiles"]): string {
  if (!p) return "?";
  if (p.display_name) return p.display_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return p.username.slice(0, 2).toUpperCase();
}

// ─── Single comment row ───────────────────────────────────────────────────────

function CommentRow({
  comment,
  isOwn,
  currentUserId,
  postId,
  onSave,
  onDelete,
}: {
  comment: Comment;
  isOwn: boolean;
  currentUserId: string | null;
  postId: string;
  onSave: (id: string, newBody: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [editBody, setEditBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);

  async function handleSave() {
    const trimmed = editBody.trim();
    if (!trimmed || trimmed === comment.body) { setMode("view"); return; }
    setSaving(true);
    await onSave(comment.id, trimmed);
    setSaving(false);
    setMode("view");
  }

  async function handleDelete() {
    setSaving(true);
    await onDelete(comment.id);
    // component unmounts after delete, no need to reset
  }

  return (
    <>
    <div className="group flex gap-3">
      {/* Avatar */}
      <div
        className="flex items-center justify-center shrink-0 text-[10px] font-bold"
        style={{ width: "28px", height: "28px", borderRadius: "2px", backgroundColor: "#2a2a28", color: "#e8e4dc", fontFamily: syne }}
      >
        {initials(comment.profiles)}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <Link
              href={comment.profiles ? `/profile/${comment.profiles.username}` : "#"}
              className="text-xs hover:underline"
              style={{ color: "#888780", fontFamily: mono }}
            >
              @{comment.profiles?.username ?? "anon"}
            </Link>
            <span style={{ fontSize: "11px", color: "#444441", fontFamily: mono }}>
              {relativeTime(comment.created_at)}
            </span>
          </div>

          {/* Action buttons — visible on group hover */}
          {mode === "view" && (
            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {isOwn ? (
                <>
                  <button
                    onClick={() => { setEditBody(comment.body); setMode("edit"); }}
                    className="cursor-pointer hover:opacity-70"
                    style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, background: "none", border: "none", padding: 0 }}
                  >
                    editar
                  </button>
                  <button
                    onClick={() => setMode("confirm-delete")}
                    className="cursor-pointer hover:opacity-70"
                    style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, background: "none", border: "none", padding: 0 }}
                  >
                    eliminar
                  </button>
                </>
              ) : (
                currentUserId && (
                  <button
                    onClick={() => setReporting(true)}
                    className="cursor-pointer hover:opacity-70"
                    style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, background: "none", border: "none", padding: 0 }}
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
          <p style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: mono, lineHeight: 1.7 }}>
            {comment.body}
          </p>
        )}

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
                color: "#e8e4dc",
                fontFamily: mono,
                fontSize: "13px",
                outline: "none",
                width: "100%",
                padding: "8px 10px",
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !editBody.trim()}
                className="px-3 py-1 text-[10px] tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: "#D85A30", color: "#0c0c0b", fontFamily: mono }}
              >
                {saving ? "guardando..." : "guardar"}
              </button>
              <button
                onClick={() => setMode("view")}
                disabled={saving}
                className="px-3 py-1 text-[10px] tracking-widest uppercase cursor-pointer hover:opacity-70"
                style={{ backgroundColor: "transparent", border: "0.5px solid #2a2a28", color: "#5F5E5A", fontFamily: mono }}
              >
                cancelar
              </button>
            </div>
          </div>
        )}

        {mode === "confirm-delete" && (
          <div className="flex items-center gap-4" style={{ paddingTop: "2px" }}>
            <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono }}>
              ¿eliminar este comentario?
            </span>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="cursor-pointer hover:opacity-70 disabled:opacity-40"
              style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono, background: "none", border: "none", padding: 0 }}
            >
              {saving ? "..." : "sí"}
            </button>
            <button
              onClick={() => setMode("view")}
              disabled={saving}
              className="cursor-pointer hover:opacity-70"
              style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, background: "none", border: "none", padding: 0 }}
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
  postId,
  initialComments,
  currentUserId,
  currentProfile,
}: {
  postId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  currentProfile: { username: string; display_name: string | null } | null;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting || !currentUserId) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: currentUserId, body: trimmed });

    if (insertError) {
      setError(`${insertError.message} (code: ${insertError.code})`);
      setSubmitting(false);
      return;
    }

    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        body: trimmed,
        created_at: new Date().toISOString(),
        author_id: currentUserId,
        profiles: currentProfile,
      },
    ]);
    setBody("");
    setSubmitting(false);
  }

  async function handleSave(id: string, newBody: string) {
    const { error } = await supabase
      .from("comments")
      .update({ body: newBody })
      .eq("id", id);

    if (!error) {
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, body: newBody } : c));
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id);

    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <section style={{ marginTop: "48px" }}>
      <h2 style={{ fontSize: "16px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, marginBottom: "24px" }}>
        conversación
      </h2>

      {comments.length === 0 ? (
        <p style={{ fontSize: "11px", color: "#444441", fontFamily: mono, marginBottom: "32px" }}>
          sin comentarios todavía
        </p>
      ) : (
        <div className="flex flex-col" style={{ gap: "24px", marginBottom: "32px" }}>
          {comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              isOwn={c.author_id === currentUserId}
              currentUserId={currentUserId}
              postId={postId}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "24px" }} />

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            rows={3}
            placeholder="añade tu voz..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              backgroundColor: "#141412",
              border: "0.5px solid #2a2a28",
              color: "#e8e4dc",
              fontFamily: mono,
              fontSize: "13px",
              outline: "none",
              width: "100%",
              padding: "10px 12px",
              resize: "vertical",
              lineHeight: 1.6,
            }}
            className="focus:outline-none"
          />
          {error && (
            <div style={{ padding: "10px 12px", backgroundColor: "#1a0a08", border: "0.5px solid #D85A30" }}>
              <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono, wordBreak: "break-all" }}>
                {error}
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="px-5 py-2 text-xs tracking-widest uppercase cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#D85A30", color: "#0c0c0b", fontFamily: mono }}
            >
              {submitting ? "enviando..." : "comentar"}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ fontSize: "12px", color: "#5F5E5A", fontFamily: mono }}>
          <Link href="/auth/login" style={{ color: "#888780", textDecoration: "underline" }}>
            entra
          </Link>
          {" "}para comentar
        </p>
      )}
    </section>
  );
}
