import MediaCard, { CardData } from "@/components/MediaCard";

const cards: CardData[] = [
  {
    id: "1",
    type: "arte",
    title: "Fragmentos del Pacífico",
    author: "lunamorales",
    authorInitials: "LM",
    upvotes: 142,
    svgSeed: 7,
  },
  {
    id: "2",
    type: "música",
    title: "Cumbia Sintética Vol. II",
    author: "ruidoverde",
    authorInitials: "RV",
    upvotes: 89,
    svgSeed: 13,
  },
  {
    id: "3",
    type: "fotografía",
    title: "Mercado Tepito 4AM",
    author: "ojoscrudos",
    authorInitials: "OC",
    upvotes: 203,
    svgSeed: 29,
  },
  {
    id: "4",
    type: "evento",
    title: "Exposición Colectiva: Borde",
    author: "espaciobruto",
    authorInitials: "EB",
    upvotes: 67,
    svgSeed: 41,
  },
  {
    id: "5",
    type: "arte",
    title: "Sin título #8",
    author: "piedrasuelta",
    authorInitials: "PS",
    upvotes: 314,
    svgSeed: 53,
  },
  {
    id: "6",
    type: "fotografía",
    title: "Retrato de mi abuela",
    author: "clarooscuro",
    authorInitials: "CO",
    upvotes: 178,
    svgSeed: 67,
  },
  {
    id: "7",
    type: "música",
    title: "Ruido Blanco / Ciudad Gris",
    author: "fmclandestino",
    authorInitials: "FC",
    upvotes: 55,
    svgSeed: 79,
  },
  {
    id: "8",
    type: "arte",
    title: "Geometría del Olvido",
    author: "trazolibre",
    authorInitials: "TL",
    upvotes: 231,
    svgSeed: 91,
  },
  {
    id: "9",
    type: "evento",
    title: "Taller de Serigrafía Nocturna",
    author: "tintataller",
    authorInitials: "TT",
    upvotes: 44,
    svgSeed: 103,
  },
];

export default function HomePage() {
  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontFamily: "Syne",
            fontWeight: 800,
            fontSize: "22px",
            color: "#e8e4dc",
            letterSpacing: "0.02em",
          }}
        >
          Reciente
        </h1>
        <span
          style={{
            fontFamily: "Space Mono",
            fontSize: "11px",
            color: "#888780",
            letterSpacing: "0.05em",
          }}
        >
          {cards.length} obras
        </span>
      </div>

      {/* 3-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        {cards.map((card) => (
          <MediaCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
