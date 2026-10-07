"use client";

import type { CSSProperties } from "react";

// Native time inputs follow the browser's locale and may show AM/PM.
// Explicit numeric options keep both event forms consistently 24-hour.
export function EventTimeInput({ value, onChange, style }: {
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
}) {
  const [hour = "", minute = ""] = value.split(":");
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div role="group" aria-label="hora del evento, formato de 24 horas" className="flex items-center gap-2">
      <select aria-label="hora (00–23)" value={hour} onChange={(e) => onChange(e.target.value ? `${e.target.value}:${minute || "00"}` : "")}
        style={{ ...style, colorScheme: "dark" }} className="min-w-0 focus-visible:outline-2 focus-visible:outline-white">
        <option value="">hora</option>
        {Array.from({ length: 24 }, (_, n) => <option key={n} value={pad(n)}>{pad(n)}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select aria-label="minutos (00–59)" value={minute} onChange={(e) => onChange(e.target.value ? `${hour || "00"}:${e.target.value}` : "")}
        style={{ ...style, colorScheme: "dark" }} className="min-w-0 focus-visible:outline-2 focus-visible:outline-white">
        <option value="">min</option>
        {Array.from({ length: 60 }, (_, n) => <option key={n} value={pad(n)}>{pad(n)}</option>)}
      </select>
    </div>
  );
}
