"use client";

import { useState, useMemo } from "react";
import { FlyerCard } from "@/app/components/FlyerCard";
import type { Post } from "@/app/components/card-art";

const mono = "var(--font-space-mono), monospace";

type DateFilter = "todos" | "hoy" | "semana" | "mes";
type PrecioFilter = "todos" | "gratis" | "paga";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isInDateRange(post: Post, filter: DateFilter): boolean {
  if (filter === "todos") return true;
  if (!post.event_date) return false;
  const eventDay = startOfDay(new Date(post.event_date));
  const today = startOfDay(new Date());
  if (filter === "hoy") {
    return eventDay.getTime() === today.getTime();
  }
  if (filter === "semana") {
    const end = new Date(today); end.setDate(today.getDate() + 7);
    return eventDay >= today && eventDay <= end;
  }
  if (filter === "mes") {
    const end = new Date(today); end.setDate(today.getDate() + 30);
    return eventDay >= today && eventDay <= end;
  }
  return true;
}

function matchesColonia(post: Post, colonia: string): boolean {
  if (!colonia.trim()) return true;
  const q = colonia.trim().toLowerCase();
  return (
    (post.venue?.toLowerCase().includes(q) ?? false) ||
    (post.address?.toLowerCase().includes(q) ?? false)
  );
}

function matchesPrecio(post: Post, precio: PrecioFilter): boolean {
  if (precio === "todos") return true;
  if (precio === "gratis") return post.is_free === true;
  if (precio === "paga") return post.is_free === false;
  return true;
}

// ─── Pill toggle ─────────────────────────────────────────────────────────────

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer transition-colors duration-100"
      style={{
        fontFamily: mono,
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        padding: "4px 10px",
        border: `0.5px solid ${active ? "#D85A30" : "#2a2a28"}`,
        backgroundColor: active ? "rgba(216,90,48,0.08)" : "transparent",
        color: active ? "#D85A30" : "#5F5E5A",
      }}
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventosClient({ eventos }: { eventos: Post[] }) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("todos");
  const [coloniaInput, setColoniaInput] = useState("");
  const [precioFilter, setPrecioFilter] = useState<PrecioFilter>("todos");

  const filtered = useMemo(() => {
    return eventos.filter(
      (p) =>
        isInDateRange(p, dateFilter) &&
        matchesColonia(p, coloniaInput) &&
        matchesPrecio(p, precioFilter)
    );
  }, [eventos, dateFilter, coloniaInput, precioFilter]);

  const hasActiveFilter =
    dateFilter !== "todos" || coloniaInput.trim() !== "" || precioFilter !== "todos";

  return (
    <>
      {/* Filter bar */}
      <div
        className="flex flex-wrap items-end gap-6 pb-6"
        style={{ borderBottom: "0.5px solid #2a2a28", marginBottom: "24px" }}
      >
        {/* Date */}
        <div className="flex flex-col gap-2">
          <span style={{ fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#444441" }}>
            fecha
          </span>
          <div className="flex gap-1">
            {(["todos", "hoy", "semana", "mes"] as DateFilter[]).map((v) => (
              <Pill
                key={v}
                label={v === "semana" ? "esta semana" : v === "mes" ? "este mes" : v}
                active={dateFilter === v}
                onClick={() => setDateFilter(v)}
              />
            ))}
          </div>
        </div>

        {/* Colonia */}
        <div className="flex flex-col gap-2">
          <span style={{ fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#444441" }}>
            colonia / lugar
          </span>
          <input
            type="text"
            placeholder="ej. roma, tepito..."
            value={coloniaInput}
            onChange={(e) => setColoniaInput(e.target.value)}
            style={{
              fontFamily: mono,
              fontSize: "11px",
              color: "#e8e4dc",
              backgroundColor: "#141412",
              border: "0.5px solid #2a2a28",
              outline: "none",
              padding: "4px 10px",
              width: "180px",
            }}
            className="focus:outline-none placeholder:text-[#444441]"
          />
        </div>

        {/* Precio */}
        <div className="flex flex-col gap-2">
          <span style={{ fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#444441" }}>
            precio
          </span>
          <div className="flex gap-1">
            {(["todos", "gratis", "paga"] as PrecioFilter[]).map((v) => (
              <Pill
                key={v}
                label={v === "paga" ? "de paga" : v}
                active={precioFilter === v}
                onClick={() => setPrecioFilter(v)}
              />
            ))}
          </div>
        </div>

        {/* Clear */}
        {hasActiveFilter && (
          <button
            onClick={() => { setDateFilter("todos"); setColoniaInput(""); setPrecioFilter("todos"); }}
            className="cursor-pointer hover:opacity-70 self-end"
            style={{ fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#444441", background: "none", border: "none", padding: "4px 0", marginBottom: "1px" }}
          >
            limpiar ×
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="py-24 text-center text-xs tracking-widest uppercase"
          style={{ color: "#444441", fontFamily: mono }}
        >
          {eventos.length === 0
            ? "sin eventos próximos — sé el primero en publicar"
            : "sin resultados para estos filtros"}
        </div>
      ) : (
        <div
          style={{ columnGap: "8px" }}
          className="[column-count:1] sm:[column-count:2] lg:[column-count:3]"
        >
          {filtered.map((post) => (
            <FlyerCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  );
}
