import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ReviewButton from './ReviewButton'

type Entry = {
  user_id: string; motivation: string; contribution: string; version: string;
  accepted_at: string; reviewed_at: string | null;
  content_snapshot: { questions: string[]; agreements: string[]; privacy: string };
  profiles: { username: string; created_at: string };
}
const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(value))

export default async function IngresosPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/staff/login')
  const { data: config, error: accessError } = await db.from('app_config').select('owner_user_id').limit(1).maybeSingle()
  if (accessError || config?.owner_user_id !== user.id) redirect('/staff')
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().replace(/^@/, '').slice(0, 30) : ''
  const status = ['pending', 'reviewed'].includes(params.status ?? '') ? params.status! : 'all'
  const page = Math.min(100000, Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1))
  const pageSize = 20
  let query = db.from('member_onboarding').select('user_id,motivation,contribution,version,content_snapshot,accepted_at,reviewed_at,profiles!member_onboarding_user_id_fkey!inner(username,created_at)', { count: 'exact' })
  if (q) query = query.ilike('profiles.username', `%${q.replace(/[\\%_]/g, '\\$&')}%`)
  if (status === 'pending') query = query.is('reviewed_at', null)
  if (status === 'reviewed') query = query.not('reviewed_at', 'is', null)
  const { data, count, error } = await query.order('accepted_at', { ascending: false }).order('user_id').range((page - 1) * pageSize, page * pageSize - 1)
  const entries = (data ?? []) as unknown as Entry[]
  const href = (n: number) => `/staff/ingresos?${new URLSearchParams({ q, status, page: String(n) })}`
  return <main className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
    <Link href="/staff" className="underline">← equipo</Link>
    <h1 className="magma-page-title">respuestas de ingreso</h1>
    <p>Solo tú, como responsable de Magma, puedes revisar las respuestas de otras personas. Revisar no aprueba, rechaza ni cambia el acceso de nadie.</p>
    <p className="text-sm">Las cuentas anteriores a este formulario no tienen respuestas. Las nuevas aparecen aquí incluso si su email aún está por confirmar.</p>
    <form className="flex flex-wrap gap-3 items-end">
      <label className="flex flex-col gap-2">Buscar usuario<input name="q" defaultValue={q} maxLength={31} placeholder="@usuario" className="border border-white/30 bg-transparent p-2" /></label>
      <label className="flex flex-col gap-2">Estado<select name="status" defaultValue={status} className="border border-white/30 bg-[#141412] p-2"><option value="all">todos</option><option value="pending">sin revisar</option><option value="reviewed">revisados</option></select></label>
      <button className="border border-white/30 p-2">buscar</button>
    </form>
    {error ? <p role="alert">No se pudieron cargar las respuestas. Verifica que la migración esté instalada. <Link href={href(page)} className="underline">Reintentar</Link></p> : <>
      <p>{count ?? 0} respuestas · página {page}</p>
      {!entries.length && <p>No hay respuestas para esta búsqueda.</p>}
      {entries.map(entry => <article key={entry.user_id} className="border border-white/25 p-5 space-y-4 break-words">
        <h2><Link href={`/profile/${entry.profiles.username}`} className="underline">@{entry.profiles.username}</Link></h2>
        <p className="text-sm">Cuenta creada: {date(entry.profiles.created_at)} · Acuerdos aceptados: {date(entry.accepted_at)} · Versión {entry.version}</p>
        {[entry.motivation, entry.contribution].map((answer, i) => <div key={i}><h3>{entry.content_snapshot.questions[i]}</h3><p className="whitespace-pre-wrap mt-2">{answer}</p></div>)}
        <details><summary className="cursor-pointer underline">acuerdos y privacidad aceptados</summary><ul className="list-disc pl-5 my-3">{entry.content_snapshot.agreements.map(agreement => <li key={agreement}>{agreement}</li>)}</ul><p>{entry.content_snapshot.privacy}</p></details>
        <p>{entry.reviewed_at ? `Revisado: ${date(entry.reviewed_at)}` : 'Sin revisar'}</p>
        <ReviewButton userId={entry.user_id} reviewed={Boolean(entry.reviewed_at)} />
      </article>)}
      <nav aria-label="Páginas de respuestas" className="flex gap-6">{page > 1 && <Link href={href(page - 1)}>← anteriores</Link>}{page * pageSize < (count ?? 0) && <Link href={href(page + 1)}>siguientes →</Link>}</nav>
    </>}
  </main>
}
