"use client";

import { useState } from "react";
import CardOverlay from "./CardOverlay";
import type { FeedCard } from "./types";

function PhotoSVG({ seed }: { seed: number }) {
  const s = seed;
  // Lens / darkroom aesthetic: aperture circle, rule-of-thirds grid, focus cross
  const lensR = 28 + (s % 10);
  const lensX = 35 + (s % 20);
  const lensY = 35 + (s % 20);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {/* Rule-of-thirds grid */}
      {[33, 66].map((v) => (
        <g key={v}>
          <line x1={v} y1="0" x2={v} y2="100" stroke="#2a2a28" strokeWidth="0.4" opacity="0.7" />
          <line x1="0" y1={v} x2="100" y2={v} stroke="#2a2a28" strokeWidth="0.4" opacity="0.7" />
        </g>
      ))}

      {/* Outer frame */}
      <rect x="4" y="4" width="92" height="92" fill="none" stroke="#2a2a28" strokeWidth="0.5" opacity="0.8" />
      <rect x="8" y="8" width="84" height="84" fill="none" stroke="#2a2a28" strokeWidth="0.25" opacity="0.4" />

      {/* Aperture / lens circle */}
      <circle cx={lensX} cy={lensY} r={lensR} fill="none" stroke="#e8e4dc" strokeWidth="0.5" opacity="0.12" />
      <circle cx={lensX} cy={lensY} r={lensR * 0.7} fill="none" stroke="#e8e4dc" strokeWidth="0.3" opacity="0.08" />
      <circle cx={lensX} cy={lensY} r={lensR * 0.35} fill="#e8e4dc" opacity="0.04" />

      {/* Aperture blades (lines through center of lens) */}
      {[0, 30, 60, 90, 120, 150].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const dx = Math.cos(rad) * lensR;
        const dy = Math.sin(rad) * lensR;
        return (
          <line
            key={deg}
            x1={lensX - dx}
            y1={lensY - dy}
            x2={lensX + dx}
            y2={lensY + dy}
            stroke="#e8e4dc"
            strokeWidth="0.25"
            opacity="0.07"
          />
        );
      })}

      {/* Focus cross-hair (corner, accent) */}
      {[
        [14, 14], [86, 14], [14, 86], [86, 86],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke="#D85A30" strokeWidth="0.6" opacity="0.5" />
          <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke="#D85A30" strokeWidth="0.6" opacity="0.5" />
        </g>
      ))}

      {/* Center dot */}
      <circle cx="50" cy="50" r="1" fill="#D85A30" opacity="0.4" />

      {/* Vignette-style subtle rect */}
      <rect x="0" y="0" width="100" height="100"
        fill="none"
        stroke="#0c0c0b"
        strokeWidth="12"
        opacity="0.4"
      />
    </svg>
  );
}

export default function PhotoCard({ card }: { card: FeedCard }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: card.wide ? "span 2" : "span 1",
        backgroundColor: "#0c0c0b",
        border: `1px solid ${hovered ? "#e8e4dc" : "#2a2a28"}`,
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
        <PhotoSVG seed={card.seed} />

        {/* Badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            padding: "2px 8px",
            borderRadius: "2px",
            backgroundColor: "#0c0c0b",
            border: "1px solid #e8e4dc",
            color: "#e8e4dc",
            fontFamily: "Space Mono",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            zIndex: 2,
          }}
        >
          fotografía
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
