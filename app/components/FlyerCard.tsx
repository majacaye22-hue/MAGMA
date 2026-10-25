"use client";

import Link from "next/link";
import { FeedImage } from "./FeedImage";
import { type EventPreview } from "@/lib/event-preview";
import { EVENT_STATUSES, eventUnavailable } from "@/lib/event-management";
import { eventMedia } from '@/lib/event-media';

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
  const { poster, video } = eventMedia(post);

  return (
    <Link
      href={`/post/${post.id}`}
      aria-label={`Ver evento: ${post.title ?? "sin título"}`}
      className="group relative flex h-full flex-col break-inside-avoid cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--magma-red)]"
    >
      {/* Matching edge-to-edge previews; full artwork remains on the event page. */}
      <div className="relative shrink-0" style={{ width: "100%", aspectRatio: "3 / 4", borderRadius: 0, backgroundColor: "#090909", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {poster ? (
        <FeedImage
          src={poster}
          sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 82px) / 2), (max-width: 1279px) calc((100vw - 100px) / 3), 394px"
          alt={post.title ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
        />
      ) : video ? (
        <div className="relative h-full w-full"><video src={video} muted playsInline preload="metadata" aria-label="vista previa del video del evento" className="h-full w-full object-contain" /><span className="absolute bottom-3 left-3 rounded-full bg-black/80 px-3 py-1 text-xs">▶ video</span></div>
      ) : (
        <div
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            sin flyer
          </span>
        </div>
      )}
      {poster && video && <span className="absolute bottom-3 left-3 bg-black/80 px-3 py-1 text-xs text-white">cartel + video ↗</span>}
      </div>
      {/* Persistent archive caption: readable on touch and never covers the poster. */}
      <div
        className="flex flex-1 flex-col pt-4"
      >
        <div className="pb-3">
        <p
          className="leading-tight mb-2 line-clamp-2 shrink-0 group-hover:underline decoration-1 underline-offset-4"
          title={post.title ?? undefined}
          style={{ fontSize: "20px", color: "#ffffff", fontFamily: "var(--font-syne), sans-serif", fontWeight: 700 }}
        >
          {post.title}
        </p>
        {eventUnavailable(post) && <p className="mb-1 text-sm text-[var(--magma-red)]">{EVENT_STATUSES[post.event_status!]}</p>}

        {post.event_date && (
          <p className="line-clamp-2 shrink-0" style={{ fontSize: "12px", color: "#ffffff", fontFamily: "var(--font-space-mono), monospace", marginBottom: "4px" }}>
            {formatDate(post.event_date)} · {formatTime(post.event_date)}
          </p>
        )}

        {(post.venue || post.address) && (
          <p className="line-clamp-2" title={[post.venue, post.address].filter(Boolean).join(" — ")} style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace", marginBottom: "8px" }}>
            {[post.venue, post.address].filter(Boolean).join(" — ")}
          </p>
        )}

        </div>
        <div className="mt-auto flex min-h-11 shrink-0 items-center justify-between gap-2 border-t border-white/10">
          {post.is_free != null && (
            <span style={{ fontSize: "var(--magma-text-small)", color: post.is_free ? "var(--magma-ash)" : "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {post.is_free ? "entrada libre" : post.price ? `$${post.price}` : "de paga"}
            </span>
          )}
          <span
            className="ml-auto shrink-0 text-xs"
            style={{ color: "#ff625b", fontFamily: "var(--font-space-mono), monospace" }}
          >
            ver evento ↗
          </span>
        </div>
      </div>
    </Link>
  );
}
