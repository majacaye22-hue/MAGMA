import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { SensitiveContentGate } from "@/app/components/SensitiveContentGate";

type LikedPost = {
  id: string; title: string | null; body: string | null; type: string;
  cover_url: string | null; media_url: string | null; media_type: string | null;
  is_sensitive: boolean; profiles: { username: string } | null;
};
type Entry = { created_at: string; posts: LikedPost };
const PAGE_SIZE = 36;

export default async function LikesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/likes");
  const query = await searchParams;
  const parsed = Number(query.page ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed < 10000 ? parsed : 1;
  const { data, error, count } = await db.from("post_appreciations")
    .select("created_at,posts!inner(id,title,body,type,cover_url,media_url,media_type,is_sensitive,profiles!posts_author_id_fkey(username))", { count: "exact" })
    .eq("user_id", user.id).eq("posts.is_hidden", false).eq("posts.moderation_status", "approved")
    .order("created_at", { ascending: false }).order("post_id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const entries = (data ?? []) as unknown as Entry[];
  return (
    <main className="min-h-screen mx-auto max-w-7xl px-6 pb-24" style={{ color: "var(--magma-ash)" }}>
      <header className="py-6 md:py-8">
        <div className="flex justify-between gap-4 text-xs tracking-widest text-[var(--magma-ash)]">
          <span>archivo personal / likes</span><span>solo para ti</span>
        </div>
        <h1 className="magma-page-title mt-2 tracking-tight" style={{ fontFamily: "var(--font-syne), sans-serif", }}>lo que te mueve<span className="text-[var(--magma-ash)]">✦</span></h1>
        <div className="mt-2 flex flex-col md:flex-row md:justify-between gap-4">
          <p className="max-w-md text-sm leading-relaxed text-white/65">imágenes, sonidos y palabras que te hicieron detenerte. tu propio mapa de referencias, sin algoritmo.</p>
          {!error && <p className="text-xs self-start md:self-end text-white/60">{count ?? 0} señales · más recientes primero</p>}
        </div>
      </header>
      {error ? <div role="alert" className="border border-white/20 p-8"><p>no se pudieron cargar tus likes.</p><Link href="/likes" className="inline-block mt-4 underline">reintentar →</Link></div> : entries.length === 0 ? (
        <section className="border-t border-white/20 py-16">
          <h2 className="text-3xl">{page > 1 ? "no hay más señales aquí" : "el inicio de tu mapa"}</h2>
          <p className="mt-4 text-white/60">{page > 1 ? "vuelve a tus likes más recientes." : "toca ✦ en una publicación y aparecerá aquí."}</p>
          <Link href={page > 1 ? "/likes" : "/"} className="mt-8 inline-block text-[var(--magma-ash)]">{page > 1 ? "volver a mis likes" : "explorar el archivo"} →</Link>
        </section>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 xl:columns-4 gap-4 md:gap-5">
          {entries.map(({ posts: post }, index) => {
            const image = post.cover_url || ((post.media_type?.startsWith("image/") || ["arte", "fotografía", "evento"].includes(post.type)) ? post.media_url : null);
            const paper = !image && post.type === "escrito";
            return (
              <article key={post.id} className="break-inside-avoid mb-6">
                <div className="mb-2 flex justify-between text-[10px] uppercase tracking-widest text-white/50"><span>{String((page - 1) * PAGE_SIZE + index + 1).padStart(3, "0")}</span><span>{post.type === "escrito" ? "letras" : post.type}</span></div>
                <SensitiveContentGate enabled={post.is_sensitive} postId={post.id} compact>
                  <Link href={`/post/${post.id}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--magma-orange)]">
                    <div className="overflow-hidden transition-transform duration-200 motion-safe:hover:-translate-y-1" style={{ background: paper ? "#e8e1d2" : "#18181c", color: paper ? "#23211d" : "#F2F4F8" }}>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={post.title ?? "publicación apreciada"} loading="lazy" className="w-full h-auto block" />
                      ) : <div className="p-4 flex min-h-48 flex-col justify-between">
                        <span className="text-2xl opacity-60" aria-hidden="true">{post.type === "música" ? "♫" : post.type === "video" ? "▷" : "“"}</span>
                        <div className="py-4"><h2 className="text-xl leading-tight break-words">{post.title || "sin título"}</h2>{post.body && <p className="mt-3 text-sm leading-relaxed opacity-75 whitespace-pre-line break-words line-clamp-5">{post.body.slice(0, 240)}{post.body.length > 240 ? "…" : ""}</p>}</div>
                        <span className="text-xs tracking-widest">{post.type === "música" ? "escuchar" : post.type === "video" ? "ver" : "leer"} →</span>
                      </div>}
                    </div>
                    <div className="pt-2 flex items-start justify-between gap-3">
                      <div>{image && <h2 className="text-sm leading-snug break-words">{post.title || "sin título"}</h2>}<p className="mt-1 text-xs text-white/60">@{post.profiles?.username ?? "miembro"}</p></div>
                      <span aria-hidden="true" className="text-[var(--magma-ash)] group-hover:translate-x-1 transition-transform">↗</span>
                    </div>
                  </Link>
                </SensitiveContentGate>
              </article>
            );
          })}
        </div>
      )}
      {!error && (count ?? 0) > PAGE_SIZE && <nav aria-label="páginas de likes" className="border-t border-white/20 pt-6 flex justify-between gap-4 text-sm">
        {page > 1 ? <Link href={`/likes?page=${page - 1}`}>← anteriores</Link> : <span />}
        <span>página {page}</span>
        {page * PAGE_SIZE < (count ?? 0) ? <Link href={`/likes?page=${page + 1}`}>más señales →</Link> : <span />}
      </nav>}
    </main>
  );
}
