"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export function EchoButton({ postId, userId, onRemoved }: { postId: string; userId: string; onRemoved?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); }, [open]);
  async function show() {
    setOpen(true); setBusy(true); setError(""); setLoadFailed(false);
    try {
      const { data, error } = await getSupabaseClient().from("post_echoes").select("note").eq("user_id",userId).eq("post_id",postId).maybeSingle();
      if (error) throw error;
      setExisting(!!data); setNote(data?.note ?? "");
    } catch { setLoadFailed(true); setError("no se pudo cargar tu eco. cierra e intenta de nuevo."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (busy || loadFailed) return;
    setBusy(true); setError("");
    try {
      const db = getSupabaseClient();
      const result = existing
        ? await db.from("post_echoes").delete().eq("user_id",userId).eq("post_id",postId)
        : await db.from("post_echoes").insert({user_id:userId,post_id:postId,note:note.trim()});
      if (result.error) throw result.error;
      setOpen(false); if (existing) onRemoved?.(); router.refresh();
    } catch { setError("no se pudo guardar el cambio. tu nota sigue aquí."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" aria-label="hacer eco" title="hacer eco" onClick={show} style={{ background:"none",border:0,color:"var(--magma-muted)",padding:8,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 12C9 8 7.5 7 5.5 7a5 5 0 0 0 0 10c2 0 3.5-1 6.5-5s4.5-5 6.5-5a5 5 0 0 1 0 10c-2 0-3.5-1-6.5-5Z" transform="translate(1.2 1.2) scale(.9)" />
      </svg>
    </button>
    {open && createPortal(<dialog ref={dialog} aria-label="hacer eco" onCancel={e=>{e.preventDefault();if(!busy)setOpen(false);}} className="m-auto w-[calc(100%-40px)] max-w-md border border-white/20 bg-[#0c0c0b] p-6 text-white backdrop:bg-black/80" onClick={e=>e.stopPropagation()}>
        <h2 className="text-2xl">{existing ? "tu eco" : "hacer eco"}</h2>
        <p className="my-4 text-sm text-[var(--magma-muted)]">en tu perfil, separado de tus obras. el crédito y la conversación se quedan con la publicación original.</p>
        <label className="text-sm" htmlFor={`echo-${postId}`}>lo que te movió · opcional</label>
        <textarea autoFocus id={`echo-${postId}`} value={note} maxLength={1000} disabled={busy || existing} onChange={e=>setNote(e.target.value)} rows={4} className="mt-2 w-full border border-white/20 bg-transparent p-3 focus:outline-[var(--magma-red)]" />
        {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
        <div className="mt-5 flex justify-between gap-4">
          <button type="button" disabled={busy} onClick={()=>setOpen(false)}>cerrar</button>
          <button type="button" disabled={busy||loadFailed} onClick={save} className="text-[var(--magma-red)] disabled:opacity-40">{busy ? "un momento…" : existing ? "quitar eco" : "guardar eco →"}</button>
        </div>
    </dialog>, document.body)}
  </>;
}
