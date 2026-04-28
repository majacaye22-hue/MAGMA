"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

export function ContactSellerButton({
  listingId,
  sellerId,
  currentUserId,
}: {
  listingId: string;
  sellerId: string;
  currentUserId: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleClick() {
    if (!currentUserId) {
      window.location.href = `/auth/login?redirectTo=/tianguis/${listingId}`;
      return;
    }

    setLoading(true);
    setErr(null);
    const supabase = getSupabaseClient();
    const [p1, p2] = [currentUserId, sellerId].sort();

    const { data: existing, error: selectErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_1", p1)
      .eq("participant_2", p2)
      .maybeSingle();

    if (selectErr) {
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
      setErr("error al crear conversación");
      setLoading(false);
      return;
    }

    if (created) window.location.href = `/mensajes?c=${(created as { id: string }).id}`;
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px",
          backgroundColor: loading ? "#2a2a28" : "#D85A30",
          color: loading ? "#5F5E5A" : "#0c0c0b",
          fontFamily: mono,
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          border: "none",
          cursor: loading ? "default" : "pointer",
        }}
        className="hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "..." : "quiero esto →"}
      </button>
      {err && (
        <p style={{ marginTop: "8px", fontSize: "10px", color: "#D85A30", fontFamily: mono }}>{err}</p>
      )}
    </div>
  );
}
