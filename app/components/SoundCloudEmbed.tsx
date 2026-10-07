"use client";

import { soundCloudPlayerUrl } from "@/lib/soundcloud";

export function SoundCloudEmbed({ url, compact = false }: { url: string; compact?: boolean }) {
  const playerUrl = soundCloudPlayerUrl(url);
  if (!playerUrl) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--magma-rock)",
        height: compact ? "166px" : "300px",
        overflow: "hidden",
        position: "relative",
        zIndex: 30,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <iframe
        title="Reproductor de SoundCloud"
        width="100%"
        height="100%"
        scrolling="no"
        frameBorder="0"
        allow="autoplay"
        loading="lazy"
        src={playerUrl}
        style={{ border: 0, display: "block" }}
      />
    </div>
  );
}
