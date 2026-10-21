"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { collaborationError, inviteUsernames, type Collaboration, type CollaborationKind } from '@/lib/collaborations';
import { CollaboratorPicker } from './CollaboratorPicker';

const button = 'min-h-11 rounded border border-current px-3 py-2 text-sm disabled:opacity-40';

export function CollaborationPanel({ kind, targetId, ownerId, userId, ownerInviteMode = 'inline' }: {
  kind: CollaborationKind; targetId: string; ownerId: string; userId: string;
  ownerInviteMode?: 'inline' | 'hidden' | 'expanded';
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Collaboration[]>([]);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const owner = ownerId === userId;
  const mine = rows.find(row => row.user_id === userId);
  const canContribute = kind === 'project' && (owner || Boolean(mine?.accepted_at));
  const load = useCallback(async () => {
    const { data, error } = await getSupabaseClient().from('collaborations')
      .select('id,user_id,project_id,post_id,accepted_at,profiles!collaborations_user_id_fkey(username)')
      .eq(kind === 'project' ? 'project_id' : 'post_id', targetId).order('created_at');
    if (error) throw error;
    setRows((data ?? []) as unknown as Collaboration[]);
    setLoaded(true);
  }, [kind, targetId]);
  useEffect(() => { load().catch(error => setError(collaborationError(error))); }, [load]);
  async function act(action: string, name?: string) {
    setBusy(true); setError(''); setStatus('');
    try {
      const { error } = await getSupabaseClient().rpc('change_collaboration', {
        kind, target_id: targetId, action, username_input: name ?? null,
      });
      if (error) throw error;
      setUsername('');
      await load(); router.refresh();
      setStatus(action === 'invite' ? 'invitación enviada. aparecerá al aceptar.' : 'colaboración actualizada.');
    } catch (error) { setError(collaborationError(error)); }
    finally { setBusy(false); }
  }
  async function invite() {
    if (busy) return;
    setBusy(true); setError(''); setStatus('');
    let sent = 0;
    try {
      const names = inviteUsernames(username);
      if (!names.length) return;
      // The existing RPC handles one account at a time. Keep failed and unsent
      // selections so retrying never requires resending successful invitations.
      for (const name of names) {
        const { error } = await getSupabaseClient().rpc('change_collaboration', {
          kind, target_id: targetId, action: 'invite', username_input: name,
        });
        if (error) throw error;
        sent++;
        setUsername(names.slice(sent).join(', '));
      }
    } catch (error) { setError(collaborationError(error)); }
    finally {
      if (sent) {
        setStatus(`${sent} invitación${sent === 1 ? '' : 'es'} enviada${sent === 1 ? '' : 's'}. Las cuentas pendientes permanecen seleccionadas.`);
        try { await load(); router.refresh(); }
        catch { setError('Las invitaciones enviadas se guardaron, pero no se pudo actualizar la lista. Reintenta la carga.'); }
      }
      setBusy(false);
    }
  }
  if (kind === 'post' && loaded && !owner && !mine && rows.length === 0) return null;
  if (kind === 'post' && owner && ownerInviteMode === 'hidden' && rows.length === 0 && !error) return null;
  const compactInvite = kind === 'post' && owner;
  const collapsedInvite = compactInvite && ownerInviteMode === 'inline';
  const InviteContainer = collapsedInvite ? 'details' : 'div';
  const explanation = kind === 'project'
    ? 'Al aceptar puedes añadir tus propias publicaciones. Cada autor conserva sus créditos y el control de sus obras. Salir no retira las entradas existentes.'
    : 'Aceptar añade un crédito y muestra la obra pública en tu perfil. Solo quien publicó puede editarla o eliminarla. Esto no da acceso al proyecto ni cambia la privacidad.';
  return <section className={kind === 'post' ? "my-2 space-y-2 text-sm" : "my-4 space-y-3 rounded border border-current/20 p-4 text-sm"} aria-label={kind === 'project' ? 'colaboradores del proyecto' : 'créditos compartidos'}>
    {(!compactInvite || rows.length > 0) && <h2 className="font-semibold">{kind === 'project' ? 'colaboradores del proyecto' : 'colaboración en esta publicación'}</h2>}
    {!loaded && !error && <p role="status">cargando colaboraciones…</p>}
    {rows.length > 0 && <ul className="space-y-2">
      {rows.map(row => <li key={row.id} className="flex flex-wrap items-center gap-3">
        {row.profiles && <Link className="underline" href={`/profile/${encodeURIComponent(row.profiles.username)}`}>@{row.profiles.username}</Link>}
        <span>{row.accepted_at ? 'colaborador/a' : 'invitación pendiente'}</span>
        {owner && row.profiles && <button type="button" className={button} disabled={busy} onClick={() => {
          if (window.confirm(row.accepted_at ? '¿Retirar esta colaboración? No se eliminará ninguna publicación.' : '¿Cancelar esta invitación?')) void act('remove', row.profiles!.username);
        }}>{row.accepted_at ? 'retirar colaboración' : 'cancelar invitación'}</button>}
      </li>)}
    </ul>}
    {mine && !mine.accepted_at && <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={busy} onClick={() => act('accept')}>aceptar invitación</button>
      <button type="button" className={button} disabled={busy} onClick={() => act('decline')}>rechazar</button>
    </div>}
    {mine?.accepted_at && <button type="button" className={button} disabled={busy} onClick={() => {
      if (window.confirm('¿Salir de esta colaboración? Tus publicaciones no se eliminarán.')) void act('leave');
    }}>{kind === 'project' ? 'dejar de colaborar' : 'retirar mi crédito'}</button>}
    {owner && ownerInviteMode !== 'hidden' && <InviteContainer className="space-y-2">
      {collapsedInvite && <summary className="min-h-11 cursor-pointer py-3 text-[var(--magma-muted)] hover:text-[var(--magma-red)]">invitar colaboradores</summary>}
      <div className={compactInvite ? "max-w-lg space-y-2 border-l border-current/20 pl-4 pb-3" : "space-y-2"}>
      <label className="block" htmlFor={`collaborators-${kind}-${targetId}`}>{kind === 'project' ? 'invitar colaboradores al proyecto' : 'invitar colaboradores a esta publicación'}</label>
      <fieldset disabled={busy}>
        <CollaboratorPicker id={`collaborators-${kind}-${targetId}`} value={username} onChange={setUsername} userId={userId}
          inputStyle={{ width: '100%', minHeight: 44, background: 'transparent', borderBottom: '1px solid currentColor' }} />
      </fieldset>
      <button type="button" className={button} disabled={busy || !username.trim()} onClick={invite}>enviar invitación</button>
      {compactInvite && <><p className="text-xs opacity-75">{explanation}</p><Link className="inline-block py-2 underline" href="/colaboraciones">mis invitaciones →</Link></>}
      </div>
    </InviteContainer>}
    {!compactInvite && <p className="text-xs opacity-75">{explanation}</p>}
    {canContribute && <ProjectEntryPicker projectId={targetId} userId={userId} />}
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error} <button type="button" className="underline" onClick={() => { setError(''); load().catch(error => setError(collaborationError(error))); }}>reintentar carga</button></p>}
    {!compactInvite && <Link className="inline-block py-2 underline" href="/colaboraciones">mis invitaciones y colaboraciones →</Link>}
  </section>;
}

function ProjectEntryPicker({ projectId, userId }: { projectId: string; userId: string }) {
  const router = useRouter();
  const [posts, setPosts] = useState<{ id: string; title: string | null }[]>([]);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  async function load() {
    setLoading(true); setMessage('');
    try {
      const { data, error } = await getSupabaseClient().from('posts').select('id,title')
        .eq('author_id', userId).is('audience_colectivo_id', null).order('created_at', { ascending: false });
      if (error) throw error;
      setPosts(data ?? []); setOpened(true);
    } catch (error) { setMessage(collaborationError(error)); }
    finally { setLoading(false); }
  }
  async function add() {
    setBusy(true); setMessage('');
    try {
      const { error } = await getSupabaseClient().from('post_projects').insert({ project_id: projectId, post_id: selected });
      if (error && error.code !== '23505') throw error;
      setMessage('entrada añadida; la publicación original no cambia.'); setSelected(''); router.refresh();
    } catch (error) { setMessage(collaborationError(error)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 border-t border-current/20 pt-3">
    <div className="flex flex-wrap gap-2">
      <Link className={button} href={`/upload?proyecto=${projectId}`}>+ nueva entrada</Link>
      <button type="button" className={button} disabled={loading} onClick={load}>{loading ? 'cargando…' : 'añadir publicación existente'}</button>
    </div>
    {opened && (posts.length ? <div className="flex flex-wrap gap-2">
      <label>tu publicación pública<select className="ml-2 min-h-11 max-w-full bg-[var(--magma-obsidian)] p-2" value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="">elige una publicación</option>{posts.map(post => <option key={post.id} value={post.id}>{post.title || 'sin título'}</option>)}
      </select></label>
      <button type="button" className={button} disabled={busy || !selected} onClick={add}>añadir entrada</button>
    </div> : <p>no tienes publicaciones públicas para añadir.</p>)}
    <p role="status">{message}</p>
  </div>;
}

export function UnlinkProjectEntry({ projectId, postId }: { projectId: string; postId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function unlink() {
    if (!window.confirm('¿Retirar la entrada de este proyecto? La publicación original se conserva.')) return;
    setBusy(true); setError('');
    try {
      const { error } = await getSupabaseClient().rpc('unlink_project_entry', { pid: projectId, entry_id: postId });
      if (error) throw error;
      router.refresh();
    } catch (error) { setError(collaborationError(error)); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} className={button} onClick={unlink}>retirar del proyecto</button>{error && <p role="alert">{error}</p>}</div>;
}
