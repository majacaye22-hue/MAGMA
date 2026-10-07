"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';

type Reflection = { id: string; event_id: string; body: string; is_public: boolean; image_path?: string | null };
export function ProfileReflections({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
  const [notes, setNotes] = useState<Reflection[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await getSupabaseClient().from('event_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (active) { setFailed(Boolean(error)); setNotes(data ?? []); }
    })().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId]);
  if (failed) return <p role="alert" className="mt-8">no se pudieron cargar las notas; recarga para reintentar.</p>;
  if (!notes.length) return null;
  return <section className="mt-10 border-t pt-8" style={{ borderColor: 'var(--magma-border)' }} aria-label="notas de encuentros">
    <h2 className="text-2xl mb-6">lo que me llevo</h2>
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{notes.map(note => <article key={note.id} className="min-w-0 border-t pt-4" style={{ borderColor: 'var(--magma-border)' }}>
      {note.image_path && /* eslint-disable-next-line @next/next/no-img-element */
        <img src={`/api/event-note-image?id=${note.id}`} alt="foto del encuentro" className="mb-4 w-full max-h-96 object-contain" loading="lazy" />}
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{note.body}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link href={`/post/${note.event_id}`} className="underline">ver encuentro →</Link>
        {isOwnProfile && <span>{note.is_public ? 'pública en magma' : 'solo para ti'}</span>}
      </div>
    </article>)}</div>
  </section>;
}
