import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { SEARCH_TYPES, searchHref, searchMagma, searchParamsFrom } from "@/lib/search";

export const metadata = { title: "Buscar — MAGMA", robots: { index: false, follow: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { q, type, page } = searchParamsFrom(await searchParams);
  const groups = q.length >= 2 ? await searchMagma(await createClient(), q, type, page) : [];
  const empty = groups.length > 0 && groups.every(group => !group.error && group.rows.length === 0);
  return <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 text-white">
    <header className="space-y-3 py-6 md:py-8">
      <h1 className="magma-page-title text-[var(--magma-red)]" style={{ fontFamily: "var(--font-syne), sans-serif" }}>buscar en magma</h1>
      <p className="hidden text-sm md:block">encuentra publicaciones, personas, proyectos y colectivos.</p>
      <form role="search" action="/buscar" className="flex gap-3">
        <input key={q} type="search" name="q" aria-label="buscar en magma" defaultValue={q} placeholder="un nombre, una idea, una etiqueta…" required minLength={2} maxLength={80}
          className="min-w-0 flex-1 rounded border border-white/25 bg-transparent px-3 py-3 focus:outline-2 focus:outline-[var(--magma-red)]" />
        <input type="hidden" name="tipo" value={type} />
        <button className="rounded bg-[var(--magma-red)] px-4 py-2 font-bold text-white">buscar</button>
      </form>
      <nav aria-label="tipos de resultado" className="flex flex-wrap gap-2">
        {SEARCH_TYPES.map(category => <Link key={category} href={searchHref(q, category)} aria-current={type === category ? "page" : undefined}
          className={`rounded border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--magma-red)] ${type === category ? "border-[var(--magma-red)] bg-[var(--magma-red)] font-bold text-white" : "border-white/15 hover:border-[var(--magma-red)]"}`}>{category}</Link>)}
      </nav>
    </header>
    {q.length < 2 && <p className="py-6 text-sm">escribe al menos 2 caracteres para empezar. también puedes buscar por @usuario o etiqueta.</p>}
    {empty && <p role="status" className="py-6">{page > 1 ? "no hay más resultados en esta página." : `no encontramos resultados para “${q}”. prueba con otro nombre o una palabra más corta.`}</p>}
    <div className="space-y-8">
      {groups.map(group => <section key={group.type} aria-labelledby={`heading-${group.type}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={`heading-${group.type}`} className="font-bold">{group.type}</h2>
          {type === "todo" && group.hasMore && <Link href={searchHref(q, group.type)} className="text-sm text-[var(--magma-red)] hover:underline">ver más →</Link>}
        </div>
        {group.error ? <p role="alert" className="text-sm">no se pudieron cargar estos resultados. <Link href={searchHref(q, type, page)} className="underline">reintentar</Link></p> : group.rows.length ? <ul className="grid gap-3 md:grid-cols-2">
          {group.rows.map(row => <li key={row.id}><Link href={row.href} className="group flex h-full min-w-0 items-start justify-between gap-4 rounded-lg border border-white/15 bg-white/[0.025] p-4 hover:border-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-[var(--magma-red)]">
            <div className="min-w-0"><p className="text-xs text-white/65">{row.label}</p><h3 className="mt-1 break-words font-bold">{row.title}</h3>{row.description && <p className="mt-2 break-words text-sm leading-relaxed">{row.description}</p>}</div>
            <span aria-hidden="true" className="text-[var(--magma-red)]">↗</span>
          </Link></li>)}
        </ul> : !empty && <p className="text-sm text-white/65">sin coincidencias en {group.type}.</p>}
      </section>)}
    </div>
    {type !== "todo" && groups.length > 0 && <nav aria-label="páginas de resultados" className="mt-8 flex items-center justify-between gap-3 border-t border-white/15 pt-5 text-sm">
      {page > 1 ? <Link className="text-[var(--magma-red)]" href={searchHref(q, type, page - 1)}>← anteriores</Link> : <span />}
      <span>página {page}</span>
      {groups[0].hasMore && <Link className="text-[var(--magma-red)]" href={searchHref(q, type, page + 1)}>siguientes →</Link>}
    </nav>}
  </main>;
}
