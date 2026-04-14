"use client";

import { useState } from "react";
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
  posts: { id: string; title: string } | null;
  comments: { id: string; body: string } | null;
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

export function ModDashboard({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [working, setWorking] = useState<string | null>(null); // id of report being actioned

  async function handleIgnore(reportId: string) {
    setWorking(reportId);
    const { error } = await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", reportId);

    if (!error) setReports((prev) => prev.filter((r) => r.id !== reportId));
    setWorking(null);
  }

  async function handleDeletePost(report: Report) {
    setWorking(report.id);

    // Delete the post (cascade will clean up comments and reports via FK)
    if (report.post_id) {
      await supabase.from("posts").delete().eq("id", report.post_id);
    }

    // Resolve all reports for this post
    await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("post_id", report.post_id);

    // Remove all reports for this post from local state
    setReports((prev) => prev.filter((r) => r.post_id !== report.post_id));
    setWorking(null);
  }

  async function handleDeleteComment(report: Report) {
    setWorking(report.id);

    if (report.comment_id) {
      await supabase.from("comments").delete().eq("id", report.comment_id);
    }

    await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("comment_id", report.comment_id);

    setReports((prev) => prev.filter((r) => r.comment_id !== report.comment_id));
    setWorking(null);
  }

  if (reports.length === 0) {
    return (
      <p style={{ fontSize: "12px", color: "#444441", fontFamily: mono, paddingTop: "48px" }}>
        sin reportes pendientes
      </p>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: "2px" }}>
      {reports.map((report) => {
        const isComment = !!report.comment_id;
        const busy = working === report.id;

        return (
          <div
            key={report.id}
            style={{
              padding: "20px 24px",
              backgroundColor: "#0e0e0d",
              border: "0.5px solid #2a2a28",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "16px",
              alignItems: "start",
            }}
          >
            {/* Left — report info */}
            <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>
              {/* Target */}
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: "9px",
                    color: isComment ? "#EF9F27" : "#D85A30",
                    fontFamily: mono,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: `0.5px solid ${isComment ? "#EF9F27" : "#D85A30"}`,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isComment ? "comentario" : "post"}
                </span>
                <span
                  style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {isComment
                    ? `"${report.comments?.body?.slice(0, 60) ?? ""}${(report.comments?.body?.length ?? 0) > 60 ? "…" : ""}"`
                    : (report.posts?.title ?? "post eliminado")}
                </span>
              </div>

              {/* Reason */}
              <p style={{ fontSize: "12px", color: "#888780", fontFamily: mono }}>
                {report.reason}
              </p>

              {/* Details (if any) */}
              {report.details && (
                <p style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono, fontStyle: "italic" }}>
                  "{report.details}"
                </p>
              )}

              {/* Reporter + timestamp */}
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>
                  @{report.profiles?.username ?? "anon"} · {relativeTime(report.created_at)}
                </span>
              </div>
            </div>

            {/* Right — action buttons */}
            <div className="flex gap-3 items-start" style={{ paddingTop: "2px" }}>
              <button
                onClick={() => handleIgnore(report.id)}
                disabled={busy}
                className="cursor-pointer hover:opacity-70 disabled:opacity-40"
                style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, background: "none", border: "0.5px solid #2a2a28", padding: "5px 12px", whiteSpace: "nowrap" }}
              >
                {busy ? "..." : "ignorar"}
              </button>
              <button
                onClick={() => isComment ? handleDeleteComment(report) : handleDeletePost(report)}
                disabled={busy}
                className="cursor-pointer hover:opacity-70 disabled:opacity-40"
                style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono, background: "none", border: "0.5px solid #D85A30", padding: "5px 12px", whiteSpace: "nowrap" }}
              >
                {busy ? "..." : isComment ? "eliminar comentario" : "eliminar post"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
