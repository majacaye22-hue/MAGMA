"use client";

import Link from "next/link";
import { FeedImage } from "./FeedImage";
import { type EventPreview } from "@/lib/event-preview";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function FlyerCard({ post, eager = false }: { post: EventPreview; state?: "sala" | "próximo" | "archivo" | "sin-fecha"; now: number; eager?: boolean }) {

  return (
    <Link
      href={`/post/${post.id}`}
      aria-label={`Ver evento: ${post.title ?? "sin título"}`}
      className="group relative block break-inside-avoid cursor-pointer overflow-hidden rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--magma-red)]"
      style={{ border: "1px solid #49463f", padding: "10px", backgroundColor: "#10100f" }}
    >
      {/* Consistent portrait frame; preserve every poster's full artwork. */}
      <div style={{ width: "100%", aspectRatio: "3 / 4", backgroundColor: "#090909", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {post.media_url ? (
        <FeedImage
          src={post.media_url}
          mediaType={post.media_type}
          sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 82px) / 2), (max-width: 1279px) calc((100vw - 100px) / 3), 394px"
          alt={post.title ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
        />
      ) : (
        <div
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            sin flyer
          </span>
        </div>
      )}

      </div>
      {/* Persistent archive caption: readable on touch and never covers the poster. */}
      <div
        className="flex flex-col pt-3"
      >
        <p
          className="leading-tight mb-2"
          style={{ fontSize: "16px", color: "#ffffff", fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }}
        >
          {post.title}
        </p>

        {post.event_date && (
          <p style={{ fontSize: "12px", color: "#ffffff", fontFamily: "var(--font-space-mono), monospace", marginBottom: "4px" }}>
            {formatDate(post.event_date)} · {formatTime(post.event_date)}
          </p>
        )}

        {(post.venue || post.address) && (
          <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace", marginBottom: "8px" }}>
            {[post.venue, post.address].filter(Boolean).join(" — ")}
          </p>
        )}

        <div className="flex items-center justify-between">
          {post.is_free != null && (
            <span style={{ fontSize: "var(--magma-text-small)", color: post.is_free ? "var(--magma-ash)" : "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {post.is_free ? "entrada libre" : post.price ? `$${post.price}` : "de paga"}
            </span>
          )}
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: "var(--magma-red)", fontWeight: 700, fontFamily: "var(--font-space-mono), monospace", textDecoration: "underline" }}
          >
            ver más
          </span>
        </div>
      </div>
    </Link>
  );
}
