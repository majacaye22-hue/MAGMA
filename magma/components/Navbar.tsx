"use client";

import Link from "next/link";
import { useState } from "react";

const filters = ["todo", "arte", "música", "fotografía", "eventos"];

export default function Navbar() {
  const [active, setActive] = useState("todo");

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "60px",
        backgroundColor: "#0c0c0b",
        borderBottom: "1px solid #2a2a28",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        gap: "24px",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontFamily: "Syne",
          fontWeight: 800,
          fontSize: "20px",
          letterSpacing: "0.08em",
          color: "#e8e4dc",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        M<span style={{ color: "#D85A30" }}>A</span>GM
        <span style={{ color: "#D85A30" }}>A</span>
      </Link>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            style={{
              fontFamily: "Space Mono",
              fontSize: "11px",
              fontWeight: active === f ? 700 : 400,
              padding: "4px 12px",
              borderRadius: "2px",
              border: `1px solid ${active === f ? "#D85A30" : "#2a2a28"}`,
              backgroundColor: active === f ? "#D85A30" : "transparent",
              color: active === f ? "#0c0c0b" : "#888780",
              cursor: "pointer",
              letterSpacing: "0.05em",
              textTransform: "lowercase",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (active !== f) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#888780";
                (e.currentTarget as HTMLButtonElement).style.color = "#e8e4dc";
              }
            }}
            onMouseLeave={(e) => {
              if (active !== f) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#2a2a28";
                (e.currentTarget as HTMLButtonElement).style.color = "#888780";
              }
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Auth buttons */}
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          style={{
            fontFamily: "Space Mono",
            fontSize: "12px",
            padding: "6px 16px",
            borderRadius: "2px",
            border: "1px solid #2a2a28",
            backgroundColor: "transparent",
            color: "#e8e4dc",
            cursor: "pointer",
            letterSpacing: "0.05em",
            transition: "border-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "#888780";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "#2a2a28";
          }}
        >
          entrar
        </button>
        <button
          style={{
            fontFamily: "Space Mono",
            fontSize: "12px",
            padding: "6px 16px",
            borderRadius: "2px",
            border: "1px solid #D85A30",
            backgroundColor: "#D85A30",
            color: "#0c0c0b",
            cursor: "pointer",
            fontWeight: 700,
            letterSpacing: "0.05em",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          únete
        </button>
      </div>
    </nav>
  );
}
