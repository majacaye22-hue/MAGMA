"use client";

import { useState } from "react";
import ArtCard from "./cards/ArtCard";
import MusicCard from "./cards/MusicCard";
import PhotoCard from "./cards/PhotoCard";
import EventCard from "./cards/EventCard";
import type { FeedCard, CardType } from "./cards/types";

const FILTERS = ["todo", "arte", "música", "fotografía", "evento"] as const;
type Filter = (typeof FILTERS)[number];

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "Space Mono",
        fontSize: "11px",
        fontWeight: active ? 700 : 400,
        padding: "5px 14px",
        borderRadius: "2px",
        border: `1px solid ${active ? "#D85A30" : hovered ? "#888780" : "#2a2a28"}`,
        backgroundColor: active ? "#D85A30" : "transparent",
        color: active ? "#0c0c0b" : hovered ? "#e8e4dc" : "#888780",
        cursor: "pointer",
        letterSpacing: "0.06em",
        transition: "all 0.12s ease",
      }}
    >
      {label}
    </button>
  );
}

function renderCard(card: FeedCard) {
  switch (card.type) {
    case "arte":       return <ArtCard   key={card.id} card={card} />;
    case "música":     return <MusicCard key={card.id} card={card} />;
    case "fotografía": return <PhotoCard key={card.id} card={card} />;
    case "evento":     return <EventCard key={card.id} card={card} />;
  }
}

interface FeedGridProps {
  cards: FeedCard[];
}

export default function FeedGrid({ cards }: FeedGridProps) {
  const [active, setActive] = useState<Filter>("todo");

  const filtered =
    active === "todo"
      ? cards
      : cards.filter((c) => c.type === (active as CardType));

  return (
    <div>
      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          {FILTERS.map((f) => (
            <FilterPill
              key={f}
              label={f}
              active={active === f}
              onClick={() => setActive(f)}
            />
          ))}
        </div>
        <span
          style={{
            fontFamily: "Space Mono",
            fontSize: "11px",
            color: "#888780",
            letterSpacing: "0.05em",
          }}
        >
          {filtered.length} {filtered.length === 1 ? "obra" : "obras"}
        </span>
      </div>

      {/* Grid — 3 columns, cards can span 2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
        }}
      >
        {filtered.map(renderCard)}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          style={{
            padding: "64px 0",
            textAlign: "center",
            fontFamily: "Space Mono",
            fontSize: "13px",
            color: "#888780",
            letterSpacing: "0.04em",
            border: "1px solid #2a2a28",
            borderRadius: "2px",
          }}
        >
          no hay obras en esta categoría
        </div>
      )}
    </div>
  );
}
