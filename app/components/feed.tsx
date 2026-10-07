"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { feedHref } from "@/lib/circle-feed";
import { PostCard, type Post } from "./card-art";
import { getSupabaseClient } from "@/lib/supabase"
import archiveStyles from "./archive-card-preview.module.css";

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

const FILTERS = ["todo", "música", "fotografía", "video", "letras", "colaboración"] as const;
type Filter = (typeof FILTERS)[number];

const TYPE_MAP: Record<Filter, string | null> = {
  todo: null,
  música: "música",
  fotografía: "fotografía",
  video: "video",
  letras: "escrito",
  colaboración: null, // handled separately via open_collab
};

const PILL_ACCENT: Record<Filter, string> = {
  todo: "var(--magma-red)",
  música: "var(--magma-red)",
  fotografía: "var(--magma-red)",
  video: "#EF9F27",
  letras: "#7F77DD",
  colaboración: "var(--magma-orange)",
};

export function Feed({
  posts,
  showFilters = true,
  limit,
  emptyMessage,
  layout = "masonry",
  filterPlacement = "top",
  archiveNav,
}: {
  posts: Post[];
  showFilters?: boolean;
  limit?: number;
  emptyMessage?: string;
  layout?: "masonry" | "stream" | "editorial";
  filterPlacement?: "top" | "left";
  archiveNav?: { view: "reciente" | "hoy" | "archivo"; selectedDate: string; today: string; count: number; page: number; totalPages: number; circle?: boolean };
}) {
  const [active, setActive] = useState<Filter>("todo");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await getSupabaseClient().auth.getUser();
      setCurrentUserId(user?.id ?? null);
    })();
  }, []);

  const filtered = posts.filter((p) => {
    if (active === "colaboración") return p.open_collab === true;
    const mapped = TYPE_MAP[active];
    return mapped === null || p.type === mapped;
  });
  const visible = typeof limit === "number" ? filtered.slice(0, limit) : filtered;

  function renderGrid(items: Post[]) {
    function StreamArticle({ post, index, size }: { post: Post; index: number; size: "lead" | "support" | "archive" }) {
      return (
        <article
          className={archiveStyles.card}
          style={{
            backgroundColor: "var(--magma-rock)",
            border: "0.5px solid var(--magma-border)",
            borderRadius: "16px",
            boxShadow: "0 16px 38px rgba(0,0,0,0.24)",
            overflow: "hidden",
            padding: size === "lead" ? "12px" : "10px",
          }}
        >
            <header className={archiveStyles.label}>
              <div className={archiveStyles.byline}>
                <Link href={`/profile/${post.profiles?.username ?? "anon"}`}>@{post.profiles?.username ?? "anon"}</Link>
                <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Mexico_City" })}</time>
              </div>
            </header>
          <PostCard post={post} index={index} total={items.length} currentUserId={currentUserId} stream editorialSize={size} />
        </article>
      );
    }

    if (layout === "editorial") {
      const archive = items;
      return (
        <div>
          {archive.length > 0 && (
            <section>
              <div className="[column-count:1] md:[column-count:2] lg:[column-count:3]" style={{ columnGap: "14px" }}>
                {archive.map((post, index) => (
                  <div key={post.id} className="min-w-0" style={{ breakInside: "avoid", marginBottom: "14px" }}>
                    <StreamArticle post={post} index={index} size="archive" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      );
    }

    if (layout === "stream") {
      return (
        <div className="flex flex-col gap-3">
          {items.map((post, i) => (
            <StreamArticle key={post.id} post={post} index={i} size="lead" />
          ))}
        </div>
      );
    }
    return (
      <div className="[column-count:1] sm:[column-count:2] lg:[column-count:3]" style={{ columnGap: "12px" }}>
        {items.map((post, i) => (
          <CardWrapper key={post.id}>
            <StreamArticle post={post} index={i} size="archive" />
          </CardWrapper>
        ))}
      </div>
    );
  }

  const filterControls = !showFilters ? null : (
      <div className={filterPlacement === "left" ? "flex flex-col" : "flex flex-wrap items-center gap-2 py-6"}>
        {filterPlacement === "left" && <p className="magma-feed-menu-label">formato</p>}
        {FILTERS.map((f) => {
          const isActive = f === active;
          const accent = filterPlacement === "left" ? "var(--magma-red)" : PILL_ACCENT[f];
          return (
            <button
              key={f}
              onClick={() => setActive(f)}
              aria-pressed={isActive}
              className={filterPlacement === "left" ? "magma-feed-menu-item" : "px-4 py-1.5 text-xs tracking-widest uppercase border transition-colors duration-150 cursor-pointer"}
              style={filterPlacement === "left" ? undefined : {
                fontFamily: "var(--font-space-mono), monospace",
                borderColor: isActive ? accent : "var(--magma-border)",
                color: isActive ? "var(--magma-ash)" : "var(--magma-muted)",
                backgroundColor: "transparent",
                boxShadow: isActive ? "0 0 12px rgba(225, 33, 32,0.28), inset 0 0 8px rgba(225, 33, 32,0.08)" : "none",
              }}
            >
              {filterPlacement === "left" && f === "todo" ? "todos los formatos" : f}
            </button>
          );
        })}
        {filterPlacement !== "left" && <Link
          href="/eventos"
          className="px-4 py-1.5 text-xs tracking-widest uppercase border"
          style={{ borderColor: "var(--magma-orange)", color: "var(--magma-ash)", fontFamily: "var(--font-space-mono), monospace", textDecoration: "none" }}
        >
          cartelera →
        </Link>}
      </div>
  );

  const sidebarNavigation = archiveNav ? (
    <div className="flex flex-col gap-2">
      <nav aria-label="publicaciones de" className="flex flex-col">
        {[{ label: "explorar", circle: false }, { label: "mi círculo", circle: true }].map(item => (
          <Link key={item.label} href={feedHref(archiveNav.view === "reciente" ? "/" : `/?vista=${archiveNav.view}&fecha=${archiveNav.selectedDate}`, item.circle)}
            aria-current={Boolean(archiveNav.circle) === item.circle ? "page" : undefined}
            className="magma-feed-menu-item">
            {item.label}
          </Link>
        ))}
        {archiveNav.circle && <Link href="/circulo" className="text-sm text-white underline">editar mi círculo</Link>}
      </nav>
    </div>
  ) : null;

  const feedContent = visible.length === 0 ? (
    <div
      className="py-24 text-center text-xs tracking-widest uppercase"
      style={{ color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace" }}
    >
      {posts.length === 0
        ? (emptyMessage ?? "sin obras todavía — sé el primero en publicar")
        : "sin resultados"}
    </div>
  ) : renderGrid(visible);

  return (
    <>
      {filterPlacement === "left" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
          <details className="bg-transparent p-3 text-white md:hidden">
            <summary className="cursor-pointer text-sm">filtros · {archiveNav?.circle ? "mi círculo" : "explorar"} · {active === "todo" ? "todos los formatos" : active}</summary>
            <div className="mt-3 space-y-3">{sidebarNavigation}{filterControls}</div>
          </details>
          <aside
            data-feed-filters
            className="hidden flex-col gap-4 bg-transparent py-1 pr-3 md:flex md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto"
            style={{
              minWidth: 0,
            }}
          >
            {sidebarNavigation}
            {filterControls}
          </aside>
          <div style={{ minWidth: 0 }}>{feedContent}</div>
        </div>
      ) : (
        <>
          {filterControls}
          {feedContent}
        </>
      )}

    </>
  );
}
