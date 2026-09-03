"use client";

import { useEffect, useMemo, useState } from "react";
import { FlyerCard } from "@/app/components/FlyerCard";
import type { Post } from "@/app/components/card-art";

const mono = "var(--font-space-mono), monospace";
type Wall = "muro" | "sala" | "archivo";
type DayFilter = "todo" | "hoy" | "semana" | "próximos";

function eventState(post: Post) {
  if (!post.event_date) return "sin-fecha" as const;
  const now = Date.now();
  const starts = new Date(post.event_date).getTime();
  if (now >= starts - 48 * 60 * 60 * 1000 && now <= starts + 72 * 60 * 60 * 1000) return "sala" as const;
  return starts > now ? "próximo" as const : "archivo" as const;
}

function sortForWall(a: Post, b: Post) {
  const order = { sala: 0, próximo: 1, "sin-fecha": 2, archivo: 3 } as const;
  const stateDifference = order[eventState(a)] - order[eventState(b)];
  if (stateDifference !== 0) return stateDifference;
  if (!a.event_date || !b.event_date) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function isInDayFilter(post: Post, filter: DayFilter) {
  if (filter === "todo") return true;
  if (!post.event_date) return false;
  const start = new Date(post.event_date).getTime();
  const today = startOfToday();
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
    <button
      onClick={onClick}
      style={{
        border: "0.5px solid " + (active ? "#D85A30" : "#2a2a28"),
        background: active ? "#D85A30" : "transparent",
        color: active ? "#0c0c0b" : "#888780",
        cursor: "pointer",
        fontFamily: mono,
        fontSize: "10px",
        letterSpacing: "0.11em",
        padding: "7px 10px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </button>
  );
}

export function EventosClient() {
  const [eventos, setEventos] = useState<Post[] | null>(null);
  const [wall, setWall] = useState<Wall>("muro");
  const [day, setDay] = useState<DayFilter>("todo");
  const [colonia, setColonia] = useState("todo");
  useEffect(() => {
    async function load() {
      const response = await fetch("/api/events", { cache: "no-store" });
      if (!response.ok) { setEventos([]); return; }
      const data = await response.json() as { events: Post[] };
      setEventos(data.events);
    }
    void load();
  }, []);
  const eventList = useMemo(() => eventos ?? [], [eventos]);
  const colonias = useMemo(() => [...new Set(eventList.map(eventColonia))].filter((item) => item !== "sin colonia").sort((a, b) => a.localeCompare(b, "es")), [eventList]);
  const visible = useMemo(() => {
    const sorted = [...eventList].sort(sortForWall);
    return sorted.filter((post) => {
      if (wall === "sala" && eventState(post) !== "sala") return false;
      if (wall === "archivo" && eventState(post) !== "archivo") return false;
      if (!isInDayFilter(post, day)) return false;
      return colonia === "todo" || eventColonia(post) === colonia;
    });
  }, [colonia, day, eventList, wall]);

  const salaCount = eventList.filter((post) => eventState(post) === "sala").length;
  const rotations = [-0.6, 0.35, -0.25, 0.55, -0.4, 0.2];

  return (
    <section className="pt-7">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div className="flex flex-wrap gap-1.5">
          <WallButton active={wall === "muro"} onClick={() => setWall("muro")}>muro completo</WallButton>
          <WallButton active={wall === "sala"} onClick={() => setWall("sala")}>
            salas abiertas{ salaCount ? ` · ${salaCount}` : "" }
          </WallButton>
          <WallButton active={wall === "archivo"} onClick={() => setWall("archivo")}>archivo</WallButton>
        </div>
        <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px", letterSpacing: "0.06em" }}>
          {eventos === null ? "pegando carteles..." : `${visible.length} cartel${visible.length === 1 ? "" : "es"} pegado${visible.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pb-6" style={{ borderBottom: "0.5px solid #2a2a28", marginBottom: "18px" }}>
        <div>
          <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "9px", letterSpacing: "0.13em", marginBottom: "7px", textTransform: "uppercase" }}>cuándo</p>
          <div className="flex flex-wrap gap-1.5">
            {(["todo", "hoy", "semana", "próximos"] as DayFilter[]).map((filter) => (
              <WallButton key={filter} active={day === filter} onClick={() => setDay(filter)}>{filter === "todo" ? "cualquier día" : filter === "semana" ? "esta semana" : filter}</WallButton>
            ))}
          </div>
        </div>
        <label>
          <span style={{ color: "#5F5E5A", display: "block", fontFamily: mono, fontSize: "9px", letterSpacing: "0.13em", marginBottom: "7px", textTransform: "uppercase" }}>colonia</span>
          <select value={colonia} onChange={(event) => setColonia(event.target.value)} style={{ background: "#141412", border: "0.5px solid #2a2a28", color: "#e8e4dc", fontFamily: mono, fontSize: "10px", minWidth: "190px", padding: "8px 10px" }}>
            <option value="todo">cualquier colonia</option>
            {colonias.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div style={{ border: "0.5px dashed #2a2a28", color: "#5F5E5A", fontFamily: mono, fontSize: "11px", padding: "72px 24px", textAlign: "center" }}>
          {wall === "sala" ? "todavía no hay una sala abierta · vuelve cuando un evento esté por comenzar" : "no encontramos carteles con esos filtros"}
        </div>
      ) : (
        <div className="[column-count:1] sm:[column-count:2] lg:[column-count:3]" style={{ columnGap: "12px" }}>
          {visible.map((post, index) => (
            <div
              key={post.id}
              className="break-inside-avoid"
              style={{ transform: `rotate(${rotations[index % rotations.length]}deg)`, transition: "transform 180ms ease" }}
            >
              <FlyerCard post={post} state={eventState(post)} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
