"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isPostRevealed, revealPost, serverPostRevealed, subscribeToReveals } from "@/lib/sensitive-reveals";

const mono = "var(--font-space-mono), monospace";

export function SensitiveContentGate({
  enabled,
  postId,
  compact = false,
  children,
}: {
  enabled: boolean;
  postId: string;
  compact?: boolean;
  children: ReactNode;
}) {
  const revealed = useSyncExternalStore(
    subscribeToReveals,
    () => isPostRevealed(postId),
    serverPostRevealed,
  );

  if (!enabled) return <>{children}</>;

  function reveal(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    revealPost(postId);
  }

  return (
    <div
      className="relative overflow-hidden"
      data-sensitive-post={postId}
      style={{ minHeight: compact ? "220px" : "70vh", backgroundColor: "#0c0c0b" }}
    >
      <div
        aria-hidden={!revealed}
        inert={!revealed}
        style={{
          filter: revealed ? "none" : "blur(28px)",
          opacity: revealed ? 1 : 0.3,
          pointerEvents: revealed ? "auto" : "none",
          userSelect: revealed ? "auto" : "none",
          transition: "filter 300ms ease, opacity 300ms ease",
        }}
      >
        {children}
      </div>

      {!revealed && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center p-4 text-center"
          style={{
            background: "rgba(12,12,11,0.12)",
          }}
        >
          <div style={{ maxWidth: "420px", padding: compact ? "20px 16px" : "28px 24px" }}>
            <p style={{ color: "#EF9F27", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "12px" }}>
              contenido sensible
            </p>
            <button
              type="button"
              onClick={reveal}
              style={{
                border: "0.5px solid #EF9F27",
                background: "rgba(12,12,11,0.88)",
                color: "#EF9F27",
                fontFamily: mono,
                fontSize: "var(--magma-text-small)",
                letterSpacing: "0.14em",
                padding: "11px 18px",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              ver contenido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
