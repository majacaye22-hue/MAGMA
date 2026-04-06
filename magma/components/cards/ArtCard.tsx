"use client";

import { useState } from "react";
import CardOverlay from "./CardOverlay";
import type { FeedCard } from "./types";

function ArtSVG({ seed }: { seed: number }) {
  // Constructivist / Bauhaus geometric composition
  const s = seed;
  const rects = [
    { x: 5,  y: 10, w: 35 + (s % 20), h: 55 + (s % 25), op: 0.18 },
    { x: 30 + (s % 15), y: 5,  w: 50,               h: 40 + (s % 20), op: 0.12 },
    { x: 55 + (s % 10), y: 30 + (s % 20), w: 35, h: 60, op: 0.15 },
    { x: 10 + (s % 25), y: 50 + (s % 15), w: 45, h: 35, op: 0.09 },
  ];
  const accent = { x: 5 + (s % 30), y: 5 + (s % 20), w: 18 + (s % 12), h: 18 + (s % 12) };
  const lines = [
    { x1: 0, y1: 25 + (s % 30), x2: 100, y2: 60 + (s % 20) },
    { x1: 20 + (s % 30), y1: 0, x2: 50 + (s % 20), y2: 100 },
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="#D85A30" opacity={r.op} />
      ))}
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#2a2a28" strokeWidth="0.6" opacity="0.8" />
      ))}
      {/* Accent filled rect */}
      <rect x={accent.x} y={accent.y} width={accent.w} height={accent.h} fill="#D85A30" opacity="0.55" />
      {/* Fine grid overlay */}
      {[20, 40, 60, 80].map((v) => (
        <g key={v}>
          <line x1={v} y1="0" x2={v} y2="100" stroke="#2a2a28" strokeWidth="0.3" opacity="0.4" />
          <line x1="0" y1={v} x2="100" y2={v} stroke="#2a2a28" strokeWidth="0.3" opacity="0.4" />
        </g>
      ))}
      {/* Outline rect */}
      <rect
        x={8 + (s % 5)} y={8 + (s % 5)}
        width={84 - (s % 8)} height={84 - (s % 8)}
        fill="none" stroke="#D85A30" strokeWidth="0.4" opacity="0.3"
      />
    </svg>
  );
}

export default function ArtCard({ card }: { card: FeedCard }) {
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
      {/* Visual area */}
      <div
        style={{
          position: "relative",
          aspectRatio: card.wide ? "2 / 1" : "1 / 1",
          backgroundColor: "#0c0c0b",
        }}
      >
        <ArtSVG seed={card.seed} />

        {/* Badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            padding: "2px 8px",
            borderRadius: "2px",
            backgroundColor: "#0c0c0b",
            border: "1px solid #D85A30",
            color: "#D85A30",
            fontFamily: "Space Mono",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            zIndex: 2,
          }}
        >
          arte
        </div>

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
