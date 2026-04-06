"use client";

import { useState } from "react";
import Link from "next/link";
import type { UserProfile, Collaborator, ActivityItem, EventItem } from "@/lib/data";

const DISCIPLINE_COLORS: Record<string, string> = {
  ilustración: "#D85A30",
  fotografía: "#e8e4dc",
  diseño: "#888780",
  música: "#888780",
  "sound design": "#888780",
  performance: "#888780",
  video: "#888780",
  instalación: "#888780",
  arte: "#D85A30",
};

function StatCell({
  label,
  value,
  last,
}: {
  label: string;
  value: number;
  last?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "14px 0",
        textAlign: "center",
        borderRight: last ? "none" : "1px solid #2a2a28",
      }}
    >
      <div
        style={{
          fontFamily: "Syne",
          fontWeight: 800,
          fontSize: "20px",
          color: "#e8e4dc",
          letterSpacing: "0.02em",
        }}
      >
        {value.toLocaleString()}
      </div>
      <div
        style={{
          fontFamily: "Space Mono",
          fontSize: "10px",
          color: "#888780",
          letterSpacing: "0.08em",
          marginTop: "3px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        style={{
          fontFamily: "Syne",
          fontWeight: 800,
          fontSize: "11px",
          color: "#e8e4dc",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "12px",
          paddingBottom: "8px",
          borderBottom: "1px solid #2a2a28",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

interface ProfileHeaderProps {
  profile: UserProfile;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const [following, setFollowing] = useState(false);

  const stats = [
    { label: "obras", value: profile.stats.obras },
    { label: "seguidores", value: profile.stats.seguidores },
    { label: "siguiendo", value: profile.stats.siguiendo },
    { label: "debates", value: profile.stats.debates },
  ];

  return (
    <div style={{ padding: "0 32px" }}>
      {/* Avatar + action buttons row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginTop: "-40px",
          marginBottom: "20px",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "4px",
            backgroundColor: "#2a2a28",
            border: "3px solid #0c0c0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Space Mono",
            fontSize: "22px",
            fontWeight: 700,
            color: "#D85A30",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          {profile.username.slice(0, 2).toUpperCase()}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "8px", paddingTop: "56px" }}>
          <button
            style={{
              fontFamily: "Space Mono",
              fontSize: "12px",
              padding: "7px 18px",
              borderRadius: "2px",
              border: "1px solid #2a2a28",
              backgroundColor: "transparent",
              color: "#e8e4dc",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            mensaje
          </button>
          <button
            onClick={() => setFollowing((f) => !f)}
            style={{
              fontFamily: "Space Mono",
              fontSize: "12px",
              padding: "7px 18px",
              borderRadius: "2px",
              border: "1px solid #D85A30",
              backgroundColor: following ? "transparent" : "#D85A30",
              color: following ? "#D85A30" : "#0c0c0b",
              cursor: "pointer",
              fontWeight: 700,
              letterSpacing: "0.05em",
              transition: "all 0.15s ease",
            }}
          >
            {following ? "siguiendo" : "seguir"}
          </button>
        </div>
      </div>

      {/* Name */}
      <h1
        style={{
          fontFamily: "Syne",
          fontWeight: 800,
          fontSize: "24px",
          color: "#e8e4dc",
          marginBottom: "2px",
          letterSpacing: "0.02em",
        }}
      >
        {profile.name}
      </h1>

      {/* Handle */}
      <div
        style={{
          fontFamily: "Space Mono",
          fontSize: "12px",
          color: "#888780",
          marginBottom: "8px",
        }}
      >
        @{profile.username}
      </div>

      {/* Location */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          fontFamily: "Space Mono",
          fontSize: "11px",
          color: "#888780",
          marginBottom: "12px",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path
            d="M5.5 1C3.567 1 2 2.567 2 4.5C2 7.5 5.5 10 5.5 10C5.5 10 9 7.5 9 4.5C9 2.567 7.433 1 5.5 1ZM5.5 6C4.672 6 4 5.328 4 4.5C4 3.672 4.672 3 5.5 3C6.328 3 7 3.672 7 4.5C7 5.328 6.328 6 5.5 6Z"
            fill="#888780"
          />
        </svg>
        {profile.location}
      </div>

      {/* Bio */}
      <p
        style={{
          fontFamily: "Space Mono",
          fontSize: "13px",
          color: "#e8e4dc",
          maxWidth: "560px",
          lineHeight: 1.75,
          marginBottom: "16px",
        }}
      >
        {profile.bio}
      </p>

      {/* Discipline tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "24px" }}>
        {profile.disciplines.map((d) => (
          <span
            key={d}
            style={{
              fontFamily: "Space Mono",
              fontSize: "10px",
              padding: "3px 10px",
              borderRadius: "2px",
              border: `1px solid ${DISCIPLINE_COLORS[d] ?? "#2a2a28"}`,
              color: DISCIPLINE_COLORS[d] ?? "#888780",
              letterSpacing: "0.05em",
            }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #2a2a28",
          borderBottom: "1px solid #2a2a28",
          marginBottom: "32px",
        }}
      >
        {stats.map((s, i) => (
          <StatCell key={s.label} label={s.label} value={s.value} last={i === stats.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ── Sidebar sub-components (co-located, used by the profile page) ─────────────

export function ActivitySidebar({ items }: { items: ActivityItem[] }) {
  return (
    <SidebarSection title="Actividad">
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.length === 0 && (
          <span style={{ fontFamily: "Space Mono", fontSize: "11px", color: "#888780" }}>
            sin actividad reciente
          </span>
        )}
        {items.map((a, i) => (
          <div
            key={i}
            style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}
          >
            <span style={{ fontFamily: "Space Mono", fontSize: "11px", color: "#888780" }}>
              {a.action}{" "}
              <span style={{ color: "#e8e4dc" }}>{a.item}</span>
            </span>
            <span style={{ fontFamily: "Space Mono", fontSize: "10px", color: "#2a2a28", flexShrink: 0 }}>
              {a.time}
            </span>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}

export function CollaboratorsSidebar({ items }: { items: Collaborator[] }) {
  return (
    <SidebarSection title="Colaboradores">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.length === 0 && (
          <span style={{ fontFamily: "Space Mono", fontSize: "11px", color: "#888780" }}>
            sin colaboradores aún
          </span>
        )}
        {items.map((c) => (
          <Link
            key={c.name}
            href={`/profile/${c.name}`}
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "2px",
                backgroundColor: "#2a2a28",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Space Mono",
                fontSize: "9px",
                fontWeight: 700,
                color: "#D85A30",
                flexShrink: 0,
              }}
            >
              {c.initials}
            </div>
            <span style={{ fontFamily: "Space Mono", fontSize: "12px", color: "#888780" }}>
              @{c.name}
            </span>
          </Link>
        ))}
      </div>
    </SidebarSection>
  );
}

export function EventsSidebar({ items }: { items: EventItem[] }) {
  return (
    <SidebarSection title="Próximos eventos">
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.length === 0 && (
          <span style={{ fontFamily: "Space Mono", fontSize: "11px", color: "#888780" }}>
            sin eventos próximos
          </span>
        )}
        {items.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <div
              style={{
                backgroundColor: "#141412",
                border: "1px solid #2a2a28",
                borderRadius: "2px",
                padding: "3px 8px",
                fontFamily: "Space Mono",
                fontSize: "10px",
                color: "#D85A30",
                flexShrink: 0,
                letterSpacing: "0.04em",
              }}
            >
              {e.date}
            </div>
            <div>
              <div style={{ fontFamily: "Space Mono", fontSize: "12px", color: "#e8e4dc", lineHeight: 1.4 }}>
                {e.title}
              </div>
              <div style={{ fontFamily: "Space Mono", fontSize: "10px", color: "#888780" }}>
                {e.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}
