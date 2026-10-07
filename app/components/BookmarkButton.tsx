"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open, collections.length]);

  useEffect(() => {
    if (!open) return;
    const closeMenu = () => setOpen(false);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [open]);

  async function loadCollections() {
    if (!currentUserId) return;
    setLoading(true);
    try {
    const supabase = getSupabaseClient();
    setError(null);
    const { data: cols, error: loadError } = await supabase
      .from("collections")
      .select("id, name")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (loadError || !cols) { setError("no se pudieron cargar tus colecciones; vuelve a abrir este menú"); setLoading(false); return; }

    const colIds = cols.map((c: { id: string }) => c.id);
    const { data: saved, error: savedError } = colIds.length > 0
      ? await supabase.from("collection_posts").select("collection_id").eq("post_id", postId).in("collection_id", colIds)
      : { data: [], error: null };
    if (savedError) { setError("no se pudieron consultar tus guardados"); setLoading(false); return; }

    const savedIds = new Set((saved ?? []).map((s: { collection_id: string }) => s.collection_id));
    const mapped = cols.map((c: { id: string; name: string }) => ({ ...c, has_post: savedIds.has(c.id) }));
    setCollections(mapped);
    setIsSaved(savedIds.size > 0);
    } catch { setError("no se pudieron cargar tus colecciones; revisa tu conexión"); }
    finally { setLoading(false); }
  }

  async function toggleCollection(col: Collection) {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError(null);
    try {
    const supabase = getSupabaseClient();
    const { error: saveError } = col.has_post
      ? await supabase.from("collection_posts").delete().eq("collection_id", col.id).eq("post_id", postId)
      : await supabase.from("collection_posts").insert({ collection_id: col.id, post_id: postId });
    if (saveError) throw saveError;
    await loadCollections();
    } catch {
      setError("no se pudo actualizar el guardado; intenta de nuevo");
    } finally { saveLock.current = false; setSaving(false); }
  }

  async function createCollection() {
    const name = newName.trim();
    if (!name || !currentUserId || saveLock.current) return;
    saveLock.current = true;
    setCreating(true);
    setError(null);
    try {
    const supabase = getSupabaseClient();
    const { data: col, error: createError } = await supabase
      .from("collections")
      .insert({ user_id: currentUserId, name })
      .select("id, name")
      .single();
    if (createError || !col) throw createError;
    const { error: insertError } = await supabase.from("collection_posts").insert({ collection_id: col.id, post_id: postId });
    await loadCollections();
    setNewName("");
    if (insertError) setError("colección creada, pero no se guardó la publicación; selecciónala para reintentar");
    } catch { setError("no se pudo crear la colección; intenta de nuevo"); }
    finally { saveLock.current = false; setCreating(false); }
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUserId) return;
    const next = !open;
    if (next && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 220;
      setMenuPosition({
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8),
      });
    }
    setOpen(next);
    if (next) loadCollections();
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={buttonRef}
        data-saved={isSaved}
        onClick={handleOpen}
        title={currentUserId ? "guardar en colección" : "entra para guardar"}
        style={{
          background: "none",
          border: "none",
          padding: "4px",
          cursor: currentUserId ? "pointer" : "default",
          color: isSaved ? "var(--magma-ash)" : "var(--magma-muted)",
          lineHeight: 0,
          opacity: currentUserId ? 1 : 0.35,
        }}
        className="hover:opacity-70 transition-opacity"
      >
        <svg width={size} height={size} viewBox="0 0 14 14" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="square">
          <path d="M2 2h10v11l-5-3-5 3V2z" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            zIndex: 1000,
            backgroundColor: "#141412",
            border: "0.5px solid #2a2a28",
            width: "220px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "8px 12px", borderBottom: "0.5px solid #2a2a28" }}>
            <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              guardar en colección
            </span>
          </div>

          {error && <p role="alert" style={{ padding: "12px", color: "var(--magma-ash)" }}>{error}</p>}
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {loading ? (
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, padding: "12px" }}>cargando...</p>
            ) : collections.length === 0 ? (
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, padding: "12px" }}>sin colecciones todavía</p>
            ) : (
              collections.map((col) => (
                <button
                  key={col.id}
                  disabled={saving || creating || loading}
                  onClick={() => toggleCollection(col)}
                  className="flex items-center gap-2.5 w-full text-left cursor-pointer hover:bg-[#1e1e1c] transition-colors"
                  style={{ padding: "8px 12px", background: "none", border: "none", borderBottom: "0.5px solid #1e1e1c" }}
                >
                  <div style={{
                    width: "12px", height: "12px", flexShrink: 0,
                    border: `0.5px solid ${col.has_post ? "var(--magma-orange)" : "#2a2a28"}`,
                    backgroundColor: col.has_post ? "rgba(93,202,165,0.15)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {col.has_post && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-3" stroke="var(--magma-orange)" strokeWidth="1.2" strokeLinecap="square" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: "var(--magma-text-small)", color: col.has_post ? "#F2F4F8" : "var(--magma-muted)", fontFamily: mono }}>
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
                color: "#F2F4F8", fontFamily: mono, fontSize: "var(--magma-text-small)",
              }}
            />
            {newName.trim() && (
              <button
                onClick={createCollection}
                disabled={creating}
                style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
              >
                {creating ? "..." : "crear"}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
