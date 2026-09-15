import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { HomeFlyers } from "./components/HomeClient";

const mono = "var(--font-space-mono), monospace";

type HomeProject = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

function projectUsername(project: HomeProject) {
  const profile = Array.isArray(project.profiles) ? project.profiles[0] : project.profiles;
  return profile?.username ?? "magma";
}

export default async function Home() {
  const supabase = await createClient();
  const { data: projectData } = await supabase
    .from("projects")
    .select("id, title, description, cover_image_url, profiles!projects_author_id_fkey(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(6);

  const projects = (projectData ?? []) as HomeProject[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <section className="pt-12 pb-10" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "18px" }}>
            magma · ciudad de méxico
          </p>
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(38px, 6.6vw, 74px)", fontWeight: 800, letterSpacing: "-0.058em", lineHeight: 0.92, maxWidth: "820px" }}>
                el archivo vivo
              </h1>
            </div>
            <div>
              <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", marginBottom: "10px", textTransform: "uppercase" }}>
                ¿qué estás haciendo ahora?
              </p>
              <p style={{ color: "#888780", fontFamily: mono, fontSize: "12px", lineHeight: 1.75, maxWidth: "400px" }}>
                Los proyectos que están transformando la Ciudad de México, reunidos en un mismo lugar — aunque todavía estén tomando forma.
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                <Link href="/proyectos" style={{ color: "#e8e4dc", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", textDecoration: "underline", textTransform: "uppercase", textUnderlineOffset: "4px" }}>
                  explorar proyectos →
                </Link>
                <Link href="/profile/edit" style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", textDecoration: "underline", textTransform: "uppercase", textUnderlineOffset: "4px" }}>
                  compartir el mío →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.16em", marginBottom: "7px", textTransform: "uppercase" }}>proyectos personales</p>
              <h2 style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.035em" }}>lo que la ciudad está construyendo</h2>
            </div>
            <Link href="/upload" style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", textDecoration: "underline", textTransform: "uppercase", textUnderlineOffset: "4px" }}>
              compartir lo tuyo →
            </Link>
          </div>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/proyecto/${project.id}`} className="group" style={{ background: "#141412", border: "0.5px solid #2a2a28", color: "inherit", display: "block", textDecoration: "none" }}>
                  <div style={{ aspectRatio: "16 / 10", background: "#1a1a18", overflow: "hidden" }}>
                    {project.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.cover_image_url} alt={project.title} style={{ display: "block", height: "100%", objectFit: "cover", transition: "transform 220ms ease", width: "100%" }} className="group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center" style={{ color: "#444441", fontFamily: "var(--font-syne), sans-serif", fontSize: "40px", fontWeight: 800 }}>{project.title.slice(0, 1).toUpperCase()}</div>
                    )}
                  </div>
                  <div style={{ padding: "14px" }}>
                    <h3 style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontSize: "18px", fontWeight: 800, lineHeight: 1.05 }}>{project.title}</h3>
                    <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", marginTop: "7px" }}>por @{projectUsername(project)}</p>
                    {project.description && <p className="line-clamp-2" style={{ color: "#888780", fontFamily: mono, fontSize: "10px", lineHeight: 1.55, marginTop: "8px" }}>{project.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ border: "0.5px dashed #2a2a28", color: "#5F5E5A", fontFamily: mono, fontSize: "11px", padding: "42px 18px", textAlign: "center" }}>todavía no hay proyectos aquí · empieza el primero desde tu perfil</div>
          )}
        </section>

        <section className="py-10" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <h2 style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.035em" }}>lo que está pasando cerca</h2>
            </div>
            <Link href="/eventos" style={{ color: "#888780", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "underline", textUnderlineOffset: "4px" }}>
              ver toda la cartelera →
            </Link>
          </div>

          <HomeFlyers />
        </section>

      </main>
    </div>
  );
}
