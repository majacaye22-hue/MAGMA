// Additive staging-only fixtures for the requested azoteas example project.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith("#") && line.includes("="))
  .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const url = "https://jbzkdzcaqmxsmmyrlwif.supabase.co";
if (env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error("Refusing non-staging database.");
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const projectId = "e7a09280-0000-4000-8000-000000000001";
const { data: project, error } = await db.from("projects").select("id,title,author_id,description").eq("id", projectId).single();
if (error) throw error;
const { data: owner, error: ownerError } = await db.from("profiles").select("username").eq("id", project.author_id).single();
if (ownerError || owner.username !== "magma_prueba01" || !project.description.startsWith("Proyecto de ejemplo")) throw new Error("Example ownership mismatch.");
const base = "/examples/projects/azoteas-entries/";
const entries = [
  { title: "la luz que se queda", type: "arte", media_url: base + "color.jpeg", body: "Entrada de ejemplo · referencia visual. Una primera paleta para la serie: vino, naranja y rosa, como una tarde que todavía no termina. Imagen de referencia: Allumé Radiant / Milliken, según el archivo proporcionado." },
  { title: "un jardín hacia arriba", type: "fotografía", media_url: base + "plantas.jpeg", body: "Entrada de ejemplo · referencia visual. Hojas, sombras y una pared morada. Una pausa en la secuencia para pensar en los jardines que hacemos con el espacio que tenemos. Autoría de la referencia por confirmar." },
  { title: "lo que quiero guardar", type: "escrito", body: "Nota de proceso · ejemplo ficticio.", content: "<p>No quiero hacer un inventario de azoteas. Quiero guardar las pequeñas decisiones que las vuelven de alguien.</p><p>Una maceta que cambió de casa. La silla que ya no cabe abajo. Una sombra que sólo aparece a cierta hora.</p><p>La siguiente prueba: mirar el mismo rincón por la mañana y al caer la tarde. Dejar que la luz cambie el relato.</p>" },
  { title: "flores fuera de foco", type: "arte", media_url: base + "flores.jpeg", body: "Entrada de ejemplo · referencia visual. Una imagen para explorar el movimiento y la memoria: no recordar cada detalle, sino el color que se quedó. Referencia identificada como Lucy Budgen en el archivo proporcionado; no es obra del perfil de prueba." },
  { title: "primera secuencia", type: "fotografía", media_url: base + "plantas.jpeg", image_urls: [base + "plantas.jpeg", base + "color.jpeg", base + "flores.jpeg"], body: "Entrada de ejemplo · edición de referencias. Tres imágenes, tres ritmos: observar, acercarse al color y dejar que la forma se deshaga. Desliza para probar cómo se lee la secuencia. Referencias proporcionadas para esta maqueta; créditos en las entradas anteriores." },
];
const rows = entries.map((entry, i) => ({ ...entry, id: `e7a09282-0000-4000-8000-${String(i + 1).padStart(12,"0")}`, author_id: project.author_id, created_at: `2026-10-0${i + 1}T18:00:00.000Z`, tags: ["ejemplo-proyecto"], moderation_status: "approved", is_hidden: false, is_sensitive: false, audience_colectivo_id: null, comments_enabled: true, ...(entry.media_url ? { media_type: "image/jpeg" } : {}) }));
const { data: existing, error: readError } = await db.from("posts").select("id,author_id,title,tags").in("id", rows.map(r=>r.id));
if (readError) throw readError;
for (const p of existing) {
  const row = rows.find(r=>r.id===p.id);
  if (p.author_id!==row.author_id || p.title!==row.title || !p.tags?.includes("ejemplo-proyecto")) throw new Error("Fixture collision.");
}
const missing = rows.filter(r=>!existing.some(p=>p.id===r.id));
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ environment:"staging", project:project.title, toCreate:missing.map(r=>r.title) }));
} else {
  if (missing.length) { const { error } = await db.from("posts").insert(missing); if (error) throw error; }
  for (const row of rows) {
    const { data, error } = await db.from("post_projects").select("post_id").eq("project_id",projectId).eq("post_id",row.id);
    if (error) throw error;
    if (!data.length) { const { error } = await db.from("post_projects").insert({project_id:projectId,post_id:row.id}); if (error) throw error; }
  }
  const { data, error } = await db.from("post_projects").select("post_id").eq("project_id",projectId).in("post_id",rows.map(r=>r.id));
  if (error || data.length!==5) throw new Error("Link verification failed.");
  console.log(JSON.stringify({environment:"staging",created:missing.length,verified:data.length,project:project.title}));
}
