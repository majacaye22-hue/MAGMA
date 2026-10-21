"use client";

import { useMemo, useState } from "react";
import { FlyerCard } from "@/app/components/FlyerCard";
import { eventUnavailable } from "@/lib/event-management";
import { EVENT_DETAILS_ENABLED, EVENT_CATEGORIES, eventFinished } from "@/lib/event-details";
import { eventDay, type EventPreview as Post } from "@/lib/event-preview";

const mono = "var(--font-space-mono), monospace";
const searchText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
function FilterIcon({ kind }: { kind: "date" | "place" | "access" | "filters" }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {kind === "date" ? <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 11h18" /></> : kind === "place" ? <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></> : kind === "access" ? <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M9 6v12" /></> : <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></>}
  </svg>;
}

function FilterSelect({ label, kind, value, onChange, children }: { label: string; kind: "date" | "place" | "access"; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="flex min-h-11 min-w-0 items-center gap-2 border border-[#49463f] px-3 text-sm" style={{ color: value === "todo" ? "var(--magma-ash)" : "var(--magma-red)", fontFamily: mono }}>
    <FilterIcon kind={kind} /><span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)} className="min-h-11 min-w-0 flex-1 bg-[var(--magma-obsidian)] focus-visible:outline-2 focus-visible:outline-[var(--magma-red)]">
      {children}
    </select>
  </label>;
}
type Wall = "muro" | "archivo";
type DayFilter = "todo" | "hoy" | "semana" | "próximos";

function eventState(post: Post, now: number) {
  if (!post.event_date) return "sin-fecha" as const;
  const starts = new Date(post.event_date).getTime();
  if (eventFinished(post, now)) return "archivo" as const;
  return starts > now ? "próximo" as const : "sala" as const;
}

function sortForWall(a: Post, b: Post, now: number) {
  const order = { sala: 0, próximo: 1, "sin-fecha": 2, archivo: 3 } as const;
  const stateDifference = order[eventState(a, now)] - order[eventState(b, now)];
  if (stateDifference !== 0) return stateDifference;
  if (!a.event_date || !b.event_date) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
}

function startOfToday(now: number) {
  return new Date(`${eventDay(now)}T00:00:00-06:00`).getTime();
}

function isInDayFilter(post: Post, filter: DayFilter, now: number) {
  if (filter === "todo") return true;
  if (eventUnavailable(post)) return false;
  if (!post.event_date) return false;
  const start = new Date(post.event_date).getTime();
  const end = post.event_end_date ? Date.parse(post.event_end_date) : new Date(`${eventDay(post.event_date)}T00:00:00-06:00`).getTime() + 24 * 60 * 60 * 1000;
  const today = startOfToday(now);
  const weekEnd = today + 7 * 24 * 60 * 60 * 1000;
  if (filter === "hoy") return end > today && start < today + 24 * 60 * 60 * 1000;
  if (filter === "semana") return end > today && start < weekEnd;
  return start > now;
}

const KNOWN_COLONIAS = [
  "San Rafael",
  "Roma Norte",
  "Roma Sur",
  "Condesa",
  "Juárez",
  "Centro Histórico",
  "Centro",
  "Doctores",
  "Santa María la Ribera",
  "Escandón",
  "Narvarte",
  "San Pedro de los Pinos",
  "Coyoacán",
  "Iztapalapa",
];

function eventColonia(post: Post) {
  const placeText = `${post.address ?? ""} ${post.venue ?? ""}`.toLowerCase();
  return KNOWN_COLONIAS.find((colonia) => placeText.includes(colonia.toLowerCase())) ?? "sin colonia";
}

function WallButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active}
      className="border-0 transition-colors hover:!text-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--magma-red)]"
      onClick={onClick}
      style={{
        borderRadius: 0,
        background: "transparent",
        color: active ? "var(--magma-red)" : "var(--magma-muted)",
        cursor: "pointer",
        fontFamily: mono,
        fontSize: "var(--magma-text-small)",
        minHeight: "44px",
        padding: "8px 0",
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
}

export function EventosClient({ eventos, now }: { eventos: (Post & { body?: string | null })[]; now: number }) {
  const [search, setSearch] = useState("");
  const [wall, setWall] = useState<Wall>("muro");
  const [day, setDay] = useState<DayFilter>("todo");
  const [colonia, setColonia] = useState("todo");
  const [access, setAccess] = useState<"todo" | "gratis" | "pago">("todo");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("todo");
  const activeFilters = Number(day !== "todo") + Number(colonia !== "todo") + Number(access !== "todo") + Number(category !== "todo");
  const hasFilters = activeFilters > 0 || search !== "" || wall !== "muro";
  function clearFilters() {
    setSearch(""); setWall("muro"); setDay("todo"); setColonia("todo"); setAccess("todo");
    setCategory("todo");
  }
  const eventList = eventos;
  const colonias = useMemo(() => [...new Set(eventList.map(eventColonia))].filter((item) => item !== "sin colonia").sort((a, b) => a.localeCompare(b, "es")), [eventList]);
  const visible = useMemo(() => {
    const sorted = [...eventList].sort((a, b) => sortForWall(a, b, now));
    return sorted.filter((post) => {
      const terms = searchText(search).trim().split(/\s+/).filter(Boolean);
      const haystack = searchText([post.title, post.body, post.venue, post.address].filter(Boolean).join(" "));
      if (!terms.every(term => haystack.includes(term))) return false;
      if (wall === "archivo" && eventState(post, now) !== "archivo") return false;
      if (!isInDayFilter(post, day, now)) return false;
      if (access === "gratis" && post.is_free !== true) return false;
      if (access === "pago" && post.is_free !== false) return false;
      if (category !== "todo" && post.event_category !== category) return false;
      return colonia === "todo" || eventColonia(post) === colonia;
    });
  }, [access, colonia, day, category, eventList, wall, now, search]);

  return (
    <section className="pt-3 md:pt-4">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="search" className="flex min-h-11 w-full items-center rounded-[2px] border border-[#49463f] sm:w-64 focus-within:border-[var(--magma-red)]">
          <input type="search" aria-label="buscar eventos" placeholder="buscar eventos…" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white focus:outline-none" />
          {search && <button type="button" aria-label="limpiar búsqueda" onClick={() => setSearch("")} className="h-11 w-11 shrink-0 text-white focus-visible:outline-2 focus-visible:outline-[var(--magma-red)]">×</button>}
        </div>
        <button type="button" aria-expanded={filtersOpen} aria-controls="event-filters" onClick={() => setFiltersOpen(!filtersOpen)} className="flex min-h-11 items-center gap-2 border border-[#49463f] px-3 text-sm text-white md:hidden">
          <FilterIcon kind="filters" /> filtros{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
        <div id="event-filters" role="region" aria-label="filtros de cartelera" className={`${filtersOpen ? "flex" : "hidden"} w-full flex-col gap-2 md:flex md:w-auto md:flex-row md:flex-wrap`}>
          <FilterSelect label="cuándo" kind="date" value={day} onChange={value => setDay(value as DayFilter)}>
            <option value="todo">cualquier día</option><option value="hoy">hoy</option><option value="semana">esta semana</option><option value="próximos">próximos</option>
          </FilterSelect>
          <FilterSelect label="colonia" kind="place" value={colonia} onChange={setColonia}>
            <option value="todo">cualquier colonia</option>{colonias.map(item => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="acceso" kind="access" value={access} onChange={value => setAccess(value as "todo" | "gratis" | "pago")}>
            <option value="todo">todos</option><option value="gratis">entrada libre</option><option value="pago">con costo</option>
          </FilterSelect>
          {EVENT_DETAILS_ENABLED && <FilterSelect label="categoría" kind="access" value={category} onChange={setCategory}>
            <option value="todo">todas</option>{EVENT_CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>}
        </div>
        {hasFilters && <button type="button" onClick={clearFilters} className="min-h-11 text-sm text-[var(--magma-red)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--magma-red)]">limpiar filtros</button>}
        <div role="group" aria-label="vista de cartelera" className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-0">
          <WallButton active={wall === "muro"} onClick={() => setWall("muro")}>muro completo</WallButton>
          <WallButton active={wall === "archivo"} onClick={() => setWall("archivo")}>archivo</WallButton>
        </div>
        </div>
      {visible.length === 0 ? (
        <div className="rounded-[2px]" style={{ background: "transparent", border: "1px solid #49463f", color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", padding: "40px 24px", textAlign: "center" }}>
          no encontramos carteles con esos filtros
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((post, index) => (
            <div
              key={post.id}
              className="break-inside-avoid"
            >
              <FlyerCard post={post} state={eventState(post, now)} now={now} eager={index === 0} />
            </div>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
