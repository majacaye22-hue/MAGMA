"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase"
const supabase = getSupabaseClient();

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const REASONS = [
  "contenido inapropiado",
  "spam o publicidad",
  "acoso o violencia",
  "derechos de autor",
  "otro",
] as const;

type Reason = typeof REASONS[number];

interface Props {
  postId?: string;
  commentId?: string;
  currentUserId: string;
  onClose: () => void;
}

export function ReportModal({ postId, commentId, currentUserId, onClose }: Props) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || submitting) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      post_id: postId ?? null,
      comment_id: commentId ?? null,
      reason,
      details: details.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(12,12,11,0.80)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-sm"
        style={{ backgroundColor: "#141412", border: "0.5px solid #2a2a28", padding: "28px 24px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          /* ── Confirmation ── */
          <div className="flex flex-col gap-4">
            <div style={{ width: "24px", height: "2px", backgroundColor: "#D85A30" }} />
            <h2 style={{ fontSize: "16px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700 }}>
              reporte enviado
            </h2>
            <p style={{ fontSize: "12px", color: "#5F5E5A", fontFamily: mono, lineHeight: 1.6 }}>
              gracias. nuestro equipo lo revisará pronto.
            </p>
            <button
              onClick={onClose}
              style={{
                fontSize: "10px",
                color: "#888780",
                fontFamily: mono,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                marginTop: "4px",
              }}
              className="hover:opacity-70"
            >
              cerrar
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <h2 style={{ fontSize: "16px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700 }}>
                reportar contenido
              </h2>
              <button
                type="button"
                onClick={onClose}
                style={{ fontSize: "16px", color: "#5F5E5A", fontFamily: mono, background: "none", border: "none", cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
              >
                ×
              </button>
            </div>

            {/* Reason radios */}
            <div className="flex flex-col gap-2">
              <p style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                motivo
              </p>
              {REASONS.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-3 cursor-pointer"
                  style={{ fontSize: "12px", color: reason === r ? "#e8e4dc" : "#888780", fontFamily: mono }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "14px",
                      height: "14px",
                      border: `0.5px solid ${reason === r ? "#D85A30" : "#2a2a28"}`,
                      borderRadius: "50%",
                      flexShrink: 0,
                    }}
                  >
                    {reason === r && (
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#D85A30", display: "block" }} />
                    )}
                  </span>
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="sr-only"
                  />
                  {r}
                </label>
              ))}
            </div>

            {/* Optional details */}
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                detalles{" "}
                <span style={{ textTransform: "none", letterSpacing: 0, color: "#444441" }}>(opcional)</span>
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="cuéntanos más..."
                style={{
                  backgroundColor: "#0c0c0b",
                  border: "0.5px solid #2a2a28",
                  color: "#e8e4dc",
                  fontFamily: mono,
                  fontSize: "12px",
                  outline: "none",
                  padding: "8px 10px",
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono }}>{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={!reason || submitting}
                className="disabled:opacity-40 cursor-pointer"
                style={{
                  backgroundColor: "#D85A30",
                  color: "#0c0c0b",
                  fontFamily: mono,
                  fontSize: "10px",
                  border: "none",
                  padding: "9px 20px",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {submitting ? "enviando..." : "enviar reporte"}
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono, background: "none", border: "none", cursor: "pointer" }}
                className="hover:opacity-70"
              >
                cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
