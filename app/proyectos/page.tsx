import { ProjectCard, type Project } from "@/app/components/ProjectCard";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeSearch, searchFilter } from "@/lib/search";
import styles from "./proyectos.module.css";
import { COLLABORATIONS_ENABLED } from '@/lib/collaborations';

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type ProjectRow = Omit<Project, "creator"> & {
  profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

export default async function ProyectosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = normalizeSearch(typeof params.q === "string" ? params.q : "");
  const creator = normalizeSearch(typeof params.autor === "string" ? params.autor.replace(/^@/, "") : "");
  const sort = ["recientes", "antiguos", "titulo"].includes(String(params.orden)) ? String(params.orden) : "recientes";
  const requested = Number(params.pagina ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 10000 ? requested : 1;
  const pageSize = 18;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/proyectos");
  let query = supabase
    .from("projects")
    .select("id, title, description, cover_image_url, links, profiles!projects_author_id_fkey!inner(username, display_name)", { count: "exact" });
  if (q) query = query.or(searchFilter(["title", "description"], q));
  if (creator) query = query.ilike("profiles.username", `%${creator.replace(/_/g, "\\_")}%`);
  query = query.order(sort === "titulo" ? "title" : "created_at", { ascending: sort !== "recientes" }).order("id");
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const href = (next: number) => `/proyectos?${new URLSearchParams({ q, autor: creator, orden: sort, pagina: String(next) })}`;


  const projects = ((data ?? []) as ProjectRow[]).map(({ profiles, ...project }) => ({
    ...project,
    creator: Array.isArray(profiles) ? profiles[0] ?? null : profiles,
  }));

  return (
    <main className={`${styles.page} min-h-screen w-full`} style={{ background: "var(--magma-obsidian)" }}>
      <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <header className="grid gap-2 py-5 md:py-6">
          <div>

            <h1 className="magma-page-title" style={{ color: "var(--magma-ash)", fontFamily: syne, fontWeight: 800, letterSpacing: "0.02em", }}>proyectos</h1>
            {COLLABORATIONS_ENABLED && <Link className="inline-block py-3 text-sm underline" href="/colaboraciones">mis invitaciones y colaboraciones →</Link>}
          </div>
        </header>

        <form action="/proyectos" className="flex flex-wrap items-end gap-3 rounded-xl bg-white/[0.03] p-3 text-sm" aria-label="filtrar proyectos">
          <label className="flex min-w-0 flex-[2_1_200px] flex-col gap-1"><span className="text-xs">buscar proyectos</span><input type="search" name="q" defaultValue={q} maxLength={80} placeholder="título o descripción…" className="min-h-11 w-full rounded-md border border-white/20 bg-transparent px-3 focus:outline-[var(--magma-red)]" /></label>
          <label className="flex min-w-0 flex-[1_1_140px] flex-col gap-1"><span className="text-xs">creador</span><input name="autor" defaultValue={creator} maxLength={80} placeholder="@usuario" className="min-h-11 w-full rounded-md border border-white/20 bg-transparent px-3 focus:outline-[var(--magma-red)]" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs">ordenar</span><select name="orden" defaultValue={sort} className="min-h-11 rounded-md border border-white/20 bg-[var(--magma-obsidian)] px-2"><option value="recientes">más recientes</option><option value="antiguos">más antiguos</option><option value="titulo">título a–z</option></select></label>
          <button className="min-h-11 rounded-md bg-[var(--magma-red)] px-4 text-white" type="submit">aplicar</button>
          {(q || creator || sort !== "recientes") && <Link href="/proyectos" className="py-3 text-xs underline">limpiar</Link>}
        </form>
        <section className="py-5" aria-label="resultados de proyectos">
          {error ? <div role="alert"><p>no se pudieron cargar los proyectos.</p><Link href={href(page)} className="underline">reintentar</Link></div> : <>
          {projects.length > 0 ? (
            <div className={`${styles.cards} grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}>
              {projects.map((project) => <ProjectCard key={project.id} project={project} portrait />)}
            </div>
          ) : (
            <div style={{ color: "#fff", fontFamily: mono, fontSize: "var(--magma-text-small)", padding: "40px 24px", textAlign: "center" }}>
              {q || creator ? "no hay proyectos con estos filtros" : page > 1 ? "no hay proyectos en esta página" : "todavía no hay proyectos · crea el primero desde tu perfil"}
              <Link href="/proyectos" className="mt-4 block text-[var(--magma-red)]">ver todos los proyectos →</Link>
            </div>
          )}
          {(totalPages > 1 || page > 1) && <nav aria-label="páginas de proyectos" className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
            {page > 1 ? <Link className="py-3 text-[var(--magma-red)]" href={href(Math.min(page - 1, totalPages))}>← anteriores</Link> : <span />}
            <span>página {page} · {totalPages} en total</span>
            {page < totalPages ? <Link className="py-3 text-[var(--magma-red)]" href={href(page + 1)}>siguientes →</Link> : <span />}
          </nav>}
          </>}
        </section>
      </div>
    </main>
  );
}
