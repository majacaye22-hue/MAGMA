import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Navbar } from "@/app/components/navbar";
import { ModDashboard, type Report } from "./ModDashboard";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

export default async function ModPage() {
  const supabase = await createClient();

  // Must be logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Must be a moderator
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", user.id)
    .single();

  if (!profile?.is_moderator) redirect("/");

  // Fetch pending reports with joins
  const { data: reportsData } = await supabase
    .from("reports")
    .select("id, reason, details, status, created_at, post_id, comment_id, posts(id, title), comments(id, body), profiles(username)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const reports = (reportsData ?? []) as unknown as Report[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="pt-10 pb-8 flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <span style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em" }}>
              moderación
            </span>
            <h1 style={{ fontSize: "28px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
              reportes pendientes
            </h1>
          </div>
          <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono }}>
            {reports.length} {reports.length === 1 ? "reporte" : "reportes"}
          </span>
        </div>

        <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "24px" }} />

        <ModDashboard initialReports={reports} />
      </main>
    </div>
  );
}
