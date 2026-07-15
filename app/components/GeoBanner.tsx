"use client";

import { useEffect, useState } from "react";

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
  const [status, setStatus] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setStatus(readCookie("magma_geo"));
  }, []);

  const message = status ? MESSAGES[status] : undefined;
  if (dismissed || !message) return null;

  return (
    <div
      style={{
        backgroundColor: "#1a1012",
        borderBottom: "0.5px solid #D85A30",
        color: "#D85A30",
        fontFamily: mono,
        fontSize: "11px",
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
          color: "#D85A30",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "11px",
          padding: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
