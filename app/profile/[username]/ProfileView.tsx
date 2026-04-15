"use client";

import { useState } from "react";
import Link from "next/link";
import type { Post } from "@/app/components/card-art";

type Tab = "obras" | "eventos" | "manifiestos";

export interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  disciplines: string[] | null;
  avatar_color: string | null;
}

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

function getInitials(p: ProfileData): string {
  if (p.display_name) {
    return p.display_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  return p.username.slice(0, 2).toUpperCase();
}

function formatStat(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const DISCIPLINE_COLORS: Record<string, string> = {
  "arte visual": "#D85A30",
  "grabado":     "#C4622A",
  "serigrafía":  "#5DCAA5",
  "fotografía":  "#4A7FA5",
  "música":      "#5DCAA5",
  "diseño":      "#4A7FA5",
  "escritura":   "#7F77DD",
  "performance": "#EF9F27",
  "cine":        "#888780",
  "otro":        "#888780",
};

function disciplineColor(tag: string): string {
  return DISCIPLINE_COLORS[tag.toLowerCase()] ?? "#D85A30";
}

// Type-specific accent colours for placeholder cards
const TYPE_ACCENT: Record<string, string> = {
  arte:       "#D85A30",
  fotografía: "#4A7FA5",
  música:     "#5DCAA5",
  evento:     "#EF9F27",
  escrito:    "#7F77DD",
};

// ─── Profile grid card ────────────────────────────────────────────────────────
// Always shows media_url / media_base64 as a cover image when available.
// Falls back to a minimal type-branded placeholder.

function ProfilePostCard({ post }: { post: Post }) {
  const mediaSrc = post.media_url ?? post.media_base64 ?? null;
  const accent   = TYPE_ACCENT[post.type] ?? "#888780";
  const typeLabel = post.type === "fotografía" ? "foto" : post.type;

  return (
    <Link
      href={`/post/${post.id}`}
      style={{ display: "contents", textDecoration: "none" }}
    >
      <div
        className="group relative overflow-hidden cursor-pointer"
        style={{
          backgroundColor: "#141412",
          border: "0.5px solid #2a2a28",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {/* Media layer */}
        {mediaSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc}
            alt={post.title ?? ""}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            loading="lazy"
          />
        ) : (
          /* Placeholder — subtle accent mark in the corner */
          <div
            className="absolute inset-0 flex items-end p-3"
            style={{ backgroundColor: "#141412" }}
          >
            <div style={{ width: "20px", height: "20px", backgroundColor: accent, opacity: 0.15 }} />
          </div>
        )}

        {/* Type badge */}
        <span
          className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[9px] uppercase tracking-widest"
          style={{
            background: "rgba(12,12,11,0.82)",
            color: "#888780",
            border: "0.5px solid #2a2a28",
            fontFamily: mono,
          }}
        >
          {typeLabel}
        </span>

        {/* Hover overlay */}
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "linear-gradient(to top, rgba(12,12,11,0.92) 0%, rgba(12,12,11,0.4) 60%, transparent 100%)" }}
        >
          {post.title && (
            <p
              className="leading-snug line-clamp-2"
              style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700 }}
            >
              {post.title}
            </p>
          )}
          <span style={{ fontSize: "9px", color: accent, fontFamily: mono, marginTop: "4px" }}>
            ↑ {post.upvotes.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Escrito card for manifiestos tab ─────────────────────────────────────────

function ManifiestoCard({ post }: { post: Post }) {
  const preview = post.content
    ? post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)
    : (post.body?.slice(0, 100) ?? "");

  return (
    <Link href={`/post/${post.id}`} style={{ display: "contents", textDecoration: "none" }}>
      <div
        className="group relative overflow-hidden cursor-pointer flex flex-col justify-between p-4"
        style={{
          backgroundColor: "#141412",
          border: "0.5px solid #2a2a28",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: "#7F77DD",
            fontFamily: mono,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            border: "0.5px solid #7F77DD",
            padding: "2px 7px",
            alignSelf: "flex-start",
          }}
        >
          manifiesto
        </span>
        <div className="flex flex-col gap-1 flex-1 py-3">
          {post.title && (
            <p style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1.2 }}>
              {post.title}
            </p>
          )}
          {preview && (
            <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, lineHeight: 1.5 }}>
              {preview}{preview.length >= 100 ? "…" : ""}
            </p>
          )}
        </div>
        <span style={{ fontSize: "9px", color: "#444441", fontFamily: mono }}>
          ver →
        </span>
      </div>
    </Link>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function BannerSVG() {
  return (
    <svg width="100%" height="180" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="banner-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e1e1c" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="1200" height="180" fill="url(#banner-grid)" />
      <circle cx="960" cy="90" r="55"  fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="95"  fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="140" fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="190" fill="none" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="960" cy="90" r="245" fill="none" stroke="#1e1e1c" strokeWidth="0.6" />
    </svg>
  );
}

const TABS: Tab[] = ["obras", "eventos", "manifiestos"];

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileView({
  profile,
  posts,
  isOwnProfile,
  currentUserId,
}: {
  profile: ProfileData;
  posts: Post[];
  isOwnProfile: boolean;
  currentUserId: string | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("obras");

  // Tab filtering — covers all post types
  const obrasPosts       = posts.filter((p) => p.type === "arte" || p.type === "música" || p.type === "fotografía");
  const eventosPosts     = posts.filter((p) => p.type === "evento");
  const manifiestosPosts = posts.filter((p) => p.type === "escrito");

  const visiblePosts =
    activeTab === "obras"       ? obrasPosts :
    activeTab === "eventos"     ? eventosPosts :
    manifiestosPosts;

  const initials    = getInitials(profile);
  const avatarBg    = profile.avatar_color ?? "#D85A30";
  const disciplines = profile.disciplines ?? [];

  return (
    <>
      {/* Banner */}
      <div style={{ backgroundColor: "#0f0d0b", height: "180px", overflow: "hidden" }}>
        <BannerSVG />
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-6">
        <div style={{ marginTop: "-40px" }}>
          {/* Avatar + action buttons */}
          <div className="flex items-end justify-between">
            <div
              className="flex items-center justify-center text-xl font-bold shrink-0"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "4px",
                backgroundColor: avatarBg,
                color: "#0c0c0b",
                fontFamily: syne,
                border: "2px solid #0c0c0b",
              }}
            >
              {initials}
            </div>

            <div className="flex items-center gap-3 pb-1">
              {isOwnProfile ? (
                <Link
                  href="/profile/edit"
                  className="px-5 py-2 text-xs tracking-widest uppercase border"
                  style={{
                    borderColor: "#D85A30",
                    color: "#D85A30",
                    backgroundColor: "transparent",
                    fontFamily: mono,
                    textDecoration: "none",
                  }}
                >
                  editar perfil
                </Link>
              ) : (
                <>
                  <button
                    className="px-5 py-2 text-xs tracking-widest uppercase border cursor-pointer"
                    style={{ borderColor: "#2a2a28", color: "#888780", backgroundColor: "transparent", fontFamily: mono }}
                  >
                    mensaje
                  </button>
                  <button
                    className="px-5 py-2 text-xs tracking-widest uppercase cursor-pointer"
                    style={{ backgroundColor: "#D85A30", color: "#0c0c0b", fontFamily: mono, border: "none" }}
                  >
                    seguir
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name, handle, bio, disciplines */}
          <div className="mt-4">
            <h1 className="leading-tight" style={{ fontSize: "26px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800 }}>
              {profile.display_name ?? `@${profile.username}`}
            </h1>
            <p className="mt-1 text-xs" style={{ color: "#5F5E5A", fontFamily: mono }}>
              @{profile.username}{profile.location ? ` · ${profile.location}` : ""}
            </p>
            {profile.bio && (
              <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "#888780", fontFamily: mono, maxWidth: "560px" }}>
                {profile.bio}
              </p>
            )}

            {disciplines.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {disciplines.map((d) => {
                  const color = disciplineColor(d);
                  return (
                    <span key={d} className="px-2.5 py-0.5 text-[10px] uppercase tracking-widest border" style={{ borderColor: color, color, fontFamily: mono, opacity: 0.85 }}>
                      {d}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Stats — real counts per tab */}
            <div className="flex gap-8 mt-6 pb-6 border-b" style={{ borderColor: "#2a2a28" }}>
              {[
                { value: formatStat(obrasPosts.length),       label: "obras"      },
                { value: formatStat(eventosPosts.length),     label: "eventos"    },
                { value: formatStat(manifiestosPosts.length), label: "manifiestos" },
              ].map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(label as Tab)}
                  className="flex flex-col gap-0.5 cursor-pointer text-left"
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  <span className="tabular-nums" style={{ fontSize: "18px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
                    {value}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: activeTab === label ? "#D85A30" : "#444441", fontFamily: mono }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Works grid */}
        <div className="pt-8 pb-16">
          {/* Tabs */}
          <div className="flex gap-0 border-b mb-6" style={{ borderColor: "#2a2a28" }}>
            {TABS.map((tab) => {
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-5 py-3 text-xs tracking-widest uppercase cursor-pointer"
                  style={{
                    fontFamily: mono,
                    color: isActive ? "#e8e4dc" : "#888780",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${isActive ? "#D85A30" : "transparent"}`,
                    marginBottom: "-1px",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {visiblePosts.length === 0 ? (
            <div className="py-24 text-center text-xs tracking-widest uppercase" style={{ color: "#444441", fontFamily: mono }}>
              sin publicaciones
            </div>
          ) : activeTab === "manifiestos" ? (
            <div className="grid grid-cols-3" style={{ gridAutoRows: "200px", gridAutoFlow: "dense" }}>
              {visiblePosts.map((post) => (
                <ManifiestoCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3" style={{ gridAutoRows: "220px", gridAutoFlow: "dense" }}>
              {visiblePosts.map((post) => (
                <ProfilePostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
