import { EventosClient } from "./EventosClient";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { EVENT_PREVIEW_COLUMNS } from "@/lib/event-preview";

async function EventWall() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/eventos");
  const { data, error } = await db.from("posts").select(EVENT_PREVIEW_COLUMNS)
    .is("audience_colectivo_id", null)
    .eq("type", "evento").order("event_date", { ascending: true }).order("id");
  if (error) return <div role="alert" className="py-8 text-white">no se pudo cargar la cartelera. <Link href="/eventos" className="underline">reintentar</Link></div>;
  // One request-time clock is serialized to the client to keep hydration stable.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return <EventosClient eventos={data ?? []} now={now} />;
}

function EventWallLoading() {
  return <div role="status" className="py-4">
    <p className="mb-4 text-sm text-white">cargando cartelera…</p>
    <div aria-hidden="true" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-[2px] border border-[#49463f] bg-[#10100f] p-[10px]">
          <div className="aspect-[3/4] bg-[#090909]" />
          <div className="mt-3 h-4 w-2/3 bg-white/5" />
          <div className="mt-2 h-3 w-1/2 bg-white/5" />
        </div>
      ))}
    </div>
  </div>;
}

export default async function EventosPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--magma-obsidian)" }}>
      <main className="max-w-7xl mx-auto px-5 sm:px-8 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4 py-5 md:py-6">
          <div>
          <h1 className="magma-page-title"
            style={{

              color: "var(--magma-ash)",
              fontFamily: "var(--font-syne), sans-serif",
              fontWeight: 800,

              letterSpacing: "-0.05em",
            }}
          >
            cartelera
          </h1>
          </div>
          <Link href="/upload?type=evento" className="inline-flex min-h-11 items-center border border-[var(--magma-red)] px-4 py-2 text-sm text-[var(--magma-ash)] transition-colors hover:bg-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--magma-red)]">
            + agregar evento
          </Link>
        </div>

        <Suspense fallback={<EventWallLoading />}><EventWall /></Suspense>
      </main>
    </div>
  );
}
