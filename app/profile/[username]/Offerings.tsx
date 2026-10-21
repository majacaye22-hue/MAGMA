"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PortfolioPdf from './PortfolioPdf';
import { portfolioPdfError } from '@/lib/portfolio-pdf';
import { getSupabaseClient } from '@/lib/supabase';
import { OFFERING_MODES, offeringError, offeringCoverError, validWorkPath, type Offering } from '@/lib/profile-offerings';

const empty = { title: '', description: '', modes: [] as string[], work_path: '', cover_image_url: null as string | null, pdf_url: null as string | null };
const field = 'mt-2 w-full border border-[#49463f] bg-transparent p-3 text-white focus-visible:outline-2 focus-visible:outline-[var(--magma-red)]';
const button = 'min-h-11 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-[var(--magma-red)] disabled:opacity-50';
class UploadError extends Error {}
async function uploadPortfolioFile(file: File, purpose?: string) {
  const form = new FormData(); form.append('file', file);
  if (purpose) form.append('purpose', purpose);
  const response = await fetch('/api/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  const uploaded = await response.json().catch(() => null);
  if (!response.ok || typeof uploaded?.url !== 'string') {
    throw new UploadError(typeof uploaded?.error === 'string' ? uploaded.error : 'no se pudo subir el archivo. vuelve a intentarlo.');
  }
  return uploaded.url as string;
}

function WorkThumbnail({ path, cover }: { path: string | null; cover?: string | null }) {
  const [image, setImage] = useState<string | null>(cover ?? null);
  const db = getSupabaseClient();
  useEffect(() => {
    if (cover || !path || !validWorkPath(path)) return;
    const controller = new AbortController();
    const [, kind, id] = path.split('/');
    void (async () => {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);
        if (kind === 'proyecto') {
          const { data, error } = await db.from('projects').select('cover_image_url').eq('id', id).maybeSingle().abortSignal(signal);
          if (!controller.signal.aborted && !error) setImage(data?.cover_image_url ?? null);
        } else {
          // Do not bypass sensitive-content gating or expose private/hidden work in a teaser.
          const { data, error } = await db.from('posts').select('media_url').eq('id', id)
            .eq('moderation_status', 'approved').eq('is_hidden', false).eq('is_sensitive', false)
            .is('audience_colectivo_id', null).in('type', ['arte', 'fotografía', 'evento'])
            .maybeSingle().abortSignal(signal);
          if (!controller.signal.aborted && !error) setImage(data?.media_url ?? null);
        }
      } catch { /* A missing preview should never hide the offering. */ }
    })();
    return () => controller.abort();
  }, [db, path, cover]);
  return <span aria-hidden="true" className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[#21191c]">
    {image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={() => setImage(null)} />
    ) : <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13.5" r="4" /></svg>}
    {!image && <><span className="absolute left-4 top-4 h-5 w-5 border-l border-t border-white/30" /><span className="absolute right-4 top-4 h-5 w-5 border-r border-t border-white/30" /><span className="absolute bottom-4 left-4 h-5 w-5 border-b border-l border-white/30" /><span className="absolute bottom-4 right-4 h-5 w-5 border-b border-r border-white/30" /></>}
  </span>;
}

export default function Offerings({ profileId, own, onMessage, messaging, workOptions = [], onAvailability }: {
  profileId: string; own: boolean; onMessage: (offeringId: string) => Promise<void>; messaging: boolean;
  workOptions?: { path: string; title: string | null }[];
  onAvailability?: (value: { profileId: string; hasItems: boolean }) => void;
}) {
  const db = getSupabaseClient();
  const [items, setItems] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(empty);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    const openLinked = () => {
      const id = window.location.hash.replace('#offering-', '');
      if (items.some(item => item.id === id)) {
        setExpanded(id);
        requestAnimationFrame(() => document.getElementById(`offering-${id}`)?.scrollIntoView({ block: 'center' }));
      }
    };
    openLinked(); window.addEventListener('hashchange', openLinked);
    return () => window.removeEventListener('hashchange', openLinked);
  }, [items]);
  const lock = useRef(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);
  function resetCover() { setCoverFile(null); setCoverPreview(null); }
  function chooseCover(file: File | undefined) {
    if (!file) return;
    const issue = offeringCoverError(file);
    if (issue) { setError(issue); return; }
    setError(''); setCoverFile(file); setCoverPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await db.from('profile_offerings').select('id,title,description,modes,work_path,cover_image_url,pdf_url')
          .eq('profile_id', profileId).order('created_at').order('id').limit(100)
          .abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
        if (result.error) throw result.error;
        if (!controller.signal.aborted) { setItems(result.data ?? []); setError(''); onAvailability?.({ profileId, hasItems: !!result.data?.length }); }
      } catch {
        if (!controller.signal.aborted) setError('no se pudo cargar el portafolio');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [db, profileId, retry, onAvailability]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !own) return;
    const value = { ...draft, title: draft.title.trim(), description: draft.description.trim(), work_path: draft.work_path.trim() || null };
    const invalid = offeringError(value);
    if (invalid) { setError(invalid); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      if (pdfFile) {
        const url = await uploadPortfolioFile(pdfFile, 'portfolio-pdf');
        value.pdf_url = url;
        setDraft(previous => ({ ...previous, pdf_url: url }));
        setPdfFile(null);
      }
      if (coverFile) {
        const url = await uploadPortfolioFile(coverFile);
        value.cover_image_url = url;
        setDraft(previous => ({ ...previous, cover_image_url: url }));
        resetCover();
      }
      const query = editing === 'new'
        ? db.from('profile_offerings').insert({ ...value, profile_id: profileId })
        : db.from('profile_offerings').update(value).eq('id', editing!).eq('profile_id', profileId);
      const result = await query.select('id,title,description,modes,work_path,cover_image_url,pdf_url').single().abortSignal(AbortSignal.timeout(10000));
      if (result.error) throw result.error;
      setItems(previous => editing === 'new' ? [...previous, result.data] : previous.map(item => item.id === editing ? result.data : item));
      onAvailability?.({ profileId, hasItems: true });
      setEditing(null); setDraft(empty);
    } catch (cause) { setError(cause instanceof UploadError ? cause.message : 'no se pudo confirmar el guardado. tu texto sigue aquí; comprueba tu conexión y vuelve a intentarlo.'); }
    finally { lock.current = false; setBusy(false); }
  }

  async function remove(item: Offering) {
    if (!own || lock.current || !window.confirm(`¿quitar “${item.title}” de tu perfil?`)) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await db.from('profile_offerings').delete().eq('id', item.id).eq('profile_id', profileId).select('id').single().abortSignal(AbortSignal.timeout(10000));
      if (result.error) throw result.error;
      setItems(previous => previous.filter(value => value.id !== item.id));
      onAvailability?.({ profileId, hasItems: items.some(value => value.id !== item.id) });
    } catch { setError('no se pudo confirmar el cambio. recarga para comprobarlo.'); }
    finally { lock.current = false; setBusy(false); }
  }

  if (!own && !loading && !error && items.length === 0) return null;
  return <section aria-labelledby="offerings-title" className="my-3 text-white">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id="offerings-title" className="text-xl">portafolio</h2>
      {own && !editing && !loading && <button type="button" className={`${button} text-xs`} onClick={() => { resetCover(); setPdfFile(null); setDraft(empty); setEditing('new'); }}>+ añadir al portafolio</button>}
    </div>
    <div className="mt-4 grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map(item => <article key={item.id} className="min-w-0 overflow-hidden rounded-[2px] border border-[#49463f] bg-[#10100f] p-[10px] transition-colors focus-within:border-[#dc143c] hover:border-[#dc143c]">
      <button type="button" aria-expanded={expanded === item.id} aria-controls={`offering-${item.id}`} disabled={busy || editing !== null} className="group block w-full text-left text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc143c] disabled:opacity-50" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
        <WorkThumbnail key={`${item.work_path}:${item.cover_image_url}`} path={item.work_path} cover={item.cover_image_url} />
        <span className="block px-0.5 pb-1 pt-3"><span className="flex items-start justify-between gap-3"><span className="break-words text-base font-bold leading-tight" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>{item.title}</span><span aria-hidden="true" className="shrink-0 text-lg leading-tight text-[#dc143c]">{expanded === item.id ? '↑' : '↗'}</span></span>{expanded !== item.id && <span className="mt-2 line-clamp-2 text-sm leading-relaxed">{item.description}</span>}<span className="mt-4 block text-xs">{expanded === item.id ? 'cerrar detalles' : 'conoce mi práctica'}</span></span>
      </button>
      {item.pdf_url && <PortfolioPdf url={item.pdf_url} title={item.title} />}
      <div id={`offering-${item.id}`} hidden={expanded !== item.id || editing !== null} className="px-0.5 pb-1 pt-3">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.description}</p>
        {item.modes.length > 0 && <p className="mt-4 text-xs">{item.modes.join(' · ')}</p>}
        {item.work_path && validWorkPath(item.work_path) && <Link href={item.work_path} className="mt-4 inline-block text-sm text-[var(--magma-red)]">ver mi trabajo ↗</Link>}
        {own && <div className="mt-3 flex gap-2"><button type="button" disabled={busy} className={button} onClick={() => { resetCover(); setPdfFile(null); setEditing(item.id); setDraft({ ...item, work_path: item.work_path ?? '', cover_image_url: item.cover_image_url ?? null, pdf_url: item.pdf_url ?? null }); }}>editar</button><button type="button" disabled={busy} className={button} onClick={() => void remove(item)}>quitar</button></div>}
        {!own && <button type="button" disabled={messaging} onClick={() => void onMessage(item.id)} className={`${button} mt-3 border border-[var(--magma-red)]`}>{messaging ? 'abriendo…' : 'platiquemos ↗'}</button>}
      </div>
      </article>)}
    </div>
    {own && editing && <p className="mt-2 max-w-xl text-sm">una selección de lo que haces, lo que sabes y lo que te gusta compartir. este espacio es opcional.</p>}
    {loading && <p role="status" className="mt-4 text-sm">cargando…</p>}
    {error && <div role="alert" className="mt-4"><p>{error}</p><button type="button" disabled={busy} className={button} onClick={() => setRetry(value => value + 1)}>recargar</button></div>}
    {editing && <form onSubmit={save} className="mt-5 max-w-2xl space-y-5">
      <fieldset disabled={busy} className="space-y-5">
      <div>
        <label className="block">PDF · opcional<input type="file" accept="application/pdf,.pdf" className={field} onChange={event => {
          const file = event.target.files?.[0]; event.target.value = '';
          if (!file) return;
          const issue = portfolioPdfError(file);
          if (issue) { setError(issue); return; }
          setError(''); setPdfFile(file);
        }} /></label>
        <p className="mt-2 text-xs">máximo 15 MB. se abre dentro de tu perfil. el archivo tendrá un enlace público: no incluyas información privada.</p>
        {(pdfFile || draft.pdf_url) && <div className="mt-2 text-sm"><p>{pdfFile?.name ?? 'PDF adjunto'}</p><button type="button" className={button} onClick={() => { setPdfFile(null); setDraft(previous => ({ ...previous, pdf_url: null })); }}>quitar PDF</button></div>}
      </div>
      <div>
        <label className="block">portada · opcional<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={field} onChange={event => { chooseCover(event.target.files?.[0]); event.target.value = ''; }} /></label>
        <p className="mt-2 text-xs">JPG, PNG, WEBP o GIF · máximo 15 MB. se verá en tu perfil; no subas contenido privado.</p>
        {(coverPreview || draft.cover_image_url) && <div className="mt-3 max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverPreview ?? draft.cover_image_url!} alt="vista previa de la portada" className="aspect-[4/3] w-full object-cover" />
          <button type="button" className={button} onClick={() => { resetCover(); setDraft({ ...draft, cover_image_url: null }); }}>quitar portada</button>
        </div>}
        <p className="mt-2 text-xs">sin portada, usaremos la imagen del trabajo vinculado o el icono de cámara.</p>
      </div>
      <label className="block">¿qué te gustaría compartir?<input autoFocus required maxLength={80} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="recorridos por mis rincones de la ciudad" className={field} /></label>
      <label className="block">cuéntalo a tu manera<textarea required maxLength={600} rows={4} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="qué haces, cómo te gusta hacerlo y con quién…" className={field} /></label>
      <fieldset><legend>¿cómo te gustaría compartirlo? · opcional</legend><div className="mt-3 flex flex-wrap gap-4">{OFFERING_MODES.map(mode => <label key={mode} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={draft.modes.includes(mode)} onChange={event => setDraft({ ...draft, modes: event.target.checked ? [...draft.modes, mode] : draft.modes.filter(value => value !== mode) })} />{mode}</label>)}</div></fieldset>
      {workOptions.length > 0 && <label className="block">elige entre tus proyectos y publicaciones<select className={field} value={workOptions.some(work => work.path === draft.work_path) ? draft.work_path : ''} onChange={event => setDraft({ ...draft, work_path: event.target.value })}><option value="">sin selección</option>{workOptions.map(work => <option key={work.path} value={work.path}>{work.title || 'sin título'}</option>)}</select></label>}
      <label className="block">enlace a tu trabajo · opcional<input value={draft.work_path} onChange={event => { let path = event.target.value; try { const url = new URL(path); if (url.origin === window.location.origin) path = url.pathname; } catch {} setDraft({ ...draft, work_path: path }); }} placeholder="/proyecto/… o /post/…" className={field} /><span className="mt-2 block text-xs">elige un ejemplo arriba o pega un enlace de Magma. solo quienes tengan acceso podrán ver el trabajo.</span></label>
      {error && <p role="alert" className="text-sm text-white">{error}</p>}
      <div className="flex gap-3"><button type="submit" disabled={busy} className={`${button} border border-[var(--magma-red)]`}>{busy ? 'guardando…' : 'guardar'}</button><button type="button" disabled={busy} className={button} onClick={() => { resetCover(); setPdfFile(null); setEditing(null); }}>cancelar</button></div>
      </fieldset>
    </form>}
  </section>;
}
