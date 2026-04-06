import type { FeedCard } from "@/components/cards/types";

// ─── Feed data ────────────────────────────────────────────────────────────────

export const FEED: FeedCard[] = [
  // Row 1: wide arte + música
  {
    id: "1",
    type: "arte",
    wide: true,
    title: "Fragmentos del Pacífico",
    author: "lunamorales",
    authorInitials: "LM",
    upvotes: 142,
    seed: 7,
  },
  {
    id: "2",
    type: "música",
    wide: false,
    title: "Cumbia Sintética Vol. II",
    author: "ruidoverde",
    authorInitials: "RV",
    upvotes: 89,
    seed: 13,
  },
  // Row 2: foto + evento + arte
  {
    id: "3",
    type: "fotografía",
    wide: false,
    title: "Mercado Tepito 4AM",
    author: "ojoscrudos",
    authorInitials: "OC",
    upvotes: 203,
    seed: 29,
  },
  {
    id: "4",
    type: "evento",
    wide: false,
    title: "Exposición Colectiva: Borde",
    author: "espaciobruto",
    authorInitials: "EB",
    upvotes: 67,
    seed: 41,
    date: "12 abr",
    venue: "La Tallera, CDMX",
  },
  {
    id: "5",
    type: "arte",
    wide: false,
    title: "Sin título #8",
    author: "piedrasuelta",
    authorInitials: "PS",
    upvotes: 314,
    seed: 53,
  },
  // Row 3: música + wide foto
  {
    id: "6",
    type: "música",
    wide: false,
    title: "Ruido Blanco / Ciudad Gris",
    author: "fmclandestino",
    authorInitials: "FC",
    upvotes: 55,
    seed: 67,
  },
  {
    id: "7",
    type: "fotografía",
    wide: true,
    title: "Retrato de mi abuela en domingo",
    author: "clarooscuro",
    authorInitials: "CO",
    upvotes: 178,
    seed: 79,
  },
  // Row 4: evento + arte + foto
  {
    id: "8",
    type: "evento",
    wide: false,
    title: "Taller de Serigrafía Nocturna",
    author: "tintataller",
    authorInitials: "TT",
    upvotes: 44,
    seed: 91,
    date: "19 abr",
    venue: "Oaxaca, OAX",
  },
  {
    id: "9",
    type: "arte",
    wide: false,
    title: "Geometría del Olvido",
    author: "trazolibre",
    authorInitials: "TL",
    upvotes: 231,
    seed: 103,
  },
  {
    id: "10",
    type: "fotografía",
    wide: false,
    title: "Periferia en Azul",
    author: "margenlibre",
    authorInitials: "ML",
    upvotes: 119,
    seed: 117,
  },
  // Extra cards for profile pages
  {
    id: "11",
    type: "arte",
    wide: false,
    title: "Mapa sin territorio",
    author: "lunamorales",
    authorInitials: "LM",
    upvotes: 88,
    seed: 131,
  },
  {
    id: "12",
    type: "fotografía",
    wide: true,
    title: "Carretera Panamericana, km 0",
    author: "lunamorales",
    authorInitials: "LM",
    upvotes: 211,
    seed: 149,
  },
  {
    id: "13",
    type: "arte",
    wide: false,
    title: "Palimpsesto III",
    author: "lunamorales",
    authorInitials: "LM",
    upvotes: 73,
    seed: 163,
  },
  {
    id: "14",
    type: "música",
    wide: false,
    title: "Frecuencia 440",
    author: "ruidoverde",
    authorInitials: "RV",
    upvotes: 134,
    seed: 177,
  },
  {
    id: "15",
    type: "música",
    wide: true,
    title: "Dub Andino",
    author: "ruidoverde",
    authorInitials: "RV",
    upvotes: 259,
    seed: 191,
  },
];

export function getUserCards(username: string): FeedCard[] {
  return FEED.filter((c) => c.author === username);
}

// ─── Profile data ─────────────────────────────────────────────────────────────

export type ActivityItem = { action: string; item: string; time: string };
export type Collaborator = { name: string; initials: string };
export type EventItem = { title: string; date: string; location: string };

export interface UserProfile {
  username: string;
  name: string;
  location: string;
  bio: string;
  disciplines: string[];
  stats: { obras: number; seguidores: number; siguiendo: number; debates: number };
  recentActivity: ActivityItem[];
  collaborators: Collaborator[];
  upcomingEvents: EventItem[];
}

export const PROFILES: Record<string, UserProfile> = {
  lunamorales: {
    username: "lunamorales",
    name: "Luna Morales",
    location: "Ciudad de México, MX",
    bio: "Artista visual e investigadora de cultura popular urbana. Trabajo con impresión, collage y archivo fotográfico como formas de memoria colectiva.",
    disciplines: ["ilustración", "fotografía", "diseño"],
    stats: { obras: 48, seguidores: 1203, siguiendo: 389, debates: 27 },
    recentActivity: [
      { action: "subió", item: "Fragmentos del Pacífico", time: "hace 2h" },
      { action: "comentó en", item: "Cumbia Sintética", time: "hace 5h" },
      { action: "siguió a", item: "@trazolibre", time: "hace 1d" },
      { action: "votó", item: "Mercado Tepito 4AM", time: "hace 2d" },
    ],
    collaborators: [
      { name: "trazolibre", initials: "TL" },
      { name: "ruidoverde", initials: "RV" },
      { name: "ojoscrudos", initials: "OC" },
      { name: "espaciobruto", initials: "EB" },
    ],
    upcomingEvents: [
      { title: "Expo Borde", date: "12 abr", location: "CDMX" },
      { title: "Taller Serigrafía", date: "19 abr", location: "Oaxaca" },
      { title: "Feria Arte Urbano", date: "3 may", location: "Bogotá" },
    ],
  },
  ruidoverde: {
    username: "ruidoverde",
    name: "Ruido Verde",
    location: "Medellín, CO",
    bio: "Productor y sonidista experimental. Investigando las intersecciones entre cumbia, dub y síntesis modular en espacios urbanos latinoamericanos.",
    disciplines: ["música", "sound design", "performance"],
    stats: { obras: 31, seguidores: 847, siguiendo: 214, debates: 45 },
    recentActivity: [
      { action: "subió", item: "Dub Andino", time: "hace 1h" },
      { action: "colaboró con", item: "@fmclandestino", time: "hace 3d" },
      { action: "votó", item: "Geometría del Olvido", time: "hace 4d" },
      { action: "comentó en", item: "Periferia en Azul", time: "hace 1w" },
    ],
    collaborators: [
      { name: "fmclandestino", initials: "FC" },
      { name: "lunamorales", initials: "LM" },
      { name: "tintataller", initials: "TT" },
    ],
    upcomingEvents: [
      { title: "Noche de Síntesis", date: "15 abr", location: "Medellín" },
      { title: "Encuentro Sonoro", date: "28 abr", location: "Bogotá" },
    ],
  },
};

export function getProfile(username: string): UserProfile {
  if (PROFILES[username]) return PROFILES[username];
  // Fallback for unknown usernames
  return {
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    location: "América Latina",
    bio: "Creador independiente.",
    disciplines: ["arte"],
    stats: { obras: 0, seguidores: 0, siguiendo: 0, debates: 0 },
    recentActivity: [],
    collaborators: [],
    upcomingEvents: [],
  };
}
