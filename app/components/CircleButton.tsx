"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export function CircleButton({ memberId, userId, initiallyAdded, accent = false }: { memberId: string; userId: string | null; initiallyAdded?: boolean; accent?: boolean }) {
  const db = getSupabaseClient();
  const router = useRouter();
  const [added, setAdded] = useState(initiallyAdded ?? false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(initiallyAdded !== undefined);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (!userId || memberId === userId) return;
    void db.from("profile_circle").select("member_id").eq("owner_id", userId).eq("member_id", memberId).maybeSingle()
      .then(({ data, error: loadError }: { data: { member_id: string } | null; error: unknown }) => {
        if (!active) return;
        setError(!!loadError); setReady(!loadError); setAdded(!!data);
      });
    return () => { active = false; };
  }, [db, memberId, userId]);
  if (!userId || userId === memberId) return null;
  async function toggle() {
    if (busy || !ready) return;
    setBusy(true); setError(false);
    try {
      const result = added
        ? await db.from("profile_circle").delete().eq("owner_id", userId).eq("member_id", memberId)
        : await db.from("profile_circle").upsert({ owner_id: userId, member_id: memberId }, { onConflict: "owner_id,member_id", ignoreDuplicates: true });
      if (result.error) throw result.error;
      setAdded(!added); router.refresh();
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <div>
    <button type="button" onClick={() => void toggle()} disabled={busy || !ready} aria-pressed={added}
      className={`px-4 py-3 border text-xs text-white disabled:opacity-40 ${accent ? "border-[var(--magma-red)] hover:bg-[var(--magma-red)]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--magma-red)]" : "border-white/30 hover:border-white"}`}>
      {busy ? "guardando…" : added ? "quitar de mi círculo −" : "añadir a mi círculo +"}
    </button>
    <p className="mt-2 text-xs text-white/50">privado · sin notificaciones</p>
    {error && <p role="alert" className="mt-2 text-xs text-[var(--magma-ash)]">no se pudo actualizar tu círculo. <button onClick={() => window.location.reload()} className="underline">reintentar</button></p>}
  </div>;
}
