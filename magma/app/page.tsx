import FeedGrid from "@/components/FeedGrid";
import type { FeedCard } from "@/components/cards/types";

const FEED: FeedCard[] = [
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
];

export default function HomePage() {
  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px 48px",
      }}
    >
      {/* Page heading */}
      <div
        style={{
          marginBottom: "28px",
          paddingBottom: "20px",
          borderBottom: "1px solid #2a2a28",
        }}
      >
        <h1
          style={{
            fontFamily: "Syne",
            fontWeight: 800,
            fontSize: "13px",
            color: "#888780",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Feed
        </h1>
      </div>

      <FeedGrid cards={FEED} />
    </div>
  );
}
