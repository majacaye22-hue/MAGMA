"use client";

import Link from "next/link";
import { useState } from "react";

export type CardType = "arte" | "música" | "fotografía" | "evento";

export interface CardData {
  id: string;
  type: CardType;
  title: string;
  author: string;
  authorInitials: string;
  upvotes: number;
  svgSeed: number;
}

const badgeColors: Record<CardType, { bg: string; color: string }> = {
  arte: { bg: "#1a1a18", color: "#D85A30" },
  música: { bg: "#1a1a18", color: "#888780" },
  fotografía: { bg: "#1a1a18", color: "#e8e4dc" },
  evento: { bg: "#D85A30", color: "#0c0c0b" },
};

function ArtPlaceholder({ seed }: { seed: number }) {
  const shapes = Array.from({ length: 6 }, (_, i) => {
    const x = ((seed * (i + 1) * 37) % 80) + 10;
    const y = ((seed * (i + 1) * 53) % 80) + 10;
    const size = ((seed * (i + 3) * 17) % 40) + 15;
    const opacity = 0.06 + ((seed * i) % 5) * 0.04;
    return { x, y, size, opacity };
  });

  const lines = Array.from({ length: 4 }, (_, i) => {
    const x1 = ((seed * (i + 7) * 29) % 100);
    const y1 = ((seed * (i + 3) * 41) % 100);
    const x2 = ((seed * (i + 11) * 19) % 100);
    const y2 = ((seed * (i + 5) * 61) % 100);
    return { x1, y1, x2, y2 };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    >
      {shapes.map((s, i) => (
        <rect
          key={i}
          x={s.x - s.size / 2}
          y={s.y - s.size / 2}
          width={s.size}
          height={s.size}
          fill="#D85A30"
          opacity={s.opacity}
        />
      ))}
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="#2a2a28"
          strokeWidth="0.5"
          opacity="0.6"
        />
      ))}
      <rect
        x={20 + (seed % 20)}
        y={20 + (seed % 15)}
        width={60 - (seed % 20)}
        height={60 - (seed % 15)}
        fill="none"
        stroke="#2a2a28"
        strokeWidth="0.3"
        opacity="0.4"
      />
    </svg>
  );
}

export default function MediaCard({ card }: { card: CardData }) {
  const [hovered, setHovered] = useState(false);
  const badge = badgeColors[card.type];

  return (
    <Link href={`/profile/${card.author.toLowerCase().replace(/\s+/g, "")}`}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          backgroundColor: "#141412",
          border: "1px solid #2a2a28",
          borderRadius: "2px",
          overflow: "hidden",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
          borderColor: hovered ? "#888780" : "#2a2a28",
        }}
      >
        {/* Visual area */}
        <div
          style={{
            position: "relative",
            aspectRatio: "1 / 1",
            backgroundColor: "#0c0c0b",
            overflow: "hidden",
          }}
        >
          <ArtPlaceholder seed={card.svgSeed} />

          {/* Badge */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              padding: "2px 8px",
              borderRadius: "2px",
              backgroundColor: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.color}`,
              fontFamily: "Space Mono",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "lowercase",
              zIndex: 1,
            }}
          >
            {card.type}
          </div>

          {/* Hover overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(12, 12, 11, 0.88)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "16px",
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.2s ease",
            }}
          >
            <div
              style={{
                fontFamily: "Syne",
                fontWeight: 800,
                fontSize: "15px",
                color: "#e8e4dc",
                marginBottom: "10px",
                lineHeight: 1.3,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Avatar */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "2px",
                    backgroundColor: "#2a2a28",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Space Mono",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#D85A30",
                    flexShrink: 0,
                  }}
                >
                  {card.authorInitials}
                </div>
                <span
                  style={{
                    fontFamily: "Space Mono",
                    fontSize: "11px",
                    color: "#888780",
                  }}
                >
                  {card.author}
                </span>
              </div>
              {/* Upvotes */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "Space Mono",
                  fontSize: "11px",
                  color: "#888780",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 2L10 8H2L6 2Z"
                    fill="#D85A30"
                    opacity="0.7"
                  />
                </svg>
                {card.upvotes}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
