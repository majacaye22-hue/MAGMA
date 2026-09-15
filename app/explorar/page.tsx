import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Feed } from "@/app/components/feed";
import type { Post } from "@/app/components/card-art";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";
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

function ViewLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className="border px-4 py-2 text-[10px] uppercase tracking-[0.12em]" style={{ background: active ? "#D85A30" : "transparent", borderColor: active ? "#D85A30" : "#2a2a28", color: active ? "#0c0c0b" : "#888780", fontFamily: mono, textDecoration: "none" }}>{children}</Link>;
}

export default async function ExplorarPage({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string; pagina?: string }> }) {
  const params = await searchParams;
  const view: View = params.vista === "hoy" || params.vista === "archivo" ? params.vista : "reciente";
  const today = cdmxDateString();
  const selectedDate = params.fecha && DATE_RE.test(params.fecha) && params.fecha <= today ? params.fecha : today;
  const page = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);
  const supabase = await createClient();
  let query = supabase.from("posts").select("*, profiles!posts_author_id_fkey(username, display_name)", { count: "exact" }).order("created_at", { ascending: false });

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
    <main className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <header className="grid gap-7 py-12 md:grid-cols-[1.2fr_0.8fr] md:items-end" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <div>
            <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.16em", marginBottom: "12px", textTransform: "uppercase" }}>explorar la ciudad</p>
            <h1 style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "clamp(42px, 7vw, 78px)", fontWeight: 800, letterSpacing: "-0.06em", lineHeight: 0.92 }}>el archivo vivo</h1>
          </div>
          <p style={{ color: "#888780", fontFamily: mono, fontSize: "11px", lineHeight: 1.7 }}>Poemas, imágenes, sonidos, discusiones, procesos y señales compartidas desde distintos rincones de la Ciudad de México. Sin algoritmo y sin desplazamiento infinito.</p>
        </header>

        <div className="flex flex-wrap items-center gap-2 py-5" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <ViewLink href="/explorar" active={view === "reciente"}>reciente</ViewLink>
          <ViewLink href="/explorar?vista=hoy" active={view === "hoy"}>hoy</ViewLink>
          <ViewLink href={`/explorar?vista=archivo&fecha=${selectedDate}`} active={view === "archivo"}>archivo</ViewLink>
          {view === "archivo" && <form action="/explorar" className="ml-auto flex items-center gap-2"><input type="hidden" name="vista" value="archivo" /><input name="fecha" type="date" defaultValue={selectedDate} max={today} aria-label="Elegir fecha" style={{ background: "#0c0c0b", border: "0.5px solid #2a2a28", color: "#888780", fontFamily: mono, fontSize: "10px", padding: "8px 10px" }} /><button type="submit" style={{ background: "transparent", border: "none", color: "#D85A30", cursor: "pointer", fontFamily: mono, fontSize: "10px", textTransform: "uppercase" }}>abrir →</button></form>}
        </div>

        {view !== "reciente" && <nav className="flex flex-wrap items-center justify-between gap-4 py-5" aria-label="Navegar por fechas"><Link href={`/explorar?vista=archivo&fecha=${shiftDate(date, -1)}`} style={{ color: "#888780", fontFamily: mono, fontSize: "10px", textDecoration: "none" }}>← día anterior</Link><p style={{ color: "#e8e4dc", fontFamily: mono, fontSize: "11px" }}>{displayDate(date)} · {posts.length} señal{posts.length === 1 ? "" : "es"}</p>{date === today ? <span style={{ color: "#2a2a28", fontFamily: mono, fontSize: "10px" }}>día siguiente →</span> : <Link href={shiftDate(date, 1) === today ? "/explorar?vista=hoy" : `/explorar?vista=archivo&fecha=${shiftDate(date, 1)}`} style={{ color: "#888780", fontFamily: mono, fontSize: "10px", textDecoration: "none" }}>día siguiente →</Link>}</nav>}
        {view === "reciente" && <p className="py-5" style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" }}>{count ?? posts.length} señales · página {page} de {totalPages}</p>}

        <Feed posts={posts} showFilters={view === "reciente"} emptyMessage={view === "reciente" ? "el archivo todavía está en blanco" : "esta edición quedó en blanco"} />

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-5" style={{ borderColor: "#2a2a28" }}>
          <div className="flex gap-5">{view === "reciente" && page > 1 && <Link href={page === 2 ? "/explorar" : `/explorar?pagina=${page - 1}`} style={{ color: "#888780", fontFamily: mono, fontSize: "10px" }}>← más recientes</Link>}{view === "reciente" && page < totalPages && <Link href={`/explorar?pagina=${page + 1}`} style={{ color: "#888780", fontFamily: mono, fontSize: "10px" }}>publicaciones anteriores →</Link>}</div>
          <Link href="/upload" style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>compartir algo →</Link>
        </footer>
      </div>
    </main>
  );
}
