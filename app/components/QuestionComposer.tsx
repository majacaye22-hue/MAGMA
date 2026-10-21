"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

export function QuestionComposer() {
  const router=useRouter();
  const [question,setQuestion]=useState('');
  const [context,setContext]=useState('');
  const [anonymous,setAnonymous]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [attempted,setAttempted]=useState(false);
  const [blockMessage,setBlockMessage]=useState('');
  const request=useRef<string|null>(null);
  const inFlight=useRef(false);
  async function publish(event: React.FormEvent) {
    event.preventDefault(); if(inFlight.current) return;
    inFlight.current=true;setBusy(true);setError('');setAttempted(true);
    request.current ??= crypto.randomUUID();
    try {
      const {data,error}=await getSupabaseClient().rpc('publish_question',{question:question.trim(),context:context.trim(),anonymous,request_id:request.current});
      if(error) throw error;
      if(!data) throw new Error('no se recibió confirmación; reintenta sin cambiar la pregunta');
      router.push(`/post/${data}`);router.refresh();
    } catch(e) { setError(e && typeof e==='object' && 'message' in e ? String(e.message) : 'no se pudo publicar; reintenta'); }
    finally {inFlight.current=false;setBusy(false);}
  }
  return <>
    <Link href="/upload" className="text-sm underline">← ¿qué traes?</Link>
    <h1 className="magma-page-title my-6">pregunta a la comunidad</h1>
    <p className="mb-6 text-sm">abre una conversación con la sala. las respuestas llevan el nombre de quien responde.</p>
    <form onSubmit={publish} className="space-y-5">
      <fieldset disabled={busy || attempted} className="space-y-5">
        <label className="block">tu pregunta<textarea required maxLength={280} rows={3} value={question} onChange={e=>setQuestion(e.target.value)} className="mt-2 w-full border border-current/30 bg-transparent p-3" /></label>
        <label className="block">contexto — opcional<textarea maxLength={2000} rows={4} value={context} onChange={e=>setContext(e.target.value)} className="mt-2 w-full border border-current/30 bg-transparent p-3" /></label>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} />publicar de forma anónima</label>
        <p className="text-xs text-[var(--magma-muted)]">visible en Explorar para la comunidad de Magma. {anonymous ? 'tu perfil no aparece en la pregunta. el equipo autorizado de moderación puede consultar tu identidad. si respondes, tu respuesta sí lleva tu nombre.' : 'la pregunta lleva tu usuario y aparece en tu perfil.'} no incluyas datos personales de otras personas.</p>
        <p className="text-xs text-[var(--magma-muted)]">hasta 3 preguntas cada 24 horas. puedes eliminarlas; la edición no está disponible en esta primera versión. este formulario no guarda borradores.</p>
      </fieldset>
      {attempted && error && <p className="text-xs">reintentar conserva exactamente esta pregunta y su privacidad para evitar publicaciones duplicadas.</p>}
      <button disabled={busy||!question.trim()} className="min-h-11 bg-[var(--magma-red)] px-5 disabled:opacity-40">{busy?'publicando…':attempted?'reintentar publicación':'preguntar →'}</button>
      {error && <p role="alert">{error}</p>}
    </form>
    <button type="button" disabled={busy} className="mt-8 min-h-11 text-xs underline" onClick={async()=>{
      if(!window.confirm('¿volver a ver las preguntas de todas las personas que ocultaste? tus bloqueos de perfiles no cambian.'))return;
      try {const {error}=await getSupabaseClient().rpc('clear_question_blocks');if(error)throw error;setBlockMessage('preferencias restablecidas');}
      catch {setBlockMessage('no se pudo restablecer; reintenta');}
    }}>restablecer preguntas ocultas</button>
    {blockMessage&&<p role="status" className="text-xs">{blockMessage}</p>}
  </>;
}
