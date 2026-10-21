import Link from "next/link";
import { redirect } from "next/navigation";
import { feedHref, postsForFeed } from "@/lib/circle-feed";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase-server";
import { Feed } from "@/app/components/feed";
import type { Post } from "@/app/components/card-art";

const mono = "var(--font-space-mono), monospace";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 24;
type View = "reciente" | "hoy" | "archivo";
function cdmxDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDate(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00-06:00`);
  value.setUTCDate(value.getUTCDate() + amount);
  return cdmxDateString(value);
}

function dateRange(date: string) {
  const start = new Date(`${date}T00:00:00-06:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function displayDate(date: string) {
  return new Date(`${date}T12:00:00-06:00`).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default async function ExplorarPage({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string; pagina?: string; feed?: string }> }) {
  const params = await searchParams;
  const view: View = params.vista === "hoy" || params.vista === "archivo" ? params.vista : "reciente";
  const today = cdmxDateString();
  const selectedDate = params.fecha && DATE_RE.test(params.fecha) && params.fecha <= today ? params.fecha : today;
  const page = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);
  const supabase = await createClient();
  const circle = params.feed === "circulo";
  let owner: string | undefined;
  if (circle) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect("/auth/login?redirectTo=" + encodeURIComponent("/?feed=circulo"));
    owner = user.id;
  }
  const href = (path: string) => feedHref(path, circle);
  let query = postsForFeed(supabase, owner);

  if (view === "reciente") query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  else {
    const range = dateRange(view === "hoy" ? today : selectedDate);
    query = query.gte("created_at", range.start).lt("created_at", range.end);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`No se pudo abrir el archivo: ${error.message}`);
  const posts = (data ?? []) as Post[];
  const totalPages = Math.max(1, Math.ceil((count ?? posts.length) / PAGE_SIZE));
  const date = view === "hoy" ? today : selectedDate;
  return (
    <main
      className="min-h-screen w-full"
      style={{
        "--magma-rock": "#151519",
        "--magma-cobalt": "#731c14",
        "--magma-border": "#302f35",
        backgroundColor: "var(--magma-obsidian)",
        backgroundImage: "radial-gradient(ellipse at 1% 8%, rgba(115,28,20,0.045), transparent 14%), radial-gradient(ellipse at 98% 38%, rgba(115,28,20,0.025), transparent 11%), radial-gradient(circle at 62% 76%, rgba(16,43,102,0.025), transparent 15%)",
      } as CSSProperties}
    >
      <div className="w-full px-4 pb-20 md:px-6">
        <h1 className="sr-only">explorar</h1>

        {circle && posts.length === 0 && <p className="mt-4 text-sm text-white">no hay publicaciones de tu círculo en esta vista. añade personas desde sus perfiles o prueba otra fecha.</p>}

        {view !== "reciente" && <nav className="flex flex-wrap items-center justify-between gap-4 py-5" aria-label="Navegar por fechas"><Link href={href(`/?vista=archivo&fecha=${shiftDate(date, -1)}`)} style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", textDecoration: "none" }}>← día anterior</Link><p style={{ color: "#F2F4F8", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>{displayDate(date)} · {posts.length} señal{posts.length === 1 ? "" : "es"}</p>{date === today ? <span style={{ color: "#2a2a28", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>día siguiente →</span> : <Link href={href(shiftDate(date, 1) === today ? "/?vista=hoy" : `/?vista=archivo&fecha=${shiftDate(date, 1)}`)} style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", textDecoration: "none" }}>día siguiente →</Link>}</nav>}

        <div className="pt-3 md:pt-7 lg:pr-[88px]">
          {view === "reciente" && page === 1 && (
            <div className="mb-3 md:ml-[88px]">
            <nav aria-label="compartir en magma" className="mx-auto flex w-full max-w-[680px] min-w-0 items-center gap-1 rounded-[2px] border border-[#49463f] bg-transparent p-1">
              <Link href="/upload" className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-1 rounded-[2px] px-3 py-2 text-white transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[var(--magma-red)]">
                <span className="text-sm">¿qué traes hoy?</span>
              </Link>
              <Link href="/upload" className="flex min-h-11 shrink-0 items-center gap-2 rounded-[2px] border border-[var(--magma-red)] bg-[var(--magma-red)] px-3 text-sm text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--magma-red)]">compartir <span aria-hidden="true">→</span></Link>
            </nav>
            </div>
          )}
          <section style={{ minWidth: 0 }}>
            <Feed posts={posts} showFilters={view === "reciente"} layout="editorial" filterPlacement="left" archiveNav={{ circle, view, selectedDate, today, count: view === "reciente" ? (count ?? posts.length) : posts.length, page, totalPages }} emptyMessage={circle ? "tu círculo, a tu ritmo" : view === "reciente" ? "el archivo todavía está en blanco" : "esta edición quedó en blanco"} />
          </section>

        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-5" style={{ borderColor: "var(--magma-border)" }}>
          <div className="flex gap-5">{view === "reciente" && page > 1 && <Link href={href(page === 2 ? "/" : `/?pagina=${page - 1}`)} style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>← más recientes</Link>}{view === "reciente" && page < totalPages && <Link href={href(`/?pagina=${page + 1}`)} style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>publicaciones anteriores →</Link>}</div>
          <Link href="/upload" style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.1em", textTransform: "uppercase" }}>compartir algo →</Link>
        </footer>
      </div>
    </main>
  );
}
