import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/staff/login");

  const [{ data: profile }, { data: config }] = await Promise.all([
    supabase.from("profiles").select("username, display_name, is_moderator").eq("id", user.id).single(),
    supabase.from("app_config").select("owner_user_id").limit(1).maybeSingle(),
  ]);

  const isOwner = config?.owner_user_id === user.id || process.env.OWNER_USER_ID === user.id;
  const isModerator = profile?.is_moderator === true;
  if (!isOwner && !isModerator) redirect("/staff/login?error=unauthorized");

  const tools = [
    ...(isOwner ? [{ href: "/staff/team", label: "equipo de moderación", description: "Dar o retirar acceso por usuario y revisar la actividad del equipo.", accent: "#E12120" }] : []),
    ...(isModerator || isOwner ? [{ href: "/mod", label: "moderación", description: "Revisar publicaciones pendientes y reportes de la comunidad.", accent: "#E12120" }] : []),
    ...(isOwner ? [{ href: "/admin", label: "administración", description: "Radio, solicitudes de slots y acceso administrativo.", accent: "#FF641F" }] : []),
  ];

  return (
    <main className="min-h-screen px-6 pb-24" style={{ backgroundColor: "#0c0c0b" }}>
      <div className="max-w-4xl mx-auto pt-12 flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <span style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.16em", textTransform: "uppercase" }}>magma / equipo</span>
          <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, }}>mesa de trabajo</h1>
          <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>
            {profile?.display_name ?? profile?.username ?? "equipo"} · {isOwner ? "administración" : "moderación"}
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="flex flex-col gap-4 hover:opacity-80" style={{ border: "0.5px solid #2a2a28", minHeight: "180px", padding: "24px" }}>
              <span style={{ color: tool.accent, fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.14em", textTransform: "uppercase" }}>herramienta interna</span>
              <h2 style={{ color: "#F2F4F8", fontFamily: syne, fontSize: "22px", fontWeight: 800 }}>{tool.label}</h2>
              <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.6 }}>{tool.description}</p>
              <span style={{ color: tool.accent, fontFamily: mono, fontSize: "var(--magma-text-small)", marginTop: "auto" }}>abrir →</span>
            </Link>
          ))}
        </section>

        <p style={{ borderTop: "0.5px solid #2a2a28", color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.6, paddingTop: "20px" }}>
          Cada integrante usa su propia cuenta. No compartas contraseñas de equipo.
        </p>
      </div>
    </main>
  );
}
