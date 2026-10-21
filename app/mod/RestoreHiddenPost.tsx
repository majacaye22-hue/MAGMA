"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function RestoreHiddenPost({ postId, title, status }: { postId: string; title: string | null; status: string }) {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, startTransition] = useTransition();
  async function restore() {
    if (lock.current || restored) return;
    if (!window.confirm(`¿Restaurar «${title || "sin título"}»? Se quitará la ocultación, sin cambiar su audiencia ni su estado de aprobación. Los reportes abiertos seguirán pendientes.`)) return;
    lock.current = true;
    setBusy(true); setError("");
    try {
      const { error } = await getSupabaseClient().rpc("restore_hidden_post", { p_post_id: postId }).abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      setRestored(true);
      window.dispatchEvent(new Event("magma:moderation-changed"));
      startTransition(() => router.refresh());
    } catch {
      setError("No se confirmó la restauración. Actualiza la lista para comprobar el estado antes de reintentar.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <div className="mt-4">
    <button onClick={() => void restore()} disabled={busy || refreshing || restored} className="border border-[var(--magma-red)] px-4 py-2 text-sm text-white disabled:opacity-50">
      {restored ? "restaurada" : busy || refreshing ? "restaurando…" : "restaurar"}
    </button>
    {status !== "approved" && <p className="mt-2 text-sm">Restaurar no aprueba esta publicación; conserva su estado de revisión.</p>}
    {error && <p role="alert" className="mt-2 text-sm">{error} <button className="underline" onClick={() => startTransition(() => router.refresh())}>actualizar lista</button></p>}
  </div>;
}
