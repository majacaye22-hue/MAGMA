"use client";

import { useMemo, useState } from "react";
import { FlyerCard } from "@/app/components/FlyerCard";
import { eventDay, type EventPreview as Post } from "@/lib/event-preview";

const mono = "var(--font-space-mono), monospace";
const searchText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
const filterHeading = { color: "#fff", fontFamily: mono, fontSize: "14px", letterSpacing: ".06em", marginBottom: "4px" };
type Wall = "muro" | "archivo";
type DayFilter = "todo" | "hoy" | "semana" | "próximos";

function eventState(post: Post, now: number) {
  if (!post.event_date) return "sin-fecha" as const;
  const starts = new Date(post.event_date).getTime();
  if (now >= starts - 48 * 60 * 60 * 1000 && now <= starts + 72 * 60 * 60 * 1000) return "sala" as const;
  return starts > now ? "próximo" as const : "archivo" as const;
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
  if (!post.event_date) return false;
  const start = new Date(post.event_date).getTime();
  const today = startOfToday(now);
  const weekEnd = today + 7 * 24 * 60 * 60 * 1000;
  if (filter === "hoy") return start >= today && start < today + 24 * 60 * 60 * 1000;
  if (filter === "semana") return start >= today && start < weekEnd;
  return start >= today;
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
      return colonia === "todo" || eventColonia(post) === colonia;
    });
  }, [access, colonia, day, eventList, wall, now, search]);

  return (
    <section className="grid items-start gap-5 pt-3 md:pt-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-6">
      <div role="region" aria-label="filtros de cartelera" className="min-w-0 lg:sticky lg:top-24">
      <div className="flex flex-wrap items-start gap-6 lg:flex-col lg:items-stretch">
        <div>
          <p style={filterHeading}>cuándo</p>
          <div role="group" aria-label="cuándo" className="flex flex-wrap gap-x-4 gap-y-0 lg:flex-col lg:items-start">
            {(["todo", "hoy", "semana", "próximos"] as DayFilter[]).map((filter) => (
              <WallButton key={filter} active={day === filter} onClick={() => setDay(filter)}>{filter === "todo" ? "cualquier día" : filter === "semana" ? "esta semana" : filter}</WallButton>
            ))}
          </div>
        </div>
        <label>
          <span style={{ ...filterHeading, display: "block" }}>colonia</span>
          <select value={colonia} onChange={(event) => setColonia(event.target.value)} className="border-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--magma-red)]" style={{ background: "var(--magma-obsidian)", borderRadius: 0, color: colonia === "todo" ? "#fff" : "var(--magma-red)", fontFamily: mono, fontSize: "var(--magma-text-small)", width: "180px", maxWidth: "100%", minHeight: "44px", padding: "8px 0" }}>
            <option value="todo">cualquier colonia</option>
            {colonias.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div>
          <p style={filterHeading}>acceso</p>
          <div role="group" aria-label="acceso" className="flex flex-wrap gap-x-4 gap-y-0 lg:flex-col lg:items-start">
            <WallButton active={access === "todo"} onClick={() => setAccess("todo")}>todos</WallButton>
            <WallButton active={access === "gratis"} onClick={() => setAccess("gratis")}>entrada libre</WallButton>
            <WallButton active={access === "pago"} onClick={() => setAccess("pago")}>con costo</WallButton>
          </div>
        </div>
      </div>
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="search" className="flex min-h-11 w-full items-center rounded-[2px] border border-[#49463f] sm:w-64 focus-within:border-[var(--magma-red)]">
          <input type="search" aria-label="buscar eventos" placeholder="buscar eventos…" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white focus:outline-none" />
          {search && <button type="button" aria-label="limpiar búsqueda" onClick={() => setSearch("")} className="h-11 w-11 shrink-0 text-white focus-visible:outline-2 focus-visible:outline-[var(--magma-red)]">×</button>}
        </div>
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
        <div className="grid min-w-0 grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
