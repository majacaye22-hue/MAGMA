import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { normalizeSearch, searchFilter } from "@/lib/search";
import styles from "./colectivos.module.css";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Colectivo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_color: string;
  cover_image_url: string | null;
  is_private: boolean;
  colectivo_members: { count: number }[];
  colectivo_posts: { count: number }[];
};

function ColectivoCard({ col }: { col: Colectivo }) {
  const memberCount = col.colectivo_members?.[0]?.count ?? 0;

  return (
    <Link href={`/colectivos/${col.slug}`} className={styles.cardLink} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          backgroundColor: "#10100f",
          border: "1px solid #49463f",
          borderRadius: "2px",
          padding: "10px",
          height: "100%",
          overflow: "hidden",
          transition: "border-color 0.15s ease",
        }}
        className="group hover:border-[#FF641F]"
      >
        {/* Cover image or solid color fallback */}
        <div style={{ aspectRatio: "4 / 5", position: "relative", overflow: "hidden", backgroundColor: col.avatar_color }}>
          {col.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={col.cover_image_url}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(circle at 65% 35%, rgba(255,100,31,0.7), transparent 32%), linear-gradient(135deg, var(--magma-cobalt), var(--magma-red))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "48px", color: "var(--magma-ash)", fontFamily: syne, fontWeight: 800, opacity: 0.65, lineHeight: 1 }}>
                {col.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info row */}
        <div style={{ padding: "12px 2px 2px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <p style={{ fontSize: "16px", color: "#ffffff", fontFamily: syne, fontWeight: 700, lineHeight: 1.2, overflowWrap: "anywhere" }}>
                {col.name}
              </p>
            </div>
            {col.description && (
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {col.description}
              </p>
            )}
            <p style={{ fontSize: "11px", color: "#ffffff", fontFamily: mono, marginTop: "10px", paddingTop: "8px", letterSpacing: ".06em" }}>
              {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function ColectivosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = normalizeSearch(typeof params.q === "string" ? params.q : "");
  const mine = params.vista === "mios";
  const sort = params.orden === "nombre" || params.orden === "antiguos" ? params.orden : "recientes";
  const requested = Number(params.pagina ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 10000 ? requested : 1;
  const pageSize = 18;
  const supabase = await createClient();
  const user = mine ? (await supabase.auth.getUser()).data.user : null;
  let query = supabase
    .from("colectivos")
    .select(`
      id, name, slug, description, avatar_color, cover_image_url, is_private,
      colectivo_members(count),
      colectivo_posts(count)
    `, { count: "exact" })
    .eq("is_private", false);
  if (q) query = query.or(searchFilter(["name", "description"], q));
  if (mine) query = query.eq("created_by", user?.id ?? "00000000-0000-0000-0000-000000000000");
  const { data, error, count } = await query
    .order(sort === "nombre" ? "name" : "created_at", { ascending: sort !== "recientes" })
    .order("id")
    .range((page - 1) * pageSize, page * pageSize - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const href = (next: number) => `/colectivos?${new URLSearchParams({ q, vista: mine ? "mios" : "todos", orden: sort, pagina: String(next) })}`;

  const colectivos = (data ?? []) as unknown as Colectivo[];

  return (
    <div
      className={`min-h-screen ${styles.page}`}
      style={{
        backgroundColor: "var(--magma-obsidian)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <header className="grid gap-4 py-5 md:py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>

            <h1 className="magma-page-title" style={{ color: "var(--magma-ash)", fontFamily: syne, fontWeight: 800, letterSpacing: "-0.055em", marginBottom: "8px" }}>
              colectivos
            </h1>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <Link
              href="/colectivos/crear"
              style={{
                fontSize: "var(--magma-text-small)",
                fontFamily: mono,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--magma-ash)",
                backgroundColor: "transparent",
                border: "1px solid var(--magma-red)",
                padding: "11px 18px",
                textDecoration: "none",
              }}
            >
              + crear colectivo
            </Link>
          </div>
        </header>

        <form action="/colectivos" aria-label="filtrar colectivos" className={`mt-4 flex flex-wrap items-end gap-3 pb-4 text-sm ${styles.filters}`}>
          <label className="flex min-w-0 flex-[2_1_220px] flex-col gap-1"><span className="text-xs">buscar colectivos</span><input type="search" name="q" defaultValue={q} maxLength={80} placeholder="nombre o descripción…" className="min-h-11 w-full rounded-md border border-white/20 bg-transparent px-3" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs">ver</span><select name="vista" defaultValue={mine ? "mios" : "todos"} className="min-h-11 rounded-md border border-white/20 bg-[var(--magma-obsidian)] px-3"><option value="todos">todos</option><option value="mios">creados por mí</option></select></label>
          <label className="flex flex-col gap-1"><span className="text-xs">ordenar</span><select name="orden" defaultValue={sort} className="min-h-11 rounded-md border border-white/20 bg-[var(--magma-obsidian)] px-3"><option value="recientes">más recientes</option><option value="antiguos">más antiguos</option><option value="nombre">nombre a–z</option></select></label>
          <button type="submit" className="min-h-11 rounded-md bg-[var(--magma-red)] px-4 text-white">aplicar</button>
          {(q || mine || sort !== "recientes") && <Link href="/colectivos" className="py-3 text-xs underline">limpiar</Link>}
        </form>
        {!error && <p className="mt-5 text-xs text-white/65">{count ?? 0} colectivos{colectivos.length > 0 ? ` · ${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + colectivos.length}` : ""}</p>}
        {error ? <div role="alert" className="py-8"><p>no se pudieron cargar los colectivos.</p><Link href={href(page)} className="underline">reintentar</Link></div> : colectivos.length === 0 && (q || mine || page > 1) ? <div className="py-12 text-sm">
          <p>{mine && !user ? "inicia sesión para ver los colectivos que has creado." : "no hay colectivos con estos filtros en esta página."}</p>
          {mine && !user && <Link href="/auth/login?redirectTo=%2Fcolectivos%3Fvista%3Dmios" className="mt-3 block underline">iniciar sesión</Link>}
          <Link href="/colectivos" className="mt-3 block text-[var(--magma-red)]">ver todos los colectivos →</Link>
        </div> : colectivos.length === 0 ? (
          <div className="mt-8 grid overflow-hidden rounded-xl md:grid-cols-[1fr_0.8fr]" style={{ backgroundColor: "var(--magma-rock)", border: "0.5px solid var(--magma-border)", boxShadow: "0 20px 60px rgba(115,28,20,0.24)" }}>
            <div style={{ padding: "clamp(34px, 7vw, 76px)" }}>
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "18px" }}>
                la mesa está abierta
              </p>
              <h2 style={{ color: "var(--magma-ash)", fontFamily: syne, fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1 }}>todavía no hay colectivos públicos</h2>
              <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.7, marginTop: "18px", maxWidth: "480px" }}>Empieza uno alrededor de una disciplina, un barrio, una investigación o una pregunta que no quieras trabajar a solas.</p>
              <Link href="/colectivos/crear" style={{ display: "inline-block", marginTop: "24px", fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, letterSpacing: "0.1em", textDecoration: "underline", textUnderlineOffset: "5px", textTransform: "uppercase" }}>
                formar el primero →
              </Link>
            </div>
            <div className="relative min-h-[260px]" style={{ background: "radial-gradient(circle at 50% 45%, rgba(255,100,31,0.55), transparent 20%), repeating-radial-gradient(circle at 50% 50%, transparent 0 34px, rgba(215,212,205,0.08) 35px 36px), var(--magma-cobalt)" }}>
              <span style={{ bottom: "24px", color: "rgba(215,212,205,0.55)", fontFamily: mono, fontSize: "var(--magma-text-small)", left: "24px", letterSpacing: "0.18em", position: "absolute", textTransform: "uppercase" }}>una señal se vuelve red</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {colectivos.map((col) => <ColectivoCard key={col.id} col={col} />)}
          </div>
        )}
        {!error && (totalPages > 1 || page > 1) && <nav aria-label="páginas de colectivos" className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm">
          {page > 1 ? <Link href={href(Math.min(page - 1, totalPages))} className="py-3 text-[var(--magma-red)]">← anteriores</Link> : <span />}
          <span>página {page} · {totalPages} en total</span>
          {page < totalPages ? <Link href={href(page + 1)} className="py-3 text-[var(--magma-red)]">siguientes →</Link> : <span />}
        </nav>}
      </div>
    </div>
  );
}
