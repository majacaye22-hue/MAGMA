import { createClient } from "@/lib/supabase-server";
import { EventosClient } from "./EventosClient";
import type { Post } from "@/app/components/card-art";

export default async function EventosPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .eq("type", "evento")
    .order("event_date", { ascending: true });

  const eventos: Post[] = data ?? [];
  console.log("[EventosPage] eventos.length:", eventos.length, "sample:", eventos[0]?.id ?? "none");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>


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

        <EventosClient eventos={eventos} />
      </main>
    </div>
  );
}
