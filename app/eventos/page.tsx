import { createClient } from "@/lib/supabase-server";
import { Navbar } from "@/app/components/navbar";
import { FlyerCard } from "@/app/components/FlyerCard";
import type { Post } from "@/app/components/card-art";

export default async function EventosPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .eq("type", "evento")
    .order("event_date", { ascending: true });

  const eventos: Post[] = data ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <Navbar active="eventos" />

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {/* Page header */}
        <div className="pt-10 pb-8">
          <h1
            style={{
              fontSize: "32px",
              color: "#e8e4dc",
              fontFamily: "var(--font-syne), sans-serif",
              fontWeight: 800,
              lineHeight: 1,
              marginBottom: "8px",
            }}
          >
            eventos
          </h1>
          <p style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace", letterSpacing: "0.05em" }}>
            lo que está pasando en la ciudad
          </p>
        </div>

        {eventos.length === 0 ? (
          <div
            className="py-24 text-center text-xs tracking-widest uppercase"
            style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}
          >
            sin eventos próximos — sé el primero en publicar
          </div>
        ) : (
          <div
            style={{ columnGap: "8px" }}
            className="[column-count:1] sm:[column-count:2] lg:[column-count:3]"
          >
            {eventos.map((post) => (
              <FlyerCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
