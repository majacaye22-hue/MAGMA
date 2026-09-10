import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Feed } from "./components/feed";
import type { Post } from "./components/card-art";
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

function salaIsOpen(post: Post) {
  if (!post.event_date) return false;
  const now = Date.now();
  const eventTime = new Date(post.event_date).getTime();
  return now >= eventTime - 48 * 60 * 60 * 1000 && now <= eventTime + 72 * 60 * 60 * 1000;
}

function isFutureEvent(post: Post) {
  return Boolean(post.event_date && new Date(post.event_date).getTime() > Date.now());
}

function formatEventDate(date: string | null) {
  if (!date) return "fecha por anunciar";
  return new Date(date).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortEvents(a: Post, b: Post) {
  if (salaIsOpen(a) !== salaIsOpen(b)) return salaIsOpen(a) ? -1 : 1;
  if (!a.event_date || !b.event_date) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
}

export default async function Home() {
  const supabase = await createClient();
  const [{ data }, { data: projectData }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(username, display_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title, description, cover_image_url, profiles!projects_author_id_fkey(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const posts: Post[] = data ?? [];
  const projects = (projectData ?? []) as HomeProject[];
  const events = posts.filter((post) => post.type === "evento").sort(sortEvents);
  const openSala = events.find(salaIsOpen) ?? events.find(isFutureEvent);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <section className="pt-12 pb-10" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "18px" }}>
            proyectos independientes · cdmx
          </p>
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(42px, 8vw, 88px)", fontWeight: 800, letterSpacing: "-0.065em", lineHeight: 0.88, maxWidth: "700px" }}>
                ¿qué estás haciendo ahora?
              </h1>
            </div>
            <p style={{ color: "#888780", fontFamily: mono, fontSize: "12px", lineHeight: 1.75, maxWidth: "400px" }}>
              Un espacio para enseñar ese disco, editorial, película, taller, archivo, marca u obsesión que estás construyendo en la ciudad.
            </p>
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

        <section className="py-10" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <div className="grid gap-6 md:grid-cols-[0.65fr_1.35fr] md:items-start">
            <div>
              <p style={{ color: "#5DCAA5", fontFamily: mono, fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "8px" }}>sala abierta</p>
              <h2 style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1 }}>una conversación con la puerta entreabierta</h2>
            </div>
            {openSala ? (
              <Link href={`/post/${openSala.id}/sala`} style={{ borderLeft: "2px solid #5DCAA5", color: "inherit", display: "block", padding: "15px 18px", textDecoration: "none" }}>
                <p style={{ color: "#5DCAA5", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", marginBottom: "10px", textTransform: "uppercase" }}>{salaIsOpen(openSala) ? "entrar ahora →" : "abre pronto →"}</p>
                <h3 style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontSize: "25px", fontWeight: 800, lineHeight: 1.05, marginBottom: "10px" }}>{openSala.title}</h3>
                <p style={{ color: "#888780", fontFamily: mono, fontSize: "11px" }}>{formatEventDate(openSala.event_date)} · {[openSala.venue, openSala.address].filter(Boolean).join(" — ")}</p>
              </Link>
            ) : (
              <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "11px", padding: "15px 0" }}>la siguiente sala aparecerá aquí cuando haya una reunión cerca.</p>
            )}
          </div>
        </section>

        <section className="pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "7px" }}>recién compartido</p>
              <h2 style={{ color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.035em" }}>obras, notas y señales</h2>
            </div>
          </div>
          <Feed posts={posts} />
        </section>
      </main>
    </div>
  );
}
