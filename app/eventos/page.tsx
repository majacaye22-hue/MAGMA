import { EventosClient } from "./EventosClient";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { EVENT_PREVIEW_COLUMNS, type EventPreview } from "@/lib/event-preview";

async function EventWall() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/eventos");
  const { data, error } = await db.from("posts").select(EVENT_PREVIEW_COLUMNS)
    .is("audience_colectivo_id", null)
    .eq("type", "evento").order("event_date", { ascending: true }).order("id").returns<(EventPreview & { body: string | null })[]>();
  if (error) return <div role="alert" className="py-8 text-white">no se pudo cargar la cartelera. <Link href="/eventos" className="underline">reintentar</Link></div>;
  // One request-time clock is serialized to the client to keep hydration stable.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return <EventosClient eventos={data ?? []} now={now} />;
}

function EventWallLoading() {
  return <div role="status" className="py-4">
    <p className="mb-4 text-sm text-white">cargando cartelera…</p>
    <div aria-hidden="true" className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i}>
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
      <main className="max-w-[1800px] mx-auto px-5 sm:px-8 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-6 pb-8 pt-10 md:pb-10 md:pt-14">
          <div>
          <p className="mb-4 text-[10px] tracking-[0.2em] text-[var(--magma-muted)]">CDMX · CULTURA EN VIVO</p>
          <h1 className="text-[clamp(44px,7vw,88px)] leading-none"
            style={{

              color: "var(--magma-ash)",
              fontFamily: "var(--font-syne), sans-serif",
              fontWeight: 800,

              letterSpacing: "-0.05em",
            }}
          >
            cartelera
          </h1>
          <p className="mt-4 text-sm text-[var(--magma-muted)]">nos vemos afuera.</p>
          </div>
          <Link href="/upload?type=evento" className="inline-flex min-h-11 items-center rounded-xl bg-[#292827] px-5 py-3 text-sm text-[var(--magma-ash)] transition-colors hover:bg-[#3a3331] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--magma-red)]">
            + agregar evento
          </Link>
        </div>

        <Suspense fallback={<EventWallLoading />}><EventWall /></Suspense>
      </main>
    </div>
  );
}
