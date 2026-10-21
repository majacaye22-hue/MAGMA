"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Member = { id: string; username: string; display_name: string | null };
type Activity = { id: string; actor_id: string | null; target_id: string; action: string; created_at: string };
const button = "min-h-11 border border-[var(--magma-red)] px-4 disabled:opacity-40";
const labels: Record<string, string> = { moderator_added: "acceso concedido", moderator_removed: "acceso retirado", post_hide: "publicación oculta", post_restore: "publicación restaurada", post_delete: "publicación eliminada", post_resolve: "reporte cerrado", comment_hide: "comentario oculto", comment_restore: "comentario restaurado", comment_delete: "comentario eliminado", comment_resolve: "reporte cerrado" };

export default function TeamManager({ ownerId }: { ownerId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const db = getSupabaseClient();
      const [team, log] = await Promise.all([
        db.from("profiles").select("id, username, display_name").eq("is_moderator", true).order("username").abortSignal(AbortSignal.timeout(10000)),
        db.from("staff_activity").select("id, actor_id, target_id, action, created_at").order("created_at", { ascending: false }).limit(30).abortSignal(AbortSignal.timeout(10000)),
      ]);
      if (team.error || log.error) throw new Error("load failed");
      setMembers(team.data ?? []);
      setActivity(log.data ?? []);
      const ids = [...new Set((log.data ?? []).flatMap((a: Activity) => [a.actor_id, a.target_id]).filter(Boolean))];
      if (ids.length) {
        const profiles = await db.from("profiles").select("id, username").in("id", ids).abortSignal(AbortSignal.timeout(10000));
        setNames(Object.fromEntries((profiles.data ?? []).map((p: { id: string; username: string }) => [p.id, p.username])));
      }
      setReady(true);
    } catch {
      setReady(false);
      setError("No se pudo cargar el equipo. Reintenta; si es la primera vez, falta activar la migración moderator_team.sql.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function change(name: string, enabled: boolean) {
    if (lock.current || !ready) return;
    if (!window.confirm(enabled
      ? `¿Dar acceso de moderación a @${name}? Podrá revisar publicaciones y reportes, ocultar y eliminar contenido.`
      : `¿Retirar el acceso de moderación a @${name}?`)) return;
    lock.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error } = await getSupabaseClient().rpc("set_moderator", { p_username: name, p_enabled: enabled }).abortSignal(AbortSignal.timeout(10000));
      if (error) {
        setError(error.code === "P0002" ? "No encontramos ese usuario. Tu amistad necesita crear su cuenta primero." : "No se confirmó el cambio. Actualiza el equipo antes de intentarlo otra vez.");
        return;
      }
      setNotice(enabled ? `@${name} ya puede entrar a /mod con su cuenta.` : `Se retiró el acceso de @${name}.`);
      setUsername("");
      await load();
    } catch { setError("No se confirmó el cambio. Actualiza el equipo para revisar su estado."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="flex flex-col gap-8">
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void change(username.trim().replace(/^@/, ""), true); }}>
      <label className="flex flex-col gap-2">agregar por usuario
        <input required value={username} onChange={e => setUsername(e.target.value)} placeholder="@usuario" maxLength={100} className="min-h-11 border border-white/30 bg-transparent px-3" />
      </label>
      <button className={button} disabled={busy || loading || !ready || !username.trim().replace(/^@/, "")}>dar acceso</button>
      <button type="button" className={button} disabled={busy || loading} onClick={() => void load()}>actualizar</button>
    </form>
    <section><h2 className="mb-4 text-xl">equipo actual</h2>
      {loading ? <p role="status">cargando equipo…</p> : ready && members.length === 0 ? <p>todavía no hay moderadorxs</p> : null}
      <ul className="flex flex-col gap-3">{members.map(m => <li key={m.id} className="flex items-center justify-between gap-4 border border-white/20 p-4">
        <span>@{m.username}{m.id === ownerId ? " · titular" : " · moderación"}</span>
        {m.id !== ownerId && <button className={button} disabled={busy || loading || !ready} onClick={() => void change(m.username, false)}>retirar acceso</button>}
      </li>)}</ul>
    </section>
    <section><h2 className="mb-4 text-xl">actividad reciente</h2>
      <p className="mb-4 text-sm">Cambios de acceso y decisiones sobre reportes. Las aprobaciones y rechazos se conservan en el historial de cada publicación.</p>
      <ul className="flex flex-col gap-4">{activity.map(a => <li key={a.id} className="text-sm">
        {labels[a.action] ?? a.action} · {a.actor_id && names[a.actor_id] ? `@${names[a.actor_id]}` : "cuenta eliminada"} → {names[a.target_id] ? `@${names[a.target_id]}` : a.target_id}
        <span className="block mt-1">{new Date(a.created_at).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}</span>
      </li>)}</ul>
      {ready && !activity.length && <p>sin actividad registrada todavía</p>}
    </section>
  </div>;
}
