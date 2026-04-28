"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

type MemberStatus = "admin" | "member" | "pending" | "none";

export function JoinButton({
  colectivoId,
  colectivoSlug,
  isPrivate,
  initialStatus,
  currentUserId,
}: {
  colectivoId: string;
  colectivoSlug: string;
  isPrivate: boolean;
  initialStatus: MemberStatus;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<MemberStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  if (status === "admin") return null;

  async function handleJoin() {
    if (!currentUserId) {
      window.location.href = `/auth/login?redirectTo=/colectivos/${colectivoSlug}`;
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();

    if (isPrivate) {
      const { error } = await supabase.from("colectivo_join_requests").insert({
        colectivo_id: colectivoId,
        user_id: currentUserId,
        status: "pending",
      });
      if (!error) setStatus("pending");
    } else {
      const { error } = await supabase.from("colectivo_members").insert({
        colectivo_id: colectivoId,
        user_id: currentUserId,
        role: "member",
      });
      if (!error) {
        setStatus("member");
        router.refresh();
      }
    }
    setLoading(false);
  }

  async function handleLeave() {
    if (!currentUserId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    await supabase.from("colectivo_members")
      .delete()
      .eq("colectivo_id", colectivoId)
      .eq("user_id", currentUserId);
    setStatus("none");
    router.refresh();
    setLoading(false);
  }

  if (status === "member") {
    return (
      <button
        onClick={handleLeave}
        disabled={loading}
        style={{
          fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
          padding: "8px 16px", border: "0.5px solid #2a2a28", color: "#5F5E5A",
          backgroundColor: "transparent", cursor: "pointer",
        }}
      >
        {loading ? "..." : "miembro · salir"}
      </button>
    );
  }

  if (status === "pending") {
    return (
      <span style={{
        fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
        padding: "8px 16px", border: "0.5px solid #2a2a28", color: "#444441",
      }}>
        solicitud enviada
      </span>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      style={{
        fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
        padding: "8px 16px",
        border: `0.5px solid ${isPrivate ? "#2a2a28" : "#D85A30"}`,
        color: isPrivate ? "#888780" : "#D85A30",
        backgroundColor: "transparent", cursor: loading ? "default" : "pointer",
      }}
    >
      {loading ? "..." : isPrivate ? "solicitar unirse" : "unirse"}
    </button>
  );
}
