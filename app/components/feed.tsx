"use client";

import { useState } from "react";
import { PostCard, type Post } from "./card-art";

const FILTERS = ["todo", "arte", "música", "fotografía", "eventos"] as const;
type Filter = (typeof FILTERS)[number];

const TYPE_MAP: Record<Filter, string | null> = {
  todo: null,
  arte: "arte",
  música: "música",
  fotografía: "fotografía",
  eventos: "evento",
};

export function Feed({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<Filter>("todo");

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
          return (
            <button
              key={f}
              onClick={() => setActive(f)}
              className="px-4 py-1.5 text-xs tracking-widest uppercase border transition-colors duration-150 cursor-pointer"
              style={{
                fontFamily: "var(--font-space-mono), monospace",
                borderColor: isActive ? "#D85A30" : "#2a2a28",
                color: isActive ? "#0c0c0b" : "#888780",
                backgroundColor: isActive ? "#D85A30" : "transparent",
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
            <PostCard key={post.id} post={post} index={i} total={visible.length} />
          ))}
        </div>
      )}
    </>
  );
}
