"use client";

import Link from "next/link";
import type { Post } from "./card-art";

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function FlyerCard({ post }: { post: Post }) {
  const today = isToday(post.event_date);

  return (
    <div
      className="group relative break-inside-avoid cursor-pointer"
      style={{ border: "0.5px solid #2a2a28", marginBottom: "8px", backgroundColor: "#141412" }}
    >
      {/* Flyer image — natural portrait height, no cropping */}
      {post.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt={post.title}
          style={{ width: "100%", display: "block", objectFit: "contain" }}
          loading="lazy"
        />
      ) : (
        <div
          style={{ height: "320px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span style={{ fontSize: "9px", color: "#444441", fontFamily: "var(--font-space-mono), monospace", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            sin flyer
          </span>
        </div>
      )}

      {/* Hoy badge */}
      {today && (
        <span
          className="absolute top-3 right-3 px-2 py-0.5 text-[9px] tracking-widest uppercase"
          style={{
            backgroundColor: "#D85A30",
            color: "#0c0c0b",
            fontFamily: "var(--font-space-mono), monospace",
          }}
        >
          hoy
        </span>
      )}

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "linear-gradient(to top, rgba(12,12,11,0.96) 0%, rgba(12,12,11,0.6) 60%, transparent 100%)" }}
      >
        <p
          className="leading-tight mb-2"
          style={{ fontSize: "15px", color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }}
        >
          {post.title}
        </p>

        {post.event_date && (
          <p style={{ fontSize: "10px", color: "#EF9F27", fontFamily: "var(--font-space-mono), monospace", marginBottom: "2px" }}>
            {formatDate(post.event_date)} · {formatTime(post.event_date)}
          </p>
        )}

        {(post.venue || post.address) && (
          <p style={{ fontSize: "10px", color: "#888780", fontFamily: "var(--font-space-mono), monospace", marginBottom: "8px" }}>
            {[post.venue, post.address].filter(Boolean).join(" — ")}
          </p>
        )}

        <div className="flex items-center justify-between">
          {post.is_free != null && (
            <span style={{ fontSize: "9px", color: post.is_free ? "#5DCAA5" : "#888780", fontFamily: "var(--font-space-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {post.is_free ? "entrada libre" : post.price ? `$${post.price}` : "de paga"}
            </span>
          )}
          <Link
            href={`/post/${post.id}`}
            className="text-[9px] tracking-widest uppercase"
            style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace", textDecoration: "underline" }}
            onClick={(e) => e.stopPropagation()}
          >
            ver más
          </Link>
        </div>
      </div>
    </div>
  );
}
