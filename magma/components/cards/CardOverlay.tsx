"use client";

interface CardOverlayProps {
  title: string;
  author: string;
  authorInitials: string;
  upvotes: number;
  visible: boolean;
}

export default function CardOverlay({
  title,
  author,
  authorInitials,
  upvotes,
  visible,
}: CardOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(12, 12, 11, 0.9)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "16px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.18s ease",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "Syne",
          fontWeight: 800,
          fontSize: "15px",
          color: "#e8e4dc",
          lineHeight: 1.3,
          marginBottom: "12px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Author */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "2px",
              backgroundColor: "#2a2a28",
              border: "1px solid #D85A30",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Space Mono",
              fontSize: "9px",
              fontWeight: 700,
              color: "#D85A30",
              flexShrink: 0,
            }}
          >
            {authorInitials}
          </div>
          <span
            style={{
              fontFamily: "Space Mono",
              fontSize: "11px",
              color: "#888780",
            }}
          >
            @{author}
          </span>
        </div>

        {/* Upvotes */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: "Space Mono",
            fontSize: "11px",
            color: "#888780",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1L9 9H1L5 1Z" fill="#D85A30" />
          </svg>
          {upvotes}
        </div>
      </div>
    </div>
  );
}
