"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const db = getSupabaseClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        router.push(`/auth/login?redirectTo=${encodeURIComponent(`/colectivos/invitacion/${id}`)}`);
        return;
      }
      const result = await db.rpc("accept_colectivo_invitation", { invitation_id: id });
      if (result.error || typeof result.data !== "string") throw result.error;
      router.push(`/colectivos/${encodeURIComponent(result.data)}`);
      router.refresh();
    } catch { setError("no se pudo aceptar. usa la cuenta invitada; el enlace puede haber vencido, sido revocado o ya utilizado."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl space-y-6 px-6 py-16">
    <h1 className="magma-page-title font-bold">invitación a un colectivo</h1>
    <p>entra con la cuenta a la que se envió este enlace. al aceptar te unirás al colectivo sin una solicitud de aprobación.</p>
    <button data-magma-glow="true" disabled={busy} onClick={accept} className="px-5 py-3 disabled:opacity-50">{busy ? "aceptando..." : "aceptar invitación"}</button>
    {error && <p role="alert">{error}</p>}
    <Link href="/colectivos" className="block underline">volver a colectivos</Link>
  </main>;
}
