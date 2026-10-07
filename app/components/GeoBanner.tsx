"use client";

import { useState, useSyncExternalStore } from "react";

const mono = "var(--font-space-mono), monospace";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const MESSAGES: Record<string, string> = {
  mx: "MAGMA es una comunidad para creativos en CDMX. Estás navegando desde fuera de la ciudad — puedes explorar, pero publicar está pensado para la comunidad local.",
  intl: "MAGMA es una comunidad local para creativos en Ciudad de México. Estás navegando desde fuera del país.",
};

export function GeoBanner() {
  const status = useSyncExternalStore(
    () => () => undefined,
    () => readCookie("magma_geo"),
    () => null,
  );
  const [dismissed, setDismissed] = useState(false);

  const message = status ? MESSAGES[status] : undefined;
  if (dismissed || !message) return null;

  return (
    <div
      style={{
        backgroundColor: "#1a1012",
        borderBottom: "0.5px solid #E12120",
        color: "var(--magma-ash)",
        fontFamily: mono,
        fontSize: "var(--magma-text-small)",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <span>{message}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
        style={{
          background: "none",
          border: "none",
          color: "var(--magma-ash)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "var(--magma-text-small)",
          padding: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
