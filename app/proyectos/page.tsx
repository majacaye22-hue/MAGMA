import Link from "next/link";
import { ProjectCard, type Project } from "@/app/components/ProjectCard";
import { createClient } from "@/lib/supabase-server";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type ProjectRow = Omit<Project, "creator"> & {
  profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

export default async function ProyectosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, cover_image_url, links, profiles!projects_author_id_fkey(username, display_name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los proyectos: ${error.message}`);

  const projects = ((data ?? []) as ProjectRow[]).map(({ profiles, ...project }) => ({
    ...project,
    creator: Array.isArray(profiles) ? profiles[0] ?? null : profiles,
  }));

  return (
    <main className="min-h-screen" style={{ background: "#0c0c0b" }}>
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <header className="grid gap-6 py-12 md:grid-cols-[1.25fr_0.75fr] md:items-end" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <div>
            <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.16em", marginBottom: "12px", textTransform: "uppercase" }}>hecho en cdmx</p>
            <h1 style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "clamp(38px, 7vw, 76px)", fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 0.95 }}>proyectos personales</h1>
          </div>
          <div>
            <p style={{ color: "#888780", fontFamily: mono, fontSize: "11px", lineHeight: 1.7, marginBottom: "14px" }}>Discos, editoriales, películas, archivos, talleres y experimentos que todavía están tomando forma.</p>
            <Link href="/profile/edit" style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", textDecoration: "underline", textTransform: "uppercase", textUnderlineOffset: "4px" }}>ir a mi perfil →</Link>
          </div>
        </header>

        <section className="py-8">
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
            </div>
          ) : (
            <div style={{ border: "0.5px dashed #2a2a28", color: "#5F5E5A", fontFamily: mono, fontSize: "11px", padding: "70px 24px", textAlign: "center" }}>
              todavía no hay proyectos · crea el primero desde tu perfil
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
