"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

interface Collection {
  id: string;
  name: string;
  has_post: boolean;
}

export function BookmarkButton({
  postId,
  currentUserId,
  size = 14,
}: {
  postId: string;
  currentUserId: string | null;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open, collections.length]);

  async function loadCollections() {
    if (!currentUserId) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data: cols } = await supabase
      .from("collections")
      .select("id, name")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (!cols) { setLoading(false); return; }

    const colIds = cols.map((c: { id: string }) => c.id);
    const { data: saved } = colIds.length > 0
      ? await supabase.from("collection_posts").select("collection_id").eq("post_id", postId).in("collection_id", colIds)
      : { data: [] };

    const savedIds = new Set((saved ?? []).map((s: { collection_id: string }) => s.collection_id));
    const mapped = cols.map((c: { id: string; name: string }) => ({ ...c, has_post: savedIds.has(c.id) }));
    setCollections(mapped);
    setIsSaved(savedIds.size > 0);
    setLoading(false);
  }

  async function toggleCollection(col: Collection) {
    const supabase = getSupabaseClient();
    if (col.has_post) {
      await supabase.from("collection_posts").delete().eq("collection_id", col.id).eq("post_id", postId);
    } else {
      await supabase.from("collection_posts").insert({ collection_id: col.id, post_id: postId });
    }
    setCollections((prev) =>
      prev.map((c) => c.id === col.id ? { ...c, has_post: !c.has_post } : c)
    );
    setIsSaved((collections.map((c) => c.id === col.id ? !c.has_post : c.has_post)).some(Boolean));
  }

  async function createCollection() {
    const name = newName.trim();
    if (!name || !currentUserId || creating) return;
    setCreating(true);
    const supabase = getSupabaseClient();
    const { data: col } = await supabase
      .from("collections")
      .insert({ user_id: currentUserId, name })
      .select("id, name")
      .single();
    if (col) {
      await supabase.from("collection_posts").insert({ collection_id: col.id, post_id: postId });
      setCollections((prev) => [{ id: col.id, name: col.name, has_post: true }, ...prev]);
      setIsSaved(true);
    }
    setNewName("");
    setCreating(false);
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUserId) return;
    const next = !open;
    setOpen(next);
    if (next) loadCollections();
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={handleOpen}
        title={currentUserId ? "guardar en colección" : "entra para guardar"}
        style={{
          background: "none",
          border: "none",
          padding: "4px",
          cursor: currentUserId ? "pointer" : "default",
          color: isSaved ? "#5DCAA5" : "#5F5E5A",
          lineHeight: 0,
          opacity: currentUserId ? 1 : 0.35,
        }}
        className="hover:opacity-70 transition-opacity"
      >
        <svg width={size} height={size} viewBox="0 0 14 14" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="square">
          <path d="M2 2h10v11l-5-3-5 3V2z" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 60,
            backgroundColor: "#141412",
            border: "0.5px solid #2a2a28",
            width: "220px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "8px 12px", borderBottom: "0.5px solid #2a2a28" }}>
            <span style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              guardar en colección
            </span>
          </div>

          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {loading ? (
              <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, padding: "12px" }}>cargando...</p>
            ) : collections.length === 0 ? (
              <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, padding: "12px" }}>sin colecciones todavía</p>
            ) : (
              collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => toggleCollection(col)}
                  className="flex items-center gap-2.5 w-full text-left cursor-pointer hover:bg-[#1e1e1c] transition-colors"
                  style={{ padding: "8px 12px", background: "none", border: "none", borderBottom: "0.5px solid #1e1e1c" }}
                >
                  <div style={{
                    width: "12px", height: "12px", flexShrink: 0,
                    border: `0.5px solid ${col.has_post ? "#5DCAA5" : "#2a2a28"}`,
                    backgroundColor: col.has_post ? "rgba(93,202,165,0.15)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {col.has_post && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-3" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="square" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: "11px", color: col.has_post ? "#e8e4dc" : "#888780", fontFamily: mono }}>
                    {col.name}
                  </span>
                </button>
              ))
            )}
          </div>

          <div style={{ padding: "8px 12px", borderTop: "0.5px solid #2a2a28", display: "flex", gap: "6px", alignItems: "center" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="+ nueva colección"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createCollection(); e.stopPropagation(); }}
              style={{
                flex: 1, backgroundColor: "transparent", border: "none", outline: "none",
                color: "#e8e4dc", fontFamily: mono, fontSize: "11px",
              }}
            />
            {newName.trim() && (
              <button
                onClick={createCollection}
                disabled={creating}
                style={{ fontSize: "9px", color: "#5DCAA5", fontFamily: mono, textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
              >
                {creating ? "..." : "crear"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
