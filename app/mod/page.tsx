import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { ModDashboard, type PendingPost, type Report } from "./ModDashboard";
import HiddenPosts from "./HiddenPosts";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

export default async function ModPage({ searchParams }: { searchParams: Promise<{ tab?: string; pagina?: string }> }) {
  const supabase = await createClient();

  // Must be logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Must be a moderator
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", user.id)
    .single();

  if (profileError) throw new Error("No se pudo verificar el acceso de moderación.");
  if (!profile?.is_moderator) redirect("/");
  const { data: config, error: ownerError } = await supabase.from('app_config').select('owner_user_id').limit(1).maybeSingle();
  const canDelete = !ownerError && config?.owner_user_id === user.id;

  const params = await searchParams;
  if (params.tab === "ocultos") {
    return <main className="max-w-4xl mx-auto px-6 py-8 text-white">
      <Link href="/staff" className="text-sm">← mesa de trabajo</Link>
      <h1 className="magma-page-title mt-8 mb-6">moderación</h1>
      <nav aria-label="secciones de moderación" className="flex gap-6 mb-8">
        <Link href="/mod">por revisar</Link>
        <Link href="/mod?tab=ocultos" aria-current="page" className="text-[var(--magma-red)]">ocultos</Link>
      </nav>
      <HiddenPosts db={supabase} pageValue={params.pagina} />
    </main>;
  }

  const [{ data: pendingData, error: pendingError }, { data: reportsData, error: reportsError }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, body, type, media_url, created_at, author_id, moderation_status, profiles!posts_author_id_fkey(username)")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: true }).abortSignal(AbortSignal.timeout(10000)),
    supabase
      .from("reports")
      .select("id, reason, details, status, created_at, post_id, comment_id, posts(id, title, is_hidden), comments(id, body, is_hidden), profiles(username)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }).abortSignal(AbortSignal.timeout(10000)),
  ]);
  if (pendingError || reportsError) throw new Error("No se pudieron cargar las colas de moderación.");

  const pendingPosts = (pendingData ?? []) as unknown as PendingPost[];
  const reports = (reportsData ?? []) as unknown as Report[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        <Link href="/staff" className="inline-block pt-6 text-sm text-white">← mesa de trabajo</Link>
        <div className="pt-10 pb-8 flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em" }}>
              cuidadorxs de la casa
            </span>
            <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, }}>
              reportes por cuidar
            </h1>
          </div>
          <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
            {pendingPosts.length} por revisar · {reports.length} {reports.length === 1 ? "reporte" : "reportes"}
          </span>
        </div>

        <nav aria-label="secciones de moderación" className="flex gap-6 mb-8 text-white">
          <Link href="/mod" aria-current="page" className="text-[var(--magma-red)]">por revisar</Link>
          <Link href="/mod?tab=ocultos">ocultos</Link>
        </nav>

        <ModDashboard initialPendingPosts={pendingPosts} initialReports={reports} canDelete={canDelete} />
      </main>
    </div>
  );
}
