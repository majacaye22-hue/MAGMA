"use client";

import { useState } from "react";
import CardOverlay from "./CardOverlay";
import type { FeedCard } from "./types";

function MusicSVG({ seed }: { seed: number }) {
  // Equalizer / spectrum bars — 28 bars across width
  const barCount = 28;
  const barWidth = 100 / barCount;
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Generate pseudo-random heights that look like audio spectrum
    const h =
      15 +
      Math.abs(Math.sin((seed * 0.3 + i * 0.7) * 1.9) * 55) +
      Math.abs(Math.sin((seed * 0.7 + i * 1.3) * 0.8) * 25);
    const capped = Math.min(h, 88);
    return capped;
  });

  // Mirror effect: second set of bars below center (reflection)
  const cx = 50; // center y

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {/* Horizontal center line */}
      <line x1="0" y1="50" x2="100" y2="50" stroke="#2a2a28" strokeWidth="0.4" />

      {bars.map((h, i) => {
        const x = i * barWidth + barWidth * 0.15;
        const w = barWidth * 0.7;
        const halfH = h / 2;
        const accent = i % 7 === 0 || i % 11 === 0;
        const color = accent ? "#D85A30" : "#2a2a28";
        const mainOp = accent ? 0.9 : 0.6;
        const reflOp = accent ? 0.3 : 0.15;

        return (
          <g key={i}>
            {/* Main bar (upward from center) */}
            <rect
              x={x}
              y={cx - halfH}
              width={w}
              height={halfH}
              fill={color}
              opacity={mainOp}
            />
            {/* Reflection (downward) */}
            <rect
              x={x}
              y={cx}
              width={w}
              height={halfH * 0.5}
              fill={color}
              opacity={reflOp}
            />
          </g>
        );
      })}

      {/* Fine horizontal scan lines */}
      {[20, 35, 65, 80].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke="#2a2a28"
          strokeWidth="0.25"
          opacity="0.5"
          strokeDasharray="2 4"
        />
      ))}
    </svg>
  );
}

export default function MusicCard({ card }: { card: FeedCard }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: card.wide ? "span 2" : "span 1",
        backgroundColor: "#0c0c0b",
        border: `1px solid ${hovered ? "#888780" : "#2a2a28"}`,
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
        <MusicSVG seed={card.seed} />

        {/* Badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            padding: "2px 8px",
            borderRadius: "2px",
            backgroundColor: "#0c0c0b",
            border: "1px solid #888780",
            color: "#888780",
            fontFamily: "Space Mono",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            zIndex: 2,
          }}
        >
          música
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
