"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

type Colectivo = { id: string; name: string; avatar_color: string; already_shared: boolean };

export function ShareToColectivoButton({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [colectivos, setColectivos] = useState<Colectivo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Eagerly check membership count on mount so we can hide button if 0
  const [hasMembership, setHasMembership] = useState<boolean | null>(null);

  useEffect(() => {
    if (!currentUserId) { setHasMembership(false); return; }
    const supabase = getSupabaseClient();
    supabase
      .from("colectivo_members")
      .select("colectivo_id", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .then(({ count, error }) => {
        console.log("[ShareToColectivo] userId:", currentUserId, "count:", count, "error:", error);
        if (error) { setHasMembership(false); return; }
        setHasMembership((count ?? 0) > 0);
      });
  }, [currentUserId]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function loadColectivos() {
    if (!currentUserId || loaded) return;
    setLoading(true);
    const supabase = getSupabaseClient();

    const { data: memberships, error } = await supabase
      .from("colectivo_members")
      .select("colectivo_id, colectivos(id, name, avatar_color)")
      .eq("user_id", currentUserId);

    if (error || !memberships) { setLoading(false); return; }

    const cols = memberships
      .map((m: { colectivo_id: string; colectivos: { id: string; name: string; avatar_color: string } | null }) => m.colectivos)
      .filter(Boolean) as { id: string; name: string; avatar_color: string }[];

    if (cols.length === 0) { setColectivos([]); setLoaded(true); setLoading(false); return; }

    const colIds = cols.map((c) => c.id);
    const { data: shared } = await supabase
      .from("colectivo_posts")
      .select("colectivo_id")
      .eq("post_id", postId)
      .in("colectivo_id", colIds);

    const sharedSet = new Set((shared ?? []).map((s: { colectivo_id: string }) => s.colectivo_id));
    setColectivos(cols.map((c) => ({ ...c, already_shared: sharedSet.has(c.id) })));
    setLoaded(true);
    setLoading(false);
  }

  async function toggleShare(col: Colectivo) {
    if (!currentUserId) return;
    const supabase = getSupabaseClient();
    if (col.already_shared) {
      await supabase.from("colectivo_posts").delete().eq("colectivo_id", col.id).eq("post_id", postId);
    } else {
      await supabase.from("colectivo_posts").insert({ colectivo_id: col.id, post_id: postId, added_by: currentUserId });
    }
    setColectivos((prev) => prev.map((c) => c.id === col.id ? { ...c, already_shared: !c.already_shared } : c));
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const next = !open;
    setOpen(next);
    if (next) loadColectivos();
  }

  // Hide if not logged in or confirmed no memberships
  if (!currentUserId || hasMembership === false) return null;

  const anyShared = colectivos.some((c) => c.already_shared);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", marginBottom: "16px" }}>
      <button
        onClick={handleOpen}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "10px",
          fontFamily: mono,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          padding: "6px 12px",
          border: `0.5px solid ${anyShared ? "#5DCAA5" : "#2a2a28"}`,
          color: anyShared ? "#5DCAA5" : "#888780",
          backgroundColor: "transparent",
          cursor: "pointer",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square">
          <circle cx="8" cy="2" r="1.2" />
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="2" cy="5" r="1.2" />
          <line x1="2.9" y1="4.5" x2="7.1" y2="2.5" />
          <line x1="2.9" y1="5.5" x2="7.1" y2="7.5" />
        </svg>
        compartir en colectivo
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 60,
            backgroundColor: "#141412",
            border: "0.5px solid #2a2a28",
            width: "240px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "8px 12px", borderBottom: "0.5px solid #2a2a28" }}>
            <span style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              compartir en colectivo
            </span>
          </div>

          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {loading ? (
              <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, padding: "12px" }}>cargando...</p>
            ) : colectivos.length === 0 ? (
              <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, padding: "12px" }}>sin colectivos</p>
            ) : (
              colectivos.map((col) => (
                <button
                  key={col.id}
                  onClick={() => toggleShare(col)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    width: "100%", textAlign: "left", cursor: "pointer",
                    padding: "8px 12px", background: "none", border: "none",
                    borderBottom: "0.5px solid #1e1e1c",
                  }}
                  className="hover:bg-[#1e1e1c] transition-colors"
                >
                  <div style={{
                    width: "12px", height: "12px", flexShrink: 0,
                    border: `0.5px solid ${col.already_shared ? "#5DCAA5" : "#2a2a28"}`,
                    backgroundColor: col.already_shared ? "rgba(93,202,165,0.15)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {col.already_shared && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-3" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="square" />
                      </svg>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "1px", backgroundColor: col.avatar_color, flexShrink: 0 }} />
                    <span style={{ fontSize: "11px", color: col.already_shared ? "#e8e4dc" : "#888780", fontFamily: mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {col.name}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
