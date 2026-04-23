"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const YELLOW = "#7EC8E3";
const YELLOW_HOVER = "rgba(126, 200, 227, 0.75)";
const DARK = "#0c0c0b";

export function CollabProposalButton({
  postId,
  postAuthorId,
  currentUserId: serverUserId,
  description,
}: {
  postId: string;
  postAuthorId: string;
  currentUserId: string | null;
  description?: string | null;
}) {
  const [userId, setUserId] = useState<string | null>(serverUserId);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Hide from the post owner
  if (userId === postAuthorId) return null;

  async function handleClick() {
    setErr(null);

    if (!userId) {
      window.location.href = `/auth/login?redirectTo=/post/${postId}`;
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const [p1, p2] = [userId, postAuthorId].sort();

    const { data: existing, error: selectErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_1", p1)
      .eq("participant_2", p2)
      .maybeSingle();

    if (selectErr) {
      console.error("[CollabProposalButton] select error:", selectErr);
      setErr("error al buscar conversación");
      setLoading(false);
      return;
    }

    if (existing) {
      window.location.href = `/mensajes?c=${(existing as { id: string }).id}`;
      return;
    }

    const { data: created, error: insertErr } = await supabase
      .from("conversations")
      .insert({ participant_1: p1, participant_2: p2 })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[CollabProposalButton] insert error:", insertErr);
      setErr("error al crear conversación");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (created) window.location.href = `/mensajes?c=${(created as { id: string }).id}`;
  }

  const fg = hovered ? DARK : YELLOW;

  return (
    <div style={{ marginBottom: "24px" }}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={loading}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: "6px",
          width: "auto",
          maxWidth: "280px",
          textAlign: "left",
          padding: "8px 12px",
          border: `0.5px solid ${YELLOW}`,
          backgroundColor: hovered ? YELLOW_HOVER : "transparent",
          cursor: loading ? "default" : "pointer",
          transition: "background-color 0.15s ease",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <span style={{
          fontSize: "9px",
          color: fg,
          fontFamily: mono,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          transition: "color 0.15s ease",
        }}>
          ✦ abierto a colaboración
        </span>

        <span style={{
          fontSize: "10px",
          color: fg,
          fontFamily: mono,
          lineHeight: 1.6,
          opacity: hovered ? 0.85 : 0.7,
          transition: "color 0.15s ease",
        }}>
          {description?.trim()
            ? description.trim()
            : "el artista invita a otros creadores a participar o comentar este proyecto"}
        </span>

        <span style={{
          fontSize: "9px",
          color: fg,
          fontFamily: mono,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          marginTop: "2px",
          transition: "color 0.15s ease",
        }}>
          {loading ? "..." : "proponer colaboración →"}
        </span>
      </button>

      {err && (
        <p style={{ marginTop: "6px", fontSize: "10px", color: "#D85A30", fontFamily: mono }}>
          {err}
        </p>
      )}
    </div>
  );
}
