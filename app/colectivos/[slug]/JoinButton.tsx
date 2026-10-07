"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type MemberStatus = "admin" | "member" | "pending" | "none";
export function JoinButton({ colectivoId, colectivoSlug, initialStatus, currentUserId }: {
  colectivoId: string; colectivoSlug: string; initialStatus: MemberStatus; currentUserId: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setStatus(initialStatus); }, [initialStatus]);
  async function act(action: "request" | "cancel" | "leave") {
    if (!currentUserId || loading) return;
    setLoading(true); setError("");
    try {
      const db = getSupabaseClient();
      const result = action === "request"
        ? await db.rpc("request_colectivo_join", { cid: colectivoId, introduction: note.trim() || null })
        : action === "cancel"
          ? await db.rpc("cancel_colectivo_request", { cid: colectivoId })
          : await db.from("colectivo_members").delete().eq("colectivo_id", colectivoId).eq("user_id", currentUserId);
      if (result.error) throw result.error;
      setStatus(action === "request" ? "pending" : "none");
      setComposing(false); setNote(""); router.refresh();
    } catch {
      setError("no se pudo confirmar el cambio. recarga para comprobar el estado antes de reintentar.");
    } finally { setLoading(false); }
  }
  if (status === "admin") return null;
  const buttonClass = "border border-[var(--magma-red)] px-4 py-2 text-xs text-[var(--magma-ash)] disabled:opacity-50";
  return <div className="max-w-sm text-xs">
    {status === "member" ? <button className={buttonClass} disabled={loading} onClick={() => void act("leave")}>{loading ? "guardando…" : "miembro · salir"}</button>
      : status === "pending" ? <div><p role="status">solicitud pendiente · un admin debe aprobarla</p><button className="mt-2 underline" disabled={loading} onClick={() => void act("cancel")}>{loading ? "cancelando…" : "cancelar solicitud"}</button></div>
      : composing ? <form onSubmit={(event) => { event.preventDefault(); void act("request"); }} className="space-y-3">
        <label className="block">preséntate · opcional
          <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={3} className="mt-2 block w-full border border-[var(--magma-border)] bg-transparent p-3" placeholder="¿por qué te gustaría formar parte?" />
        </label>
        <p className="text-[var(--magma-muted)]">solo los admins del colectivo verán tu nota.</p>
        <button className={buttonClass} disabled={loading} type="submit">{loading ? "enviando…" : "enviar solicitud"}</button>
        <button type="button" disabled={loading} className="ml-3 underline" onClick={() => setComposing(false)}>cancelar</button>
      </form> : <button className={buttonClass} onClick={() => {
        if (!currentUserId) router.push(`/auth/login?redirectTo=/colectivos/${colectivoSlug}`);
        else setComposing(true);
      }}>solicitar unirme</button>}
    {error && <p role="alert" className="mt-3">{error}</p>}
  </div>;
}
