"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { collaborationError, inviteUsernames } from '@/lib/collaborations';
import { EVENT_RESPONSES, type EventResponse } from '@/lib/event-invitations';
import { CollaboratorPicker } from './CollaboratorPicker';
import { PostImage } from './PostImage';
import { EVENT_MANAGEMENT_ENABLED, EVENT_STATUSES, eventUnavailable, type EventManagement } from '@/lib/event-management';

type Invitation = {
  id: string; event_id: string; recipient_id: string; response: EventResponse;
  profiles: { username: string } | null;
  posts: { title: string | null; event_date: string | null; venue: string | null; address: string | null;
    media_url: string | null; media_type: string | null; is_sensitive: boolean; audience_colectivo_id: string | null } & EventManagement | null;
};
const button = 'min-h-11 rounded border border-current/30 px-3 py-2 text-sm disabled:opacity-40';

// No copied event details: the join obeys current post visibility and edits.
export function EventInvitations({ userId, eventId, unavailable = false }: { userId: string; eventId?: string; unavailable?: boolean }) {
  const [rows, setRows] = useState<Invitation[]>([]);
  const [names, setNames] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(Boolean(eventId));
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    let query = getSupabaseClient().from('event_invitations').select(`id,event_id,recipient_id,response,profiles!event_invitations_recipient_id_fkey(username),posts!inner(title,event_date,venue,address,media_url,media_type,is_sensitive,audience_colectivo_id${EVENT_MANAGEMENT_ENABLED ? ',event_status,event_status_note' : ''})`);
    query = eventId ? query.eq('event_id', eventId) : query.eq('recipient_id', userId);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100).abortSignal(AbortSignal.timeout(10000));
    if (request !== generation.current) return;
    if (error) throw error;
    setRows((data ?? []) as unknown as Invitation[]); setLoaded(true);
  }, [eventId, userId]);
  useEffect(() => {
    let active = true;
    const requestGeneration = generation;
    const refresh = () => {
      if (document.hidden) return;
      void load().catch(() => { if (active) { setRows([]); setError('no se pudieron actualizar las invitaciones.'); } });
    };
    refresh();
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; requestGeneration.current++; clearInterval(interval);
      window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  async function act(answer?: Exclude<EventResponse, 'pending'>, eid?: string) {
    setBusy(true); setError(''); setStatus('');
    try {
      const { error } = answer
        ? await getSupabaseClient().rpc('respond_to_event_invitation', { eid, answer })
        : await getSupabaseClient().rpc('invite_to_event', { eid: eventId, usernames: inviteUsernames(names) });
      if (error) throw error;
      if (!answer) setNames('');
      setStatus(answer ? 'respuesta guardada.' : 'invitaciones enviadas a mensajes; las existentes no se duplicaron.');
      await load();
    } catch (error) { setError(collaborationError(error)); }
    finally { setBusy(false); }
  }
  return <section aria-label="invitaciones a eventos" className="border-b border-current/20 p-3 text-sm">
    <button type="button" className="min-h-11 w-full text-left font-semibold" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      invitaciones a eventos {loaded && `(${rows.filter(row => row.response === 'pending').length} sin respuesta)`} {expanded ? '−' : '+'}
    </button>
    {expanded && <div className="space-y-3">
      {eventId && !unavailable && <div className="space-y-2">
        <label htmlFor="event-invitees">invitar personas por usuario</label>
        <fieldset disabled={busy}>
          <CollaboratorPicker id="event-invitees" value={names} onChange={setNames} userId={userId}
            selectedLabel="personas invitadas" resultsLabel="cuentas para invitar"
            inputStyle={{ width: '100%', minHeight: 44, background: 'transparent', borderBottom: '1px solid currentColor' }} />
        </fieldset>
        <button type="button" className={button} disabled={busy || !names} onClick={() => act()}>enviar invitaciones</button>
        <p className="text-xs opacity-75">solo para eventos futuros aprobados. en eventos privados, invita únicamente a miembros del colectivo. enviar no crea un chat.</p>
      </div>}
      {!loaded && !error && <p role="status">cargando invitaciones…</p>}
      {loaded && !rows.length && <p>no hay invitaciones disponibles.</p>}
      {rows.map(row => {
        const event = row.posts;
        if (!event) return null;
        const inactive = eventUnavailable(event);
        const ended = inactive || !event.event_date || Date.parse(event.event_date) <= Date.now();
        return <article key={row.id} className="space-y-2 rounded border border-current/20 p-3">
          {!eventId && <>
            {event.media_url && !event.is_sensitive && !event.audience_colectivo_id && <div className="max-w-48"><PostImage src={event.media_url} alt={event.title || 'cartel del evento'} mediaType={event.media_type} /></div>}
            <Link className="block font-semibold underline" href={`/post/${row.event_id}`}>{event.title || 'evento'} ↗</Link>
            <p>{event.event_date ? new Date(event.event_date).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' }) + ' · CDMX' : 'fecha por confirmar'}</p>
            <p>{event.venue || 'lugar por confirmar'}{event.address ? ` · ${event.address}` : ''}</p>
          </>}
          {eventId && <p>@{row.profiles?.username || 'cuenta no disponible'}</p>}
          <p>respuesta: {EVENT_RESPONSES[row.response]}</p>
          {inactive && <p role="status">{EVENT_STATUSES[event.event_status!]}{event.event_status_note ? `: ${event.event_status_note}` : ''}</p>}
          {!eventId && !ended && <div className="flex flex-wrap gap-2">
            {(['going', 'maybe', 'declined'] as const).map(answer => <button key={answer} type="button" className={button}
              aria-pressed={row.response === answer} disabled={busy} onClick={() => act(answer, row.event_id)}>{EVENT_RESPONSES[answer]}</button>)}
          </div>}
          {!eventId && ended && <p className="text-xs">{inactive ? 'las respuestas están cerradas hasta que el evento vuelva a estar programado.' : 'el evento ya comenzó; las respuestas están cerradas.'}</p>}
        </article>;
      })}
      <p className="text-xs opacity-75">las respuestas solo las ven quien organiza y la persona invitada. no se añaden a tu perfil público.</p>
      {rows.length === 100 && <p>se muestran las 100 invitaciones más recientes.</p>}
    </div>}
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error} <button type="button" className="min-h-11 underline" onClick={() => { setError(''); void load().catch(error => setError(collaborationError(error))); }}>reintentar carga</button></p>}
  </section>;
}
