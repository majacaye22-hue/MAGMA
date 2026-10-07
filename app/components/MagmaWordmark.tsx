import type { CSSProperties } from "react";

export function MagmaWordmark({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      className={`magma-wordmark select-none ${className}`}
      style={style}
    >
      MAGMA
    </span>
  );
}
