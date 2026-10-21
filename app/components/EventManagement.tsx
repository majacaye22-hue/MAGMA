"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { EVENT_STATUSES, type EventStatus } from "@/lib/event-management";

type EntityKind = "profile" | "colectivo" | "project";
type Entity = { id: string; label: string; href: string };
type Credit = { id: string; role: "organizer" | "participant"; profile_id: string | null;
  profile: { username: string } | null; colectivo: { name: string; slug: string; created_by: string } | null;
  project: { id: string; title: string; author_id: string } | null };
const button = "min-h-11 border border-current/30 px-3 py-2 text-sm disabled:opacity-40";
const field = "min-h-11 w-full border border-current/30 bg-[var(--magma-obsidian)] px-3 text-sm";

export function EventManagement({ eventId, userId, ownerId, status, version }: { eventId: string; userId: string; ownerId: string | null; status: EventStatus; version: number }) {
  const router = useRouter();
  const owner = userId === ownerId;
  const [rows, setRows] = useState<Credit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<EntityKind>("profile");
  const [role, setRole] = useState<Credit["role"]>("participant");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entity[]>([]);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [searching, setSearching] = useState(false);
  const [nextStatus, setNextStatus] = useState<EventStatus>(status);
  const [note, setNote] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await getSupabaseClient().from("event_people")
      .select("id,role,profile_id,profile:profiles!profile_id(username),colectivo:colectivos!colectivo_id(name,slug,created_by),project:projects!project_id(id,title,author_id)")
      .eq("event_id", eventId).order("id");
    if (error) throw new Error("no se pudieron cargar las personas del evento");
    setRows((data ?? []) as unknown as Credit[]); setLoaded(true);
  }, [eventId]);
  useEffect(() => { void load().catch(e => setError(e.message)); }, [load]);
  useEffect(() => {
    let cancelled = false;
    setResults([]);
    if (!owner || query.trim().length < 2 || selected) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const db = getSupabaseClient();
        const term = `%${query.trim().replace(/^@/, "").replace(/[\\%_]/g, "\\$&")}%`;
        const request = kind === "profile" ? db.from("profiles").select("id,username").ilike("username", term)
          : kind === "colectivo" ? db.from("colectivos").select("id,name,slug").eq("is_private", false).ilike("name", term)
          : db.from("projects").select("id,title").ilike("title", term);
        const { data, error } = await request.limit(8).abortSignal(AbortSignal.timeout(10000));
        if (error) throw new Error("no se pudo buscar; vuelve a escribir para reintentar");
        if (!cancelled) setResults((data ?? []).map((raw: unknown) => {
          const row = raw as unknown as { id: string; username: string; name: string; slug: string; title: string };
          return { id: row.id, label: kind === "profile" ? `@${row.username}` : kind === "colectivo" ? row.name : row.title,
            href: kind === "profile" ? `/profile/${encodeURIComponent(row.username)}` : kind === "colectivo" ? `/colectivos/${encodeURIComponent(row.slug)}` : `/proyecto/${row.id}` };
        }));
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "no se pudo buscar"); }
      finally { if (!cancelled) setSearching(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [kind, query, selected, owner]);
  async function mutate(action: () => PromiseLike<{ error: unknown }>, success: string) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error } = await action();
      if (error) throw error;
      setSelected(null); setQuery(""); setMessage(success);
      await load(); router.refresh();
    } catch (e) { setError(e && typeof e === "object" && "message" in e ? String(e.message) : "no se pudo guardar; recarga y reintenta"); }
    finally { setBusy(false); }
  }
  return <section className="my-6 space-y-5 border-y border-current/20 py-5" aria-label="organización y participantes">
    <p className="text-xs opacity-70">vínculos añadidos por quien publicó el evento; no implican una confirmación de las personas o grupos vinculados.</p>
    {!loaded && !error && <p role="status">cargando participantes…</p>}
    {(["organizer", "participant"] as const).map(r => <div key={r}>
      <h2 className="mb-2 font-semibold">{r === "organizer" ? "organiza" : "participan"}</h2>
      {loaded && !rows.some(row => row.role === r) && <p className="text-sm opacity-70">por anunciar</p>}
      <ul className="flex flex-wrap gap-3">{rows.filter(row => row.role === r).map(row => {
        const href = row.profile ? `/profile/${encodeURIComponent(row.profile.username)}` : row.colectivo ? `/colectivos/${encodeURIComponent(row.colectivo.slug)}` : row.project ? `/proyecto/${row.project.id}` : null;
        if (!href) return null;
        const removable = owner || row.profile_id === userId || row.colectivo?.created_by === userId || row.project?.author_id === userId;
        return <li key={row.id} className="flex items-center gap-2"><Link className="underline" href={href}>{row.profile ? `@${row.profile.username}` : row.colectivo?.name ?? row.project?.title}</Link>
          {removable && <button type="button" disabled={busy} className={button} onClick={() => { if (window.confirm("¿quitar este vínculo del evento?")) void mutate(() => getSupabaseClient().from("event_people").delete().eq("id", row.id), "vínculo retirado"); }}>quitar</button>}</li>;
      })}</ul>
    </div>)}
    {owner && <details><summary className="min-h-11 cursor-pointer">gestionar evento</summary>
      <div className="space-y-4 pt-3">
        <p className="text-sm">vínculos informativos publicados por quien organiza; no son créditos de autoría, confirmaciones ni permisos de edición. los colectivos deben estar listados públicamente.</p>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
          <label>rol<select className={field} value={role} onChange={e => setRole(e.target.value as Credit["role"])}><option value="organizer">organiza</option><option value="participant">participa</option></select></label>
          <label>tipo<select className={field} value={kind} onChange={e => { setKind(e.target.value as EntityKind); setSelected(null); setQuery(""); }}><option value="profile">persona</option><option value="colectivo">colectivo</option><option value="project">proyecto</option></select></label>
          <label className="sm:col-span-2">buscar {kind === "profile" ? "por usuario" : "por nombre"}<input className={field} value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }} /></label>
          {searching && <p role="status">buscando…</p>}
          <ul className="sm:col-span-2">{results.map(result => <li key={result.id}><button type="button" className={button} onClick={() => { setSelected(result); setResults([]); setQuery(result.label); }}>{result.label}</button></li>)}</ul>
          {!searching && query.trim().length >= 2 && !selected && !results.length && <p className="text-sm">sin resultados disponibles</p>}
          <button type="button" className={button} disabled={!selected} onClick={() => selected && void mutate(() => getSupabaseClient().from("event_people").insert({ event_id: eventId, role, [`${kind}_id`]: selected.id }), "vínculo añadido")}>añadir vínculo</button>
        </fieldset>
        <fieldset disabled={busy} className="space-y-3 border-t border-current/20 pt-4">
          <legend>estado del evento</legend>
          <p className="text-sm">actual: {EVENT_STATUSES[status]}. al cancelar o posponer se avisará dentro de Magma a asistentes e invitados con acceso. no se procesan reembolsos.</p>
          <label>nuevo estado<select className={field} value={nextStatus} onChange={e => setNextStatus(e.target.value as EventStatus)}>{Object.entries(EVENT_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>explicación<textarea className={field} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
          <p className="text-xs">para reprogramar, cambia primero las fechas en “editar publicación” y luego vuelve a “programado”.</p>
          <button type="button" className={button} disabled={nextStatus === status || (nextStatus !== "scheduled" && !note.trim())} onClick={() => {
            if (window.confirm(`¿marcar como ${EVENT_STATUSES[nextStatus]} y notificar a las personas afectadas?`)) void mutate(() => getSupabaseClient().rpc("change_event_status", { eid: eventId, next_status: nextStatus, explanation: note, expected_version: version }), "estado guardado; avisos creados para las personas con acceso");
          }}>guardar estado y notificar</button>
        </fieldset>
      </div>
    </details>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error} <button type="button" className={button} onClick={() => { setError(""); void load().catch(e => setError(e.message)); }}>recargar</button></p>}
  </section>;
}
