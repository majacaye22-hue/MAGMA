"use client";

import { useEffect, useState } from "react";
import { PostCard, type Post } from "./card-art";
import { getSupabaseClient } from "@/lib/supabase"
const supabase = getSupabaseClient();

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

export function Feed({ posts }: { posts: Post[] }) {
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
        <div
          className="grid grid-cols-3"
          style={{ gridAutoRows: "280px", gridAutoFlow: "dense" }}
        >
          {visible.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} total={visible.length} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </>
  );
}
