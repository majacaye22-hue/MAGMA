"use client";

import { useState } from "react";
import CardOverlay from "./CardOverlay";
import type { FeedCard } from "./types";

function EventSVG({ seed, date }: { seed: number; date?: string }) {
  const s = seed;
  // Large date number as focal point, calendar-style geometry
  const tickLines = Array.from({ length: 7 }, (_, i) => ({
    x: 8 + i * 13,
    height: 4 + ((s * (i + 3)) % 12),
  }));

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {/* Background ruled lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1="0"
          y1={10 + i * 12}
          x2="100"
          y2={10 + i * 12}
          stroke="#2a2a28"
          strokeWidth="0.4"
          opacity="0.6"
        />
      ))}

      {/* Accent vertical bar */}
      <rect x="5" y="5" width="3" height="90" fill="#D85A30" opacity="0.7" />

      {/* Large date text */}
      {date && (
        <>
          <text
            x="55"
            y="58"
            textAnchor="middle"
            fontFamily="Syne, sans-serif"
            fontWeight="800"
            fontSize="36"
            fill="#e8e4dc"
            opacity="0.12"
          >
            {date.split(" ")[0]}
          </text>
          <text
            x="55"
            y="72"
            textAnchor="middle"
            fontFamily="Space Mono, monospace"
            fontSize="10"
            fill="#888780"
            opacity="0.5"
            letterSpacing="2"
          >
            {date.split(" ")[1]?.toUpperCase()}
          </text>
        </>
      )}

      {/* Calendar header bar */}
      <rect x="12" y="8" width="82" height="8" fill="#D85A30" opacity="0.08" />
      <rect x="12" y="8" width="82" height="8" fill="none" stroke="#D85A30" strokeWidth="0.4" opacity="0.3" />

      {/* Calendar tick marks at top */}
      {tickLines.map((t, i) => (
        <rect key={i} x={t.x} y={8} width="1.5" height={t.height} fill="#D85A30" opacity="0.35" />
      ))}

      {/* Outer frame */}
      <rect x="4" y="4" width="92" height="92" fill="none" stroke="#D85A30" strokeWidth="0.4" opacity="0.25" />

      {/* Corner accents */}
      {[[4, 4], [92, 4], [4, 92], [92, 92]].map(([cx, cy], i) => (
        <rect key={i} x={cx - 2} y={cy - 2} width="4" height="4" fill="#D85A30" opacity="0.5" />
      ))}
    </svg>
  );
}

export default function EventCard({ card }: { card: FeedCard }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: card.wide ? "span 2" : "span 1",
        backgroundColor: "#0c0c0b",
        border: `1px solid ${hovered ? "#D85A30" : "#2a2a28"}`,
        borderRadius: "2px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s ease",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: card.wide ? "2 / 1" : "1 / 1",
          backgroundColor: "#0c0c0b",
        }}
      >
        <EventSVG seed={card.seed} date={card.date} />

        {/* Badge — filled accent for events */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            padding: "2px 8px",
            borderRadius: "2px",
            backgroundColor: "#D85A30",
            border: "1px solid #D85A30",
            color: "#0c0c0b",
            fontFamily: "Space Mono",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            zIndex: 2,
          }}
        >
          evento
        </div>

        {/* Date chip (top-right) */}
        {card.date && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              padding: "2px 8px",
              borderRadius: "2px",
              backgroundColor: "#141412",
              border: "1px solid #2a2a28",
              color: "#D85A30",
              fontFamily: "Space Mono",
              fontSize: "10px",
              letterSpacing: "0.06em",
              zIndex: 2,
            }}
          >
            {card.date}
          </div>
        )}

        {/* Venue (bottom, always visible) */}
        {card.venue && !hovered && (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              fontFamily: "Space Mono",
              fontSize: "10px",
              color: "#888780",
              letterSpacing: "0.04em",
            }}
          >
            {card.venue}
          </div>
        )}

        <CardOverlay
          title={card.title}
          author={card.author}
          authorInitials={card.authorInitials}
          upvotes={card.upvotes}
          visible={hovered}
        />
      </div>
    </div>
  );
}
