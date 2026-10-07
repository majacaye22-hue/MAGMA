import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { CircleButton } from "@/app/components/CircleButton";

type Member = { member_id: string; profiles: { username: string; bio: string | null } };

export default async function CirclePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/circulo");
  const parsed = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed < 10000 ? parsed : 1;
  const { data, error, count } = await db.from("profile_circle")
    .select("member_id,profiles!profile_circle_member_id_fkey!inner(username,bio)", { count: "exact" })
    .eq("owner_id", user.id).order("created_at", { ascending: true }).order("member_id")
    .range((page - 1) * 36, page * 36 - 1);
  const members = (data ?? []) as unknown as Member[];
  return <main className="max-w-6xl mx-auto px-6 pt-6 md:pt-8 pb-24 min-h-screen text-[var(--magma-ash)]">
    <p className="text-xs tracking-widest text-[var(--magma-ash)]">conexiones elegidas · solo para ti</p>
    <h1 className="magma-page-title mt-2 text-[var(--magma-red)]" style={{ fontFamily: "var(--font-syne), sans-serif" }}>mi círculo</h1>
    <p className="mt-2 max-w-lg text-sm leading-relaxed text-white">personas a las que quieres volver. sin rankings, sin contadores públicos, sin tener que seguirte de vuelta.</p>
    <p className="mt-3 text-xs text-white/50">nadie recibe una notificación cuando lo añades o lo quitas.</p>
    {error ? <div role="alert" className="mt-12">no se pudo cargar tu círculo. <Link href="/circulo" className="underline">reintentar</Link></div> : members.length ? (
      <div className="mt-6 grid md:grid-cols-2 gap-x-12">
        {members.map(({ member_id, profiles: profile }) => <article key={member_id} className="border-t border-white/20 py-8">
          <Link href={`/profile/${profile.username}`} className="group text-2xl break-words hover:underline decoration-[var(--magma-red)] underline-offset-4">@{profile.username} <span aria-hidden="true" className="inline-block text-[var(--magma-red)] motion-safe:transition-transform motion-safe:group-hover:translate-x-1">↗</span></Link>
          <p className="mt-4 mb-6 text-sm text-white leading-relaxed">{profile.bio ? profile.bio.slice(0, 180) + (profile.bio.length > 180 ? "…" : "") : "descubre su trabajo y abre una conversación desde su perfil."}</p>
          <CircleButton memberId={member_id} userId={user.id} initiallyAdded accent />
        </article>)}
      </div>
    ) : <section className="mt-6 border-t border-white/20 py-10">
      <h2 className="text-2xl">{page > 1 ? "no hay más personas aquí" : "tu círculo empieza con alguien"}</h2>
      <p className="mt-4 text-sm text-white/60">visita un perfil y elige “añadir a mi círculo”.</p>
      <Link href={page > 1 ? "/circulo" : "/"} className="inline-block mt-8 text-[var(--magma-ash)]">{page > 1 ? "volver a mi círculo" : "explorar la comunidad"} →</Link>
    </section>}
    {!error && (count ?? 0) > 36 && <nav aria-label="páginas de mi círculo" className="flex justify-between mt-8 text-sm">
      {page > 1 ? <Link href={`/circulo?page=${page - 1}`}>← anteriores</Link> : <span />}
      {page * 36 < (count ?? 0) && <Link href={`/circulo?page=${page + 1}`}>más personas →</Link>}
    </nav>}
  </main>;
}
