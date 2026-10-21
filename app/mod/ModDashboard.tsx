"use client";

import { useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase"
const supabase = getSupabaseClient();

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

export interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  post_id: string | null;
  comment_id: string | null;
  posts: { id: string; title: string; is_hidden: boolean } | null;
  comments: { id: string; body: string; is_hidden: boolean } | null;
  profiles: { username: string } | null;
}

export interface PendingPost {
  id: string;
  title: string | null;
  body: string | null;
  type: string;
  media_url: string | null;
  created_at: string;
  author_id: string;
  moderation_status: "pending";
  profiles: { username: string } | null;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function ModDashboard({ initialPendingPosts, initialReports, canDelete = false }: { initialPendingPosts: PendingPost[]; initialReports: Report[]; canDelete?: boolean }) {
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>(initialPendingPosts);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [working, setWorking] = useState<string | null>(null); // id of report being actioned

  const lock = useRef(false);
  const [error, setError] = useState("");

  async function run(id: string, action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setWorking(id);
    setError("");
    try { await action(); }
    catch { setError("No se confirmó la acción. Actualiza la página para verificar el estado antes de reintentar."); }
    finally { lock.current = false; setWorking(null); }
  }

  async function reviewPost(postId: string, status: "approved" | "rejected") {
    if (lock.current) return;
    const note = status === "rejected" ? window.prompt("Nota para la persona autora (opcional):") : "";
    if (note === null) return;
    await run(postId, async () => {
      const { error } = await supabase.rpc("review_post", {
        p_post_id: postId, p_status: status, p_note: note.trim() || null,
      }).abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      setPendingPosts(previous => previous.filter(post => post.id !== postId));
      window.dispatchEvent(new Event("magma:moderation-changed"));
    });
  }

  async function actOnReport(report: Report, action: "hide" | "restore" | "resolve" | "delete") {
    if (lock.current) return;
    if (action === "delete" && !canDelete) return;
    if (action === "delete" && !window.confirm("¿Eliminar este contenido de forma permanente? Esta acción no se puede deshacer.")) return;
    await run(report.id, async () => {
      const { error } = await supabase.rpc("moderate_report", {
        p_report_id: report.id, p_action: action,
      }).abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      const sameTarget = (r: Report) => report.comment_id
        ? r.comment_id === report.comment_id
        : !r.comment_id && r.post_id === report.post_id;
      setReports(previous => action === "hide"
        ? previous.map(r => !sameTarget(r) ? r : {
            ...r,
            comments: report.comment_id && r.comments ? { ...r.comments, is_hidden: true } : r.comments,
            posts: !report.comment_id && r.posts ? { ...r.posts, is_hidden: true } : r.posts,
          })
        : previous.filter(r => action === "resolve" ? r.id !== report.id
          : action === "delete" && !report.comment_id ? r.post_id !== report.post_id : !sameTarget(r)));
    });
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap gap-4 items-center">
        <button disabled={working !== null} onClick={() => window.location.reload()} className="border border-red-600 px-4 py-2 text-white">actualizar colas</button>
        {error && <p role="alert" className="text-white">{error}</p>}
      </div>
      <section>
        <h2 style={{ color: "#F2F4F8", fontFamily: syne, fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>cola de publicaciones</h2>
        {pendingPosts.length === 0 ? <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>sin publicaciones por revisar</p> : (
          <div className="flex flex-col" style={{ gap: "2px" }}>
            {pendingPosts.map((post) => <div key={post.id} className="flex flex-col md:grid gap-4" style={{ padding: "20px 24px", backgroundColor: "#0e0e0d", border: "0.5px solid #2a2a28", gridTemplateColumns: "1fr auto", alignItems: "start" }}>
              <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>
                <span style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{post.type} · @{post.profiles?.username ?? "sin usuario"}</span>
                <a href={`/post/${post.id}`} target="_blank" rel="noreferrer" style={{ color: "#F2F4F8", fontFamily: syne, fontSize: "var(--magma-text-body)", fontWeight: 700 }}>{post.title || "sin título"} ↗</a>
                {post.body && <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>{post.body.slice(0, 180)}{post.body.length > 180 ? "…" : ""}</p>}
                <span style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>{relativeTime(post.created_at)}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button disabled={working !== null} onClick={() => reviewPost(post.id, "approved")} style={{ background: "none", border: "0.5px solid var(--magma-orange)", color: "var(--magma-ash)", cursor: "pointer", fontFamily: mono, fontSize: "var(--magma-text-small)", padding: "6px 12px" }}>aprobar</button>
                <button disabled={working !== null} onClick={() => reviewPost(post.id, "rejected")} style={{ background: "none", border: "0.5px solid #E12120", color: "var(--magma-ash)", cursor: "pointer", fontFamily: mono, fontSize: "var(--magma-text-small)", padding: "6px 12px" }}>rechazar</button>
              </div>
            </div>)}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ color: "#F2F4F8", fontFamily: syne, fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>reportes de la comunidad</h2>
        {reports.length === 0 ? <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>sin reportes pendientes</p> : <div className="flex flex-col" style={{ gap: "2px" }}>
      {reports.map((report) => {
        const isComment = !!report.comment_id;
        const busy = working !== null;
        const isHidden = isComment ? report.comments?.is_hidden : report.posts?.is_hidden;

        return (
          <div
            key={report.id}
            className="flex flex-col md:grid gap-4"
            style={{
              padding: "20px 24px",
              backgroundColor: "#0e0e0d",
              border: "0.5px solid #2a2a28",
              gridTemplateColumns: "1fr auto",
              alignItems: "start",
            }}
          >
            {/* Left — report info */}
            <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>
              {/* Target */}
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: "var(--magma-text-small)",
                    color: isComment ? "#EF9F27" : "var(--magma-ash)",
                    fontFamily: mono,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: `0.5px solid ${isComment ? "#EF9F27" : "#E12120"}`,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isComment ? "comentario" : "post"}
                </span>
                <span
                  style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {isComment
                    ? `"${report.comments?.body?.slice(0, 60) ?? ""}${(report.comments?.body?.length ?? 0) > 60 ? "…" : ""}"`
                    : (report.posts?.title ?? "post eliminado")}
                </span>
              </div>

              {/* Reason */}
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                {report.reason}
              </p>
              {isHidden && <p style={{ fontSize: "var(--magma-text-small)", color: "#EF9F27", fontFamily: mono, letterSpacing: "0.12em", textTransform: "uppercase" }}>oculto mientras se revisa</p>}

              {/* Details (if any) */}
              {report.details && (
                <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, fontStyle: "italic" }}>
                  &ldquo;{report.details}&rdquo;
                </p>
              )}

              {/* Reporter + timestamp */}
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                  @{report.profiles?.username ?? "anon"} · {relativeTime(report.created_at)}
                </span>
              </div>
            </div>

            {/* Right — action buttons */}
            <div className="flex gap-3 items-start" style={{ paddingTop: "2px" }}>
              {isHidden ? (
                <button onClick={() => actOnReport(report, "restore")} disabled={busy} className="cursor-pointer hover:opacity-70 disabled:opacity-40" style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, background: "none", border: "0.5px solid var(--magma-orange)", padding: "5px 12px", whiteSpace: "nowrap" }}>{busy ? "..." : "restaurar"}</button>
              ) : (
                <button onClick={() => actOnReport(report, "hide")} disabled={busy} className="cursor-pointer hover:opacity-70 disabled:opacity-40" style={{ fontSize: "var(--magma-text-small)", color: "#EF9F27", fontFamily: mono, background: "none", border: "0.5px solid #EF9F27", padding: "5px 12px", whiteSpace: "nowrap" }}>{busy ? "..." : "ocultar y revisar"}</button>
              )}
              <button
                onClick={() => actOnReport(report, "resolve")}
                disabled={busy}
                className="cursor-pointer hover:opacity-70 disabled:opacity-40"
                style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, background: "none", border: "0.5px solid #2a2a28", padding: "5px 12px", whiteSpace: "nowrap" }}
              >
                {busy ? "..." : "ignorar"}
              </button>
              {canDelete && <button
                onClick={() => actOnReport(report, "delete")}
                disabled={busy}
                className="cursor-pointer hover:opacity-70 disabled:opacity-40"
                style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, background: "none", border: "0.5px solid #E12120", padding: "5px 12px", whiteSpace: "nowrap" }}
              >
                {busy ? "..." : isComment ? "eliminar comentario" : "eliminar post"}
              </button>}
            </div>
          </div>
        );
      })}
        </div>}
      </section>
    </div>
  );
}
