"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { EditColectivo } from "./EditColectivo";
import { InviteMember } from "./InviteMember";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Member = {
  id: string;
  role: string;
  user_id: string;
  profiles: { username: string; display_name: string | null } | null;
};

type JoinRequest = {
  note: string | null;
  id: string;
  user_id: string;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

type Colectivo = {
  cover_shape?: string;
  cover_image_url: string | null;
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
  const [error, setError] = useState("");
  useEffect(() => { setMembers(initialMembers); }, [initialMembers]);
  useEffect(() => { setRequests(initialRequests); }, [initialRequests]);

  async function approveRequest(req: JoinRequest) {
    await reviewRequest(req, true);
  }

  async function rejectRequest(req: JoinRequest) {
    await reviewRequest(req, false);
  }

  async function reviewRequest(req: JoinRequest, approve: boolean) {
    if (loading) return;
    setLoading(req.id); setError("");
    try {
      const db = getSupabaseClient();
      const result = await db.rpc("review_colectivo_request", { request_id: req.id, approve });
      if (result.error) throw result.error;
      setRequests(prev => prev.filter(item => item.id !== req.id));
      const { data, error: memberError } = await db.from("colectivo_members")
        .select("id, role, user_id, profiles(username, display_name)").eq("colectivo_id", col.id);
      if (!memberError && data) setMembers(data as unknown as Member[]);
      router.refresh();
    } catch {
      setError("no se pudo confirmar la revisión. recarga para comprobar el estado antes de reintentar.");
    } finally { setLoading(null); }
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
    fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em",
    marginBottom: "12px", display: "block",
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 24px 80px" }}>

        <div style={{ marginBottom: "24px" }}>
          <Link href={`/colectivos/${col.slug}`} style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ← {col.name}
          </Link>
        </div>

        <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, marginBottom: "40px" }}>
          ajustes del colectivo
        </h1>

        {col.created_by === currentUserId && <EditColectivo col={col} />}
        <InviteMember colectivoId={col.id} />

        {/* Pending join requests */}
        {error && <p role="alert" className="mb-4">{error}</p>}
        {(
          <section style={{ marginBottom: "40px" }}>
            <span style={sectionLabel}>solicitudes pendientes ({requests.length})</span>
            {requests.length === 0 ? (
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>sin solicitudes</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", backgroundColor: "#2a2a28" }}>
                {requests.map((req) => (
                  <div key={req.id} style={{ backgroundColor: "#141412", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      {req.profiles ? <Link href={`/profile/${req.profiles.username}`} className="underline">@{req.profiles.username}</Link> : <p>usuario no disponible</p>}
                      {req.note && <p className="mt-2 whitespace-pre-wrap break-words">{req.note}</p>}
                      {req.profiles?.display_name && (
                        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>{req.profiles.display_name}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => approveRequest(req)}
                        disabled={loading !== null}
                        style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 12px", border: "0.5px solid var(--magma-orange)", color: "var(--magma-ash)", backgroundColor: "transparent", cursor: "pointer" }}
                      >
                        {loading === req.id ? "..." : "aprobar"}
                      </button>
                      <button
                        onClick={() => rejectRequest(req)}
                        disabled={loading !== null}
                        style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "5px 12px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)", backgroundColor: "transparent", cursor: "pointer" }}
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
                  <p style={{ fontSize: "var(--magma-text-small)", color: "#F2F4F8", fontFamily: mono }}>@{mem.profiles?.username ?? mem.user_id.slice(0, 8)}</p>
                  <span style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "2px 7px", border: "0.5px solid #2a2a28", color: mem.role === "admin" ? "var(--magma-ash)" : "var(--magma-muted)" }}>
                    {mem.role}
                  </span>
                </div>
                {mem.user_id !== currentUserId && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {mem.role !== "admin" && (
                      <button
                        onClick={() => promoteToAdmin(mem)}
                        disabled={loading === mem.id}
                        style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 10px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)", backgroundColor: "transparent", cursor: "pointer" }}
                      >
                        {loading === mem.id ? "..." : "admin"}
                      </button>
                    )}
                    <button
                      onClick={() => removeMember(mem)}
                      disabled={loading === mem.id}
                      style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 10px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)", backgroundColor: "transparent", cursor: "pointer" }}
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
            style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", padding: "10px 20px", border: "0.5px solid #E12120", color: "var(--magma-ash)", backgroundColor: "transparent", cursor: "pointer" }}
          >
            eliminar colectivo
          </button>
        </section>
      </div>
    </div>
  );
}
