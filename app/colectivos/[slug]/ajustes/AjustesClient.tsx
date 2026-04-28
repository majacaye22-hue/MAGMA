"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Member = {
  id: string;
  role: string;
  user_id: string;
  profiles: { username: string; display_name: string | null } | null;
};

type JoinRequest = {
  id: string;
  user_id: string;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

type Colectivo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_color: string;
  is_private: boolean;
  created_by: string;
};

export function AjustesClient({
  col,
  members: initialMembers,
  requests: initialRequests,
  currentUserId,
}: {
  col: Colectivo;
  members: Member[];
  requests: JoinRequest[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState<string | null>(null);

  async function approveRequest(req: JoinRequest) {
    setLoading(req.id);
    const supabase = getSupabaseClient();
    await supabase.from("colectivo_join_requests").update({ status: "approved" }).eq("id", req.id);
    const { data: newMem } = await supabase
      .from("colectivo_members")
      .insert({ colectivo_id: col.id, user_id: req.user_id, role: "member" })
      .select("id, role, user_id, profiles(username, display_name)")
      .single();
    if (newMem) setMembers((prev) => [...prev, newMem as unknown as Member]);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setLoading(null);
  }

  async function rejectRequest(req: JoinRequest) {
    setLoading(req.id);
    const supabase = getSupabaseClient();
    await supabase.from("colectivo_join_requests").update({ status: "rejected" }).eq("id", req.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setLoading(null);
  }

  async function removeMember(mem: Member) {
    if (mem.user_id === currentUserId) return;
    setLoading(mem.id);
    const supabase = getSupabaseClient();
    await supabase.from("colectivo_members").delete().eq("id", mem.id);
    setMembers((prev) => prev.filter((m) => m.id !== mem.id));
    setLoading(null);
  }

  async function promoteToAdmin(mem: Member) {
    setLoading(mem.id);
    const supabase = getSupabaseClient();
    await supabase.from("colectivo_members").update({ role: "admin" }).eq("id", mem.id);
    setMembers((prev) => prev.map((m) => m.id === mem.id ? { ...m, role: "admin" } : m));
    setLoading(null);
  }

  async function deleteColectivo() {
    if (!confirm(`¿Eliminar "${col.name}"? Esta acción no se puede deshacer.`)) return;
    const supabase = getSupabaseClient();
    await supabase.from("colectivos").delete().eq("id", col.id);
    router.push("/colectivos");
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em",
    marginBottom: "12px", display: "block",
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 24px 80px" }}>

        <div style={{ marginBottom: "24px" }}>
          <Link href={`/colectivos/${col.slug}`} style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ← {col.name}
          </Link>
        </div>

        <h1 style={{ fontSize: "24px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, marginBottom: "40px" }}>
          ajustes del colectivo
        </h1>

        {/* Pending join requests */}
        {col.is_private && (
          <section style={{ marginBottom: "40px" }}>
            <span style={sectionLabel}>solicitudes pendientes ({requests.length})</span>
            {requests.length === 0 ? (
              <p style={{ fontSize: "11px", color: "#444441", fontFamily: mono }}>sin solicitudes</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", backgroundColor: "#2a2a28" }}>
                {requests.map((req) => (
                  <div key={req.id} style={{ backgroundColor: "#141412", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: "12px", color: "#e8e4dc", fontFamily: mono }}>@{req.profiles?.username ?? req.user_id.slice(0, 8)}</p>
                      {req.profiles?.display_name && (
                        <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono }}>{req.profiles.display_name}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => approveRequest(req)}
                        disabled={loading === req.id}
                        style={{ fontSize: "9px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 12px", border: "0.5px solid #5DCAA5", color: "#5DCAA5", backgroundColor: "transparent", cursor: "pointer" }}
                      >
                        {loading === req.id ? "..." : "aprobar"}
                      </button>
                      <button
                        onClick={() => rejectRequest(req)}
                        disabled={loading === req.id}
                        style={{ fontSize: "9px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 12px", border: "0.5px solid #2a2a28", color: "#5F5E5A", backgroundColor: "transparent", cursor: "pointer" }}
                      >
                        rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Members */}
        <section style={{ marginBottom: "40px" }}>
          <span style={sectionLabel}>miembros ({members.length})</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", backgroundColor: "#2a2a28" }}>
            {members.map((mem) => (
              <div key={mem.id} style={{ backgroundColor: "#141412", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <p style={{ fontSize: "12px", color: "#e8e4dc", fontFamily: mono }}>@{mem.profiles?.username ?? mem.user_id.slice(0, 8)}</p>
                  <span style={{ fontSize: "8px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "2px 7px", border: "0.5px solid #2a2a28", color: mem.role === "admin" ? "#D85A30" : "#444441" }}>
                    {mem.role}
                  </span>
                </div>
                {mem.user_id !== currentUserId && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {mem.role !== "admin" && (
                      <button
                        onClick={() => promoteToAdmin(mem)}
                        disabled={loading === mem.id}
                        style={{ fontSize: "9px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 10px", border: "0.5px solid #2a2a28", color: "#888780", backgroundColor: "transparent", cursor: "pointer" }}
                      >
                        {loading === mem.id ? "..." : "admin"}
                      </button>
                    )}
                    <button
                      onClick={() => removeMember(mem)}
                      disabled={loading === mem.id}
                      style={{ fontSize: "9px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 10px", border: "0.5px solid #2a2a28", color: "#5F5E5A", backgroundColor: "transparent", cursor: "pointer" }}
                    >
                      {loading === mem.id ? "..." : "expulsar"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <span style={sectionLabel}>zona peligrosa</span>
          <button
            onClick={deleteColectivo}
            style={{ fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "10px 20px", border: "0.5px solid #D85A30", color: "#D85A30", backgroundColor: "transparent", cursor: "pointer" }}
          >
            eliminar colectivo
          </button>
        </section>
      </div>
    </div>
  );
}
