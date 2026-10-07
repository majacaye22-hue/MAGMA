import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { ModDashboard, type PendingPost, type Report } from "./ModDashboard";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

export default async function ModPage() {
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

        <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "24px" }} />

        <ModDashboard initialPendingPosts={pendingPosts} initialReports={reports} />
      </main>
    </div>
  );
}
