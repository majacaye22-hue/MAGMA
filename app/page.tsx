"use client";

import { useState } from "react";
import Link from "next/link";
import { ArtCard, type CardData } from "./components/card-art";

const FILTERS = ["todo", "arte", "música", "fotografía", "eventos"] as const;
type Filter = (typeof FILTERS)[number];
type CardType = "arte" | "música" | "foto" | "evento";

const FILTER_MAP: Record<Filter, CardType | null> = {
  todo: null,
  arte: "arte",
  música: "música",
  fotografía: "foto",
  eventos: "evento",
};

const CARDS: CardData[] = [
  { id: 1, title: "Volcán Interior",    author: "@lux_mendez",        initials: "LM", upvotes: 847,  type: "arte",   colSpan: 2, rowSpan: 2 },
  { id: 2, title: "Frecuencia 432",     author: "@sonoraoscura",      initials: "SO", upvotes: 312,  type: "música", colSpan: 1, rowSpan: 1 },
  { id: 3, title: "Tlatelolco 4am",     author: "@crisnieto_foto",    initials: "CN", upvotes: 529,  type: "foto",   colSpan: 1, rowSpan: 2, location: "TLATELOLCO · 04:00" },
  { id: 4, title: "Raíz Negra",         author: "@itzelmx",           initials: "IX", upvotes: 203,  type: "arte",   colSpan: 1, rowSpan: 1 },
  { id: 5, title: "Noche de Feria",     author: "@labruja_colectivo", initials: "LB", upvotes: 1204, type: "evento", colSpan: 2, rowSpan: 1 },
  { id: 6, title: "Estática",           author: "@ruido_blanco",      initials: "RB", upvotes: 418,  type: "música", colSpan: 1, rowSpan: 1 },
  { id: 7, title: "Mercado de Sombras", author: "@ojo.tercer.cdmx",   initials: "OT", upvotes: 673,  type: "foto",   colSpan: 1, rowSpan: 2, location: "LA MERCED · NOCHE" },
  { id: 8, title: "Ceniza y Oro",       author: "@paloma_fuerte",     initials: "PF", upvotes: 391,  type: "arte",   colSpan: 2, rowSpan: 1 },
  { id: 9, title: "Apertura Colectiva", author: "@espacio_rojo_mx",   initials: "ER", upvotes: 956,  type: "evento", colSpan: 1, rowSpan: 1 },
];

function MagmaLogo() {
  return (
    <span style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }} className="text-2xl tracking-tight select-none">
      {"MAGMA".split("").map((l, i) =>
        l === "A"
          ? <span key={i} style={{ color: "#D85A30" }}>{l}</span>
          : <span key={i} style={{ color: "#e8e4dc" }}>{l}</span>
      )}
    </span>
  );
}

export default function Home() {
  const [active, setActive] = useState<Filter>("todo");

  const visible = CARDS.filter((c) => {
    const mapped = FILTER_MAP[active];
    return mapped === null || c.type === mapped;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: "rgba(12,12,11,0.92)", borderColor: "#2a2a28", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <MagmaLogo />
          <div className="flex items-center gap-6">
            <Link href="/upload" className="text-xs" style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>
              subir obra
            </Link>
            <div
              className="flex items-center justify-center text-xs font-bold cursor-pointer"
              style={{ width: "28px", height: "28px", borderRadius: "2px", backgroundColor: "#D85A30", color: "#0c0c0b", fontFamily: "var(--font-syne), sans-serif" }}
            >
              M
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex flex-wrap gap-2 py-6">
          {FILTERS.map((f) => {
            const isActive = f === active;
            return (
              <button
                key={f}
                onClick={() => setActive(f)}
                className="px-4 py-1.5 text-xs tracking-widest uppercase border transition-colors duration-150 cursor-pointer"
                style={{
                  fontFamily: "var(--font-space-mono), monospace",
                  borderColor: isActive ? "#D85A30" : "#2a2a28",
                  color: isActive ? "#0c0c0b" : "#888780",
                  backgroundColor: isActive ? "#D85A30" : "transparent",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3" style={{ gridAutoRows: "280px", gridAutoFlow: "dense" }}>
          {visible.map((card) => (
            <ArtCard key={card.id} card={card} />
          ))}
        </div>

        {visible.length === 0 && (
          <div className="py-24 text-center text-xs tracking-widest uppercase" style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>
            sin resultados
          </div>
        )}
      </main>
    </div>
  );
}
