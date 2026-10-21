import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { COLLABORATIONS_ENABLED } from '@/lib/collaborations';

export default async function CollaborationsPage() {
  if (!COLLABORATIONS_ENABLED) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/colaboraciones');
  const { data, error } = await supabase.from('collaborations')
    .select('id,accepted_at,project_id,post_id,projects(title),posts(title)')
    .eq('user_id', user.id).order('created_at', { ascending: false });
  type Row = { id: string; accepted_at: string | null; project_id: string | null; post_id: string | null; projects: { title: string } | null; posts: { title: string | null } | null };
  const rows = (data ?? []) as unknown as Row[];
  const groups = [
    { title: 'por responder', rows: rows.filter(row => !row.accepted_at) },
    { title: 'colaboraciones aceptadas', rows: rows.filter(row => row.accepted_at) },
  ];
  return <main className="mx-auto min-h-screen w-full max-w-6xl px-6 pb-24 pt-6 text-[var(--magma-ash)] md:pt-8" style={{ fontFamily: 'var(--font-space-mono), monospace' }}>
    <header>
      <p className="text-xs tracking-widest">conexiones creativas · solo para ti</p>
      <h1 className="magma-page-title mt-2 text-[var(--magma-red)]" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>invitaciones</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed">proyectos para hacer en conjunto y publicaciones que reconocen tu colaboración. abre cada invitación para responder.</p>
      <Link href="/mensajes" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs underline underline-offset-4 hover:decoration-[var(--magma-red)]">las invitaciones a eventos están en mensajes <span aria-hidden="true">↗</span></Link>
    </header>
    {error ? <section role="alert" className="mt-6 border-t border-white/20 py-10">
      <h2 className="text-xl">no pudimos cargar tus invitaciones</h2>
      <p className="mt-3 text-sm">inténtalo de nuevo. tus colaboraciones no han cambiado.</p>
      <Link href="/colaboraciones" className="mt-5 inline-flex min-h-11 items-center underline underline-offset-4">reintentar →</Link>
    </section> : rows.length === 0 ? <section className="mt-6 border-y border-white/20 py-10 sm:py-14">
      <p aria-hidden="true" className="mb-6 text-3xl text-[var(--magma-red)]">↗</p>
      <h2 className="text-2xl" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>algo puede empezar con una invitación</h2>
      <p className="mt-4 max-w-lg text-sm leading-relaxed">todavía no tienes invitaciones ni colaboraciones. cuando alguien te invite a un proyecto o a compartir crédito en una publicación, lo encontrarás aquí.</p>
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <Link href="/proyectos" className="inline-flex min-h-11 items-center gap-3 underline underline-offset-4">explorar proyectos <span aria-hidden="true" className="text-[var(--magma-red)]">→</span></Link>
        <Link href="/buscar" className="inline-flex min-h-11 items-center gap-3 underline underline-offset-4">encontrar personas <span aria-hidden="true" className="text-[var(--magma-red)]">→</span></Link>
      </div>
    </section> : <div className="mt-8 space-y-10">{groups.filter(group => group.rows.length).map(group => <section key={group.title} aria-label={group.title}>
      <h2 className="border-b border-white/20 pb-3 text-xs tracking-widest">{group.title} · {group.rows.length}</h2>
      <ul className="grid gap-x-10 md:grid-cols-2">{group.rows.map(row => <li key={row.id} className="min-w-0 border-b border-white/20 py-5">
        <p className="text-xs">{row.project_id ? 'proyecto compartido' : 'crédito en una publicación'} · {row.accepted_at ? 'aceptada' : 'pendiente'}</p>
        <Link className="group mt-2 flex min-h-11 items-center justify-between gap-4 py-2 text-xl hover:underline underline-offset-4" href={row.project_id ? `/proyecto/${row.project_id}` : `/post/${row.post_id}`}>
          <span className="min-w-0 break-words">{row.projects?.title || row.posts?.title || 'sin título'}</span><span aria-hidden="true" className="shrink-0 text-[var(--magma-red)]">↗</span>
        </Link>
      </li>)}</ul>
    </section>)}</div>}
    <footer className="mt-8 max-w-2xl space-y-2 text-xs leading-relaxed">
      <p>colaborar en un proyecto y compartir crédito en una publicación son invitaciones distintas.</p>
      <p>las publicaciones privadas o en revisión solo aparecen cuando tienes acceso a ellas. una invitación no cambia ese acceso.</p>
    </footer>
  </main>;
}
