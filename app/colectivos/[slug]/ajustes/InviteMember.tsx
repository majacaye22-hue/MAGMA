"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Invitation = { id: string; expires_at: string; profiles: { username: string } | null };

export function InviteMember({ colectivoId }: { colectivoId: string }) {
  const [username, setUsername] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");

  async function reload() {
    const { data, error } = await getSupabaseClient().from("colectivo_invitations")
      .select("id, expires_at, profiles!colectivo_invitations_recipient_id_fkey(username)")
      .eq("colectivo_id", colectivoId).is("accepted_at", null).is("revoked_at", null)
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
    if (error) throw error;
    setInvitations((data ?? []) as unknown as Invitation[]);
  }
  useEffect(() => {
    void reload().catch(() => setMessage("no se pudieron cargar las invitaciones. intenta recargar."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colectivoId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(""); setLink("");
    try {
      const { data, error } = await getSupabaseClient().rpc("invite_colectivo_member", { cid: colectivoId, username_input: username });
      if (error) throw error;
      setLink(`${window.location.origin}/colectivos/invitacion/${data}`);
      setMessage("enlace creado. cópialo y envíalo a la persona invitada.");
      await reload();
    } catch { setMessage("no se pudo crear o actualizar la invitación. comprueba el @usuario, que no sea miembro, y recarga antes de reintentar."); }
    finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true); setMessage("");
    try {
      const { error } = await getSupabaseClient().rpc("revoke_colectivo_invitation", { invitation_id: id });
      if (error) throw error;
      setLink(""); await reload(); setMessage("invitación revocada.");
    } catch { setMessage("no se pudo confirmar la revocación. recarga para comprobar el estado."); }
    finally { setBusy(false); }
  }

  async function copy(id: string) {
    const url = `${window.location.origin}/colectivos/invitacion/${id}`;
    setLink(url);
    try { await navigator.clipboard.writeText(url); setMessage("enlace copiado."); }
    catch { setMessage("copia el enlace del campo de abajo."); }
  }

  return <section className="mb-10 space-y-3">
    <h2 className="font-bold">invitar por @usuario</h2>
    <p>solo esa cuenta puede aceptar. el enlace vence en 7 días y permite unirse sin aprobación adicional.</p>
    <form onSubmit={create} className="flex flex-wrap gap-3">
      <label className="flex-1">usuario
        <input required maxLength={100} value={username} onChange={e => setUsername(e.target.value)} placeholder="@usuario" className="block w-full border border-border bg-transparent p-2" />
      </label>
      <button disabled={busy || !username.trim()} data-magma-glow="true" className="self-end px-4 py-2 disabled:opacity-50">{busy ? "..." : "crear invitación"}</button>
    </form>
    <p>crear otra invitación para la misma persona invalida su enlace anterior.</p>
    {message && <p role="status">{message}</p>}
    {link && <label className="block">enlace para enviar<input readOnly value={link} onFocus={e => e.target.select()} className="mt-2 w-full border border-border bg-transparent p-2" /></label>}
    <ul className="space-y-3">{invitations.map(invitation => <li key={invitation.id} className="flex flex-wrap items-center gap-3 border-b border-border py-3">
      <span className="flex-1">@{invitation.profiles?.username ?? "usuario"}</span>
      <button disabled={busy} onClick={() => copy(invitation.id)} className="underline">copiar enlace</button>
      <button disabled={busy} onClick={() => revoke(invitation.id)} className="underline">revocar</button>
    </li>)}</ul>
  </section>;
}
