"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { collaborationError } from '@/lib/collaborations';

export function PostProjectLinks({ postId, privatePost }: { postId: string; privatePost: boolean }) {
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [links, setLinks] = useState<{ project_id: string; projects: { title: string } | null }[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const client = getSupabaseClient();
    const [options, linked] = await Promise.all([
      client.rpc('contributable_projects'),
      client.from('post_projects').select('project_id,projects(title)').eq('post_id', postId),
    ]);
    if (options.error || linked.error) throw options.error || linked.error;
    setProjects(options.data ?? []);
    setLinks((linked.data ?? []) as unknown as typeof links);
    setLoaded(true);
  }, [postId]);
  useEffect(() => { if (!privatePost) load().catch(error => setError(collaborationError(error))); }, [load, privatePost]);
  async function change(projectId: string, remove: boolean) {
    if (remove && !window.confirm('¿Retirar esta entrada? La publicación original se conserva.')) return;
    setBusy(true); setError('');
    try {
      const client = getSupabaseClient();
      const { error } = remove
        ? await client.rpc('unlink_project_entry', { pid: projectId, entry_id: postId })
        : await client.from('post_projects').insert({ post_id: postId, project_id: projectId });
      if (error && error.code !== '23505') throw error;
      await load(); setSelected('');
    } catch (error) { setError(collaborationError(error)); }
    finally { setBusy(false); }
  }
  if (privatePost) return <p className="text-sm">esta publicación pertenece a un colectivo privado y no puede añadirse a proyectos.</p>;
  return <section className="space-y-3 text-sm" aria-label="proyectos de esta publicación">
    <h2>añadir a un proyecto</h2>
    <p>Estos cambios se guardan inmediatamente. Retirar una entrada no elimina la publicación ni sus otros enlaces.</p>
    {!loaded && !error && <p role="status">cargando proyectos…</p>}
    <ul>{links.map(link => <li key={link.project_id} className="flex flex-wrap items-center gap-3">
      <Link href={`/proyecto/${link.project_id}`} className="underline">{link.projects?.title || 'proyecto'}</Link>
      <button type="button" disabled={busy} className="min-h-11 underline" onClick={() => change(link.project_id, true)}>retirar entrada</button>
    </li>)}</ul>
    <label>proyecto propio o colaboración aceptada
      <select value={selected} onChange={e => setSelected(e.target.value)} className="block min-h-11 w-full bg-[#141412] p-2">
        <option value="">elige un proyecto</option>
        {projects.filter(project => !links.some(link => link.project_id === project.id)).map(project => <option value={project.id} key={project.id}>{project.title}</option>)}
      </select>
    </label>
    <button type="button" disabled={busy || !selected} className="min-h-11 underline disabled:opacity-40" onClick={() => change(selected, false)}>añadir entrada</button>
    {error && <p role="alert">{error} <button type="button" className="underline" onClick={() => { setError(''); load().catch(error => setError(collaborationError(error))); }}>reintentar carga</button></p>}
  </section>;
}
