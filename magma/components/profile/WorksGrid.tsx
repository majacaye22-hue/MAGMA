import ArtCard from "@/components/cards/ArtCard";
import MusicCard from "@/components/cards/MusicCard";
import PhotoCard from "@/components/cards/PhotoCard";
import EventCard from "@/components/cards/EventCard";
import type { FeedCard } from "@/components/cards/types";

function renderCard(card: FeedCard) {
  switch (card.type) {
    case "arte":       return <ArtCard   key={card.id} card={card} />;
    case "música":     return <MusicCard key={card.id} card={card} />;
    case "fotografía": return <PhotoCard key={card.id} card={card} />;
    case "evento":     return <EventCard key={card.id} card={card} />;
  }
}

interface WorksGridProps {
  cards: FeedCard[];
}

export default function WorksGrid({ cards }: WorksGridProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <h2
          style={{
            fontFamily: "Syne",
            fontWeight: 800,
            fontSize: "15px",
            color: "#e8e4dc",
            letterSpacing: "0.04em",
          }}
        >
          Obras
        </h2>
        <span
          style={{
            fontFamily: "Space Mono",
            fontSize: "11px",
            color: "#888780",
            letterSpacing: "0.05em",
          }}
        >
          {cards.length} {cards.length === 1 ? "pieza" : "piezas"}
        </span>
      </div>

      {cards.length === 0 ? (
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            border: "1px solid #2a2a28",
            borderRadius: "2px",
            fontFamily: "Space Mono",
            fontSize: "12px",
            color: "#888780",
            letterSpacing: "0.04em",
          }}
        >
          sin obras publicadas aún
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
          }}
        >
          {cards.map(renderCard)}
        </div>
      )}
    </div>
  );
}
