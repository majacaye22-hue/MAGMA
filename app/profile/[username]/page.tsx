"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArtCard, type CardData } from "../../components/card-art";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "obras" | "debates" | "eventos" | "guardados";

interface Collaborator {
  name: string;
  handle: string;
  initials: string;
  discipline: string;
  avatarBg: string;
  avatarText: string;
}

interface ActivityItem {
  verb: string;
  target: string;
  time: string;
}

interface UpcomingEvent {
  title: string;
  date: string;
  venue: string;
  colonia: string;
}

interface Profile {
  name: string;
  handle: string;
  colonia: string;
  bio: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  disciplines: string[];
  stats: { obras: number; seguidores: number; siguiendo: number; debates: number };
  works: CardData[];
  activity: ActivityItem[];
  collaborators: Collaborator[];
  events: UpcomingEvent[];
}

// ─── Mock profile data ───────────────────────────────────────────────────────

const PROFILES: Record<string, Profile> = {
  lux_mendez: {
    name: "Luz Méndez Vargas",
    handle: "lux_mendez",
    colonia: "Coyoacán, CDMX",
    bio: "Artista visual y grabadora. Trabajo con linóleo, serigrafía y lo que encuentro en la calle. Mi trabajo es político porque mi vida lo es.",
    initials: "LM",
    avatarBg: "#712B13",
    avatarText: "#F0997B",
    disciplines: ["arte visual", "grabado", "serigrafía", "tepito"],
    stats: { obras: 47, seguidores: 1200, siguiendo: 340, debates: 94 },
    works: [
      { id: 1, title: "Volcán Interior",    author: "@lux_mendez", initials: "LM", upvotes: 847, type: "arte",   colSpan: 2, rowSpan: 2 },
      { id: 2, title: "Ceniza Sagrada",     author: "@lux_mendez", initials: "LM", upvotes: 312, type: "arte",   colSpan: 1, rowSpan: 1 },
      { id: 3, title: "Coyoacán 02:00",     author: "@lux_mendez", initials: "LM", upvotes: 203, type: "foto",   colSpan: 1, rowSpan: 2, location: "COYOACÁN · 02:00" },
      { id: 4, title: "Raíz Negra",         author: "@lux_mendez", initials: "LM", upvotes: 529, type: "arte",   colSpan: 1, rowSpan: 1 },
      { id: 5, title: "Obsidiana No. 3",    author: "@lux_mendez", initials: "LM", upvotes: 418, type: "arte",   colSpan: 2, rowSpan: 1 },
      { id: 6, title: "El Cerro Sagrado",   author: "@lux_mendez", initials: "LM", upvotes: 211, type: "arte",   colSpan: 1, rowSpan: 1 },
    ],
    activity: [
      { verb: "subió", target: "Obsidiana No. 3", time: "hace 2 h" },
      { verb: "comentó en", target: "Estática de @ruido_blanco", time: "hace 5 h" },
      { verb: "siguió a", target: "@sonoraoscura", time: "ayer" },
      { verb: "guardó", target: "Mercado de Sombras de @ojo.tercer.cdmx", time: "hace 3 d" },
    ],
    collaborators: [
      { name: "Sonora Oscura", handle: "@sonoraoscura",    initials: "SO", discipline: "música",      avatarBg: "#0D1F2D", avatarText: "#5DCAA5" },
      { name: "Cristóbal Nieto", handle: "@crisnieto_foto", initials: "CN", discipline: "fotografía",  avatarBg: "#0D1A2D", avatarText: "#4A7FA5" },
      { name: "Paloma Fuerte",   handle: "@paloma_fuerte",  initials: "PF", discipline: "arte visual", avatarBg: "#2D1000", avatarText: "#D85A30" },
    ],
    events: [
      { title: "Grabado en Vivo", date: "15 MAY 26", venue: "Foro Indie Rocks", colonia: "Roma Norte" },
      { title: "Taller de Serigrafía Barrial", date: "29 MAY 26", venue: "Casa Vecina", colonia: "Centro Histórico" },
    ],
  },

  sonoraoscura: {
    name: "Sonora Oscura",
    handle: "sonoraoscura",
    colonia: "Roma Norte, CDMX",
    bio: "Músico electrónico y productor. Trabajo en los límites del ambient, el noise industrial y la música concreta. Archivos de sonido urbano de la Ciudad de México.",
    initials: "SO",
    avatarBg: "#0D1F2D",
    avatarText: "#5DCAA5",
    disciplines: ["música electrónica", "ambient", "noise", "producción"],
    stats: { obras: 31, seguidores: 876, siguiendo: 114, debates: 58 },
    works: [
      { id: 1, title: "Frecuencia 432",    author: "@sonoraoscura", initials: "SO", upvotes: 312,  type: "música", colSpan: 2, rowSpan: 1 },
      { id: 2, title: "Estática Vol. II",  author: "@sonoraoscura", initials: "SO", upvotes: 418,  type: "música", colSpan: 1, rowSpan: 2 },
      { id: 3, title: "Ruido Blanco",      author: "@sonoraoscura", initials: "SO", upvotes: 194,  type: "música", colSpan: 1, rowSpan: 1 },
      { id: 4, title: "Metro Balderas",    author: "@sonoraoscura", initials: "SO", upvotes: 673,  type: "música", colSpan: 1, rowSpan: 1 },
      { id: 5, title: "Polvo Cósmico",     author: "@sonoraoscura", initials: "SO", upvotes: 229,  type: "música", colSpan: 2, rowSpan: 1 },
    ],
    activity: [
      { verb: "publicó", target: "Polvo Cósmico (EP)", time: "hace 1 h" },
      { verb: "colaboró en", target: "Volcán Interior de @lux_mendez", time: "hace 3 d" },
      { verb: "debatió", target: "¿Tiene futuro el ruido en CDMX?", time: "hace 4 d" },
      { verb: "siguió a", target: "@itzelmx", time: "hace 1 sem" },
    ],
    collaborators: [
      { name: "Luz Méndez",  handle: "@lux_mendez",   initials: "LM", discipline: "arte visual", avatarBg: "#2D1000", avatarText: "#F0997B" },
      { name: "Ruido Blanco", handle: "@ruido_blanco", initials: "RB", discipline: "música",      avatarBg: "#1A1A18", avatarText: "#888780" },
      { name: "Itzel Xochitl", handle: "@itzelmx",    initials: "IX", discipline: "arte digital", avatarBg: "#0D1A0D", avatarText: "#5CAA70" },
    ],
    events: [
      { title: "Noche Frecuencia", date: "08 MAY 26", venue: "Multiforo Alicia", colonia: "Doctores" },
      { title: "Ambient Session CDMX", date: "21 JUN 26", venue: "Zinco Jazz Club", colonia: "Centro" },
    ],
  },

  crisnieto_foto: {
    name: "Cristóbal Nieto",
    handle: "crisnieto_foto",
    colonia: "Tepito, CDMX",
    bio: "Fotógrafo documental. Archivos de la ciudad nocturna: mercados, periferias, rituales urbanos. Trabajo con película analógica 35mm y medio formato.",
    initials: "CN",
    avatarBg: "#0D1A2D",
    avatarText: "#4A7FA5",
    disciplines: ["fotografía", "analógico", "documental", "tepito"],
    stats: { obras: 89, seguidores: 2104, siguiendo: 67, debates: 22 },
    works: [
      { id: 1, title: "Tlatelolco 4am",       author: "@crisnieto_foto", initials: "CN", upvotes: 529, type: "foto", colSpan: 1, rowSpan: 2, location: "TLATELOLCO · 04:00" },
      { id: 2, title: "El Rastro",             author: "@crisnieto_foto", initials: "CN", upvotes: 312, type: "foto", colSpan: 2, rowSpan: 1, location: "TEPITO · DOMINGO" },
      { id: 3, title: "Periferia Norte",       author: "@crisnieto_foto", initials: "CN", upvotes: 748, type: "foto", colSpan: 1, rowSpan: 1, location: "ECATEPEC · AMANECER" },
      { id: 4, title: "Señoras del Mercado",   author: "@crisnieto_foto", initials: "CN", upvotes: 634, type: "foto", colSpan: 1, rowSpan: 2, location: "MERCED · MAÑANA" },
      { id: 5, title: "Paso a Desnivel",       author: "@crisnieto_foto", initials: "CN", upvotes: 201, type: "foto", colSpan: 1, rowSpan: 1, location: "IZTAPALAPA · DÍA" },
    ],
    activity: [
      { verb: "publicó", target: "Señoras del Mercado (serie)", time: "hace 4 h" },
      { verb: "guardó", target: "Noche de Feria de @labruja_colectivo", time: "ayer" },
      { verb: "comentó en", target: "Mercado de Sombras de @ojo.tercer.cdmx", time: "hace 2 d" },
      { verb: "siguió a", target: "@paloma_fuerte", time: "hace 5 d" },
    ],
    collaborators: [
      { name: "Ojo Tercer",   handle: "@ojo.tercer.cdmx", initials: "OT", discipline: "fotografía",  avatarBg: "#0D1A2D", avatarText: "#4A7FA5" },
      { name: "Luz Méndez",   handle: "@lux_mendez",      initials: "LM", discipline: "arte visual",  avatarBg: "#2D1000", avatarText: "#F0997B" },
      { name: "La Bruja",     handle: "@labruja_colectivo", initials: "LB", discipline: "colectivo", avatarBg: "#2D0020", avatarText: "#D85A30" },
    ],
    events: [
      { title: "Fotoserie: Barrios Bravo", date: "03 MAY 26", venue: "Museo del Barrio", colonia: "Tepito" },
    ],
  },

  "ojo.tercer.cdmx": {
    name: "Ojo Tercer CDMX",
    handle: "ojo.tercer.cdmx",
    colonia: "La Merced, CDMX",
    bio: "Archivo visual de la Ciudad de México. Mercados, calles, madrugadas. Fotografía callejera sin filtros, documentando lo que la ciudad esconde a plena luz.",
    initials: "OT",
    avatarBg: "#0D1A2D",
    avatarText: "#4A7FA5",
    disciplines: ["fotografía callejera", "archivo", "la merced", "35mm"],
    stats: { obras: 134, seguidores: 3820, siguiendo: 201, debates: 11 },
    works: [
      { id: 1, title: "Mercado de Sombras",  author: "@ojo.tercer.cdmx", initials: "OT", upvotes: 673, type: "foto", colSpan: 1, rowSpan: 2, location: "LA MERCED · NOCHE" },
      { id: 2, title: "Candelaria de Maiz",  author: "@ojo.tercer.cdmx", initials: "OT", upvotes: 422, type: "foto", colSpan: 2, rowSpan: 1, location: "CANDELARIA · TARDE" },
      { id: 3, title: "Lagunilla Domingo",   author: "@ojo.tercer.cdmx", initials: "OT", upvotes: 891, type: "foto", colSpan: 1, rowSpan: 1, location: "LAGUNILLA · DOMINGO" },
      { id: 4, title: "Eje Central 03:00",   author: "@ojo.tercer.cdmx", initials: "OT", upvotes: 314, type: "foto", colSpan: 1, rowSpan: 2, location: "EJE CENTRAL · 03:00" },
      { id: 5, title: "Bodegas Norte",       author: "@ojo.tercer.cdmx", initials: "OT", upvotes: 567, type: "foto", colSpan: 1, rowSpan: 1, location: "VALLEJO · AMANECER" },
    ],
    activity: [
      { verb: "subió", target: "Bodegas Norte (10 fotos)", time: "hace 30 min" },
      { verb: "comentó en", target: "Tlatelolco 4am de @crisnieto_foto", time: "hace 6 h" },
      { verb: "guardó", target: "Ceniza y Oro de @paloma_fuerte", time: "hace 2 d" },
      { verb: "siguió a", target: "@labruja_colectivo", time: "hace 1 sem" },
    ],
    collaborators: [
      { name: "Cristóbal Nieto", handle: "@crisnieto_foto", initials: "CN", discipline: "fotografía",  avatarBg: "#0D1A2D", avatarText: "#4A7FA5" },
      { name: "La Bruja",        handle: "@labruja_colectivo", initials: "LB", discipline: "colectivo", avatarBg: "#2D0020", avatarText: "#D85A30" },
      { name: "Paloma Fuerte",   handle: "@paloma_fuerte",  initials: "PF", discipline: "pintura",     avatarBg: "#2D1000", avatarText: "#D85A30" },
    ],
    events: [
      { title: "Fotoencuentro CDMX", date: "18 ABR 26", venue: "Ex Teresa Arte Actual", colonia: "Centro" },
      { title: "Proyección Nocturna", date: "06 JUN 26", venue: "Cineteca Nacional", colonia: "Xoco" },
    ],
  },

  paloma_fuerte: {
    name: "Paloma Fuerte",
    handle: "paloma_fuerte",
    colonia: "Del Valle, CDMX",
    bio: "Pintora y grabadora. Oro, ceniza, pigmentos naturales. Mi obra explora dualismos: lo sagrado y lo profano, lo que se construye y lo que se consume.",
    initials: "PF",
    avatarBg: "#2D1000",
    avatarText: "#D85A30",
    disciplines: ["pintura", "grabado", "técnica mixta", "del valle"],
    stats: { obras: 63, seguidores: 1540, siguiendo: 92, debates: 27 },
    works: [
      { id: 1, title: "Ceniza y Oro",       author: "@paloma_fuerte", initials: "PF", upvotes: 391, type: "arte",   colSpan: 2, rowSpan: 1 },
      { id: 2, title: "La Quema",           author: "@paloma_fuerte", initials: "PF", upvotes: 622, type: "arte",   colSpan: 1, rowSpan: 2 },
      { id: 3, title: "Díptico Solar",      author: "@paloma_fuerte", initials: "PF", upvotes: 284, type: "arte",   colSpan: 1, rowSpan: 1 },
      { id: 4, title: "Noche Blanca",       author: "@paloma_fuerte", initials: "PF", upvotes: 478, type: "arte",   colSpan: 1, rowSpan: 1 },
      { id: 5, title: "Apertura Del Valle", author: "@paloma_fuerte", initials: "PF", upvotes: 193, type: "evento", colSpan: 2, rowSpan: 1 },
    ],
    activity: [
      { verb: "subió", target: "Díptico Solar", time: "hace 1 d" },
      { verb: "guardó", target: "Volcán Interior de @lux_mendez", time: "hace 2 d" },
      { verb: "comentó en", target: "Apertura Colectiva de @espacio_rojo_mx", time: "hace 3 d" },
      { verb: "siguió a", target: "@crisnieto_foto", time: "hace 1 sem" },
    ],
    collaborators: [
      { name: "Luz Méndez",   handle: "@lux_mendez",       initials: "LM", discipline: "grabado",     avatarBg: "#2D1000", avatarText: "#F0997B" },
      { name: "Espacio Rojo", handle: "@espacio_rojo_mx",  initials: "ER", discipline: "curating",    avatarBg: "#2D0000", avatarText: "#D85A30" },
      { name: "Itzel Xochitl", handle: "@itzelmx",         initials: "IX", discipline: "arte digital", avatarBg: "#0D1A0D", avatarText: "#5CAA70" },
    ],
    events: [
      { title: "Exposición Doble: Oro/Ceniza", date: "24 ABR 26", venue: "Galería OMR", colonia: "Roma Norte" },
    ],
  },

  labruja_colectivo: {
    name: "La Bruja Colectivo",
    handle: "labruja_colectivo",
    colonia: "Doctores, CDMX",
    bio: "Colectivo multidisciplinario de arte, performance y fiesta underground. Organizamos noches donde el arte y el cuerpo son el mismo lenguaje. Desde 2018.",
    initials: "LB",
    avatarBg: "#2D0020",
    avatarText: "#D85A30",
    disciplines: ["colectivo", "performance", "eventos", "underground"],
    stats: { obras: 28, seguidores: 4230, siguiendo: 312, debates: 91 },
    works: [
      { id: 1, title: "Noche de Feria",       author: "@labruja_colectivo", initials: "LB", upvotes: 1204, type: "evento", colSpan: 2, rowSpan: 1 },
      { id: 2, title: "Apertura Colectiva",   author: "@labruja_colectivo", initials: "LB", upvotes: 956,  type: "evento", colSpan: 1, rowSpan: 2 },
      { id: 3, title: "Desmontaje",           author: "@labruja_colectivo", initials: "LB", upvotes: 431,  type: "arte",   colSpan: 1, rowSpan: 1 },
      { id: 4, title: "Ritual Electrónico",   author: "@labruja_colectivo", initials: "LB", upvotes: 782,  type: "evento", colSpan: 2, rowSpan: 1 },
      { id: 5, title: "Cartografía del Caos", author: "@labruja_colectivo", initials: "LB", upvotes: 344,  type: "arte",   colSpan: 1, rowSpan: 1 },
    ],
    activity: [
      { verb: "anunció", target: "Ritual Electrónico — 30 MAY", time: "hace 3 h" },
      { verb: "colaboró en", target: "Frecuencia 432 de @sonoraoscura", time: "hace 1 d" },
      { verb: "publicó", target: "convocatoria abierta: artistas CDMX 2026", time: "hace 3 d" },
      { verb: "siguió a", target: "@ruido_blanco", time: "hace 1 sem" },
    ],
    collaborators: [
      { name: "Sonora Oscura",  handle: "@sonoraoscura",  initials: "SO", discipline: "música",      avatarBg: "#0D1F2D", avatarText: "#5DCAA5" },
      { name: "Espacio Rojo",   handle: "@espacio_rojo_mx", initials: "ER", discipline: "curating", avatarBg: "#2D0000", avatarText: "#D85A30" },
      { name: "Cristóbal Nieto", handle: "@crisnieto_foto", initials: "CN", discipline: "fotografía", avatarBg: "#0D1A2D", avatarText: "#4A7FA5" },
    ],
    events: [
      { title: "Noche de Feria XII", date: "30 MAY 26", venue: "Foro Indie Rocks", colonia: "Roma Norte" },
      { title: "Ritual Electrónico", date: "13 JUN 26", venue: "Club Fiebre", colonia: "Doctores" },
      { title: "Desmontaje Colectivo", date: "04 JUL 26", venue: "La Hacienda", colonia: "Tlalpan" },
    ],
  },
};

function getProfile(username: string): Profile {
  const found = PROFILES[username];
  if (found) return found;
  // Fallback for unknown handles
  const name = username.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = name.split(" ").slice(0, 2).map((w: string) => w[0]).join("");
  return {
    name,
    handle: username,
    colonia: "CDMX",
    bio: "Artista en la Ciudad de México.",
    initials,
    avatarBg: "#712B13",
    avatarText: "#F0997B",
    disciplines: ["arte"],
    stats: { obras: 0, seguidores: 0, siguiendo: 0, debates: 0 },
    works: [],
    activity: [],
    collaborators: [],
    events: [],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStat(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const DISCIPLINE_COLORS: Record<string, string> = {
  "arte visual":         "#D85A30",
  "grabado":             "#C4622A",
  "serigrafía":          "#5DCAA5",
  "tepito":              "#4A7FA5",
  "coyoacán":            "#888780",
  "música electrónica":  "#5DCAA5",
  "ambient":             "#3BA88A",
  "noise":               "#5DCAA5",
  "producción":          "#3BA88A",
  "fotografía":          "#4A7FA5",
  "analógico":           "#3A6A8A",
  "documental":          "#4A7FA5",
  "fotografía callejera":"#4A7FA5",
  "archivo":             "#3A6A8A",
  "la merced":           "#4A7FA5",
  "35mm":                "#3A6A8A",
  "colectivo":           "#D85A30",
  "performance":         "#C4622A",
  "eventos":             "#D85A30",
  "underground":         "#C4622A",
  "pintura":             "#D85A30",
  "técnica mixta":       "#C4622A",
  "del valle":           "#888780",
  "arte digital":        "#5DCAA5",
  "curating":            "#888780",
};

function disciplineColor(tag: string): string {
  return DISCIPLINE_COLORS[tag.toLowerCase()] ?? "#2a2a28";
}

// ─── Banner SVG ───────────────────────────────────────────────────────────────

function BannerSVG() {
  return (
    <svg
      width="100%" height="180"
      viewBox="0 0 1200 180"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="banner-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e1e1c" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="1200" height="180" fill="url(#banner-grid)" />
      <circle cx="960" cy="90" r="55"  fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="95"  fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="140" fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="190" fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="245" fill="none" stroke="#1e1e1c" strokeWidth="0.6" />
    </svg>
  );
}

// ─── MagmaLogo ────────────────────────────────────────────────────────────────

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

// ─── Sidebar sections ────────────────────────────────────────────────────────

function ActivitySection({ items }: { items: ActivityItem[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "#444441", fontFamily: "var(--font-space-mono), monospace" }}>
        Actividad reciente
      </p>
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-0.5">
            <span className="text-xs leading-snug" style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>
              <span style={{ color: "#e8e4dc" }}>{item.verb}</span>{" "}
              {item.target}
            </span>
            <span className="text-[10px]" style={{ color: "#444441", fontFamily: "var(--font-space-mono), monospace" }}>
              {item.time}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CollaboratorsSection({ people }: { people: Collaborator[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "#444441", fontFamily: "var(--font-space-mono), monospace" }}>
        Colaboradores
      </p>
      <ul className="flex flex-col gap-3">
        {people.map((p, i) => (
          <li key={i}>
            <Link href={`/profile/${p.handle.replace(/^@/, "")}`} className="flex items-center gap-3 group/collab">
              <div
                className="flex items-center justify-center shrink-0 text-[10px] font-bold"
                style={{ width: "28px", height: "28px", borderRadius: "2px", backgroundColor: p.avatarBg, color: p.avatarText, fontFamily: "var(--font-syne), sans-serif" }}
              >
                {p.initials}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs group-hover/collab:underline" style={{ color: "#e8e4dc", fontFamily: "var(--font-space-mono), monospace" }}>
                  {p.handle}
                </span>
                <span className="text-[10px]" style={{ color: "#444441", fontFamily: "var(--font-space-mono), monospace" }}>
                  {p.discipline}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventsSection({ events }: { events: UpcomingEvent[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "#444441", fontFamily: "var(--font-space-mono), monospace" }}>
        Próximos eventos
      </p>
      <ul className="flex flex-col gap-4">
        {events.map((ev, i) => (
          <li key={i} className="border-l pl-3" style={{ borderColor: "#D85A30", borderLeftWidth: "1.5px" }}>
            <p className="text-xs leading-snug" style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontWeight: 700 }}>
              {ev.title}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>
              {ev.date}
            </p>
            <p className="text-[10px]" style={{ color: "#444441", fontFamily: "var(--font-space-mono), monospace" }}>
              {ev.venue} · {ev.colonia}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Hardcoded placeholder data for the profile page ─────────────────────────

const PLACEHOLDER_WORKS: CardData[] = [
  { id: 1, title: "Volcán Interior",  author: "@lux_mendez", initials: "LM", upvotes: 847, type: "arte",   colSpan: 2, rowSpan: 2 },
  { id: 2, title: "Coyoacán 02:00",   author: "@lux_mendez", initials: "LM", upvotes: 203, type: "foto",   colSpan: 1, rowSpan: 2, location: "COYOACÁN · 02:00" },
  { id: 3, title: "Ceniza Sagrada",   author: "@lux_mendez", initials: "LM", upvotes: 312, type: "arte",   colSpan: 1, rowSpan: 1 },
  { id: 4, title: "Raíz Negra",       author: "@lux_mendez", initials: "LM", upvotes: 529, type: "arte",   colSpan: 1, rowSpan: 1 },
  { id: 5, title: "Obsidiana No. 3",  author: "@lux_mendez", initials: "LM", upvotes: 418, type: "arte",   colSpan: 2, rowSpan: 1 },
  { id: 6, title: "El Cerro Sagrado", author: "@lux_mendez", initials: "LM", upvotes: 211, type: "música", colSpan: 1, rowSpan: 1 },
];

const PLACEHOLDER_ACTIVITY: ActivityItem[] = [
  { verb: "publicó",    target: "Obsidiana No. 3",                       time: "hace 2 h" },
  { verb: "respondió en", target: "debate sobre grabado colectivo",      time: "hace 5 h" },
  { verb: "siguió a",   target: "@sonoraoscura",                         time: "ayer" },
  { verb: "guardó",     target: "Mercado de Sombras de @ojo.tercer.cdmx", time: "hace 3 d" },
];

const PLACEHOLDER_COLLABORATORS: Collaborator[] = [
  { name: "Sonora Oscura",   handle: "@sonoraoscura",   initials: "SO", discipline: "música electrónica", avatarBg: "#0D1F2D", avatarText: "#5DCAA5" },
  { name: "Cristóbal Nieto", handle: "@crisnieto_foto", initials: "CN", discipline: "fotografía",         avatarBg: "#0D1A2D", avatarText: "#4A7FA5" },
  { name: "Paloma Fuerte",   handle: "@paloma_fuerte",  initials: "PF", discipline: "arte visual",        avatarBg: "#2D1000", avatarText: "#D85A30" },
];

const PLACEHOLDER_EVENTS: UpcomingEvent[] = [
  { title: "Grabado en Vivo",              date: "15 MAY 26", venue: "Foro Indie Rocks", colonia: "Roma Norte"      },
  { title: "Taller de Serigrafía Barrial", date: "29 MAY 26", venue: "Casa Vecina",      colonia: "Centro Histórico" },
];

export default function ProfilePage() {
  useParams<{ username: string }>(); // reads URL but we use hardcoded data

  const [activeTab, setActiveTab] = useState<Tab>("obras");

  const TABS: Tab[] = ["obras", "debates", "eventos", "guardados"];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: "rgba(12,12,11,0.92)", borderColor: "#2a2a28", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <MagmaLogo />
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-xs cursor-pointer" style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>
              subir obra
            </span>
            <div
              className="flex items-center justify-center text-xs font-bold cursor-pointer"
              style={{ width: "28px", height: "28px", borderRadius: "2px", backgroundColor: "#D85A30", color: "#0c0c0b", fontFamily: "var(--font-syne), sans-serif" }}
            >
              M
            </div>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div style={{ backgroundColor: "#0f0d0b", height: "180px", overflow: "hidden" }}>
        <BannerSVG />
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-6">
        <div style={{ marginTop: "-40px" }}>
          {/* Avatar row */}
          <div className="flex items-end justify-between">
            {/* Avatar with online dot */}
            <div className="relative shrink-0">
              <div
                className="flex items-center justify-center text-xl font-bold"
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "4px",
                  backgroundColor: "#712B13",
                  color: "#F0997B",
                  fontFamily: "var(--font-syne), sans-serif",
                  border: "2px solid #0c0c0b",
                }}
              >
                LM
              </div>
              {/* Online dot */}
              <div
                className="absolute"
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#4CAF7D",
                  border: "1.5px solid #0c0c0b",
                  bottom: "4px",
                  right: "4px",
                }}
              />
            </div>

            {/* Action buttons — aligned to avatar baseline */}
            <div className="flex items-center gap-3 pb-1">
              <button
                className="px-5 py-2 text-xs tracking-widest uppercase border transition-colors duration-150 cursor-pointer"
                style={{ borderColor: "#2a2a28", color: "#888780", backgroundColor: "transparent", fontFamily: "var(--font-space-mono), monospace" }}
              >
                mensaje
              </button>
              <button
                className="px-5 py-2 text-xs tracking-widest uppercase cursor-pointer"
                style={{ backgroundColor: "#D85A30", color: "#0c0c0b", fontFamily: "var(--font-space-mono), monospace" }}
              >
                seguir
              </button>
            </div>
          </div>

          {/* Name, handle, bio */}
          <div className="mt-4">
            <h1
              className="leading-tight"
              style={{ fontSize: "26px", color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }}
            >
              Luz Méndez Vargas
            </h1>
            <p className="mt-1 text-xs" style={{ color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace" }}>
              @lux_mendez · Coyoacán, CDMX
            </p>
            <p
              className="mt-3 text-[13px] leading-relaxed"
              style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace", maxWidth: "560px" }}
            >
              Artista visual y grabadora. Trabajo con linóleo, serigrafía y lo que encuentro en la calle. Mi trabajo es político porque mi vida lo es.
            </p>

            {/* Discipline tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-widest border" style={{ borderColor: "#D85A30", color: "#D85A30", fontFamily: "var(--font-space-mono), monospace", opacity: 0.8 }}>arte visual</span>
              <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-widest border" style={{ borderColor: "#854F0B", color: "#EF9F27", fontFamily: "var(--font-space-mono), monospace", opacity: 0.8 }}>grabado</span>
              <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-widest border" style={{ borderColor: "#0F6E56", color: "#5DCAA5", fontFamily: "var(--font-space-mono), monospace", opacity: 0.8 }}>serigrafía</span>
              <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-widest border" style={{ borderColor: "#993C1D", color: "#F0997B", fontFamily: "var(--font-space-mono), monospace", opacity: 0.8 }}>tepito</span>
            </div>

            {/* Stats row — hardcoded */}
            <div className="flex gap-8 mt-6 pb-6 border-b" style={{ borderColor: "#2a2a28" }}>
              {[
                { value: "47",   label: "obras"      },
                { value: "1.2k", label: "seguidores" },
                { value: "340",  label: "siguiendo"  },
                { value: "94",   label: "debates"    },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="tabular-nums" style={{ fontSize: "18px", color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontWeight: 800, lineHeight: 1 }}>
                    {value}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: "#444441", fontFamily: "var(--font-space-mono), monospace" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-3 gap-8 pt-8 pb-16">
          {/* Left: tabs + works grid */}
          <div className="col-span-2">
            {/* Tabs */}
            <div className="flex gap-0 border-b mb-6" style={{ borderColor: "#2a2a28" }}>
              {TABS.map((tab) => {
                const isActive = tab === activeTab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-5 py-3 text-xs tracking-widest uppercase cursor-pointer transition-colors duration-150 border-b-2"
                    style={{
                      fontFamily: "var(--font-space-mono), monospace",
                      color: isActive ? "#e8e4dc" : "#888780",
                      borderBottomColor: isActive ? "#D85A30" : "transparent",
                      marginBottom: "-1px",
                      backgroundColor: "transparent",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {activeTab === "obras" && (
              <div className="grid grid-cols-3" style={{ gridAutoRows: "220px", gridAutoFlow: "dense" }}>
                {PLACEHOLDER_WORKS.map((card) => (
                  <ArtCard key={card.id} card={card} />
                ))}
              </div>
            )}

            {activeTab !== "obras" && (
              <div className="py-20 text-center text-xs tracking-widest uppercase" style={{ color: "#444441", fontFamily: "var(--font-space-mono), monospace" }}>
                próximamente
              </div>
            )}
          </div>

          {/* Right sidebar — hardcoded */}
          <div className="col-span-1 flex flex-col gap-8 pt-1">
            <ActivitySection items={PLACEHOLDER_ACTIVITY} />
            <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />
            <CollaboratorsSection people={PLACEHOLDER_COLLABORATORS} />
            <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />
            <EventsSection events={PLACEHOLDER_EVENTS} />
          </div>
        </div>
      </div>
    </div>
  );
}
