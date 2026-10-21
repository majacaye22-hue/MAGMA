import Link from "next/link";
import RestoreHiddenPost from "./RestoreHiddenPost";
import type { SupabaseClient } from "@supabase/supabase-js";

type HiddenPost = {
  id: string;
  title: string | null;
  type: string;
  created_at: string;
  moderation_status: string;
  profiles: { username: string } | null;
};
const PAGE_SIZE = 24;

// Called only after /mod verifies the viewer's moderator role. The session
// client keeps RLS active; this list never depends on a report being open.
export default async function HiddenPosts({ db, pageValue }: { db: SupabaseClient; pageValue?: string }) {
  const parsed = Number(pageValue);
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100000) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await db.from("posts")
    .select("id,title,type,created_at,moderation_status,profiles!posts_author_id_fkey(username)", { count: "exact" })
    .eq("is_hidden", true)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(start, start + PAGE_SIZE - 1).abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error("No se pudieron cargar las publicaciones ocultas.");
  const posts = (data ?? []) as unknown as HiddenPost[];
  const total = count ?? 0;
  const status: Record<string, string> = { pending: "pendiente de aprobación", approved: "aprobada", rejected: "rechazada" };
  return <section aria-labelledby="hidden-heading">
    <h2 id="hidden-heading" className="text-xl mb-3">publicaciones ocultas · {total}</h2>
    <p className="text-sm mb-6">Siguen aquí aunque su reporte esté cerrado o no tengan un reporte. Ordenadas por fecha de publicación, más recientes primero.</p>
    {!posts.length ? <p>{page === 1 ? "no hay publicaciones ocultas" : "no hay publicaciones en esta página"}</p> :
      <ul className="flex flex-col gap-3">{posts.map(post => <li key={post.id} className="border border-white/20 p-5">
        <p className="text-sm mb-2">@{post.profiles?.username ?? "cuenta eliminada"} · {post.type}</p>
        <Link href={`/post/${post.id}`} className="text-lg font-bold">{post.title || "sin título"} ↗</Link>
        <p className="text-sm mt-3">oculta · {status[post.moderation_status] ?? post.moderation_status}</p>
        <p className="text-sm mt-2">publicada el {new Date(post.created_at).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", year: "numeric", month: "long", day: "numeric" })}</p>
        <RestoreHiddenPost postId={post.id} title={post.title} status={post.moderation_status} />
      </li>)}</ul>}
    <nav aria-label="páginas de publicaciones ocultas" className="flex gap-6 items-center mt-6 text-sm">
      {page > 1 && <Link href={`/mod?tab=ocultos&pagina=${page - 1}`}>← anterior</Link>}
      <span>página {page}</span>
      {start + PAGE_SIZE < total && <Link href={`/mod?tab=ocultos&pagina=${page + 1}`}>siguiente →</Link>}
      {page > 1 && <Link href="/mod?tab=ocultos">volver al inicio</Link>}
    </nav>
  </section>;
}
