"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostCard, type Post } from "./card-art";
import { getSupabaseClient } from "@/lib/supabase"
const supabase = getSupabaseClient();

function CardWrapper({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        breakInside: "avoid",
        marginBottom: "12px",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        transition: "transform 0.2s ease",
      }}
    >
      {children}
    </div>
  );
}

const FILTERS = ["todo", "arte", "música", "fotografía", "eventos", "manifiestos"] as const;
type Filter = (typeof FILTERS)[number];

const TYPE_MAP: Record<Filter, string | null> = {
  todo: null,
  arte: "arte",
  música: "música",
  fotografía: "fotografía",
  eventos: "evento",
  manifiestos: "escrito",
};

const PILL_ACCENT: Record<Filter, string> = {
  todo: "#D85A30",
  arte: "#D85A30",
  música: "#D85A30",
  fotografía: "#D85A30",
  eventos: "#D85A30",
  manifiestos: "#7F77DD",
};

// Maps filter name → upload ?type= param value
const UPLOAD_TYPE: Partial<Record<Filter, string>> = {
  arte: "arte",
  música: "música",
  fotografía: "fotografía",
  eventos: "evento",
  manifiestos: "escrito",
};

const mono = "var(--font-space-mono), monospace";

export function Feed({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [active, setActive] = useState<Filter>("todo");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    })();
  }, []);

  const visible = posts.filter((p) => {
    const mapped = TYPE_MAP[active];
    return mapped === null || p.type === mapped;
  });

  return (
    <>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 py-6">
        {FILTERS.map((f) => {
          const isActive = f === active;
          const accent = PILL_ACCENT[f];
          return (
            <button
              key={f}
              onClick={() => setActive(f)}
              className="px-4 py-1.5 text-xs tracking-widest uppercase border transition-colors duration-150 cursor-pointer"
              style={{
                fontFamily: "var(--font-space-mono), monospace",
                borderColor: isActive ? accent : "#2a2a28",
                color: isActive ? "#0c0c0b" : "#888780",
                backgroundColor: isActive ? accent : "transparent",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Grid or empty state */}
      {visible.length === 0 ? (
        <div
          className="py-24 text-center text-xs tracking-widest uppercase"
          style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}
        >
          {posts.length === 0
            ? "sin obras todavía — sé el primero en publicar"
            : "sin resultados"}
        </div>
      ) : (
        <div style={{ columns: 3, columnGap: "12px", padding: "0 24px" }}>
          {visible.map((post, i) => (
            <CardWrapper key={post.id}>
              <PostCard post={post} index={i} total={visible.length} currentUserId={currentUserId} />
            </CardWrapper>
          ))}
        </div>
      )}

      {/* Floating upload button — only when a specific category is active */}
      {active !== "todo" && UPLOAD_TYPE[active] && (
        <button
          onClick={() => router.push(`/upload?type=${UPLOAD_TYPE[active]}`)}
          style={{
            position: "fixed",
            bottom: "32px",
            right: "32px",
            backgroundColor: active === "manifiestos" ? "#7F77DD" : "#D85A30",
            color: "#0c0c0b",
            fontFamily: mono,
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "10px 16px",
            border: "none",
            cursor: "pointer",
            zIndex: 40,
          }}
          className="hover:opacity-90 transition-opacity"
        >
          + subir {active === "manifiestos" ? "manifiesto" : active === "fotografía" ? "foto" : active}
        </button>
      )}
    </>
  );
}
